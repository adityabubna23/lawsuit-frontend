import { FC, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, ShieldCheck, ArrowRight, Plus, AlertCircle } from 'lucide-react'
import { mediationFlowApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

/**
 * Phase 1+2 mediation list page.
 *
 * Lives at `/app/mediations/flow` (and `/lawyer/mediations`,
 * `/organization/mediations` if we route those too). Replaces the
 * legacy `MediationsPage` for users who participate in the new flow —
 * the legacy page still works at `/app/mediations` for backwards
 * compatibility.
 *
 * Server returns the user's mediations as either client OR lawyer OR
 * mediator (the server-side `listMediationsForClient` does this OR-
 * union — Phase 2 widened it).
 */

interface MediationRow {
  id: string
  status: string
  disputeTitle: string
  createdAt: string
  startedAt: string | null
  concludedAt: string | null
  confidential: boolean
  initiatorClientId: string
  respondentClientId: string | null
  mediatorId: string | null
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  AWAITING_RESPONDENT: { label: 'Waiting for response', color: 'bg-amber-50 text-amber-800' },
  DECLINED: { label: 'Declined', color: 'bg-red-50 text-red-700' },
  EXPIRED_INVITE: { label: 'Invite expired', color: 'bg-gray-100 text-gray-700' },
  AWAITING_LAWYER_ASSIGNMENT: { label: 'Pick a lawyer', color: 'bg-blue-50 text-blue-800' },
  AWAITING_MEDIATOR: { label: 'Selecting mediator', color: 'bg-blue-50 text-blue-800' },
  ACTIVE: { label: 'Active', color: 'bg-emerald-50 text-emerald-800' },
  SETTLED: { label: 'Settled', color: 'bg-emerald-100 text-emerald-900' },
  NON_SETTLEMENT: { label: 'No settlement', color: 'bg-gray-100 text-gray-700' },
  WITHDRAWN: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700' },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-700' },
}

const MediationFlowListPage: FC = () => {
  const [items, setItems] = useState<MediationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    mediationFlowApi
      .list()
      .then((res) => {
        if (!mounted) return
        const list = (res.data as { items?: MediationRow[] })?.items ?? []
        setItems(list)
      })
      .catch((err) => {
        if (!mounted) return
        setError(friendlyError(err, "Couldn't load your mediations."))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <header className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">My mediations</h1>
          <p className="text-sm text-gray-600">
            Confidential dispute resolution under the Mediation Act 2023.
          </p>
        </div>
        <Link
          to="/app/mediations/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Start a new mediation
        </Link>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-700 mb-1 font-medium">No mediations yet</p>
          <p className="text-xs text-gray-500 mb-4">
            Mediation is a confidential, court-enforceable alternative to litigation.
            Start one to invite the other party.
          </p>
          <Link
            to="/app/mediations/new"
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Start a new mediation
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((m) => {
            const badge = STATUS_BADGE[m.status] || {
              label: m.status,
              color: 'bg-gray-100 text-gray-700',
            }
            return (
              <li key={m.id}>
                <Link
                  to={`/app/mediations/${m.id}`}
                  className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label}
                        </span>
                        {m.confidential && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                            <ShieldCheck className="w-2.5 h-2.5" /> §27 privileged
                          </span>
                        )}
                      </div>
                      <p className="text-base font-medium text-gray-900 truncate">{m.disputeTitle}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created{' '}
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {m.startedAt && ` · Active since ${new Date(m.startedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        {m.concludedAt && ` · Concluded ${new Date(m.concludedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MediationFlowListPage
