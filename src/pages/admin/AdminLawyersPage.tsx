import { FC, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase, Search, Loader2, X, BadgeCheck, ShieldOff, Trash2, Filter, Star,
  Mail, Phone, MapPin, FileText, Coins, ExternalLink, AlertCircle, Check, Users,
  User as UserIcon, Building2, PauseCircle, TrendingUp, Wallet,
} from 'lucide-react'
import { adminApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'
import { friendlyError } from '@/utils/errors'

interface LawyerRow {
  id: string
  name?: string
  email?: string
  phone?: string
  isVerified?: boolean
  bannedAt?: string | null
  deletedAt?: string | null
  banReason?: string | null
  avatarUrl?: string | null
  createdAt?: string
  licenseNumber?: string | null
  barCouncilId?: string | null
  specializations?: string[]
  languages?: string[]
  experienceYears?: number | null
  feePerConsultation?: number | null
  rating?: number | null
  totalReviews?: number | null
  totalConsultations?: number | null
  bio?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  isAvailable?: boolean
  organizationId?: string | null
  /** Parent firm — present on detail responses when the lawyer is org-affiliated. */
  organization?: {
    id: string
    name?: string | null
    avatarUrl?: string | null
    isVerified?: boolean
  } | null
  /** Salary surface — server bundles config + last payout for the admin drawer. */
  salary?: {
    paidBy?: 'PLATFORM' | 'ORGANIZATION'
    config?: {
      id?: string
      baseSalary?: number
      bonusPerConsultation?: number
      bonusPerCaseClosed?: number
      bonusPerWonCase?: number
      isOnHold?: boolean
      holdReason?: string | null
      updatedAt?: string
    } | null
    lastPayout?: {
      id?: string
      cycleMonth?: number
      cycleYear?: number
      baseSalary?: number
      bonusAmount?: number
      deductionAmount?: number
      netPayable?: number
      paidAt?: string
      notes?: string | null
    } | null
  }
  address?: string | null
  _count?: { cases?: number; appointments?: number; reviewsReceived?: number }
}

type FilterMode = 'all' | 'verified' | 'unverified' | 'banned' | 'deleted' | 'available'

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// Lawyer fee is stored in paise.
const fmtFee = (paise?: number | null) =>
  paise != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100) : '—'

// EntitySalary amounts (baseSalary, bonuses, payouts) are stored in rupees.
const fmtRupee = (n?: number | null) =>
  n != null ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n)) : '—'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const AdminLawyersPage: FC = () => {
  const [lawyers, setLawyers] = useState<LawyerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAllUsers({
        role: 'LAWYER',
        q: q.trim() || undefined,
        limit: 100,
      })
      setLawyers(unwrapList<LawyerRow>(res.data))
    } catch (err) {
      showToast(friendlyError(err, "Couldn't load lawyers."), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = lawyers.filter((l) => {
    if (filter === 'verified') return l.isVerified && !l.bannedAt && !l.deletedAt
    if (filter === 'unverified') return !l.isVerified && !l.bannedAt && !l.deletedAt
    if (filter === 'banned') return !!l.bannedAt && !l.deletedAt
    if (filter === 'deleted') return !!l.deletedAt
    if (filter === 'available') return l.isAvailable !== false && !l.bannedAt && !l.deletedAt
    return true
  })

  const counts = {
    all: lawyers.length,
    verified: lawyers.filter((l) => l.isVerified && !l.bannedAt && !l.deletedAt).length,
    unverified: lawyers.filter((l) => !l.isVerified && !l.bannedAt && !l.deletedAt).length,
    banned: lawyers.filter((l) => !!l.bannedAt && !l.deletedAt).length,
    deleted: lawyers.filter((l) => !!l.deletedAt).length,
    available: lawyers.filter((l) => l.isAvailable !== false && !l.bannedAt && !l.deletedAt).length,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50">
          <Briefcase className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lawyers</h1>
          <p className="text-sm text-gray-500">Master directory of every lawyer on NyayaX.</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Search by name / email / phone / specialisation…"
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'all', label: 'All' },
          { id: 'verified', label: 'Verified' },
          { id: 'unverified', label: 'Unverified' },
          { id: 'available', label: 'Accepting bookings' },
          { id: 'banned', label: 'Banned' },
          { id: 'deleted', label: 'Deleted' },
        ] as const).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.id
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
          >
            {f.id === 'all' && <Filter className="w-3 h-3" />}
            {f.label}
            <span className={`text-[10px] ${filter === f.id ? 'opacity-75' : 'opacity-60'}`}>({counts[f.id]})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-500">
          <Briefcase className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          {lawyers.length === 0 ? 'No lawyers on the platform yet.' : 'No matches for this filter.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Lawyer</th>
                <th className="px-4 py-3">Specialisations</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className={`hover:bg-gray-50 cursor-pointer ${l.deletedAt ? 'opacity-60' : ''}`}
                  onClick={() => setOpenId(l.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {l.avatarUrl ? (
                        <img src={l.avatarUrl} alt={l.name || ''} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">
                          {(l.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate flex items-center gap-1">
                          {l.name || 'Unnamed'}
                          {l.organizationId && (
                            <span title="Onboarded by an organization" className="inline-flex">
                              <Users className="w-3 h-3 text-gray-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{l.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {l.specializations && l.specializations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {l.specializations.slice(0, 2).map((s) => (
                          <span key={s} className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{s}</span>
                        ))}
                        {l.specializations.length > 2 && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">+{l.specializations.length - 2}</span>
                        )}
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">{fmtFee(l.feePerConsultation)}</td>
                  <td className="px-4 py-3">
                    {l.rating != null && l.totalReviews != null && l.totalReviews > 0 ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{l.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({l.totalReviews})</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {l.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          <BadgeCheck className="w-3 h-3" /> KYC
                        </span>
                      )}
                      {l.isAvailable === false && !l.bannedAt && !l.deletedAt && (
                        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Unavailable</span>
                      )}
                      {l.bannedAt && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                          <ShieldOff className="w-3 h-3" /> Banned
                        </span>
                      )}
                      {l.deletedAt && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                          <Trash2 className="w-3 h-3" /> Deleted
                        </span>
                      )}
                      {!l.isVerified && !l.bannedAt && !l.deletedAt && (
                        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Unverified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenId(l.id) }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      View detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <LawyerDetailDrawer id={openId} onClose={() => setOpenId(null)} />}

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

const LawyerDetailDrawer: FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const [lawyer, setLawyer] = useState<LawyerRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await adminApi.getUserById(id)
        const data = (res.data?.data ?? res.data?.user ?? res.data) as LawyerRow
        if (!cancelled) setLawyer(data)
      } catch (err) {
        if (!cancelled) setError(friendlyError(err, "Couldn't load this lawyer."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b flex items-center justify-between p-4 z-10">
          <h2 className="text-lg font-semibold">Lawyer detail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : error || !lawyer ? (
          <div className="p-6 text-sm text-red-700">{error || "We couldn't find this lawyer."}</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              {lawyer.avatarUrl ? (
                <img src={lawyer.avatarUrl} alt={lawyer.name || ''} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
                  {(lawyer.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900">{lawyer.name || 'Unnamed'}</h3>
                  {lawyer.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                      <BadgeCheck className="w-3 h-3" /> KYC verified
                    </span>
                  )}
                  {lawyer.bannedAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                      <ShieldOff className="w-3 h-3" /> Banned
                    </span>
                  )}
                </div>
                {lawyer.bio && <p className="text-xs text-gray-600 mt-1 line-clamp-3">{lawyer.bio}</p>}
              </div>
            </div>

            {/* Affiliation — surfaces parent firm or "Independent" */}
            <Section title="Affiliation">
              {lawyer.organization ? (
                <Link
                  to={`/admin/organizations?id=${lawyer.organization.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 -mx-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {lawyer.organization.avatarUrl ? (
                    <img
                      src={lawyer.organization.avatarUrl}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-semibold flex-shrink-0">
                      {(lawyer.organization.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {lawyer.organization.name || 'Organization'}
                      </span>
                      {lawyer.organization.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          <BadgeCheck className="w-2.5 h-2.5" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Salary &amp; payouts managed by this firm
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">Independent lawyer</div>
                    <div className="text-[11px] text-gray-500">
                      Salary &amp; payouts managed directly by the platform (super admin)
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Contact */}
            <Section title="Contact">
              <Row icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={lawyer.email} />
              <Row icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={lawyer.phone} />
              <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={[lawyer.city, lawyer.state, lawyer.pincode].filter(Boolean).join(', ') || '—'} />
            </Section>

            {/* License & practice */}
            <Section title="License & practice">
              <Row label="License #" value={lawyer.licenseNumber || '—'} mono />
              <Row label="Bar Council ID" value={lawyer.barCouncilId || '—'} mono />
              <Row label="Experience" value={lawyer.experienceYears != null ? `${lawyer.experienceYears} yrs` : '—'} />
              <Row icon={<Coins className="w-3.5 h-3.5" />} label="Fee" value={fmtFee(lawyer.feePerConsultation)} />
              <Row label="Available" value={lawyer.isAvailable === false ? 'Not accepting' : 'Accepting bookings'} />
            </Section>

            {/* Salary — base + bonus rates + last payout */}
            <Section title="Salary">
              <Row
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="Paid by"
                value={
                  lawyer.salary?.paidBy === 'ORGANIZATION'
                    ? lawyer.organization?.name || 'Organization'
                    : 'Platform (super admin)'
                }
              />
              {lawyer.salary?.config ? (
                <>
                  <Row
                    icon={<Coins className="w-3.5 h-3.5" />}
                    label="Base salary"
                    value={fmtRupee(lawyer.salary.config.baseSalary)}
                  />
                  <Row
                    label="Per consultation bonus"
                    value={fmtRupee(lawyer.salary.config.bonusPerConsultation)}
                  />
                  <Row
                    label="Per case-closed bonus"
                    value={fmtRupee(lawyer.salary.config.bonusPerCaseClosed)}
                  />
                  <Row
                    label="Per case-won bonus"
                    value={fmtRupee(lawyer.salary.config.bonusPerWonCase)}
                  />
                  {lawyer.salary.config.isOnHold ? (
                    <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5 flex items-start gap-1.5 text-[11px] text-amber-800">
                      <PauseCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">On hold</div>
                        {lawyer.salary.config.holdReason && (
                          <div className="text-amber-700/90">{lawyer.salary.config.holdReason}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                      <TrendingUp className="w-2.5 h-2.5" /> Active
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-md p-2 mt-1">
                  No salary configuration set yet.
                  {lawyer.salary?.paidBy === 'ORGANIZATION'
                    ? ' Their organization head can set it from /organization/salary.'
                    : ' Set it from the Salary controls below.'}
                </div>
              )}

              {lawyer.salary?.lastPayout && (
                <div className="mt-3 border-t border-gray-100 pt-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Last payout
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-medium text-gray-900">
                        {lawyer.salary.lastPayout.cycleMonth
                          ? MONTHS[lawyer.salary.lastPayout.cycleMonth - 1]
                          : '—'}{' '}
                        {lawyer.salary.lastPayout.cycleYear ?? ''}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {lawyer.salary.lastPayout.paidAt ? `Paid ${fmtDate(lawyer.salary.lastPayout.paidAt)}` : '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-emerald-700">
                        {fmtRupee(lawyer.salary.lastPayout.netPayable)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Base {fmtRupee(lawyer.salary.lastPayout.baseSalary)}
                        {(lawyer.salary.lastPayout.bonusAmount ?? 0) > 0
                          ? ` + ${fmtRupee(lawyer.salary.lastPayout.bonusAmount)}`
                          : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Tags */}
            {((lawyer.specializations && lawyer.specializations.length > 0) || (lawyer.languages && lawyer.languages.length > 0)) && (
              <Section title="Tags">
                {lawyer.specializations && lawyer.specializations.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Specialisations</div>
                    <div className="flex flex-wrap gap-1">
                      {lawyer.specializations.map((s) => (
                        <span key={s} className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {lawyer.languages && lawyer.languages.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Languages</div>
                    <div className="flex flex-wrap gap-1">
                      {lawyer.languages.map((l) => (
                        <span key={l} className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Performance */}
            <Section title="Performance">
              <Row icon={<Star className="w-3.5 h-3.5" />} label="Rating" value={lawyer.rating != null && lawyer.totalReviews != null && lawyer.totalReviews > 0 ? `${lawyer.rating.toFixed(1)} (${lawyer.totalReviews})` : '—'} />
              <Row label="Consultations" value={String(lawyer.totalConsultations ?? lawyer._count?.appointments ?? 0)} />
              <Row icon={<FileText className="w-3.5 h-3.5" />} label="Cases handled" value={String(lawyer._count?.cases ?? 0)} />
              <Row label="Joined" value={fmtDate(lawyer.createdAt)} />
              {lawyer.bannedAt && (
                <Row label="Banned on" value={`${fmtDate(lawyer.bannedAt)}${lawyer.banReason ? ` — ${lawyer.banReason}` : ''}`} />
              )}
              {lawyer.deletedAt && <Row label="Deleted on" value={fmtDate(lawyer.deletedAt)} />}
            </Section>

            {/* Quick actions */}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2">
              <Link
                to={`/admin/salary?subject=lawyers&id=${lawyer.id}`}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Coins className="w-3.5 h-3.5" /> Salary
              </Link>
              <a
                href={`/lawyer/client/${lawyer.id}`}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
                title="Open public profile"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Profile
              </a>
              <Link
                to="/admin/moderation"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <ShieldOff className="w-3.5 h-3.5" /> Moderate
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

const Section: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2">{title}</h4>
    <div className="space-y-1.5 bg-gray-50 rounded-lg p-3">{children}</div>
  </div>
)

const Row: FC<{ icon?: React.ReactNode; label: string; value?: string | null; mono?: boolean }> = ({ icon, label, value, mono }) => (
  <div className="flex items-start justify-between text-sm gap-3">
    <span className="inline-flex items-center gap-1.5 text-gray-500 flex-shrink-0">{icon}{label}</span>
    <span className={`text-gray-900 font-medium truncate text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
  </div>
)

export default AdminLawyersPage
