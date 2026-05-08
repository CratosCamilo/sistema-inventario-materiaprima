type CellValue = string | number | null | undefined

export function exportCsv(filename: string, headers: string[], rows: CellValue[][]): void {
  const BOM = '﻿'
  const lines = [headers, ...rows].map(row =>
    row.map(cell => {
      const val = cell == null ? '' : String(cell)
      return `"${val.replace(/"/g, '""')}"`
    }).join(',')
  )
  const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
