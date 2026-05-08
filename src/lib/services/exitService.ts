import { db } from '@/lib/db'
import {
  exits,
  exit_items,
  products,
  inventory_movements,
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import type { CreateExitInput } from '@/types'

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
      id:           exit_items.id,
      exit_id:      exit_items.exit_id,
      product_id:   exit_items.product_id,
      product_name: products.name,
      quantity:     exit_items.quantity,
      unit:         exit_items.unit,
      notes:        exit_items.notes,
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

  // Validate stock before any writes
  for (const item of input.items) {
    const product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0])
    if (!product || !product.active) throw new Error(`Producto ${item.product_id} no encontrado o inactivo`)
    if (product.stock_current < item.quantity) {
      throw new Error(`Stock insuficiente para "${product.name}": disponible ${product.stock_current} ${product.visual_unit}, solicitado ${item.quantity}`)
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

    await db.insert(exit_items).values({
      exit_id:    exit.id,
      product_id: item.product_id,
      quantity:   item.quantity,
      unit:       item.unit,
      notes:      item.notes ?? null,
    })

    await db.insert(inventory_movements).values({
      warehouse_id:    warehouseId,
      product_id:      item.product_id,
      type:            'exit',
      direction:       'out',
      quantity:        item.quantity,
      unit:            item.unit,
      date:            input.date,
      reference_type:  'exit',
      reference_id:    exit.id,
      notes:           input.destination ? `Destino: ${input.destination}` : null,
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    })

    await db.update(products).set({
      stock_current: sql`${products.stock_current} - ${item.quantity}`,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))
  }

  return getExit(exit.id)
}
