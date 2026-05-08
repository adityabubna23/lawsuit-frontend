import { FC, useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoApi } from '@/services/api'
import { Loader2 } from 'lucide-react'
import DailyVideoPlayer from '@/components/organisms/DailyVideoPlayer'
import WebRTCRoom from '@/components/organisms/WebRTCRoom'

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
  /**
   * Fallback flips on automatically when /video/meeting fails (Daily.co unavailable
   * or appointment doesn't have a Daily room) — or via the manual toggle.
   * The room id is the deterministic `appointment-{id}` string so both peers
   * land in the same socket room without coordination.
   */
  const [useFallback, setUseFallback] = useState(false)

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
          // Daily room not provisioned — fall back to peer-to-peer WebRTC.
          setUseFallback(true)
          return
        }
        setMeeting(data)
      })
      .catch((err: any) => {
        if (cancelled) return
        // Network / 5xx / Daily unavailable — switch to WebRTC fallback rather
        // than dead-ending the user. They can still leave via the back button.
        const msg = err?.response?.data?.error || err?.message || 'Failed to join the meeting'
        console.warn('[Video] Daily meeting fetch failed, switching to WebRTC fallback:', msg)
        setUseFallback(true)
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
          <p className="text-sm text-gray-500">
            {useFallback ? 'Peer-to-peer fallback (WebRTC).' : 'Your secure, private video session.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meeting && (
            <button
              onClick={() => setUseFallback((v) => !v)}
              className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              title="Switch between Daily.co and WebRTC fallback"
            >
              {useFallback ? 'Use Daily.co' : 'Use fallback'}
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
          >
            Back
          </button>
        </div>
      </div>

      <div className="relative flex-grow w-full bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-200">
        {fetching ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <Loader2 className="h-10 w-10 text-white animate-spin mb-4" />
            <p className="text-white font-medium">Preparing secure room...</p>
          </div>
        ) : useFallback ? (
          <WebRTCRoom
            roomId={`appointment-${appointmentId}`}
            onLeave={handleLeft}
          />
        ) : meeting ? (
          <DailyVideoPlayer
            roomUrl={meeting.meetingLink}
            token={meeting.token}
            showLeaveButton
            onLeft={handleLeft}
            onError={handleError}
            className="w-full h-full"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <p className="text-white font-medium">Initializing fallback…</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoConsultationPage
