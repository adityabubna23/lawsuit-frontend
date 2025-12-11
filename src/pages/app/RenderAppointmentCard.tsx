import { FC } from 'react'
import { Calendar, Clock, FileText, MessageSquare, User, RefreshCw, XCircle } from 'lucide-react'

interface AppointmentData {
  scheduledAt: string;
  durationMins: number;
  notes: string | null;
  id: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  meetingLink: string | null;
  aggrementUrl: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    email: string;
    phone: string;
    name: string;
    avatarUrl: string | null;
  };
  lawyer: {
    id: string;
    email: string;
    phone: string;
    name: string;
    avatarUrl: string | null;
  };
  payment: {
    status: string;
    amount: number;
    currency: string;
  } | null;
}

type TabType = 'upcoming' | 'missed' | 'attended' | 'cancelled'

interface RenderAppointmentCardProps {
  appointment: AppointmentData;
  tabType?: TabType;
  onViewAgreement: (params: { appointmentId: string; aggrementUrl: string | null }) => void;
  onDiscuss: (appointmentId: string) => void;
  onReschedule?: (appointment: AppointmentData) => void;
  onCancel?: (appointment: AppointmentData) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'text-yellow-600'
    case 'CONFIRMED':
      return 'text-blue-600'
    case 'COMPLETED':
      return 'text-green-600'
    case 'CANCELLED':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const RenderAppointmentCard: FC<RenderAppointmentCardProps> = ({
  appointment,
  tabType = 'attended',
  onViewAgreement,
  onDiscuss,
  onReschedule,
  onCancel
}) => {
  const otherParty = appointment.lawyer

  return (
    <div 
      className="border border-gray-200 bg-white p-6 mb-4 hover:border-primary transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              {otherParty?.avatarUrl ? (
                <img 
                  src={otherParty.avatarUrl} 
                  alt={otherParty.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-medium text-primary">
                {otherParty?.name || 'Unknown'}
              </h3>
              <p className="text-sm text-secondary">{otherParty?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(appointment.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-secondary">
              <Clock className="w-4 h-4" />
              <span>{formatTime(appointment.scheduledAt)} ({appointment.durationMins} mins)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-secondary">Status:</span>
              <span className={`font-medium ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
          </div>

          {appointment.notes && (
            <p className="text-sm text-secondary mb-4 line-clamp-2">
              {appointment.notes}
            </p>
          )}

          {appointment.payment && (
            <div className="text-sm text-secondary mb-4">
              Payment: {appointment.payment.currency} {appointment.payment.amount} - 
              <span className={`ml-1 ${appointment.payment.status === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'}`}>
                {appointment.payment.status}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* Upcoming Tab Buttons */}
        {tabType === 'upcoming' && (
          <>
            {onReschedule && (
              <button
                onClick={() => onReschedule(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reschedule
              </button>
            )}
            {onCancel && (
              <button
                onClick={() => onCancel(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </>
        )}

        {/* Missed Tab Buttons */}
        {tabType === 'missed' && (
          <>
            {onReschedule && (
              <button
                onClick={() => onReschedule(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reschedule
              </button>
            )}
            {onCancel && (
              <button
                onClick={() => onCancel(appointment)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
          </>
        )}

        {/* Attended Tab Buttons */}
        {tabType === 'attended' && (
          <>
            <button
              onClick={() => onViewAgreement({ appointmentId: appointment.id, aggrementUrl: appointment.aggrementUrl })}
              disabled={!appointment.aggrementUrl}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                appointment.aggrementUrl
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <FileText className="w-4 h-4" />
              View Agreement
            </button>
            <button
              onClick={() => onDiscuss(appointment.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-primary text-primary hover:bg-primary hover:text-white transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Discuss
            </button>
          </>
        )}

        {/* Cancelled Tab - No buttons */}
      </div>
    </div>
  )
}

export default RenderAppointmentCard
export type { AppointmentData }
