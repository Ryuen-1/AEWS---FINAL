import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { buildReportDocx, buildReportExcel } from '../../frontend/src/utils/reportExport.js'
import { reportLetterheadHtml } from '../../frontend/src/utils/reportLetterhead.js'
const require = createRequire(new URL('../../frontend/package.json', import.meta.url))
const { Packer } = require('docx')
const bytes = await fs.readFile(new URL('../../frontend/public/buksu-logo.png', import.meta.url))
const logo = { bytes, dataUrl: `data:image/png;base64,${bytes.toString('base64')}` }
const roles = [
  ['amu', 'Consolidated Referral and Support Report', ['Staff Member: Ian Quimbo', 'College: College of Technology'],
    [{ key: 'period', label: 'Period' }, { key: 'referrals', label: 'Referrals' }, { key: 'share', label: 'Share of Total' }],
    Array.from({ length: 12 }, (_, i) => ({ period: `Month ${i + 1} 2026`, referrals: i + 1, share: '8.3%' }))],
  ['instructor', 'Student Performance Report', ['IT101 - Introduction to Programming', 'Section: BSIT 1A', 'Instructor: Sample Instructor'],
    [{ key: 'id', label: 'Student ID' }, { key: 'name', label: 'Student Name' }, { key: 'attendance', label: 'Attendance Rate' }, { key: 'grade', label: 'Midterm Grade' }, { key: 'referral', label: 'Referral Status' }],
    Array.from({ length: 32 }, (_, i) => ({ id: `2026${1000+i}`, name: i === 0 ? 'Maria Ana De la Cruz Santos' : `Sample Student ${i + 1}`, attendance: i === 0 ? 0 : 85, grade: 2.5, referral: 'Not referred' }))],
  ['admin', 'Institution Performance Report', ['Institution-wide student performance and enrollment data'],
    [{ key: 'email', label: 'Student Email' }, { key: 'prediction', label: 'Prediction' }, { key: 'course', label: 'Course' }, { key: 'instructor', label: 'Instructor' }],
    Array.from({ length: 20 }, (_, i) => ({ email: `student${i+1}@student.buksu.edu.ph`, prediction: 'Academic Problem', course: 'IT101 - Introduction to Programming', instructor: 'Sample Instructor' }))],
]
for (const [role, title, metadata, columns, rows] of roles) {
 const payload = { title, metadata, columns, rows, summary: [{ label: 'Reporting Period', value: 'November 2026' }, { label: 'Total Students', value: rows.length }] }
 await fs.writeFile(new URL(`${role}.docx`, import.meta.url), await Packer.toBuffer(await buildReportDocx(payload, logo)))
 const workbook = await buildReportExcel(payload, logo)
 await fs.writeFile(new URL(`${role}.xlsx`, import.meta.url), await workbook.xlsx.writeBuffer())
 const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}body{font:12px Arial;color:#0f172a}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#e2e8f0}</style></head><body>${reportLetterheadHtml({title,metadata,logoUrl:logo.dataUrl})}<h2>Report Summary</h2><p>Reporting period: November 2026</p><table><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${r[c.key]}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
 await fs.writeFile(new URL(`${role}.html`, import.meta.url), html)
}
console.log('Generated Word, Excel, and print-preview fixtures for three roles.')
