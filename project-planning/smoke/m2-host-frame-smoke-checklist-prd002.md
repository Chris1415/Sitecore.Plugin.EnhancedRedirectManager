# Smoke checklist — m2 host-frame visual smoke (PRD-002)

> T055 — 5-axis visual comparison against the PRD-002 refined POC.
> Success metric **m2**: all 5 axes pass across 3 surfaces.
>
> Canonical visual reference: `products/redirect-manager/pocs/poc-v1-prd002/`

## Setup

### Serve the POC (REQUIRED — Playwright MCP rejects `file://`)

```bash
npx serve products/redirect-manager/pocs/poc-v1-prd002/
```

Open `http://localhost:3000` (or the port `serve` reports). Do not open the HTML files directly — `file://` origins block `backdrop-filter` and `color-mix` in most browsers and cause false visual mismatches.

POC files:
- `full-page.html`
- `context-panel.html`
- `dashboard-widget.html`

### Open the live app

In Cloud Portal, open each extension point in its real host:
- **Context Panel** — Pages → side-panel dropdown → "Redirects"
- **Dashboard Widget** — Cloud Portal Dashboard → "Redirects summary" tile
- **Full Page** — Cloud Portal launcher → "Redirect Manager"

### Viewport defaults

- Full Page: ~1440×900
- Context Panel: ~380×800 (narrow strip)
- Dashboard Widget: ~500×600 (card viewport)

---

## Axis 1 — Layout

Run side-by-side: POC HTML (left) vs live app (right).

### Full Page

- [ ] Plume backdrop visible behind all content (if reduced-motion OFF); `z-index: -1` — does not occlude content
- [ ] Frosted topbar sticky at top; remains readable on scroll
- [ ] Workspace hero zone visible between topbar and map list
- [ ] 4-tile stat strip below hero
- [ ] 2-pane body: left rail (map list) + right main (detail pane) at ≥1024 px
- [ ] Preview Data banner at the very top of the page, inside the content area
- [ ] HahnSoloFooter visible at bottom-right; not occluded by plume or modal overlay

### Context Panel

- [ ] 360 px column width matches POC
- [ ] Hero count header (`h1` "N redirects point here") at the top
- [ ] Hero summary tile directly below the header
- [ ] Inline `QuickRedirectForm` card always visible (no button to reveal)
- [ ] Matched-redirect rows below the form
- [ ] No Preview Data banner

### Dashboard Widget

- [ ] 480 px card width
- [ ] Preview Data banner at top
- [ ] Hero stat number + sparkline zone below banner
- [ ] 2×2 tile grid (maps / mappings / last-updated / recently-shipped count)
- [ ] Top-destinations rows
- [ ] Recently-shipped mini-widget
- [ ] Footer attribution

---

## Axis 2 — Typography

### Full Page hero

- [ ] Hero headline: Geist Sans `font-weight: 700` at `clamp(48px, 8vw, 96px)` — compare size at design breakpoints against POC
- [ ] Eyebrow chip: mono uppercase `0.75rem` with primary-tinted pill border
- [ ] Sub-headline: `font-size: var(--text-base)` muted text

### Context Panel hero

- [ ] `h1` font: Geist Sans 700 at `clamp(1.5rem, 8vw, 2rem)` — smaller than Full Page hero
- [ ] Count number in hero summary tile: `2.25rem` tabular-nums primary color

### Dashboard Widget

- [ ] Hero stat big number: `4.5rem` Geist Sans 700 with gradient clip (`--foreground` → `--primary` blend)
- [ ] Sub-head: `font-size: var(--text-base)` `font-weight: 600`

---

## Axis 3 — Color (theme-aware token composition)

### Light mode

- [ ] Gradient text composed via `color-mix(in oklch, var(--primary), var(--info))` — not a static hex
- [ ] Frosted surfaces (`elev-glass-surface`) semi-transparent against page background
- [ ] Preview Data banner: primary-tinted background + primary text
- [ ] HTTP code badges: 301 = primary-tinted, 302 = warning-tinted, ServerTransfer = neutral

### Dark mode

- [ ] All of the above pass in dark mode
- [ ] No white-on-white, no invisible icons, no contrast failures
- [ ] Gradient text still readable (lighter on dark background)
- [ ] Plume backdrop visible but not overwhelming (opacity 0.55 on plume discs)

---

## Axis 4 — Component anatomy (Blok primitives)

- [ ] Dialog shell (`NewRedirectMapModal`, `DeleteMapConfirmModal`, `ImportRedirectMapModal`): frosted overlay + `@blok/dialog` chrome — compare to POC
- [ ] Primary buttons on hero CTAs: `elev-btn blok-btn--primary` anatomy
- [ ] Outline buttons: `elev-btn blok-btn--outline` with subtle backdrop-filter
- [ ] Alert component for Preview Data banner (not a `<div>` — should be `@blok/alert--info` equivalent with `role="status"`)
- [ ] No `#` hex colors visible in DevTools element inspector for any Redirect Manager element (all `color-mix` or `var()` expressions)
- [ ] No `Active` or `Draft` labels anywhere in the UI

---

## Axis 5 — State fidelity

### Full Page states

- [ ] Default: map list populated + detail pane open
- [ ] Empty (no maps): empty-state copy + CTA to create first map
- [ ] Error: friendly error banner + "Show technical details" expandable

### Context Panel states

- [ ] Default: hero count + matched rows + inline form
- [ ] Empty (no matches for this page): empty-state copy + inline form still visible
- [ ] Multi-match (page appears in 2+ maps): map-selector dropdown visible above form

### Dashboard Widget states

- [ ] Default: hero stat + tiles populated (3 real + 1 mock)
- [ ] Empty (no maps): 0 values in tiles; sparkline renders flat or empty

---

## Variant matrix (9 combinations)

| Surface | Light | Dark | Reduced-motion (Light) |
|---------|-------|------|------------------------|
| Full Page | [ ] PASS / FAIL | [ ] PASS / FAIL | [ ] PASS / FAIL |
| Context Panel | [ ] PASS / FAIL | [ ] PASS / FAIL | [ ] PASS / FAIL |
| Dashboard Widget | [ ] PASS / FAIL | [ ] PASS / FAIL | [ ] PASS / FAIL |

**Reduced-motion verification (per surface):**
- Plume backdrop: static (no translate animation)
- Count-up numbers: jump to final value immediately
- Letter-reveal: text shows in final state (no per-character stagger)
- Hover lifts: `transform: none` on card hover

**How to enable reduced-motion:**
- macOS: System Preferences → Accessibility → Display → Reduce Motion
- Chrome DevTools: More tools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`

---

## Acceptable drift

- Real data values (map names, mapping counts, last-updated timestamps differ from POC placeholder values)
- Sonner toast position (only visible mid-write operation)
- Minor pixel-level rendering differences between OS/browser font rendering and the POC HTML

## Unacceptable drift

- Missing hero zone (stat strip not rendered, plume backdrop absent on Full Page)
- Context Panel shows a modal-open button instead of always-visible inline form
- Dashboard Widget missing sparkline section
- Typography scale wrong by more than one Tailwind step
- Color mode breaks (token values clearly wrong — e.g. primary shows as white in dark mode)
- Preview Data banner missing on Full Page or Dashboard Widget
- `Active` / `Draft` labels present anywhere

---

## Outcome

- [ ] **PASS** — record in run manifest `smoke_outcomes.host_frame_smoke: pass`
- [ ] **PASS WITH CAVEATS** — note drift items; file as follow-on tasks; record `pass_with_caveats`
- [ ] **FAIL** — `smoke_outcomes.host_frame_smoke: fail` + note which axis/surface failed + ship is blocked
