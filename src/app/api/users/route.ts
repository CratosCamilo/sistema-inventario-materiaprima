import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listUsers, createUser } from '@/lib/services/userService'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const data = await listUsers()
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  try {
    const body = await req.json()
    const user = await createUser(body)
    return NextResponse.json(user, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
