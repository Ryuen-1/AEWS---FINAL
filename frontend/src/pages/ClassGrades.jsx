import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileSpreadsheet, Upload, BookOpen } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ScrollTableContainer from '../components/ScrollTableContainer'
import InlineToast from '../components/InlineToast'
import { useAuth } from '../context/AuthContext'
import { getClass, getClassGrades, uploadClassFiles } from '../api'

const MIDTERM_COMPONENT_COLUMNS = [
  { key: 'class_standing', label: 'CS (30%) Midterm' },
  { key: 'laboratory', label: 'LAB (30%) Midterm' },
  { key: 'major_output', label: 'MO (40%) Midterm' },
  { key: 'midterm_grade', label: 'Midterm Grade (MTG)', computed: true },
]

function formatScoreValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return String(value)
}

function formatTopicComponentLabel(component) {
  const normalized = String(component || '').trim().toLowerCase()
  if (normalized === 'class standing') return 'Class Standing'
  if (normalized === 'major output') return 'Major Output'
  if (normalized === 'laboratory') return 'Laboratory'
  return component || 'Activity'
}

function getScoreComponentLabel(scoreKey) {
  const normalized = String(scoreKey || '').trim().toLowerCase()
  if (normalized.startsWith('midterm_class_standing_')) return 'Class Standing'
  if (normalized.startsWith('midterm_laboratory_')) return 'Laboratory'
  if (normalized.startsWith('midterm_major_output_')) return 'Major Output'
  return ''
}

function getScoreActivityLabel(scoreKey) {
  const normalized = String(scoreKey || '').trim().toLowerCase()
  let text = normalized
  for (const prefix of ['midterm_class_standing_', 'midterm_laboratory_', 'midterm_major_output_']) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length)
      break
    }
  }
  return text
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase()) || 'Untitled activity'
}

function getTopicsToWatchGroups(student) {
  const grouped = new Map()
  const scores = student?.scores || {}

  for (const [scoreKey, rawValue] of Object.entries(scores)) {
    const component = getScoreComponentLabel(scoreKey)
    if (!component) continue
    const numericValue = Number(rawValue)
    if (Number.isNaN(numericValue)) continue

    if (!grouped.has(component)) grouped.set(component, [])
    grouped.get(component).push({
      key: scoreKey,
      title: getScoreActivityLabel(scoreKey),
      score: numericValue,
    })
  }

  return Array.from(grouped.entries()).map(([label, items]) => ({
    label: formatTopicComponentLabel(label),
    items: items.sort((a, b) => a.title.localeCompare(b.title)),
  }))
}

function buildTopicsToWatchColumns(students) {
  const componentOrder = ['Class Standing', 'Laboratory', 'Major Output']
  const grouped = new Map(componentOrder.map((label) => [label, new Map()]))

  for (const student of students || []) {
    for (const group of getTopicsToWatchGroups(student)) {
      const componentMap = grouped.get(group.label)
      if (!componentMap) continue
      for (const item of group.items) {
        if (!componentMap.has(item.key)) {
          componentMap.set(item.key, { key: item.key, title: item.title })
        }
      }
    }
  }

  return componentOrder.map((label) => ({
    label,
    columns: Array.from(grouped.get(label)?.values() || []).sort((a, b) => a.title.localeCompare(b.title)),
  }))
}

function getTopicsGroupClasses(index, total) {
  const base = 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border-b-2 border-slate-300'
  const edges = [
    index === 0 ? 'border-l border-slate-300' : 'border-l border-slate-200',
    'border-r border-slate-300',
    index === total - 1 ? '' : '',
  ]
  return `${base} ${edges.join(' ')}`
}

function getTopicsSubheaderClasses(isGroupStart, isGroupEnd) {
  const edges = [
    isGroupStart ? 'border-l border-slate-200' : '',
    isGroupEnd ? 'border-r border-slate-200' : '',
  ]
  return `px-4 py-2.5 text-left text-xs font-semibold text-slate-600 bg-white border-b border-slate-200 whitespace-nowrap ${edges.join(' ')}`
}

function getTopicsCellClasses(isGroupStart, isGroupEnd) {
  const edges = [
    isGroupStart ? 'border-l border-slate-200' : '',
    isGroupEnd ? 'border-r border-slate-200' : '',
  ]
  return `px-4 py-3 text-center text-slate-700 whitespace-nowrap ${edges.join(' ')}`
}

function formatAutoReferralUploadMessage(students) {
  if (!Array.isArray(students) || students.length === 0) return ''
  const first = students[0] || {}
  const reasons = Object.entries(first.referral_reasons || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => {
      if (key === 'on_probation_status') return 'on probation status'
      if (key === 'grade_2_5_or_below') return 'midterm grade is 2.50 or below'
      if (key === 'gwa_2_5_or_below') return 'GWA is 2.5 or below'
      if (key === 'low_midterm_performance') return 'low midterm academic performance'
      if (key === 'difficulty_catching_up') return 'difficulty with catching up instructions'
      return key
    })

  if (students.length === 1) {
    const label = first.student_name || first.student_id || first.student_email || 'The student'
    const reasonText = reasons.length > 0 ? reasons[0] : 'the referral rules'
    return `The system automatically referred ${label} to AMU due to ${reasonText}.`
  }

  return `The system automatically referred ${students.length} students to AMU after this grades upload.`
}

export default function ClassGrades() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [classData, setClassData] = useState(null)
  const [gradesData, setGradesData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingGradesheet, setUploadingGradesheet] = useState(false)
  const [gradesheetError, setGradesheetError] = useState('')
  const [gradesheetSuccess, setGradesheetSuccess] = useState('')
  const [activeView, setActiveView] = useState('midterm-grade')
  const gradesheetInputRef = useRef()

  const instructorSubtitle = user ? [user.name, user.college].filter(Boolean).join(' - ') || 'Instructor' : 'Instructor'

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      const [klass, grades] = await Promise.all([getClass(id), getClassGrades(id)])
      setClassData(klass)
      setGradesData(grades)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load class grades')
      setClassData(null)
      setGradesData(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!gradesheetSuccess) return undefined
    const timeoutId = window.setTimeout(() => setGradesheetSuccess(''), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [gradesheetSuccess])

  const handleGradesheetUpload = async (e) => {
    setGradesheetError('')
    setGradesheetSuccess('')
    const files = e.target.files
    if (!files || files.length === 0) {
      setGradesheetError('Please select a midterm gradesheet file (CSV or XLSX).')
      return
    }
    setUploadingGradesheet(true)
    try {
      const result = await uploadClassFiles(id, files, 'gradesheet')
      const updated = result?.updated ?? 0
      const notEnrolled = result?.not_enrolled?.length ?? 0
      const missingIdentifiers = result?.missing_identifiers ?? 0
      const parts = [`Midterm grades uploaded. Updated ${updated} student record(s).`]
      if (notEnrolled) parts.push(`${notEnrolled} row(s) did not match enrolled students.`)
      if (missingIdentifiers) parts.push(`${missingIdentifiers} row(s) had no usable student identifier.`)
      const autoReferralMessage = formatAutoReferralUploadMessage(result?.auto_referred_students)
      if (autoReferralMessage) parts.push(autoReferralMessage)
      setGradesheetSuccess(parts.join(' '))
      await loadData()
    } catch (err) {
      const errorMessage = err.message || 'Upload failed'
      setGradesheetError(errorMessage)
    } finally {
      setUploadingGradesheet(false)
      if (gradesheetInputRef.current) gradesheetInputRef.current.value = ''
    }
  }

  const students = useMemo(() => gradesData?.students || [], [gradesData?.students])
  const topicsToWatchColumns = useMemo(() => buildTopicsToWatchColumns(students), [students])

  const visibleColumns = useMemo(
    () =>
      MIDTERM_COMPONENT_COLUMNS.map((col) => ({
        key: col.key,
        label: col.label,
        source: 'field',
      })),
    [],
  )

  const activeFilterLabel = activeView === 'topics-to-watch' ? 'Midterm Topics to Watch' : 'Midterm Grade'

  if (loading) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <p className="text-sm text-slate-600">Loading grades page...</p>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate(`/instructor/class/${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Class
          </button>
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      </DashboardLayout>
    )
  }

  const subjectCode = classData?.subject_code || gradesData?.class?.subject_code || ''
  const subjectName = classData?.subject_name || gradesData?.class?.subject_name || ''
  const sectionCode = classData?.section_code || gradesData?.class?.section_code || ''

  return (
    <DashboardLayout title="Instructor Dashboard" subtitle={instructorSubtitle}>
      <div className="space-y-3">
        {gradesheetError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{gradesheetError}</div>}

        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
          <input
            type="file"
            ref={gradesheetInputRef}
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            onChange={handleGradesheetUpload}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate(`/instructor/class/${id}`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 mb-2.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Class Details
              </button>
              <div className="flex items-center gap-2 mb-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Grades - {subjectCode}: {subjectName}</h2>
                  {sectionCode && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Section: <span className="font-semibold text-slate-700">{sectionCode}</span>
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-600">Upload the midterm gradesheet here. Attendance should be uploaded separately from the Attendance page.</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              Current Term Grades
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  disabled={uploadingGradesheet}
                  onClick={() => gradesheetInputRef.current && gradesheetInputRef.current.click()}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingGradesheet ? 'Uploading grades...' : 'Upload midterm grades'}
                </button>
              </div>
          </div>
          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('midterm-grade')}
                className={`inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeView === 'midterm-grade'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Midterm Grade
              </button>
              <button
                type="button"
                onClick={() => setActiveView('topics-to-watch')}
                disabled={students.length === 0}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  activeView === 'topics-to-watch'
                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                    : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Topics to Watch
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Class Grade Records - {activeFilterLabel}</h3>
          </div>

          {students.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No grades uploaded yet for this class.</div>
          ) : activeView === 'midterm-grade' && visibleColumns.length === 0 ? (
            <div className="p-6 text-sm text-slate-500 text-center">No score columns available for this term filter.</div>
          ) : (
            <div className="space-y-2">
              {activeView === 'topics-to-watch' ? (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                  <span className="font-medium">Scroll both horizontally and vertically within the table area.</span>
                  <span className="text-slate-500">Student ID and Name columns remain fixed on the left.</span>
                </div>
              ) : null}
            <ScrollTableContainer
              size={activeView === 'topics-to-watch' ? 'regular' : 'compact'}
              className={activeView === 'topics-to-watch' ? 'max-h-[32rem] overflow-auto' : ''}
            >
              {activeView === 'midterm-grade' ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Student No.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                      {visibleColumns.map((col) => (
                        <th key={col.key} className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-slate-700">{student.id_number || '-'}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{student.name || student.email || '-'}</td>
                        {visibleColumns.map((col) => {
                          const value = col.source === 'scores' ? student.scores?.[col.key] : student[col.key]
                          return (
                            <td key={`${student.id}-${col.key}`} className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">
                              {formatScoreValue(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-sm border-collapse">
                    <thead className="sticky top-0 z-20 bg-white">
                      <tr>
                        <th rowSpan="2" className="sticky left-0 z-30 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border-b-2 border-slate-300 border-r border-slate-200 whitespace-nowrap align-middle min-w-[120px]">Student No.</th>
                        <th rowSpan="2" className="sticky left-[120px] z-30 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border-b-2 border-slate-300 border-r border-slate-200 whitespace-nowrap align-middle min-w-[200px]">Name</th>
                        {topicsToWatchColumns.map((group, index) => (
                          <th
                            key={group.label}
                            colSpan={Math.max(group.columns.length, 1)}
                            className={getTopicsGroupClasses(index, topicsToWatchColumns.length)}
                          >
                            {group.label}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {topicsToWatchColumns.flatMap((group) =>
                          group.columns.length > 0 ? (
                            group.columns.map((column, columnIndex) => (
                              <th
                                key={column.key}
                                className={getTopicsSubheaderClasses(columnIndex === 0, columnIndex === group.columns.length - 1)}
                              >
                                {column.title}
                              </th>
                            ))
                          ) : (
                            <th
                              key={`${group.label}-empty`}
                              className={getTopicsSubheaderClasses(true, true)}
                            >
                              No activities
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {students.map((student, index) => (
                        <tr key={student.id} className={index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}>
                          <td className="sticky left-0 z-10 px-4 py-3 font-mono text-sm text-slate-700 whitespace-nowrap border-r border-slate-200 bg-inherit min-w-[120px]">{student.id_number || '-'}</td>
                          <td className="sticky left-[120px] z-10 px-4 py-3 font-medium text-sm text-slate-900 whitespace-nowrap border-r border-slate-200 bg-inherit min-w-[200px]">{student.name || student.email || '-'}</td>
                          {topicsToWatchColumns.flatMap((group) =>
                            group.columns.length > 0 ? (
                              group.columns.map((column, columnIndex) => (
                                <td
                                  key={`${student.id}-${column.key}`}
                                  className={`${getTopicsCellClasses(columnIndex === 0, columnIndex === group.columns.length - 1)}`}
                                >
                                  {student.scores?.[column.key] === null || student.scores?.[column.key] === undefined || student.scores?.[column.key] === '' ? (
                                    <span className="text-slate-400">-</span>
                                  ) : (
                                    <span className={`inline-flex min-w-[4rem] items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                      Number(student.scores?.[column.key]) <= 1.75
                                        ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                                        : Number(student.scores?.[column.key]) <= 2.5
                                          ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                    }`}>
                                      {formatScoreValue(student.scores?.[column.key])}
                                    </span>
                                  )}
                                </td>
                              ))
                            ) : (
                              <td
                                key={`${student.id}-${group.label}-empty`}
                                className={`${getTopicsCellClasses(true, true)} text-slate-400`}
                              >
                                -
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ScrollTableContainer>
            </div>
          )}
        </div>
      </div>
      <InlineToast
        message={gradesheetSuccess}
        tone="success"
        onClose={() => setGradesheetSuccess('')}
      />
      <InlineToast
        message={gradesheetError}
        tone="error"
        onClose={() => setGradesheetError('')}
      />
      {uploadingGradesheet && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-semibold text-slate-900">Uploading gradesheet...</p>
            <p className="text-sm text-slate-600">Please wait while we process your file.</p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
