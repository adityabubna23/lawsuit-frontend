import { FC, useEffect } from 'react'
import { useNotificationStore } from '../../stores/notificationStore'

const NotificationModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { notifications, fetchNotifications, markRead, markAll, isLoading } = useNotificationStore()

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <aside className="w-96 bg-white shadow-xl border-l">
        <div className="p-4 flex items-center justify-between border-b">
          <h3 className="text-lg font-medium">Notifications</h3>
          <div className="flex items-center gap-3">
            {notifications.some(n => !n.read) && (
              <button
                className="text-sm text-primary"
                onClick={async () => { await markAll() }}
              >
                Mark all read
              </button>
            )}
            <button className="text-sm text-primary" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="p-4 space-y-3 overflow-auto" style={{ maxHeight: '80vh' }}>
          {isLoading && <div className="text-sm text-gray-500">Loading...</div>}
          {!isLoading && notifications.length === 0 && (
            <div className="text-sm text-gray-500">No notifications</div>
          )}

          {notifications.map((n) => (
            <div key={n.id} className="p-3 rounded-md bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-800">{n.title}</div>
                  {n.body && <div className="text-sm text-gray-600">{n.body}</div>}
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="ml-3 text-sm text-primary"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default NotificationModal
