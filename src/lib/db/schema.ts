import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

const now = sql`(datetime('now'))`

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  username:      text('username').notNull().unique(),
  full_name:     text('full_name').notNull(),
  password_hash: text('password_hash').notNull(),
  role:          text('role', { enum: ['admin', 'operador', 'salidas', 'entradas'] }).notNull(),
  active:        integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at:    text('created_at').notNull().default(now),
  updated_at:    text('updated_at').notNull().default(now),
})

// ── Warehouses ────────────────────────────────────────────────────────────────
export const warehouses = sqliteTable('warehouses', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  slug:       text('slug').notNull().unique(),
  active:     integer('active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull().default(now),
})

// ── Products ──────────────────────────────────────────────────────────────────
export const products = sqliteTable('products', {
  id:                   integer('id').primaryKey({ autoIncrement: true }),
  warehouse_id:         integer('warehouse_id').notNull().references(() => warehouses.id),
  name:                 text('name').notNull(),
  category:             text('category', { enum: ['Produccion', 'Empaques'] }).notNull(),
  base_unit:            text('base_unit').notNull(),
  visual_unit:          text('visual_unit').notNull(),
  conversion_factor:    real('conversion_factor').notNull().default(1),
  stock_minimum:        real('stock_minimum').notNull().default(0),
  stock_current:        real('stock_current').notNull().default(0),
  initial_stock_loaded: integer('initial_stock_loaded', { mode: 'boolean' }).notNull().default(false),
  active:               integer('active', { mode: 'boolean' }).notNull().default(true),
  notes:                text('notes'),
  created_at:           text('created_at').notNull().default(now),
  updated_at:           text('updated_at').notNull().default(now),
})

// ── Purchase Entries ──────────────────────────────────────────────────────────
export const purchase_entries = sqliteTable('purchase_entries', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  warehouse_id:    integer('warehouse_id').notNull().references(() => warehouses.id),
  date:            text('date').notNull(),
  invoice_number:  text('invoice_number'),
  supplier_name:   text('supplier_name'),
  responsible:     text('responsible'),
  notes:           text('notes'),
  subtotal:        real('subtotal').notNull().default(0),
  iva_total:       real('iva_total').notNull().default(0),
  total:           real('total').notNull().default(0),
  status:          text('status', { enum: ['active', 'cancelled'] }).notNull().default('active'),
  created_by_id:   integer('created_by_id').references(() => users.id),
  created_by_name: text('created_by_name'),
  edited_by_id:    integer('edited_by_id').references(() => users.id),
  edited_by_name:  text('edited_by_name'),
  edited_at:       text('edited_at'),
  created_at:      text('created_at').notNull().default(now),
  updated_at:      text('updated_at').notNull().default(now),
})

// ── Purchase Entry Items ──────────────────────────────────────────────────────
export const purchase_entry_items = sqliteTable('purchase_entry_items', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  entry_id:    integer('entry_id').notNull().references(() => purchase_entries.id),
  product_id:  integer('product_id').notNull().references(() => products.id),
  quantity:    real('quantity').notNull(),
  unit:        text('unit').notNull(),
  applies_iva: integer('applies_iva', { mode: 'boolean' }).notNull().default(false),
  iva_rate:    real('iva_rate').notNull().default(0),
  line_total:  real('line_total').notNull().default(0),
  iva_amount:  real('iva_amount').notNull().default(0),
  notes:       text('notes'),
})

// ── Exits ─────────────────────────────────────────────────────────────────────
export const exits = sqliteTable('exits', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  warehouse_id:    integer('warehouse_id').notNull().references(() => warehouses.id),
  date:            text('date').notNull(),
  destination:     text('destination', { enum: ['produccion', 'empaque', 'punto_venta', 'otra'] }).notNull(),
  responsible:     text('responsible'),
  notes:           text('notes'),
  status:          text('status', { enum: ['active', 'cancelled'] }).notNull().default('active'),
  created_by_id:   integer('created_by_id').references(() => users.id),
  created_by_name: text('created_by_name'),
  created_at:      text('created_at').notNull().default(now),
  updated_at:      text('updated_at').notNull().default(now),
})

// ── Exit Items ────────────────────────────────────────────────────────────────
export const exit_items = sqliteTable('exit_items', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  exit_id:    integer('exit_id').notNull().references(() => exits.id),
  product_id: integer('product_id').notNull().references(() => products.id),
  quantity:   real('quantity').notNull(),
  unit:       text('unit').notNull(),
  notes:      text('notes'),
})

// ── Stock Adjustments ─────────────────────────────────────────────────────────
export const stock_adjustments = sqliteTable('stock_adjustments', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  warehouse_id:    integer('warehouse_id').notNull().references(() => warehouses.id),
  date:            text('date').notNull(),
  product_id:      integer('product_id').notNull().references(() => products.id),
  stock_system:    real('stock_system').notNull(),
  stock_physical:  real('stock_physical').notNull(),
  difference:      real('difference').notNull(),
  reason:          text('reason'),
  notes:           text('notes'),
  responsible:     text('responsible'),
  status:          text('status', { enum: ['active', 'cancelled'] }).notNull().default('active'),
  created_by_id:   integer('created_by_id').references(() => users.id),
  created_by_name: text('created_by_name'),
  created_at:      text('created_at').notNull().default(now),
  updated_at:      text('updated_at').notNull().default(now),
})

// ── Inventory Movements ───────────────────────────────────────────────────────
export const inventory_movements = sqliteTable('inventory_movements', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  warehouse_id:    integer('warehouse_id').notNull().references(() => warehouses.id),
  product_id:      integer('product_id').notNull().references(() => products.id),
  type:            text('type', { enum: ['initial', 'entry', 'exit', 'adjustment'] }).notNull(),
  direction:       text('direction', { enum: ['in', 'out', 'adjustment'] }).notNull(),
  quantity:        real('quantity').notNull(),
  unit:            text('unit').notNull(),
  date:            text('date').notNull(),
  reference_type:  text('reference_type'),
  reference_id:    integer('reference_id'),
  notes:           text('notes'),
  responsible:     text('responsible'),
  created_by_id:   integer('created_by_id').references(() => users.id),
  created_by_name: text('created_by_name'),
  created_at:      text('created_at').notNull().default(now),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}, (t: any) => ({
  productIdx:   index('idx_movements_product').on(t.product_id),
  dateIdx:      index('idx_movements_date').on(t.date),
  typeIdx:      index('idx_movements_type').on(t.type),
  warehouseIdx: index('idx_movements_warehouse').on(t.warehouse_id),
}))

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const audit_log = sqliteTable('audit_log', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  entity_type: text('entity_type').notNull(),
  entity_id:   integer('entity_id').notNull(),
  action:      text('action', { enum: ['edit', 'cancel'] }).notNull(),
  user_id:     integer('user_id').notNull().references(() => users.id),
  user_name:   text('user_name').notNull(),
  changes:     text('changes').notNull(), // JSON
  created_at:  text('created_at').notNull().default(now),
})

// ── Settings ──────────────────────────────────────────────────────────────────
export const settings = sqliteTable('settings', {
  key:        text('key').primaryKey(),
  value:      text('value').notNull(),
  updated_at: text('updated_at').notNull().default(now),
})
