import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listMovements } from '@/lib/services/movementService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const warehouseId  = Number(searchParams.get('warehouse_id') ?? 1)
  const product_id   = searchParams.get('product_id') ? Number(searchParams.get('product_id')) : undefined
  const type         = searchParams.get('type')       ?? undefined
  const date_from    = searchParams.get('date_from')  ?? undefined
  const date_to      = searchParams.get('date_to')    ?? undefined

  const data = await listMovements(warehouseId, { product_id, type, date_from, date_to })
  return NextResponse.json(data)
}
