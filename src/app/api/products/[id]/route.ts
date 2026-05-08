import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getProduct, updateProduct, deactivateProduct } from '@/lib/services/productService'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const product = await getProduct(Number(params.id))
  if (!product) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json()
  const product = await updateProduct(Number(params.id), body)
  return NextResponse.json(product)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['admin', 'operador'].includes(session.role)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  await deactivateProduct(Number(params.id))
  return NextResponse.json({ ok: true })
}
