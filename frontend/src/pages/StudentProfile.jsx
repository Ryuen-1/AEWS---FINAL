import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Key, Mail, Send, User } from 'lucide-react'
import { API_BASE, getStudentProfile } from '../api'
import StudentLayout from '../components/StudentLayout'

export default function StudentProfile() {
  const navigate = useNavigate()
  const studentUser = useMemo(() => JSON.parse(localStorage.getItem('student_user') || '{}'), [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState({ name: '', email: '', id_number: '' })
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '', verification_code: '' })
  const [codeSending, setCodeSending] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [codeSent, setCodeSent] = useState(false)

  useEffect(() => {
    if (!studentUser.id) {
      navigate('/student-login')
      return
    }
    loadProfile()
  }, [studentUser.id])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getStudentProfile()
      setProfile({
        name: data.name || '',
        email: data.email || '',
        id_number: data.id_number || '',
      })
    } catch (err) {
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const studentIdentifier = profile.id_number || studentUser.student_id || studentUser.id_number || studentUser.id || ''

  const requestVerificationCode = async () => {
    setPasswordError('')
    setPasswordMessage('')
    if (!studentIdentifier) {
      setPasswordError('Student account identifier is missing.')
      return
    }
    try {
      setCodeSending(true)
      const response = await fetch(`${API_BASE}/api/public/students/password-change-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentIdentifier }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Failed to send verification code.')
      setCodeSent(true)
      setPasswordMessage(data.message || 'Verification code sent to your email.')
    } catch (err) {
      setPasswordError(err.message || 'Failed to send verification code.')
    } finally {
      setCodeSending(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordMessage('')

    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password || !passwordData.verification_code) {
      setPasswordError('Please complete all password and verification code fields.')
      return
    }
    if (passwordData.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New password and retyped password do not match.')
      return
    }

    try {
      setPasswordSaving(true)
      const response = await fetch(`${API_BASE}/api/public/students/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentIdentifier,
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
          verification_code: passwordData.verification_code,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || 'Failed to change password.')
      setPasswordMessage(data.message || 'Password changed successfully.')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '', verification_code: '' })
      setCodeSent(false)
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const setPasswordField = (field, value) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }))
    setPasswordError('')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <StudentLayout title="My Profile" subtitle="Student account information" student={profile}>
      <div className="mx-auto max-w-3xl space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Student profile</p>
            <h2 className="mt-1 text-xl font-bold text-white">Personal Information</h2>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <User className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Name</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{profile.name || 'Not available'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Mail className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</p>
              <p className="mt-2 break-words text-lg font-semibold text-slate-900">{profile.email || 'Not available'}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50/60 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Account security</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Change Password</h2>
                <p className="mt-1 text-sm text-slate-600">A verification code will be sent to your registered email before the password can be changed.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-5 p-6">
            {passwordError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordMessage && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{passwordMessage}</span>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Current password</span>
                <input type="password" value={passwordData.current_password} onChange={(e) => setPasswordField('current_password', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="Enter current password" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">New password</span>
                <input type="password" value={passwordData.new_password} onChange={(e) => setPasswordField('new_password', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="Enter new password" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Retype new password</span>
                <input type="password" value={passwordData.confirm_password} onChange={(e) => setPasswordField('confirm_password', e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="Retype new password" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email verification code</span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input type="text" inputMode="numeric" maxLength={6} value={passwordData.verification_code} onChange={(e) => setPasswordField('verification_code', e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm tracking-[0.35em] outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" placeholder="000000" />
                  <button type="button" onClick={requestVerificationCode} disabled={codeSending || !profile.email} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">
                    <Send className="h-4 w-4" /> {codeSending ? 'Sending...' : codeSent ? 'Resend code' : 'Send code'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">The code will be sent to {profile.email || 'your registered email'} and expires in 10 minutes.</p>
              </label>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button type="submit" disabled={passwordSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                <Key className="h-4 w-4" /> {passwordSaving ? 'Changing password...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </StudentLayout>
  )
}
