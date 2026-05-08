import React from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
  onClick?: () => void
}

export function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  return (
    <div
      className={`${styles.card} ${styles[`pad-${padding}`]} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
