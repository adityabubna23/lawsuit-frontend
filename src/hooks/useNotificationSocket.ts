import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import socketService from '@/services/socketService'

/**
 * Bootstraps socket connection + notification listeners.
 * Call this once at the root of every authenticated layout (AppLayout, LawyerLayout, AdminLayout).
 * It connects the socket when a token exists, wires up real-time notification events,
 * and fetches the initial unread count from the REST API.
 * Cleans up on unmount / logout.
 */
export function useNotificationSocket() {
  const token = useAuthStore((s) => s.token)
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications)
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount)
  const initSocketListeners = useNotificationStore((s) => s.initSocketListeners)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!token) {
      // No auth → tear down
      socketService.disconnect()
      cleanupRef.current?.()
      cleanupRef.current = null
      return
    }

    // Connect socket (idempotent – returns existing socket if already connected)
    socketService.connect()

    // Wire notification listeners
    cleanupRef.current = initSocketListeners()

    // Fetch initial data from REST
    fetchUnreadCount()
    fetchNotifications()

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])
}

export default useNotificationSocket
