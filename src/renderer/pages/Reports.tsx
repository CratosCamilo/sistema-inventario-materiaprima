import React, { useState } from 'react'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StockStatusBadge } from '../components/ui/Badge'
import { Table } from '../components/ui/Table'
import { api } from '../api'
import { formatDate, formatNumber, getStockStatus, DESTINATION_LABELS, MOVEMENT_TYPE_LABELS } from '../utils/formatters'
import type { Product, PurchaseEntry, Exit, StockAdjustment, InventoryMovement } from '../types'
import styles from './Reports.module.css'

type ReportType = 'stock' | 'entries' | 'exits' | 'low_stock' | 'adjustments' | 'movements'

interface ReportState {
  type: ReportType
  data: unknown[]
  loading: boolean
}

const REPORT_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  { value: 'stock',       label: 'Stock actual',          description: 'Inventario completo con estados' },
  { value: 'low_stock',   label: 'Productos bajo mínimo', description: 'Solo los que necesitan pedido' },
  { value: 'entries',     label: 'Entradas por fecha',    description: 'Materia prima recibida' },
  { value: 'exits',       label: 'Salidas por fecha',     description: 'Materia prima enviada' },
  { value: 'adjustments', label: 'Ajustes de inventario', description: 'Correcciones realizadas' },
  { value: 'movements',   label: 'Historial de movimientos', description: 'Todos los movimientos' },
]

export function Reports() {
  const [reportType, setReportType] = useState<ReportType>('stock')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [report, setReport]         = useState<ReportState | null>(null)

  async function generateReport() {
    const filters = { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    setReport({ type: reportType, data: [], loading: true })

    let data: unknown[] = []
    if (reportType === 'stock' || reportType === 'low_stock') {
      const all = await api.products.list()
      data = reportType === 'low_stock'
        ? all.filter(p => p.active && p.stock_current <= p.stock_minimum)
        : all.filter(p => p.active)
    } else if (reportType === 'entries')     { data = await api.entries.list(filters) }
    else if (reportType === 'exits')         { data = await api.exits.list(filters) }
    else if (reportType === 'adjustments')   { data = await api.adjustments.list(filters) }
    else if (reportType === 'movements')     { data = await api.movements.listRecent(200) }

    setReport({ type: reportType, data, loading: false })
  }

  const needsDates = ['entries', 'exits', 'adjustments', 'movements'].includes(reportType)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Reportes</h1>
          <p>Consultas e informes del inventario</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Configurar reporte" />
        <div className={styles.reportOptions}>
          {REPORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.reportOption} ${reportType === opt.value ? styles.selected : ''}`}
              onClick={() => setReportType(opt.value)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.description}</span>
            </button>
          ))}
        </div>

        {needsDates && (
          <div className={styles.dates}>
            <div className={styles.filterGroup}>
              <label>Fecha desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className={styles.filterGroup}>
              <label>Fecha hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className={styles.generateBtn}>
          <Button onClick={generateReport}>Generar reporte</Button>
          {report && !report.loading && (
            <span className={styles.resultCount}>{report.data.length} registro(s)</span>
          )}
        </div>
      </Card>

      {report && !report.loading && (
        <Card>
          <CardHeader title={REPORT_OPTIONS.find(o => o.value === report.type)?.label ?? ''} />
          <ReportTable type={report.type} data={report.data} />
        </Card>
      )}

      {report?.loading && (
        <div className={styles.loading}>Generando reporte...</div>
      )}
    </div>
  )
}

function ReportTable({ type, data }: { type: ReportType; data: unknown[] }) {
  if (data.length === 0) return <p className={styles.empty}>Sin datos para el período seleccionado</p>

  if (type === 'stock' || type === 'low_stock') {
    return (
      <Table<Product>
        columns={[
          { key: 'name',          header: 'Producto' },
          { key: 'category',      header: 'Categoría' },
          { key: 'stock_current', header: 'Stock actual', align: 'right',
            render: r => `${formatNumber(r.stock_current)} ${r.visual_unit}` },
          { key: 'stock_minimum', header: 'Mínimo', align: 'right',
            render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
          { key: 'status', header: 'Estado',
            render: r => <StockStatusBadge status={getStockStatus(r.stock_current, r.stock_minimum)} /> },
        ]}
        data={data as Product[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'entries') {
    return (
      <Table<PurchaseEntry>
        columns={[
          { key: 'date',           header: 'Fecha',      render: r => formatDate(r.date) },
          { key: 'invoice_number', header: 'Folio',      render: r => r.invoice_number ?? '—' },
          { key: 'supplier_name',  header: 'Proveedor',  render: r => r.supplier_name  ?? '—' },
          { key: 'responsible',    header: 'Responsable', render: r => r.responsible ?? '—' },
        ]}
        data={data as PurchaseEntry[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'exits') {
    return (
      <Table<Exit>
        columns={[
          { key: 'date',        header: 'Fecha',   render: r => formatDate(r.date) },
          { key: 'destination', header: 'Destino', render: r => DESTINATION_LABELS[r.destination] ?? r.destination },
          { key: 'responsible', header: 'Responsable', render: r => r.responsible ?? '—' },
          { key: 'notes',       header: 'Observaciones', render: r => r.notes ?? '—' },
        ]}
        data={data as Exit[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'adjustments') {
    return (
      <Table<StockAdjustment>
        columns={[
          { key: 'date',           header: 'Fecha',    render: r => formatDate(r.date) },
          { key: 'product_name',   header: 'Producto' },
          { key: 'stock_system',   header: 'Sistema',  align: 'right', render: r => formatNumber(r.stock_system) },
          { key: 'stock_physical', header: 'Físico',   align: 'right', render: r => formatNumber(r.stock_physical) },
          { key: 'difference',     header: 'Diferencia', align: 'right',
            render: r => <span style={{color: r.difference >= 0 ? 'var(--success)' : 'var(--danger)'}}>
              {r.difference >= 0 ? '+' : ''}{formatNumber(r.difference)}
            </span> },
          { key: 'reason',      header: 'Motivo',      render: r => r.reason ?? '—' },
        ]}
        data={data as StockAdjustment[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'movements') {
    return (
      <Table<InventoryMovement>
        columns={[
          { key: 'date',         header: 'Fecha',    render: r => formatDate(r.date) },
          { key: 'product_name', header: 'Producto' },
          { key: 'type',         header: 'Tipo',     render: r => MOVEMENT_TYPE_LABELS[r.type] ?? r.type },
          { key: 'quantity',     header: 'Cantidad', align: 'right',
            render: r => (
              <span style={{color: r.direction === 'in' ? 'var(--success)' : r.direction === 'out' ? 'var(--danger)' : 'var(--warning)'}}>
                {r.direction === 'out' ? '−' : '+'}{formatNumber(r.quantity)} {r.unit}
              </span>
            )},
          { key: 'notes', header: 'Notas', render: r => r.notes ?? '—' },
        ]}
        data={data as InventoryMovement[]}
        rowKey={r => r.id}
      />
    )
  }

  return null
}
