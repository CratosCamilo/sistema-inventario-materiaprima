import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listAdjustmentBatches, createAdjustmentBatch } from '@/lib/services/adjustmentService'
import type { ProductCategory } from '@/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)
  const date_from   = searchParams.get('date_from') ?? undefined
  const date_to     = searchParams.get('date_to')   ?? undefined
  const category    = searchParams.get('category')  as ProductCategory | null ?? undefined

  const data = await listAdjustmentBatches(warehouseId, { date_from, date_to, category })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)

  try {
    const body  = await req.json()
    const batch = await createAdjustmentBatch(warehouseId, body, session.userId, session.fullName)
    return NextResponse.json(batch, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
