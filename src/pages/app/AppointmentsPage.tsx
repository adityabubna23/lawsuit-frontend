import { FC, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentsApi, casesApi } from '@/services/api'
import { parseISO, isBefore } from 'date-fns'
import { X, FileText, MessageCircle, Send, Contact } from 'lucide-react'; // Optional icons
import ChatTab from '@/components/atoms/ChatTab'
interface Appointment {
  id: string
  lawyerId: string
  lawyer?: { id: string; name?: string }
  datetime: string
  paymentId?: string
  status?: string
  agreementUrl?: string; // Assume backend provides PDF URL
}

const AppointmentsPage: FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  // Modal States
  const [agreementModal, setAgreementModal] = useState<Appointment | null>(null);
  const [discussionModal, setDiscussionModal] = useState<Appointment | null>(null);
  const [discussionChatId, setDiscussionChatId] = useState<string | null>(null)
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await appointmentsApi.getAll()
        const data = (res as any).data ?? res

        // Normalize possible envelopes: { items: [...] } or { appointments: [...] } or direct array
        let arr: any[] = []
        if (Array.isArray(data)) arr = data
        else if (Array.isArray(data.items)) arr = data.items
        else if (Array.isArray(data.appointments)) arr = data.appointments
        else if (Array.isArray((data as any).data)) arr = (data as any).data

        // Map backend fields to frontend shape: scheduledAt -> datetime
        const normalized = arr.map((a) => ({
          ...a,
          datetime: a.datetime ?? a.scheduledAt ?? a.scheduledAtAt ?? '',
        }))

        setAppointments(normalized)
      } catch (e) {
        console.warn('Failed to load appointments', e)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const now = new Date()
  const upcoming = appointments.filter(a => !isBefore(parseISO(a.datetime), now))
  const past = appointments.filter(a => isBefore(parseISO(a.datetime), now))

  const openChatForAppointment = async (a: Appointment) => {
    try {
      const apiModule = await import('@/services/api')
      const chatApi = apiModule.chatApi
      const otherUserId = a.lawyerId
      if (!otherUserId) return
      const res = await chatApi.createChat({ otherUserId })
      const chat = (res as any).data?.chat ?? (res as any).chat
      if (chat && chat.id) {
        setDiscussionChatId(chat.id)
        setDiscussionModal(a)
      }
    } catch (err) {
      console.error('Failed to open chat for appointment', err)
    }
  }

  // Close modals
  const closeModals = () => {
    setAgreementModal(null);
    setDiscussionModal(null);
    setMessage('');
  };

  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4 text-primary">My Appointments</h1>
      {loading ? (
        <div className="text-gray-600">Loading appointments…</div>
      ) : (
        <div className="space-y-10">
          {/* UPCOMING SECTION */}
          <section>
            <h2 className="text-lg font-medium mb-4 text-gray-600">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming appointments</p>
            ) : (
              <ul className="space-y-4">
                {upcoming.map(a => (
                  <li
                    key={a.id}
                    className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-center">
                      {/* Left: Lawyer Name & DateTime */}
                      <div>
                        <div className="font-semibold text-midnight">
                          {a.lawyer?.name ?? `Lawyer ${a.lawyerId}`}
                        </div>
                        <div className="text-sm text-blue-400 mt-1">
                          {new Date(a.datetime).toLocaleString()}
                        </div>
                      </div>

                      {/* Right: Action Buttons */}
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md">
                          Connect
                        </button>
                        <button className="px-4 py-2 border border-red-400 text-red-500 text-sm font-medium rounded-md hover:bg-gray-50 transition">
                          Cancel
                        </button>
                        <button className="px-4 py-2 border bg-primary text-white text-sm font-medium rounded-md ">
                          Reschedule
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* PAST SECTION */}
          <section>
            <h2 className="text-lg font-medium mb-4 text-gray-600">Past</h2>
            {past.length === 0 ? (
              <p className="text-sm text-gray-500">No past appointments</p>
            ) : (
              <ul className="space-y-5">
                {past.map(a => (
                  <li
                    key={a.id}
                    className="p-4 bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    {/* Top Row: Name (left), Time (right) */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-semibold text-midnight">
                        {a.lawyer?.name ?? `Lawyer ${a.lawyerId}`}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-600">{new Date(a.datetime).toLocaleString()}</div>
                        {a.status && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {a.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Horizontal Line */}
                    <hr className="border-gray-200 mb-3" />

                    {/* Bottom Row: Text Buttons */}
                    <div className="flex gap-6 text-sm justify-around">
                      <button onClick={() => setAgreementModal(a)} className="text-pink-600 font-medium hover:underline flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Agreement
                      </button>
                      <button onClick={() => openChatForAppointment(a)} className="text-blue-400 font-medium hover:underline flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        Discussion
                      </button>
                      <button className="text-green-500 font-medium hover:underline flex items-center gap-1">
                        <Contact className=" w-4 h-4" />
                        Contact
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* AGREEMENT PDF MODAL */}
      {agreementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Consultation Agreement</h3>
              <button
                onClick={closeModals}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 overflow-hidden bg-gray-50 p-2">
              {agreementModal.agreementUrl ? (
                <iframe
                  src={agreementModal.agreementUrl}
                  className="w-full h-full rounded border"
                  title="Agreement PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p>Sample Agreement PDF</p>
                    <p className="text-xs mt-1">No URL provided in API</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={async () => {
                  // Mark appointment as rejected in mock API and update UI
                  if (!agreementModal) return
                  try {
                    await appointmentsApi.updateStatus(agreementModal.id, 'rejected')
                    setAppointments((prev) => prev.map(p => p.id === agreementModal.id ? { ...p, status: 'rejected' } : p))
                  } catch (err) {
                    console.warn('Failed to update appointment status', err)
                  }
                  closeModals();
                }}
                className="px-5 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition"
              >
                Reject
              </button>
              <button
                onClick={async () => {
                  if (!agreementModal) return
                  try {
                    // Create a case for this appointment (mock server will return deterministic id)
                    const payload = { title: `Case for ${agreementModal.lawyer?.name ?? agreementModal.lawyerId}`, lawyerId: agreementModal.lawyerId, details: `Created from appointment ${agreementModal.id}` }
                    await casesApi.create(payload)
                    // Optionally mark appointment as completed/accepted
                    await appointmentsApi.updateStatus(agreementModal.id, 'completed')
                    setAppointments((prev) => prev.map(p => p.id === agreementModal.id ? { ...p, status: 'completed' } : p))
                    closeModals()
                    // Redirect to cases list
                    navigate('/app/cases')
                  } catch (err) {
                    console.warn('Failed to create case or update appointment', err)
                  }
                }}
                className="px-5 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCUSSION CHAT MODAL */}
      {discussionModal && discussionChatId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl h-[80vh]">
            <ChatTab chatId={discussionChatId} onClose={() => { setDiscussionModal(null); setDiscussionChatId(null) }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default AppointmentsPage