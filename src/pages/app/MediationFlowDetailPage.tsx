import { FC, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  Send,
  Loader2,
  AlertCircle,
  Video,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react'
import { mediationFlowApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'
import { useAuthStore } from '@/stores/authStore'

/**
 * Mediation Phase 1 detail page.
 *
 * Drives the Stage 0 → Stage 1 transition (the initiator sees a "Send
 * invitation" CTA on a DRAFT mediation) and the Stage 5-baseline
 * activation (either party sees "Open chat" / "Start video call" once
 * both sides have accepted).
 *
 * State map:
 *   DRAFT                       — initiator only; show Send CTA + form preview
 *   AWAITING_RESPONDENT         — show "waiting for X to accept"
 *   AWAITING_LAWYER_ASSIGNMENT  — both parties on; show Activate CTA
 *                                 (Phase 1 baseline skips Stages 3/4)
 *   ACTIVE                      — show Chat + Video links
 *   DECLINED / EXPIRED_*        — terminal; show closure message
 */

interface MediationData {
  id: string
  status: string
  disputeTitle: string
  disputeDescription: string
  initiatorClientId: string
  respondentClientId: string | null
  initiatorLawyerId: string | null
  respondentLawyerId: string | null
  mediatorId: string | null
  mediatorShortlist: string[]
  mediatorAcceptedAt: string | null
  settlementTerms: string | null
  closureNotes: string | null
  createdAt: string
  startedAt: string | null
  concludedAt: string | null
  confidential: boolean
  dailyRoomUrl: string | null
  // §18 extension state
  extendedUntil: string | null
  extensionRequestedById: string | null
  extensionRequestedAt: string | null
  extensionApprovedById: string | null
  extensionApprovedAt: string | null
  invites?: Array<{
    id: string
    respondentEmail: string
    respondentName: string | null
    partyRole: string
    status: string
    expiresAt: string
    acceptedAt: string | null
    declinedAt: string | null
  }>
  parties?: Array<{
    side: 'A' | 'B'
    clientId: string
    lawyerId: string | null
    confirmedAt: string | null
  }>
}

interface MediatorPanel {
  id: string
  name: string
  avatarUrl: string | null
  mediatorBio: string | null
  mediationFee: number | null
  mediationSpecializations: string[]
  languages: string[]
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft — not yet sent', color: 'bg-gray-100 text-gray-700' },
  AWAITING_RESPONDENT: {
    label: 'Waiting for response',
    color: 'bg-amber-50 text-amber-800 border border-amber-200',
  },
  AWAITING_LAWYER_ASSIGNMENT: {
    label: 'Both parties on — ready to activate',
    color: 'bg-blue-50 text-blue-800 border border-blue-200',
  },
  AWAITING_MEDIATOR: { label: 'Picking mediator', color: 'bg-blue-50 text-blue-800' },
  ACTIVE: { label: 'Active', color: 'bg-emerald-50 text-emerald-800 border border-emerald-200' },
  SETTLED: { label: 'Settled', color: 'bg-emerald-50 text-emerald-800' },
  NON_SETTLEMENT: { label: 'Closed — no settlement', color: 'bg-gray-100 text-gray-700' },
  DECLINED: { label: 'Declined by the other party', color: 'bg-red-50 text-red-700' },
  EXPIRED_INVITE: { label: 'Invitation expired', color: 'bg-gray-100 text-gray-700' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700' },
  EXPIRED: { label: 'Expired (90+60 days)', color: 'bg-gray-100 text-gray-700' },
}

const MediationFlowDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUserId = useAuthStore((s) => s.user?.id)

  const [data, setData] = useState<MediationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionRunning, setActionRunning] = useState<'send' | 'activate' | null>(null)

  const fetchOne = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await mediationFlowApi.getById(id)
      setData((res.data as { mediation: MediationData }).mediation)
    } catch (err) {
      setError(friendlyError(err, "Couldn't load this mediation."))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOne()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const isInitiator = data?.initiatorClientId === authUserId
  const statusInfo = data ? STATUS_LABELS[data.status] : null

  const sendInvitation = async () => {
    if (!id || !data) return
    const inv = data.invites?.[0]
    // Reuse the email originally captured at Stage 0 — kept on the
    // first invite row's respondentEmail / respondentName. For DRAFT
    // mediations with no invite yet, the initiator hasn't told us
    // the recipient email anywhere else, so they need to add it
    // here. The simplest UX: prompt() inline.
    const respondentEmail = inv?.respondentEmail || prompt('Recipient email?') || ''
    const respondentName = inv?.respondentName || prompt('Recipient name?') || ''
    if (!respondentEmail || !respondentName) return
    setActionRunning('send')
    try {
      await mediationFlowApi.sendInvitation(id, { respondentEmail, respondentName })
      await fetchOne()
    } catch (err) {
      alert(friendlyError(err, "Couldn't send invitation."))
    } finally {
      setActionRunning(null)
    }
  }

  const activate = async () => {
    if (!id) return
    setActionRunning('activate')
    try {
      const res = await mediationFlowApi.activate(id)
      const payload = res.data as { chat?: { id?: string } }
      await fetchOne()
      const chatId = payload.chat?.id
      if (chatId) {
        // Route into the existing unified chat surface with the chat preselected.
        navigate(`/app/chats?chatId=${chatId}`)
      }
    } catch (err) {
      alert(friendlyError(err, "Couldn't activate the mediation."))
    } finally {
      setActionRunning(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error || 'Mediation not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <header className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          {statusInfo && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}
          {data.confidential && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Confidential (MA 2023 §27)
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{data.disputeTitle}</h1>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Dispute description
        </h2>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {data.disputeDescription}
        </p>
      </section>

      {/* Action CTA — depends on status + role */}
      {data.status === 'DRAFT' && isInitiator && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Ready to send</p>
              <p className="text-xs text-gray-600 mt-0.5">
                The other party will receive an invitation by email with a 14-day window to accept.
              </p>
            </div>
            <button
              onClick={sendInvitation}
              disabled={actionRunning === 'send'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {actionRunning === 'send' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send invitation
            </button>
          </div>
        </section>
      )}

      {data.status === 'AWAITING_RESPONDENT' && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 mb-4">
          <p className="text-sm text-amber-900">
            Waiting for the other party to accept. They have until{' '}
            <strong>{new Date(data.invites?.[0]?.expiresAt || '').toLocaleDateString('en-IN')}</strong>{' '}
            to respond.
          </p>
        </section>
      )}

      {data.status === 'AWAITING_LAWYER_ASSIGNMENT' && (
        <StageLawyerAssignment
          mediation={data}
          authUserId={authUserId ?? ''}
          onRefresh={fetchOne}
        />
      )}

      {data.status === 'AWAITING_MEDIATOR' && (
        <StageMediatorSelection
          mediation={data}
          authUserId={authUserId ?? ''}
          onRefresh={fetchOne}
        />
      )}

      {data.status === 'ACTIVE' && (
        <StageActive
          mediation={data}
          authUserId={authUserId ?? ''}
          onRefresh={fetchOne}
        />
      )}

      {data.status === 'SETTLED' && (
        <StageSettled mediation={data} authUserId={authUserId ?? ''} />
      )}

      {['DECLINED', 'EXPIRED_INVITE', 'WITHDRAWN', 'EXPIRED', 'NON_SETTLEMENT'].includes(
        data.status,
      ) && (
        <StageClosed mediation={data} authUserId={authUserId ?? ''} onRefresh={fetchOne} />
      )}
    </div>
  )
}

export default MediationFlowDetailPage

// ─────────────────────────────────────────────────────────────────────
// Stage 3 — Lawyer assignment
// ─────────────────────────────────────────────────────────────────────

const StageLawyerAssignment: FC<{
  mediation: MediationData
  authUserId: string
  onRefresh: () => Promise<void>
}> = ({ mediation, authUserId, onRefresh }) => {
  const navigate = useNavigate()
  const myParty = mediation.parties?.find((p) => p.clientId === authUserId)
  const mySide = myParty?.side
  const otherParty = mediation.parties?.find((p) => p.side !== mySide)
  const myConfirmed = !!myParty?.confirmedAt
  const otherConfirmed = !!otherParty?.confirmedAt
  const [running, setRunning] = useState<'pick' | 'skip' | 'activate' | null>(null)
  const [pickedLawyerId, setPickedLawyerId] = useState('')

  const choose = async (choice: 'PICK' | 'SKIP') => {
    setRunning(choice === 'PICK' ? 'pick' : 'skip')
    try {
      if (choice === 'PICK') {
        if (!pickedLawyerId.trim()) {
          alert('Enter a lawyer ID or pick one from search')
          return
        }
        await mediationFlowApi.chooseLawyer(mediation.id, {
          choice: 'PICK',
          lawyerId: pickedLawyerId.trim(),
        })
      } else {
        await mediationFlowApi.chooseLawyer(mediation.id, { choice: 'SKIP' })
      }
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't save your choice."))
    } finally {
      setRunning(null)
    }
  }

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 mb-4">
      <p className="text-sm font-medium text-gray-900 mb-1">
        Pick a lawyer (or skip) to continue
      </p>
      <p className="text-xs text-gray-600 mb-3">
        You can bring a lawyer to represent you in this mediation, or proceed without one.
        Both sides must make a choice before mediator selection opens.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
        <span className="text-gray-600">Your side:</span>
        <span
          className={`px-2 py-0.5 rounded-full ${myConfirmed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
        >
          {myConfirmed ? 'Confirmed' : 'Awaiting your choice'}
        </span>
        <span className="text-gray-600 ml-3">Other side:</span>
        <span
          className={`px-2 py-0.5 rounded-full ${otherConfirmed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}
        >
          {otherConfirmed ? 'Confirmed' : 'Awaiting'}
        </span>
      </div>
      {!myConfirmed && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={pickedLawyerId}
              onChange={(e) => setPickedLawyerId(e.target.value)}
              placeholder="Lawyer ID (find one on /app/search)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => choose('PICK')}
              disabled={running !== null || !pickedLawyerId.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {running === 'pick' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Use this lawyer
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/search')}
              className="text-xs text-primary hover:underline"
            >
              Open lawyer search →
            </button>
            <span className="text-xs text-gray-400">·</span>
            <button
              onClick={() => choose('SKIP')}
              disabled={running !== null}
              className="text-xs text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
            >
              Skip — proceed without a lawyer
            </button>
          </div>
        </div>
      )}
      {myConfirmed && !otherConfirmed && (
        <p className="text-xs text-emerald-700">
          Your choice is saved. Waiting for the other side.
        </p>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 4 — Mediator selection
// ─────────────────────────────────────────────────────────────────────

const StageMediatorSelection: FC<{
  mediation: MediationData
  authUserId: string
  onRefresh: () => Promise<void>
}> = ({ mediation, authUserId, onRefresh }) => {
  const isSideA = mediation.initiatorClientId === authUserId
  const isSideB = mediation.respondentClientId === authUserId
  const isProposedMediator =
    !!mediation.mediatorId && mediation.mediatorId === authUserId
  const [running, setRunning] = useState<string | null>(null)
  const [panel, setPanel] = useState<MediatorPanel[]>([])
  const [selectedShortlist, setSelectedShortlist] = useState<string[]>([])

  useEffect(() => {
    // Load the mediator panel when side A still needs to propose.
    if (isSideA && mediation.mediatorShortlist.length === 0) {
      mediationFlowApi
        .listMediators()
        .then((res) => setPanel(((res.data as { items: MediatorPanel[] })?.items) || []))
        .catch(() => {})
    }
  }, [isSideA, mediation.mediatorShortlist.length])

  const toggleShortlist = (id: string) => {
    setSelectedShortlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    )
  }

  const propose = async () => {
    if (selectedShortlist.length !== 3) {
      alert('Pick exactly 3 mediators')
      return
    }
    setRunning('propose')
    try {
      await mediationFlowApi.proposeShortlist(mediation.id, selectedShortlist)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't propose shortlist."))
    } finally {
      setRunning(null)
    }
  }

  const pickFromShortlist = async (mediatorId: string) => {
    setRunning('pick')
    try {
      await mediationFlowApi.pickMediator(mediation.id, mediatorId)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't pick mediator."))
    } finally {
      setRunning(null)
    }
  }

  const autoAssign = async () => {
    setRunning('auto')
    try {
      await mediationFlowApi.autoAssignMediator(mediation.id)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't auto-assign."))
    } finally {
      setRunning(null)
    }
  }

  const accept = async () => {
    setRunning('accept')
    try {
      await mediationFlowApi.acceptMediator(mediation.id)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't accept."))
    } finally {
      setRunning(null)
    }
  }

  const activate = async () => {
    setRunning('activate')
    try {
      await mediationFlowApi.activate(mediation.id)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't activate."))
    } finally {
      setRunning(null)
    }
  }

  // ── Render branches ───────────────────────────────────────────────

  // Side A — propose the shortlist
  if (isSideA && mediation.mediatorShortlist.length === 0) {
    return (
      <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 mb-4">
        <p className="text-sm font-medium text-gray-900 mb-2">
          Pick 3 mediators to propose ({selectedShortlist.length}/3)
        </p>
        <p className="text-xs text-gray-600 mb-3">
          Per Mediation Act 2023, both parties must agree on the mediator.
          You shortlist 3 → the other side picks one (or rejects all and
          the platform auto-assigns).
        </p>
        <div className="space-y-1 max-h-72 overflow-y-auto mb-3">
          {panel.map((m) => {
            const selected = selectedShortlist.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleShortlist(m.id)}
                className={`w-full text-left p-2 rounded-lg border ${selected ? 'border-primary bg-white' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={selected} readOnly />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {m.mediationSpecializations.slice(0, 3).join(' • ') || 'General mediation'}
                      {m.mediationFee ? ` · ₹${m.mediationFee}/session` : ''}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
          {panel.length === 0 && (
            <p className="text-xs text-gray-500 p-2">No accredited mediators available yet.</p>
          )}
        </div>
        <button
          onClick={propose}
          disabled={running !== null || selectedShortlist.length !== 3}
          className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {running === 'propose' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Propose these 3 mediators
        </button>
      </section>
    )
  }

  // Side B — pick from shortlist (or reject all)
  if (
    isSideB &&
    mediation.mediatorShortlist.length === 3 &&
    !mediation.mediatorId
  ) {
    return (
      <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 mb-4">
        <p className="text-sm font-medium text-gray-900 mb-2">
          The other side proposed 3 mediators — pick one or reject all
        </p>
        <div className="space-y-1 mb-3">
          {mediation.mediatorShortlist.map((id) => (
            <button
              key={id}
              onClick={() => pickFromShortlist(id)}
              disabled={running !== null}
              className="w-full text-left p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <code className="text-xs text-gray-700">{id}</code>
            </button>
          ))}
        </div>
        <button
          onClick={autoAssign}
          disabled={running !== null}
          className="text-xs text-amber-700 hover:underline disabled:opacity-50"
        >
          {running === 'auto' ? 'Assigning…' : 'Reject all — let the platform auto-assign'}
        </button>
      </section>
    )
  }

  // Mediator — accept the assignment
  if (isProposedMediator && !mediation.mediatorAcceptedAt) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 mb-4">
        <p className="text-sm font-medium text-gray-900 mb-2">
          You've been picked as the mediator for this case
        </p>
        <p className="text-xs text-gray-600 mb-3">
          You have 48 hours to accept. After acceptance, you'll get access
          to the group chat and can draft the settlement at any time.
        </p>
        <button
          onClick={accept}
          disabled={running !== null}
          className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {running === 'accept' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Accept mediation assignment
        </button>
      </section>
    )
  }

  // Mediator accepted — anyone on roster can activate
  if (mediation.mediatorAcceptedAt) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 mb-4">
        <p className="text-sm font-medium text-gray-900 mb-2">
          Mediator has accepted — ready to activate
        </p>
        <p className="text-xs text-gray-600 mb-3">
          Click below to open the group chat, video room, and start the 90-day mediation window.
        </p>
        <button
          onClick={activate}
          disabled={running !== null}
          className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {running === 'activate' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Activate mediation
        </button>
      </section>
    )
  }

  // Default — waiting for someone to act
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4 text-sm text-gray-700">
      Waiting for{' '}
      {mediation.mediatorShortlist.length === 0
        ? 'the initiator to propose 3 mediators'
        : !mediation.mediatorId
          ? 'the other side to pick a mediator'
          : 'the chosen mediator to accept'}
      .
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 5 + 6 — Active: group chat, video, draft/sign, withdraw
// ─────────────────────────────────────────────────────────────────────

const StageActive: FC<{
  mediation: MediationData
  authUserId: string
  onRefresh: () => Promise<void>
}> = ({ mediation, authUserId, onRefresh }) => {
  const navigate = useNavigate()
  const isMediator = mediation.mediatorId === authUserId
  const [running, setRunning] = useState<string | null>(null)
  const [showDraft, setShowDraft] = useState(false)
  const [showNonSettlement, setShowNonSettlement] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [settlementTerms, setSettlementTerms] = useState(mediation.settlementTerms || '')
  const [closureNotes, setClosureNotes] = useState(mediation.closureNotes || '')
  const [withdrawReason, setWithdrawReason] = useState('')

  const submitDraft = async () => {
    if (settlementTerms.trim().length < 20) {
      alert('Settlement terms must be at least 20 characters')
      return
    }
    setRunning('draft')
    try {
      await mediationFlowApi.draftSettlement(mediation.id, settlementTerms.trim())
      setShowDraft(false)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't draft settlement."))
    } finally {
      setRunning(null)
    }
  }

  const submitNonSettlement = async () => {
    if (closureNotes.trim().length < 10) {
      alert('Closure notes must be at least 10 characters')
      return
    }
    setRunning('nsr')
    try {
      await mediationFlowApi.draftNonSettlement(mediation.id, closureNotes.trim())
      setShowNonSettlement(false)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't draft report."))
    } finally {
      setRunning(null)
    }
  }

  const sign = async (kind: 'SETTLEMENT' | 'NON_SETTLEMENT_REPORT') => {
    setRunning(`sign-${kind}`)
    try {
      const res = await mediationFlowApi.sign(mediation.id, kind)
      const data = res.data as { allSigned: boolean }
      if (data.allSigned) {
        alert(
          kind === 'SETTLEMENT'
            ? 'All parties signed. Settlement is now legally enforceable under MA 2023 §27.'
            : 'All parties signed the non-settlement report.',
        )
      }
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't sign."))
    } finally {
      setRunning(null)
    }
  }

  const submitWithdraw = async () => {
    if (withdrawReason.trim().length < 5) {
      alert('Withdrawal reason must be at least 5 characters')
      return
    }
    if (!confirm('Are you sure? Withdrawal closes the mediation. The dispute will proceed in court.')) {
      return
    }
    setRunning('withdraw')
    try {
      await mediationFlowApi.withdraw(mediation.id, withdrawReason.trim())
      setShowWithdraw(false)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't withdraw."))
    } finally {
      setRunning(null)
    }
  }

  const hasSettlementDraft = !!mediation.settlementTerms
  const hasNsrDraft = !!mediation.closureNotes

  // §18 extension state — derived from the row.
  const extensionPending =
    !!mediation.extensionRequestedById && !mediation.extensionApprovedById
  const iRequestedExtension =
    extensionPending && mediation.extensionRequestedById === authUserId
  const iCanApproveExtension =
    extensionPending && !iRequestedExtension &&
    (mediation.initiatorClientId === authUserId ||
      mediation.respondentClientId === authUserId ||
      mediation.initiatorLawyerId === authUserId ||
      mediation.respondentLawyerId === authUserId)
  const alreadyExtended = !!mediation.extendedUntil

  // Side channels (privileged client↔lawyer chats). Fetched once on mount;
  // the FE only renders nav buttons — the underlying chat surface is the
  // existing chat list page.
  const [sideChannels, setSideChannels] = useState<Array<{ id: string; side: 'A' | 'B' }>>([])
  useEffect(() => {
    mediationFlowApi
      .listSideChannels(mediation.id)
      .then((res) => setSideChannels((res.data as { items?: Array<{ id: string; side: 'A' | 'B' }> })?.items ?? []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediation.id])

  const requestExtension = async () => {
    setRunning('extension-req')
    try {
      await mediationFlowApi.requestExtension(mediation.id)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't request extension."))
    } finally {
      setRunning(null)
    }
  }
  const approveExtension = async () => {
    setRunning('extension-ok')
    try {
      await mediationFlowApi.approveExtension(mediation.id)
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't approve extension."))
    } finally {
      setRunning(null)
    }
  }

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 mb-4 space-y-3">
      <div>
        <p className="text-sm text-emerald-900 mb-3">
          Mediation is active. Use the group chat for messages and start a video call
          when you're ready to talk live.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/app/chats?mediationId=${mediation.id}`)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-50"
          >
            <MessageSquare className="w-4 h-4" /> Open group chat
          </button>
          {mediation.dailyRoomUrl && (
            <a
              href={mediation.dailyRoomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <Video className="w-4 h-4" /> Open video room
            </a>
          )}
        </div>
      </div>

      {/* §18 extension status / actions */}
      {(alreadyExtended || extensionPending) && (
        <div className="pt-3 border-t border-emerald-200">
          {alreadyExtended && (
            <p className="text-sm text-gray-700">
              Mediation has been extended by 60 days under MA 2023 §18. New deadline:{' '}
              <strong>
                {new Date(mediation.extendedUntil as string).toLocaleDateString('en-IN')}
              </strong>
              .
            </p>
          )}
          {extensionPending && iRequestedExtension && (
            <p className="text-sm text-amber-800">
              Extension request pending — waiting for the other party to approve.
            </p>
          )}
          {iCanApproveExtension && (
            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-sm text-amber-900">
                The other party requested a 60-day extension under §18.
              </p>
              <button
                onClick={approveExtension}
                disabled={running !== null}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {running === 'extension-ok' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Approve 60-day extension
              </button>
            </div>
          )}
        </div>
      )}
      {!alreadyExtended && !extensionPending && (
        <div className="pt-3 border-t border-emerald-200">
          <button
            onClick={requestExtension}
            disabled={running !== null}
            className="text-xs text-amber-700 hover:underline disabled:opacity-50"
          >
            {running === 'extension-req' ? 'Requesting…' : 'Request 60-day extension under §18'}
          </button>
        </div>
      )}

      {/* Privileged side channels — only render if the actor sees any. */}
      {sideChannels.length > 0 && (
        <div className="pt-3 border-t border-emerald-200">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Privileged side channel
            {sideChannels.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-600 mb-2">
            Private chat between you and your lawyer. The mediator cannot see these
            messages (MA 2023 §27 + advocate-client privilege).
          </p>
          <div className="flex flex-wrap gap-2">
            {sideChannels.map((sc) => (
              <button
                key={sc.id}
                onClick={() => navigate(`/app/chats?chatId=${sc.id}`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-50"
              >
                <MessageSquare className="w-4 h-4" /> Open side channel (Side {sc.side})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settlement draft — mediator only */}
      {isMediator && (
        <div className="pt-3 border-t border-emerald-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-gray-900">
              Settlement {hasSettlementDraft ? '(draft ready to sign)' : '(not drafted yet)'}
            </p>
            <button
              onClick={() => setShowDraft(!showDraft)}
              className="text-xs text-primary hover:underline"
            >
              {showDraft ? 'Close' : hasSettlementDraft ? 'Edit draft' : 'Draft settlement'}
            </button>
          </div>
          {showDraft && (
            <div className="space-y-2">
              <textarea
                value={settlementTerms}
                onChange={(e) => setSettlementTerms(e.target.value)}
                rows={6}
                maxLength={10000}
                placeholder="Settlement terms — what each party agrees to do. This becomes legally enforceable as a court decree under MA 2023 §27 once all parties sign."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={submitDraft}
                disabled={running !== null}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {running === 'draft' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save & send for signatures
              </button>
            </div>
          )}
        </div>
      )}

      {/* Signing — anyone on roster */}
      {hasSettlementDraft && (
        <div className="pt-3 border-t border-emerald-200">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Settlement awaiting signatures
          </p>
          <p className="text-xs text-gray-700 mb-2 whitespace-pre-wrap leading-relaxed bg-white rounded-md p-2 border border-gray-100 max-h-32 overflow-auto">
            {mediation.settlementTerms}
          </p>
          <button
            onClick={() => sign('SETTLEMENT')}
            disabled={running !== null}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {running === 'sign-SETTLEMENT' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <CheckCircle2 className="w-4 h-4" />
            Sign settlement
          </button>
        </div>
      )}

      {/* Non-settlement draft — mediator only */}
      {isMediator && (
        <div className="pt-3 border-t border-emerald-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-medium text-gray-900">
              Non-settlement report {hasNsrDraft ? '(ready)' : ''}
            </p>
            <button
              onClick={() => setShowNonSettlement(!showNonSettlement)}
              className="text-xs text-gray-700 hover:underline"
            >
              {showNonSettlement ? 'Close' : hasNsrDraft ? 'Edit' : 'Draft NSR'}
            </button>
          </div>
          {showNonSettlement && (
            <div className="space-y-2">
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Brief explanation of why no settlement was reached. Closure is an acknowledgement — not consent."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={submitNonSettlement}
                disabled={running !== null}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {running === 'nsr' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                File Non-Settlement Report
              </button>
            </div>
          )}
        </div>
      )}

      {hasNsrDraft && (
        <div className="pt-3 border-t border-emerald-200">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Non-Settlement Report awaiting acknowledgement signatures
          </p>
          <p className="text-xs text-gray-700 mb-2 whitespace-pre-wrap leading-relaxed bg-white rounded-md p-2 border border-gray-100">
            {mediation.closureNotes}
          </p>
          <button
            onClick={() => sign('NON_SETTLEMENT_REPORT')}
            disabled={running !== null}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {running === 'sign-NON_SETTLEMENT_REPORT' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Acknowledge / sign
          </button>
        </div>
      )}

      {/* Withdraw — anyone */}
      <div className="pt-3 border-t border-emerald-200">
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="text-xs text-red-700 hover:underline"
        >
          {showWithdraw ? 'Cancel withdraw' : 'Withdraw from mediation'}
        </button>
        {showWithdraw && (
          <div className="space-y-2 mt-2">
            <textarea
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Reason for withdrawing (visible in audit log only)"
              className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200"
            />
            <button
              onClick={submitWithdraw}
              disabled={running !== null}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {running === 'withdraw' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm withdraw
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Stage 7 — Settled (settlement enforcement)
// ─────────────────────────────────────────────────────────────────────

const StageSettled: FC<{
  mediation: MediationData
  authUserId: string
}> = ({ mediation }) => {
  const onDownload = () => {
    // The enforcement endpoint sets Content-Disposition; just trigger
    // a navigation so the browser handles the download.
    window.open(mediationFlowApi.enforcementUrl(mediation.id), '_blank')
  }
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 mb-4">
      <p className="text-sm font-medium text-gray-900 mb-1">
        ✓ Mediation Settled
      </p>
      <p className="text-xs text-emerald-900 mb-3">
        The settlement is signed by all parties. Under Mediation Act 2023 §27 this
        agreement is enforceable as a court decree without a fresh trial.
      </p>
      <div className="rounded-md bg-white border border-gray-100 p-2 text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-auto mb-3">
        {mediation.settlementTerms}
      </div>
      <button
        onClick={onDownload}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
      >
        Download §27 enforcement application
      </button>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Closed terminal states — re-escalate to case (if any)
// ─────────────────────────────────────────────────────────────────────

const StageClosed: FC<{
  mediation: MediationData
  authUserId: string
  onRefresh: () => Promise<void>
}> = ({ mediation, onRefresh }) => {
  const [running, setRunning] = useState(false)

  const reescalate = async () => {
    setRunning(true)
    try {
      const res = await mediationFlowApi.reescalate(mediation.id)
      const data = res.data as { caseId: string | null; activityLogged: boolean }
      if (data.activityLogged) {
        alert('Re-escalated to your case timeline. The dispute can resume in court.')
      } else if (!data.caseId) {
        alert('No source case to re-escalate to. This was a standalone mediation.')
      } else {
        alert('Re-escalation noted, but timeline write failed (non-fatal).')
      }
      await onRefresh()
    } catch (err) {
      alert(friendlyError(err, "Couldn't re-escalate."))
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4 text-sm text-gray-700">
      <p className="mb-2">
        This mediation is closed. The dispute can proceed in court.
        All mediation communications remain confidential under MA 2023 §27 and cannot be
        used as evidence in any subsequent proceeding.
      </p>
      <button
        onClick={reescalate}
        disabled={running}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {running && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Re-escalate to my case timeline
      </button>
    </section>
  )
}
