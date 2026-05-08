'use client'
import React, { useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider session={session}>
      <WarehouseProvider warehouses={warehouses} initialWarehouseId={initialWarehouseId}>
        <div className={styles.shell}>
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {sidebarOpen && (
            <div
              className={styles.backdrop}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <main className={styles.main}>
            <div className={styles.topbar}>
              <button
                className={styles.hamburger}
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
              >
                ☰
              </button>
              <span className={styles.topbarTitle}>Inventario MP</span>
            </div>
            <div className={styles.content}>
              {children}
            </div>
          </main>
        </div>
      </WarehouseProvider>
    </SessionProvider>
  )
}
