import { db } from './index'
import { users, warehouses, products, settings } from './schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function runSeed() {
  // Idempotente: solo corre si no hay usuarios
  const existing = await db.select().from(users).limit(1)
  if (existing.length > 0) return { skipped: true }

  // ── Bodegas ───────────────────────────────────────────────────────────────
  const [panaderia] = await db.insert(warehouses).values([
    { name: 'Panadería',  slug: 'panaderia'  },
    { name: 'Pastelería', slug: 'pasteleria' },
  ]).returning()

  const [, pasteleria] = await db.select().from(warehouses)

  // ── Usuario admin ─────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('Admin123!', 10)
  await db.insert(users).values({
    username:      'admin',
    full_name:     'Administrador',
    password_hash: hash,
    role:          'admin',
  })

  // ── Settings ──────────────────────────────────────────────────────────────
  await db.insert(settings).values([
    { key: 'company_name',       value: 'Panadería La Esperanza' },
    { key: 'iva_rate_default',   value: '19' },
    { key: 'entry_mode_default', value: 'total_only' },
  ])

  // ── Productos Panadería ───────────────────────────────────────────────────
  const productosP: typeof products.$inferInsert[] = [
    // Produccion
    { warehouse_id: panaderia.id, name: 'Harina de trigo 000', category: 'Produccion', base_unit: 'kg', visual_unit: 'bulto', conversion_factor: 50, stock_minimum: 3, notes: '1 bulto = 50 kg' },
    { warehouse_id: panaderia.id, name: 'Azúcar blanca',        category: 'Produccion', base_unit: 'kg', visual_unit: 'bulto', conversion_factor: 50, stock_minimum: 2 },
    { warehouse_id: panaderia.id, name: 'Mantequilla 500g',     category: 'Produccion', base_unit: 'unidad', visual_unit: 'caja',  conversion_factor: 24, unit_exit_default: 'base', stock_minimum: 2, notes: '1 caja = 24 un' },
    { warehouse_id: panaderia.id, name: 'Mantequilla 1000g',    category: 'Produccion', base_unit: 'unidad', visual_unit: 'caja',  conversion_factor: 12, unit_exit_default: 'base', stock_minimum: 2, notes: '1 caja = 12 un' },
    { warehouse_id: panaderia.id, name: 'Queso doble crema',    category: 'Produccion', base_unit: 'kg',    visual_unit: 'kg',    conversion_factor: 1,  stock_minimum: 5 },
    { warehouse_id: panaderia.id, name: 'Jamón',                category: 'Produccion', base_unit: 'kg',    visual_unit: 'kg',    conversion_factor: 1,  stock_minimum: 3 },
    { warehouse_id: panaderia.id, name: 'Huevos',               category: 'Produccion', base_unit: 'unidad', visual_unit: 'cartón', conversion_factor: 30, unit_exit_default: 'base', stock_minimum: 5, notes: '1 cartón = 30 un' },
    { warehouse_id: panaderia.id, name: 'Levadura en polvo',    category: 'Produccion', base_unit: 'kg',    visual_unit: 'kg',    conversion_factor: 1,  stock_minimum: 1 },
    { warehouse_id: panaderia.id, name: 'Sal',                  category: 'Produccion', base_unit: 'kg',    visual_unit: 'kg',    conversion_factor: 1,  stock_minimum: 2 },
    // Empaques
    { warehouse_id: panaderia.id, name: 'Plástico para empaque', category: 'Empaques', base_unit: 'kg', visual_unit: 'kg', conversion_factor: 1, stock_minimum: 3, weight_based: true },
    { warehouse_id: panaderia.id, name: 'Bolsas pequeñas',       category: 'Empaques', base_unit: 'unidad', visual_unit: 'paquete', conversion_factor: 100, unit_exit_default: 'base', stock_minimum: 5, notes: '1 paquete = 100 un' },
  ]

  await db.insert(products).values(productosP)

  // ── Productos Pastelería ──────────────────────────────────────────────────
  const pastelId = pasteleria.id
  const productosPs: typeof products.$inferInsert[] = [
    // Produccion
    { warehouse_id: pastelId, name: 'Harina de trigo 0000', category: 'Produccion', base_unit: 'kg',    visual_unit: 'bulto', conversion_factor: 50, stock_minimum: 2, notes: '1 bulto = 50 kg' },
    { warehouse_id: pastelId, name: 'Azúcar glass',          category: 'Produccion', base_unit: 'kg',    visual_unit: 'kg',    conversion_factor: 1,  stock_minimum: 3 },
    { warehouse_id: pastelId, name: 'Crema de leche',        category: 'Produccion', base_unit: 'litros', visual_unit: 'litros', conversion_factor: 1, stock_minimum: 5 },
    { warehouse_id: pastelId, name: 'Chocolate cobertura',   category: 'Produccion', base_unit: 'kg',    visual_unit: 'kg',    conversion_factor: 1,  stock_minimum: 3 },
    { warehouse_id: pastelId, name: 'Huevos pastelería',     category: 'Produccion', base_unit: 'unidad', visual_unit: 'cartón', conversion_factor: 30, stock_minimum: 4 },
    // Empaques
    { warehouse_id: pastelId, name: 'Cajas de pastelería',   category: 'Empaques', base_unit: 'unidad', visual_unit: 'paquete', conversion_factor: 25, stock_minimum: 4 },
    { warehouse_id: pastelId, name: 'Cintas decorativas',    category: 'Empaques', base_unit: 'unidad', visual_unit: 'rollo',   conversion_factor: 1,  stock_minimum: 2 },
  ]

  await db.insert(products).values(productosPs)

  return { skipped: false, message: 'Seed completado. Usuario: admin / Admin123!' }
}
