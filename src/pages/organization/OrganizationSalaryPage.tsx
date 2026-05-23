import { FC, useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  Coins,
  X,
  Settings2,
  PauseCircle,
  PlayCircle,
  History,
  Wallet,
  Calculator,
  AlertCircle,
  Check,
  Banknote,
  RefreshCw,
} from 'lucide-react'
import { organizationsApi } from '@/services/api'
import { useOrganizationStore } from '@/stores/organizationStore'
import { unwrapList, unwrapObject } from '@/utils/unwrap'
import { friendlyError } from '@/utils/errors'

// ─────────────────────────────────────────────────────────────────────────
// Types — mirror the server's `entity-salary.service.ts` response shapes.
// ─────────────────────────────────────────────────────────────────────────
interface SalaryConfig {
  id?: string
  subjectType?: 'LAWYER' | 'ORGANIZATION'
  subjectId?: string
  baseSalary?: number
  bonusPerConsultation?: number
  bonusPerCaseClosed?: number
  bonusPerWonCase?: number
  isOnHold?: boolean
  holdReason?: string | null
  updatedAt?: string
}

interface SalaryPreview {
  cycle?: { cycleMonth: number; cycleYear: number }
  config?: SalaryConfig | null
  performance?: {
    consultationCount?: number
    caseClosedCount?: number
    caseWonCount?: number
  }
  breakdown?: {
    baseSalary?: number
    consultationBonus?: number
    caseClosedBonus?: number
    caseWonBonus?: number
    bonusAmount?: number
    deductionAmount?: number
    netPayable?: number
  }
  alreadyPaid?: boolean
  existingPayout?: { id?: string; netPayable?: number; paidAt?: string } | null
}

interface AdjustmentRow {
  id: string
  baseSalary?: number
  bonusPerConsultation?: number
  bonusPerCaseClosed?: number
  bonusPerWonCase?: number
  reason?: string | null
  changedById?: string
  changedAt?: string
  createdAt?: string
}

interface PayoutRow {
  id: string
  cycleMonth?: number
  cycleYear?: number
  baseSalary?: number
  bonusAmount?: number
  deductionAmount?: number
  netPayable?: number
  notes?: string | null
  paidAt?: string
  createdAt?: string
}

interface BankAccount {
  id: string
  accountHolderName?: string
  accountNumberMasked?: string
  ifsc?: string
  bankName?: string
  label?: string
  isDefault?: boolean
}

const fmt = (n?: number | null) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0,
  )

const fmtDate = (s?: string | null) =>
  s
    ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const OrganizationSalaryPage: FC = () => {
  const lawyers = useOrganizationStore((s) => s.lawyers)
  const fetchLawyers = useOrganizationStore((s) => s.fetchLawyers)
  const loadingLawyers = useOrganizationStore((s) => s.loadingLawyers)

  // Lawyer-id → SalaryConfig cache. We fetch all configs in parallel after
  // the lawyer list lands so the table can show base salary + hold status
  // in one glance, without making the user click each row.
  const [configs, setConfigs] = useState<Record<string, SalaryConfig | null>>({})
  const [configsLoading, setConfigsLoading] = useState(false)
  const [drawerLawyerId, setDrawerLawyerId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetchLawyers().catch(() => undefined)
  }, [fetchLawyers])

  // After the lawyer list is in, fan out one parallel salary-config call per
  // lawyer. We use Promise.allSettled so one rejection doesn't blank others.
  useEffect(() => {
    if (lawyers.length === 0) return
    let cancelled = false
    setConfigsLoading(true)
    Promise.allSettled(
      lawyers.map((l) =>
        organizationsApi.getLawyerSalaryConfig(l.id).then((res) => ({
          id: l.id,
          config: unwrapObject<SalaryConfig>(res.data, 'config'),
        })),
      ),
    )
      .then((results) => {
        if (cancelled) return
        const next: Record<string, SalaryConfig | null> = {}
        results.forEach((r) => {
          if (r.status === 'fulfilled') next[r.value.id] = r.value.config ?? null
        })
        setConfigs((prev) => ({ ...prev, ...next }))
      })
      .finally(() => !cancelled && setConfigsLoading(false))
    return () => {
      cancelled = true
    }
  }, [lawyers])

  const totals = useMemo(() => {
    const ids = Object.keys(configs)
    let totalBase = 0
    let onHold = 0
    let configured = 0
    ids.forEach((id) => {
      const c = configs[id]
      if (!c) return
      configured += 1
      totalBase += c.baseSalary ?? 0
      if (c.isOnHold) onHold += 1
    })
    return {
      totalBase,
      onHold,
      configured,
      pending: lawyers.length - configured,
    }
  }, [configs, lawyers])

  const refreshConfig = async (lawyerId: string) => {
    try {
      const res = await organizationsApi.getLawyerSalaryConfig(lawyerId)
      const config = unwrapObject<SalaryConfig>(res.data, 'config') ?? null
      setConfigs((prev) => ({ ...prev, [lawyerId]: config }))
    } catch {
      /* swallow; the drawer surfaces its own errors */
    }
  }

  const drawerLawyer = drawerLawyerId ? lawyers.find((l) => l.id === drawerLawyerId) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <Coins className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lawyer salaries</h1>
            <p className="text-sm text-gray-500">
              Set base salary &amp; bonuses, run monthly payroll, and view payout history for every lawyer
              under your organization.
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchLawyers().catch(() => undefined)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingLawyers ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Lawyers" value={String(lawyers.length)} hint="under your org" />
        <Stat
          label="Configured"
          value={String(totals.configured)}
          hint={
            totals.pending > 0
              ? `${totals.pending} need salary setup`
              : 'all lawyers configured'
          }
          accent={totals.pending === 0 && totals.configured > 0 ? 'text-emerald-700' : undefined}
        />
        <Stat label="Combined base" value={fmt(totals.totalBase)} hint="monthly base salary" accent="text-emerald-700" />
        <Stat
          label="On hold"
          value={String(totals.onHold)}
          hint={totals.onHold > 0 ? 'salaries paused' : 'none paused'}
          accent={totals.onHold > 0 ? 'text-amber-700' : undefined}
        />
      </div>

      {/* Lawyer list */}
      {loadingLawyers ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : lawyers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
          <Coins className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">No lawyers under your organization yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add lawyers from the Lawyers page first.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Lawyer</th>
                  <th className="px-4 py-3">Base salary</th>
                  <th className="px-4 py-3">Per consult</th>
                  <th className="px-4 py-3">Per case</th>
                  <th className="px-4 py-3">Per win</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lawyers.map((l) => {
                  const c = configs[l.id]
                  const hasConfig = !!c
                  return (
                    <tr key={l.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {l.avatarUrl ? (
                            <img
                              src={l.avatarUrl}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover bg-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                              {(l.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{l.name || 'Unnamed'}</div>
                            <div className="text-xs text-gray-500 truncate">{l.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {hasConfig ? fmt(c?.baseSalary) : <span className="text-gray-400">Not set</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {hasConfig ? fmt(c?.bonusPerConsultation) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {hasConfig ? fmt(c?.bonusPerCaseClosed) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {hasConfig ? fmt(c?.bonusPerWonCase) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!hasConfig ? (
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            Pending setup
                          </span>
                        ) : c?.isOnHold ? (
                          <span
                            title={c.holdReason || ''}
                            className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100"
                          >
                            On hold
                          </span>
                        ) : (
                          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDrawerLawyerId(l.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {configsLoading && (
            <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading salary details…
            </div>
          )}
        </div>
      )}

      {drawerLawyer && (
        <SalaryDrawer
          lawyer={drawerLawyer}
          initialConfig={configs[drawerLawyer.id] ?? null}
          onClose={() => setDrawerLawyerId(null)}
          onConfigChanged={() => refreshConfig(drawerLawyer.id)}
          showToast={showToast}
        />
      )}

      {toast && (
        <div className="fixed right-6 bottom-6 z-50">
          <div
            className={`px-5 py-3 rounded-xl shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Drawer — three tabs: Configure / Preview & pay / History
// ─────────────────────────────────────────────────────────────────────────
type DrawerTab = 'config' | 'preview' | 'history'

const SalaryDrawer: FC<{
  lawyer: { id: string; name?: string; email?: string; avatarUrl?: string | null }
  initialConfig: SalaryConfig | null
  onClose: () => void
  onConfigChanged: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}> = ({ lawyer, initialConfig, onClose, onConfigChanged, showToast }) => {
  const [tab, setTab] = useState<DrawerTab>('config')

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          {lawyer.avatarUrl ? (
            <img src={lawyer.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-base font-semibold">
              {(lawyer.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{lawyer.name || 'Unnamed'}</div>
            <div className="text-xs text-gray-500 truncate">{lawyer.email}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </header>

        <nav className="flex border-b border-gray-100 px-5">
          {([
            { id: 'config', label: 'Configure', icon: Settings2 },
            { id: 'preview', label: 'Preview & pay', icon: Calculator },
            { id: 'history', label: 'History', icon: History },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'config' && (
            <ConfigPanel
              lawyerId={lawyer.id}
              initialConfig={initialConfig}
              onChanged={onConfigChanged}
              showToast={showToast}
            />
          )}
          {tab === 'preview' && (
            <PreviewPanel lawyerId={lawyer.id} onPaid={onConfigChanged} showToast={showToast} />
          )}
          {tab === 'history' && <HistoryPanel lawyerId={lawyer.id} />}
        </div>
      </aside>
    </div>
  )
}

// ─── Configure tab ────────────────────────────────────────────────────────
const ConfigPanel: FC<{
  lawyerId: string
  initialConfig: SalaryConfig | null
  onChanged: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}> = ({ lawyerId, initialConfig, onChanged, showToast }) => {
  const [config, setConfig] = useState<SalaryConfig | null>(initialConfig)
  const [form, setForm] = useState({
    baseSalary: initialConfig?.baseSalary?.toString() ?? '',
    bonusPerConsultation: initialConfig?.bonusPerConsultation?.toString() ?? '',
    bonusPerCaseClosed: initialConfig?.bonusPerCaseClosed?.toString() ?? '',
    bonusPerWonCase: initialConfig?.bonusPerWonCase?.toString() ?? '',
    reason: '',
  })
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [saving, setSaving] = useState(false)
  const [holding, setHolding] = useState(false)

  // Re-fetch the latest config when the panel mounts so the drawer doesn't
  // show stale numbers if it was opened from a cached row.
  useEffect(() => {
    let cancelled = false
    organizationsApi
      .getLawyerSalaryConfig(lawyerId)
      .then((res) => {
        if (cancelled) return
        const c = unwrapObject<SalaryConfig>(res.data, 'config') ?? null
        setConfig(c)
        setForm({
          baseSalary: c?.baseSalary?.toString() ?? '',
          bonusPerConsultation: c?.bonusPerConsultation?.toString() ?? '',
          bonusPerCaseClosed: c?.bonusPerCaseClosed?.toString() ?? '',
          bonusPerWonCase: c?.bonusPerWonCase?.toString() ?? '',
          reason: '',
        })
      })
      .catch(() => undefined)
    organizationsApi
      .getLawyerBankAccounts(lawyerId)
      .then((res) => {
        if (cancelled) return
        setBankAccounts(unwrapList<BankAccount>(res.data))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [lawyerId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {}
      if (form.baseSalary !== '') payload.baseSalary = Number(form.baseSalary)
      if (form.bonusPerConsultation !== '') payload.bonusPerConsultation = Number(form.bonusPerConsultation)
      if (form.bonusPerCaseClosed !== '') payload.bonusPerCaseClosed = Number(form.bonusPerCaseClosed)
      if (form.bonusPerWonCase !== '') payload.bonusPerWonCase = Number(form.bonusPerWonCase)
      if (form.reason.trim()) payload.reason = form.reason.trim()
      const res = await organizationsApi.setLawyerSalaryConfig(lawyerId, payload)
      const updated = unwrapObject<SalaryConfig>(res.data, 'config') ?? null
      setConfig(updated)
      setForm((s) => ({ ...s, reason: '' }))
      showToast('Salary configuration saved', 'success')
      onChanged()
    } catch (err) {
      showToast(friendlyError(err, "We couldn't save the salary configuration."), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleHold = async () => {
    const reason = prompt('Reason for putting this salary on hold?')
    if (!reason?.trim()) return
    setHolding(true)
    try {
      const res = await organizationsApi.holdLawyerSalary(lawyerId, reason.trim())
      const updated = unwrapObject<SalaryConfig>(res.data, 'config') ?? null
      setConfig(updated)
      showToast('Salary placed on hold', 'success')
      onChanged()
    } catch (err) {
      showToast(friendlyError(err, "We couldn't put this salary on hold."), 'error')
    } finally {
      setHolding(false)
    }
  }

  const handleRelease = async () => {
    const reason = prompt('Optional note for releasing the hold?') || undefined
    setHolding(true)
    try {
      const res = await organizationsApi.releaseLawyerSalary(lawyerId, reason?.trim())
      const updated = unwrapObject<SalaryConfig>(res.data, 'config') ?? null
      setConfig(updated)
      showToast('Salary hold released', 'success')
      onChanged()
    } catch (err) {
      showToast(friendlyError(err, "We couldn't release the hold."), 'error')
    } finally {
      setHolding(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {config?.isOnHold && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 flex items-start gap-2">
          <PauseCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <div className="font-semibold">Salary is currently on hold</div>
            {config.holdReason && <div className="mt-0.5">Reason: {config.holdReason}</div>}
            <div className="mt-1 text-amber-700/80">
              Payouts are blocked until you release the hold below.
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Salary configuration</h3>
        <p className="text-xs text-gray-500 mb-3">
          All fields accept whole rupees. Bonuses are added on top of base salary based on the lawyer's
          performance during each payroll cycle.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Base salary (monthly)"
            value={form.baseSalary}
            onChange={(v) => setForm((s) => ({ ...s, baseSalary: v }))}
            placeholder="0"
            required
          />
          <NumberField
            label="Per consultation bonus"
            value={form.bonusPerConsultation}
            onChange={(v) => setForm((s) => ({ ...s, bonusPerConsultation: v }))}
            placeholder="0"
          />
          <NumberField
            label="Per case closed bonus"
            value={form.bonusPerCaseClosed}
            onChange={(v) => setForm((s) => ({ ...s, bonusPerCaseClosed: v }))}
            placeholder="0"
          />
          <NumberField
            label="Per case won bonus"
            value={form.bonusPerWonCase}
            onChange={(v) => setForm((s) => ({ ...s, bonusPerWonCase: v }))}
            placeholder="0"
          />
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
            placeholder="e.g. Annual review increment"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Logged in the audit history so you can trace why a number changed.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-gray-500" /> Bank accounts on file
        </h3>
        {bankAccounts.length === 0 ? (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
            No bank accounts added by this lawyer yet. They must add an account before you can pay
            their salary.
          </div>
        ) : (
          <div className="space-y-2">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {b.bankName || b.label || 'Bank'} · {b.accountNumberMasked || '••••'}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {b.accountHolderName} · {b.ifsc}
                  </div>
                </div>
                {b.isDefault && (
                  <span className="ml-3 inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {config?.isOnHold ? (
          <button
            type="button"
            onClick={handleRelease}
            disabled={holding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-green-700 text-sm font-medium hover:bg-green-50 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" /> Release hold
          </button>
        ) : (
          <button
            type="button"
            onClick={handleHold}
            disabled={holding || !config}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
          >
            <PauseCircle className="w-4 h-4" /> Put on hold
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save configuration'}
        </button>
      </div>
    </form>
  )
}

// ─── Preview & pay tab ────────────────────────────────────────────────────
const PreviewPanel: FC<{
  lawyerId: string
  onPaid: () => void
  showToast: (msg: string, type: 'success' | 'error') => void
}> = ({ lawyerId, onPaid, showToast }) => {
  const today = new Date()
  const [cycleMonth, setCycleMonth] = useState(today.getMonth() + 1) // 1-12
  const [cycleYear, setCycleYear] = useState(today.getFullYear())
  const [bonus, setBonus] = useState('')
  const [deduction, setDeduction] = useState('')
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<SalaryPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState(false)

  const loadPreview = async () => {
    setLoading(true)
    try {
      const res = await organizationsApi.previewLawyerSalary(lawyerId, { cycleMonth, cycleYear })
      // Server returns the preview object at the root.
      const data = (res.data ?? {}) as SalaryPreview
      setPreview(data)
    } catch (err) {
      showToast(friendlyError(err, "We couldn't load the payroll preview."), 'error')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyerId, cycleMonth, cycleYear])

  const handlePay = async () => {
    if (!preview) return
    if (preview.alreadyPaid) {
      showToast('This cycle has already been paid out.', 'error')
      return
    }
    if (preview.config?.isOnHold) {
      showToast('Salary is on hold — release the hold before paying.', 'error')
      return
    }
    if (!confirm(`Pay ${fmt(preview.breakdown?.netPayable)} to this lawyer for ${MONTHS[cycleMonth - 1]} ${cycleYear}?`)) {
      return
    }
    setPaying(true)
    try {
      const payload: any = { cycleMonth, cycleYear }
      if (bonus !== '') payload.bonusAmount = Number(bonus)
      if (deduction !== '') payload.deductionAmount = Number(deduction)
      if (notes.trim()) payload.notes = notes.trim()
      await organizationsApi.payLawyerSalary(lawyerId, payload)
      showToast('Salary paid successfully', 'success')
      setBonus('')
      setDeduction('')
      setNotes('')
      await loadPreview()
      onPaid()
    } catch (err) {
      showToast(friendlyError(err, "We couldn't process the payout."), 'error')
    } finally {
      setPaying(false)
    }
  }

  const onHold = preview?.config?.isOnHold
  const noConfig = !preview?.config
  const alreadyPaid = !!preview?.alreadyPaid

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Payroll cycle</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <select
              value={cycleMonth}
              onChange={(e) => setCycleMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input
              type="number"
              min={2020}
              max={2100}
              value={cycleYear}
              onChange={(e) => setCycleYear(Number(e.target.value) || today.getFullYear())}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : !preview ? (
        <div className="text-sm text-gray-500">Couldn't load preview.</div>
      ) : (
        <>
          {noConfig && (
            <Banner tone="amber" icon={AlertCircle}>
              No salary configuration set for this lawyer yet. Go to the Configure tab and set a base
              salary first.
            </Banner>
          )}
          {onHold && (
            <Banner tone="amber" icon={PauseCircle}>
              Salary is on hold ({preview?.config?.holdReason || 'no reason given'}). Release it from
              the Configure tab before paying.
            </Banner>
          )}
          {alreadyPaid && (
            <Banner tone="blue" icon={Check}>
              Already paid for this cycle{preview.existingPayout?.paidAt
                ? ` on ${fmtDate(preview.existingPayout.paidAt)}`
                : ''}.
            </Banner>
          )}

          {/* Performance summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Performance this cycle</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Mini label="Consultations" value={String(preview.performance?.consultationCount ?? 0)} />
              <Mini label="Cases closed" value={String(preview.performance?.caseClosedCount ?? 0)} />
              <Mini label="Cases won" value={String(preview.performance?.caseWonCount ?? 0)} />
            </div>
          </div>

          {/* Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Calculated breakdown</h3>
            <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 text-sm">
              <Line label="Base salary" value={fmt(preview.breakdown?.baseSalary)} />
              <Line label="Consultation bonus" value={fmt(preview.breakdown?.consultationBonus)} />
              <Line label="Case-closed bonus" value={fmt(preview.breakdown?.caseClosedBonus)} />
              <Line label="Case-won bonus" value={fmt(preview.breakdown?.caseWonBonus)} />
              {(preview.breakdown?.bonusAmount ?? 0) > 0 && (
                <Line
                  label="Manual bonus added"
                  value={fmt(preview.breakdown?.bonusAmount)}
                  hint="from your override below"
                />
              )}
              {(preview.breakdown?.deductionAmount ?? 0) > 0 && (
                <Line
                  label="Manual deduction"
                  value={`− ${fmt(preview.breakdown?.deductionAmount)}`}
                  tone="red"
                />
              )}
              <Line
                label="Net payable"
                value={fmt(preview.breakdown?.netPayable)}
                bold
                tone="emerald"
              />
            </div>
          </div>

          {/* Manual adjustments */}
          {!alreadyPaid && !onHold && !noConfig && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Optional adjustments</h3>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="One-time bonus"
                  value={bonus}
                  onChange={setBonus}
                  placeholder="0"
                />
                <NumberField
                  label="One-time deduction"
                  value={deduction}
                  onChange={setDeduction}
                  placeholder="0"
                />
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Diwali bonus / sick day deduction"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Adjustments here apply only to this cycle's payout, not the saved config.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Paying out for <span className="font-medium text-gray-700">{MONTHS[cycleMonth - 1]} {cycleYear}</span>
            </div>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying || alreadyPaid || onHold || noConfig}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {paying ? 'Paying…' : 'Pay this cycle'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── History tab ─────────────────────────────────────────────────────────
const HistoryPanel: FC<{ lawyerId: string }> = ({ lawyerId }) => {
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([])
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.allSettled([
      organizationsApi.getLawyerSalaryAdjustmentHistory(lawyerId, { limit: 25 }),
      organizationsApi.getLawyerSalaryPayoutHistory(lawyerId, { limit: 25 }),
    ])
      .then(([adjRes, payRes]) => {
        if (cancelled) return
        if (adjRes.status === 'fulfilled') {
          setAdjustments(unwrapList<AdjustmentRow>(adjRes.value.data))
        } else {
          setError(friendlyError(adjRes.reason, "We couldn't load history."))
        }
        if (payRes.status === 'fulfilled') {
          setPayouts(unwrapList<PayoutRow>(payRes.value.data))
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [lawyerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Banner tone="red" icon={AlertCircle}>
          {error}
        </Banner>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Payout history</h3>
        {payouts.length === 0 ? (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
            No payouts yet for this lawyer.
          </div>
        ) : (
          <ul className="space-y-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="border border-gray-100 rounded-lg px-3 py-2 text-sm flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {p.cycleMonth ? MONTHS[p.cycleMonth - 1] : '—'} {p.cycleYear ?? ''}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Paid {fmtDate(p.paidAt || p.createdAt)}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-emerald-700">{fmt(p.netPayable)}</div>
                  <div className="text-[11px] text-gray-500">
                    Base {fmt(p.baseSalary)}
                    {(p.bonusAmount ?? 0) > 0 ? ` + ${fmt(p.bonusAmount)}` : ''}
                    {(p.deductionAmount ?? 0) > 0 ? ` − ${fmt(p.deductionAmount)}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Configuration changes</h3>
        {adjustments.length === 0 ? (
          <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
            No configuration changes recorded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {adjustments.map((a) => (
              <li key={a.id} className="border border-gray-100 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">
                    Base {fmt(a.baseSalary)} · per consult {fmt(a.bonusPerConsultation)} · per case{' '}
                    {fmt(a.bonusPerCaseClosed)} · per win {fmt(a.bonusPerWonCase)}
                  </div>
                  <div className="text-[11px] text-gray-500">{fmtDate(a.changedAt || a.createdAt)}</div>
                </div>
                {a.reason && <div className="text-xs text-gray-500 mt-0.5">Reason: {a.reason}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// ─── Tiny presentational helpers ─────────────────────────────────────────
const Stat: FC<{ label: string; value: string; hint?: string; accent?: string }> = ({
  label,
  value,
  hint,
  accent,
}) => (
  <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
    <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className={`text-xl font-semibold mt-0.5 ${accent || 'text-gray-900'}`}>{value}</div>
    {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
  </div>
)

const Mini: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-center">
    <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
    <div className="text-base font-semibold text-gray-900">{value}</div>
  </div>
)

const Line: FC<{ label: string; value: string; bold?: boolean; tone?: 'red' | 'emerald'; hint?: string }> = ({
  label,
  value,
  bold,
  tone,
  hint,
}) => (
  <div className="flex items-center justify-between px-3 py-2">
    <div className="text-gray-700 text-sm">
      {label}
      {hint && <span className="ml-2 text-[10px] text-gray-400">({hint})</span>}
    </div>
    <div
      className={`text-sm ${bold ? 'font-semibold' : ''} ${
        tone === 'red' ? 'text-red-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-gray-900'
      }`}
    >
      {value}
    </div>
  </div>
)

const Banner: FC<{
  tone: 'amber' | 'blue' | 'red'
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}> = ({ tone, icon: Icon, children }) => {
  const cls =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-100 text-amber-800'
      : tone === 'blue'
        ? 'bg-blue-50 border-blue-100 text-blue-800'
        : 'bg-red-50 border-red-100 text-red-800'
  return (
    <div className={`rounded-lg border p-3 flex items-start gap-2 text-xs ${cls}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

const NumberField: FC<{
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}> = ({ label, value, onChange, placeholder, required }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}
      {required && ' *'}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full pl-6 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  </div>
)

export default OrganizationSalaryPage
