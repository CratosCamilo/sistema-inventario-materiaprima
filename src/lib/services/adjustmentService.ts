import { db } from '@/lib/db'
import {
  stock_adjustments,
  products,
  inventory_movements,
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import type { CreateAdjustmentInput } from '@/types'

export async function listAdjustments(warehouseId: number, filters?: { date_from?: string; date_to?: string }) {
  const conditions = [eq(stock_adjustments.warehouse_id, warehouseId)]
  if (filters?.date_from) conditions.push(gte(stock_adjustments.date, filters.date_from))
  if (filters?.date_to)   conditions.push(lte(stock_adjustments.date, filters.date_to))

  const rows = await db
    .select({
      id:              stock_adjustments.id,
      warehouse_id:    stock_adjustments.warehouse_id,
      date:            stock_adjustments.date,
      product_id:      stock_adjustments.product_id,
      product_name:    products.name,
      stock_system:    stock_adjustments.stock_system,
      stock_physical:  stock_adjustments.stock_physical,
      difference:      stock_adjustments.difference,
      reason:          stock_adjustments.reason,
      notes:           stock_adjustments.notes,
      responsible:     stock_adjustments.responsible,
      status:          stock_adjustments.status,
      created_by_id:   stock_adjustments.created_by_id,
      created_by_name: stock_adjustments.created_by_name,
      created_at:      stock_adjustments.created_at,
    })
    .from(stock_adjustments)
    .leftJoin(products, eq(products.id, stock_adjustments.product_id))
    .where(and(...conditions))
    .orderBy(desc(stock_adjustments.date), desc(stock_adjustments.created_at))

  return rows
}

export async function createAdjustment(
  warehouseId: number,
  input: CreateAdjustmentInput,
  userId: number | null,
  userName: string | null,
) {
  const product = await db.select().from(products).where(eq(products.id, input.product_id)).then(r => r[0])
  if (!product || !product.active) throw new Error(`Producto ${input.product_id} no encontrado o inactivo`)

  const stockSystem   = product.stock_current
  const stockPhysical = input.stock_physical
  const difference    = stockPhysical - stockSystem

  const [adjustment] = await db.insert(stock_adjustments).values({
    warehouse_id:    warehouseId,
    date:            input.date,
    product_id:      input.product_id,
    stock_system:    stockSystem,
    stock_physical:  stockPhysical,
    difference,
    reason:          input.reason          ?? null,
    notes:           input.notes           ?? null,
    responsible:     input.responsible     ?? null,
    created_by_id:   userId,
    created_by_name: userName,
  }).returning()

  await db.insert(inventory_movements).values({
    warehouse_id:    warehouseId,
    product_id:      input.product_id,
    type:            'adjustment',
    direction:       'adjustment',
    quantity:        Math.abs(difference),
    unit:            product.visual_unit,
    date:            input.date,
    reference_type:  'stock_adjustment',
    reference_id:    adjustment.id,
    notes:           input.reason ?? input.notes ?? 'Ajuste de inventario',
    responsible:     input.responsible ?? null,
    created_by_id:   userId,
    created_by_name: userName,
  })

  await db.update(products).set({
    stock_current: stockPhysical,
    updated_at:    sql`(datetime('now'))`,
  }).where(eq(products.id, input.product_id))

  return adjustment
}
