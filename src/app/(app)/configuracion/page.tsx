'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { useSession } from '@/lib/session-context'
import { settingsApi, usersApi } from '@/lib/api/client'
import type { User, UserRole, CreateUserInput } from '@/types'
import styles from './configuracion.module.css'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:    'Administrador',
  operador: 'Operador',
  salidas:  'Salidas',
  entradas: 'Entradas',
}

export default function ConfiguracionPage() {
  const session = useSession()
  const isAdmin = session.role === 'admin'

  const [companyName, setCompanyName]     = useState('')
  const [ivaRate, setIvaRate]             = useState('19')
  const [entryModeDefault, setEntryModeDefault] = useState('total_only')
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)

  const [users, setUsers]             = useState<User[]>([])
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [pwdVisible, setPwdVisible]   = useState(false)

  useEffect(() => {
    settingsApi.get().then(all => {
      setCompanyName(all.company_name ?? '')
      setIvaRate(all.iva_rate_default ?? '19')
      setEntryModeDefault(all.entry_mode_default ?? 'total_only')
      setSettingsLoading(false)
    })
  }, [])

  const loadUsers = useCallback(() => {
    if (!isAdmin) return
    usersApi.list().then(setUsers)
  }, [isAdmin])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    await settingsApi.update({
      company_name:       companyName,
      iva_rate_default:   ivaRate,
      entry_mode_default: entryModeDefault,
    })
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  function openCreate() { setEditingUser(null); setError(''); setPwdVisible(false); setModalOpen(true) }
  function openEdit(u: User) { setEditingUser(u); setError(''); setPwdVisible(false); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditingUser(null) }

  async function handleSubmitUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaving(true); setError('')
    try {
      if (editingUser) {
        const input: Partial<CreateUserInput> & { active?: boolean } = {
          full_name: String(fd.get('full_name')),
          role:      String(fd.get('role')) as UserRole,
        }
        const pwd = String(fd.get('password') || '')
        if (pwd) input.password = pwd
        await usersApi.update(editingUser.id, input)
      } else {
        const input: CreateUserInput = {
          username:  String(fd.get('username')),
          full_name: String(fd.get('full_name')),
          password:  String(fd.get('password')),
          role:      String(fd.get('role')) as UserRole,
        }
        await usersApi.create(input)
      }
      closeModal(); loadUsers()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setSaving(false) }
  }

  async function toggleActive(u: User) {
    await usersApi.update(u.id, { active: !u.active })
    loadUsers()
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Configuración</h1>
          <p>Ajustes generales del sistema</p>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader
            title="Usuarios del sistema"
            action={<Button size="sm" onClick={openCreate}>+ Nuevo usuario</Button>}
          />
          <Table<User>
            columns={[
              { key: 'full_name', header: 'Nombre' },
              { key: 'username',  header: 'Usuario' },
              { key: 'role',      header: 'Rol',    render: r => ROLE_LABELS[r.role] ?? r.role },
              { key: 'active',    header: 'Estado', render: r => (
                <Badge variant={r.active ? 'success' : 'neutral'}>
                  {r.active ? 'Activo' : 'Inactivo'}
                </Badge>
              )},
              { key: 'actions', header: '', align: 'right', width: '130px',
                render: r => (
                  <div className={styles.actions}>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
                    {r.id !== session.userId && (
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
                        {r.active ? 'Desactivar' : 'Activar'}
                      </Button>
                    )}
                  </div>
                )},
            ]}
            data={users}
            rowKey={r => r.id}
            emptyText="Sin usuarios"
          />
        </Card>
      )}

      <div className={styles.bottomGrid}>
        <Card>
          <CardHeader title="Información de la empresa" />
          {!settingsLoading && (
            <form onSubmit={handleSaveSettings} className={styles.form}>
              <div>
                <label className={styles.label}>Nombre de la empresa</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ej: Panadería La Esperanza"
                  disabled={!isAdmin} />
              </div>
              <div>
                <label className={styles.label}>IVA por defecto (%)</label>
                <input type="number" min="0" max="100" step="0.1"
                  value={ivaRate} onChange={e => setIvaRate(e.target.value)}
                  disabled={!isAdmin} style={{ width: 100 }} />
                <p className={styles.hint}>Se usará como porcentaje de IVA sugerido en nuevas entradas</p>
              </div>
              <div>
                <label className={styles.label}>Modo de entrada por defecto</label>
                <select value={entryModeDefault} onChange={e => setEntryModeDefault(e.target.value)}
                  disabled={!isAdmin} style={{ width: 220 }}>
                  <option value="total_only">Solo totalizar (cantidad + total factura)</option>
                  <option value="detailed">Detallar precios (precio por producto + IVA)</option>
                </select>
                <p className={styles.hint}>Define qué modo viene seleccionado al registrar una nueva entrada</p>
              </div>
              {isAdmin && (
                <div className={styles.saveRow}>
                  <Button type="submit">Guardar</Button>
                  {settingsSaved && <span className={styles.savedMsg}>✓ Guardado</span>}
                </div>
              )}
            </form>
          )}
        </Card>

        <Card>
          <CardHeader title="Acerca del sistema" />
          <div className={styles.about}>
            <div className={styles.aboutRow}><span>Versión</span><strong>2.0.0</strong></div>
            <div className={styles.aboutRow}><span>Base de datos</span><strong>SQLite / Turso</strong></div>
            <div className={styles.aboutRow}><span>Usuario actual</span><strong>{session.fullName} ({ROLE_LABELS[session.role]})</strong></div>
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} title={editingUser ? 'Editar usuario' : 'Nuevo usuario'} onClose={closeModal} size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="user-form" loading={saving}>
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmitUser} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          {!editingUser && (
            <div>
              <label className={styles.label}>Usuario (login) *</label>
              <input name="username" required placeholder="ej: maria" autoComplete="off" />
            </div>
          )}

          <div>
            <label className={styles.label}>Nombre completo *</label>
            <input name="full_name" required defaultValue={editingUser?.full_name}
              placeholder="Ej: María García" />
          </div>

          <div>
            <label className={styles.label}>Rol *</label>
            <select name="role" required defaultValue={editingUser?.role ?? ''}>
              <option value="" disabled>Seleccionar...</option>
              {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.label}>
              {editingUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input name="password" type={pwdVisible ? 'text' : 'password'}
                required={!editingUser}
                placeholder={editingUser ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
                autoComplete="new-password"
                style={{ paddingRight: 40 }} />
              <button type="button" className={styles.eyeBtn}
                onClick={() => setPwdVisible(v => !v)}>
                {pwdVisible ? '🙈' : '👁'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
