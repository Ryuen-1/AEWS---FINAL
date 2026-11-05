import { UNIVERSITY, loadReportLogo } from './reportLetterhead.js'

const value = (item) => item === null || item === undefined ? '' : String(item)

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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

export async function buildReportExcel({ title, metadata = [], summary = [], columns, rows }, logo) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = UNIVERSITY.unit
  workbook.title = title
  const sheet = workbook.addWorksheet('Report', {
    pageSetup: {
      paperSize: 9, orientation: columns.length > 4 ? 'landscape' : 'portrait',
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
    },
    headerFooter: { oddFooter: '&CPage &P of &N' },
  })
  const count = Math.max(3, columns.length)
  const width = Math.max(24, 116 / count)
  sheet.columns = Array.from({ length: count }, () => ({ width }))
  const heading = [
    [UNIVERSITY.name, 14, true, 'Times New Roman', 24],
    [UNIVERSITY.address, 11, false, 'Times New Roman', 18],
    [UNIVERSITY.contact, 9, false, 'Times New Roman', 18],
    ['', 10, false, 'Arial', 8],
    [title, 14, true, 'Arial', 26],
    [UNIVERSITY.unit, 10, false, 'Arial', 17],
    ...metadata.map((line) => [line, 10, false, 'Arial', 18]),
  ]
  heading.forEach(([text, size, bold, name, height], index) => {
    const rowNumber = index + 1
    sheet.mergeCells(rowNumber, 1, rowNumber, count)
    const cell = sheet.getCell(rowNumber, 1)
    cell.value = text
    cell.font = { name, size, bold, color: { argb: 'FF0F172A' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    sheet.getRow(rowNumber).height = height
  })
  const imageId = workbook.addImage({ base64: logo.dataUrl, extension: 'png' })
  sheet.addImage(imageId, { tl: { col: 0.05, row: 3.4 }, ext: { width: 72, height: 72 } })
  const divider = sheet.addRow([])
  divider.height = 12
  for (let col = 1; col <= count; col++) {
    divider.getCell(col).border = { bottom: { style: 'medium', color: { argb: 'FF0F172A' } } }
  }
  sheet.addRow([])
  summary.forEach(({ label, value: summaryValue }) => {
    const row = sheet.addRow([label, summaryValue ?? ''])
    row.getCell(1).font = { name: 'Arial', size: 10, bold: true }
    row.getCell(2).font = { name: 'Arial', size: 10 }
    row.height = 30
    row.eachCell((cell) => { cell.alignment = { vertical: 'middle', wrapText: true } })
  })
  sheet.addRow([])
  const tableHeader = sheet.addRow(columns.map((column) => column.label))
  tableHeader.height = 30
  const tableStart = tableHeader.number
  rows.forEach((row) => sheet.addRow(columns.map((column) => row[column.key] ?? '')))
  for (let rowNumber = tableStart; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    row.height = rowNumber === tableStart ? 30 : Math.max(24, ...columns.map((column) => {
      const content = value(rows[rowNumber - tableStart - 1]?.[column.key])
      const lines = content.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / (width * 0.9))), 0)
      return lines * 13 + 8
    }))
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: 'Arial', size: 10, bold: rowNumber === tableStart, color: { argb: 'FF0F172A' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber === tableStart ? 'FFE2E8F0' : rowNumber % 2 ? 'FFF8FAFC' : 'FFFFFFFF' } }
      cell.border = Object.fromEntries(['top', 'bottom', 'left', 'right'].map((side) => [side, { style: 'thin', color: { argb: 'FFD9D9D9' } }]))
    })
  }
  sheet.views = [{ state: 'frozen', ySplit: tableStart, showGridLines: false }]
  sheet.pageSetup.printTitlesRow = `1:${tableStart}`
  sheet.pageSetup.printArea = `A1:${sheet.getColumn(count).letter}${sheet.rowCount}`
  return workbook
}

export async function downloadReportExcel(payload) {
  const workbook = await buildReportExcel(payload, await loadReportLogo())
  saveBlob(new Blob([await workbook.xlsx.writeBuffer()], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), `${payload.filename}.xlsx`)
}

export async function buildReportDocx({ title, metadata = [], summary = [], columns, rows }, logo) {
  const {
    Document, Header, Paragraph, Table, TableCell, TableRow, TextRun, ImageRun,
    WidthType, AlignmentType, BorderStyle, VerticalAlign,
  } = await import('docx')
  const text = (content, options = {}) => new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 35 },
    children: [new TextRun({ text: value(content), font: 'Arial', size: 20, color: '0F172A', ...options })],
  })
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const headerCell = (children, width) => new TableCell({
    width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    margins: { top: 0, bottom: 0, left: 0, right: 0 }, children,
  })
  const header = new Header({ children: [
    new Table({
      width: { size: 10466, type: WidthType.DXA }, columnWidths: [1050, 8366, 1050],
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
      rows: [new TableRow({ children: [
        headerCell([new Paragraph({ children: [new ImageRun({ type: 'png', data: logo.bytes, transformation: { width: 68, height: 68 } })] })], 1050),
        headerCell([
          text(UNIVERSITY.name, { font: 'Times New Roman', bold: true, size: 28 }),
          text(UNIVERSITY.address, { font: 'Times New Roman', size: 22 }),
          text(UNIVERSITY.contact, { font: 'Times New Roman', size: 16 }),
          new Paragraph({ spacing: { after: 80 } }),
          text(title, { bold: true, size: 26 }),
          text(UNIVERSITY.unit, { size: 18 }),
          ...metadata.map((line) => text(line, { size: 18 })),
        ], 8366),
        headerCell([new Paragraph('')], 1050),
      ] })],
    }),
    new Paragraph({ spacing: { before: 100, after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '0F172A' } } }),
  ] })
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'D9D9D9' }
  const makeCell = (content, bold = false) => new TableCell({
    width: { size: 100 / columns.length, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    borders: { top: border, bottom: border, left: border, right: border },
    ...(bold ? { shading: { fill: 'E2E8F0' } } : {}),
    children: [new Paragraph({ children: [new TextRun({ text: value(content), bold, size: 20 })] })],
  })
  return new Document({
    title, creator: UNIVERSITY.unit,
    styles: { default: { document: { run: { font: 'Arial', size: 20, color: '000000' } } } },
    sections: [{
      properties: { page: { margin: { top: 2400 + metadata.length * 240, bottom: 720, left: 720, right: 720, header: 360 } } },
      headers: { default: header },
      children: [
        ...summary.map(({ label, value: summaryValue }) => new Paragraph({
          spacing: { after: 100 }, children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value(summaryValue))],
        })),
        new Paragraph(''),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: columns.map((column) => makeCell(column.label, true)) }),
            ...rows.map((row) => new TableRow({ children: columns.map((column) => makeCell(row[column.key])) })),
          ],
        }),
      ],
    }],
  })
}

export async function downloadReportDocx(payload) {
  const { Packer } = await import('docx')
  const doc = await buildReportDocx(payload, await loadReportLogo())
  saveBlob(await Packer.toBlob(doc), `${payload.filename}.docx`)
}
