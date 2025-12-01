import { FC, MouseEvent, useState } from 'react'
import { appointmentsApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom';
// import Button from '../atoms/Button'

import SlotSelect from '../molecules/SlotSelect';

interface LawyerCardProps {
  id: string;
  name: string;
  specialization: string[];
  experienceYears: number;
  rating: number;
  fee: number;
  location: string;
  languages: string[];
  avatar?: string;
  onView: (id: string) => void;
}

const LawyerCard: FC<LawyerCardProps> = ({
  id,
  name,
  specialization,
  experienceYears,
  rating,
  fee,
  location,
  languages,
  avatar,
  onView,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const authUser = useAuthStore((s) => s.user)
  const navigate = useNavigate();

  const handleConsultNow = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;
    setErrorMsg(null)
    setIsProcessing(true)

    // parse selectedSlot like "9:30 AM" into hours/minutes
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

    try {
      const scheduledAt = parseSlotToISO(selectedDate, selectedSlot)

      // Call backend to create appointment and payment/order record
      const res = await appointmentsApi.book({ lawyerId: id, scheduledAt, durationMins: 30 })
      const payload = res.data || res
      const appointment = payload.appointment ?? payload.appointment ?? payload
      const payment = payload.payment ?? payload
      const order = payload.payment.order ?? payload
      // Try to open Razorpay checkout if provider returned an order id
      const providerOrderId = (payment && (payment.order.id || payment.provider_order_id)) as string | undefined
      const paymentRecord = payment && payment.payment ? payment.payment : payment

      // If we have a real Razorpay order id and the checkout script is available, open checkout
      const rzpKey = (import.meta.env.VITE_RAZORPAY_KEY as string) || ''
      if ((window as any).Razorpay) {
        const options: any = {
          key: rzpKey,
          amount: (paymentRecord?.amount ?? Math.round(fee * 100)),
          currency: paymentRecord?.currency ?? 'INR',
          name: 'LawSuit',
          description: `Consultation with ${name}`,
          order_id: order?.id,
          // callback_url: 'http://localhost:3000/app/home', 
          handler: async (resp: any) => {
            try {
              // resp contains razorpay_payment_id, razorpay_order_id, razorpay_signature
              await appointmentsApi.confirmPayment(appointment.id, {
                appointmentId: appointment.id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              })
              // success: reset UI
              setIsExpanded(false)
              setSelectedDate(null)
              setSelectedSlot(null)

              navigate('/app/appointments', { replace: true })
            } catch (err) {
              console.error('Confirm payment failed', err)
              setErrorMsg('Payment succeeded but confirming failed. Please contact support.')
            } finally {
              setIsProcessing(false)
            }
          },
          prefill: {
            name: authUser?.name,
            email: (authUser as any)?.email,
            contact: (authUser as any)?.phone,
          },
          notes: { appointmentId: appointment.id },
          theme: { color: '#0ea5a4' },
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
        // do not clear processing yet — wait for handler
        return
      }

      // Fallback: backend didn't create a provider order (local provider id).
      // We'll treat appointment as created and show success. Optionally try to confirm payment via API if provider data exists.
      setIsExpanded(false)
      setSelectedDate(null)
      setSelectedSlot(null)
      setIsProcessing(false)
    } catch (err: any) {
      console.error('Booking error', err)
      setErrorMsg(err?.response?.data?.error || err?.message || 'Booking failed')
      setIsProcessing(false)
    }
  }

  return (
    <div
      className={`
        group relative p-6 rounded-lg bg-white
        transition-all duration-300
        ${isExpanded ? 'shadow-lg' : 'hover:shadow-lg hover:bg-gray-50'}
      `}
    >
      {/* ==== LEFT: Avatar + Hover "View Profile" ==== */}
      <div className="flex items-start gap-6">
        <div className="relative">
          <img
            src={
              avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200`
            }
            alt={name}
            className="w-24 h-24 rounded-full object-cover flex-shrink-0"
          />

          {/* Hover-only "View Profile" text */}
          <p
            onClick={(e) => {
              e.stopPropagation();
              onView(id);
            }}
            className="absolute left-0 right-0 -bottom-10 text-center
                       text-sm font-medium text-primary
                       opacity-0 group-hover:opacity-100
                       transition-opacity duration-200 cursor-pointer"
          >
            View Profile
          </p>
        </div>

        {/* ==== CENTER: Info ==== */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              {/* Clickable name */}
              <h3
                onClick={(e) => {
                  e.stopPropagation();
                  onView(id);
                }}
                className="text-xl font-semibold text-gray-900
                           cursor-pointer hover:text-primary transition-colors"
              >
                {name}
              </h3>

              <div className="mt-1 text-sm font-medium text-primary">
                {specialization.join(' • ')}
              </div>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {experienceYears} years experience
                </span>
                <span>•</span>
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location}
                </span>
              </div>
            </div>

            {/* ==== RIGHT: Rating, Fee, Availability, Consult ==== */}
            <div className="text-right space-y-2">
              {/* Rating */}
              {/* <div className="flex items-center justify-end gap-1">
                <span className="text-yellow-400">★</span>
                <span className="font-medium text-gray-900">{rating}</span>
                <span className="text-sm text-gray-500">(out of 5)</span>
              </div> */}
              <div className="flex items-center justify-end gap-1 text-sm text-green-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Available Now
                </div>

              {/* Fee */}
              <div className="text-lg font-semibold text-primary">
                ${fee}/hr
              </div>

              {/* Availability + Consult Now */}
              <div className="flex items-center justify-end gap-2 mt-2">
                {/* <div className="flex items-center gap-1 text-sm text-green-600">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Available Now
                </div> */}

                <button
                  onClick={handleConsultNow}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-md
                             hover:bg-primary/90 transition-colors"
                >
                  Consult Now
                </button>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="mt-4 text-sm text-gray-500">
            Languages:{' '}
            <span className="text-gray-700">{languages.join(', ')}</span>
          </div>

          {/* Rating */}
              <div className="flex items-center gap-1 mt-2">
                <span className="text-yellow-400">★</span>
                <span className="font-medium text-gray-900">{rating}</span>
                <span className="text-sm text-gray-500 ml-2">(261 Reviews)</span>
              </div>
        </div>
      </div>

      {/* ==== EXPANDED SECTION ==== */}
      {isExpanded && (
        <div className="mt-6 border-t pt-6 animate-in slide-in-from-top-2 duration-300">
          <SlotSelect
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onDateChange={setSelectedDate}
            onSlotChange={setSelectedSlot}
              lawyerId={id}
          />

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedSlot || isProcessing}
              className={`
                px-6 py-2 rounded-md font-medium transition-colors
                ${selectedDate && selectedSlot
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isProcessing ? 'Processing…' : 'Confirm Booking'}
            </button>
          </div>
          {errorMsg && <div className="mt-2 text-red-500 text-sm">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
};

export default LawyerCard;