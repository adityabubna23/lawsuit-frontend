import { FC, useEffect, useState } from 'react'
import { Wallet, Loader2, RotateCcw, ArrowDownToLine } from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

interface WalletRow {
  id: string
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: string
  balance: number
  currency?: string
  updatedAt?: string
}

interface WithdrawalRow {
  id: string
  userId?: string
  userName?: string
  amount: number
  status: string
  bankAccountId?: string
  createdAt: string
  reversedAt?: string | null
}

const statusColor = (s: string) => {
  const c = s.toUpperCase()
  if (c === 'PENDING') return 'bg-amber-50 text-amber-700'
  if (c === 'COMPLETED' || c === 'PAID') return 'bg-green-50 text-green-700'
  if (c === 'REVERSED') return 'bg-blue-50 text-blue-700'
  if (c === 'FAILED') return 'bg-red-50 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

const AdminWalletsPage: FC = () => {
  const [tab, setTab] = useState<'wallets' | 'withdrawals'>('wallets')
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'wallets') {
        const res = await adminApi.getAllWallets({ limit: 100 })
        setWallets(unwrapList<WalletRow>(res.data))
      } else {
        const res = await adminApi.getWithdrawals({ limit: 100 })
        setWithdrawals(unwrapList<WithdrawalRow>(res.data))
      }
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleReverse = async (w: WithdrawalRow) => {
    const reason = prompt(`Reverse withdrawal of ${fmt(w.amount)}? Enter reason:`)
    if (!reason) return
    setBusyId(w.id)
    try {
      await adminApi.reverseWithdrawal(w.id)
      showToast('Reversed', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Reverse failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50">
          <Wallet className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallets & withdrawals</h1>
          <p className="text-sm text-gray-500">Monitor wallet balances and reverse erroneous withdrawals.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {([
          { id: 'wallets', label: 'Wallets' },
          { id: 'withdrawals', label: 'Withdrawals' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : tab === 'wallets' ? (
        wallets.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">No wallets.</div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wallets.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{w.userName || '—'}</div>
                      {w.userEmail && <div className="text-xs text-gray-500">{w.userEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{w.userRole || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{fmt(w.balance)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {w.updatedAt ? new Date(w.updatedAt).toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        withdrawals.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">No withdrawals.</div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{w.userName || '—'}</div>
                      <div className="text-xs text-gray-500">{w.userId?.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 font-semibold flex items-center gap-1">
                      <ArrowDownToLine className="w-3.5 h-3.5 text-gray-400" />
                      {fmt(w.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{w.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(w.createdAt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right">
                      {w.status !== 'REVERSED' && (
                        <button
                          onClick={() => handleReverse(w)}
                          disabled={busyId === w.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" /> Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default AdminWalletsPage
