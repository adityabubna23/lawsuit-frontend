import { create } from 'zustand'
import type {
  VideoCallState,
  CallStatus,
  CallType,
  CallParticipant,
  CallEndReason,
  IncomingCallData,
  CallHistory,
} from '@/types/video'
import { soundManager } from '@/utils/soundManager'

interface VideoCallStore extends VideoCallState {
  // Actions
  setStatus: (status: CallStatus) => void
  initiateCall: (
    callType: CallType,
    referenceId: string,
    callee: CallParticipant
  ) => void
  receiveIncomingCall: (data: IncomingCallData) => void
  acceptCall: () => void
  declineCall: () => void
  cancelCall: () => void
  callAccepted: (roomUrl: string, token: string) => void
  callConnected: () => void
  endCall: (reason: CallEndReason) => void
  setCallDetails: (roomUrl: string, token: string) => void
  toggleMinimize: () => void
  toggleMute: () => void
  toggleCamera: () => void
  reset: () => void
}

const initialState: VideoCallState = {
  status: 'idle',
  callId: null,
  callType: null,
  referenceId: null,
  caller: null,
  callee: null,
  roomUrl: null,
  token: null,
  startedAt: null,
  endedAt: null,
  endReason: null,
  isMinimized: false,
  isMuted: false,
  isCameraOff: false,
}

export const useVideoCallStore = create<VideoCallStore>((set, get) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  initiateCall: (callType, referenceId, callee) => {
    soundManager.startLoop('outgoing')
    set({
      status: 'initiating',
      callType,
      referenceId,
      callee,
      caller: null, // Will be set from user context
      callId: null,
      roomUrl: null,
      token: null,
      startedAt: null,
      endedAt: null,
      endReason: null,
      isMinimized: false,
    })
  },

  receiveIncomingCall: (data) => {
    soundManager.startLoop('incoming')
    set({
      status: 'ringing',
      callId: data.callId,
      callType: data.callType,
      referenceId: data.referenceId,
      caller: data.caller,
      callee: null,
      roomUrl: data.roomUrl,
      token: data.token,
      startedAt: null,
      endedAt: null,
      endReason: null,
      isMinimized: false,
    })
  },

  acceptCall: () => {
    soundManager.stopLoop()
    set({ status: 'connecting' })
  },

  declineCall: () => {
    soundManager.stopLoop()
    soundManager.playOnce('ended')
    const currentState = get()
    set({
      ...initialState,
      endReason: 'declined',
      endedAt: new Date(),
      // Keep some info for potential logging
    })
  },

  cancelCall: () => {
    soundManager.stopLoop()
    soundManager.playOnce('ended')
    set({
      ...initialState,
      endReason: 'cancelled',
      endedAt: new Date(),
    })
  },

  callAccepted: (roomUrl, token) => {
    soundManager.stopLoop()
    set({
      status: 'connecting',
      roomUrl,
      token,
    })
  },

  callConnected: () => {
    soundManager.playOnce('connected')
    set({
      status: 'connected',
      startedAt: new Date(),
    })
  },

  endCall: (reason) => {
    soundManager.stopLoop()
    soundManager.playOnce('ended')
    set({
      status: 'ended',
      endedAt: new Date(),
      endReason: reason,
    })
    // Reset after a short delay
    setTimeout(() => {
      set(initialState)
    }, 2000)
  },

  setCallDetails: (roomUrl, token) => {
    set({ roomUrl, token })
  },

  toggleMinimize: () => {
    set((state) => ({ isMinimized: !state.isMinimized }))
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }))
  },

  toggleCamera: () => {
    set((state) => ({ isCameraOff: !state.isCameraOff }))
  },

  reset: () => {
    soundManager.stopLoop()
    set(initialState)
  },
}))

// Selector hooks for better performance
export const useCallStatus = () => useVideoCallStore((state) => state.status)
export const useIsInCall = () =>
  useVideoCallStore((state) =>
    ['ringing', 'connecting', 'connected', 'initiating'].includes(state.status)
  )
export const useCallParticipants = () =>
  useVideoCallStore((state) => ({
    caller: state.caller,
    callee: state.callee,
  }))
export const useCallControls = () =>
  useVideoCallStore((state) => ({
    isMuted: state.isMuted,
    isCameraOff: state.isCameraOff,
    isMinimized: state.isMinimized,
    toggleMute: state.toggleMute,
    toggleCamera: state.toggleCamera,
    toggleMinimize: state.toggleMinimize,
  }))

export default useVideoCallStore
