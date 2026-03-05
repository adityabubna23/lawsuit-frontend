import { FC } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'

/**
 * Floating toast that shows the title of the latest push notification.
 * Renders in the bottom-right corner and auto-dismisses.
 */
const NotificationToast: FC = () => {
  const toast = useNotificationStore((s) => s.toast)
  const clearToast = useNotificationStore((s) => s.clearToast)

  if (!toast) return null

  return (
    <div className="fixed right-6 bottom-6 z-[60] max-w-sm animate-slide-in-up">
      <div className="flex items-center gap-3 bg-gray-900 text-white pl-4 pr-3 py-3 rounded-lg shadow-lg">
        <span className="text-lg">🔔</span>
        <p className="flex-1 text-sm font-medium">{toast}</p>
        <button
          onClick={clearToast}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default NotificationToast
