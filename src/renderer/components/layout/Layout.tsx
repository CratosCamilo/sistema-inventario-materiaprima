import React from 'react'
import { Sidebar } from './Sidebar'
import styles from './Layout.module.css'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  )
}
