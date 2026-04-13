import { FC, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { mediationApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { Mediation } from '@/types/mediation'

const statusBadge: Record<string, string> = {
  AWAITING_RESPONDENT_LAWYER: 'bg-amber-100 text-amber-800',
  AWAITING_MEDIATOR_SELECTION: 'bg-sky-100 text-sky-800',
  IN_SESSION: 'bg-emerald-100 text-emerald-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ESCALATED_TO_CASE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
}

const prettyStatus = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())

const MediationsPage: FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'active' | 'concluded'>('active')

  const q = useQuery({
    queryKey: ['mediations'],
    queryFn: async () => (await mediationApi.list()).data.data as Mediation[],
  })

  const items = q.data ?? []
  const filtered = items.filter((m) =>
    tab === 'active'
      ? !['RESOLVED', 'ESCALATED_TO_CASE', 'CANCELLED'].includes(m.status)
      : ['RESOLVED', 'ESCALATED_TO_CASE', 'CANCELLED'].includes(m.status)
  )

  const isLawyer = user?.role === 'LAWYER'
  const detailPath = (id: string) => (isLawyer ? `/lawyer/mediation/${id}` : `/app/mediation/${id}`)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mediations</h1>
          <p className="text-sm text-gray-500 mt-1">Resolve disputes through neutral mediation before escalating to court.</p>
        </div>
        <div className="flex gap-2">
          {isLawyer && (
            <Link to="/lawyer/mediator-settings" className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Mediator Settings
            </Link>
          )}
          {!isLawyer && (
            <button
              onClick={() => navigate('/app/mediation/new')}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
            >
              + New Mediation Invite
            </button>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(['active', 'concluded'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 px-1 border-b-2 text-sm font-medium capitalize ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {q.isLoading ? (
        <div className="py-16 text-center text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-600">No {tab} mediations yet.</p>
          {!isLawyer && tab === 'active' && (
            <button
              onClick={() => navigate('/app/mediation/new')}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Start a mediation →
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => {
            const otherParty =
              m.initiatorClientId === user?.id ? m.respondentClient : m.initiatorClient
            return (
              <li key={m.id}>
                <Link
                  to={detailPath(m.id)}
                  className="block bg-white p-5 rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-gray-900">{m.disputeTitle}</h3>
                      {!isLawyer && otherParty && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          with {otherParty.name} · {otherParty.email}
                        </p>
                      )}
                      {m.mediator && (
                        <p className="text-sm text-gray-500 mt-0.5">Mediator: {m.mediator.name}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[m.status] || 'bg-gray-100'}`}>
                      {prettyStatus(m.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{m.disputeDescription}</p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default MediationsPage
