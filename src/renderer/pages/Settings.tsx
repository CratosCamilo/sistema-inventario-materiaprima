import React, { useEffect, useState } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { api } from '../api'
import styles from './Settings.module.css'

export function Settings() {
  const [companyName, setCompanyName] = useState('')
  const [saved, setSaved]             = useState(false)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    api.settings.getAll().then(all => {
      setCompanyName(all['company_name'] ?? '')
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await api.settings.set('company_name', companyName)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Configuración</h1>
          <p>Ajustes generales del sistema</p>
        </div>
      </div>

      <Card style={{ maxWidth: 520 } as React.CSSProperties}>
        <CardHeader title="Información de la empresa" />
        {!loading && (
          <form onSubmit={handleSave} className={styles.form}>
            <div>
              <label className={styles.label}>Nombre de la empresa</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                placeholder="Ej: Panadería La Esperanza" />
            </div>
            <div className={styles.saveRow}>
              <Button type="submit">Guardar</Button>
              {saved && <span className={styles.savedMsg}>✓ Guardado</span>}
            </div>
          </form>
        )}
      </Card>

      <Card style={{ maxWidth: 520 } as React.CSSProperties}>
        <CardHeader title="Acerca del sistema" />
        <div className={styles.about}>
          <div className={styles.aboutRow}><span>Versión</span><strong>1.0.0</strong></div>
          <div className={styles.aboutRow}><span>Base de datos</span><strong>SQLite local</strong></div>
          <div className={styles.aboutRow}><span>Modo</span><strong>Offline — sin conexión requerida</strong></div>
        </div>
      </Card>
    </div>
  )
}
