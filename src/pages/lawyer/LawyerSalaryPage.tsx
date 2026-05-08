import { FC, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, IndianRupee, TrendingUp, Loader2, Building2, ArrowRight } from 'lucide-react'
import { lawyerSalaryApi } from '@/services/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

interface SalaryConfig {
  baseSalary?: number
  performanceBonus?: number
  isHeld?: boolean
  holdReason?: string
}

interface SalaryPreview {
  cycleStart?: string
  cycleEnd?: string
  base?: number
  bonus?: number
  net?: number
  consultations?: number
  rating?: number
}

interface PayoutRow {
  id: string
  cycleStart: string
  cycleEnd: string
  amount: number
  status: string
  paidAt?: string | null
}

interface BankAccount {
  id: string
  type: 'BANK' | 'UPI'
  accountHolderName?: string | null
  accountNumber?: string | null
  bankName?: string | null
  upiId?: string | null
  isDefault: boolean
}

interface SalarySlip {
  config?: SalaryConfig | null
  preview?: SalaryPreview | null
  payouts?: PayoutRow[]
  bankAccounts?: BankAccount[]
}

const LawyerSalaryPage: FC = () => {
  const [data, setData] = useState<SalarySlip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await lawyerSalaryApi.getMine()
        setData((res.data?.data ?? res.data) as SalarySlip)
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load salary')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
  }

  const cfg = data?.config
  const prev = data?.preview
  const payouts = data?.payouts ?? []
  const accounts = data?.bankAccounts ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salary Slip</h1>
        <p className="text-sm text-gray-500 mt-1">Your performance-based earnings, current cycle preview, and payout history.</p>
      </div>

      {/* Hold banner */}
      {cfg?.isHeld && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
          <strong>Salary on hold.</strong> {cfg.holdReason || 'Contact platform support for details.'}
        </div>
      )}

      {/* Current cycle preview */}
      <div className="bg-gradient-to-br from-primary to-[#0a3d50] rounded-2xl p-6 text-white shadow-sm">
        <div className="text-xs uppercase tracking-wider opacity-75">Current cycle preview</div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-bold">{fmt(prev?.net ?? 0)}</span>
          <span className="opacity-75">net</span>
        </div>
        {(prev?.cycleStart || prev?.cycleEnd) && (
          <div className="text-sm opacity-80 mt-1">
            {prev?.cycleStart ? new Date(prev.cycleStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
            {' – '}
            {prev?.cycleEnd ? new Date(prev.cycleEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-75">Base</div>
            <div className="text-base font-semibold mt-0.5">{fmt(prev?.base ?? cfg?.baseSalary ?? 0)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-75">Bonus</div>
            <div className="text-base font-semibold mt-0.5">{fmt(prev?.bonus ?? cfg?.performanceBonus ?? 0)}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-75">Consultations</div>
            <div className="text-base font-semibold mt-0.5">{prev?.consultations ?? 0}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-xs opacity-75">Rating</div>
            <div className="text-base font-semibold mt-0.5">{prev?.rating?.toFixed(1) ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Bank accounts */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Where money lands</h2>
          <Link to="/lawyer/bank-accounts" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No bank accounts linked. Add one so payouts can be routed to you.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {acc.type === 'BANK' ? acc.bankName : 'UPI'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {acc.type === 'BANK' ? `••••${(acc.accountNumber || '').slice(-4)}` : acc.upiId}
                  </div>
                </div>
                {acc.isDefault && (
                  <span className="text-[10px] uppercase tracking-wider text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Default</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout history */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent payouts</h2>
        {payouts.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <Wallet className="w-4 h-4" /> No payouts yet — first cycle still in progress.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {payouts.map((p) => (
              <div key={p.id} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-700">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(p.cycleStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(p.cycleEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.status}
                    {p.paidAt && <> • Paid {new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
                  </div>
                </div>
                <div className="text-base font-semibold text-gray-900">{fmt(p.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 inline-flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> Numbers refresh nightly with the latest performance data.
      </div>
    </div>
  )
}

export default LawyerSalaryPage
