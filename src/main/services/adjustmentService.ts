import { getDb } from '../database/connection'

export interface CreateAdjustmentInput {
  date: string
  product_id: number
  stock_physical: number
  reason?: string
  notes?: string
  responsible?: string
}

export function listAdjustments(filters?: { date_from?: string; date_to?: string }) {
  const db = getDb()
  let query = `
    SELECT sa.*, p.name as product_name, p.visual_unit
    FROM stock_adjustments sa
    JOIN products p ON p.id = sa.product_id
    WHERE 1=1
  `
  const params: Record<string, string> = {}

  if (filters?.date_from) { query += ` AND sa.date >= @date_from`; params.date_from = filters.date_from }
  if (filters?.date_to)   { query += ` AND sa.date <= @date_to`;   params.date_to   = filters.date_to   }

  query += ` ORDER BY sa.date DESC, sa.created_at DESC`
  return db.prepare(query).all(params)
}

export function createAdjustment(input: CreateAdjustmentInput) {
  const db = getDb()

  const result = db.transaction(() => {
    const product = db.prepare(`SELECT * FROM products WHERE id = ? AND active = 1`).get(input.product_id) as
      { id: number; name: string; stock_current: number; visual_unit: string } | undefined

    if (!product) throw new Error(`Producto ${input.product_id} no encontrado o inactivo`)

    const stockSystem   = product.stock_current
    const stockPhysical = input.stock_physical
    const difference    = stockPhysical - stockSystem
    const direction     = difference >= 0 ? 'in' : 'out'

    const adjResult = db.prepare(`
      INSERT INTO stock_adjustments (date, product_id, stock_system, stock_physical, difference, reason, notes, responsible, status)
      VALUES (@date, @product_id, @stock_system, @stock_physical, @difference, @reason, @notes, @responsible, 'active')
    `).run({
      date:           input.date,
      product_id:     input.product_id,
      stock_system:   stockSystem,
      stock_physical: stockPhysical,
      difference,
      reason:         input.reason      ?? null,
      notes:          input.notes       ?? null,
      responsible:    input.responsible ?? null,
    })

    const adjId = adjResult.lastInsertRowid as number

    db.prepare(`
      INSERT INTO inventory_movements
        (product_id, type, direction, quantity, unit, date, reference_type, reference_id, notes, responsible)
      VALUES
        (@product_id, 'adjustment', @direction, @quantity, @unit, @date, 'adjustment', @adj_id, @notes, @responsible)
    `).run({
      product_id:  input.product_id,
      direction,
      quantity:    Math.abs(difference),
      unit:        product.visual_unit,
      date:        input.date,
      adj_id:      adjId,
      notes:       input.reason ?? 'Ajuste de inventario',
      responsible: input.responsible ?? null,
    })

    db.prepare(`
      UPDATE products SET stock_current = @qty, updated_at = datetime('now','localtime') WHERE id = @id
    `).run({ id: input.product_id, qty: stockPhysical })

    return adjId
  })()

  return db.prepare(`
    SELECT sa.*, p.name as product_name, p.visual_unit
    FROM stock_adjustments sa
    JOIN products p ON p.id = sa.product_id
    WHERE sa.id = ?
  `).get(result)
}
