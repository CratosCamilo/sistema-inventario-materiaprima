import { db } from '@/lib/db'
import {
  products,
  purchase_entries,
  exits,
  inventory_movements,
} from '@/lib/db/schema'
import { eq, and, gte, sql, count } from 'drizzle-orm'

export async function getDashboardSummary(warehouseId: number) {
  const today      = new Date().toISOString().slice(0, 10)
  const monthStart = today.slice(0, 7) + '-01'

  const [stockStats] = await db
    .select({
      total:    count(),
      low:      sql<number>`sum(case when ${products.stock_current} <= ${products.stock_minimum} and ${products.stock_current} > ${products.stock_minimum} * 0.5 then 1 else 0 end)`,
      critical: sql<number>`sum(case when ${products.stock_current} <= ${products.stock_minimum} * 0.5 then 1 else 0 end)`,
      normal:   sql<number>`sum(case when ${products.stock_current} > ${products.stock_minimum} then 1 else 0 end)`,
    })
    .from(products)
    .where(and(eq(products.warehouse_id, warehouseId), eq(products.active, true)))

  const [entriesThisMonth] = await db
    .select({ count: count() })
    .from(purchase_entries)
    .where(and(
      eq(purchase_entries.warehouse_id, warehouseId),
      gte(purchase_entries.date, monthStart),
      eq(purchase_entries.status, 'active'),
    ))

  const [exitsThisMonth] = await db
    .select({ count: count() })
    .from(exits)
    .where(and(
      eq(exits.warehouse_id, warehouseId),
      gte(exits.date, monthStart),
      eq(exits.status, 'active'),
    ))

  const recentMovements = await db
    .select({
      id:           inventory_movements.id,
      product_id:   inventory_movements.product_id,
      product_name: products.name,
      type:         inventory_movements.type,
      direction:    inventory_movements.direction,
      quantity:     inventory_movements.quantity,
      unit:         inventory_movements.unit,
      date:         inventory_movements.date,
    })
    .from(inventory_movements)
    .leftJoin(products, eq(products.id, inventory_movements.product_id))
    .where(eq(inventory_movements.warehouse_id, warehouseId))
    .orderBy(sql`${inventory_movements.date} desc, ${inventory_movements.created_at} desc`)
    .limit(10)

  const alertProducts = await db
    .select()
    .from(products)
    .where(and(
      eq(products.warehouse_id, warehouseId),
      eq(products.active, true),
      sql`${products.stock_current} <= ${products.stock_minimum}`,
    ))
    .orderBy(sql`${products.stock_current} / nullif(${products.stock_minimum}, 0) asc`)

  return {
    stock: {
      total:    stockStats?.total    ?? 0,
      normal:   stockStats?.normal   ?? 0,
      low:      stockStats?.low      ?? 0,
      critical: stockStats?.critical ?? 0,
    },
    entries_this_month: entriesThisMonth?.count ?? 0,
    exits_this_month:   exitsThisMonth?.count   ?? 0,
    recent_movements:   recentMovements,
    alert_products:     alertProducts,
  }
}
