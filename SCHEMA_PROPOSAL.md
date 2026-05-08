# Schema Drizzle — Propuesta para revisión

> Contexto: migración de Electron + SQLite local → Next.js 14 App Router + Drizzle ORM + SQLite local en dev / Turso en producción.
> Este documento es para revisión y aprobación antes de escribir código.

---

## Decisiones de diseño a confirmar

**D1. Categorías reducidas a solo 2**
El requisito dice "solo Producción y Empaques". Esto afecta los 9 productos demo actuales (Harinas, Lácteos, etc. desaparecen). El seed demo los asignaría a una de las dos. ¿De acuerdo?

**D2. `warehouses` como tabla real (no enum)**
Aunque arrancan siendo solo 2 bodegas fijas (Panadería, Pastelería), guardarlas en tabla facilita el día que llegue v2. El seed las inserta automáticamente.

**D3. Patrón `created_by_id` + `created_by_name`**
Todos los movimientos guardan FK al usuario **y** un snapshot del nombre. Así el historial es inmutable aunque el usuario cambie su nombre o sea desactivado. Es la solución estándar para auditoría.

**D4. Sesión stateless (JWT sin tabla de sesiones)**
El JWT vive en cookie httpOnly. No hay tabla `sessions` en DB. Si en el futuro necesitamos "revocar sesión", se agrega. Por ahora no.

---

## Tablas nuevas

### `users`

```
id              integer  PK autoincrement
username        text     NOT NULL UNIQUE
full_name       text     NOT NULL
password_hash   text     NOT NULL
role            text     NOT NULL  -- 'admin' | 'operador' | 'salidas' | 'entradas'
active          integer  NOT NULL DEFAULT 1
created_at      text     NOT NULL DEFAULT now
updated_at      text     NOT NULL DEFAULT now
```

Roles:
- `admin`: acceso total + gestión de usuarios
- `operador`: todo excepto gestionar usuarios (rol principal del día a día)
- `salidas`: solo puede ver stock, registrar salidas y ajustes
- `entradas`: solo puede ver stock, registrar entradas y ajustes

### `warehouses`

```
id         integer  PK autoincrement
name       text     NOT NULL  -- "Panadería" | "Pastelería"
slug       text     NOT NULL UNIQUE  -- "panaderia" | "pasteleria"
active     integer  NOT NULL DEFAULT 1
created_at text     NOT NULL DEFAULT now
```

Seed inserta ambas bodegas en la primera migración.

### `audit_log`

Para rastrear ediciones de facturas (y futuras entidades editables).

```
id          integer  PK autoincrement
entity_type text     NOT NULL  -- 'purchase_entry'
entity_id   integer  NOT NULL
action      text     NOT NULL  -- 'edit' | 'cancel'
user_id     integer  NOT NULL → users.id
user_name   text     NOT NULL  -- snapshot del nombre en el momento
changes     text     NOT NULL  -- JSON: {"field": {"before": x, "after": y}}
created_at  text     NOT NULL DEFAULT now
```

---

## Tablas modificadas

### `products`

Cambios vs. actual: `+warehouse_id`, categoría ahora solo `'Produccion' | 'Empaques'`

```
id                   integer  PK autoincrement
warehouse_id         integer  NOT NULL → warehouses.id   ← NUEVO
name                 text     NOT NULL
category             text     NOT NULL  -- 'Produccion' | 'Empaques'  (antes: 9 categorías)
base_unit            text     NOT NULL
visual_unit          text     NOT NULL
conversion_factor    real     NOT NULL DEFAULT 1
stock_minimum        real     NOT NULL DEFAULT 0
stock_current        real     NOT NULL DEFAULT 0
initial_stock_loaded integer  NOT NULL DEFAULT 0
active               integer  NOT NULL DEFAULT 1
notes                text
created_at           text     NOT NULL DEFAULT now
updated_at           text     NOT NULL DEFAULT now
```

### `purchase_entries`

Cambios: `+warehouse_id`, `+created_by_id`, `+created_by_name`, `+edited_by_id`, `+edited_by_name`, `+edited_at`, `+subtotal`, `+iva_total`, `+total`

```
id              integer  PK autoincrement
warehouse_id    integer  NOT NULL → warehouses.id         ← NUEVO
date            text     NOT NULL
invoice_number  text
supplier_name   text
responsible     text
notes           text
subtotal        real     NOT NULL DEFAULT 0               ← NUEVO: suma de line_total
iva_total       real     NOT NULL DEFAULT 0               ← NUEVO: suma de iva_amount
total           real     NOT NULL DEFAULT 0               ← NUEVO: subtotal + iva_total
status          text     NOT NULL DEFAULT 'active'        -- 'active' | 'cancelled'
created_by_id   integer  → users.id                       ← NUEVO
created_by_name text                                      ← NUEVO: snapshot
edited_by_id    integer  → users.id                       ← NUEVO
edited_by_name  text                                      ← NUEVO: snapshot
edited_at       text                                      ← NUEVO
created_at      text     NOT NULL DEFAULT now
updated_at      text     NOT NULL DEFAULT now
```

### `purchase_entry_items`

Cambios: `+applies_iva`, `+iva_rate`, `+line_total`, `+iva_amount`. Se elimina `unit_cost`.

```
id          integer  PK autoincrement
entry_id    integer  NOT NULL → purchase_entries.id
product_id  integer  NOT NULL → products.id
quantity    real     NOT NULL
unit        text     NOT NULL
applies_iva integer  NOT NULL DEFAULT 0    ← NUEVO: checkbox IVA (0 o 1)
iva_rate    real     NOT NULL DEFAULT 0    ← NUEVO: ej. 19.0
line_total  real     NOT NULL DEFAULT 0    ← NUEVO: valor total sin IVA (usuario ingresa)
iva_amount  real     NOT NULL DEFAULT 0    ← NUEVO: line_total × iva_rate / 100
notes       text
```

> `unit_cost` se elimina. Los precios viven solo en las líneas de factura, no en productos.

Vista de línea en el formulario:

| IVA (check) | Producto | Unidad | Cantidad | % IVA | Vr. IVA | Valor Total |
|-------------|----------|--------|----------|-------|---------|-------------|
| checkbox    | select   | auto   | número   | auto  | calc    | usuario     |

### `exits`

Cambios: `+warehouse_id`, `+created_by_id`, `+created_by_name`. Se mantienen ambos: `created_by_*` (quién registró en el sistema) y `responsible` (quién realizó físicamente la acción — pueden ser personas distintas).

```
id              integer  PK autoincrement
warehouse_id    integer  NOT NULL → warehouses.id         ← NUEVO
date            text     NOT NULL
destination     text     NOT NULL  -- 'produccion'|'empaque'|'punto_venta'|'otra'
responsible     text
notes           text
status          text     NOT NULL DEFAULT 'active'        -- 'active' | 'cancelled'
created_by_id   integer  → users.id                       ← NUEVO
created_by_name text                                      ← NUEVO
created_at      text     NOT NULL DEFAULT now
updated_at      text     NOT NULL DEFAULT now
```

### `exit_items` — sin cambios de schema

```
id         integer  PK autoincrement
exit_id    integer  NOT NULL → exits.id
product_id integer  NOT NULL → products.id
quantity   real     NOT NULL
unit       text     NOT NULL
notes      text
```

### `stock_adjustments`

Cambios: `+warehouse_id`, `+created_by_id`, `+created_by_name`. Igual que `exits`: ambos campos `created_by_*` y `responsible` se mantienen.

```
id              integer  PK autoincrement
warehouse_id    integer  NOT NULL → warehouses.id         ← NUEVO
date            text     NOT NULL
product_id      integer  NOT NULL → products.id
stock_system    real     NOT NULL
stock_physical  real     NOT NULL
difference      real     NOT NULL  -- physical - system
reason          text
notes           text
responsible     text
status          text     NOT NULL DEFAULT 'active'        -- 'active' | 'cancelled'
created_by_id   integer  → users.id                       ← NUEVO
created_by_name text                                      ← NUEVO
created_at      text     NOT NULL DEFAULT now
updated_at      text     NOT NULL DEFAULT now
```

### `inventory_movements`

Cambios: `+warehouse_id`, `+created_by_id`, `+created_by_name`

```
id              integer  PK autoincrement
warehouse_id    integer  NOT NULL → warehouses.id         ← NUEVO
product_id      integer  NOT NULL → products.id
type            text     NOT NULL  -- 'initial'|'entry'|'exit'|'adjustment'
direction       text     NOT NULL  -- 'in'|'out'|'adjustment'
quantity        real     NOT NULL
unit            text     NOT NULL
date            text     NOT NULL
reference_type  text               -- 'purchase_entry'|'exit'|'stock_adjustment'
reference_id    integer
notes           text
responsible     text
created_by_id   integer  → users.id                       ← NUEVO
created_by_name text                                      ← NUEVO
created_at      text     NOT NULL DEFAULT now
```

---

## Tablas sin cambios de schema

### `settings`

```
key        text     PK
value      text     NOT NULL
updated_at text     NOT NULL DEFAULT now
```

Claves nuevas que se insertan en el seed:
- `iva_rate_default` = `"19"` (porcentaje IVA por defecto, configurable desde Configuración)
- `company_name` ya existe

---

## Resumen de cambios

| Tabla | Estado | Cambios principales |
|-------|--------|---------------------|
| `users` | **Nueva** | Auth con roles |
| `warehouses` | **Nueva** | Panadería / Pastelería |
| `audit_log` | **Nueva** | Registro de ediciones |
| `products` | Modificada | +`warehouse_id`, 2 categorías |
| `purchase_entries` | Modificada | +bodega, +auditoría, +totales IVA |
| `purchase_entry_items` | Modificada | +IVA/precios, elimina `unit_cost` |
| `exits` | Modificada | +bodega, +auditoría |
| `exit_items` | Sin cambios | — |
| `stock_adjustments` | Modificada | +bodega, +auditoría |
| `inventory_movements` | Modificada | +bodega, +auditoría |
| `audit_log` | **Nueva** | Ediciones con before/after en JSON |
| `settings` | Sin cambios | +2 claves en seed |
| `suppliers` | **Eliminada** | Proveedor como texto libre en formulario |

---

## Stack objetivo (para contexto)

| Componente | Tecnología |
|------------|-----------|
| Framework | Next.js 14 App Router |
| ORM | Drizzle ORM |
| DB desarrollo | SQLite local (via `@libsql/client` con `file:local.db`) |
| DB producción | Turso |
| Selección DB | Variable de entorno `TURSO_DATABASE_URL` |
| Auth | JWT con `jose` + cookie httpOnly |
| Passwords | `bcryptjs` |
| Frontend | React 18 + TypeScript + CSS Modules (reutilizado) |
| Deploy | Vercel |

---

## Orden de implementación propuesto

1. Configurar Next.js con sistema doble DB (SQLite local / Turso por env)
2. Migrar schema a Drizzle con todos los cambios de este documento
3. Migrar services a API routes de Next.js
4. Implementar auth (login, JWT, middleware de rutas protegidas)
5. Implementar selector de bodega en layout
6. Adaptar frontend: `api/index.ts` de `electronAPI` → `fetch`, mover pages a App Router
7. Implementar cambios funcionales nuevos (precios, IVA, edición de facturas)
8. Ajustes de UI (texto más grande, columnas, stock como página principal)
