# Sistema de Inventario — Materia Prima

Sistema web de gestión de inventario de materia prima para **Industria Bizcopan Zapatoca**, una fábrica de pan en Colombia. Permite controlar entradas, salidas, stock en tiempo real y generar reportes, con soporte para dos bodegas independientes y auditoría completa.

---

## Características principales

- **Stock en tiempo real** con estados visual: Normal / Bajo mínimo / Crítico
- **Entradas de materia prima** con folio/factura obligatorio, IVA por línea y auditoría de ediciones
- **Salidas** con validación de stock suficiente antes de registrar
- **Ajustes de inventario** por conteo físico
- **Dos bodegas** independientes: Panadería y Pastelería
- **Reportes** exportables en Excel (`.xlsx`) y PDF con rótulo corporativo
- **Anulación** de entradas y salidas con reversión automática de stock
- **Historial** de movimientos por producto
- **Gestión de usuarios** con cuatro roles de acceso
- **Auditoría** completa de ediciones y anulaciones de facturas
- **Responsive** — funciona en desktop y tablet

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Frontend | React 18 + TypeScript |
| Estilos | CSS Modules + variables CSS (sin librerías UI) |
| ORM | Drizzle ORM |
| Base de datos (dev) | SQLite local (`file:local.db`) |
| Base de datos (prod) | [Turso](https://turso.tech) (libsql) |
| Autenticación | JWT (`jose`) + bcryptjs, cookie httpOnly |
| Exportación Excel | `xlsx-js-style` |
| Exportación PDF | `jspdf` + `jspdf-autotable` |

---

## Roles de acceso

| Rol | Permisos |
|-----|---------|
| `admin` | Todo + gestión de usuarios |
| `operador` | Todo excepto gestión de usuarios |
| `entradas` | Stock + entradas + ajustes |
| `salidas` | Stock + salidas + ajustes |

---

## Módulos

### Stock actual
Vista en tiempo real del inventario completo. Cards de resumen filtrables, búsqueda por nombre, historial de movimientos por producto, estados con colores.

### Entradas
Registro de materia prima recibida. Folio de factura obligatorio, múltiples líneas con IVA configurable por línea, totales en tiempo real, confirmación antes de guardar, edición con trazabilidad completa.

### Salidas
Registro de materia prima despachada a producción, empaque, punto de venta u otra área. Validación de stock disponible antes de confirmar.

### Ajustes
Corrección de inventario por conteo físico. Comparador visual sistema → físico → diferencia coloreada.

### Reportes
Siete tipos de informe con filtros por fecha, categoría y texto libre. Exportación a Excel y PDF con rótulo corporativo (logo, colores de la empresa).

| Reporte | Descripción |
|---------|------------|
| Stock actual | Inventario completo con estados |
| Productos bajo mínimo | Solo los que requieren pedido |
| Entradas por fecha | Materia prima recibida |
| Salidas por fecha | Materia prima enviada |
| Ajustes de inventario | Correcciones realizadas |
| Historial de movimientos | Todos los movimientos |
| Ediciones de facturas | Constancia de auditoría |

### Configuración
Nombre de empresa, IVA por defecto y gestión completa de usuarios (solo admin).

---

## Instalación y uso local

### Requisitos
- Node.js 18+
- npm

### Primeros pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/CratosCamilo/sistema-inventario-materiaprima.git
cd sistema-inventario-materiaprima

# 2. Instalar dependencias
#    (--ignore-scripts evita errores de DLLs de Electron en caché)
npm install --ignore-scripts

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores:
#   DATABASE_URL=file:local.db
#   JWT_SECRET=una-clave-secreta-larga
#   ALLOW_SEED=true

# 4. Iniciar servidor de desarrollo
npm run dev
```

### Seed inicial

Con el servidor corriendo, visitar una sola vez:

```
http://localhost:3000/api/setup
```

Esto crea las tablas, las dos bodegas y el usuario administrador:

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `Admin123!` |

### Comandos útiles

```bash
npm run dev          # Servidor de desarrollo en localhost:3000
npm run build        # Build de producción
npx tsc --noEmit     # Verificar tipos sin compilar
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/               # Rutas protegidas (layout con sidebar)
│   │   ├── page.tsx         # Stock actual
│   │   ├── resumen/         # Dashboard
│   │   ├── entradas/
│   │   ├── salidas/
│   │   ├── ajustes/
│   │   ├── reportes/
│   │   └── configuracion/
│   ├── (auth)/login/        # Página de login
│   └── api/                 # API Routes
├── components/
│   ├── ui/                  # Button, Card, Badge, Modal, Table, Combobox
│   └── layout/              # Sidebar, AppProviders
├── lib/
│   ├── db/                  # Schema Drizzle + conexión + seed
│   ├── services/            # Lógica de negocio (solo aquí se toca la DB)
│   └── api/client.ts        # Fetch client tipado para el frontend
├── styles/                  # Variables CSS + estilos globales
├── types/index.ts           # Tipos TypeScript centralizados
└── utils/
    ├── formatters.ts        # Fechas, números, plurales en español
    ├── exportExcel.ts       # Exportación .xlsx
    └── exportPdf.ts         # Exportación PDF con jsPDF
```

---

## Producción con Turso

```bash
# Instalar CLI de Turso
npm install -g @turso/cli
turso auth login

# Crear base de datos
turso db create inventario-materia-prima
turso db show inventario-materia-prima --url
turso db tokens create inventario-materia-prima

# Variables de entorno en producción:
# DATABASE_URL=libsql://tu-db.turso.io
# DATABASE_AUTH_TOKEN=tu-token
# JWT_SECRET=clave-secreta-produccion
# ALLOW_SEED=false
```

---

## Licencia

Proyecto privado — Industria Bizcopan Zapatoca.
