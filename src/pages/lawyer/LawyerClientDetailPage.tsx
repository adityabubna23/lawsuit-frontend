import { FC, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Mail, Phone, Calendar, FileText, MessageSquare,
  CheckCircle2, Clock, XCircle, Video, BadgeCheck,
} from 'lucide-react'
import { appointmentsApi, casesApi, usersApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'
import { unwrapList } from '@/utils/unwrap'

interface ClientUser {
  id: string
  name?: string
  email?: string
  phone?: string
  avatarUrl?: string | null
  isVerified?: boolean
  ekycVerified?: boolean
  createdAt?: string
}

interface AppointmentRow {
  id: string
  scheduledAt: string
  durationMins?: number
  status: string
  meetingType?: string
  notes?: string | null
  client?: { id: string }
  payment?: { amount: number; currency?: string; status?: string } | null
}

interface CaseRow {
  id: string
  title: string
  status: string
  category?: string
  client?: { id: string }
  clientId?: string
  createdAt?: string
}

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

const fmtCurrency = (n?: number) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) : '—'

const STATUS_PILL: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  COMPLETED: 'bg-green-50 text-green-700',
  ATTENDED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
  RESCHEDULED: 'bg-purple-50 text-purple-700',
}

const CASE_PILL: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  HEARING_SCHEDULED: 'bg-indigo-50 text-indigo-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  WON: 'bg-green-50 text-green-700',
  LOST: 'bg-red-50 text-red-700',
  SETTLED: 'bg-teal-50 text-teal-700',
}

/**
 * Lawyer-side detail view for a single client.
 *
 * Mobile equivalent: `lawsuit-app/src/screens/lawyer/LawyerClientDetailScreen.tsx`.
 * Filters the lawyer's appointments + cases server-side to those for this client,
 * then aggregates basic stats. The data we already pull for the dashboard is
 * enough — no new endpoint required.
 */
const LawyerClientDetailPage: FC = () => {
  const { clientId } = useParams<{ clientId: string }>()
  const [client, setClient] = useState<ClientUser | null>(null)
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [userRes, apptRes, caseRes] = await Promise.allSettled([
          usersApi.getById(clientId),
          appointmentsApi.getAll(),
          casesApi.getAll(),
        ])
        if (cancelled) return

        if (userRes.status === 'fulfilled') {
          const raw = userRes.value.data
          const u = raw?.user ?? raw?.data ?? raw
          if (u && typeof u === 'object') setClient(u as ClientUser)
        }

        if (apptRes.status === 'fulfilled') {
          const all = unwrapList<AppointmentRow>(apptRes.value.data, 'appointments')
          setAppointments(all.filter((a) => a.client?.id === clientId))
        }
        if (caseRes.status === 'fulfilled') {
          const all = unwrapList<CaseRow>(caseRes.value.data, 'cases')
          setCases(all.filter((c) => c.client?.id === clientId || c.clientId === clientId))
        }

        // If both list calls failed, surface the friendliest one.
        const firstErr = [apptRes, caseRes].find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
        if (firstErr && (apptRes.status === 'rejected' && caseRes.status === 'rejected')) {
          setError(friendlyError(firstErr.reason, "Couldn't load this client's history."))
        }
      } catch (err) {
        if (!cancelled) setError(friendlyError(err, "Couldn't load this client."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  const stats = useMemo(() => {
    const total = appointments.length
    const completed = appointments.filter((a) =>
      a.status === 'COMPLETED' || a.status === 'ATTENDED'
    ).length
    const upcoming = appointments.filter((a) =>
      (a.status === 'CONFIRMED' || a.status === 'PENDING') && new Date(a.scheduledAt) > new Date()
    ).length
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length
    const totalRevenue = appointments
      .filter((a) => (a.status === 'COMPLETED' || a.status === 'ATTENDED') && a.payment?.status === 'COMPLETED')
      .reduce((sum, a) => sum + (a.payment?.amount ?? 0), 0)
    return { total, completed, upcoming, cancelled, totalRevenue }
  }, [appointments])

  const upcomingAppts = appointments
    .filter((a) => new Date(a.scheduledAt) > new Date() && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const pastAppts = appointments
    .filter((a) => new Date(a.scheduledAt) <= new Date() || a.status === 'CANCELLED')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 8)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Link to="/lawyer/appointments" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-5">
          {error || "We couldn't find this client."}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/lawyer/appointments" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to appointments
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {client.avatarUrl ? (
            <img src={client.avatarUrl} alt={client.name || 'Client'} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
              {(client.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{client.name || 'Unnamed client'}</h1>
              {client.ekycVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                  <BadgeCheck className="w-3 h-3" /> eKYC verified
                </span>
              )}
              {client.isVerified && !client.ekycVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  <BadgeCheck className="w-3 h-3" /> Email verified
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
              {client.email && (
                <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {client.email}
                </a>
              )}
              {client.phone && (
                <div className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {client.phone}
                </div>
              )}
            </div>
            {client.createdAt && (
              <div className="text-xs text-gray-400 mt-2">
                Joined NyayaX on {fmtDate(client.createdAt)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Consultations" value={stats.total} accent="text-gray-900" />
        <Stat label="Completed" value={stats.completed} accent="text-green-700" />
        <Stat label="Upcoming" value={stats.upcoming} accent="text-blue-700" />
        <Stat label="Cancelled" value={stats.cancelled} accent="text-red-700" />
        <Stat label="Revenue" value={fmtCurrency(stats.totalRevenue)} accent="text-emerald-700" />
      </div>

      {/* Upcoming appointments */}
      <Card title="Upcoming consultations" icon={<Calendar className="w-4 h-4 text-blue-600" />}>
        {upcomingAppts.length === 0 ? (
          <Empty label="No upcoming consultations." />
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingAppts.map((a) => (
              <AppointmentRowItem key={a.id} a={a} />
            ))}
          </div>
        )}
      </Card>

      {/* Past appointments */}
      <Card title="Recent history" icon={<Clock className="w-4 h-4 text-gray-500" />}>
        {pastAppts.length === 0 ? (
          <Empty label="No past consultations yet." />
        ) : (
          <div className="divide-y divide-gray-100">
            {pastAppts.map((a) => (
              <AppointmentRowItem key={a.id} a={a} />
            ))}
          </div>
        )}
      </Card>

      {/* Cases */}
      <Card title={`Cases (${cases.length})`} icon={<FileText className="w-4 h-4 text-purple-600" />}>
        {cases.length === 0 ? (
          <Empty label="No cases linked with this client yet." />
        ) : (
          <div className="divide-y divide-gray-100">
            {cases.map((c) => (
              <Link
                key={c.id}
                to={`/lawyer/case/${c.id}`}
                className="flex items-center gap-3 px-1 py-3 hover:bg-gray-50 -mx-1 rounded"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{c.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.category || 'Uncategorised'} · Filed {fmtDate(c.createdAt)}
                  </div>
                </div>
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${CASE_PILL[c.status] || 'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

const Stat: FC<{ label: string; value: number | string; accent: string }> = ({ label, value, accent }) => (
  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
    <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className={`text-lg font-semibold mt-0.5 ${accent}`}>{value}</div>
  </div>
)

const Card: FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="font-semibold text-gray-900">{title}</h2>
    </div>
    {children}
  </div>
)

const Empty: FC<{ label: string }> = ({ label }) => (
  <div className="text-sm text-gray-500 italic py-4">{label}</div>
)

const AppointmentRowItem: FC<{ a: AppointmentRow }> = ({ a }) => {
  const dt = new Date(a.scheduledAt)
  const isVideo = a.meetingType === 'VIDEO_CALL' || a.meetingType === 'AUDIO_CALL'
  const upcoming = dt > new Date() && a.status !== 'CANCELLED'
  const Icon = a.status === 'CANCELLED' ? XCircle
    : a.status === 'COMPLETED' || a.status === 'ATTENDED' ? CheckCircle2
      : isVideo ? Video : Calendar

  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.status === 'CANCELLED' ? 'bg-red-50 text-red-600'
        : a.status === 'COMPLETED' || a.status === 'ATTENDED' ? 'bg-green-50 text-green-700'
          : 'bg-blue-50 text-blue-600'
        }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900">
          {fmtDate(a.scheduledAt)} · {fmtTime(a.scheduledAt)}
          {a.durationMins ? <span className="text-gray-400 font-normal"> · {a.durationMins} min</span> : null}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {a.meetingType?.replace('_', ' ') || 'Consultation'}
          {a.payment?.amount != null && <> · {fmtCurrency(a.payment.amount)}</>}
        </div>
      </div>
      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_PILL[a.status] || 'bg-gray-100 text-gray-600'}`}>
        {a.status}
      </span>
      {upcoming && isVideo && (
        <Link to={`/lawyer/consultation/${a.id}`} className="text-xs text-primary hover:underline ml-1 inline-flex items-center gap-0.5">
          Join <MessageSquare className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

export default LawyerClientDetailPage
