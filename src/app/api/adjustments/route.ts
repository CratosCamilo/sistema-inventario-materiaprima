import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listAdjustments } from '@/lib/services/adjustmentService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)
  const date_from   = searchParams.get('date_from') ?? undefined
  const date_to     = searchParams.get('date_to')   ?? undefined

  const data = await listAdjustments(warehouseId, { date_from, date_to })
  return NextResponse.json(data)
}
