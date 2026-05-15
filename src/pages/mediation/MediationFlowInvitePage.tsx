import { FC, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Mail,
  Clock,
} from 'lucide-react'
import { mediationFlowApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { friendlyError } from '@/utils/errors'

/**
 * Public mediation invite landing page.
 *
 * Reached via the email button: `/mediation/invite?token=<jwt>`.
 * Handles all three Stage 2 sub-cases:
 *
 *   2a. No account → click "Accept" → redirected to signup with token
 *       preserved in the redirect query.
 *   2b. Account with the invited email → already logged in or login
 *       with token preserved.
 *   2c. Account with a DIFFERENT email → token still authorises (the
 *       JWT signature + inviteId pair is what binds, not the email).
 *
 * The preview API is unauthenticated — we show the invitation card
 * before the user signs in so they know what they're accepting.
 *
 * Error states this page renders gracefully (not 500):
 *   - EXPIRED token → "This invitation has expired" + helpline to
 *     the original initiator (via their email displayed on the card)
 *   - INVALID token → "Invitation no longer exists"
 *   - Already accepted / declined / cancelled → state-specific copy
 */

interface InvitePreview {
  status: string
  disputeTitle: string
  initiatorName: string
  expiresAt: string
  respondentEmail: string
}

const MediationFlowInvitePage: FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionRunning, setActionRunning] = useState<'accept' | 'decline' | null>(null)
  const [declineMode, setDeclineMode] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  useEffect(() => {
    if (!token) {
      setErrorCode('INVALID')
      setErrorMessage('No token in the link. Please use the link from your email.')
      setLoading(false)
      return
    }
    let mounted = true
    mediationFlowApi
      .previewInvite(token)
      .then((res) => {
        if (!mounted) return
        setPreview(res.data as InvitePreview)
      })
      .catch((err: any) => {
        if (!mounted) return
        const code = err?.response?.data?.code as string | undefined
        setErrorCode(code || 'UNKNOWN')
        setErrorMessage(
          err?.response?.data?.error || friendlyError(err, "Couldn't load the invitation."),
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [token])

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Stage 2a — no account, or 2b/2c logged out. Send to login with
      // a returnTo so the FE replays this URL after sign-in.
      navigate(
        `/auth/login?returnTo=${encodeURIComponent(`/mediation/invite?token=${token}`)}`,
        { replace: true },
      )
      return
    }
    setActionRunning('accept')
    try {
      const res = await mediationFlowApi.acceptInvite(token)
      const med = (res.data as { mediation?: { id?: string } }).mediation
      if (med?.id) navigate(`/app/mediation/${med.id}`, { replace: true })
    } catch (err: any) {
      const code = err?.response?.data?.code
      setErrorCode(code || 'UNKNOWN')
      setErrorMessage(
        err?.response?.data?.error || friendlyError(err, "Couldn't accept the invitation."),
      )
    } finally {
      setActionRunning(null)
    }
  }

  const handleDecline = async () => {
    if (!declineReason.trim()) return
    if (!isAuthenticated) {
      navigate(
        `/auth/login?returnTo=${encodeURIComponent(`/mediation/invite?token=${token}`)}`,
        { replace: true },
      )
      return
    }
    setActionRunning('decline')
    try {
      await mediationFlowApi.declineInvite(token, declineReason.trim())
      setPreview((prev) => (prev ? { ...prev, status: 'DECLINED' } : prev))
      setDeclineMode(false)
    } catch (err: any) {
      const code = err?.response?.data?.code
      setErrorCode(code || 'UNKNOWN')
      setErrorMessage(
        err?.response?.data?.error || friendlyError(err, "Couldn't decline the invitation."),
      )
    } finally {
      setActionRunning(null)
    }
  }

  // ─── Render branches ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (errorCode && !preview) {
    const isExpired = errorCode === 'EXPIRED'
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          {isExpired ? (
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          ) : (
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          )}
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {isExpired ? 'Invitation expired' : 'Invitation unavailable'}
          </h1>
          <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
          <p className="text-xs text-gray-500">
            If you believe this is a mistake, please contact the person who sent you the invitation.
          </p>
        </div>
      </div>
    )
  }

  if (!preview) return null

  const isPending = preview.status === 'PENDING'
  const isAccepted = preview.status === 'ACCEPTED'
  const isDeclined = preview.status === 'DECLINED'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Mediation invitation</h1>
            <p className="text-sm text-gray-600">
              <strong>{preview.initiatorName}</strong> has invited you to mediate.
            </p>
          </div>
        </div>

        {/* Confidentiality banner */}
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 mb-4 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 leading-relaxed">
            Mediation is confidential under the <strong>Mediation Act 2023 §27</strong>. Anything
            said inside the mediation is privileged. Any settlement reached is enforceable as a
            court decree.
          </p>
        </div>

        {/* Dispute card */}
        <div className="rounded-lg border border-gray-200 p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">
            Dispute
          </p>
          <p className="text-base text-gray-900 font-medium">{preview.disputeTitle}</p>
        </div>

        {/* Status-specific UI */}
        {isPending && !declineMode && (
          <>
            <div className="text-xs text-gray-500 mb-4">
              Expires on{' '}
              <strong>
                {new Date(preview.expiresAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </strong>
            </div>
            {errorMessage && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 mb-3 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {errorMessage}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleAccept}
                disabled={!!actionRunning}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {actionRunning === 'accept' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isAuthenticated ? 'Accept invitation' : 'Sign in to accept'}
              </button>
              <button
                onClick={() => setDeclineMode(true)}
                disabled={!!actionRunning}
                className="sm:w-auto px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50"
              >
                Decline
              </button>
            </div>
          </>
        )}

        {isPending && declineMode && (
          <>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Why are you declining?
            </label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Brief reason — visible to the initiator."
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setDeclineMode(false)}
                disabled={!!actionRunning}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleDecline}
                disabled={!declineReason.trim() || !!actionRunning}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionRunning === 'decline' && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm decline
              </button>
            </div>
          </>
        )}

        {isAccepted && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">You've already accepted this invitation.</p>
              <p>
                <button
                  onClick={() => navigate('/app/mediation')}
                  className="underline hover:text-emerald-700"
                >
                  Open your mediations
                </button>{' '}
                to continue.
              </p>
            </div>
          </div>
        )}

        {isDeclined && (
          <div className="rounded-lg bg-gray-100 border border-gray-200 p-4 text-sm text-gray-700 flex items-start gap-2">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">You've declined this invitation.</p>
              <p>
                The dispute will proceed in court. The initiator has been notified.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MediationFlowInvitePage
