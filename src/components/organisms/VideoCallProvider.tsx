import { FC, useEffect } from 'react'
import { useVideoCall } from '@/hooks/useVideoCall'
import IncomingCallModal from '@/components/molecules/IncomingCallModal'
import OutgoingCallModal from '@/components/molecules/OutgoingCallModal'
import VideoRoom from '@/components/organisms/VideoRoom'
import socketService from '@/services/socketService'

interface VideoCallProviderProps {
  children: React.ReactNode
}

/**
 * Mounts the in-app call UI:
 *  - Incoming call modal (callee side, status=ringing)
 *  - Outgoing call modal (caller side, status=initiating)
 *  - VideoRoom (both sides, status=connecting/connected) — handles its own
 *    minimized vs full-screen view so the Daily iframe stays mounted across
 *    the transition.
 *
 * Must live inside the authenticated layout so the socket is connected.
 */
const VideoCallProvider: FC<VideoCallProviderProps> = ({ children }) => {
  const { status } = useVideoCall()

  useEffect(() => {
    socketService.connect()
  }, [])

  const showRoom = status === 'connecting' || status === 'connected'

  return (
    <>
      {children}
      <IncomingCallModal />
      <OutgoingCallModal />
      {showRoom && <VideoRoom />}
    </>
  )
}

export default VideoCallProvider
