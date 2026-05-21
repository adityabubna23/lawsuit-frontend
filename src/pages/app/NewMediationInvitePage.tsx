import { FC, useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api, { apiEndpoints, mediationApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

/**
 * Send a mediation invitation — lawyer-initiated, from a Case ONLY.
 *
 * There is NO draft step and clients can never reach this. The case
 * lawyer opens this from the Case (Resolution = Mediation); on the FIRST
 * "Send" click `mediationApi.createInvite` emails the other party
 * immediately and fires an in-app notification if they already have a
 * NyayaX account. A Mediation row is created when they accept. The
 * caseId auto-attaches the case lawyer as the initiator lawyer and links
 * Mediation.caseId on accept.
 */
const NewMediationInvitePage: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const caseId = searchParams.get('caseId') || undefined
  const user = useAuthStore((s) => s.user) as { role?: string } | null
  const isLawyer = String(user?.role || '').toUpperCase() === 'LAWYER'
  // Lawyer-from-case is the ONLY way in. A client (or any entry without a
  // case) is blocked — clients can never send a mediation invitation.
  const blocked = !isLawyer || !caseId
  // This page is mounted under both /app and /lawyer. Keep post-submit
  // navigation on the same role surface.
  const mediationsList = location.pathname.startsWith('/lawyer') ? '/lawyer/mediations' : '/app/mediations'

  const [form, setForm] = useState({
    respondentName: '',
    respondentEmail: '',
    respondentPhone: '',
    disputeTitle: '',
    disputeDescription: '',
  })
  const [error, setError] = useState<string | null>(null)
  // A still-PENDING invite already exists for this case → the lawyer
  // can RESEND the email (e.g. the other party never received it / it
  // hit spam) without creating a new invite. Fetched proactively so
  // Resend is ALWAYS available, not gated behind a failed re-send.
  const [pendingInvite, setPendingInvite] = useState<
    { id: string; respondentEmail: string; respondentName?: string | null; status: string; createdAt: string } | null
  >(null)
  const [resentAt, setResentAt] = useState<string | null>(null)
  const [editedAt, setEditedAt] = useState<string | null>(null)

  useEffect(() => {
    if (blocked || !caseId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await mediationApi.getInviteForCase(caseId)
        const inv = (res.data?.data ?? res.data) as
          | { id: string; respondentEmail: string; respondentName?: string | null; status: string; createdAt: string }
          | null
        if (!cancelled && inv && inv.status === 'PENDING') {
          setPendingInvite(inv)
          // Make sure Resend targets the address the invite went to.
          setForm((f) => ({
            ...f,
            respondentEmail: f.respondentEmail || inv.respondentEmail,
            respondentName: f.respondentName || inv.respondentName || '',
          }))
        }
      } catch {
        /* no pending invite / not authorized — just show the form */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [blocked, caseId])

  // Prefill the dispute from the source case so the initiator doesn't
  // retype it. Best-effort — a fetch failure just leaves the fields blank.
  useEffect(() => {
    if (!caseId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<{ data: Array<{ title?: string; description?: string }> }>(
          apiEndpoints.case.getCaseDetails(caseId),
        )
        const c = res.data?.data?.[0]
        if (!cancelled && c) {
          setForm((f) => ({
            ...f,
            disputeTitle: f.disputeTitle || c.title || '',
            disputeDescription: f.disputeDescription || c.description || '',
          }))
        }
      } catch {
        /* leave blank on failure */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [caseId])

  const mutation = useMutation({
    mutationFn: () => mediationApi.createInvite({ ...form, caseId }),
    onSuccess: () => navigate(mediationsList),
    onError: (err: any) => setError(err?.response?.data?.error || 'Failed to send invite'),
  })

  const resend = useMutation({
    mutationFn: () => {
      if (!pendingInvite) throw new Error('No pending invitation to resend')
      return mediationApi.resendInvite(pendingInvite.id)
    },
    onSuccess: () => {
      setError(null)
      setResentAt(new Date().toISOString())
    },
    onError: (err: any) =>
      setError(err?.response?.data?.error || 'Failed to resend invitation'),
  })

  // Lawyer can edit a still-PENDING invite (recipient + dispute) before
  // the other party accepts. Uses the canonical PATCH /invites/:id which
  // re-emails when the recipient address changes.
  const editMut = useMutation({
    mutationFn: () => {
      if (!pendingInvite) throw new Error('No pending invitation to update')
      return mediationApi.editInvite(pendingInvite.id, {
        respondentEmail: form.respondentEmail.trim(),
        respondentName: form.respondentName.trim() || undefined,
        disputeTitle: form.disputeTitle.trim(),
        disputeDescription: form.disputeDescription.trim(),
      })
    },
    onSuccess: () => {
      setError(null)
      setEditedAt(new Date().toISOString())
      // Refresh the pending invite snapshot from the patched values so
      // the email/name shown stays accurate.
      setPendingInvite((p) =>
        p
          ? {
              ...p,
              respondentEmail: form.respondentEmail.trim(),
              respondentName: form.respondentName.trim() || null,
            }
          : p,
      )
    },
    onError: (err: any) =>
      setError(err?.response?.data?.error || 'Failed to update the invitation'),
  })

  // The server returns this exact message when a PENDING invite already
  // exists for the email — that's when we offer "Resend" instead.
  const pendingExists = /pending invite already exists/i.test(error || '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // If an invite is still PENDING, the same form acts as the edit
    // surface (recipient + dispute) — patching the existing invite
    // rather than creating a duplicate. Server re-emails on email change.
    if (pendingInvite) {
      editMut.mutate()
    } else {
      mutation.mutate()
    }
  }

  const input =
    'w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm'

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Started by your lawyer</h1>
        <p className="text-sm text-gray-600 mt-3 max-w-md mx-auto">
          A mediation is initiated by the lawyer assigned to the case — from the case
          itself (set Resolution&nbsp;=&nbsp;Mediation, then “Send mediation invitation”).
          You can't start one here. Once it's sent and the other party accepts, you'll
          see it and can act on it from your Mediations.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
        >
          ← Go back
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Send Mediation Invitation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tapping “Send” emails the other party <strong>immediately</strong> and notifies
          them in-app if they already have a NyayaX account. There is no draft step — the
          invitation goes out on the first click. A mediation record is created when they accept.
        </p>
      </div>

      {/* Always-available Resend — shown whenever an invite for this case
          is still PENDING (the other party hasn't accepted). If they
          never got the email / it hit spam, the lawyer resends here
          without creating a new invite. */}
      {pendingInvite && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Invitation already sent — awaiting response
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Sent to <strong>{pendingInvite.respondentEmail}</strong> on{' '}
                {new Date(pendingInvite.createdAt).toLocaleDateString()}. They haven't accepted
                yet. Didn't they get it (check spam too)? Resend the same invitation email.
              </p>
              {resentAt && (
                <p className="text-sm text-emerald-700 mt-2">
                  ✓ Invitation re-sent at {new Date(resentAt).toLocaleTimeString()}.
                </p>
              )}
              {editedAt && (
                <p className="text-sm text-emerald-700 mt-1">
                  ✓ Invitation updated at {new Date(editedAt).toLocaleTimeString()}. The
                  new recipient/dispute is now in effect; the other party gets the email
                  if the recipient changed.
                </p>
              )}
              <p className="text-xs text-amber-800/80 mt-2">
                You can also edit this invitation below (recipient or dispute) and click
                <strong> Update invitation</strong> — the original invite is patched, no
                duplicate created.
              </p>
            </div>
            <button
              type="button"
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="px-5 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60 whitespace-nowrap"
            >
              {resend.isPending ? 'Resending…' : 'Resend invitation'}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-md p-3">
          <strong>How it works:</strong> On “Send”, we email the person below an invitation
          link <strong>right away</strong> (and notify them in-app if they're on NyayaX). If
          they don't have an account they can sign up with the invited email and respond.
          This case's lawyer (you) is automatically attached as the initiator lawyer.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Other party's name</label>
          <input
            className={input}
            value={form.respondentName}
            onChange={(e) => setForm({ ...form, respondentName: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              className={input}
              value={form.respondentEmail}
              onChange={(e) => setForm({ ...form, respondentEmail: e.target.value })}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input
              className={input}
              value={form.respondentPhone}
              onChange={(e) => setForm({ ...form, respondentPhone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dispute title <span className="text-red-500">*</span>
          </label>
          <input
            required
            minLength={3}
            className={input}
            value={form.disputeTitle}
            onChange={(e) => setForm({ ...form, disputeTitle: e.target.value })}
            placeholder="Unpaid invoice for services rendered"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dispute description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            minLength={10}
            rows={5}
            className={input}
            value={form.disputeDescription}
            onChange={(e) => setForm({ ...form, disputeDescription: e.target.value })}
            placeholder="Briefly describe the dispute, the facts, and the outcome you are seeking."
          />
        </div>

        {error && (
          <div
            className={`text-sm rounded p-3 border ${
              pendingExists
                ? 'text-amber-800 bg-amber-50 border-amber-200'
                : 'text-red-600 bg-red-50 border-red-100'
            }`}
          >
            <p>{error}</p>
            {pendingExists && (
              <p className="mt-1 text-amber-700">
                You already invited <strong>{form.respondentEmail}</strong>. You can resend
                the same invitation email to them now.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          {pendingExists ? (
            <button
              type="button"
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="px-5 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
            >
              {resend.isPending ? 'Resending…' : 'Resend invitation'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={mutation.isPending || editMut.isPending}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {pendingInvite
                ? editMut.isPending
                  ? 'Updating…'
                  : 'Update invitation'
                : mutation.isPending
                  ? 'Sending…'
                  : 'Send invitation now'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default NewMediationInvitePage
