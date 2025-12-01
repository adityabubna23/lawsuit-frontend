import { FC, useEffect, useMemo, useState } from 'react'
import { appointmentsApi } from '@/services/api'
import AppointmentItem from '@/components/atoms/AppointmentItem'
import { parseISO, isBefore, differenceInMinutes, isValid } from 'date-fns'
import ChatTab from '@/components/atoms/ChatTab'

interface RawAppointment {
  id: string
  lawyerId: string
  lawyer?: { id: string; name?: string }
  client?: { id: string; name?: string }
  scheduledAt?: string
  datetime?: string
  status?: string
}

const LawyerAppointments: FC = () => {
  const [appointments, setAppointments] = useState<RawAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'missed' | 'attended' | 'cancelled'>('upcoming')
  const [openChatId, setOpenChatId] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchAppointments = async () => {
      setLoading(true)
      try {
        const res = await appointmentsApi.getAll()
        const data = (res as any).data ?? res

        let arr: any[] = []
        if (Array.isArray(data)) arr = data
        else if (Array.isArray(data.items)) arr = data.items
        else if (Array.isArray(data.appointments)) arr = data.appointments
        else if (Array.isArray((data as any).data)) arr = (data as any).data

        const normalized = arr.map((a) => ({
          ...a,
          datetime: a.datetime ?? a.scheduledAt ?? a.scheduledAtAt ?? a.scheduledAt ?? a.scheduled_at,
        }))

        if (mounted) setAppointments(normalized)
      } catch (err) {
        console.warn('Failed to fetch appointments', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Fetch once on mount. Time-based classification is computed at render-time
    // so users will see Attend Now / Upcoming based on the time of the fetch/render.
    fetchAppointments()
    return () => {
      mounted = false
    }
  }, [])

  const now = new Date()

  // Classify
  const { attendNow, upcoming, attended, missed, cancelled } = useMemo(() => {
    const attendNow: RawAppointment[] = []
    const upcoming: RawAppointment[] = []
    const attended: RawAppointment[] = []
    const missed: RawAppointment[] = []
    const cancelled: RawAppointment[] = []

    appointments.forEach((a) => {
      const status = (a.status || '').toUpperCase()
      // Don't render pending appointments anywhere
      if (status === 'PENDING') return
      const dtStr = (a as any).datetime
      const dt = dtStr ? parseISO(dtStr) : null
      const validDate = dt && isValid(dt)

      // Cancelled
      if (status === 'CANCELLED') {
        cancelled.push(a)
        return
      }

      // Completed appointments -> Attended tab
      if (status === 'COMPLETED') {
        attended.push(a)
        return
      }

      // Attend Now: scheduled time within a 30-minute window around now
      // Show upcoming appointments that are within 30 minutes before or after now
      if (validDate && Math.abs(differenceInMinutes(now, dt!)) <= 30) {
        attendNow.push(a)
        return
      }

      // Future -> upcoming
      if (!validDate || isBefore(now, dt!)) {
        upcoming.push(a)
        return
      }

      // If more than 30 minutes past scheduled time and not completed -> missed
      if (validDate && differenceInMinutes(now, dt!) > 30) {
        missed.push(a)
        return
      }

      // Fallback: treat as missed
      missed.push(a)
    })

    // Sort attendNow by closest time (ascending)
  attendNow.sort((x, y) => (parseISO(x.datetime || x.scheduledAt!).getTime() - parseISO(y.datetime || y.scheduledAt!).getTime()))
  upcoming.sort((x, y) => parseISO(x.datetime || x.scheduledAt!).getTime() - parseISO(y.datetime || y.scheduledAt!).getTime())
  attended.sort((x, y) => parseISO(y.datetime || y.scheduledAt!).getTime() - parseISO(x.datetime || x.scheduledAt!).getTime())
  missed.sort((x, y) => parseISO(y.datetime || y.scheduledAt!).getTime() - parseISO(x.datetime || x.scheduledAt!).getTime())

    return { attendNow, upcoming, attended, missed, cancelled }
  }, [appointments, now])

  const openChatForAppointment = async (a: RawAppointment) => {
    try {
      // Create or get chat with the client
      // Use chatApi to create chat. import dynamically to avoid cycles
      const chatModule = await import('@/services/api')
      const chatApi = chatModule.chatApi
  const otherUserId = a.client?.id || ''
      if (!otherUserId) {
        console.warn('No client id for appointment', a.id)
        return
      }
      const r = await chatApi.createChat({ otherUserId })
      const chat = (r as any).data?.chat ?? (r as any).chat
      if (chat && chat.id) {
        setOpenChatId(chat.id)
        setIsChatOpen(true)
      }
    } catch (err) {
      console.error('Failed to open chat', err)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4 text-primary">My Appointments</h1>

      {loading ? (
        <div className="text-gray-600">Loading appointments…</div>
      ) : (
        <div className="space-y-6">
          {/* Attend Now top */}
          {attendNow.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-3 text-red-600">Attend Now</h2>
              <div className="space-y-3">
                {attendNow.map(a => (
                  <AppointmentItem
                    key={a.id}
                    id={a.id}
                    clientName={a.client?.name}
                    lawyerName={a.lawyer?.name}
                    datetime={a.datetime || (a.scheduledAt as string) || ''}
                    status={a.status}
                    onDiscussion={() => openChatForAppointment(a)}
                    onAttend={async () => {
                      try {
                        const res = await appointmentsApi.attend(a.id)
                        const updated = (res as any).data?.appointment ?? (res as any).appointment ?? null
                        if (updated) {
                          // Update local state to mark as completed
                          setAppointments((prev) => prev.map((it) => (it.id === a.id ? { ...it, status: updated.status } : it)))
                        }

                        const meetingLink = (updated && (updated.meetingLink || (a as any).meetingLink)) || (a as any).meetingLink
                        if (meetingLink) {
                          // Navigate to meeting link
                          window.location.href = meetingLink
                        }
                      } catch (err) {
                        console.error('Failed to mark attended', err)
                        // still try to navigate if meeting link exists
                        const meetingLink = (a as any).meetingLink
                        if (meetingLink) window.location.href = meetingLink
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Tabs */}
          <div>
            <div className="flex gap-3 mb-4">
              <button onClick={() => setActiveTab('upcoming')} className={`px-3 py-2 rounded ${activeTab === 'upcoming' ? 'bg-primary text-white' : 'bg-white border'}`}>Upcoming ({upcoming.length})</button>
              <button onClick={() => setActiveTab('missed')} className={`px-3 py-2 rounded ${activeTab === 'missed' ? 'bg-primary text-white' : 'bg-white border'}`}>Missed ({missed.length})</button>
              <button onClick={() => setActiveTab('attended')} className={`px-3 py-2 rounded ${activeTab === 'attended' ? 'bg-primary text-white' : 'bg-white border'}`}>Attended ({attended.length})</button>
              <button onClick={() => setActiveTab('cancelled')} className={`px-3 py-2 rounded ${activeTab === 'cancelled' ? 'bg-primary text-white' : 'bg-white border'}`}>Cancelled ({cancelled.length})</button>
            </div>

            <div>
              {activeTab === 'upcoming' && (
                <div className="space-y-4">
                  {upcoming.length === 0 ? <div className="text-sm text-gray-500">No upcoming appointments</div> : (
                    upcoming.map(a => (
                      <AppointmentItem key={a.id} id={a.id} clientName={a.client?.name} lawyerName={a.lawyer?.name} datetime={a.datetime || (a.scheduledAt as string) || ''} status={a.status} onDiscussion={() => openChatForAppointment(a)} />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'missed' && (
                <div className="space-y-4">
                  {missed.length === 0 ? <div className="text-sm text-gray-500">No missed appointments</div> : (
                    missed.map(a => (
                      <AppointmentItem key={a.id} id={a.id} clientName={a.client?.name} lawyerName={a.lawyer?.name} datetime={a.datetime || (a.scheduledAt as string) || ''} status={a.status} onDiscussion={() => openChatForAppointment(a)} />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'attended' && (
                <div className="space-y-4">
                  {attended.length === 0 ? <div className="text-sm text-gray-500">No attended appointments</div> : (
                    attended.map(a => (
                      <AppointmentItem key={a.id} id={a.id} clientName={a.client?.name} lawyerName={a.lawyer?.name} datetime={a.datetime || (a.scheduledAt as string) || ''} status={a.status ?? 'COMPLETED'} onDiscussion={() => openChatForAppointment(a)} />
                    ))
                  )}
                </div>
              )}

              {activeTab === 'cancelled' && (
                <div className="space-y-4">
                  {cancelled.length === 0 ? <div className="text-sm text-gray-500">No cancelled appointments</div> : (
                    cancelled.map(a => (
                      <AppointmentItem key={a.id} id={a.id} clientName={a.client?.name} lawyerName={a.lawyer?.name} datetime={a.datetime || (a.scheduledAt as string) || ''} status={a.status ?? 'CANCELLED'} onDiscussion={() => openChatForAppointment(a)} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat modal */}
      {isChatOpen && openChatId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl h-[80vh]">
            <ChatTab chatId={openChatId} onClose={() => { setIsChatOpen(false); setOpenChatId(null) }} />
          </div>
        </div>
      )}
    </div>
  )
}

export default LawyerAppointments