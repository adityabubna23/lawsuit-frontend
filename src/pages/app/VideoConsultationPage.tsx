import { FC, useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoApi } from '@/services/api'
import { Loader2 } from 'lucide-react'
import DailyVideoPlayer from '@/components/organisms/DailyVideoPlayer'

interface MeetingResponse {
  meetingLink: string
  token: string
}

/**
 * Scheduled-appointment call flow.
 *
 * Unlike the chat-call flow (which uses socket signalling to ring the other
 * party), appointments have a pre-agreed time — both participants just load
 * this page and join the same Daily room. Room + token come from the backend
 * over HTTP, then we hand them to the shared DailyVideoPlayer.
 */
const VideoConsultationPage: FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()

  const [meeting, setMeeting] = useState<MeetingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!appointmentId) {
      setError('Missing appointment id')
      setFetching(false)
      return
    }

    let cancelled = false
    setFetching(true)
    setError(null)

    videoApi
      .getMeeting(appointmentId)
      .then((res) => {
        if (cancelled) return
        const data = res.data as MeetingResponse
        if (!data?.meetingLink) {
          setError('Failed to retrieve meeting details')
          return
        }
        setMeeting(data)
      })
      .catch((err: any) => {
        if (cancelled) return
        setError(
          err?.response?.data?.error || err?.message || 'Failed to join the meeting'
        )
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [appointmentId])

  const handleLeft = useCallback(() => navigate(-1), [navigate])
  const handleError = useCallback((msg: string) => setError(msg), [])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-lg max-w-md w-full text-center shadow-sm border border-red-100">
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultation Room</h1>
          <p className="text-sm text-gray-500">Your secure, private video session.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
        >
          Back
        </button>
      </div>

      <div className="relative flex-grow w-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-200">
        {fetching || !meeting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
            <p className="text-white font-medium">Preparing secure room...</p>
          </div>
        ) : (
          <DailyVideoPlayer
            roomUrl={meeting.meetingLink}
            token={meeting.token}
            showLeaveButton
            onLeft={handleLeft}
            onError={handleError}
            className="w-full h-full"
          />
        )}
      </div>
    </div>
  )
}

export default VideoConsultationPage
