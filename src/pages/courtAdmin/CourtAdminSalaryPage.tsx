import { FC, useEffect, useState } from 'react'
import { Loader2, IndianRupee } from 'lucide-react'
import { courtAdminExtApi } from '@/services/api'
import CourtAdminAuthBanner from '../../components/molecules/CourtAdminAuthBanner'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

interface SalaryConfig {
  baseSalary?: number
  isHeld?: boolean
  holdReason?: string
}

interface PayoutRow {
  id: string
  cycleStart: string
  cycleEnd: string
  amount: number
  status: string
  paidAt?: string | null
}

interface Slip {
  config?: SalaryConfig | null
  cycles?: PayoutRow[]
}

const CourtAdminSalaryPage: FC = () => {
  const [data, setData] = useState<Slip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await courtAdminExtApi.getMySalary()
        setData((res.data?.data ?? res.data) as Slip)
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
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  const cfg = data?.config
  const cycles = data?.cycles ?? []

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <CourtAdminAuthBanner />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salary</h1>
        <p className="text-sm text-gray-500 mt-1">Your base salary configuration and last 12 cycles.</p>
      </div>
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {cfg?.isHeld && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
          <strong>Salary on hold.</strong> {cfg.holdReason || 'Contact platform support.'}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-gray-500">Current base salary</div>
        <div className="text-3xl font-bold text-gray-900 mt-1">{fmt(cfg?.baseSalary ?? 0)}</div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent cycles</h2>
        {cycles.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No cycles yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {cycles.map((c) => (
              <div key={c.id} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-700">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(c.cycleStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' – '}
                    {new Date(c.cycleEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.status}{c.paidAt && ` • Paid ${new Date(c.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</div>
                </div>
                <div className="text-base font-semibold text-gray-900">{fmt(c.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CourtAdminSalaryPage
