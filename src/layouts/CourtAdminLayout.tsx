import { FC, useState, useRef, useEffect, useMemo } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Bell,
  ShieldCheck,
  Building2,
  Coins,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  Gavel,
  X,
} from 'lucide-react'
import { useCourtAdminStore } from '../stores/courtAdminStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import NotificationModal from '../components/molecules/NotificationModal'
import LanguageSwitcher from '../components/molecules/LanguageSwitcher'
import ErrorBoundary from '../components/organisms/ErrorBoundary'
import { useIsMobile } from '../hooks/useMediaQuery'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/court-admin/dashboard', label: 'Lawyer verifications', icon: ShieldCheck },
  { to: '/court-admin/organization-verifications', label: 'Organization verifications', icon: Building2 },
  { to: '/court-admin/salary', label: 'Salary', icon: Coins },
  { to: '/court-admin/profile', label: 'Profile', icon: UserIcon },
]

/**
 * Court Admin shell.
 *
 * Visual language: dark slate→indigo sidebar mirroring the
 * `/auth/court-admin-login` page so the whole administrative surface
 * reads as one platform. Content area stays light for legibility of
 * data tables and forms.
 */
const CourtAdminLayout: FC = () => {
  // `collapsedState` is the desktop rail toggle. On mobile the sidebar becomes
  // an off-canvas drawer (`mobileOpen`) and is never "collapsed", so the
  // effective `collapsed` below is forced false on small screens.
  const [collapsedState, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { logout, user } = useCourtAdminStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const location = useLocation()
  const navigate = useNavigate()
  const profileRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const collapsed = collapsedState && !isMobile

  useNotificationSocket()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/auth/court-admin-login')
  }

  const pageTitle = useMemo(() => {
    const match = NAV_ITEMS.find((it) => location.pathname.startsWith(it.to))
    return match?.label ?? 'Court Admin'
  }, [location.pathname])

  const initials = (user?.name || user?.email || 'C').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ───── Sidebar (dark platform theme) ─────
          Desktop: sticky in-flow rail (collapsible). Mobile (<md): fixed
          off-canvas drawer that slides in when `mobileOpen` is set. */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-r border-slate-800 transition-all duration-200 flex flex-col fixed md:sticky top-0 left-0 z-50 h-screen ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
          <Link
            to="/court-admin/dashboard"
            title="Court Admin"
            className="flex items-center gap-2.5 rounded-md hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-900/30">
              <Gavel className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-white">
                  Nyaya<span className="text-amber-400">X</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-medium">Court Admin</span>
              </div>
            )}
          </Link>
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((s) => !s)}
            className="hidden md:block p-1 rounded-md hover:bg-white/10 text-white/60"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 rounded-md hover:bg-white/10 text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-amber-400" />
                    )}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-white/60 group-hover:text-white'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar footer / user card */}
        <div className="border-t border-white/10 p-3">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title={user?.name || 'Profile'}
              className="w-full flex items-center justify-center p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold ring-2 ring-white/20 shadow-sm">
                {initials}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">
                  {user?.name || 'Court admin'}
                </div>
                <div className="text-[10px] text-white/60 truncate">{user?.email || ''}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-md text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───── Main column ───── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-600"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-gray-400">Court Admin</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageSwitcher />

              {/* Notification bell */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-red-600 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile menu */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                    {initials}
                  </div>
                  <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                    Court
                  </span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Court admin'}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                      <span className="mt-2 inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        Court Admin
                      </span>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/court-admin/profile') }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      >
                        My Profile
                      </button>
                    </div>
                    <div className="border-t border-gray-100 p-1">
                      <button
                        onClick={() => { setProfileOpen(false); handleLogout() }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary scope="court-admin page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <NotificationModal open={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  )
}

export default CourtAdminLayout
