import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { audit_log, purchase_entries } from '@/lib/db/schema'
import { eq, desc, gte, lte, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date_from = searchParams.get('date_from') ?? undefined
  const date_to   = searchParams.get('date_to')   ?? undefined

  const conditions = [eq(audit_log.entity_type, 'purchase_entry')]
  if (date_from) conditions.push(gte(audit_log.created_at, date_from))
  if (date_to)   conditions.push(lte(audit_log.created_at, date_to + 'T23:59:59'))

  const rows = await db
    .select({
      id:             audit_log.id,
      entity_type:    audit_log.entity_type,
      entity_id:      audit_log.entity_id,
      action:         audit_log.action,
      user_id:        audit_log.user_id,
      user_name:      audit_log.user_name,
      changes:        audit_log.changes,
      created_at:     audit_log.created_at,
      invoice_number: purchase_entries.invoice_number,
      entry_date:     purchase_entries.date,
      supplier_name:  purchase_entries.supplier_name,
    })
    .from(audit_log)
    .leftJoin(purchase_entries, eq(audit_log.entity_id, purchase_entries.id))
    .where(and(...conditions))
    .orderBy(desc(audit_log.created_at))

  return NextResponse.json(rows)
}
