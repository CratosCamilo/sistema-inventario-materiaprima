import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listProducts, createProduct } from '@/lib/services/productService'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const warehouseId    = Number(searchParams.get('warehouse_id') ?? 1)
  const includeInactive = searchParams.get('include_inactive') === 'true'

  const data = await listProducts(warehouseId, includeInactive)
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const warehouseId = Number(searchParams.get('warehouse_id') ?? 1)

  const body = await req.json()
  const product = await createProduct(warehouseId, body)
  return NextResponse.json(product, { status: 201 })
}
