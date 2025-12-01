import { FC, useRef, useEffect, useState } from 'react';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import { appointmentsApi } from '@/services/api'

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

/** All 30‑minute slots from 6 AM → 9:30 PM */
const generateTimeSlots = (): { time: string; section: 'morning' | 'afternoon' | 'evening' }[] => {
  const slots: { time: string; section: 'morning' | 'afternoon' | 'evening' }[] = [];
  for (let h = 6; h <= 21; h++) {
    // 6 AM → 9 PM (21) + 9:30 PM
    const isHalf = h === 21 ? 1 : 2; // only one extra slot at 9:30 PM
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

const SlotSelect: FC<SlotSelectProps> = ({
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  lawyerId,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [availableSet, setAvailableSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  /** 7 days starting from today */
  const next7Days = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i));

  // Fetch availability whenever selectedDate or lawyerId changes
  useEffect(() => {
    let mounted = true
    if (!selectedDate || !lawyerId) {
      setAvailableSet(new Set())
      return
    }

    const isoDate = selectedDate.toISOString()
    setLoading(true)
    appointmentsApi
      .availability(lawyerId, isoDate)
      .then((res) => {
        if (!mounted) return
        // backend returns { slots: string[] } where each slot is an ISO datetime
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
        setAvailableSet(times)
      })
      .catch(() => {
        if (!mounted) return
        setAvailableSet(new Set())
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [selectedDate, lawyerId])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 180; // ~3 date pills
    const offset = direction === 'left' ? -scrollAmount : scrollAmount;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="w-full space-y-6">
      {/* ───── DATE SLIDER ───── */}
      <div className="relative">
        {/* Left Arrow */}
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

        {/* Scrollable dates */}
        <div
          id="date-slider"
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-10 scroll-smooth"
        >
          {next7Days.map((date) => {
            const isSelected = selectedDate && isSameDay(selectedDate, date);
            return (
              <button
                key={date.toISOString()}
                type="button"
                onClick={() => {
                  onDateChange(date)
                  // reset selected time when date changes
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
                <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                <span className="text-2xl font-bold">{format(date, 'd')}</span>
                <span className="text-xs">{format(date, 'MMM')}</span>
              </button>
            );
          })}
        </div>

        {/* Right Arrow */}
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

      {/* ───── TIME SLOTS ───── */}
      <div className="space-y-5">
        {(['morning', 'afternoon', 'evening'] as const).map((section) => {
          const sectionSlots = TIME_SLOTS.filter((s) => s.section === section);
          const label =
            section === 'morning'
              ? 'Morning (6 AM – 12 PM)'
              : section === 'afternoon'
              ? 'Afternoon (12 PM – 5 PM)'
              : 'Evening (5 PM – 10 PM)';

          return (
            <div key={section} className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 capitalize">{label}</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {sectionSlots.map(({ time }) => {
                  const isSelected = selectedSlot === time;
                  const isAvailable = availableSet.has(time)
                  const isDisabled = !isAvailable

                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        if (!isAvailable) return
                        onSlotChange(time)
                      }}
                      disabled={isDisabled}
                      className={`
                        px-3 py-2 text-sm font-medium rounded-md transition-all
                        ${isSelected
                          ? 'bg-primary text-white shadow-sm'
                          : isAvailable
                          ? 'text-primary border border-primary hover:bg-primary/20'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
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
    </div>
  );
};

export default SlotSelect;