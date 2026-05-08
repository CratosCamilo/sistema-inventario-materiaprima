import React, { useEffect, useState } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { StockStatusBadge } from '../components/ui/Badge'
import { Table } from '../components/ui/Table'
import { api } from '../api'
import { formatDate, formatNumber } from '../utils/formatters'
import type { DashboardSummary, ProductWithStatus, PurchaseEntry, Exit } from '../types'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard.getSummary().then(data => {
      setSummary(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className={styles.loading}>Cargando...</div>
  if (!summary) return null

  const { total_products, low_stock_count, critical_stock_count, recent_entries, recent_exits, alerts } = summary

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          <p>Resumen del inventario de materia prima</p>
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className={styles.metrics}>
        <MetricCard
          label="Productos activos"
          value={total_products}
          color="neutral"
        />
        <MetricCard
          label="Stock bajo"
          value={low_stock_count}
          color="warning"
          description="En o por debajo del mínimo"
        />
        <MetricCard
          label="Stock crítico"
          value={critical_stock_count}
          color="danger"
          description="Por debajo del 50% del mínimo"
        />
        <MetricCard
          label="Con alertas"
          value={alerts.length}
          color={alerts.length === 0 ? 'success' : 'warning'}
          description="Requieren atención"
        />
      </div>

      {/* ── Alertas ── */}
      {alerts.length > 0 && (
        <Card className={styles.alertCard}>
          <CardHeader title="⚠ Productos que requieren pedido" subtitle="Stock igual o por debajo del mínimo" />
          <Table<ProductWithStatus>
            columns={[
              { key: 'name',         header: 'Producto' },
              { key: 'category',     header: 'Categoría' },
              { key: 'stock_current', header: 'Stock actual', align: 'right',
                render: r => `${formatNumber(r.stock_current)} ${r.visual_unit}` },
              { key: 'stock_minimum', header: 'Mínimo', align: 'right',
                render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
              { key: 'stock_status', header: 'Estado',
                render: r => <StockStatusBadge status={r.stock_status} /> },
            ]}
            data={alerts as ProductWithStatus[]}
            rowKey={r => r.id}
            emptyText="Sin alertas activas"
          />
        </Card>
      )}

      {/* ── Últimos movimientos ── */}
      <div className={styles.twoCol}>
        <Card>
          <CardHeader title="Últimas entradas" subtitle="Materia prima recibida" />
          <Table<PurchaseEntry>
            columns={[
              { key: 'date',           header: 'Fecha',    render: r => formatDate(r.date) },
              { key: 'supplier_name',  header: 'Proveedor', render: r => r.supplier_name ?? '—' },
              { key: 'invoice_number', header: 'Folio',    render: r => r.invoice_number ?? '—' },
            ]}
            data={recent_entries as PurchaseEntry[]}
            rowKey={r => r.id}
            emptyText="Sin entradas registradas"
          />
        </Card>

        <Card>
          <CardHeader title="Últimas salidas" subtitle="Materia prima enviada" />
          <Table<Exit>
            columns={[
              { key: 'date',        header: 'Fecha',   render: r => formatDate(r.date) },
              { key: 'destination', header: 'Destino', render: r => DEST[r.destination] ?? r.destination },
              { key: 'responsible', header: 'Responsable', render: r => r.responsible ?? '—' },
            ]}
            data={recent_exits as Exit[]}
            rowKey={r => r.id}
            emptyText="Sin salidas registradas"
          />
        </Card>
      </div>
    </div>
  )
}

const DEST: Record<string, string> = {
  produccion: 'Producción', empaque: 'Empaque', punto_venta: 'Pto. venta', otra: 'Otra',
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
