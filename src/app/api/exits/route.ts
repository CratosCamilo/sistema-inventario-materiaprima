import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listExits, createExit } from '@/lib/services/exitService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role === 'entradas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)
  const date_from   = searchParams.get('date_from') ?? undefined
  const date_to     = searchParams.get('date_to')   ?? undefined

  const data = await listExits(warehouseId, { date_from, date_to })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador', 'salidas'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)

  try {
    const body = await req.json()
    const exit = await createExit(warehouseId, body, session.userId, session.fullName)
    return NextResponse.json(exit, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
