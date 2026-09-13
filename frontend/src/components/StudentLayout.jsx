import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, LogOut, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function StudentLayout({ title = 'Student Dashboard', subtitle = 'Academic Mentoring Unit', student = {}, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isDashboard = location.pathname === '/student-dashboard'
  const isProfile = location.pathname === '/student-profile'
  const activeStudentTab = new URLSearchParams(location.search).get('tab') || 'dashboard'

  const handleLogout = () => {
    localStorage.removeItem('student_user')
    navigate('/student-login', { replace: true })
  }

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, onClick: () => navigate('/student-dashboard?tab=dashboard'), active: isDashboard && activeStudentTab === 'dashboard' },
    { label: 'My Referrals', icon: ClipboardList, onClick: () => navigate('/student-dashboard?tab=referrals'), active: isDashboard && activeStudentTab === 'referrals' },
    { label: 'My Classes', icon: BookOpen, onClick: () => navigate('/student-dashboard?tab=classes'), active: isDashboard && activeStudentTab === 'classes' },
    { label: 'Profile', icon: User, onClick: () => navigate('/student-profile'), active: isProfile },
  ]

  const navClass = (active = false) => {
    const base = 'ui-hover-lift w-full min-h-[48px] flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-all duration-200'
    return active
      ? `${base} border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25`
      : `${base} border-transparent bg-white/45 text-slate-700 hover:bg-blue-50/80 hover:border-blue-200 hover:text-blue-800 hover:shadow-sm`
  }

  return (
    <div className="h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="absolute top-0 left-0 h-full w-full bg-[radial-gradient(ellipse_at_top_left,rgba(191,219,254,0.55),transparent_44%)]" aria-hidden="true" />
      <div className="absolute -left-20 top-1/4 h-96 w-96 rounded-full bg-blue-300/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-20 bottom-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-400/12 blur-3xl" aria-hidden="true" />

      <header className="relative z-30 border-b border-blue-100/80 bg-white/88 shadow-[0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-200 ring-offset-2 ring-offset-white/80">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Student workspace</p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-sm font-bold tracking-tight text-slate-900">{title}</h1>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-200/70">Student</span>
              </div>
              {subtitle && <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500">{subtitle}</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex h-[calc(100vh-65px)]">
        <aside className="h-full w-52 flex-none border-r border-blue-100/80 bg-gradient-to-b from-blue-50/70 via-white/90 to-white px-3 py-3.5 shadow-[12px_0_34px_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <nav className="flex h-full min-h-0 flex-col overflow-y-auto pr-1" aria-label="Student navigation">
            <div className="ui-surface mb-4 rounded-2xl border border-blue-100 bg-white/78 p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{student?.name || 'Student'}</p>
                  <p className="truncate text-[11px] text-slate-500">{student?.id_number || student?.student_id || 'Student account'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {navItems.map((item) => (
                <button key={item.label} type="button" onClick={item.onClick} className={navClass(item.active)} aria-current={item.active ? 'page' : undefined}>
                  <item.icon className={`h-5 w-5 flex-shrink-0 ${item.active ? '' : 'opacity-75'}`} />
                  <span className="flex-grow text-left">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-auto border-t border-slate-200/70 pt-3">
              <button type="button" onClick={handleLogout} className={navClass(false)}>
                <LogOut className="h-5 w-5 opacity-75" />
                <span className="flex-grow text-left">Log out</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-[1680px] px-3 py-4 sm:px-4 sm:py-5 lg:px-5">
            <div className="ui-surface mx-auto w-full max-w-[1200px] rounded-2xl border border-blue-100/70 bg-white/70 p-4 shadow-sm shadow-blue-500/5 ring-1 ring-white/75 backdrop-blur-sm sm:p-5 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
