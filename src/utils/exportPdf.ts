export function exportPdf(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const today = new Date().toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const logoUrl = `${window.location.origin}/logonb.png`

  const thead = `<tr>${headers.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr>`
  const tbody = rows
    .map(row => `<tr>${row.map(cell => `<td>${escHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title></title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Trebuchet MS', Arial, sans-serif;
      font-size: 11px; color: #111; background: #fff;
      padding: 12mm 13mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Rótulo ── */
    .header {
      display: flex;
      align-items: center;
      gap: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid #006a6b;
      margin-bottom: 14px;
    }
    .header-logo {
      width: 58px;
      height: 58px;
      flex-shrink: 0;
    }
    .header-logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header-body {
      flex: 1;
      border-left: 3px solid #006a6b;
      padding-left: 14px;
    }
    .header-body h1 {
      font-size: 16px;
      font-weight: 700;
      color: #006a6b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.2;
    }
    .header-body .sub {
      font-size: 10px;
      color: #555;
      margin-top: 3px;
    }
    .header-meta {
      text-align: right;
      font-size: 9px;
      color: #888;
      line-height: 1.9;
      flex-shrink: 0;
    }
    .header-meta strong {
      font-size: 13px;
      color: #333;
      display: block;
      line-height: 1.2;
      margin-bottom: 2px;
    }

    /* ── Tabla ── */
    table { width: 100%; border-collapse: collapse; }
    th {
      border-top: 1px solid #006a6b;
      border-bottom: 2px solid #006a6b;
      padding: 6px 10px; text-align: left;
      font-size: 9.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: #006a6b;
    }
    td { padding: 5px 10px; border-bottom: 1px solid #e8e8e8; font-size: 10.5px; color: #222; }
    tr:nth-child(even) td { background: #f7fafa; }

    .footer { margin-top: 10px; font-size: 8.5px; color: #bbb; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo"><img src="${logoUrl}" alt="Logo" /></div>
    <div class="header-body">
      <h1>${escHtml(title)}</h1>
      <p class="sub">${escHtml(subtitle)}</p>
    </div>
    <div class="header-meta">
      <strong>${rows.length} registro(s)</strong>
      ${today}
    </div>
  </div>
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
  <p class="footer">Industria Bizcopan Zapatoca — Sistema de Inventario</p>
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
