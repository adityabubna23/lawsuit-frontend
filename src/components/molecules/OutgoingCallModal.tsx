import { FC, useEffect, useState } from 'react'
import { PhoneOff, User, Loader2 } from 'lucide-react'
import { useVideoCall } from '@/hooks/useVideoCall'

const OutgoingCallModal: FC = () => {
  const { isInitiating, callee, callType, cancelCall, status } = useVideoCall()
  const [callDuration, setCallDuration] = useState(0)

  // Track call duration
  useEffect(() => {
    if (!isInitiating) {
      setCallDuration(0)
      return
    }

    const interval = setInterval(() => {
      setCallDuration((prev) => {
        // Auto-cancel after 45 seconds
        if (prev >= 45) {
          cancelCall()
          return 0
        }
        return prev + 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isInitiating, cancelCall])

  if (!isInitiating || !callee) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full animate-scale-in">
        {/* Callee Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            
            {callee.avatar ? (
              <img
                src={callee.avatar}
                alt={callee.name}
                className="w-24 h-24 rounded-full object-cover relative z-10 border-4 border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center relative z-10 border-4 border-gray-200">
                <User className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>

          <h2 className="mt-4 text-xl font-semibold text-gray-900">{callee.name}</h2>
          <p className="text-sm text-gray-500 capitalize">
            {callee.role.toLowerCase()} • {callType === 'chat' ? 'Chat' : 'Appointment'} Call
          </p>
          
          {/* Calling indicator */}
          <div className="mt-4 flex items-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Calling...</span>
          </div>

          {/* Call duration */}
          <p className="mt-2 text-xs text-gray-400">
            {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
          </p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Cancel Button */}
        <div className="flex justify-center">
          <button
            onClick={cancelCall}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg transition-all group-hover:bg-red-600 group-hover:scale-110 group-active:scale-95">
              <PhoneOff className="w-7 h-7 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Cancel</span>
          </button>
        </div>

        {/* Timeout warning */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Call will timeout in {45 - callDuration}s
          </p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-gray-400 rounded-full h-1 transition-all duration-1000"
              style={{ width: `${((45 - callDuration) / 45) * 100}%` }}
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

export default OutgoingCallModal
