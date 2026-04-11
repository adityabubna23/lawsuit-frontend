import { useEffect, useCallback } from 'react'
import { useVideoCallStore } from '@/stores/videoCallStore'
import socketService from '@/services/socketService'
import { soundManager } from '@/utils/soundManager'
import type { CallType, CallParticipant, CallEndReason } from '@/types/video'

/**
 * Maps call:error codes returned by the backend into CallEndReason.
 */
function errorCodeToEndReason(code: string | undefined): CallEndReason {
  switch (code) {
    case 'USER_OFFLINE':
      return 'missed'
    case 'USER_BUSY':
    case 'CALLER_BUSY':
      return 'busy'
    default:
      return 'failed'
  }
}

// Reset delay after a call ends — gives the UI time to show the final state.
const END_RESET_DELAY_MS = 1500

/**
 * Subscribe to socket lifecycle events. This runs ONCE per hook instance;
 * it reads live state via `useVideoCallStore.getState()` so the listeners
 * stay stable for the whole session.
 */
function useCallEventSubscription() {
  useEffect(() => {
    socketService.connect()
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleReset = () => {
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        useVideoCallStore.getState().reset()
        resetTimer = null
      }, END_RESET_DELAY_MS)
    }

    // Caller: backend ack — the call is ringing the callee
    const unsubInitiated = socketService.onCallInitiated((data) => {
      useVideoCallStore.getState().callInitiated(data)
    })

    // Callee: incoming call
    const unsubIncoming = socketService.onCallIncoming((data) => {
      const store = useVideoCallStore.getState()
      // If we're already in a call, auto-decline so we don't ring twice
      if (store.status !== 'idle' && store.status !== 'ended') {
        socketService.declineCall(data.callId)
        return
      }
      store.receiveIncomingCall(data)
    })

    // Caller: callee accepted
    const unsubAccepted = socketService.onCallAccepted((data) => {
      useVideoCallStore.getState().callAccepted(data.callee)
    })

    // Caller: callee declined
    const unsubDeclined = socketService.onCallDeclined((data) => {
      soundManager.stopLoop()
      soundManager.playOnce('ended')
      const reason: CallEndReason = data.reason === 'busy' ? 'busy' : 'declined'
      useVideoCallStore.getState().endCall(reason)
      scheduleReset()
    })

    // Callee: caller cancelled before we answered
    const unsubCancelled = socketService.onCallCancelled(() => {
      soundManager.stopLoop()
      useVideoCallStore.getState().endCall('cancelled')
      scheduleReset()
    })

    // Either side: the other party ended the call
    const unsubEnded = socketService.onCallEnded(() => {
      useVideoCallStore.getState().endCall('completed')
      scheduleReset()
    })

    // Errors from the backend
    const unsubError = socketService.onCallError((data) => {
      soundManager.stopLoop()
      soundManager.playOnce('error')
      useVideoCallStore.getState().endCall(errorCodeToEndReason(data.code))
      scheduleReset()
    })

    return () => {
      unsubInitiated()
      unsubIncoming()
      unsubAccepted()
      unsubDeclined()
      unsubCancelled()
      unsubEnded()
      unsubError()
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [])
}

/**
 * Main video-call hook. Uses per-field selectors so components only re-render
 * when the specific fields they read change.
 */
export const useVideoCall = () => {
  useCallEventSubscription()

  // Selectors — each re-renders independently
  const status = useVideoCallStore((s) => s.status)
  const callId = useVideoCallStore((s) => s.callId)
  const callType = useVideoCallStore((s) => s.callType)
  const referenceId = useVideoCallStore((s) => s.referenceId)
  const caller = useVideoCallStore((s) => s.caller)
  const callee = useVideoCallStore((s) => s.callee)
  const roomUrl = useVideoCallStore((s) => s.roomUrl)
  const token = useVideoCallStore((s) => s.token)
  const startedAt = useVideoCallStore((s) => s.startedAt)
  const endedAt = useVideoCallStore((s) => s.endedAt)
  const endReason = useVideoCallStore((s) => s.endReason)
  const isMinimized = useVideoCallStore((s) => s.isMinimized)
  const isMuted = useVideoCallStore((s) => s.isMuted)
  const isCameraOff = useVideoCallStore((s) => s.isCameraOff)

  // Stable actions — selector returns identity-stable fn refs from the store
  const toggleMinimize = useVideoCallStore((s) => s.toggleMinimize)
  const toggleMute = useVideoCallStore((s) => s.toggleMute)
  const toggleCamera = useVideoCallStore((s) => s.toggleCamera)
  const resetCall = useVideoCallStore((s) => s.reset)

  const initiateCall = useCallback(
    (type: CallType, refId: string, target: CallParticipant) => {
      useVideoCallStore.getState().initiateCall(type, refId, target)
      socketService.initiateCall(target.id, type, refId)
    },
    []
  )

  const acceptCall = useCallback(() => {
    const id = useVideoCallStore.getState().callId
    if (!id) return
    useVideoCallStore.getState().acceptCall()
    socketService.acceptCall(id)
  }, [])

  const declineCall = useCallback(() => {
    const id = useVideoCallStore.getState().callId
    if (id) socketService.declineCall(id)
    useVideoCallStore.getState().endCall('declined')
    setTimeout(() => useVideoCallStore.getState().reset(), END_RESET_DELAY_MS)
  }, [])

  const cancelCall = useCallback(() => {
    const id = useVideoCallStore.getState().callId
    if (id) socketService.cancelCall(id)
    useVideoCallStore.getState().endCall('cancelled')
    setTimeout(() => useVideoCallStore.getState().reset(), END_RESET_DELAY_MS)
  }, [])

  const endCall = useCallback((reason: CallEndReason = 'completed') => {
    const id = useVideoCallStore.getState().callId
    if (id) socketService.endCall(id)
    useVideoCallStore.getState().endCall(reason)
    setTimeout(() => useVideoCallStore.getState().reset(), END_RESET_DELAY_MS)
  }, [])

  // Mark the Daily iframe as fully joined (called from DailyVideoPlayer)
  const markConnected = useCallback(() => {
    useVideoCallStore.getState().callConnected()
  }, [])

  // Compute call duration from startedAt (no state — purely derived)
  const getCallDuration = useCallback(() => {
    if (!startedAt) return 0
    const endTime = endedAt || new Date()
    return Math.floor((endTime.getTime() - startedAt.getTime()) / 1000)
  }, [startedAt, endedAt])

  return {
    // State
    status,
    callId,
    callType,
    referenceId,
    caller,
    callee,
    roomUrl,
    token,
    startedAt,
    endedAt,
    endReason,
    isMinimized,
    isMuted,
    isCameraOff,

    // Actions
    initiateCall,
    acceptCall,
    declineCall,
    cancelCall,
    endCall,
    markConnected,
    toggleMinimize,
    toggleMute,
    toggleCamera,
    reset: resetCall,

    // Derived
    getCallDuration,
    isInCall:
      status === 'initiating' ||
      status === 'ringing' ||
      status === 'connecting' ||
      status === 'connected',
    isRinging: status === 'ringing',
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isInitiating: status === 'initiating',
  }
}

export default useVideoCall
