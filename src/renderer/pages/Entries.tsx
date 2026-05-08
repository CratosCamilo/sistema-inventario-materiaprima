import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { api } from '../api'
import { formatDate, formatNumber } from '../utils/formatters'
import type { PurchaseEntry, Product, CreateEntryItemInput } from '../types'
import styles from './Entries.module.css'

interface ItemRow extends CreateEntryItemInput { key: number; product_name?: string }

export function Entries() {
  const [entries, setEntries] = useState<PurchaseEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailEntry, setDetailEntry] = useState<PurchaseEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [items, setItems]   = useState<ItemRow[]>([])
  const [nextKey, setNextKey] = useState(0)

  const load = useCallback(() => {
    api.entries.list({ date_from: dateFrom || undefined, date_to: dateTo || undefined }).then(data => setEntries(data as PurchaseEntry[]))
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.products.list().then(data => setProducts(data.filter(p => p.active))) }, [])

  function addItem() {
    setItems(prev => [...prev, { key: nextKey, product_id: 0, quantity: 0, unit: '' }])
    setNextKey(k => k + 1)
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function updateItem(key: number, field: string, value: string | number) {
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i
      if (field === 'product_id') {
        const p = products.find(p => p.id === Number(value))
        return { ...i, product_id: Number(value), unit: p?.visual_unit ?? i.unit, product_name: p?.name }
      }
      return { ...i, [field]: field === 'quantity' ? Number(value) : value }
    }))
  }

  function openCreate() { setItems([]); setNextKey(0); setError(''); setModalOpen(true) }
  function closeModal() { setModalOpen(false) }

  async function openDetail(entry: PurchaseEntry) {
    const full = await api.entries.get(entry.id) as PurchaseEntry
    setDetailEntry(full)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (items.length === 0)       { setError('Agrega al menos un producto'); return }
    if (items.some(i => !i.product_id || !i.quantity || !i.unit)) {
      setError('Completa todos los campos de cada producto'); return
    }
    const fd = new FormData(e.currentTarget)
    const input = {
      date:           String(fd.get('date')),
      invoice_number: String(fd.get('invoice_number') || '') || undefined,
      supplier_name:  String(fd.get('supplier_name') || '') || undefined,
      responsible:    String(fd.get('responsible') || '') || undefined,
      notes:          String(fd.get('notes') || '') || undefined,
      items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit: i.unit })),
    }
    setSaving(true); setError('')
    try {
      await api.entries.create(input)
      closeModal(); load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Entradas</h1>
          <p>Materia prima recibida en la fábrica</p>
        </div>
        <Button onClick={openCreate}>+ Registrar entrada</Button>
      </div>

      <Card>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label>Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
            Limpiar
          </Button>
        </div>

        <Table<PurchaseEntry>
          columns={[
            { key: 'date',           header: 'Fecha',      render: r => formatDate(r.date) },
            { key: 'invoice_number', header: 'Folio',      render: r => r.invoice_number ?? '—' },
            { key: 'supplier_name',  header: 'Proveedor',  render: r => r.supplier_name  ?? '—' },
            { key: 'responsible',    header: 'Responsable', render: r => r.responsible ?? '—' },
            { key: 'notes',          header: 'Observaciones', render: r => r.notes ?? '—' },
          ]}
          data={entries}
          rowKey={r => r.id}
          emptyText="Sin entradas registradas"
          onRowClick={openDetail}
        />
      </Card>

      {/* Modal nueva entrada */}
      <Modal open={modalOpen} title="Registrar entrada" onClose={closeModal} size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="entry-form" loading={saving}>Registrar entrada</Button>
          </>
        }
      >
        <form id="entry-form" onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGrid2}>
            <div>
              <label className={styles.label}>Fecha *</label>
              <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} />
            </div>
            <div>
              <label className={styles.label}>Folio / N° factura</label>
              <input name="invoice_number" placeholder="Ej: FAC-2024-001" />
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div>
              <label className={styles.label}>Proveedor</label>
              <input name="supplier_name" placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className={styles.label}>Responsable</label>
              <input name="responsible" placeholder="Quien recibió" />
            </div>
          </div>

          <div>
            <label className={styles.label}>Observaciones</label>
            <textarea name="notes" rows={2} placeholder="Opcional" />
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>
              <span className={styles.label}>Productos recibidos</span>
              <Button type="button" size="sm" variant="secondary" onClick={addItem}>+ Agregar</Button>
            </div>

            {items.length === 0 && (
              <p className={styles.emptyItems}>Agrega al menos un producto</p>
            )}

            {items.map(item => (
              <div key={item.key} className={styles.itemRow}>
                <div className={styles.itemProduct}>
                  <select value={item.product_id || ''} onChange={e => updateItem(item.key, 'product_id', e.target.value)} required>
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className={styles.itemQty}>
                  <input type="number" min="0.01" step="any" placeholder="Cantidad" required
                    value={item.quantity || ''} onChange={e => updateItem(item.key, 'quantity', e.target.value)} />
                </div>
                <div className={styles.itemUnit}>
                  <input placeholder="Unidad" required value={item.unit}
                    onChange={e => updateItem(item.key, 'unit', e.target.value)} />
                </div>
                <button type="button" className={styles.removeItem} onClick={() => removeItem(item.key)}>✕</button>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* Modal detalle */}
      <Modal open={!!detailEntry} title="Detalle de entrada" onClose={() => setDetailEntry(null)} size="md"
        footer={<Button variant="ghost" onClick={() => setDetailEntry(null)}>Cerrar</Button>}
      >
        {detailEntry && (
          <div className={styles.detailBody}>
            <div className={styles.detailGrid}>
              <div><span className={styles.label}>Fecha</span><p>{formatDate(detailEntry.date)}</p></div>
              <div><span className={styles.label}>Folio</span><p>{detailEntry.invoice_number ?? '—'}</p></div>
              <div><span className={styles.label}>Proveedor</span><p>{detailEntry.supplier_name ?? '—'}</p></div>
              <div><span className={styles.label}>Responsable</span><p>{detailEntry.responsible ?? '—'}</p></div>
            </div>
            {detailEntry.notes && <p className={styles.detailNotes}>{detailEntry.notes}</p>}
            <h3 style={{ marginTop: 16, marginBottom: 8 }}>Productos</h3>
            {detailEntry.items?.map((item, i) => (
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
