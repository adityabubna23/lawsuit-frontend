import { FC, useEffect, useState } from 'react'
import { Maximize2, PhoneOff, Mic, MicOff, User } from 'lucide-react'
import { useVideoCall } from '@/hooks/useVideoCall'

const MinimizedCallBar: FC = () => {
  const {
    status,
    isMinimized,
    caller,
    callee,
    isMuted,
    toggleMinimize,
    toggleMute,
    endCall,
    getCallDuration,
  } = useVideoCall()

  const [callDuration, setCallDuration] = useState(0)

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

  // Only show when in connected call and minimized
  if (status !== 'connected' || !isMinimized) return null

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[85] animate-slide-down">
      <div className="bg-gray-900 rounded-full shadow-lg px-4 py-2 flex items-center gap-4">
        {/* Participant info */}
        <div className="flex items-center gap-2">
          {otherParticipant?.avatar ? (
            <img
              src={otherParticipant.avatar}
              alt={otherParticipant.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-white text-sm font-medium truncate max-w-[100px]">
              {otherParticipant?.name}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-white text-sm font-mono">{formatDuration(callDuration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition ${
              isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </button>

          <button
            onClick={toggleMinimize}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition"
            title="Expand"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={() => endCall('completed')}
            className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition"
            title="End call"
          >
            <PhoneOff className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default MinimizedCallBar
