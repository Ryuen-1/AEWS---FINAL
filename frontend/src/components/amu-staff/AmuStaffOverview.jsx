import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Users, ClipboardList, BookOpen, FileCheck2, HeartHandshake, BarChart3 } from 'lucide-react'
import { getAmuStaffOverview } from '../../api'
import { useAuth } from '../../context/AuthContext'

function KpiCard({ label, value, sub, icon, tone = 'neutral' }) {
  const Icon = icon
  const containerTone = tone === 'highlight'
    ? 'bg-gradient-to-br from-teal-50/80 to-white border-teal-100'
    : 'bg-white border-slate-200/80'

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${containerTone}`}>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          <span className="rounded-lg bg-teal-50 p-2 text-teal-700"><Icon className="h-4 w-4" aria-hidden="true" /></span>
        </div>
        <p className="mt-3 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">{sub}</p>
      </div>
    </div>
  )
}

function WorkflowCard({ step, title, text, to, action }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-5">
      <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">{step}</span>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 mb-5 text-[13px] leading-6 text-slate-600">{text}</p>
      <Link to={to} className="mt-auto inline-flex items-center gap-2 self-start rounded text-xs font-semibold text-teal-700 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600">{action}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </div>
  )
}

export default function AmuStaffOverview() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    getAmuStaffOverview()
      .then((nextData) => {
        if (isMounted) {
          setData(nextData)
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load overview')
          setData(null)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const referralsCount = data?.referrals_count ?? 0
  const coursesMonitored = data?.courses_monitored ?? 0
  const referralsNeedingAssessment = data?.needs_assessment_queue ?? 0
  const predictionsReady = data?.prediction_ready ?? 0
  const savedOutcomes = Math.max(0, referralsCount - referralsNeedingAssessment)
  const outcomePercent = referralsCount > 0 ? Math.round(savedOutcomes / referralsCount * 100) : 0

  const cards = [
    { label: 'Assigned referrals', value: String(referralsCount), sub: 'Referral records currently assigned to you', icon: Users, tone: 'highlight' },
    { label: 'Awaiting a decision', value: String(referralsNeedingAssessment), sub: 'Referrals without a saved AMU outcome', icon: ClipboardList },
    { label: 'Classes monitored', value: String(coursesMonitored), sub: 'Classes represented in your referrals', icon: BookOpen },
    { label: 'Assessments available', value: String(predictionsReady), sub: 'Pending referrals with assessment data to review', icon: FileCheck2 },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-sm" aria-busy={loading}>
      <div className="relative overflow-hidden border-b border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 px-5 py-7 sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-teal-100/40" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">Academic Monitoring Unit</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Welcome back{user?.name ? `, ${user.name}` : ''}.</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">A clear view of your referrals and the next steps in student support. Pick up a review or see how your assigned cases are progressing.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/amu-staff?tab=referrals" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">Review referrals<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <Link to="/amu-staff?tab=reports" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"><BarChart3 className="h-4 w-4" aria-hidden="true" />View reports</Link>
            </div>
          </div>
          <div className="hidden rounded-2xl border border-white bg-white/80 p-5 shadow-sm lg:block" aria-hidden="true"><HeartHandshake className="h-12 w-12 text-teal-600" strokeWidth={1.25} /></div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {loading && (
          <div role="status" className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-10 h-10 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-500">Loading overview...</span>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200/80 px-3 py-2.5 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="space-y-2" aria-label="Overview">
              <h3 className="text-sm font-semibold text-slate-900">Your support overview</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <KpiCard key={card.label} {...card} />
                ))}
              </div>
            </section>

            <section className="grid gap-5 rounded-xl border border-teal-100 bg-white p-5 sm:grid-cols-2" aria-label="Referral follow-up summary">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Where to focus</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{referralsCount === 0 ? 'Ready for your first referral' : referralsNeedingAssessment > 0 ? `${referralsNeedingAssessment} referral${referralsNeedingAssessment === 1 ? '' : 's'} awaiting a decision` : 'All assigned referrals have a saved outcome'}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{referralsCount === 0 ? 'Your summary will update when an instructor’s referral is assigned to you.' : referralsNeedingAssessment > 0 ? 'Review the available information and record the appropriate support route for each case.' : 'Continue coordinating follow-up support and use Reports to review your saved decisions.'}</p>
              </div>
              <div className="flex flex-col justify-center rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">Outcomes recorded</span><span className="font-bold tabular-nums text-teal-700">{savedOutcomes} / {referralsCount}</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Assigned referrals with a saved outcome" aria-valuemin={0} aria-valuemax={100} aria-valuenow={outcomePercent}><div className="h-full rounded-full bg-teal-600" style={{ width: `${outcomePercent}%` }} /></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">{referralsCount ? `${outcomePercent}% have a saved decision. This does not indicate completed support.` : 'No assigned referrals yet.'}</p>
              </div>
            </section>

            <section className="space-y-3">
              <div><h3 className="text-sm font-semibold text-slate-900">Your student support workflow</h3><p className="mt-1 text-xs text-slate-500">Go directly to the tools you need for each step.</p></div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <WorkflowCard
                  step="01"
                  title="Review incoming referrals"
                  text="Review the student’s grades, attendance, and referral details to understand the case."
                  to="/amu-staff?tab=referrals"
                  action="Open referrals"
                />
                <WorkflowCard
                  step="02"
                  title="Review needs assessments"
                  text="Check available responses for the academic, personal, and external factors affecting the student."
                  to="/amu-staff/needs-assessments"
                  action="View assessments"
                />
                <WorkflowCard
                  step="03"
                  title="Record a support decision"
                  text="Review each case and save the appropriate mentoring, counselling, or other follow-up route."
                  to="/amu-staff?tab=referrals"
                  action="Review support routes"
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
