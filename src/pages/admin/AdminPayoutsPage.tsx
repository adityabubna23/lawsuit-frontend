import { FC, useEffect, useState } from 'react'
import { Wallet, Loader2, RefreshCw, Check, AlertTriangle } from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList, unwrapObject } from '@/utils/unwrap'

interface Payout {
  id: string
  amount: number
  status: string
  createdAt: string
  recipientType?: string
  recipientId?: string
  recipientName?: string
  appointmentId?: string
}

interface Summary {
  pending?: number
  released?: number
  refunded?: number
  disputed?: number
  totalEscrow?: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const statusBadge = (s: string) => {
  const c = s.toUpperCase()
  if (c === 'HELD') return 'bg-amber-50 text-amber-700'
  if (c === 'RELEASED') return 'bg-green-50 text-green-700'
  if (c === 'REFUNDED') return 'bg-blue-50 text-blue-700'
  if (c === 'DISPUTED') return 'bg-red-50 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

const AdminPayoutsPage: FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [list, sum] = await Promise.all([
        adminApi.listPayouts({ status: statusFilter || undefined, limit: 50 }),
        adminApi.getPayoutSummary(),
      ])
      setPayouts(unwrapList<Payout>(list.data))
      // Server wraps the summary as { summary: {...} }
      setSummary(unwrapObject<Summary>(sum.data, 'summary'))
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load payouts', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleAction = async (id: string, action: 'disburse' | 'refund' | 'dispute') => {
    let reason: string | undefined
    if (action === 'refund' || action === 'dispute') {
      reason = prompt(`Reason for ${action}?`) || undefined
      if (action === 'refund' && !reason) return
    } else {
      if (!confirm('Disburse this payout?')) return
    }
    setBusyId(id)
    try {
      if (action === 'disburse') await adminApi.disbursePayout(id)
      else if (action === 'refund') await adminApi.refundPayout(id, reason)
      else await adminApi.openDispute(id, reason)
      showToast(`Payout ${action}d`, 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || `Failed to ${action}`, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts & Escrow</h1>
          <p className="text-sm text-gray-500">Disburse held funds to lawyers/orgs, process refunds, and manage disputes.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SumCard label="Pending escrow" value={fmt(summary.totalEscrow ?? summary.pending ?? 0)} />
          <SumCard label="Released" value={fmt(summary.released ?? 0)} />
          <SumCard label="Refunded" value={fmt(summary.refunded ?? 0)} />
          <SumCard label="Disputed" value={String(summary.disputed ?? 0)} />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'HELD', 'RELEASED', 'REFUNDED', 'DISPUTED'].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${statusFilter === s
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <Wallet className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">No payouts in this view.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.recipientName || p.recipientId?.slice(0, 8) || '—'}</div>
                    {p.recipientType && <div className="text-xs text-gray-500">{p.recipientType}</div>}
                  </td>
                  <td className="px-4 py-3 font-medium">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'HELD' && (
                        <>
                          <button
                            onClick={() => handleAction(p.id, 'disburse')}
                            disabled={busyId === p.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" /> Disburse
                          </button>
                          <button
                            onClick={() => handleAction(p.id, 'refund')}
                            disabled={busyId === p.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            Refund
                          </button>
                          <button
                            onClick={() => handleAction(p.id, 'dispute')}
                            disabled={busyId === p.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3 h-3" /> Dispute
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

const SumCard: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
    <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
    <div className="text-xl font-semibold text-gray-900 mt-1">{value}</div>
  </div>
)

export default AdminPayoutsPage
