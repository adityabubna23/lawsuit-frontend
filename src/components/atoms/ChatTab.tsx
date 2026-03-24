import { FC, useEffect, useState, useRef, useCallback } from 'react'
import { chatApi, casesApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import socketService, { ChatMessage } from '@/services/socketService'
import CallButton from './CallButton'
import type { CallParticipant } from '@/types/video'

interface Message {
  id: string
  text: string
  senderId: string
  createdAt: string
  senderName?: string
  isRead?: boolean
  readAt?: string | null
}

interface Participant {
  id: string
  name: string
  avatarUrl?: string
}

interface ChatTabProps {
  chatId?: string
  onClose?: () => void
  caseId?: string
}

const ChatTab: FC<ChatTabProps> = ({ chatId: propChatId, onClose, caseId }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(propChatId || null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [otherUser, setOtherUser] = useState<Participant | null>(null)
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const isFirstLoad = useRef(true)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const authUserId = useAuthStore((s) => s.user?.id)

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow || ''
    }
  }, [])

  // Initialize chat - if caseId is provided but no chatId, create/get chat for that case
  useEffect(() => {
    // If we already have a chatId from props, use it
    if (propChatId) {
      setActiveChatId(propChatId)
      return
    }

    // If we have a caseId, we need to get/create a chat for this case
    if (caseId && !activeChatId) {
      const initChat = async () => {
        setInitializing(true)
        setError(null)
        try {
          // First, get case details to find the other party
          const caseRes = await casesApi.getById(caseId)
          const caseData = (caseRes as any).data?.case ?? (caseRes as any).data?.data ?? (caseRes as any).data ?? caseRes
          
          // Determine the other user (client or lawyer depending on current user)
          let otherUserId: string | null = null
          if (caseData.clientId && caseData.clientId !== authUserId) {
            otherUserId = caseData.clientId
          } else if (caseData.lawyerId && caseData.lawyerId !== authUserId) {
            otherUserId = caseData.lawyerId
          }

          if (!otherUserId) {
            setError('Could not determine chat participant')
            setInitializing(false)
            return
          }

          // Create or get existing chat for this case
          const chatRes = await chatApi.createChat({ otherUserId, caseId })
          const chatData = (chatRes as any).data ?? chatRes
          const chat = chatData.chat ?? chatData

          if (chat?.id) {
            setActiveChatId(chat.id)
          } else {
            setError('Failed to initialize chat')
          }
        } catch (err: any) {
          console.error('Failed to initialize chat', err)
          setError(err?.response?.data?.error || err?.message || 'Failed to initialize chat')
        } finally {
          setInitializing(false)
        }
      }
      initChat()
    }
  }, [propChatId, caseId, authUserId, activeChatId])

  // Connect to socket and join chat room
  useEffect(() => {
    if (!activeChatId) return

    // Connect socket
    const socket = socketService.connect()
    if (socket) {
      socketService.joinChat(activeChatId)
    }

    // Listen for new messages
    const unsubMessage = socketService.onMessage((msg: ChatMessage) => {
      if (msg.chatId === activeChatId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.id)) return prev
          return [
            ...prev,
            {
              id: msg.id,
              text: msg.text || '',
              senderId: msg.senderId,
              createdAt: msg.createdAt,
              senderName: msg.senderName,
              isRead: msg.isRead,
              readAt: msg.readAt,
            },
          ]
        })
        // Mark as read if it's not our message
        if (msg.senderId !== authUserId) {
          socketService.markMessageRead(activeChatId, msg.id)
        }
      }
    })

    // Listen for typing events
    const unsubTypingStart = socketService.onTypingStart((data) => {
      if (data.user.id !== authUserId) {
        setIsTyping(true)
        setTypingUser(data.user.name || 'Someone')
      }
    })

    const unsubTypingStop = socketService.onTypingStop((data) => {
      if (data.user.id !== authUserId) {
        setIsTyping(false)
        setTypingUser(null)
      }
    })

    // Listen for read receipts
    const unsubReadReceipt = socketService.onReadReceipt((data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, isRead: true, readAt: data.readAt } : m
        )
      )
    })

    // Listen for online status updates
    const unsubOnlineStatus = socketService.onOnlineStatusUpdate((data) => {
      if (otherUser && data.usersOnline.includes(otherUser.id)) {
        setIsOtherUserOnline(true)
      } else if (otherUser) {
        setIsOtherUserOnline(false)
      }
    })

    // Listen for user status changes
    const unsubUserStatus = socketService.onUserStatusChange((data) => {
      if (otherUser && data.userId === otherUser.id) {
        setIsOtherUserOnline(data.online)
      }
    })

    return () => {
      unsubMessage()
      unsubTypingStart()
      unsubTypingStop()
      unsubReadReceipt()
      unsubOnlineStatus()
      unsubUserStatus()
      socketService.leaveChat()
    }
  }, [activeChatId, authUserId, otherUser])

  // Load participants
  useEffect(() => {
    if (!activeChatId) return
    let mounted = true

    const loadParticipants = async () => {
      try {
        const res = await chatApi.getParticipants(activeChatId)
        const data = (res as any).data ?? res
        const participantsList = data.participants || data || []
        if (mounted) {
          setParticipants(participantsList)
          // Find the other user (not the current user)
          const other = participantsList.find((p: Participant) => p.id !== authUserId)
          if (other) {
            setOtherUser(other)
            setIsOtherUserOnline(socketService.isUserOnline(other.id))
          }
        }
      } catch (err) {
        console.error('Failed to load participants', err)
      }
    }

    loadParticipants()
    return () => {
      mounted = false
    }
  }, [activeChatId, authUserId])

  // Load messages
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!activeChatId) return
      setLoading(true)
      try {
        const res = await chatApi.getMessages(activeChatId)
        const data = (res as any).data ?? res
        const msgsRaw = Array.isArray(data) ? data : data.items || data.messages || data.data || []
        const normalized = msgsRaw.map((m: any) => ({
          id: m.id,
          text: m.text || '',
          senderId: m.senderId || m.userId || m.user?.id || '',
          createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          senderName: m.senderName || m.user?.name || m.sender?.name,
          isRead: m.isRead ?? false,
          readAt: m.readAt || null,
        }))
        // sort ascending (oldest first)
        normalized.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        if (mounted) {
          setMessages(normalized)
          // Mark unread messages from others as read
          normalized.forEach((m: Message) => {
            if (m.senderId !== authUserId && !m.isRead) {
              socketService.markMessageRead(activeChatId, m.id)
            }
          })
        }
      } catch (err) {
        console.error('Failed to load messages', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [activeChatId, authUserId])

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!activeChatId) return
    socketService.startTyping(activeChatId)

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(activeChatId)
    }, 2000)
  }, [activeChatId])

  const send = async () => {
    if (!text.trim() || !activeChatId) return

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    socketService.stopTyping(activeChatId)

    const messageText = text.trim()
    setText('') // Clear immediately for better UX

    try {
      // Send via API (this stores in DB and emits via socket)
      const res = await chatApi.sendMessage(activeChatId, { text: messageText })
      const data = (res as any).data ?? res
      const msg = data.message ?? data

      if (msg) {
        setMessages((prev) => {
          // Avoid duplicates (socket might have already added it)
          if (prev.some((m) => m.id === msg.id)) return prev
          return [
            ...prev,
            {
              id: msg.id,
              text: msg.text || '',
              senderId: msg.senderId || msg.userId || authUserId || '',
              createdAt: msg.createdAt || new Date().toISOString(),
              senderName: msg.senderName || msg.user?.name,
              isRead: msg.isRead ?? false,
              readAt: msg.readAt || null,
            },
          ]
        })
      }
    } catch (err) {
      console.error('Failed to send message', err)
      setText(messageText) // Restore text on error
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    const behavior: ScrollBehavior = isFirstLoad.current ? 'auto' : 'smooth'
    const t = setTimeout(() => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior })
      } catch (e) {
        el.scrollTop = el.scrollHeight
      }
      isFirstLoad.current = false
    }, 20)
    return () => clearTimeout(t)
  }, [messages.length])

  // Get read status for the last message sent by current user
  const getReadStatus = (msg: Message): 'sent' | 'delivered' | 'read' | null => {
    if (msg.senderId !== authUserId) return null
    if (msg.isRead) return 'read'
    return 'sent'
  }

  // Show loading state while initializing chat
  if (initializing) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-lg flex items-center justify-center">
        <div className="text-gray-500">Initializing chat...</div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-lg flex flex-col items-center justify-center gap-4">
        <div className="text-red-500">{error}</div>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
            Close
          </button>
        )}
      </div>
    )
  }

  // Show message if no chat is available
  if (!activeChatId && !caseId && !propChatId) {
    return (
      <div className="w-full h-full bg-white rounded-lg shadow-lg flex flex-col items-center justify-center gap-4">
        <div className="text-gray-500">No chat selected</div>
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
            Close
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg flex flex-col">
      {/* Header with online status and call button */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-3">
          <div className="font-semibold">Chat</div>
          {otherUser && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{otherUser.name}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOtherUserOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
                title={isOtherUserOnline ? 'Online' : 'Offline'}
              />
              <span className="text-xs">{isOtherUserOnline ? 'Online' : 'Offline'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Video call button */}
          {otherUser && activeChatId && (
            <CallButton
              callType="chat"
              referenceId={activeChatId}
              callee={{
                id: otherUser.id,
                name: otherUser.name,
                avatar: otherUser.avatarUrl,
                role: authUserId ? 'LAWYER' : 'CLIENT', // The other user's role
              } as CallParticipant}
              size="sm"
              variant="ghost"
              disabled={!isOtherUserOnline}
            />
          )}
          {onClose && (
            <button onClick={onClose} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              Close
            </button>
          )}
        </div>
      </div>

      <div className="p-4 h-full min-h-0 flex flex-col">
        {/* Messages Area */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">No messages yet. Start a conversation!</div>
          ) : (
            messages.map((m) => {
              const isMine = !!authUserId && m.senderId === authUserId
              const readStatus = getReadStatus(m)
              return (
                <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[70%] ${
                      isMine ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'
                    } px-4 py-2 rounded-lg`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    <div className="text-xs opacity-70 mt-1 flex items-center gap-2">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {/* Read receipt indicator */}
                      {isMine && readStatus && (
                        <span className="flex items-center">
                          {readStatus === 'read' ? (
                            <span title={`Read at ${m.readAt ? new Date(m.readAt).toLocaleString() : ''}`}>
                              ✓✓
                            </span>
                          ) : (
                            <span title="Sent">✓</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {/* Typing indicator */}
          {isTyping && typingUser && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
              </div>
              <span>{typingUser} is typing...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex gap-2 flex-none">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              handleTyping()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Type a message..."
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatTab
