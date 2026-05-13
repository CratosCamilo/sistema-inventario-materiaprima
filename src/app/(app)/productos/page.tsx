'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi } from '@/lib/api/client'
import { formatNumber, getStockStatus, toVisual, formatDualUnit } from '@/utils/formatters'
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
  const [formCategory, setFormCategory] = useState('')
  const [weightBased, setWeightBased]   = useState(false)
  const [formVisualUnit, setFormVisualUnit] = useState('')
  const [formBaseUnit, setFormBaseUnit]   = useState('kg')
  const [formFactor, setFormFactor]       = useState(1)

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

  function openCreate() {
    setEditing(null)
    setError('')
    setFormCategory('')
    setWeightBased(false)
    setFormVisualUnit('')
    setFormBaseUnit('kg')
    setFormFactor(1)
    setModalOpen(true)
  }
  function openEdit(p: Product) {
    setEditing(p)
    setError('')
    setFormCategory(p.category)
    setWeightBased(p.weight_based ?? false)
    setFormVisualUnit(p.visual_unit)
    setFormBaseUnit(p.base_unit)
    setFormFactor(p.conversion_factor ?? 1)
    setModalOpen(true)
  }
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
    const cat  = String(data.category) as 'Produccion' | 'Empaques'
    const factor = Number(data.conversion_factor) || 1
    const vUnit  = String(data.visual_unit)
    const bUnit  = String(data.base_unit)
    const sameUnit = factor <= 1 || vUnit === bUnit

    const input: CreateProductInput = {
      name:               String(data.name),
      category:           cat,
      base_unit:          bUnit,
      visual_unit:        vUnit,
      conversion_factor:  factor,
      unit_entry_default: sameUnit ? 'visual' : (String(data.unit_entry_default) as 'visual' | 'base'),
      unit_exit_default:  sameUnit ? 'visual' : (String(data.unit_exit_default) as 'visual' | 'base'),
      stock_minimum:      Number(data.stock_minimum) || 0,
      weight_based:       cat === 'Empaques' ? weightBased : false,
      notes:              String(data.notes) || undefined,
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

  const hasConversion = formFactor > 1 && formVisualUnit && formBaseUnit && formVisualUnit !== formBaseUnit

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
                {r.weight_based && <Badge variant="warning">Por peso</Badge>}
                {!r.active && <Badge variant="neutral">Inactivo</Badge>}
              </span>
            )},
            { key: 'category', header: 'Categoría', render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
            { key: 'visual_unit', header: 'Unidad operativa',
              render: r => (
                <span>
                  {r.visual_unit}
                  {r.conversion_factor > 1 && r.base_unit !== r.visual_unit && (
                    <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:4}}>
                      (1={r.conversion_factor} {r.base_unit})
                    </span>
                  )}
                </span>
              )},
            { key: 'stock_current', header: 'Stock actual', align: 'right',
              render: r => (
                <strong style={{whiteSpace:'nowrap'}}>
                  {formatDualUnit(r.stock_current, r.base_unit, r.visual_unit, r.conversion_factor ?? 1)}
                </strong>
              )},
            { key: 'stock_minimum', header: 'Mínimo', align: 'right',
              render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
            { key: 'status', header: 'Estado',
              render: r => <StockStatusBadge status={getStockStatus(toVisual(r.stock_current, r.conversion_factor ?? 1), r.stock_minimum)} /> },
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
          pageSize={15}
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
              <select name="category" required value={formCategory || (editing?.category ?? '')}
                onChange={e => { setFormCategory(e.target.value); if (e.target.value !== 'Empaques') setWeightBased(false) }}>
                <option value="">Seleccionar...</option>
                <option value="Produccion">Producción</option>
                <option value="Empaques">Empaques</option>
              </select>
              {(formCategory === 'Empaques' || editing?.category === 'Empaques') && (
                <label style={{display:'flex',alignItems:'center',gap:8,marginTop:8,fontSize:13,cursor:'pointer'}}>
                  <input type="checkbox" checked={weightBased}
                    onChange={e => setWeightBased(e.target.checked)} />
                  Salida por peso diferencial (⚖ rollo)
                </label>
              )}
            </div>
            <div>
              <label className={styles.label}>Unidad operativa *</label>
              <select name="visual_unit" required value={formVisualUnit || (editing?.visual_unit ?? '')}
                onChange={e => setFormVisualUnit(e.target.value)}>
                <option value="">Seleccionar...</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div>
              <label className={styles.label}>Unidad base</label>
              <select name="base_unit" value={formBaseUnit}
                onChange={e => setFormBaseUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <p className={styles.hint}>Unidad granular de seguimiento interno</p>
            </div>
            <div>
              <label className={styles.label}>Factor de conversión</label>
              <input name="conversion_factor" type="number" min="1" step="any"
                value={formFactor}
                onChange={e => setFormFactor(Number(e.target.value) || 1)}
                placeholder="1" />
              <p className={styles.hint}>
                {hasConversion
                  ? `1 ${formVisualUnit} = ${formFactor} ${formBaseUnit}`
                  : 'Sin conversión (misma unidad)'}
              </p>
            </div>
          </div>

          {hasConversion && (
            <div className={styles.formGrid}>
              <div>
                <label className={styles.label}>Unidad por defecto — Entradas</label>
                <select name="unit_entry_default" defaultValue={editing?.unit_entry_default ?? 'visual'}>
                  <option value="visual">Operativa ({formVisualUnit})</option>
                  <option value="base">Base ({formBaseUnit})</option>
                </select>
                <p className={styles.hint}>La que se pre-selecciona al registrar una entrada</p>
              </div>
              <div>
                <label className={styles.label}>Unidad por defecto — Salidas</label>
                <select name="unit_exit_default" defaultValue={editing?.unit_exit_default ?? 'visual'}>
                  <option value="visual">Operativa ({formVisualUnit})</option>
                  <option value="base">Base ({formBaseUnit})</option>
                </select>
                <p className={styles.hint}>La que se pre-selecciona al registrar una salida</p>
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <label className={styles.label}>Stock mínimo * (en {formVisualUnit || 'unidades operativas'})</label>
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
