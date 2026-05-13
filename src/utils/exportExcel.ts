// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require('xlsx-js-style')

type CellValue = string | number | null | undefined

const FONT      = { name: 'Trebuchet MS', sz: 12 }
const NUM_FMT   = '#,##0'
const HEADER_BG = { fgColor: { rgb: '007D7E' } }   // --bg-panel teal

function buildSheet(headers: string[], rows: CellValue[][]) {
  const wsData = [headers, ...rows]
  const ws     = XLSX.utils.aoa_to_sheet(wsData)
  const range  = XLSX.utils.decode_range(ws['!ref'])

  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[addr]) continue
      const isHeader = R === 0
      ws[addr].s = {
        font:      isHeader ? { ...FONT, bold: true, color: { rgb: 'FFFFFF' } } : { ...FONT },
        fill:      isHeader ? { patternType: 'solid', ...HEADER_BG } : undefined,
        alignment: { vertical: 'center', wrapText: false },
      }
      if (!isHeader && typeof ws[addr].v === 'number') ws[addr].z = NUM_FMT
    }
  }

  ws['!cols'] = headers.map((h, colIdx) => {
    const maxLen = wsData.reduce((max, row) => {
      const val = row[colIdx]
      return Math.max(max, val == null ? 0 : String(val).length)
    }, h.length)
    return { wch: Math.min(maxLen + 4, 55) }
  })

  return ws
}

export function exportExcel(filename: string, headers: string[], rows: CellValue[][]): void {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildSheet(headers, rows), 'Reporte')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export interface SheetDef {
  name: string
  headers: string[]
  rows: CellValue[][]
}

export function exportExcelMultiSheet(filename: string, sheets: SheetDef[]): void {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(wb, buildSheet(sheet.headers, sheet.rows), sheet.name)
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
