import { FC, useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { videoApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
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
  const role = (useAuthStore((s) => s.user)?.role || '').toString().toUpperCase()
  const isLawyer = role === 'LAWYER'

  const [meeting, setMeeting] = useState<MeetingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  // No-recording acknowledgement gate. The server returns 412 NO_RECORDING_ACK_REQUIRED
  // until the caller posts the ack; we show a blocking modal until they do.
  const [needsNoRecAck, setNeedsNoRecAck] = useState(false)
  const [noRecAckText, setNoRecAckText] = useState('')
  const [noRecAgreed, setNoRecAgreed] = useState(false)
  const [noRecAckBusy, setNoRecAckBusy] = useState(false)
  const [meetingRefetchKey, setMeetingRefetchKey] = useState(0)
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
        setNeedsNoRecAck(false)
        if (!data?.meetingLink) {
          // Daily room not provisioned — fall back to peer-to-peer WebRTC.
          setUseFallback(true)
          return
        }
        setMeeting(data)
      })
      .catch((err: any) => {
        if (cancelled) return
        const status = err?.response?.status
        const body = err?.response?.data as { error?: string; text?: string } | undefined
        // 412 = no-recording ack required. Show the ack modal and let the user
        // confirm; the meeting refetches after they post the ack.
        if (status === 412 && body?.error === 'NO_RECORDING_ACK_REQUIRED') {
          setNoRecAckText(body?.text ?? '')
          setNeedsNoRecAck(true)
          return
        }
        // Network / 5xx / Daily unavailable — switch to WebRTC fallback rather
        // than dead-ending the user. They can still leave via the back button.
        const msg = body?.error || err?.message || 'Failed to join the meeting'
        console.warn('[Video] Daily meeting fetch failed, switching to WebRTC fallback:', msg)
        setUseFallback(true)
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })

    return () => {
      cancelled = true
    }
  }, [appointmentId, meetingRefetchKey])

  // No-recording acknowledgement: confirm + refetch.
  const handleNoRecAckConfirm = useCallback(async () => {
    if (!appointmentId) return
    if (!noRecAgreed) {
      setError('Please tick the acknowledgement to continue.')
      return
    }
    setNoRecAckBusy(true)
    setError(null)
    try {
      await videoApi.recordNoRecordingAck(appointmentId)
      setNeedsNoRecAck(false)
      setNoRecAgreed(false)
      // Bump the refetch key to re-run the getMeeting effect.
      setMeetingRefetchKey((k) => k + 1)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Couldn't record acknowledgement. Please try again.")
    } finally {
      setNoRecAckBusy(false)
    }
  }, [appointmentId, noRecAgreed])

  /**
   * On leave, the LAWYER (consultation host) hits the end-meeting endpoint so
   * the server can mark the consultation completed and release escrow. We
   * swallow errors — the server has its own watchdog that closes stale rooms,
   * and we never want the leave action to feel slow.
   */
  const handleLeft = useCallback(async () => {
    if (isLawyer && appointmentId) {
      try {
        await videoApi.endMeeting(appointmentId)
      } catch (err) {
        console.warn('[Video] endMeeting failed, ignoring:', err)
      }
    }
    navigate(-1)
  }, [appointmentId, isLawyer, navigate])

  const handleError = useCallback((msg: string) => setError(msg), [])

  /**
   * Manual provisioning — used when the user toggles back to Daily.co but no
   * room exists yet. Lawyer-only because creating rooms costs Daily.co minutes.
   */
  const handleProvisionDaily = useCallback(async () => {
    if (!appointmentId) return
    setProvisioning(true)
    try {
      const res = await videoApi.createMeeting(appointmentId)
      const data = (res.data?.data ?? res.data) as MeetingResponse
      if (data?.meetingLink) {
        setMeeting(data)
        setUseFallback(false)
      } else {
        // Re-fetch — the create endpoint sometimes only kicks off async provision.
        const fetched = await videoApi.getMeeting(appointmentId)
        setMeeting(fetched.data as MeetingResponse)
        setUseFallback(false)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to provision Daily.co room')
    } finally {
      setProvisioning(false)
    }
  }, [appointmentId])

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
    <>
      {needsNoRecAck && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-6 py-4">
              <h2 className="text-base font-semibold">Before you join</h2>
              <p className="text-xs text-white/80">Privacy acknowledgement (DPDP)</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">{noRecAckText}</p>
              <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noRecAgreed}
                  onChange={(e) => setNoRecAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                <span>I understand and agree.</span>
              </label>
              <button
                onClick={handleNoRecAckConfirm}
                disabled={noRecAckBusy || !noRecAgreed}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {noRecAckBusy ? 'Recording…' : 'Acknowledge and join'}
              </button>
              <button
                onClick={() => navigate(-1)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Consultation Room</h1>
          <p className="text-sm text-gray-500">
            {useFallback ? 'Peer-to-peer fallback (WebRTC).' : 'Your secure, private video session.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual Daily provisioning — only meaningful when in fallback AND we're the host */}
          {useFallback && isLawyer && !meeting && (
            <button
              onClick={handleProvisionDaily}
              disabled={provisioning}
              className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              title="Provision a Daily.co room for this appointment"
            >
              {provisioning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {provisioning ? 'Provisioning…' : 'Use Daily.co'}
            </button>
          )}
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
            onClick={handleLeft}
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
    </>
  )
}

export default VideoConsultationPage
