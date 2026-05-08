// ── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'operador' | 'salidas' | 'entradas'

export interface User {
  id: number
  username: string
  full_name: string
  role: UserRole
  active: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserInput {
  username: string
  full_name: string
  password: string
  role: UserRole
}

// ── Warehouses ────────────────────────────────────────────────────────────────
export interface Warehouse {
  id: number
  name: string
  slug: string
  active: boolean
  created_at: string
}

// ── Products ──────────────────────────────────────────────────────────────────
export type ProductCategory = 'Produccion' | 'Empaques'

export interface Product {
  id: number
  warehouse_id: number
  name: string
  category: ProductCategory
  base_unit: string
  visual_unit: string
  conversion_factor: number
  stock_minimum: number
  stock_current: number
  initial_stock_loaded: boolean
  active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateProductInput {
  name: string
  category: ProductCategory
  base_unit: string
  visual_unit: string
  conversion_factor?: number
  stock_minimum: number
  notes?: string
}

export type UpdateProductInput = Partial<CreateProductInput> & { active?: boolean }

// ── Movements ─────────────────────────────────────────────────────────────────
export type MovementType = 'initial' | 'entry' | 'exit' | 'adjustment'
export type MovementDirection = 'in' | 'out' | 'adjustment'

export interface InventoryMovement {
  id: number
  warehouse_id: number
  product_id: number
  product_name?: string
  type: MovementType
  direction: MovementDirection
  quantity: number
  unit: string
  date: string
  reference_type: string | null
  reference_id: number | null
  notes: string | null
  responsible: string | null
  created_by_id: number | null
  created_by_name: string | null
  created_at: string
}

// ── Purchase Entries ──────────────────────────────────────────────────────────
export type EntryStatus = 'active' | 'cancelled'

export interface PurchaseEntryItem {
  id: number
  entry_id: number
  product_id: number
  product_name?: string
  quantity: number
  unit: string
  applies_iva: boolean
  iva_rate: number
  line_total: number
  iva_amount: number
  notes: string | null
}

export interface PurchaseEntry {
  id: number
  warehouse_id: number
  date: string
  invoice_number: string | null
  supplier_name: string | null
  responsible: string | null
  notes: string | null
  subtotal: number
  iva_total: number
  total: number
  status: EntryStatus
  created_by_id: number | null
  created_by_name: string | null
  edited_by_id: number | null
  edited_by_name: string | null
  edited_at: string | null
  created_at: string
  updated_at: string
  items?: PurchaseEntryItem[]
  item_count?: number
}

export interface CreateEntryItemInput {
  product_id: number
  quantity: number
  unit: string
  applies_iva?: boolean
  iva_rate?: number
  line_total?: number
  notes?: string
}

export interface CreateEntryInput {
  date: string
  invoice_number?: string
  supplier_name?: string
  responsible?: string
  notes?: string
  items: CreateEntryItemInput[]
}

// ── Exits ─────────────────────────────────────────────────────────────────────
export type ExitDestination = 'produccion' | 'empaque' | 'punto_venta' | 'otra'
export type ExitStatus = 'active' | 'cancelled'

export interface ExitItem {
  id: number
  exit_id: number
  product_id: number
  product_name?: string
  quantity: number
  unit: string
  notes: string | null
}

export interface Exit {
  id: number
  warehouse_id: number
  date: string
  destination: ExitDestination
  responsible: string | null
  notes: string | null
  status: ExitStatus
  created_by_id: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  items?: ExitItem[]
  item_count?: number
}

export interface CreateExitItemInput {
  product_id: number
  quantity: number
  unit: string
  notes?: string
}

export interface CreateExitInput {
  date: string
  destination: ExitDestination
  responsible?: string
  notes?: string
  items: CreateExitItemInput[]
}

// ── Adjustments ───────────────────────────────────────────────────────────────
export type AdjustmentStatus = 'active' | 'cancelled'

export interface StockAdjustment {
  id: number
  warehouse_id: number
  date: string
  product_id: number
  product_name?: string
  visual_unit?: string
  stock_system: number
  stock_physical: number
  difference: number
  reason: string | null
  notes: string | null
  responsible: string | null
  status: AdjustmentStatus
  created_by_id: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateAdjustmentInput {
  date: string
  product_id: number
  stock_physical: number
  reason?: string
  notes?: string
  responsible?: string
}

// ── Initial Stock ─────────────────────────────────────────────────────────────
export interface InitialStockItem {
  product_id: number
  quantity: number
  notes?: string
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface Setting {
  key: string
  value: string
  updated_at: string
}

// ── Stock Status ──────────────────────────────────────────────────────────────
export type StockStatus = 'normal' | 'low' | 'critical'

export interface ProductWithStatus extends Product {
  stock_status: StockStatus
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  total_products: number
  low_stock_count: number
  critical_stock_count: number
  recent_entries: PurchaseEntry[]
  recent_exits: Exit[]
  alerts: ProductWithStatus[]
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: number
  entity_type: string
  entity_id: number
  action: 'edit' | 'cancel'
  user_id: number
  user_name: string
  changes: Record<string, { before: unknown; after: unknown }>
  created_at: string
  // campos extra cuando viene del reporte (join con purchase_entries)
  invoice_number?: string | null
  entry_date?: string | null
  supplier_name?: string | null
}

// ── Report Filters ────────────────────────────────────────────────────────────
export interface ReportFilters {
  date_from?: string
  date_to?: string
}
