import * as XLSX from 'xlsx'

type CellValue = string | number | null | undefined

export function exportExcel(filename: string, headers: string[], rows: CellValue[][]): void {
  const wsData = [headers, ...rows]
  const ws     = XLSX.utils.aoa_to_sheet(wsData)

  // Auto column widths based on max content length
  const colWidths = headers.map((h, colIdx) => {
    const maxLen = wsData.reduce((max, row) => {
      const val = row[colIdx]
      return Math.max(max, val == null ? 0 : String(val).length)
    }, h.length)
    return { wch: Math.min(maxLen + 2, 50) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
