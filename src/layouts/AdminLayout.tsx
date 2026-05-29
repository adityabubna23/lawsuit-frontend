import { FC, useState, useMemo, useRef, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, ShieldAlert, Banknote, Coins, Wallet,
  Landmark, UserCog, ShieldCheck, Megaphone, Newspaper, Bug,
  ScrollText, FileText, ChevronLeft, ChevronRight, Bell, Menu,
  LogOut, Search, Briefcase, Building2, X,
} from 'lucide-react'
import LanguageSwitcher from '../components/molecules/LanguageSwitcher'
import NotificationModal from '../components/molecules/NotificationModal'
import NotificationToast from '../components/atoms/NotificationToast'
import ErrorBoundary from '../components/organisms/ErrorBoundary'
import { useNotificationStore } from '../stores/notificationStore'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import { useAuthStore } from '../stores/authStore'
import { useIsMobile } from '../hooks/useMediaQuery'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  heading: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: '/admin/lawyers', label: 'Lawyers', icon: Briefcase },
      { to: '/admin/organizations', label: 'Organizations', icon: Building2 },
      { to: '/admin/moderation', label: 'Moderation', icon: ShieldAlert },
      { to: '/admin/court-admins', label: 'Court Admins', icon: UserCog },
      { to: '/admin/team', label: 'Admin Team', icon: ShieldCheck },
    ],
  },
  {
    heading: 'Finance',
    items: [
      { to: '/admin/payouts', label: 'Payouts & Escrow', icon: Banknote },
      { to: '/admin/salary', label: 'Salary', icon: Coins },
      { to: '/admin/wallets', label: 'Platform Wallet', icon: Wallet },
      { to: '/admin/bank-accounts', label: 'Bank Accounts', icon: Building2 },
    ],
  },
  {
    heading: 'Platform',
    items: [
      { to: '/admin/courts', label: 'Courts', icon: Landmark },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/admin/legal-updates', label: 'Legal Updates', icon: Newspaper },
      { to: '/admin/templates', label: 'Templates', icon: FileText },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/admin/reports', label: 'Reports', icon: Bug },
      { to: '/admin/consents', label: 'Consent Audit', icon: ShieldCheck },
      { to: '/admin/compliance', label: 'Compliance', icon: ScrollText },
      { to: '/admin/settings', label: 'Settings & Audit', icon: ScrollText },
    ],
  },
]

const ALL_ITEMS = SECTIONS.flatMap((s) => s.items)

const AdminLayout: FC = () => {
  // `collapsedState` is the desktop rail toggle. On mobile the sidebar becomes
  // an off-canvas drawer (`mobileOpen`) and is never "collapsed", so the
  // effective `collapsed` below is forced false on small screens — keeping
  // full labels + full width inside the drawer.
  const [collapsedState, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const profileRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const collapsed = collapsedState && !isMobile

  useNotificationSocket()

  // Close the mobile drawer whenever the route changes (a nav item was tapped)
  // so it doesn't stay open over the freshly navigated page.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close profile dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Derive page title for the top bar from the current route
  const pageTitle = useMemo(() => {
    const match = ALL_ITEMS.find((it) => location.pathname.startsWith(it.to))
    return match?.label ?? 'Admin'
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  const adminLevel = (user as any)?.level || (user?.role === 'ADMIN' ? 'ADMIN' : '')
  const initials = (user?.name || user?.email || 'A').charAt(0).toUpperCase()

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

      {/* ───── Sidebar (dark platform theme — mirrors /auth admin pages) ─────
          Desktop: a sticky in-flow rail (collapsible to w-20). Mobile (<md):
          a fixed off-canvas drawer that slides in when `mobileOpen` is set. */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-r border-slate-800 transition-all duration-200 flex flex-col fixed md:sticky top-0 left-0 z-50 h-screen ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
          <Link
            to="/admin/dashboard"
            title="Go to dashboard"
            className="flex items-center gap-2.5 rounded-md hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold shadow-lg shadow-indigo-900/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-white">
                  Nyaya<span className="text-amber-400">X</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-medium">Super Admin</span>
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
        <nav className="flex-1 overflow-y-auto py-3">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="mb-3">
              {!collapsed && (
                <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {section.heading}
                </div>
              )}
              {collapsed && (
                <div className="mx-3 my-2 border-t border-white/10" />
              )}
              <div className="px-2 space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive
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
              </div>
            </div>
          ))}
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
                  {user?.name || 'Admin user'}
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
                <span className="text-gray-400">Admin</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                <span className="font-semibold text-gray-900 truncate">{pageTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Search shortcut (decorative — opens nothing yet, but signals the surface) */}
              <button
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50"
                onClick={() => navigate('/admin/lawyers')}
                title="Quick search"
              >
                <Search className="w-3.5 h-3.5" />
                Search users
              </button>

              <LanguageSwitcher />

              {/* Notification bell */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 rounded-md text-gray-600 hover:bg-gray-100"
                title="Notifications"
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
                  {adminLevel && (
                    <span className={`hidden sm:inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${adminLevel === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {adminLevel === 'SUPER_ADMIN' ? 'Super' : 'Admin'}
                    </span>
                  )}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-40">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Admin user'}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email || ''}</div>
                      {adminLevel && (
                        <span className={`mt-2 inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${adminLevel === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          {adminLevel}
                        </span>
                      )}
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/admin/settings') }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Settings & Audit
                      </button>
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/admin/team') }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Admin Team
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
        <main className="flex-1 overflow-auto">
          <ErrorBoundary scope="admin page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <NotificationModal open={showNotifications} onClose={() => setShowNotifications(false)} />
      <NotificationToast />
    </div>
  )
}

export default AdminLayout
