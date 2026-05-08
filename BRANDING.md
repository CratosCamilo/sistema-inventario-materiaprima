# BRANDING.md — Paleta, tipografía y reglas de diseño

Referencia visual obligatoria para cualquier componente nuevo o modificación de UI.
El sistema debe sentirse como un dashboard profesional para fábrica — no como un Excel.

---

## Paleta de colores

Definidas como variables CSS en [`src/styles/variables.css`](./src/styles/variables.css).

### Fondos y superficies

| Variable | Valor | Uso |
|----------|-------|-----|
| `--bg-primary` | `#006a6b` | Fondo principal de la app |
| `--bg-panel` | `#007d7e` | Cards, paneles, sidebar, modales |
| `--bg-surface` | `#008788` | Hover de paneles, inputs focus area |
| `--bg-surface-hover` | `#009899` | Hover profundo de superficies |

### Texto

| Variable | Valor | Uso |
|----------|-------|-----|
| `--text-primary` | `#f3fbfb` | Títulos, valores importantes, texto destacado |
| `--text-secondary` | `rgba(243,251,251,0.78)` | Texto normal de cuerpo |
| `--text-muted` | `rgba(243,251,251,0.50)` | Labels, placeholders, ayudas, meta-info |

### Bordes

| Variable | Valor | Uso |
|----------|-------|-----|
| `--border` | `rgba(191,191,191,0.22)` | Bordes suaves (cards, separadores) |
| `--border-strong` | `rgba(191,191,191,0.42)` | Bordes más visibles (inputs, tablas) |

### Estados y acciones

| Variable | Valor | Uso |
|----------|-------|-----|
| `--primary` | `#007d7e` | Color primario base |
| `--primary-hover` | `#009192` | Hover del primario |
| `--primary-active` | `#00a5a6` | Estado activo del primario |
| `--success` | `#2dd4bf` | Éxito, estado normal de stock, botón primario, nav activa |
| `--success-soft` | `rgba(45,212,191,0.15)` | Fondo de badge éxito, nav activa |
| `--warning` | `#f7c948` | Stock bajo, advertencias |
| `--warning-soft` | `rgba(247,201,72,0.15)` | Fondo de badge warning |
| `--danger` | `#ff4d6d` | Stock crítico, errores, acciones destructivas |
| `--danger-soft` | `rgba(255,77,109,0.15)` | Fondo de badge danger, mensajes de error |

### Sombras

| Variable | Uso |
|----------|-----|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.25)` — cards en reposo |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.30)` — cards hover, dropdowns |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.35)` — modales |

---

## Tipografía

### Fuente principal

**Inter** — Sans-serif moderna y legible, carga desde Google Fonts.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Variable: `--font-sans: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;`
Variable mono: `--font-mono: 'JetBrains Mono', 'Fira Code', monospace;` (para códigos, folios)

### Escala tipográfica

| Elemento | Tamaño | Peso | Uso |
|----------|--------|------|-----|
| `h1` | `1.5rem` | 700 | Títulos de página |
| `h2` | `1.25rem` | 600 | Títulos de sección |
| `h3` | `1rem` | 600 | Títulos de card |
| Body | `15px` | 400 | Texto general |
| Labels | `12px` | 600 | Labels de campos |
| Meta | `12-13px` | 400 | Fechas, descripciones, subtítulos |
| Micro | `11px` | 400–600 | Badges, hints, versión |

### Labels de campos de formulario

Siempre en uppercase con letter-spacing:
```css
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.04em;
color: var(--text-secondary);
```

### Headers de tabla

```css
font-size: 13px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.06em;
color: var(--text-muted);
```

### Celdas de tabla

```css
font-size: 15px;
text-transform: uppercase;
letter-spacing: 0.02em;
color: var(--text-secondary);
```

---

## Espaciado y radios

| Variable | Valor | Uso |
|----------|-------|-----|
| `--radius-sm` | `6px` | Inputs, botones, badges, items pequeños |
| `--radius-md` | `10px` | Cards, tablas, paneles |
| `--radius-lg` | `16px` | Modales |

### Espaciado interno de páginas
- Padding del área de contenido: `28px 32px`
- Gap entre secciones de página: `24px`
- Gap entre cards en grid: `16-20px`
- Padding interno de cards: `20px` (md) / `12px` (sm) / `28px` (lg)

---

## Componentes y sus reglas visuales

### Botones

| Variante | Fondo | Texto | Uso |
|----------|-------|-------|-----|
| `primary` | `--success (#2dd4bf)` | `#003d39` (oscuro) | Acción principal de la página |
| `secondary` | `--bg-surface` | `--text-primary` | Acciones secundarias |
| `danger` | `--danger` | blanco | Eliminar, cancelar destructivo |
| `ghost` | transparente | `--text-secondary` | Acciones terciarias, Cancelar en modales |

Tamaños: `sm` (5px 12px), `md` (8px 16px), `lg` (11px 22px)

Regla: **Solo un botón primario por pantalla/modal.** El resto en secondary o ghost.

### Badges de estado de stock

| Estado | Color fondo | Color texto | Icono |
|--------|-------------|-------------|-------|
| Normal | `--success-soft` | `--success` | dot verde |
| Stock bajo | `--warning-soft` | `--warning` | dot amarillo |
| Crítico | `--danger-soft` | `--danger` | dot rojo |

Regla del umbral:
- `normal`: `stock_current > stock_minimum`
- `low`: `stock_current <= stock_minimum`
- `critical`: `stock_current <= stock_minimum * 0.5`

### Cards

- Fondo: `--bg-panel`
- Borde: `1px solid --border`
- Radio: `--radius-md`
- Sombra reposo: `--shadow-sm`
- Hover (si clickeable): `--bg-surface`, `--shadow-md`, `translateY(-1px)`

### Tablas

- Header: `rgba(0,0,0,0.15)` con borde inferior `--border-strong`
- Filas: hover con `rgba(255,255,255,0.04)`
- Borde entre filas: `1px solid --border`
- Padding de celda: `12px 16px`
- Texto de celda: `--text-secondary`
- Texto vacío (emptyText): centrado, italic, `--text-muted`

### Modales

- Overlay: `rgba(0,0,0,0.55)` con fade-in 120ms
- Cuerpo: `--bg-panel`, borde `--border-strong`, radio `--radius-lg`, sombra `--shadow-lg`
- Animación: `slideUp` 150ms (desde `translateY(16px)` a 0)
- Footer: botones alineados a la derecha, gap 10px
- Cierra con: Escape, click en overlay, botón Cerrar/✕
- Tamaños: `sm` 400px / `md` 560px / `lg` 800px / `xl` 1100px

### Inputs y selects

- Fondo: `--bg-primary`
- Borde: `1px solid --border-strong`
- Radio: `--radius-sm`
- Padding: `8px 12px`
- Focus: borde `--success` + `box-shadow: 0 0 0 3px rgba(45,212,191,0.15)`

### Scrollbar

```css
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 99px; }
```

---

## Sidebar de navegación

- Ancho: `--sidebar-width: 220px`
- Fondo: `rgba(0,0,0,0.20)` sobre el bg-primary
- Borde derecho: `1px solid --border`
- Items nav en reposo: `--text-secondary`
- Items nav hover: `--bg-surface` + `--text-primary`
- Item activo: fondo `--success-soft`, texto `--success`

---

## Reglas de diseño (no negociables)

1. **Sin librerías UI externas** (no Chakra, no MUI, no Ant Design). Solo CSS Modules + variables CSS.
2. **Paleta teal en todo**. No introducir colores fuera de la paleta definida salvo que se actualice este archivo.
3. **Estados siempre visibles**: stock bajo/crítico siempre con badge coloreado, nunca solo texto.
4. **Formularios claros**: labels siempre visibles (no solo placeholder), campos agrupados con `grid` 2 columnas cuando tiene sentido, mensajes de error en rojo con fondo `--danger-soft`.
5. **Espaciado generoso**: el sistema lo usa alguien no técnico, los elementos deben respirar.
6. **Sin emojis funcionales** en código o texto de UI — pueden usarse íconos tipográficos simples (↑ ↓ ✕ ▣) pero con moderación.
7. **Responsive pensando en tablet** (min-width: 768px). Grids con `auto-fit, minmax()`. Nada con ancho fijo que quiebre en pantallas menores.
8. **Transición consistente**: `--transition: 150ms ease` para hover/focus en todos los elementos interactivos.

---

## Guía de diseño para nuevas páginas

Estructura mínima de una página:

```tsx
<div className={styles.page}>          // gap: 24px entre secciones
  <div className={styles.header}>       // título + acción principal (botón primary)
    <div>
      <h1>Nombre de la página</h1>
      <p>Descripción breve</p>           // --text-secondary
    </div>
    <Button>+ Acción principal</Button>
  </div>

  {/* Filtros o métricas rápidas */}

  <Card>
    <CardHeader title="..." action={...} />
    <Table ... />
  </Card>
</div>
```

Estructura de modal de formulario:

```tsx
<Modal title="..." footer={
  <>
    <Button variant="ghost">Cancelar</Button>
    <Button type="submit" form="form-id" loading={saving}>Guardar</Button>
  </>
}>
  <form id="form-id" onSubmit={handleSubmit}>
    {error && <div className={styles.formError}>{error}</div>}
    {/* campos con label className={styles.label} */}
  </form>
</Modal>
```
