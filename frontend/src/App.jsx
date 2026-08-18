import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastContainer } from './components/ToastContainer'

import Login from './pages/Login'
import SignUp from './pages/SignUp'
import CheckEmail from './pages/CheckEmail'
import PendingApproval from './pages/PendingApproval'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import StudentNeedsAssessment from './pages/StudentNeedsAssessment'
import StudentLogin from './pages/StudentLogin'
import StudentDashboard from './pages/StudentDashboard'
import StudentProfile from './pages/StudentProfile'
import Help from './pages/Help'
import NotFound from './pages/NotFound'
import InstructorDashboard from './pages/InstructorDashboard'
import InstructorReports from './pages/InstructorReports'
import InstructorSettings from './pages/InstructorSettings'
import ClassDetails from './pages/ClassDetails'
import ClassGrades from './pages/ClassGrades'
import PreviousMidtermGrades from './pages/PreviousMidtermGrades'
import PreviousFinalGrades from './pages/PreviousFinalGrades'
import ClassAttendance from './pages/ClassAttendance'
import InstructorStudentProfile from './pages/InstructorStudentProfile'
import AdminDashboard from './pages/AdminDashboard'
import AdminSettings from './pages/AdminSettings'
import AdminStudentDetail from './pages/AdminStudentDetail'
import AdminUserDetail from './pages/AdminUserDetail'
import AdminNeedsAssessmentFormBuilder from './pages/AdminNeedsAssessmentFormBuilder'
import AmuStaffDashboard from './pages/AmuStaffDashboard'
import AmuStaffSettings from './pages/AmuStaffSettings'
import AmuStaffStudentDetail from './pages/AmuStaffStudentDetail'
import AmuStaffNeedsAssessments from './pages/AmuStaffNeedsAssessments'
import ArchivedClasses from './pages/ArchivedClasses'
import ActivityLogs from './pages/ActivityLogs'

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span className="text-sm font-medium">Loading page...</span>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>
              <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/check-email" element={<CheckEmail />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/needs-assessment/:token" element={<StudentNeedsAssessment />} />
                  <Route path="/student-login" element={<StudentLogin />} />
                  <Route path="/student-dashboard" element={<StudentDashboard />} />
                  <Route path="/student-profile" element={<StudentProfile />} />
                  <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorDashboard /></ProtectedRoute>} />
                  <Route path="/instructor/reports" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorReports /></ProtectedRoute>} />
                  <Route path="/instructor/settings" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSettings /></ProtectedRoute>} />
                  <Route path="/instructor/activity-logs" element={<ProtectedRoute allowedRoles={['instructor']}><ActivityLogs /></ProtectedRoute>} />
                  <Route path="/instructor/archived" element={<ProtectedRoute allowedRoles={['instructor']}><ArchivedClasses /></ProtectedRoute>} />
                  <Route path="/instructor/class/:id" element={<ProtectedRoute allowedRoles={['instructor']}><ClassDetails /></ProtectedRoute>} />
                  <Route path="/instructor/class/:id/grades" element={<ProtectedRoute allowedRoles={['instructor']}><ClassGrades /></ProtectedRoute>} />
                  <Route path="/instructor/class/:id/grades/previous-midterm" element={<ProtectedRoute allowedRoles={['instructor']}><PreviousMidtermGrades /></ProtectedRoute>} />
                  <Route path="/instructor/class/:id/grades/previous-final" element={<ProtectedRoute allowedRoles={['instructor']}><PreviousFinalGrades /></ProtectedRoute>} />
                  <Route path="/instructor/class/:id/attendance" element={<ProtectedRoute allowedRoles={['instructor']}><ClassAttendance /></ProtectedRoute>} />
                  <Route path="/instructor/student/:id" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorStudentProfile /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminSettings /></ProtectedRoute>} />
                  <Route path="/admin/activity-logs" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogs /></ProtectedRoute>} />
                  <Route path="/admin/student/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentDetail /></ProtectedRoute>} />
                  <Route path="/admin/user/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminUserDetail /></ProtectedRoute>} />
                  <Route path="/admin/needs-assessment-form" element={<ProtectedRoute allowedRoles={['admin']}><AdminNeedsAssessmentFormBuilder /></ProtectedRoute>} />
                  <Route path="/amu-staff" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffDashboard /></ProtectedRoute>} />
                  <Route path="/amu-staff/settings" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffSettings /></ProtectedRoute>} />
                  <Route path="/amu-staff/activity-logs" element={<ProtectedRoute allowedRoles={['amu-staff']}><ActivityLogs /></ProtectedRoute>} />
                  <Route path="/amu-staff/student/:id" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffStudentDetail /></ProtectedRoute>} />
                  <Route path="/amu-staff/needs-assessments" element={<ProtectedRoute allowedRoles={['amu-staff']}><AmuStaffNeedsAssessments /></ProtectedRoute>} />
                  <Route path="/help" element={<ProtectedRoute allowedRoles={['instructor', 'admin', 'amu-staff']}><Help /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <ToastContainer />
            </ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
