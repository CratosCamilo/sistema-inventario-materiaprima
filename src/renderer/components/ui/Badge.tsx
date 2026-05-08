import React from 'react'
import styles from './Badge.module.css'
import type { StockStatus } from '../../types'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

export function Badge({ variant = 'neutral', children, dot }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  )
}

const STATUS_MAP: Record<StockStatus, BadgeVariant> = {
  normal:   'success',
  low:      'warning',
  critical: 'danger',
}

const STATUS_LABEL: Record<StockStatus, string> = {
  normal:   'Normal',
  low:      'Stock bajo',
  critical: 'Crítico',
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge variant={STATUS_MAP[status]} dot>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
