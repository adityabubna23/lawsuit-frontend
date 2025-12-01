import { create } from 'zustand'
// NOTE: import services lazily inside methods to avoid importing files that use import.meta at module-eval time

interface Notification {
  id: string
  title: string
  body?: string
  read?: boolean
  createdAt: string
}

interface NotificationState {
  notifications: Notification[]
  isLoading: boolean
  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAll: () => Promise<void>
  toast: string | null
  clearToast: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const prev = get().notifications
      const mod = await import('../services/api')
      const res = await mod.notificationsApi.getAll()
      const incoming: Notification[] = res.data.data || []
      set({ notifications: incoming })

      // detect newly added unread notifications and show a small toast for the newest
      const newOnes = incoming.filter(n => !prev.some(p => p.id === n.id) && !n.read)
      if (newOnes.length > 0) {
        const msg = `New: ${newOnes[0].title}`
        set({ toast: msg })
        // auto-clear toast after 3s
        setTimeout(() => set({ toast: null }), 3000)
      }
    } catch (err) {
      // ignore for mock
    } finally {
      set({ isLoading: false })
    }
  },

  markRead: async (id: string) => {
    try {
      const mod = await import('../services/api')
      await mod.notificationsApi.markRead(id)
      set((state) => ({ notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n) }))
    } catch (err) {
      // ignore
    }
  },

  markAll: async () => {
    try {
      const mod = await import('../services/api')
      await mod.notificationsApi.markAll()
      set((state) => ({ notifications: state.notifications.map(n => ({ ...n, read: true })) }))
    } catch (err) {
      // ignore
    }
  },

  toast: null,
  clearToast: () => set({ toast: null }),

  unreadCount: () => {
    return get().notifications.filter(n => !n.read).length
  }
}))

export default useNotificationStore
