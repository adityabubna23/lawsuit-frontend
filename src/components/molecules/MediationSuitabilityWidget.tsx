import { FC, useState } from 'react'
import { Scale, Loader2, CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react'
import { mediationApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

type Level = 'HIGHLY_SUITABLE' | 'MODERATE' | 'NOT_SUITABLE'
interface Reason { text: string; impact: 'positive' | 'negative' | 'neutral' }
interface Result { score: number; level: Level; summary: string; reasons: Reason[] }

const LEVEL_STYLES: Record<Level, { color: string; bg: string; ring: string; Icon: typeof CheckCircle2 }> = {
  HIGHLY_SUITABLE: { color: 'text-green-700',   bg: 'bg-green-50',   ring: 'ring-green-200',   Icon: CheckCircle2 },
  MODERATE:        { color: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-200',   Icon: MinusCircle  },
  NOT_SUITABLE:    { color: 'text-red-700',     bg: 'bg-red-50',     ring: 'ring-red-200',     Icon: AlertCircle  },
}

const LEVEL_LABEL: Record<Level, string> = {
  HIGHLY_SUITABLE: 'Highly suitable',
  MODERATE: 'Moderate fit',
  NOT_SUITABLE: 'Not a good fit',
}

interface Props {
  /** Pre-fill the case type if you have it from the parent form. */
  defaultCaseType?: string
  className?: string
}

/**
 * Mediation suitability scoring (heuristic). Drop this on any page that
 * touches "should this be mediated?" — currently the New Mediation page.
 * Pure UI on top of /mediations/suitability; no AI yet (server can swap).
 */
const MediationSuitabilityWidget: FC<Props> = ({ defaultCaseType = '', className }) => {
  const [caseType, setCaseType] = useState(defaultCaseType)
  const [amount, setAmount] = useState('')
  const [cooperation, setCooperation] = useState<'YES' | 'NO' | 'UNKNOWN'>('UNKNOWN')
  const [urgency, setUrgency] = useState<'URGENT' | 'STANDARD'>('STANDARD')
  const [priorAttempt, setPriorAttempt] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const handleScore = async () => {
    setBusy(true); setError(null)
    try {
      const res = await mediationApi.scoreSuitability({
        caseType: caseType || undefined,
        amount: amount ? Number(amount) : undefined,
        cooperation,
        urgency,
        priorAttempt,
      })
      setResult(res.data as Result)
    } catch (err) {
      setError(friendlyError(err, "Couldn't score the case right now."))
    } finally {
      setBusy(false)
    }
  }

  const style = result ? LEVEL_STYLES[result.level] : null

  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-4 sm:p-5 ${className ?? ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-gray-900">Is mediation a good fit?</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">A quick heuristic, not legal advice. Helps you and the client gauge whether to proceed with mediation or go straight to representation.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Case type</label>
          <input
            value={caseType}
            onChange={(e) => setCaseType(e.target.value)}
            placeholder="e.g. FAMILY, COMMERCIAL, CRIMINAL"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount in dispute (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 250000"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Other party willing?</label>
          <select
            value={cooperation}
            onChange={(e) => setCooperation(e.target.value as any)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          >
            <option value="UNKNOWN">Unknown</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Urgency</label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as any)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          >
            <option value="STANDARD">Standard</option>
            <option value="URGENT">Urgent (interim relief likely needed)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
          <input type="checkbox" checked={priorAttempt} onChange={(e) => setPriorAttempt(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary/30" />
          A prior mediation attempt has already failed on this dispute.
        </label>
      </div>

      <button
        onClick={handleScore}
        disabled={busy}
        className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
        {busy ? 'Scoring…' : 'Score this case'}
      </button>

      {error && <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {result && style && (
        <div className={`mt-4 rounded-xl p-4 ring-1 ${style.bg} ${style.ring}`}>
          <div className="flex items-center gap-2">
            <style.Icon className={`w-5 h-5 ${style.color}`} />
            <div className={`font-semibold ${style.color}`}>{LEVEL_LABEL[result.level]}</div>
            <div className="ml-auto text-sm font-mono text-gray-600">{result.score} / 100</div>
          </div>
          <p className="mt-2 text-sm text-gray-700">{result.summary}</p>
          {result.reasons.length > 0 && (
            <ul className="mt-3 space-y-1">
              {result.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-1 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      r.impact === 'positive' ? 'bg-green-500' : r.impact === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-gray-700">{r.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default MediationSuitabilityWidget
