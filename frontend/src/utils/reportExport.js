import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import * as XLSX from 'xlsx'

const value = (item) => item === null || item === undefined ? '' : String(item)

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadReportCsv({ filename, columns, rows }) {
  const escape = (item) => {
    const text = value(item)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const content = [
    columns.map((column) => escape(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column.key])).join(',')),
  ].join('\n')
  saveBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export function downloadReportExcel({ filename, title, summary = [], columns, rows }) {
  const sheetRows = [
    [title],
    ...summary.map(({ label, value: summaryValue }) => [label, value(summaryValue)]),
    [],
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => row[column.key] ?? '')),
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
  worksheet['!cols'] = columns.map((column) => ({ wch: Math.max(14, Math.min(32, column.label.length + 6)) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export async function downloadReportDocx({ filename, title, summary = [], columns, rows }) {
  const makeCell = (text, bold = false) => new TableCell({
    width: { size: 100 / columns.length, type: WidthType.PERCENTAGE },
    children: [new Paragraph({ children: [new TextRun({ text: value(text), bold })] })],
  })
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
        ...summary.map(({ label, value: summaryValue }) => new Paragraph(`${label}: ${value(summaryValue)}`)),
        new Paragraph(''),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: columns.map((column) => makeCell(column.label, true)) }),
            ...rows.map((row) => new TableRow({ children: columns.map((column) => makeCell(row[column.key])) })),
          ],
        }),
      ],
    }],
  })
  saveBlob(await Packer.toBlob(doc), `${filename}.docx`)
}
