import { FC, useState } from 'react'
import Modal from './Modal'
import UploadInput from './UploadButton'
import api, { apiEndpoints, appointmentsApi } from '@/services/api'
import { useMutation } from '@tanstack/react-query'
import { UpdateAgreementUrlInput } from '@/schema/appointment.schema'
import { 
  Calendar, 
  Clock, 
  User, 
  X, 
  Video, 
  FileText, 
  MessageSquare, 
  Briefcase, 
  Upload, 
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  RefreshCw,
  MoreVertical,
  Download
} from 'lucide-react'

interface Props {
  id: string
  lawyerName?: string
  clientName?: string
  datetime: string
  status?: string
  onAttend?: () => void
  onCancel?: () => void
  onReschedule?: () => void
  onConnect?: () => void
  onAgreement?: () => void
  onDiscussion?: () => void
  onCaseDetails?: () => void
}

const AppointmentItem: FC<Props> = ({ 
  id, 
  lawyerName, 
  clientName, 
  datetime, 
  status, 
  onAttend, 
  onCancel, 
  onReschedule, 
  onConnect, 
  onAgreement, 
  onDiscussion, 
  onCaseDetails 
}) => {
  const displayName = clientName ?? lawyerName ?? `Appointment ${id.slice(0, 8)}`
  const s = (status || '').toUpperCase()
  const [open, setOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showMoreActions, setShowMoreActions] = useState(false)

  const updateAgreementMutation = useMutation({
    mutationFn: async (data: UpdateAgreementUrlInput) => {
      const res = await api.post(apiEndpoints.agreement.updateAgreement, data.body)
      return res.data
    },
    onSuccess: () => {
      alert("Agreement uploaded successfully.")
      setOpen(false)
    },
    onError: () => {
      alert("Failed to upload agreement. Please try again.")
    }
  })

  const handleSubmit = () => {
    if (!imageUrl) {
      alert("Please upload an agreement file before submitting.")
      return
    }
    updateAgreementMutation.mutate({
      body: {
        appointmentId: id,
        agreementUrl: imageUrl
      }
    })
  }

  const getStatusConfig = (status: string) => {
    const statusMap: Record<string, { 
      color: string, 
      bgColor: string, 
      icon: React.ReactNode 
    }> = {
      'CONFIRMED': { 
        color: 'text-primary', 
        bgColor: 'bg-blue-50', 
        icon: <CheckCircle className="w-4 h-4" /> 
      },
      'COMPLETED': { 
        color: 'text-green-600', 
        bgColor: 'bg-green-50', 
        icon: <CheckCircle className="w-4 h-4" /> 
      },
      'CANCELLED': { 
        color: 'text-red-600', 
        bgColor: 'bg-red-50', 
        icon: <X className="w-4 h-4" /> 
      },
      'PENDING': { 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50', 
        icon: <Clock className="w-4 h-4" /> 
      }
    }
    return statusMap[status] || { 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50', 
      icon: <AlertCircle className="w-4 h-4" /> 
    }
  }

  const statusConfig = getStatusConfig(s)

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const { date, time } = formatDateTime(datetime)

  return (
    <>
      <div className="p-6 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors duration-200">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{displayName}</h3>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{time}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.icon}
              <span>{s || 'SCHEDULED'}</span>
            </div>
            <button 
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-5"></div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {s === 'CONFIRMED' && (
            <>
              <button 
                onClick={onReschedule} 
                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-primary hover:bg-blue-50 rounded-lg border border-gray-300 hover:border-blue-200 transition-all duration-200 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Reschedule
              </button>
              <button 
                onClick={onConnect} 
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-blue-700 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                <Video className="w-4 h-4" />
                Join Meeting
              </button>
              {onCancel && (
                <button 
                  onClick={onCancel} 
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-300 hover:border-red-200 transition-all duration-200 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </>
          )}

          {s === 'COMPLETED' && (
            <>
              <button 
                onClick={() => setOpen(true)} 
                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg border border-gray-300 hover:border-purple-200 transition-all duration-200 text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                Upload Agreement
              </button>
              <button 
                onClick={onDiscussion} 
                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-primary hover:bg-blue-50 rounded-lg border border-gray-300 hover:border-blue-200 transition-all duration-200 text-sm font-medium"
              >
                <MessageSquare className="w-4 h-4" />
                Discussion
              </button>
              <button 
                onClick={onCaseDetails} 
                className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg border border-gray-300 hover:border-green-200 transition-all duration-200 text-sm font-medium"
              >
                <Briefcase className="w-4 h-4" />
                Case Details
              </button>
            </>
          )}

          {/* Fallback actions for other statuses */}
          {s !== 'CONFIRMED' && s !== 'COMPLETED' && (
            <div className="flex gap-3">
              {onAttend && (
                <button 
                  onClick={onAttend} 
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors duration-200 text-sm font-medium"
                >
                  <Video className="w-4 h-4" />
                  Attend Meeting
                </button>
              )}
              {onCancel && (
                <button 
                  onClick={onCancel} 
                  className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-300 hover:border-red-200 transition-all duration-200 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>

        {/* More Actions Dropdown */}
        {showMoreActions && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200">
                <Download className="w-4 h-4" />
                Export Details
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200">
                <CalendarIcon className="w-4 h-4" />
                Add to Calendar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Agreement Upload Modal */}
      <Modal open={open}>
        <div className="bg-white rounded-xl p-6 sm:min-w-[500px] w-full mx-auto border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Upload Agreement</h3>
              <p className="text-xs text-gray-600 mt-1">Appointment with {displayName}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 text-pink-400 bg-pink-50 hover:text-pink-600 hover:bg-pink-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <UploadInput imageUrl={imageUrl} setImageUrl={setImageUrl} />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2.5 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors duration-200 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!imageUrl || updateAgreementMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-primary text-white hover:bg-midnight disabled:bg-primary/30 disabled:cursor-not-allowed rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
            >
              {updateAgreementMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Agreement
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default AppointmentItem