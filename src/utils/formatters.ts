// Convierte cantidad en unidades base a unidades visuales.
// Redondea a partir de la mitad: el rollo cae solo cuando se consumió > 50% de él.
export function toVisual(baseQty: number, factor: number): number {
  if (!factor || factor <= 1) return baseQty
  return Math.round(baseQty / factor)
}

// Muestra "5 cajas (150 paquetes)" o solo "150 kg" si no hay conversión
export function formatDualUnit(baseQty: number, baseUnit: string, visualUnit: string, factor: number): string {
  if (!factor || factor <= 1 || baseUnit === visualUnit) return `${formatNumber(baseQty)} ${baseUnit}`
  const visual = Math.round(baseQty / factor)
  return `${formatNumber(visual)} ${visualUnit} (${formatNumber(baseQty)} ${baseUnit})`
}

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

// Mapa explícito de unidades → plural en español
const UNIT_PLURALS: Record<string, string> = {
  'unidad':  'unidades',
  'bulto':   'bultos',
  'caja':    'cajas',
  'paquete': 'paquetes',
  'rollo':   'rollos',
  'cartón':  'cartones',
  'carton':  'cartones',
  'bolsa':   'bolsas',
  'saco':    'sacos',
  'tarro':   'tarros',
  'lata':    'latas',
  'botella': 'botellas',
  'galón':   'galones',
  'galon':   'galones',
  'sobre':   'sobres',
  'tela':    'telas',
  'costal':  'costales',
  'frasco':  'frascos',
  'balde':   'baldes',
  'caneca':  'canecas',
}

export function pluralizeUnit(unit: string, qty: number): string {
  const key = unit.toLowerCase().trim()

  // qty ≤ 1: devuelve tal cual (singular o como venga de la BD)
  if (qty <= 1) return unit

  if (UNIT_PLURALS[key]) return UNIT_PLURALS[key]

  // Si ya termina en 's', probablemente ya es plural (gramos, litros, etc.)
  if (key.endsWith('s')) return unit

  // Fallback español: vocal → +s, consonante → +es
  const vowels = 'aeiouáéíóúü'
  return vowels.includes(key.slice(-1)) ? unit + 's' : unit + 'es'
}
