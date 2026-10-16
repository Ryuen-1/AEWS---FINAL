import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User, Phone, Building2, Network, Sparkles, UserPlus } from 'lucide-react'
import { signup } from '../api'

const COUNTRY_CODES = [
  { code: '+63', country: 'Philippines' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+91', country: 'India' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+82', country: 'South Korea' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+66', country: 'Thailand' },
  { code: '+62', country: 'Indonesia' },
  { code: '+971', country: 'UAE' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+234', country: 'Nigeria' },
  { code: '+27', country: 'South Africa' },
  { code: '+55', country: 'Brazil' },
  { code: '+52', country: 'Mexico' },
]

const COLLEGES = [
  'College of Business',
  'College of Arts and Sciences',
  'College of Nursing',
  'College of Medicine',
  'College of Technologies',
  'College of Education',
]

export default function SignUp() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [countryCode, setCountryCode] = useState('+63')
  const [contactNumber, setContactNumber] = useState('')
  const [college, setCollege] = useState('')
  const [role, setRole] = useState('instructor')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fullContactNumber = contactNumber.trim()
    ? `${countryCode.replace(/\s/g, '')}${contactNumber.trim().replace(/\s/g, '')}`
    : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const fullName = [firstName.trim(), surname.trim()].filter(Boolean).join(' ')
    if (!firstName.trim() || !surname.trim()) {
      setError('Please enter your first name and surname.')
      return
    }
    if (password !== retypePassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const data = await signup({ name: fullName, email, password, contact_number: fullContactNumber, college, role })
      if (data.pending_approval) {
        navigate('/pending-approval', { state: { email } })
      } else {
        navigate('/check-email', { state: { email, verificationLink: data.verification_link } })
      }
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-10 sm:px-6">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(255,255,255,0.88)_0_8%,transparent_22%),radial-gradient(circle_at_83%_18%,rgba(255,255,255,0.78)_0_4%,transparent_18%),linear-gradient(135deg,#dce8f7_0%,#edf6ff_42%,#cfd9e8_100%)] -z-10" aria-hidden="true" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(115deg,transparent_0_18%,rgba(71,85,105,0.28)_18.2%,transparent_18.6%_42%,rgba(148,163,184,0.35)_42.2%,transparent_42.6%_72%,rgba(71,85,105,0.22)_72.2%,transparent_72.6%),linear-gradient(35deg,transparent_0_24%,rgba(148,163,184,0.25)_24.2%,transparent_24.6%_60%,rgba(255,255,255,0.75)_60.2%,transparent_60.8%)]" aria-hidden="true" />
      <div className="absolute -left-20 top-12 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 shadow-[0_32px_90px_rgba(15,23,42,0.28)] backdrop-blur-xl lg:grid-cols-2">
          <aside className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-blue-800 via-blue-500 to-cyan-300 px-10 text-center text-white lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.18)_0_8%,transparent_24%),radial-gradient(circle_at_78%_74%,rgba(255,255,255,0.22)_0_7%,transparent_24%)]" aria-hidden="true" />
            <div className="absolute -bottom-28 -right-16 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-20 top-16 h-64 w-64 rounded-full bg-indigo-400/35 blur-3xl" aria-hidden="true" />
            <div className="relative flex max-w-md flex-col items-center">
              <div className="mb-9 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/25 bg-white/15 text-3xl font-black tracking-tight shadow-2xl shadow-blue-950/25 backdrop-blur">AEWS</div>
              <h1 className="text-4xl font-black uppercase tracking-wide drop-shadow-sm">Academic Early Warning System</h1>
              <p className="mt-5 text-2xl font-medium text-blue-50">Secure Access Portal</p>
              <p className="mt-5 text-lg leading-8 text-white/85">Create your account and join the system</p>
              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
                <Sparkles className="h-4 w-4 text-cyan-100" /> Predictive insights for student success
              </div>
            </div>
          </aside>

          <section className="flex items-center justify-center bg-sky-50/75 px-6 py-10 sm:px-10">
            <div className="w-full max-w-[430px] text-left">
              <header className="mb-8 text-center lg:hidden">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-black text-white shadow-lg shadow-blue-500/25">AEWS</div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight tracking-tight">Academic Early Warning System</h1>
                <p className="mt-2 text-slate-500 text-sm font-medium">Secure Access Portal</p>
              </header>

              <div className="mb-8 hidden text-center lg:block">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-md shadow-blue-100 ring-1 ring-blue-100"><Network className="h-7 w-7" /></div>
                <h2 className="text-4xl font-black tracking-tight text-blue-950">Create account</h2>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-base text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Account type</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
              >
                <option value="instructor">Instructor</option>
                <option value="amu-staff">AMU Staff</option>
              </select>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-base font-medium text-slate-950 mb-2.5">First name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-base font-medium text-slate-950 mb-2.5">Surname</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Smith"
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@university.edu"
                  className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Contact number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-28 px-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)] shrink-0"
                  aria-label="Country code"
                >
                  {COUNTRY_CODES.map(({ code, country }) => (
                    <option key={code} value={code}>
                      {code} {country}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="912 345 6789"
                    className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">College</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                >
                  <option value="" disabled>Select your college</option>
                  {COLLEGES.map((collegeName) => (
                    <option key={collegeName} value={collegeName}>{collegeName}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-slate-500">Select the college where you are assigned.</p>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••••"
                  className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-950 mb-2.5">Retype password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  placeholder="•••••••••••"
                  className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-300 bg-white outline-none transition-all text-base text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.16),0_8px_20px_rgba(37,99,235,0.14)]"
                />
              </div>
            </div>
              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 transition-all shadow-[0_14px_28px_rgba(14,165,233,0.28)] hover:shadow-[0_18px_34px_rgba(14,165,233,0.36)] disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]">
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
                <p className="pt-2 text-center text-base text-slate-900">Already have an account?</p>
                <Link to="/" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:shadow-blue-100 transition-all active:scale-[0.98]">
                  <UserPlus className="w-5 h-5" /> Sign in
                </Link>
              </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
