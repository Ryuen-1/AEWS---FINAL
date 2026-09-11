import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, UserPlus, CheckCircle } from 'lucide-react'
import { login as apiLogin } from '../api'
import { useAuth } from '../context/AuthContext'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login: setAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailRequired, setEmailRequired] = useState(false)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [redirectPath, setRedirectPath] = useState('/instructor')
  const [recaptchaReady, setRecaptchaReady] = useState(false)
  const recaptchaEnabled = !!RECAPTCHA_SITE_KEY
  const [notice, setNotice] = useState('')
  const recaptchaContainerRef = useRef(null)
  const recaptchaWidgetIdRef = useRef(null)
  const recaptchaScriptRequestedRef = useRef(false)

  const resetRecaptcha = () => {
    if (!RECAPTCHA_SITE_KEY || !window.grecaptcha || typeof recaptchaWidgetIdRef.current !== 'number') return
    try {
      window.grecaptcha.reset(recaptchaWidgetIdRef.current)
    } catch (e) {
      console.warn('reCAPTCHA reset failed', e)
    }
  }

  const roleToPath = (roleName) => {
    if (roleName === 'admin') return '/admin'
    if (roleName === 'amu-staff') return '/amu-staff'
    return '/instructor'
  }

  useEffect(() => {
    const logoutReason = location.state?.logoutReason
    if (logoutReason) {
      setNotice(logoutReason)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || !recaptchaEnabled || !recaptchaContainerRef.current) return
    if (typeof recaptchaWidgetIdRef.current === 'number') {
      setRecaptchaReady(true)
      return
    }

    const renderRecaptcha = () => {
      if (!recaptchaContainerRef.current || !window.grecaptcha?.render || typeof recaptchaWidgetIdRef.current === 'number') {
        return
      }
      try {
        recaptchaWidgetIdRef.current = window.grecaptcha.render(recaptchaContainerRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: 'light',
          size: 'normal',
        })
        setRecaptchaReady(true)
      } catch (e) {
        console.warn('reCAPTCHA render failed', e)
      }
    }

    if (window.grecaptcha?.render) {
      renderRecaptcha()
      return
    }

    window.__recaptchaOnLoad = () => {
      renderRecaptcha()
    }

    if (!document.querySelector('script[data-recaptcha-script="true"]') && !recaptchaScriptRequestedRef.current) {
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?onload=__recaptchaOnLoad&render=explicit'
      script.async = true
      script.defer = true
      script.dataset.recaptchaScript = 'true'
      recaptchaScriptRequestedRef.current = true
      document.head.appendChild(script)
    }

    return () => {
      resetRecaptcha()
      if (window.__recaptchaOnLoad) {
        delete window.__recaptchaOnLoad
      }
    }
  }, [recaptchaEnabled])

  const handleSignIn = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    const emailEmpty = !email.trim()
    const passwordEmpty = !password.trim()
    setEmailRequired(emailEmpty)
    setPasswordRequired(passwordEmpty)
    if (emailEmpty || passwordEmpty) {
      return
    }
    let recaptchaToken = ''
    if (RECAPTCHA_SITE_KEY && window.grecaptcha && typeof recaptchaWidgetIdRef.current === 'number') {
      try {
        recaptchaToken = window.grecaptcha.getResponse(recaptchaWidgetIdRef.current) || ''
      } catch (e) {
        console.warn('reCAPTCHA getResponse failed', e)
      }
      if (!recaptchaToken) {
        setError('Please complete the reCAPTCHA (check the box) and try again.')
        return
      }
    }
    setLoading(true)
    try {
      const data = await apiLogin({
        email: email.trim(),
        password,
        recaptchaToken: recaptchaToken || undefined,
      })
      setAuth(data)
      const apiRole = data?.role ?? data?.user?.role ?? 'instructor'
      setRedirectPath(roleToPath(apiRole))
      setShowSuccess(true)
      resetRecaptcha()
    } catch (e) {
      console.error('Login failed:', e)
      setError(e?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!showSuccess) return
    const t = setTimeout(() => {
      setShowSuccess(false)
      navigate(redirectPath)
    }, 1500)
    return () => clearTimeout(t)
  }, [showSuccess, navigate, redirectPath])

  const handleCreateAccount = (e) => {
    e.preventDefault()
    navigate('/signup')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden py-12 sm:py-16 px-4">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-50/70 -z-10" aria-hidden="true" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent" aria-hidden="true" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-blue-300/20 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-1/4 -right-20 w-[28rem] h-[28rem] rounded-full bg-indigo-300/25 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-sky-200/15 blur-3xl" aria-hidden="true" />

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alert" aria-live="polite">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-white shadow-xl border border-emerald-200 p-6 max-w-[280px]">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold text-gray-900">Login successful!</p>
            <p className="text-sm text-gray-500 text-center">Taking you to your dashboard...</p>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-[480px]">
        <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl shadow-slate-300/50 ring-1 ring-slate-200/70 p-8 sm:p-10 text-left">
          <header className="text-center mb-8 pb-6 border-b border-slate-100">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight tracking-tight mb-2">
              Academic Early Warning System
            </h1>
            <p className="text-slate-500 text-sm font-medium tracking-tight">
              Predictive insights for student success
            </p>
          </header>

          <form className="space-y-5" onSubmit={handleSignIn}>
            {notice && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
                {notice}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailRequired(false) }}
                  placeholder="email@university.edu"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/10 ${emailRequired ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/20'}`}
                />
              </div>
              {emailRequired && <p className="mt-1.5 text-sm text-red-600 font-medium">This is required</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordRequired(false) }}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/10 ${passwordRequired ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-slate-200 focus:border-blue-500 focus:bg-blue-50/20'}`}
                />
              </div>
              {passwordRequired && <p className="mt-1.5 text-sm text-red-600 font-medium">This is required</p>}
              <div className="mt-2.5 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-slate-700">Verify you&apos;re not a robot</span>
                <div ref={recaptchaContainerRef} className="min-h-[78px] flex items-center justify-start" />
                {!recaptchaReady && (
                  <p className="text-xs text-slate-500 italic">Loading reCAPTCHA...</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="relative my-3">
                <span className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </span>
                <span className="relative flex justify-center text-sm text-slate-400">
                  <span className="bg-white px-3">or</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCreateAccount}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-[0.98]"
              >
                <UserPlus className="w-5 h-5" />
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/help')}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 transition-all z-20 text-lg hover:scale-105 active:scale-95"
        aria-label="Help"
      >
        <span className="text-lg font-semibold">?</span>
      </button>
    </div>
  )
}
