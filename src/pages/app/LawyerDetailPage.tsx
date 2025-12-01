import { FC, useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Lawyer } from '@/types'
import Button from '@/components/atoms/Button'
import SlotSelect from '@/components/molecules/SlotSelect'
import Info from '@/components/molecules/Info'
import Reviews from '@/components/molecules/Reviews'
import QA from '@/components/molecules/QA'
import Articles from '@/components/molecules/Articles'
import { lawyersApi, appointmentsApi } from '@/services/api'
import { useNotificationStore } from '../../stores/notificationStore'
import { useAppointmentStore } from '../../stores/appointmentStore'
import { Shield } from 'lucide-react'

const tabs = [
  { id: 'info', label: 'Info' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'qa', label: 'Q&A' },
  { id: 'articles', label: 'Articles' },
]

const LawyerDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>()
  

  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<string>('info')

  // Booking state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!id) return

    const fetchLawyer = async () => {
      setLoading(true)
      try {
        const res = await lawyersApi.getById(id)
        // Backend may return different envelopes. Normalise to our frontend `Lawyer` shape.
        const raw = (res as any).data?.lawyer ?? (res as any).data?.data ?? (res as any).data ?? res

        const mapped = {
          id: raw.id ?? raw.user?.id,
          name: raw.user?.name ?? raw.name ?? raw.fullName ?? 'Unknown',
          specialization: Array.isArray(raw.specializations) ? raw.specializations : (Array.isArray(raw.specialization) ? raw.specialization : []),
          experienceYears: raw.experienceYears ?? raw.experience ?? 0,
          rating: raw.rating ?? raw.user?.rating ?? 0,
          reviewsCount: raw.totalReviews ?? raw.reviewsCount ?? 0,
          fee: raw.feePerConsultation ?? raw.fee ?? raw.price ?? 0,
          location: [raw.city, raw.state].filter(Boolean).join(', ') || raw.address || '',
          languages: Array.isArray(raw.languages) ? raw.languages : (raw.language ? [raw.language] : []),
          avatar: raw.user?.avatarUrl ?? raw.avatarUrl ?? raw.avatar ?? undefined,
          isVerified: raw.isVerified ?? raw.user?.isVerified ?? false,
        }

        setLawyer(mapped as any)
      } catch (err: any) {
        setError(err?.message || 'Failed to load lawyer')
      } finally {
        setLoading(false)
      }
    }

    fetchLawyer()
  }, [id])

  const handleBook = () => {
    if (!lawyer) return
    // Open booking modal instead of navigating
    setIsModalOpen(true)
    setPaymentSuccess(false)
  }

  const handlePayNow = async () => {
    if (!lawyer || !selectedDate || !selectedSlot) return
    try {
      setPaymentLoading(true)

      // Create a mock razorpay order client-side (server would create real order)
      const order = {
        id: `razorpay_mock_${Date.now()}`,
        amount: Math.round((lawyer.fee || 0) * 100),
        currency: 'INR',
      }

      // simulate checkout flow
      await new Promise((res) => setTimeout(res, 900))

      // Simulate success
      const paymentResult = { success: true, paymentId: `pay_mock_${Date.now()}`, orderId: order.id }
      console.log('Mock Razorpay payment success', paymentResult)

      // Optionally call paymentService to confirm (mocked) - skipped in this mock
      setPaymentSuccess(true)
      setPaymentLoading(false)

      // Create appointment record via API (mocked)
      try {
        const parseSlotToISO = (date: Date, slot: string) => {
          const [time, period] = slot.split(' ')
          const [hStr, mStr] = time.split(':')
          let h = parseInt(hStr, 10)
          const m = parseInt(mStr || '0', 10)
          if (period === 'PM' && h < 12) h += 12
          if (period === 'AM' && h === 12) h = 0
          const d = new Date(date)
          d.setHours(h, m, 0, 0)
          return d.toISOString()
        }

        const datetimeIso = parseSlotToISO(selectedDate as Date, selectedSlot as string)
        await appointmentsApi.create({ lawyerId: lawyer.id, datetime: datetimeIso, paymentId: paymentResult.paymentId })
        // Refresh notifications so the unread badge updates immediately and show toast
        try {
          await useNotificationStore.getState().fetchNotifications()
        } catch (e) {
          // ignore
        }

        // Refresh appointment store so header wallet balance updates immediately
        try {
          await useAppointmentStore.getState().fetchAppointments()
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.warn('Failed to create appointment in mock', e)
      }

      // show a small toast then redirect to appointments page
      setToastVisible(true)
      setTimeout(() => {
        setIsModalOpen(false)
        setToastVisible(false)
        navigate('/app/appointments')
      }, 900)
    } catch (err) {
      console.error('Mock payment error', err)
      setPaymentLoading(false)
    }
  }

  const headerStats = useMemo(() => ({
    rating: lawyer?.rating ?? 0,
    reviews: lawyer?.reviewsCount ?? 0,
    experience: lawyer?.experienceYears ?? 0,
    fee: lawyer?.fee ?? 0,
  }), [lawyer])

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (error) return <div className="text-red-500 text-center py-12">{error}</div>
  if (!lawyer) return <div className="text-center py-12">Lawyer not found</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/app/home" className="hover:underline">Home</Link>
        <span className="mx-2">›</span>
        <Link to="/app/search" className="hover:underline">Lawyers</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900">{lawyer.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex gap-6">
            <img
              src={lawyer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(lawyer.name)}`}
              alt={lawyer.name}
              className="w-36 h-36  object-cover flex-shrink-0"
            />

            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{lawyer.name}</h1>
                  <div className="mt-2 text-sm text-gray-600">{Array.isArray(lawyer.specialization) ? lawyer.specialization.join(' • ') : (lawyer.specialization ?? '')}</div>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    {/* <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span className="font-medium">{headerStats.rating}</span>
                      <span className="text-gray-500">({headerStats.reviews})</span>
                    </div> */}
                    <div>{headerStats.experience} years of experience </div>
                    <div>|</div>
                    <div>{lawyer.location}</div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm text-green-600 flex items-center justify-end gap-2">
                    {lawyer.isVerified ? (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Verified</span>
                      </>
                    ) : (
                      <span className="text-red-500">Not verified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-xl rounded-tr-xl">
            {activeTab === 'info' && <Info />}
            {activeTab === 'reviews' && <Reviews />}
            {activeTab === 'qa' && <QA />}
            {activeTab === 'articles' && <Articles />}
          </div>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="lg:col-span-1">
            <h1 className="mt-3 mb-3 text-lg text-gray-600 font-semibold">Select your slot</h1>
          <div className="mt-2 sticky top-6 bg-white rounded-xl shadow-sm ">
            <div className="bg-primary rounded-t-xl p-4 text-white">
                <h2 className="text-lg font-semibold">Book a Consultation</h2>
            </div>
            <div className="p-6">
                <SlotSelect
                    selectedDate={selectedDate}
                    selectedSlot={selectedSlot}
                    onDateChange={(d) => {
                    setSelectedDate(d)
                    setSelectedSlot(null)
                    }}
          onSlotChange={(s) => setSelectedSlot(s)}
          lawyerId={lawyer.id}
                />
            </div>
            

            <Button
              onClick={handleBook}
              disabled={!selectedDate || !selectedSlot}
              className="w-full"
            >
              Book Consultation
            </Button>
          </div>
        </div>
      </div>
      {/* Modal: Booking + Mock Razorpay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsModalOpen(false)} />
          <div role="dialog" aria-modal="true" className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Confirm & Pay</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm text-gray-600">Lawyer: <span className="font-medium">{lawyer.name}</span></div>
              <div className="text-sm text-gray-600">Date: <span className="font-medium">{selectedDate ? format(selectedDate, 'PPP') : '-'}</span></div>
              <div className="text-sm text-gray-600">Slot: <span className="font-medium">{selectedSlot ?? '-'}</span></div>
              <div className="text-sm text-gray-800">Amount: <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(headerStats.fee)}</span></div>
              {paymentSuccess && <div className="text-sm text-green-600">Payment successful ✅</div>}
            </div>

            <div className="p-4 border-t flex items-center gap-3">
              <Button onClick={() => setIsModalOpen(false)} variant="ghost">Cancel</Button>
              <Button onClick={handlePayNow} className="ml-auto" disabled={paymentLoading || paymentSuccess || !selectedDate || !selectedSlot}>
                {paymentLoading ? 'Processing…' : paymentSuccess ? 'Paid' : 'Pay Now'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Small toast */}
      {toastVisible && (
        <div className="fixed right-6 bottom-6 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow">Booking confirmed — redirecting…</div>
        </div>
      )}
    </div>
  )
}

export default LawyerDetailPage