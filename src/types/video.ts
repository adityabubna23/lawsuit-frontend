// Video Call Types and Interfaces
//
// Contract (mirrors backend `src/sockets/index.ts`):
//
//   frontend -> backend: call:initiate { to, callType, referenceId }
//                        call:accept   { callId }
//                        call:decline  { callId }
//                        call:cancel   { callId }
//                        call:end      { callId }
//
//   backend  -> caller:  call:initiated { callId, callType, referenceId, callee, roomUrl, token }
//                        call:accepted  { callId, callee }
//                        call:declined  { callId, reason }
//                        call:ended     { callId, duration }
//                        call:error     { callId?, code, message }
//
//   backend  -> callee:  call:incoming  { callId, callType, referenceId, caller, roomUrl, token }
//                        call:cancelled { callId }
//                        call:ended     { callId, duration }
//                        call:error     { callId?, code, message }

export type CallStatus =
  | 'idle'
  | 'initiating' // caller: waiting for callee to accept
  | 'ringing'    // callee: incoming call modal open
  | 'connecting' // both: joining Daily room
  | 'connected'  // both: in the call
  | 'ended'

export type CallType = 'chat' | 'appointment'

export type CallEndReason =
  | 'completed'
  | 'declined'
  | 'missed'
  | 'failed'
  | 'busy'
  | 'cancelled'
  | 'network_error'

export interface CallParticipant {
  id: string
  name: string
  avatar?: string
  role: 'CLIENT' | 'LAWYER' | 'ADMIN'
}

export interface VideoCallState {
  status: CallStatus
  callId: string | null
  callType: CallType | null
  referenceId: string | null // chatId or appointmentId
  caller: CallParticipant | null
  callee: CallParticipant | null
  roomUrl: string | null
  token: string | null
  startedAt: Date | null
  endedAt: Date | null
  endReason: CallEndReason | null
  isMinimized: boolean
  isMuted: boolean
  isCameraOff: boolean
}

// ───────────────────────────────────────────────────────────
// Socket event payloads
// ───────────────────────────────────────────────────────────

// Frontend → backend
export interface CallInitiatePayload {
  to: string
  callType: CallType
  referenceId: string
}

export interface CallIdPayload {
  callId: string
}

// Backend → caller (ack)
export interface CallInitiatedEvent {
  callId: string
  callType: CallType
  referenceId: string
  callee: CallParticipant
  roomUrl: string
  token: string
}

// Backend → callee
export interface CallIncomingEvent {
  callId: string
  callType: CallType
  referenceId: string
  caller: CallParticipant
  roomUrl: string
  token: string
}

// Backend → caller
export interface CallAcceptedEvent {
  callId: string
  callee: CallParticipant
}

export interface CallDeclinedEvent {
  callId: string
  reason: 'declined' | 'busy'
}

// Backend → callee
export interface CallCancelledEvent {
  callId: string
}

// Backend → either
export interface CallEndedEvent {
  callId: string
  duration?: number
}

export interface CallErrorEvent {
  callId?: string
  code: string
  message: string
}

// ───────────────────────────────────────────────────────────
// Call history (HTTP)
// ───────────────────────────────────────────────────────────

export interface CallHistory {
  id: string
  callType: CallType
  referenceId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  calleeId: string
  calleeName: string
  calleeAvatar?: string
  status: 'completed' | 'missed' | 'declined' | 'failed' | 'cancelled'
  duration: number
  startedAt: string
  endedAt: string
  createdAt: string
}

export interface CallHistoryResponse {
  items: CallHistory[]
  total: number
  page: number
  limit: number
}
