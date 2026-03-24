// Video Call Types and Interfaces

export type CallStatus = 
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'failed'
  | 'missed'
  | 'declined'
  | 'busy'

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

export interface IncomingCallData {
  callId: string
  callType: CallType
  referenceId: string
  caller: CallParticipant
  roomUrl: string
  token: string
}

export interface OutgoingCallData {
  callType: CallType
  referenceId: string
  callee: CallParticipant
}

export interface CallAcceptedData {
  callId: string
  roomUrl: string
  token: string
}

export interface CallEndedData {
  callId: string
  reason: CallEndReason
  duration?: number // in seconds
}

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
  status: 'completed' | 'missed' | 'declined' | 'failed'
  duration: number // in seconds
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

// Socket event types
export interface CallInitiateEvent {
  callType: CallType
  referenceId: string // chatId or appointmentId
  calleeId: string
}

export interface CallIncomingEvent {
  callId: string
  callType: CallType
  referenceId: string
  caller: CallParticipant
  roomUrl: string
  token: string
}

export interface CallAcceptEvent {
  callId: string
}

export interface CallDeclineEvent {
  callId: string
}

export interface CallCancelEvent {
  callId: string
}

export interface CallAcceptedEvent {
  callId: string
  callee: CallParticipant
  roomUrl: string
  token: string
}

export interface CallDeclinedEvent {
  callId: string
  reason: 'declined' | 'busy'
}

export interface CallEndEvent {
  callId: string
  reason: CallEndReason
  duration?: number
}

export interface CallErrorEvent {
  callId?: string
  error: string
  code?: string
}
