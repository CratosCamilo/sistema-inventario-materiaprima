'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Combobox } from '@/components/ui/Combobox'
import { useWarehouse } from '@/lib/warehouse-context'
import { useSession } from '@/lib/session-context'
import { exitsApi, productsApi } from '@/lib/api/client'
import { formatDate, formatNumber, DESTINATION_LABELS, toVisual, formatDualUnit } from '@/utils/formatters'
import type { Exit, Product, CreateExitItemInput, ExitDestination, ProductCategory } from '@/types'
import styles from './salidas.module.css'

interface ItemRow extends CreateExitItemInput {
  key: number
  weight_initial?: number
  weight_final?: number
}

type PageStep = 'list' | 'pick_category'

export default function SalidasPage() {
  const { warehouse } = useWarehouse()
  const session       = useSession()
  const isAdmin       = session.role === 'admin'

  const [exits, setExits]           = useState<Exit[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [step, setStep]             = useState<PageStep>('list')
  const [exitCategory, setExitCategory] = useState<ProductCategory>('Produccion')
  const [modalOpen, setModalOpen]   = useState(false)
  const [detailExit, setDetailExit] = useState<Exit | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [items, setItems]           = useState<ItemRow[]>([])
  const [nextKey, setNextKey]       = useState(0)
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string
    confirmLabel?: string
    onConfirm: () => void
    onCancel: () => void
  } | null>(null)

  function showConfirm(message: string, confirmLabel = 'Confirmar'): Promise<boolean> {
    return new Promise(resolve => {
      setConfirmConfig({
        message,
        confirmLabel,
        onConfirm: () => { setConfirmConfig(null); resolve(true) },
        onCancel:  () => { setConfirmConfig(null); resolve(false) },
      })
    })
  }

  const load = useCallback(() => {
    exitsApi.list(warehouse.id, { date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then(setExits)
  }, [warehouse.id, dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    productsApi.list(warehouse.id).then(d => setProducts(d.filter(p => p.active)))
  }, [warehouse.id])

  const categoryProducts = products.filter(p => p.category === exitCategory)

  function addItem() {
    setItems(prev => [...prev, { key: nextKey, product_id: 0, quantity: 0, unit: '' }])
    setNextKey(k => k + 1)
  }
  function removeItem(key: number) { setItems(prev => prev.filter(i => i.key !== key)) }

  function updateItem(key: number, field: string, value: string | number) {
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i
      if (field === 'product_id') {
        const p = products.find(p => p.id === Number(value))
        const defaultUnit = p?.weight_based
          ? p.base_unit
          : p
            ? (p.unit_exit_default === 'base' ? p.base_unit : p.visual_unit)
            : i.unit
        return { ...i, product_id: Number(value), unit: defaultUnit, weight_initial: undefined, weight_final: undefined }
      }
      if (field === 'weight_initial') {
        const wi = Number(value)
        const wf = i.weight_final ?? 0
        return { ...i, weight_initial: wi, quantity: Math.max(0, wi - wf) }
      }
      if (field === 'weight_final') {
        const wi = i.weight_initial ?? 0
        const wf = Number(value)
        return { ...i, weight_final: wf, quantity: Math.max(0, wi - wf) }
      }
      return { ...i, [field]: field === 'quantity' ? Number(value) : value }
    }))
  }

  function openCreate() {
    setError('')
    setStep('pick_category')
  }

  function pickCategory(cat: ProductCategory) {
    setExitCategory(cat)
    setItems([])
    setNextKey(0)
    setError('')
    setStep('list')
    setModalOpen(true)
  }

  function closeModal() { setModalOpen(false) }

  async function openDetail(ex: Exit) {
    const full = await exitsApi.get(ex.id)
    setDetailExit(full)
  }

  async function handleCancel(ex: Exit) {
    const ok = await showConfirm(
      `¿Anular esta salida (${DESTINATION_LABELS[ex.destination] ?? ex.destination})? Esta acción devolverá el stock y no se puede deshacer.`,
      'Sí, anular',
    )
    if (!ok) return
    try {
      await exitsApi.cancel(ex.id)
      setDetailExit(null)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al anular')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (items.length === 0) { setError('Agrega al menos un producto'); return }

    for (const i of items) {
      const prod = products.find(p => p.id === i.product_id)
      if (!i.product_id) { setError('Selecciona el producto de cada fila'); return }
      if (prod?.weight_based) {
        if ((i.weight_initial ?? 0) <= 0) {
          setError(`Ingresa el peso inicial en "${prod.name}"`); return
        }
        if ((i.weight_initial ?? 0) <= (i.weight_final ?? 0)) {
          setError(`El peso inicial debe ser mayor al peso final en "${prod.name}"`); return
        }
      } else {
        if (!i.quantity) { setError('Completa la cantidad de cada producto'); return }
      }
    }

    const fd = new FormData(e.currentTarget)
    const input = {
      date:        String(fd.get('date')),
      destination: (exitCategory === 'Produccion' ? 'produccion' : 'empaque') as ExitDestination,
      responsible: String(fd.get('responsible') || '') || undefined,
      notes:       String(fd.get('notes')       || '') || undefined,
      items: items.map(i => {
        const prod = products.find(p => p.id === i.product_id)
        const notes = prod?.weight_based && i.weight_initial !== undefined && i.weight_final !== undefined
          ? `Peso inicial: ${formatNumber(i.weight_initial)} kg — Peso final: ${formatNumber(i.weight_final)} kg`
          : undefined
        return { product_id: i.product_id, quantity: i.quantity, unit: prod?.weight_based ? 'kg' : i.unit, notes }
      }),
    }
    setSaving(true); setError('')
    try {
      await exitsApi.create(warehouse.id, input)
      closeModal(); load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  // ── Pick category step ──
  if (step === 'pick_category') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Registrar salida</h1>
            <p>¿A qué área va la materia prima? — {warehouse.name}</p>
          </div>
          <Button variant="ghost" onClick={() => setStep('list')}>← Cancelar</Button>
        </div>
        <div className={styles.categoryPick}>
          <button className={styles.categoryCard} onClick={() => pickCategory('Produccion')}>
            <span className={styles.categoryIcon}>🍞</span>
            <strong>Producción</strong>
            <span>{products.filter(p => p.category === 'Produccion').length} productos disponibles</span>
          </button>
          <button className={styles.categoryCard} onClick={() => pickCategory('Empaques')}>
            <span className={styles.categoryIcon}>📦</span>
            <strong>Empaques</strong>
            <span>{products.filter(p => p.category === 'Empaques').length} productos disponibles</span>
          </button>
        </div>
      </div>
    )
  }

  // ── List step ──
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Salidas</h1>
          <p>Materia prima enviada — {warehouse.name}</p>
        </div>
        <Button onClick={openCreate}>+ Registrar salida</Button>
      </div>

      <Card>
        <div className={styles.filters}>
          <div className={styles.filterGroup}><label>Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div className={styles.filterGroup}><label>Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>Limpiar</Button>
        </div>

        <Table<Exit>
          columns={[
            { key: 'date',        header: 'Fecha',      render: r => formatDate(r.date) },
            { key: 'destination', header: 'Destino',    render: r => DESTINATION_LABELS[r.destination] ?? r.destination },
            { key: 'responsible', header: 'Responsable', render: r => r.responsible ?? '—' },
            { key: 'notes',       header: 'Observaciones', render: r => r.notes ?? '—' },
            { key: 'status',      header: 'Estado',
              render: r => r.status === 'cancelled'
                ? <span style={{color:'var(--danger)',fontWeight:600,fontSize:12}}>Anulada</span>
                : <span style={{color:'var(--success)',fontSize:12}}>Activa</span> },
          ]}
          data={exits}
          rowKey={r => r.id}
          emptyText="Sin salidas registradas"
          onRowClick={openDetail}
          rowClassName={r => r.status === 'cancelled' ? styles.cancelled : ''}
          pageSize={15}
        />
      </Card>

      {/* ── Modal registrar salida ── */}
      <Modal
        open={modalOpen}
        title={`Salida — ${exitCategory === 'Produccion' ? 'Producción' : 'Empaques'}`}
        onClose={closeModal}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="exit-form" loading={saving}>Registrar salida</Button>
          </>
        }
      >
        <form id="exit-form" onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGrid2}>
            <div>
              <label className={styles.label}>Fecha *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} />
            </div>
            <div>
              <label className={styles.label}>Destino</label>
              <p className={styles.destinoDisplay}>
                {exitCategory === 'Produccion' ? '🍞 Producción' : '📦 Empaques'}
              </p>
            </div>
          </div>

          <div>
            <label className={styles.label}>Responsable</label>
            <input name="responsible" placeholder="Quien realizó la salida" />
          </div>

          <div>
            <label className={styles.label}>Observaciones</label>
            <textarea name="notes" rows={2} placeholder="Opcional" />
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>
              <span className={styles.label}>Productos retirados</span>
              <Button type="button" size="sm" variant="secondary" onClick={addItem}>+ Agregar</Button>
            </div>

            {items.length === 0 && <p className={styles.emptyItems}>Agrega al menos un producto</p>}

            {items.map(item => {
              const prod = products.find(p => p.id === item.product_id)
              const isWeightBased = prod?.weight_based ?? false

              return (
                <div key={item.key} className={`${styles.itemRow} ${isWeightBased ? styles.itemRowWeight : ''}`}>
                  {/* Columna producto */}
                  <Combobox
                    options={categoryProducts.map(p => ({
                      value: p.id,
                      label: p.name + (p.weight_based ? ' ⚖' : ''),
                    }))}
                    value={item.product_id || ''}
                    onChange={v => updateItem(item.key, 'product_id', v)}
                    placeholder="Buscar producto..."
                  />

                  {/* Columna stock actual */}
                  <div className={styles.stockCol}>
                    {prod ? (
                      <>
                        <span className={styles.stockColNum}>
                          {isWeightBased
                            ? formatNumber(prod.stock_current)
                            : formatNumber(toVisual(prod.stock_current, prod.conversion_factor ?? 1))}
                        </span>
                        <span className={styles.stockColUnit}>
                          {isWeightBased
                            ? <span className={styles.weightBadge}>⚖ {prod.base_unit}</span>
                            : prod.visual_unit}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {isWeightBased ? (
                    <>
                      <div className={styles.weightCol}>
                        <label className={styles.weightLabel}>Inicio (kg)</label>
                        <input type="number" min="0" step="any" placeholder="0"
                          value={item.weight_initial ?? ''}
                          onChange={e => updateItem(item.key, 'weight_initial', e.target.value)} />
                      </div>
                      <div className={styles.weightCol}>
                        <label className={styles.weightLabel}>Final (kg)</label>
                        <input type="number" min="0" step="any" placeholder="0"
                          value={item.weight_final ?? ''}
                          onChange={e => updateItem(item.key, 'weight_final', e.target.value)} />
                      </div>
                      <div className={styles.weightCol}>
                        <label className={styles.weightLabel}>Diferencia</label>
                        <span className={styles.weightDiff}>
                          {item.quantity > 0 ? `${formatNumber(item.quantity)} kg` : '—'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <input type="number" min="0.01" step="any" placeholder="Cantidad"
                        value={item.quantity || ''}
                        onChange={e => updateItem(item.key, 'quantity', e.target.value)} />
                      {(() => {
                        if (!prod) return null
                        const hasConv = (prod.conversion_factor ?? 1) > 1 && prod.base_unit !== prod.visual_unit
                        if (!hasConv) return (
                          <span style={{padding:'0 6px',fontSize:13,fontWeight:600,color:'var(--text-muted)'}}>
                            {prod.visual_unit}
                          </span>
                        )
                        return (
                          <select value={item.unit}
                            onChange={e => updateItem(item.key, 'unit', e.target.value)}
                            style={{minWidth:90}}>
                            <option value={prod.visual_unit}>{prod.visual_unit}</option>
                            <option value={prod.base_unit}>{prod.base_unit}</option>
                          </select>
                        )
                      })()}
                    </>
                  )}

                  <button type="button" className={styles.removeItem} onClick={() => removeItem(item.key)}>✕</button>
                </div>
              )
            })}
          </div>
        </form>
      </Modal>

      {/* ── Modal detalle ── */}
      <Modal open={!!detailExit} title="Detalle de salida" onClose={() => setDetailExit(null)} size="md"
        footer={
          <>
            {isAdmin && detailExit?.status === 'active' && (
              <Button variant="danger" onClick={() => handleCancel(detailExit!)}>Anular</Button>
            )}
            <Button variant="ghost" onClick={() => setDetailExit(null)}>Cerrar</Button>
          </>
        }
      >
        {detailExit && (
          <div className={styles.detailBody}>
            {detailExit.status === 'cancelled' && (
              <div style={{background:'var(--danger-soft)',border:'1px solid var(--danger)',borderRadius:'var(--radius-sm)',padding:'10px 14px',color:'var(--danger)',fontSize:13,fontWeight:600}}>
                Salida anulada — el stock fue devuelto
              </div>
            )}
            <div className={styles.detailGrid}>
              <div><span className={styles.label}>Fecha</span><p>{formatDate(detailExit.date)}</p></div>
              <div><span className={styles.label}>Destino</span><p>{DESTINATION_LABELS[detailExit.destination] ?? detailExit.destination}</p></div>
              <div><span className={styles.label}>Responsable</span><p>{detailExit.responsible ?? '—'}</p></div>
            </div>
            {detailExit.notes && <p className={styles.detailNotes}>{detailExit.notes}</p>}
            <h3 style={{ marginTop: 16, marginBottom: 8 }}>Productos</h3>
            {detailExit.items?.map((item, i) => (
              <div key={i} className={styles.detailItem}>
                <span>{item.product_name ?? `Producto #${item.product_id}`}</span>
                <div style={{textAlign:'right'}}>
                  <strong>
                    {formatDualUnit(
                      item.quantity,
                      item.base_unit ?? item.unit,
                      item.visual_unit ?? item.unit,
                      item.conversion_factor ?? 1,
                    )}
                  </strong>
                  {item.notes && <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{item.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Modal confirmación ── */}
      <Modal
        open={!!confirmConfig}
        title="Confirmar"
        onClose={() => confirmConfig?.onCancel()}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => confirmConfig?.onCancel()}>Cancelar</Button>
            <Button variant="danger" onClick={() => confirmConfig?.onConfirm()}>
              {confirmConfig?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {confirmConfig?.message}
        </p>
      </Modal>
    </div>
  )
}
