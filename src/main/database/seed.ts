import { getDb } from './connection'

export function runSeed(): void {
  const db = getDb()

  const alreadySeeded = db.prepare(`SELECT COUNT(*) as n FROM products`).get() as { n: number }
  if (alreadySeeded.n > 0) return

  const today = new Date().toISOString().slice(0, 10)

  // ── Productos demo ──────────────────────────────────────────────────────────
  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, base_unit, visual_unit, conversion_factor, stock_minimum, stock_current, initial_stock_loaded, notes)
    VALUES (@name, @category, @base_unit, @visual_unit, @conversion_factor, @stock_minimum, @stock_current, 1, @notes)
  `)

  const products = [
    { name: 'Harina de trigo',     category: 'Harinas',      base_unit: 'kg',       visual_unit: 'bulto',   conversion_factor: 50,  stock_minimum: 5,  stock_current: 18, notes: '1 bulto = 50 kg' },
    { name: 'Azúcar',              category: 'Endulzantes',  base_unit: 'kg',       visual_unit: 'bulto',   conversion_factor: 50,  stock_minimum: 3,  stock_current: 4,  notes: '1 bulto = 50 kg' },
    { name: 'Mantequilla 500 g',   category: 'Lácteos',      base_unit: 'unidad',   visual_unit: 'caja',    conversion_factor: 24,  stock_minimum: 2,  stock_current: 5,  notes: '1 caja = 24 unidades' },
    { name: 'Mantequilla 1000 g',  category: 'Lácteos',      base_unit: 'unidad',   visual_unit: 'caja',    conversion_factor: 12,  stock_minimum: 2,  stock_current: 1,  notes: '1 caja = 12 unidades' },
    { name: 'Queso',               category: 'Lácteos',      base_unit: 'kg',       visual_unit: 'kg',      conversion_factor: 1,   stock_minimum: 10, stock_current: 22, notes: null },
    { name: 'Jamón',               category: 'Embutidos',    base_unit: 'kg',       visual_unit: 'kg',      conversion_factor: 1,   stock_minimum: 8,  stock_current: 3,  notes: null },
    { name: 'Huevos',              category: 'Huevos',       base_unit: 'unidad',   visual_unit: 'cartón',  conversion_factor: 30,  stock_minimum: 3,  stock_current: 7,  notes: '1 cartón = 30 unidades' },
    { name: 'Plástico para empaque', category: 'Empaques',   base_unit: 'kg',       visual_unit: 'rollo',   conversion_factor: 5,   stock_minimum: 4,  stock_current: 2,  notes: '1 rollo ≈ 5 kg' },
    { name: 'Bolsas pequeñas',     category: 'Empaques',     base_unit: 'unidad',   visual_unit: 'paquete', conversion_factor: 100, stock_minimum: 10, stock_current: 14, notes: '1 paquete = 100 unidades' },
  ]

  const insertMovement = db.prepare(`
    INSERT INTO inventory_movements (product_id, type, direction, quantity, unit, date, reference_type, reference_id, notes, responsible)
    VALUES (@product_id, @type, @direction, @quantity, @unit, @date, @reference_type, @reference_id, @notes, @responsible)
  `)

  const insertEntry = db.prepare(`
    INSERT INTO purchase_entries (date, invoice_number, supplier_name, responsible, notes, status)
    VALUES (@date, @invoice_number, @supplier_name, @responsible, @notes, 'active')
  `)

  const insertEntryItem = db.prepare(`
    INSERT INTO purchase_entry_items (entry_id, product_id, quantity, unit)
    VALUES (@entry_id, @product_id, @quantity, @unit)
  `)

  const insertExit = db.prepare(`
    INSERT INTO exits (date, destination, responsible, notes, status)
    VALUES (@date, @destination, @responsible, @notes, 'active')
  `)

  const insertExitItem = db.prepare(`
    INSERT INTO exit_items (exit_id, product_id, quantity, unit)
    VALUES (@exit_id, @product_id, @quantity, @unit)
  `)

  const seedAll = db.transaction(() => {
    // Insertar productos y movimientos de inventario inicial
    const productIds: number[] = []
    for (const p of products) {
      const result = insertProduct.run(p)
      const pid = result.lastInsertRowid as number
      productIds.push(pid)
      insertMovement.run({
        product_id: pid,
        type: 'initial',
        direction: 'in',
        quantity: p.stock_current,
        unit: p.visual_unit,
        date: today,
        reference_type: 'initial',
        reference_id: pid,
        notes: 'Inventario inicial cargado con datos demo',
        responsible: 'Sistema',
      })
    }

    // Entrada demo hace 3 días
    const entry1 = insertEntry.run({
      date: offsetDate(today, -3),
      invoice_number: 'FAC-2024-001',
      supplier_name: 'Distribuidora Granos S.A.',
      responsible: 'Ana Torres',
      notes: 'Pedido semanal de harinas y azúcar',
    })
    const eid1 = entry1.lastInsertRowid as number
    insertEntryItem.run({ entry_id: eid1, product_id: productIds[0], quantity: 10, unit: 'bulto' })
    insertEntryItem.run({ entry_id: eid1, product_id: productIds[1], quantity: 4,  unit: 'bulto' })
    insertMovement.run({ product_id: productIds[0], type: 'entry', direction: 'in', quantity: 10, unit: 'bulto', date: offsetDate(today, -3), reference_type: 'purchase_entry', reference_id: eid1, notes: 'FAC-2024-001', responsible: 'Ana Torres' })
    insertMovement.run({ product_id: productIds[1], type: 'entry', direction: 'in', quantity: 4,  unit: 'bulto', date: offsetDate(today, -3), reference_type: 'purchase_entry', reference_id: eid1, notes: 'FAC-2024-001', responsible: 'Ana Torres' })

    // Entrada demo hace 1 día
    const entry2 = insertEntry.run({
      date: offsetDate(today, -1),
      invoice_number: 'FAC-2024-002',
      supplier_name: 'Lácteos del Valle',
      responsible: 'Ana Torres',
      notes: 'Reposición de lácteos',
    })
    const eid2 = entry2.lastInsertRowid as number
    insertEntryItem.run({ entry_id: eid2, product_id: productIds[2], quantity: 3, unit: 'caja' })
    insertEntryItem.run({ entry_id: eid2, product_id: productIds[4], quantity: 8, unit: 'kg'   })
    insertMovement.run({ product_id: productIds[2], type: 'entry', direction: 'in', quantity: 3, unit: 'caja', date: offsetDate(today, -1), reference_type: 'purchase_entry', reference_id: eid2, notes: 'FAC-2024-002', responsible: 'Ana Torres' })
    insertMovement.run({ product_id: productIds[4], type: 'entry', direction: 'in', quantity: 8, unit: 'kg',   date: offsetDate(today, -1), reference_type: 'purchase_entry', reference_id: eid2, notes: 'FAC-2024-002', responsible: 'Ana Torres' })

    // Salida demo hace 2 días
    const exit1 = insertExit.run({
      date: offsetDate(today, -2),
      destination: 'produccion',
      responsible: 'Carlos Ruiz',
      notes: 'Producción del martes',
    })
    const xid1 = exit1.lastInsertRowid as number
    insertExitItem.run({ exit_id: xid1, product_id: productIds[0], quantity: 3, unit: 'bulto' })
    insertExitItem.run({ exit_id: xid1, product_id: productIds[1], quantity: 1, unit: 'bulto' })
    insertExitItem.run({ exit_id: xid1, product_id: productIds[6], quantity: 2, unit: 'cartón' })
    insertMovement.run({ product_id: productIds[0], type: 'exit', direction: 'out', quantity: 3, unit: 'bulto',  date: offsetDate(today, -2), reference_type: 'exit', reference_id: xid1, notes: 'Producción martes', responsible: 'Carlos Ruiz' })
    insertMovement.run({ product_id: productIds[1], type: 'exit', direction: 'out', quantity: 1, unit: 'bulto',  date: offsetDate(today, -2), reference_type: 'exit', reference_id: xid1, notes: 'Producción martes', responsible: 'Carlos Ruiz' })
    insertMovement.run({ product_id: productIds[6], type: 'exit', direction: 'out', quantity: 2, unit: 'cartón', date: offsetDate(today, -2), reference_type: 'exit', reference_id: xid1, notes: 'Producción martes', responsible: 'Carlos Ruiz' })

    // Salida demo ayer
    const exit2 = insertExit.run({
      date: offsetDate(today, -1),
      destination: 'empaque',
      responsible: 'María López',
      notes: 'Material de empaque del miércoles',
    })
    const xid2 = exit2.lastInsertRowid as number
    insertExitItem.run({ exit_id: xid2, product_id: productIds[7], quantity: 1, unit: 'rollo'   })
    insertExitItem.run({ exit_id: xid2, product_id: productIds[8], quantity: 3, unit: 'paquete' })
    insertMovement.run({ product_id: productIds[7], type: 'exit', direction: 'out', quantity: 1, unit: 'rollo',   date: offsetDate(today, -1), reference_type: 'exit', reference_id: xid2, notes: 'Empaque miércoles', responsible: 'María López' })
    insertMovement.run({ product_id: productIds[8], type: 'exit', direction: 'out', quantity: 3, unit: 'paquete', date: offsetDate(today, -1), reference_type: 'exit', reference_id: xid2, notes: 'Empaque miércoles', responsible: 'María López' })

    // Configuración inicial
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('company_name', 'Fábrica de Pan')
    db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run('app_version', '1.0.0')
  })

  seedAll()
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
