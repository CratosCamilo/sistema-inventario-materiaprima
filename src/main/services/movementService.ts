import { getDb } from '../database/connection'

export function listMovementsByProduct(productId: number) {
  return getDb().prepare(`
    SELECT m.*, p.name as product_name
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    WHERE m.product_id = ?
    ORDER BY m.date DESC, m.created_at DESC
  `).all(productId)
}

export function listRecentMovements(limit = 20) {
  return getDb().prepare(`
    SELECT m.*, p.name as product_name
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    ORDER BY m.date DESC, m.created_at DESC
    LIMIT ?
  `).all(limit)
}
