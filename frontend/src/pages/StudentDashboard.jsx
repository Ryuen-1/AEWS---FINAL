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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Welcome, {student.name || 'Student'}</h2>
          <p className="text-slate-600 mt-1">Student ID: {student.id_number || 'N/A'}</p>
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

        {/* Classes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
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
