'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { useWarehouse } from '@/lib/warehouse-context'
import { adjustmentsApi, productsApi } from '@/lib/api/client'
import { formatDate, formatNumber } from '@/utils/formatters'
import type { StockAdjustment, Product } from '@/types'
import styles from './ajustes.module.css'

export default function AjustesPage() {
  const { warehouse } = useWarehouse()
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [products, setProducts]       = useState<Product[]>([])
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [physicalQty, setPhysicalQty] = useState('')

  const load = useCallback(() => {
    adjustmentsApi.list(warehouse.id, { date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then(setAdjustments)
  }, [warehouse.id, dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    productsApi.list(warehouse.id).then(d => setProducts(d.filter(p => p.active)))
  }, [warehouse.id])

  function openCreate() { setSelectedProduct(null); setPhysicalQty(''); setError(''); setModalOpen(true) }
  function closeModal()  { setModalOpen(false) }

  function handleProductChange(id: number) {
    const p = products.find(p => p.id === id) ?? null
    setSelectedProduct(p)
    setPhysicalQty(p ? String(p.stock_current) : '')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (!selectedProduct) { setError('Selecciona un producto'); return }
    const input = {
      date:           String(fd.get('date')),
      product_id:     selectedProduct.id,
      stock_physical: Number(physicalQty),
      reason:         String(fd.get('reason')      || '') || undefined,
      notes:          String(fd.get('notes')       || '') || undefined,
      responsible:    String(fd.get('responsible') || '') || undefined,
    }
    setSaving(true); setError('')
    try {
      await adjustmentsApi.create(warehouse.id, input)
      closeModal(); load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  const diff = selectedProduct && physicalQty !== ''
    ? Number(physicalQty) - selectedProduct.stock_current
    : null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Ajustes de inventario</h1>
          <p>Conteo físico y correcciones — {warehouse.name}</p>
        </div>
        <Button onClick={openCreate}>+ Nuevo ajuste</Button>
      </div>

      <Card>
        <div className={styles.filters}>
          <div className={styles.filterGroup}><label>Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div className={styles.filterGroup}><label>Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>Limpiar</Button>
        </div>

        <Table<StockAdjustment>
          columns={[
            { key: 'date',         header: 'Fecha',       render: r => formatDate(r.date) },
            { key: 'product_name', header: 'Producto',    render: r => r.product_name ?? '—' },
            { key: 'stock_system', header: 'Stock sistema', align: 'right',
              render: r => `${formatNumber(r.stock_system)} ${r.visual_unit ?? ''}` },
            { key: 'stock_physical', header: 'Stock físico', align: 'right',
              render: r => `${formatNumber(r.stock_physical)} ${r.visual_unit ?? ''}` },
            { key: 'difference', header: 'Diferencia', align: 'right',
              render: r => (
                <span style={{ color: r.difference >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                  {r.difference >= 0 ? '+' : ''}{formatNumber(r.difference)}
                </span>
              )},
            { key: 'reason',      header: 'Motivo',      render: r => r.reason ?? '—' },
            { key: 'responsible', header: 'Responsable', render: r => r.responsible ?? '—' },
          ]}
          data={adjustments}
          rowKey={r => r.id}
          emptyText="Sin ajustes registrados"
        />
      </Card>

      <Modal open={modalOpen} title="Registrar ajuste de inventario" onClose={closeModal} size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="adj-form" loading={saving}>Guardar ajuste</Button>
          </>
        }
      >
        <form id="adj-form" onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGrid2}>
            <div>
              <label className={styles.label}>Fecha *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} />
            </div>
            <div>
              <label className={styles.label}>Producto *</label>
              <select required defaultValue="" onChange={e => handleProductChange(Number(e.target.value))}>
                <option value="" disabled>Seleccionar...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {selectedProduct && (
            <div className={styles.stockCompare}>
              <div className={styles.stockBox}>
                <span className={styles.label}>Stock en sistema</span>
                <strong>{formatNumber(selectedProduct.stock_current)} {selectedProduct.visual_unit}</strong>
              </div>
              <div className={styles.arrow}>→</div>
              <div className={styles.stockBox}>
                <span className={styles.label}>Conteo físico *</span>
                <input type="number" min="0" step="any" required
                  value={physicalQty}
                  onChange={e => setPhysicalQty(e.target.value)}
                  placeholder="0"
                  className={styles.physInput}
                />
                <span className={styles.unitLabel}>{selectedProduct.visual_unit}</span>
              </div>
              {diff !== null && (
                <div className={`${styles.stockBox} ${styles.diffBox}`}>
                  <span className={styles.label}>Diferencia</span>
                  <strong style={{ color: diff >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.2rem' }}>
                    {diff >= 0 ? '+' : ''}{formatNumber(diff)} {selectedProduct.visual_unit}
                  </strong>
                </div>
              )}
            </div>
          )}

          <div>
            <label className={styles.label}>Motivo del ajuste</label>
            <input name="reason" placeholder="Ej: Merma, daño, error de conteo..." />
          </div>

          <div>
            <label className={styles.label}>Responsable</label>
            <input name="responsible" placeholder="Quien realizó el conteo" />
          </div>

          <div>
            <label className={styles.label}>Observaciones</label>
            <textarea name="notes" rows={2} placeholder="Opcional" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
