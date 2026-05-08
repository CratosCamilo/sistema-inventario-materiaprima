'use client'
import React, { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi, entriesApi, exitsApi, adjustmentsApi, movementsApi, auditApi } from '@/lib/api/client'
import { formatDate, formatNumber, getStockStatus, DESTINATION_LABELS, MOVEMENT_TYPE_LABELS } from '@/utils/formatters'
import type { Product, PurchaseEntry, Exit, StockAdjustment, InventoryMovement, AuditLogEntry } from '@/types'
import styles from './reportes.module.css'

type ReportType = 'stock' | 'entries' | 'exits' | 'low_stock' | 'adjustments' | 'movements' | 'audit'

const REPORT_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  { value: 'stock',       label: 'Stock actual',             description: 'Inventario completo con estados' },
  { value: 'low_stock',   label: 'Productos bajo mínimo',   description: 'Solo los que necesitan pedido' },
  { value: 'entries',     label: 'Entradas por fecha',       description: 'Materia prima recibida' },
  { value: 'exits',       label: 'Salidas por fecha',        description: 'Materia prima enviada' },
  { value: 'adjustments', label: 'Ajustes de inventario',   description: 'Correcciones realizadas' },
  { value: 'movements',   label: 'Historial de movimientos', description: 'Todos los movimientos' },
  { value: 'audit',       label: 'Ediciones de facturas',   description: 'Constancia de facturas editadas' },
]

export default function ReportesPage() {
  const { warehouse } = useWarehouse()
  const [reportType, setReportType] = useState<ReportType>('stock')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [data, setData]             = useState<unknown[]>([])
  const [activeType, setActiveType] = useState<ReportType | null>(null)
  const [loading, setLoading]       = useState(false)

  async function generateReport() {
    const filters = { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    setLoading(true)
    let result: unknown[] = []
    if (reportType === 'stock' || reportType === 'low_stock') {
      const all = await productsApi.list(warehouse.id)
      result = reportType === 'low_stock'
        ? all.filter(p => p.active && p.stock_current <= p.stock_minimum)
        : all.filter(p => p.active)
    } else if (reportType === 'entries')     { result = await entriesApi.list(warehouse.id, filters) }
    else if (reportType === 'exits')         { result = await exitsApi.list(warehouse.id, filters) }
    else if (reportType === 'adjustments')   { result = await adjustmentsApi.list(warehouse.id, filters) }
    else if (reportType === 'movements') { result = await movementsApi.list(warehouse.id, { date_from: filters.date_from, date_to: filters.date_to }) }
    else if (reportType === 'audit')     { result = await auditApi.listEntryEdits(filters) }
    setData(result); setActiveType(reportType); setLoading(false)
  }

  const needsDates = ['entries', 'exits', 'adjustments', 'movements', 'audit'].includes(reportType)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Reportes</h1>
          <p>Consultas e informes — {warehouse.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Configurar reporte" />
        <div className={styles.reportOptions}>
          {REPORT_OPTIONS.map(opt => (
            <button key={opt.value}
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
          <Button onClick={generateReport} loading={loading}>Generar reporte</Button>
          {activeType && !loading && (
            <span className={styles.resultCount}>{data.length} registro(s)</span>
          )}
        </div>
      </Card>

      {activeType && !loading && data.length > 0 && (
        <Card>
          <CardHeader title={REPORT_OPTIONS.find(o => o.value === activeType)?.label ?? ''} />
          <ReportTable type={activeType} data={data} />
        </Card>
      )}

      {activeType && !loading && data.length === 0 && (
        <div className={styles.empty}>Sin datos para el período seleccionado</div>
      )}
    </div>
  )
}

function ReportTable({ type, data }: { type: ReportType; data: unknown[] }) {
  if (type === 'stock' || type === 'low_stock') {
    return (
      <Table<Product>
        columns={[
          { key: 'name',          header: 'Producto' },
          { key: 'category',      header: 'Tipo',     render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
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
          { key: 'date',           header: 'Fecha',     render: r => formatDate(r.date) },
          { key: 'invoice_number', header: 'Folio',     render: r => r.invoice_number ?? '—' },
          { key: 'supplier_name',  header: 'Proveedor', render: r => r.supplier_name  ?? '—' },
          { key: 'responsible',    header: 'Responsable', render: r => r.responsible ?? '—' },
          { key: 'total',          header: 'Total',     align: 'right', render: r => r.total > 0 ? `$${formatNumber(r.total)}` : '—' },
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
          { key: 'product_name',   header: 'Producto', render: r => r.product_name ?? '—' },
          { key: 'stock_system',   header: 'Sistema',  align: 'right', render: r => formatNumber(r.stock_system) },
          { key: 'stock_physical', header: 'Físico',   align: 'right', render: r => formatNumber(r.stock_physical) },
          { key: 'difference',     header: 'Diferencia', align: 'right',
            render: r => (
              <span style={{color: r.difference >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                {r.difference >= 0 ? '+' : ''}{formatNumber(r.difference)}
              </span>
            )},
          { key: 'reason', header: 'Motivo', render: r => r.reason ?? '—' },
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
          { key: 'product_name', header: 'Producto', render: r => r.product_name ?? '—' },
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

  if (type === 'audit') {
    return (
      <Table<AuditLogEntry>
        columns={[
          { key: 'created_at',    header: 'Fecha edición', render: r => formatDate(r.created_at.slice(0,10)) },
          { key: 'invoice_number', header: 'Folio',        render: r => r.invoice_number ?? '—' },
          { key: 'entry_date',    header: 'Fecha factura', render: r => r.entry_date ? formatDate(r.entry_date) : '—' },
          { key: 'supplier_name', header: 'Proveedor',     render: r => r.supplier_name ?? '—' },
          { key: 'action',        header: 'Acción',        render: r => r.action === 'edit' ? 'Editada' : 'Anulada' },
          { key: 'user_name',     header: 'Editado por',   render: r => r.user_name },
        ]}
        data={data as AuditLogEntry[]}
        rowKey={r => r.id}
      />
    )
  }

  return null
}
