import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Brain, GraduationCap, Mail } from 'lucide-react'
import { requestPasswordReset } from '../api'

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const roleParam = (searchParams.get('role') || '').toLowerCase()
  const isStudentReset = roleParam === 'student'
  const loginPath = isStudentReset ? '/student-login' : '/'
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailRequired, setEmailRequired] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const emailTrimmed = email.trim()
    if (!emailTrimmed) {
      setEmailRequired(true)
      return
    }
    setEmailRequired(false)
    setLoading(true)
    try {
      await requestPasswordReset(emailTrimmed, isStudentReset ? 'student' : '')
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
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
            <p className="text-slate-600 text-base">{isStudentReset ? 'Reset your student password.' : 'Reset your password.'}</p>
          </div>
          {!submitted ? (
            <>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Account recovery
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Forgot password?</h2>
              <p className="text-slate-500 text-base leading-7 mb-7">
                {isStudentReset ? 'Enter the email connected to your student account and we will send a reset link.' : 'Enter your email and we will send you a link to reset your password.'}
              </p>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2.5">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailRequired(false) }}
                      placeholder="email@university.edu"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border bg-white/90 outline-none transition text-slate-900 placeholder:text-slate-400 shadow-sm focus:ring-4 focus:ring-blue-500/10 ${emailRequired ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                    />
                  </div>
                  {emailRequired && <p className="mt-1 text-sm text-red-600">This is required</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 hover:from-blue-700 hover:via-blue-600 hover:to-sky-600 transition shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.99]"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center text-emerald-600 mx-auto mb-5 shadow-lg shadow-emerald-500/10">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Check your email</h2>
              <p className="text-slate-500 text-base leading-7 mb-6 text-center">
                If an account exists for <span className="font-semibold text-slate-700">{email || 'that address'}</span>, you will receive a password reset link shortly.
              </p>
              <Link
                to={loginPath}
                className="block w-full text-center py-3 rounded-2xl font-bold text-blue-700 bg-blue-50/90 border border-blue-200 hover:bg-blue-100 transition"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
