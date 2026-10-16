import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, GraduationCap, LoaderCircle, School, UserRoundCheck } from 'lucide-react'
import { completeStudentProfile, getStudentProfile } from '../api'

const COLLEGES = [
  'College of Business',
  'College of Arts and Sciences',
  'College of Nursing',
  'College of Medicine',
  'College of Technologies',
  'College of Education',
]

const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate / Other']

export default function StudentProfileCompletion() {
  const navigate = useNavigate()
  const studentUser = useMemo(() => JSON.parse(localStorage.getItem('student_user') || '{}'), [])
  const [form, setForm] = useState({ college: '', program: '', year_level: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!studentUser.id) {
      navigate('/student-login', { replace: true })
      return
    }
    getStudentProfile()
      .then((profile) => {
        if (profile.profile_completed) {
          const updated = { ...studentUser, ...profile, id: studentUser.id }
          localStorage.setItem('student_user', JSON.stringify(updated))
          navigate('/student-dashboard', { replace: true })
          return
        }
        setForm({
          college: profile.college || '',
          program: profile.program || '',
          year_level: profile.year_level || '',
        })
      })
      .catch((err) => setError(err.message || 'Unable to load your profile.'))
      .finally(() => setLoading(false))
  }, [navigate, studentUser])

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!form.college || !form.program.trim() || !form.year_level) {
      setError('College, program, and year level are all required.')
      return
    }
    try {
      setSaving(true)
      const profile = await completeStudentProfile({ ...form, program: form.program.trim() })
      localStorage.setItem('student_user', JSON.stringify({ ...studentUser, ...profile, id: studentUser.id }))
      navigate('/student-dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><LoaderCircle className="h-8 w-8 animate-spin text-blue-600" /></div>

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-sky-100 p-4">
      <form onSubmit={submit} className="w-full max-w-lg overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-blue-900/10">
        <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-7 py-8 text-white">
          <UserRoundCheck className="h-9 w-9" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">One last step</p>
          <h1 className="mt-1 text-2xl font-bold">Complete your student profile</h1>
          <p className="mt-2 text-sm text-blue-50">Please provide your academic details before accessing your dashboard.</p>
        </div>
        <div className="space-y-5 p-7">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><Building2 className="h-4 w-4 text-blue-600" />College</span><select value={form.college} onChange={(e) => setField('college', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"><option value="">Select your college</option>{COLLEGES.map((college) => <option key={college} value={college}>{college}</option>)}</select></label>
          <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><School className="h-4 w-4 text-blue-600" />Program</span><input value={form.program} onChange={(e) => setField('program', e.target.value)} maxLength={100} placeholder="e.g., Bachelor of Science in Information Technology" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" /></label>
          <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><GraduationCap className="h-4 w-4 text-blue-600" />Year level</span><select value={form.year_level} onChange={(e) => setField('year_level', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"><option value="">Select your year level</option>{YEAR_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{saving ? 'Saving profile...' : 'Save and continue'}</button>
        </div>
      </form>
    </main>
  )
}
