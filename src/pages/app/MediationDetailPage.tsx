import { FC, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mediationApi, lawyersApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { Mediation, MediatorProfile } from '@/types/mediation'

const statusBadge: Record<string, string> = {
  AWAITING_RESPONDENT_LAWYER: 'bg-amber-100 text-amber-800',
  AWAITING_MEDIATOR_SELECTION: 'bg-sky-100 text-sky-800',
  IN_SESSION: 'bg-emerald-100 text-emerald-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ESCALATED_TO_CASE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
}
const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())

const MediationDetailPage: FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [showMediators, setShowMediators] = useState(false)
  // Which side's lawyer picker modal is open (null = closed). Opened from
  // either the top roster card or the Step 1 panel so there's a single,
  // reliable add-lawyer entry point regardless of where the user looks.
  const [pickerFor, setPickerFor] = useState<null | 'initiator' | 'respondent'>(null)
  const [showConclude, setShowConclude] = useState(false)
  const [concludeForm, setConcludeForm] = useState<{ outcome: 'RESOLVED' | 'ESCALATED_TO_CASE'; settlementTerms: string; closureNotes: string }>({
    outcome: 'RESOLVED',
    settlementTerms: '',
    closureNotes: '',
  })

  const q = useQuery({
    queryKey: ['mediation', id],
    queryFn: async () => (await mediationApi.getById(id)).data.data as Mediation,
    enabled: !!id,
  })

  const mediatorsQ = useQuery({
    queryKey: ['mediators'],
    queryFn: async () => (await mediationApi.listMediators()).data.data as MediatorProfile[],
    enabled: showMediators,
  })

  // Lawyer directory is needed any time either side still needs to pick a
  // lawyer — that's both AWAITING_RESPONDENT_LAWYER and
  // AWAITING_MEDIATOR_SELECTION (the initiator can keep adding their lawyer
  // even after the respondent has settled their representation).
  const lawyersQ = useQuery({
    queryKey: ['lawyers-all'],
    queryFn: async () => (await lawyersApi.getAll({ limit: 50 })).data,
    enabled:
      q.data?.status === 'AWAITING_RESPONDENT_LAWYER' ||
      q.data?.status === 'AWAITING_MEDIATOR_SELECTION',
  })

  const pickMediator = useMutation({
    mutationFn: (mediatorId: string) => mediationApi.pickMediator(id, mediatorId),
    onSuccess: () => {
      setShowMediators(false)
      qc.invalidateQueries({ queryKey: ['mediation', id] })
      qc.invalidateQueries({ queryKey: ['mediations'] })
    },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to pick mediator'),
  })

  // Two attach mutations — one per side. We pick whichever the current
  // viewer needs in the UI below. Both invalidate the same caches and
  // refresh the detail view in place (no nav away from the mediation —
  // the original respondent flow bounced to /app/lawyers which broke
  // continuity).
  const attachRespondentLawyer = useMutation({
    mutationFn: (lawyerId: string) => mediationApi.attachRespondentLawyer(id, lawyerId),
    onSuccess: () => {
      setPickerFor(null)
      setError(null)
      qc.invalidateQueries({ queryKey: ['mediation', id] })
      qc.invalidateQueries({ queryKey: ['mediations'] })
    },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to attach lawyer'),
  })
  const attachInitiatorLawyer = useMutation({
    mutationFn: (lawyerId: string) => mediationApi.attachInitiatorLawyer(id, lawyerId),
    onSuccess: () => {
      setPickerFor(null)
      setError(null)
      qc.invalidateQueries({ queryKey: ['mediation', id] })
      qc.invalidateQueries({ queryKey: ['mediations'] })
    },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to attach lawyer'),
  })

  const conclude = useMutation({
    mutationFn: () => mediationApi.conclude(id, concludeForm),
    onSuccess: () => {
      setShowConclude(false)
      qc.invalidateQueries({ queryKey: ['mediation', id] })
      qc.invalidateQueries({ queryKey: ['mediations'] })
    },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to conclude'),
  })

  // GAP A — cancel a pre-session mediation (either disputing party).
  const cancelMut = useMutation({
    mutationFn: (reason?: string) => mediationApi.cancelMediation(id, reason),
    onSuccess: () => {
      setError(null)
      qc.invalidateQueries({ queryKey: ['mediation', id] })
      qc.invalidateQueries({ queryKey: ['mediations'] })
    },
    onError: (e: any) => setError(e?.response?.data?.error || 'Failed to cancel mediation'),
  })

  const m = q.data
  const isInitiator = !!m && user?.id === m.initiatorClientId
  const isRespondent = !!m && user?.id === m.respondentClientId
  const isMediator = !!m && user?.id === m.mediatorId
  const isLawyer = user?.role === 'LAWYER'

  // Who can add/change their lawyer right now.
  //  - Initiator: any pre-session state (their step doesn't gate the flow,
  //    so they can settle representation before OR after the respondent).
  //  - Respondent: only AWAITING_RESPONDENT_LAWYER (their pick advances
  //    the mediation to mediator selection — matches the backend guard).
  const canInitiatorAdd =
    isInitiator &&
    !m?.initiatorLawyerId &&
    (m?.status === 'AWAITING_RESPONDENT_LAWYER' || m?.status === 'AWAITING_MEDIATOR_SELECTION')
  const canRespondentAdd =
    isRespondent && !m?.respondentLawyerId && m?.status === 'AWAITING_RESPONDENT_LAWYER'

  // GAP A — either disputing party can cancel while the mediation hasn't
  // started (matches the backend CANCELLABLE guard).
  const canCancel =
    (isInitiator || isRespondent) &&
    (m?.status === 'AWAITING_RESPONDENT_LAWYER' || m?.status === 'AWAITING_MEDIATOR_SELECTION')

  const onCancelMediation = () => {
    const reason = prompt(
      'Cancel this mediation?\n\nThis closes it for everyone. Optional reason (shown to the other party):',
    )
    // prompt() → null on Cancel (abort), '' on blank submit (proceed without reason).
    if (reason === null) return
    cancelMut.mutate(reason || undefined)
  }

  const myPick = isInitiator ? m?.initiatorMediatorPick : isRespondent ? m?.respondentMediatorPick : null
  const otherPick = isInitiator ? m?.respondentMediatorPick : isRespondent ? m?.initiatorMediatorPick : null

  const roomPath = useMemo(() => (isLawyer ? `/lawyer/mediation/${id}/room` : `/app/mediation/${id}/room`), [id, isLawyer])

  if (q.isLoading) return <div className="py-16 text-center text-gray-500">Loading…</div>
  if (!m) return <div className="py-16 text-center text-gray-500">Mediation not found.</div>

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

        {/* GAP A — pre-session exit. Without this an abandoned mediation
            (e.g. respondent never adds a lawyer) is a permanent zombie row.
            Only the disputing parties, only before the session is live. */}
        {canCancel && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-gray-500">
              Not moving forward? Either party can close this mediation before the session starts.
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

      {/* Step 1 · Add your lawyer
          Symmetric flow — each side adds their own lawyer independently.
          The "Add my lawyer" button opens the SAME modal picker the top
          roster card uses, so there's one reliable entry point. The
          respondent picking advances the mediation (legacy gate); the
          initiator can add/change right up to the session start. */}
      {(m.status === 'AWAITING_RESPONDENT_LAWYER' ||
        (m.status === 'AWAITING_MEDIATOR_SELECTION' && (isInitiator || isRespondent))) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 1 · Each side adds their lawyer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Mediation works best with both sides represented. You can proceed without one,
            but it's recommended for legally enforceable outcomes.
          </p>

          {/* Status strip — at-a-glance view of both sides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <LawyerStatus
              label="Initiator's lawyer"
              party={m.initiatorClient}
              lawyer={m.initiatorLawyer}
              isYours={isInitiator}
            />
            <LawyerStatus
              label="Respondent's lawyer"
              party={m.respondentClient}
              lawyer={m.respondentLawyer}
              isYours={isRespondent}
            />
          </div>

          {/* Your-turn CTA — opens the shared modal picker */}
          {(canInitiatorAdd || canRespondentAdd) && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <button
                onClick={() => setPickerFor(canInitiatorAdd ? 'initiator' : 'respondent')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
              >
                + Add my lawyer ({canInitiatorAdd ? 'initiator' : 'respondent'} side)
              </button>
              <button
                onClick={() => navigate('/app/search')}
                className="ml-3 text-sm text-primary hover:underline"
              >
                Browse all lawyers →
              </button>
            </div>
          )}

          {/* Done / status messages */}
          {isInitiator && m.initiatorLawyerId && (
            <p className="mt-3 text-xs text-emerald-700">Your lawyer is attached. ✓</p>
          )}
          {isRespondent && m.respondentLawyerId && m.status === 'AWAITING_RESPONDENT_LAWYER' && (
            <p className="mt-3 text-xs text-emerald-700">Your lawyer is locked in. Moving to mediator selection…</p>
          )}
          {!isInitiator && !isRespondent && (
            <p className="mt-3 text-xs text-gray-500">
              You're not a party to this mediation. Only the initiator and respondent can change representation.
            </p>
          )}
        </div>
      )}

      {/* Shared lawyer-picker modal — used by both the top roster cards and
          the Step 1 CTA. One source of truth so the add-lawyer flow can't
          silently disappear behind a status-condition edge case. */}
      {pickerFor && (
        <Modal
          title={`Add ${pickerFor === 'initiator' ? 'initiator' : 'respondent'}-side lawyer`}
          onClose={() => setPickerFor(null)}
        >
          {lawyersQ.isLoading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading lawyers…</p>
          ) : lawyersQ.isError ? (
            <p className="text-sm text-red-600 py-6 text-center">
              Couldn't load the lawyer directory. Try “Browse all lawyers”.
            </p>
          ) : (() => {
            // Lawyer search API returns `{ items, total, page, limit }`.
            const list =
              lawyersQ.data?.items ||
              lawyersQ.data?.data ||
              lawyersQ.data?.lawyers ||
              []
            const mutation = pickerFor === 'initiator' ? attachInitiatorLawyer : attachRespondentLawyer
            if (list.length === 0) {
              return (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">No lawyers in the directory right now.</p>
                  <button
                    onClick={() => {
                      setPickerFor(null)
                      navigate('/app/search')
                    }}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
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
                    <p className="text-xs text-gray-500">
                      {(l.specializations || []).join(', ') || 'General practice'}
                    </p>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setPickerFor(null)
                    navigate('/app/search')
                  }}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  Browse all lawyers →
                </button>
              </div>
            )
          })()}
        </Modal>
      )}

      {/* Step: Mediator selection */}
      {m.status === 'AWAITING_MEDIATOR_SELECTION' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 2 · Both parties: agree on a mediator</h2>
          <p className="text-sm text-gray-500 mt-1">
            Each side picks a mediator. When both picks match, the caucus room opens. Otherwise, keep picking until you agree.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
            <PickStatus label="Your pick" id={myPick} />
            <PickStatus label="Other party's pick" id={otherPick} />
          </div>
          {(isInitiator || isRespondent) && (
            <button
              onClick={() => setShowMediators(true)}
              className="mt-5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
            >
              {myPick ? 'Change My Pick' : 'Choose a Mediator'}
            </button>
          )}
        </div>
      )}

      {/* Step: In session */}
      {m.status === 'IN_SESSION' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Step 3 · Caucus session</h2>
          <p className="text-sm text-gray-500 mt-1">
            The mediation session is live. All authorized participants (both clients, both lawyers, the mediator) can join the caucus room.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to={roomPath}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Join Caucus Room
            </Link>
            {isMediator && (
              <button
                onClick={() => setShowConclude(true)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              >
                Conclude Mediation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Concluded states */}
      {(m.status === 'RESOLVED' || m.status === 'ESCALATED_TO_CASE') && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">
            {m.status === 'RESOLVED' ? 'Mediation Resolved' : 'Mediation Escalated to Case'}
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

      {/* Cancelled terminal state — GAP A. Without this a cancelled
          mediation renders as just the header card with no explanation. */}
      {m.status === 'CANCELLED' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900">Mediation Cancelled</h2>
          <p className="text-sm text-gray-600 mt-1">
            This mediation was closed before the session started. No settlement was reached and
            nothing here can be used as evidence in a later proceeding.
          </p>
          {m.closureNotes && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Reason</p>
              <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{m.closureNotes}</p>
            </div>
          )}
          <Link
            to={isLawyer ? '/lawyer/mediations' : '/app/mediations'}
            className="inline-block mt-4 text-sm text-primary hover:underline"
          >
            ← Back to mediations
          </Link>
        </div>
      )}

      {/* Mediator picker modal */}
      {showMediators && (
        <Modal title="Choose a Mediator" onClose={() => setShowMediators(false)}>
          {mediatorsQ.isLoading ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading mediators…</p>
          ) : !mediatorsQ.data || mediatorsQ.data.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No mediators available right now.</p>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {mediatorsQ.data.map((med) => {
                const selected = myPick === med.id
                const bothWant = otherPick === med.id
                return (
                  <div
                    key={med.id}
                    className={`p-4 rounded-lg border ${selected ? 'border-primary bg-blue-50' : 'border-gray-200'} `}
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
                    {bothWant && !selected && (
                      <p className="text-xs text-emerald-700 mt-2">Other party picked this mediator.</p>
                    )}
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
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowConclude(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => conclude.mutate()}
                disabled={conclude.isPending}
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
    <p className="text-sm font-medium text-gray-900 mt-1">{id ? 'Pick submitted' : 'Not yet picked'}</p>
  </div>
)

/**
 * Top-roster lawyer card. Shows the attached lawyer, OR an actionable
 * "+ Add my lawyer" button when it's the viewer's side and they haven't
 * picked one yet. This guarantees the add affordance is visible right
 * where the empty "—" used to be — independent of the Step 1 section.
 */
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

/** Compact "this side's lawyer" status chip — shared between initiator and respondent. */
const LawyerStatus: FC<{
  label: string
  party?: { name?: string } | null
  lawyer?: { name?: string; email?: string } | null
  isYours?: boolean
}> = ({ label, party, lawyer, isYours }) => (
  <div
    className={`p-3 rounded-lg border ${lawyer ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      {isYours && (
        <span className="text-[10px] font-semibold text-primary bg-white border border-primary/30 px-1.5 py-0.5 rounded">
          You
        </span>
      )}
    </div>
    {lawyer?.name ? (
      <>
        <p className="font-medium text-gray-900 mt-1 truncate">{lawyer.name}</p>
        {lawyer.email && <p className="text-xs text-gray-500 truncate">{lawyer.email}</p>}
      </>
    ) : (
      <p className="text-sm font-medium text-amber-800 mt-1">
        {isYours
          ? 'Pick a lawyer below ↓'
          : `Waiting on ${party?.name || 'the other side'}`}
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
