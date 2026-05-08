import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listEntries, createEntry } from '@/lib/services/entryService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.role === 'salidas') return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)
  const date_from      = searchParams.get('date_from')      ?? undefined
  const date_to        = searchParams.get('date_to')        ?? undefined
  const invoice_number = searchParams.get('invoice_number') ?? undefined

  const data = await listEntries(warehouseId, { date_from, date_to, invoice_number })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador', 'entradas'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)

  try {
    const body  = await req.json()
    const entry = await createEntry(warehouseId, body, session.userId, session.fullName)
    return NextResponse.json(entry, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
