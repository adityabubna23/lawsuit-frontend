import { FC, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mediationApi, lawyersApi, appointmentsApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { Mediation, MediatorProfile } from '@/types/mediation'
import { uploadToCloudinary } from '@/utils/cloudinaryUpload'

const statusBadge: Record<string, string> = {
  // Legacy
  AWAITING_RESPONDENT_LAWYER: 'bg-amber-100 text-amber-800',
  AWAITING_MEDIATOR_SELECTION: 'bg-sky-100 text-sky-800',
  IN_SESSION: 'bg-emerald-100 text-emerald-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ESCALATED_TO_CASE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  // Canonical
  RESPONDENT_ACCEPTED: 'bg-amber-100 text-amber-800',
  RESPONDENT_SIDE_SUBMITTED: 'bg-amber-100 text-amber-800',
  MEDIATOR_SHORTLIST: 'bg-sky-100 text-sky-800',
  MEDIATOR_CONVERGE: 'bg-sky-100 text-sky-800',
  AWAITING_MEDIATION_FEE: 'bg-violet-100 text-violet-800',
  MEDIATOR_OFFERED: 'bg-indigo-100 text-indigo-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  SETTLED: 'bg-green-100 text-green-800',
  NON_SETTLEMENT: 'bg-red-100 text-red-800',
}
const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())

// Canonical flow order — drives the progress strip. Legacy rows simply
// won't match any of these and skip the strip.
const CANONICAL_STEPS: { key: string; label: string }[] = [
  { key: 'RESPONDENT_ACCEPTED', label: "Respondent's side" },
  { key: 'RESPONDENT_SIDE_SUBMITTED', label: "Respondent's lawyer" },
  { key: 'MEDIATOR_SHORTLIST', label: 'Shortlist mediators' },
  { key: 'MEDIATOR_CONVERGE', label: 'Agree on mediator' },
  { key: 'AWAITING_MEDIATION_FEE', label: 'Pay mediation fee' },
  { key: 'MEDIATOR_OFFERED', label: 'Mediator accepts' },
  { key: 'ACTIVE', label: 'In session' },
]
const TERMINAL = ['RESOLVED', 'ESCALATED_TO_CASE', 'SETTLED', 'NON_SETTLEMENT', 'CANCELLED']

interface ApptLite {
  id: string
  status: string
  scheduledAt: string
  mediationId?: string | null
  lawyer?: { id: string; name?: string; email?: string } | null
}

const MediationDetailPage: FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [showMediators, setShowMediators] = useState(false)
  const [pickerFor, setPickerFor] = useState<null | 'initiator' | 'respondent'>(null)
  const [showConclude, setShowConclude] = useState(false)
  const [concludeForm, setConcludeForm] = useState<{ outcome: 'RESOLVED' | 'ESCALATED_TO_CASE'; settlementTerms: string; closureNotes: string; documentUrls: string[] }>({
    outcome: 'RESOLVED',
    settlementTerms: '',
    closureNotes: '',
    documentUrls: [],
  })

  // Canonical — respondent side-submission form state.
  const [statement, setStatement] = useState('')
  const [docUrls, setDocUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  // Canonical — shortlist multi-select (1–3).
  const [shortlistPick, setShortlistPick] = useState<string[]>([])
  const [payingFee, setPayingFee] = useState(false)
  const [concludeUploading, setConcludeUploading] = useState(false)

  const q = useQuery({
    queryKey: ['mediation', id],
    queryFn: async () => (await mediationApi.getById(id)).data.data as Mediation,
    enabled: !!id,
  })

  const m = q.data

  // Mediator directory — needed for the legacy picker AND the canonical
  // shortlist/converge stages.
  const needsMediators =
    showMediators ||
    m?.status === 'MEDIATOR_SHORTLIST' ||
    m?.status === 'MEDIATOR_CONVERGE'
  const mediatorsQ = useQuery({
    queryKey: ['mediators'],
    queryFn: async () => (await mediationApi.listMediators()).data.data as MediatorProfile[],
    enabled: needsMediators,
  })

  // Conflict-of-interest filter: the case's own lawyers (initiator +
  // respondent) cannot be shortlisted as mediators for THIS mediation,
  // even if they're on the panel. Spec sanity — a lawyer representing a
  // party can't also be the neutral mediator.
  const eligibleMediators = useMemo<MediatorProfile[]>(() => {
    const list = mediatorsQ.data || []
    const excluded = new Set(
      [m?.initiatorLawyerId, m?.respondentLawyerId].filter(Boolean) as string[],
    )
    return list.filter((med) => !excluded.has(med.id))
  }, [mediatorsQ.data, m?.initiatorLawyerId, m?.respondentLawyerId])

  const lawyersQ = useQuery({
    queryKey: ['lawyers-all'],
    queryFn: async () => (await lawyersApi.getAll({ limit: 50 })).data,
    enabled:
      q.data?.status === 'AWAITING_RESPONDENT_LAWYER' ||
      q.data?.status === 'AWAITING_MEDIATOR_SELECTION',
  })

  // Canonical — respondent's appointments, to attach a lawyer who has
  // already accepted (CONFIRMED/COMPLETED). The /appointments list
  // endpoint returns `{ items }`; older mirror endpoints returned
  // `{ data }`; defensively accept either + raw arrays.
  const apptsQ = useQuery({
    queryKey: ['appointments', 'for-mediation'],
    queryFn: async () => {
      const res = await appointmentsApi.getAll()
      const body = res.data as any
      return (body?.items || body?.data || body || []) as ApptLite[]
    },
    enabled: m?.status === 'RESPONDENT_SIDE_SUBMITTED',
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mediation', id] })
    qc.invalidateQueries({ queryKey: ['mediations'] })
  }

  const pickMediator = useMutation({
    mutationFn: (mediatorId: string) => mediationApi.pickMediator(id, mediatorId),
    onSuccess: () => { setShowMediators(false); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to pick mediator'),
  })

  const attachRespondentLawyer = useMutation({
    mutationFn: (lawyerId: string) => mediationApi.attachRespondentLawyer(id, lawyerId),
    onSuccess: () => { setPickerFor(null); setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to attach lawyer'),
  })
  const attachInitiatorLawyer = useMutation({
    mutationFn: (lawyerId: string) => mediationApi.attachInitiatorLawyer(id, lawyerId),
    onSuccess: () => { setPickerFor(null); setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to attach lawyer'),
  })

  const conclude = useMutation({
    mutationFn: () => mediationApi.conclude(id, {
      outcome: concludeForm.outcome,
      settlementTerms: concludeForm.settlementTerms || undefined,
      closureNotes: concludeForm.closureNotes || undefined,
      documentUrls: concludeForm.documentUrls.length > 0 ? concludeForm.documentUrls : undefined,
    }),
    onSuccess: () => { setShowConclude(false); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to conclude'),
  })

  const cancelMut = useMutation({
    mutationFn: (reason?: string) => mediationApi.cancelMediation(id, reason),
    onSuccess: () => { setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to cancel mediation'),
  })

  const neutralMut = useMutation({
    mutationFn: () => mediationApi.requestNeutralMediator(id),
    onSuccess: () => { setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to assign a neutral mediator'),
  })

  // ─── Canonical mutations ───
  const submitSide = useMutation({
    mutationFn: () => mediationApi.submitRespondentSide(id, { statement: statement.trim(), documentUrls: docUrls }),
    onSuccess: () => { setError(null); setStatement(''); setDocUrls([]); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to submit your side'),
  })
  const attachFromAppt = useMutation({
    mutationFn: (appointmentId: string) => mediationApi.attachRespondentLawyerFromAppointment(id, appointmentId),
    onSuccess: () => { setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to attach lawyer from appointment'),
  })
  const submitShortlist = useMutation({
    mutationFn: () => mediationApi.submitMediatorShortlist(id, shortlistPick),
    onSuccess: () => { setError(null); setShortlistPick([]); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to submit shortlist'),
  })
  const submitFinal = useMutation({
    mutationFn: (mediatorId: string) => mediationApi.submitFinalMediator(id, mediatorId),
    onSuccess: () => { setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to submit your final mediator'),
  })
  const mediatorOffer = useMutation({
    mutationFn: (accept: boolean) => mediationApi.respondToMediatorOffer(id, accept),
    onSuccess: () => { setError(null); invalidate() },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to respond to the offer'),
  })

  const onRequestNeutral = () => {
    if (confirm("You couldn't agree on a mediator. The platform will appoint a neutral, accredited mediator and open the session. Continue?")) {
      neutralMut.mutate()
    }
  }

  const isInitiatorClient = !!m && user?.id === m.initiatorClientId
  const isRespondentClient = !!m && user?.id === m.respondentClientId
  const isInitiatorLawyer = !!m && !!m.initiatorLawyerId && user?.id === m.initiatorLawyerId
  const isRespondentLawyer = !!m && !!m.respondentLawyerId && user?.id === m.respondentLawyerId
  const isMediator = !!m && user?.id === m.mediatorId
  const isLawyer = user?.role === 'LAWYER'

  // Who acts for each side: the side's lawyer if represented, else the
  // side's client. Mirrors the server's resolveActingSide.
  const canActInitiator = isInitiatorLawyer || (isInitiatorClient && !m?.initiatorLawyerId)
  const canActRespondent = isRespondentLawyer || (isRespondentClient && !m?.respondentLawyerId)
  const actingSide: 'INITIATOR' | 'RESPONDENT' | null =
    canActInitiator ? 'INITIATOR' : canActRespondent ? 'RESPONDENT' : null

  // Legacy lawyer-attach affordances.
  const canInitiatorAdd =
    isInitiatorClient && !m?.initiatorLawyerId &&
    (m?.status === 'AWAITING_RESPONDENT_LAWYER' || m?.status === 'AWAITING_MEDIATOR_SELECTION')
  const canRespondentAdd =
    isRespondentClient && !m?.respondentLawyerId && m?.status === 'AWAITING_RESPONDENT_LAWYER'

  // Cancel — pre-session only. Server CANCELLABLE now spans the canonical
  // pre-session states too (refunds any escrowed half).
  const CANCELLABLE_FE = [
    'AWAITING_RESPONDENT_LAWYER', 'AWAITING_MEDIATOR_SELECTION',
    'RESPONDENT_ACCEPTED', 'RESPONDENT_SIDE_SUBMITTED',
    'MEDIATOR_SHORTLIST', 'MEDIATOR_CONVERGE', 'AWAITING_MEDIATION_FEE',
  ]
  const canCancel = (isInitiatorClient || isRespondentClient) && CANCELLABLE_FE.includes(m?.status || '')

  const onCancelMediation = () => {
    const reason = prompt('Cancel this mediation?\n\nThis closes it for everyone. Optional reason (shown to the other party):')
    if (reason === null) return
    cancelMut.mutate(reason || undefined)
  }

  const myPick = isInitiatorClient ? m?.initiatorMediatorPick : isRespondentClient ? m?.respondentMediatorPick : null
  const otherPick = isInitiatorClient ? m?.respondentMediatorPick : isRespondentClient ? m?.initiatorMediatorPick : null

  // Canonical shortlist / final, resolved to the viewer's acting side.
  const myShortlist = actingSide === 'INITIATOR' ? m?.initiatorMediatorShortlist : actingSide === 'RESPONDENT' ? m?.respondentMediatorShortlist : []
  const initiatorShortlistDone = (m?.initiatorMediatorShortlist?.length ?? 0) > 0
  const respondentShortlistDone = (m?.respondentMediatorShortlist?.length ?? 0) > 0
  const myShortlistDone = (myShortlist?.length ?? 0) > 0
  const myFinal = actingSide === 'INITIATOR' ? m?.initiatorFinalMediatorId : actingSide === 'RESPONDENT' ? m?.respondentFinalMediatorId : null
  const otherFinal = actingSide === 'INITIATOR' ? m?.respondentFinalMediatorId : actingSide === 'RESPONDENT' ? m?.initiatorFinalMediatorId : null

  // Fee — only the two CLIENTS pay, 50/50.
  const myFeeSide: 'INITIATOR' | 'RESPONDENT' | null =
    isInitiatorClient ? 'INITIATOR' : isRespondentClient ? 'RESPONDENT' : null
  const myFeePaid = myFeeSide === 'INITIATOR' ? !!m?.initiatorFeePaidAt : myFeeSide === 'RESPONDENT' ? !!m?.respondentFeePaidAt : false
  const otherFeePaid = myFeeSide === 'INITIATOR' ? !!m?.respondentFeePaidAt : myFeeSide === 'RESPONDENT' ? !!m?.initiatorFeePaidAt : false
  const feeTotal = m?.mediationFeeTotal ?? 3000
  const feeHalf = Math.round(feeTotal / 2)

  const roomPath = useMemo(() => (isLawyer ? `/lawyer/mediation/${id}/room` : `/app/mediation/${id}/room`), [id, isLawyer])
  const chatBasePath = isLawyer ? '/lawyer/chats' : '/app/chats'
  const groupChatId = m?.chats?.[0]?.id ?? null

  // Resolve a mediator id to a readable label using the directory.
  const mediatorName = (mid?: string | null) => {
    if (!mid) return null
    const found = mediatorsQ.data?.find((x) => x.id === mid)
    return found?.name || mid
  }

  const onUploadDocs = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const f of Array.from(files)) {
        urls.push(await uploadToCloudinary(f, { folder: 'documents' }))
      }
      setDocUrls((prev) => [...prev, ...urls])
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const payFeeHalf = async () => {
    setError(null)
    setPayingFee(true)
    try {
      const startRes = await mediationApi.startMediationFee(id)
      const { payment } = (startRes.data?.data || {}) as any
      const orderId = payment?.providerOrderId
      const rzpKey = (import.meta.env.VITE_RAZORPAY_KEY as string) || ''
      if (!(window as any).Razorpay) throw new Error('Payment gateway not loaded. Please refresh the page.')
      if (!orderId) throw new Error('Payment order could not be created. Please try again later.')
      const options: any = {
        key: rzpKey,
        amount: (payment.amount ?? feeHalf) * 100,
        currency: payment.currency ?? 'INR',
        name: 'NyayaX',
        description: `Mediation fee (your half) — ${m?.disputeTitle ?? ''}`,
        order_id: orderId,
        handler: async (resp: any) => {
          try {
            await mediationApi.confirmMediationFee(id, {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            })
            setPayingFee(false)
            invalidate()
          } catch (err: any) {
            setPayingFee(false)
            setError(err?.response?.data?.error || 'Payment captured but confirmation failed. Contact support.')
          }
        },
        modal: { ondismiss: () => setPayingFee(false) },
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', () => {
        setPayingFee(false)
        setError('Payment failed. Your fee share has NOT been charged — you can try again.')
      })
      rzp.open()
    } catch (e: any) {
      setPayingFee(false)
      setError(e?.response?.data?.error || e?.message || 'Could not start the fee payment')
    }
  }

  if (q.isLoading) return <div className="py-16 text-center text-gray-500">Loading…</div>
  if (!m) return <div className="py-16 text-center text-gray-500">Mediation not found.</div>

  const stepIdx = CANONICAL_STEPS.findIndex((s) => s.key === m.status)
  const showStepper = stepIdx >= 0 || (TERMINAL.includes(m.status) && m.status !== 'CANCELLED')
  // Only lawyers the respondent has APPOINTED (the lawyer accepted the
  // booking → CONFIRMED) but the consultation hasn't been attended yet
  // (NOT COMPLETED). Past/attended consultations are excluded so the
  // list is just the active appointments to choose from. The initiator's
  // own lawyer is excluded too (conflict of interest).
  const attachableAppts = (apptsQ.data || []).filter(
    (a) => a.lawyer && a.status === 'CONFIRMED' && a.lawyer.id !== m.initiatorLawyerId,
  )

  return (
    <div className="space-y-6">
      <div>
        <Link to={isLawyer ? '/lawyer/mediations' : '/app/mediations'} className="text-sm text-gray-500 hover:text-gray-700">← Back to mediations</Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{m.disputeTitle}</h1>
            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{m.disputeDescription}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[m.status] || 'bg-gray-100'}`}>
            {pretty(m.status)}
          </span>
        </div>

        {showStepper && (
          <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
            {CANONICAL_STEPS.map((s, i) => {
              const done = TERMINAL.includes(m.status) ? true : i < stepIdx
              const current = i === stepIdx
              return (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${
                      current ? 'bg-primary text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.label}
                  </div>
                  {i < CANONICAL_STEPS.length - 1 && <span className="mx-1 text-gray-300">→</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 text-sm">
          <Party title="Initiator (Client)" party={m.initiatorClient} />
          <LawyerSlot
            title="Initiator Lawyer"
            lawyer={m.initiatorLawyer}
            canAdd={!!canInitiatorAdd}
            onAdd={() => setPickerFor('initiator')}
          />
          <Party title="Respondent (Client)" party={m.respondentClient} />
          <LawyerSlot
            title="Respondent Lawyer"
            lawyer={m.respondentLawyer}
            canAdd={!!canRespondentAdd}
            onAdd={() => setPickerFor('respondent')}
          />
        </div>

        {m.mediator && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-900">
            <strong>Mediator:</strong> {m.mediator.name} ({m.mediator.email})
          </div>
        )}

        {canCancel && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              Not moving forward? Either party can close this mediation before the session starts.
              Any fee already paid is refunded.
            </p>
            <button
              onClick={onCancelMediation}
              disabled={cancelMut.isPending}
              className="text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {cancelMut.isPending ? 'Cancelling…' : 'Cancel mediation'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-3">{error}</div>}

      {/* ─── Canonical Stage 1 · Respondent submits their side ─── */}
      {m.status === 'RESPONDENT_ACCEPTED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 1 · Respondent's side of the dispute</h2>
          {isRespondentClient ? (
            <>
              <p className="text-sm text-gray-500 mt-1">
                Before mediators are selected, share your account of the dispute and any
                supporting documents. The mediator sees both sides only after the fee is secured.
              </p>
              <textarea
                rows={6}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="Describe the dispute from your perspective…"
                className="w-full mt-4 px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
              <div className="mt-3">
                <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
                  <input type="file" multiple className="hidden" onChange={(e) => onUploadDocs(e.target.files)} />
                  <span className="px-3 py-1.5 rounded-lg border border-primary hover:bg-primary hover:text-white transition-colors">
                    {uploading ? 'Uploading…' : '+ Attach documents'}
                  </span>
                </label>
                {docUrls.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {docUrls.map((u, i) => (
                      <li key={u} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                        <span className="truncate">Document {i + 1}</span>
                        <button onClick={() => setDocUrls((p) => p.filter((x) => x !== u))} className="text-red-500 hover:text-red-700">remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => submitSide.mutate()}
                disabled={submitSide.isPending || uploading || statement.trim().length < 10}
                className="mt-4 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
              >
                {submitSide.isPending ? 'Submitting…' : 'Submit my side'}
              </button>
              {statement.trim().length > 0 && statement.trim().length < 10 && (
                <p className="mt-2 text-xs text-amber-700">Please write at least a sentence (10+ characters).</p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Waiting for {m.respondentClient?.name || 'the respondent'} to submit their side of the dispute.
            </p>
          )}
        </div>
      )}

      {/* ─── Canonical Stage 2 · Respondent appoints a lawyer ─── */}
      {m.status === 'RESPONDENT_SIDE_SUBMITTED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 2 · Respondent appoints a lawyer</h2>
          {isRespondentClient ? (
            <>
              <p className="text-sm text-gray-500 mt-1">
                Book an appointment with a lawyer of your choice. Once that lawyer
                <strong> accepts</strong> the appointment, attach them here as your
                mediation lawyer to move forward.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/app/search')}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
                >
                  Find a lawyer & book →
                </button>
              </div>
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Attach an accepted appointment</p>
                {apptsQ.isLoading ? (
                  <p className="text-sm text-gray-500">Loading your appointments…</p>
                ) : attachableAppts.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No accepted appointments yet. After a lawyer confirms your booking, it shows up here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {attachableAppts.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">{a.lawyer?.name || 'Lawyer'}</p>
                          <p className="text-xs text-gray-500">
                            {a.lawyer?.email} · {new Date(a.scheduledAt).toLocaleString()} · {a.status}
                          </p>
                        </div>
                        <button
                          onClick={() => attachFromAppt.mutate(a.id)}
                          disabled={attachFromAppt.isPending}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark disabled:opacity-60"
                        >
                          Attach as my lawyer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              Waiting for {m.respondentClient?.name || 'the respondent'} to appoint their lawyer.
            </p>
          )}
        </div>
      )}

      {/* ─── Canonical Stage 3 · Shortlist 1–3 mediators ─── */}
      {m.status === 'MEDIATOR_SHORTLIST' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 3 · Shortlist mediators (1–3)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Each side shortlists 1 to 3 mediators. Once both sides submit, you'll
            converge on a single mutually-agreed mediator from the combined list.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
            <PickStatus label="Initiator's shortlist" id={initiatorShortlistDone ? 'done' : null} />
            <PickStatus label="Respondent's shortlist" id={respondentShortlistDone ? 'done' : null} />
          </div>

          {actingSide && !myShortlistDone && (
            <div className="mt-5">
              {mediatorsQ.isLoading ? (
                <p className="text-sm text-gray-500">Loading mediators…</p>
              ) : eligibleMediators.length === 0 ? (
                <p className="text-sm text-gray-500">No mediators available right now.</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {eligibleMediators.map((med) => {
                      const sel = shortlistPick.includes(med.id)
                      const disabled = !sel && shortlistPick.length >= 3
                      return (
                        <button
                          key={med.id}
                          onClick={() =>
                            setShortlistPick((p) => (sel ? p.filter((x) => x !== med.id) : [...p, med.id]))
                          }
                          disabled={disabled}
                          className={`w-full text-left p-3 rounded-lg border ${
                            sel ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-primary'
                          } disabled:opacity-50`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-gray-900">{med.name}</p>
                              <p className="text-xs text-gray-500">
                                {(med.mediationSpecializations?.length ? med.mediationSpecializations : med.specializations || []).join(', ') || 'General mediation'}
                              </p>
                              <div className="text-xs text-gray-600 mt-1 flex gap-3 flex-wrap">
                                {typeof med.experienceYears === 'number' && <span>{med.experienceYears}y exp</span>}
                                {typeof med.rating === 'number' && <span>★ {med.rating.toFixed(1)}</span>}
                                {med.city && <span>{med.city}</span>}
                              </div>
                            </div>
                            <span className={`text-xs font-medium ${sel ? 'text-primary' : 'text-gray-400'}`}>
                              {sel ? '✓ Selected' : 'Select'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => submitShortlist.mutate()}
                    disabled={submitShortlist.isPending || shortlistPick.length < 1 || shortlistPick.length > 3}
                    className="mt-4 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
                  >
                    {submitShortlist.isPending ? 'Submitting…' : `Submit shortlist (${shortlistPick.length}/3)`}
                  </button>
                </>
              )}
            </div>
          )}
          {actingSide && myShortlistDone && (
            <div className="mt-4">
              <p className="text-xs text-emerald-700 mb-2">Your shortlist is submitted. Waiting for the other side. ✓</p>
              {(myShortlist?.length ?? 0) > 0 && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Your side's selected mediators</p>
                  <ul className="space-y-1">
                    {myShortlist!.map((mid) => {
                      const med = mediatorsQ.data?.find((x) => x.id === mid)
                      return (
                        <li key={mid} className="text-sm text-gray-900">{med?.name || mid}</li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
          {!actingSide && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                Your side's lawyer is handling mediator selection. You'll be able to review the choice.
              </p>
              {(myShortlist?.length ?? 0) > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mt-2">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Your side's selected mediators</p>
                  <ul className="space-y-1">
                    {myShortlist!.map((mid) => {
                      const med = mediatorsQ.data?.find((x) => x.id === mid)
                      return (
                        <li key={mid} className="text-sm text-gray-900">{med?.name || mid}</li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Canonical Stage 4 · Converge on ONE mediator ─── */}
      {m.status === 'MEDIATOR_CONVERGE' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 4 · Agree on a single mediator</h2>
          <p className="text-sm text-gray-500 mt-1">
            From the combined shortlist, each side picks exactly one mediator. The
            mediation proceeds only when <strong>both sides pick the same one</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Your final pick</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{myFinal ? mediatorName(myFinal) : 'Not yet'}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Other side's final pick</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{otherFinal ? mediatorName(otherFinal) : 'Not yet'}</p>
            </div>
          </div>

          {myFinal && otherFinal && myFinal !== otherFinal && (
            <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded p-3">
              To start the mediation, both parties must choose the same single mediator from the list.
            </p>
          )}

          {actingSide && (
            <div className="mt-5">
              {mediatorsQ.isLoading ? (
                <p className="text-sm text-gray-500">Loading mediators…</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {Array.from(new Set([...(m.initiatorMediatorShortlist || []), ...(m.respondentMediatorShortlist || [])])).map((mid) => {
                    const med = mediatorsQ.data?.find((x) => x.id === mid)
                    const selected = myFinal === mid
                    const otherWants = otherFinal === mid
                    return (
                      <div key={mid} className={`p-3 rounded-lg border ${selected ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{med?.name || mid}</p>
                            <p className="text-xs text-gray-500">
                              {(med?.mediationSpecializations?.length ? med?.mediationSpecializations : med?.specializations || [])?.join(', ') || 'General mediation'}
                            </p>
                            {otherWants && !selected && (
                              <p className="text-xs text-emerald-700 mt-1">Other side picked this mediator.</p>
                            )}
                          </div>
                          <button
                            onClick={() => submitFinal.mutate(mid)}
                            disabled={submitFinal.isPending || selected}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                              selected ? 'bg-gray-200 text-gray-700' : 'bg-primary text-white hover:bg-primary-dark'
                            } disabled:opacity-60`}
                          >
                            {selected ? 'Your pick' : 'Pick'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {!actingSide && (
            <p className="mt-4 text-xs text-gray-500">Your side's lawyer is converging on the mediator.</p>
          )}
        </div>
      )}

      {/* ─── Canonical Stage 5 · Pay the mediation fee (50/50) ─── */}
      {m.status === 'AWAITING_MEDIATION_FEE' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 5 · Mediation fee</h2>
          <p className="text-sm text-gray-500 mt-1">
            Both sides agreed on a mediator. The flat mediation fee is
            <strong> ₹{feeTotal}</strong>, split 50/50 between the two clients
            (<strong>₹{feeHalf} each</strong>). The mediator is contacted only after
            both halves are secured in escrow.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
            <div className={`p-3 rounded-lg border ${(myFeeSide === 'INITIATOR' ? m.initiatorFeePaidAt : m.respondentFeePaidAt) ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Your half</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{myFeePaid ? 'Paid ✓' : `₹${feeHalf} due`}</p>
            </div>
            <div className={`p-3 rounded-lg border ${otherFeePaid ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Other party's half</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{otherFeePaid ? 'Paid ✓' : 'Pending'}</p>
            </div>
          </div>
          {myFeeSide && !myFeePaid && (
            <button
              onClick={payFeeHalf}
              disabled={payingFee}
              className="mt-5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {payingFee ? 'Opening payment…' : `Pay my half (₹${feeHalf})`}
            </button>
          )}
          {myFeeSide && myFeePaid && !otherFeePaid && (
            <p className="mt-4 text-xs text-emerald-700">Your half is secured. Waiting for the other party to pay theirs.</p>
          )}
          {!myFeeSide && (
            <p className="mt-4 text-xs text-gray-500">Only the disputing clients pay the mediation fee.</p>
          )}
        </div>
      )}

      {/* ─── Canonical Stage 6 · Mediator accepts / declines ─── */}
      {m.status === 'MEDIATOR_OFFERED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 6 · Mediator's decision</h2>
          {isMediator ? (
            <>
              <p className="text-sm text-gray-500 mt-1">
                Both parties agreed to appoint you and the fee is secured in escrow.
                Review both sides, then accept or decline.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Initiator's side</p>
                  <p className="font-medium text-gray-900 mt-1">{m.disputeTitle}</p>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{m.disputeDescription}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Respondent's side</p>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{m.respondentStatement || '(no statement provided)'}</p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => mediatorOffer.mutate(true)}
                  disabled={mediatorOffer.isPending}
                  className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
                >
                  Accept assignment
                </button>
                <button
                  onClick={() => { if (confirm('Decline this mediation? Both clients will be refunded and the parties must agree on another mediator.')) mediatorOffer.mutate(false) }}
                  disabled={mediatorOffer.isPending}
                  className="px-5 py-2 rounded-lg border border-red-600 text-red-600 text-sm font-medium hover:bg-red-600 hover:text-white disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 mt-1">
              The fee is secured. {m.mediator?.name || 'The chosen mediator'} has been asked to
              accept the assignment. If they decline, both halves are refunded and you'll
              re-converge on another mediator.
            </p>
          )}
        </div>
      )}

      {/* ─── Legacy Step 1 · Add your lawyer ─── */}
      {(m.status === 'AWAITING_RESPONDENT_LAWYER' ||
        (m.status === 'AWAITING_MEDIATOR_SELECTION' && (isInitiatorClient || isRespondentClient))) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 1 · Each side adds their lawyer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Mediation works best with both sides represented. You can proceed without one,
            but it's recommended for legally enforceable outcomes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <LawyerStatus label="Initiator's lawyer" party={m.initiatorClient} lawyer={m.initiatorLawyer} isYours={isInitiatorClient} />
            <LawyerStatus label="Respondent's lawyer" party={m.respondentClient} lawyer={m.respondentLawyer} isYours={isRespondentClient} />
          </div>
          {(canInitiatorAdd || canRespondentAdd) && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <button
                onClick={() => setPickerFor(canInitiatorAdd ? 'initiator' : 'respondent')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
              >
                + Add my lawyer ({canInitiatorAdd ? 'initiator' : 'respondent'} side)
              </button>
              <button onClick={() => navigate('/app/search')} className="ml-3 text-sm text-primary hover:underline">
                Browse all lawyers →
              </button>
            </div>
          )}
          {isInitiatorClient && m.initiatorLawyerId && <p className="mt-3 text-xs text-emerald-700">Your lawyer is attached. ✓</p>}
          {isRespondentClient && m.respondentLawyerId && m.status === 'AWAITING_RESPONDENT_LAWYER' && (
            <p className="mt-3 text-xs text-emerald-700">Your lawyer is locked in. Moving to mediator selection…</p>
          )}
        </div>
      )}

      {/* Shared lawyer-picker modal (legacy) */}
      {pickerFor && (
        <Modal title={`Add ${pickerFor === 'initiator' ? 'initiator' : 'respondent'}-side lawyer`} onClose={() => setPickerFor(null)}>
          {lawyersQ.isLoading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading lawyers…</p>
          ) : lawyersQ.isError ? (
            <p className="text-sm text-red-600 py-6 text-center">Couldn't load the lawyer directory. Try “Browse all lawyers”.</p>
          ) : (() => {
            const list = lawyersQ.data?.items || lawyersQ.data?.data || lawyersQ.data?.lawyers || []
            const mutation = pickerFor === 'initiator' ? attachInitiatorLawyer : attachRespondentLawyer
            if (list.length === 0) {
              return (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">No lawyers in the directory right now.</p>
                  <button onClick={() => { setPickerFor(null); navigate('/app/search') }} className="mt-2 text-sm text-primary hover:underline">
                    Browse all lawyers →
                  </button>
                </div>
              )
            }
            return (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {list.slice(0, 30).map((l: any) => (
                  <button
                    key={l.id}
                    onClick={() => mutation.mutate(l.id)}
                    disabled={mutation.isPending}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-gray-50 disabled:opacity-60"
                  >
                    <p className="font-medium text-gray-900">{l.name}</p>
                    <p className="text-xs text-gray-500">{(l.specializations || []).join(', ') || 'General practice'}</p>
                  </button>
                ))}
                <button onClick={() => { setPickerFor(null); navigate('/app/search') }} className="text-sm text-primary hover:underline mt-2">
                  Browse all lawyers →
                </button>
              </div>
            )
          })()}
        </Modal>
      )}

      {/* Legacy Step 2 · Mediator selection */}
      {m.status === 'AWAITING_MEDIATOR_SELECTION' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 2 · Both parties: agree on a mediator</h2>
          <p className="text-sm text-gray-500 mt-1">
            Each side picks a mediator. If both pick the same one, the session opens.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
            <PickStatus label="Your pick" id={myPick} />
            <PickStatus label="Other party's pick" id={otherPick} />
          </div>
          {(isInitiatorClient || isRespondentClient) && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={() => setShowMediators(true)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark">
                {myPick ? 'Change My Pick' : 'Choose a Mediator'}
              </button>
              {myPick && otherPick && myPick !== otherPick && (
                <button
                  onClick={onRequestNeutral}
                  disabled={neutralMut.isPending}
                  className="px-4 py-2 rounded-lg border border-amber-500 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-60"
                >
                  {neutralMut.isPending ? 'Assigning…' : "Can't agree? Request a neutral mediator"}
                </button>
              )}
            </div>
          )}
          {myPick && otherPick && myPick !== otherPick && (
            <p className="mt-3 text-xs text-amber-700">
              You and the other party picked different mediators. Re-pick to match, or
              request a platform-appointed neutral mediator to proceed.
            </p>
          )}
        </div>
      )}

      {/* Active session (canonical ACTIVE + legacy IN_SESSION) */}
      {(m.status === 'IN_SESSION' || m.status === 'ACTIVE') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Mediation in session</h2>
          <p className="text-sm text-gray-500 mt-1">
            A group with every participant (both clients, both lawyers, the mediator) is open.
            Discuss there and start the caucus video call right from the group when you're ready.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {groupChatId ? (
              <Link to={`${chatBasePath}?chatId=${groupChatId}`} className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark">
                Open mediation group chat
              </Link>
            ) : (
              <span className="text-sm text-gray-500">Setting up the group chat… refresh in a moment.</span>
            )}
            <Link to={roomPath} className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-50">
              Open caucus video room directly
            </Link>
            {isMediator && (
              <button onClick={() => setShowConclude(true)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Conclude Mediation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Concluded states (legacy + canonical) */}
      {(m.status === 'RESOLVED' || m.status === 'ESCALATED_TO_CASE' || m.status === 'SETTLED' || m.status === 'NON_SETTLEMENT') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">
            {m.status === 'RESOLVED' || m.status === 'SETTLED' ? 'Mediation Resolved' : 'Mediation Escalated to Case'}
          </h2>
          {m.settlementTerms && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Settlement Terms</p>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{m.settlementTerms}</p>
            </div>
          )}
          {m.closureNotes && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Mediator's Notes</p>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{m.closureNotes}</p>
            </div>
          )}
          {m.conclusionDocumentUrls && m.conclusionDocumentUrls.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Documents</p>
              <ul className="mt-1 space-y-1">
                {m.conclusionDocumentUrls.map((url, i) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Document {i + 1} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.escalatedCaseId && (
            <Link
              to={isLawyer ? `/lawyer/case/${m.escalatedCaseId}` : `/app/case/${m.escalatedCaseId}`}
              className="inline-block mt-4 text-sm text-primary hover:underline"
            >
              View Case →
            </Link>
          )}
        </div>
      )}

      {/* Cancelled terminal state */}
      {m.status === 'CANCELLED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Mediation Cancelled</h2>
          <p className="text-sm text-gray-600 mt-1">
            This mediation was closed before the session started. No settlement was reached and
            nothing here can be used as evidence in a later proceeding. Any fee paid was refunded.
          </p>
          {m.closureNotes && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reason</p>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{m.closureNotes}</p>
            </div>
          )}
          <Link to={isLawyer ? '/lawyer/mediations' : '/app/mediations'} className="inline-block mt-4 text-sm text-primary hover:underline">
            ← Back to mediations
          </Link>
        </div>
      )}

      {/* Mediator picker modal (legacy) */}
      {showMediators && (
        <Modal title="Choose a Mediator" onClose={() => setShowMediators(false)}>
          {mediatorsQ.isLoading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading mediators…</p>
          ) : eligibleMediators.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No mediators available right now.</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {eligibleMediators.map((med) => {
                const selected = myPick === med.id
                const bothWant = otherPick === med.id
                return (
                  <div key={med.id} className={`p-4 rounded-lg border ${selected ? 'border-primary bg-blue-50' : 'border-gray-200'} `}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{med.name}</p>
                        <p className="text-xs text-gray-500">
                          {(med.mediationSpecializations?.length ? med.mediationSpecializations : med.specializations || []).join(', ') || 'General mediation'}
                        </p>
                        <div className="text-xs text-gray-600 mt-1 flex gap-3 flex-wrap">
                          {typeof med.experienceYears === 'number' && <span>{med.experienceYears}y exp</span>}
                          {typeof med.rating === 'number' && <span>★ {med.rating.toFixed(1)}</span>}
                          {typeof med.mediationFee === 'number' && <span>₹{med.mediationFee}/session</span>}
                          {med.city && <span>{med.city}</span>}
                        </div>
                        {med.mediatorBio && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{med.mediatorBio}</p>}
                      </div>
                      <button
                        onClick={() => pickMediator.mutate(med.id)}
                        disabled={pickMediator.isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selected ? 'bg-gray-200 text-gray-700' : 'bg-primary text-white hover:bg-primary-dark'} disabled:opacity-60`}
                      >
                        {selected ? 'Picked' : 'Pick'}
                      </button>
                    </div>
                    {bothWant && !selected && <p className="text-xs text-emerald-700 mt-2">Other party picked this mediator.</p>}
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {/* Conclude modal */}
      {showConclude && (
        <Modal title="Conclude Mediation" onClose={() => setShowConclude(false)}>
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['RESOLVED', 'ESCALATED_TO_CASE'] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => setConcludeForm((f) => ({ ...f, outcome: o }))}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                    concludeForm.outcome === o ? 'border-primary bg-blue-50 text-primary' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {o === 'RESOLVED' ? 'Settlement Reached' : 'Escalate to Case'}
                </button>
              ))}
            </div>
            {concludeForm.outcome === 'RESOLVED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Settlement terms</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  value={concludeForm.settlementTerms}
                  onChange={(e) => setConcludeForm({ ...concludeForm, settlementTerms: e.target.value })}
                  placeholder="Summarize the agreed settlement."
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closure notes</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                value={concludeForm.closureNotes}
                onChange={(e) => setConcludeForm({ ...concludeForm, closureNotes: e.target.value })}
                placeholder="Observations, next steps, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Documents (optional)</label>
              <p className="text-xs text-gray-500 mb-2">Upload the settlement agreement, non-settlement report, or any supporting documents.</p>
              <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files || files.length === 0) return
                    setConcludeUploading(true)
                    try {
                      const urls: string[] = []
                      for (const f of Array.from(files)) {
                        urls.push(await uploadToCloudinary(f, { folder: 'documents' }))
                      }
                      setConcludeForm((prev) => ({ ...prev, documentUrls: [...prev.documentUrls, ...urls] }))
                    } catch (err: any) {
                      setError(err?.message || 'Document upload failed')
                    } finally {
                      setConcludeUploading(false)
                    }
                  }}
                />
                <span className="px-3 py-1.5 rounded-lg border border-primary hover:bg-primary hover:text-white transition-colors">
                  {concludeUploading ? 'Uploading…' : '+ Attach documents'}
                </span>
              </label>
              {concludeForm.documentUrls.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {concludeForm.documentUrls.map((u, i) => (
                    <li key={u} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                      <span className="truncate">Document {i + 1}</span>
                      <button onClick={() => setConcludeForm((prev) => ({ ...prev, documentUrls: prev.documentUrls.filter((x) => x !== u) }))} className="text-red-500 hover:text-red-700">remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowConclude(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => conclude.mutate()}
                disabled={conclude.isPending || concludeUploading}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-60"
              >
                {conclude.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const Party: FC<{ title: string; party?: { name: string; email?: string } | null }> = ({ title, party }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
    {party ? (
      <>
        <p className="font-medium text-gray-900 truncate">{party.name}</p>
        {party.email && <p className="text-xs text-gray-500 truncate">{party.email}</p>}
      </>
    ) : (
      <p className="text-sm text-gray-400">—</p>
    )}
  </div>
)

const PickStatus: FC<{ label: string; id?: string | null }> = ({ label, id }) => (
  <div className={`p-3 rounded-lg border ${id ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className="text-sm font-medium text-gray-900 mt-1">{id ? 'Submitted' : 'Not yet'}</p>
  </div>
)

const LawyerSlot: FC<{
  title: string
  lawyer?: { name?: string; email?: string } | null
  canAdd: boolean
  onAdd: () => void
}> = ({ title, lawyer, canAdd, onAdd }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
    {lawyer?.name ? (
      <>
        <p className="font-medium text-gray-900 truncate">{lawyer.name}</p>
        {lawyer.email && <p className="text-xs text-gray-500 truncate">{lawyer.email}</p>}
      </>
    ) : canAdd ? (
      <button
        onClick={onAdd}
        className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary-dark"
      >
        + Add my lawyer
      </button>
    ) : (
      <p className="text-sm text-gray-400">—</p>
    )}
  </div>
)

const LawyerStatus: FC<{
  label: string
  party?: { name?: string } | null
  lawyer?: { name?: string; email?: string } | null
  isYours?: boolean
}> = ({ label, party, lawyer, isYours }) => (
  <div className={`p-3 rounded-lg border ${lawyer ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      {isYours && (
        <span className="text-[10px] font-semibold text-primary bg-white border border-primary/30 px-1.5 py-0.5 rounded">You</span>
      )}
    </div>
    {lawyer?.name ? (
      <>
        <p className="font-medium text-gray-900 mt-1 truncate">{lawyer.name}</p>
        {lawyer.email && <p className="text-xs text-gray-500 truncate">{lawyer.email}</p>}
      </>
    ) : (
      <p className="text-sm font-medium text-amber-800 mt-1">
        {isYours ? 'Pick a lawyer below ↓' : `Waiting on ${party?.name || 'the other side'}`}
      </p>
    )}
  </div>
)

const Modal: FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
)

export default MediationDetailPage
