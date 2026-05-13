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

function buildDetailedItems(items: CreateEntryInput['items']) {
  return items.map(item => {
    const appliesIva = item.applies_iva ?? false
    const ivaRate    = appliesIva ? (item.iva_rate ?? 0) : 0
    const lineTotal  = item.line_total ?? 0
    const ivaAmount  = lineTotal * ivaRate / 100
    return { ...item, applies_iva: appliesIva, iva_rate: ivaRate, line_total: lineTotal, iva_amount: ivaAmount }
  })
}

// Devuelve cantidad convertida a unidades base dado el unit enviado y el producto
function toBaseQty(
  quantity: number,
  sentUnit: string,
  visualUnit: string,
  factor: number,
): number {
  if (!factor || factor <= 1 || sentUnit !== visualUnit) return quantity
  return quantity * factor
}

export async function listEntries(warehouseId: number, filters?: { date_from?: string; date_to?: string; invoice_number?: string }) {
  const conditions = [eq(purchase_entries.warehouse_id, warehouseId)]
  if (filters?.date_from)      conditions.push(gte(purchase_entries.date, filters.date_from))
  if (filters?.date_to)        conditions.push(lte(purchase_entries.date, filters.date_to))
  if (filters?.invoice_number) conditions.push(sql`lower(${purchase_entries.invoice_number}) LIKE lower(${'%' + filters.invoice_number + '%'})`)

  const rows = await db.select().from(purchase_entries)
    .where(and(...conditions))
    .orderBy(desc(purchase_entries.date), desc(purchase_entries.created_at))

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
      id:                purchase_entry_items.id,
      entry_id:          purchase_entry_items.entry_id,
      product_id:        purchase_entry_items.product_id,
      product_name:      products.name,
      quantity:          purchase_entry_items.quantity,
      unit:              purchase_entry_items.unit,
      visual_unit:       products.visual_unit,
      base_unit:         products.base_unit,
      conversion_factor: products.conversion_factor,
      applies_iva:       purchase_entry_items.applies_iva,
      iva_rate:          purchase_entry_items.iva_rate,
      line_total:        purchase_entry_items.line_total,
      iva_amount:        purchase_entry_items.iva_amount,
      notes:             purchase_entry_items.notes,
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

  const mode = input.entry_mode ?? 'detailed'
  let subtotal: number, ivaTotal: number, total: number
  let itemsWithCalcs: ReturnType<typeof buildDetailedItems>

  if (mode === 'total_only') {
    itemsWithCalcs = input.items.map(item => ({
      ...item,
      applies_iva: false,
      iva_rate: 0,
      line_total: 0,
      iva_amount: 0,
    }))
    subtotal = input.invoice_total ?? 0
    ivaTotal = 0
    total    = subtotal
  } else {
    itemsWithCalcs = buildDetailedItems(input.items)
    subtotal = itemsWithCalcs.reduce((s, i) => s + i.line_total, 0)
    ivaTotal = itemsWithCalcs.reduce((s, i) => s + i.iva_amount, 0)
    total    = subtotal + ivaTotal
  }

  const [entry] = await db.insert(purchase_entries).values({
    warehouse_id:    warehouseId,
    date:            input.date,
    invoice_number:  input.invoice_number ?? null,
    supplier_name:   input.supplier_name  ?? null,
    responsible:     input.responsible    ?? null,
    notes:           input.notes          ?? null,
    entry_mode:      mode,
    subtotal,
    iva_total:       ivaTotal,
    total,
    created_by_id:   userId,
    created_by_name: userName,
  }).returning()

  for (const item of itemsWithCalcs) {
    const product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0])
    if (!product || !product.active) throw new Error(`Producto ${item.product_id} no encontrado o inactivo`)

    const factor  = product.conversion_factor ?? 1
    const qtyBase = toBaseQty(item.quantity, item.unit, product.visual_unit, factor)

    await db.insert(purchase_entry_items).values({
      entry_id:    entry.id,
      product_id:  item.product_id,
      quantity:    qtyBase,
      unit:        product.base_unit,
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
      quantity:        qtyBase,
      unit:            product.base_unit,
      date:            input.date,
      reference_type:  'purchase_entry',
      reference_id:    entry.id,
      notes:           input.invoice_number ? `Factura: ${input.invoice_number}` : null,
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    })

    await db.update(products).set({
      stock_current: sql`${products.stock_current} + ${qtyBase}`,
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
  const mode     = input.entry_mode ?? existingEntry.entry_mode ?? 'detailed'

  let newItemsCalc: ReturnType<typeof buildDetailedItems>
  let subtotal: number, ivaTotal: number, total: number

  if (mode === 'total_only') {
    newItemsCalc = input.items.map(item => ({
      ...item, applies_iva: false, iva_rate: 0, line_total: 0, iva_amount: 0,
    }))
    subtotal = input.invoice_total ?? 0
    ivaTotal = 0
    total    = subtotal
  } else {
    newItemsCalc = buildDetailedItems(input.items)
    subtotal = newItemsCalc.reduce((s, i) => s + i.line_total, 0)
    ivaTotal = newItemsCalc.reduce((s, i) => s + i.iva_amount, 0)
    total    = subtotal + ivaTotal
  }

  // Convertir items nuevos a unidades base
  const productCache = new Map<number, typeof products.$inferSelect>()
  const newItemsBase: Array<(typeof newItemsCalc)[number] & { qty_base: number }> = []
  for (const item of newItemsCalc) {
    let product = productCache.get(item.product_id)
    if (!product) {
      product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0])
      if (!product) throw new Error(`Producto ${item.product_id} no encontrado`)
      productCache.set(item.product_id, product)
    }
    const factor  = product.conversion_factor ?? 1
    const qty_base = toBaseQty(item.quantity, item.unit, product.visual_unit, factor)
    newItemsBase.push({ ...item, qty_base })
  }

  // Calcular diferencias de stock por producto (old quantities ya están en base)
  const stockChanges = new Map<number, number>()
  for (const old of oldItems) {
    stockChanges.set(old.product_id, (stockChanges.get(old.product_id) ?? 0) - old.quantity)
  }
  for (const newItem of newItemsBase) {
    stockChanges.set(newItem.product_id, (stockChanges.get(newItem.product_id) ?? 0) + newItem.qty_base)
  }

  const changes = {
    invoice_number: { before: existingEntry.invoice_number, after: input.invoice_number ?? null },
    supplier_name:  { before: existingEntry.supplier_name,  after: input.supplier_name  ?? null },
    responsible:    { before: existingEntry.responsible,    after: input.responsible    ?? null },
    notes:          { before: existingEntry.notes,          after: input.notes          ?? null },
    subtotal:       { before: existingEntry.subtotal,       after: subtotal },
    total:          { before: existingEntry.total,          after: total },
    items:          { before: oldItems,                     after: newItemsBase },
  }

  await db.insert(audit_log).values({
    entity_type: 'purchase_entry',
    entity_id:   id,
    action:      'edit',
    user_id:     userId,
    user_name:   userName,
    changes:     JSON.stringify(changes),
  })

  await db.update(purchase_entries).set({
    date:           input.date,
    invoice_number: input.invoice_number ?? null,
    supplier_name:  input.supplier_name  ?? null,
    responsible:    input.responsible    ?? null,
    notes:          input.notes          ?? null,
    entry_mode:     mode,
    subtotal,
    iva_total:      ivaTotal,
    total,
    edited_by_id:   userId,
    edited_by_name: userName,
    edited_at:      sql`(datetime('now'))`,
    updated_at:     sql`(datetime('now'))`,
  }).where(eq(purchase_entries.id, id))

  await db.delete(inventory_movements).where(
    and(
      eq(inventory_movements.reference_type, 'purchase_entry'),
      eq(inventory_movements.reference_id, id),
    )
  )

  await db.delete(purchase_entry_items).where(eq(purchase_entry_items.entry_id, id))
  for (const item of newItemsBase) {
    const product = productCache.get(item.product_id)!
    await db.insert(purchase_entry_items).values({
      entry_id:    id,
      product_id:  item.product_id,
      quantity:    item.qty_base,
      unit:        product.base_unit,
      applies_iva: item.applies_iva,
      iva_rate:    item.iva_rate,
      line_total:  item.line_total,
      iva_amount:  item.iva_amount,
      notes:       item.notes ?? null,
    })

    await db.insert(inventory_movements).values({
      warehouse_id:    existingEntry.warehouse_id,
      product_id:      item.product_id,
      type:            'entry',
      direction:       'in',
      quantity:        item.qty_base,
      unit:            product.base_unit,
      date:            input.date,
      reference_type:  'purchase_entry',
      reference_id:    id,
      notes:           input.invoice_number ? `Factura: ${input.invoice_number}` : null,
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    })
  }

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

  // Quantities stored in base units — reversal is straightforward
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
