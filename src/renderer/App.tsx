import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard }   from './pages/Dashboard'
import { Products }    from './pages/Products'
import { Entries }     from './pages/Entries'
import { Exits }       from './pages/Exits'
import { Stock }       from './pages/Stock'
import { Adjustments } from './pages/Adjustments'
import { Reports }     from './pages/Reports'
import { Settings }    from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"              element={<Dashboard />} />
        <Route path="/productos"     element={<Products />} />
        <Route path="/entradas"      element={<Entries />} />
        <Route path="/salidas"       element={<Exits />} />
        <Route path="/stock"         element={<Stock />} />
        <Route path="/ajustes"       element={<Adjustments />} />
        <Route path="/reportes"      element={<Reports />} />
        <Route path="/configuracion" element={<Settings />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
