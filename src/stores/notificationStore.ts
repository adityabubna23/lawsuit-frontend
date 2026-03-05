import { create } from 'zustand'
import type { Notification, NotificationListResponse } from '@/types'
import { notificationsApi } from '@/services/api'
import socketService from '@/services/socketService'

interface NotificationState {
  /** Paginated notifications loaded from the REST API */
  notifications: Notification[]
  /** Total number of notifications (from server) */
  total: number
  /** Server-reported unread badge count */
  unreadCount: number
  /** Current page for infinite scrolling */
  page: number
  /** Whether more pages exist */
  hasMore: boolean
  isLoading: boolean

  /** Toast message shown for real-time push notifications */
  toast: string | null
  clearToast: () => void

  /** Fetch first page of notifications (reset) */
  fetchNotifications: () => Promise<void>
  /** Fetch next page (append) */
  fetchNextPage: () => Promise<void>
  /** Fetch just the unread badge count */
  fetchUnreadCount: () => Promise<void>
  /** Mark a single notification read */
  markRead: (id: string) => Promise<void>
  /** Mark all notifications read */
  markAllRead: () => Promise<void>
  /** Delete a notification */
  deleteNotification: (id: string) => Promise<void>

  /** Add a notification received via the socket (real-time) */
  pushNotification: (notification: Notification) => void
  /** Set unread count (from socket event) */
  setUnreadCount: (count: number) => void

  /** Connect socket listeners – call once when the layout mounts */
  initSocketListeners: () => () => void
}

const PAGE_LIMIT = 20

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  total: 0,
  unreadCount: 0,
  page: 1,
  hasMore: true,
  isLoading: false,
  toast: null,

  clearToast: () => set({ toast: null }),

  // ── REST actions ──────────────────────────────────────────────────

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const res = await notificationsApi.getAll({ page: 1, limit: PAGE_LIMIT })
      const data: NotificationListResponse = res.data
      set({
        notifications: data.items,
        total: data.total,
        unreadCount: data.unreadCount,
        page: 1,
        hasMore: data.items.length < data.total,
      })
    } catch {
      // silent
    } finally {
      set({ isLoading: false })
    }
  },

  fetchNextPage: async () => {
    const { page, hasMore, isLoading } = get()
    if (!hasMore || isLoading) return
    const nextPage = page + 1
    set({ isLoading: true })
    try {
      const res = await notificationsApi.getAll({ page: nextPage, limit: PAGE_LIMIT })
      const data: NotificationListResponse = res.data
      set((s) => ({
        notifications: [...s.notifications, ...data.items],
        total: data.total,
        unreadCount: data.unreadCount,
        page: nextPage,
        hasMore: s.notifications.length + data.items.length < data.total,
      }))
    } catch {
      // silent
    } finally {
      set({ isLoading: false })
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.getUnreadCount()
      set({ unreadCount: res.data.unreadCount })
    } catch {
      // silent
    }
  },

  markRead: async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    } catch {
      // silent
    }
  },

  markAllRead: async () => {
    try {
      await notificationsApi.markAllRead()
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
        unreadCount: 0,
      }))
    } catch {
      // silent
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await notificationsApi.delete(id)
      set((s) => {
        const removed = s.notifications.find((n) => n.id === id)
        return {
          notifications: s.notifications.filter((n) => n.id !== id),
          total: s.total - 1,
          unreadCount: removed && !removed.isRead ? s.unreadCount - 1 : s.unreadCount,
        }
      })
    } catch {
      // silent
    }
  },

  // ── Socket (real-time) ────────────────────────────────────────────

  pushNotification: (notification: Notification) => {
    set((s) => ({
      notifications: [notification, ...s.notifications],
      total: s.total + 1,
      unreadCount: s.unreadCount + 1,
      toast: notification.title,
    }))
    // auto-clear toast after 4 seconds
    setTimeout(() => set({ toast: null }), 4000)
  },

  setUnreadCount: (count: number) => {
    set({ unreadCount: count })
  },

  initSocketListeners: () => {
    const { pushNotification, setUnreadCount } = get()

    // Ensure socket is connected
    socketService.connect()

    const unsubNotification = socketService.onNotification((notification) => {
      pushNotification(notification)
    })

    const unsubUnreadCount = socketService.onUnreadCountUpdate(({ unreadCount }) => {
      setUnreadCount(unreadCount)
    })

    // Return cleanup function
    return () => {
      unsubNotification()
      unsubUnreadCount()
    }
  },
}))

export default useNotificationStore
