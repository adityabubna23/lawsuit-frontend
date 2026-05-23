import { FC, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuthStore } from '@/stores/authStore'
import NotificationItem from '@/components/atoms/NotificationItem'
import { useOrganizationStore } from '@/stores/organizationStore'
import { startOrgRequestRazorpayCheckout } from '@/services/orgPaymentFlow'
import type { Notification } from '@/types'

const NotificationModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate()
  const {
    notifications,
    fetchNotifications,
    fetchNextPage,
    markRead,
    markAllRead,
    deleteNotification,
    isLoading,
    hasMore,
    unreadCount,
  } = useNotificationStore()

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open])

  // Infinite scroll inside the panel
  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      fetchNextPage()
    }
  }, [fetchNextPage])

  // Resolve which path prefix to send the user to based on their role.
  // Without this, a LAWYER clicking a case notification got bounced to /app/...
  // (a client URL) which silently 404'd inside the lawyer layout — that was
  // the user-reported "notification doesn't redirect" bug.
  //
  // Court admins use a separate auth store (`useCourtAdminStore`), but that
  // store writes the user record into the same shared `storage.getUserData()`
  // slot that `useAuthStore` reads from, so reading the role from authStore
  // here works for them too. The COURT_ADMIN branch was missing — without it
  // court admins were silently routed to /app/... (client paths) that don't
  // exist in their layout.
  const role = useAuthStore((s) => s.user?.role) ?? 'CLIENT'
  const rolePrefix =
    role === 'LAWYER' ? '/lawyer'
      : role === 'ORGANIZATION' ? '/organization'
        : role === 'ADMIN' ? '/admin'
          : role === 'COURT_ADMIN' ? '/court-admin'
            : '/app'

  // Where to send the user when nothing more specific matches — the role's
  // landing page. Guarantees clicking ANY notification navigates somewhere
  // (never a dead click), which is the behaviour the product requires.
  const roleHome =
    role === 'LAWYER' ? '/lawyer/dashboard'
      : role === 'ORGANIZATION' ? '/organization/dashboard'
        : role === 'ADMIN' ? '/admin/dashboard'
          : role === 'COURT_ADMIN' ? '/court-admin/dashboard'
            : '/app/home'

  // Map a notification onto a concrete route. ALWAYS returns a destination so
  // clicking any notification navigates somewhere sensible — falling back to
  // the role's home when nothing more specific matches (never a dead click).
  const resolveRoute = (n: Notification): string => {
    const { data = {}, type } = n
    const t = String(type || '').toUpperCase()
    const anyData = data as any

    // Court-admin-specific routing — these notifications only fire for
    // COURT_ADMIN users, so we send them straight to the relevant queue
    // regardless of the global rolePrefix logic below.
    if (role === 'COURT_ADMIN') {
      if (anyData?.lawyerId && (t === 'CASE_UPDATE' || t.includes('VERIFICATION') || t.includes('LAWYER'))) {
        return `/court-admin/verify/${anyData.lawyerId}`
      }
      if (anyData?.organizationId && (t === 'CASE_UPDATE' || t.includes('VERIFICATION') || t.includes('ORG'))) {
        return '/court-admin/organization-verifications'
      }
      if (t.includes('SALARY')) return '/court-admin/salary'
      // The court admin's own authorization status lives on their profile.
      if (t.includes('COURT_ADMIN') || t.includes('AUTHORIZ')) return '/court-admin/profile'
    }

    // Admin reviewing a court-admin authorization request.
    if (role === 'ADMIN' && t === 'COURT_ADMIN_AUTHORIZATION_PENDING') return '/admin/court-admins'

    // Organisation flows live at fixed paths regardless of caller role.
    if (t === 'ORGANIZATION_VERIFIED') return '/organization/dashboard'
    if (t === 'ORGANIZATION_REJECTED') return '/organization/verification'
    if (t === 'ORG_APPOINTMENT_REQUEST_RECEIVED') return '/organization/requests'
    if (t === 'ORG_APPOINTMENT_REQUEST_REJECTED') return '/app/appointments?view=firm'
    // (ORG_APPOINTMENT_REQUEST_ASSIGNED opens Razorpay inline — handled in
    //  handleNotificationClick, not here.)

    // Mediation INVITE → the public accept page. The invitee is NOT a
    // mediation participant yet, so routing them to the mediation detail page
    // 404s (the read query gates on participant membership). Must come BEFORE
    // the generic mediationId branch below.
    if (t === 'MEDIATION_INVITE' && anyData?.token) {
      return `/mediation/invite/${encodeURIComponent(String(anyData.token))}`
    }

    // Chat → open the conversation (or the chat list if no id).
    if (t === 'NEW_MESSAGE' || data.chatId) {
      return data.chatId ? `${rolePrefix}/chats?chatId=${data.chatId}` : `${rolePrefix}/chats`
    }

    // Live video / incoming call → the consultation room.
    if ((t === 'INCOMING_CALL' || t === 'VIDEO_CALL') && data.appointmentId) {
      return `${rolePrefix}/consultation/${data.appointmentId}`
    }

    // Appointment / consultation events → the right appointment (or the list).
    if (
      data.appointmentId ||
      t.startsWith('APPOINTMENT_') ||
      t === 'CONSULTATION_COMPLETED' ||
      t === 'VIDEO_CALL'
    ) {
      return data.appointmentId
        ? `${rolePrefix}/appointments?id=${data.appointmentId}`
        : `${rolePrefix}/appointments`
    }

    // Case / task / hearing / document → case detail page (singular `case`).
    if (
      data.caseId ||
      t === 'CASE_UPDATE' ||
      t === 'TASK_ASSIGNED' ||
      t === 'TASK_UPDATED' ||
      t === 'CASE_CLOSED' ||
      t === 'HEARING_SCHEDULED' ||
      t === 'DOCUMENT_UPLOADED' ||
      t === 'TIMELINE_EVENT_ADDED'
    ) {
      return data.caseId ? `${rolePrefix}/case/${data.caseId}` : `${rolePrefix}/cases`
    }

    // Mediation events → the canonical mediation detail page (singular path;
    // the plural `mediations/:id` route just redirects here anyway).
    // `mediationId` is loose-typed in the payload (cast via anyData above).
    if (anyData?.mediationId) {
      return `${rolePrefix}/mediation/${anyData.mediationId}`
    }
    // Mediation notification without an id → the mediations list. Only the
    // client and lawyer layouts mount a mediations page.
    if (t.startsWith('MEDIATION_') && (rolePrefix === '/app' || rolePrefix === '/lawyer')) {
      return `${rolePrefix}/mediations`
    }

    // Payment / wallet movements → wallet page.
    if (t === 'WALLET_CREDIT' || t === 'WALLET_DEBIT' || t === 'PAYMENT_RECEIVED') {
      return `${rolePrefix}/wallet`
    }

    // Review received → the lawyer's public profile.
    if (t === 'REVIEW_RECEIVED' && rolePrefix === '/lawyer') return '/lawyer/profile'

    // Nothing more specific matched → role home (never a dead click).
    return roleHome
  }

  const handleNotificationClick = async (n: Notification) => {
    const { data = {}, type } = n
    const t = String(type || '').toUpperCase()

    // Special-case: org assignment opens Razorpay inline rather than navigating.
    if (t === 'ORG_APPOINTMENT_REQUEST_ASSIGNED') {
      try {
        await useOrganizationStore.getState().fetchMyRequests()
        const requestId = data.requestId
        const req = useOrganizationStore.getState().myRequests.find((r) => r.id === requestId)
        const user = useAuthStore.getState().user
        if (req) {
          await startOrgRequestRazorpayCheckout({
            request: req,
            prefill: {
              name: user?.name,
              email: (user as any)?.email,
              contact: String((user as any)?.phone ?? ''),
            },
            onSuccess: () => {
              useOrganizationStore.getState().fetchMyRequests().catch(() => { })
            },
          })
        } else {
          navigate('/app/firms-requests')
        }
      } catch {
        navigate('/app/firms-requests')
      }
      onClose()
      return
    }

    // Generic routing for all other types.
    const target = resolveRoute(n)
    if (target) navigate(target)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Side panel */}
      <aside className="w-full max-w-md bg-white shadow-xl border-l animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => markAllRead()}
              >
                Mark all read
              </button>
            )}
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-2 py-2 space-y-1"
          onScroll={handleScroll}
        >
          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg className="w-16 h-16 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm">No notifications yet</p>
            </div>
          )}

          {notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={markRead}
              onDelete={deleteNotification}
              onClick={handleNotificationClick}
            />
          ))}

          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!hasMore && notifications.length > 0 && (
            <p className="text-center text-xs text-gray-400 py-3">You're all caught up</p>
          )}
        </div>
      </aside>
    </div>
  )
}

export default NotificationModal
