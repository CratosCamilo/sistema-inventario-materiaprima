import React from 'react'
import styles from './Badge.module.css'
import type { StockStatus } from '@/types'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {children}
    </span>
  )
}

interface StockStatusBadgeProps {
  status: StockStatus
}

const STATUS_CONFIG: Record<StockStatus, { label: string; variant: BadgeVariant }> = {
  normal:   { label: 'Normal',   variant: 'success' },
  low:      { label: 'Stock bajo', variant: 'warning' },
  critical: { label: 'Crítico',  variant: 'danger'  },
}

export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const { label, variant } = STATUS_CONFIG[status]
  return (
    <span className={`${styles.badge} ${styles.stock} ${styles[variant]}`}>
      <span className={styles.dot} />
      {label}
    </span>
  )
}
