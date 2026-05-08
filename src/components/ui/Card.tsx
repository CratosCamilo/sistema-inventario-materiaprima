import React from 'react'
import styles from './Card.module.css'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`} style={style}>
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
      <div className={styles.headerText}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
