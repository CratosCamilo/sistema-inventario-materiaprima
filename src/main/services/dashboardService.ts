import { getDb } from '../database/connection'

export function getDashboardSummary() {
  const db = getDb()

  const totalProducts  = (db.prepare(`SELECT COUNT(*) as n FROM products WHERE active = 1`).get() as { n: number }).n
  const lowStockCount  = (db.prepare(`SELECT COUNT(*) as n FROM products WHERE active = 1 AND stock_current <= stock_minimum AND stock_current > stock_minimum * 0.5`).get() as { n: number }).n
  const criticalCount  = (db.prepare(`SELECT COUNT(*) as n FROM products WHERE active = 1 AND stock_current <= stock_minimum * 0.5`).get() as { n: number }).n

  const alerts = db.prepare(`
    SELECT *,
      CASE
        WHEN stock_current <= stock_minimum * 0.5 THEN 'critical'
        WHEN stock_current <= stock_minimum        THEN 'low'
        ELSE 'normal'
      END as stock_status
    FROM products
    WHERE active = 1 AND stock_current <= stock_minimum
    ORDER BY stock_current / NULLIF(stock_minimum, 0) ASC
    LIMIT 10
  `).all()

  const recentEntries = db.prepare(`
    SELECT * FROM purchase_entries WHERE status = 'active' ORDER BY date DESC, created_at DESC LIMIT 5
  `).all()

  const recentExits = db.prepare(`
    SELECT * FROM exits WHERE status = 'active' ORDER BY date DESC, created_at DESC LIMIT 5
  `).all()

  return {
    total_products:    totalProducts,
    active_products:   totalProducts,
    low_stock_count:   lowStockCount,
    critical_stock_count: criticalCount,
    recent_entries:    recentEntries,
    recent_exits:      recentExits,
    alerts,
  }
}
