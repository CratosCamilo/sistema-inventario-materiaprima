'use client'
import React, { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi, entriesApi, exitsApi, adjustmentsApi, movementsApi, auditApi } from '@/lib/api/client'
import { formatDate, formatNumber, formatCurrency, getStockStatus, DESTINATION_LABELS, MOVEMENT_TYPE_LABELS, pluralizeUnit } from '@/utils/formatters'
import { exportExcel } from '@/utils/exportExcel'
import { exportPdf } from '@/utils/exportPdf'
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
  const [filterCategory, setFilterCategory]         = useState('')
  const [filterText, setFilterText]                 = useState('')
  const [filterDestination, setFilterDestination]   = useState('')
  const [filterMovementType, setFilterMovementType] = useState('')
  const [data, setData]             = useState<unknown[]>([])
  const [activeType, setActiveType] = useState<ReportType | null>(null)
  const [loading, setLoading]       = useState(false)

  function selectReportType(type: ReportType) {
    setReportType(type)
    setFilterCategory('')
    setFilterText('')
    setFilterDestination('')
    setFilterMovementType('')
  }

  async function generateReport() {
    const filters = { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    setLoading(true)
    let result: unknown[] = []

    if (reportType === 'stock' || reportType === 'low_stock') {
      const all = await productsApi.list(warehouse.id)
      result = reportType === 'low_stock'
        ? all.filter(p => p.active && p.stock_current <= p.stock_minimum)
        : all.filter(p => p.active)
      if (filterCategory) result = result.filter(p => (p as Product).category === filterCategory)

    } else if (reportType === 'entries') {
      result = await entriesApi.list(warehouse.id, filters)
      if (filterText) {
        const q = filterText.toLowerCase()
        result = result.filter(e => {
          const r = e as PurchaseEntry
          return (r.invoice_number ?? '').toLowerCase().includes(q) ||
                 (r.supplier_name  ?? '').toLowerCase().includes(q)
        })
      }

    } else if (reportType === 'exits') {
      result = await exitsApi.list(warehouse.id, filters)
      if (filterDestination) result = result.filter(e => (e as Exit).destination === filterDestination)

    } else if (reportType === 'adjustments') {
      result = await adjustmentsApi.list(warehouse.id, filters)
      if (filterText) {
        const q = filterText.toLowerCase()
        result = result.filter(a => (a as StockAdjustment).product_name?.toLowerCase().includes(q))
      }

    } else if (reportType === 'movements') {
      result = await movementsApi.list(warehouse.id, { date_from: filters.date_from, date_to: filters.date_to })
      if (filterMovementType) result = result.filter(m => (m as InventoryMovement).type === filterMovementType)

    } else if (reportType === 'audit') {
      result = await auditApi.listEntryEdits(filters)
      if (filterText) {
        const q = filterText.toLowerCase()
        result = result.filter(a => {
          const r = a as AuditLogEntry
          return (r.invoice_number ?? '').toLowerCase().includes(q) ||
                 (r.supplier_name  ?? '').toLowerCase().includes(q) ||
                 r.user_name.toLowerCase().includes(q)
        })
      }
    }

    setData(result); setActiveType(reportType); setLoading(false)
  }

  function handleExport() {
    if (!activeType || data.length === 0) return
    const today = new Date().toISOString().slice(0, 10)

    switch (activeType) {
      case 'stock':
      case 'low_stock': {
        const rows = (data as Product[]).map(p => [
          p.name,
          p.category === 'Produccion' ? 'Producción' : 'Empaques',
          p.stock_current,
          p.visual_unit,
          p.stock_minimum,
          getStockStatus(p.stock_current, p.stock_minimum) === 'normal' ? 'Normal'
            : getStockStatus(p.stock_current, p.stock_minimum) === 'low' ? 'Bajo mínimo' : 'Crítico',
        ])
        exportExcel(`stock_${today}.xlsx`, ['Producto', 'Categoría', 'Stock actual', 'Unidad', 'Mínimo', 'Estado'], rows)
        break
      }
      case 'entries': {
        const rows = (data as PurchaseEntry[]).map(e => [
          formatDate(e.date), e.invoice_number ?? '', e.supplier_name ?? '',
          e.responsible ?? '', e.total > 0 ? e.total : '',
        ])
        exportExcel(`entradas_${today}.xlsx`, ['Fecha', 'Folio', 'Proveedor', 'Responsable', 'Total'], rows)
        break
      }
      case 'exits': {
        const rows = (data as Exit[]).map(e => [
          formatDate(e.date), DESTINATION_LABELS[e.destination] ?? e.destination,
          e.responsible ?? '', e.notes ?? '',
        ])
        exportExcel(`salidas_${today}.xlsx`, ['Fecha', 'Destino', 'Responsable', 'Observaciones'], rows)
        break
      }
      case 'adjustments': {
        const rows = (data as StockAdjustment[]).map(a => [
          formatDate(a.date), a.product_name ?? '', a.stock_system,
          a.stock_physical, a.difference, a.reason ?? '',
        ])
        exportExcel(`ajustes_${today}.xlsx`, ['Fecha', 'Producto', 'Stock sistema', 'Stock físico', 'Diferencia', 'Motivo'], rows)
        break
      }
      case 'movements': {
        const rows = (data as InventoryMovement[]).map(m => [
          formatDate(m.date), m.product_name ?? '',
          MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
          m.direction === 'in' ? 'Entrada' : m.direction === 'out' ? 'Salida' : 'Ajuste',
          m.quantity, m.unit, m.notes ?? '',
        ])
        exportExcel(`movimientos_${today}.xlsx`, ['Fecha', 'Producto', 'Tipo', 'Dirección', 'Cantidad', 'Unidad', 'Notas'], rows)
        break
      }
      case 'audit': {
        const rows = (data as AuditLogEntry[]).map(a => [
          formatDate(a.created_at.slice(0, 10)), a.invoice_number ?? '',
          a.entry_date ? formatDate(a.entry_date) : '',
          a.supplier_name ?? '',
          a.action === 'edit' ? 'Editada' : 'Anulada',
          a.user_name,
        ])
        exportExcel(`ediciones_facturas_${today}.xlsx`, ['Fecha edición', 'Folio', 'Fecha factura', 'Proveedor', 'Acción', 'Editado por'], rows)
        break
      }
    }
  }

  async function handleExportPdf() {
    if (!activeType || data.length === 0) return
    const today = new Date().toISOString().slice(0, 10)
    const label = REPORT_OPTIONS.find(o => o.value === activeType)?.label ?? ''
    const subtitle = `${warehouse.name} — ${today}`

    switch (activeType) {
      case 'stock':
      case 'low_stock': {
        const rows = (data as Product[]).map(p => [
          p.name,
          formatNumber(p.stock_current),
          pluralizeUnit(p.visual_unit, p.stock_current),
          `${formatNumber(p.stock_minimum)} ${p.visual_unit}`,
          getStockStatus(p.stock_current, p.stock_minimum) === 'normal' ? 'Normal'
            : getStockStatus(p.stock_current, p.stock_minimum) === 'low' ? 'Bajo mínimo' : 'Crítico',
        ])
        await exportPdf(label, subtitle, ['Producto', 'Stock actual', 'Presentación', 'Mínimo', 'Estado'], rows, `${activeType}_${today}.pdf`)
        break
      }
      case 'entries': {
        const rows = (data as PurchaseEntry[]).map(e => [
          formatDate(e.date), e.invoice_number ?? '', e.supplier_name ?? '',
          e.responsible ?? '', e.total > 0 ? `$${formatCurrency(e.total)}` : '',
        ])
        await exportPdf(label, subtitle, ['Fecha', 'Folio', 'Proveedor', 'Responsable', 'Total'], rows, `entradas_${today}.pdf`)
        break
      }
      case 'exits': {
        const rows = (data as Exit[]).map(e => [
          formatDate(e.date), DESTINATION_LABELS[e.destination] ?? e.destination,
          e.responsible ?? '', e.notes ?? '',
        ])
        await exportPdf(label, subtitle, ['Fecha', 'Destino', 'Responsable', 'Observaciones'], rows, `salidas_${today}.pdf`)
        break
      }
      case 'adjustments': {
        const rows = (data as StockAdjustment[]).map(a => [
          formatDate(a.date), a.product_name ?? '', a.stock_system,
          a.stock_physical, a.difference, a.reason ?? '',
        ])
        await exportPdf(label, subtitle, ['Fecha', 'Producto', 'Stock sistema', 'Stock físico', 'Diferencia', 'Motivo'], rows, `ajustes_${today}.pdf`)
        break
      }
      case 'movements': {
        const rows = (data as InventoryMovement[]).map(m => [
          formatDate(m.date), m.product_name ?? '',
          MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
          m.direction === 'in' ? 'Entrada' : m.direction === 'out' ? 'Salida' : 'Ajuste',
          `${m.quantity} ${m.unit}`, m.notes ?? '',
        ])
        await exportPdf(label, subtitle, ['Fecha', 'Producto', 'Tipo', 'Dirección', 'Cantidad', 'Notas'], rows, `movimientos_${today}.pdf`)
        break
      }
      case 'audit': {
        const rows = (data as AuditLogEntry[]).map(a => [
          formatDate(a.created_at.slice(0, 10)), a.invoice_number ?? '',
          a.entry_date ? formatDate(a.entry_date) : '',
          a.supplier_name ?? '',
          a.action === 'edit' ? 'Editada' : 'Anulada',
          a.user_name,
        ])
        await exportPdf(label, subtitle, ['Fecha edición', 'Folio', 'Fecha factura', 'Proveedor', 'Acción', 'Editado por'], rows, `ediciones_facturas_${today}.pdf`)
        break
      }
    }
  }

  const needsDates      = ['entries', 'exits', 'adjustments', 'movements', 'audit'].includes(reportType)
  const hasExtraFilters = true

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
              onClick={() => selectReportType(opt.value)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.description}</span>
            </button>
          ))}
        </div>

        {(needsDates || hasExtraFilters) && (
          <div className={styles.filtersRow}>
            {needsDates && (
              <>
                <div className={styles.filterGroup}>
                  <label>Fecha desde</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className={styles.filterGroup}>
                  <label>Fecha hasta</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </>
            )}

            {(reportType === 'stock' || reportType === 'low_stock') && (
              <div className={styles.filterGroup}>
                <label>Categoría</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="Produccion">Producción</option>
                  <option value="Empaques">Empaques</option>
                </select>
              </div>
            )}

            {(reportType === 'entries') && (
              <div className={styles.filterGroup}>
                <label>Folio / Proveedor</label>
                <input type="text" placeholder="Buscar..." value={filterText}
                  onChange={e => setFilterText(e.target.value)} style={{ width: 180 }} />
              </div>
            )}

            {reportType === 'exits' && (
              <div className={styles.filterGroup}>
                <label>Destino</label>
                <select value={filterDestination} onChange={e => setFilterDestination(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="produccion">Producción</option>
                  <option value="empaque">Empaque</option>
                  <option value="punto_venta">Punto de venta</option>
                  <option value="otra">Otra</option>
                </select>
              </div>
            )}

            {reportType === 'adjustments' && (
              <div className={styles.filterGroup}>
                <label>Producto</label>
                <input type="text" placeholder="Buscar producto..." value={filterText}
                  onChange={e => setFilterText(e.target.value)} style={{ width: 180 }} />
              </div>
            )}

            {reportType === 'movements' && (
              <div className={styles.filterGroup}>
                <label>Tipo de movimiento</label>
                <select value={filterMovementType} onChange={e => setFilterMovementType(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="initial">Inventario inicial</option>
                  <option value="entry">Entrada</option>
                  <option value="exit">Salida</option>
                  <option value="adjustment">Ajuste</option>
                </select>
              </div>
            )}

            {reportType === 'audit' && (
              <div className={styles.filterGroup}>
                <label>Folio / Proveedor / Usuario</label>
                <input type="text" placeholder="Buscar..." value={filterText}
                  onChange={e => setFilterText(e.target.value)} style={{ width: 200 }} />
              </div>
            )}
          </div>
        )}

        <div className={styles.generateBtn}>
          <Button onClick={generateReport} loading={loading}>Generar reporte</Button>
          {activeType && !loading && (
            <span className={styles.resultCount}>{data.length} registro(s)</span>
          )}
          {activeType && !loading && data.length > 0 && (
            <>
              <Button variant="secondary" size="sm" onClick={handleExport}>↓ Excel</Button>
              <Button variant="secondary" size="sm" onClick={handleExportPdf}>↓ PDF</Button>
            </>
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
