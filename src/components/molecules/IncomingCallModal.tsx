import { FC, useEffect, useState } from 'react'
import { Phone, PhoneOff, User } from 'lucide-react'
import { useVideoCall } from '@/hooks/useVideoCall'

const IncomingCallModal: FC = () => {
  const { isRinging, caller, callType, acceptCall, declineCall } = useVideoCall()
  const [ringDuration, setRingDuration] = useState(0)

  // Track ring duration for auto-decline
  useEffect(() => {
    if (!isRinging) {
      setRingDuration(0)
      return
    }

    const interval = setInterval(() => {
      setRingDuration((prev) => {
        // Auto-decline after 30 seconds
        if (prev >= 30) {
          declineCall()
          return 0
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRinging, declineCall])

  if (!isRinging || !caller) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full animate-scale-in">
        {/* Caller Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {/* Animated ring effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            
            {caller.avatar ? (
              <img
                src={caller.avatar}
                alt={caller.name}
                className="w-24 h-24 rounded-full object-cover relative z-10 border-4 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center relative z-10 border-4 border-primary/30">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
          </div>

          <h2 className="mt-4 text-xl font-semibold text-gray-900">{caller.name}</h2>
          <p className="text-sm text-gray-500 capitalize">
            {caller.role.toLowerCase()} • {callType === 'chat' ? 'Chat' : 'Appointment'} Call
          </p>
          
          {/* Incoming call indicator */}
          <div className="mt-2 flex items-center gap-2 text-primary">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-medium">Incoming video call...</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-8">
          {/* Decline Button */}
          <button
            onClick={declineCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg transition-all group-hover:bg-red-600 group-hover:scale-110 group-active:scale-95">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Decline</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={acceptCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg transition-all group-hover:bg-green-600 group-hover:scale-110 group-active:scale-95 animate-bounce">
              <Phone className="w-7 h-7 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Accept</span>
          </button>
        </div>

        {/* Auto-decline timer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Auto-declining in {30 - ringDuration}s
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-primary rounded-full h-1 transition-all duration-1000"
              style={{ width: `${((30 - ringDuration) / 30) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Add custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default IncomingCallModal
