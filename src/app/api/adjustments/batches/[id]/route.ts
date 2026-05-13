import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAdjustmentBatch } from '@/lib/services/adjustmentService'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const batch = await getAdjustmentBatch(Number(params.id))
  if (!batch) return NextResponse.json({ error: 'Lote no encontrado' }, { status: 404 })
  return NextResponse.json(batch)
}
