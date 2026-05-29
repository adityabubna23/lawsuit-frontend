import { create } from 'zustand'
import { modelChatApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

/**
 * Single source of truth for the Legal Eagle AI conversation. BOTH the full
 * page (/app/legal-eagle) and the floating widget subscribe to this store, so
 * they share ONE history live and on reload. Persisted per user-id under the
 * same localStorage key the page used before, so existing chats carry over.
 */
export interface LEMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string // ISO
}

const KEY = (uid: string) => `legalEagle:history:${uid}`

function loadHistory(uid: string): LEMessage[] {
  try {
    const raw = localStorage.getItem(KEY(uid))
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as LEMessage[]) : []
  } catch {
    return []
  }
}
function saveHistory(uid: string, msgs: LEMessage[]) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(msgs))
  } catch {
    /* full / disabled — ignore */
  }
}

function currentUid(): string {
  return useAuthStore.getState().user?.id ?? 'anon'
}

interface LEState {
  uid: string | null
  messages: LEMessage[]
  loading: boolean
  /** Load history for the current user (call on mount). Re-syncs if user changed. */
  hydrate: () => void
  send: (text: string) => Promise<void>
  clear: () => void
}

export const useLegalEagleStore = create<LEState>((set, get) => ({
  uid: null,
  messages: [],
  loading: false,

  hydrate: () => {
    const uid = currentUid()
    if (get().uid === uid) return // already in sync for this user
    set({ uid, messages: loadHistory(uid) })
  },

  send: async (text) => {
    const content = text.trim()
    if (!content || get().loading) return
    const uid = get().uid ?? currentUid()
    const userMsg: LEMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    const next = [...get().messages, userMsg]
    set({ messages: next, loading: true, uid })
    saveHistory(uid, next)

    try {
      const res = await modelChatApi.chatCompletion(next.map((m) => ({ role: m.role, content: m.content })))
      const reply = (res.data?.response as string) || 'I apologize, I was unable to generate a response.'
      const aiMsg: LEMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      }
      const after = [...get().messages, aiMsg]
      set({ messages: after, loading: false })
      saveHistory(uid, after)
    } catch (e: any) {
      const errText = e?.response?.data?.error || e?.message || 'Connection error'
      const aiMsg: LEMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered an error: ${errText}. Please try again.`,
        timestamp: new Date().toISOString(),
      }
      const after = [...get().messages, aiMsg]
      set({ messages: after, loading: false })
      saveHistory(uid, after)
    }
  },

  clear: () => {
    const uid = get().uid ?? currentUid()
    set({ messages: [] })
    try {
      localStorage.removeItem(KEY(uid))
    } catch {
      /* ignore */
    }
  },
}))

export default useLegalEagleStore
