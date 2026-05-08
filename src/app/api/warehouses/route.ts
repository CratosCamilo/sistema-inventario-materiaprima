import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { warehouses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const data = await db.select().from(warehouses).where(eq(warehouses.active, true))
  return NextResponse.json(data)
}
