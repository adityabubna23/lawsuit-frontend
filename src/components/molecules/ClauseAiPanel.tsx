import { FC, useState } from 'react'
import { Sparkles, Loader2, Plus, Wand2, RefreshCw } from 'lucide-react'
import { agreementTemplatesApi } from '@/services/api'

interface Props {
  /** Current document content. */
  content: string
  /** Apply edited/added content back to the editor. */
  onChange: (next: string) => void
  /** Optional doc title for AI context. */
  context?: string
}

/**
 * AI clause assistant panel for the drafting editor (item 11). Three actions
 * over the moderated Groq chokepoint: Suggest a new clause (appended), Improve
 * the whole draft, Redraft to a tone. Content stays plain markdown text.
 */
const ClauseAiPanel: FC<Props> = ({ content, onChange, context }) => {
  const [clauseType, setClauseType] = useState('')
  const [tone, setTone] = useState('')
  const [busy, setBusy] = useState<null | 'suggest' | 'improve' | 'redraft'>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (
    action: 'suggest' | 'improve' | 'redraft',
    apply: (text: string) => void,
    extra: { clauseType?: string; tone?: string } = {},
  ) => {
    setBusy(action)
    setError(null)
    try {
      const res = await agreementTemplatesApi.clauseAi({
        action,
        context,
        selection: action === 'suggest' ? undefined : content,
        ...extra,
      })
      const text = (res.data as { text: string }).text
      if (text) apply(text)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'AI request failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-4 h-4 text-indigo-600" />
        <h4 className="text-sm font-semibold text-indigo-900">AI clause assistant</h4>
      </div>

      {/* Suggest a new clause */}
      <div className="flex flex-wrap items-end gap-2 mb-2">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[11px] text-gray-500 mb-0.5">Add a clause about…</label>
          <input
            value={clauseType}
            onChange={(e) => setClauseType(e.target.value)}
            placeholder="e.g. indemnity, confidentiality, termination"
            className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5"
          />
        </div>
        <button
          type="button"
          disabled={busy !== null || !clauseType.trim()}
          onClick={() => run('suggest', (t) => onChange(`${content}${content.trim() ? '\n\n' : ''}${t}`), { clauseType })}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy === 'suggest' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Suggest
        </button>
      </div>

      {/* Improve / redraft the whole draft */}
      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          disabled={busy !== null || !content.trim()}
          onClick={() => run('improve', (t) => onChange(t))}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-indigo-300 bg-white text-indigo-700 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50"
          title="Tighten language and enforceability of the whole draft"
        >
          {busy === 'improve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Improve draft
        </button>
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="redraft tone: stricter, plainer…"
          className="flex-1 min-w-[140px] text-sm border border-gray-200 rounded-md px-2 py-1.5"
        />
        <button
          type="button"
          disabled={busy !== null || !content.trim() || !tone.trim()}
          onClick={() => run('redraft', (t) => onChange(t), { tone })}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-indigo-300 bg-white text-indigo-700 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50"
        >
          {busy === 'redraft' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Redraft
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-2 text-[10px] text-gray-400">AI-generated — review before saving. Every save is versioned and restorable.</p>
    </div>
  )
}

export default ClauseAiPanel
