# CLAUDE.md — Contexto del proyecto para Claude Code

> Lee este archivo completo antes de responder cualquier pregunta sobre el proyecto.
> Luego lee [`PROGRESS.md`](./PROGRESS.md) para saber qué está hecho y qué falta.
> Luego lee [`BRANDING.md`](./BRANDING.md) para la paleta de colores, tipografía y reglas de diseño.

---

## ¿Qué es este sistema?

Sistema de inventario de **materia prima** para una fábrica de pan grande en Colombia.
Es un proyecto independiente — existe otro sistema separado (ya terminado) para pan terminado, facturación y vendedores. Este sistema es **solo** para materia prima.

**Usuario final:** Una sola persona encargada del inventario de materia prima. No es técnica, usa el sistema a diario. La UX debe ser simple, clara e intuitiva.

---

## Estado actual del proyecto

### Stack actual (migración COMPLETA — 2026-05-08)

El sistema migró de Electron + React + SQLite local a **Next.js 14 App Router** con base de datos cloud. Todo el código Electron ha sido eliminado.

- **Frontend:** Next.js 14 App Router, React 18, TypeScript, CSS Modules
- **Backend:** Next.js API Routes (App Router)
- **ORM:** Drizzle ORM con `@libsql/client`
- **Base de datos:** SQLite local (`file:local.db`) en dev / Turso en producción
- **Auth:** JWT con `jose`, httpOnly cookie `session`, bcryptjs para hashing
- **Instalación:** `npm install --ignore-scripts` (evita scripts de Electron en cache)

### Lo que está construido

Ver [`PROGRESS.md`](./PROGRESS.md) para la checklist detallada.

---

## Alcance del sistema

**Lo que SÍ incluye (v1 + v2 completados):**
- Registro de productos / materias primas
- Inventario inicial
- Entradas de materia prima (con folio/factura obligatorio, IVA por línea, auditoría de ediciones)
- Salidas de materia prima (a producción, empaque, punto de venta, otra)
- Stock actual con estados visuales: normal / bajo / crítico
- Alertas de stock mínimo
- Ajustes / conteo físico
- Reportes (stock, bajo mínimo, entradas, salidas, ajustes, movimientos, ediciones de facturas)
- Configuración (nombre empresa, IVA por defecto)
- Login con JWT y roles de acceso
- Dos bodegas (Panadería y Pastelería)
- Gestión de usuarios (admin)
- Auditoría de ediciones

**Lo que NO incluye:**
- Integración con DIAN
- Costeo / recetas automáticas
- Facturación / ventas
- Exportación PDF/Excel
- Control de pan terminado (es otro sistema separado)

**Roles:**
- `admin`: todo + gestión de usuarios
- `operador`: todo excepto gestión de usuarios
- `entradas`: stock + entradas + ajustes
- `salidas`: stock + salidas + ajustes

---

## Modelo de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios con roles y hash de contraseña |
| `warehouses` | Bodegas (Panadería id=1, Pastelería id=2) |
| `products` | Materias primas. Incluye `stock_current`, `stock_minimum`, `initial_stock_loaded`, `active`, `category` (Produccion/Empaques) |
| `inventory_movements` | Historial central. `type`: `initial\|entry\|exit\|adjustment`. `direction`: `in\|out\|adjustment` |
| `purchase_entries` | Cabecera de cada entrada (con `invoice_number` obligatorio, `subtotal`, `iva_total`, `total`, auditoría) |
| `purchase_entry_items` | Líneas de entrada con `applies_iva`, `iva_rate`, `line_total`, `iva_amount` |
| `exits` | Cabecera de cada salida |
| `exit_items` | Líneas de salida |
| `stock_adjustments` | Ajustes por conteo físico |
| `audit_log` | Auditoría de ediciones/anulaciones (`entity_type: 'purchase_entry'`, `changes` en JSON) |
| `settings` | Configuración clave-valor (`company_name`, `iva_rate_default`) |

### Reglas de negocio críticas

1. **Stock almacenado:** `products.stock_current` se actualiza en cada movimiento dentro de una transacción. No se calcula al vuelo.
2. **Inventario inicial:** Solo se puede cargar una vez por producto (`initial_stock_loaded = 1`). Correcciones van por Ajustes.
3. **Salidas con validación:** El service verifica `stock_current >= cantidad` antes de escribir.
4. **Sin DELETE:** Todos los registros tienen `status ('active' | 'cancelled')` para anulaciones sin borrar datos.
5. **Folio obligatorio:** `invoice_number` es requerido en entradas (validado en frontend y backend).
6. **IVA por línea:** `iva_amount = line_total * iva_rate / 100`. IVA activo por defecto con tasa de configuración.
7. **Estados de stock:**
   - `normal`: `stock_current > stock_minimum`
   - `low`: `stock_current <= stock_minimum`
   - `critical`: `stock_current <= stock_minimum * 0.5`
8. **Warehouse selector:** `warehouse_id` se persiste en cookie del cliente y se envía como query param en todas las API calls.

---

## Arquitectura

```
src/
  app/
    (app)/                        # Rutas protegidas (layout con sidebar)
      page.tsx                    # Stock actual (/)
      resumen/page.tsx            # Dashboard
      productos/page.tsx
      entradas/page.tsx
      salidas/page.tsx
      ajustes/page.tsx
      reportes/page.tsx
      configuracion/page.tsx
      layout.tsx                  # Layout con SessionProvider + sidebar
    api/
      auth/login/route.ts
      auth/logout/route.ts
      products/route.ts + [id]/route.ts + initial-stock/route.ts
      entries/route.ts + [id]/route.ts
      exits/route.ts + [id]/route.ts
      adjustments/route.ts
      movements/route.ts
      dashboard/route.ts
      settings/route.ts
      users/route.ts + [id]/route.ts
      warehouses/route.ts
      audit/route.ts
      setup/route.ts              # Seed inicial (público en dev)
    login/page.tsx
    layout.tsx                    # Root layout con providers
  components/
    ui/                           # Button, Card, Badge, Modal, Table, Combobox
    layout/                       # Sidebar, AppProviders
  lib/
    db/
      index.ts                    # Conexión Drizzle (libsql local/Turso)
      schema.ts                   # Drizzle schema completo
      seed.ts                     # Seed con usuario admin + productos demo
    services/                     # productService, entryService, exitService,
                                  # adjustmentService, movementService,
                                  # dashboardService, settingsService, userService
    auth/session.ts               # JWT: signToken, verifyToken, getSession
    api/client.ts                 # Fetch client tipado para páginas
    session-context.tsx
    warehouse-context.tsx
  middleware.ts                   # Protección JWT de rutas
  styles/
    variables.css                 # Paleta teal (ver BRANDING.md)
    global.css
  types/index.ts                  # Todos los tipos TypeScript
  utils/formatters.ts             # formatDate, formatNumber, formatCurrency, es-CO
```

---

## Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| Framework | Next.js 14 (App Router) |
| Frontend | React 18 + TypeScript |
| Estilos | CSS Modules + variables CSS (sin librerías UI) |
| ORM | Drizzle ORM |
| Base de datos dev | SQLite local (`file:local.db`) |
| Base de datos prod | Turso (libsql) |
| Auth | JWT (`jose`) + bcryptjs, cookie httpOnly `session` |
| Config | `next.config.mjs` (NO `.ts` — no soportado en Next.js 14) |

---

## Datos de referencia

### Categorías de productos
`Produccion`, `Empaques`

### Unidades usadas
kg, gramos, litros, ml, unidad, bulto, caja, paquete, rollo, cartón, bolsa

### Destinos de salida
`produccion`, `empaque`, `punto_venta`, `otra`

### Credenciales seed (dev)
- Usuario: `admin` / Contraseña: `Admin123!`

---

## Convenciones de código

- Sin comentarios obvios. Solo comentar el **por qué** cuando no es evidente.
- Sin docstrings largos.
- Sin librerías UI externas. Solo CSS Modules + variables CSS.
- SQL exclusivamente en `src/lib/services/`. Ningún componente React toca la DB.
- Todos los tipos en `src/types/index.ts`.
- Formateo de fechas y números siempre con `src/utils/formatters.ts` (locale `es-CO`).
- `src/lib/api/client.ts` es la única capa que los componentes React usan para llamar a la API.
- `warehouse_id` siempre como query param en todas las llamadas API que lo necesiten.

---

## Comandos útiles

```bash
npm install --ignore-scripts   # Instalar deps (--ignore-scripts evita error de Electron en cache)
npm run dev                    # Servidor de desarrollo en localhost:3000
npm run build                  # Build de producción
npx tsc --noEmit               # Type-check

# Primera vez / reset de BD:
# Visitar http://localhost:3000/api/setup  (crea tablas + seed con admin y productos demo)
```

---

## Notas técnicas importantes

- `next.config.mjs` requerido (Next.js 14 no soporta `next.config.ts`).
- `"target": "ES2017"` en tsconfig para evitar issues con `Map.entries()`.
- `npm install --ignore-scripts` requerido si había Electron instalado (DLLs bloqueadas).
- `color-scheme: dark` en inputs del CSS global para que el date picker use tema oscuro.
- El Combobox (`src/components/ui/Combobox.tsx`) usa React portal (`createPortal`) para que el dropdown flote sobre grids y modales sin quedar atrapado en el layout.
- La cookie `warehouse_id` persiste la bodega activa entre recargas.
- El `audit_log` graba ediciones con `entity_type: 'purchase_entry'` (no `'entry'`).
