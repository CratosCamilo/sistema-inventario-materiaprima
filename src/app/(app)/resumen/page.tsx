'use client'
import React, { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useWarehouse } from '@/lib/warehouse-context'
import { dashboardApi } from '@/lib/api/client'
import { formatDate, formatNumber, getStockStatus, DESTINATION_LABELS } from '@/utils/formatters'
import type { Product, InventoryMovement } from '@/types'
import styles from './resumen.module.css'

export default function ResumenPage() {
  const { warehouse } = useWarehouse()
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof dashboardApi.summary>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    dashboardApi.summary(warehouse.id).then(data => { setSummary(data); setLoading(false) })
  }, [warehouse.id])

  if (loading) return <div className={styles.loading}>Cargando...</div>
  if (!summary) return null

  const { stock, entries_this_month, exits_this_month, recent_movements, alert_products } = summary

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Resumen</h1>
          <p>Inventario de materia prima — {warehouse.name}</p>
        </div>
      </div>

      <div className={styles.metrics}>
        <MetricCard label="Productos activos"    value={stock.total}    color="neutral" />
        <MetricCard label="Stock normal"          value={stock.normal}   color="success" />
        <MetricCard label="Stock bajo"            value={stock.low}      color="warning" description="En o por debajo del mínimo" />
        <MetricCard label="Stock crítico"         value={stock.critical} color="danger"  description="Por debajo del 50% del mínimo" />
        <MetricCard label="Entradas este mes"     value={entries_this_month} color="neutral" />
        <MetricCard label="Salidas este mes"      value={exits_this_month}   color="neutral" />
      </div>

      {alert_products.length > 0 && (
        <Card className={styles.alertCard}>
          <CardHeader title="Productos que requieren pedido" subtitle="Stock igual o por debajo del mínimo" />
          <Table<Product>
            columns={[
              { key: 'name',          header: 'Producto' },
              { key: 'stock_current', header: 'Stock actual', align: 'right',
                render: r => `${formatNumber(r.stock_current)} ${r.visual_unit}` },
              { key: 'stock_minimum', header: 'Mínimo', align: 'right',
                render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
              { key: 'status', header: 'Estado',
                render: r => <StockStatusBadge status={getStockStatus(r.stock_current, r.stock_minimum)} /> },
            ]}
            data={alert_products}
            rowKey={r => r.id}
            emptyText="Sin alertas activas"
          />
        </Card>
      )}

      <Card>
        <CardHeader title="Últimos movimientos" subtitle="Entradas, salidas y ajustes recientes" />
        <Table<InventoryMovement>
          columns={[
            { key: 'date',         header: 'Fecha',    render: r => formatDate(r.date) },
            { key: 'product_name', header: 'Producto', render: r => r.product_name ?? '—' },
            { key: 'type',         header: 'Tipo',     render: r => TYPE_LABELS[r.type] ?? r.type },
            { key: 'quantity',     header: 'Cantidad', align: 'right',
              render: r => (
                <span style={{color: r.direction === 'in' ? 'var(--success)' : r.direction === 'out' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600}}>
                  {r.direction === 'out' ? '−' : '+'}{formatNumber(r.quantity)} {r.unit}
                </span>
              )},
          ]}
          data={recent_movements}
          rowKey={r => r.id}
          emptyText="Sin movimientos registrados"
        />
      </Card>
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  initial: 'Inv. inicial', entry: 'Entrada', exit: 'Salida', adjustment: 'Ajuste',
}

function MetricCard({ label, value, color, description }: {
  label: string; value: number; color: 'success' | 'warning' | 'danger' | 'neutral'; description?: string
}) {
  return (
    <Card className={`${styles.metricCard} ${styles[`metric-${color}`]}`}>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricLabel}>{label}</div>
      {description && <div className={styles.metricDesc}>{description}</div>}
    </Card>
  )
}
