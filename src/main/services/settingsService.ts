import { getDb } from '../database/connection'

export function getSetting(key: string): string | null {
  const row = getDb().prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (@key, @value, datetime('now','localtime'))
    ON CONFLICT(key) DO UPDATE SET value = @value, updated_at = datetime('now','localtime')
  `).run({ key, value })
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}
