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

### Dirección técnica (IMPORTANTE — cambio de sesión anterior)

El sistema comenzó como **app de escritorio con Electron + React + SQLite**.
Toda la base de código actual está construida bajo esa arquitectura.

**El cliente aprobó un cambio de dirección: el sistema ahora será una aplicación web (online) con base de datos en la nube.**

- El frontend en React + TypeScript se puede reutilizar casi en su totalidad.
- El proceso main de Electron (`src/main/`) y toda la capa de IPC deben migrarse a un backend web.
- SQLite local se reemplazará por un servicio de base de datos cloud (candidatos: Turso, PlanetScale, Supabase — no decidido aún).
- La migración aún **no se ha implementado**. Es el próximo paso.

### Lo que está construido (base Electron, pendiente de migrar a web)

Ver [`PROGRESS.md`](./PROGRESS.md) para la checklist detallada.

---

## Alcance del sistema (v1)

**Lo que SÍ incluye:**
- Registrar productos / materias primas
- Inventario inicial
- Entradas de materia prima (con folio/factura para verificación posterior)
- Salidas de materia prima (a producción, empaque, punto de venta, otra)
- Stock actual con estados visual: normal / bajo / crítico
- Alertas de stock mínimo
- Ajustes / conteo físico
- Reportes básicos (vistas internas con tablas)
- Configuración básica (nombre empresa)

**Lo que NO incluye en v1:**
- Login / autenticación (viene en v2)
- Multiusuario (viene en v2)
- División de bodegas (viene en v2)
- Integración con DIAN
- Costeo / recetas automáticas
- Facturación / ventas
- Exportación PDF/Excel (estructura lista, implementación pendiente)
- Control de pan terminado (es otro sistema separado)

**Funcionalidades confirmadas para v2:**
- Login con tipos de usuarios
- División de dos bodegas
- (Más por definir con el cliente)

---

## Modelo de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `products` | Materias primas. Incluye `stock_current` (actualizado en cada movimiento), `stock_minimum`, `initial_stock_loaded`, `active` |
| `inventory_movements` | Historial central de todos los movimientos. `type`: `initial \| entry \| exit \| adjustment`. `direction`: `in \| out \| adjustment` |
| `purchase_entries` | Cabecera de cada entrada (con `invoice_number` para verificar facturas) |
| `purchase_entry_items` | Líneas de cada entrada |
| `exits` | Cabecera de cada salida |
| `exit_items` | Líneas de cada salida |
| `stock_adjustments` | Ajustes por conteo físico |
| `suppliers` | Proveedores (campo opcional en entradas) |
| `settings` | Configuración clave-valor (`company_name`, etc.) |

### Reglas de negocio críticas

1. **Stock almacenado:** `products.stock_current` se guarda y actualiza en cada movimiento dentro de una transacción. No se calcula al vuelo. `inventory_movements` es la fuente histórica.
2. **Inventario inicial:** Solo se puede cargar una vez por producto (controlado por `initial_stock_loaded = 1`). Correcciones posteriores van por Ajustes.
3. **Salidas con validación:** El service verifica `stock_current >= cantidad` antes de escribir cualquier registro.
4. **Sin DELETE para corregir:** Todos los registros tienen `status TEXT ('active' | 'cancelled')` para anulaciones futuras sin borrar datos.
5. **Unidades:** Cada producto tiene `visual_unit` (lo que ve el usuario) y `conversion_factor` (informativo para v1, sin conversiones automáticas).
6. **Estados de stock:**
   - `normal`: `stock_current > stock_minimum`
   - `low`: `stock_current <= stock_minimum`
   - `critical`: `stock_current <= stock_minimum * 0.5`

---

## Arquitectura actual (Electron — pendiente de migrar)

```
src/
  main/                        # Proceso Electron (Node.js)
    database/
      connection.ts            # better-sqlite3, WAL mode, FK on
      migrations.ts            # Creación de tablas (idempotente)
      seed.ts                  # 9 productos demo + movimientos demo
    services/                  # Toda la lógica SQL aquí
      productService.ts
      entryService.ts
      exitService.ts
      adjustmentService.ts
      movementService.ts
      dashboardService.ts
      settingsService.ts
      supplierService.ts
    ipc/                       # Solo puentes IPC, sin lógica
      productHandlers.ts
      entryHandlers.ts
      exitHandlers.ts
      adjustmentHandlers.ts
      dashboardHandlers.ts
    index.ts                   # Entry point Electron
    preload.ts                 # contextBridge → window.electronAPI

  renderer/                    # React (reutilizable para web)
    types/index.ts             # Todos los tipos TypeScript
    api/index.ts               # Wrapper del IPC (a reemplazar por fetch/SDK en web)
    components/
      layout/                  # Sidebar, Layout
      ui/                      # Button, Card, Badge, Modal, Table (+ CSS Modules)
    pages/                     # Dashboard, Products, Entries, Exits, Stock, Adjustments, Reports, Settings
    utils/formatters.ts
    styles/variables.css       # Paleta teal (ver BRANDING.md)
    styles/global.css
```

### Capa de migración a web

Al migrar, los cambios son quirúrgicamente en:
- `src/main/` → reemplazar por backend (API REST o tRPC o similar)
- `src/renderer/api/index.ts` → reemplazar `window.electronAPI` por llamadas HTTP
- El resto del renderer (components, pages, styles) se reutiliza casi sin cambios

---

## Stack tecnológico

| Componente | Tecnología actual | Target web |
|------------|------------------|------------|
| Frontend | React 18 + TypeScript | React 18 + TypeScript (mismo) |
| Estilos | CSS Modules + variables CSS | CSS Modules (mismo) |
| Enrutamiento | react-router-dom v6 | react-router-dom v6 (mismo) |
| Build frontend | Vite | Vite (mismo) |
| Runtime backend | Electron (Node.js main process) | Node.js / Deno / Bun — por decidir |
| Base de datos | SQLite local (better-sqlite3) | Cloud SQL — candidatos: Turso, Supabase, PlanetScale |
| IPC | Electron contextBridge | API REST / tRPC / Server Actions — por decidir |
| Desktop wrapper | Electron 29 | — (ya no aplica) |

---

## Datos de referencia

### Categorías de productos usadas
Harinas, Endulzantes, Lácteos, Embutidos, Huevos, Empaques, Aceites, Levaduras, Otros

### Unidades usadas
kg, gramos, litros, ml, unidad, bulto, caja, paquete, rollo, cartón, bolsa

### Destinos de salida
`produccion`, `empaque`, `punto_venta`, `otra`

### Ejemplos de productos (seed demo)
Harina de trigo (bulto=50kg), Azúcar (bulto=50kg), Mantequilla 500g (caja=24un), Mantequilla 1000g (caja=12un), Queso (kg), Jamón (kg), Huevos (cartón=30un), Plástico para empaque (rollo), Bolsas pequeñas (paquete=100un)

---

## Convenciones de código

- Sin comentarios obvios. Solo comentar el **por qué** cuando no es evidente.
- Sin docstrings largos. Un `//` corto máximo.
- Sin librerías UI pesadas. Solo CSS Modules + variables CSS.
- SQL exclusivamente en `services/`. Ningún componente React toca la base de datos.
- Todos los tipos en `src/renderer/types/index.ts`.
- Formateo de fechas y números siempre con `formatters.ts` (locale `es-CO`).
- `api/index.ts` es la única capa de comunicación que los componentes React usan.

---

## Comandos útiles (stack actual Electron)

```bash
npm install          # Instala deps + ejecuta electron-rebuild automáticamente
npm run dev          # Vite dev server + compila main + lanza Electron
npm run build        # Build completo
npx tsc -p tsconfig.electron.json --noEmit   # Type-check del main process
npx vite build       # Build del renderer solamente
```

---

## Notas técnicas importantes

- `better-sqlite3` requiere compilarse contra el runtime de Electron, no contra el Node del sistema. El `postinstall` ejecuta `electron-rebuild` automáticamente. Esto resolvió el error de C++20 con Node 23.
- El renderer usa `HashRouter` (no `BrowserRouter`) porque Electron carga archivos locales.
- Al migrar a web, cambiar a `BrowserRouter`.
- La fuente Inter se carga desde Google Fonts en el `index.html`. En una app web productiva, considerar alojarla localmente.
