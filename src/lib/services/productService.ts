import { db } from '@/lib/db'
import { products, inventory_movements } from '@/lib/db/schema'
import { eq, and, asc, sql } from 'drizzle-orm'
import type { CreateProductInput, UpdateProductInput } from '@/types'

export async function listProducts(warehouseId: number, includeInactive = false) {
  const conditions = [eq(products.warehouse_id, warehouseId)]
  if (!includeInactive) conditions.push(eq(products.active, true))

  return db.select().from(products)
    .where(and(...conditions))
    .orderBy(asc(products.category), asc(products.name))
}

export async function getProduct(id: number) {
  const [row] = await db.select().from(products).where(eq(products.id, id))
  return row ?? null
}

export async function createProduct(warehouseId: number, input: CreateProductInput) {
  const [row] = await db.insert(products).values({
    warehouse_id:      warehouseId,
    name:              input.name,
    category:          input.category,
    base_unit:         input.base_unit,
    visual_unit:       input.visual_unit,
    conversion_factor:  input.conversion_factor  ?? 1,
    unit_entry_default: input.unit_entry_default ?? 'visual',
    unit_exit_default:  input.unit_exit_default  ?? 'visual',
    stock_minimum:      input.stock_minimum,
    weight_based:       input.weight_based ?? false,
    notes:             input.notes ?? null,
  }).returning()
  return row
}

export async function updateProduct(id: number, input: UpdateProductInput) {
  const current = await getProduct(id)
  if (!current) throw new Error(`Producto ${id} no encontrado`)

  await db.update(products).set({
    name:              input.name              ?? current.name,
    category:          input.category          ?? current.category,
    base_unit:         input.base_unit         ?? current.base_unit,
    visual_unit:       input.visual_unit       ?? current.visual_unit,
    conversion_factor:  input.conversion_factor  ?? current.conversion_factor,
    unit_entry_default: input.unit_entry_default ?? current.unit_entry_default,
    unit_exit_default:  input.unit_exit_default  ?? current.unit_exit_default,
    stock_minimum:      input.stock_minimum      ?? current.stock_minimum,
    weight_based:      input.weight_based      !== undefined ? input.weight_based : current.weight_based,
    notes:             input.notes             !== undefined ? input.notes ?? null : current.notes,
    active:            input.active            !== undefined ? input.active : current.active,
    updated_at:        sql`(datetime('now'))`,
  }).where(eq(products.id, id))

  return getProduct(id)
}

export async function deactivateProduct(id: number) {
  await db.update(products).set({ active: false, updated_at: sql`(datetime('now'))` }).where(eq(products.id, id))
}

export async function setInitialStock(
  warehouseId: number,
  items: { product_id: number; quantity: number; notes?: string }[],
  userId: number | null,
  userName: string | null,
) {
  const today = new Date().toISOString().slice(0, 10)

  for (const item of items) {
    const product = await getProduct(item.product_id)
    if (!product) throw new Error(`Producto ${item.product_id} no encontrado`)
    if (product.initial_stock_loaded) {
      throw new Error(`"${product.name}" ya tiene inventario inicial. Use Ajustes para corregir.`)
    }

    // quantity ingresada en unidades visuales → convertir a base
    const factor   = product.conversion_factor ?? 1
    const qty_base = factor > 1 ? item.quantity * factor : item.quantity

    await db.update(products).set({
      stock_current:        qty_base,
      initial_stock_loaded: true,
      updated_at:           sql`(datetime('now'))`,
    }).where(eq(products.id, item.product_id))

    await db.insert(inventory_movements).values({
      warehouse_id:    warehouseId,
      product_id:      item.product_id,
      type:            'initial',
      direction:       'in',
      quantity:        qty_base,
      unit:            product.base_unit,
      date:            today,
      reference_type:  'initial',
      reference_id:    item.product_id,
      notes:           item.notes ?? 'Inventario inicial',
      responsible:     userName,
      created_by_id:   userId,
      created_by_name: userName,
    })
  }
}
