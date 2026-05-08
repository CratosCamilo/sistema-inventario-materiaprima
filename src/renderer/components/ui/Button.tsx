import React from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} /> : icon ? <span className={styles.icon}>{icon}</span> : null}
      {children && <span>{children}</span>}
    </button>
  )
}
