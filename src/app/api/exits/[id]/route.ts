import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getExit } from '@/lib/services/exitService'
import { db } from '@/lib/db'
import { exits } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role === 'entradas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const exit = await getExit(Number(params.id))
  if (!exit) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  return NextResponse.json(exit)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await db.update(exits)
    .set({ status: 'cancelled' })
    .where(eq(exits.id, Number(params.id)))
  return NextResponse.json({ ok: true })
}
