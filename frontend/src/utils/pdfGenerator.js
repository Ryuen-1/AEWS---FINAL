import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas' // eslint-disable-line no-unused-vars

const getBase64ImageFromUrl = async (imageUrl) => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Error fetching image:', err);
    return null;
  }
};

const FIELD_SECTION_MAP = {
  // Academic
  previous_gpa: 'Academic Background',
  failed_subject_count: 'Academic Background',
  probation_status: 'Academic Background',
  low_midterm_academic_performance: 'Academic Background',
  difficulty_catching_up_lessons: 'Academic Background',
  low_attendance_rate: 'Academic Background',

  // Challenges
  academic_challenges_time_management: 'Current Challenges',
  academic_challenges_study_habits: 'Current Challenges',
  academic_challenges_comprehension: 'Current Challenges',
  academic_challenges_motivation: 'Current Challenges',
  academic_challenges_other: 'Current Challenges',
  external_factors_financial: 'External Factors',
  external_factors_family: 'External Factors',
  external_factors_work: 'External Factors',
  external_factors_health: 'External Factors',
  external_factors_other: 'External Factors',

  // Support
  preferred_support_mode: 'Support Preferences',
  preferred_consultation_schedule: 'Support Preferences',
  support_needed: 'Support Preferences',
  remarks: 'Additional Notes',
}

const SECTION_ORDER = [
  'Academic Background',
  'Current Challenges',
  'External Factors',
  'Support Preferences',
  'Additional Notes',
  'Other Responses',
]

function normalizeLabel(key = '') {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

function normalizeValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'N/A'
  if (value === null || value === undefined) return 'N/A'
  const text = String(value).trim()
  return text || 'N/A'
}

function groupAssessmentEntries(needsAssessment) {
  if (!needsAssessment || typeof needsAssessment !== 'object') return []

  const grouped = new Map()
  for (const [key, rawValue] of Object.entries(needsAssessment)) {
    const section = FIELD_SECTION_MAP[key] || 'Other Responses'
    if (!grouped.has(section)) grouped.set(section, [])
    grouped.get(section).push({
      key,
      label: normalizeLabel(key),
      value: normalizeValue(rawValue),
    })
  }

  const ordered = []
  for (const sectionName of SECTION_ORDER) {
    const items = grouped.get(sectionName)
    if (!items || items.length === 0) continue
    items.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
    ordered.push({ title: sectionName, items })
  }

  return ordered
}

function ensureSpace(pdf, yPosition, requiredHeight, margin, addHeader = false) {
  const pageHeight = pdf.internal.pageSize.getHeight()
  if (yPosition + requiredHeight <= pageHeight - margin) {
    return yPosition
  }

  pdf.addPage()
  let nextY = margin

  if (addHeader) {
    pdf.setFontSize(9)
    pdf.setTextColor(107, 114, 128)
    pdf.text('Needs Assessment Form (continued)', margin, nextY)
    nextY += 7
    pdf.setTextColor(17, 24, 39)
  }

  return nextY
}

export async function generateNeedsAssessmentPDF(needsAssessment, studentInfo, referralInfo) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let yPosition = margin
  const groupedEntries = groupAssessmentEntries(needsAssessment)

  // Document heading
  try {
    const logoBase64 = await getBase64ImageFromUrl(window.location.origin + '/buksu-logo.png');
    if (logoBase64) {
      pdf.addImage(logoBase64, 'PNG', pageWidth / 2 - 10, yPosition, 20, 20);
    }
    yPosition += 25;
  } catch (e) {
    console.error('Failed to load logo for PDF', e);
  }

  pdf.setTextColor(17, 24, 39);
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(14);
  pdf.text('BUKIDNON STATE UNIVERSITY', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  pdf.text('Malaybalay City, Bukidnon 8700', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;

  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text('Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  pdf.setTextColor(17, 24, 39);
  pdf.setFontSize(15);
  pdf.setFont(undefined, 'bold');
  pdf.text('Needs Assessment Form', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  pdf.setFontSize(9);
  pdf.setFont(undefined, 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Academic Early Warning System', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Student information block
  const infoTop = yPosition
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(margin, infoTop, contentWidth, 22, 2, 2, 'F')

  pdf.setTextColor(71, 85, 105)
  pdf.setFontSize(8)
  pdf.setFont(undefined, 'bold')
  pdf.text('STUDENT INFORMATION', margin + 3, infoTop + 5)

  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(9)
  pdf.setFont(undefined, 'normal')
  const studentName = studentInfo?.name || 'N/A'
  const studentId = studentInfo?.id_number || 'N/A'
  const studentEmail = studentInfo?.email || 'N/A'

  pdf.text(`Name: ${studentName}`, margin + 3, infoTop + 10)
  pdf.text(`Student ID: ${studentId}`, margin + 3, infoTop + 15)
  pdf.text(`Email: ${studentEmail}`, margin + 3, infoTop + 20)
  yPosition += 28

  // Referral/class information
  yPosition = ensureSpace(pdf, yPosition, 20, margin, true)
  const classTop = yPosition
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(margin, classTop, contentWidth, 18, 2, 2, 'F')

  pdf.setTextColor(71, 85, 105)
  pdf.setFontSize(8)
  pdf.setFont(undefined, 'bold')
  pdf.text('REFERRAL INFORMATION', margin + 3, classTop + 5)

  const classLabel = `${referralInfo?.subject_code || 'N/A'} - ${referralInfo?.subject_name || 'N/A'}`
  const referredDate = referralInfo?.referred_at
    ? new Date(referralInfo.referred_at).toLocaleDateString()
    : 'N/A'

  pdf.setTextColor(15, 23, 42)
  pdf.setFontSize(9)
  pdf.setFont(undefined, 'normal')
  pdf.text(`Class: ${classLabel}`, margin + 3, classTop + 10)
  pdf.text(`Referred Date: ${referredDate}`, margin + 3, classTop + 15)
  yPosition += 24

  pdf.setDrawColor(226, 232, 240)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 7

  // Assessment responses heading
  yPosition = ensureSpace(pdf, yPosition, 10, margin, true)
  pdf.setTextColor(17, 24, 39)
  pdf.setFont(undefined, 'bold')
  pdf.setFontSize(10)
  pdf.text('Assessment Responses', margin, yPosition)
  yPosition += 7

  if (groupedEntries.length === 0) {
    pdf.setFont(undefined, 'normal')
    pdf.setTextColor(100, 116, 139)
    pdf.text('No assessment responses available.', margin, yPosition)
    yPosition += 6
  } else {
    for (const group of groupedEntries) {
      yPosition = ensureSpace(pdf, yPosition, 12, margin, true)

      // Group title
      pdf.setFillColor(241, 245, 249)
      pdf.roundedRect(margin, yPosition - 4, contentWidth, 8, 1.5, 1.5, 'F')
      pdf.setFont(undefined, 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(30, 41, 59)
      pdf.text(group.title, margin + 2, yPosition + 1)
      yPosition += 8

      // Group rows
      for (const item of group.items) {
        const labelMaxWidth = 58
        const valueMaxWidth = contentWidth - labelMaxWidth - 6

        pdf.setFontSize(8.8)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(71, 85, 105)
        const labelLines = pdf.splitTextToSize(item.label, labelMaxWidth)

        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(15, 23, 42)
        const valueLines = pdf.splitTextToSize(item.value, valueMaxWidth)

        const rowHeight = Math.max(labelLines.length, valueLines.length) * 4.2 + 3
        yPosition = ensureSpace(pdf, yPosition, rowHeight + 2, margin, true)

        pdf.setDrawColor(226, 232, 240)
        pdf.line(margin, yPosition + rowHeight - 1, pageWidth - margin, yPosition + rowHeight - 1)

        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(71, 85, 105)
        pdf.text(labelLines, margin + 1, yPosition + 2.8)

        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(15, 23, 42)
        pdf.text(valueLines, margin + labelMaxWidth + 4, yPosition + 2.8)

        yPosition += rowHeight
      }

      yPosition += 2
    }
  }

  // Footer
  const pageCount = pdf.getNumberOfPages()
  const generatedDate = new Date().toLocaleString()
  for (let i = 1; i <= pageCount; i += 1) {
    pdf.setPage(i)
    const pageHeight = pdf.internal.pageSize.getHeight()

    pdf.setDrawColor(226, 232, 240)
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14)

    pdf.setFontSize(8)
    pdf.setTextColor(100, 116, 139)
    pdf.setFont(undefined, 'normal')
    pdf.text(`Generated: ${generatedDate}`, margin, pageHeight - 9)
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' })
  }

  pdf.setFontSize(8)
  pdf.setFont(undefined, 'italic')
  pdf.setTextColor(100, 116, 139)

  return pdf
}

export function downloadPDF(pdf, filename) {
  pdf.save(filename)
}
