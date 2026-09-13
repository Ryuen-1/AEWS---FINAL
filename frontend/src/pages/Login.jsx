import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, UserPlus, CheckCircle, Network, Sparkles } from 'lucide-react'
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
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-10 sm:px-6">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.88)_0_8%,transparent_22%),radial-gradient(circle_at_83%_18%,rgba(255,255,255,0.78)_0_4%,transparent_18%),linear-gradient(135deg,#dce8f7_0%,#edf6ff_42%,#cfd9e8_100%)] -z-10" aria-hidden="true" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(115deg,transparent_0_18%,rgba(71,85,105,0.28)_18.2%,transparent_18.6%_42%,rgba(148,163,184,0.35)_42.2%,transparent_42.6%_72%,rgba(71,85,105,0.22)_72.2%,transparent_72.6%),linear-gradient(35deg,transparent_0_24%,rgba(148,163,184,0.25)_24.2%,transparent_24.6%_60%,rgba(255,255,255,0.75)_60.2%,transparent_60.8%)]" aria-hidden="true" />
      <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" aria-hidden="true" />

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alert" aria-live="polite">
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[7px]" aria-hidden="true" />
          <div className="relative w-full max-w-[340px] overflow-hidden rounded-[1.4rem] border border-white/85 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.26)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-500" aria-hidden="true" />
            <div className="flex flex-col items-center px-7 pb-7 pt-10 text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 scale-150 rounded-full bg-emerald-300/25 blur-2xl" aria-hidden="true" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle className="h-9 w-9 text-emerald-600" strokeWidth={2.25} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-950">Login successful!</p>
              <p className="mt-3 max-w-[250px] text-sm leading-6 text-slate-500">Your workspace is ready. Taking you to your dashboard...</p>
              <div className="mt-7 h-1.5 w-full max-w-[282px] overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid min-h-[560px] overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 shadow-[0_32px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl lg:grid-cols-2">
          <aside className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-blue-800 via-blue-500 to-cyan-300 px-10 text-center text-white lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.18)_0_8%,transparent_24%),radial-gradient(circle_at_78%_74%,rgba(255,255,255,0.22)_0_7%,transparent_24%)]" aria-hidden="true" />
            <div className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-indigo-400/35 blur-3xl" aria-hidden="true" />
            <div className="relative flex max-w-md flex-col items-center">
              <div className="mb-9 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/25 bg-white/15 text-3xl font-black tracking-tight shadow-2xl shadow-blue-950/25 backdrop-blur">
                AEWS
              </div>
              <h1 className="text-4xl font-black uppercase tracking-wide drop-shadow-sm">
                Academic Early Warning System
              </h1>
              <p className="mt-5 text-2xl font-medium text-blue-50">Secure Access Portal</p>
              <p className="mt-5 text-lg leading-8 text-white/85">Welcome Back To The System</p>
              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
                <Sparkles className="h-4 w-4 text-cyan-100" />
                Predictive insights for student success
              </div>
            </div>
          </aside>

          <section className="flex items-center justify-center bg-sky-50/75 px-6 py-10 sm:px-10">
            <div className="w-full max-w-[430px] text-left">
              <header className="mb-8 text-center lg:hidden">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-black text-white shadow-lg shadow-blue-500/25">
                  AEWS
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight tracking-tight">
                  Academic Early Warning System
                </h1>
                <p className="mt-2 text-slate-500 text-sm font-medium">
                  Secure Access Portal
                </p>
              </header>

              <div className="mb-8 hidden text-center lg:block">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-md shadow-blue-100 ring-1 ring-blue-100">
                  <Network className="h-7 w-7" />
                </div>
                <h2 className="text-4xl font-black tracking-tight text-blue-950">Sign In</h2>
              </div>

          <form className="space-y-5" onSubmit={handleSignIn}>
            {notice && (
              <div className="field-feedback-enter rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium">
                {notice}
              </div>
            )}
            {error && (
              <div className="field-feedback-enter rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Username or Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailRequired(false) }}
                  placeholder="Username or Email"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-lg border bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)] ${emailRequired ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-slate-300 focus:border-blue-500'}`}
                />
              </div>
              {emailRequired && <p className="field-feedback-enter mt-1.5 text-sm text-red-600 font-medium">This is required</p>}
            </div>
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordRequired(false) }}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-lg border bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)] ${passwordRequired ? 'border-red-300 focus:border-red-500 bg-red-50/30' : 'border-slate-300 focus:border-blue-500'}`}
                />
              </div>
              {passwordRequired && <p className="field-feedback-enter mt-1.5 text-sm text-red-600 font-medium">This is required</p>}
              <div className="mt-2.5 text-right">
                <Link
                  to="/forgot-password"
                  className="text-base font-medium text-blue-700 transition hover:text-blue-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {RECAPTCHA_SITE_KEY && (
              <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 transition-all shadow-[0_14px_28px_rgba(14,165,233,0.28)] hover:shadow-[0_18px_34px_rgba(14,165,233,0.36)] disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]"
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
              <p className="pt-2 text-center text-base text-slate-900">Don&apos;t have an account?</p>
              <button
                type="button"
                onClick={handleCreateAccount}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100 transition-all active:scale-[0.98]"
              >
                <UserPlus className="w-5 h-5" />
                Sign Up
              </button>
            </div>
          </form>
            </div>
          </section>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/help')}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-900/20 hover:bg-blue-700 transition-all z-20 text-lg hover:scale-105 active:scale-95"
        aria-label="Help"
      >
        <span className="text-lg font-semibold">?</span>
      </button>
    </div>
  )
}
