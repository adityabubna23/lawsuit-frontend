import { FC, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone,
  PhoneOff,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  Video,
  Clock,
  Calendar,
  User,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { videoApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import type { CallHistory, CallHistoryResponse } from '@/types/video'

type FilterType = 'all' | 'completed' | 'missed' | 'outgoing' | 'incoming'

/**
 * Call history list.
 *
 * Server response (see lawsuit-server/src/services/video.service.ts
 * `getCallHistory`) is already viewer-relative: each row carries
 * `isOutgoing` and `participant` (the other party). Status and callType
 * come back as Prisma enum strings (UPPERCASE) — we lowercase for
 * display + filter comparisons.
 */
const CallHistoryPage: FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [calls, setCalls] = useState<CallHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCallHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await videoApi.getCallHistory({ page, limit: 20 })
      // Server returns { calls, pagination: { page, limit, total, totalPages, hasMore } }.
      const data = res.data as CallHistoryResponse
      setCalls(data.calls || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      console.error('Failed to fetch call history:', err)
      setError(err.response?.data?.error || 'Failed to load call history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCallHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s'
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs ? `${mins}m ${secs}s` : `${mins}m`
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Icon driven by status (terminal failures first) then direction.
   * Server-side `status` is UPPERCASE; we compare via toLowerCase().
   */
  const getCallIcon = (call: CallHistory) => {
    const status = (call.status || '').toLowerCase()
    if (status === 'missed') return <PhoneMissed className="w-5 h-5 text-red-500" />
    if (status === 'declined') return <PhoneOff className="w-5 h-5 text-orange-500" />
    if (status === 'failed' || status === 'cancelled') {
      return <PhoneOff className="w-5 h-5 text-gray-500" />
    }
    return call.isOutgoing ? (
      <PhoneOutgoing className="w-5 h-5 text-green-500" />
    ) : (
      <PhoneIncoming className="w-5 h-5 text-blue-500" />
    )
  }

  const getStatusBadge = (status: string) => {
    const key = (status || '').toLowerCase()
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      missed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Missed' },
      declined: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Declined' },
      failed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Failed' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' },
    }
    const badge = badges[key] || badges.failed
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  // Filter + search. Server fields are UPPERCASE — normalise before comparing.
  const filteredCalls = calls.filter((call) => {
    const otherName = (call.participant?.name || '').toLowerCase()
    if (searchQuery && !otherName.includes(searchQuery.toLowerCase())) return false

    if (filter === 'all') return true
    const status = (call.status || '').toLowerCase()
    if (filter === 'completed') return status === 'completed'
    if (filter === 'missed') return status === 'missed'
    if (filter === 'outgoing') return call.isOutgoing
    if (filter === 'incoming') return !call.isOutgoing
    return true
  })

  // Group by date.
  const groupedCalls = filteredCalls.reduce((groups, call) => {
    const date = new Date(call.createdAt).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(call)
    return groups
  }, {} as Record<string, CallHistory[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Call History</h1>
                <p className="text-sm text-gray-500">Your video call records</p>
              </div>
            </div>
            <button
              onClick={fetchCallHistory}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-full transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'completed', 'missed', 'outgoing', 'incoming'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {loading && calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-gray-500">Loading call history...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <PhoneOff className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchCallHistory}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Try Again
            </button>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Video className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
            <p className="text-gray-500 text-center">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your filters'
                : 'Your call history will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedCalls).map(([date, dateCalls]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-500">
                    {new Date(date).toLocaleDateString([], {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="space-y-3">
                  {dateCalls.map((call) => {
                    const callTypeLower = (call.callType || '').toLowerCase()
                    return (
                      <div
                        key={call.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="relative">
                            {call.participant?.avatar ? (
                              <img
                                src={call.participant.avatar}
                                alt={call.participant.name}
                                className="w-14 h-14 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-7 h-7 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                              {getCallIcon(call)}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {call.participant?.name || 'Unknown'}
                                </h3>
                                <p className="text-sm text-gray-500 capitalize">
                                  {call.isOutgoing ? 'Outgoing' : 'Incoming'} •{' '}
                                  {callTypeLower === 'chat' ? 'Chat' : 'Appointment'} call
                                </p>
                              </div>
                              {getStatusBadge(call.status)}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDate(call.startedAt || call.createdAt)}</span>
                              </div>

                              {String(call.status).toLowerCase() === 'completed' &&
                                call.duration > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Video className="w-4 h-4" />
                                    <span>{formatDuration(call.duration)}</span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const role = (user as any)?.role?.toString?.().toUpperCase?.()
                              if (callTypeLower === 'appointment') {
                                navigate(
                                  role === 'LAWYER'
                                    ? `/lawyer/consultation/${call.referenceId}`
                                    : `/app/consultation/${call.referenceId}`
                                )
                              } else {
                                navigate(
                                  role === 'LAWYER' ? '/lawyer/chats' : '/app/chats'
                                )
                              }
                            }}
                            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition"
                          >
                            View Details
                          </button>
                          <button
                            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
                          >
                            <Phone className="w-4 h-4" />
                            Call Again
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CallHistoryPage
