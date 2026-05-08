import { useEffect } from 'react'
import { fcmApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'

const STORAGE_KEY = 'fcmToken'

/**
 * Registers the browser's FCM token with the backend whenever the user is
 * authenticated. Best-effort: silently no-ops if Firebase Messaging is not
 * initialized on `window.firebase` or if the browser denies notifications.
 *
 * Drop-in usage: call from a top-level layout (already mounted under each
 * authenticated route).
 */
export function useFcmRegistration() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false

    const register = async () => {
      try {
        // Soft-detect Firebase messaging — only register if available.
        // If the app later wires Firebase, the registration will start working.
        const fb: any = (window as any).firebase
        if (!fb || !fb.messaging) return

        const messaging = fb.messaging()
        if (!('Notification' in window)) return
        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission()
        if (permission !== 'granted') return

        const token: string = await messaging.getToken()
        if (!token || cancelled) return

        const previous = localStorage.getItem(STORAGE_KEY)
        if (previous === token) return

        await fcmApi.register(token)
        localStorage.setItem(STORAGE_KEY, token)
      } catch {
        // ignore — push is non-critical
      }
    }

    register()
    return () => { cancelled = true }
  }, [isAuthenticated])

  // Cleanup on logout — wrap the auth store's logout via a watcher
  useEffect(() => {
    if (isAuthenticated) return
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) return
    fcmApi.remove(token).catch(() => { })
    localStorage.removeItem(STORAGE_KEY)
  }, [isAuthenticated])
}

export default useFcmRegistration
