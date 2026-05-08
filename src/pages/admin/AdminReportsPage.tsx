import { FC, useEffect, useState } from 'react'
import { Bug, Loader2, Search, Clock, CheckCircle2 } from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface Report {
  id: string
  title: string
  description: string
  screenshotUrl: string | null
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
  createdAt: string
  resolvedAt: string | null
  userId?: string
}

const tabs: { value: '' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED'; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
]

const AdminReportsPage: FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<{ OPEN?: number; IN_REVIEW?: number; RESOLVED?: number }>({})
  const [status, setStatus] = useState<'' | 'OPEN' | 'IN_REVIEW' | 'RESOLVED'>('OPEN')
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listReports({ status: status || undefined, q: q.trim() || undefined, limit: 50 })
      // Server returns { items, total, page, limit, counts: { OPEN, IN_REVIEW, RESOLVED } }
      setReports(unwrapList<Report>(res.data))
      setCounts(res.data?.counts ?? {})
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handleStatusChange = async (r: Report, next: Report['status']) => {
    setBusyId(r.id)
    try {
      await adminApi.updateReportStatus(r.id, next)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50">
          <Bug className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issue reports</h1>
          <p className="text-sm text-gray-500">Triage user-submitted bug reports.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${status === t.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            {t.label}
            {t.value && counts[t.value] != null && <span className="ml-1.5 text-xs opacity-75">({counts[t.value]})</span>}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search title or description…"
          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">No reports.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{r.title}</div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.description}</p>
                  {r.screenshotUrl && (
                    <a href={r.screenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                      View screenshot
                    </a>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    Submitted {new Date(r.createdAt).toLocaleString('en-IN')}
                    {r.resolvedAt && <> • Resolved {new Date(r.resolvedAt).toLocaleString('en-IN')}</>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${r.status === 'RESOLVED' ? 'bg-green-50 text-green-700' : r.status === 'IN_REVIEW' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {r.status === 'RESOLVED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {r.status}
                  </span>
                  <select
                    value={r.status}
                    disabled={busyId === r.id}
                    onChange={(e) => handleStatusChange(r, e.target.value as Report['status'])}
                    className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_REVIEW">In review</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminReportsPage
