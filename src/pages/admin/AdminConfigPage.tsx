import { FC, useEffect, useState } from 'react'
import { Loader2, Save, ScrollText, Settings } from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface ConfigEntry {
  key: string
  value: any
  description?: string
  updatedAt?: string
}

interface AuditLogEntry {
  id: string
  action: string
  actorId?: string
  actorRole?: string
  targetId?: string
  targetType?: string
  metadata?: any
  createdAt: string
}

const AdminConfigPage: FC = () => {
  const [tab, setTab] = useState<'config' | 'audit'>('config')
  const [config, setConfig] = useState<ConfigEntry[]>([])
  const [edits, setEdits] = useState<Record<string, any>>({})
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listConfig()
      // Server returns { items: [...] }
      setConfig(unwrapList<ConfigEntry>(res.data, 'config'))
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load config', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLog = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAuditLog({ limit: 100 })
      // Server returns { items, total, page, limit }
      setAuditLog(unwrapList<AuditLogEntry>(res.data))
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load audit log', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'config') loadConfig()
    else loadAuditLog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleSave = async (key: string) => {
    const newValue = edits[key]
    if (newValue === undefined) return
    setSaving(key)
    try {
      await adminApi.upsertConfig(key, newValue)
      showToast('Saved', 'success')
      setEdits((e) => {
        const { [key]: _, ...rest } = e
        return rest
      })
      await loadConfig()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Save failed', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform settings</h1>
        <p className="text-sm text-gray-500">Configuration values and a read-only audit trail of admin actions.</p>
      </div>

      <div className="flex border-b border-gray-200">
        {[
          { id: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
          { id: 'audit', label: 'Audit log', icon: <ScrollText className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : tab === 'config' ? (
        config.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">No configuration entries.</div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-100">
            {config.map((c) => {
              const draft = edits[c.key] !== undefined ? edits[c.key] : c.value
              const draftStr = typeof draft === 'object' ? JSON.stringify(draft) : String(draft ?? '')
              const isDirty = edits[c.key] !== undefined
              return (
                <div key={c.key} className="p-5 flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-medium text-gray-900">{c.key}</div>
                    {c.description && <div className="text-xs text-gray-500 mt-0.5">{c.description}</div>}
                    {c.updatedAt && <div className="text-xs text-gray-400 mt-0.5">Updated {new Date(c.updatedAt).toLocaleString('en-IN')}</div>}
                  </div>
                  <input
                    value={draftStr}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [c.key]: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-72 outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    disabled={!isDirty || saving === c.key}
                    onClick={() => handleSave(c.key)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" /> {saving === c.key ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )
            })}
          </div>
        )
      ) : (
        auditLog.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">No audit entries.</div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-100">
            {auditLog.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{a.action}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {a.actorRole && <>{a.actorRole} </>}
                      {a.actorId?.slice(0, 8)}
                      {a.targetType && <> → {a.targetType}</>}
                      {a.targetId && <> {a.targetId.slice(0, 8)}</>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString('en-IN')}</div>
                </div>
                {a.metadata && (
                  <pre className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 rounded mt-2 overflow-auto max-h-32">
                    {typeof a.metadata === 'string' ? a.metadata : JSON.stringify(a.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className={`px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminConfigPage
