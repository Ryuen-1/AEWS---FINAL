import { useState, useEffect } from 'react'
import { Calendar, Users, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Download, Eye } from 'lucide-react'
import { getAmuStaffReports } from '../../api'
import { useAuth } from '../../context/AuthContext'
import ScrollTableContainer from '../ScrollTableContainer'

const VERDICT_META = [
  { key: 'mentoring', label: 'Mentoring', tone: 'blue' },
  { key: 'counselling', label: 'Counselling', tone: 'emerald' },
  { key: 'both_mentoring_and_counselling', label: 'Both', tone: 'violet' },
  { key: 'monitoring_only', label: 'Monitoring', tone: 'amber' },
  { key: 'other_support', label: 'Other support', tone: 'rose' },
]

const TONE_CLASSES = {
  blue: {
    card: 'from-blue-50 to-blue-50/50',
    badge: 'bg-blue-100 text-blue-600',
  },
  emerald: {
    card: 'from-emerald-50 to-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-600',
  },
  violet: {
    card: 'from-violet-50 to-violet-50/50',
    badge: 'bg-violet-100 text-violet-600',
  },
  amber: {
    card: 'from-amber-50 to-amber-50/50',
    badge: 'bg-amber-100 text-amber-600',
  },
  rose: {
    card: 'from-rose-50 to-rose-50/50',
    badge: 'bg-rose-100 text-rose-600',
  },
}

export default function AmuStaffReports() {
  const [rows, setRows] = useState([])
  const [routingSummary, setRoutingSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfHtmlContent, setPdfHtmlContent] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    let isMounted = true
    getAmuStaffReports()
      .then((data) => {
        if (isMounted) {
          setRows(Array.isArray(data?.history) ? data.history : [])
          setRoutingSummary(data?.support_routing_summary && typeof data.support_routing_summary === 'object' ? data.support_routing_summary : {})
          setError(null)
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load reports')
          setRows([])
          setRoutingSummary({})
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const totalReferrals = rows.reduce((sum, r) => sum + (r.referrals || 0), 0)
  const avgPerMonth = rows.length > 0 ? Math.round(totalReferrals / rows.length) : 0
  const currentMonth = rows[0]
  const previousMonth = rows[1]
  const monthlyChange = currentMonth && previousMonth ? currentMonth.referrals - previousMonth.referrals : 0
  const totalWithRouting = Number(routingSummary.total_with_routing || 0)

  const handlePdfExport = () => {
    setError(null)
    setExporting(true)
    try {
      const today = new Date().toLocaleDateString()
      const html = `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>AMU Staff Report PDF</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #0f172a;
              margin: 24px;
              line-height: 1.4;
            }
            h1, h2, h3, p {
              margin: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              margin-bottom: 20px;
            }
            .meta {
              color: #475569;
              font-size: 12px;
              margin-top: 6px;
            }
            .cards {
              display: grid;
              grid-template-columns: repeat(5, minmax(0, 1fr));
              gap: 12px;
              margin: 20px 0;
            }
            .card {
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              padding: 12px;
              background: #f8fafc;
            }
            .card-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
              margin-bottom: 6px;
            }
            .card-value {
              font-size: 22px;
              font-weight: 700;
            }
            .section-title {
              margin: 24px 0 10px;
              font-size: 15px;
              font-weight: 700;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #cbd5e1;
              color: #64748b;
              font-size: 11px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 8px;
              vertical-align: top;
              word-break: break-word;
            }
            th {
              background: #e2e8f0;
              text-align: left;
            }
            @media print {
              @page {
                margin: 0;
              }
              body {
                margin: 1.5cm;
              }
              .print-note {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header" style="display: flex; align-items: center; justify-content: center; gap: 20px; text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px;">
            <img src="${window.location.origin}/buksu-logo.png" alt="BukSU Logo" style="width: 80px; height: 80px; object-fit: contain;" />
            <div>
              <div style="font-weight: bold; font-size: 18px; font-family: 'Times New Roman', Times, serif;">BUKIDNON STATE UNIVERSITY</div>
              <div style="font-size: 14px; font-family: 'Times New Roman', Times, serif;">Malaybalay City, Bukidnon 8700</div>
              <div style="font-size: 12px; font-family: 'Times New Roman', Times, serif; margin-bottom: 15px;">Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph</div>
              <h1 style="font-size: 18px; margin-top: 10px; font-family: Arial, sans-serif;">AMU Staff Performance Report</h1>
              <p class="meta" style="margin: 0; padding: 0;">Academic Monitoring Unit</p>
              <p class="meta" style="margin: 0; padding: 0;">Staff Member: ${user?.name || 'Not specified'}</p>
              <p class="meta" style="margin: 0; padding: 0;">College: ${user?.college || 'Not specified'}</p>
            </div>
            <div style="width: 80px;"></div>
          </div>

          <p class="print-note">Use your browser's destination set to "Save as PDF" to download this report as a PDF file.</p>

          <div class="section-title">Executive Summary</div>
          <div class="cards">
            <div class="card">
              <div class="card-label">Total Referrals</div>
              <div class="card-value">${totalReferrals}</div>
            </div>
            <div class="card">
              <div class="card-label">Monthly Avg</div>
              <div class="card-value">${avgPerMonth}</div>
            </div>
            <div class="card">
              <div class="card-label">This Month</div>
              <div class="card-value">${currentMonth?.referrals || 0}</div>
            </div>
            <div class="card">
              <div class="card-label">With Support Routing</div>
              <div class="card-value">${totalWithRouting}</div>
            </div>
            <div class="card">
              <div class="card-label">Trend</div>
              <div class="card-value">${monthlyChange > 0 ? '+' : ''}${monthlyChange}</div>
            </div>
          </div>

          <div class="section-title">Support Routing Summary</div>
          <table>
            <thead>
              <tr>
                <th>Support Type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              ${VERDICT_META.map(item => `
                <tr>
                  <td>${item.label}</td>
                  <td>${Number(routingSummary[item.key] || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="section-title">Monthly Referral History</div>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Referrals</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row.period || '-'}</td>
                  <td>${row.referrals || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Generated: ${today}</p>
            <p>Academic Term: 2nd Semester 2025-2026</p>
          </div>
        </body>
      </html>`

      setPdfHtmlContent(html)
      setShowPdfModal(true)
    } catch (err) {
      setError(err.message || 'Failed to generate PDF preview.')
    } finally {
      setExporting(false)
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Referrals</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalReferrals}</p>
              <p className="mt-1 text-xs text-slate-500">across all periods</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-cyan-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Monthly Avg</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{avgPerMonth}</p>
              <p className="mt-1 text-xs text-slate-500">students per month</p>
            </div>
            <div className="rounded-lg bg-cyan-100 p-2.5">
              <BarChart3 className="h-5 w-5 text-cyan-700" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{currentMonth?.referrals || 0}</p>
              <p className="mt-1 text-xs text-slate-500">{currentMonth?.period || 'No data'}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-2.5">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-amber-50 to-amber-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Trend</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{Math.abs(monthlyChange)}</p>
                {monthlyChange !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 rounded px-2 py-1 text-xs font-semibold ${monthlyChange > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {monthlyChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {monthlyChange > 0 ? 'Up' : 'Down'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">vs. last month</p>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Support Routing Summary</h3>
            <p className="mt-1 text-sm text-slate-600">Shows how many referred students were routed to mentoring, counselling, or other AMU follow-up paths.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {totalWithRouting} saved routings
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {VERDICT_META.map((item) => {
            const value = Number(routingSummary[item.key] || 0)
            const tone = TONE_CLASSES[item.tone]
            return (
              <div key={item.key} className={`rounded-xl border border-slate-200 bg-gradient-to-br ${tone.card} p-4`}>
                <div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Monthly Referral History</h3>
            <p className="mt-1 text-sm text-slate-600">Detailed breakdown of referrals by month</p>
          </div>
          <button
            onClick={handlePdfExport}
            disabled={exporting || loading || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {exporting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Preview PDF
              </>
            )}
          </button>
        </div>

        {error && <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!error && (
          <ScrollTableContainer>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Referrals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-sm text-slate-500">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-8 w-8 text-slate-300" />
                        <p className="font-medium text-slate-500">No referral data yet</p>
                        <p className="text-sm text-slate-400">Start receiving referrals to see monthly reports</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.period}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                          {row.referrals}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollTableContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">About These Reports</h4>
          <p className="text-xs text-slate-600">
            Monitor your referral activity over time and review how AMU follow-up decisions are distributed across mentoring, counselling, and other support paths.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Pro Tips</h4>
          <p className="text-xs text-slate-600">
            Use the routing summary to show how many students were directed to mentoring or counselling and to plan coordination with the right support services.
          </p>
        </div>
      </div>

      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">PDF Preview</h3>
                <p className="text-sm text-slate-500">Review the report before downloading or printing</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download/Print PDF
                </button>
                <button
                  type="button"
                  onClick={handleClosePdfModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 min-h-0">
              <iframe
                id="pdf-preview-iframe"
                srcDoc={pdfHtmlContent}
                className="w-full h-full border-0"
                title="PDF Preview"
                sandbox="allow-same-origin allow-scripts allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
