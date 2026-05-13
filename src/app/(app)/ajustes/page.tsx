'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { useWarehouse } from '@/lib/warehouse-context'
import { useSession } from '@/lib/session-context'
import { adjustmentBatchesApi, productsApi } from '@/lib/api/client'
import { formatDate, formatNumber, toVisual, formatDualUnit } from '@/utils/formatters'
import { exportExcelMultiSheet } from '@/utils/exportExcel'
import { exportPdf } from '@/utils/exportPdf'
import type { AdjustmentBatch, Product, ProductCategory } from '@/types'
import styles from './ajustes.module.css'

type Step = 'list' | 'pick_category' | 'fill_table' | 'detail'

export default function AjustesPage() {
  const { warehouse } = useWarehouse()
  const session = useSession()

  const [batches, setBatches]   = useState<AdjustmentBatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [step, setStep]         = useState<Step>('list')
  const [category, setCategory] = useState<ProductCategory>('Produccion')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [detailBatch, setDetailBatch] = useState<AdjustmentBatch | null>(null)

  // Form state for the fill_table step
  const [adjDate, setAdjDate]           = useState(new Date().toISOString().slice(0, 10))
  const [adjResponsible, setAdjResponsible] = useState('')
  const [adjNotes, setAdjNotes]         = useState('')
  const [physicalValues, setPhysicalValues] = useState<Record<number, string>>({})

  const load = useCallback(() => {
    adjustmentBatchesApi.list(warehouse.id, {
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
    }).then(setBatches)
  }, [warehouse.id, dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    productsApi.list(warehouse.id).then(d => setProducts(d.filter(p => p.active)))
  }, [warehouse.id])

  const categoryProducts = products.filter(p => p.category === category)

  function startAdjustment() {
    setStep('pick_category')
    setError('')
  }

  function pickCategory(cat: ProductCategory) {
    setCategory(cat)
    setPhysicalValues({})
    setAdjDate(new Date().toISOString().slice(0, 10))
    setAdjResponsible('')
    setAdjNotes('')
    setStep('fill_table')
  }

  async function openDetail(batch: AdjustmentBatch) {
    const full = await adjustmentBatchesApi.get(batch.id)
    setDetailBatch(full)
  }

  async function handleSave() {
    // Usuario ingresa conteo físico en unidades visuales → convertir a base antes de enviar
    const items = Object.entries(physicalValues)
      .filter(([, v]) => v.trim() !== '')
      .map(([productId, v]) => {
        const prod   = products.find(p => p.id === Number(productId))
        const factor = prod?.conversion_factor ?? 1
        const physVisual = Number(v)
        const physBase   = factor > 1 ? physVisual * factor : physVisual
        return { product_id: Number(productId), stock_physical: physBase }
      })

    if (items.length === 0) { setError('Llena al menos un valor de stock real'); return }

    setSaving(true); setError('')
    try {
      await adjustmentBatchesApi.create(warehouse.id, {
        date:        adjDate,
        category,
        responsible: adjResponsible || undefined,
        notes:       adjNotes       || undefined,
        items,
      })
      setStep('list')
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  const changedCount = Object.values(physicalValues).filter(v => v.trim() !== '').length

  function handleExportBatchExcel(batch: AdjustmentBatch) {
    if (!batch.adjustments?.length) return
    const today = new Date().toISOString().slice(0, 10)
    const rows = batch.adjustments.map(a => {
      const factor  = a.conversion_factor ?? 1
      const sysVis  = toVisual(a.stock_system, factor)
      const physVis = toVisual(a.stock_physical, factor)
      const diffVis = physVis - sysVis
      return [
        a.product_name ?? '',
        a.visual_unit ?? '',
        sysVis,
        physVis,
        diffVis >= 0 ? `+${formatNumber(diffVis)}` : formatNumber(diffVis),
      ]
    })
    exportExcelMultiSheet(
      `ajuste_${batch.date}.xlsx`,
      [{
        name: `${batch.category === 'Produccion' ? 'Producción' : 'Empaques'}`,
        headers: ['Producto', 'Presentación', 'Stock sistema', 'Stock real', 'Diferencia'],
        rows,
      }],
    )
  }

  async function handleExportBatchPdf(batch: AdjustmentBatch) {
    if (!batch.adjustments?.length) return
    const catLabel = batch.category === 'Produccion' ? 'Producción' : 'Empaques'
    const rows = batch.adjustments.map(a => {
      const factor  = a.conversion_factor ?? 1
      const sysVis  = toVisual(a.stock_system, factor)
      const physVis = toVisual(a.stock_physical, factor)
      const diffVis = physVis - sysVis
      return [
        a.product_name ?? '',
        a.visual_unit ?? '',
        formatNumber(sysVis),
        formatNumber(physVis),
        diffVis >= 0 ? `+${formatNumber(diffVis)}` : String(formatNumber(diffVis)),
      ]
    })
    await exportPdf(
      `Ajuste ${catLabel} — ${formatDate(batch.date)}`,
      `${warehouse.name} · ${batch.responsible ?? ''} · ${batch.changed_count ?? 0} productos ajustados`,
      ['Producto', 'Presentación', 'Stock sistema', 'Stock real', 'Diferencia'],
      rows,
      `ajuste_${batch.date}.pdf`,
    )
  }

  // ── Render ──
  if (step === 'pick_category') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Nuevo ajuste de inventario</h1>
            <p>Selecciona la categoría a ajustar — {warehouse.name}</p>
          </div>
          <Button variant="ghost" onClick={() => setStep('list')}>← Cancelar</Button>
        </div>
        <div className={styles.categoryPick}>
          <button className={styles.categoryCard} onClick={() => pickCategory('Produccion')}>
            <span className={styles.categoryIcon}>🍞</span>
            <strong>Producción</strong>
            <span>{products.filter(p => p.category === 'Produccion').length} productos</span>
          </button>
          <button className={styles.categoryCard} onClick={() => pickCategory('Empaques')}>
            <span className={styles.categoryIcon}>📦</span>
            <strong>Empaques</strong>
            <span>{products.filter(p => p.category === 'Empaques').length} productos</span>
          </button>
        </div>
      </div>
    )
  }

  if (step === 'fill_table') {
    const catLabel = category === 'Produccion' ? 'Producción' : 'Empaques'
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Ajuste — {catLabel}</h1>
            <p>Llena solo los productos que cambiaron — {warehouse.name}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setStep('pick_category')}>← Atrás</Button>
            <Button onClick={handleSave} loading={saving} disabled={changedCount === 0}>
              Guardar lote ({changedCount} producto{changedCount !== 1 ? 's' : ''})
            </Button>
          </div>
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <Card>
          <div className={styles.batchMeta}>
            <div className={styles.filterGroup}>
              <label>Fecha</label>
              <input type="date" value={adjDate} onChange={e => setAdjDate(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label>Responsable</label>
              <input placeholder="Quien realizó el conteo" value={adjResponsible}
                onChange={e => setAdjResponsible(e.target.value)} style={{ width: 200 }} />
            </div>
            <div className={styles.filterGroup}>
              <label>Observaciones</label>
              <input placeholder="Opcional" value={adjNotes}
                onChange={e => setAdjNotes(e.target.value)} style={{ width: 220 }} />
            </div>
          </div>

          <div className={styles.batchTableWrap}>
            <div className={styles.batchTableHeader}>
              <span>Producto</span>
              <span>Presentación</span>
              <span className={styles.right}>Stock sistema</span>
              <span className={styles.right}>Stock real (conteo)</span>
              <span className={styles.right}>Diferencia</span>
            </div>

            {categoryProducts.map((prod, idx) => {
              const factor       = prod.conversion_factor ?? 1
              const systemVisual = toVisual(prod.stock_current, factor)
              const hasConv      = factor > 1 && prod.base_unit !== prod.visual_unit
              const rawVal       = physicalValues[prod.id] ?? ''
              const physical     = rawVal !== '' ? Number(rawVal) : null
              // Diferencia mostrada en visual
              const diff         = physical !== null ? physical - systemVisual : null

              return (
                <div key={prod.id} className={`${styles.batchRow} ${rawVal !== '' ? styles.batchRowFilled : ''}`}>
                  <span className={styles.batchProductName}>{prod.name}</span>
                  <span className={styles.batchUnit}>{prod.visual_unit}</span>
                  <span className={`${styles.right} ${styles.stockSystem}`}>
                    <span>{formatNumber(systemVisual)}</span>
                    {hasConv && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>
                        {formatNumber(prod.stock_current)} {prod.base_unit}
                      </span>
                    )}
                  </span>
                  <div className={styles.right}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="—"
                      className={styles.physInput}
                      data-product-idx={idx}
                      value={rawVal}
                      onChange={e => setPhysicalValues(prev => ({ ...prev, [prod.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const next = document.querySelector<HTMLInputElement>(`[data-product-idx="${idx + 1}"]`)
                          next?.focus()
                        }
                      }}
                    />
                  </div>
                  <span className={`${styles.right} ${styles.diffCell}`}>
                    {diff !== null && (
                      <span style={{ color: diff >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {diff >= 0 ? '+' : ''}{formatNumber(diff)}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  // ── step === 'list' ──
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Ajustes de inventario</h1>
          <p>Conteo físico por lotes — {warehouse.name}</p>
        </div>
        <Button onClick={startAdjustment}>+ Registrar ajuste</Button>
      </div>

      <Card>
        <div className={styles.filters}>
          <div className={styles.filterGroup}><label>Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div className={styles.filterGroup}><label>Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>Limpiar</Button>
        </div>

        <Table<AdjustmentBatch>
          columns={[
            { key: 'date',      header: 'Fecha',      render: r => formatDate(r.date) },
            { key: 'category',  header: 'Categoría',  render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
            { key: 'changed_count', header: 'Ajustados', align: 'right',
              render: r => <strong>{r.changed_count ?? 0} prod.</strong> },
            { key: 'responsible', header: 'Responsable', render: r => r.responsible ?? '—' },
            { key: 'created_by_name', header: 'Registrado por', render: r => r.created_by_name ?? '—' },
          ]}
          data={batches}
          rowKey={r => r.id}
          emptyText="Sin lotes de ajuste registrados"
          onRowClick={openDetail}
          pageSize={15}
        />
      </Card>

      {/* ── Modal detalle de lote ── */}
      <Modal
        open={!!detailBatch}
        title={detailBatch ? `Ajuste ${detailBatch.category === 'Produccion' ? 'Producción' : 'Empaques'} — ${formatDate(detailBatch.date)}` : ''}
        onClose={() => setDetailBatch(null)}
        size="lg"
        footer={
          <>
            {detailBatch && (
              <>
                <Button variant="secondary" size="sm"
                  onClick={() => handleExportBatchExcel(detailBatch)}>↓ Excel</Button>
                <Button variant="secondary" size="sm"
                  onClick={() => handleExportBatchPdf(detailBatch)}>↓ PDF</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setDetailBatch(null)}>Cerrar</Button>
          </>
        }
      >
        {detailBatch && (
          <div className={styles.detailBody}>
            <div className={styles.detailMeta}>
              <div><span className={styles.metaLabel}>Fecha</span><p>{formatDate(detailBatch.date)}</p></div>
              <div><span className={styles.metaLabel}>Categoría</span><p>{detailBatch.category === 'Produccion' ? 'Producción' : 'Empaques'}</p></div>
              <div><span className={styles.metaLabel}>Responsable</span><p>{detailBatch.responsible ?? '—'}</p></div>
              <div><span className={styles.metaLabel}>Total ajustados</span><p><strong>{detailBatch.changed_count}</strong> productos</p></div>
            </div>
            {detailBatch.notes && <p style={{fontSize:13,color:'var(--text-secondary)',fontStyle:'italic'}}>{detailBatch.notes}</p>}

            <div className={styles.detailTableHeader}>
              <span>Producto</span>
              <span className={styles.right}>Sistema</span>
              <span className={styles.right}>Real</span>
              <span className={styles.right}>Diferencia</span>
            </div>
            {detailBatch.adjustments?.map(a => {
              const factor   = a.conversion_factor ?? 1
              const hasConv  = factor > 1 && a.base_unit && a.base_unit !== a.visual_unit
              const sysVis   = toVisual(a.stock_system, factor)
              const physVis  = toVisual(a.stock_physical, factor)
              const diffVis  = physVis - sysVis
              return (
                <div key={a.id} className={styles.detailRow}>
                  <span>{a.product_name}</span>
                  <span className={styles.right}>
                    {formatNumber(sysVis)} {a.visual_unit}
                    {hasConv && <span style={{fontSize:10,color:'var(--text-muted)',display:'block'}}>{formatNumber(a.stock_system)} {a.base_unit}</span>}
                  </span>
                  <span className={styles.right}>
                    {formatNumber(physVis)} {a.visual_unit}
                    {hasConv && <span style={{fontSize:10,color:'var(--text-muted)',display:'block'}}>{formatNumber(a.stock_physical)} {a.base_unit}</span>}
                  </span>
                  <span className={styles.right} style={{
                    color: diffVis >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700,
                  }}>
                    {diffVis >= 0 ? '+' : ''}{formatNumber(diffVis)} {a.visual_unit}
                    {hasConv && <span style={{fontSize:10,color:'var(--text-muted)',display:'block',fontWeight:400}}>{a.difference >= 0 ? '+' : ''}{formatNumber(a.difference)} {a.base_unit}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
