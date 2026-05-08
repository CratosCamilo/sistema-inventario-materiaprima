'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWarehouse } from '@/lib/warehouse-context'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/',               label: 'Stock actual',   icon: '◈' },
  { to: '/resumen',        label: 'Resumen',         icon: '▣' },
  { to: '/productos',      label: 'Productos',       icon: '⊞' },
  { to: '/entradas',       label: 'Entradas',        icon: '↓' },
  { to: '/salidas',        label: 'Salidas',         icon: '↑' },
  { to: '/ajustes',        label: 'Ajustes',         icon: '⟳' },
  { to: '/reportes',       label: 'Reportes',        icon: '≡' },
  { to: '/configuracion',  label: 'Configuración',   icon: '⚙' },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { warehouse, warehouses, switchWarehouse } = useWarehouse()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function handleNavClick() {
    onClose?.()
  }

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
      <div className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logonb.png" alt="Logo" className={styles.brandLogo} />
        <div className={styles.brandText}>
          <div className={styles.brandName}>Inventario</div>
          <div className={styles.brandSub}>Materia Prima</div>
        </div>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar menú">
            ✕
          </button>
        )}
      </div>

      <div className={styles.warehouseSection}>
        <span className={styles.warehouseLabel}>Bodega activa</span>
        <select
          value={warehouse.id}
          onChange={e => switchWarehouse(Number(e.target.value))}
          className={styles.warehouseSelect}
        >
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => {
          const isActive = item.to === '/'
            ? pathname === '/'
            : pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={handleNavClick}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          ← Cerrar sesión
        </button>
        <span className={styles.version}>v2.0.0</span>
      </div>
    </aside>
  )
}
