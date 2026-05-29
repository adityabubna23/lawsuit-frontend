import { FC, useEffect, useState } from 'react'
import { ShieldCheck, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '@/services/api'

interface ConsentRow {
  id: string
  userId: string | null
  userRole: string
  kind: string
  text: string
  contextType: string | null
  contextRef: string | null
  ip: string | null
  userAgent: string | null
  givenAt: string
  withdrawnAt: string | null
  redactedAt: string | null
}

const CONSENT_KINDS: { value: string; label: string }[] = [
  { value: '', label: 'All kinds' },
  { value: 'EKYC_AADHAAR_OTP', label: 'eKYC — Aadhaar OTP' },
  { value: 'EKYC_DIGILOCKER', label: 'eKYC — DigiLocker' },
  { value: 'DPDP_PRIVACY_NOTICE', label: 'DPDP — Privacy notice' },
  { value: 'CONSULTATION_NO_RECORDING', label: 'Consultation — No recording' },
  { value: 'MEDIATION_NO_RECORDING', label: 'Mediation — No recording' },
  { value: 'MEDIATION_CONFIDENTIALITY', label: 'Mediation — Confidentiality' },
  { value: 'DOCUMENT_SHARE_SCOPE', label: 'Document share scope' },
]

const PAGE_LIMIT = 50

const AdminConsentsPage: FC = () => {
  const [items, setItems] = useState<ConsentRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const [userId, setUserId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchPage = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.listConsents({
        userId: userId || undefined,
        kind: kind || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: PAGE_LIMIT,
      })
      const data = res.data as { items: ConsentRow[]; total: number }
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load consents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchPage() }, [page, kind, userId, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-primary">Consent &amp; provenance</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Every consent the platform captures — eKYC, DPDP privacy notice, no-recording acknowledgements, mediation confidentiality, document share-scope — with the exact statement shown to the user, IP and User-Agent.
      </p>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Kind</label>
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setPage(1) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          >
            {CONSENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">User id</label>
          <input
            value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1) }}
            placeholder="e.g. ckxxxxxxxxx"
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-700 bg-red-50">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No consent events match the current filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">When</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Kind</th>
                <th className="px-4 py-2 text-left">Context</th>
                <th className="px-4 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row) => (
                <>
                  <tr
                    key={row.id}
                    onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">{new Date(row.givenAt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.userId ?? <span className="text-gray-400">redacted</span>} <span className="text-gray-400">· {row.userRole}</span></td>
                    <td className="px-4 py-2 text-gray-700">{row.kind.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{row.contextType ?? '—'} {row.contextRef ? <span className="font-mono">· {row.contextRef.slice(0, 12)}…</span> : null}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">{row.ip ?? '—'}</td>
                  </tr>
                  {expandedId === row.id && (
                    <tr key={row.id + '-x'} className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-3 text-xs text-gray-700">
                        <div className="font-medium text-gray-900 mb-1">Statement shown</div>
                        <pre className="whitespace-pre-wrap font-sans bg-white p-3 rounded border border-gray-100">{row.text}</pre>
                        {row.userAgent && (
                          <div className="mt-2 text-gray-500"><span className="font-medium">User-Agent:</span> <span className="font-mono">{row.userAgent}</span></div>
                        )}
                        {row.withdrawnAt && (
                          <div className="mt-1 text-amber-700">Withdrawn at {new Date(row.withdrawnAt).toLocaleString('en-IN')}</div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
        {/* Pagination */}
        {!loading && total > PAGE_LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <div className="text-gray-500">Page {page} of {totalPages} · {total} events</div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminConsentsPage
