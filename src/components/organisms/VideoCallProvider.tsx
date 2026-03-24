import { FC, useEffect } from 'react'
import { useVideoCall } from '@/hooks/useVideoCall'
import IncomingCallModal from '@/components/molecules/IncomingCallModal'
import OutgoingCallModal from '@/components/molecules/OutgoingCallModal'
import VideoRoom from '@/components/organisms/VideoRoom'
import MinimizedCallBar from '@/components/molecules/MinimizedCallBar'
import socketService from '@/services/socketService'

interface VideoCallProviderProps {
  children: React.ReactNode
}

/**
 * VideoCallProvider wraps the application and provides:
 * - Incoming call modal (appears when receiving a call)
 * - Outgoing call modal (appears when initiating a call)
 * - Video room (full screen video call interface)
 * - Minimized call bar (when call is minimized)
 * 
 * This component should be placed inside the authenticated layout
 * to ensure socket connection is available.
 */
const VideoCallProvider: FC<VideoCallProviderProps> = ({ children }) => {
  const { status, isMinimized } = useVideoCall()

  // Ensure socket is connected when provider mounts
  useEffect(() => {
    socketService.connect()
  }, [])

  return (
    <>
      {children}
      
      {/* Incoming call modal - shows when receiving a call */}
      <IncomingCallModal />
      
      {/* Outgoing call modal - shows when initiating a call */}
      <OutgoingCallModal />
      
      {/* Video room - shows when call is connecting or connected */}
      {['connecting', 'connected'].includes(status) && !isMinimized && (
        <VideoRoom />
      )}
      
      {/* Minimized call bar - shows when call is connected and minimized */}
      <MinimizedCallBar />
    </>
  )
}

export default VideoCallProvider
