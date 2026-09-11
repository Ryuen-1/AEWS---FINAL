import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Brain, GraduationCap, Lock, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { resetPassword } from '../api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const roleParam = (searchParams.get('role') || '').toLowerCase()
  const isStudentReset = roleParam === 'student'
  const loginPath = isStudentReset ? '/student-login' : '/'
  const forgotPath = isStudentReset ? '/forgot-password?role=student' : '/forgot-password'
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const [newPasswordRequired, setNewPasswordRequired] = useState(false)
  const [confirmMismatch, setConfirmMismatch] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setNewPasswordRequired(false)
    setConfirmMismatch(false)
    const pwd = newPassword.trim()
    const confirm = confirmPassword.trim()
    if (!pwd) {
      setNewPasswordRequired(true)
      return
    }
    if (pwd !== confirm) {
      setConfirmMismatch(true)
      setMessage('Passwords do not match.')
      return
    }
    if (!token) {
      setStatus('error')
      setMessage('Invalid reset link. Request a new one from the forgot password page.')
      return
    }
    setStatus('loading')
    try {
      const result = await resetPassword(token, pwd)
      const resultRole = (result?.role || '').toLowerCase()
      const targetLoginPath = resultRole === 'student' ? '/student-login' : loginPath
      setStatus('success')
      setMessage('Password updated. You can now sign in.')
      setTimeout(() => navigate(targetLoginPath, { replace: true }), 3000)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Reset failed.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#dcecff_0,#edf6ff_34%,#f7fbff_62%,#eef6ff_100%)] py-8">
      <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" aria-hidden="true" />
      <div className="absolute top-16 right-12 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] opacity-30" aria-hidden="true">
        <svg viewBox="0 0 100 100" className="w-full h-full text-blue-200/90">
          {Array.from({ length: 200 }).map((_, i) => {
            const angle = (i / 200) * 90 * (Math.PI / 180)
            const r = 40 + (i % 5) * 2
            const x = 50 + Math.cos(angle) * r
            const y = 50 + Math.sin(angle) * r
            return <circle key={i} cx={x} cy={y} r="0.8" fill="currentColor" />
          })}
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-xl px-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-[1.75rem] border border-white/80 shadow-2xl shadow-blue-900/10 p-8 sm:p-10 text-left">
          <div className="text-center mb-8">
            <div className="flex justify-center gap-4 mb-5">
              <div className="p-3 rounded-2xl bg-white/90 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100">
                <Brain className="w-8 h-8 text-blue-600" strokeWidth={1.8} />
              </div>
              <div className="p-3 rounded-2xl bg-white/90 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100">
                <GraduationCap className="w-8 h-8 text-blue-600" strokeWidth={1.8} />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 bg-clip-text text-transparent mb-2">
              Academic Early Warning System
            </h1>
            <p className="text-slate-600 text-base">{isStudentReset ? 'Set a new student password.' : 'Set a new password.'}</p>
          </div>
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">Password updated</h2>
              <p className="text-slate-600 text-base mb-6 text-center">{message}</p>
              <p className="text-slate-500 text-sm text-center">Redirecting to sign in...</p>
              <Link
                to={loginPath}
                className="block w-full text-center py-3 mt-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:via-blue-600 hover:to-sky-600 transition shadow-lg shadow-blue-500/20"
              >
                Sign in now
              </Link>
            </>
          )}

          {!token && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">Invalid link</h2>
              <p className="text-slate-600 text-base leading-7 mb-6 text-center">
                {message || 'This link is invalid or missing. Request a new password reset from the forgot password page.'}
              </p>
              <Link
                to={forgotPath}
                className="block w-full text-center py-3 rounded-2xl font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
              >
                Request a new reset link
              </Link>
            </>
          )}

          {token && status !== 'success' && (
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Secure reset
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Set new password</h2>
              <p className="text-slate-500 text-base leading-7 mb-7">
                Enter and confirm the new password for your account.
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {message && status === 'error' && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                    {message}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2.5">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setNewPasswordRequired(false); setConfirmMismatch(false) }}
                      placeholder="Enter password"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white/90 outline-none transition text-slate-900 placeholder:text-slate-400 shadow-sm focus:ring-4 focus:ring-blue-500/10 ${newPasswordRequired ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                    />
                  </div>
                  {newPasswordRequired && <p className="mt-1 text-sm text-red-600">This is required</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2.5">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setConfirmMismatch(false) }}
                      placeholder="Enter password"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white/90 outline-none transition text-slate-900 placeholder:text-slate-400 shadow-sm focus:ring-4 focus:ring-blue-500/10 ${confirmMismatch ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                    />
                  </div>
                  {confirmMismatch && <p className="mt-1 text-sm text-red-600">Passwords do not match</p>}
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:via-blue-600 hover:to-sky-600 transition shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99]"
                >
                  {status === 'loading' ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>

        <Link
          to={loginPath}
          className="inline-flex items-center gap-2 mt-6 text-base font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to login
        </Link>
      </div>
    </div>
  )
}
