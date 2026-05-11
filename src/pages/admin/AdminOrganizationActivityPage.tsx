import { FC, useEffect, useMemo, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Loader2, ArrowLeft, Calendar, AlertCircle, Star, Briefcase, Activity, Coins,
  Building2, ShieldCheck, Users, FileText, PhoneCall, CheckCircle2, PauseCircle, UserPlus,
} from 'lucide-react'
import { adminApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ActivityEntry {
  type: 'CONSULTATION_COMPLETED' | 'CASE_CLOSED' | 'REQUEST_RECEIVED' | 'REQUEST_ASSIGNED' | 'REQUEST_REJECTED'
  at: string
  title: string
  subtitle?: string
  refId?: string
  lawyerId?: string
}

interface OrgActivityData {
  subject: {
    id: string
    name?: string
    email?: string
    avatarUrl?: string | null
    isVerified?: boolean
    registrationNumber?: string
    gstNumber?: string
    _count?: { lawyers?: number }
  }
  cycle: { month: number; year: number; startDate: string; endDate: string }
  metrics: {
    totalConsultations: number
    casesOpened: number
    casesClosed: number
    casesWon: number
    activeLawyerCount: number
    newLawyersThisMonth: number
    aggregateRating: number | null
    aggregateReviewCount: number
    appointmentRequestsReceived: number
    appointmentRequestsAssigned: number
    appointmentRequestsRejected: number
  }
  compliance: { pass: boolean; issues: string[]; isVerified: boolean; banned: boolean }
  salary: {
    hasConfig: boolean
    paidBy: 'PLATFORM' | 'ORGANIZATION'
    breakdown: {
      baseSalary: number
      bonusPerConsultation: number
      bonusPerCaseClosed: number
      bonusPerWonCase: number
      consultationBonus: number
      caseClosedBonus: number
      caseWonBonus: number
      netPayable: number
      isOnHold: boolean
      holdReason: string | null
    } | null
    alreadyPaid: boolean
    existingPayout: { id: string; createdAt: string; netPaid: number } | null
  }
  activities: ActivityEntry[]
  lawyers: Array<{ id: string; name?: string; avatarUrl?: string | null; bannedAt?: string | null }>
}

const fmtRupee = (n?: number | null) =>
  n != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n))
    : '—'
const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const ICONS: Record<ActivityEntry['type'], React.ComponentType<{ className?: string }>> = {
  CONSULTATION_COMPLETED: PhoneCall,
  CASE_CLOSED: CheckCircle2,
  REQUEST_RECEIVED: FileText,
  REQUEST_ASSIGNED: UserPlus,
  REQUEST_REJECTED: AlertCircle,
}
const TONES: Record<ActivityEntry['type'], string> = {
  CONSULTATION_COMPLETED: 'bg-blue-50 text-blue-600',
  CASE_CLOSED: 'bg-green-50 text-green-600',
  REQUEST_RECEIVED: 'bg-gray-100 text-gray-600',
  REQUEST_ASSIGNED: 'bg-indigo-50 text-indigo-600',
  REQUEST_REJECTED: 'bg-red-50 text-red-600',
}

/**
 * Organisation monthly activity page — same shape as the lawyer one but with
 * firm-level aggregates (total consultations across roster, active lawyer
 * count, request handling stats). Drives the org-level salary decision.
 */
const AdminOrganizationActivityPage: FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const now = new Date()
  const month = Number(params.get('month')) || now.getMonth() + 1
  const year = Number(params.get('year')) || now.getFullYear()

  const [data, setData] = useState<OrgActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await adminApi.getOrganizationMonthlyActivity(id, { month, year })
      setData(res.data as OrgActivityData)
    } catch (err) {
      setError(friendlyError(err, "We couldn't load this organization's activity log."))
    } finally { setLoading(false) }
  }
  useEffect(() => { if (id) load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, month, year])

  const setCycle = (m: number, y: number) => setParams({ month: String(m), year: String(y) }, { replace: true })
  const monthOptions = useMemo(() => MONTHS.map((m, i) => ({ label: m, value: i + 1 })), [])
  const yearOptions = useMemo(() => {
    const ys: number[] = []
    for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) ys.push(y)
    return ys
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <Link to="/admin/organizations" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Organizations
      </Link>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>
      ) : !data ? null : (
        <>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            {data.subject.avatarUrl ? (
              <img src={data.subject.avatarUrl} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-semibold">
                {(data.subject.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{data.subject.name || 'Unnamed'}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">Organization</span>
              </div>
              <div className="text-sm text-gray-500 truncate">{data.subject.email}</div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                {data.subject.registrationNumber && <span>Reg #{data.subject.registrationNumber}</span>}
                {data.subject.gstNumber && <span>· GST {data.subject.gstNumber}</span>}
                <span>· <Users className="w-3 h-3 inline" /> {data.metrics.activeLawyerCount} active lawyers</span>
              </div>
            </div>
            <Link to={`/admin/salary?subject=organizations&id=${id}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50">
              <Coins className="w-4 h-4" /> Salary controls
            </Link>
          </div>

          {/* Month picker */}
          <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center gap-3 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Cycle</span>
            <select value={month} onChange={(e) => setCycle(Number(e.target.value), year)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
              {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={year} onChange={(e) => setCycle(month, Number(e.target.value))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Compliance banner */}
          {!data.compliance.pass && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3 flex items-start gap-2 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Compliance gate failing — salary on hold</div>
                <ul className="list-disc list-inside text-xs mt-1">{data.compliance.issues.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            </div>
          )}

          {/* 5 must-have metrics */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Must-have metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Metric label="Total consultations" value={String(data.metrics.totalConsultations)} hint="across firm" icon={PhoneCall} accent="text-blue-700" />
              <Metric label="Active lawyer count" value={String(data.metrics.activeLawyerCount)} hint={`${data.metrics.newLawyersThisMonth} new this cycle`} icon={Users} accent="text-indigo-700" />
              <Metric label="Aggregate firm rating"
                value={data.metrics.aggregateRating != null ? `${data.metrics.aggregateRating} / 5` : '—'}
                hint={`${data.metrics.aggregateReviewCount} reviews total`}
                icon={Star}
                accent={data.metrics.aggregateRating != null && data.metrics.aggregateRating < 3.5 ? 'text-amber-700' : 'text-yellow-700'}
              />
              <Metric label="Compliance" value={data.compliance.pass ? 'OK' : `${data.compliance.issues.length} issue(s)`} hint={data.compliance.pass ? 'all gates green' : 'blocking payout'} icon={ShieldCheck} accent={data.compliance.pass ? 'text-green-700' : 'text-red-700'} />
              <Metric label="Net payable" value={fmtRupee(data.salary.breakdown?.netPayable)} hint={data.salary.alreadyPaid ? `paid ${fmtDateTime(data.salary.existingPayout!.createdAt)}` : data.salary.breakdown?.isOnHold ? 'on hold' : 'pending payout'} icon={Coins} accent={data.salary.alreadyPaid ? 'text-gray-500' : 'text-emerald-700'} />
            </div>
          </section>

          {/* Detailed activity counts */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Detailed activity counts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Mini label="Consultations" value={String(data.metrics.totalConsultations)} />
              <Mini label="Cases opened" value={String(data.metrics.casesOpened)} />
              <Mini label="Cases closed" value={String(data.metrics.casesClosed)} />
              <Mini label="Cases won" value={String(data.metrics.casesWon)} />
              <Mini label="Requests received" value={String(data.metrics.appointmentRequestsReceived)} />
              <Mini label="Assigned / Rejected" value={`${data.metrics.appointmentRequestsAssigned} / ${data.metrics.appointmentRequestsRejected}`} />
            </div>
          </section>

          {/* Salary */}
          {data.salary.breakdown ? (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Auto-computed salary breakdown</h2>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-100 text-sm">
                <Line label="Base salary" value={fmtRupee(data.salary.breakdown.baseSalary)} />
                <Line label={`Consultation bonus (${data.metrics.totalConsultations} × ${fmtRupee(data.salary.breakdown.bonusPerConsultation)})`} value={fmtRupee(data.salary.breakdown.consultationBonus)} />
                <Line label={`Case-closed bonus (${data.metrics.casesClosed} × ${fmtRupee(data.salary.breakdown.bonusPerCaseClosed)})`} value={fmtRupee(data.salary.breakdown.caseClosedBonus)} />
                <Line label={`Case-won bonus (${data.metrics.casesWon} × ${fmtRupee(data.salary.breakdown.bonusPerWonCase)})`} value={fmtRupee(data.salary.breakdown.caseWonBonus)} />
                <Line label="Net payable" value={fmtRupee(data.salary.breakdown.netPayable)} bold tone="emerald" />
                {data.salary.breakdown.isOnHold && (
                  <div className="px-3 py-2 bg-amber-50 text-amber-800 text-xs flex items-start gap-1.5">
                    <PauseCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <div><span className="font-semibold">On hold</span>{data.salary.breakdown.holdReason ? ` — ${data.salary.breakdown.holdReason}` : ''}</div>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
              No salary configuration set for this organization. <Link to={`/admin/salary?subject=organizations&id=${id}`} className="underline font-medium">Set it up</Link>.
            </div>
          )}

          {/* Activity feed */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Activity log · {MONTHS[month - 1]} {year}</h2>
            {data.activities.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-500">
                <Activity className="w-8 h-8 mx-auto text-gray-300 mb-1.5" />No recorded activity for this cycle.
              </div>
            ) : (
              <ol className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
                {data.activities.map((a, idx) => {
                  const Icon = ICONS[a.type] || Activity
                  const tone = TONES[a.type] || 'bg-gray-100 text-gray-600'
                  return (
                    <li key={`${a.type}-${a.refId || idx}-${a.at}`} className="px-4 py-3 flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tone}`}><Icon className="w-4 h-4" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{a.title}</div>
                        {a.subtitle && <div className="text-xs text-gray-500 truncate mt-0.5">{a.subtitle}</div>}
                        <div className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(a.at)}</div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  )
}

const Metric: FC<{ label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }>; accent?: string }> = ({ label, value, hint, icon: Icon, accent }) => (
  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
    <div className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</div>
    <div className={`text-xl font-semibold mt-0.5 ${accent || 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
  </div>
)
const Mini: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-base font-semibold text-gray-900">{value}</div>
  </div>
)
const Line: FC<{ label: string; value: string; bold?: boolean; tone?: 'emerald' | 'red' }> = ({ label, value, bold, tone }) => (
  <div className="px-3 py-2 flex items-center justify-between">
    <div className="text-gray-700">{label}</div>
    <div className={`${bold ? 'font-semibold' : ''} ${tone === 'emerald' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : 'text-gray-900'}`}>{value}</div>
  </div>
)

void Briefcase; void Building2

export default AdminOrganizationActivityPage
