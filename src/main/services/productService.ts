import { getDb } from '../database/connection'

export interface ProductRow {
  id: number
  name: string
  category: string
  base_unit: string
  visual_unit: string
  conversion_factor: number
  stock_minimum: number
  stock_current: number
  initial_stock_loaded: number
  active: number
  notes: string | null
  created_at: string
  updated_at: string
}

export function listProducts(): ProductRow[] {
  return getDb().prepare(`SELECT * FROM products ORDER BY category, name`).all() as ProductRow[]
}

export function getProduct(id: number): ProductRow | null {
  return (getDb().prepare(`SELECT * FROM products WHERE id = ?`).get(id) as ProductRow) ?? null
}

export function createProduct(input: {
  name: string
  category: string
  base_unit: string
  visual_unit: string
  conversion_factor?: number
  stock_minimum: number
  notes?: string
}): ProductRow {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO products (name, category, base_unit, visual_unit, conversion_factor, stock_minimum, notes)
    VALUES (@name, @category, @base_unit, @visual_unit, @conversion_factor, @stock_minimum, @notes)
  `).run({
    name: input.name,
    category: input.category,
    base_unit: input.base_unit,
    visual_unit: input.visual_unit,
    conversion_factor: input.conversion_factor ?? 1,
    stock_minimum: input.stock_minimum,
    notes: input.notes ?? null,
  })
  return getProduct(result.lastInsertRowid as number)!
}

export function updateProduct(id: number, input: {
  name?: string
  category?: string
  base_unit?: string
  visual_unit?: string
  conversion_factor?: number
  stock_minimum?: number
  notes?: string
  active?: number
}): ProductRow {
  const current = getProduct(id)
  if (!current) throw new Error(`Producto ${id} no encontrado`)

  const db = getDb()
  db.prepare(`
    UPDATE products SET
      name              = @name,
      category          = @category,
      base_unit         = @base_unit,
      visual_unit       = @visual_unit,
      conversion_factor = @conversion_factor,
      stock_minimum     = @stock_minimum,
      notes             = @notes,
      active            = @active,
      updated_at        = datetime('now','localtime')
    WHERE id = @id
  `).run({
    id,
    name:              input.name              ?? current.name,
    category:          input.category          ?? current.category,
    base_unit:         input.base_unit         ?? current.base_unit,
    visual_unit:       input.visual_unit       ?? current.visual_unit,
    conversion_factor: input.conversion_factor ?? current.conversion_factor,
    stock_minimum:     input.stock_minimum     ?? current.stock_minimum,
    notes:             input.notes             ?? current.notes,
    active:            input.active            ?? current.active,
  })
  return getProduct(id)!
}

export function deactivateProduct(id: number): void {
  getDb().prepare(`UPDATE products SET active = 0, updated_at = datetime('now','localtime') WHERE id = ?`).run(id)
}

export function setInitialStock(items: { product_id: number; quantity: number; notes?: string }[]): void {
  const db = getDb()

  const doSet = db.transaction(() => {
    for (const item of items) {
      const product = getProduct(item.product_id)
      if (!product) throw new Error(`Producto ${item.product_id} no encontrado`)
      if (product.initial_stock_loaded) {
        throw new Error(`El producto "${product.name}" ya tiene inventario inicial registrado. Use ajustes para corregir.`)
      }

      db.prepare(`
        UPDATE products SET stock_current = @qty, initial_stock_loaded = 1, updated_at = datetime('now','localtime')
        WHERE id = @id
      `).run({ id: item.product_id, qty: item.quantity })

      db.prepare(`
        INSERT INTO inventory_movements (product_id, type, direction, quantity, unit, date, reference_type, reference_id, notes, responsible)
        VALUES (@product_id, 'initial', 'in', @quantity, @unit, date('now','localtime'), 'initial', @product_id, @notes, 'Sistema')
      `).run({
        product_id: item.product_id,
        quantity: item.quantity,
        unit: product.visual_unit,
        notes: item.notes ?? 'Inventario inicial',
      })
    }
  })

  doSet()
}
