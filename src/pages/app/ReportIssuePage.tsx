import { FC, useEffect, useState } from 'react'
import { Bug, Loader2, Check, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { reportApi } from '@/services/api'
import { unwrapList } from '@/utils/unwrap'

interface Report {
  id: string
  title: string
  description: string
  screenshotUrl: string | null
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED'
  createdAt: string
  resolvedAt: string | null
}

const statusBadge: Record<Report['status'], { label: string; className: string; icon: React.ReactNode }> = {
  OPEN: { label: 'Open', className: 'bg-blue-50 text-blue-700', icon: <Clock className="w-3 h-3" /> },
  IN_REVIEW: { label: 'In review', className: 'bg-amber-50 text-amber-700', icon: <Loader2 className="w-3 h-3" /> },
  RESOLVED: { label: 'Resolved', className: 'bg-green-50 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
}

const ReportIssuePage: FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await reportApi.list()
      setReports(unwrapList<Report>(res.data, 'reports'))
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to load reports', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSubmitting(true)
    try {
      await reportApi.create({
        title: title.trim(),
        description: description.trim(),
        screenshotUrl: screenshotUrl.trim() || undefined,
      })
      showToast('Issue reported — thank you!', 'success')
      setTitle('')
      setDescription('')
      setScreenshotUrl('')
      await load()
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to submit', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bug className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report an issue</h1>
          <p className="text-sm text-gray-500">Found a bug or have feedback? Let us know.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Short summary of the issue"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What happened? What did you expect? Steps to reproduce…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Screenshot URL <span className="text-gray-400">(optional)</span>
          </label>
          <input
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            type="url"
            placeholder="https://…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim()}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </div>
      </form>

      {/* My reports */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Your reports</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">You haven't submitted any reports yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {reports.map((r) => {
              const badge = statusBadge[r.status] ?? statusBadge.OPEN
              return (
                <div key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{r.title}</div>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.description}</p>
                      <div className="text-xs text-gray-400 mt-2">
                        Submitted {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {r.resolvedAt && (
                          <> • Resolved {new Date(r.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${badge.className}`}>
                      {badge.icon}
                      {badge.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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

export default ReportIssuePage
