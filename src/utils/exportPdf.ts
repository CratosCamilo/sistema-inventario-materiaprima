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
) {
  const doc    = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const margin = 13

  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const logoBase64 = await loadLogoBase64()

  // ── Rótulo ──
  const topY     = 12
  const logoSize = 18
  const barX     = margin + logoSize + 5
  const textX    = logoBase64 ? barX + 4 : margin

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, topY, logoSize, logoSize)
    // Barra vertical teal
    doc.setDrawColor(0, 106, 107)
    doc.setLineWidth(0.7)
    doc.line(barX, topY, barX, topY + logoSize)
  }

  // Título
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(0, 106, 107)
  doc.text(title.toUpperCase(), textX, topY + 7)

  // Subtítulo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(85, 85, 85)
  doc.text(subtitle, textX, topY + 13)

  // Derecha: conteo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(51, 51, 51)
  doc.text(`${rows.length} registro(s)`, pageW - margin, topY + 7, { align: 'right' })

  // Derecha: fecha
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(136, 136, 136)
  doc.text(today, pageW - margin, topY + 13, { align: 'right' })

  // Línea divisoria
  const lineY = topY + logoSize + 3
  doc.setDrawColor(0, 106, 107)
  doc.setLineWidth(0.5)
  doc.line(margin, lineY, pageW - margin, lineY)

  // ── Tabla ──
  autoTable(doc, {
    head: [headers],
    body: rows.map(r => r.map(cell => String(cell ?? ''))),
    startY: lineY + 4,
    margin: { left: margin, right: margin },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [34, 34, 34] as [number, number, number],
    },
    headStyles: {
      fillColor: false,
      textColor: [0, 106, 107] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 8,
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
  })

  // Pie de página
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? lineY + 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(187, 187, 187)
  doc.text(
    'Industria Bizcopan Zapatoca — Sistema de Inventario',
    pageW - margin, finalY + 6, { align: 'right' },
  )

  // ── Abrir en nueva pestaña ──
  doc.setProperties({ title: filename.replace('.pdf', '') })
  const blob = doc.output('blob')
  const url  = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
