import { useState, useEffect } from 'react'
import { Calendar, Users, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Download, Eye } from 'lucide-react'
import { getAmuStaffReports } from '../../api'
import { useAuth } from '../../context/AuthContext'
import ScrollTableContainer from '../ScrollTableContainer'

const VERDICT_META = [
  { key: 'mentoring', label: 'Mentoring', tone: 'blue' },
  { key: 'counselling', label: 'Counselling', tone: 'emerald' },
  { key: 'both_mentoring_and_counselling', label: 'Mentoring and counselling', tone: 'violet' },
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
  const reportingPeriod = rows.length > 1 ? `${rows[rows.length - 1].period} – ${currentMonth.period}` : currentMonth?.period || 'No recorded period'
  const changeLabel = !previousMonth ? 'Not enough history to compare' : monthlyChange === 0 ? 'No change from the previous recorded month' : `${Math.abs(monthlyChange)} ${monthlyChange > 0 ? 'more' : 'fewer'} referrals than ${previousMonth.period}`
  const reportSummary = totalReferrals > 0
    ? `${totalReferrals.toLocaleString()} referral${totalReferrals === 1 ? '' : 's'} across ${rows.length} recorded month${rows.length === 1 ? '' : 's'}. The latest recorded month, ${currentMonth.period}, has ${currentMonth.referrals} referral${currentMonth.referrals === 1 ? '' : 's'}.`
    : 'No referrals are recorded in the available monthly history.'
  const shareOf = (value, total) => total > 0 ? `${Math.round(value / total * 100)}%` : '—'

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
              <h1 style="font-size: 18px; margin-top: 10px; font-family: Arial, sans-serif;">Consolidated Referral and Support Report</h1>
              <p class="meta" style="margin: 0; padding: 0;">Academic Monitoring Unit</p>
              <p class="meta" style="margin: 0; padding: 0;">Staff Member: ${user?.name || 'Not specified'}</p>
              <p class="meta" style="margin: 0; padding: 0;">College: ${user?.college || 'Not specified'}</p>
            </div>
            <div style="width: 80px;"></div>
          </div>

          <p class="print-note">Use your browser's destination set to "Save as PDF" to download this report as a PDF file.</p>

          <div class="section-title">Executive Summary</div>
          <p class="meta">Reporting period: ${reportingPeriod}. Up to 12 recorded months.</p>
          <p class="meta">${reportSummary} ${changeLabel}.</p>
          <div class="cards">
            <div class="card">
              <div class="card-label">Total Referrals</div>
              <div class="card-value">${totalReferrals}</div>
            </div>
            <div class="card">
              <div class="card-label">Avg / recorded month</div>
              <div class="card-value">${avgPerMonth}</div>
            </div>
            <div class="card">
              <div class="card-label">Latest recorded month</div>
              <div class="card-value">${currentMonth?.referrals || 0}</div>
            </div>
            <div class="card">
              <div class="card-label">With Support Routing</div>
              <div class="card-value">${totalWithRouting}</div>
            </div>
            <div class="card">
              <div class="card-label">Change / previous record</div>
              <div class="card-value">${previousMonth ? `${monthlyChange > 0 ? '+' : ''}${monthlyChange}` : 'N/A'}</div>
            </div>
          </div>

          <div class="section-title">Support Routing Summary</div>
          <p class="meta">${totalWithRouting} saved support decisions across all assigned referrals. These counts are not limited to the monthly reporting period and do not indicate completed support.</p>
          <table>
            <thead>
              <tr>
                <th>Support Type</th>
                <th>Count</th>
                <th>Share of saved decisions</th>
              </tr>
            </thead>
            <tbody>
              ${VERDICT_META.map(item => `
                <tr>
                  <td>${item.label}</td>
                  <td>${Number(routingSummary[item.key] || 0)}</td>
                  <td>${shareOf(Number(routingSummary[item.key] || 0), totalWithRouting)}</td>
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
                <th>Share of period total</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td>${row.period || '-'}</td>
                  <td>${row.referrals || 0}</td>
                  <td>${shareOf(row.referrals || 0, totalReferrals)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot><tr><th>Total</th><th>${totalReferrals}</th><th>${shareOf(totalReferrals, totalReferrals)}</th></tr></tfoot>
          </table>

          <div class="footer">
            <p>Generated: ${today}</p>
            <p>Reporting period: ${reportingPeriod}. Counts represent referral records, not necessarily unique students.</p>
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
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-busy={loading}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">Academic Monitoring Unit · Reports</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Consolidated referral report</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Referral activity and saved support decisions in one overview.</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700"><Calendar className="h-4 w-4 text-teal-600" />{loading ? 'Loading reporting period…' : error ? 'Reporting period unavailable' : reportingPeriod}</p>
        </div>
        <button type="button" onClick={handlePdfExport} disabled={exporting || loading || !!error || rows.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50"><Eye className="h-4 w-4" />{exporting ? 'Preparing report…' : 'Preview PDF'}</button>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading referral report…</p> : !error && <>
      <div className="rounded-lg border-l-4 border-teal-600 bg-teal-50/70 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">At a glance</h3>
        <p className="mt-1 text-sm leading-6 text-slate-700">{reportSummary} {changeLabel}.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-blue-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Referrals</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{totalReferrals}</p>
              <p className="mt-1 text-xs text-slate-500">within the reported history</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-cyan-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Monthly average</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{avgPerMonth}</p>
              <p className="mt-1 text-xs text-slate-500">referrals per recorded month, rounded</p>
            </div>
            <div className="rounded-lg bg-cyan-100 p-2.5">
              <BarChart3 className="h-5 w-5 text-cyan-700" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-50/50 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Latest recorded month</p>
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
              <p className="text-sm font-medium text-slate-600">Referral change</p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{previousMonth ? `${monthlyChange > 0 ? '+' : ''}${monthlyChange}` : '—'}</p>
                {monthlyChange !== 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {monthlyChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {monthlyChange > 0 ? 'Up' : 'Down'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{previousMonth ? `compared with ${previousMonth.period}` : 'A second recorded month is needed'}</p>
            </div>
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Support decisions</h3>
            <p className="mt-1 text-sm text-slate-600">Distribution of saved support routes across all assigned referrals.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {totalWithRouting} saved decisions
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {VERDICT_META.map((item) => {
            const value = Number(routingSummary[item.key] || 0)
            const tone = TONE_CLASSES[item.tone]
            return (
              <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(80px,1fr)_80px]">
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <div aria-hidden="true" className="hidden h-2 overflow-hidden rounded-full bg-slate-100 sm:block"><div className={`h-full rounded-full ${tone.badge.split(' ')[0]}`} style={{ width: totalWithRouting ? `${value / totalWithRouting * 100}%` : '0%' }} /></div>
                <p className="text-right text-sm tabular-nums"><span className="font-semibold text-slate-900">{value}</span><span className="ml-3 text-xs text-slate-500">{shareOf(value, totalWithRouting)}</span></p>
              </div>
            )
          })}
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">{totalWithRouting === 0 ? 'No support decisions have been saved yet. ' : 'Percentages show each route’s share of saved decisions. '}Routing counts cover all assigned referrals, not just the monthly history below. A saved route does not indicate completed support.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Monthly Referral History</h3>
            <p className="mt-1 text-sm text-slate-600">Up to 12 recorded months, newest first.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{rows.length} recorded month{rows.length === 1 ? '' : 's'}</span>
        </div>

        {error && <div className="m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!error && (
          <ScrollTableContainer>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Period</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Referrals</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Share of total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
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
                      <td className="px-6 py-4 text-right text-sm tabular-nums text-slate-600">{shareOf(row.referrals || 0, totalReferrals)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900"><tr><th scope="row" className="px-6 py-3 text-left">Period total</th><td className="px-6 py-3 text-right tabular-nums">{totalReferrals}</td><td className="px-6 py-3 text-right tabular-nums">{shareOf(totalReferrals, totalReferrals)}</td></tr></tfoot>}
            </table>
          </ScrollTableContainer>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-xs font-semibold text-slate-700">Reading this report</h4>
        <p className="mt-1 text-xs leading-5 text-slate-500">Counts represent referral records, not necessarily unique students. The monthly average uses only the months listed; months without records are not included. Changes compare the two latest recorded months, which may not be consecutive. Percentages are rounded.</p>
      </div>
      </>}

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
