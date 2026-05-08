# PROGRESS.md — Estado del proyecto

Última actualización: 2026-05-07

---

## Estado general

```
Fase actual:  Base Electron construida — pendiente migración a web
Próximo paso: Migrar arquitectura a app web con DB en la nube
```

---

## Infraestructura y configuración

- [x] `package.json` con scripts dev/build/dist
- [x] `tsconfig.json` (renderer React)
- [x] `tsconfig.electron.json` (main process)
- [x] `vite.config.ts`
- [x] `.gitignore`
- [x] `better-sqlite3` v11 + `@electron/rebuild` en postinstall (compila contra Electron, no Node del sistema)
- [ ] Migración a app web (cambio de dirección aprobado por cliente)
- [ ] Selección de base de datos cloud (candidatos: Turso, Supabase, PlanetScale)
- [ ] Backend web (API REST / tRPC / Server Actions — por decidir)

---

## Base de datos

- [x] Tabla `products` (con `initial_stock_loaded`, `stock_current`, `active`, `updated_at`)
- [x] Tabla `inventory_movements` (type: initial/entry/exit/adjustment | direction: in/out/adjustment)
- [x] Tabla `purchase_entries` (con `invoice_number` para verificación de facturas, `status`)
- [x] Tabla `purchase_entry_items`
- [x] Tabla `exits` (con `destination`, `status`)
- [x] Tabla `exit_items`
- [x] Tabla `stock_adjustments` (con `status`)
- [x] Tabla `suppliers`
- [x] Tabla `settings` (clave-valor)
- [x] Índices en movements (product_id, date, type)
- [x] Migrations idempotentes (CREATE TABLE IF NOT EXISTS)
- [x] Seed con 9 productos demo + entradas + salidas de ejemplo

---

## Servicios / lógica de negocio

- [x] `productService` — CRUD completo, `setInitialStock` con protección de duplicados
- [x] `entryService` — crear entrada con ítems, actualiza stock en transacción
- [x] `exitService` — crear salida con validación de stock suficiente, transacción
- [x] `adjustmentService` — ajuste con comparación sistema vs físico, dirección automática
- [x] `movementService` — historial por producto, recientes globales
- [x] `dashboardService` — métricas, alertas, últimas entradas/salidas
- [x] `settingsService` — get/set/getAll por clave
- [x] `supplierService` — CRUD básico
- [ ] Servicio de reportes avanzado (actualmente las páginas llaman directamente a los demás services)
- [ ] Exportación PDF/Excel (estructura lista, sin implementar)
- [ ] Anulación de entradas/salidas (campo `status` listo, lógica pendiente)

---

## IPC / API layer (Electron)

- [x] `productHandlers.ts`
- [x] `entryHandlers.ts`
- [x] `exitHandlers.ts`
- [x] `adjustmentHandlers.ts`
- [x] `dashboardHandlers.ts` (incluye settings y suppliers)
- [x] `preload.ts` con contextBridge completo (`window.electronAPI`)
- [x] `src/renderer/api/index.ts` — wrapper limpio del IPC para componentes React
- [ ] Migrar `api/index.ts` a llamadas HTTP cuando se implemente el backend web

---

## Frontend — Componentes UI

- [x] `Button` (variantes: primary, secondary, danger, ghost | tamaños: sm, md, lg | loading state)
- [x] `Card` + `CardHeader`
- [x] `Badge` + `StockStatusBadge`
- [x] `Modal` (tamaños sm/md/lg, cierra con Escape, cierra al click en overlay)
- [x] `Table` (genérico con tipos, columnas con render custom, click en fila)
- [ ] `Input` con label (actualmente inputs crudos en formularios)
- [ ] `Select` con label
- [ ] `Toast` / notificaciones de éxito/error
- [ ] `Skeleton` / loading states más elaborados
- [ ] `Pagination` para tablas largas
- [ ] `DateRangePicker` dedicado

---

## Frontend — Layout

- [x] `Sidebar` con navegación completa y estado activo
- [x] `Layout` con sidebar + área de contenido con scroll
- [ ] Topbar / header con nombre de empresa desde settings
- [ ] Breadcrumbs
- [ ] Modo responsive / tablet (estructura preparada, no implementado)

---

## Frontend — Páginas

### Dashboard
- [x] Métricas: total productos, stock bajo, stock crítico, con alertas
- [x] Tabla de alertas con StockStatusBadge
- [x] Tabla de últimas entradas
- [x] Tabla de últimas salidas
- [ ] Gráfico de tendencia de movimientos (barras o línea)
- [ ] Indicador de última actualización

### Productos
- [x] Lista con búsqueda y filtro por categoría
- [x] Filtro "mostrar inactivos"
- [x] Tabla con stock actual, mínimo y estado visual
- [x] Modal crear producto (todos los campos)
- [x] Modal editar producto
- [x] Desactivar producto (con confirmación)
- [ ] Vista de historial de movimientos por producto
- [ ] Activar producto desactivado
- [ ] Importar productos desde CSV

### Entradas
- [x] Lista con filtros de fecha
- [x] Modal registrar entrada con múltiples productos
- [x] Auto-fill de unidad al seleccionar producto
- [x] Modal detalle de entrada
- [ ] Proveedor desde selector (actualmente campo libre)
- [ ] Anular entrada

### Salidas
- [x] Lista con filtros de fecha
- [x] Modal registrar salida con múltiples productos
- [x] Muestra stock disponible al seleccionar producto
- [x] Validación de stock insuficiente (en backend)
- [x] Modal detalle de salida
- [ ] Anular salida

### Stock actual
- [x] Cards de resumen clickeables (filtran la tabla)
- [x] Tabla completa con diferencia vs mínimo coloreada
- [x] Filtro por estado (todos / normal / bajo / crítico)
- [x] Búsqueda por nombre / categoría
- [ ] Exportar vista actual

### Ajustes de inventario
- [x] Lista con filtros de fecha
- [x] Modal con comparador visual (sistema → físico → diferencia)
- [x] Auto-fill del stock actual al seleccionar producto
- [x] Diferencia con color (verde positivo / rojo negativo)
- [ ] Vista de historial de ajustes por producto

### Inventario inicial
- [ ] Página/modal dedicado para cargar stock inicial de todos los productos de una vez
  (actualmente solo existe a nivel de service/IPC, sin UI)

### Reportes
- [x] Selector visual de tipo de reporte
- [x] Filtros de fecha para reportes que lo necesitan
- [x] Reporte: stock actual
- [x] Reporte: productos bajo mínimo
- [x] Reporte: entradas por fecha
- [x] Reporte: salidas por fecha
- [x] Reporte: ajustes por fecha
- [x] Reporte: historial de movimientos
- [ ] Exportar a Excel
- [ ] Exportar a PDF
- [ ] Reporte de productos por categoría
- [ ] Gráficos visuales en reportes

### Configuración
- [x] Nombre de empresa (guardado en settings)
- [x] Información del sistema (versión, DB, modo)
- [ ] Gestión de proveedores desde UI
- [ ] Gestión de categorías personalizadas
- [ ] Backup / exportar base de datos
- [ ] Restaurar desde backup

---

## Autenticación y usuarios (v2)

- [ ] Login (usuario + contraseña)
- [ ] Tipos de usuario (admin / operador / solo lectura — por definir con cliente)
- [ ] División de dos bodegas
- [ ] Control de acceso por bodega/usuario

---

## Migración a web (siguiente gran paso)

- [ ] Decidir stack backend (candidatos: Next.js fullstack, Express + React, Hono + React)
- [ ] Decidir base de datos cloud (candidatos: Turso, Supabase, PlanetScale/Neon)
- [ ] Migrar schema SQL a nuevo ORM/driver (Drizzle, Prisma, o nativo)
- [ ] Crear API endpoints / server actions equivalentes a los services actuales
- [ ] Reemplazar `window.electronAPI` → `fetch` / SDK del backend
- [ ] Cambiar `HashRouter` → `BrowserRouter`
- [ ] Deploy del frontend
- [ ] Deploy del backend
- [ ] Configurar autenticación (JWT / NextAuth / Lucia)
- [ ] Eliminar código Electron (src/main/, preload, electron deps)
