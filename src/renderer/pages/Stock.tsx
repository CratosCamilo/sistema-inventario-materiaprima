import React, { useEffect, useState } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { StockStatusBadge } from '../components/ui/Badge'
import { Table } from '../components/ui/Table'
import { api } from '../api'
import { formatNumber, getStockStatus } from '../utils/formatters'
import type { Product } from '../types'
import styles from './Stock.module.css'

type FilterStatus = 'all' | 'normal' | 'low' | 'critical'

export function Stock() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<FilterStatus>('all')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.products.list().then(d => { setProducts(d.filter(p => p.active)); setLoading(false) })
  }, [])

  const enriched = products.map(p => ({ ...p, stock_status: getStockStatus(p.stock_current, p.stock_minimum) }))

  const filtered = enriched.filter(p => {
    if (filter !== 'all' && p.stock_status !== filter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.category.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalNormal   = enriched.filter(p => p.stock_status === 'normal').length
  const totalLow      = enriched.filter(p => p.stock_status === 'low').length
  const totalCritical = enriched.filter(p => p.stock_status === 'critical').length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Stock actual</h1>
          <p>Estado de inventario en tiempo real</p>
        </div>
      </div>

      {/* Resumen visual */}
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
        <CardHeader
          title="Inventario"
          action={
            <input type="text" placeholder="Buscar..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
          }
        />
        <Table
          columns={[
            { key: 'name',     header: 'Producto', render: r => <strong style={{color:'var(--text-primary)'}}>{r.name}</strong> },
            { key: 'category', header: 'Categoría' },
            { key: 'stock_current', header: 'Stock actual', align: 'right',
              render: r => (
                <span style={{ color: r.stock_status === 'critical' ? 'var(--danger)' : r.stock_status === 'low' ? 'var(--warning)' : 'var(--text-primary)', fontWeight: 600 }}>
                  {formatNumber(r.stock_current)} {r.visual_unit}
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
          ]}
          data={loading ? [] : filtered}
          rowKey={r => r.id}
          emptyText={loading ? 'Cargando...' : 'No se encontraron productos'}
        />
      </Card>
    </div>
  )
}
