import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import type { Notification as AppNotification } from '@/types'
import type {
  CallIncomingEvent,
  CallAcceptedEvent,
  CallDeclinedEvent,
  CallEndEvent,
  CallErrorEvent,
  CallInitiateEvent,
  CallParticipant,
} from '@/types/video'

// Compute socket URL from VITE_API_URL (same host, different path)
const _envUrl = (import.meta.env.VITE_API_URL as string) || ''
let socketUrl = ''
if (_envUrl && _envUrl.length > 0) {
  // Extract the origin (protocol + host + port)
  try {
    const url = new URL(_envUrl)
    socketUrl = url.origin
  } catch {
    // If VITE_API_URL is a relative path, use window.location.origin
    socketUrl = typeof window !== 'undefined' ? window.location.origin : ''
  }
} else {
  socketUrl = typeof window !== 'undefined' ? window.location.origin : ''
}

type MessageHandler = (message: ChatMessage) => void
type TypingHandler = (data: { user: { id: string; name?: string } }) => void
type ReadReceiptHandler = (data: { messageId: string; readerId: string; readAt: string }) => void
type OnlineStatusHandler = (data: { usersOnline: string[] }) => void
type UserStatusHandler = (data: { userId: string; online: boolean }) => void
type NotificationHandler = (notification: AppNotification) => void
type UnreadCountHandler = (data: { unreadCount: number }) => void

// Video call event handlers
type CallIncomingHandler = (data: CallIncomingEvent) => void
type CallAcceptedHandler = (data: CallAcceptedEvent) => void
type CallDeclinedHandler = (data: CallDeclinedEvent) => void
type CallEndedHandler = (data: CallEndEvent) => void
type CallErrorHandler = (data: CallErrorEvent) => void
type CallCancelledHandler = (data: { callId: string }) => void

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  text?: string | null
  attachments?: string[]
  isRead: boolean
  readAt?: string | null
  createdAt: string
  senderName?: string
}

class SocketService {
  private static instance: SocketService
  private socket: Socket | null = null
  private currentChatId: string | null = null
  private messageHandlers: MessageHandler[] = []
  private typingStartHandlers: TypingHandler[] = []
  private typingStopHandlers: TypingHandler[] = []
  private readReceiptHandlers: ReadReceiptHandler[] = []
  private onlineStatusHandlers: OnlineStatusHandler[] = []
  private userStatusHandlers: UserStatusHandler[] = []
  private notificationHandlers: NotificationHandler[] = []
  private unreadCountHandlers: UnreadCountHandler[] = []
  private onlineUsers: Set<string> = new Set()
  
  // Video call handlers
  private callIncomingHandlers: CallIncomingHandler[] = []
  private callAcceptedHandlers: CallAcceptedHandler[] = []
  private callDeclinedHandlers: CallDeclinedHandler[] = []
  private callEndedHandlers: CallEndedHandler[] = []
  private callErrorHandlers: CallErrorHandler[] = []
  private callCancelledHandlers: CallCancelledHandler[] = []

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  connect(): Socket | null {
    if (this.socket?.connected) return this.socket

    const token = useAuthStore.getState().token
    if (!token) {
      console.warn('SocketService: No auth token available')
      return null
    }

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
      // Rejoin current chat room if any
      if (this.currentChatId) {
        this.joinChat(this.currentChatId)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message)
    })

    // Listen for new messages
    this.socket.on('chat:message:new', (data: { message: ChatMessage }) => {
      this.messageHandlers.forEach((handler) => handler(data.message))
    })

    // Listen for typing events
    this.socket.on('chat:typing:start', (data: { user: { id: string; name?: string } }) => {
      this.typingStartHandlers.forEach((handler) => handler(data))
    })

    this.socket.on('chat:typing:stop', (data: { user: { id: string } }) => {
      this.typingStopHandlers.forEach((handler) => handler(data))
    })

    // Listen for read receipts
    this.socket.on('chat:message:read', (data: { messageId: string; readerId: string; readAt: string }) => {
      this.readReceiptHandlers.forEach((handler) => handler(data))
    })

    // Listen for user online status updates
    this.socket.on('users:online', (data: { usersOnline: string[] }) => {
      this.onlineUsers = new Set(data.usersOnline)
      this.onlineStatusHandlers.forEach((handler) => handler(data))
    })

    this.socket.on('user:online', (data: { userId: string }) => {
      this.onlineUsers.add(data.userId)
      this.userStatusHandlers.forEach((handler) => handler({ userId: data.userId, online: true }))
    })

    this.socket.on('user:offline', (data: { userId: string }) => {
      this.onlineUsers.delete(data.userId)
      this.userStatusHandlers.forEach((handler) => handler({ userId: data.userId, online: false }))
    })

    // Listen for push notifications
    this.socket.on('notification', (notification: AppNotification) => {
      this.notificationHandlers.forEach((handler) => handler(notification))
    })

    // Listen for unread count updates
    this.socket.on('notification:unread-count', (data: { unreadCount: number }) => {
      this.unreadCountHandlers.forEach((handler) => handler(data))
    })

    // ─────────────────────────────────────────────────────────────────────
    // Video Call Events
    // ─────────────────────────────────────────────────────────────────────
    
    // Incoming call notification
    this.socket.on('call:incoming', (data: CallIncomingEvent) => {
      console.log('Incoming call:', data)
      this.callIncomingHandlers.forEach((handler) => handler(data))
    })

    // Call was accepted by the callee
    this.socket.on('call:accepted', (data: CallAcceptedEvent) => {
      console.log('Call accepted:', data)
      this.callAcceptedHandlers.forEach((handler) => handler(data))
    })

    // Call was declined by the callee
    this.socket.on('call:declined', (data: CallDeclinedEvent) => {
      console.log('Call declined:', data)
      this.callDeclinedHandlers.forEach((handler) => handler(data))
    })

    // Call ended
    this.socket.on('call:ended', (data: CallEndEvent) => {
      console.log('Call ended:', data)
      this.callEndedHandlers.forEach((handler) => handler(data))
    })

    // Call error
    this.socket.on('call:error', (data: CallErrorEvent) => {
      console.error('Call error:', data)
      this.callErrorHandlers.forEach((handler) => handler(data))
    })

    // Call cancelled by caller
    this.socket.on('call:cancelled', (data: { callId: string }) => {
      console.log('Call cancelled:', data)
      this.callCancelledHandlers.forEach((handler) => handler(data))
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.currentChatId = null
      this.onlineUsers.clear()
    }
  }

  joinChat(chatId: string) {
    this.currentChatId = chatId
    if (this.socket?.connected) {
      this.socket.emit('chat:join', { chatId })
    }
  }

  leaveChat() {
    this.currentChatId = null
  }

  sendMessage(chatId: string, text: string, attachments?: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('chat:message:new', { chatId, text, attachments })
    }
  }

  startTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('chat:typing:start', { chatId })
    }
  }

  stopTyping(chatId: string) {
    if (this.socket?.connected) {
      this.socket.emit('chat:typing:stop', { chatId })
    }
  }

  markMessageRead(chatId: string, messageId: string) {
    if (this.socket?.connected) {
      this.socket.emit('chat:message:read', { chatId, messageId })
    }
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId)
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers)
  }

  // Event handlers
  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)
    }
  }

  onTypingStart(handler: TypingHandler) {
    this.typingStartHandlers.push(handler)
    return () => {
      this.typingStartHandlers = this.typingStartHandlers.filter((h) => h !== handler)
    }
  }

  onTypingStop(handler: TypingHandler) {
    this.typingStopHandlers.push(handler)
    return () => {
      this.typingStopHandlers = this.typingStopHandlers.filter((h) => h !== handler)
    }
  }

  onReadReceipt(handler: ReadReceiptHandler) {
    this.readReceiptHandlers.push(handler)
    return () => {
      this.readReceiptHandlers = this.readReceiptHandlers.filter((h) => h !== handler)
    }
  }

  onOnlineStatusUpdate(handler: OnlineStatusHandler) {
    this.onlineStatusHandlers.push(handler)
    return () => {
      this.onlineStatusHandlers = this.onlineStatusHandlers.filter((h) => h !== handler)
    }
  }

  onUserStatusChange(handler: UserStatusHandler) {
    this.userStatusHandlers.push(handler)
    return () => {
      this.userStatusHandlers = this.userStatusHandlers.filter((h) => h !== handler)
    }
  }

  onNotification(handler: NotificationHandler) {
    this.notificationHandlers.push(handler)
    return () => {
      this.notificationHandlers = this.notificationHandlers.filter((h) => h !== handler)
    }
  }

  onUnreadCountUpdate(handler: UnreadCountHandler) {
    this.unreadCountHandlers.push(handler)
    return () => {
      this.unreadCountHandlers = this.unreadCountHandlers.filter((h) => h !== handler)
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Video Call Methods
  // ─────────────────────────────────────────────────────────────────────

  // Initiate a call
  initiateCall(calleeId: string, callType: 'chat' | 'appointment', referenceId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call:initiate', { calleeId, callType, referenceId })
    }
  }

  // Accept an incoming call
  acceptCall(callId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call:accept', { callId })
    }
  }

  // Decline an incoming call
  declineCall(callId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call:decline', { callId })
    }
  }

  // Cancel an outgoing call (before it's answered)
  cancelCall(callId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call:cancel', { callId })
    }
  }

  // End an ongoing call
  endCall(callId: string) {
    if (this.socket?.connected) {
      this.socket.emit('call:end', { callId })
    }
  }

  // Video call event handlers
  onCallIncoming(handler: CallIncomingHandler) {
    this.callIncomingHandlers.push(handler)
    return () => {
      this.callIncomingHandlers = this.callIncomingHandlers.filter((h) => h !== handler)
    }
  }

  onCallAccepted(handler: CallAcceptedHandler) {
    this.callAcceptedHandlers.push(handler)
    return () => {
      this.callAcceptedHandlers = this.callAcceptedHandlers.filter((h) => h !== handler)
    }
  }

  onCallDeclined(handler: CallDeclinedHandler) {
    this.callDeclinedHandlers.push(handler)
    return () => {
      this.callDeclinedHandlers = this.callDeclinedHandlers.filter((h) => h !== handler)
    }
  }

  onCallEnded(handler: CallEndedHandler) {
    this.callEndedHandlers.push(handler)
    return () => {
      this.callEndedHandlers = this.callEndedHandlers.filter((h) => h !== handler)
    }
  }

  onCallError(handler: CallErrorHandler) {
    this.callErrorHandlers.push(handler)
    return () => {
      this.callErrorHandlers = this.callErrorHandlers.filter((h) => h !== handler)
    }
  }

  onCallCancelled(handler: CallCancelledHandler) {
    this.callCancelledHandlers.push(handler)
    return () => {
      this.callCancelledHandlers = this.callCancelledHandlers.filter((h) => h !== handler)
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }
}

export const socketService = SocketService.getInstance()
export default socketService
