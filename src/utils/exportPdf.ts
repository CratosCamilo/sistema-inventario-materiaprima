import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

async function loadLogoBase64(): Promise<string | null> {
  try {
    const resp = await fetch(`${window.location.origin}/logonb.png`)
    if (!resp.ok) return null
    const blob = await resp.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function exportPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  filename: string,
  options?: { handwritingLastCol?: boolean },
) {
  const doc    = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 12

  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const logoBase64 = await loadLogoBase64()

  // ── Rótulo ──
  const topY     = 10
  const logoSize = 14
  const barX     = margin + logoSize + 4
  const textX    = logoBase64 ? barX + 3 : margin

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, topY, logoSize, logoSize)
    doc.setDrawColor(0, 106, 107)
    doc.setLineWidth(0.7)
    doc.line(barX, topY, barX, topY + logoSize)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(0, 106, 107)
  doc.text(title.toUpperCase(), textX, topY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(85, 85, 85)
  doc.text(subtitle, textX, topY + 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(51, 51, 51)
  doc.text(`${rows.length} registro(s)`, pageW - margin, topY + 6, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(136, 136, 136)
  doc.text(today, pageW - margin, topY + 11, { align: 'right' })

  const lineY = topY + logoSize + 2
  doc.setDrawColor(0, 106, 107)
  doc.setLineWidth(0.5)
  doc.line(margin, lineY, pageW - margin, lineY)

  // ── Tabla ──
  const handwritingLastCol = options?.handwritingLastCol ?? false
  const lastColIdx = headers.length - 1

  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(cell => String(cell ?? ''))),
    startY: lineY + 3,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [34, 34, 34] as [number, number, number],
    },
    headStyles: {
      fillColor: false,
      textColor: [0, 106, 107] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 6.5,
      lineWidth: { top: 0.3, bottom: 0.5, left: 0, right: 0 },
      lineColor: [0, 106, 107] as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [247, 250, 250] as [number, number, number],
    },
    bodyStyles: {
      lineWidth: { bottom: 0.2, top: 0, left: 0, right: 0 },
      lineColor: [232, 232, 232] as [number, number, number],
    },
    columnStyles: handwritingLastCol ? {
      [lastColIdx]: { minCellWidth: 16, halign: 'center' },
    } : undefined,
    didDrawCell: handwritingLastCol ? (data) => {
      if (data.section === 'body' && data.column.index === lastColIdx) {
        const { doc: d, cell } = data
        d.setDrawColor(140, 140, 140)
        d.setLineWidth(0.35)
        d.rect(cell.x, cell.y, cell.width, cell.height)
      }
    } : undefined,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? lineY + 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(187, 187, 187)
  doc.text(
    'Industria Bizcopan Zapatoca — Sistema de Inventario',
    pageW - margin, finalY + 6, { align: 'right' },
  )

  // ── Descargar con nombre correcto y abrir en nueva pestaña ──
  doc.setProperties({ title: filename.replace('.pdf', '') })
  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)

  // Descarga directa (como Excel)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // También abre en nueva pestaña para visualizar
  window.open(url, '_blank')

  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
