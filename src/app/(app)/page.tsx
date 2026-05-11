'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi, movementsApi } from '@/lib/api/client'
import { formatNumber, formatDate, getStockStatus, MOVEMENT_TYPE_LABELS, pluralizeUnit } from '@/utils/formatters'
import { exportExcel } from '@/utils/exportExcel'
import { exportPdf } from '@/utils/exportPdf'
import type { Product, ProductCategory, InventoryMovement } from '@/types'
import styles from './stock.module.css'

type FilterStatus   = 'all' | 'normal' | 'low' | 'critical'
type FilterCategory = '' | ProductCategory

export default function StockPage() {
  const { warehouse } = useWarehouse()
  const [products, setProducts] = useState<Product[]>([])
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<FilterStatus>('all')
  const [category, setCategory] = useState<FilterCategory>('')
  const [loading,  setLoading]  = useState(true)
  const [historyProduct,   setHistoryProduct]   = useState<Product | null>(null)
  const [productMovements, setProductMovements] = useState<InventoryMovement[]>([])
  const [historyLoading,   setHistoryLoading]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    productsApi.list(warehouse.id)
      .then(d => { setProducts(d.filter(p => p.active)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [warehouse.id])

  useEffect(() => { load() }, [load])

  async function openHistory(product: Product) {
    setHistoryProduct(product)
    setHistoryLoading(true)
    setProductMovements([])
    try {
      const data = await movementsApi.list(warehouse.id, { product_id: product.id })
      setProductMovements(data)
    } finally {
      setHistoryLoading(false)
    }
  }

  const enriched = products
    .map(p => ({ ...p, stock_status: getStockStatus(p.stock_current, p.stock_minimum) }))
    .sort((a, b) => {
      if (a.category === b.category) return a.name.localeCompare(b.name, 'es')
      return a.category === 'Produccion' ? -1 : 1
    })

  const filtered = enriched.filter(p => {
    if (filter !== 'all' && p.stock_status !== filter) return false
    if (category && p.category !== category) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalNormal   = enriched.filter(p => p.stock_status === 'normal').length
  const totalLow      = enriched.filter(p => p.stock_status === 'low').length
  const totalCritical = enriched.filter(p => p.stock_status === 'critical').length

  const today = new Date().toISOString().slice(0, 10)

  function handleExportExcel() {
    const rows = filtered.map(p => [
      p.name,
      pluralizeUnit(p.visual_unit, p.stock_current),
      p.stock_minimum,
      p.stock_current,
      getStockStatus(p.stock_current, p.stock_minimum) === 'normal' ? 'Normal'
        : getStockStatus(p.stock_current, p.stock_minimum) === 'low' ? 'Bajo mínimo' : 'Crítico',
    ])
    exportExcel(`stock_${today}.xlsx`, ['Producto', 'Presentación', 'Mínimo', 'Stock actual', 'Estado'], rows)
  }

  async function handleExportPdf() {
    const rows = filtered.map(p => [
      p.name,
      pluralizeUnit(p.visual_unit, p.stock_current),
      `${formatNumber(p.stock_minimum)} ${p.visual_unit}`,
      formatNumber(p.stock_current),
      '',
    ])
    await exportPdf(
      'Stock actual',
      `${warehouse.name} — ${today}`,
      ['Producto', 'Presentación', 'Mínimo', 'Stock actual', 'Stock real'],
      rows,
      `stock_${today}.pdf`,
      { handwritingLastCol: true },
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Stock actual</h1>
          <p>Estado de inventario en tiempo real — {warehouse.name}</p>
        </div>
        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="secondary" size="sm" onClick={handleExportExcel}>↓ Excel</Button>
            <Button variant="secondary" size="sm" onClick={handleExportPdf}>↓ PDF conteo</Button>
          </div>
        )}
      </div>

      <div className={styles.summary}>
        <button className={`${styles.summaryCard} ${filter === 'all' ? styles.active : ''}`} onClick={() => setFilter('all')}>
          <span className={styles.summaryNum}>{products.length}</span>
          <span className={styles.summaryLabel}>Total</span>
        </button>
        <button className={`${styles.summaryCard} ${styles.normal} ${filter === 'normal' ? styles.active : ''}`} onClick={() => setFilter('normal')}>
          <span className={styles.summaryNum}>{totalNormal}</span>
          <span className={styles.summaryLabel}>Normal</span>
        </button>
        <button className={`${styles.summaryCard} ${styles.low} ${filter === 'low' ? styles.active : ''}`} onClick={() => setFilter('low')}>
          <span className={styles.summaryNum}>{totalLow}</span>
          <span className={styles.summaryLabel}>Stock bajo</span>
        </button>
        <button className={`${styles.summaryCard} ${styles.critical} ${filter === 'critical' ? styles.active : ''}`} onClick={() => setFilter('critical')}>
          <span className={styles.summaryNum}>{totalCritical}</span>
          <span className={styles.summaryLabel}>Crítico</span>
        </button>
      </div>

      <Card>
        <div className={styles.filters}>
          <input type="text" placeholder="Buscar producto..." value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select value={category} onChange={e => setCategory(e.target.value as FilterCategory)}>
            <option value="">Todas las categorías</option>
            <option value="Produccion">Producción</option>
            <option value="Empaques">Empaques</option>
          </select>
        </div>
        <Table
          columns={[
            { key: 'name',     header: 'Producto', render: r => <span style={{color:'var(--text-primary)'}}>{r.name}</span> },
            { key: 'stock_current', header: 'Stock', align: 'right', width: '88px',
              render: r => (
                <span style={{
                  color: r.stock_status === 'critical' ? 'var(--danger)' : r.stock_status === 'low' ? 'var(--warning)' : 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '1.15rem',
                  lineHeight: 1,
                  display: 'block',
                }}>
                  {formatNumber(r.stock_current)}
                </span>
              )},
            { key: 'visual_unit', header: 'Presentación', width: '110px',
              render: r => (
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                  {pluralizeUnit(r.visual_unit, r.stock_current)}
                </span>
              )},
            { key: 'stock_minimum', header: 'Mínimo', align: 'right',
              render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
            { key: 'diff', header: 'Diferencia', align: 'right',
              render: r => {
                const diff = r.stock_current - r.stock_minimum
                return (
                  <span style={{ color: diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {diff >= 0 ? '+' : ''}{formatNumber(diff)} {r.visual_unit}
                  </span>
                )
              }},
            { key: 'stock_status', header: 'Estado',
              render: r => <StockStatusBadge status={r.stock_status} /> },
            { key: 'history', header: '',
              render: r => (
                <button
                  className={styles.historyBtn}
                  onClick={e => { e.stopPropagation(); openHistory(r) }}
                  title="Ver historial de movimientos"
                >
                  Historial
                </button>
              )},
          ]}
          data={loading ? [] : filtered}
          rowKey={r => r.id}
          emptyText={loading ? 'Cargando...' : 'No se encontraron productos'}
          pageSize={15}
        />
      </Card>

      <Modal
        open={!!historyProduct}
        title={historyProduct ? `Historial — ${historyProduct.name}` : ''}
        onClose={() => setHistoryProduct(null)}
        size="lg"
        footer={<Button variant="ghost" onClick={() => setHistoryProduct(null)}>Cerrar</Button>}
      >
        {historyProduct && (
          <div>
            {historyLoading && <p style={{color:'var(--text-muted)',textAlign:'center',padding:'24px 0'}}>Cargando...</p>}
            {!historyLoading && productMovements.length === 0 && (
              <p style={{color:'var(--text-muted)',textAlign:'center',padding:'24px 0'}}>Sin movimientos registrados para este producto.</p>
            )}
            {!historyLoading && productMovements.length > 0 && (
              <Table<InventoryMovement>
                columns={[
                  { key: 'date',      header: 'Fecha',    render: r => formatDate(r.date) },
                  { key: 'type',      header: 'Tipo',     render: r => MOVEMENT_TYPE_LABELS[r.type] ?? r.type },
                  { key: 'quantity',  header: 'Cantidad', align: 'right',
                    render: r => (
                      <span style={{color: r.direction === 'in' ? 'var(--success)' : r.direction === 'out' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600}}>
                        {r.direction === 'out' ? '−' : '+'}{formatNumber(r.quantity)} {r.unit}
                      </span>
                    )},
                  { key: 'notes',     header: 'Notas',    render: r => r.notes ?? '—' },
                  { key: 'created_by_name', header: 'Usuario', render: r => r.created_by_name ?? '—' },
                ]}
                data={productMovements}
                rowKey={r => r.id}
                emptyText="Sin movimientos"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
