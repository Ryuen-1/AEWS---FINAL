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
  const sharedClass = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/40 ${
    error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
  }`
  const helpText = field.help_text ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{field.help_text}</p> : null
  const label = (
    <span className="mb-1 block text-sm font-medium text-slate-700">
      {field.label}
      {field.required ? <span className="ml-1 text-red-600">*</span> : null}
    </span>
  )
  const errorText = error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null

  if (field.type === 'boolean') {
    return (
      <label key={field.id} className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-50 ${error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => setValue(field.name, e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
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
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[calc(100vh-5rem)]">
        <div className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">{formTemplate?.title || 'Needs Assessment Form'}</h1>
              <p className="mt-1 text-sm text-slate-500">Academic Early Warning System</p>
            </div>
          </div>
        </div>

        <div className="clean-scrollbar flex-1 overflow-y-auto px-6 py-6">
          {loading && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
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

          {!loading && success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!loading && meta && (
            <div className="space-y-6">
              {meta.referral_reason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
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

              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 sm:grid-cols-3">
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
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                  This form was already completed. Thank you for submitting your response.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
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
                      <section key={section.id} className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5">
                        <div className="border-b border-slate-100 pb-3">
                          <h2 className="text-base font-semibold tracking-tight text-slate-900">{section.title}</h2>
                          {section.description ? <p className="mt-1 text-sm leading-relaxed text-slate-500">{section.description}</p> : null}
                        </div>
                        <div className={`mt-4 grid gap-3 ${allBoolean ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
                          {section.fields.map((field) => renderField(field, formValues[field.name], setValue, fieldErrors[field.name]))}
                        </div>
                      </section>
                    )
                  })}

                  <div className="sticky bottom-0 z-10 -mx-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
                    <div className="mx-auto flex max-w-4xl items-center justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
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
