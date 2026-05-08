'use client'
import React from 'react'
import { WarehouseProvider } from '@/lib/warehouse-context'
import { SessionProvider } from '@/lib/session-context'
import { Sidebar } from './Sidebar'
import styles from './Layout.module.css'
import type { SessionPayload } from '@/lib/auth/session'
import type { Warehouse } from '@/types'

interface Props {
  children: React.ReactNode
  session: SessionPayload
  warehouses: Warehouse[]
  initialWarehouseId: number
}

export function AppProviders({ children, session, warehouses, initialWarehouseId }: Props) {
  return (
    <SessionProvider session={session}>
      <WarehouseProvider warehouses={warehouses} initialWarehouseId={initialWarehouseId}>
        <div className={styles.shell}>
          <Sidebar />
          <main className={styles.main}>
            <div className={styles.content}>
              {children}
            </div>
          </main>
        </div>
      </WarehouseProvider>
    </SessionProvider>
  )
}
