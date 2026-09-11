import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  LogOut,
  Key,
  LayoutDashboard,
  Settings,
  ExternalLink,
  Eye,
  Download,
  Info,
  ArrowRight,
} from 'lucide-react'
import { API_BASE } from '../api'
import NeedsAssessmentPreviewModal from '../components/NeedsAssessmentPreviewModal'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState(null)

  const studentUser = JSON.parse(localStorage.getItem('student_user') || '{}')

  useEffect(() => {
    if (!studentUser.id) {
      navigate('/student-login')
      return
    }
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/public/students/dashboard?student_id=${studentUser.student_id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load dashboard')
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('student_user')
    navigate('/student-login')
  }

  const handlePreviewNeedsAssessment = (referral) => {
    setSelectedReferral(referral)
    setShowPreviewModal(true)
  }

  const handleClosePreview = () => {
    setShowPreviewModal(false)
    setSelectedReferral(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={fetchDashboard}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const student = dashboardData?.student || {}
  const stats = dashboardData?.stats || {}
  const classes = dashboardData?.classes || []
  const referrals = dashboardData?.referrals || []

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Student Dashboard</h1>
                <p className="text-xs text-slate-500">Academic Mentoring Unit</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/student-profile')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <User className="h-4 w-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 shadow-sm sm:p-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-indigo-100/50" />
          <div className="relative max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">Your student support space</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome back, {student.name || 'Student'}.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Keep track of your classes, complete your needs assessments, and review updates from your support team.</p>
            <p className="mt-2 text-xs text-slate-500">Student ID: {student.id_number || 'N/A'}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#student-referrals" className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Review my assessments<ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              <button type="button" onClick={() => navigate('/student-profile')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"><User className="h-4 w-4" />View my profile</button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_classes || 0}</p>
                <p className="text-sm text-slate-500">Total Classes</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_referrals || 0}</p>
                <p className="text-sm text-slate-500">Total Referrals</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.pending_needs_assessments || 0}</p>
                <p className="text-sm text-slate-500">Pending Assessments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.completed_needs_assessments || 0}</p>
                <p className="text-sm text-slate-500">Completed Assessments</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-indigo-100 bg-white p-5" aria-label="Your next step">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Your next step</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{stats.pending_needs_assessments > 0 ? 'You have assessments to complete' : referrals.length > 0 ? 'Keep track of your support updates' : 'Your support space is ready'}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{stats.pending_needs_assessments > 0 ? `${stats.pending_needs_assessments} assessment${stats.pending_needs_assessments === 1 ? ' is' : 's are'} pending. Check your referrals below for an available form link and share the information your AMU team needs to support you.` : referrals.length > 0 ? 'Review your submitted assessments and any saved support decisions in the referrals section below.' : 'Your assigned classes and any referrals will appear here when they become available.'}</p>
        </section>
        <section className="mb-8 grid gap-3 md:grid-cols-3" aria-label="Student support guide">
          {[
            { step: '01', title: 'Check your classes', text: 'See the subjects and sections connected to your student record.', href: '#student-classes', action: 'View my classes' },
            { step: '02', title: 'Share your needs', text: 'Open an available assessment from your referral to tell the AMU team about your situation.', href: '#student-referrals', action: 'Find my assessments' },
            { step: '03', title: 'Review support updates', text: 'Check your referral for your assigned staff member and any saved support decision.', href: '#student-referrals', action: 'View my referrals' },
          ].map((item) => <div key={item.step} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"><span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{item.step}</span><h3 className="text-sm font-semibold text-slate-900">{item.title}</h3><p className="mt-2 mb-5 text-xs leading-5 text-slate-600">{item.text}</p><a href={item.href} className="mt-auto inline-flex items-center gap-2 self-start rounded text-xs font-semibold text-indigo-700 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">{item.action}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a></div>)}
        </section>

        {/* Classes Section */}
        <div id="student-classes" className="scroll-mt-4 bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">My Classes</h3>
          </div>
          <div className="p-6">
            {classes.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No classes found.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <div key={cls.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <h4 className="font-semibold text-slate-900">{cls.subject_code}</h4>
                    <p className="text-sm text-slate-600 mt-1">{cls.subject_name}</p>
                    {cls.section_code && (
                      <p className="text-xs text-slate-500 mt-2">Section: {cls.section_code}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Referrals Section */}
        <div id="student-referrals" className="scroll-mt-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Referrals</h3>
          </div>
          <div className="p-6">
            {referrals.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No referrals found.</p>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div key={referral.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{referral.subject_code}</h4>
                        <p className="text-sm text-slate-600 mt-1">{referral.subject_name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Referred: {referral.referred_at ? new Date(referral.referred_at).toLocaleDateString() : 'N/A'}
                        </p>
                        {referral.assigned_amu_staff_name && (
                          <p className="text-xs text-slate-500 mt-1">
                            Assigned to: {referral.assigned_amu_staff_name}
                          </p>
                        )}
                        
                        {/* Needs Assessment Form Container */}
                        {referral.needs_assessment_token && !referral.has_needs_assessment && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900 font-medium mb-2">
                              Please complete the needs assessment form for this class:
                            </p>
                            <button
                              onClick={() => window.open(`/needs-assessment/${referral.needs_assessment_token}`, '_blank')}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open Needs Assessment Form
                            </button>
                          </div>
                        )}
                        
                        {referral.has_needs_assessment && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-900 font-medium mb-3">
                              ✓ Needs assessment completed for this class
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePreviewNeedsAssessment(referral)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                                Preview Form
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Support Routing Display */}
                        {referral.support_routing && (
                          <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-cyan-900 mb-1">
                                  Support Routing Decision
                                </p>
                                <p className="text-sm text-cyan-800 mb-2">
                                  {referral.support_routing}
                                </p>
                                {referral.support_routing_saved_at && (
                                  <p className="text-xs text-cyan-600">
                                    Decided on {new Date(referral.support_routing_saved_at).toLocaleDateString()}
                                    {referral.support_routing_saved_by && ` by ${referral.support_routing_saved_by}`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {referral.has_needs_assessment ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Needs Assessment Preview Modal */}
      {selectedReferral && (
        <NeedsAssessmentPreviewModal
          isOpen={showPreviewModal}
          onClose={handleClosePreview}
          needsAssessment={selectedReferral.needs_assessment}
          studentInfo={dashboardData?.student}
          referralInfo={selectedReferral}
        />
      )}
    </div>
  )
}
