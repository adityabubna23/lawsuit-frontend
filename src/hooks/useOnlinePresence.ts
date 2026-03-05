import { useState, useEffect, useCallback } from 'react'
import socketService from '@/services/socketService'

/**
 * Hook that provides a live Set of online user IDs via the socket.
 *
 * Usage:
 * ```tsx
 * const { isOnline, onlineUsers } = useOnlinePresence()
 * isOnline('userId_123') // boolean
 * ```
 */
export function useOnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(
    () => new Set(socketService.getOnlineUsers()),
  )

  useEffect(() => {
    // Bulk update on first connect
    const unsubBulk = socketService.onOnlineStatusUpdate(({ usersOnline }) => {
      setOnlineUsers(new Set(usersOnline))
    })

    // Individual online/offline events
    const unsubUser = socketService.onUserStatusChange(({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (online) next.add(userId)
        else next.delete(userId)
        return next
      })
    })

    return () => {
      unsubBulk()
      unsubUser()
    }
  }, [])

  const isOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers],
  )

  return { onlineUsers, isOnline }
}

export default useOnlinePresence
