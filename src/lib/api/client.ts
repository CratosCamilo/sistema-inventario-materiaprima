import type {
  Product,
  CreateProductInput,
  UpdateProductInput,
  InitialStockItem,
  PurchaseEntry,
  CreateEntryInput,
  Exit,
  CreateExitInput,
  StockAdjustment,
  CreateAdjustmentInput,
  AdjustmentBatch,
  CreateAdjustmentBatchInput,
  InventoryMovement,
  AuditLogEntry,
  User,
  CreateUserInput,
  Warehouse,
  ProductCategory,
} from '@/types'

async function request<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data as T
}

const get  = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => request<T>(path, { method: 'GET' }, params)
const post = <T>(path: string, body: unknown, params?: Record<string, string | number | boolean | undefined>) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }, params)
const put  = <T>(path: string, body: unknown, params?: Record<string, string | number | boolean | undefined>) => request<T>(path, { method: 'PUT',  body: JSON.stringify(body) }, params)
const del  = <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => request<T>(path, { method: 'DELETE' }, params)

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  list:         (warehouseId: number, includeInactive = false) =>
    get<Product[]>('/api/products', { warehouse_id: warehouseId, include_inactive: includeInactive }),
  get:          (id: number) =>
    get<Product>(`/api/products/${id}`),
  create:       (warehouseId: number, input: CreateProductInput) =>
    post<Product>('/api/products', input, { warehouse_id: warehouseId }),
  update:       (id: number, input: UpdateProductInput) =>
    put<Product>(`/api/products/${id}`, input),
  deactivate:   (id: number) =>
    del<{ ok: boolean }>(`/api/products/${id}`),
  setInitialStock: (warehouseId: number, items: InitialStockItem[]) =>
    post<{ ok: boolean }>('/api/products/initial-stock', { items }, { warehouse_id: warehouseId }),
}

// ── Entries ───────────────────────────────────────────────────────────────────
export const entriesApi = {
  list:   (warehouseId: number, filters?: { date_from?: string; date_to?: string; invoice_number?: string }) =>
    get<PurchaseEntry[]>('/api/entries', { warehouse_id: warehouseId, ...filters }),
  get:    (id: number) =>
    get<PurchaseEntry & { history: AuditLogEntry[] }>(`/api/entries/${id}`),
  create: (warehouseId: number, input: CreateEntryInput) =>
    post<PurchaseEntry>('/api/entries', input, { warehouse_id: warehouseId }),
  edit:   (id: number, input: CreateEntryInput) =>
    put<PurchaseEntry>(`/api/entries/${id}`, input),
  cancel: (id: number) =>
    del<{ ok: boolean }>(`/api/entries/${id}`),
}

// ── Exits ─────────────────────────────────────────────────────────────────────
export const exitsApi = {
  list:   (warehouseId: number, filters?: { date_from?: string; date_to?: string }) =>
    get<Exit[]>('/api/exits', { warehouse_id: warehouseId, ...filters }),
  get:    (id: number) =>
    get<Exit>(`/api/exits/${id}`),
  create: (warehouseId: number, input: CreateExitInput) =>
    post<Exit>('/api/exits', input, { warehouse_id: warehouseId }),
  cancel: (id: number) =>
    del<{ ok: boolean }>(`/api/exits/${id}`),
}

// ── Adjustments ───────────────────────────────────────────────────────────────
export const adjustmentsApi = {
  list:   (warehouseId: number, filters?: { date_from?: string; date_to?: string }) =>
    get<StockAdjustment[]>('/api/adjustments', { warehouse_id: warehouseId, ...filters }),
  create: (warehouseId: number, input: CreateAdjustmentInput) =>
    post<StockAdjustment>('/api/adjustments', input, { warehouse_id: warehouseId }),
}

// ── Adjustment Batches ────────────────────────────────────────────────────────
export const adjustmentBatchesApi = {
  list:   (warehouseId: number, filters?: { date_from?: string; date_to?: string; category?: ProductCategory }) =>
    get<AdjustmentBatch[]>('/api/adjustments/batches', { warehouse_id: warehouseId, ...filters }),
  get:    (id: number) =>
    get<AdjustmentBatch>(`/api/adjustments/batches/${id}`),
  create: (warehouseId: number, input: CreateAdjustmentBatchInput) =>
    post<AdjustmentBatch>('/api/adjustments/batches', input, { warehouse_id: warehouseId }),
}

// ── Movements ─────────────────────────────────────────────────────────────────
export const movementsApi = {
  list: (warehouseId: number, filters?: { product_id?: number; type?: string; date_from?: string; date_to?: string }) =>
    get<InventoryMovement[]>('/api/movements', { warehouse_id: warehouseId, ...filters }),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: (warehouseId: number) =>
    get<{
      stock: { total: number; normal: number; low: number; critical: number }
      entries_this_month: number
      exits_this_month: number
      recent_movements: InventoryMovement[]
      alert_products: Product[]
    }>('/api/dashboard', { warehouse_id: warehouseId }),
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsApi = {
  get:    () => get<Record<string, string>>('/api/settings'),
  update: (pairs: Record<string, string>) => put<{ ok: boolean }>('/api/settings', pairs),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list:   () => get<User[]>('/api/users'),
  get:    (id: number) => get<User>(`/api/users/${id}`),
  create: (input: CreateUserInput) => post<User>('/api/users', input),
  update: (id: number, input: Partial<CreateUserInput> & { active?: boolean }) =>
    put<User>(`/api/users/${id}`, input),
}

// ── Warehouses ────────────────────────────────────────────────────────────────
export const warehousesApi = {
  list: () => get<Warehouse[]>('/api/warehouses'),
}

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  listEntryEdits: (filters?: { date_from?: string; date_to?: string }) =>
    get<AuditLogEntry[]>('/api/audit', filters),
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  logout: () => post<{ ok: boolean }>('/api/auth/logout', {}),
}
