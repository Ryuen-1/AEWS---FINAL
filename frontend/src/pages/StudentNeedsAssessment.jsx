import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, LoaderCircle } from 'lucide-react'
import { getPublicNeedsAssessment, submitPublicNeedsAssessment } from '../api'

const EMPTY_FORM = {}

function normalizeSections(form) {
  if (!form || !Array.isArray(form.sections)) return []
  return [...form.sections]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((section) => ({
      ...section,
      fields: Array.isArray(section.fields)
        ? [...section.fields].filter((field) => field?.active !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [],
    }))
}

function initialValuesFromSections(sections) {
  const values = {}
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.type === 'boolean') values[field.name] = false
      else values[field.name] = ''
    }
  }
  return values
}

function buildSubmissionPayload(values, sections) {
  const payload = {}
  for (const section of sections) {
    for (const field of section.fields) {
      const rawValue = values[field.name]
      if (field.type === 'number') {
        payload[field.name] = rawValue === '' ? null : Number(rawValue)
      } else if (field.type === 'textarea' || field.type === 'text' || field.type === 'select') {
        payload[field.name] = String(rawValue ?? '').trim() || null
      } else {
        payload[field.name] = rawValue
      }
    }
  }
  return payload
}

function isEmptyRequiredValue(field, value) {
  if (field.type === 'boolean') return value !== true
  if (field.type === 'number') return value === '' || value === null || value === undefined
  return String(value ?? '').trim() === ''
}

function validateRequiredFields(values, sections) {
  const nextErrors = {}
  for (const section of sections) {
    for (const field of section.fields) {
      if (!field.required) continue
      if (isEmptyRequiredValue(field, values[field.name])) {
        nextErrors[field.name] = 'This field is required.'
      }
    }
  }
  return nextErrors
}

function renderField(field, value, setValue, error) {
  const sharedClass = `w-full rounded-xl border px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 ${
    error ? 'border-red-300 bg-red-50/50' : 'border-slate-200 bg-white'
  }`
  const helpText = field.help_text ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{field.help_text}</p> : null
  const label = (
    <span className="mb-2 block text-sm font-semibold text-slate-700">
      {field.label}
      {field.required ? <span className="ml-1 text-red-600">*</span> : null}
    </span>
  )
  const errorText = error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null

  if (field.type === 'boolean') {
    return (
      <label key={field.id} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40 ${error ? 'border-red-300 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setValue(field.name, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>
          {field.label}
          {field.required ? <span className="ml-1 text-red-600">*</span> : null}
          {helpText}
          {errorText}
        </span>
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label key={field.id} className="block">
        {label}
        <textarea
          rows={5}
          value={value ?? ''}
          onChange={(e) => setValue(field.name, e.target.value)}
          placeholder={field.placeholder || ''}
          className={sharedClass}
        />
        {helpText}
        {errorText}
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label key={field.id} className="block">
        {label}
        <select value={value ?? ''} onChange={(e) => setValue(field.name, e.target.value)} className={sharedClass}>
          <option value="">Select an option</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {helpText}
        {errorText}
      </label>
    )
  }

  return (
    <label key={field.id} className="block">
      {label}
      <input
        type={field.type === 'number' ? 'number' : 'text'}
        step={field.type === 'number' ? '0.01' : undefined}
        value={value ?? ''}
        onChange={(e) => setValue(field.name, e.target.value)}
        placeholder={field.placeholder || ''}
        className={sharedClass}
      />
      {helpText}
      {errorText}
    </label>
  )
}

export default function StudentNeedsAssessment() {
  const { token } = useParams()
  const [meta, setMeta] = useState(null)
  const [formTemplate, setFormTemplate] = useState(null)
  const [formValues, setFormValues] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const sections = useMemo(() => normalizeSections(formTemplate), [formTemplate])
  const totalFields = useMemo(
    () => sections.reduce((sum, section) => sum + section.fields.length, 0),
    [sections]
  )
  const requiredFields = useMemo(
    () => sections.reduce((sum, section) => sum + section.fields.filter((field) => field.required).length, 0),
    [sections]
  )

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError('')
        const data = await getPublicNeedsAssessment(token)
        if (cancelled) return
        setMeta(data)
        setFormTemplate(data.form || null)
        
        // Initialize form values with default values
        const initialValues = initialValuesFromSections(normalizeSections(data.form))
        
        // Merge with prefill values from referral reasons
        const prefillValues = data.prefill_values || {}
        const mergedValues = { ...initialValues, ...prefillValues }
        
        setFormValues(mergedValues)
        setFieldErrors({})
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load form')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const setValue = (name, nextValue) => {
    setFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setFormValues((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = validateRequiredFields(formValues, sections)
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError('Please complete all required fields before submitting.')
      return
    }
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      setFieldErrors({})
      await submitPublicNeedsAssessment(token, buildSubmissionPayload(formValues, sections))
      setSuccess('Your needs assessment has been submitted successfully.')
      setMeta((prev) => ({ ...(prev || {}), status: 'completed', can_submit: false }))
    } catch (err) {
      setError(err.message || 'Failed to submit form')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#dcecff_0,#edf6ff_38%,#f8fbff_68%,#eef6ff_100%)] px-4 py-6 sm:py-10">
      <div className="pointer-events-none fixed -left-24 top-10 h-72 w-72 rounded-full bg-blue-300/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-blue-100/80 bg-white shadow-2xl shadow-blue-900/10 sm:h-[calc(100vh-5rem)]">
        <div className="relative z-20 border-b border-blue-100 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Student support form</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formTemplate?.title || 'Needs Assessment Form'}</h1>
              <p className="mt-1 text-sm text-slate-500">Academic Early Warning System</p>
            </div>
          </div>
        </div>

        <div className="clean-scrollbar relative z-10 flex-1 overflow-y-auto bg-slate-50/60 px-6 pt-6">
          {loading && (
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-4 text-sm text-slate-600">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading form...
            </div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && meta && (
            <div className="space-y-5">
              {meta.referral_reason && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Why you were referred:</p>
                      <p className="mt-1">{meta.referral_reason}</p>
                      {meta.subject_code && meta.subject_name && (
                        <p className="mt-2 text-xs text-amber-700">
                          Subject: {meta.subject_code} - {meta.subject_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3.5 text-sm text-slate-700 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Student</p>
                  <p className="mt-1 font-medium text-slate-900">{meta.student_name || 'Student'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Student ID</p>
                  <p className="mt-1 font-medium text-slate-900">{meta.student_id || 'Not available'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 font-medium text-slate-900 break-all">{meta.student_email || 'Not available'}</p>
                </div>
              </div>

              {!meta.can_submit ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-900">Needs assessment submitted</p>
                      <p className="mt-1 leading-6 text-emerald-800">
                        {success || 'This form was already completed. Thank you for submitting your response.'}
                      </p>
                      <p className="mt-1 text-xs font-medium text-emerald-700">AMU staff can now review your response.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">{sections.length} section{sections.length === 1 ? '' : 's'}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{totalFields} field{totalFields === 1 ? '' : 's'}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{requiredFields} required</span>
                    <span className="ml-auto">Fields marked with <span className="text-red-600">*</span> are required.</span>
                  </div>

                  {sections.map((section) => {
                    const allBoolean = section.fields.length > 0 && section.fields.every((field) => field.type === 'boolean')
                    return (
                      <section key={section.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
                        <div className="border-b border-slate-100 pb-3">
                          <h2 className="text-base font-bold tracking-tight text-slate-900">{section.title}</h2>
                          {section.description ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{section.description}</p> : null}
                        </div>
                        <div className={`mt-4 grid gap-3 ${allBoolean ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                          {section.fields.map((field) => renderField(field, formValues[field.name], setValue, fieldErrors[field.name]))}
                        </div>
                      </section>
                    )
                  })}

                  <div className="sticky bottom-0 z-30 -mx-6 mt-6 rounded-b-[1.75rem] border-t border-blue-100 bg-white px-6 py-4 shadow-[0_-18px_30px_rgba(255,255,255,1)]">
                    <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
                      <p className="hidden text-xs text-slate-500 sm:block">Review your answers before submitting. Once submitted, AMU staff can review your response.</p>
                      <button
                        type="submit"
                        disabled={saving}
                        className="ml-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-700 hover:to-sky-600 disabled:opacity-60"
                      >
                        {saving ? 'Submitting...' : 'Submit Needs Assessment'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
