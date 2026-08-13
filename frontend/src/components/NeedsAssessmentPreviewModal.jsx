import { X, Download, Eye } from 'lucide-react'
import { generateNeedsAssessmentPDF, downloadPDF } from '../utils/pdfGenerator'

export default function NeedsAssessmentPreviewModal({ isOpen, onClose, needsAssessment, studentInfo, referralInfo }) {
  if (!isOpen) return null

  const handleDownloadPDF = async () => {
    try {
      const pdf = await generateNeedsAssessmentPDF(needsAssessment, studentInfo, referralInfo)
      const filename = `${studentInfo.id_number}_needs_assessment_${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(pdf, filename)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Needs Assessment Form</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {/* BukSU Header */}
          <div className="flex flex-col items-center justify-center text-center border-b-2 border-slate-900 pb-5 mb-6">
            <img src="/buksu-logo.png" alt="BukSU Logo" className="w-16 h-16 object-contain mb-3" />
            <div className="font-bold text-lg font-serif text-slate-900">BUKIDNON STATE UNIVERSITY</div>
            <div className="text-sm font-serif text-slate-800">Malaybalay City, Bukidnon 8700</div>
            <div className="text-xs font-serif text-slate-600 mb-2">Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph</div>
            <h1 className="text-lg font-bold mt-2 font-sans text-slate-900">Needs Assessment Form</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Academic Early Warning System</p>
          </div>

          {/* Student Info */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Student Information</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><span className="font-medium text-slate-900">Name:</span> <span className="text-slate-600">{studentInfo.name}</span></p>
              <p className="text-sm"><span className="font-medium text-slate-900">ID:</span> <span className="text-slate-600">{studentInfo.id_number}</span></p>
              <p className="text-sm"><span className="font-medium text-slate-900">Email:</span> <span className="text-slate-600">{studentInfo.email}</span></p>
            </div>
          </div>

          {/* Class Info */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Class Information</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><span className="font-medium text-slate-900">Course:</span> <span className="text-slate-600">{referralInfo.subject_code} - {referralInfo.subject_name}</span></p>
              <p className="text-sm"><span className="font-medium text-slate-900">Referred:</span> <span className="text-slate-600">{new Date(referralInfo.referred_at).toLocaleDateString()}</span></p>
            </div>
          </div>

          {/* Assessment Responses */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Assessment Responses</h3>
            <div className="space-y-4">
              {needsAssessment && typeof needsAssessment === 'object' ? (
                Object.entries(needsAssessment).map(([key, value]) => {
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, str => str.toUpperCase())
                    .trim()

                  let displayValue = ''
                  if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No'
                  } else if (typeof value === 'number') {
                    displayValue = String(value)
                  } else if (value === null || value === undefined) {
                    displayValue = 'Not provided'
                  } else {
                    displayValue = String(value)
                  }

                  return (
                    <div key={key} className="border-b border-slate-200 pb-3 last:border-b-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm text-slate-900">{displayValue}</p>
                    </div>
                  )
                })
              ) : (
                <p className="text-slate-500 text-center py-8">No assessment data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  )
}
