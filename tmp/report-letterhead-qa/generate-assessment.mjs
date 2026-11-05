import fs from 'node:fs/promises'
import { generateNeedsAssessmentPDF } from '../../frontend/src/utils/pdfGenerator.js'
const bytes = await fs.readFile(new URL('../../frontend/public/buksu-logo.png', import.meta.url))
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => bytes })
const pdf = await generateNeedsAssessmentPDF({financial_difficulties:false,regular_attendance:true,notes:'Sample assessment response'}, {name:'Sample Student',id_number:'20261000',email:'student@student.buksu.edu.ph'}, {subject_code:'IT101',subject_name:'Introduction to Programming'})
await fs.writeFile(new URL('student-assessment.pdf',import.meta.url),new Uint8Array(pdf.output('arraybuffer')))
