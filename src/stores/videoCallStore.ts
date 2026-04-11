import { create } from 'zustand'
import type {
  VideoCallState,
  CallStatus,
  CallType,
  CallParticipant,
  CallEndReason,
  CallInitiatedEvent,
  CallIncomingEvent,
} from '@/types/video'
import { soundManager } from '@/utils/soundManager'

interface VideoCallStore extends VideoCallState {
  // Lifecycle
  initiateCall: (callType: CallType, referenceId: string, callee: CallParticipant) => void
  callInitiated: (data: CallInitiatedEvent) => void
  receiveIncomingCall: (data: CallIncomingEvent) => void
  acceptCall: () => void
  callAccepted: (callee?: CallParticipant | null) => void
  callConnected: () => void
  endCall: (reason: CallEndReason) => void
  reset: () => void

  // UI controls
  toggleMinimize: () => void
  toggleMute: () => void
  toggleCamera: () => void
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

export const useVideoCallStore = create<VideoCallStore>((set) => ({
  ...initialState,

  // Caller: local optimistic state while we wait for the backend ack
  initiateCall: (callType, referenceId, callee) => {
    soundManager.startLoop('outgoing')
    set({
      ...initialState,
      status: 'initiating',
      callType,
      referenceId,
      callee,
    })
  },

  // Caller: backend ack — now we have a callId + roomUrl + token
  callInitiated: (data) => {
    set({
      callId: data.callId,
      callType: data.callType,
      referenceId: data.referenceId,
      callee: data.callee,
      roomUrl: data.roomUrl,
      token: data.token,
    })
  },

  // Callee: incoming call received
  receiveIncomingCall: (data) => {
    soundManager.startLoop('incoming')
    set({
      ...initialState,
      status: 'ringing',
      callId: data.callId,
      callType: data.callType,
      referenceId: data.referenceId,
      caller: data.caller,
      roomUrl: data.roomUrl,
      token: data.token,
    })
  },

  // Callee: locally accept (socket emit handled by the hook)
  acceptCall: () => {
    soundManager.stopLoop()
    set({ status: 'connecting' })
  },

  // Caller: callee accepted on the other side
  callAccepted: (callee) => {
    soundManager.stopLoop()
    set((state) => ({
      status: 'connecting',
      callee: callee ?? state.callee,
    }))
  },

  // Either side: Daily iframe successfully joined
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
  },

  reset: () => {
    soundManager.stopLoop()
    set(initialState)
  },

  toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized })),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
}))

// Selector hooks — use these in components to avoid subscribing to the whole store
export const useCallStatus = () => useVideoCallStore((state) => state.status)

export const useIsInCall = () =>
  useVideoCallStore((state) =>
    state.status === 'initiating' ||
    state.status === 'ringing' ||
    state.status === 'connecting' ||
    state.status === 'connected'
  )

export default useVideoCallStore
