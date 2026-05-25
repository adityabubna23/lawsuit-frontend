import { FC, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO, isValid,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin } from 'lucide-react'
import BrandLoader from '@/components/atoms/BrandLoader'
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents'

const statusBadge = (status?: string): string => {
  const s = (status || '').toUpperCase()
  if (s === 'CONFIRMED' || s === 'ASSIGNED') return 'bg-blue-50 text-blue-700'
  if (s === 'COMPLETED') return 'bg-green-50 text-green-700'
  if (s === 'CANCELLED' || s === 'REJECTED' || s === 'EXPIRED') return 'bg-gray-100 text-gray-500'
  if (s === 'PENDING') return 'bg-amber-50 text-amber-700'
  return 'bg-gray-100 text-gray-600'
}

const dotColor = (type: CalendarEvent['type'], status?: string): string => {
  const s = (status || '').toUpperCase()
  if (s === 'CANCELLED' || s === 'REJECTED' || s === 'EXPIRED') return 'bg-gray-300'
  return type === 'request' ? 'bg-amber-500' : 'bg-primary'
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CalendarPage: FC = () => {
  const navigate = useNavigate()
  const { events, loading, error } = useCalendarEvents()
  const [cursor, setCursor] = useState(() => new Date())   // month in view
  const [selected, setSelected] = useState(() => new Date()) // chosen day

  // Group events by yyyy-MM-dd, each day's list sorted by time.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const d = parseISO(e.date)
      if (!isValid(d)) continue
      const key = format(d, 'yyyy-MM-dd')
      const arr = map.get(key) || []
      arr.push(e)
      map.set(key, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => +parseISO(a.date) - +parseISO(b.date))
    }
    return map
  }, [events])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor))
    const end = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start, end })
  }, [cursor])

  // Year options for the picker — a wide range around today, always including
  // whatever year the user has already navigated to.
  const years = useMemo(() => {
    const thisYear = new Date().getFullYear()
    const cy = cursor.getFullYear()
    const lo = Math.min(thisYear - 10, cy)
    const hi = Math.max(thisYear + 10, cy)
    const out: number[] = []
    for (let y = lo; y <= hi; y++) out.push(y)
    return out
  }, [cursor])

  const selectedEvents = eventsByDay.get(format(selected, 'yyyy-MM-dd')) || []
  const goToday = () => { const t = new Date(); setCursor(t); setSelected(t) }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-semibold text-primary">Calendar</h1>
        </div>

        {loading ? (
          <BrandLoader label="Loading your calendar…" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ── Month grid ── */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Month"
                    value={cursor.getMonth()}
                    onChange={(e) => setCursor(new Date(cursor.getFullYear(), Number(e.target.value), 1))}
                    className="text-lg font-semibold text-gray-900 bg-transparent border border-transparent hover:border-gray-200 rounded-lg pl-1.5 pr-1 py-1 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Year"
                    value={cursor.getFullYear()}
                    onChange={(e) => setCursor(new Date(Number(e.target.value), cursor.getMonth(), 1))}
                    className="text-lg font-semibold text-gray-900 bg-transparent border border-transparent hover:border-gray-200 rounded-lg pl-1.5 pr-1 py-1 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
                    Today
                  </button>
                  <button onClick={() => setCursor((c) => subMonths(c, 1))} aria-label="Previous month" className="p-1.5 rounded-lg hover:bg-gray-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Next month" className="p-1.5 rounded-lg hover:bg-gray-100">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const dayEvents = eventsByDay.get(key) || []
                  const inMonth = isSameMonth(day, cursor)
                  const selectedDay = isSameDay(day, selected)
                  const today = isToday(day)
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(day)}
                      className={`relative min-h-[46px] sm:min-h-[72px] rounded-lg p-1 sm:p-1.5 text-left transition-colors flex flex-col items-start
                        ${selectedDay ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-gray-50'}
                        ${inMonth ? '' : 'opacity-40'}`}
                    >
                      <span className={`text-xs sm:text-sm font-medium flex items-center justify-center w-6 h-6 rounded-full
                        ${today ? 'bg-primary text-white' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="mt-auto flex flex-wrap items-center gap-0.5 pt-1">
                          {dayEvents.slice(0, 3).map((e) => (
                            <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${dotColor(e.type, e.status)}`} />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] text-gray-400 leading-none">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Appointment</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Firm request</span>
              </div>
            </div>

            {/* ── Day panel ── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900">{format(selected, 'EEEE, d MMM yyyy')}</h3>
              <p className="text-xs text-gray-400 mb-3">
                {selectedEvents.length === 0
                  ? 'No events'
                  : `${selectedEvents.length} event${selectedEvents.length > 1 ? 's' : ''}`}
              </p>
              {error && <p className="text-sm text-red-600 mb-2">Couldn't load some events. Try refreshing.</p>}
              {selectedEvents.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nothing scheduled this day.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(e.link)}
                      className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor(e.type, e.status)}`} />
                        <span className="text-sm font-medium text-gray-900 truncate flex-1">{e.title}</span>
                        {e.status && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge(e.status)}`}>{e.status}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 pl-4">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.date), 'h:mm a')}</span>
                        {e.subtitle && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.subtitle}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarPage
