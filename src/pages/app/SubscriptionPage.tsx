import { FC, useEffect, useState } from 'react'
import { Crown, Check, Loader2, AlertCircle, Wallet, CreditCard } from 'lucide-react'
import { subscriptionApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import useWalletStore from '@/stores/walletStore'

interface Subscription {
  id?: string
  plan: 'FREE' | 'PRO'
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
  startDate?: string
  endDate?: string
  amount?: number
  features?: Record<string, boolean>
}

const PRO_PRICE = 999
const PRO_FEATURES = [
  'Priority listing in client searches',
  'Advanced analytics dashboard',
  'Unlimited agreement templates',
  'Verified Pro badge on profile',
  'Priority customer support',
]

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const SubscriptionPage: FC = () => {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const user = useAuthStore((s) => s.user)
  const balance = useWalletStore((s) => s.balance)
  const fetchBalance = useWalletStore((s) => s.fetchBalance)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await subscriptionApi.get()
      const data = (res.data?.data ?? res.data) as Subscription
      setSub(data)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load subscription', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetchBalance().catch(() => { })
  }, [])

  const handleSubscribeRazorpay = async () => {
    setActing(true)
    try {
      const res = await subscriptionApi.subscribe()
      const data = (res.data?.data ?? res.data) as { payment: any; amount: number }
      const payment = data.payment

      if (!(window as any).Razorpay) {
        showToast('Razorpay SDK not loaded — refresh the page', 'error')
        setActing(false)
        return
      }

      const options: any = {
        key: (import.meta.env.VITE_RAZORPAY_KEY as string) || '',
        amount: PRO_PRICE * 100,
        currency: 'INR',
        name: 'NyayaX Pro',
        description: 'Pro monthly subscription',
        order_id: payment.providerOrderId,
        handler: async (resp: any) => {
          try {
            await subscriptionApi.confirm({
              paymentId: payment.id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            })
            showToast('Welcome to NyayaX Pro!', 'success')
            await load()
          } catch (err: any) {
            showToast(err?.response?.data?.error || 'Payment confirmation failed', 'error')
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#0B4D64' },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', () => showToast('Payment failed', 'error'))
      rzp.open()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Could not start subscription', 'error')
    } finally {
      setActing(false)
    }
  }

  const handleSubscribeWallet = async () => {
    if (balance < PRO_PRICE) {
      showToast(`Insufficient balance. ${fmt(PRO_PRICE)} required.`, 'error')
      return
    }
    if (!confirm(`Pay ${fmt(PRO_PRICE)} from your wallet to activate Pro?`)) return
    setActing(true)
    try {
      await subscriptionApi.subscribeFromWallet()
      showToast('Welcome to NyayaX Pro!', 'success')
      await load()
      await fetchBalance()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Wallet payment failed', 'error')
    } finally {
      setActing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel your Pro subscription? You will keep access until the end of the billing period.')) return
    setActing(true)
    try {
      await subscriptionApi.cancel()
      showToast('Subscription cancelled', 'success')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to cancel', 'error')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-gray-500">Loading…</span>
      </div>
    )
  }

  const isPro = sub?.plan === 'PRO' && sub?.status === 'ACTIVE'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">Unlock priority listing and analytics with NyayaX Pro.</p>
      </div>

      {/* Current plan */}
      <div className={`rounded-2xl p-6 shadow-sm ${isPro ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border border-amber-200' : 'bg-white border border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isPro ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Crown className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-gray-500">Current plan</div>
            <div className="text-xl font-semibold text-gray-900">{sub?.plan ?? 'FREE'}</div>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${isPro ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
            {sub?.status ?? 'ACTIVE'}
          </span>
        </div>
        {isPro && sub?.endDate && (
          <p className="text-sm text-gray-600 mt-3">
            Active until <strong>{new Date(sub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
          </p>
        )}
      </div>

      {/* Plan details */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">{fmt(PRO_PRICE)}</span>
          <span className="text-gray-500">/ month</span>
        </div>
        <ul className="mt-5 space-y-2.5">
          {PRO_FEATURES.map((feat) => (
            <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-700">
              <Check className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
              {feat}
            </li>
          ))}
        </ul>

        {isPro ? (
          <div className="mt-6">
            <button
              onClick={handleCancel}
              disabled={acting}
              className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {acting ? 'Cancelling…' : 'Cancel subscription'}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleSubscribeRazorpay}
              disabled={acting}
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Pay with Razorpay
            </button>
            <button
              onClick={handleSubscribeWallet}
              disabled={acting || balance < PRO_PRICE}
              className="inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-primary text-primary font-medium hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Pay from wallet
            </button>
          </div>
        )}
        {!isPro && balance < PRO_PRICE && (
          <p className="mt-2 text-xs text-gray-400 text-center">
            Wallet balance: {fmt(balance)} — top up to use wallet payment.
          </p>
        )}
      </div>

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

export default SubscriptionPage
