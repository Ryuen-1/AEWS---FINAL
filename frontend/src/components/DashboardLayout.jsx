import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Settings, LogOut, HelpCircle, ChevronRight, BookOpen, Users, BarChart2, Clipboard, Activity, ClipboardList, GraduationCap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationsContext'
import NotificationsPopover from './NotificationsPopover'

export default function DashboardLayout({
  title,
  subtitle,
  icon: Icon,
  variant = 'instructor',
  children,
  notificationCount: notificationCountProp = 0,
  navItems = [],
  overrideNavItems = null,
}) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const notificationsApi = useNotifications()
  const notificationCount = notificationsApi ? notificationsApi.getUnreadCount(variant) : notificationCountProp
  const notifications = notificationsApi ? notificationsApi.getNotifications(variant) : []
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef(null)
  const headerRef = useRef(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  const isAdmin = variant === 'admin'
  const isAmuStaff = variant === 'amu-staff'
  const isInstructor = variant === 'instructor'
  const accentBg = isAdmin ? 'bg-gray-700' : isAmuStaff ? 'bg-teal-600' : 'bg-blue-600'
  const accentRing = isAdmin ? 'ring-gray-200' : isAmuStaff ? 'ring-teal-200' : 'ring-blue-200'
  const roleLabel = isAdmin ? 'Admin' : isAmuStaff ? 'AMU Staff' : 'Instructor'
  const roleTheme = isAdmin
    ? {
        accent: '75 85 99',
        accentSoft: '243 244 246',
        accentMist: '248 250 252',
        accentGlow: '203 213 225',
        pageFrom: '#f8fafc',
        pageVia: '#f3f4f6',
        pageTo: '#e5e7eb',
      }
    : isAmuStaff
      ? {
          accent: '13 148 136',
          accentSoft: '204 251 241',
          accentMist: '240 253 250',
          accentGlow: '94 234 212',
          pageFrom: '#f0fdfa',
          pageVia: '#ecfeff',
          pageTo: '#eef2ff',
        }
      : {
          accent: '37 99 235',
          accentSoft: '219 234 254',
          accentMist: '239 246 255',
          accentGlow: '147 197 253',
          pageFrom: '#f8fafc',
          pageVia: '#eff6ff',
          pageTo: '#eef2ff',
        }

  const basePath = variant === 'admin' ? '/admin' : variant === 'amu-staff' ? '/amu-staff' : '/instructor'
  const location = useLocation()
  const onSettingsPage = location.pathname.endsWith('/settings')
  const onActivityLogsPage = location.pathname.endsWith('/activity-logs')
  const onHelpPage = location.pathname.endsWith('/help') || location.pathname.endsWith('/help/')

  const getDefaultNavItems = () => {
    if (variant === 'amu-staff') {
      const activeAmuTab = new URLSearchParams(location.search).get('tab') || 'overview'
      return [
        // AMU Staff: show Overview as primary, then role actions
        { label: 'Overview', icon: BookOpen, onClick: () => navigate(`${basePath}`), active: (location.pathname === `${basePath}` || location.pathname === `${basePath}/`) && !['referrals', 'reports'].includes(activeAmuTab) },
        { label: 'Referrals', icon: Clipboard, onClick: () => navigate(`${basePath}?tab=referrals`), active: location.pathname === `${basePath}` && new URLSearchParams(location.search).get('tab') === 'referrals' },
        { label: 'Needs assessments', icon: Users, onClick: () => navigate(`${basePath}/needs-assessments`), active: location.pathname.startsWith(`${basePath}/needs-assessments`) },
        { label: 'Reports', icon: BarChart2, onClick: () => navigate(`${basePath}?tab=reports`), active: location.pathname === `${basePath}` && new URLSearchParams(location.search).get('tab') === 'reports' },
      ]
    }

    if (variant === 'admin') {
      const activeAdminTab = new URLSearchParams(location.search).get('tab') || 'overview'
      return [
        { label: 'System Overview', icon: BookOpen, onClick: () => navigate(`${basePath}?tab=overview`), active: location.pathname === `${basePath}` && activeAdminTab === 'overview' },
        { label: 'Pending Accounts', icon: Users, onClick: () => navigate(`${basePath}?tab=pending`), active: location.pathname === `${basePath}` && activeAdminTab === 'pending' },
        { label: 'System Analytics', icon: BarChart2, onClick: () => navigate(`${basePath}?tab=analytics`), active: location.pathname === `${basePath}` && activeAdminTab === 'analytics' },
        { label: 'Institution Reports', icon: Clipboard, onClick: () => navigate(`${basePath}?tab=reports`), active: location.pathname === `${basePath}` && activeAdminTab === 'reports' },
        { label: 'User Accounts', icon: Users, onClick: () => navigate(`${basePath}?tab=users`), active: location.pathname === `${basePath}` && activeAdminTab === 'users' },
        { label: 'Student Accounts', icon: GraduationCap, onClick: () => navigate(`${basePath}?tab=students`), active: location.pathname === `${basePath}` && activeAdminTab === 'students' },
        { label: 'Needs Assessment Form', icon: ClipboardList, onClick: () => navigate(`${basePath}/needs-assessment-form`), active: location.pathname === `${basePath}/needs-assessment-form` },
      ]
    }

    // default to instructor (dedicated instructor items) — no Overview
    return [
      { label: 'Classes', icon: BookOpen, onClick: () => navigate(`${basePath}?tab=classes`), active: (location.pathname === `${basePath}` && (new URLSearchParams(location.search).get('tab') || 'classes') === 'classes') || location.pathname.startsWith(`${basePath}/class`) },
      { label: 'Students', icon: Users, onClick: () => navigate(`${basePath}?tab=students`), active: (location.pathname === `${basePath}` && new URLSearchParams(location.search).get('tab') === 'students') || location.pathname.startsWith(`${basePath}/student`) },
      { label: 'Reports', icon: BarChart2, onClick: () => navigate(`${basePath}/reports`), active: location.pathname === `${basePath}/reports` || location.pathname.startsWith(`${basePath}/reports`) },
    ]
  }

  // Determine effective nav items.
  // If on settings/help pages, always use role defaults unless `overrideNavItems` explicitly provided.
  let effectiveNavItems
  if (overrideNavItems && overrideNavItems.length) {
    effectiveNavItems = overrideNavItems
  } else if ((onSettingsPage || onActivityLogsPage || onHelpPage)) {
    effectiveNavItems = getDefaultNavItems()
  } else if (navItems && navItems.length) {
    effectiveNavItems = navItems
  } else {
    effectiveNavItems = getDefaultNavItems()
  }

  // Normalize icons for role-specific items to avoid pages accidentally supplying
  // Explicit role → label → icon map to ensure pages cannot override role icons
  const ROLE_ICON_MAP = {
    'admin': {
      'System Overview': BookOpen,
      'Pending Accounts': Users,
      'System Analytics': BarChart2,
      'Institution Reports': Clipboard,
      'User Accounts': Users,
      'Student Accounts': GraduationCap,
      'Needs Assessment Form': ClipboardList,
      'Activity logs': Activity,
    },
    'amu-staff': {
      Overview: BookOpen,
      Referrals: Clipboard,
      Reports: BarChart2,
      'Needs assessments': Users,
      'Activity logs': Activity,
    },
    'instructor': {
      Classes: BookOpen,
      Students: Users,
      Reports: BarChart2,
      'Activity logs': Activity,
    },
  }

  const roleIcons = ROLE_ICON_MAP[variant] || {}
  const normalizedNavItems = effectiveNavItems.map((it) => ({
    ...it,
    icon: (it.label && roleIcons[it.label]) || it.icon,
  }))
  const activePage = onActivityLogsPage
    ? { label: 'Activity logs', icon: Activity }
    : onSettingsPage
      ? { label: 'Settings', icon: Settings }
      : onHelpPage
        ? { label: 'Help Center', icon: HelpCircle }
        : normalizedNavItems.find((item) => item.active)
  const HeaderIcon = activePage?.icon || Icon
  const headerTitle = activePage?.label || title

  useEffect(() => {
    if (!notificationsOpen) return
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [notificationsOpen])

  useEffect(() => {
    const node = headerRef.current
    if (!node) return

    const updateHeaderHeight = () => {
      setHeaderHeight(node.getBoundingClientRect().height)
    }

    updateHeaderHeight()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeaderHeight)
      return () => window.removeEventListener('resize', updateHeaderHeight)
    }

    const observer = new ResizeObserver(() => updateHeaderHeight())
    observer.observe(node)
    window.addEventListener('resize', updateHeaderHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [navItems.length, headerTitle, subtitle, variant])

  const handleLogout = () => {
    logout()
    navigate('/', {
      replace: true,
      state: { logoutReason: 'You signed out of this tab.' },
    })
  }
  const handleNotificationsClick = (e) => {
    e.stopPropagation()
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)
    if (nextOpen) {
      notificationsApi?.refreshNotifications?.().catch(() => {})
    }
  }
  const handleSettings = () => navigate(`${basePath}/settings`)
  const handleActivityLogs = () => navigate(`${basePath}/activity-logs`)

  // Previously attempted to disable body scroll — removed to avoid 'stuck' behavior.

  const textMuted = isInstructor ? 'text-slate-500' : 'text-gray-500'
  const textPrimary = isInstructor ? 'text-slate-900' : 'text-gray-900'
    const btnActive = isInstructor ? 'bg-slate-100 text-slate-800' : 'bg-gray-100 text-gray-800'
    const roleHomeLabel = isAdmin ? 'System workspace' : isAmuStaff ? 'Support workspace' : 'Teaching workspace'
  const notifBtnClass = isAdmin
    ? 'ui-hover-lift relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200/80 bg-white/90 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
    : isAmuStaff
      ? 'ui-hover-lift relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-teal-200/70 bg-teal-50/50 text-teal-800 hover:bg-teal-100/60 hover:border-teal-300/70 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2'
      : 'ui-hover-lift relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-200/70 bg-blue-50/50 text-blue-800 hover:bg-blue-100/60 hover:border-blue-300/70 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
  const navBtnClassFor = (active = false) => {
    const base = 'ui-hover-lift w-full min-h-[48px] flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-all duration-200'
    if (active) {
      return isAdmin
        ? `${base} border-gray-700 bg-gray-700 text-white shadow-md shadow-gray-700/20`
        : isAmuStaff
          ? `${base} border-teal-600 bg-teal-600 text-white shadow-md shadow-teal-600/20`
          : `${base} border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25`
    }
    return isAdmin
      ? `${base} border-transparent bg-white/40 text-gray-700 hover:bg-gray-100/80 hover:border-gray-400/60 hover:shadow-sm`
      : isAmuStaff
        ? `${base} border-transparent bg-white/40 text-slate-700 hover:bg-teal-50/70 hover:border-teal-300/60 hover:shadow-sm`
        : `${base} border-transparent bg-white/40 text-slate-700 hover:bg-blue-50/70 hover:border-blue-300/60 hover:shadow-sm`
  }

  return (
    <div
      className="h-screen relative dashboard-no-page-scroll overflow-hidden"
      style={{
        '--dashboard-header-height': `${headerHeight}px`,
        '--role-accent': roleTheme.accent,
        '--role-accent-soft': roleTheme.accentSoft,
        '--role-accent-mist': roleTheme.accentMist,
        '--role-accent-glow': roleTheme.accentGlow,
      }}
    >
      <div className="fixed inset-0 -z-10" style={{ top: 0, left: 0, backgroundImage: `linear-gradient(135deg, ${roleTheme.pageFrom}, ${roleTheme.pageVia} 48%, ${roleTheme.pageTo})` }} aria-hidden="true" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(var(--role-accent-soft),0.52),transparent_44%)]" aria-hidden="true" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-[rgb(var(--role-accent-glow))]/20 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-20 w-[28rem] h-[28rem] rounded-full bg-[rgb(var(--role-accent))]/12 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-white/30 blur-3xl" aria-hidden="true" />
      <header ref={headerRef} className="relative z-30 sticky top-0 bg-white/86 backdrop-blur-xl border-b border-[rgb(var(--role-accent))]/15 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand / identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center text-white shadow-md ring-2 ${accentRing} ring-offset-2 ring-offset-white/80 transition-transform duration-200 hover:scale-105`}
              aria-hidden
            >
              {HeaderIcon ? <HeaderIcon className="w-4.5 h-4.5" /> : (
                <span className="text-sm font-bold">M</span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${textMuted}`}>{roleHomeLabel}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-sm font-bold ${textPrimary} tracking-tight truncate`}>{headerTitle}</h1>
                <span
                  className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${
                    isAdmin ? 'bg-gray-100 text-gray-700 ring-1 ring-gray-200/80' : isAmuStaff ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200/60' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60'
                  }`}
                >
                  {roleLabel}
                </span>
              </div>
              {subtitle && (
                <p className={`text-[10px] ${textMuted} truncate mt-0.5 leading-tight`}>{subtitle}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={handleNotificationsClick}
                title="Notifications"
                className={`${notifBtnClass} ${notificationsOpen ? btnActive : ''}`}
                aria-label={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
                aria-haspopup="true"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Notifications</span>
                {notificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <NotificationsPopover
                    variant={variant}
                    notifications={notifications}
                    onMarkRead={(id) => notificationsApi?.markAsRead(variant, id)}
                    onMarkAllRead={() => notificationsApi?.markAllAsRead(variant)}
                    onClear={() => notificationsApi?.clearAll(variant)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="flex relative h-[calc(100vh-var(--dashboard-header-height))]" style={{ margin: 0, padding: 0 }}>
        {/* Sidebar Navigation */}
        {(normalizedNavItems.length > 0 || onSettingsPage || onActivityLogsPage || onHelpPage) && (
          <aside className={`w-52 border-r ${
            isAdmin
              ? 'border-gray-200/60 bg-gradient-to-b from-gray-50/80 via-white/85 to-white'
              : isAmuStaff
                ? 'border-teal-100/70 bg-gradient-to-b from-teal-50/65 via-white/85 to-white'
                : 'border-blue-100/70 bg-gradient-to-b from-blue-50/65 via-white/85 to-white'
          } py-3.5 px-3 flex-none h-[calc(100vh-var(--dashboard-header-height))] max-h-[calc(100vh-var(--dashboard-header-height))] overflow-hidden backdrop-blur-xl shadow-[12px_0_34px_rgba(15,23,42,0.04)]`}>
            <nav className="flex h-full min-h-0 flex-col clean-scrollbar overflow-y-auto pr-1" aria-label="Page navigation">
              <div className="space-y-1.5">
                {normalizedNavItems.map((item) => {
                  const isActive = !!item.active
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      className={navBtnClassFor(isActive)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.icon ? <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'opacity-70'}`} /> : null}
                      <span className="flex-grow text-left">{item.label}</span>
                      {item.trailing ? <ChevronRight className="h-4 w-4 opacity-70 flex-shrink-0" /> : null}
                    </button>
                  )
                })}
              </div>
              <div className={`mt-auto pt-3 border-t px-1 ${isAdmin ? 'border-gray-200/50' : isAmuStaff ? 'border-teal-100/50' : 'border-slate-200/50'}`}>
                <button
                  type="button"
                  onClick={handleActivityLogs}
                  className={navBtnClassFor(onActivityLogsPage) + ' mb-2'}
                  aria-current={onActivityLogsPage ? 'page' : undefined}
                >
                  <Activity className="w-4 h-4" />
                  Activity logs
                </button>
                <button
                  type="button"
                  onClick={handleSettings}
                  className={navBtnClassFor(onSettingsPage)}
                  aria-current={onSettingsPage ? 'page' : undefined}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/help')}
                  className={navBtnClassFor(onHelpPage) + ' mt-2'}
                  aria-current={onHelpPage ? 'page' : undefined}
                >
                  <HelpCircle className="w-4 h-4" />
                  Help Center
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={navBtnClassFor(false) + ' mt-2'}
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </nav>
          </aside>
        )}
        {/* Main Content */}
        <main className="clean-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-5 py-4 sm:py-5">
            <div className="ui-surface mx-auto w-full max-w-[1200px] rounded-2xl border border-[rgb(var(--role-accent))]/12 bg-white/68 p-4 shadow-sm shadow-[rgb(var(--role-accent))]/5 ring-1 ring-white/75 backdrop-blur-sm sm:p-5 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
