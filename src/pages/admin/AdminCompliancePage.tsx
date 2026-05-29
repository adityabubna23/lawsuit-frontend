import { FC, useEffect, useState } from 'react'
import { FileSpreadsheet, Download, Loader2, ShieldCheck, FileCheck2, AlertTriangle, IndianRupee } from 'lucide-react'
import { adminApi } from '@/services/api'

type ExportKind = 'consents' | 'verifications' | 'sla-breaches' | 'payments'

interface Summary { consents: number; verifications: number; slaBreaches: number; payments: number }

const EXPORTS: { kind: ExportKind; label: string; desc: string; Icon: typeof ShieldCheck }[] = [
  { kind: 'consents', label: 'Consents obtained', desc: 'Every consent event (eKYC, DPDP, no-recording, share-scope) with exact text + IP.', Icon: ShieldCheck },
  { kind: 'verifications', label: 'eKYC verifications', desc: 'Aadhaar/DigiLocker verification submissions and outcomes.', Icon: FileCheck2 },
  { kind: 'sla-breaches', label: 'SLA breaches', desc: 'Breach alerts raised by the SLA scheduler.', Icon: AlertTriangle },
  { kind: 'payments', label: 'Payments', desc: 'Payment + escrow records for financial compliance.', Icon: IndianRupee },
]

const AdminCompliancePage: FC = () => {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [busyKind, setBusyKind] = useState<ExportKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async () => {
    try {
      const res = await adminApi.complianceSummary({ from: from || undefined, to: to || undefined })
      setSummary(res.data as Summary)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load summary')
    }
  }

  useEffect(() => { void loadSummary() }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (kind: ExportKind) => {
    setBusyKind(kind)
    setError(null)
    try {
      const res = await adminApi.complianceExport(kind, { from: from || undefined, to: to || undefined })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${kind}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Export failed')
    } finally {
      setBusyKind(null)
    }
  }

  const counts: Record<ExportKind, number | undefined> = {
    consents: summary?.consents,
    verifications: summary?.verifications,
    'sla-breaches': summary?.slaBreaches,
    payments: summary?.payments,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-2">
        <FileSpreadsheet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold text-primary">Compliance reports</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5">On-demand CSV exports for audit &amp; DPDP compliance. Optionally filter by date range.</p>

      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-2 py-1.5" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo('') }} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map(({ kind, label, desc, Icon }) => (
          <div key={kind} className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-gray-900">{label}</h3>
              {counts[kind] != null && (
                <span className="ml-auto text-xs font-mono text-gray-500">{counts[kind]} rows</span>
              )}
            </div>
            <p className="text-xs text-gray-500 flex-1">{desc}</p>
            <button
              onClick={() => download(kind)}
              disabled={busyKind === kind}
              className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {busyKind === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {busyKind === kind ? 'Exporting…' : 'Download CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminCompliancePage
