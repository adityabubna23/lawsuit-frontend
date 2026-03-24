import { FC, useEffect, useRef, useState, useCallback } from 'react'
import DailyIframe, { DailyCall } from '@daily-co/daily-js'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  MessageSquare,
  User,
  Loader2,
  Settings,
} from 'lucide-react'
import { useVideoCall } from '@/hooks/useVideoCall'

interface VideoRoomProps {
  onClose?: () => void
}

const VideoRoom: FC<VideoRoomProps> = ({ onClose }) => {
  const {
    status,
    roomUrl,
    token,
    caller,
    callee,
    isMinimized,
    isMuted,
    isCameraOff,
    endCall,
    toggleMinimize,
    toggleMute,
    toggleCamera,
    joinRoom,
    getCallDuration,
    callType,
  } = useVideoCall()

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [callObject, setCallObject] = useState<DailyCall | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [showChat, setShowChat] = useState(false)

  // Get the other participant
  const otherParticipant = caller || callee

  // Track call duration
  useEffect(() => {
    if (status !== 'connected') return

    const interval = setInterval(() => {
      setCallDuration(getCallDuration())
    }, 1000)

    return () => clearInterval(interval)
  }, [status, getCallDuration])

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Initialize Daily.co call
  const initializeCall = useCallback(async () => {
    if (!roomUrl || !videoContainerRef.current) {
      setError('Failed to initialize video call')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Create Daily iframe
      const newCallObject = DailyIframe.createFrame(videoContainerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: isMinimized ? '12px' : '0',
        },
        showLeaveButton: false, // We'll use our custom button
        showFullscreenButton: true,
      })

      // Event listeners
      newCallObject.on('joined-meeting', () => {
        console.log('Joined Daily.co meeting')
        setIsLoading(false)
      })

      newCallObject.on('left-meeting', () => {
        console.log('Left Daily.co meeting')
        endCall('completed')
      })

      newCallObject.on('error', (e) => {
        console.error('Daily.co error:', e)
        setError('An error occurred during the video call')
        setIsLoading(false)
      })

      newCallObject.on('participant-left', () => {
        // Other participant left
        endCall('completed')
      })

      // Join the call
      await newCallObject.join({ url: roomUrl, token: token || undefined })
      setCallObject(newCallObject)
    } catch (err: any) {
      console.error('Failed to join video call:', err)
      setError(err.message || 'Failed to join video call')
      setIsLoading(false)
    }
  }, [roomUrl, token, isMinimized, endCall])

  // Initialize when connecting
  useEffect(() => {
    if (status === 'connecting' || status === 'connected') {
      if (!callObject) {
        initializeCall()
      }
    }

    return () => {
      if (callObject) {
        callObject.leave().then(() => callObject.destroy())
      }
    }
  }, [status, callObject, initializeCall])

  // Handle mute/camera toggle
  useEffect(() => {
    if (!callObject) return

    callObject.setLocalAudio(!isMuted)
  }, [isMuted, callObject])

  useEffect(() => {
    if (!callObject) return

    callObject.setLocalVideo(!isCameraOff)
  }, [isCameraOff, callObject])

  // Handle end call
  const handleEndCall = () => {
    if (callObject) {
      callObject.leave()
    }
    endCall('completed')
    onClose?.()
  }

  // Don't render if not in call
  if (!['connecting', 'connected'].includes(status)) {
    return null
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[90] w-72 h-48 bg-gray-900 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Video container */}
        <div ref={videoContainerRef} className="w-full h-full" />

        {/* Overlay controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
          {/* Header */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {otherParticipant?.avatar ? (
                <img
                  src={otherParticipant.avatar}
                  alt={otherParticipant.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
              )}
              <span className="text-white text-xs font-medium truncate">
                {otherParticipant?.name}
              </span>
            </div>
            <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded">
              {formatDuration(callDuration)}
            </span>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <button
              onClick={toggleMinimize}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full transition ${
                  isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-white" />
                )}
              </button>

              <button
                onClick={handleEndCall}
                className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition"
              >
                <PhoneOff className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        <style>{`
          @keyframes scale-in {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-scale-in {
            animation: scale-in 0.2s ease-out;
          }
        `}</style>
      </div>
    )
  }

  // Full screen view
  return (
    <div className="fixed inset-0 z-[90] bg-gray-900 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
        <div className="flex items-center gap-3">
          {otherParticipant?.avatar ? (
            <img
              src={otherParticipant.avatar}
              alt={otherParticipant.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h2 className="text-white font-semibold">{otherParticipant?.name}</h2>
            <p className="text-gray-400 text-sm capitalize">
              {callType === 'chat' ? 'Chat Call' : 'Appointment Call'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white text-sm bg-gray-700 px-3 py-1 rounded-full">
            {formatDuration(callDuration)}
          </span>
          <button
            onClick={toggleMinimize}
            className="p-2 rounded-full hover:bg-gray-700 transition"
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Video container */}
      <div className="flex-1 relative">
        <div ref={videoContainerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-white font-medium">Connecting...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleEndCall}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 py-4 bg-gray-800 flex items-center justify-center gap-4">
        {/* Mute button */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Camera button */}
        <button
          onClick={toggleCamera}
          className={`p-4 rounded-full transition ${
            isCameraOff
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
          title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isCameraOff ? (
            <VideoOff className="w-6 h-6 text-white" />
          ) : (
            <Video className="w-6 h-6 text-white" />
          )}
        </button>

        {/* End call button */}
        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition"
          title="End call"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

        {/* Chat button (optional - Daily.co has built-in chat) */}
        <button
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-full transition ${
            showChat
              ? 'bg-primary hover:bg-primary/80'
              : 'bg-gray-600 hover:bg-gray-500'
          }`}
          title="Toggle chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default VideoRoom
