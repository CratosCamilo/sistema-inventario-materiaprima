import { db } from '@/lib/db'
import {
  purchase_entries,
  purchase_entry_items,
  products,
  inventory_movements,
  audit_log,
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import type { CreateEntryInput } from '@/types'

export async function listEntries(warehouseId: number, filters?: { date_from?: string; date_to?: string; invoice_number?: string }) {
  const conditions = [eq(purchase_entries.warehouse_id, warehouseId)]
  if (filters?.date_from)      conditions.push(gte(purchase_entries.date, filters.date_from))
  if (filters?.date_to)        conditions.push(lte(purchase_entries.date, filters.date_to))
  if (filters?.invoice_number) conditions.push(sql`lower(${purchase_entries.invoice_number}) LIKE lower(${'%' + filters.invoice_number + '%'})`)

  const rows = await db.select().from(purchase_entries)
    .where(and(...conditions))
    .orderBy(desc(purchase_entries.date), desc(purchase_entries.created_at))

  // Item count via subquery
  const withCounts = await Promise.all(rows.map(async entry => {
    const items = await db.select().from(purchase_entry_items).where(eq(purchase_entry_items.entry_id, entry.id))
    return { ...entry, item_count: items.length }
  }))

  return withCounts
}

export async function getEntry(id: number) {
  const [entry] = await db.select().from(purchase_entries).where(eq(purchase_entries.id, id))
  if (!entry) return null

  const items = await db
    .select({
      id:          purchase_entry_items.id,
      entry_id:    purchase_entry_items.entry_id,
      product_id:  purchase_entry_items.product_id,
      product_name: products.name,
      quantity:    purchase_entry_items.quantity,
      unit:        purchase_entry_items.unit,
      applies_iva: purchase_entry_items.applies_iva,
      iva_rate:    purchase_entry_items.iva_rate,
      line_total:  purchase_entry_items.line_total,
      iva_amount:  purchase_entry_items.iva_amount,
      notes:       purchase_entry_items.notes,
    })
    .from(purchase_entry_items)
    .leftJoin(products, eq(products.id, purchase_entry_items.product_id))
    .where(eq(purchase_entry_items.entry_id, id))

  return { ...entry, items }
}

export async function createEntry(
  warehouseId: number,
  input: CreateEntryInput,
  userId: number | null,
  userName: string | null,
) {
  if (!input.items?.length) throw new Error('La entrada debe tener al menos un producto')

  // Calcular totales
  const ivaDefault = 0
  const itemsWithCalcs = input.items.map(item => {
    const appliesIva = item.applies_iva ?? false
    const ivaRate    = appliesIva ? (item.iva_rate ?? ivaDefault) : 0
    const lineTotal  = item.line_total ?? 0
    const ivaAmount  = lineTotal * ivaRate / 100
    return { ...item, applies_iva: appliesIva, iva_rate: ivaRate, line_total: lineTotal, iva_amount: ivaAmount }
  })

  const subtotal = itemsWithCalcs.reduce((s, i) => s + i.line_total, 0)
  const ivaTotal = itemsWithCalcs.reduce((s, i) => s + i.iva_amount, 0)
  const total    = subtotal + ivaTotal

  const [entry] = await db.insert(purchase_entries).values({
    warehouse_id:    warehouseId,
    date:            input.date,
    invoice_number:  input.invoice_number ?? null,
    supplier_name:   input.supplier_name  ?? null,
    responsible:     input.responsible    ?? null,
    notes:           input.notes          ?? null,
    subtotal,
    iva_total:       ivaTotal,
    total,
    created_by_id:   userId,
    created_by_name: userName,
  }).returning()

  for (const item of itemsWithCalcs) {
    const product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0])
    if (!product || !product.active) throw new Error(`Producto ${item.product_id} no encontrado o inactivo`)

    await db.insert(purchase_entry_items).values({
      entry_id:    entry.id,
      product_id:  item.product_id,
      quantity:    item.quantity,
      unit:        item.unit,
      applies_iva: item.applies_iva,
      iva_rate:    item.iva_rate,
      line_total:  item.line_total,
      iva_amount:  item.iva_amount,
      notes:       item.notes ?? null,
    })

    await db.insert(inventory_movements).values({
      warehouse_id:    warehouseId,
      product_id:      item.product_id,
      type:            'entry',
      direction:       'in',
      quantity:        item.quantity,
      unit:            item.unit,
      date:            input.date,
      reference_type:  'purchase_entry',
      reference_id:    entry.id,
      notes:           input.invoice_number ? `Factura: ${input.invoice_number}` : null,
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    })

    await db.update(products).set({
      stock_current: sql`${products.stock_current} + ${item.quantity}`,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))
  }

  return getEntry(entry.id)
}

export async function editEntry(
  id: number,
  input: CreateEntryInput,
  userId: number,
  userName: string,
) {
  const existingEntry = await getEntry(id)
  if (!existingEntry) throw new Error(`Entrada ${id} no encontrada`)
  if (existingEntry.status === 'cancelled') throw new Error('No se puede editar una entrada anulada')

  const oldItems = existingEntry.items ?? []

  // Calcular nuevos items con IVA
  const newItemsCalc = input.items.map(item => {
    const appliesIva = item.applies_iva ?? false
    const ivaRate    = appliesIva ? (item.iva_rate ?? 0) : 0
    const lineTotal  = item.line_total ?? 0
    const ivaAmount  = lineTotal * ivaRate / 100
    return { ...item, applies_iva: appliesIva, iva_rate: ivaRate, line_total: lineTotal, iva_amount: ivaAmount }
  })

  // Calcular diferencias de stock por producto
  const stockChanges = new Map<number, number>()
  for (const old of oldItems) {
    stockChanges.set(old.product_id, (stockChanges.get(old.product_id) ?? 0) - old.quantity)
  }
  for (const newItem of newItemsCalc) {
    stockChanges.set(newItem.product_id, (stockChanges.get(newItem.product_id) ?? 0) + newItem.quantity)
  }

  // Nuevos totales
  const subtotal = newItemsCalc.reduce((s, i) => s + i.line_total, 0)
  const ivaTotal = newItemsCalc.reduce((s, i) => s + i.iva_amount, 0)
  const total    = subtotal + ivaTotal

  // Registro de auditoría
  const changes = {
    invoice_number: { before: existingEntry.invoice_number, after: input.invoice_number ?? null },
    supplier_name:  { before: existingEntry.supplier_name,  after: input.supplier_name  ?? null },
    responsible:    { before: existingEntry.responsible,    after: input.responsible    ?? null },
    notes:          { before: existingEntry.notes,          after: input.notes          ?? null },
    subtotal:       { before: existingEntry.subtotal,       after: subtotal },
    total:          { before: existingEntry.total,          after: total },
    items:          { before: oldItems,                     after: newItemsCalc },
  }

  await db.insert(audit_log).values({
    entity_type: 'purchase_entry',
    entity_id:   id,
    action:      'edit',
    user_id:     userId,
    user_name:   userName,
    changes:     JSON.stringify(changes),
  })

  // Actualizar cabecera
  await db.update(purchase_entries).set({
    date:           input.date,
    invoice_number: input.invoice_number ?? null,
    supplier_name:  input.supplier_name  ?? null,
    responsible:    input.responsible    ?? null,
    notes:          input.notes          ?? null,
    subtotal,
    iva_total:      ivaTotal,
    total,
    edited_by_id:   userId,
    edited_by_name: userName,
    edited_at:      sql`(datetime('now'))`,
    updated_at:     sql`(datetime('now'))`,
  }).where(eq(purchase_entries.id, id))

  // Reemplazar items
  await db.delete(purchase_entry_items).where(eq(purchase_entry_items.entry_id, id))
  for (const item of newItemsCalc) {
    await db.insert(purchase_entry_items).values({
      entry_id:    id,
      product_id:  item.product_id,
      quantity:    item.quantity,
      unit:        item.unit,
      applies_iva: item.applies_iva,
      iva_rate:    item.iva_rate,
      line_total:  item.line_total,
      iva_amount:  item.iva_amount,
      notes:       item.notes ?? null,
    })
  }

  // Aplicar cambios de stock
  for (const [productId, delta] of Array.from(stockChanges.entries())) {
    if (delta === 0) continue
    await db.update(products).set({
      stock_current: sql`${products.stock_current} + ${delta}`,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, productId))
  }

  return getEntry(id)
}

export async function cancelEntry(id: number, userId: number, userName: string) {
  const existingEntry = await getEntry(id)
  if (!existingEntry) throw new Error(`Entrada ${id} no encontrada`)
  if (existingEntry.status === 'cancelled') throw new Error('La entrada ya está anulada')

  for (const item of existingEntry.items ?? []) {
    await db.update(products).set({
      stock_current: sql`${products.stock_current} - ${item.quantity}`,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))
  }

  await db.insert(audit_log).values({
    entity_type: 'purchase_entry',
    entity_id:   id,
    action:      'cancel',
    user_id:     userId,
    user_name:   userName,
    changes:     JSON.stringify({ status: { before: 'active', after: 'cancelled' } }),
  })

  await db.update(purchase_entries).set({
    status:     'cancelled',
    updated_at: sql`(datetime('now'))`,
  }).where(eq(purchase_entries.id, id))

  return { ok: true }
}
