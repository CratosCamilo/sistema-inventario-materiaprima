// ─── Productos ───────────────────────────────────────────────────────────────

export interface Product {
  id: number
  name: string
  category: string
  base_unit: string
  visual_unit: string
  conversion_factor: number
  stock_minimum: number
  stock_current: number
  initial_stock_loaded: 0 | 1
  active: 0 | 1
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateProductInput {
  name: string
  category: string
  base_unit: string
  visual_unit: string
  conversion_factor?: number
  stock_minimum: number
  notes?: string
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  active?: 0 | 1
}

// ─── Proveedores ─────────────────────────────────────────────────────────────

export interface Supplier {
  id: number
  name: string
  contact: string | null
  phone: string | null
  email: string | null
  notes: string | null
  active: 0 | 1
  created_at: string
  updated_at: string
}

export interface CreateSupplierInput {
  name: string
  contact?: string
  phone?: string
  email?: string
  notes?: string
}

// ─── Movimientos ─────────────────────────────────────────────────────────────

export type MovementType = 'initial' | 'entry' | 'exit' | 'adjustment'
export type MovementDirection = 'in' | 'out' | 'adjustment'

export interface InventoryMovement {
  id: number
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
  created_at: string
}

// ─── Entradas ─────────────────────────────────────────────────────────────────

export type EntryStatus = 'active' | 'cancelled'

export interface PurchaseEntry {
  id: number
  date: string
  invoice_number: string | null
  supplier_id: number | null
  supplier_name: string | null
  responsible: string | null
  notes: string | null
  status: EntryStatus
  created_at: string
  updated_at: string
  items?: PurchaseEntryItem[]
}

export interface PurchaseEntryItem {
  id: number
  entry_id: number
  product_id: number
  product_name?: string
  quantity: number
  unit: string
  unit_cost: number | null
  notes: string | null
}

export interface CreateEntryItemInput {
  product_id: number
  quantity: number
  unit: string
  notes?: string
}

export interface CreateEntryInput {
  date: string
  invoice_number?: string
  supplier_id?: number
  supplier_name?: string
  responsible?: string
  notes?: string
  items: CreateEntryItemInput[]
}

// ─── Salidas ──────────────────────────────────────────────────────────────────

export type ExitDestination = 'produccion' | 'empaque' | 'punto_venta' | 'otra'
export type ExitStatus = 'active' | 'cancelled'

export interface Exit {
  id: number
  date: string
  destination: ExitDestination
  responsible: string | null
  notes: string | null
  status: ExitStatus
  created_at: string
  updated_at: string
  items?: ExitItem[]
}

export interface ExitItem {
  id: number
  exit_id: number
  product_id: number
  product_name?: string
  quantity: number
  unit: string
  notes: string | null
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

// ─── Ajustes ──────────────────────────────────────────────────────────────────

export type AdjustmentStatus = 'active' | 'cancelled'

export interface StockAdjustment {
  id: number
  date: string
  product_id: number
  product_name?: string
  stock_system: number
  stock_physical: number
  difference: number
  reason: string | null
  notes: string | null
  responsible: string | null
  status: AdjustmentStatus
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

// ─── Inventario inicial ───────────────────────────────────────────────────────

export interface InitialStockItem {
  product_id: number
  quantity: number
  notes?: string
}

// ─── Configuración ───────────────────────────────────────────────────────────

export interface Setting {
  key: string
  value: string
  updated_at: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type StockStatus = 'normal' | 'low' | 'critical'

export interface ProductWithStatus extends Product {
  stock_status: StockStatus
}

export interface DashboardSummary {
  total_products: number
  active_products: number
  low_stock_count: number
  critical_stock_count: number
  recent_entries: PurchaseEntry[]
  recent_exits: Exit[]
  alerts: ProductWithStatus[]
}

// ─── Reportes ────────────────────────────────────────────────────────────────

export interface ReportFilters {
  date_from?: string
  date_to?: string
  product_id?: number
  category?: string
}

// ─── IPC API (expuesta por contextBridge) ────────────────────────────────────

export interface ElectronAPI {
  // Productos
  products: {
    list: () => Promise<Product[]>
    get: (id: number) => Promise<Product | null>
    create: (input: CreateProductInput) => Promise<Product>
    update: (id: number, input: UpdateProductInput) => Promise<Product>
    deactivate: (id: number) => Promise<void>
    setInitialStock: (items: InitialStockItem[]) => Promise<void>
  }
  // Proveedores
  suppliers: {
    list: () => Promise<Supplier[]>
    create: (input: CreateSupplierInput) => Promise<Supplier>
    update: (id: number, input: Partial<CreateSupplierInput>) => Promise<Supplier>
  }
  // Entradas
  entries: {
    list: (filters?: ReportFilters) => Promise<PurchaseEntry[]>
    get: (id: number) => Promise<PurchaseEntry | null>
    create: (input: CreateEntryInput) => Promise<PurchaseEntry>
  }
  // Salidas
  exits: {
    list: (filters?: ReportFilters) => Promise<Exit[]>
    get: (id: number) => Promise<Exit | null>
    create: (input: CreateExitInput) => Promise<Exit>
  }
  // Ajustes
  adjustments: {
    list: (filters?: ReportFilters) => Promise<StockAdjustment[]>
    create: (input: CreateAdjustmentInput) => Promise<StockAdjustment>
  }
  // Movimientos
  movements: {
    listByProduct: (productId: number) => Promise<InventoryMovement[]>
    listRecent: (limit?: number) => Promise<InventoryMovement[]>
  }
  // Dashboard
  dashboard: {
    getSummary: () => Promise<DashboardSummary>
  }
  // Configuración
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
    getAll: () => Promise<Record<string, string>>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
