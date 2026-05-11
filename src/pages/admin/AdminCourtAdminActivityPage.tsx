import { FC, useEffect, useMemo, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Loader2, ArrowLeft, Calendar, AlertCircle, Activity, Coins, ShieldCheck,
  CheckCircle2, XCircle, Building2, Landmark, Clock, AlertTriangle, PauseCircle, UserCog,
} from 'lucide-react'
import { adminApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface ActivityEntry {
  type: 'LAWYER_APPROVED' | 'LAWYER_REJECTED' | 'ORG_APPROVED' | 'ORG_REJECTED'
  at: string
  title: string
  subtitle?: string
  refId?: string
  timeToDecisionHours?: number
}

interface CaActivityData {
  subject: {
    id: string
    name?: string
    email?: string
    avatarUrl?: string | null
    isAuthorized?: boolean
    status?: string
    registrationNumber?: string
    court?: { id: string; name?: string; type?: string; district?: string; state?: string }
  }
  cycle: { month: number; year: number; startDate: string; endDate: string }
  metrics: {
    totalDecisions: number
    lawyersReviewed: number
    orgsReviewed: number
    approvedCount: number
    rejectedCount: number
    approvalRate: number | null
    medianDecisionTimeHours: number | null
    pendingBacklog: number
  }
  compliance: { pass: boolean; issues: string[]; isAuthorized: boolean; banned: boolean }
  salary: {
    hasConfig: boolean
    paidBy: 'PLATFORM' | 'ORGANIZATION'
    breakdown: {
      baseSalary: number
      bonusPerVerification: number
      verificationBonus: number
      netPayable: number
      isOnHold: boolean
      holdReason: string | null
    } | null
    alreadyPaid: boolean
  }
  activities: ActivityEntry[]
}

const fmtRupee = (n?: number | null) =>
  n != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n))
    : '—'
const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const ICONS: Record<ActivityEntry['type'], React.ComponentType<{ className?: string }>> = {
  LAWYER_APPROVED: CheckCircle2,
  LAWYER_REJECTED: XCircle,
  ORG_APPROVED: CheckCircle2,
  ORG_REJECTED: XCircle,
}
const TONES: Record<ActivityEntry['type'], string> = {
  LAWYER_APPROVED: 'bg-green-50 text-green-600',
  LAWYER_REJECTED: 'bg-red-50 text-red-600',
  ORG_APPROVED: 'bg-green-50 text-green-600',
  ORG_REJECTED: 'bg-red-50 text-red-600',
}

/**
 * Court Admin monthly activity page — drives the verification-throughput-based
 * salary decision (decisions / median SLA / backlog / authorization).
 */
const AdminCourtAdminActivityPage: FC = () => {
  const { id = '' } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const now = new Date()
  const month = Number(params.get('month')) || now.getMonth() + 1
  const year = Number(params.get('year')) || now.getFullYear()

  const [data, setData] = useState<CaActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await adminApi.getCourtAdminMonthlyActivity(id, { month, year })
      setData(res.data as CaActivityData)
    } catch (err) {
      setError(friendlyError(err, "We couldn't load this court admin's activity log."))
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
      <Link to="/admin/court-admins" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Court Admins
      </Link>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>
      ) : !data ? null : (
        <>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
            {data.subject.avatarUrl ? (
              <img src={data.subject.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover bg-gray-100" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xl font-semibold">
                {(data.subject.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{data.subject.name || 'Unnamed'}</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">Court admin</span>
              </div>
              <div className="text-sm text-gray-500 truncate">{data.subject.email}</div>
              {data.subject.court && (
                <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Landmark className="w-3 h-3" /> {data.subject.court.name} · {data.subject.court.district}, {data.subject.court.state}
                </div>
              )}
            </div>
            <Link to={`/admin/court-admins`} className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50">
              <UserCog className="w-4 h-4" /> Manage
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
              <Metric label="Total decisions" value={String(data.metrics.totalDecisions)} hint={`${data.metrics.lawyersReviewed} lawyers · ${data.metrics.orgsReviewed} orgs`} icon={CheckCircle2} accent="text-blue-700" />
              <Metric label="Median time-to-decision"
                value={data.metrics.medianDecisionTimeHours != null ? `${data.metrics.medianDecisionTimeHours}h` : '—'}
                hint={data.metrics.medianDecisionTimeHours != null && data.metrics.medianDecisionTimeHours > 72 ? 'over 72h — slow' : 'within target'}
                icon={Clock}
                accent={data.metrics.medianDecisionTimeHours != null && data.metrics.medianDecisionTimeHours > 72 ? 'text-amber-700' : 'text-green-700'}
              />
              <Metric label="Pending backlog (>7 days)"
                value={String(data.metrics.pendingBacklog)}
                hint={data.metrics.pendingBacklog > 0 ? 'needs clearing' : 'no backlog'}
                icon={AlertTriangle}
                accent={data.metrics.pendingBacklog > 0 ? 'text-red-700' : 'text-green-700'}
              />
              <Metric label="Authorization" value={data.compliance.pass ? 'Active' : 'Inactive'} hint={data.compliance.pass ? 'eligible for payout' : 'blocking payout'} icon={ShieldCheck} accent={data.compliance.pass ? 'text-green-700' : 'text-red-700'} />
              <Metric label="Net payable" value={fmtRupee(data.salary.breakdown?.netPayable)} hint={data.salary.alreadyPaid ? 'already paid' : data.salary.breakdown?.isOnHold ? 'on hold' : 'pending payout'} icon={Coins} accent={data.salary.alreadyPaid ? 'text-gray-500' : 'text-emerald-700'} />
            </div>
          </section>

          {/* Detail counts */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Detailed activity counts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Mini label="Lawyers reviewed" value={String(data.metrics.lawyersReviewed)} />
              <Mini label="Orgs reviewed" value={String(data.metrics.orgsReviewed)} />
              <Mini label="Approved" value={String(data.metrics.approvedCount)} />
              <Mini label="Rejected" value={String(data.metrics.rejectedCount)} />
              <Mini label="Approval rate" value={data.metrics.approvalRate != null ? `${data.metrics.approvalRate}%` : '—'} />
            </div>
          </section>

          {data.salary.breakdown ? (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Auto-computed salary breakdown</h2>
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm divide-y divide-gray-100 text-sm">
                <Line label="Base salary" value={fmtRupee(data.salary.breakdown.baseSalary)} />
                <Line label={`Verification bonus (${data.metrics.totalDecisions} × ${fmtRupee(data.salary.breakdown.bonusPerVerification)})`} value={fmtRupee(data.salary.breakdown.verificationBonus)} />
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
              No salary configuration set for this court admin. Set it up from the Court Admins page.
            </div>
          )}

          {/* Activity feed */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Activity log · {MONTHS[month - 1]} {year}</h2>
            {data.activities.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-500">
                <Activity className="w-8 h-8 mx-auto text-gray-300 mb-1.5" />No verifications this cycle.
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{a.title}</span>
                          {a.timeToDecisionHours != null && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{a.timeToDecisionHours}h to decide</span>
                          )}
                        </div>
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

void Building2

export default AdminCourtAdminActivityPage
