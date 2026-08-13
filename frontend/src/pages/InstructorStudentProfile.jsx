import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import DashboardPageHeader from '../components/DashboardPageHeader'
import { getInstructorStudentList } from '../api'

export default function InstructorStudentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [student, setStudent] = useState(null)

  useEffect(() => {
    loadStudent()
  }, [id, user?.id])

  const loadStudent = async () => {
    if (!user?.id) {
      setError('User not authenticated')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // Get all students for this instructor
      const students = await getInstructorStudentList(user.id)
      
      // Find the specific student by ID (could be student_id or email)
      const foundStudent = students.find(s => 
        s.student_id === id || 
        s.student_email === id ||
        String(s.student_id) === String(id)
      )
      
      if (foundStudent) {
        setStudent({
          id: id,
          name: foundStudent.student_name || 'Unknown Student',
          email: foundStudent.student_email || 'No email',
          id_number: foundStudent.student_id || 'N/A',
          gpa: foundStudent.gpa != null ? foundStudent.gpa : 'N/A',
          attendance: foundStudent.attendance != null ? foundStudent.attendance : 'N/A',
          lms_activity: foundStudent.lms_activity != null ? foundStudent.lms_activity : 'N/A',
          status: foundStudent.prediction_label ? 
            (foundStudent.prediction_label === 'External Factor' ? 'follow-up' : 'critical') : 'ok',
          subject_code: foundStudent.subject_code || 'N/A',
          subject_name: foundStudent.subject_name || 'N/A',
          class_id: foundStudent.class_id,
        })
      } else {
        setError('Student not found in your classes')
      }
    } catch (err) {
      setError(err.message || 'Failed to load student')
    } finally {
      setLoading(false)
    }
  }

  const instructorSubtitle = user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600">Loading student profile...</p>
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
              onClick={loadStudent}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statusClass = {
    ok: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    'follow-up': 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    critical: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  }

  return (
    <DashboardLayout
      title="Instructor Dashboard"
      subtitle={instructorSubtitle}
      navItems={[
        { label: 'Back to class', icon: ArrowLeft, active: false, onClick: () => navigate(-1) },
      ]}
    >
      <DashboardPageHeader
        eyebrow="Student support view"
        title="Student profile"
        description="This page brings the student's current status, alerts, and support history together so you can decide on the next action quickly."
        actions={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        }
      >
        <p className="mb-6 text-sm text-slate-500">{student.name} · {student.email}</p>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white border-l-4 border-l-blue-500">
          <div className="border-b border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 ring-1 ring-blue-200/60">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{student.name}</h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="w-4 h-4" />
                    {student.email}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                    Student ID: {student.id_number}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <BookOpen className="w-4 h-4" />
                    {student.subject_code}: {student.subject_name}
                  </p>
                  <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusClass[student.status]}`}>
                    {student.status === 'ok' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {student.status === 'ok' ? 'Performing well' : student.status === 'follow-up' ? 'Needs follow-up' : 'Needs urgent attention'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">GPA</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{typeof student.gpa === 'number' ? student.gpa.toFixed(2) : student.gpa}</p>
                {typeof student.gpa === 'number' && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${(student.gpa / 5) * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Attendance</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{typeof student.attendance === 'number' ? `${student.attendance}%` : student.attendance}</p>
                {typeof student.attendance === 'number' && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-600" style={{ width: `${student.attendance}%` }} />
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">LMS Activity</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{typeof student.lms_activity === 'number' ? `${student.lms_activity}%` : student.lms_activity}</p>
                {typeof student.lms_activity === 'number' && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-600" style={{ width: `${student.lms_activity}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <section className="border-b border-r border-slate-200 p-5 lg:border-b-0">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Progress over time
              </h4>
              <div className="h-56 flex items-center justify-center bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Performance chart will be displayed here</p>
              </div>
            </section>

            <section className="p-5">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Support history
              </h4>
              <div className="space-y-3">
                {student.status !== 'ok' ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">
                        {student.prediction_label === 'External Factor' ? 'External factors identified' : 'Academic concerns identified'}
                      </span>
                      <span className="text-xs text-slate-500">Current</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {student.prediction_label === 'External Factor' 
                        ? 'Student may be facing external challenges affecting academic performance.' 
                        : 'Student shows signs of academic difficulties that may require intervention.'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-green-50 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">No active interventions</span>
                      <span className="text-xs text-slate-500">Current</span>
                    </div>
                    <p className="text-xs text-slate-600">Student is performing well with no current support requirements.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </DashboardPageHeader>
    </DashboardLayout>
  )
}