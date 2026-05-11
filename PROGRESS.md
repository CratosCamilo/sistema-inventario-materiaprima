# PROGRESS.md — Estado del proyecto

Última actualización: 2026-05-11

---

## Estado general

```
Fase actual:  v2 completa — app web Next.js con auth, bodegas y auditoría
Stack:        Next.js 14 App Router + Drizzle ORM + SQLite/Turso + JWT
```

---

## Infraestructura y configuración

- [x] `package.json` Next.js 14 (Electron eliminado completamente)
- [x] `tsconfig.json` con `target: ES2017`
- [x] `next.config.mjs`
- [x] `drizzle.config.ts`
- [x] `.env.example` con `DATABASE_URL`, `JWT_SECRET`, `ALLOW_SEED`
- [x] `.gitignore` (incluye `local.db`, `.env.local`)
- [x] `npm install --ignore-scripts` documentado (evita error de DLLs de Electron en cache)

---

## Base de datos

- [x] Schema Drizzle completo (`src/lib/db/schema.ts`)
  - `users` (roles: admin, operador, entradas, salidas)
  - `warehouses` (Panadería id=1, Pastelería id=2)
  - `products` (stock_current, stock_minimum, initial_stock_loaded, active, category)
  - `inventory_movements` (type, direction, warehouse_id)
  - `purchase_entries` (invoice_number, subtotal, iva_total, total, edited_by, status)
  - `purchase_entry_items` (applies_iva, iva_rate, line_total, iva_amount)
  - `exits` + `exit_items`
  - `stock_adjustments`
  - `audit_log` (entity_type, entity_id, action, user_id, changes JSON)
  - `settings` (clave-valor)
- [x] Conexión dual: SQLite local dev / Turso prod (`src/lib/db/index.ts`)
- [x] Seed con admin, 2 bodegas, productos demo (`src/lib/db/seed.ts`)
- [x] Ruta pública `/api/setup` para ejecutar seed desde el navegador en dev

---

## Servicios (src/lib/services/)

- [x] `productService` — CRUD, deactivate, setInitialStock
- [x] `entryService` — crear/editar con IVA por línea, auditoría en audit_log, filtro por folio
- [x] `exitService` — crear con validación de stock suficiente
- [x] `adjustmentService` — ajuste físico vs sistema, dirección automática
- [x] `movementService` — historial por filtros
- [x] `dashboardService` — métricas, alertas, últimos movimientos
- [x] `settingsService` — upsert clave-valor
- [x] `userService` — CRUD, nunca expone password_hash

---

## API Routes (src/app/api/)

- [x] `POST /api/auth/login` — valida credenciales, emite JWT cookie
- [x] `POST /api/auth/logout` — borra cookie
- [x] `GET/POST /api/products` — listar / crear
- [x] `GET/PUT/DELETE /api/products/[id]`
- [x] `POST /api/products/initial-stock`
- [x] `GET/POST /api/entries` — listar (filtros fecha + folio) / crear
- [x] `GET/PUT/DELETE /api/entries/[id]`
- [x] `GET/POST /api/exits`
- [x] `GET /api/exits/[id]`
- [x] `GET/POST /api/adjustments`
- [x] `GET /api/movements`
- [x] `GET /api/dashboard`
- [x] `GET/PUT /api/settings`
- [x] `GET/POST /api/users`
- [x] `GET/PUT /api/users/[id]`
- [x] `GET /api/warehouses`
- [x] `GET /api/audit` — ediciones de facturas con join a purchase_entries
- [x] `GET/POST /api/setup` — seed público en dev

---

## Auth y middleware

- [x] JWT con `jose` (signToken, verifyToken, getSession)
- [x] bcryptjs para hashing de contraseñas
- [x] Cookie httpOnly `session` (7 días)
- [x] `src/middleware.ts` — protege todas las rutas excepto login y setup
- [x] RBAC en cada API route
- [x] `SessionProvider` + `useSession()` hook
- [x] Página `/login` con form y manejo de error

---

## Frontend — Componentes UI (src/components/ui/)

- [x] `Button` (variantes: primary, secondary, danger, ghost | tamaños: sm, md, lg | loading state)
- [x] `Card` + `CardHeader`
- [x] `Badge` + `StockStatusBadge`
- [x] `Modal` (tamaños sm/md/lg/xl, cierra con Escape, click en overlay)
- [x] `Table` (genérico tipado, columnas con render custom, click en fila, texto uppercase)
- [x] `Combobox` — select con búsqueda, portal para dropdown, filtro por texto, teclado

---

## Frontend — Layout (src/components/layout/)

- [x] `Sidebar` con navegación, estado activo, selector de bodega, cerrar sesión
- [x] `AppProviders` — SessionProvider + WarehouseProvider
- [x] `WarehouseProvider` — bodega activa persistida en cookie
- [x] Layout con sidebar + área de contenido con scroll

---

## Frontend — Páginas

### Stock actual (`/`)
- [x] Cards de resumen clickeables (filtran por estado)
- [x] Tabla con diferencia vs mínimo coloreada
- [x] Filtros: búsqueda por nombre + categoría
- [x] Columna Tipo eliminada (solo Producto, Stock, Mínimo, Diferencia, Estado)
- [x] Botones **↓ Excel** y **↓ PDF conteo** en el encabezado — exportan la vista filtrada activa
  - El PDF incluye columna "Stock real" vacía (cuadro con borde) para llenar a lápiz en conteo físico

### Resumen / Dashboard (`/resumen`)
- [x] Métricas: total, normal, bajo, crítico
- [x] Tabla de alertas con badge
- [x] Últimas entradas y salidas del mes

### Productos (`/productos`)
- [x] Lista con búsqueda, filtro categoría, mostrar inactivos
- [x] Modal crear / editar producto
- [x] Desactivar producto

### Entradas (`/entradas`)
- [x] Lista con filtros: fecha desde/hasta + búsqueda por folio
- [x] Modal registrar / editar entrada (size xl)
  - Combobox con búsqueda para selección de producto
  - IVA por línea (activo por defecto), columna Vr. IVA calculada en tiempo real
  - Orden de columnas: Producto → Cantidad → Unidad → IVA → %IVA → Vr.IVA → Total línea
  - Folio obligatorio (validación frontend)
  - Confirmación antes de guardar (modal custom)
  - Aviso al cerrar si hay datos sin guardar
- [x] Modal detalle con items, totales e historial de ediciones
- [x] Auditoría: cada edición graba en `audit_log`

### Salidas (`/salidas`)
- [x] Lista con filtros de fecha
- [x] Modal registrar salida con múltiples productos
- [x] Stock disponible visible al seleccionar producto
- [x] Validación de stock insuficiente (backend)
- [x] Modal detalle

### Ajustes (`/ajustes`)
- [x] Lista con filtros de fecha
- [x] Modal con comparador visual sistema → físico → diferencia coloreada

### Reportes (`/reportes`)
- [x] Stock actual
- [x] Productos bajo mínimo
- [x] Entradas por fecha
- [x] Salidas por fecha
- [x] Ajustes por fecha
- [x] Historial de movimientos
- [x] **Ediciones de facturas** — constancia de todas las ediciones con folio, fecha, proveedor, usuario

### Configuración (`/configuracion`)
- [x] Layout: Usuarios arriba (ancho completo), Empresa + Acerca del sistema abajo en dos columnas
- [x] Nombre de empresa + IVA por defecto
- [x] Gestión de usuarios: crear, editar, activar/desactivar (solo admin)
- [x] Acerca del sistema: versión, DB, usuario actual

### Assets y branding
- [x] `public/logonb.ico` — favicon de la empresa (declarado en `metadata.icons` del root layout)
- [x] `public/logonb.png` — logo en la cabecera del sidebar (36×36, `<img>` nativo — no usar `next/image`)

### Exportación
- [x] Todos los reportes exportan `.xlsx` con fuente Trebuchet MS 12, separador de miles y cabecera con color teal
- [x] Filtros específicos por tipo de reporte antes de generar
- [x] Todos los PDFs en orientación **vertical (portrait A4)** — caben más filas por hoja
- [x] PDF de stock (reportes + stock actual): columna **"Stock real"** con borde visible para conteo físico a mano
  - Columnas: Producto | Presentación | Mínimo | Stock actual | Stock real

---

## Pendiente / roadmap

- [x] Anulación de entradas y salidas — revierte stock, graba en audit_log, botón en modal (solo admin)
- [x] Exportación PDF — todos los reportes, impresión directa desde el navegador (sin libs nuevas)
- [x] Vista de historial de movimientos por producto individual — botón en tabla de stock, carga bajo demanda
- [x] Paginación para tablas largas — prop `pageSize` en Table, 25 registros/página en stock, entradas, salidas, ajustes, productos
- [x] Modo responsive / tablet — sidebar drawer hamburger (≤768px), modales bottom-sheet, grids colapsan, padding adaptativo
- [ ] Inventario inicial desde UI (service listo, sin página dedicada)
