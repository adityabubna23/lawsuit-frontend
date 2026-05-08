import { FC, useEffect, useState } from 'react'
import { Copy, Check, Gift, Users, IndianRupee, Loader2, Share2 } from 'lucide-react'
import { referralApi } from '@/services/api'

interface PendingReferral {
  id: string
  referredUserId: string
  completedConsultations: number
  requiredConsultations: number
  progress: number
}

interface ReferralInfo {
  totalReferred: number
  rewardsPaid: number
  totalEarnings: number
  pendingReferrals: PendingReferral[]
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const ReferralPage: FC = () => {
  const [code, setCode] = useState<string>('')
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [applyCode, setApplyCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [codeRes, infoRes] = await Promise.all([
        referralApi.getCode(),
        referralApi.getInfo(),
      ])
      const codeData = (codeRes.data?.data ?? codeRes.data) as { referralCode?: string }
      const infoData = (infoRes.data?.data ?? infoRes.data) as ReferralInfo
      setCode(codeData?.referralCode || '')
      setInfo(infoData)
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load referral data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCopy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      showToast('Failed to copy code', 'error')
    }
  }

  const handleShare = async () => {
    const shareText = `Join NyayaX with my referral code ${code} — affordable legal help, on demand. ⚖️`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NyayaX Referral', text: shareText })
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareText)
      showToast('Share text copied to clipboard', 'success')
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = applyCode.trim()
    if (!trimmed) return
    setApplying(true)
    try {
      await referralApi.apply(trimmed)
      showToast('Referral code applied successfully', 'success')
      setApplyCode('')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to apply code', 'error')
    } finally {
      setApplying(false)
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Gift className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refer & Earn</h1>
          <p className="text-sm text-gray-500">Get ₹5,000 when 10 consultations are completed by a referred user.</p>
        </div>
      </div>

      {/* Referral code card */}
      <div className="bg-gradient-to-br from-primary to-[#0a3d50] rounded-2xl p-6 text-white shadow-sm">
        <div className="text-xs uppercase tracking-wider opacity-75">Your referral code</div>
        <div className="mt-2 flex items-center gap-3">
          <div className="text-3xl font-mono font-bold tracking-wider">{code || '—'}</div>
          <button
            onClick={handleCopy}
            className="ml-auto inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-sm transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Users className="w-4 h-4" /> Total referred
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{info?.totalReferred ?? 0}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Gift className="w-4 h-4" /> Rewards paid
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{info?.rewardsPaid ?? 0}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <IndianRupee className="w-4 h-4" /> Total earnings
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{fmt(info?.totalEarnings ?? 0)}</div>
        </div>
      </div>

      {/* Apply a referral code */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Have a referral code?</h2>
        <p className="text-sm text-gray-500 mt-1">Apply a friend's code to link your account.</p>
        <form onSubmit={handleApply} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
            placeholder="LSXXXXXXXX"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-mono tracking-wider"
            maxLength={10}
          />
          <button
            type="submit"
            disabled={!applyCode.trim() || applying}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {applying ? 'Applying…' : 'Apply Code'}
          </button>
        </form>
      </div>

      {/* Pending progress */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Pending referrals</h2>
        {!info?.pendingReferrals?.length ? (
          <p className="text-sm text-gray-500 mt-2">No pending referrals yet — share your code to earn rewards.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {info.pendingReferrals.map((p) => (
              <div key={p.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">User {p.referredUserId.slice(0, 8)}…</span>
                  <span className="text-gray-500">
                    {p.completedConsultations}/{p.requiredConsultations} consultations
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, p.progress)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

export default ReferralPage
