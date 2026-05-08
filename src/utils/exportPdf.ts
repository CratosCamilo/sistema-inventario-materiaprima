export function exportPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const thead = `<tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map(row => `<tr>${row.map(cell => `<td>${escHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Trebuchet MS', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }
    .header { margin-bottom: 14px; border-bottom: 2px solid #006a6b; padding-bottom: 8px; }
    h1 { font-size: 17px; color: #006a6b; margin-bottom: 3px; }
    .subtitle { font-size: 10px; color: #555; }
    table { width: 100%; border-collapse: collapse; }
    th {
      background: #006a6b; color: #fff;
      padding: 7px 10px; text-align: left;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    td { padding: 6px 10px; border-bottom: 1px solid #ddd; font-size: 11px; color: #222; }
    tr:nth-child(even) td { background: #f0fafa; }
    .footer { margin-top: 10px; font-size: 9px; color: #999; text-align: right; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escHtml(title)}</h1>
    <p class="subtitle">${escHtml(subtitle)}</p>
  </div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  <p class="footer">Generado el ${today} — ${rows.length} registro(s)</p>
  <script>
    window.onload = function() {
      window.print()
      setTimeout(function() { window.close() }, 800)
    }
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1100,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
