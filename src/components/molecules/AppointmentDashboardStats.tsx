import { FC, useEffect, useState } from 'react'
import { Loader2, Calendar, CheckCircle2, Clock, IndianRupee, Star, TrendingUp } from 'lucide-react'
import { appointmentsExtApi } from '@/services/api'

interface DashboardData {
  // Common
  upcoming?: number
  completed?: number
  cancelled?: number
  pending?: number
  totalAppointments?: number

  // Lawyer-specific
  earningsThisMonth?: number
  earningsLastMonth?: number
  rating?: number
  responseRate?: number
  weeklyConsultations?: number

  // Client-specific
  totalSpent?: number
  spentThisMonth?: number
  totalCases?: number
  activeCases?: number
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

interface Props {
  role: 'lawyer' | 'client'
}

const AppointmentDashboardStats: FC<Props> = ({ role }) => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = role === 'lawyer'
          ? await appointmentsExtApi.lawyerDashboard()
          : await appointmentsExtApi.clientDashboard()
        if (cancelled) return
        const d = (res.data?.data ?? res.data) as DashboardData
        if (!d || typeof d !== 'object') {
          setHidden(true)
          return
        }
        setData(d)
      } catch {
        // server didn't expose this endpoint or user has no permission — hide silently
        if (!cancelled) setHidden(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [role])

  if (hidden) return null

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  const cards = role === 'lawyer'
    ? [
        { label: 'Upcoming', value: data.upcoming ?? 0, icon: <Calendar className="w-4 h-4 text-blue-600" />, accent: 'bg-blue-50' },
        { label: 'Completed', value: data.completed ?? 0, icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, accent: 'bg-green-50' },
        { label: 'This week', value: data.weeklyConsultations ?? 0, icon: <TrendingUp className="w-4 h-4 text-purple-600" />, accent: 'bg-purple-50' },
        { label: 'Earnings (mo)', value: data.earningsThisMonth != null ? fmt(data.earningsThisMonth) : '—', icon: <IndianRupee className="w-4 h-4 text-emerald-600" />, accent: 'bg-emerald-50' },
        { label: 'Rating', value: data.rating != null ? data.rating.toFixed(1) : '—', icon: <Star className="w-4 h-4 text-amber-600" />, accent: 'bg-amber-50' },
      ]
    : [
        { label: 'Upcoming', value: data.upcoming ?? 0, icon: <Calendar className="w-4 h-4 text-blue-600" />, accent: 'bg-blue-50' },
        { label: 'Pending', value: data.pending ?? 0, icon: <Clock className="w-4 h-4 text-amber-600" />, accent: 'bg-amber-50' },
        { label: 'Completed', value: data.completed ?? 0, icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, accent: 'bg-green-50' },
        { label: 'Active cases', value: data.activeCases ?? 0, icon: <TrendingUp className="w-4 h-4 text-purple-600" />, accent: 'bg-purple-50' },
        { label: 'Spent (mo)', value: data.spentThisMonth != null ? fmt(data.spentThisMonth) : '—', icon: <IndianRupee className="w-4 h-4 text-emerald-600" />, accent: 'bg-emerald-50' },
      ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${c.accent} flex items-center justify-center`}>{c.icon}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">{c.label}</div>
          </div>
          <div className="mt-2 text-xl font-bold text-gray-900">{c.value}</div>
        </div>
      ))}
    </div>
  )
}

export default AppointmentDashboardStats
