import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { setInitialStock } from '@/lib/services/productService'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)

  const { items } = await req.json()
  if (!Array.isArray(items) || !items.length) {
    return NextResponse.json({ error: 'items requerido' }, { status: 400 })
  }

  try {
    await setInitialStock(warehouseId, items, session.userId, session.fullName)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
