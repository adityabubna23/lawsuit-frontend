import { FC } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import CountUp from 'react-countup'
import {
  BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Users, Scale, FileText, IndianRupee, Activity, ShieldAlert, Wallet,
  ChevronRight, Loader2, RefreshCw, BadgeCheck,
} from 'lucide-react'
import { adminApi } from '@/services/api'

interface DashboardData {
  users: { total: number; clients: number; lawyers: number }
  cases: { total: number; open: number; closed: number }
  appointments: { total: number; pending: number; completed: number }
  payments: { total: number; completed: number; totalRevenue: number }
  wallet: {
    totalWallets: number
    totalBalance: number
    recentWithdrawals: number
    recentWithdrawalAmount: number
  }
  pendingVerifications: { clients: number; lawyers: number }
  recentUsers: Array<{
    id: string
    name: string
    email: string
    role: 'CLIENT' | 'LAWYER'
    isVerified: boolean
    createdAt: string
  }>
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

const fmtCount = (n: number) => new Intl.NumberFormat('en-IN').format(n ?? 0)

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444']

const AdminDashboardPage: FC = () => {
  const { data, isLoading, error, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const res = await adminApi.getDashboard()
      return ((res.data?.data ?? res.data) as DashboardData)
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading platform metrics…</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
          <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
          <p className="text-sm mt-1">
            {(error as any)?.response?.data?.error || (error as any)?.message || 'Try refreshing.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  const userTypeData = [
    { name: 'Clients', value: data.users.clients },
    { name: 'Lawyers', value: data.users.lawyers },
  ]

  const caseStatusData = [
    { name: 'Open / In progress', value: data.cases.open },
    { name: 'Closed / Settled', value: data.cases.closed },
  ]

  const appointmentData = [
    { name: 'Pending', value: data.appointments.pending },
    { name: 'Completed', value: data.appointments.completed },
    { name: 'Other', value: Math.max(0, data.appointments.total - data.appointments.pending - data.appointments.completed) },
  ]

  const verificationData = [
    { name: 'Clients', value: data.pendingVerifications.clients },
    { name: 'Lawyers', value: data.pendingVerifications.lawyers },
  ]

  const stats = [
    { label: 'Total Users', value: data.users.total, icon: Users, color: 'bg-blue-500', to: '/admin/userManagement' },
    { label: 'Active Lawyers', value: data.users.lawyers, icon: Scale, color: 'bg-green-500', to: '/admin/userManagement' },
    { label: 'Cases Tracked', value: data.cases.total, icon: FileText, color: 'bg-purple-500' },
    { label: 'Total Revenue', value: data.payments.totalRevenue, icon: IndianRupee, color: 'bg-yellow-500', isCurrency: true },
  ]

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date()

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Live platform metrics from the production database.</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => {
            const card = (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full hover:border-gray-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {stat.isCurrency ? (
                        <>
                          ₹<CountUp end={stat.value} duration={1.5} separator="," />
                        </>
                      ) : (
                        <CountUp end={stat.value} duration={1.5} separator="," />
                      )}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )
            return stat.to ? (
              <Link key={idx} to={stat.to}>{card}</Link>
            ) : (
              <div key={idx}>{card}</div>
            )
          })}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SecondaryStat label="Open cases" value={fmtCount(data.cases.open)} accent="text-blue-600" />
          <SecondaryStat label="Closed cases" value={fmtCount(data.cases.closed)} accent="text-green-600" />
          <SecondaryStat label="Pending appts" value={fmtCount(data.appointments.pending)} accent="text-amber-600" />
          <SecondaryStat label="Completed appts" value={fmtCount(data.appointments.completed)} accent="text-emerald-600" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Type Donut */}
          <ChartCard
            title="User Type Breakdown"
            icon={<Users className="w-5 h-5 text-purple-600" />}
            empty={data.users.total === 0}
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={userTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {userTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtCount(v)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2 text-sm">
              {userTypeData.map((d, i) => (
                <div key={d.name} className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-gray-700">{d.name} ({fmtCount(d.value)})</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* Case Status Donut */}
          <ChartCard
            title="Case Status"
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            empty={data.cases.total === 0}
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={caseStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {caseStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i + 1]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtCount(v)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Appointment Bar Chart */}
          <ChartCard
            title="Appointment Status"
            icon={<Activity className="w-5 h-5 text-yellow-600" />}
            empty={data.appointments.total === 0}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => fmtCount(v)} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {appointmentData.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Pending verifications */}
          <ChartCard
            title="Pending Verifications"
            icon={<ShieldAlert className="w-5 h-5 text-red-600" />}
            empty={data.pendingVerifications.clients + data.pendingVerifications.lawyers === 0}
            emptyMessage="Nothing in the verification queue 🎉"
            actionLabel="Open queue"
            actionTo="/admin/userManagement"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={verificationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => fmtCount(v)} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {verificationData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Wallet + Recent Users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet snapshot */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-800">Wallet snapshot</h3>
            </div>
            <div className="space-y-3">
              <Row label="Total wallets" value={fmtCount(data.wallet.totalWallets)} />
              <Row label="Total balance" value={fmtCurrency(data.wallet.totalBalance)} highlight />
              <Row label="Recent withdrawals (30d)" value={fmtCount(data.wallet.recentWithdrawals)} />
              <Row label="Withdrawn (30d)" value={fmtCurrency(data.wallet.recentWithdrawalAmount)} />
            </div>
            <Link
              to="/admin/wallets"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              View wallets <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Payments snapshot */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-800">Payments</h3>
            </div>
            <div className="space-y-3">
              <Row label="Total payments" value={fmtCount(data.payments.total)} />
              <Row label="Completed" value={fmtCount(data.payments.completed)} />
              <Row label="Total revenue" value={fmtCurrency(data.payments.totalRevenue)} highlight />
            </div>
            <Link
              to="/admin/payouts"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-yellow-700 hover:text-yellow-800"
            >
              View payouts <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Recent users */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Recent signups</h3>
              </div>
              <Link to="/admin/moderation" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              <div className="divide-y divide-gray-100 -mx-2">
                {data.recentUsers.slice(0, 6).map((u) => (
                  <div key={`${u.role}-${u.id}`} className="px-2 py-2.5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${u.role === 'LAWYER' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {(u.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-1">
                        {u.name || 'Unnamed'}
                        {u.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{u.email}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${u.role === 'LAWYER' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </div>
      </div>
    </div>
  )
}

interface SecondaryStatProps { label: string; value: string; accent: string }
const SecondaryStat: FC<SecondaryStatProps> = ({ label, value, accent }) => (
  <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
    <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
    <div className={`text-xl font-semibold mt-0.5 ${accent}`}>{value}</div>
  </div>
)

interface ChartCardProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  empty?: boolean
  emptyMessage?: string
  actionLabel?: string
  actionTo?: string
}
const ChartCard: FC<ChartCardProps> = ({ title, icon, children, empty, emptyMessage, actionLabel, actionTo }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <span className="mr-2">{icon}</span>
        {title}
      </h3>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-0.5">
          {actionLabel} <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
    {empty ? (
      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
        {emptyMessage || 'No data yet.'}
      </div>
    ) : (
      children
    )}
  </div>
)

interface RowProps { label: string; value: string; highlight?: boolean }
const Row: FC<RowProps> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-600">{label}</span>
    <span className={highlight ? 'text-base font-semibold text-gray-900' : 'font-medium text-gray-800'}>{value}</span>
  </div>
)

export default AdminDashboardPage
