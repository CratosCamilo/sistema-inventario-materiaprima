import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

function createDatabase() {
  const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db'
  const authToken = process.env.TURSO_AUTH_TOKEN
  const client = createClient(authToken ? { url, authToken } : { url })
  return drizzle(client, { schema })
}

// Singleton: reutilizar la misma conexión entre hot-reloads en dev
const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDatabase> }
export const db = globalForDb.db ?? createDatabase()
if (process.env.NODE_ENV !== 'production') globalForDb.db = db

export type DB = typeof db
