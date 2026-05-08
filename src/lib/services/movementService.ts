import { db } from '@/lib/db'
import { inventory_movements, products } from '@/lib/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

export async function listMovements(
  warehouseId: number,
  filters?: {
    product_id?: number
    type?: string
    date_from?: string
    date_to?: string
  },
) {
  const conditions = [eq(inventory_movements.warehouse_id, warehouseId)]
  if (filters?.product_id) conditions.push(eq(inventory_movements.product_id, filters.product_id))
  if (filters?.type)       conditions.push(eq(inventory_movements.type, filters.type as 'initial' | 'entry' | 'exit' | 'adjustment'))
  if (filters?.date_from)  conditions.push(gte(inventory_movements.date, filters.date_from))
  if (filters?.date_to)    conditions.push(lte(inventory_movements.date, filters.date_to))

  return db
    .select({
      id:              inventory_movements.id,
      warehouse_id:    inventory_movements.warehouse_id,
      product_id:      inventory_movements.product_id,
      product_name:    products.name,
      type:            inventory_movements.type,
      direction:       inventory_movements.direction,
      quantity:        inventory_movements.quantity,
      unit:            inventory_movements.unit,
      date:            inventory_movements.date,
      reference_type:  inventory_movements.reference_type,
      reference_id:    inventory_movements.reference_id,
      notes:           inventory_movements.notes,
      responsible:     inventory_movements.responsible,
      created_by_name: inventory_movements.created_by_name,
      created_at:      inventory_movements.created_at,
    })
    .from(inventory_movements)
    .leftJoin(products, eq(products.id, inventory_movements.product_id))
    .where(and(...conditions))
    .orderBy(desc(inventory_movements.date), desc(inventory_movements.created_at))
}
