import { FC, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import { courtAdminExtApi } from '@/services/api'

interface AuthStatus {
  status: 'PENDING_SUPER_ADMIN_APPROVAL' | 'AUTHORIZED' | 'REJECTED' | 'SUSPENDED'
  reason?: string | null
  rejectedAt?: string | null
  authorizedAt?: string | null
}

const CourtAdminAuthBanner: FC = () => {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [reapplying, setReapplying] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await courtAdminExtApi.getMyAuthorization()
      setStatus((res.data?.data ?? res.data) as AuthStatus)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleReapply = async () => {
    setReapplying(true)
    setMsg(null)
    try {
      await courtAdminExtApi.reapply()
      setMsg('Re-applied — your request is pending super admin review.')
      await load()
    } catch (err: any) {
      setMsg(err?.response?.data?.error || 'Failed to re-apply')
    } finally {
      setReapplying(false)
    }
  }

  if (loading || !status || status.status === 'AUTHORIZED') return null

  const config: Record<AuthStatus['status'], { color: string; icon: React.ReactNode; title: string; body: string }> = {
    PENDING_SUPER_ADMIN_APPROVAL: {
      color: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      title: 'Awaiting super admin approval',
      body: 'Your account is pending review. You can edit your profile, but verification actions unlock once approved.',
    },
    AUTHORIZED: {
      color: 'bg-green-50 border-green-200 text-green-900',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      title: 'Authorized',
      body: '',
    },
    REJECTED: {
      color: 'bg-red-50 border-red-200 text-red-900',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      title: 'Application rejected',
      body: status.reason || 'Your application was rejected. You may re-apply with updated details.',
    },
    SUSPENDED: {
      color: 'bg-red-50 border-red-200 text-red-900',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      title: 'Account suspended',
      body: status.reason || 'Your account is suspended. Contact platform support.',
    },
  }

  const cfg = config[status.status]

  return (
    <div className={`border rounded-xl p-4 ${cfg.color} flex items-start gap-3`}>
      <div className="flex-shrink-0">{cfg.icon}</div>
      <div className="flex-1">
        <div className="font-semibold">{cfg.title}</div>
        <div className="text-sm mt-0.5 opacity-90">{cfg.body}</div>
        {msg && <div className="text-xs mt-2">{msg}</div>}
      </div>
      {status.status === 'REJECTED' && (
        <button
          onClick={handleReapply}
          disabled={reapplying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reapplying ? 'animate-spin' : ''}`} />
          Re-apply
        </button>
      )}
    </div>
  )
}

export default CourtAdminAuthBanner
