import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { Packer } from 'docx'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'
import { buildReportDocx, buildReportExcel } from './reportExport'
import { generateNeedsAssessmentPDF } from './pdfGenerator'
import { reportLetterheadHtml, UNIVERSITY } from './reportLetterhead'

const bytes = readFileSync(new URL('../../public/buksu-logo.png', import.meta.url))
const logo = { bytes, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` }
const roles = [
  ['AMU staff', 'Consolidated Referral and Support Report', ['Staff Member: Ian Quimbo', 'College: College of Technology']],
  ['Instructor', 'Student Performance Report', ['IT101 - Programming', 'Section: IT1', 'Instructor: Sample Instructor']],
  ['Admin', 'Institution Performance Report', ['Institution-wide student performance and enrollment data']],
]

for (const [role, title, metadata] of roles) {
  describe(`${role} report letterhead`, () => {
    const payload = {
      title, metadata, summary: [{ label: 'Total Students', value: 1 }],
      columns: [{ key: 'name', label: 'Student Name' }, { key: 'grade', label: 'Midterm Grade' }, { key: 'attendance', label: 'Attendance' }],
      rows: [{ name: 'Sample Student', grade: 2.5, attendance: 0 }],
    }
    it('embeds the seal and complete letterhead in Word while preserving report data', async () => {
      const archive = await JSZip.loadAsync(await Packer.toBuffer(await buildReportDocx(payload, logo)))
      const header = await archive.file('word/header1.xml').async('string')
      for (const line of [UNIVERSITY.name, UNIVERSITY.address, UNIVERSITY.contact, UNIVERSITY.unit, title, ...metadata]) {
        expect(header).toContain(line)
      }
      const media = Object.keys(archive.files).filter((name) => /word\/media\/.*\.png$/.test(name))
      expect(media).toHaveLength(1)
      expect(await archive.file(media[0]).async('uint8array')).toEqual(new Uint8Array(bytes))
      const body = await archive.file('word/document.xml').async('string')
      expect(body).toContain('Sample Student')
      expect(body).toContain('w:tblHeader')
      expect(body).toContain('w:headerReference')
    })
    it('embeds the seal and formatted letterhead in a reopenable Excel workbook', async () => {
      const built = await buildReportExcel(payload, logo)
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await built.xlsx.writeBuffer())
      const sheet = workbook.getWorksheet('Report')
      const contents = []
      sheet.eachRow((row) => row.eachCell((cell) => contents.push(cell.value)))
      for (const line of [UNIVERSITY.name, UNIVERSITY.address, UNIVERSITY.contact, UNIVERSITY.unit, title, ...metadata, 'Sample Student', 0]) {
        expect(contents).toContain(line)
      }
      expect(sheet.getImages()).toHaveLength(1)
      expect(sheet.getCell('A1').alignment.horizontal).toBe('center')
      expect(sheet.pageSetup.printTitlesRow).toMatch(/^1:/)
      expect(sheet.pageSetup.fitToWidth).toBe(1)
    })
    it('uses the same complete letterhead in the PDF print preview', () => {
      const html = reportLetterheadHtml({ title, metadata, logoUrl: logo.dataUrl })
      for (const line of [UNIVERSITY.name, UNIVERSITY.address, UNIVERSITY.contact, UNIVERSITY.unit, title, ...metadata]) expect(html).toContain(line)
      expect(html).toContain('data:image/png;base64,')
    })
  })
}

it('escapes user and class details in printable letterheads', () => {
  const html = reportLetterheadHtml({ title: '<script>alert(1)</script>', metadata: ['A & B'], logoUrl: '/logo.png' })
  expect(html).not.toContain('<script>')
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('A &amp; B')
})

it('gives the student needs-assessment download the same university letterhead', async () => {
  vi.stubGlobal('fetch', async () => ({ ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer }))
  try {
    const pdf = await generateNeedsAssessmentPDF(
      { financial_difficulties: false },
      { name: 'Sample Student', id_number: '20261000', email: 'student@example.com' },
      { subject_code: 'IT101', subject_name: 'Programming' },
    )
    const content = pdf.output()
    expect(content).toContain(UNIVERSITY.name)
    expect(content).toContain(UNIVERSITY.unit)
    expect(content).toContain('Needs Assessment Form')
    expect(content).toContain('/Subtype /Image')
  } finally {
    vi.unstubAllGlobals()
  }
})
