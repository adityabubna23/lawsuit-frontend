import { FC, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import socketService, { ChatMessage } from '@/services/socketService'
import { Video, MessageSquare, Loader2, Briefcase, Send, AlertCircle } from 'lucide-react'


interface Message {
    id: string
    text: string
    senderId: string
    createdAt: string
    isRead?: boolean
}

interface AppointmentDiscussionPanelProps {
    appointmentId: string
    otherPartyName: string
    otherPartyRole: 'Lawyer' | 'Client'
    userRole: 'client' | 'lawyer'
    // Lawyer-only: for "Escalate to Case" button
    onEscalateToCase?: () => void
    caseId?: string | null
    // For video shortcut
    meetingLink?: string | null
    appointmentStatus: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
}

const AppointmentDiscussionPanel: FC<AppointmentDiscussionPanelProps> = ({
    appointmentId,
    otherPartyName,
    otherPartyRole,
    userRole,
    onEscalateToCase,
    caseId,
    appointmentStatus,
}) => {
    const navigate = useNavigate()
    const { user } = useAuthStore()
    const [chatId, setChatId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isTyping, setIsTyping] = useState(false)
    const typingTimeout = useRef<NodeJS.Timeout | null>(null)
    const messagesRef = useRef<HTMLDivElement>(null)

    // Initialize the discussion thread
    useEffect(() => {
        let mounted = true
        const init = async () => {
            try {
                setLoading(true)
                const res = await chatApi.getOrCreateAppointmentChat(appointmentId)
                const data = (res as any).data
                const chat = data?.chat ?? data

                if (!chat?.id) throw new Error('Could not initialize discussion thread')

                if (!mounted) return
                setChatId(chat.id)

                // Connect socket and join chat room
                const socket = socketService.connect()
                if (socket) socketService.joinChat(chat.id)

                // Load messages
                const msgRes = await chatApi.getMessages(chat.id)
                const msgData = (msgRes as any).data ?? msgRes
                const rawMsgs = Array.isArray(msgData) ? msgData : msgData.items || msgData.messages || []
                const normalized = rawMsgs.map((m: any) => ({
                    id: m.id,
                    text: m.text || '',
                    senderId: m.senderId || '',
                    createdAt: m.createdAt || new Date().toISOString(),
                    isRead: m.isRead ?? false,
                })).sort((a: Message, b: Message) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                )
                if (mounted) setMessages(normalized)

                setError(null)
            } catch (e: any) {
                if (mounted) setError(e?.response?.data?.error || e?.message || 'Could not load discussion thread')
            } finally {
                if (mounted) setLoading(false)
            }
        }
        init()
        return () => { mounted = false }
    }, [appointmentId])

    // Real-time messages via socket
    useEffect(() => {
        if (!chatId) return

        const unsub = socketService.onMessage((msg: ChatMessage) => {
            if (msg.chatId === chatId) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev
                    return [...prev, { id: msg.id, text: msg.text || '', senderId: msg.senderId, createdAt: msg.createdAt }]
                })
                if (msg.senderId !== user?.id) socketService.markMessageRead(chatId, msg.id)
            }
        })

        const unsubTypingStart = socketService.onTypingStart((d) => { if (d.user.id !== user?.id) setIsTyping(true) })
        const unsubTypingStop = socketService.onTypingStop((d) => { if (d.user.id !== user?.id) setIsTyping(false) })

        return () => { unsub(); unsubTypingStart(); unsubTypingStop() }
    }, [chatId, user?.id])

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' })
        }
    }, [messages.length])

    const handleTyping = () => {
        if (!chatId) return
        socketService.startTyping(chatId)
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => { if (chatId) socketService.stopTyping(chatId) }, 2000)
    }

    const sendMessage = async () => {
        if (!text.trim() || !chatId) return
        const messageText = text.trim()
        setText('')
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        if (chatId) socketService.stopTyping(chatId)

        try {
            const res = await chatApi.sendMessage(chatId, { text: messageText })
            const data = (res as any).data ?? res
            const msg = data.message ?? data
            if (msg?.id) {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev
                    return [...prev, { id: msg.id, text: msg.text || '', senderId: msg.senderId || user?.id || '', createdAt: msg.createdAt || new Date().toISOString() }]
                })
            }
        } catch (e) {
            setText(messageText)
        }
    }

    const handleJoinVideoCall = () => {
        const path = userRole === 'lawyer' ? `/lawyer/consultation/${appointmentId}` : `/app/consultation/${appointmentId}`
        navigate(path)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading discussion...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center gap-2 py-4 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
            </div>
        )
    }

    return (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-gray-800">Discussion Thread</span>
                    <span className="text-xs text-gray-400">with {otherPartyName} ({otherPartyRole})</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Video Call Shortcut */}
                    {(appointmentStatus === 'CONFIRMED' || appointmentStatus === 'PENDING') && (
                        <button
                            onClick={handleJoinVideoCall}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition"
                        >
                            <Video className="w-3.5 h-3.5" />
                            Join Video Call
                        </button>
                    )}
                    {/* Escalate to Case — Lawyer only */}
                    {userRole === 'lawyer' && onEscalateToCase && !caseId && (
                        <button
                            onClick={onEscalateToCase}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-500 text-amber-600 hover:bg-amber-50 rounded-md transition"
                        >
                            <Briefcase className="w-3.5 h-3.5" />
                            Escalate to Case
                        </button>
                    )}
                    {/* Case registered badge */}
                    {caseId && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-md">
                            <Briefcase className="w-3 h-3" />
                            Case Registered
                        </span>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="h-56 overflow-y-auto px-4 py-3 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                        No messages yet. Start the consultation discussion here.
                    </div>
                ) : (
                    messages.map(m => {
                        const isMine = m.senderId === user?.id
                        return (
                            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${isMine ? 'bg-primary text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                                    <p>{m.text}</p>
                                    <p className={`text-xs mt-1 ${isMine ? 'text-white/70 text-right' : 'text-gray-400'}`}>
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 px-3 py-2 rounded-lg text-xs text-gray-400">
                            {otherPartyName} is typing...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                <input
                    type="text"
                    value={text}
                    onChange={e => { setText(e.target.value); handleTyping() }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={`Message ${otherPartyName}...`}
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                    onClick={sendMessage}
                    disabled={!text.trim()}
                    className="p-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

export default AppointmentDiscussionPanel
