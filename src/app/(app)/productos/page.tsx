'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi } from '@/lib/api/client'
import { formatNumber, getStockStatus } from '@/utils/formatters'
import type { Product, CreateProductInput } from '@/types'
import styles from './productos.module.css'

const UNITS = ['kg', 'gramos', 'litros', 'ml', 'unidad', 'bulto', 'caja', 'paquete', 'rollo', 'cartón', 'bolsa']

export default function ProductosPage() {
  const { warehouse } = useWarehouse()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]    = useState<Product | null>(null)
  const [saving, setSaving]      = useState(false)
  const [error, setError]        = useState('')

  const load = useCallback(() => {
    productsApi.list(warehouse.id, true).then(setProducts)
  }, [warehouse.id])

  useEffect(() => { load() }, [load])

  const filtered = products.filter(p => {
    if (!showInactive && !p.active) return false
    if (category && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function openCreate() { setEditing(null); setError(''); setModalOpen(true) }
  function openEdit(p: Product) { setEditing(p); setError(''); setModalOpen(true) }
  function closeModal() { setModalOpen(false); setEditing(null) }

  async function handleDeactivate(p: Product) {
    if (!confirm(`¿Desactivar el producto "${p.name}"?`)) return
    await productsApi.deactivate(p.id)
    load()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd   = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    const input: CreateProductInput = {
      name:              String(data.name),
      category:          String(data.category) as 'Produccion' | 'Empaques',
      base_unit:         String(data.base_unit),
      visual_unit:       String(data.visual_unit),
      conversion_factor: Number(data.conversion_factor) || 1,
      stock_minimum:     Number(data.stock_minimum) || 0,
      notes:             String(data.notes) || undefined,
    }
    setSaving(true); setError('')
    try {
      if (editing) await productsApi.update(editing.id, input)
      else         await productsApi.create(warehouse.id, input)
      closeModal(); load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Productos</h1>
          <p>Materias primas — {warehouse.name}</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo producto</Button>
      </div>

      <Card>
        <div className={styles.filters}>
          <input type="text" placeholder="Buscar producto..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Todas las categorías</option>
            <option value="Produccion">Producción</option>
            <option value="Empaques">Empaques</option>
          </select>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
        </div>

        <Table<Product>
          columns={[
            { key: 'name', header: 'Nombre', render: r => (
              <span className={styles.productName}>
                {r.name}
                {!r.active && <Badge variant="neutral">Inactivo</Badge>}
              </span>
            )},
            { key: 'category',      header: 'Categoría',   render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
            { key: 'visual_unit',   header: 'Unidad' },
            { key: 'stock_current', header: 'Stock actual', align: 'right',
              render: r => <strong>{formatNumber(r.stock_current)} {r.visual_unit}</strong> },
            { key: 'stock_minimum', header: 'Mínimo', align: 'right',
              render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
            { key: 'status', header: 'Estado',
              render: r => <StockStatusBadge status={getStockStatus(r.stock_current, r.stock_minimum)} /> },
            { key: 'actions', header: '', align: 'right', width: '120px',
              render: r => (
                <div className={styles.actions}>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Editar</Button>
                  {r.active && <Button size="sm" variant="ghost" onClick={() => handleDeactivate(r)}>Desactivar</Button>}
                </div>
              )},
          ]}
          data={filtered}
          rowKey={r => r.id}
          emptyText="No se encontraron productos"
        />
      </Card>

      <Modal open={modalOpen} title={editing ? 'Editar producto' : 'Nuevo producto'} onClose={closeModal} size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="product-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formRow}>
            <label className={styles.label}>Nombre *</label>
            <input name="name" required defaultValue={editing?.name} placeholder="Ej: Harina de trigo" />
          </div>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Categoría *</label>
              <select name="category" required defaultValue={editing?.category ?? ''}>
                <option value="">Seleccionar...</option>
                <option value="Produccion">Producción</option>
                <option value="Empaques">Empaques</option>
              </select>
            </div>
            <div>
              <label className={styles.label}>Unidad operativa *</label>
              <select name="visual_unit" required defaultValue={editing?.visual_unit ?? ''}>
                <option value="">Seleccionar...</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Unidad base (referencia)</label>
              <select name="base_unit" defaultValue={editing?.base_unit ?? 'kg'}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={styles.label}>Factor de conversión</label>
              <input name="conversion_factor" type="number" min="0" step="any"
                defaultValue={editing?.conversion_factor ?? 1} placeholder="1" />
              <p className={styles.hint}>Ej: 1 bulto = 50 kg → factor 50</p>
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Stock mínimo *</label>
            <input name="stock_minimum" type="number" min="0" step="any" required
              defaultValue={editing?.stock_minimum ?? 0} />
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Notas / descripción</label>
            <textarea name="notes" rows={2} defaultValue={editing?.notes ?? ''} placeholder="Opcional" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
