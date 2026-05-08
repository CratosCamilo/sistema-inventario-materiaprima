import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getEntry, editEntry } from '@/lib/services/entryService'
import { db } from '@/lib/db'
import { purchase_entries, audit_log } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role === 'salidas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const entry = await getEntry(Number(params.id))
  if (!entry) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const history = await db.select().from(audit_log)
    .where(eq(audit_log.entity_id, entry.id))
    .orderBy(audit_log.created_at)

  return NextResponse.json({ ...entry, history })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  try {
    const body  = await req.json()
    const entry = await editEntry(Number(params.id), body, session.userId, session.fullName)
    return NextResponse.json(entry)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await db.update(purchase_entries)
    .set({ status: 'cancelled' })
    .where(eq(purchase_entries.id, Number(params.id)))
  return NextResponse.json({ ok: true })
}
