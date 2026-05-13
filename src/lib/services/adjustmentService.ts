import { db } from '@/lib/db'
import {
  stock_adjustments,
  adjustment_batches,
  products,
  inventory_movements,
} from '@/lib/db/schema'
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm'
import type { CreateAdjustmentBatchInput, ProductCategory } from '@/types'

// ── Batches ───────────────────────────────────────────────────────────────────

export async function listAdjustmentBatches(
  warehouseId: number,
  filters?: { date_from?: string; date_to?: string; category?: ProductCategory },
) {
  const conditions = [eq(adjustment_batches.warehouse_id, warehouseId)]
  if (filters?.date_from) conditions.push(gte(adjustment_batches.date, filters.date_from))
  if (filters?.date_to)   conditions.push(lte(adjustment_batches.date, filters.date_to))
  if (filters?.category)  conditions.push(eq(adjustment_batches.category, filters.category))

  const batches = await db.select().from(adjustment_batches)
    .where(and(...conditions))
    .orderBy(desc(adjustment_batches.date), desc(adjustment_batches.created_at))

  const withCounts = await Promise.all(batches.map(async batch => {
    const adjs = await db.select({ id: stock_adjustments.id })
      .from(stock_adjustments)
      .where(eq(stock_adjustments.batch_id, batch.id))
    return { ...batch, changed_count: adjs.length }
  }))

  return withCounts
}

export async function getAdjustmentBatch(id: number) {
  const [batch] = await db.select().from(adjustment_batches).where(eq(adjustment_batches.id, id))
  if (!batch) return null

  const adjs = await db
    .select({
      id:                stock_adjustments.id,
      warehouse_id:      stock_adjustments.warehouse_id,
      batch_id:          stock_adjustments.batch_id,
      date:              stock_adjustments.date,
      product_id:        stock_adjustments.product_id,
      product_name:      products.name,
      visual_unit:       products.visual_unit,
      base_unit:         products.base_unit,
      conversion_factor: products.conversion_factor,
      stock_system:      stock_adjustments.stock_system,
      stock_physical:  stock_adjustments.stock_physical,
      difference:      stock_adjustments.difference,
      reason:          stock_adjustments.reason,
      notes:           stock_adjustments.notes,
      responsible:     stock_adjustments.responsible,
      status:          stock_adjustments.status,
      created_by_id:   stock_adjustments.created_by_id,
      created_by_name: stock_adjustments.created_by_name,
      created_at:      stock_adjustments.created_at,
      updated_at:      stock_adjustments.updated_at,
    })
    .from(stock_adjustments)
    .leftJoin(products, eq(products.id, stock_adjustments.product_id))
    .where(eq(stock_adjustments.batch_id, id))
    .orderBy(products.name)

  return { ...batch, adjustments: adjs, changed_count: adjs.length }
}

export async function createAdjustmentBatch(
  warehouseId: number,
  input: CreateAdjustmentBatchInput,
  userId: number | null,
  userName: string | null,
) {
  if (!input.items?.length) throw new Error('El lote debe tener al menos un producto ajustado')

  const [batch] = await db.insert(adjustment_batches).values({
    warehouse_id:    warehouseId,
    date:            input.date,
    category:        input.category,
    notes:           input.notes           ?? null,
    responsible:     input.responsible     ?? null,
    created_by_id:   userId,
    created_by_name: userName,
  }).returning()

  for (const item of input.items) {
    const product = await db.select().from(products).where(eq(products.id, item.product_id)).then(r => r[0])
    if (!product || !product.active) continue

    const stockSystem   = product.stock_current
    const stockPhysical = item.stock_physical
    const difference    = stockPhysical - stockSystem

    if (difference === 0) continue

    const [adjustment] = await db.insert(stock_adjustments).values({
      warehouse_id:    warehouseId,
      batch_id:        batch.id,
      date:            input.date,
      product_id:      item.product_id,
      stock_system:    stockSystem,
      stock_physical:  stockPhysical,
      difference,
      notes:           input.notes       ?? null,
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    }).returning()

    await db.insert(inventory_movements).values({
      warehouse_id:    warehouseId,
      product_id:      item.product_id,
      type:            'adjustment',
      direction:       'adjustment',
      quantity:        Math.abs(difference),
      unit:            product.base_unit,
      date:            input.date,
      reference_type:  'stock_adjustment',
      reference_id:    adjustment.id,
      notes:           input.notes ? input.notes : 'Ajuste de inventario',
      responsible:     input.responsible ?? null,
      created_by_id:   userId,
      created_by_name: userName,
    })

    await db.update(products).set({
      stock_current: stockPhysical,
      updated_at:    sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))
  }

  return getAdjustmentBatch(batch.id)
}

// ── Legacy: listAdjustments (usado en reportes) ───────────────────────────────
export async function listAdjustments(
  warehouseId: number,
  filters?: { date_from?: string; date_to?: string },
) {
  const conditions = [eq(stock_adjustments.warehouse_id, warehouseId)]
  if (filters?.date_from) conditions.push(gte(stock_adjustments.date, filters.date_from))
  if (filters?.date_to)   conditions.push(lte(stock_adjustments.date, filters.date_to))

  return db
    .select({
      id:                stock_adjustments.id,
      warehouse_id:      stock_adjustments.warehouse_id,
      batch_id:          stock_adjustments.batch_id,
      date:              stock_adjustments.date,
      product_id:        stock_adjustments.product_id,
      product_name:      products.name,
      visual_unit:       products.visual_unit,
      base_unit:         products.base_unit,
      conversion_factor: products.conversion_factor,
      stock_system:      stock_adjustments.stock_system,
      stock_physical:  stock_adjustments.stock_physical,
      difference:      stock_adjustments.difference,
      reason:          stock_adjustments.reason,
      notes:           stock_adjustments.notes,
      responsible:     stock_adjustments.responsible,
      status:          stock_adjustments.status,
      created_by_id:   stock_adjustments.created_by_id,
      created_by_name: stock_adjustments.created_by_name,
      created_at:      stock_adjustments.created_at,
      updated_at:      stock_adjustments.updated_at,
    })
    .from(stock_adjustments)
    .leftJoin(products, eq(products.id, stock_adjustments.product_id))
    .where(and(...conditions))
    .orderBy(desc(stock_adjustments.date), desc(stock_adjustments.created_at))
}
