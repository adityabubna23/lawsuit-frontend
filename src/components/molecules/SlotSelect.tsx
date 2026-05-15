import { FC, useRef, useEffect, useMemo, useState } from 'react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { appointmentsApi } from '@/services/api'
import { Clock, Sun, Sunset, Moon, Loader2 } from 'lucide-react'

/**
 * Parse a "h:mm AM/PM" string into hours + minutes (24h).
 * Returns null on a malformed string so the caller can defensively skip.
 */
function parseTimeLabel(time: string): { h: number; m: number } | null {
  const parts = time.split(' ')
  if (parts.length !== 2) return null
  const [hStr, mStr] = parts[0].split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr || '0', 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const period = parts[1].toUpperCase()
  if (period === 'PM' && h < 12) h += 12
  if (period === 'AM' && h === 12) h = 0
  return { h, m }
}

/**
 * True if the slot starting at `time` on `date` is already in the past.
 * A 30-minute slot is considered "past" once its end has elapsed so the
 * current half-hour can still be booked if it hasn't finished. Future dates
 * always return false — they can't be past.
 */
function isSlotInPast(date: Date, time: string, durationMins = 30): boolean {
  if (!isSameDay(date, new Date())) return false
  const parsed = parseTimeLabel(time)
  if (!parsed) return false
  const slotStart = new Date(date)
  slotStart.setHours(parsed.h, parsed.m, 0, 0)
  return slotStart.getTime() + durationMins * 60 * 1000 <= Date.now()
}

interface SlotSelectProps {
  /** Currently selected date (or null) */
  selectedDate: Date | null;
  /** Currently selected time string, e.g. "9:30 AM" */
  selectedSlot: string | null;
  /** Callback when a new date is chosen */
  onDateChange: (date: Date) => void;
  /** Callback when a new time slot is chosen */
  onSlotChange: (slot: string | null) => void;
  /** lawyer id to check availability for */
  lawyerId: string;
}

/** All 30‑minute slots from 6 AM → 9:30 PM */
const generateTimeSlots = (): { time: string; section: 'morning' | 'afternoon' | 'evening' }[] => {
  const slots: { time: string; section: 'morning' | 'afternoon' | 'evening' }[] = [];
  for (let h = 6; h <= 21; h++) {
    const isHalf = h === 21 ? 1 : 2;
    for (let m = 0; m < isHalf; m++) {
      const minutes = m * 30;
      const period = h < 12 ? 'AM' : 'PM';
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const time = `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;

      let section: 'morning' | 'afternoon' | 'evening';
      if (h < 12) section = 'morning';
      else if (h < 17) section = 'afternoon';
      else section = 'evening';

      slots.push({ time, section });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const sectionConfig = {
  morning: { label: 'Morning', range: '6 AM – 12 PM', icon: Sun, color: 'text-amber-500' },
  afternoon: { label: 'Afternoon', range: '12 PM – 5 PM', icon: Sunset, color: 'text-orange-500' },
  evening: { label: 'Evening', range: '5 PM – 10 PM', icon: Moon, color: 'text-indigo-500' },
} as const;

const SlotSelect: FC<SlotSelectProps> = ({
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  lawyerId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // The raw set returned by the server. Past-time filtering is applied
  // downstream when we render and when we compute the displayed counts —
  // we keep the raw set here so we don't lose information if the user
  // happens to switch dates faster than the past-time check ticks over.
  const [serverAvailable, setServerAvailable] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  /** 30 days starting from today */
  const next30Days = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i));

  // Fetch availability whenever selectedDate or lawyerId changes
  useEffect(() => {
    let mounted = true
    if (!selectedDate || !lawyerId) {
      setServerAvailable(new Set())
      return
    }

    const isoDate = selectedDate.toISOString()
    setLoading(true)
    appointmentsApi
      .availability(lawyerId, isoDate, {
        workHours: { start: '06:00', end: '22:00' },
        intervalMins: 30,
        durationMins: 30,
      })
      .then((res) => {
        if (!mounted) return
        const slots: string[] = (res.data && (res.data.slots || []))
        const times = new Set<string>(
          slots.map((s) => {
            try {
              return format(new Date(s), 'h:mm a')
            } catch (e) {
              return ''
            }
          }).filter(Boolean)
        )
        setServerAvailable(times)
      })
      .catch(() => {
        if (!mounted) return
        setServerAvailable(new Set())
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedDate, lawyerId])

  /**
   * Defensively strip past-time entries from the server's available set.
   * The server already excludes them by default (`excludePastSlots: true`),
   * but a server-side timezone mismatch (e.g. Node running in UTC while the
   * client is IST) can occasionally leak a past slot through. We belt-and-
   * braces filter here so the displayed count, the section "X available"
   * chip, and the rendered cells all stay consistent.
   */
  const availableSet = useMemo<Set<string>>(() => {
    if (!selectedDate) return serverAvailable
    const filtered = new Set<string>()
    for (const t of serverAvailable) {
      if (!isSlotInPast(selectedDate, t)) filtered.add(t)
    }
    return filtered
  }, [serverAvailable, selectedDate])

  const totalAvailable = availableSet.size

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 180;
    const offset = direction === 'left' ? -scrollAmount : scrollAmount;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="w-full space-y-6">
      {/* ───── DATE SLIDER ───── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10
                     flex h-9 w-9 items-center justify-center rounded-full
                     bg-white shadow-md hover:bg-gray-50 transition-colors"
          aria-label="Previous dates"
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          id="date-slider"
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-10 scroll-smooth"
        >
          {next30Days.map((date) => {
            const isSelected = selectedDate && isSameDay(selectedDate, date);
            const isToday = isSameDay(date, new Date());
            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => {
                  onDateChange(date)
                  onSlotChange(null)
                }}
                className={`
                  flex-shrink-0 flex flex-col items-center rounded-lg px-4 py-3 min-w-[80px]
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white border border-gray-300 hover:border-primary hover:shadow-sm'
                  }
                `}
              >
                <span className="text-xs font-medium uppercase">
                  {isToday ? 'Today' : format(date, 'EEE')}
                </span>
                <span className="text-2xl font-bold">{format(date, 'd')}</span>
                <span className="text-xs">{format(date, 'MMM')}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10
                     flex h-9 w-9 items-center justify-center rounded-full
                     bg-white shadow-md hover:bg-gray-50 transition-colors"
          aria-label="Next dates"
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ───── STATUS BAR ───── */}
      {selectedDate && !loading && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${totalAvailable > 0
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
          <Clock className="w-4 h-4 flex-shrink-0" />
          {totalAvailable > 0
            ? <span><strong>{totalAvailable}</strong> slot{totalAvailable !== 1 ? 's' : ''} available on {format(selectedDate, 'MMM d')}</span>
            : <span>No slots available on {format(selectedDate, 'MMM d')}. Try another date.</span>
          }
        </div>
      )}

      {/* ───── LOADING STATE ───── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Checking availability...</span>
        </div>
      )}

      {/* ───── NO DATE SELECTED ───── */}
      {!selectedDate && !loading && (
        <div className="text-center py-8 text-gray-400">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a date above to see available slots</p>
        </div>
      )}

      {/* ───── TIME SLOTS ───── */}
      {selectedDate && !loading && (
        <div className="space-y-5">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-primary bg-white inline-block" />
              Available
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-200 inline-block" />
              Booked
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-primary inline-block" />
              Selected
            </div>
          </div>

          {(['morning', 'afternoon', 'evening'] as const).map((section) => {
            // Hide slots whose end-time has already passed when the user
            // is looking at today (via `isSlotInPast`). The same helper
            // also gates `availableSet` / `totalAvailable` above, so the
            // section grid, the "X available" chip, and the top
            // "N slots available on …" banner all agree.
            const sectionSlots = TIME_SLOTS
              .filter((s) => s.section === section)
              .filter((s) => !isSlotInPast(selectedDate as Date, s.time));
            const cfg = sectionConfig[section];
            const Icon = cfg.icon;
            const availableInSection = sectionSlots.filter(s => availableSet.has(s.time)).length;

            return (
              <div key={section} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                    {cfg.label}
                    <span className="text-xs font-normal text-gray-400">({cfg.range})</span>
                  </h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${availableInSection > 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                    {availableInSection} available
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {sectionSlots.map(({ time }) => {
                    const isSelected = selectedSlot === time;
                    const isAvailable = availableSet.has(time)

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          if (!isAvailable) return
                          onSlotChange(time)
                        }}
                        disabled={!isAvailable}
                        title={isAvailable ? `Book ${time}` : `${time} — Already booked`}
                        className={`
                          px-3 py-2 text-sm font-medium rounded-md transition-all relative
                          ${isSelected
                            ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                            : isAvailable
                              ? 'text-primary border border-primary hover:bg-primary/10 hover:shadow-sm'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 line-through'
                          }
                        `}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SlotSelect;