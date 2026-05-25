import { useEffect, useState } from 'react'
import api, { apiEndpoints, organizationsApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

export type CalendarEventType = 'appointment' | 'request'

export interface CalendarEvent {
  id: string
  /** ISO datetime the event is scheduled for. */
  date: string
  type: CalendarEventType
  title: string
  subtitle?: string
  status?: string
  /** In-app deep link opened when the event is clicked. */
  link: string
}

function rolePrefixFor(role?: string): string {
  switch (role) {
    case 'LAWYER': return '/lawyer'
    case 'ORGANIZATION': return '/organization'
    case 'ADMIN': return '/admin'
    case 'COURT_ADMIN': return '/court-admin'
    default: return '/app'
  }
}

/**
 * Aggregates the user's scheduled records into calendar events — entirely on
 * the frontend, reusing the APIs the app already exposes (no backend changes):
 *   - Client / Lawyer → their appointments (consultations).
 *   - Organization    → the firm's appointment requests.
 * Each event carries a deep link so the calendar can open it (appointments
 * reuse the `?id=` handling on the appointments pages).
 */
export function useCalendarEvents() {
  const role = useAuthStore((s) => (s.user as any)?.role) as string | undefined
  const rolePrefix = rolePrefixFor(role)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    const run = async () => {
      const out: CalendarEvent[] = []
      try {
        if (role === 'ORGANIZATION') {
          const res = await organizationsApi.listAppointmentRequests({ limit: 200 })
          const body = (res as any).data ?? res
          const items = body?.items ?? body?.data ?? body ?? []
          for (const r of Array.isArray(items) ? items : []) {
            if (!r?.scheduledAt) continue
            out.push({
              id: String(r.id),
              date: r.scheduledAt,
              type: 'request',
              title: r.client?.name ? `Request — ${r.client.name}` : 'Appointment request',
              subtitle: r.meetingType || undefined,
              status: r.status,
              link: '/organization/requests',
            })
          }
        } else {
          const res = await api.get(apiEndpoints.appointment.getAll)
          const body = (res as any).data ?? res
          const items = body?.data ?? body?.items ?? body ?? []
          for (const a of Array.isArray(items) ? items : []) {
            if (!a?.scheduledAt) continue
            const other = role === 'LAWYER' ? a.client?.name : a.lawyer?.name
            out.push({
              id: String(a.id),
              date: a.scheduledAt,
              type: 'appointment',
              title: other ? `Consultation — ${other}` : 'Consultation',
              subtitle: a.meetingType || undefined,
              status: a.status,
              link: `${rolePrefix}/appointments?id=${a.id}`,
            })
          }
        }
        if (!cancelled) setEvents(out)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [role, rolePrefix])

  return { events, loading, error, rolePrefix }
}
