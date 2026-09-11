import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Shield,
  BarChart3,
  FileText,
  User,
  ClipboardList,
  GraduationCap,
  ChevronRight,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import TutorialModal from '../components/TutorialModal'
import {
  hasSeenTutorial,
  setTutorialSeen,
  getPlayTutorialEveryLogin,
  wasTutorialDismissedThisSession,
  setTutorialDismissedThisSession,
} from '../lib/tutorialPrefs'
import { useAuth } from '../context/AuthContext'
import AdminSystemAnalytics from '../components/admin/AdminSystemAnalytics'
import AdminInstitutionReports from '../components/admin/AdminInstitutionReports'
import AdminUserAccounts from '../components/admin/AdminUserAccounts'
import AdminPendingAccounts from '../components/admin/AdminPendingAccounts'
import AdminDepartments from '../components/admin/AdminDepartments'
import AdminInstructorsList from '../components/admin/AdminInstructorsList'
import AdminStudentAccounts from '../components/admin/AdminStudentAccounts'

const MAIN_TABS = [
  { id: 'overview', label: 'System Overview', icon: BarChart3 },
  { id: 'pending', label: 'Pending Accounts', icon: User },
  { id: 'analytics', label: 'System Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Institution Reports', icon: FileText },
  { id: 'users', label: 'User Accounts', icon: User },
  { id: 'students', label: 'Student Accounts', icon: GraduationCap },
  { id: 'needs-assessment-form', label: 'Needs Assessment Form', icon: ClipboardList },
  // AI Model and AI Performance bypassed until AI is implemented
]


const ROLE_PATH = { instructor: '/instructor', admin: '/admin', 'amu-staff': '/amu-staff' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useAuth()
  const [showTutorial, setShowTutorial] = useState(false)
  const department = 'all'
  const [mainTab, setMainTab] = useState('overview')
  const getTabFromSearch = (search) => {
    const tab = new URLSearchParams(search).get('tab')
    return MAIN_TABS.some((item) => item.id === tab) ? tab : 'overview'
  }

  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true })
      return
    }
    if (role && role !== 'admin') {
      navigate(ROLE_PATH[role] || '/admin', { replace: true })
    }
  }, [user, role, navigate])

  useEffect(() => {
    if (location.state?.notificationTab === 'pending') {
      requestAnimationFrame(() => setMainTab('pending'))
      navigate(location.pathname, { replace: true, state: { ...location.state, notificationTab: undefined } })
    }
  }, [location.state?.notificationTab, location.pathname, location.state, navigate])

  useEffect(() => {
    requestAnimationFrame(() => setMainTab(getTabFromSearch(location.search)))
  }, [location.search])

  useEffect(() => {
    if (!user?.id) return
    const fromSettings = location.state?.showTutorial
    const playEvery = getPlayTutorialEveryLogin(user.id)
    const dismissedThisSession = wasTutorialDismissedThisSession()
    const seen = hasSeenTutorial(user.id)
    if (fromSettings || (playEvery && !dismissedThisSession) || (!playEvery && !seen)) {
      requestAnimationFrame(() => setShowTutorial(true))
    }
  }, [user?.id, location.state?.showTutorial])

  const handleTutorialClose = () => {
    if (user?.id) {
      if (getPlayTutorialEveryLogin(user.id)) {
        setTutorialDismissedThisSession()
      } else {
        setTutorialSeen(user.id)
      }
    }
    setShowTutorial(false)
    if (location.state?.showTutorial) {
      navigate('/admin', { replace: true, state: {} })
    }
  }

  const mainTabMeta = {
    overview: { title: 'System Overview', subtitle: 'Departments, instructors, and institution oversight' },
    pending: { title: 'Pending Accounts', subtitle: 'Review and approve new account requests' },
    analytics: { title: 'System Analytics', subtitle: 'Usage and performance metrics' },
    reports: { title: 'Institution Reports', subtitle: 'Reports and exports' },
    users: { title: 'User Accounts', subtitle: 'Manage all user accounts' },
    students: { title: 'Student Accounts', subtitle: 'View and manage referred student accounts' },
    'needs-assessment-form': { title: 'Needs Assessment Form', subtitle: 'Configure the student needs assessment form shown in the system' },
  }
  const { title: contentTitle, subtitle: contentSubtitle } = mainTabMeta[mainTab] || mainTabMeta.overview

  return (
    <DashboardLayout
      title="Administrator Dashboard"
      subtitle={user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Administrator' : 'Administrator'}
      icon={Shield}
      variant="admin"
      navItems={MAIN_TABS.map((tab) => ({
        label: tab.label,
        icon: tab.icon,
        active: tab.id === 'needs-assessment-form'
          ? location.pathname === '/admin/needs-assessment-form'
          : mainTab === tab.id,
        onClick: () => navigate(tab.id === 'needs-assessment-form' ? '/admin/needs-assessment-form' : `/admin?tab=${tab.id}`),
      }))}
    >
      {showTutorial && <TutorialModal variant="admin" onClose={handleTutorialClose} />}

      <div className="space-y-3">
        <DashboardPageHeader
          welcome={mainTab === 'overview'}
          accent="slate"
          heroIcon={mainTab === 'overview' ? Shield : null}
          eyebrow={mainTab === 'overview' ? 'Institution administration' : 'Administrator workflow'}
          title={mainTab === 'overview' ? `Welcome back${user?.name ? `, ${user.name}` : ''}.` : contentTitle}
          description={mainTab === 'overview' ? 'Keep account approvals, departments, and institution oversight moving. Start with the task that needs your attention, then review the records below.' : contentSubtitle}
          actions={mainTab === 'overview' ? <>
            <button type="button" onClick={() => navigate('/admin?tab=pending')} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"><User className="h-4 w-4" />Review pending accounts</button>
            <button type="button" onClick={() => navigate('/admin?tab=reports')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"><FileText className="h-4 w-4" />View institution reports</button>
          </> : null}
        >
          <div className="mt-1 space-y-4">
            {mainTab === 'overview' && (
              <>
              <section aria-label="Administration shortcuts" className="grid gap-3 md:grid-cols-3">
                {[
                  { title: 'Manage account access', text: 'Review account requests and maintain instructor and AMU staff accounts.', action: 'Manage user accounts', tab: 'users', icon: User },
                  { title: 'Review system activity', text: 'Explore available usage and performance metrics for the institution.', action: 'Open system analytics', tab: 'analytics', icon: BarChart3 },
                  { title: 'Review student accounts', text: 'Find referred student accounts and review their available records.', action: 'View student accounts', tab: 'students', icon: GraduationCap },
                ].map((item) => {
                  const ShortcutIcon = item.icon
                  return <div key={item.tab} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"><span className="mb-4 self-start rounded-lg bg-slate-100 p-2 text-slate-700"><ShortcutIcon className="h-5 w-5" aria-hidden="true" /></span><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><p className="mt-2 mb-5 text-xs leading-5 text-slate-600">{item.text}</p><button type="button" onClick={() => navigate(`/admin?tab=${item.tab}`)} className="mt-auto inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-slate-700 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-600">{item.action}<ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>
                })}
              </section>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><h3 className="text-sm font-semibold text-slate-900">Institution directory</h3><p className="mt-1 text-xs leading-5 text-slate-600">Review departments and instructor records below. Use the shortcuts above for approvals, account management, and reporting.</p></div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <AdminDepartments department={department} />
                <AdminInstructorsList department={department} />
              </div>
              </>
            )}

            {mainTab === 'pending' && <AdminPendingAccounts />}
            {mainTab === 'analytics' && <AdminSystemAnalytics />}
            {mainTab === 'reports' && <AdminInstitutionReports />}
            {mainTab === 'users' && <AdminUserAccounts />}
            {mainTab === 'students' && <AdminStudentAccounts />}
            {mainTab === 'needs-assessment-form' && (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600">
                Open the dedicated page from the sidebar to manage the needs assessment form.
              </div>
            )}
          </div>
        </DashboardPageHeader>
      </div>
    </DashboardLayout>
  )
}
