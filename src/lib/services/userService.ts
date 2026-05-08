import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@/types'

export async function listUsers() {
  return db.select({
    id:         users.id,
    username:   users.username,
    full_name:  users.full_name,
    role:       users.role,
    active:     users.active,
    created_at: users.created_at,
    updated_at: users.updated_at,
  }).from(users).orderBy(users.full_name)
}

export async function getUser(id: number) {
  const [row] = await db.select({
    id:         users.id,
    username:   users.username,
    full_name:  users.full_name,
    role:       users.role,
    active:     users.active,
    created_at: users.created_at,
    updated_at: users.updated_at,
  }).from(users).where(eq(users.id, id))
  return row ?? null
}

export async function getUserByUsername(username: string) {
  const [row] = await db.select().from(users).where(eq(users.username, username))
  return row ?? null
}

export async function createUser(input: {
  username:  string
  full_name: string
  password:  string
  role:      UserRole
}) {
  const existing = await getUserByUsername(input.username)
  if (existing) throw new Error(`El usuario "${input.username}" ya existe`)

  const password_hash = await bcrypt.hash(input.password, 10)
  const [row] = await db.insert(users).values({
    username:      input.username,
    full_name:     input.full_name,
    password_hash,
    role:          input.role,
  }).returning({
    id:         users.id,
    username:   users.username,
    full_name:  users.full_name,
    role:       users.role,
    active:     users.active,
    created_at: users.created_at,
  })
  return row
}

export async function updateUser(id: number, input: {
  full_name?: string
  role?:      UserRole
  active?:    boolean
  password?:  string
}) {
  const current = await getUser(id)
  if (!current) throw new Error(`Usuario ${id} no encontrado`)

  const patch: Record<string, unknown> = { updated_at: sql`(datetime('now'))` }
  if (input.full_name !== undefined) patch.full_name = input.full_name
  if (input.role      !== undefined) patch.role      = input.role
  if (input.active    !== undefined) patch.active    = input.active
  if (input.password) patch.password_hash = await bcrypt.hash(input.password, 10)

  await db.update(users).set(patch).where(eq(users.id, id))
  return getUser(id)
}

export async function verifyPassword(username: string, password: string) {
  const user = await getUserByUsername(username)
  if (!user || !user.active) return null
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return null
  return {
    id:        user.id,
    username:  user.username,
    full_name: user.full_name,
    role:      user.role,
  }
}
