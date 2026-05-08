'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { useWarehouse } from '@/lib/warehouse-context'
import { useSession } from '@/lib/session-context'
import { Combobox } from '@/components/ui/Combobox'
import { entriesApi, productsApi, settingsApi } from '@/lib/api/client'
import { formatDate, formatNumber, formatCurrency } from '@/utils/formatters'
import type { PurchaseEntry, Product, CreateEntryItemInput, AuditLogEntry } from '@/types'
import styles from './entradas.module.css'

interface ItemRow extends Omit<CreateEntryItemInput, 'product_id'> {
  key:                number
  product_id:         number
  product_name?:      string
  applies_iva:        boolean
  iva_rate:           number
  line_total:         number
  line_total_display: string
}

type EntryWithHistory = PurchaseEntry & { history?: AuditLogEntry[] }

export default function EntradasPage() {
  const { warehouse } = useWarehouse()
  const session       = useSession()
  const canEdit       = session.role === 'admin' || session.role === 'operador'
  const isAdmin       = session.role === 'admin'

  const [entries, setEntries] = useState<PurchaseEntry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ivaDefault, setIvaDefault] = useState(19)
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [folioSearch, setFolioSearch] = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingEntry, setEditingEntry] = useState<PurchaseEntry | null>(null)
  const [detailEntry, setDetailEntry]  = useState<EntryWithHistory | null>(null)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [items, setItems]             = useState<ItemRow[]>([])
  const [nextKey, setNextKey]         = useState(0)
  const [formTouched, setFormTouched] = useState(false)
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
    entriesApi.list(warehouse.id, {
      date_from:      dateFrom      || undefined,
      date_to:        dateTo        || undefined,
      invoice_number: folioSearch   || undefined,
    }).then(data => setEntries(data))
  }, [warehouse.id, dateFrom, dateTo, folioSearch])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    productsApi.list(warehouse.id).then(d => setProducts(d.filter(p => p.active)))
  }, [warehouse.id])
  useEffect(() => {
    settingsApi.get().then(s => {
      if (s.iva_rate_default) setIvaDefault(Number(s.iva_rate_default))
    })
  }, [])

  function handleLineTotalChange(key: number, e: React.ChangeEvent<HTMLInputElement>) {
    const input     = e.target
    const rawValue  = input.value
    const cursorPos = input.selectionStart ?? 0

    const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/[^\d]/g, '').length
    const digitsOnly         = rawValue.replace(/[^\d]/g, '')
    const num                = digitsOnly ? parseInt(digitsOnly, 10) : 0
    const formatted          = num > 0 ? formatCurrency(num) : ''

    setFormTouched(true)
    setItems(prev => prev.map(i => i.key !== key ? i : { ...i, line_total: num, line_total_display: formatted }))

    requestAnimationFrame(() => {
      let newPos     = formatted.length
      let digitCount = 0
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitCount++
        if (digitCount === digitsBeforeCursor) { newPos = i + 1; break }
      }
      if (digitsBeforeCursor === 0) newPos = 0
      input.setSelectionRange(newPos, newPos)
    })
  }

  function addItem() {
    setItems(prev => [...prev, { key: nextKey, product_id: 0, quantity: 0, unit: '', applies_iva: true, iva_rate: ivaDefault, line_total: 0, line_total_display: '' }])
    setNextKey(k => k + 1)
    setFormTouched(true)
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i.key !== key))
    setFormTouched(true)
  }

  function updateItem(key: number, field: string, value: unknown) {
    setFormTouched(true)
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i
      if (field === 'product_id') {
        const p = products.find(p => p.id === Number(value))
        return { ...i, product_id: Number(value), unit: p?.visual_unit ?? i.unit, product_name: p?.name }
      }
      if (field === 'applies_iva') {
        return { ...i, applies_iva: Boolean(value), iva_rate: value ? ivaDefault : 0 }
      }
      return { ...i, [field]: ['quantity', 'iva_rate', 'line_total'].includes(field) ? Number(value) : value }
    }))
  }

  const subtotal   = items.reduce((s, i) => s + i.line_total, 0)
  const ivaTotal   = items.reduce((s, i) => s + (i.applies_iva ? i.line_total * i.iva_rate / 100 : 0), 0)
  const totalCalc  = subtotal + ivaTotal

  function openCreate() {
    setEditingEntry(null)
    setItems([])
    setNextKey(0)
    setError('')
    setFormTouched(false)
    setModalOpen(true)
  }

  function openEdit(entry: PurchaseEntry) {
    setEditingEntry(entry)
    setError('')
    setFormTouched(false)
    if (entry.items) {
      setItems(entry.items.map((item, idx) => ({
        key:                idx,
        product_id:         item.product_id,
        product_name:       item.product_name,
        quantity:           item.quantity,
        unit:               item.unit,
        applies_iva:        item.applies_iva,
        iva_rate:           item.iva_rate,
        line_total:         item.line_total,
        line_total_display: item.line_total > 0 ? formatCurrency(item.line_total) : '',
      })))
      setNextKey(entry.items.length)
    } else {
      setItems([])
      setNextKey(0)
    }
    setModalOpen(true)
  }

  function forceCloseModal() { setModalOpen(false); setEditingEntry(null); setFormTouched(false) }

  async function closeModal() {
    if (formTouched) {
      const ok = await showConfirm('¿Estás seguro? Perderás los datos ingresados.', 'Sí, salir')
      if (!ok) return
    }
    forceCloseModal()
  }

  async function openDetail(entry: PurchaseEntry) {
    const full = await entriesApi.get(entry.id)
    setDetailEntry(full)
  }

  async function handleCancel(entry: EntryWithHistory) {
    const ok = await showConfirm(
      `¿Anular la entrada con folio "${entry.invoice_number ?? entry.id}"? Esta acción revertirá el stock y no se puede deshacer.`,
      'Sí, anular',
    )
    if (!ok) return
    try {
      await entriesApi.cancel(entry.id)
      setDetailEntry(null)
      load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al anular')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const fd             = new FormData(e.currentTarget)
    const invoice_number = String(fd.get('invoice_number') || '').trim()

    if (!invoice_number)  { setError('El número de folio / factura es obligatorio'); return }
    if (items.length === 0) { setError('Agrega al menos un producto'); return }
    if (items.some(i => !i.product_id || !i.quantity || !i.unit)) {
      setError('Completa todos los campos de cada producto'); return
    }

    const msg = editingEntry ? '¿Confirmar los cambios en esta entrada?' : '¿Confirmar el registro de esta entrada?'
    const ok  = await showConfirm(msg, editingEntry ? 'Guardar cambios' : 'Registrar entrada')
    if (!ok) return

    const input = {
      date:           String(fd.get('date')),
      invoice_number,
      supplier_name:  String(fd.get('supplier_name')  || '') || undefined,
      responsible:    String(fd.get('responsible')    || '') || undefined,
      notes:          String(fd.get('notes')          || '') || undefined,
      items: items.map(i => ({
        product_id:  i.product_id,
        quantity:    i.quantity,
        unit:        i.unit,
        applies_iva: i.applies_iva,
        iva_rate:    i.applies_iva ? i.iva_rate : 0,
        line_total:  i.line_total,
        notes:       undefined as string | undefined,
      })),
    }
    setSaving(true); setError('')
    try {
      if (editingEntry) await entriesApi.edit(editingEntry.id, input)
      else              await entriesApi.create(warehouse.id, input)
      forceCloseModal(); load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Entradas</h1>
          <p>Materia prima recibida — {warehouse.name}</p>
        </div>
        {session.role !== 'salidas' && (
          <Button onClick={openCreate}>+ Registrar entrada</Button>
        )}
      </div>

      <Card>
        <div className={styles.filters}>
          <div className={styles.filterGroup}><label>Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div className={styles.filterGroup}><label>Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <div className={styles.filterGroup}><label>Folio / N° factura</label>
            <input type="text" placeholder="Buscar folio..." value={folioSearch}
              onChange={e => setFolioSearch(e.target.value)} style={{ width: 180 }} /></div>
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setFolioSearch('') }}>Limpiar</Button>
        </div>

        <Table<PurchaseEntry>
          columns={[
            { key: 'date',           header: 'Fecha',      render: r => formatDate(r.date) },
            { key: 'invoice_number', header: 'Folio',      render: r => r.invoice_number ?? '—' },
            { key: 'supplier_name',  header: 'Proveedor',  render: r => r.supplier_name  ?? '—' },
            { key: 'responsible',    header: 'Responsable', render: r => r.responsible  ?? '—' },
            { key: 'total',          header: 'Total',      align: 'right',
              render: r => r.total > 0 ? `$${formatCurrency(r.total)}` : '—' },
            { key: 'item_count',     header: 'Productos',  align: 'right',
              render: r => r.item_count ?? '—' },
            { key: 'status',         header: 'Estado',
              render: r => r.status === 'cancelled'
                ? <span style={{color:'var(--danger)',fontWeight:600,fontSize:12}}>Anulada</span>
                : <span style={{color:'var(--success)',fontSize:12}}>Activa</span> },
          ]}
          data={entries}
          rowKey={r => r.id}
          emptyText="Sin entradas registradas"
          onRowClick={openDetail}
          rowClassName={r => r.status === 'cancelled' ? styles.cancelled : ''}
        />
      </Card>

      {/* ── Modal crear / editar ── */}
      <Modal
        open={modalOpen}
        title={editingEntry ? 'Editar entrada' : 'Registrar entrada'}
        onClose={closeModal}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
            <Button type="submit" form="entry-form" loading={saving}>
              {editingEntry ? 'Guardar cambios' : 'Registrar entrada'}
            </Button>
          </>
        }
      >
        <form id="entry-form" onSubmit={handleSubmit} onInput={() => setFormTouched(true)} className={styles.form}>
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formGrid2}>
            <div>
              <label className={styles.label}>Fecha *</label>
              <input name="date" type="date" required
                defaultValue={editingEntry?.date ?? new Date().toISOString().slice(0,10)} />
            </div>
            <div>
              <label className={styles.label}>Folio / N° factura *</label>
              <input name="invoice_number" placeholder="Ej: FAC-2024-001" required
                defaultValue={editingEntry?.invoice_number ?? ''} />
            </div>
          </div>

          <div className={styles.formGrid2}>
            <div>
              <label className={styles.label}>Proveedor</label>
              <input name="supplier_name" placeholder="Nombre del proveedor"
                defaultValue={editingEntry?.supplier_name ?? ''} />
            </div>
            <div>
              <label className={styles.label}>Responsable</label>
              <input name="responsible" placeholder="Quien recibió"
                defaultValue={editingEntry?.responsible ?? ''} />
            </div>
          </div>

          <div>
            <label className={styles.label}>Observaciones</label>
            <textarea name="notes" rows={2} placeholder="Opcional"
              defaultValue={editingEntry?.notes ?? ''} />
          </div>

          <div className={styles.itemsSection}>
            <div className={styles.itemsHeader}>
              <span className={styles.label}>Productos recibidos</span>
              <Button type="button" size="sm" variant="secondary" onClick={addItem}>+ Agregar</Button>
            </div>

            {items.length === 0 && <p className={styles.emptyItems}>Agrega al menos un producto</p>}

            <div className={styles.itemsGrid}>
              {items.length > 0 && (
                <div className={styles.itemsHeaderRow}>
                  <span>Producto</span>
                  <span>Cantidad</span>
                  <span>Unidad</span>
                  <span>IVA</span>
                  <span style={{textAlign:'right'}}>% IVA</span>
                  <span style={{textAlign:'right'}}>Vr. IVA</span>
                  <span style={{textAlign:'right'}}>Total línea ($)</span>
                  <span />
                </div>
              )}
              {items.map(item => {
                const ivaAmount = item.applies_iva ? item.line_total * item.iva_rate / 100 : 0
                return (
                  <div key={item.key} className={styles.itemRow}>
                    <Combobox
                      options={products.map(p => ({ value: p.id, label: p.name }))}
                      value={item.product_id || ''}
                      onChange={val => updateItem(item.key, 'product_id', val)}
                      placeholder="Seleccionar..."
                    />

                    <input type="number" min="0.01" step="any" placeholder="0" required
                      value={item.quantity || ''}
                      onChange={e => updateItem(item.key, 'quantity', e.target.value)} />

                    <input placeholder="Unidad" required value={item.unit}
                      onChange={e => updateItem(item.key, 'unit', e.target.value)} />

                    <label className={styles.ivaCheck}>
                      <input type="checkbox" checked={item.applies_iva}
                        onChange={e => updateItem(item.key, 'applies_iva', e.target.checked)} />
                      IVA
                    </label>

                    <input type="number" min="0" max="100" step="any"
                      value={item.applies_iva ? item.iva_rate : ''}
                      disabled={!item.applies_iva}
                      onChange={e => updateItem(item.key, 'iva_rate', e.target.value)}
                      style={{textAlign:'right'}} />

                    <div className={styles.ivaAmount}>
                      {item.applies_iva && item.line_total > 0
                        ? `$${formatCurrency(ivaAmount)}`
                        : '—'}
                    </div>

                    <input type="text" inputMode="numeric" placeholder="0"
                      value={item.line_total_display}
                      onChange={e => handleLineTotalChange(item.key, e)}
                      style={{textAlign:'right'}} />

                    <button type="button" className={styles.removeItem}
                      onClick={() => removeItem(item.key)}>✕</button>
                  </div>
                )
              })}
            </div>

            {items.length > 0 && (
              <div className={styles.totalsRow}>
                <span>Subtotal: <strong>${formatCurrency(subtotal)}</strong></span>
                <span>IVA: <strong>${formatCurrency(ivaTotal)}</strong></span>
                <span className={styles.totalFinal}>Total: <strong>${formatCurrency(totalCalc)}</strong></span>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* ── Modal detalle ── */}
      <Modal
        open={!!detailEntry}
        title="Detalle de entrada"
        onClose={() => setDetailEntry(null)}
        size="md"
        footer={
          <>
            {isAdmin && detailEntry?.status === 'active' && (
              <Button variant="danger" onClick={() => handleCancel(detailEntry!)}>
                Anular
              </Button>
            )}
            {canEdit && detailEntry?.status === 'active' && (
              <Button onClick={() => { const e = detailEntry; setDetailEntry(null); openEdit(e!) }}>
                Editar
              </Button>
            )}
            <Button variant="ghost" onClick={() => setDetailEntry(null)}>Cerrar</Button>
          </>
        }
      >
        {detailEntry && (
          <div className={styles.detailBody}>
            {detailEntry.status === 'cancelled' && (
              <div style={{background:'var(--danger-soft)',border:'1px solid var(--danger)',borderRadius:'var(--radius-sm)',padding:'10px 14px',color:'var(--danger)',fontSize:13,fontWeight:600}}>
                Entrada anulada — el stock fue revertido
              </div>
            )}
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
                <div style={{textAlign:'right'}}>
                  <strong>{formatNumber(item.quantity)} {item.unit}</strong>
                  {item.line_total > 0 && (
                    <div style={{fontSize:12, color:'var(--text-muted)'}}>
                      ${formatCurrency(item.line_total)}
                      {item.applies_iva && ` + IVA ${item.iva_rate}%`}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {detailEntry.total > 0 && (
              <div className={styles.detailTotals}>
                <span>Subtotal: ${formatCurrency(detailEntry.subtotal)}</span>
                <span>IVA: ${formatCurrency(detailEntry.iva_total)}</span>
                <strong>Total: ${formatCurrency(detailEntry.total)}</strong>
              </div>
            )}

            {detailEntry.edited_by_name && (
              <p style={{fontSize:12, color:'var(--text-muted)', marginTop:12}}>
                Editado por {detailEntry.edited_by_name}
                {detailEntry.edited_at && ` — ${formatDate(detailEntry.edited_at.slice(0,10))}`}
              </p>
            )}

            {detailEntry.history && detailEntry.history.length > 0 && (
              <div style={{marginTop:16}}>
                <h4 style={{marginBottom:8, fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em'}}>
                  Historial de ediciones
                </h4>
                {detailEntry.history.map(h => (
                  <div key={h.id} className={styles.historyItem}>
                    <span style={{fontWeight:600}}>
                      {h.action === 'cancel' ? '✕ Anulada' : 'Editada'} por {h.user_name}
                    </span>
                    <span style={{color:'var(--text-muted)', fontSize:12}}>{formatDate(h.created_at.slice(0,10))}</span>
                  </div>
                ))}
              </div>
            )}
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
            <Button onClick={() => confirmConfig?.onConfirm()}>
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
