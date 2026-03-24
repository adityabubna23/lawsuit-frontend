import { useEffect, useCallback } from 'react'
import { useVideoCallStore } from '@/stores/videoCallStore'
import { useAuthStore } from '@/stores/authStore'
import socketService from '@/services/socketService'
import { videoApi } from '@/services/api'
import type { CallType, CallParticipant, CallEndReason } from '@/types/video'
import { soundManager } from '@/utils/soundManager'

export const useVideoCall = () => {
  const store = useVideoCallStore()
  const user = useAuthStore((s) => s.user)

  // Set up socket event listeners
  useEffect(() => {
    // Connect socket if not connected
    socketService.connect()

    // Handle incoming call
    const unsubIncoming = socketService.onCallIncoming((data) => {
      // Don't show incoming call if already in a call
      if (store.status !== 'idle') {
        socketService.declineCall(data.callId)
        return
      }
      store.receiveIncomingCall(data)
    })

    // Handle call accepted (for caller)
    const unsubAccepted = socketService.onCallAccepted((data) => {
      store.callAccepted(data.roomUrl, data.token)
    })

    // Handle call declined (for caller)
    const unsubDeclined = socketService.onCallDeclined((data) => {
      soundManager.stopLoop()
      soundManager.playOnce('ended')
      store.endCall(data.reason === 'busy' ? 'busy' : 'declined')
    })

    // Handle call ended
    const unsubEnded = socketService.onCallEnded((data) => {
      store.endCall(data.reason)
    })

    // Handle call error
    const unsubError = socketService.onCallError((data) => {
      console.error('Call error:', data.error)
      soundManager.stopLoop()
      soundManager.playOnce('error')
      store.endCall('failed')
    })

    // Handle call cancelled (for callee)
    const unsubCancelled = socketService.onCallCancelled(() => {
      soundManager.stopLoop()
      store.endCall('cancelled')
    })

    return () => {
      unsubIncoming()
      unsubAccepted()
      unsubDeclined()
      unsubEnded()
      unsubError()
      unsubCancelled()
    }
  }, [store.status])

  // Initiate a call
  const initiateCall = useCallback(
    async (callType: CallType, referenceId: string, callee: CallParticipant) => {
      if (!user) {
        console.error('User not authenticated')
        return
      }

      // Update store state
      store.initiateCall(callType, referenceId, callee)

      // Emit socket event
      socketService.initiateCall(callee.id, callType, referenceId)
    },
    [user, store]
  )

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (!store.callId) return

    store.acceptCall()
    socketService.acceptCall(store.callId)
  }, [store])

  // Decline incoming call
  const declineCall = useCallback(() => {
    if (!store.callId) return

    socketService.declineCall(store.callId)
    store.declineCall()
  }, [store])

  // Cancel outgoing call
  const cancelCall = useCallback(() => {
    if (!store.callId && store.status === 'initiating') {
      // Call hasn't been assigned an ID yet, just reset
      store.cancelCall()
      return
    }

    if (store.callId) {
      socketService.cancelCall(store.callId)
    }
    store.cancelCall()
  }, [store])

  // End ongoing call
  const endCall = useCallback(
    (reason: CallEndReason = 'completed') => {
      if (store.callId) {
        socketService.endCall(store.callId)
      }
      store.endCall(reason)
    },
    [store]
  )

  // Join video room (after call is connected)
  const joinRoom = useCallback(async () => {
    if (!store.roomUrl || !store.token) {
      console.error('No room URL or token available')
      return null
    }

    store.callConnected()
    return {
      roomUrl: store.roomUrl,
      token: store.token,
    }
  }, [store])

  // Get current call duration
  const getCallDuration = useCallback(() => {
    if (!store.startedAt) return 0
    const endTime = store.endedAt || new Date()
    return Math.floor((endTime.getTime() - store.startedAt.getTime()) / 1000)
  }, [store.startedAt, store.endedAt])

  return {
    // State
    status: store.status,
    callId: store.callId,
    callType: store.callType,
    referenceId: store.referenceId,
    caller: store.caller,
    callee: store.callee,
    roomUrl: store.roomUrl,
    token: store.token,
    isMinimized: store.isMinimized,
    isMuted: store.isMuted,
    isCameraOff: store.isCameraOff,
    startedAt: store.startedAt,
    endReason: store.endReason,

    // Actions
    initiateCall,
    acceptCall,
    declineCall,
    cancelCall,
    endCall,
    joinRoom,
    toggleMinimize: store.toggleMinimize,
    toggleMute: store.toggleMute,
    toggleCamera: store.toggleCamera,
    reset: store.reset,

    // Computed
    getCallDuration,
    isInCall: ['ringing', 'connecting', 'connected', 'initiating'].includes(store.status),
    isRinging: store.status === 'ringing',
    isConnected: store.status === 'connected',
    isConnecting: store.status === 'connecting',
    isInitiating: store.status === 'initiating',
  }
}

export default useVideoCall
