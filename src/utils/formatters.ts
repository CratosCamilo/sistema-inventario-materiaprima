export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function formatNumber(n: number, decimals = 2): string {
  if (n === null || n === undefined) return '—'
  return n % 1 === 0
    ? n.toLocaleString('es-CO')
    : n.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatCurrency(n: number): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function getStockStatus(current: number, minimum: number): 'normal' | 'low' | 'critical' {
  if (current <= minimum * 0.5) return 'critical'
  if (current <= minimum)       return 'low'
  return 'normal'
}

export const DESTINATION_LABELS: Record<string, string> = {
  produccion:  'Producción',
  empaque:     'Empaque',
  punto_venta: 'Punto de venta',
  otra:        'Otra',
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  initial:    'Inventario inicial',
  entry:      'Entrada',
  exit:       'Salida',
  adjustment: 'Ajuste',
}

export const CATEGORY_LABELS: Record<string, string> = {
  Produccion: 'Producción',
  Empaques:   'Empaques',
}
