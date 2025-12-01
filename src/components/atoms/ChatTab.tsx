import { FC, useEffect, useState, useRef } from 'react'
import { chatApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

interface Message {
  id: string
  text: string
  senderId: string
  createdAt: string
  senderName?: string
}

interface ChatTabProps {
  chatId?: string
  onClose?: () => void
  caseId?: string
}

const ChatTab: FC<ChatTabProps> = ({ chatId, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const isFirstLoad = useRef(true)
  const authUserId = useAuthStore((s) => s.user?.id)

  // Prevent background scrolling while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow || ''
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!chatId) return
      setLoading(true)
      try {
        const res = await chatApi.getMessages(chatId)
        const data = (res as any).data ?? res
        const msgsRaw = Array.isArray(data) ? data : data.messages || data.items || data.data || []
        const normalized = msgsRaw.map((m: any) => ({
          id: m.id,
          text: m.text,
          senderId: m.senderId || m.userId || m.user?.id || '',
          createdAt: m.createdAt || m.created_at || new Date().toISOString(),
          senderName: m.senderName || m.user?.name || m.senderName,
        }))
        // sort ascending (oldest first)
        normalized.sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        if (mounted) setMessages(normalized)
      } catch (err) {
        console.error('Failed to load messages', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [chatId])

  const send = async () => {
    if (!text.trim()) return
    try {
      if (!chatId) {
        console.warn('Cannot send message: no chatId')
        return
      }
      const res = await chatApi.sendMessage(chatId, { text: text.trim() })
      const msg = (res as any).data?.message ?? (res as any).message
      if (msg) setMessages((s) => [...s, { id: msg.id, text: msg.text, senderId: msg.senderId || msg.userId || '', createdAt: msg.createdAt || new Date().toISOString(), senderName: msg.senderName || msg.user?.name }])
      setText('')
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }

  // Scroll to bottom when messages change. Use 'auto' for the first load and 'smooth' afterwards.
  useEffect(() => {
    const el = messagesRef.current
    if (!el) return
    const behavior: ScrollBehavior = isFirstLoad.current ? 'auto' : 'smooth'
    // small timeout to ensure DOM painted
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

  return (
    // Parent should control the modal size. This component will fill available space.
    <div className="w-full h-full bg-white rounded-lg shadow-lg flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="font-semibold">Chat</div>
        <div>
          <button onClick={onClose} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Close</button>
        </div>
      </div>

      {/* Use min-h-0 so flex children with overflow can shrink correctly */}
      <div className="p-4 h-full min-h-0 flex flex-col">
        {/* Messages Area - Takes remaining space, scrollable */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
          {loading ? (
            <div className="text-sm text-gray-500">Loading messages…</div>
          ) : (
            messages.map((m) => {
              const isMine = !!authUserId && m.senderId === authUserId
              return (
                <div key={m.id} className={`max-w-[70%] ${isMine ? 'ml-auto bg-primary text-white' : 'bg-gray-100 text-gray-800'} px-4 py-2 rounded-lg`}>
                  <div className="text-sm">{m.text}</div>
                  <div className="text-xs opacity-70 mt-1">{new Date(m.createdAt).toLocaleString()}</div>
                </div>
              )
            })
          )}
        </div>

  {/* Input Bar - pinned to bottom of this container */}
  <div className="flex gap-2 flex-none">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
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
