'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './Combobox.module.css'

export interface ComboboxOption {
  value: number | string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: number | string | ''
  onChange: (value: number | string) => void
  placeholder?: string
}

export function Combobox({ options, value, onChange, placeholder = 'Seleccionar...' }: ComboboxProps) {
  const [query, setQuery]             = useState('')
  const [open, setOpen]               = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const [rect, setRect]               = useState<DOMRect | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  const selectedLabel = value !== '' ? (options.find(o => o.value === value)?.label ?? '') : ''
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const updateRect = useCallback(() => {
    if (containerRef.current) setRect(containerRef.current.getBoundingClientRect())
  }, [])

  const openDropdown = useCallback(() => {
    updateRect()
    setOpen(true)
    setQuery('')
    setHighlighted(0)
  }, [updateRect])

  const closeDropdown = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  // Cierra al hacer clic fuera (funciona con portal)
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (
        !containerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open, closeDropdown])

  // Actualiza posición si la modal hace scroll
  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [open, updateRect])

  function select(opt: ComboboxOption) {
    onChange(opt.value)
    closeDropdown()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { openDropdown(); return }
      setHighlighted(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlighted]) select(filtered[highlighted])
    } else if (e.key === 'Escape') {
      closeDropdown()
    }
  }

  const portalStyle: React.CSSProperties = rect
    ? { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }
    : { position: 'fixed', zIndex: 9999 }

  return (
    <div ref={containerRef} className={styles.container}>
      <input
        className={styles.input}
        value={open ? query : selectedLabel}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); if (!open) openDropdown(); setHighlighted(0) }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      <span className={styles.arrow}>▾</span>

      {open && typeof window !== 'undefined' && createPortal(
        <div ref={dropdownRef} className={styles.dropdown} style={portalStyle}>
          {filtered.length === 0
            ? <div className={styles.empty}>Sin resultados</div>
            : filtered.map((opt, i) => (
              <div
                key={opt.value}
                className={`${styles.option} ${i === highlighted ? styles.highlighted : ''} ${opt.value === value ? styles.selected : ''}`}
                onMouseDown={e => { e.preventDefault(); select(opt) }}
                onMouseEnter={() => setHighlighted(i)}
              >
                {opt.label}
              </div>
            ))
          }
        </div>,
        document.body
      )}
    </div>
  )
}
