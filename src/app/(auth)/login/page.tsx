'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fd.get('username'),
          password: fd.get('password'),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Usuario o contraseña incorrectos')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🏭</span>
          <h1>Inventario</h1>
          <p>Materia Prima</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Usuario</label>
            <input name="username" required autoComplete="username" autoFocus />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Contraseña</label>
            <input name="password" type="password" required autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
