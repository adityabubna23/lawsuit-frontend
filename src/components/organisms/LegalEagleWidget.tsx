import { FC, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bird, X, Send, Maximize2, Minimize2, Loader2 } from 'lucide-react'
import { modelChatApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

type Msg = { role: 'user' | 'assistant'; content: string }
type Mode = 'closed' | 'panel' | 'full'

/**
 * Floating Legal Eagle AI launcher (bottom-right, global). Click the badge to
 * open a compact chat panel on the right; the expand button blows it up to a
 * full-screen chat. Reuses the moderated /model/chat backend (Legal-Eagle
 * persona is injected server-side). Only shown to authenticated users.
 */
const LegalEagleWidget: FC = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [mode, setMode] = useState<Mode>('closed')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  if (!user?.id) return null // AI chat needs an authenticated session

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    setBusy(true)
    try {
      const res = await modelChatApi.chatCompletion(next.map((m) => ({ role: m.role, content: m.content })))
      // Server returns { response, model, usage } — `response` is the reply text.
      const reply = (res.data?.response ?? res.data?.reply ?? res.data?.message ?? '') as string
      setMessages((m) => [...m, { role: 'assistant', content: typeof reply === 'string' && reply ? reply : t('common.error') }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: t('common.error') }])
    } finally {
      setBusy(false)
    }
  }

  // ── Collapsed launcher ──
  if (mode === 'closed') {
    return (
      <button
        onClick={() => setMode('panel')}
        title={t('legalEagle.open')}
        aria-label={t('legalEagle.open')}
        className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 pl-3 pr-4 py-3 rounded-full bg-gradient-to-br from-primary to-[#0a3d50] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
      >
        <Bird className="w-5 h-5" />
        <span className="text-sm font-semibold hidden sm:inline">{t('legalEagle.title')}</span>
      </button>
    )
  }

  const isFull = mode === 'full'

  return (
    <div
      className={
        isFull
          ? 'fixed inset-0 z-[95] bg-black/40 flex items-stretch justify-center p-0 sm:p-6'
          : 'fixed bottom-5 right-5 z-[95]'
      }
      onClick={isFull ? () => setMode('panel') : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          isFull
            ? 'bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden'
            : 'bg-white w-[92vw] max-w-sm h-[32rem] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200'
        }
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-4 py-3 flex items-center gap-2">
          <Bird className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight">{t('legalEagle.title')}</div>
            <div className="text-[11px] text-white/70 leading-tight">{t('legalEagle.subtitle')}</div>
          </div>
          <button
            onClick={() => setMode(isFull ? 'panel' : 'full')}
            title={isFull ? t('legalEagle.minimize') : t('legalEagle.expand')}
            className="p-1.5 rounded-lg hover:bg-white/15"
          >
            {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setMode('closed')} title={t('legalEagle.close')} className="p-1.5 rounded-lg hover:bg-white/15">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-sm text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
              {t('legalEagle.greeting')}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-500 inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('legalEagle.thinking')}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-2">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              placeholder={t('legalEagle.placeholder')}
              className="flex-1 resize-none max-h-28 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={() => void send()}
              disabled={busy || !input.trim()}
              className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              title={t('legalEagle.send')}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">{t('legalEagle.disclaimer')}</p>
        </div>
      </div>
    </div>
  )
}

export default LegalEagleWidget
