import { getDb } from '../database/connection'

export interface ExitItemInput {
  product_id: number
  quantity: number
  unit: string
  notes?: string
}

export interface CreateExitInput {
  date: string
  destination: string
  responsible?: string
  notes?: string
  items: ExitItemInput[]
}

export function listExits(filters?: { date_from?: string; date_to?: string }) {
  const db = getDb()
  let query = `
    SELECT e.*,
           (SELECT COUNT(*) FROM exit_items WHERE exit_id = e.id) as item_count
    FROM exits e
    WHERE 1=1
  `
  const params: Record<string, string> = {}

  if (filters?.date_from) { query += ` AND e.date >= @date_from`; params.date_from = filters.date_from }
  if (filters?.date_to)   { query += ` AND e.date <= @date_to`;   params.date_to   = filters.date_to   }

  query += ` ORDER BY e.date DESC, e.created_at DESC`
  return db.prepare(query).all(params)
}

export function getExit(id: number) {
  const db = getDb()
  const exit = db.prepare(`SELECT * FROM exits WHERE id = ?`).get(id)
  if (!exit) return null

  const items = db.prepare(`
    SELECT ei.*, p.name as product_name, p.visual_unit
    FROM exit_items ei
    JOIN products p ON p.id = ei.product_id
    WHERE ei.exit_id = ?
  `).all(id)

  return { ...exit as object, items }
}

export function createExit(input: CreateExitInput) {
  const db = getDb()

  if (!input.items || input.items.length === 0) {
    throw new Error('La salida debe tener al menos un producto')
  }

  const result = db.transaction(() => {
    // Verificar stock suficiente antes de cualquier escritura
    for (const item of input.items) {
      const product = db.prepare(`SELECT name, stock_current, active FROM products WHERE id = ?`).get(item.product_id) as
        { name: string; stock_current: number; active: number } | undefined

      if (!product || !product.active) throw new Error(`Producto ${item.product_id} no encontrado o inactivo`)
      if (product.stock_current < item.quantity) {
        throw new Error(`Stock insuficiente para "${product.name}": disponible ${product.stock_current}, solicitado ${item.quantity}`)
      }
    }

    const exitResult = db.prepare(`
      INSERT INTO exits (date, destination, responsible, notes, status)
      VALUES (@date, @destination, @responsible, @notes, 'active')
    `).run({
      date:        input.date,
      destination: input.destination,
      responsible: input.responsible ?? null,
      notes:       input.notes       ?? null,
    })

    const exitId = exitResult.lastInsertRowid as number

    for (const item of input.items) {
      db.prepare(`
        INSERT INTO exit_items (exit_id, product_id, quantity, unit, notes)
        VALUES (@exit_id, @product_id, @quantity, @unit, @notes)
      `).run({ exit_id: exitId, product_id: item.product_id, quantity: item.quantity, unit: item.unit, notes: item.notes ?? null })

      db.prepare(`
        INSERT INTO inventory_movements (product_id, type, direction, quantity, unit, date, reference_type, reference_id, notes, responsible)
        VALUES (@product_id, 'exit', 'out', @quantity, @unit, @date, 'exit', @exit_id, @notes, @responsible)
      `).run({
        product_id:  item.product_id,
        quantity:    item.quantity,
        unit:        item.unit,
        date:        input.date,
        exit_id:     exitId,
        notes:       `Destino: ${input.destination}`,
        responsible: input.responsible ?? null,
      })

      db.prepare(`
        UPDATE products SET stock_current = stock_current - @qty, updated_at = datetime('now','localtime') WHERE id = @id
      `).run({ id: item.product_id, qty: item.quantity })
    }

    return exitId
  })()

  return getExit(result)
}
