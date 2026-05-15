# Host-frame visual smoke

> T064 / T055 — Visual regression smoke against the POC clickdummy ground truth.

The original task breakdown called for a `/test` route hosting a Playwright-driven visual comparison harness. After Tranches 6b–8, the operator-led smoke flow (manual review against the POC HTML inside Cloud Portal) covers the same intent with much less harness machinery. This document captures the **manual procedure** so it can be repeated on demand.

If a future tranche reintroduces automated visual regression, the canonical recipe is the `sitecore:marketplace-sdk-host-frame-testing` skill — it scripts Playwright to load the app inside Cloud Portal, clip the iframe origin, and compare against the POC clickdummy with a configurable pixel tolerance.

## PRD-002 V4 redesign additions

PRD-002 replaced all three extension-point visual surfaces with a V4 Blok Elevated design. The checklist below extends the PRD-000 procedure with PRD-002-specific axes.

### POC reference for PRD-002

The canonical PRD-002 visual reference is **`pocs/poc-v1-prd002/`**. Do NOT use the old `pocs/poc-v1/` frames as ground truth for the redesigned surfaces.

To serve the POC standalone (Playwright MCP rejects `file://` origins):

```bash
npx serve products/redirect-manager/pocs/poc-v1-prd002/
```

Then open `http://localhost:3000` (or the port reported by `serve`). Each HTML file maps to an extension point:

- `full-page.html` — Full Page at various states
- `context-panel.html` — Context Panel (loaded with a matching page URL)
- `dashboard-widget.html` — Dashboard Widget

### PRD-002 visual smoke axes (5-axis check — success metric m2)

Run for each extension point × light mode × dark mode × reduced-motion (9 combinations total):

#### Axis 1 — Layout

| Surface | What to verify |
|---------|---------------|
| Full Page | Plume backdrop visible (if reduced-motion OFF); frosted topbar sticky on scroll; hero zone between topbar and map list; 4-tile stat strip; 2-pane body (rail + main) at ≥1024 px |
| Context Panel | 360 px column; hero count header at top; inline QuickRedirectForm always visible (no modal trigger button); matched-redirect rows below |
| Dashboard Widget | 480 px card; hero stat number + sparkline; 2×2 tile grid; top-destinations rows; recently-shipped mini-widget; footer attribution |

#### Axis 2 — Typography

| Surface | What to verify |
|---------|---------------|
| Full Page hero | Geist Sans 700 at `clamp(48px, 8vw, 96px)` — compare ruler to POC |
| Context Panel hero h1 | Compact clamp — smaller than Full Page; `font-weight: 700` |
| Dashboard Widget | Marketing-grade sub-head; hero stat number at 4.5 rem |

#### Axis 3 — Color (theme-aware gradient tokens)

- Gradient text (Full Page hero headline if gradient variant used) composed via `color-mix(in oklch, var(--primary), var(--info))` — renders as primary→info blend in both light and dark.
- Preview Data banner uses `--primary` tint (not emoji; monochrome info SVG glyph).
- HTTP code badges: 301 = primary-tinted, 302 = warning-tinted, ServerTransfer = neutral. No `Active` / `Draft` labels anywhere.

#### Axis 4 — Component anatomy (Blok primitives)

- Modals use V4 dialog shell (frosted glass overlay with `@blok/dialog` chrome).
- Buttons: primary + outline variants on hero CTAs; ghost icon buttons on row actions.
- Alert component for Preview Data banner.
- No hard-coded hex colors visible (all token-composed).

#### Axis 5 — State fidelity

For each of the 3 surfaces, verify these states render:

| State | Full Page | Context Panel | Dashboard Widget |
|-------|-----------|---------------|-----------------|
| Default (data loaded) | Map list + detail | Matched rows + inline form | Hero stat + tiles |
| Empty (no maps / no matches) | Empty-state copy + CTA | Empty-state with inline form still visible | Tiles show 0 |
| Error | Friendly error banner + "Show technical details" | Error in matched area | Error in tile area |
| Preview Data banner visible | Yes (top of Full Page) | No (real data only) | Yes (top of Dashboard Widget) |

#### Variant matrix

Run all 3 axes × 3 variants = 9 combinations:

| Variant | How to set |
|---------|-----------|
| Light mode | Default; or `d` hotkey → System → Light |
| Dark mode | `d` hotkey → Dark |
| Reduced-motion | OS: macOS: System Preferences → Accessibility → Reduce Motion ON; or Chrome DevTools → Rendering → Emulate CSS `prefers-reduced-motion: reduce` |

Under reduced-motion:
- Plume backdrop must be static (no drift animation).
- Letter-reveal on Full Page hero must show final state immediately (no per-character stagger).
- Count-up numbers must jump directly to target value (no rAF animation).
- Hover lifts must be static (transform: none).

## Manual procedure

### 1. Open the POC reference

**PRD-002:** Open `products/redirect-manager/pocs/poc-v1-prd002/` via `npx serve` (see above). Playwright MCP cannot load `file://` origins.

**PRD-000 reference (carry — do not use as PRD-002 ground truth):** `pocs/poc-v1/` HTML files remain available for PRD-000-era regressions.

Each extension point has its own HTML file:

- `pocs/poc-v1-prd002/context-panel.html`
- `pocs/poc-v1-prd002/dashboard-widget.html`
- `pocs/poc-v1-prd002/full-page.html`

These are the **ground truth** for PRD-002. The shipped app should match them within visual tolerance.

### 2. Open the live app

In Cloud Portal, open each extension point in its real host:

- **Context Panel** — Pages → side-panel dropdown → "Redirects"
- **Dashboard Widget** — Cloud Portal Dashboard for any site → "Redirects summary" tile
- **Full Page** — Cloud Portal launcher → "Redirect Manager"

### 3. Side-by-side comparison

For each extension point:

- Set the operator's primary browser window to the **POC HTML** (open from `pocs/poc-v1/`).
- Set a second window to the **live app inside Cloud Portal**.
- Match viewport sizes (~1440×900 for Full Page, narrower for Context Panel).
- Visually compare. Acceptable drift includes:
  - Real data values (POCs use placeholders like `My Redirect Map`)
  - Last-updated timestamps
  - Sonner toast positions (only visible mid-write)
- Unacceptable drift:
  - Major layout shifts (panes flipped, rail width wildly different)
  - Missing affordances (no edit button, missing "+ Add" button)
  - Color regressions (background tone, primary chip colour)
  - Typography regressions (heading size, body font drift)

### 4. Record outcomes

Note any drift in `project-planning/workflow/friction-log-{run-id}.md`. Each entry should reference:

- Which extension point
- The drift type (layout / colour / typography / affordance)
- POC reference file
- Suggested fix (or `defer` if cosmetic)

## Optional: Automated harness

If the project grows enough to justify automated visual regression:

1. Add `@playwright/test` as a dev dependency.
2. Generate a `/test` route that renders the three extension points side-by-side.
3. Use the recipe in `sitecore:marketplace-sdk-host-frame-testing` to:
   - Navigate Playwright to Cloud Portal's host URL.
   - Locate each iframe origin.
   - Clip the iframe content area.
   - Compare against the POC clickdummy with pixel-tolerance.
4. Wire as a CI job (only on tagged releases — full Cloud Portal session is slow).

This is **not** required for PRD-000 ship — manual smoke is sufficient at the current scale.
