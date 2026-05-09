import { FC, useEffect, useMemo, useState } from 'react'
import { Wallet, Loader2, RotateCcw, ArrowDownToLine, ExternalLink } from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'
import { friendlyError } from '@/utils/errors'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

interface WalletRow {
  id: string
  userId?: string
  balance: number
  currency?: string
  updatedAt?: string
  _count?: { transactions?: number }
}

interface WithdrawalRow {
  id: string
  userId?: string
  walletId?: string
  amount: number
  status: string
  createdAt: string
  reversedAt?: string | null
  // Server includes nested wallet for withdrawals
  wallet?: { userId?: string; balance?: number }
}

interface UserInfo {
  id: string
  name?: string
  email?: string
  role?: string
  avatarUrl?: string | null
}

const statusColor = (s: string) => {
  const c = s.toUpperCase()
  if (c === 'PENDING') return 'bg-amber-50 text-amber-700'
  if (c === 'COMPLETED' || c === 'PAID') return 'bg-green-50 text-green-700'
  if (c === 'REVERSED') return 'bg-blue-50 text-blue-700'
  if (c === 'FAILED') return 'bg-red-50 text-red-700'
  return 'bg-gray-100 text-gray-700'
}

const roleColor = (r?: string) => {
  switch ((r || '').toUpperCase()) {
    case 'CLIENT': return 'bg-blue-50 text-blue-700'
    case 'LAWYER': return 'bg-green-50 text-green-700'
    case 'ORGANIZATION': return 'bg-purple-50 text-purple-700'
    case 'COURT_ADMIN': return 'bg-amber-50 text-amber-700'
    case 'ADMIN': return 'bg-red-50 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const AdminWalletsPage: FC = () => {
  const [tab, setTab] = useState<'wallets' | 'withdrawals'>('wallets')
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([])
  const [withdrawalsCount, setWithdrawalsCount] = useState<{ pending: number; total: number }>({ pending: 0, total: 0 })
  const [userMap, setUserMap] = useState<Record<string, UserInfo>>({})
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  /**
   * Resolve a batch of userIds to {name, email, role} via parallel
   * `adminApi.getUserById` calls. The server's wallet endpoints only carry
   * `userId`, so we fan out one call per unique user — pages are capped at
   * 100 rows so this is bounded. Already-cached IDs are skipped.
   */
  const resolveUsers = async (ids: string[]) => {
    const fresh = ids.filter((id) => id && !userMap[id])
    if (fresh.length === 0) return
    setResolving(true)
    try {
      const results = await Promise.allSettled(fresh.map((id) => adminApi.getUserById(id)))
      const next: Record<string, UserInfo> = {}
      results.forEach((r, i) => {
        const id = fresh[i]
        if (r.status === 'fulfilled') {
          const u = (r.value.data?.data ?? r.value.data?.user ?? r.value.data) as UserInfo
          if (u && (u.name || u.email || u.role)) next[id] = { ...u, id }
        }
      })
      if (Object.keys(next).length > 0) {
        setUserMap((prev) => ({ ...prev, ...next }))
      }
    } finally {
      setResolving(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'wallets') {
        const [walletsRes, withdrawalsRes] = await Promise.allSettled([
          adminApi.getAllWallets({ limit: 100 }),
          adminApi.getWithdrawals({ limit: 100 }),
        ])
        if (walletsRes.status === 'fulfilled') {
          const rows = unwrapList<WalletRow>(walletsRes.value.data)
          setWallets(rows)
          // Fire-and-forget user resolution. Each row renders a placeholder
          // (UserCell shows "Resolving…" while resolving=true) and gets filled
          // in as the parallel getUserById calls return. Awaiting here would
          // keep the page-level spinner up until all N round-trips finish, so
          // a slow user-lookup blocks the entire table from rendering.
          void resolveUsers(rows.map((r) => r.userId).filter(Boolean) as string[])
        }
        // Side-fetch withdrawals just for the header summary so the user
        // doesn't have to switch tabs to know if anything's queued.
        if (withdrawalsRes.status === 'fulfilled') {
          const wRows = unwrapList<WithdrawalRow>(withdrawalsRes.value.data)
          setWithdrawalsCount({
            pending: wRows.filter((w) => (w.status || '').toUpperCase() === 'PENDING').length,
            total: wRows.length,
          })
        }
      } else {
        const res = await adminApi.getWithdrawals({ limit: 100 })
        const rows = unwrapList<WithdrawalRow>(res.data)
        setWithdrawals(rows)
        setWithdrawalsCount({
          pending: rows.filter((w) => (w.status || '').toUpperCase() === 'PENDING').length,
          total: rows.length,
        })
        const ids = rows
          .map((r) => r.userId || r.wallet?.userId)
          .filter(Boolean) as string[]
        void resolveUsers(ids)
      }
    } catch (err) {
      showToast(friendlyError(err, "We couldn't load wallet data."), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const handleReverse = async (w: WithdrawalRow) => {
    if (!confirm(`Reverse withdrawal of ${fmt(w.amount)}? This refunds the user.`)) return
    setBusyId(w.id)
    try {
      await adminApi.reverseWithdrawal(w.id)
      showToast('Withdrawal reversed', 'success')
      await load()
    } catch (err) {
      showToast(friendlyError(err, "We couldn't reverse this withdrawal."), 'error')
    } finally {
      setBusyId(null)
    }
  }

  // Aggregate stats for the wallets header
  const walletStats = useMemo(() => {
    const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0)
    return { count: wallets.length, totalBalance }
  }, [wallets])

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

      {/* Quick stats */}
      {tab === 'wallets' && wallets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total wallets" value={String(walletStats.count)} hint="across all roles" />
          <Stat
            label="Combined balance"
            value={fmt(walletStats.totalBalance)}
            accent="text-emerald-700"
            hint="held in user wallets"
          />
          <Stat
            label="Active wallets"
            value={String(wallets.filter((w) => (w._count?.transactions ?? 0) > 0).length)}
            hint="have transactions"
          />
          <Stat
            label="Pending withdrawals"
            value={String(withdrawalsCount.pending)}
            accent={withdrawalsCount.pending > 0 ? 'text-amber-700' : undefined}
            hint={
              withdrawalsCount.total === 0
                ? 'nothing on record'
                : `${withdrawalsCount.total} total request${withdrawalsCount.total === 1 ? '' : 's'}`
            }
          />
        </div>
      )}

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
          <EmptyState message="No wallets on the platform yet." />
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wallets.map((w) => {
                  const u = w.userId ? userMap[w.userId] : null
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <UserCell user={u} userId={w.userId} resolving={resolving} />
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u?.role} resolving={resolving && !u} />
                      </td>
                      <td className="px-4 py-3 font-semibold">{fmt(w.balance)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {w._count?.transactions != null
                          ? `${w._count.transactions} txn${w._count.transactions === 1 ? '' : 's'}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {w.updatedAt ? new Date(w.updatedAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        withdrawals.length === 0 ? (
          <EmptyState message="No withdrawals on record." />
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.map((w) => {
                  const id = w.userId || w.wallet?.userId
                  const u = id ? userMap[id] : null
                  return (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <UserCell user={u} userId={id} resolving={resolving} />
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u?.role} resolving={resolving && !u} />
                      </td>
                      <td className="px-4 py-3 font-semibold flex items-center gap-1">
                        <ArrowDownToLine className="w-3.5 h-3.5 text-gray-400" />
                        {fmt(w.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(w.status)}`}>{w.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(w.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}</td>
                      <td className="px-4 py-3 text-right">
                        {w.status !== 'REVERSED' && w.status !== 'FAILED' && (
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
                  )
                })}
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

// ─── Helpers ───────────────────────────────────────────────────────────

const Stat: FC<{ label: string; value: string; accent?: string; hint?: string }> = ({ label, value, accent, hint }) => (
  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
    <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className={`text-xl font-semibold mt-0.5 ${accent || 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
  </div>
)

const EmptyState: FC<{ message: string }> = ({ message }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">
    <Wallet className="w-10 h-10 mx-auto text-gray-300 mb-2" />
    {message}
  </div>
)

const UserCell: FC<{ user?: UserInfo | null; userId?: string; resolving: boolean }> = ({ user, userId, resolving }) => {
  if (user) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name || ''} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {(user.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate flex items-center gap-1">
            {user.name || 'Unnamed'}
          </div>
          {user.email && <div className="text-xs text-gray-500 truncate">{user.email}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-mono truncate">
          {userId ? `${userId.slice(0, 8)}…` : 'unknown'}
        </div>
        <div className="text-[10px] text-gray-400">
          {resolving ? 'Resolving…' : userId ? 'User not found' : '—'}
        </div>
      </div>
    </div>
  )
}

const RoleBadge: FC<{ role?: string | null; resolving: boolean }> = ({ role, resolving }) => {
  if (!role) {
    return <span className="text-xs text-gray-400">{resolving ? '…' : '—'}</span>
  }
  return (
    <span className={`inline-block text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${roleColor(role)}`}>
      {role}
    </span>
  )
}

export default AdminWalletsPage
