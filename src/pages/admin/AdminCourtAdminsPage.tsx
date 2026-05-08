import { FC, useEffect, useState } from 'react'
import { Loader2, Check, X, Users, Building2 } from 'lucide-react'
import { adminApi, adminCourtApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface CourtAdmin {
  id: string
  name?: string
  email?: string
  phone?: string
  status?: string
  registrationNumber?: string
  authorizationStatus?: string
  court?: { name?: string; pincode?: string }
  createdAt?: string
}

const AdminCourtAdminsPage: FC = () => {
  const [tab, setTab] = useState<'team' | 'pending'>('pending')
  const [team, setTeam] = useState<CourtAdmin[]>([])
  const [pending, setPending] = useState<CourtAdmin[]>([])
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
      if (tab === 'pending') {
        const res = await adminApi.listPendingCourtAdmins()
        setPending(unwrapList<CourtAdmin>(res.data))
      } else {
        const res = await adminCourtApi.listCourtAdmins({ limit: 100 })
        setTeam(unwrapList<CourtAdmin>(res.data))
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

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this court admin?')) return
    setBusyId(id)
    try {
      await adminApi.approveCourtAdmin(id)
      showToast('Approved', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejecting?')
    if (!reason) return
    setBusyId(id)
    try {
      await adminApi.rejectCourtAdmin(id, reason)
      showToast('Rejected', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleStatusChange = async (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    setBusyId(id)
    try {
      await adminCourtApi.toggleCourtAdminStatus(id, status)
      showToast(`Status set to ${status}`, 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const list = tab === 'pending' ? pending : team

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50">
          <Building2 className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Court admin team</h1>
          <p className="text-sm text-gray-500">Approve self-registered court admins and manage status of existing admins.</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {[
          { id: 'pending', label: 'Pending approval' },
          { id: 'team', label: 'Active team' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
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
      ) : list.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">
          <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          {tab === 'pending' ? 'No pending applications.' : 'No active court admins.'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{c.name || '—'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                  {c.registrationNumber && <div className="text-xs text-gray-400 mt-0.5">Reg #{c.registrationNumber}</div>}
                  {c.court?.name && <div className="text-xs text-gray-500 mt-1">Court: {c.court.name}{c.court.pincode ? ` (${c.court.pincode})` : ''}</div>}
                </div>
                {tab === 'pending' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(c.id)}
                      disabled={busyId === c.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      disabled={busyId === c.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                ) : (
                  <select
                    value={c.status || 'ACTIVE'}
                    disabled={busyId === c.id}
                    onChange={(e) => handleStatusChange(c.id, e.target.value as any)}
                    className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                )}
              </div>
            </div>
          ))}
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

export default AdminCourtAdminsPage
