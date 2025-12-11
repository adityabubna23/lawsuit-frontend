import { FC, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { apiEndpoints, appointmentsApi } from '@/services/api'
import { useQuery } from '@tanstack/react-query'
import AgreementModal from '@/components/atoms/AgreementModal'
import RenderAppointmentCard, { AppointmentData } from './RenderAppointmentCard'

interface AppointmentResponse {
  data: AppointmentData[]
}

type TabType = 'upcoming' | 'missed' | 'attended' | 'cancelled'

const AppointmentsPage: FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [selectedAgreementUrl, setSelectedAgreementUrl] = useState<{appointmentId: string, aggrementUrl: string | null} | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getAppointmentsQuery = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const res = await api.get<AppointmentResponse>(apiEndpoints.appointment.getAll)
      return res.data
    }
  })

  const appointments = getAppointmentsQuery.data?.data || []

  const categorizedAppointments = useMemo(() => {
    const now = new Date()
    
    return {
      upcoming: appointments.filter(apt => {
        const scheduledDate = new Date(apt.scheduledAt)
        return (apt.status === 'PENDING' || apt.status === 'CONFIRMED') && scheduledDate >= now
      }),
      missed: appointments.filter(apt => {
        const scheduledDate = new Date(apt.scheduledAt)
        return (apt.status === 'PENDING' || apt.status === 'CONFIRMED') && scheduledDate < now
      }),
      attended: appointments.filter(apt => apt.status === 'COMPLETED'),
      cancelled: appointments.filter(apt => apt.status === 'CANCELLED')
    }
  }, [appointments])

  const handleViewAgreement = ({appointmentId, aggrementUrl} : {appointmentId: string, aggrementUrl: string | null}) => {
    if (aggrementUrl) {
      setSelectedAgreementUrl({appointmentId, aggrementUrl})
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedAgreementUrl(null)
  }

  const handleDiscuss = (appointmentId: string) => {
    navigate(`/app/chat?appointmentId=${appointmentId}`)
  }

  const handleReschedule = (appointment: AppointmentData) => {
    // TODO: Implement reschedule functionality
    alert(`Reschedule appointment with ${appointment.lawyer?.name}`)
  }

  const handleCancel = async (appointment: AppointmentData) => {
    if (confirm(`Are you sure you want to cancel the appointment with ${appointment.lawyer?.name}?`)) {
      try {
        await appointmentsApi.cancel(appointment.id)
        getAppointmentsQuery.refetch()
        alert('Appointment cancelled successfully')
      } catch (err) {
        console.error('Failed to cancel appointment', err)
        alert('Failed to cancel appointment. Please try again.')
      }
    }
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: categorizedAppointments.upcoming.length },
    { key: 'missed', label: 'Missed', count: categorizedAppointments.missed.length },
    { key: 'attended', label: 'Attended', count: categorizedAppointments.attended.length },
    { key: 'cancelled', label: 'Cancelled', count: categorizedAppointments.cancelled.length }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-primary mb-2">Appointments</h1>
          <p className="text-secondary">Manage and track all your appointments</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 mb-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-primary'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.key
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </span>
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-50">
          {getAppointmentsQuery.isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-secondary">Loading appointments...</p>
            </div>
          ) : getAppointmentsQuery.isError ? (
            <div className="text-center py-12">
              <p className="text-red-600">Failed to load appointments</p>
            </div>
          ) : categorizedAppointments[activeTab].length === 0 ? (
            <div className="text-center py-12">
              <p className="text-secondary">No {activeTab} appointments</p>
            </div>
          ) : (
            <div>
              {categorizedAppointments[activeTab].map(appointment => 
                <RenderAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  tabType={activeTab}
                  onViewAgreement={handleViewAgreement}
                  onDiscuss={handleDiscuss}
                  onReschedule={handleReschedule}
                  onCancel={handleCancel}
                />
              )}
            </div>
          )}
        </div>

        {/* Agreement Modal */}
        {selectedAgreementUrl ? selectedAgreementUrl.aggrementUrl ? (
          <AgreementModal
            appointment={selectedAgreementUrl as {appointmentId: string, aggrementUrl: string}}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            canApply={true}
          />
        ) : null : (
          <></>
        )
        }
      </div>
    </div>
  )
}

export default AppointmentsPage
