import { useState, useEffect } from 'react'
import { FileText, Download, Eye } from 'lucide-react'
import { downloadAdminReport, previewAdminReport, getAdminGeneralReportData } from '../../api'

export default function AdminInstitutionReports() {
  const [downloading, setDownloading] = useState(false)
  const [pdfPreviewing, setPdfPreviewing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfHtmlContent, setPdfHtmlContent] = useState('')

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminGeneralReportData()
      setReportData(data)
    } catch (e) {
      setError(e?.message || 'Failed to load report data')
      setReportData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCsvDownload = async () => {
    setError(null)
    setDownloading(true)
    try {
      await downloadAdminReport('general', 'institution-general-report.csv')
    } catch (e) {
      setError(e?.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handlePdfPreview = async () => {
    setError(null)
    setPdfPreviewing(true)
    try {
      const htmlContent = await previewAdminReport('general', 'institution-general-report.pdf')
      setPdfHtmlContent(htmlContent)
      setShowPdfModal(true)
    } catch (e) {
      setError(e?.message || 'PDF preview failed')
    } finally {
      setPdfPreviewing(false)
    }
  }

  const handleClosePdfModal = () => {
    setShowPdfModal(false)
    setPdfHtmlContent('')
  }

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(pdfHtmlContent)
      printWindow.document.close()
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
      }
    } else {
      setError('Please allow pop-ups to download/print the PDF.')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Institution Performance Report</h2>
              <p className="text-sm text-slate-500 mt-0.5 max-w-xl">
                Consolidated institution-wide report with executive summary and student performance data across all sections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCsvDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading…' : 'Download CSV'}
            </button>
            <button
              type="button"
              onClick={handlePdfPreview}
              disabled={pdfPreviewing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-60 transition-colors shadow-sm"
            >
              <Eye className="w-4 h-4" />
              {pdfPreviewing ? 'Loading…' : 'Preview PDF'}
            </button>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/30">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Report contents</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Executive summary with key institution metrics
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Student performance data across all sections
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Department and instructor coverage analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              Risk status and referral tracking
            </li>
          </ul>
        </div>

        {/* Report Preview Section */}
        <div className="p-6 border-t border-slate-100">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Report Preview</h3>
            <p className="text-sm text-slate-600 mt-1">View the report data summary. Use "Preview PDF" to open the PDF in browser before downloading.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Enrollments</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{reportData.summary?.total_enrollments ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Sections</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{reportData.summary?.total_sections ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Instructors</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{reportData.summary?.total_instructors ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Students at Risk</p>
                  <p className="mt-2 text-xl font-bold text-red-700">{reportData.summary?.students_at_risk ?? 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-teal-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Referred to AMU</p>
                  <p className="mt-2 text-xl font-bold text-teal-700">{reportData.summary?.referred_to_amu ?? 0}</p>
                </div>
              </div>

              {/* At-Risk Students Table */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">At-Risk Students (Top 20)</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Student Email</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Prediction</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Course</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Instructor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(reportData.at_risk_rows) && reportData.at_risk_rows.length > 0 ? (
                        reportData.at_risk_rows.slice(0, 20).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-700">{row.student_email || '-'}</td>
                            <td className="px-4 py-2 text-slate-700">{row.prediction_label || '-'}</td>
                            <td className="px-4 py-2 text-slate-700">{row.course || '-'}</td>
                            <td className="px-4 py-2 text-slate-700">{row.instructor || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No at-risk students found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Report Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download/Print PDF
                </button>
                <button
                  onClick={handleClosePdfModal}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-100 min-h-0">
              <iframe
                id="pdf-preview-iframe"
                srcDoc={pdfHtmlContent}
                className="w-full h-full border-0 rounded-lg"
                title="Report Preview"
                sandbox="allow-same-origin allow-scripts allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
