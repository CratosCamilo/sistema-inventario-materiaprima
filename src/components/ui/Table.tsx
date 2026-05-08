'use client'
import React, { useState, useEffect } from 'react'
import styles from './Table.module.css'

type Align = 'left' | 'center' | 'right'

interface Column<T> {
  key: string
  header: string
  align?: Align
  width?: string
  render?: (row: T) => React.ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  emptyText?: string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
  pageSize?: number
}

export function Table<T>({ columns, data, rowKey, emptyText = 'Sin datos', onRowClick, rowClassName, pageSize }: TableProps<T>) {
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [data])

  const totalPages = pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1
  const pagedData  = pageSize ? data.slice((page - 1) * pageSize, page * pageSize) : data

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={styles.th}
                style={{ textAlign: col.align ?? 'left', width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>{emptyText}</td>
            </tr>
          ) : (
            pagedData.map(row => (
              <tr
                key={rowKey(row)}
                className={`${styles.tr} ${onRowClick ? styles.clickable : ''} ${rowClassName ? rowClassName(row) : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={styles.td}
                    style={{ textAlign: col.align ?? 'left' }}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {pageSize && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            ← Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
            <span className={styles.pageCount}> ({data.length} registros)</span>
          </span>
          <button
            className={styles.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
