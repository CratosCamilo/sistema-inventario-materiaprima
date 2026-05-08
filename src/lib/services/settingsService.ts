import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key))
  return row?.value ?? null
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settings)
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updated_at: sql`(datetime('now'))` },
    })
}

export async function setSettings(pairs: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(pairs)) {
    await setSetting(key, value)
  }
}
