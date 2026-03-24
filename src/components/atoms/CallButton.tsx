import { FC } from 'react'
import { Video, VideoOff, Loader2 } from 'lucide-react'
import { useVideoCall } from '@/hooks/useVideoCall'
import type { CallType, CallParticipant } from '@/types/video'

interface CallButtonProps {
  callType: CallType
  referenceId: string
  callee: CallParticipant
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
  showLabel?: boolean
  className?: string
}

const CallButton: FC<CallButtonProps> = ({
  callType,
  referenceId,
  callee,
  disabled = false,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  className = '',
}) => {
  const { initiateCall, isInCall, status } = useVideoCall()

  const isLoading = status === 'initiating'
  const isDisabled = disabled || isInCall

  const handleClick = () => {
    if (isDisabled) return
    initiateCall(callType, referenceId, callee)
  }

  // Size classes
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  // Variant classes
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  }

  const disabledClasses = 'opacity-50 cursor-not-allowed'

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-full transition-all
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isDisabled ? disabledClasses : ''}
        ${className}
      `}
      title={isInCall ? 'Already in a call' : `Start ${callType} video call`}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isInCall ? (
        <VideoOff className={iconSizes[size]} />
      ) : (
        <Video className={iconSizes[size]} />
      )}
      
      {showLabel && (
        <span className="text-sm font-medium">
          {isLoading ? 'Calling...' : isInCall ? 'In Call' : 'Video Call'}
        </span>
      )}
    </button>
  )
}

export default CallButton
