'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi, movementsApi } from '@/lib/api/client'
import { formatNumber, formatDate, getStockStatus, MOVEMENT_TYPE_LABELS, pluralizeUnit, toVisual, formatDualUnit } from '@/utils/formatters'
import { exportExcelMultiSheet } from '@/utils/exportExcel'
import { exportPdfMultiSection } from '@/utils/exportPdf'
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
  // IDs de productos que el usuario prefiere ver en unidad base (en vez de visual)
  const [baseViewIds, setBaseViewIds] = useState<Set<number>>(new Set())

  function toggleBaseView(id: number) {
    setBaseViewIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

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
    .map(p => ({
      ...p,
      stock_status: getStockStatus(toVisual(p.stock_current, p.conversion_factor ?? 1), p.stock_minimum),
    }))
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
    const makeRows = (prods: typeof filtered) => prods.map(p => {
      const factor  = p.conversion_factor ?? 1
      const visual  = toVisual(p.stock_current, factor)
      return [
        p.name,
        pluralizeUnit(p.visual_unit, visual),
        p.stock_minimum,
        visual,
        getStockStatus(visual, p.stock_minimum) === 'normal' ? 'Normal'
          : getStockStatus(visual, p.stock_minimum) === 'low' ? 'Bajo mínimo' : 'Crítico',
      ]
    })
    const headers = ['Producto', 'Presentación', 'Mínimo', 'Stock actual', 'Estado']
    const prod    = filtered.filter(p => p.category === 'Produccion')
    const emp     = filtered.filter(p => p.category === 'Empaques')
    exportExcelMultiSheet(`stock_${today}.xlsx`, [
      { name: 'Producción', headers, rows: makeRows(prod) },
      { name: 'Empaques',   headers, rows: makeRows(emp)  },
    ])
  }

  async function handleExportPdf() {
    const makeRows = (prods: typeof filtered) => prods.map(p => {
      const visual = toVisual(p.stock_current, p.conversion_factor ?? 1)
      return [
        p.name,
        pluralizeUnit(p.visual_unit, visual),
        `${formatNumber(p.stock_minimum)} ${p.visual_unit}`,
        formatNumber(visual),
        '',
      ]
    })
    const headers = ['Producto', 'Presentación', 'Mínimo', 'Stock actual', 'Stock real']
    const prod    = filtered.filter(p => p.category === 'Produccion')
    const emp     = filtered.filter(p => p.category === 'Empaques')
    await exportPdfMultiSection(
      'Stock actual',
      `${warehouse.name} — ${today}`,
      [
        { sectionTitle: 'Producción', headers, rows: makeRows(prod), options: { handwritingLastCol: true } },
        { sectionTitle: 'Empaques',   headers, rows: makeRows(emp),  options: { handwritingLastCol: true } },
      ],
      `stock_${today}.pdf`,
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
            { key: 'stock_current', header: 'Stock', width: '200px',
              render: r => {
                const factor    = r.conversion_factor ?? 1
                const hasConv   = factor > 1 && r.base_unit !== r.visual_unit
                const inBase    = baseViewIds.has(r.id)
                const color     = r.stock_status === 'critical' ? 'var(--danger)' : r.stock_status === 'low' ? 'var(--warning)' : 'var(--text-primary)'
                const visual    = toVisual(r.stock_current, factor)

                if (!hasConv) {
                  return (
                    <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>
                      {formatNumber(r.stock_current)} {r.visual_unit}
                    </span>
                  )
                }

                const primary   = inBase ? `${formatNumber(r.stock_current)} ${r.base_unit}` : `${formatNumber(visual)} ${r.visual_unit}`
                const secondary = inBase ? `${formatNumber(visual)} ${r.visual_unit}` : `${formatNumber(r.stock_current)} ${r.base_unit}`
                const toggleTo  = inBase ? r.visual_unit : r.base_unit
                return (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span
                      onClick={e => { e.stopPropagation(); toggleBaseView(r.id) }}
                      title={`Cambiar a ${toggleTo}`}
                      style={{ color, fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                    >{primary}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({secondary})</span>
                  </div>
                )
              }},
            { key: 'stock_minimum', header: 'Mínimo', align: 'right',
              render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
            { key: 'diff', header: 'Diferencia', align: 'right',
              render: r => {
                const visual = toVisual(r.stock_current, r.conversion_factor ?? 1)
                const diff   = visual - r.stock_minimum
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
                    render: r => {
                      const prod   = historyProduct
                      const factor = prod?.conversion_factor ?? 1
                      const sign   = r.direction === 'out' ? '−' : r.direction === 'in' ? '+' : '±'
                      const color  = r.direction === 'in' ? 'var(--success)' : r.direction === 'out' ? 'var(--danger)' : 'var(--warning)'
                      return (
                        <span style={{ color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {sign}{formatDualUnit(r.quantity, r.unit, prod?.visual_unit ?? r.unit, factor)}
                        </span>
                      )
                    }},
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
