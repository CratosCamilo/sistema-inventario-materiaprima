'use client'
import React, { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StockStatusBadge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import { useWarehouse } from '@/lib/warehouse-context'
import { productsApi, entriesApi, adjustmentsApi, movementsApi, auditApi } from '@/lib/api/client'
import { formatDate, formatNumber, formatCurrency, getStockStatus, MOVEMENT_TYPE_LABELS, pluralizeUnit, toVisual, formatDualUnit } from '@/utils/formatters'
import { exportExcel, exportExcelMultiSheet } from '@/utils/exportExcel'
import { exportPdf, exportPdfMultiSection } from '@/utils/exportPdf'
import type { Product, PurchaseEntry, StockAdjustment, InventoryMovement, AuditLogEntry } from '@/types'
import styles from './reportes.module.css'

type ReportType = 'stock' | 'low_stock' | 'entries_balance' | 'exits_balance' | 'invoices' | 'adjustments_balance' | 'movements' | 'audit'

interface ProductBalance extends Product {
  total_base: number
  total_visual: number
}

const REPORT_OPTIONS: { value: ReportType; label: string; description: string }[] = [
  { value: 'stock',               label: 'Stock actual',            description: 'Inventario completo con estados' },
  { value: 'low_stock',           label: 'Productos bajo mínimo',   description: 'Solo los que necesitan pedido' },
  { value: 'entries_balance',     label: 'Entradas por producto',   description: 'Total recibido por producto en el período' },
  { value: 'exits_balance',       label: 'Salidas por producto',    description: 'Total enviado por producto en el período' },
  { value: 'invoices',            label: 'Facturas por fecha',      description: 'Facturas, folios y totales del período' },
  { value: 'adjustments_balance', label: 'Ajustes de inventario',   description: 'Ajuste neto por producto en el período' },
  { value: 'movements',           label: 'Historial de movimientos', description: 'Todos los movimientos registrados' },
  { value: 'audit',               label: 'Ediciones de facturas',   description: 'Constancia de facturas editadas' },
]

const needsDates = (t: ReportType) =>
  ['entries_balance', 'exits_balance', 'invoices', 'adjustments_balance', 'movements', 'audit'].includes(t)

function sortProducts<T extends Product>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    if (a.category === b.category) return a.name.localeCompare(b.name, 'es')
    return a.category === 'Produccion' ? -1 : 1
  })
}

export default function ReportesPage() {
  const { warehouse } = useWarehouse()
  const [reportType, setReportType]               = useState<ReportType>('stock')
  const [dateFrom, setDateFrom]                   = useState('')
  const [dateTo, setDateTo]                       = useState('')
  const [filterCategory, setFilterCategory]       = useState('')
  const [filterText, setFilterText]               = useState('')
  const [filterMovementType, setFilterMovementType] = useState('')
  const [data, setData]                           = useState<unknown[]>([])
  const [activeType, setActiveType]               = useState<ReportType | null>(null)
  const [loading, setLoading]                     = useState(false)

  function selectReportType(type: ReportType) {
    setReportType(type)
    setFilterCategory(''); setFilterText(''); setFilterMovementType('')
  }

  async function generateReport() {
    const filters = { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    setLoading(true)
    let result: unknown[] = []

    try {
      if (reportType === 'stock' || reportType === 'low_stock') {
        const all = await productsApi.list(warehouse.id)
        result = reportType === 'low_stock'
          ? all.filter(p => p.active && toVisual(p.stock_current, p.conversion_factor ?? 1) <= p.stock_minimum)
          : all.filter(p => p.active)
        if (filterCategory) result = result.filter(p => (p as Product).category === filterCategory)
        result = sortProducts(result as Product[])

      } else if (reportType === 'entries_balance' || reportType === 'exits_balance') {
        const movType = reportType === 'entries_balance' ? 'entry' : 'exit'
        const [allProducts, movements] = await Promise.all([
          productsApi.list(warehouse.id),
          movementsApi.list(warehouse.id, { type: movType, ...filters }),
        ])
        const totals = new Map<number, number>()
        for (const m of movements as InventoryMovement[]) {
          totals.set(m.product_id, (totals.get(m.product_id) ?? 0) + m.quantity)
        }
        result = sortProducts(
          (allProducts as Product[])
            .filter(p => p.active)
            .map(p => ({
              ...p,
              total_base:   totals.get(p.id) ?? 0,
              total_visual: toVisual(totals.get(p.id) ?? 0, p.conversion_factor ?? 1),
            }))
        )

      } else if (reportType === 'invoices') {
        result = await entriesApi.list(warehouse.id, filters)
        if (filterText) {
          const q = filterText.toLowerCase()
          result = result.filter(e => {
            const r = e as PurchaseEntry
            return (r.invoice_number ?? '').toLowerCase().includes(q) ||
                   (r.supplier_name  ?? '').toLowerCase().includes(q)
          })
        }

      } else if (reportType === 'adjustments_balance') {
        const [allProducts, adjs] = await Promise.all([
          productsApi.list(warehouse.id),
          adjustmentsApi.list(warehouse.id, filters),
        ])
        const totals = new Map<number, number>()
        for (const a of adjs as StockAdjustment[]) {
          totals.set(a.product_id, (totals.get(a.product_id) ?? 0) + a.difference)
        }
        result = sortProducts(
          (allProducts as Product[])
            .filter(p => p.active)
            .map(p => ({
              ...p,
              total_base:   totals.get(p.id) ?? 0,
              total_visual: toVisual(totals.get(p.id) ?? 0, p.conversion_factor ?? 1),
            }))
        )

      } else if (reportType === 'movements') {
        result = await movementsApi.list(warehouse.id, { ...filters })
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
    } finally {
      setData(result); setActiveType(reportType); setLoading(false)
    }
  }

  function handleExport() {
    if (!activeType || data.length === 0) return
    const today = new Date().toISOString().slice(0, 10)

    switch (activeType) {
      case 'stock':
      case 'low_stock': {
        const headers = ['Producto', 'Stock actual', 'Unidad', 'Mínimo', 'Estado']
        const makeRows = (prods: Product[]) => prods.map(p => {
          const vis = toVisual(p.stock_current, p.conversion_factor ?? 1)
          return [p.name, vis, p.visual_unit, p.stock_minimum,
            getStockStatus(vis, p.stock_minimum) === 'normal' ? 'Normal'
              : getStockStatus(vis, p.stock_minimum) === 'low' ? 'Bajo mínimo' : 'Crítico']
        })
        const prod = (data as Product[]).filter(p => p.category === 'Produccion')
        const emp  = (data as Product[]).filter(p => p.category === 'Empaques')
        exportExcelMultiSheet(`stock_${today}.xlsx`, [
          { name: 'Producción', headers, rows: makeRows(prod) },
          { name: 'Empaques',   headers, rows: makeRows(emp)  },
        ])
        break
      }
      case 'entries_balance':
      case 'exits_balance': {
        const colLabel = activeType === 'entries_balance' ? 'Total entrada' : 'Total salida'
        const fname    = activeType === 'entries_balance' ? 'entradas' : 'salidas'
        const headers  = ['Producto', colLabel, 'Unidad']
        const makeRows = (prods: ProductBalance[]) => prods.map(p => [
          p.name, p.total_visual, p.visual_unit,
        ])
        const prod = (data as ProductBalance[]).filter(p => p.category === 'Produccion')
        const emp  = (data as ProductBalance[]).filter(p => p.category === 'Empaques')
        exportExcelMultiSheet(`${fname}_${today}.xlsx`, [
          { name: 'Producción', headers, rows: makeRows(prod) },
          { name: 'Empaques',   headers, rows: makeRows(emp)  },
        ])
        break
      }
      case 'invoices': {
        const rows = (data as PurchaseEntry[]).map(e => [
          formatDate(e.date), e.invoice_number ?? '', e.supplier_name ?? '',
          e.responsible ?? '', e.total > 0 ? e.total : '',
        ])
        exportExcel(`facturas_${today}.xlsx`, ['Fecha', 'Folio', 'Proveedor', 'Responsable', 'Total'], rows)
        break
      }
      case 'adjustments_balance': {
        const headers  = ['Producto', 'Ajuste neto', 'Unidad']
        const makeRows = (prods: ProductBalance[]) => prods.map(p => [
          p.name,
          p.total_visual !== 0 ? p.total_visual : '—',
          p.visual_unit,
        ])
        const prod = (data as ProductBalance[]).filter(p => p.category === 'Produccion')
        const emp  = (data as ProductBalance[]).filter(p => p.category === 'Empaques')
        exportExcelMultiSheet(`ajustes_${today}.xlsx`, [
          { name: 'Producción', headers, rows: makeRows(prod) },
          { name: 'Empaques',   headers, rows: makeRows(emp)  },
        ])
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
    const today    = new Date().toISOString().slice(0, 10)
    const label    = REPORT_OPTIONS.find(o => o.value === activeType)?.label ?? ''
    const subtitle = `${warehouse.name} — ${today}`

    switch (activeType) {
      case 'stock':
      case 'low_stock': {
        const headers  = ['Producto', 'Presentación', 'Mínimo', 'Stock actual', 'Stock real']
        const makeRows = (prods: Product[]) => prods.map(p => {
          const vis = toVisual(p.stock_current, p.conversion_factor ?? 1)
          return [p.name, pluralizeUnit(p.visual_unit, vis), `${formatNumber(p.stock_minimum)} ${p.visual_unit}`, formatNumber(vis), '']
        })
        const prod = (data as Product[]).filter(p => p.category === 'Produccion')
        const emp  = (data as Product[]).filter(p => p.category === 'Empaques')
        await exportPdfMultiSection(label, subtitle, [
          { sectionTitle: 'Producción', headers, rows: makeRows(prod), options: { handwritingLastCol: true } },
          { sectionTitle: 'Empaques',   headers, rows: makeRows(emp),  options: { handwritingLastCol: true } },
        ], `${activeType}_${today}.pdf`)
        break
      }
      case 'entries_balance':
      case 'exits_balance': {
        const colLabel = activeType === 'entries_balance' ? 'Total entrada' : 'Total salida'
        const fname    = activeType === 'entries_balance' ? 'entradas' : 'salidas'
        const headers  = ['Producto', 'Unidad', colLabel]
        const makeRows = (prods: ProductBalance[]) => prods.map(p => [
          p.name, p.visual_unit,
          p.total_visual > 0 ? formatNumber(p.total_visual) : '—',
        ])
        const prod = (data as ProductBalance[]).filter(p => p.category === 'Produccion')
        const emp  = (data as ProductBalance[]).filter(p => p.category === 'Empaques')
        await exportPdfMultiSection(label, subtitle, [
          { sectionTitle: 'Producción', headers, rows: makeRows(prod) },
          { sectionTitle: 'Empaques',   headers, rows: makeRows(emp)  },
        ], `${fname}_${today}.pdf`)
        break
      }
      case 'invoices': {
        const rows = (data as PurchaseEntry[]).map(e => [
          formatDate(e.date), e.invoice_number ?? '', e.supplier_name ?? '',
          e.responsible ?? '', e.total > 0 ? `$${formatCurrency(e.total)}` : '',
        ])
        await exportPdf(label, subtitle, ['Fecha', 'Folio', 'Proveedor', 'Responsable', 'Total'], rows, `facturas_${today}.pdf`)
        break
      }
      case 'adjustments_balance': {
        const headers  = ['Producto', 'Unidad', 'Ajuste neto']
        const makeRows = (prods: ProductBalance[]) => prods.map(p => [
          p.name, p.visual_unit,
          p.total_visual !== 0
            ? (p.total_visual > 0 ? `+${formatNumber(p.total_visual)}` : formatNumber(p.total_visual))
            : '—',
        ])
        const prod = (data as ProductBalance[]).filter(p => p.category === 'Produccion')
        const emp  = (data as ProductBalance[]).filter(p => p.category === 'Empaques')
        await exportPdfMultiSection(label, subtitle, [
          { sectionTitle: 'Producción', headers, rows: makeRows(prod) },
          { sectionTitle: 'Empaques',   headers, rows: makeRows(emp)  },
        ], `ajustes_${today}.pdf`)
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

        <div className={styles.filtersRow}>
          {needsDates(reportType) && (
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

          {reportType === 'invoices' && (
            <div className={styles.filterGroup}>
              <label>Folio / Proveedor</label>
              <input type="text" placeholder="Buscar..." value={filterText}
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
          { key: 'category',      header: 'Tipo', render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
          { key: 'stock_current', header: 'Stock actual', align: 'right',
            render: r => formatDualUnit(r.stock_current, r.base_unit, r.visual_unit, r.conversion_factor ?? 1) },
          { key: 'stock_minimum', header: 'Mínimo', align: 'right',
            render: r => `${formatNumber(r.stock_minimum)} ${r.visual_unit}` },
          { key: 'status', header: 'Estado',
            render: r => <StockStatusBadge status={getStockStatus(toVisual(r.stock_current, r.conversion_factor ?? 1), r.stock_minimum)} /> },
        ]}
        data={data as Product[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'entries_balance' || type === 'exits_balance') {
    const colLabel = type === 'entries_balance' ? 'Total entrada' : 'Total salida'
    const color    = type === 'entries_balance' ? 'var(--success)' : 'var(--danger)'
    return (
      <Table<ProductBalance>
        columns={[
          { key: 'name',     header: 'Producto' },
          { key: 'category', header: 'Tipo', render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
          { key: 'total_visual', header: colLabel, align: 'right',
            render: r => r.total_visual > 0
              ? <span style={{ color, fontWeight: 700 }}>{formatNumber(r.total_visual)} {r.visual_unit}</span>
              : <span style={{ color: 'var(--text-muted)' }}>—</span> },
        ]}
        data={data as ProductBalance[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'invoices') {
    return (
      <Table<PurchaseEntry>
        columns={[
          { key: 'date',           header: 'Fecha',       render: r => formatDate(r.date) },
          { key: 'invoice_number', header: 'Folio',       render: r => r.invoice_number ?? '—' },
          { key: 'supplier_name',  header: 'Proveedor',   render: r => r.supplier_name  ?? '—' },
          { key: 'responsible',    header: 'Responsable', render: r => r.responsible    ?? '—' },
          { key: 'total', header: 'Total', align: 'right',
            render: r => r.total > 0 ? `$${formatNumber(r.total)}` : '—' },
        ]}
        data={data as PurchaseEntry[]}
        rowKey={r => r.id}
      />
    )
  }

  if (type === 'adjustments_balance') {
    return (
      <Table<ProductBalance>
        columns={[
          { key: 'name',     header: 'Producto' },
          { key: 'category', header: 'Tipo', render: r => r.category === 'Produccion' ? 'Producción' : 'Empaques' },
          { key: 'total_visual', header: 'Ajuste neto', align: 'right',
            render: r => {
              if (r.total_visual === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>
              const sign  = r.total_visual > 0 ? '+' : ''
              const color = r.total_visual > 0 ? 'var(--success)' : 'var(--danger)'
              return <span style={{ color, fontWeight: 700 }}>{sign}{formatNumber(r.total_visual)} {r.visual_unit}</span>
            }},
        ]}
        data={data as ProductBalance[]}
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
              <span style={{ color: r.direction === 'in' ? 'var(--success)' : r.direction === 'out' ? 'var(--danger)' : 'var(--warning)' }}>
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
          { key: 'created_at',     header: 'Fecha edición',  render: r => formatDate(r.created_at.slice(0, 10)) },
          { key: 'invoice_number', header: 'Folio',          render: r => r.invoice_number ?? '—' },
          { key: 'entry_date',     header: 'Fecha factura',  render: r => r.entry_date ? formatDate(r.entry_date) : '—' },
          { key: 'supplier_name',  header: 'Proveedor',      render: r => r.supplier_name ?? '—' },
          { key: 'action',         header: 'Acción',         render: r => r.action === 'edit' ? 'Editada' : 'Anulada' },
          { key: 'user_name',      header: 'Editado por',    render: r => r.user_name },
        ]}
        data={data as AuditLogEntry[]}
        rowKey={r => r.id}
      />
    )
  }

  return null
}
