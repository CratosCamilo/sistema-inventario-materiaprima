import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { api } from '../api'
import { formatDate, formatNumber, DESTINATION_LABELS } from '../utils/formatters'
import type { Exit, Product, CreateExitItemInput, ExitDestination } from '../types'
import styles from './Exits.module.css'

interface ItemRow extends CreateExitItemInput { key: number }

const DESTINATIONS: { value: ExitDestination; label: string }[] = [
  { value: 'produccion',  label: 'Producción' },
  { value: 'empaque',     label: 'Empaque' },
  { value: 'punto_venta', label: 'Punto de venta' },
  { value: 'otra',        label: 'Otra' },
]

export function Exits() {
  const [exits, setExits]       = useState<Exit[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailExit, setDetailExit] = useState<Exit | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [items, setItems]   = useState<ItemRow[]>([])
  const [nextKey, setNextKey] = useState(0)

  const load = useCallback(() => {
    api.exits.list({ date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then(data => setExits(data as Exit[]))
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.products.list().then(d => setProducts(d.filter(p => p.active))) }, [])

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
        return { ...i, product_id: Number(value), unit: p?.visual_unit ?? i.unit }
      }
      return { ...i, [field]: field === 'quantity' ? Number(value) : value }
    }))
  }

  function openCreate() { setItems([]); setNextKey(0); setError(''); setModalOpen(true) }
  function closeModal() { setModalOpen(false) }

  async function openDetail(ex: Exit) {
    const full = await api.exits.get(ex.id) as Exit
    setDetailExit(full)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (items.length === 0) { setError('Agrega al menos un producto'); return }
    if (items.some(i => !i.product_id || !i.quantity || !i.unit)) {
      setError('Completa todos los campos de cada producto'); return
    }
    const fd = new FormData(e.currentTarget)
    const input = {
      date:        String(fd.get('date')),
      destination: String(fd.get('destination')) as ExitDestination,
      responsible: String(fd.get('responsible') || '') || undefined,
      notes:       String(fd.get('notes') || '') || undefined,
      items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit: i.unit })),
    }
    setSaving(true); setError('')
    try {
      await api.exits.create(input)
      closeModal(); load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Salidas</h1>
          <p>Materia prima enviada a producción, empaque u otras áreas</p>
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
          ]}
          data={exits}
          rowKey={r => r.id}
          emptyText="Sin salidas registradas"
          onRowClick={openDetail}
        />
      </Card>

      <Modal open={modalOpen} title="Registrar salida" onClose={closeModal} size="lg"
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
              <label className={styles.label}>Destino *</label>
              <select name="destination" required defaultValue="">
                <option value="" disabled>Seleccionar...</option>
                {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
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
              return (
                <div key={item.key} className={styles.itemRow}>
                  <div>
                    <select value={item.product_id || ''} onChange={e => updateItem(item.key, 'product_id', e.target.value)} required>
                      <option value="">Seleccionar producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {prod && <span className={styles.stockInfo}>Stock: {formatNumber(prod.stock_current)} {prod.visual_unit}</span>}
                  </div>
                  <input type="number" min="0.01" step="any" placeholder="Cantidad" required
                    value={item.quantity || ''} onChange={e => updateItem(item.key, 'quantity', e.target.value)} />
                  <input placeholder="Unidad" required value={item.unit}
                    onChange={e => updateItem(item.key, 'unit', e.target.value)} />
                  <button type="button" className={styles.removeItem} onClick={() => removeItem(item.key)}>✕</button>
                </div>
              )
            })}
          </div>
        </form>
      </Modal>

      <Modal open={!!detailExit} title="Detalle de salida" onClose={() => setDetailExit(null)} size="md"
        footer={<Button variant="ghost" onClick={() => setDetailExit(null)}>Cerrar</Button>}
      >
        {detailExit && (
          <div className={styles.detailBody}>
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
                <strong>{formatNumber(item.quantity)} {item.unit}</strong>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
