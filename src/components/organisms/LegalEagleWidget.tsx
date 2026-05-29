import { FC, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bird, X, Send, Maximize2, Minimize2, Loader2, Bot, User, Trash2, Scale } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLegalEagleStore } from '@/stores/legalEagleStore'
import { renderLegalEagleContent } from '@/utils/legalEagleMarkdown'

type Mode = 'closed' | 'panel' | 'full'

/**
 * Floating Legal Eagle AI — quick-launch anywhere in the app. Shares the SAME
 * conversation (useLegalEagleStore) and the SAME message rendering as the full
 * /app/legal-eagle page, so history + design/fonts/colors are identical. The
 * expand button blows the panel up to a full-screen view of the same chat.
 */
const LegalEagleWidget: FC = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const messages = useLegalEagleStore((s) => s.messages)
  const loading = useLegalEagleStore((s) => s.loading)
  const send = useLegalEagleStore((s) => s.send)
  const clear = useLegalEagleStore((s) => s.clear)
  const hydrate = useLegalEagleStore((s) => s.hydrate)

  const [mode, setMode] = useState<Mode>('closed')
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { hydrate() }, [hydrate])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, mode])

  if (!user?.id) return null

  const submit = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await send(text)
  }
  const clearChat = () => {
    if (!confirm('Clear all chat history with Legal Eagle? This cannot be undone.')) return
    clear()
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

  // Shared message list (identical rendering to the full page).
  const messageList = (
    <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 bg-gray-50 ${isFull ? 'space-y-6' : 'space-y-4'}`}>
      <div className={isFull ? 'max-w-4xl mx-auto' : ''}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-gray-600 max-w-xs">{t('legalEagle.greeting')}</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 mb-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary text-white' : 'bg-midnight text-white'}`}>
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`min-w-0 max-w-[82%] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-2 mb-1 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <span className="font-semibold text-midnight text-xs">{m.role === 'user' ? 'You' : 'Legal AI'}</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`text-sm text-gray-700 inline-block text-left ${m.role === 'user' ? 'bg-primary text-white rounded-xl rounded-tr-sm px-3 py-2' : 'bg-white border border-gray-200 rounded-xl rounded-tl-sm px-3 py-2'}`}>
                {renderLegalEagleContent(m.content, m.role === 'user')}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 flex-row">
            <div className="w-8 h-8 rounded-lg bg-midnight text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl rounded-tl-sm px-3 py-2 inline-flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="text-xs text-gray-500">{t('legalEagle.thinking')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const inputBar = (
    <div className="border-t border-gray-100 p-2">
      <div className={isFull ? 'max-w-4xl mx-auto' : ''}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            rows={1}
            placeholder={t('legalEagle.placeholder')}
            className="flex-1 resize-none max-h-28 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            onClick={() => void submit()}
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-midnight transition-colors disabled:opacity-50"
            title={t('legalEagle.send')}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">{t('legalEagle.disclaimer')}</p>
      </div>
    </div>
  )

  const header = (
    <div className="bg-gradient-to-br from-primary to-[#0a3d50] text-white px-4 py-3 flex items-center gap-2">
      <Bird className="w-5 h-5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight">{t('legalEagle.title')}</div>
        <div className="text-[11px] text-white/70 leading-tight">{t('legalEagle.subtitle')}</div>
      </div>
      {messages.length > 0 && (
        <button onClick={clearChat} title="Clear chat" className="p-1.5 rounded-lg hover:bg-white/15">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
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
  )

  return (
    <div
      className={isFull ? 'fixed inset-0 z-[95] bg-black/40 flex items-stretch justify-center p-0 sm:p-6' : 'fixed bottom-5 right-5 z-[95]'}
      onClick={isFull ? () => setMode('panel') : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          isFull
            ? 'bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden'
            : 'bg-white w-[92vw] max-w-sm h-[34rem] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200'
        }
      >
        {header}
        {messageList}
        {inputBar}
      </div>
    </div>
  )
}

export default LegalEagleWidget
