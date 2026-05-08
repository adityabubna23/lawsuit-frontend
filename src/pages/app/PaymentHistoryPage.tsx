import { FC, useEffect, useState } from 'react'
import { Receipt, Loader2, RotateCcw, Check, AlertCircle } from 'lucide-react'
import { paymentsApi } from '@/services/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

interface Payment {
  id: string
  amount: number
  currency?: string
  status: string
  provider?: string
  providerPaymentId?: string
  appointmentId?: string
  createdAt: string
  refundedAt?: string | null
  description?: string
}

const statusBadge = (s: string) => {
  const c = s.toUpperCase()
  if (c === 'COMPLETED' || c === 'PAID') return 'bg-green-50 text-green-700'
  if (c === 'PENDING') return 'bg-amber-50 text-amber-700'
  if (c === 'FAILED') return 'bg-red-50 text-red-700'
  if (c === 'REFUNDED') return 'bg-blue-50 text-blue-700'
  return 'bg-gray-100 text-gray-700'
}

const PaymentHistoryPage: FC = () => {
  const [list, setList] = useState<Payment[]>([])
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
      const res = await paymentsApi.list({ limit: 50 })
      const data = (res.data?.data ?? res.data?.items ?? res.data ?? []) as Payment[]
      setList(Array.isArray(data) ? data : [])
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRefund = async (p: Payment) => {
    const reason = prompt(`Request a refund of ${fmt(p.amount)}? Provide a reason:`)
    if (!reason) return
    setBusyId(p.id)
    try {
      await paymentsApi.requestRefund(p.id, reason)
      showToast('Refund request submitted', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to request refund', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Receipt className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment history</h1>
          <p className="text-sm text-gray-500">Your past consultations and payments — request refunds if needed.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">
          <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          No payments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-semibold text-gray-900">{fmt(p.amount)}</span>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(p.status)}`}>{p.status}</span>
                  </div>
                  {p.description && <div className="text-sm text-gray-700 mt-1">{p.description}</div>}
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(p.createdAt).toLocaleString('en-IN')}
                    {p.provider && <> · {p.provider}</>}
                    {p.providerPaymentId && <> · {p.providerPaymentId}</>}
                    {p.refundedAt && <> · Refunded {new Date(p.refundedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
                  </div>
                </div>
                {p.status === 'COMPLETED' && !p.refundedAt && (
                  <button
                    onClick={() => handleRefund(p)}
                    disabled={busyId === p.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Request refund
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentHistoryPage
