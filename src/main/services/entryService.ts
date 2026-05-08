import { getDb } from '../database/connection'

export interface EntryItemInput {
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
  items: EntryItemInput[]
}

export function listEntries(filters?: { date_from?: string; date_to?: string }) {
  const db = getDb()
  let query = `
    SELECT pe.*,
           (SELECT COUNT(*) FROM purchase_entry_items WHERE entry_id = pe.id) as item_count
    FROM purchase_entries pe
    WHERE 1=1
  `
  const params: Record<string, string> = {}

  if (filters?.date_from) { query += ` AND pe.date >= @date_from`; params.date_from = filters.date_from }
  if (filters?.date_to)   { query += ` AND pe.date <= @date_to`;   params.date_to   = filters.date_to   }

  query += ` ORDER BY pe.date DESC, pe.created_at DESC`
  return db.prepare(query).all(params)
}

export function getEntry(id: number) {
  const db = getDb()
  const entry = db.prepare(`SELECT * FROM purchase_entries WHERE id = ?`).get(id)
  if (!entry) return null

  const items = db.prepare(`
    SELECT pei.*, p.name as product_name, p.visual_unit
    FROM purchase_entry_items pei
    JOIN products p ON p.id = pei.product_id
    WHERE pei.entry_id = ?
  `).all(id)

  return { ...entry as object, items }
}

export function createEntry(input: CreateEntryInput) {
  const db = getDb()

  if (!input.items || input.items.length === 0) {
    throw new Error('La entrada debe tener al menos un producto')
  }

  const result = db.transaction(() => {
    const entryResult = db.prepare(`
      INSERT INTO purchase_entries (date, invoice_number, supplier_id, supplier_name, responsible, notes, status)
      VALUES (@date, @invoice_number, @supplier_id, @supplier_name, @responsible, @notes, 'active')
    `).run({
      date:           input.date,
      invoice_number: input.invoice_number ?? null,
      supplier_id:    input.supplier_id    ?? null,
      supplier_name:  input.supplier_name  ?? null,
      responsible:    input.responsible    ?? null,
      notes:          input.notes          ?? null,
    })

    const entryId = entryResult.lastInsertRowid as number

    for (const item of input.items) {
      const product = db.prepare(`SELECT * FROM products WHERE id = ? AND active = 1`).get(item.product_id) as { visual_unit: string } | undefined
      if (!product) throw new Error(`Producto ${item.product_id} no encontrado o inactivo`)

      db.prepare(`
        INSERT INTO purchase_entry_items (entry_id, product_id, quantity, unit, notes)
        VALUES (@entry_id, @product_id, @quantity, @unit, @notes)
      `).run({ entry_id: entryId, product_id: item.product_id, quantity: item.quantity, unit: item.unit, notes: item.notes ?? null })

      db.prepare(`
        INSERT INTO inventory_movements (product_id, type, direction, quantity, unit, date, reference_type, reference_id, notes, responsible)
        VALUES (@product_id, 'entry', 'in', @quantity, @unit, @date, 'purchase_entry', @entry_id, @notes, @responsible)
      `).run({
        product_id:  item.product_id,
        quantity:    item.quantity,
        unit:        item.unit,
        date:        input.date,
        entry_id:    entryId,
        notes:       input.invoice_number ? `Factura: ${input.invoice_number}` : null,
        responsible: input.responsible ?? null,
      })

      db.prepare(`
        UPDATE products SET stock_current = stock_current + @qty, updated_at = datetime('now','localtime') WHERE id = @id
      `).run({ id: item.product_id, qty: item.quantity })
    }

    return entryId
  })()

  return getEntry(result)
}
