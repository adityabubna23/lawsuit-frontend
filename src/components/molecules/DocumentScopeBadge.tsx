import { FC, useState } from 'react'
import { Lock, Users, Globe, Loader2, ChevronDown } from 'lucide-react'
import { casesApi } from '@/services/api'

export type DocScope = 'PRIVATE' | 'COUNSEL' | 'SHARED'

const META: Record<DocScope, { label: string; hint: string; Icon: typeof Lock; cls: string }> = {
  PRIVATE: { label: 'Private', hint: 'Only you can see this', Icon: Lock, cls: 'bg-gray-100 text-gray-700' },
  COUNSEL: { label: 'Counsel', hint: 'Visible to everyone on this matter', Icon: Users, cls: 'bg-blue-50 text-blue-700' },
  SHARED: { label: 'Shared', hint: 'Explicitly shared', Icon: Globe, cls: 'bg-green-50 text-green-700' },
}

interface Props {
  documentId: string
  scope: DocScope
  /** Only the uploader (or admin) can change scope — pass false to render read-only. */
  editable?: boolean
  onChanged?: (scope: DocScope) => void
}

/**
 * Compact share-scope badge + (optional) inline editor for a document.
 * Reflects/edits the server-side Document.scope. Read-only for non-uploaders.
 */
const DocumentScopeBadge: FC<Props> = ({ documentId, scope, editable = false, onChanged }) => {
  const [current, setCurrent] = useState<DocScope>(scope)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const m = META[current]

  const change = async (next: DocScope) => {
    setOpen(false)
    if (next === current) return
    setBusy(true)
    try {
      await casesApi.setDocumentScope(documentId, next)
      setCurrent(next)
      onChanged?.(next)
    } catch {
      /* keep prior value on failure */
    } finally {
      setBusy(false)
    }
  }

  if (!editable) {
    return (
      <span title={m.hint} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${m.cls}`}>
        <m.Icon className="w-3 h-3" /> {m.label}
      </span>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${m.cls} hover:opacity-80`}
        title={m.hint}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <m.Icon className="w-3 h-3" />}
        {m.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute z-[1000] mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {(Object.keys(META) as DocScope[]).map((s) => {
            const mm = META[s]
            return (
              <button
                key={s}
                onClick={() => change(s)}
                className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-start gap-2 ${s === current ? 'bg-gray-50' : ''}`}
              >
                <mm.Icon className="w-3.5 h-3.5 mt-0.5 text-gray-500" />
                <span>
                  <span className="block text-xs font-medium text-gray-800">{mm.label}</span>
                  <span className="block text-[10px] text-gray-500">{mm.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DocumentScopeBadge
