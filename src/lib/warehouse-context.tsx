'use client'
import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Warehouse } from '@/types'

interface WarehouseContextType {
  warehouse: Warehouse
  warehouses: Warehouse[]
  switchWarehouse: (id: number) => void
}

const WarehouseContext = createContext<WarehouseContextType | null>(null)

export function WarehouseProvider({
  children,
  warehouses,
  initialWarehouseId,
}: {
  children: React.ReactNode
  warehouses: Warehouse[]
  initialWarehouseId: number
}) {
  const initial = warehouses.find(w => w.id === initialWarehouseId) ?? warehouses[0]
  const [warehouse, setWarehouse] = useState<Warehouse>(initial)

  const switchWarehouse = useCallback((id: number) => {
    const w = warehouses.find(w => w.id === id)
    if (!w) return
    setWarehouse(w)
    document.cookie = `warehouse_id=${id}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }, [warehouses])

  return (
    <WarehouseContext.Provider value={{ warehouse, warehouses, switchWarehouse }}>
      {children}
    </WarehouseContext.Provider>
  )
}

export function useWarehouse(): WarehouseContextType {
  const ctx = useContext(WarehouseContext)
  if (!ctx) throw new Error('useWarehouse must be used inside WarehouseProvider')
  return ctx
}
