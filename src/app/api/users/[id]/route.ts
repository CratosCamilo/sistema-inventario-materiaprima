import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUser, updateUser } from '@/lib/services/userService'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const user = await getUser(Number(params.id))
  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  try {
    const body = await req.json()
    const user = await updateUser(Number(params.id), body)
    return NextResponse.json(user)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
