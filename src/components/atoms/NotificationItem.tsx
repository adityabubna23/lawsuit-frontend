import { FC } from 'react'
import type { Notification, NotificationType } from '@/types'

// ── Icon per notification type ─────────────────────────────────────

const typeIcons: Record<NotificationType, string> = {
  APPOINTMENT_BOOKED: '📅',
  APPOINTMENT_CONFIRMED: '✅',
  APPOINTMENT_CANCELLED: '❌',
  APPOINTMENT_REMINDER: '⏰',
  APPOINTMENT_RESCHEDULED: '🔄',
  NEW_MESSAGE: '💬',
  PAYMENT_RECEIVED: '💰',
  WALLET_CREDIT: '💳',
  WALLET_DEBIT: '💸',
  CONSULTATION_COMPLETED: '🎉',
  REVIEW_RECEIVED: '⭐',
  CASE_UPDATE: '📋',
  DOCUMENT_UPLOADED: '📄',
  VIDEO_CALL: '📹',
  TASK_ASSIGNED: '📌',
  ORGANIZATION_VERIFIED: '🏛️',
  ORGANIZATION_REJECTED: '⚠️',
  ORG_APPOINTMENT_REQUEST_RECEIVED: '📥',
  ORG_APPOINTMENT_REQUEST_ASSIGNED: '👤',
  ORG_APPOINTMENT_REQUEST_REJECTED: '🚫',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

interface Props {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onClick?: (notification: Notification) => void
}

const NotificationItem: FC<Props> = ({ notification, onMarkRead, onDelete, onClick }) => {
  const icon = typeIcons[notification.type] ?? '🔔'

  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
      }`}
      onClick={() => {
        if (!notification.isRead) onMarkRead(notification.id)
        onClick?.(notification)
      }}
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.isRead && (
          <button
            title="Mark as read"
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(notification.id)
            }}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-blue-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          title="Delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <span className="absolute right-3 top-3 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </div>
  )
}

export default NotificationItem
