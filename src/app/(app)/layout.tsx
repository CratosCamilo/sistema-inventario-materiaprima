import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { warehouses } from '@/lib/db/schema'
import { AppProviders } from '@/components/layout/AppProviders'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  // TypeScript cast: redirect() throws, so session is non-null below
  const validSession = session!

  const allWarehouses = await db.select().from(warehouses).where(eq(warehouses.active, true))
  const cookieStore = cookies()
  const warehouseIdCookie = cookieStore.get('warehouse_id')?.value
  const currentWarehouseId = warehouseIdCookie
    ? Number(warehouseIdCookie)
    : (allWarehouses[0]?.id ?? 1)

  return (
    <AppProviders
      session={validSession}
      warehouses={allWarehouses}
      initialWarehouseId={currentWarehouseId}
    >
      {children}
    </AppProviders>
  )
}
