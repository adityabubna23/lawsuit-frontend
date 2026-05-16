import { FC, FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { mediationFlowApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

/**
 * Stage 0 — Mediation Initiate.
 *
 * Lives at `/app/mediations/new` (also reachable from a case page via
 * `?caseId=…`). The form captures the opposition contact, the dispute
 * description, and optionally the opposition lawyer's email. On submit
 * we create a DRAFT mediation server-side and navigate the user to the
 * detail page where they explicitly click "Send Invitation" (Stage 1).
 *
 * Why a two-step form instead of single-page submit: the spec wants the
 * initiator to be able to draft + review + send. Auto-sending on form
 * submit is hostile UX for a legal document.
 */
const MIN_DESC = 10
const MAX_DESC = 5000

const MediationInitiatePage: FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const caseId = searchParams.get('caseId') || undefined

  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [respondentPhone, setRespondentPhone] = useState('')
  const [respondentLawyerEmail, setRespondentLawyerEmail] = useState('')
  const [disputeTitle, setDisputeTitle] = useState('')
  const [disputeDescription, setDisputeDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const descCharCount = disputeDescription.trim().length
  const descValid = descCharCount >= MIN_DESC && descCharCount <= MAX_DESC

  const canSubmit =
    respondentName.trim() &&
    respondentEmail.trim() &&
    disputeTitle.trim().length >= 3 &&
    descValid &&
    !submitting

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await mediationFlowApi.initiate({
        caseId,
        respondentName: respondentName.trim(),
        respondentEmail: respondentEmail.trim(),
        respondentPhone: respondentPhone.trim() || undefined,
        respondentLawyerEmail: respondentLawyerEmail.trim() || undefined,
        disputeTitle: disputeTitle.trim(),
        disputeDescription: disputeDescription.trim(),
      })
      const id = (res.data as { mediation?: { id?: string } }).mediation?.id
      if (!id) throw new Error('Server did not return a mediation id')
      // Land on the Phase 1+2 detail page (PLURAL `/mediations/`). The
      // singular `/mediation/:id` is the legacy page which has no
      // invite-status / edit / resend UI for this flow — sending users
      // there was why the invite looked "stuck" and uneditable.
      navigate(`/app/mediations/${id}`, { replace: true })
    } catch (err) {
      setError(friendlyError(err, "Couldn't create the mediation. Please try again."))
    } finally {
      setSubmitting(false)
    }
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

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
          Start a mediation
        </h1>
        <p className="text-sm text-gray-600">
          We'll create a confidential mediation request. You'll review it
          before the invitation is emailed to the other party.
        </p>
      </header>

      <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-3 mb-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 leading-relaxed">
          Mediation is confidential under the <strong>Mediation Act 2023 §27</strong>.
          Anything said inside a mediation is privileged — it cannot be used
          against either party in court. Any settlement reached is enforceable
          as a court decree.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Other party's name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="e.g. Mr. Suresh Kumar"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Other party's email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={respondentEmail}
              onChange={(e) => setRespondentEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="other@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Other party's phone (optional)
            </label>
            <input
              type="tel"
              value={respondentPhone}
              onChange={(e) => setRespondentPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="+91 9876543210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Their lawyer's email (optional)
            </label>
            <input
              type="email"
              value={respondentLawyerEmail}
              onChange={(e) => setRespondentLawyerEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="lawyer@example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Dispute title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={disputeTitle}
            onChange={(e) => setDisputeTitle(e.target.value)}
            required
            minLength={3}
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="One-line summary, e.g. 'Property partition between siblings'"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Describe the dispute <span className="text-red-500">*</span>
          </label>
          <textarea
            value={disputeDescription}
            onChange={(e) => setDisputeDescription(e.target.value)}
            required
            minLength={MIN_DESC}
            maxLength={MAX_DESC}
            rows={6}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="What happened, what's the disagreement, and what would resolution look like for you?"
          />
          <div className={`mt-1 text-xs ${descValid ? 'text-gray-500' : 'text-amber-700'}`}>
            {descCharCount} / {MAX_DESC} characters (minimum {MIN_DESC})
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Creating…' : 'Create mediation'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MediationInitiatePage
