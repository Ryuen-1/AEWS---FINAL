import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Info,
  User,
} from 'lucide-react'
import { API_BASE } from '../api'
import NeedsAssessmentPreviewModal from '../components/NeedsAssessmentPreviewModal'
import StudentLayout from '../components/StudentLayout'

export default function StudentDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboardData, setDashboardData] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState(null)

  const studentUser = useMemo(() => JSON.parse(localStorage.getItem('student_user') || '{}'), [])

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
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) throw new Error('Failed to load dashboard')

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
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
            <button onClick={fetchDashboard} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
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
  const pendingCount = Number(stats.pending_needs_assessments || 0)

  const pageTitle = activeTab === 'referrals' ? 'My Referrals' : activeTab === 'classes' ? 'My Classes' : 'Student Dashboard'
  const pageSubtitle = activeTab === 'referrals'
    ? 'Review referrals, needs assessments, and support decisions'
    : activeTab === 'classes'
      ? 'Classes connected to your student record'
      : 'Academic Mentoring Unit'

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6 shadow-sm sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-blue-100/60" />
        <div className="relative max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Your student support space</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome back, {student.name || 'Student'}.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Use this dashboard to see your current status and go to the student task you need.</p>
          <p className="mt-2 text-xs text-slate-500">Student ID: {student.id_number || 'N/A'}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/student-dashboard?tab=referrals')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              Review my referrals <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => navigate('/student-profile')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <User className="h-4 w-4" /> View my profile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Classes', value: stats.total_classes || 0, icon: BookOpen, tone: 'blue' },
          { label: 'Total Referrals', value: stats.total_referrals || 0, icon: AlertTriangle, tone: 'amber' },
          { label: 'Pending Assessments', value: stats.pending_needs_assessments || 0, icon: Clock, tone: 'red' },
          { label: 'Completed Assessments', value: stats.completed_needs_assessments || 0, icon: CheckCircle2, tone: 'green' },
        ].map((item) => {
          const Icon = item.icon
          const color = item.tone === 'amber' ? 'bg-amber-100 text-amber-600' : item.tone === 'red' ? 'bg-red-100 text-red-600' : item.tone === 'green' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          return (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <section className="rounded-xl border border-blue-100 bg-white p-5" aria-label="Your next step">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Your next step</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-900">{pendingCount > 0 ? 'You have assessments to complete' : referrals.length > 0 ? 'Keep track of your support updates' : 'Your support space is ready'}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {pendingCount > 0
            ? `${pendingCount} assessment${pendingCount === 1 ? ' is' : 's are'} pending. Open My Referrals to complete the available form.`
            : referrals.length > 0
              ? 'Open My Referrals to review your submitted assessments and support decisions.'
              : 'Your classes and referrals will appear when they become available.'}
        </p>
      </section>
    </div>
  )

  const renderClasses = () => (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">My Classes</h3>
        <p className="mt-1 text-sm text-slate-500">Subjects and sections connected to your student record.</p>
      </div>
      <div className="p-6">
        {classes.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No classes found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls.id} className="rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                <h4 className="font-semibold text-slate-900">{cls.subject_code}</h4>
                <p className="mt-1 text-sm text-slate-600">{cls.subject_name}</p>
                {cls.section_code && <p className="mt-2 text-xs text-slate-500">Section: {cls.section_code}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderReferrals = () => (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">My Referrals</h3>
        <p className="mt-1 text-sm text-slate-500">Referral notices, needs assessment forms, and support routing updates.</p>
      </div>
      <div className="p-6">
        {referrals.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No referrals found.</p>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
              <div key={referral.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-900">{referral.subject_code}</h4>
                    <p className="mt-1 text-sm text-slate-600">{referral.subject_name}</p>
                    <p className="mt-1 text-xs text-slate-500">Referred: {referral.referred_at ? new Date(referral.referred_at).toLocaleDateString() : 'N/A'}</p>
                    {referral.assigned_amu_staff_name && <p className="mt-1 text-xs text-slate-500">Assigned to: {referral.assigned_amu_staff_name}</p>}

                    {referral.needs_assessment_token && !referral.has_needs_assessment && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="mb-2 text-sm font-medium text-blue-900">Please complete the needs assessment form for this class:</p>
                        <button onClick={() => window.open(`/needs-assessment/${referral.needs_assessment_token}`, '_blank')} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                          <ExternalLink className="h-4 w-4" /> Open Needs Assessment Form
                        </button>
                      </div>
                    )}

                    {referral.has_needs_assessment && (
                      <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="mb-3 text-sm font-medium text-green-900">? Needs assessment completed for this class</p>
                        <button onClick={() => handlePreviewNeedsAssessment(referral)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700">
                          <Eye className="h-4 w-4" /> Preview Form
                        </button>
                      </div>
                    )}

                    {referral.support_routing && (
                      <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                        <div className="flex items-start gap-3">
                          <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-600" />
                          <div className="flex-1">
                            <p className="mb-1 text-sm font-semibold text-cyan-900">Support Routing Decision</p>
                            <p className="mb-2 text-sm text-cyan-800">{referral.support_routing}</p>
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
                  <div className="flex-shrink-0">
                    {referral.has_needs_assessment ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3 w-3" /> Completed</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"><Clock className="h-3 w-3" /> Pending</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <StudentLayout title={pageTitle} subtitle={pageSubtitle} student={student}>
      {activeTab === 'classes' ? renderClasses() : activeTab === 'referrals' ? renderReferrals() : renderDashboard()}

      {selectedReferral && (
        <NeedsAssessmentPreviewModal
          isOpen={showPreviewModal}
          onClose={handleClosePreview}
          needsAssessment={selectedReferral.needs_assessment}
          studentInfo={dashboardData?.student}
          referralInfo={selectedReferral}
        />
      )}
    </StudentLayout>
  )
}
