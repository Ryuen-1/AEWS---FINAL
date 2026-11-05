export const UNIVERSITY = {
  name: 'BUKIDNON STATE UNIVERSITY',
  address: 'Malaybalay City, Bukidnon 8700',
  contact: 'Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph',
  unit: 'Academic Monitoring Unit',
}

export function escapeReportHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

export function reportLetterheadHtml({ title, metadata = [], logoUrl = `${window.location.origin}/buksu-logo.png` }) {
  return `<div class="header" style="display:flex;align-items:center;justify-content:center;gap:20px;text-align:center;border-bottom:2px solid #0f172a;padding-bottom:20px;margin-bottom:30px;break-inside:avoid;">
    <img src="${escapeReportHtml(logoUrl)}" alt="BukSU Logo" style="width:80px;height:80px;object-fit:contain;flex-shrink:0;" />
    <div style="min-width:0;">
      <div style="font-weight:bold;font-size:18px;font-family:'Times New Roman',Times,serif;">${UNIVERSITY.name}</div>
      <div style="font-size:14px;font-family:'Times New Roman',Times,serif;">${UNIVERSITY.address}</div>
      <div style="font-size:12px;font-family:'Times New Roman',Times,serif;margin-bottom:15px;">${UNIVERSITY.contact}</div>
      <h1 style="font-size:18px;margin:10px 0 4px;font-family:Arial,sans-serif;">${escapeReportHtml(title)}</h1>
      ${[UNIVERSITY.unit, ...metadata].map((line) => `<p style="font:12px/1.4 Arial,sans-serif;color:#475569;margin:0;">${escapeReportHtml(line)}</p>`).join('')}
    </div><div style="width:80px;flex-shrink:0;"></div>
  </div>`
}

let logoPromise
export function loadReportLogo() {
  if (!logoPromise) {
    logoPromise = fetch('/buksu-logo.png').then(async (response) => {
      if (!response.ok) throw new Error('Unable to load the university logo. Please try exporting again.')
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      return { bytes, dataUrl: `data:image/png;base64,${btoa(binary)}` }
    }).catch((error) => {
      logoPromise = undefined
      throw error
    })
  }
  return logoPromise
}

export function printReportHtml(html) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) throw new Error('Please allow pop-ups to download/print the PDF.')
  printWindow.document.open()
  printWindow.onload = async () => {
    await Promise.all(Array.from(printWindow.document.images, (image) => image.decode().catch(() => {})))
    await printWindow.document.fonts.ready
    printWindow.focus()
    printWindow.print()
  }
  printWindow.document.write(html)
  printWindow.document.close()
}

export async function drawPdfLetterhead(pdf, { title, metadata = [], margin = 14 }) {
  const { dataUrl } = await loadReportLogo()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const center = pageWidth / 2
  let y = margin + 4
  pdf.addImage(dataUrl, 'PNG', margin + 2, margin + 8, 20, 20)
  pdf.setTextColor(15, 23, 42)
  pdf.setFont('times', 'bold')
  pdf.setFontSize(14)
  pdf.text(UNIVERSITY.name, center, y, { align: 'center' })
  y += 6
  pdf.setFont('times', 'normal')
  pdf.setFontSize(10)
  pdf.text(UNIVERSITY.address, center, y, { align: 'center' })
  y += 5
  pdf.setFontSize(8)
  pdf.text(UNIVERSITY.contact, center, y, { align: 'center' })
  y += 10
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  const titleLines = pdf.splitTextToSize(title, pageWidth - margin * 2 - 44)
  pdf.text(titleLines, center, y, { align: 'center' })
  y += titleLines.length * 5 + 2
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(71, 85, 105)
  for (const line of [UNIVERSITY.unit, ...metadata]) {
    const lines = pdf.splitTextToSize(line, pageWidth - margin * 2 - 44)
    pdf.text(lines, center, y, { align: 'center' })
    y += lines.length * 4.5
  }
  y = Math.max(y + 4, margin + 34)
  pdf.setDrawColor(15, 23, 42)
  pdf.setLineWidth(0.5)
  pdf.line(margin, y, pageWidth - margin, y)
  return y + 8
}
