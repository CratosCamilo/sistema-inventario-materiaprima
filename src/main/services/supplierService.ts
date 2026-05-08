import { getDb } from '../database/connection'

export function listSuppliers() {
  return getDb().prepare(`SELECT * FROM suppliers WHERE active = 1 ORDER BY name`).all()
}

export function createSupplier(input: { name: string; contact?: string; phone?: string; email?: string; notes?: string }) {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO suppliers (name, contact, phone, email, notes)
    VALUES (@name, @contact, @phone, @email, @notes)
  `).run({ name: input.name, contact: input.contact ?? null, phone: input.phone ?? null, email: input.email ?? null, notes: input.notes ?? null })
  return db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(result.lastInsertRowid)
}

export function updateSupplier(id: number, input: { name?: string; contact?: string; phone?: string; email?: string; notes?: string }) {
  const db = getDb()
  const current = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id) as Record<string, unknown>
  if (!current) throw new Error(`Proveedor ${id} no encontrado`)

  db.prepare(`
    UPDATE suppliers SET name = @name, contact = @contact, phone = @phone, email = @email, notes = @notes, updated_at = datetime('now','localtime')
    WHERE id = @id
  `).run({
    id,
    name:    input.name    ?? current.name,
    contact: input.contact ?? current.contact,
    phone:   input.phone   ?? current.phone,
    email:   input.email   ?? current.email,
    notes:   input.notes   ?? current.notes,
  })
  return db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(id)
}
