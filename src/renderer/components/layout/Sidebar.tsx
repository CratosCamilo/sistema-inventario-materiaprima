import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',   icon: '▣' },
  { to: '/productos',   label: 'Productos',   icon: '⊞' },
  { to: '/entradas',    label: 'Entradas',    icon: '↓' },
  { to: '/salidas',     label: 'Salidas',     icon: '↑' },
  { to: '/stock',       label: 'Stock actual', icon: '◈' },
  { to: '/ajustes',     label: 'Ajustes',     icon: '⟳' },
  { to: '/reportes',    label: 'Reportes',    icon: '≡' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙' },
]

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>🏭</span>
        <div>
          <div className={styles.brandName}>Inventario</div>
          <div className={styles.brandSub}>Materia Prima</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.version}>v1.0.0</span>
      </div>
    </aside>
  )
}
