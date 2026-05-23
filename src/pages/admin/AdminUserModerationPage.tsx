import { FC, useEffect, useState } from 'react'
import { Search, Loader2, Shield, ShieldOff, Trash2, KeyRound, Filter, BadgeCheck, FileCheck } from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface UserRow {
  id: string
  name?: string
  email?: string
  phone?: string
  role: 'CLIENT' | 'LAWYER' | 'COURT_ADMIN' | 'ORGANIZATION'
  isVerified?: boolean
  isBanned?: boolean
  isDeleted?: boolean
  banReason?: string | null
  createdAt?: string
}

const ROLES: UserRow['role'][] = ['CLIENT', 'LAWYER', 'COURT_ADMIN', 'ORGANIZATION']

const AdminUserModerationPage: FC = () => {
  const [users, setUsers] = useState<UserRow[]>([])
  const [role, setRole] = useState<UserRow['role'] | ''>('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAllUsers({
        role: role || undefined,
        q: q.trim() || undefined,
        limit: 50,
      })
      // Server returns { items, total, page, limit } where each item is a flat
      // user row with bannedAt/deletedAt timestamps (not isBanned/isDeleted
      // booleans). Map timestamps to booleans so the UI can stay simple.
      const list = unwrapList<any>(res.data)
      const mapped: UserRow[] = list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isVerified: !!u.isVerified,
        isBanned: !!u.bannedAt,
        isDeleted: !!u.deletedAt,
        banReason: u.banReason || null,
        createdAt: u.createdAt,
      }))
      setUsers(mapped)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])

  const handleBan = async (u: UserRow) => {
    const reason = prompt(`Ban ${u.email}? Provide a reason:`)
    if (!reason) return
    setBusyId(u.id)
    try {
      await adminApi.banUser(u.role, u.id, reason)
      showToast('User banned', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to ban', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleUnban = async (u: UserRow) => {
    if (!confirm(`Unban ${u.email}?`)) return
    setBusyId(u.id)
    try {
      await adminApi.unbanUser(u.role, u.id)
      showToast('User unbanned', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to unban', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleSoftDelete = async (u: UserRow) => {
    const reason = prompt(`Soft-delete ${u.email}? Provide a reason (optional):`)
    if (reason === null) return
    setBusyId(u.id)
    try {
      await adminApi.softDeleteUser(u.role, u.id, reason || undefined)
      showToast('User soft-deleted', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to soft-delete', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleForceReset = async (u: UserRow) => {
    if (!confirm(`Force password reset for ${u.email}?`)) return
    setBusyId(u.id)
    try {
      await adminApi.forcePasswordReset(u.role, u.id)
      showToast('Force-reset queued', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleToggleVerification = async (u: UserRow) => {
    const next = !u.isVerified
    const reason = prompt(`${next ? 'Verify' : 'Un-verify'} ${u.email}? Reason (audit-logged):`)
    if (reason === null || reason.trim() === '') return
    setBusyId(u.id)
    try {
      await adminApi.toggleUserVerification(u.id, { isVerified: next, reason })
      showToast(next ? 'Verified' : 'Un-verified', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleKycOverride = async (u: UserRow) => {
    if (u.role !== 'LAWYER' && u.role !== 'ORGANIZATION') return
    const next = !u.isVerified
    const reason = prompt(`KYC override — set ${u.email} to ${next ? 'VERIFIED' : 'UN-VERIFIED'}. Reason (audit-logged):`)
    if (!reason) return
    setBusyId(u.id)
    try {
      if (u.role === 'LAWYER') {
        await adminApi.overrideLawyerKyc(u.id, { isVerified: next, reason })
      } else {
        await adminApi.overrideOrgKyc(u.id, { isVerified: next, reason })
      }
      showToast('KYC overridden', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User moderation</h1>
        <p className="text-sm text-gray-500">Ban, unban, soft-delete, or force-password-reset across roles. SUPER_ADMIN only.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by name / email / phone…"
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button onClick={load} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm text-gray-500">
          No users.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={u.isDeleted ? 'opacity-60' : ''}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name || '—'}</div>
                    <div className="text-xs text-gray-500">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {u.isBanned && <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 w-fit">Banned</span>}
                      {u.isDeleted && <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 w-fit">Deleted</span>}
                      {!u.isBanned && !u.isDeleted && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 w-fit">Active</span>
                      )}
                      {u.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 w-fit">
                          <BadgeCheck className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {u.isBanned ? (
                        <button
                          onClick={() => handleUnban(u)}
                          disabled={busyId === u.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          <Shield className="w-3 h-3" /> Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBan(u)}
                          disabled={busyId === u.id || u.isDeleted}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <ShieldOff className="w-3 h-3" /> Ban
                        </button>
                      )}
                      <button
                        onClick={() => handleForceReset(u)}
                        disabled={busyId === u.id || u.isDeleted}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        <KeyRound className="w-3 h-3" /> Reset PW
                      </button>
                      <button
                        onClick={() => handleToggleVerification(u)}
                        disabled={busyId === u.id || u.isDeleted}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        <BadgeCheck className="w-3 h-3" /> {u.isVerified ? 'Unverify' : 'Verify'}
                      </button>
                      {(u.role === 'LAWYER' || u.role === 'ORGANIZATION') && (
                        <button
                          onClick={() => handleKycOverride(u)}
                          disabled={busyId === u.id || u.isDeleted}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                        >
                          <FileCheck className="w-3 h-3" /> KYC override
                        </button>
                      )}
                      <button
                        onClick={() => handleSoftDelete(u)}
                        disabled={busyId === u.id || u.isDeleted}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
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

export default AdminUserModerationPage
