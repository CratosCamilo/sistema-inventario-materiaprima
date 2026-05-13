import { db } from '@/lib/db'
import {
  exits,
  exit_items,
  products,
  inventory_movements,
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import type { CreateExitInput } from '@/types'

function toBaseQty(quantity: number, sentUnit: string, visualUnit: string, factor: number): number {
  if (!factor || factor <= 1 || sentUnit !== visualUnit) return quantity
  return quantity * factor
}

export async function listExits(warehouseId: number, filters?: { date_from?: string; date_to?: string }) {
  const conditions = [eq(exits.warehouse_id, warehouseId)]
  if (filters?.date_from) conditions.push(gte(exits.date, filters.date_from))
  if (filters?.date_to)   conditions.push(lte(exits.date, filters.date_to))

  const rows = await db.select().from(exits)
    .where(and(...conditions))
    .orderBy(desc(exits.date), desc(exits.created_at))

  const withCounts = await Promise.all(rows.map(async exit => {
    const items = await db.select().from(exit_items).where(eq(exit_items.exit_id, exit.id))
    return { ...exit, item_count: items.length }
  }))

  return withCounts
}

export async function getExit(id: number) {
  const [exit] = await db.select().from(exits).where(eq(exits.id, id))
  if (!exit) return null

  const items = await db
    .select({
      id:                exit_items.id,
      exit_id:           exit_items.exit_id,
      product_id:        exit_items.product_id,
      product_name:      products.name,
      quantity:          exit_items.quantity,
      unit:              exit_items.unit,
      visual_unit:       products.visual_unit,
      base_unit:         products.base_unit,
      conversion_factor: products.conversion_factor,
      notes:             exit_items.notes,
    })
    .from(exit_items)
    .leftJoin(products, eq(products.id, exit_items.product_id))
    .where(eq(exit_items.exit_id, id))

  return { ...exit, items }
}

export async function createExit(
  warehouseId: number,
  input: CreateExitInput,
  userId: number | null,
  userName: string | null,
) {
  if (!input.items?.length) throw new Error('La salida debe tener al menos un producto')

  // Validar stock antes de escribir — convertir a unidades base para comparar
  for (const item of input.items) {
    const product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0])
    if (!product || !product.active) throw new Error(`Producto ${item.product_id} no encontrado o inactivo`)

    const factor   = product.conversion_factor ?? 1
    const qty_base = toBaseQty(item.quantity, item.unit, product.visual_unit, factor)

    if (product.stock_current < qty_base) {
      const visual_avail = factor > 1 ? Math.floor(product.stock_current / factor) : product.stock_current
      throw new Error(
        `Stock insuficiente para "${product.name}": disponible ${visual_avail} ${product.visual_unit}` +
        (factor > 1 ? ` (${product.stock_current} ${product.base_unit})` : '') +
        `, solicitado ${item.quantity} ${item.unit}`
      )
    }
  }

  const [exit] = await db.insert(exits).values({
    warehouse_id:    warehouseId,
    date:            input.date,
    destination:     input.destination,
    responsible:     input.responsible    ?? null,
    notes:           input.notes          ?? null,
    created_by_id:   userId,
    created_by_name: userName,
  }).returning()

  for (const item of input.items) {
    const product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0]!)
    const factor   = product.conversion_factor ?? 1
    const qty_base = toBaseQty(item.quantity, item.unit, product.visual_unit, factor)

    await db.insert(exit_items).values({
      exit_id:    exit.id,
      product_id: item.product_id,
      quantity:   qty_base,
      unit:       product.base_unit,
      notes:      item.notes ?? null,
    })

    await db.insert(inventory_movements).values({
      warehouse_id:    warehouseId,
      product_id:      item.product_id,
      type:            'exit',
      direction:       'out',
      quantity:        qty_base,
      unit:            product.base_unit,
      date:            input.date,
      reference_type:  'exit',
      reference_id:    exit.id,
      notes:           input.destination ? `Destino: ${input.destination}` : null,
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    })

    await db.update(products).set({
      stock_current: sql`${products.stock_current} - ${qty_base}`,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))
  }

  return getExit(exit.id)
}

export async function cancelExit(id: number) {
  const existingExit = await getExit(id)
  if (!existingExit) throw new Error(`Salida ${id} no encontrada`)
  if (existingExit.status === 'cancelled') throw new Error('La salida ya está anulada')

  // Quantities stored in base units — reversal is straightforward
  for (const item of existingExit.items ?? []) {
    await db.update(products).set({
      stock_current: sql`${products.stock_current} + ${item.quantity}`,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))
  }

  await db.update(exits).set({
    status:     'cancelled',
    updated_at: sql`(datetime('now'))`,
  }).where(eq(exits.id, id))

  return { ok: true }
}
