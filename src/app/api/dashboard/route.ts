import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDashboardSummary } from '@/lib/services/dashboardService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)

  const data = await getDashboardSummary(warehouseId)
  return NextResponse.json(data)
}
