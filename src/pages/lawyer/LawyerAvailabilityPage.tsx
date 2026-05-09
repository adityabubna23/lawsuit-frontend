import { FC, useEffect, useState } from 'react'
import { Loader2, Save, Clock, Calendar, IndianRupee, Check, AlertCircle } from 'lucide-react'
import { usersApi } from '@/services/api'
import { friendlyError } from '@/utils/errors'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n ?? 0)

/**
 * Lawyer availability — controls whether the lawyer accepts new consultations,
 * working days, working hours, and per-consultation fee.
 *
 * Storage strategy mirrors the mobile app: a single "Availability" entry in
 * the lawyer's `experience` array carries from/to/workingDays. Fee is stored
 * in paise on the server, displayed in rupees here.
 */
const LawyerAvailabilityPage: FC = () => {
  const [isAvailable, setIsAvailable] = useState(true)
  const [fee, setFee] = useState('')
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await usersApi.getLawyerInformation()
        const l = (res.data?.lawyer ?? res.data?.data ?? res.data) as any
        if (!l) return
        setIsAvailable(l.isAvailable !== false)
        // Server stores fee in paise — convert to rupees for the input.
        if (l.feePerConsultation) setFee(String(Math.round(Number(l.feePerConsultation) / 100)))
        // Support both array-shaped `experience` (current) and legacy object shape.
        const exp = l.experience
        if (Array.isArray(exp)) {
          const avail = exp.find((e: any) => e.title === 'Availability' || (e.description && String(e.description).includes('workingDays')))
          if (avail) {
            if (avail.from) setStartTime(String(avail.from))
            if (avail.to) setEndTime(String(avail.to))
            try {
              const parsed = typeof avail.description === 'string' ? JSON.parse(avail.description) : avail.description
              if (parsed?.workingDays) setWorkingDays(parsed.workingDays)
            } catch { /* ignore malformed legacy data */ }
          }
        } else if (exp && typeof exp === 'object') {
          if (exp.workingDays) setWorkingDays(exp.workingDays)
          if (exp.startTime) setStartTime(exp.startTime)
          if (exp.endTime) setEndTime(exp.endTime)
        }
      } catch (err) {
        showToast(friendlyError(err, "Couldn't load your availability"), 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleDay = (day: string) => {
    setWorkingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  const handleSave = async () => {
    const feeNum = Number(fee)
    if (!fee.trim() || feeNum < 10) {
      showToast('Please set a valid consultation fee (minimum ₹10).', 'error')
      return
    }
    if (workingDays.length === 0) {
      showToast('Pick at least one working day.', 'error')
      return
    }
    if (!startTime || !endTime || startTime >= endTime) {
      showToast('End time must be after start time.', 'error')
      return
    }

    setSaving(true)
    try {
      // Match the mobile app's storage shape so both clients stay compatible.
      const availabilityEntry = {
        title: 'Availability',
        organisation: '',
        from: startTime,
        to: endTime,
        description: JSON.stringify({ workingDays }),
      }
      await usersApi.postLawyerInformation({
        isAvailable,
        feePerConsultation: Math.round(feeNum * 100), // paise
        experience: [availabilityEntry],
      })
      showToast('Availability saved', 'success')
    } catch (err) {
      showToast(friendlyError(err, "Couldn't save your availability"), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Availability</h1>
        <p className="text-sm text-gray-500 mt-1">Control when clients can book consultations with you.</p>
      </div>

      {/* Master availability toggle */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Accepting new consultations</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAvailable
                ? 'Clients can find you in search and book sessions.'
                : 'You are hidden from search and cannot receive new bookings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable((v) => !v)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${isAvailable ? 'bg-primary' : 'bg-gray-300'}`}
            aria-pressed={isAvailable}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Working days */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Working days</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const active = workingDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${active
                  ? 'bg-primary text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Working hours */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Working hours</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Fee */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <IndianRupee className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Consultation fee</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">₹</span>
          <input
            type="number"
            min={10}
            step={50}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="e.g. 1500"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {fee && Number(fee) >= 10 && (
          <p className="text-xs text-gray-400 mt-1.5">{fmt(Number(fee))} per consultation</p>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save availability'}
        </button>
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

export default LawyerAvailabilityPage
