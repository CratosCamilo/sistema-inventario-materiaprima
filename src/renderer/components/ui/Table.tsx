import React from 'react'
import styles from './Table.module.css'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  emptyText?: string
  onRowClick?: (row: T) => void
}

export function Table<T>({ columns, data, rowKey, emptyText = 'Sin registros', onRowClick }: TableProps<T>) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align ?? 'left' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.empty}>{emptyText}</td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? styles.clickable : ''}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
