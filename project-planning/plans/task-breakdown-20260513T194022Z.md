# Development Execution Plan — PRD-002 V4-aligned Redesign

---
document_type: task_breakdown
artifact_name: task-breakdown-20260513T194022Z.md
generated_at: 2026-05-13T22:30:00Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260513T194022Z.json
source_inputs:
  - products/redirect-manager/project-planning/PRD/prd-002.md
  - products/redirect-manager/project-planning/PRD/prd-minimal-002.md (Developer 08 orientation only; Lead Developer 06 still uses full PRD)
  - products/redirect-manager/project-planning/architecture/architecture-20260514T000000Z.md
  - products/redirect-manager/project-planning/ADR/ (10 PRD-002-relevant + 3 carry-over ADRs)
  - products/redirect-manager/project-planning/ui-design/ui-design-20260513T194022Z-v1.md
  - products/redirect-manager/pocs/poc-v1-prd002/   # 16 files; canonical visual reference (POC > spec)
  - products/redirect-manager/site/                  # current-code reality verification
consumed_by:
  - QA Specialist (07) enriches this file with TDD steps + per-task tests
  - Developer Code Monkey (08) implements from this file + prd-minimal-002.md ONLY
next_input:
  - project-planning/plans/qa-report.md (optional — § 9 + § 10 stubs reserved for QA enrichment)
---

## 1. Implementation Overview

PRD-002 is a **pure presentation-layer redesign** of the three Sitecore Marketplace extension-point routes shipped in PRD-000 (`/full-page`, `/context-panel`, `/dashboard-widget`) plus **one client-side interaction-pattern change** (Context Panel `AddRedirectModal` → inline `QuickRedirectForm` per ADR-0026 + ADR-0028). The functional contract with Sitecore is preserved 1:1: zero new SDK calls, zero new GraphQL mutations, zero new GraphQL fields, zero backend work, zero Cloud Portal registration changes, zero new Sitecore data-model changes. Every SDK call PRD-002 touches is already in production in PRD-000 with a captured, verified shape (Tranche 6a real-tenant capture, 2026-05-11).

**Scope of change:**

- **NEW CSS architecture.** Three new CSS files — `site/styles/elevated.css` (15 `--v4-*` design-contract variables + site-wide utilities), `site/styles/elevated-plumes.css` (Full-Page-only motion utilities — drifting `--primary`/`--info` plumes + kinetic letter reveal), `site/styles/surfaces.css` (per-surface layouts).
- **NEW mock-data architecture.** Single constants module at `site/lib/mocks/preview-data.ts` exporting `PREVIEW_DATA` (typed mock values per element) + `PREVIEW_DATA_ACTIVE` (per-surface flags). Single canonical swap point for the follow-on data-plumbing PRD.
- **NEW shared components.** `PreviewDataBanner` (mounted on Full Page + Dashboard Widget), `GradientText` utility, `DecorativeCta` wrapper (toast-onClick per ADR-0030), count-up animation hook, kinetic letter-reveal helper.
- **NEW Full Page composition.** Workspace hero zone (between topbar and map list), 4-tile stat strip, plume backdrop, re-skinned TopActionRow / RedirectMapList / RedirectMapDetail / CRUD modals.
- **NEW Context Panel composition.** Hero `<h1>` count header, hero summary tile, inline `QuickRedirectForm` (replaces `AddRedirectModal`), multi-match dropdown affordance, re-skinned `MatchedMapGroup` + `RegexBanner`.
- **NEW Dashboard Widget composition.** Hero stat + sparkline + 3 real tiles re-skinned + 4th mock tile (Recently shipped count) + top-destinations + recently-shipped + footer attribution (all mocks under Preview Data banner).
- **DELETED.** `site/components/context-panel/AddRedirectModal.tsx` removed entirely per ADR-0028 Option A (T6 — Tranche 6 file removal).
- **5 NEW structural guards** appended in place to `site/tests/structural/structural-guards.test.ts`.
- **Test rework cascade.** Class-string anatomy tests across `site/tests/ui/**` are audited line-by-line and updated in a dedicated tranche (T7); behavior-asserting tests stay; the `AddRedirectModal` Vitest test file is rewritten to target `QuickRedirectForm`.

**Dependencies on PRD-000 baseline:** Mode A scaffold (ADR-0002) carries; `@sitecore-marketplace-sdk/*` import boundary unchanged; theme.css / globals.css token surface unchanged; HahnSoloFooter at `z-index: 50` unchanged; `RedirectType` 3-value enum verified in code (`site/lib/domain/types.ts:17`); Vitest + Next 16 + Tailwind 4 toolchain unchanged (`site/package.json` already lists Next 16.1.7, React 19.2.4, Tailwind 4.2.1, Vitest 4.1.5).

**What's new vs modified vs deleted (file-level):**

| Status | Path | Note |
|---|---|---|
| NEW | `site/styles/elevated.css` | 15 V4 variables + utility classes |
| NEW | `site/styles/elevated-plumes.css` | Full-Page-only motion |
| NEW | `site/styles/surfaces.css` | per-surface layouts |
| NEW | `site/lib/mocks/preview-data.ts` | `PREVIEW_DATA` + `PREVIEW_DATA_ACTIVE` |
| NEW | `site/components/ui/preview-data-banner.tsx` | banner component |
| NEW | `site/components/ui/gradient-text.tsx` | shared utility |
| NEW | `site/components/ui/decorative-cta.tsx` | toast-onClick wrapper (ADR-0030) |
| NEW | `site/hooks/use-count-up.ts` | count-up animation hook |
| NEW | `site/hooks/use-letter-reveal.ts` | kinetic letter-split helper |
| NEW | `site/components/full-page/WorkspaceHero.tsx` | hero zone |
| NEW | `site/components/full-page/StatStrip.tsx` | 4-tile strip |
| NEW | `site/components/context-panel/QuickRedirectForm.tsx` | inline form (replaces modal) |
| NEW | `site/components/context-panel/ContextPanelHero.tsx` | `<h1>` count header |
| NEW | `site/components/context-panel/MultiMatchDropdown.tsx` | dropdown affordance (ADR-0029) |
| NEW | `site/components/dashboard-widget/DashboardHero.tsx` | hero stat + sparkline |
| NEW | `site/components/dashboard-widget/Sparkline.tsx` | mocked SVG |
| NEW | `site/components/dashboard-widget/TopDestinations.tsx` | 5 mock rows |
| NEW | `site/components/dashboard-widget/RecentlyShipped.tsx` | 3 mock rows + count tile |
| NEW | `site/components/dashboard-widget/HealthBadge.tsx` | monochrome SVG "all healthy" badge |
| MODIFIED | `site/app/layout.tsx` | import elevated.css after globals.css |
| MODIFIED | `site/app/full-page/layout.tsx` (or page.tsx) | import elevated-plumes.css |
| MODIFIED | `site/components/full-page/FullPage.tsx` | mount plume backdrop + hero + stat strip + banner |
| MODIFIED | `site/components/full-page/TopActionRow.tsx` | V4 frosted-glass topbar chrome |
| MODIFIED | `site/components/full-page/RedirectMapList.tsx` | V4 card chrome; single static dot color |
| MODIFIED | `site/components/full-page/RedirectMapDetail.tsx` | V4 table chrome; remove status column |
| MODIFIED | `site/components/full-page/NewRedirectMapModal.tsx` | V4 dialog shell |
| MODIFIED | `site/components/full-page/DeleteMapConfirmModal.tsx` | V4 dialog shell |
| MODIFIED | `site/components/full-page/ImportRedirectMapModal.tsx` | V4 dialog shell |
| MODIFIED | `site/components/full-page/CollectionPicker.tsx` | re-skin |
| MODIFIED | `site/components/full-page/SitePicker.tsx` | re-skin |
| MODIFIED | `site/components/context-panel/ContextPanel.tsx` | mount hero + inline form; delete modal trigger |
| MODIFIED | `site/components/context-panel/MatchedMapGroup.tsx` | V4 row anatomy; drop status pill |
| MODIFIED | `site/components/context-panel/RegexBanner.tsx` | V4 `@blok/alert--info` chrome |
| MODIFIED | `site/components/context-panel/EditMapSettingsModal.tsx` | V4 dialog shell |
| MODIFIED | `site/components/dashboard-widget/DashboardWidget.tsx` | mount banner + hero + sparkline + tiles |
| MODIFIED | `site/components/dashboard-widget/StatTile.tsx` | V4 chrome |
| MODIFIED | `site/tests/structural/structural-guards.test.ts` | append 5 new guards |
| MODIFIED | `site/tests/ui/context-panel/MatchedMapGroup.test.tsx` | re-point class assertions |
| MODIFIED | (other `site/tests/ui/**/*.test.tsx`) | re-point class assertions per audit (T7) |
| DELETED | `site/components/context-panel/AddRedirectModal.tsx` | per ADR-0028 |
| REWRITTEN | `site/tests/ui/context-panel/AddRedirectModal.test.tsx` → `QuickRedirectForm.test.tsx` | re-pointed at inline form |

---

## 2. Epics

| Epic | Title | Scope |
|---|---|---|
| **A** | CSS architecture foundation | `elevated.css` (15 vars + utilities), `elevated-plumes.css` (Full-Page-only motion), `surfaces.css` (per-surface layouts). R-13 mitigation. |
| **B** | Mock-data architecture | `PREVIEW_DATA` constants + `PREVIEW_DATA_ACTIVE` flags + `PreviewDataBanner` component. ADR-0025. |
| **C** | Shared component layer | `GradientText`, `DecorativeCta`, count-up hook, letter-reveal helper, frosted-glass shared utilities. |
| **D** | Full Page redesign | TopActionRow re-skin + WorkspaceHero + StatStrip + RedirectMapList + RedirectMapDetail + all CRUD modals. Hero CTAs decorative per ADR-0030. |
| **E** | Context Panel redesign + UX evolution | ContextPanelHero + inline QuickRedirectForm (replaces AddRedirectModal) + MultiMatchDropdown + MatchedMapGroup re-skin + RegexBanner re-skin. Multi-match affordance per ADR-0029. |
| **F** | Dashboard Widget redesign | DashboardHero + Sparkline + 3 real tiles re-skin + 4th mock tile + TopDestinations + RecentlyShipped + HealthBadge + footer attribution. |
| **G** | Reduced-motion + theme audit | `prefers-reduced-motion: reduce` gating across all `@keyframes`; theme toggle continues to work end-to-end. |
| **H** | Structural guards | 5 new guards appended in place to `structural-guards.test.ts`. |
| **I** | Test rework cascade | R-12 dedicated tranche — line-by-line audit + replacement of class-string assertions; `AddRedirectModal` tests rewritten as `QuickRedirectForm` tests. |
| **J** | Smoke prep + documentation | Smoke checklists for m1-m5; host-frame smoke prep against refined POC; docs/architecture.md + docs/decisions.md updates. |

---

## 3. Feature Breakdown

| Feature | Epic | Surfaces affected | New SDK calls? | Test impact |
|---|---|---|---|---|
| V4 design-contract CSS variables (R-13) | A | All 3 | 0 | Structural guard #3 added |
| Plume backdrop (Full Page only) | A, D, G | Full Page | 0 | Structural guard #5 (import boundary) |
| Mock-data module + flags | B | Full Page + Dashboard Widget | 0 | Unit test on PREVIEW_DATA shape |
| Preview Data banner | B | Full Page + Dashboard Widget | 0 | Structural guard #4 (banner ↔ `data-preview-mock` pair) |
| GradientText / DecorativeCta / count-up / letter-reveal | C | All 3 | 0 | Hook unit tests + a11y reduced-motion tests |
| Full Page workspace hero + stat strip | D | Full Page | 0 | UI test + count-up reduced-motion test |
| All Full Page CRUD modals re-skin | D | Full Page | 0 | Class-string assertions updated (T7) |
| Context Panel hero count header | E | Context Panel | 0 | UI test on `matchedGroups.length` rendering |
| Inline QuickRedirectForm (replaces AddRedirectModal) | E | Context Panel | 0 (same SDK calls) | **Largest test impact** — `AddRedirectModal.test.tsx` rewritten as `QuickRedirectForm.test.tsx` |
| Multi-match dropdown | E | Context Panel | 0 | UI test for multi-match state |
| Dashboard Widget hero + sparkline + tiles | F | Dashboard Widget | 0 | UI test + class assertions updated |
| `@keyframes` reduced-motion audit | G | All 3 | 0 | Structural guard #2 (pairing) |
| No-hex / no-Active-Draft / no-lang-count guards | H | All 3 | 0 | Structural guards #1, #6, #7 |
| Test re-pointing (anatomy) | I | All 3 | 0 | Bulk update; behavior assertions preserved |
| Docs + smoke prep | J | All 3 | 0 | Manual checklist outputs |

---

## 4. Task Breakdown

For each task: **Task ID** is stable; **Depends on** lists comma-separated Task IDs (or `none`); test tasks are listed test-after by default (QA Specialist may flip to test-first).

### Epic A — CSS architecture foundation

#### T001 — Create `site/styles/elevated.css` with 15 design-contract variables + shared utilities

- **Task ID:** T001
- **Title:** Author `site/styles/elevated.css` (15 `--v4-*` variables + shared utilities)
- **Description:** Create the site-wide CSS module that holds the V4 design-contract variable set (R-13 mitigation) at the top, then site-wide utility classes that compose Blok tokens via `color-mix(in oklch, ...)`. Variables are non-negotiable values verified against the refined POC `pocs/poc-v1-prd002/elevated.css`:
  - `--v4-plume-duration: 28s;`
  - `--v4-plume-easing: cubic-bezier(0.4, 0, 0.2, 1);`
  - `--v4-glass-blur: 18px;`
  - `--v4-glass-saturation: 160%;`
  - `--v4-glass-alpha: 80%;`
  - `--v4-hover-lift-distance: 2px;`
  - `--v4-hover-lift-scale: 1.005;`
  - `--v4-hover-glow-tint: 14%;`
  - `--v4-hover-glow-blur: 32px;`
  - `--v4-hero-clamp-min: 48px;`
  - `--v4-hero-clamp-max: 96px;`
  - `--v4-hero-clamp-vw: 8vw;`
  - `--v4-letter-reveal-stagger: 28ms;`
  - `--v4-letter-reveal-total: 800ms;`
  - `--v4-count-up-duration: 1400ms;`
  - `--v4-premium-ease: cubic-bezier(0.16, 1, 0.3, 1);`
  - `--v4-gradient-text: linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 55%, var(--info)));`

  Utility classes to define:
  - `.elev-glass-surface` — `background: color-mix(in oklch, var(--card) var(--v4-glass-alpha), transparent); backdrop-filter: blur(var(--v4-glass-blur)) saturate(var(--v4-glass-saturation));`
  - `.elev-card` — frosted card surface + hover-lift (`translateY(calc(var(--v4-hover-lift-distance) * -1)) scale(var(--v4-hover-lift-scale))`) + primary-tinted hover glow (`box-shadow: 0 12px var(--v4-hover-glow-blur) color-mix(in oklch, var(--primary) var(--v4-hover-glow-tint), transparent)`).
  - `.elev-hero-text` — `font: 700 clamp(var(--v4-hero-clamp-min), var(--v4-hero-clamp-vw), var(--v4-hero-clamp-max)) / 1 var(--font-geist-sans);` with optional `.elev-hero-text--gradient` modifier applying `--v4-gradient-text` + `background-clip: text; color: transparent;`.
  - `.elev-count-up` — base style for animated count-up numbers (tabular-nums; transition curve via `--v4-premium-ease`).

  Include `@supports not (backdrop-filter: blur(1px))` fallback rule that sets solid `--card` background with a subtle `--border` emphasis. Include `@media (prefers-reduced-motion: reduce)` rules that neutralize all transition-based animations defined in this file (hover lift, count-up timing).

  No `#` hex literals. Cite the refined POC `pocs/poc-v1-prd002/elevated.css` as the visual source-of-truth when there's any visual ambiguity.
- **Expected Output:** `site/styles/elevated.css` exists; all 15 `--v4-*` vars at top of file; utilities defined; `@supports` fallback present; reduced-motion media query present. File contains zero `#` hex literals.
- **Depends on:** none

#### T002 — Create `site/styles/elevated-plumes.css` with Full-Page-only motion utilities

- **Task ID:** T002
- **Title:** Author `site/styles/elevated-plumes.css` (Full-Page-only motion)
- **Description:** Create the motion-utility CSS module containing the drifting `--primary` / `--info` plume backdrop + kinetic letter-reveal `@keyframes`. **This file must be imported ONLY by Full Page route source files** (structural guard #5 enforces). Visual contract from refined POC `pocs/poc-v1-prd002/elevated-plumes.css`:
  - `.fp-plume-backdrop` — `position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden;`
  - `.fp-plume-backdrop::before` and `::after` — two large blurred radial-gradient discs composed via `color-mix(in oklch, var(--primary), transparent)` and `color-mix(in oklch, var(--info), transparent)`. Animate via `@keyframes backdrop-drift` translating + opacity-cycling over `var(--v4-plume-duration)` (28s) using `var(--v4-plume-easing)`.
  - `.fp-hero-reveal-letters` — each letter span starts at `opacity: 0; transform: translateY(8px);` and animates to `opacity: 1; transform: translateY(0);` over `var(--v4-letter-reveal-total)` with per-letter stagger via the `--reveal-delay` CSS custom property (set by JS span-splitter). Total: 800ms across the headline; per-letter: 28ms.
  - **Every `@keyframes` block in this file has a paired `@media (prefers-reduced-motion: reduce)` rule that sets `animation: none;` on the relevant selectors.**
- **Expected Output:** `site/styles/elevated-plumes.css` exists; `.fp-plume-backdrop` + `@keyframes backdrop-drift` + `.fp-hero-reveal-letters` + reduced-motion gates all present. Zero `#` hex literals.
- **Depends on:** T001

#### T003 — Create `site/styles/surfaces.css` with per-surface layouts

- **Task ID:** T003
- **Title:** Author `site/styles/surfaces.css` (per-surface layout shells)
- **Description:** Create the per-surface layout CSS module — selectors scoped to Full Page (`.fp-*`), Context Panel (`.cp-*`), and Dashboard Widget (`.dw-*`) — that wires the layout grids, hero zones, and component scaffolding documented in the refined POC `pocs/poc-v1-prd002/surfaces.css`. Cover:
  - Full Page: `.fp-shell` (3-band shell), `.fp-topbar` (frosted-glass topbar at `z-index: 40`), `.fp-hero` (workspace hero zone — eyebrow + headline + sub + CTAs cluster), `.fp-stat-strip` (4-tile flex/grid), `.fp-body` (rail + main column at ≥1024px).
  - Context Panel: `.cp-shell` (compact 360px column), `.cp-header` (hero count header), `.cp-summary` (hero summary tile), `.cp-form` (inline form card), `.cp-list` (matched-rows container), `.cp-row` (single row anatomy).
  - Dashboard Widget: `.dw-shell` (480px compact tile), `.dw-hd` (header), `.dw-hero` (hero stat zone), `.dw-spark` (sparkline container), `.dw-rows` (top-destinations rows), `.dw-recent` (recently-shipped mini-widget), `.dw-footer` (attribution).
  - Modal shells: `.elev-modal` overlay (sits above HahnSoloFooter per architecture Decision 4 z-index hierarchy — modal `z-index: 100`, footer `z-index: 50`).

  All selectors must compose Blok tokens — zero `#` hex literals.
- **Expected Output:** `site/styles/surfaces.css` exists; all surface scaffolding classes defined; no hex literals.
- **Depends on:** T001

#### T004 — Import `elevated.css` in root `app/layout.tsx`; import `elevated-plumes.css` in Full Page route only

- **Task ID:** T004
- **Title:** Wire CSS imports — site-wide vs Full-Page-only
- **Description:** Add CSS imports preserving the import-boundary contract per ADR-0027:
  - **Root `site/app/layout.tsx`:** add `import "../styles/elevated.css";` and `import "../styles/surfaces.css";` immediately AFTER `import "./globals.css";`.
  - **Full Page route source files only:** add `import "../../../styles/elevated-plumes.css";` (or equivalent relative path) in **either** `site/app/full-page/page.tsx` **or** a new `site/app/full-page/layout.tsx` (Lead Developer's call — adopting a route-scoped layout is cleaner; create the layout file if it doesn't exist). The plume CSS file must NOT be imported from `app/layout.tsx`, from Context Panel files, or from Dashboard Widget files. The plume-CSS-import-boundary structural guard (T058) enforces.
- **Expected Output:** `site/app/layout.tsx` imports `elevated.css` + `surfaces.css`; Full Page route file imports `elevated-plumes.css`; no other route imports plume CSS. Existing `globals.css` import preserved at the top.
- **Depends on:** T001, T002, T003

### Epic B — Mock-data architecture + Preview Data banner

#### T005 — Create `site/lib/mocks/preview-data.ts` (PREVIEW_DATA + PREVIEW_DATA_ACTIVE)

- **Task ID:** T005
- **Title:** Author `PREVIEW_DATA` constants + `PREVIEW_DATA_ACTIVE` flags module
- **Description:** Create `site/lib/mocks/preview-data.ts` per PRD § 10 + architecture § 4.1. The module exports:
  - `PREVIEW_DATA_ACTIVE` — `as const` object keyed by surface: `{ fullPage: true, dashboardWidget: true, contextPanel: false }`.
  - `PREVIEW_DATA` — `as const` object with **typed shapes matching the eventual real-data shapes** (consumers swap source not type when the follow-on data-plumbing PRD migrates). Slots:
    - `heroStat: { value: 12428, label: 'Active redirects', delta: { value: 412, period: 'this week' } }`
    - `sparkline: { points: [42, 38, 40, 32, 34, 28, 30, 22, 26, 18, 24, 14, 18, 10, 16, 8, 12, 6, 10, 4, 8], accent: 'var(--primary)' }`
    - `topDestinations: [ { name: '/products', count: 3184, barFillPct: 88 }, { name: '/black-friday', count: 2247, barFillPct: 62 }, { name: '/campaigns/promo', count: 1602, barFillPct: 44 }, { name: '/sale', count: 1011, barFillPct: 28 }, { name: '/early-access', count: 638, barFillPct: 18 } ]`
    - `recentlyShipped: { countLast24h: 4, rows: [ { source: '/old/products', target: '/products', type: 'Redirect301' }, { source: '/promo-legacy', target: '/campaigns/promo', type: 'Redirect301' }, { source: '/black-friday-2024', target: '/black-friday', type: 'Redirect301' } ] }`
    - `dashboardFooter: { lastPublishedAgo: '14 m ago', author: 'Anna', healthStatus: 'all healthy' }`
    - `fullPageStatStrip: { mappingsTotal: { value: 68, sub: '+4 today' }, redirect301Count: { value: 64, sub: '94% of total' }, redirect302Count: { value: 4, sub: 'expire in 21d' }, conflictsCount: { value: 0, sub: 'all clear' } }`
    - `fullPageHero: { activeMapsCount: 8, healthStatus: 'all healthy', lastPublishAgo: '14 minutes ago', lastPublishBy: 'Anna', conflictsResolved: true }`

  **All paths en-only** (no `/de/...`). Use the existing `RedirectType` import from `@/lib/domain/types` for typed redirect-type slots. **No `#` hex literals.** Pure TypeScript constants module — zero SDK dependencies, zero runtime side-effects.
- **Expected Output:** `site/lib/mocks/preview-data.ts` exists with both exports `as const`; types align with `RedirectType` for redirect-type fields; all mock paths are en-only.
- **Depends on:** none

#### T006 — Create `PreviewDataBanner` component at `site/components/ui/preview-data-banner.tsx`

- **Task ID:** T006
- **Title:** Author `PreviewDataBanner` component
- **Description:** Create the single banner component used on both Full Page and Dashboard Widget. Anatomy: `@blok/alert--info` variant (existing `site/components/ui/alert.tsx`). Props:
  - `surface: 'fullPage' | 'dashboardWidget' | 'contextPanel'`
  - The component reads `PREVIEW_DATA_ACTIVE[surface]` and conditionally renders. If false → returns `null`. If true → renders the alert.

  Banner copy (per OQ-2 / UI design spec): `"Some metrics on this surface use preview data — wired up in a follow-on release."` with a small inline monochrome `info` SVG glyph (NOT the emoji `ⓘ`). Use `currentColor` so the glyph respects theme color.
- **Expected Output:** `site/components/ui/preview-data-banner.tsx` exists; exports `PreviewDataBanner` React component with typed `surface` prop; uses existing `@/components/ui/alert` primitive; respects `PREVIEW_DATA_ACTIVE`; returns `null` when flag is false.
- **Depends on:** T005

#### T007 — Unit test for `PREVIEW_DATA` shape + flag wiring

- **Task ID:** T007
- **Title:** Vitest unit test for `preview-data.ts` shape
- **Description:** Co-located test at `site/lib/mocks/preview-data.test.ts`. Assertions:
  - `PREVIEW_DATA_ACTIVE.fullPage === true`, `.dashboardWidget === true`, `.contextPanel === false`.
  - `PREVIEW_DATA.recentlyShipped.rows` is length 3; each `type` is `Redirect301`.
  - All `topDestinations[].name` strings match `^/[a-z0-9-/]+$` regex (en-only, lower-case).
  - All `recentlyShipped.rows[].source` and `.target` strings match the same regex.
  - `fullPageStatStrip` has all 4 keys with `value: number` and `sub: string`.
  - `heroStat.value` is a positive number; `delta.value` is a positive number.
- **Expected Output:** `site/lib/mocks/preview-data.test.ts` exists; all assertions pass via `npm run test`.
- **Depends on:** T005

#### T008 — UI test for `PreviewDataBanner` (active vs inactive)

- **Task ID:** T008
- **Title:** Vitest UI test for `PreviewDataBanner`
- **Description:** Co-located test at `site/components/ui/preview-data-banner.test.tsx`. Assertions:
  - Render `<PreviewDataBanner surface="fullPage" />` → banner DOM present; copy contains "preview data".
  - Render `<PreviewDataBanner surface="contextPanel" />` → component returns `null` (no DOM output).
  - Banner uses `@blok/alert` info variant (assert by `role="status"` or `aria-label` if present in the alert primitive).
- **Expected Output:** `site/components/ui/preview-data-banner.test.tsx` exists; tests pass via `npm run test`.
- **Depends on:** T006

### Epic C — Shared component layer

#### T009 — Create `GradientText` utility component

- **Task ID:** T009
- **Title:** Author `GradientText` shared utility
- **Description:** Create `site/components/ui/gradient-text.tsx`. A presentational wrapper that applies the `.elev-hero-text--gradient` CSS class to its children. Props: `children: ReactNode`, `as?: 'h1' | 'h2' | 'span'` (default `'span'`), optional `className?: string` for composition. Theme-aware automatically (the gradient is composed via tokens in `elevated.css` — light/dark switch handled by token recomposition).
- **Expected Output:** `site/components/ui/gradient-text.tsx` exists; default-exports `GradientText`; applies `.elev-hero-text--gradient` class.
- **Depends on:** T001

#### T010 — Create `DecorativeCta` wrapper (ADR-0030 toast-onClick)

- **Task ID:** T010
- **Title:** Author `DecorativeCta` toast wrapper
- **Description:** Create `site/components/ui/decorative-cta.tsx`. Wraps the existing `Button` from `@/components/ui/button`. Props:
  - `label: string`
  - `toastCopy: string`
  - `variant?: 'default' | 'ghost' | ...` (passthrough)
  - `className?: string`

  `onClick` invokes `toast(toastCopy)` from `sonner` (already a project dep — see `package.json`). Renders a button visually identical to a wired CTA but functionally a no-op other than the toast. ADR-0030: the two Full Page hero CTAs (View activity, Publish all) use this; toast copy is supplied by the caller (Full Page workspace).
- **Expected Output:** `site/components/ui/decorative-cta.tsx` exists; exports `DecorativeCta`; uses existing `Button` + `toast`.
- **Depends on:** T001

#### T011 — Create `useCountUp` hook

- **Task ID:** T011
- **Title:** Author `useCountUp(targetValue, durationMs)` React hook
- **Description:** Create `site/hooks/use-count-up.ts` (or co-locate under `site/lib/hooks/` per existing project convention — Lead Developer's call). The hook animates a number from 0 to `targetValue` over `durationMs` using `requestAnimationFrame` + `easeOutCubic`. Reads `var(--v4-count-up-duration)` from CSS as default if `durationMs` is omitted (use `1400ms` default in code as fallback). **Hard requirement: respects `window.matchMedia('(prefers-reduced-motion: reduce)').matches` — when true, immediately returns the target value (no animation).** Returns the current animated value as a number. Cleanup `cancelAnimationFrame` on unmount.

  Browser-globals discipline (CLAUDE.md memory `feedback_hydration_mismatch_pattern`): NEVER branch on `typeof window` / `matchMedia` in useState init or render body. Put the `matchMedia` check inside `useEffect`.
- **Expected Output:** `site/hooks/use-count-up.ts` exists; exports `useCountUp(target: number, durationMs?: number): number`; reduced-motion early-return inside `useEffect`; cancels animation on unmount.
- **Depends on:** T001

#### T012 — Create `useLetterReveal` hook (kinetic letter-split helper)

- **Task ID:** T012
- **Title:** Author `useLetterReveal` React hook
- **Description:** Create `site/hooks/use-letter-reveal.ts`. The hook splits a headline string into character spans and applies a staggered `--reveal-delay` custom property per span (per-letter stagger of `var(--v4-letter-reveal-stagger)` from CSS). Returns the array of `<span>` elements (or a ref-callback pattern — Lead Developer's call). Respects `prefers-reduced-motion: reduce` (when true, renders flat plain text with no spans — no reveal animation; same accessibility tree as flat text).
- **Expected Output:** `site/hooks/use-letter-reveal.ts` exists; exports `useLetterReveal(text: string)`; reduced-motion early-return; SSR-safe (no `typeof window` in render).
- **Depends on:** T001

#### T013 — Unit tests for `useCountUp` + `useLetterReveal` (reduced-motion paths)

- **Task ID:** T013
- **Title:** Hook unit tests with reduced-motion mock
- **Description:** Tests at `site/hooks/use-count-up.test.tsx` and `site/hooks/use-letter-reveal.test.tsx`. Mock `window.matchMedia` to return `matches: true` and assert:
  - `useCountUp` returns the target value immediately (no animation frames).
  - `useLetterReveal` returns flat text (no character spans).

  Also test the non-reduced-motion happy path: `useCountUp` produces intermediate values then lands at target; `useLetterReveal` produces N spans where N === text.length (excluding spaces if the helper preserves them).
- **Expected Output:** Both test files exist; reduced-motion paths verified; happy paths verified.
- **Depends on:** T011, T012

### Epic D — Full Page redesign

#### T014 — Re-skin `TopActionRow` to V4 frosted-glass topbar

- **Task ID:** T014
- **Title:** Re-skin `TopActionRow.tsx` to V4 chrome
- **Description:** Edit `site/components/full-page/TopActionRow.tsx` to apply V4 chrome: container uses `.elev-glass-surface` + `.fp-topbar` (per `surfaces.css`); breadcrumb on the left; action buttons (Import / Export / New map) on the right. **Functional behavior unchanged** — all 3 buttons fire the same handlers they fire today. `z-index: 40` per surfaces.css (sits above content, below HahnSoloFooter at 50).
- **Expected Output:** TopActionRow renders with V4 frosted-glass chrome; all 3 button handlers carry; no `#` hex literals introduced.
- **Depends on:** T004

#### T015 — Author `WorkspaceHero.tsx` (Full Page hero zone)

- **Task ID:** T015
- **Title:** Author `site/components/full-page/WorkspaceHero.tsx`
- **Description:** Create the workspace hero zone component. Composition:
  - Eyebrow chip: `"Workspace · {siteName} {locale}"` — wire to existing site/locale from `application.context` (Lead Developer reads from the existing `useAppContext()` hook).
  - `<GradientText as="h1" className="elev-hero-text">` rendering the headline: `"{activeMapsCount} active maps, all healthy."` — uses `PREVIEW_DATA.fullPageHero.activeMapsCount` (mock per § 4c-4) and the static `"all healthy"` from the mock. Apply `useLetterReveal` to the headline.
  - Sub-line: `"Last publish {lastPublishAgo} by {lastPublishBy}. No conflicting source URLs detected."` — all from `PREVIEW_DATA.fullPageHero`. **DO NOT include "Edge caches refreshed across N languages"** (dropped per FR-R11).
  - Two `<DecorativeCta>` buttons:
    - `label="View activity"`, `toastCopy="Activity log coming in a follow-on release. For now, the Dashboard Widget shows the most recent change timestamp."`
    - `label="Publish all"`, `toastCopy="Bulk publish coming in a follow-on release. For now, individual map changes save and publish immediately."`

  Mock elements (headline counts, sub-line author/time) carry `data-preview-mock="true"`.
- **Expected Output:** `site/components/full-page/WorkspaceHero.tsx` exists; renders eyebrow + gradient headline + sub-line + 2 decorative CTAs; mocks tagged with `data-preview-mock`.
- **Depends on:** T005, T009, T010, T012

#### T016 — Author `StatStrip.tsx` (4-tile Full Page stat strip)

- **Task ID:** T016
- **Title:** Author `site/components/full-page/StatStrip.tsx`
- **Description:** Create the 4-tile stat strip displayed above the map detail on Full Page. Each tile is an `.elev-card`-styled frosted surface with a count-up number (`useCountUp` → `PREVIEW_DATA.fullPageStatStrip.<slot>.value`), an uppercase label, a sub-line, and a subtle gradient spark glyph at the bottom. The 4 slots:
  - Mappings total: `value: 68`, label: `"Mappings"`, sub: `"+4 today"`
  - 301 Permanent: `value: 64`, label: `"301 Permanent"`, sub: `"94% of total"`
  - 302 Temporary: `value: 4`, label: `"302 Temporary"`, sub: `"expire in 21d"`
  - Conflicts: `value: 0`, label: `"Conflicts"`, sub: `"all clear"`

  All tiles carry `data-preview-mock="true"`. Layout: 4-column flex/grid via `.fp-stat-strip` from `surfaces.css`.
- **Expected Output:** `site/components/full-page/StatStrip.tsx` exists; renders 4 tiles; count-up on each; `data-preview-mock` tags present.
- **Depends on:** T005, T011

#### T017 — Modify `FullPage.tsx` to compose plume backdrop + banner + hero + stat strip + re-skinned children

- **Task ID:** T017
- **Title:** Compose Full Page shell with V4 elements
- **Description:** Edit `site/components/full-page/FullPage.tsx`. Insert in order:
  1. `<div className="fp-plume-backdrop" aria-hidden="true" />` as the first child of the shell.
  2. `<TopActionRow />` (re-skinned per T014).
  3. `<PreviewDataBanner surface="fullPage" />` directly below the topbar.
  4. `<WorkspaceHero />` between the topbar and the map list.
  5. The existing two-column body (left rail RedirectMapList + right RedirectMapDetail), with the `<StatStrip />` mounted above the RedirectMapDetail.

  All existing logic — site / collection picker, map selection state, modal triggers, drag-and-drop reorder, import/export wizard wiring — carries unchanged. The plume backdrop sits at `z-index: -1` (per `elevated-plumes.css`) and the topbar at `z-index: 40` (per `surfaces.css`) — both below the HahnSoloFooter's `z-index: 50`.
- **Expected Output:** `FullPage.tsx` renders the plume backdrop + banner + hero + stat strip + existing children with V4 chrome; all pre-existing behavior intact.
- **Depends on:** T002, T004, T006, T014, T015, T016

#### T018 — Re-skin `RedirectMapList.tsx` (Full Page left rail)

- **Task ID:** T018
- **Title:** Re-skin `RedirectMapList.tsx` to V4 frosted card surfaces
- **Description:** Edit `site/components/full-page/RedirectMapList.tsx`. Apply `.elev-glass-surface .elev-card` to each map-row card. **Left-rail map row dot becomes a single static `--primary` color** — DROP any `--draft` variant or class. `react-virtuoso` virtualization, selection state, keyboard nav all carry. Selected row uses `aria-selected="true"` + a subtle primary-tinted background.
- **Expected Output:** RedirectMapList renders with V4 frosted-glass card surfaces; single static dot color; no `--draft` variant; virtualization intact.
- **Depends on:** T001, T004

#### T019 — Re-skin `RedirectMapDetail.tsx` (Full Page right column)

- **Task ID:** T019
- **Title:** Re-skin `RedirectMapDetail.tsx` to V4 table chrome; remove status column
- **Description:** Edit `site/components/full-page/RedirectMapDetail.tsx`. Apply V4 chrome:
  - Card surface uses `.elev-glass-surface` + `.elev-card`.
  - Header (map name + meta + actions) uses V4 typography scale + button styling.
  - Tools row (search / Add mapping) uses Blok `@blok/input` + ghost `@blok/button` chrome.
  - Mappings table: header row + data rows in V4 chrome (typography, borders composed from `--border` token, tabular-nums for the RedirectType column).
  - **Drop the dedicated "status" column entirely** (per architecture § 2.2 / PRD § 11.2). The RedirectType column already carries the only state we display (`301` / `302` / `Server Transfer`).
  - Drag-and-drop reorder (`@dnd-kit/sortable`) intact; inline-edit row pattern intact; row action icons (Edit / Delete) intact.
- **Expected Output:** RedirectMapDetail renders with V4 chrome; no status column; RedirectType column uses `redirectTypeDisplayName()` from existing enum module; drag-and-drop + inline-edit + actions carry.
- **Depends on:** T001, T004

#### T020 — Re-skin `NewRedirectMapModal.tsx` to V4 frosted-glass dialog shell

- **Task ID:** T020
- **Title:** Re-skin `NewRedirectMapModal.tsx`
- **Description:** Edit `site/components/full-page/NewRedirectMapModal.tsx`. Wrap the existing `Dialog` in `.elev-glass-surface` chrome. **Modal title stays utility-tool voice** (D5 does NOT extend to modal titles per PRD § 11). Form body, validation, SDK call sites unchanged. Modal overlay sits at `z-index: 100` per architecture Decision 4 (above HahnSoloFooter's z-index 50).
- **Expected Output:** Modal renders with V4 frosted-glass dialog shell; title remains utility voice; form logic + `createRedirectMap` call site intact.
- **Depends on:** T001, T004

#### T021 — Re-skin `DeleteMapConfirmModal.tsx` to V4 dialog shell

- **Task ID:** T021
- **Title:** Re-skin `DeleteMapConfirmModal.tsx`
- **Description:** Edit `site/components/full-page/DeleteMapConfirmModal.tsx`. Apply `.elev-glass-surface` to the dialog shell; preserve confirm-text + destructive button styling (existing `Button variant="destructive"` carries). Title remains utility voice.
- **Expected Output:** Delete confirm modal renders with V4 chrome; existing handlers + `deleteRedirectMap` call site intact.
- **Depends on:** T001, T004

#### T022 — Re-skin `ImportRedirectMapModal.tsx` to V4 dialog shell

- **Task ID:** T022
- **Title:** Re-skin `ImportRedirectMapModal.tsx`
- **Description:** Edit `site/components/full-page/ImportRedirectMapModal.tsx`. Apply `.elev-glass-surface` to the dialog shell. Wizard steps (preview → diff → conflict-resolution actions) carry. Title remains utility voice.
- **Expected Output:** Import modal renders with V4 chrome; wizard logic + import-diff + 3-action conflict resolution (ADR-0006) intact.
- **Depends on:** T001, T004

#### T023 — Re-skin `CollectionPicker.tsx` + `SitePicker.tsx`

- **Task ID:** T023
- **Title:** Re-skin Full Page collection + site pickers
- **Description:** Edit `site/components/full-page/CollectionPicker.tsx` and `SitePicker.tsx`. Apply V4 chrome (typography, Blok `@blok/select` styling). Data-fetching behavior (`xmc.sites.listCollections`, `xmc.sites.listSites` via `site/lib/sdk/sites.ts`) and `localStorage` state carry unchanged.
- **Expected Output:** Both pickers render with V4 chrome; SDK reads + `localStorage` persistence intact.
- **Depends on:** T001, T004

### Epic E — Context Panel redesign + UX evolution

#### T024 — Author `ContextPanelHero.tsx` (`<h1>` count header)

- **Task ID:** T024
- **Title:** Author `site/components/context-panel/ContextPanelHero.tsx`
- **Description:** Create the Context Panel hero zone:
  - Eyebrow: `"Redirects for this page"` (static).
  - `<h1>` with gradient-clip count via `GradientText`: `"{count} redirects point here."` — **plural-aware**: when `count === 1` → `"1 redirect points here."`; when `count === 0` → `"0 redirects point here."` with a subline guidance copy `"Add the first redirect to start a map for this page."`.
  - `count` = `matchedGroups.length` passed in as a prop (or read via `useMatchedGroups()` hook depending on existing ContextPanel composition — Lead Developer reads `ContextPanel.tsx` to confirm; no new SDK call).
  - Page route rendered in mono font beneath the headline (from `pageInfo.url`, carried from existing subscription).
  - Hero count is a `useCountUp` animated number (single-element count-up allowed per ADR-0027 motion budget).
  - Hero clamp at Context Panel viewport width: smaller than Full Page — use `clamp(36px, 9vw, 44px)` (per UI design spec § 2 Context Panel section). **Override the default `--v4-hero-clamp-*` vars at the component level via a scoped CSS custom property** — do not edit the global tokens.
- **Expected Output:** `ContextPanelHero.tsx` exists; renders eyebrow + gradient-clip headline + page-route mono line + optional guidance subline at zero-match; plural-aware text; count-up on the number.
- **Depends on:** T009, T011

#### T025 — Author `QuickRedirectForm.tsx` (inline form — replaces AddRedirectModal)

- **Task ID:** T025
- **Title:** Author `site/components/context-panel/QuickRedirectForm.tsx`
- **Description:** Create the always-visible inline form at the top of the Context Panel body. **This replaces the existing `AddRedirectModal.tsx` flow entirely per ADR-0028 Option A.** Anatomy:
  - `@blok/card` wrapper (frosted-glass via `.elev-glass-surface`).
  - Source `@blok/input` field (mono font), pre-populated with `pageInfo.url`; editable.
  - RedirectType `@blok/select` — renders all 3 enum values from `REDIRECT_TYPES` via `redirectTypeDisplayName()`. **Disabled-with-display-only when adding to an existing map** (per ADR-0029); enabled in the no-match (create-new) state.
  - `→ this page` affordance (a static label showing the operator that the target is the current page).
  - Add `@blok/button` (primary, small) — submits the form.
  - Below the source input (no-match / create-new state only): an auto-name preview in monospace `--muted-foreground` micro-copy: `"New map: {pageSlug}-redirects"` where `pageSlug` = last non-empty segment of `pageInfo.url`, lower-kebab-cased.

  Props (Lead Developer's interface):
  ```ts
  interface QuickRedirectFormProps {
    pageInfo: { url: string };           // from subscribePageContext
    matchedGroups: MatchedMapGroup[];    // from existing matcher (carry-over type)
    selectedMapId?: string;              // when multi-match, the currently-selected map id (from MultiMatchDropdown — T026)
    onSubmit: (
      args:
        | { mode: 'add-to-existing'; mapId: string; source: string }
        | { mode: 'create-new'; name: string; source: string; redirectType: RedirectType }
    ) => Promise<void>;
  }
  ```

  Form behavior (per architecture § 4.2 + § 4.3 + ADR-0029):
  - When `matchedGroups.length === 0`: form is in **create-new** mode. RedirectType select enabled (default `'Redirect301'`). Auto-name preview visible. Submit emits `{ mode: 'create-new', ... }`.
  - When `matchedGroups.length >= 1`: form is in **add-to-existing** mode. The target map is either `selectedMapId` (when supplied — multi-match dropdown selection) or the most-recently-updated `matchedGroups[0]` by `updatedAt`. RedirectType select **disabled** and shows the target map's existing `redirectType` value. Hint copy: `"Uses {target-map-name}'s redirect type"`. Submit emits `{ mode: 'add-to-existing', mapId, source }`.

  Validation (FR-11 carry from PRD-000): source must be non-empty → Add button disabled when empty. Server-side duplicate-check via the carry-over `handleAddToExistingMap` refetch-then-write guard in `redirects-write.ts` is unchanged — no new client-side guard.

  On success: show toast `"Redirect added to {map-name}."` (existing-map path) or `"Created {map-name} with one redirect."` (create-new path); clear source back to `pageInfo.url`; trigger matcher refetch + canvasReload (via callback to `ContextPanel`); brief highlight pulse on the newly-added row (reduced-motion: instant).

  On error: toast error; form preserves entered values.

  Browser-globals discipline: NEVER branch on `typeof window` in render/init.
- **Expected Output:** `QuickRedirectForm.tsx` exists; props typed as above; form anatomy matches refined POC `pocs/poc-v1-prd002/context-panel.html` + `context-panel-no-match.html` + `context-panel-multi-match.html`; auto-name preview pattern matches `${pageSlug}-redirects`; RedirectType select state matrix correct.
- **Depends on:** T001, T004

#### T026 — Author `MultiMatchDropdown.tsx` (multi-match affordance per ADR-0029)

- **Task ID:** T026
- **Title:** Author `site/components/context-panel/MultiMatchDropdown.tsx`
- **Description:** Create the multi-match affordance. Anatomy: `@blok/select` dropdown rendered ABOVE the `QuickRedirectForm`'s source input ONLY when `matchedGroups.length >= 2`. Label: `"Adding to:"`. Options: all matched maps sorted by `updatedAt` descending. Each option label: `"{map-name} ({relativeTimeAgo})"` (e.g. `"Black Friday 2025 (14 m ago)"`). On change, emits `onMapSelect(mapId)` to parent (`ContextPanel`), which propagates to `QuickRedirectForm` via the `selectedMapId` prop — the form's disabled RedirectType select then re-binds to the newly-selected map's `redirectType`.

  When `matchedGroups.length < 2`: render `null`.
- **Expected Output:** `MultiMatchDropdown.tsx` exists; renders only when `matchedGroups.length >= 2`; uses `@blok/select`; emits `onMapSelect`.
- **Depends on:** T001, T004

#### T027 — Modify `ContextPanel.tsx` to compose hero + inline form + multi-match + matched rows

- **Task ID:** T027
- **Title:** Compose Context Panel shell with V4 elements
- **Description:** Edit `site/components/context-panel/ContextPanel.tsx`. Replace the existing `<button>` → `<AddRedirectModal>` flow with the new always-visible inline form. New composition order:
  1. `<ContextPanelHero count={matchedGroups.length} pageUrl={pageInfo.url} />`
  2. Hero summary tile: `"Sources redirecting to this URL"` + count repeated with `useCountUp`. (Inline JSX or extract to a tiny helper — Lead Developer's call.)
  3. `<MultiMatchDropdown matchedGroups={matchedGroups} onMapSelect={setSelectedMapId} />` (renders `null` when matches < 2).
  4. `<QuickRedirectForm pageInfo={pageInfo} matchedGroups={matchedGroups} selectedMapId={selectedMapId} onSubmit={handleQuickSubmit} />`.
  5. Existing list header (`"Existing redirects" + count`) + `MatchedMapGroup` rows (re-skinned per T028).
  6. `<RegexBanner>` (re-skinned per T029).
  7. Existing "Open full workspace" CTA at the bottom.

  Implement `handleQuickSubmit` to dispatch:
  - On `'add-to-existing'`: call the existing `handleAddToExistingMap` handler (or wire directly to `updateRedirectMap` via the existing wrapper — same call shape `AddRedirectModal` uses today). Pass the matched map's existing attrs + appended `{ source, target: pageInfo.url }` mapping.
  - On `'create-new'`: call the existing `handleCreateNewMap` handler (or wire directly to `createRedirectMap`). Pass the auto-name (`${pageSlug}-redirects`), default flags (`preserveQueryString: false`, `preserveLanguage: false`, `includeVirtualFolder: false` — PRD-000 defaults), the form's RedirectType, and the first mapping.

  Both call sites unwrap responses through the existing wrappers in `site/lib/sdk/redirects-write.ts` — **no new SDK call**, **no envelope change**, **no shape change**. After successful submit: call existing `canvasReload()` + refetch matched groups (the existing `matchPageRedirects` carry).

  **Delete all imports + references to `AddRedirectModal`** in this file (the modal file itself is removed in T032).
- **Expected Output:** `ContextPanel.tsx` composes new V4 elements; `handleQuickSubmit` dispatches to existing `createRedirectMap` / `updateRedirectMap` wrappers; no `AddRedirectModal` imports or render references remain; existing `pages.context` subscription + `matchPageRedirects` matcher + `canvasReload` intact.
- **Depends on:** T024, T025, T026

#### T028 — Re-skin `MatchedMapGroup.tsx` to V4 row anatomy

- **Task ID:** T028
- **Title:** Re-skin `MatchedMapGroup.tsx`
- **Description:** Edit `site/components/context-panel/MatchedMapGroup.tsx`. New row anatomy per refined POC:
  - `@blok/card` (compact, frosted via `.elev-glass-surface`).
  - Source → target rendered in mono font (URL pair).
  - `@blok/badge` for RedirectType (real enum value rendered via `redirectTypeDisplayName()`).
  - Parent-map name + last-updated meta line below.
  - **NO status pill. NO "Active" / "Draft" label. NO `--draft` class. NO `"unpublished"` meta.**
  - Edit + Delete icon buttons (existing handlers carry — `InlineEditForm` mount intact).
  - Primary-tinted hover lift via `.elev-card` utility.
- **Expected Output:** MatchedMapGroup renders with V4 row anatomy; no Active/Draft anywhere; existing inline-edit + delete handlers carry.
- **Depends on:** T001, T004

#### T029 — Re-skin `RegexBanner.tsx` to V4 `@blok/alert--info` chrome

- **Task ID:** T029
- **Title:** Re-skin `RegexBanner.tsx`
- **Description:** Edit `site/components/context-panel/RegexBanner.tsx`. Use existing `@/components/ui/alert` primitive with the `--info` variant; apply `.elev-glass-surface` tint. Copy unchanged from PRD-000.
- **Expected Output:** RegexBanner renders with V4 `@blok/alert--info` chrome; copy unchanged.
- **Depends on:** T001, T004

#### T030 — Re-skin `EditMapSettingsModal.tsx` to V4 dialog shell

- **Task ID:** T030
- **Title:** Re-skin `EditMapSettingsModal.tsx`
- **Description:** Edit `site/components/context-panel/EditMapSettingsModal.tsx`. Apply `.elev-glass-surface` to the dialog shell. Title remains utility voice. Form logic + validation + SDK call sites (`updateRedirectMap`) intact.
- **Expected Output:** Edit-settings modal renders with V4 chrome; existing logic intact.
- **Depends on:** T001, T004

### Epic F — Dashboard Widget redesign

#### T031 — Author `DashboardHero.tsx` (hero stat + marketing-voice subhead)

- **Task ID:** T031
- **Title:** Author `site/components/dashboard-widget/DashboardHero.tsx`
- **Description:** Create the Dashboard Widget hero zone:
  - Marketing-voice subhead: `"Your redirect operations, at a glance."` (Geist Sans 600 ~16-18px, fits the compact widget width — per UI design spec).
  - Hero stat number: `PREVIEW_DATA.heroStat.value` (e.g. `12,428` formatted with thousands separator) rendered via `<GradientText as="span" className="elev-hero-text">` with `useCountUp` animation. **Format using `value.toLocaleString('en-US')`** for the comma separator.
  - Sub-stack: `"Active redirects"` (uppercase mono label) + delta `"+412 this week"` (`success-foreground` token).

  All elements carry `data-preview-mock="true"`.
- **Expected Output:** `DashboardHero.tsx` exists; renders subhead + count-up hero number + delta; mocks tagged.
- **Depends on:** T005, T009, T011

#### T032 — Author `Sparkline.tsx` (Dashboard Widget mocked SVG)

- **Task ID:** T032
- **Title:** Author `site/components/dashboard-widget/Sparkline.tsx`
- **Description:** Create the gradient sparkline. Render an `<svg aria-hidden="true">` with:
  - 21 data points from `PREVIEW_DATA.sparkline.points` mapped to an SVG `<path>` (compute the path string by mapping the 21 values to a `viewBox` coordinate space — Lead Developer's call on dimensions; aim for ~120px wide × 28px tall per refined POC `dashboard-widget.html`).
  - Linear gradient `<defs>` with `currentColor` at top to transparent at bottom (theme-aware).
  - Stroke at `var(--primary)`.

  `data-preview-mock="true"` on the SVG.
- **Expected Output:** `Sparkline.tsx` exists; renders 21-point SVG sparkline; theme-aware gradient; `aria-hidden`.
- **Depends on:** T005

#### T033 — Author `TopDestinations.tsx` (Dashboard Widget 5 mock rows)

- **Task ID:** T033
- **Title:** Author `site/components/dashboard-widget/TopDestinations.tsx`
- **Description:** Create the top-destinations list. Renders 5 rows from `PREVIEW_DATA.topDestinations`. Each row:
  - Target path (mono font; en-only — already enforced by the mock module).
  - Gradient bar fill — width animates from 0% → `barFillPct` on intersect (use `IntersectionObserver` in `useEffect` — never in render init). Reduced-motion: render at final % instantly.
  - Hit count (mono tabular-num).

  Each row carries `data-preview-mock="true"`. **Browser-globals discipline:** `IntersectionObserver` lives inside `useEffect`, never in render body or `useState` init.
- **Expected Output:** `TopDestinations.tsx` exists; renders 5 rows; bar-fill animates on intersect via `useEffect`; mocks tagged.
- **Depends on:** T005

#### T034 — Author `RecentlyShipped.tsx` (Dashboard Widget 3 mock rows + 4th tile count)

- **Task ID:** T034
- **Title:** Author `site/components/dashboard-widget/RecentlyShipped.tsx`
- **Description:** Create the "Recently shipped · Last 24 hours" mini-widget. Two parts:
  - **4th tile (Recently shipped count):** a separate small tile alongside the 3 real tiles (Maps / Mappings / Last-updated). Shows `PREVIEW_DATA.recentlyShipped.countLast24h` (e.g. `4`) + sub `"+4 last 24h"`. `data-preview-mock="true"`.
  - **Recently shipped rows:** 3 rows from `PREVIEW_DATA.recentlyShipped.rows`. Each row: source → target (mono ellipsis on overflow), `@blok/badge` for RedirectType. **No status pill anywhere.** Each row carries `data-preview-mock="true"`.

  Lead Developer may export both as separate named exports from this one file, or split into two files (e.g. `RecentlyShipped.tsx` + `RecentlyShippedTile.tsx`) — pick whichever yields cleaner imports in `DashboardWidget.tsx`.
- **Expected Output:** Component(s) exist; renders the 4th mock count tile + 3 recently-shipped rows; no status pills; mocks tagged.
- **Depends on:** T005

#### T035 — Author `HealthBadge.tsx` (monochrome "all healthy" badge)

- **Task ID:** T035
- **Title:** Author `site/components/dashboard-widget/HealthBadge.tsx`
- **Description:** Create the success badge for the Dashboard footer. Uses `@/components/ui/badge` with `--success` variant. **Glyph is an inline monochrome SVG check (NOT the emoji `✅`)** — emoji codepoints render as platform bitmaps that ignore theme color (per UI design spec § 1 + memory `feedback_personal_website_prose_typography` style discipline). Use `currentColor` for the SVG stroke. Label text: `"all healthy"` (from `PREVIEW_DATA.dashboardFooter.healthStatus`).

  `data-preview-mock="true"` on the badge.
- **Expected Output:** `HealthBadge.tsx` exists; renders inline SVG check + label; theme-aware via `currentColor`; mock-tagged.
- **Depends on:** T005

#### T036 — Modify `DashboardWidget.tsx` to compose banner + hero + sparkline + tiles + lists

- **Task ID:** T036
- **Title:** Compose Dashboard Widget shell with V4 elements
- **Description:** Edit `site/components/dashboard-widget/DashboardWidget.tsx`. New composition order:
  1. `<PreviewDataBanner surface="dashboardWidget" />` at the top.
  2. Existing widget header (`<h2>Redirect Manager</h2>` utility-voice + meta `"{site} · {locale}"` + `Open` ghost button → `/full-page`). Header is utility voice (NOT a marketing zone — D5 zone (b) is the subhead in DashboardHero).
  3. `<DashboardHero />` (marketing-voice subhead + hero count-up + delta).
  4. `<Sparkline />`.
  5. 3 real tiles (Maps / Mappings / Last-updated computed from existing `aggregateStats`) + the 4th mock tile from `<RecentlyShipped />`. **The 3 real tiles get V4 chrome (`.elev-glass-surface .elev-card` + tabular-num + count-up if value < 100k) but are NOT mocks** — do NOT add `data-preview-mock` to them.
  6. `<TopDestinations />` (5 mock rows).
  7. `<RecentlyShipped />` rows (3 mock rows).
  8. Footer attribution: `<HealthBadge />` + mock text `"Last publish {lastPublishedAgo} by {author}"` from `PREVIEW_DATA.dashboardFooter`. **Drop the existing `FootnoteSeparated` "Redirect counts only..." line entirely** (consolidated into the banner per AC-R3.7).

  Existing `aggregateStats` computation + SDK reads carry. ThemeSwitcher carries.
- **Expected Output:** `DashboardWidget.tsx` composes all V4 elements; banner mounted at top; 3 real tiles preserved with V4 chrome (no mock attribute); 4th tile + lists + footer are mocks; `FootnoteSeparated` line removed.
- **Depends on:** T005, T006, T031, T032, T033, T034, T035

#### T037 — Re-skin `StatTile.tsx` (Dashboard Widget real-data tiles)

- **Task ID:** T037
- **Title:** Re-skin `StatTile.tsx` to V4 chrome
- **Description:** Edit `site/components/dashboard-widget/StatTile.tsx`. Apply V4 chrome: `.elev-glass-surface .elev-card` + tabular-num typography + count-up on the value (if numeric; gracefully degrade for `Last-updated` timestamp which is a string). Existing props/behavior intact.
- **Expected Output:** StatTile renders with V4 chrome + count-up for numeric values; existing aggregation source unchanged.
- **Depends on:** T001, T011

### Epic G — Reduced-motion + theme audit

#### T038 — Audit existing `@keyframes` blocks in PRD-000 source for reduced-motion pairing

- **Task ID:** T038
- **Title:** Audit existing `@keyframes` for reduced-motion pairing
- **Description:** Walk every `.css` file under `site/` (excluding `node_modules` / `.next`) and identify every `@keyframes` block. For each one, verify it has a corresponding `@media (prefers-reduced-motion: reduce)` rule that disables the animation (sets `animation: none;` or `animation-duration: 0ms;` on the consuming selector). Where missing, **add the gating rule in the same file**. Known holdovers from PRD-000: `blok-skeleton-shimmer` already paired (per architecture § 9 R-4 / theme.css ≈line 593-597) — verify and document.

  Produce a one-line table in this task's expected output enumerating every `@keyframes` block found + its status (paired vs newly-gated).
- **Expected Output:** Every `@keyframes` block in `site/**/*.css` is paired with a reduced-motion rule. Lead Developer reports findings in the implementation runbook.
- **Depends on:** T001, T002, T003

#### T039 — Verify theme switching continues end-to-end across all 3 redesigned routes

- **Task ID:** T039
- **Title:** Verify theme toggle end-to-end (light + dark)
- **Description:** Manual smoke + Vitest where possible. Confirm the existing `ThemeSwitcher` (`site/components/theme-switcher.tsx`) and `next-themes` integration continue to flip `html.className` between `light` / `dark` across all 3 surfaces. Verify the V4 token-composed gradients automatically switch (gradient-text, plume backdrop tinting, frosted-glass surface alpha). Existing PRD-000 theme structural test (`site/tests/theme/dark-mode-primary-foreground.test.ts`) must still pass.
- **Expected Output:** Manual confirmation report + existing theme test still green.
- **Depends on:** T017, T027, T036

### Epic H — Structural guards (5 new guards appended in place)

#### T040 — Append guard #1: no `#` hex literals outside `site/app/globals.css`

- **Task ID:** T040
- **Title:** Append no-hex structural guard
- **Description:** Append a new `it(...)` block to `site/tests/structural/structural-guards.test.ts`. The guard walks every `.ts` / `.tsx` / `.css` file under `site/` (excluding `node_modules`, `.next`, `tests`, `examples`) and asserts that none of them contain a `#[0-9a-fA-F]{3,8}\b` regex match — with an **allow-list of exactly one path**: `site/app/globals.css`. If any other file contains a hex literal, the test fails with the file path + offending line. (Match the existing structural-guards.test.ts pattern of collecting violations into an array and asserting `violations.toHaveLength(0)`.)
- **Expected Output:** Guard #1 appended; runs green when no violations exist; tests pass via `npm run test`.
- **Depends on:** T001, T002, T003, T005

#### T041 — Append guard #2: every `@keyframes` block has reduced-motion gating

- **Task ID:** T041
- **Title:** Append `@keyframes` ↔ reduced-motion pairing guard
- **Description:** Append a new `it(...)` block to `site/tests/structural/structural-guards.test.ts`. For each `.css` file under `site/`, extract the set of `@keyframes <name>` declarations. Then assert that the same file (or — Lead Developer's call — at least one CSS file in `site/`) contains a `@media (prefers-reduced-motion: reduce)` rule that disables animations using each declared keyframes name OR references the selector class universally suppressed.

  Pragmatic implementation: for each file containing one or more `@keyframes` blocks, assert the file ALSO contains a `@media (prefers-reduced-motion: reduce)` block. (Acceptable looseness — exact selector matching is brittle. Better: lint that the consumer class has the `animation: none;` override under the media query.) Lead Developer picks the implementation; the QA Specialist may tighten.
- **Expected Output:** Guard #2 appended; passes when every keyframes-bearing CSS file has a paired reduced-motion media query.
- **Depends on:** T002, T038

#### T042 — Append guard #3: `PreviewDataBanner` mounted on surfaces with `data-preview-mock="true"` elements

- **Task ID:** T042
- **Title:** Append banner ↔ `data-preview-mock` pairing guard
- **Description:** Append a new `it(...)` block to `site/tests/structural/structural-guards.test.ts`. For each surface route (`app/full-page/page.tsx` + `components/full-page/FullPage.tsx`; `app/dashboard-widget/page.tsx` + `components/dashboard-widget/DashboardWidget.tsx`; `app/context-panel/page.tsx` + `components/context-panel/ContextPanel.tsx`), grep the surface's component tree for `data-preview-mock="true"`. If found in any descendant component file imported by the surface, assert that the surface root file imports `PreviewDataBanner` and renders it (grep for `<PreviewDataBanner`). If `data-preview-mock` is absent on the surface, the banner must NOT be mounted.

  Pragmatic implementation: walk the file tree of each surface root, collect imports recursively (one level deep is enough — Lead Developer's call), grep for both markers, assert pairing.
- **Expected Output:** Guard #3 appended; Full Page + Dashboard Widget have both `data-preview-mock` and `PreviewDataBanner`; Context Panel has neither.
- **Depends on:** T006, T017, T027, T036

#### T043 — Append guard #4: no "Active" / "Draft" string literals; no `--draft` CSS classes

- **Task ID:** T043
- **Title:** Append no-Active/Draft structural guard
- **Description:** Append a new `it(...)` block to `site/tests/structural/structural-guards.test.ts`. Walk every `.ts` / `.tsx` / `.css` file under `site/` (excluding test fixtures). Assert:
  - **No JSX string literal of `"Active"` or `"Draft"` in a status-pill / badge context.** Pragmatic implementation: regex for `>(Active|Draft)<` or `={"(Active|Draft)"}` inside `.tsx` files. The QA Specialist may refine if false positives appear.
  - **No CSS class `status-pill--active`, `status-pill--draft`, `lr-row__dot--draft`, or `--draft`** in any source file.

  Allow-list: test fixtures (`site/tests/fixtures/**`) are excluded.
- **Expected Output:** Guard #4 appended; passes when no Active/Draft literals or classes exist.
- **Depends on:** T028, T034

#### T044 — Append guard #5: `elevated-plumes.css` imported only by Full Page subtree

- **Task ID:** T044
- **Title:** Append plume-CSS-import-boundary structural guard
- **Description:** Append a new `it(...)` block to `site/tests/structural/structural-guards.test.ts`. Walk every `.ts` / `.tsx` file under `site/` (excluding tests). Assert: any file that contains the string `elevated-plumes.css` in an import statement must be located under `site/app/full-page/` or `site/components/full-page/`. Any hit outside that subtree fails the test with the violating file path.
- **Expected Output:** Guard #5 appended; passes when only Full Page route files import `elevated-plumes.css`.
- **Depends on:** T004

#### T045 — Append guard #6: no language-count strings (`N languages`)

- **Task ID:** T045
- **Title:** Append no-language-count structural guard
- **Description:** Append a new `it(...)` block to `site/tests/structural/structural-guards.test.ts`. Walk every `.ts` / `.tsx` / `.css` file under `site/` (excluding `site/tests/fixtures/**`). Assert no match for the regex `\b\d+\s+languages?\b` or `\bacross\s+\d+\s+languages?\b`. Fails with the violating file path + offending line if found.
- **Expected Output:** Guard #6 appended; passes when no language-count strings exist in source.
- **Depends on:** T015

### Epic I — Test rework cascade (R-12 — DEDICATED TRANCHE)

#### T046 — Audit existing Vitest suite for class-string anatomy assertions vs behavior assertions

- **Task ID:** T046
- **Title:** Audit Vitest suite — categorize tests as (a) behavior / (b) anatomy / (c) AddRedirectModal
- **Description:** Walk every test file under `site/tests/ui/**/*.test.tsx`. For each test file, categorize every `it(...)` block into one of:
  - **(a) Behavior** — asserts SDK call signatures, toast.success calls, validation messages, state transitions, fixture-driven rendering. **CARRY untouched.**
  - **(b) Anatomy / class-string** — asserts Tailwind class strings or DOM structure that will change under V4 (e.g. `toHaveClass("bg-card")`, hard-coded modal-open assertion, `getByText('Active')`, status-pill DOM). **REWRITE assertions to match new V4 utility classes** per a line-by-line replacement map (Lead Developer produces in the implementation runbook).
  - **(c) `AddRedirectModal`-specific** — entire test files or large blocks tied to the modal anatomy. **REWRITE entire file as `QuickRedirectForm.test.tsx`** per T048.

  Produce an audit table in the implementation runbook listing every test file + every `it(...)` block + its category + the replacement (if applicable). The QA Specialist (07) will use this audit to populate § 10 of this task breakdown with per-task test specifications.
- **Expected Output:** Audit table written to the implementation runbook (Lead Developer / Developer notes — NOT a separate `.md`). Categories per `it()` block enumerated.
- **Depends on:** T017, T027, T036

#### T047 — Apply class-string assertion replacements (bulk update — category (b))

- **Task ID:** T047
- **Title:** Bulk-update class-string assertions to V4 utility classes
- **Description:** For every category (b) entry in the T046 audit, replace the hard-coded class string with the corresponding V4 utility class (e.g. `bg-card` → `elev-glass-surface` where the V4 utility wraps it). Apply replacements in place to test files under `site/tests/ui/**`. After replacement, the Vitest suite still runs green except for the `AddRedirectModal` tests (which T048 rewrites).
- **Expected Output:** All anatomy / class-string tests updated; Vitest suite green except for `AddRedirectModal.test.tsx` (rewritten in T048).
- **Depends on:** T046

#### T048 — Rewrite `AddRedirectModal.test.tsx` as `QuickRedirectForm.test.tsx`

- **Task ID:** T048
- **Title:** Rewrite `AddRedirectModal.test.tsx` → `QuickRedirectForm.test.tsx`
- **Description:** Move `site/tests/ui/context-panel/AddRedirectModal.test.tsx` to `site/tests/ui/context-panel/QuickRedirectForm.test.tsx`. Rewrite assertions to target the inline form anatomy:
  - **Behavior assertions carry verbatim** — the same `createRedirectMap` / `updateRedirectMap` wrapper signatures fire; toasts fire on success/error; canvas reload fires on success.
  - **Anatomy assertions rewritten:**
    - The form is always visible (no modal-open trigger; query the form anatomy directly).
    - Source input is pre-populated with the supplied `pageInfo.url`.
    - RedirectType select shows all 3 enum values via `redirectTypeDisplayName()` (no "307").
    - In add-to-existing mode: RedirectType select is `disabled`; hint copy `"uses {map-name}'s redirect type"` renders.
    - In create-new mode: RedirectType select is enabled; auto-name preview shows `"New map: {pageSlug}-redirects"`.
    - Add button is disabled when source is empty.
    - On submit, the correct mode-specific call dispatches.
  - **Multi-match anatomy:** when `matchedGroups.length >= 2`, `MultiMatchDropdown` renders above the source input; changing dropdown re-binds the form's RedirectType display.
- **Expected Output:** `QuickRedirectForm.test.tsx` exists; `AddRedirectModal.test.tsx` deleted; behavior assertions preserved; anatomy assertions rewritten; all tests pass.
- **Depends on:** T025, T026, T027, T046

#### T049 — Update `ContextPanel.states.test.tsx` for new composition

- **Task ID:** T049
- **Title:** Update `ContextPanel.states.test.tsx`
- **Description:** Edit `site/tests/ui/context-panel/ContextPanel.states.test.tsx`. Update assertions for the new shell composition: `ContextPanelHero` count visible, `MultiMatchDropdown` conditionally rendered, `QuickRedirectForm` always present, no more `AddRedirectModal` open/close state. Behavior assertions on the underlying `matchPageRedirects` matcher + state transitions carry.
- **Expected Output:** Test file updated; passes via `npm run test`.
- **Depends on:** T027, T046

#### T050 — Update `DashboardWidget.test.tsx` for V4 composition

- **Task ID:** T050
- **Title:** Update `DashboardWidget.test.tsx`
- **Description:** Edit `site/tests/ui/dashboard-widget/DashboardWidget.test.tsx`. Add assertions:
  - `PreviewDataBanner` mounted with `surface="dashboardWidget"`.
  - 3 real tiles render with their existing `aggregateStats`-driven data + `data-preview-mock` attribute is ABSENT on these 3 tiles.
  - 4th mock tile (Recently shipped count) renders WITH `data-preview-mock="true"`.
  - Sparkline + TopDestinations + RecentlyShipped + HealthBadge all carry `data-preview-mock` per element.
  - `FootnoteSeparated` "Redirect counts only..." line absent.

  Behavior assertions (`aggregateStats` data flow, header `Open` button → `/full-page` navigation) carry.
- **Expected Output:** Test file updated; new V4 composition asserted; behavior assertions intact.
- **Depends on:** T036, T046

#### T051 — Update `FullPage.layout.test.tsx` for V4 composition

- **Task ID:** T051
- **Title:** Update `FullPage.layout.test.tsx`
- **Description:** Edit `site/tests/ui/full-page/FullPage.layout.test.tsx`. Add assertions:
  - `.fp-plume-backdrop` element present (`aria-hidden`).
  - `PreviewDataBanner` mounted with `surface="fullPage"`.
  - `WorkspaceHero` renders (eyebrow + headline + sub-line + 2 decorative CTAs).
  - `StatStrip` renders 4 tiles each with `data-preview-mock="true"`.
  - Existing layout (left rail + right detail) intact at ≥1024px viewport.
- **Expected Output:** Test file updated; V4 composition asserted; existing layout assertions carry.
- **Depends on:** T017, T046

#### T052 — Update remaining Full Page tests for class-string drift

- **Task ID:** T052
- **Title:** Update remaining Full Page `.test.tsx` files
- **Description:** Apply class-string assertion updates per T046 audit to: `RedirectMapList.test.tsx`, `RedirectMapDetail.test.tsx`, `TopActionRow.test.tsx`, `NewRedirectMapModal.test.tsx`, `DeleteMapConfirmModal.test.tsx`, `CollectionPicker.test.tsx`, `SitePicker.test.tsx`. Behavior assertions stay; anatomy assertions update.
- **Expected Output:** All Full Page test files updated; suite green.
- **Depends on:** T018, T019, T020, T021, T022, T023, T046, T047

#### T053 — Update `MatchedMapGroup.test.tsx` + `RegexBanner.test.tsx` + `EditMapSettingsModal.test.tsx`

- **Task ID:** T053
- **Title:** Update remaining Context Panel test files
- **Description:** Apply class-string assertion updates per T046 audit to `MatchedMapGroup.test.tsx`, `RegexBanner.test.tsx`, `EditMapSettingsModal.test.tsx`. Specifically, `MatchedMapGroup.test.tsx` must assert no status-pill DOM ("Active" / "Draft") + no `unpublished` meta + RedirectType badge rendered via `redirectTypeDisplayName()`.
- **Expected Output:** Three test files updated; suite green.
- **Depends on:** T028, T029, T030, T046, T047

#### T054 — Delete `AddRedirectModal.tsx` source file

- **Task ID:** T054
- **Title:** Delete `site/components/context-panel/AddRedirectModal.tsx`
- **Description:** Delete the file `site/components/context-panel/AddRedirectModal.tsx`. **Pre-conditions:** no remaining imports of `AddRedirectModal` anywhere in `site/` (T027 removed the imports from `ContextPanel.tsx`); `AddRedirectModal.test.tsx` has been removed/rewritten as `QuickRedirectForm.test.tsx` (T048).

  Verification: run `grep -r "AddRedirectModal" site/` — should return zero results outside this task's own description in the task breakdown (which is a planning doc, not under `site/`).
- **Expected Output:** File removed; zero remaining `AddRedirectModal` references under `site/`.
- **Depends on:** T027, T048

### Epic J — Smoke prep + documentation

#### T055 — Write smoke checklist for m2 host-frame visual smoke

- **Task ID:** T055
- **Title:** Author m2 host-frame visual smoke checklist
- **Description:** Write a checklist file at `products/redirect-manager/project-planning/smoke/m2-host-frame-checklist-prd002.md`. Five-axis comparison (layout, typography, color, component anatomy, state fidelity) against the refined POC `pocs/poc-v1-prd002/` for each of the 3 surfaces. List the 6 POC frames as ground truth (`index.html`, `full-page.html`, `context-panel.html`, `context-panel-multi-match.html`, `context-panel-no-match.html`, `dashboard-widget.html`). For each, list the operator-observable items to verify (plume drift on Full Page, hero count-up on Context Panel, gradient sparkline on Dashboard, Preview Data banner copy, multi-match dropdown behavior, etc.).
- **Expected Output:** Markdown checklist written.
- **Depends on:** T017, T027, T036

#### T056 — Write smoke checklist for m5 live walkthrough (focus: inline quick-add efficiency)

- **Task ID:** T056
- **Title:** Author m5 live walkthrough checklist
- **Description:** Write a checklist file at `products/redirect-manager/project-planning/smoke/m5-live-walkthrough-checklist-prd002.md`. Cover ≥5-minute operator session items:
  - All 3 redesigned surfaces load without console errors.
  - Plumes drift on Full Page; reduced-motion mode disables them.
  - Inline quick-add on Context Panel: single-match, multi-match, no-match paths all work; toast confirms; matcher refetches.
  - Decorative hero CTAs on Full Page show toast (ADR-0030).
  - Preview Data banner copy reads as honest.
  - Status badges everywhere show real `RedirectType` values (no Active/Draft).
  - Theme toggle works on every surface.
  - HahnSoloFooter remains visible in bottom-right corner on every surface.
- **Expected Output:** Markdown checklist written.
- **Depends on:** T017, T027, T036

#### T057 — Update `docs/architecture.md` with PRD-002 V4 elevation section

- **Task ID:** T057
- **Title:** Document V4 elevation pattern in `docs/architecture.md`
- **Description:** Append a section to `products/redirect-manager/docs/architecture.md` documenting:
  - V4 elevation pattern (Blok token discipline, motion budget per ADR-0027).
  - Mock-data architecture (PREVIEW_DATA + flags pattern per ADR-0025).
  - Design-contract CSS variables (15 `--v4-*` vars at the top of `elevated.css` — R-13 mitigation).
  - z-index hierarchy commitment (architecture Decision 4).
  - 5 new structural guards.

  Run as part of `/document` pre-ship per `scope_dial.docs_at_ship == full`.
- **Expected Output:** Section appended to `docs/architecture.md`.
- **Depends on:** T040, T041, T042, T043, T044, T045

#### T058 — Update `docs/decisions.md` with PRD-002 redesign decisions

- **Task ID:** T058
- **Title:** Document D1-D10 + new ADRs in `docs/decisions.md`
- **Description:** Append a section to `products/redirect-manager/docs/decisions.md`: PRD-002 Redesign Decisions (Blok Elevated). Document D1-D10 from PRD § 11.2 + the 3 new ADRs locked at `/architect` (ADR-0028 modal removed, ADR-0029 QuickRedirectForm map-selection + RedirectType semantics, ADR-0030 hero CTAs decorative). One paragraph per decision.
- **Expected Output:** Section appended to `docs/decisions.md`.
- **Depends on:** T017, T027, T036

#### T059 — Run full test suite + build + lint as final pre-ship check

- **Task ID:** T059
- **Title:** Run `npm run lint && npm run typecheck && npm run test && npm run build`
- **Description:** From `site/`, run the 4 quality gates in order: `npm run lint`, `npm run typecheck`, `npm run test` (Vitest), `npm run build` (Next.js). All must pass. If any fail, fix or escalate per the escalation protocol. Per memory `feedback_freeform_commit_gate`, the build is a load-bearing gate — Vitest alone misses framework-level regressions.
- **Expected Output:** All 4 commands green. Output captured to runbook.
- **Depends on:** all preceding tasks (every T001-T058)

---

## 4b. Important Test Cases (by epic / feature)

### Epic A — CSS architecture

- **elevated.css — 15 vars present at top** (structural; structural guard T040 + /code-review grep for V4 numeric literals outside `elevated.css`)
- **elevated.css — `@supports not (backdrop-filter)` fallback present** (structural guard T040 passes; visual smoke m2 confirms fallback renders in a non-backdrop-filter environment)
- **elevated.css — `@supports not (color: color-mix(...))` fallback present** (same)
- **elevated.css — zero `#` hex literals** (T040 guard)
- **elevated-plumes.css — every `@keyframes` block has paired reduced-motion gate** (T041 guard; seed-violation test required before marking T041 complete)
- **elevated-plumes.css — only imported by Full Page subtree** (T044 guard; seed-violation test required)
- **surfaces.css — z-index values align with Decision 4** (z-index: -1 on plume, 40 on topbar, 100 on modal; no inline `z-index: 50` on any new element)
- **(EDGE) elevated.css exists but CSS custom properties are not readable in jsdom** — gradient-text contrast tests must use a real computed-style approach (vitest-browser-mode or inline style injection); do NOT assert `getComputedStyle` on variables that jsdom does not resolve. Use a contrast-helper with hardcoded Nova palette values as test constants. See § 9.5.

### Epic B — Mock data

- **PREVIEW_DATA shape** (unit, T007): `PREVIEW_DATA_ACTIVE.contextPanel === false`; rows length 3; all paths en-only regex; types align with 3-value enum; `heroStat.value > 0`; `fullPageStatStrip` has 4 required keys.
- **PreviewDataBanner conditional render** (UI, T008): renders for `fullPage` / `dashboardWidget`; returns `null` for `contextPanel`.
- **(EDGE) PREVIEW_DATA_ACTIVE is an `as const` object — TypeScript forbids mutating flags in tests.** Tests must import the module and assert flag values rather than flipping them. To test the "banner hidden" path, pass `surface="contextPanel"` prop — do NOT attempt to patch `PREVIEW_DATA_ACTIVE.contextPanel`.
- **(EDGE) Both `PREVIEW_DATA` and `PREVIEW_DATA_ACTIVE` are exported separately** — tree-shaking contract. Test asserts both named exports exist independently (not one nested export).

### Epic C — Shared components

- **useCountUp reduced-motion path** (unit, T013): `matchMedia` mock returns `matches: true` → returns target value immediately, zero `requestAnimationFrame` calls.
- **useCountUp cleanup** (unit, T013): unmount → `cancelAnimationFrame` called (spy on `globalThis.cancelAnimationFrame`).
- **useLetterReveal reduced-motion path** (unit, T013): `matchMedia` mock → flat text, no character spans.
- **useLetterReveal SSR safety** (unit, T013): hook does not reference `window` or `matchMedia` outside `useEffect` — static-analysis assertion noted in test; confirmed by code-review grep.
- **DecorativeCta fires toast onClick** (UI, T010): `vi.mock('sonner')` spy; `toast` called with exact `toastCopy` string.
- **DecorativeCta keyboard activation** (UI, T010): `Tab` to focus + `Enter` fires same toast.
- **GradientText dark-mode contrast** (UI, T009): NOT just `toHaveClass`; runtime contrast ≥ 3:1 at hero scale (§ 9.5).
- **(EDGE) matchMedia mock in jsdom** — use `vi.stubGlobal('matchMedia', ...)` or `Object.defineProperty(window, 'matchMedia', ...)` pattern; jsdom does not implement `matchMedia` natively. All hook tests must set up this stub in `beforeEach`.

### Epic D — Full Page

- **FullPage layout has plume backdrop + banner + hero + stat strip** (UI, T051).
- **Plume backdrop `aria-hidden="true"`** (UI, T051) — accessibility: decorative element must not be read by screen reader.
- **Stat strip 4 tiles render with `data-preview-mock="true"` on each tile** (UI, T016 / T051).
- **StatStrip reduced-motion: count-up skipped, tiles render at final values** (UI, T016).
- **WorkspaceHero "Edge caches refreshed across N languages" copy ABSENT** (structural guard T045; UI test T015 also asserts rendered text does not match `/\d+\s+language/i`).
- **WorkspaceHero mock elements tagged** (UI, T015): sub-line and headline have `data-preview-mock="true"`.
- **WorkspaceHero gradient-text contrast — dark mode** (UI, T015): per § 9.5.
- **RedirectMapDetail mappings table has NO "Status" column header** (UI, T019 / T052).
- **CRUD modals: title stays utility voice — no marketing copy in `<dialog>` `<h2>` / `<h1>`** (UI, T020-T022 / T052).
- **(EDGE) WorkspaceHero sub-line must NOT contain the string "languages"** — both T015 and T045 guard this independently. If T045 fires but T015 doesn't, the language copy is in a component that T015 does not mount. Add the regex assertion to the WorkspaceHero test render explicitly.
- **(EDGE) z-index stack ordering** — HahnSoloFooter at `z-index: 50` must not be occluded. The existing PRD-000 footer test asserts `z-index: 50`; add a new assertion in T051 that `.fp-plume-backdrop` has computed `z-index` of `-1` (or equivalent that places it below content) and that `.fp-topbar` has `z-index: 40`.

### Epic E — Context Panel + UX evolution

- **QuickRedirectForm always visible (no modal-open trigger)** (UI, T048 / T025).
- **QuickRedirectForm RedirectType select disabled in add-to-existing mode** (UI, T048).
- **QuickRedirectForm RedirectType select enabled in create-new mode + auto-name preview shows `{pageSlug}-redirects`** (UI, T048).
- **QuickRedirectForm submits `createRedirectMap` in no-match path; `updateRedirectMap` in match path** (behavior, T048 — carries verbatim from PRD-000 `AddRedirectModal` behavior assertions).
- **QuickRedirectForm source clears to `pageInfo.url` after success** (behavior, T048).
- **QuickRedirectForm form preserves values on error** (behavior, T048).
- **MultiMatchDropdown renders only when `matchedGroups.length >= 2`** (UI, T026 / T048).
- **MultiMatchDropdown option order: most-recently-updated first** (UI, T026).
- **ContextPanelHero plural-aware: `"1 redirect points here."` vs `"3 redirects point here."` vs `"0 redirects point here."` + guidance subline on zero-match** (UI, T024 / T049).
- **ContextPanelHero gradient-text contrast — dark mode** (UI, T024): per § 9.5.
- **MatchedMapGroup has NO status pill, NO "Active"/"Draft" text** (UI, T028 / T053).
- **(EDGE) add-to-existing mode: state transition when operator changes dropdown selection** — `MultiMatchDropdown` change → `QuickRedirectForm` `selectedMapId` prop updates → RedirectType hint updates to new map's type. Assert this transition in T048 multi-match scenario.
- **(EDGE) keyboard nav: QuickRedirectForm is always visible** — `Tab` order must be: `ContextPanelHero` → (optionally `MultiMatchDropdown`) → `QuickRedirectForm` source input → RedirectType select → Add button. Assert via `userEvent.tab()` sequence in T025 a11y test.
- **(EDGE) screen reader announces multi-match affordance change** — when `MultiMatchDropdown` selection changes, the updated RedirectType hint must be in the a11y tree (not hidden via `visibility: hidden`). Assert via `jest-axe` and `getByText` after dropdown change.

### Epic F — Dashboard Widget

- **DashboardWidget renders PreviewDataBanner with `surface="dashboardWidget"`** (UI, T050).
- **3 real tiles render with V4 chrome but NO `data-preview-mock` attribute** (UI, T050).
- **4th mock tile + sparkline + top destinations + recently shipped + footer all carry `data-preview-mock="true"` on each element** (UI, T050).
- **`FootnoteSeparated` "Redirect counts only..." line is absent** (UI, T050).
- **HealthBadge uses inline SVG, NOT emoji `✅`** (UI, T035; structural grep for `✅` codepoint in `site/components/dashboard-widget/`).
- **DashboardHero hero number: reduced-motion renders at final value immediately** (UI, T031).
- **DashboardHero dark-mode contrast** (UI, T031): per § 9.5.
- **TopDestinations: bar-fill animation lives in `useEffect` / `IntersectionObserver` — not in render body** (static analysis, T033).
- **Sparkline: `aria-hidden="true"`, NOT focusable** (UI, T032).
- **(EDGE) aggregateStats real-data tiles must not accidentally receive `data-preview-mock`** — `DashboardWidget.tsx` must only add the attribute to mock elements. T050 explicitly asserts ABSENCE on the 3 real tiles. This is a meaningful test — without it a developer might accidentally add the attribute to all tiles.
- **(EDGE) `FootnoteSeparated` component: if it renders empty content instead of being removed, the banner + empty footnote creates duplicate disclaimer UX** — T050 must assert the old footnote text is ABSENT, not just that `FootnoteSeparated` is not imported.

### Epic G — Reduced motion + theme

- **Every `@keyframes` block in `site/**/*.css` has a paired reduced-motion media query** (structural guard T041).
- **PRD-000 `blok-skeleton-shimmer` keyframe remains paired** (T041 regression baseline — guard must pass against PRD-000 code before any PRD-002 work).
- **Theme toggle continues to flip `html.className`** (carry from PRD-000 theme test; T039 also manually verifies V4 token-composed gradients switch correctly).
- **(EDGE) `@supports not (backdrop-filter)` fallback must not break the reduced-motion gate** — both `@supports` fallback AND `@media (prefers-reduced-motion)` gates must coexist in `elevated.css`. T041 guard must detect `@keyframes` in the file regardless of nesting inside `@supports`. Confirm guard implementation handles this.

### Epic H — Structural guards (each guard is a full test with seed-violation confirmation — T040-T045)

**Every guard must be confirmed working via a seed-violation test** (add a known violation to a temp test-fixture file, confirm the guard fails, remove the violation, confirm the guard passes). A guard that was never seeded with a failing case may be a trivially-passing test.

### Epic I — Test rework cascade

- **Vitest suite is fully green after T047 + T048 + T049 + T050 + T051 + T052 + T053** (the test rework's own success metric).
- **No behavior assertion is weakened in T047** — if a test contained only class-string anatomy (category (b) only), update the class string AND confirm the behavior it encodes is still asserted (or flag it as a gap per T046 audit).
- **`QuickRedirectForm.test.tsx` behavior assertions match PRD-000 `AddRedirectModal.test.tsx` behavior assertions 1:1** — carry verbatim; do not re-derive.

### Epic J — Smoke prep + documentation

- **m2 + m5 checklists land in `products/redirect-manager/project-planning/smoke/`** (artifact existence checked in self-report verification).
- **m2 checklist explicitly lists `npx serve pocs/poc-v1-prd002/` recipe** (Playwright MCP `file://` rejection workaround per § 9.9).
- **m2 checklist covers light + dark + reduced-motion variants** (3 variants per surface = 9 variant × surface combinations).
- **`docs/architecture.md` + `docs/decisions.md` updated** (artifact existence).
- **`npm run lint && typecheck && test && build` all green** (T059).

---

## 4c. Implementation execution contract (for Developer 08)

**Lead Developer (06):** All subsections below are filled or explicitly `N/A — <reason>`. Developer (08) does NOT open architecture, UI design, or ADR files in normal flow — only this file + `prd-minimal-002.md` + the refined POC at `pocs/poc-v1-prd002/`.

### 4c-1. Non-negotiable technical boundaries

- Marketplace Mode A scaffold continues from PRD-000 — **ADR-0002**. No re-scaffold. No new modules registered with the SDK.
- Authoring GraphQL is the single canonical source — **ADR-0003**. No new SDK calls in PRD-002.
- `@sitecore-marketplace-sdk/*` is imported only from `site/lib/sdk/*` and `site/components/providers/marketplace.tsx` — existing PRD-000 structural guard ("SDK boundary lock") at `site/tests/structural/structural-guards.test.ts` enforces. The new `QuickRedirectForm` does NOT import from the SDK package directly — it calls the existing wrappers in `site/lib/sdk/redirects-write.ts`.
- Blok primitives throughout. **Zero `#` hex literals outside `site/app/globals.css`** (allow-list has exactly one path) — **ADR-0024** + structural guard T040.
- No `dangerouslySetInnerHTML` outside `site/components/ui/*` (existing PRD-000 guard).
- `RedirectType` enum is **3 values exactly**: `Redirect301`, `Redirect302`, `ServerTransfer` — verified at `site/lib/domain/types.ts:17` + `site/lib/redirects/redirect-type-enum.ts:26`. **No "Active" / "Draft" labels anywhere; no `status-pill--active` / `status-pill--draft` / `lr-row__dot--draft` / `--draft` CSS class anywhere** (structural guard T043).
- **WCAG 2.1 AA** on all redesigned surfaces (NFR-A1..NFR-A5 carry from PRD-000).
- **`prefers-reduced-motion: reduce` respected on every `@keyframes` block** (structural guard T041 + reduced-motion early-return in JS animation helpers per T011, T012).
- `localStorage` patterns unchanged from PRD-000 (no new state).
- **`AddRedirectModal.tsx` deletion is mandatory** — **ADR-0028** Option A. Done in T054. The file MUST NOT remain in the repo.
- All gradient / color / shadow expressions composed via `color-mix(in oklch, var(--token), …)` — **no `#` hex literals in source**.
- **Plume CSS import boundary**: `site/styles/elevated-plumes.css` imported ONLY by files under `site/app/full-page/` or `site/components/full-page/` — structural guard T044 enforces.
- **No new external SDK calls. No new GraphQL mutations. No new GraphQL fields. No new Cloud Portal registration.** Architecture § 5.3 PASS.
- **No new npm dependencies.** No `framer-motion`, no `react-spring`, no `motion-one`. Vanilla CSS `@keyframes` + ~30 LOC vanilla JS for count-up + ~20 LOC for letter-split.
- **Browser-globals discipline (memory `feedback_hydration_mismatch_pattern`):** Never branch on `typeof window` / `IntersectionObserver` / `navigator` / `matchMedia` in `useState` init or render body. Always place inside `useEffect`. Applies to T011, T012, T033 explicitly.
- **No emoji codepoints for status glyphs.** Use inline monochrome SVG with `currentColor` so glyphs respect theme color (per UI design spec + memory). Specifically: `HealthBadge` (T035) uses inline SVG check, NOT `✅`.

### 4c-2. ADR one-liners

**PRD-002 ADRs (locked at `/create-prd`):**

- **ADR-0024 — V4 Blok Elevated visual base + relaxed redesign rule.** The redesign adopts V4 marketing POC visual decisions AND V4's UX evolutions where V4 differs from current code; reality validation against current `site/` source decides ties.
- **ADR-0025 — Mock-data architecture: PREVIEW_DATA constants + PREVIEW_DATA_ACTIVE flags + per-surface PreviewDataBanner.** Single canonical swap point at `site/lib/mocks/preview-data.ts` for the follow-on data-plumbing PRD. `data-preview-mock="true"` attribute pairs with the banner via structural guard.
- **ADR-0026 — Context Panel inline quick-add replaces AddRedirectModal.** Two options (A: remove modal entirely; B: keep as fallback) left open at `/create-prd`. Option A locked at `/architect` (see ADR-0028).
- **ADR-0027 — Mixed motion budget across surfaces.** Full Page gets full V4 motion (plumes + kinetic letter reveals + count-ups); Context Panel + Dashboard Widget get hover lifts + a single hero count-up only.

**PRD-002 ADRs locked at `/architect`:**

- **ADR-0028 — Context Panel Option A locked: AddRedirectModal removed entirely.** The "Create new map with full flag control" path moves to the Full Page workspace via the unchanged `NewRedirectMapModal`. Cleaner component graph; one fewer test surface.
- **ADR-0029 — QuickRedirectForm map-selection + RedirectType semantics.** Default match selection is the most-recently-updated matched map by `updatedAt`; multi-match affordance exists (POC ships a `@blok/select` dropdown); RedirectType select is enabled in create-new mode (default `Redirect301`) and disabled-with-display-only in add-to-existing mode (bound to the chosen map's `redirectType` — adding a mapping does not mutate the parent map's type). Auto-name pattern for create-new: `${pageSlug}-redirects` (last segment of `pageInfo.url`, lower-kebab-cased).
- **ADR-0030 — Full Page hero CTAs (View activity / Publish all) are decorative in PRD-002.** Buttons render with V4 chrome; `onClick` shows a Sonner toast with "coming in a follow-on release" copy. Wiring to real actions deferred to the follow-on data-plumbing PRD.

**Carry-over ADRs from PRD-000 still in force:**

- **ADR-0002 — Marketplace SDK Mode A scaffold.** Carry; PRD-002 no re-scaffold.
- **ADR-0003 — Authoring GraphQL as canonical source.** Carry; PRD-002 no new SDK calls.
- **ADR-0005 — Context Panel exact-match only.** Carry; `matchPageRedirects` algorithm unchanged.
- **ADR-0006 — Import conflict resolution: 3 actions.** Carry; import wizard logic unchanged.
- **ADR-0007 — Tenant identifier: `tenantId`.** Carry; unchanged.
- **ADR-0008 — UrlMapping encoding contract (URL-encoded `=`/`&`-pair).** Carry; serializer/parser unchanged.
- **ADR-0010 — MVP language scope: en-only.** Carry; PRD-002's "no language-count strings" guard reinforces.
- **ADR-0011 — Extension points + routes** (`/full-page`, `/context-panel`, `/dashboard-widget`). Carry; no route changes.
- **ADR-0012 — `react-virtuoso` for list virtualization.** Carry; RedirectMapList unchanged.
- **ADR-0023 — PRD-001 multilingual cancelled.** Carry; PRD-002's mock paths are all en-only.

### 4c-3. Stack / tooling specifics

- **Package manager:** `npm` (verified at `site/package.json`; lockfile is `package-lock.json`).
- **Test runner:** `vitest` (version 4.1.5 per `site/package.json`).
- **Build:** `npm run build` (Next.js 16.1.7).
- **Lint:** `npm run lint` (ESLint 9.39.4 + `eslint-config-next`).
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`, TypeScript 5.9.3).
- **Dev server:** `npm run dev` (Next.js with `--turbopack`) — for live iteration. Marketplace iframe testing requires HTTPS + mkcert + Cloud Portal Test App registration per `sitecore:marketplace-sdk-testing-debug` (skill loaded for reference; no re-invocation needed per skill-load reuse rule).
- **Scaffold:** **NONE for PRD-002.** PRD-000 Mode A scaffold (ADR-0002) carries forward. Explicit no-op. Do NOT run `npx create-content-sdk-app` or `npx create-marketplace-app` — pinned versions in `package.json` are authoritative.
- **Tailwind:** v4.2.1 with Nova preset (no `tailwind.config.ts` — Tailwind v4 zero-config). `@tailwindcss/postcss` for the build pipeline.
- **React:** 19.2.4. **Next.js:** 16.1.7 (uses App Router; `proxy.ts` filename if/when proxy logic is added — per memory `reference_next16_proxy_filename`; PRD-002 does NOT add proxy logic).
- **Sonner toast:** `sonner` ^2.0.7 (existing dep — used by `DecorativeCta` + the new `QuickRedirectForm` success/error paths).
- **No new dependencies.** Verify after every Epic that `package.json` is byte-identical to the pre-PRD-002 baseline except where the implementation has unambiguous justification (none expected).
- **CI gate:** the 4-command sequence in T059 (`lint && typecheck && test && build`) is the final pre-ship check.

### 4c-4. UI implementation notes

- **Winning POC clickdummy:** `products/redirect-manager/pocs/poc-v1-prd002/` — 16 files (4 CSS + 3 JS + 6 HTML frames + click-targets.md + README.md). **Canonical visual reference. When § 4c-4 text and the clickdummy diverge on visual details, the clickdummy wins.** The Developer (08) MAY open POC HTML/CSS files during `/implement` — they are explicitly permitted by the glossary § POC clickdummy.
- **Theme:** PRD-000 `theme.css` (Blok Nova preset) preserved verbatim at `site/app/globals.css`. V4 elevated layer in new `site/styles/elevated.css` with 15 CSS variables at top. NO new tokens are added to `globals.css` — every V4-specific tunable lives in `elevated.css`.
- **Typography:** Geist Sans + Geist Mono only (existing PRD-000 `next/font/google` setup in `site/app/layout.tsx`). NO Inter, NO Space Grotesk, NO Fraunces. Hero clamp: `clamp(48px, 8vw, 96px)` on Geist Sans 700 (Full Page). Context Panel hero clamp: scoped narrower (~`clamp(36px, 9vw, 44px)`) via a component-level CSS custom-property override.
- **Motion:** All transitions use `cubic-bezier(0.16, 1, 0.3, 1)` premium ease via `--v4-premium-ease`. All `@keyframes` animations gated by `prefers-reduced-motion: reduce`. JS animation helpers (count-up, letter-reveal) honor `window.matchMedia('(prefers-reduced-motion: reduce)').matches` early-return inside `useEffect`.
- **Status pills:** real `RedirectType` enum only (`301`, `302`, `Server Transfer`) via `redirectTypeDisplayName()` from `site/lib/redirects/redirect-type-enum.ts`. **No "Active" / "Draft" labels anywhere.**
- **Decorative hero CTAs (ADR-0030):** "View activity" + "Publish all" buttons on Full Page render with V4 chrome via `DecorativeCta` (T010). `onClick` → `toast(...)` with the copies specified in T015.
- **Inline `QuickRedirectForm` (ADR-0026, ADR-0028, ADR-0029):** always visible at top of Context Panel body. Source input pre-populated with current page route (mono). RedirectType select disabled-with-display when adding to existing map; enabled when creating new map (default `Redirect301`). Auto-name preview `"New map: {pageSlug}-redirects"` shows in create-new mode. Plural-aware hero count copy (`"1 redirect points here." / "0 redirects point here." / "N redirects point here."`).
- **Voice (D5):** Marketing-grade copy in exactly 3 designated zones: (a) Full Page workspace hero headline, (b) Dashboard Widget marketing subhead (NOT the `<h2>` title, which stays utility), (c) Context Panel `<h1>` count header. Utility-tool voice everywhere else — including modal titles ("Create new Redirect Map", "Delete map", "Import redirects"), form field labels, table column headers, button labels, validation messages, footer text.
- **Marketing copy first-draft (operator may override during `/architect` review):**
  - Full Page hero headline: `"Eight active maps, all healthy."` (`Eight` from real `activeMapsCount`; `"all healthy"` mocked).
  - Dashboard Widget subhead: `"Your redirect operations, at a glance."`
  - Context Panel hero count: `"{N} redirects point here."` (plural-aware).
- **Preview Data banner copy:** `"Some metrics on this surface use preview data — wired up in a follow-on release."` (single per surface; `@blok/alert--info` chrome).
- **z-index hierarchy (architecture Decision 4):** plume backdrop `-1`; page content `0`; frosted topbar `40`; HahnSoloFooter `50` (carry); modal overlay `100`. **Plumes always sit BELOW the footer.**
- **Browser support floor:** evergreen Chromium ≥85, Safari ≥14, Firefox ≥103 (`backdrop-filter` floor); Chromium ≥111, Safari ≥16.4, Firefox ≥113 (`color-mix(in oklch, ...)` floor). `@supports not (...)` fallbacks shipped inline in `elevated.css` for both.

### 4c-5. File / module structure and naming conventions

**New CSS files** (under `site/styles/` — NEW directory if not already present):

- `site/styles/elevated.css` — 15 `--v4-*` variables at top + site-wide utility classes (`.elev-glass-surface`, `.elev-card`, `.elev-hero-text`, `.elev-count-up`).
- `site/styles/elevated-plumes.css` — Full-Page-only motion utilities (`.fp-plume-backdrop`, `@keyframes backdrop-drift`, `.fp-hero-reveal-letters`).
- `site/styles/surfaces.css` — per-surface layouts (`.fp-*`, `.cp-*`, `.dw-*`, `.elev-modal`).

**New components:**

- `site/components/ui/preview-data-banner.tsx` — shared banner.
- `site/components/ui/gradient-text.tsx` — shared utility.
- `site/components/ui/decorative-cta.tsx` — toast-onClick wrapper (ADR-0030).
- `site/components/full-page/WorkspaceHero.tsx` — Full Page hero zone.
- `site/components/full-page/StatStrip.tsx` — 4-tile stat strip.
- `site/components/context-panel/QuickRedirectForm.tsx` — inline form (replaces `AddRedirectModal`).
- `site/components/context-panel/ContextPanelHero.tsx` — `<h1>` count header.
- `site/components/context-panel/MultiMatchDropdown.tsx` — multi-match affordance.
- `site/components/dashboard-widget/DashboardHero.tsx` — hero stat zone.
- `site/components/dashboard-widget/Sparkline.tsx` — mocked SVG.
- `site/components/dashboard-widget/TopDestinations.tsx` — 5 mock rows.
- `site/components/dashboard-widget/RecentlyShipped.tsx` — 3 mock rows + 4th tile count.
- `site/components/dashboard-widget/HealthBadge.tsx` — monochrome "all healthy" badge.

**New hooks** (location: `site/hooks/` — NEW directory; or co-located under `site/lib/hooks/` if Lead Developer prefers — pick one and apply consistently):

- `site/hooks/use-count-up.ts` — count-up animation hook.
- `site/hooks/use-letter-reveal.ts` — kinetic letter-split helper.

**New mocks module:**

- `site/lib/mocks/preview-data.ts` — `PREVIEW_DATA` + `PREVIEW_DATA_ACTIVE` (ADR-0025).

**Modified files:**

- `site/app/layout.tsx` — add CSS imports for `elevated.css` + `surfaces.css`.
- `site/app/full-page/layout.tsx` (NEW if absent) OR `site/app/full-page/page.tsx` — add `elevated-plumes.css` import.
- `site/components/full-page/FullPage.tsx` — compose new V4 elements.
- `site/components/full-page/TopActionRow.tsx` — V4 chrome.
- `site/components/full-page/RedirectMapList.tsx` — V4 chrome; drop `--draft`.
- `site/components/full-page/RedirectMapDetail.tsx` — V4 chrome; drop status column.
- `site/components/full-page/NewRedirectMapModal.tsx` — V4 dialog shell.
- `site/components/full-page/DeleteMapConfirmModal.tsx` — V4 dialog shell.
- `site/components/full-page/ImportRedirectMapModal.tsx` — V4 dialog shell.
- `site/components/full-page/CollectionPicker.tsx` — V4 chrome.
- `site/components/full-page/SitePicker.tsx` — V4 chrome.
- `site/components/context-panel/ContextPanel.tsx` — compose new V4 elements; remove `AddRedirectModal` references.
- `site/components/context-panel/MatchedMapGroup.tsx` — V4 row anatomy; drop status pill.
- `site/components/context-panel/RegexBanner.tsx` — V4 `@blok/alert--info` chrome.
- `site/components/context-panel/EditMapSettingsModal.tsx` — V4 dialog shell.
- `site/components/dashboard-widget/DashboardWidget.tsx` — compose new V4 elements.
- `site/components/dashboard-widget/StatTile.tsx` — V4 chrome.
- `site/tests/structural/structural-guards.test.ts` — append 5 new guards in place (no new file).
- `site/tests/ui/**/*.test.tsx` — per T046 audit, class-string assertions updated; `AddRedirectModal.test.tsx` rewritten as `QuickRedirectForm.test.tsx`.

**Deleted files:**

- `site/components/context-panel/AddRedirectModal.tsx` (T054).
- `site/tests/ui/context-panel/AddRedirectModal.test.tsx` (replaced by `QuickRedirectForm.test.tsx` in T048).

**Naming conventions:**

- Component files: `PascalCase.tsx`.
- Hook files: `use-kebab-case.ts` (matches existing project convention — verify against any pre-existing `use-*` files; if existing convention is `useCamelCase.ts`, follow that).
- Test files: `*.test.tsx` co-located with source OR under `site/tests/ui/<feature>/` mirroring source layout (PRD-000 uses the `site/tests/ui/<feature>/` pattern — follow that for new component tests; co-located is fine for hook tests + the mocks module).
- CSS files: kebab-case under `site/styles/`.
- CSS class naming: `kebab-case`; surface-prefixed (`fp-*`, `cp-*`, `dw-*`); shared utilities `elev-*`.

### 4c-6. Integration and API contract notes

**ZERO new external SDK calls in PRD-002.** Architecture § 5.3 gate: PASS. Every SDK call PRD-002 touches is already in production in PRD-000 with a captured, verified shape (Tranche 6a real-tenant capture, 2026-05-11).

**Carry-over SDK calls touched by PRD-002:**

1. **`xmc.authoring.graphql` `mutation CreateRedirectMap` (createItem)** — invoked by `QuickRedirectForm` in create-new mode (when `matchedGroups.length === 0`) AND by the existing `NewRedirectMapModal`. **No wrapper signature change. No new call site logic.**
   - Wrapper: `site/lib/sdk/redirects-write.ts → createRedirectMap(client, contextId, input: CreateRedirectMapInput)`.
   - Verb: `client.mutate('xmc.authoring.graphql', { params: { body, query, variables } })`.
   - Envelope position: **body INSIDE `params`** (verified 2026-05-11; memory `reference_marketplace_sdk_envelope_authoring_graphql`).
   - Unwrap: **DOUBLE `.data.data`** (memory same).
   - Request shape: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData`.
   - Response shape: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlResponse`.
   - Inner GraphQL response shape: `createItem(input: CreateItemInput!) { item { itemId name path } }` — `id` field NOT accepted (rejected by server); rename has its own dedicated mutation.

2. **`xmc.authoring.graphql` `mutation UpdateRedirectMap` (updateItem)** — invoked by `QuickRedirectForm` in add-to-existing mode (when `matchedGroups.length >= 1`) AND by existing `RedirectMapDetail`, `InlineEditForm`, `EditMapSettingsModal`. **No wrapper signature change.**
   - Wrapper: `site/lib/sdk/redirects-write.ts → updateRedirectMap(client, contextId, input: UpdateRedirectMapInput)`.
   - Same envelope position + unwrap as #1.
   - Same `.d.ts` paths as #1 (request: `Authoring.GraphqlData`; response: `Authoring.GraphqlResponse`).
   - Inner GraphQL: `updateItem(input: UpdateItemInput!) { item { itemId } }` — single-field semantics (sending only changed fields updates only those); boolean write repr `'0'`/`'1'`; `name` field NOT accepted on `UpdateItemInput` (rename has its own mutation — out of scope for PRD-002 inline form).

3. **`pages.context` (subscribable)** — invoked by `ContextPanel` to read `pageInfo.url` for source pre-population in `QuickRedirectForm`. **No call-site change** beyond reading the same `pageInfo.url` field the existing matcher uses.
   - Wrapper: `site/lib/sdk/page-context.ts → subscribePageContext(client, callback)`.
   - Verb: `client.query({ subscribe: true })`.
   - Unwrap: SINGLE `.data` (base map; subscribe-via-query Path A per `sitecore:marketplace-sdk-client § 6 + § 8b`).
   - Shape: `// shape: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContext`.

4. **`pages.reloadCanvas`** — invoked by `ContextPanel` after every `QuickRedirectForm` successful submit (same as `AddRedirectModal` does today).
   - Wrapper: `site/lib/sdk/canvas-reload.ts → reloadCanvas(client)`.
   - Verb: `client.mutate('pages.reloadCanvas', ...)`.
   - Unwrap: SINGLE `.data` (base map mutation; void return).
   - Shape: `// shape: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → base MutationMap`.

5. **`application.context`** — invoked transitively via the existing `useAppContext()` hook to read `siteName` / `locale` for the Full Page workspace hero eyebrow. **No call-site change.**
   - Wrapper: `site/lib/sdk/application-context.ts → applicationContext(client)`.
   - Verb: `client.query`.
   - Unwrap: SINGLE `.data` (base map).
   - Shape: `// shape: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → ApplicationContext` (re-exported per `sitecore:marketplace-sdk-client § 4 / references/base-maps.md`).

**Untouched in PRD-002 but listed for completeness** (carry-over wrappers, no PRD-002 call-site changes):

6. **`xmc.authoring.graphql` (listRedirects read)** — invoked by all 3 routes via `site/lib/sdk/redirects-read.ts → listRedirects(...)`. PRD-002 changes 0 call sites.

7. **`xmc.authoring.graphql` `mutation DeleteRedirectMap`** — via `site/lib/sdk/redirects-write.ts → deleteRedirectMap(...)`. PRD-002 changes 0 call sites.

8. **`xmc.authoring.graphql` `mutation RenameRedirectMap`** — via `site/lib/sdk/redirects-write.ts → renameRedirectMap(...)`. PRD-002 changes 0 call sites.

9. **`xmc.sites.listSites`** — via `site/lib/sdk/sites.ts`. Unwrap: DOUBLE `.data.data` (xmc module query). Shape: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesResponse`. PRD-002 changes 0 call sites.

10. **`xmc.sites.listCollections`** — via `site/lib/sdk/sites.ts`. Same `.d.ts` as #9. PRD-002 changes 0 call sites.

**No new GraphQL queries. No new GraphQL mutations. No new GraphQL fields. No new envelope shapes. No new unwrap levels. No new auth headers. No new endpoints. No new Cloud Portal Test App registration. No new scopes.** Architecture § 5.3 zero-new-call assertion is the binding contract.

### 4c-7. Host-frame visual smoke execution recipe (m2 gate)

**Skill:** `sitecore:marketplace-sdk-host-frame-testing` — invoke this skill at `/test` for the full step-by-step recipe for the m2 Playwright visual smoke. Key invariants for Developer 08 and the QA Specialist at test time:

- **Inputs are mandatory and user-supplied.** Host URL + app origin must come from the operator before m2 can start. Do not guess or fall back to `localhost:3000`. If missing, record m2 as `deferred — host URL not supplied` with a `WARN` verdict.
- **Auth is interactive only.** Open browser at host URL, ask operator to log in, wait for `READY`. Never script SSO.
- **Comparison ground truth.** The winning POC is `products/redirect-manager/pocs/poc-v1-prd002/` (path from `ui_design.selected_poc_path` in the run manifest). Compare clipped host-frame screenshots side-by-side against the POC on 5 axes: layout, typography, color, component anatomy, state fidelity.
- **Playwright MCP rejects `file://` URLs.** Serve the POC via: `npx serve products/redirect-manager/pocs/poc-v1-prd002/` before running comparison screenshots.
- **Test 3 variants per surface:** light mode, dark mode, reduced-motion mode. Full Page reduced-motion must confirm plumes are static.
- **Do not silently promote host-frame screenshots to baselines.** If POC is stale vs. implementation, raise as "POC drift" finding and route through `/architect` step 3.

### 4c-8. Parity / rebuild pointers

**N/A — greenfield-additive on existing PRD-000 app.** PRD-002 is a presentation-layer redesign + one interaction-pattern change on top of the already-shipped PRD-000 Marketplace app. No source-rebuild, no asset bundle migration, no content-dump replay. `canonical_artifacts.source_analysis` is not set for PRD-002 (verify in `project-planning/workflow/run-20260513T194022Z.json`).

---

## 5. Dependencies

### Ordering constraints

- Epic A (CSS architecture) is the foundation — `elevated.css` variables (T001) must exist before any component uses `.elev-*` utility classes; `elevated-plumes.css` (T002) must exist before Full Page imports it (T004 + T017).
- Epic B (mock data) and most of Epic C (shared utilities) are independent of components — can land in parallel with Epic A once T001 is done. `PreviewDataBanner` (T006) depends on `PREVIEW_DATA_ACTIVE` (T005).
- Epic D / E / F (surface redesigns) depend on Epic A + B + C foundations. Within each surface, the shell composition task (T017 / T027 / T036) depends on all the sub-component authors for that surface.
- Epic G (reduced-motion audit) depends on the CSS files existing (T001-T003).
- Epic H (structural guards) depends on the new files existing (so the guards have something to enforce; the guards themselves are appended in place to one file).
- Epic I (test rework) depends on the surface redesigns being complete (so the new component anatomy is on disk and tests can assert against it).
- T054 (delete `AddRedirectModal.tsx`) depends on T027 (no more imports) AND T048 (test file rewritten).
- Epic J (smoke + docs) depends on all preceding tasks; T059 (final test/build) depends on every other task.

### Execution order (numbered list — all Task IDs in valid dependency order)

1. T001 — elevated.css with 15 vars + utilities
2. T002 — elevated-plumes.css (depends on T001)
3. T003 — surfaces.css (depends on T001)
4. T004 — CSS imports wired in app/layout.tsx + Full Page route (depends on T001, T002, T003)
5. T005 — preview-data.ts mock module
6. T006 — PreviewDataBanner component (depends on T005)
7. T007 — preview-data.test.ts (depends on T005)
8. T008 — preview-data-banner.test.tsx (depends on T006)
9. T009 — GradientText utility (depends on T001)
10. T010 — DecorativeCta wrapper (depends on T001)
11. T011 — useCountUp hook (depends on T001)
12. T012 — useLetterReveal hook (depends on T001)
13. T013 — hook tests (depends on T011, T012)
14. T014 — TopActionRow re-skin (depends on T004)
15. T015 — WorkspaceHero (depends on T005, T009, T010, T012)
16. T016 — StatStrip (depends on T005, T011)
17. T017 — FullPage shell composition (depends on T002, T004, T006, T014, T015, T016)
18. T018 — RedirectMapList re-skin (depends on T001, T004)
19. T019 — RedirectMapDetail re-skin (depends on T001, T004)
20. T020 — NewRedirectMapModal re-skin (depends on T001, T004)
21. T021 — DeleteMapConfirmModal re-skin (depends on T001, T004)
22. T022 — ImportRedirectMapModal re-skin (depends on T001, T004)
23. T023 — CollectionPicker + SitePicker re-skin (depends on T001, T004)
24. T024 — ContextPanelHero (depends on T009, T011)
25. T025 — QuickRedirectForm (depends on T001, T004)
26. T026 — MultiMatchDropdown (depends on T001, T004)
27. T027 — ContextPanel shell composition (depends on T024, T025, T026)
28. T028 — MatchedMapGroup re-skin (depends on T001, T004)
29. T029 — RegexBanner re-skin (depends on T001, T004)
30. T030 — EditMapSettingsModal re-skin (depends on T001, T004)
31. T031 — DashboardHero (depends on T005, T009, T011)
32. T032 — Sparkline (depends on T005)
33. T033 — TopDestinations (depends on T005)
34. T034 — RecentlyShipped (depends on T005)
35. T035 — HealthBadge (depends on T005)
36. T036 — DashboardWidget shell composition (depends on T005, T006, T031, T032, T033, T034, T035)
37. T037 — StatTile re-skin (depends on T001, T011)
38. T038 — Reduced-motion audit on existing `@keyframes` (depends on T001, T002, T003)
39. T039 — Theme switch verification (depends on T017, T027, T036)
40. T040 — Guard #1: no hex outside globals.css (depends on T001, T002, T003, T005)
41. T041 — Guard #2: @keyframes ↔ reduced-motion (depends on T002, T038)
42. T042 — Guard #3: banner ↔ data-preview-mock (depends on T006, T017, T027, T036)
43. T043 — Guard #4: no Active/Draft (depends on T028, T034)
44. T044 — Guard #5: plume CSS import boundary (depends on T004)
45. T045 — Guard #6: no language-count strings (depends on T015)
46. T046 — Vitest suite audit (categories a/b/c) (depends on T017, T027, T036)
47. T047 — Bulk class-string assertion update (depends on T046)
48. T048 — AddRedirectModal.test.tsx → QuickRedirectForm.test.tsx rewrite (depends on T025, T026, T027, T046)
49. T049 — ContextPanel.states.test.tsx update (depends on T027, T046)
50. T050 — DashboardWidget.test.tsx update (depends on T036, T046)
51. T051 — FullPage.layout.test.tsx update (depends on T017, T046)
52. T052 — Remaining Full Page test updates (depends on T018-T023, T046, T047)
53. T053 — Remaining Context Panel test updates (depends on T028, T029, T030, T046, T047)
54. T054 — Delete AddRedirectModal.tsx (depends on T027, T048)
55. T055 — m2 smoke checklist (depends on T017, T027, T036)
56. T056 — m5 smoke checklist (depends on T017, T027, T036)
57. T057 — docs/architecture.md update (depends on T040-T045)
58. T058 — docs/decisions.md update (depends on T017, T027, T036)
59. T059 — Final `lint && typecheck && test && build` (depends on every preceding task)

### Parallel groups

Tasks with identical or fully-independent `Depends on` sets can run concurrently in separate Developer agent contexts. Suggested groups:

```
Group 1 (sequential — CSS + mock-data foundation):    T001 → T002, T003 → T004 → T005
Group 2 (parallel — depends on T005):                  T006, T007 (T007 doesn't block downstream)
Group 3 (parallel — depends on T001 only):             T009, T010, T011, T012
Group 4 (parallel — Full Page sub-components):         T014, T015 (after T012), T016 (after T011)
Group 5 (sequential — Full Page shell + siblings):     T017 → (T018, T019, T020, T021, T022, T023 in parallel)
Group 6 (parallel — Context Panel sub-components):     T024 (after T011), T025, T026
Group 7 (sequential — Context Panel shell + siblings): T027 → (T028, T029, T030 in parallel)
Group 8 (parallel — Dashboard sub-components):         T031 (after T011), T032, T033, T034, T035
Group 9 (sequential — Dashboard shell + sibling):      T036 → T037
Group 10 (parallel — audits + guards):                 T038, T040, T041, T042, T043, T044, T045 (after their respective deps)
Group 11 (sequential — test rework cascade):           T046 → (T047 in parallel with T048, T049, T050, T051) → T052 → T053
Group 12 (sequential — finalization):                  T054 → T055, T056 in parallel → T057, T058 in parallel → T059
```

For a solo developer or single sequential Developer agent, the numbered execution order in the prior subsection is the canonical sequence — the parallel groups are guidance for when the Team Lead spawns multiple Developer agents.

---

## 6. Suggested Milestones

Per architecture § 9 R-12, an 8-tranche structure with T7 as the dedicated test-rework tranche. Lead Developer may resequence within a tranche; the tranche boundaries are load-bearing.

| Tranche | Title | Task IDs | Notes |
|---|---|---|---|
| **T1** | CSS architecture foundation | T001, T002, T003, T004 | `elevated.css` (15 vars + utilities) + `elevated-plumes.css` (Full-Page-only motion) + `surfaces.css` (per-surface layouts) + CSS imports wired. R-13 mitigation. |
| **T2** | Mock-data + shared components | T005, T006, T007, T008, T009, T010, T011, T012, T013 | `PREVIEW_DATA` + `PreviewDataBanner` + `GradientText` + `DecorativeCta` + `useCountUp` + `useLetterReveal` + their unit tests. |
| **T3** | Full Page redesign | T014, T015, T016, T017, T018, T019, T020, T021, T022, T023 | TopActionRow + WorkspaceHero + StatStrip + FullPage shell + RedirectMapList + RedirectMapDetail + all CRUD modals + pickers. |
| **T4** | Context Panel redesign + inline QuickRedirectForm | T024, T025, T026, T027, T028, T029, T030 | Hero + inline form + multi-match dropdown + ContextPanel shell + MatchedMapGroup + RegexBanner + EditMapSettingsModal. Replaces AddRedirectModal flow (ADR-0028). |
| **T5** | Dashboard Widget redesign | T031, T032, T033, T034, T035, T036, T037 | DashboardHero + Sparkline + TopDestinations + RecentlyShipped + HealthBadge + DashboardWidget shell + StatTile. |
| **T6** | AddRedirectModal deletion + cleanup | T054 | Delete the source file (after T048 rewrites its test). One small atomic task; the test rewrite is in T7. |
| **T7** | Test rework cascade (R-12 — DEDICATED TRANCHE) | T046, T047, T048, T049, T050, T051, T052, T053 | Audit + bulk class-string updates + AddRedirectModal.test → QuickRedirectForm.test rewrite + all `.test.tsx` updates. |
| **T8** | Structural guards + reduced-motion audit + smoke + docs | T038, T039, T040, T041, T042, T043, T044, T045, T055, T056, T057, T058, T059 | 5 new guards + reduced-motion audit + smoke checklists + docs updates + final lint/typecheck/test/build. |

**Critical sequencing notes:**

- T6 (delete `AddRedirectModal.tsx`) MUST happen AFTER T48 (test rewritten) so the suite never goes red mid-tranche. Place T54 between T4 and T7 OR keep tests green by deferring T54 to after T48. The execution order above puts T54 between T053 and T055 (i.e. after all tests are updated) — that's correct.
- T038 (reduced-motion audit) lands in T8 alongside the structural guards because the guard for `@keyframes` pairing (T041) needs the audit to surface any unpaired keyframes first.
- T059 is the LAST task — it gates the ship cut.

---

## 7. Risk Areas

| ID | Risk | Mitigation in this plan |
|---|---|---|
| R-12 (R-12 from architecture) | Test-rework volume — class-string assertions across the Vitest suite need bulk updates | T46 audit + T047 bulk update + T048 rewrite + T049-T053 per-file updates, all in the dedicated T7 tranche. Behavior assertions never touched. |
| R-13 (R-13 from architecture) | V4 design-token drift across component files | T001 locks all 15 `--v4-*` variables at the top of `elevated.css`. Components reference variables, not literal values. `/code-review` grep-flags V4-numeric literals (28s, 18px, 14%, 1.005, etc.) outside `elevated.css`. |
| Hydration mismatch from browser-globals in render | `useState` init / render-body branching on `typeof window` / `matchMedia` / `IntersectionObserver` causes SSR/CSR mismatch (memory `feedback_hydration_mismatch_pattern`) | Explicit § 4c-1 boundary + T011, T012, T033 task descriptions call out: all browser-globals checks live inside `useEffect`. QA Specialist may add a Playwright smoke for this on T7. |
| `backdrop-filter` performance inside Cloud Portal iframe | Plumes + frosted-glass + count-ups compound; NFR-R1 measures at /test | Mixed motion budget per ADR-0027 (plumes Full Page only); `@supports not (backdrop-filter)` solid fallback in `elevated.css`; m2 host-frame smoke + NFR-R1 measure at /test gate. |
| `color-mix(in oklch, ...)` browser-floor miss | Older browsers render fallback (rare per architecture § 9 R-5) | `@supports not (color: color-mix(in oklch, white, black))` precomputed fallback in `elevated.css`. Operator confirms floor at /test (OQ-A1/OQ-A2). |
| HahnSoloFooter occluded by plume layer | New stacking contexts may collide with footer's `z-index: 50` | Architecture Decision 4 z-index hierarchy explicit in § 4c-4. Plume backdrop `z-index: -1`; frosted topbar `z-index: 40`; modal overlay `z-index: 100`. Manual verify at T039 + T055. |
| Emoji codepoints sneaking into status glyphs | `✅` / `ⓘ` codepoints render as platform bitmaps that ignore theme color | T035 (HealthBadge) + T006 (PreviewDataBanner) use inline monochrome SVG with `currentColor`. Code-review greps for emoji codepoints in `site/components/`. |
| Hydration mismatch from `IntersectionObserver` in TopDestinations bar-fill animation | Memory `feedback_hydration_mismatch_pattern` applies | T033 description explicitly requires `IntersectionObserver` lives inside `useEffect`, never render init. |
| Test cascade going red mid-tranche (T7) | Tests reference DOM that doesn't exist yet OR `AddRedirectModal` imports that have been removed | Sequence: T046 (audit) → T047 (bulk class update) → T048 (rewrite AddRedirectModal test) → T049-T053 (per-file updates) → T054 (delete source file). Tests stay green continuously. |
| Plume CSS leaking into Context Panel / Dashboard Widget | Structural guard T044 catches it at CI time | Plume-CSS-import-boundary guard explicit; runs every test run. |

---

## 8. Suggested Team Structure

Solo developer — informational only. Lead Developer + Developer agent are the same operator wearing different hats. No team-coordination overhead.

Tranche T7 (test rework) is the only tranche where it's tempting to parallelize across multiple Developer agent contexts (since each test file is independent after T046). The Team Lead MAY spawn parallel Developer agents for T047 + T048 + T049 + T050 + T051 within Group 11 of § 5 above; otherwise the sequential numbered execution order is the default.

---

## 9. TDD and quality contract

*QA Specialist (07) — enriched 2026-05-13.*

### 9.1 Mandate — RED before GREEN, always

Every task that produces a new component, hook, or module MUST have a failing test written BEFORE the implementation exists. The sequence is:

1. **RED** — write (or confirm written) the test that asserts the target behavior. The test must fail because the implementation does not yet exist. If the test passes without implementation it is a meaningless test and must be rewritten.
2. **GREEN** — write the minimum implementation to make the test pass.
3. **REFACTOR** — clean up without breaking the test.

This sequence applies at all layers: unit, UI component, integration (structural), and smoke. Documentation-only tasks, pure file-deletion tasks (see § 9.7), and pure CSS-variable-definition tasks where the test is a structural grep are explicitly OUT of TDD (§ 9.7).

### 9.2 Test layers and their scope

| Layer | Tooling | Scope |
|---|---|---|
| **Unit** | Vitest | Pure logic: hooks (`useCountUp`, `useLetterReveal`), constants module (`PREVIEW_DATA` shape + flag values), utility functions. No DOM. |
| **UI (component)** | Vitest + `@testing-library/react` | React component rendering: prop-driven conditional render, ARIA roles, text content, `data-preview-mock` presence, class-name application where class encodes behavior (not just aesthetics). |
| **Structural** | Vitest (grep-based, file-system walk) | Project-wide contract assertions: no hex literals outside allow-list, every `@keyframes` block paired, no Active/Draft strings, no `/de/` paths, plume CSS import boundary. |
| **Smoke (manual-automated)** | Playwright MCP + `sitecore:marketplace-sdk-host-frame-testing` | Host-frame visual verification: render fidelity, 5-axis comparison against `pocs/poc-v1-prd002/`. |
| **Manual** | Operator checklist | Flows requiring real-tenant state: CRUD round-trips, live walkthrough, inline quick-add efficiency. |

### 9.3 Meaningful tests — behavioral vs. trivial

A **meaningful test** asserts behavior users or the contract cares about:
- A component renders the correct text when a prop changes.
- A button is disabled when a field is empty.
- A hook returns the target value immediately when `prefers-reduced-motion` is active.
- A structural guard rejects a `#FFFFFF` literal outside `globals.css`.

A **trivial test** is one that passes without any real implementation risk:
- `expect(component).toBeTruthy()` — meaningless (any non-null JSX passes).
- `expect(PREVIEW_DATA).toBeDefined()` alone — does not assert shape.
- `toHaveClass("elev-card")` when the class name is the only assertion and no behavior depends on it — does not assert anything about what the class does to the user.

Every test in § 10 is behavioral. Tests that assert class strings do so only where the class encodes a structural contract verified by a guard (e.g., `data-preview-mock` is the contract attribute, not `elev-card` on a card).

### 9.4 Mocks vs. real data discipline

- `PREVIEW_DATA` constants are the canonical mock source. Component tests that render mock-data slots MUST import from `site/lib/mocks/preview-data.ts`. No inline literal substitutes in test files (prevents the fixture diverging from the real constant). Fixture provenance: `// source: site/lib/mocks/preview-data.ts` in any test fixture that re-uses these shapes.
- `PREVIEW_DATA_ACTIVE` toggling must be tested in BOTH directions:
  - **True direction:** render the surface → banner DOM present; mocked elements tagged.
  - **False direction (contextPanel):** render `<PreviewDataBanner surface="contextPanel" />` → returns `null`.
- Real-data tile tests (StatTile, the 3 real Dashboard tiles) must assert `data-preview-mock` is **absent** — confirming they are NOT flagged as mocks.
- SDK call fixtures for `createRedirectMap` / `updateRedirectMap` carry from PRD-000 test suite. Provenance: `// source: site/lib/sdk/redirects-write.ts + node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts (Authoring.GraphqlData / Authoring.GraphqlResponse)`. Do NOT rewrite these fixtures from scratch — inherit from existing `AddRedirectModal.test.tsx` behavior assertions (category (a) per T046 — carry verbatim).

### 9.5 Runtime contrast assertion for theme-token UI

Any new component that paints with theme tokens — gradient-text (`--v4-gradient-text`), primary-tinted glow (`color-mix(in oklch, var(--primary) 14%, transparent)`), frosted glass (`color-mix(in oklch, var(--card) 80%, transparent)`) — MUST include a contrast assertion that verifies the resolved foreground/background contrast at runtime, NOT just that the correct CSS class is applied.

The Blok Nova `--primary-foreground` quirk from PRD-000 carries forward: in dark mode, `--primary-foreground` can collapse toward `--primary` depending on the Nova preset version, making gradient-clip text invisible. The existing PRD-000 structural guard (`site/tests/theme/dark-mode-primary-foreground.test.ts`) enforces the override at project level. At the component level, gradient-text contrast is asserted by:

1. Rendering the component in a jsdom environment that applies the test theme.
2. Reading `getComputedStyle(el).color` and `getComputedStyle(el).backgroundColor`.
3. Comparing via a WCAG-contrast helper (or `jest-axe` contrast rule with the resolved palette).

This applies to: `GradientText` (T009), `ContextPanelHero` count headline (T024), `WorkspaceHero` headline (T015), `DashboardHero` hero stat (T031). A class-only assertion (`toHaveClass("elev-hero-text--gradient")`) is insufficient for these components.

### 9.6 Structural guards ordering (test-first enforcement)

Structural guards (Epic H, T040–T045) enforce contracts on the code that Epic A–F produces. The guards MUST be promoted to at least Tranche 2 (alongside or immediately after T001–T004 CSS foundation) so they fail-fast when a developer introduces a violation in T001+ instead of catching it at the end in Tranche 8. Specific promotions:

- **T040** (no-hex guard) — depends on T001 existing but MUST run before T014-T037 lay down component classes. Move effectively to position after T004 in the execution sequence (guard fires RED against any pre-existing hex in the repo, then goes GREEN as component work stays clean).
- **T044** (plume-CSS-import-boundary guard) — depends on T004 (import wired). Should run immediately after T004 so subsequent Full Page component work is checked from the start.
- **T041** (`@keyframes` reduced-motion pairing guard) — depends on T002 (plumes CSS). Should run immediately after T002, before T003 onward.
- **T043** (no-Active/Draft guard) — depends on T028 + T034 (the components that could re-introduce status pills). The guard's RED state is established as a failing test against PRD-000 source if any `--draft` classes survive. This is ordered correctly in the Lead Dev plan but the guard's RED test must be written before T028/T034 implement their re-skins.
- **T042** (banner ↔ `data-preview-mock` pairing guard) and **T045** (no-language-count guard) ordering is correct as-is.

### 9.7 What is OUT of TDD (explicit)

The following tasks are exempt from the RED → GREEN → REFACTOR mandate:

- **Epic J documentation tasks (T055–T058):** pure artifact authoring. Test is "file exists with required sections" — not automatable as a Vitest test.
- **T054 — Delete `AddRedirectModal.tsx`:** the test IS T044 (plume guard catches remaining `AddRedirectModal` import violations) and the structural absence-assertion grep in T054's expected output. There is no `it("AddRedirectModal.tsx should not exist")` test — the guard covers it.
- **T001, T002, T003 — Pure CSS files:** the test for these is the structural guard in T040 (no-hex) and T041 (`@keyframes` pairing) + the visual smoke at m2. No Vitest unit test for CSS variable presence is required; the structural guards provide the contract.
- **T004 — CSS import wiring:** the test is T044 (plume boundary guard) and visual smoke m2 confirming the styles render. No Vitest test for import presence needed.
- **T059 — Final lint/typecheck/test/build:** this is the CI gate, not a TDD task.

### 9.8 Accessibility — WCAG 2.1 AA on every new component

Every new component (T006, T009, T010, T015, T016, T024, T025, T026, T031, T032, T033, T034, T035) must pass `jest-axe` in its Vitest component test. Specific patterns:

- `PreviewDataBanner` (T006): `role="status"` or `role="alert"` asserted; not just visual.
- `ContextPanelHero` (T024): `<h1>` in document order; gradient-clip headline does not hide text from screen reader (use `aria-label` if `color: transparent` removes it from the a11y tree).
- `QuickRedirectForm` (T025): ARIA state machine across the three states (no-match / single-match / multi-match):
  - no-match: `RedirectType` select `aria-disabled` is false; auto-name preview announces via `aria-live` or static text.
  - single-match / add-to-existing: `RedirectType` select is `disabled`; hint copy `"Uses {map-name}'s redirect type"` is in the a11y tree.
  - multi-match: `MultiMatchDropdown` renders above the form; changing the dropdown value is announced via `aria-live`.
- `Sparkline` (T032): `aria-hidden="true"` asserted; no keyboard focus.
- All hover-lift cards: `:focus-visible` outline present (carry from PRD-000 focus-visible guard).
- Reduced-motion: every new `@keyframes` animation stops under `prefers-reduced-motion: reduce`. JS hooks (`useCountUp`, `useLetterReveal`) short-circuit inside `useEffect`, never in render body (browser-globals discipline).

### 9.9 Host-frame visual smoke (Marketplace — m2 gate)

PRD-002 is a `platform_target: marketplace` product. Standalone `localhost:3000` rendering is NOT an acceptable substitute for visual testing. The canonical visual test target is the **clipped iframe inside the live Sitecore Cloud Portal host**, per `sitecore:marketplace-sdk-host-frame-testing`.

**Five-axis comparison protocol:**
- Comparison ground truth: `products/redirect-manager/pocs/poc-v1-prd002/` (6 frames: `index.html`, `full-page.html`, `context-panel.html`, `context-panel-no-match.html`, `context-panel-multi-match.html`, `dashboard-widget.html`).
- Axes: Layout & spacing | Typography | Color & contrast | Component anatomy | State fidelity.
- Test BOTH light AND dark mode on all 3 surfaces (6 clips per surface = 18 clips minimum).
- Test reduced-motion mode as a third variant on Full Page (plumes must be static; letter reveal must be instant).

**POC static server requirement:** Playwright MCP rejects `file://` URLs. Serve the POC via:
```
npx serve products/redirect-manager/pocs/poc-v1-prd002/
```
Then compare Playwright host-frame clips against the served POC screenshots at the same viewport.

**Host URL and app origin are mandatory user inputs.** If either is missing when m2 runs, record visual testing as `deferred — host URL not supplied` with a `WARN` verdict. Do not proceed with a localhost-only render as a substitute.

**Auth is always interactive.** Open the browser at the host URL, ask the user to log in, wait for `READY`. Never script SSO.

**Do not silently promote host-frame screenshots to baselines.** If the design has changed and the POC is stale, raise it as a "POC drift" finding and route through `/architect` step 3.

### 9.10 PRD-000 verification matrix carryover (PRD § 6.1)

Every PRD-000 user story (US-1..US-10) must have at least one Vitest test or smoke gate confirming it still works under the V4 chrome. Tranche T7 (test rework) owns the audit — specifically:

- Existing PRD-000 behavior-asserting tests (`it("fires createRedirectMap when ...")`, `it("shows validation error when source is empty")`, etc.) carry verbatim. Do not delete or weaken them.
- Class-string assertions that referenced PRD-000 utility classes (e.g., `toHaveClass("bg-card")`) are updated to their V4 equivalents per T047 audit. The behavior assertion (if any) in the same `it()` block is left untouched.
- The `AddRedirectModal` test file is rewritten (T048), not deleted and left uncovered. The behavior assertions (SDK calls, toasts, validation) re-appear verbatim in `QuickRedirectForm.test.tsx`.

### 9.11 Smoke outcomes initialized in run manifest

Six smoke gates are tracked in `manifest.smoke_outcomes` (see § manifest update below). All start `outcome: "pending"`. The test pass cannot be declared `status: tested` while any entry has `outcome: "pending"` — status becomes `tested_pending_smoke` until all 6 are resolved.

| Gate ID | Category | Description |
|---|---|---|
| `m1` | `registration` | Cloud Portal Test App loads all 3 extension points without console errors |
| `m2` | `host_frame_smoke` | 5-axis Playwright comparison against `pocs/poc-v1-prd002/` (light + dark + reduced-motion) |
| `m3` | `crud_round_trip` | Full CRUD path on real tenant including inline quick-add |
| `m4` | `import_export_round_trip` | JSON export + import wizard end-to-end on real tenant |
| `m5` | `live_walkthrough` | ≥5-min operator session across all 3 redesigned surfaces |
| `host_frame_smoke` | `host_frame_smoke` | Playwright clipped iframe screenshots vs POC on 5 axes (alias for m2 in manifest tracking) |

---

## 10. Per-task test specifications

*QA Specialist (07) — enriched 2026-05-13. All 59 tasks covered. Grouped by epic.*

### Epic A — CSS architecture foundation

#### T001 — Create `site/styles/elevated.css`

| Field | Value |
|---|---|
| **Scenario** | All 15 `--v4-*` design-contract variables are present at the top of `elevated.css` with correct values; utility classes defined; `@supports` fallback present; `@media (prefers-reduced-motion: reduce)` rules present; zero `#` hex literals |
| **Expected outcome** | Structural guard T040 runs GREEN on this file; `@supports not (backdrop-filter: blur(1px))` and `@supports not (color: color-mix(in oklch, white, black))` blocks present; no `#[0-9a-fA-F]{3,8}` in file content |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` (guard T040 covers hex; a dedicated variable-presence check can live here or in `/code-review` grep) |
| **Fixture provenance** | N/A — structural grep; no fixture |
| **RED before GREEN** | Write the no-hex guard assertion (T040 task) BEFORE authoring `elevated.css`. The guard must fail if any other file already has hex literals, establishing the contract before T001 can be called done. |
| **OUT of TDD** | CSS-variable presence alone is not a Vitest unit test. The structural guard (T040) + visual smoke (m2) are the joint contract. |

#### T002 — Create `site/styles/elevated-plumes.css`

| Field | Value |
|---|---|
| **Scenario** | `.fp-plume-backdrop`, `@keyframes backdrop-drift`, `.fp-hero-reveal-letters` exist; every `@keyframes` block has a paired `@media (prefers-reduced-motion: reduce)` rule that sets `animation: none`; zero hex literals |
| **Expected outcome** | T041 structural guard passes; T040 no-hex guard passes; T044 plume-boundary guard later confirms this file is not imported outside Full Page subtree |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |
| **RED before GREEN** | T041 guard RED established before T002 is authored; the guard verifies that every CSS file with `@keyframes` has a paired reduced-motion block. |
| **OUT of TDD** | Pure CSS motion file; unit test is the structural guard + visual smoke. |

#### T003 — Create `site/styles/surfaces.css`

| Field | Value |
|---|---|
| **Scenario** | Surface scaffold classes for `.fp-*`, `.cp-*`, `.dw-*`, `.elev-modal` all present; no `#` hex literals; z-index values align with architecture Decision 4 (topbar 40, plume -1, modal 100) |
| **Expected outcome** | T040 no-hex guard passes; visual smoke m2 confirms surface layouts render at correct proportions against POC |
| **Test type** | structural + manual-smoke |
| **File** | `site/tests/structural/structural-guards.test.ts` (T040); visual confirmation at m2 |
| **Fixture provenance** | N/A |
| **OUT of TDD** | Pure CSS layout file. |

#### T004 — Wire CSS imports

| Field | Value |
|---|---|
| **Scenario** | T044 plume-boundary guard fires RED if `elevated-plumes.css` is imported in `app/layout.tsx` or any non–Full-Page file; guard goes GREEN only when import is scoped to `site/app/full-page/` |
| **Expected outcome** | T044 guard passes; `site/app/layout.tsx` contains `elevated.css` + `surfaces.css` imports; Full Page route file contains `elevated-plumes.css` import; no other route file imports plume CSS |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` (T044) |
| **Fixture provenance** | N/A |
| **RED before GREEN** | T044 guard written (RED) before T004 is implemented. Guard fails initially if import is placed in wrong file. |

---

### Epic B — Mock-data architecture + Preview Data banner

#### T005 — Create `site/lib/mocks/preview-data.ts`

| Field | Value |
|---|---|
| **Scenario (shape test)** | `PREVIEW_DATA_ACTIVE.fullPage === true`, `.dashboardWidget === true`, `.contextPanel === false`; `PREVIEW_DATA.topDestinations` has 5 items; all `name`, `source`, `target` strings match `/^\/[a-z0-9\-\/]+$/`; `recentlyShipped.rows` length 3, each `.type` is `"Redirect301"`; `fullPageStatStrip` has 4 keys each with `{ value: number, sub: string }`; `heroStat.value > 0`; `heroStat.delta.value > 0` |
| **Scenario (no `/de/` paths)** | No string in `PREVIEW_DATA` matches `/\/[a-z]{2}\//` (locale prefix pattern) |
| **Scenario (RedirectType alignment)** | All `type` values in `recentlyShipped.rows` are one of `"Redirect301" | "Redirect302" | "ServerTransfer"` — matches the 3-value enum |
| **Expected outcome** | All assertions pass; TypeScript compile with `--noEmit` shows no type errors |
| **Test type** | unit |
| **File** | `site/lib/mocks/preview-data.test.ts` |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (self-referential — the test imports the constants and asserts their shape) |
| **RED before GREEN** | Write `preview-data.test.ts` with all assertions BEFORE creating `preview-data.ts`. Tests fail because the module does not exist. |

#### T006 — Create `PreviewDataBanner` component

| Field | Value |
|---|---|
| **Scenario (renders for active surface)** | `<PreviewDataBanner surface="fullPage" />` → banner DOM present in tree; text includes `"preview data"`; role is `"status"` or `"alert"` (from the `@blok/alert` primitive) |
| **Scenario (returns null for inactive surface)** | `<PreviewDataBanner surface="contextPanel" />` → component returns `null`; no DOM output |
| **Scenario (dashboardWidget active)** | `<PreviewDataBanner surface="dashboardWidget" />` → banner renders |
| **Scenario (no emoji glyph)** | Rendered HTML does not contain `ⓘ` or any Unicode emoji codepoint; SVG element present with `currentColor` stroke |
| **Scenario (axe a11y)** | `jest-axe` reports zero violations |
| **Expected outcome** | All scenarios pass; TypeScript clean |
| **Test type** | UI |
| **File** | `site/components/ui/preview-data-banner.test.tsx` |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA_ACTIVE imported by component; test verifies behavior driven by those flags) |
| **RED before GREEN** | Write `preview-data-banner.test.tsx` before creating `preview-data-banner.tsx`. |

#### T007 — Unit test for `PREVIEW_DATA` shape

This task IS a test task (the RED artifact for T005). No additional test spec beyond T005 above — T007 is the implementation of what T005 describes as its RED step. Task ID T007 exists in the plan as the test file; T005 is the source file. The correct dependency order is: T007 (write test file) → T005 (create module to make tests pass). See Depends-on reordering note below.

**Depends-on reorder:** T005 currently lists `Depends on: none`; T007 lists `Depends on: T005`. **Correct TDD order is T007 written first (no deps), T005 implemented to make T007 green.** This is noted; the Developer should write T007 before T005.

#### T008 — UI test for `PreviewDataBanner`

This task IS the RED test for T006. Same inversion applies: T008 should be written before T006.

**Depends-on reorder:** T008 depends on T006 in Lead Dev plan. **Correct TDD order is T008 written first (depends on T005 for the flag constants), T006 implemented to make T008 green.**

---

### Epic C — Shared component layer

#### T009 — Create `GradientText` utility component

| Field | Value |
|---|---|
| **Scenario (renders gradient class)** | `<GradientText>Hello</GradientText>` → rendered element has class `elev-hero-text--gradient`; renders as `<span>` by default |
| **Scenario (as prop)** | `<GradientText as="h1">Text</GradientText>` → renders as `<h1>` tag |
| **Scenario (runtime contrast — dark mode)** | Render in simulated dark-mode theme; `getComputedStyle(el).color` is NOT `transparent`; contrast ratio between resolved text color and background ≥ 3:1 (WCAG AA for large text at hero scale) — use a contrast-ratio helper or `jest-axe` with resolved palette |
| **Scenario (axe a11y)** | `jest-axe` reports zero violations |
| **Expected outcome** | All pass; dark-mode contrast check must NOT rely on `toHaveClass` alone |
| **Test type** | UI |
| **File** | `site/components/ui/gradient-text.test.tsx` |
| **Fixture provenance** | N/A — presentational wrapper; no SDK fixture |

#### T010 — Create `DecorativeCta` wrapper

| Field | Value |
|---|---|
| **Scenario (fires toast on click)** | Render `<DecorativeCta label="View activity" toastCopy="Coming soon" />`; simulate click; assert `sonner.toast` called with `"Coming soon"` |
| **Scenario (no navigation side effect)** | Click does NOT trigger any `router.push` or `window.location` change |
| **Scenario (keyboard activation)** | Button accessible via `Tab`; `Enter` or `Space` fires the same toast |
| **Scenario (axe a11y)** | `jest-axe` zero violations |
| **Expected outcome** | Toast-fire assertion uses a `vi.mock('sonner')` spy; keyboard path asserted |
| **Test type** | UI |
| **File** | `site/components/ui/decorative-cta.test.tsx` |
| **Fixture provenance** | N/A |

#### T011 — Create `useCountUp` hook

| Field | Value |
|---|---|
| **Scenario (reduced-motion early return)** | Mock `window.matchMedia` to return `matches: true`; call `useCountUp(100)`; hook returns `100` immediately without waiting for animation frames |
| **Scenario (no browser-global in render)** | Hook source does NOT contain `typeof window`, `matchMedia(`, `IntersectionObserver` outside a `useEffect` body — static analysis assertion in test comments; confirmed by code-review grep |
| **Scenario (counts up to target)** | Mock `matchMedia` returning `matches: false`; advance fake timers; hook produces intermediate values increasing toward `100` and eventually lands at `100` |
| **Scenario (cleanup)** | Unmount the component using the hook; `cancelAnimationFrame` called — assert via `vi.spyOn(globalThis, 'cancelAnimationFrame')` |
| **Expected outcome** | All 4 assertions pass |
| **Test type** | unit |
| **File** | `site/hooks/use-count-up.test.tsx` |
| **Fixture provenance** | N/A — pure JS logic hook |
| **RED before GREEN** | T013 (which covers both hooks) is the RED artifact. Write T013 before T011 and T012. |

#### T012 — Create `useLetterReveal` hook

| Field | Value |
|---|---|
| **Scenario (reduced-motion flat text)** | Mock `matchMedia` `matches: true`; `useLetterReveal("Hello")` returns flat text (string or single text node), NOT an array of character spans |
| **Scenario (no browser-global in render body)** | Hook source is SSR-safe: no `typeof window` or `matchMedia` outside `useEffect` |
| **Scenario (produces N spans)** | Mock `matchMedia` `matches: false`; `useLetterReveal("Hi")` produces 2 spans with `--reveal-delay` CSS custom property set |
| **Expected outcome** | All 3 pass |
| **Test type** | unit |
| **File** | `site/hooks/use-letter-reveal.test.tsx` |
| **Fixture provenance** | N/A |

#### T013 — Unit tests for `useCountUp` + `useLetterReveal`

This task IS the RED step for T011 and T012. The Developer writes T013 first (both test files), then implements T011 and T012 to make them green.

**Depends-on reorder:** Lead Dev plan has `T013 Depends on: T011, T012`. **Correct TDD order: T013 is written first (no deps on T011/T012 implementations), T011 + T012 then implemented.** Developer writes failing tests, then implements hooks.

---

### Epic D — Full Page redesign

#### T014 — Re-skin `TopActionRow.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 chrome classes applied)** | Rendered container has class `elev-glass-surface` AND `fp-topbar` |
| **Scenario (all 3 buttons functional)** | Import / Export / New Map buttons still fire their existing handlers (assert via existing `TopActionRow.test.tsx` behavior tests — carry untouched) |
| **Scenario (no hex literals introduced)** | T040 structural guard continues to pass after T014 |
| **Scenario (z-index contract)** | Container does NOT have inline `z-index` style that conflicts with `fp-topbar` class (which provides `z-index: 40`); no `z-index: 50` or higher on this element |
| **Expected outcome** | Existing behavior tests from `TopActionRow.test.tsx` stay green; new V4 chrome class assertions added in T052 |
| **Test type** | UI (re-skin update in T052) |
| **File** | `site/tests/ui/full-page/TopActionRow.test.tsx` (updated in T052) |
| **Fixture provenance** | Carries from PRD-000 existing fixture |

#### T015 — Author `WorkspaceHero.tsx`

| Field | Value |
|---|---|
| **Scenario (headline renders from PREVIEW_DATA)** | `activeMapsCount` from `PREVIEW_DATA.fullPageHero.activeMapsCount` (value `8`) appears in headline text; `"all healthy"` string present |
| **Scenario (sub-line copy from mock)** | Sub-line contains `"14 minutes ago"` and `"Anna"` (from `PREVIEW_DATA.fullPageHero.lastPublishAgo` / `lastPublishBy`); does NOT contain `"languages"` |
| **Scenario (two DecorativeCta buttons render)** | `getByRole("button", { name: "View activity" })` present; `getByRole("button", { name: "Publish all" })` present |
| **Scenario (mock elements tagged)** | Sub-line element and headline element carry `data-preview-mock="true"` |
| **Scenario (no "Edge caches across N languages")** | Rendered HTML does NOT match `/\d+\s+language/i`; T045 guard passes |
| **Scenario (gradient-text runtime contrast)** | Dark-mode contrast check per § 9.5 — gradient headline is visible (≥ 3:1 at hero scale) |
| **Scenario (axe a11y)** | `jest-axe` zero violations; `<h1>` exists in document order |
| **Expected outcome** | All 7 scenarios pass |
| **Test type** | UI |
| **File** | `site/tests/ui/full-page/WorkspaceHero.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.fullPageHero) |

#### T016 — Author `StatStrip.tsx`

| Field | Value |
|---|---|
| **Scenario (4 tiles render)** | 4 tile elements present in DOM |
| **Scenario (all 4 carry data-preview-mock)** | All 4 tiles have `data-preview-mock="true"` |
| **Scenario (count-up values from PREVIEW_DATA)** | Rendered text includes `"68"`, `"64"`, `"4"`, `"0"` (from `PREVIEW_DATA.fullPageStatStrip`) |
| **Scenario (reduced-motion: count-up skipped)** | With `matchMedia` `matches: true`, tiles render at final values immediately (no animation frames required) |
| **Scenario (axe a11y)** | `jest-axe` zero violations; tile numbers are in `role="status"` or equivalent |
| **Expected outcome** | All 5 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/full-page/StatStrip.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.fullPageStatStrip) |

#### T017 — Modify `FullPage.tsx` (shell composition)

| Field | Value |
|---|---|
| **Scenario (plume backdrop rendered aria-hidden)** | `.fp-plume-backdrop` element present in DOM with `aria-hidden="true"` |
| **Scenario (banner mounted)** | `PreviewDataBanner` with `surface="fullPage"` rendered |
| **Scenario (hero + stat strip present)** | `WorkspaceHero` and `StatStrip` render within the shell |
| **Scenario (existing children intact)** | `RedirectMapList` and `RedirectMapDetail` still present in layout (existing functional tests still pass) |
| **Scenario (T051 passes)** | The FullPage.layout.test.tsx update in T051 asserts all 5 V4 elements present |
| **Expected outcome** | No existing functional tests broken; new structural assertions added in T051 |
| **Test type** | UI (updated in T051) |
| **File** | `site/tests/ui/full-page/FullPage.layout.test.tsx` (updated in T051) |
| **Fixture provenance** | Carries from PRD-000 fixture |

#### T018 — Re-skin `RedirectMapList.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 card classes)** | Map-row cards have `elev-glass-surface` and `elev-card` classes |
| **Scenario (no --draft dot variant)** | No element in tree has class containing `--draft`; T043 guard passes |
| **Scenario (selected row a11y)** | Selected row has `aria-selected="true"` |
| **Scenario (virtualization intact)** | Existing `react-virtuoso` behavior test (if present in PRD-000 suite) still passes |
| **Expected outcome** | All 4 pass; T043 guard clean |
| **Test type** | UI (updated in T052) |
| **File** | `site/tests/ui/full-page/RedirectMapList.test.tsx` (updated in T052) |
| **Fixture provenance** | Carries from PRD-000 |

#### T019 — Re-skin `RedirectMapDetail.tsx`

| Field | Value |
|---|---|
| **Scenario (no status column)** | No table column header with text `"Status"` or `"Active"` or `"Draft"` in the mappings table |
| **Scenario (RedirectType column present)** | Column with redirectType display values (`"301"`, `"302"`, `"Server Transfer"`) present via `redirectTypeDisplayName()` |
| **Scenario (inline edit intact)** | Existing edit/delete handler tests carry (behavior assertion category (a)) |
| **Scenario (drag-and-drop intact)** | `@dnd-kit/sortable` reorder tests from PRD-000 still pass |
| **Expected outcome** | No status column; RedirectType column present; no behavior regressions |
| **Test type** | UI (updated in T052) |
| **File** | `site/tests/ui/full-page/RedirectMapDetail.test.tsx` (updated in T052) |
| **Fixture provenance** | Carries from PRD-000 |

#### T020 — Re-skin `NewRedirectMapModal.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 dialog shell)** | Modal dialog has `elev-glass-surface` class |
| **Scenario (title stays utility voice)** | Modal title text is `"Create new Redirect Map"` or equivalent — does NOT contain marketing copy like `"Launch your..."` |
| **Scenario (createRedirectMap SDK call intact)** | Existing behavior test: form submit fires `createRedirectMap` wrapper with correct args (carry verbatim from PRD-000) |
| **Expected outcome** | Chrome updated; all existing behavior assertions pass |
| **Test type** | UI (updated in T052) |
| **File** | `site/tests/ui/full-page/NewRedirectMapModal.test.tsx` (updated in T052) |
| **Fixture provenance** | `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData / Authoring.GraphqlResponse` (carry from PRD-000) |

#### T021 — Re-skin `DeleteMapConfirmModal.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 chrome + destructive button)** | `elev-glass-surface` on dialog; `Button variant="destructive"` still present |
| **Scenario (deleteRedirectMap intact)** | Behavior test: confirm fires `deleteRedirectMap` (carry from PRD-000) |
| **Expected outcome** | Chrome updated; behavior carries |
| **Test type** | UI (updated in T052) |
| **File** | `site/tests/ui/full-page/DeleteMapConfirmModal.test.tsx` (updated in T052) |
| **Fixture provenance** | Carry from PRD-000 |

#### T022 — Re-skin `ImportRedirectMapModal.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 chrome)** | `elev-glass-surface` on dialog shell |
| **Scenario (wizard steps intact)** | Existing wizard-step behavior tests carry (preview → diff → 3 conflict actions per ADR-0006) |
| **Expected outcome** | Chrome updated; wizard behavior untouched |
| **Test type** | UI (updated in T052) |
| **File** | `site/tests/ui/full-page/DeleteMapConfirmModal.test.tsx` context — actually `site/tests/ui/full-page/` (file name matches component; updated in T052) |
| **Fixture provenance** | Carry from PRD-000 |

#### T023 — Re-skin `CollectionPicker.tsx` + `SitePicker.tsx`

| Field | Value |
|---|---|
| **Scenario (SDK reads intact)** | Existing `listSites` / `listCollections` behavior tests carry |
| **Scenario (localStorage persistence intact)** | Selection state persists across re-renders (existing test carries) |
| **Expected outcome** | Behavior tests carry; anatomy tests updated in T052 |
| **Test type** | UI (updated in T052) |
| **File** | `site/tests/ui/full-page/CollectionPicker.test.tsx`, `SitePicker.test.tsx` (updated in T052) |
| **Fixture provenance** | `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesResponse` (carry from PRD-000) |

---

### Epic E — Context Panel redesign + UX evolution

#### T024 — Author `ContextPanelHero.tsx`

| Field | Value |
|---|---|
| **Scenario (plural-aware — N > 1)** | `<ContextPanelHero count={3} pageUrl="/products" />` → headline text is `"3 redirects point here."` |
| **Scenario (plural-aware — N = 1)** | `count={1}` → `"1 redirect points here."` (singular `redirect`) |
| **Scenario (zero-match guidance subline)** | `count={0}` → `"0 redirects point here."` AND guidance subline `"Add the first redirect..."` visible |
| **Scenario (page route in mono font)** | `pageUrl="/products/sneaker-x"` renders in the DOM in a mono-font element |
| **Scenario (gradient-text contrast — dark mode)** | Per § 9.5: hero headline contrast ≥ 3:1 at dark-mode palette |
| **Scenario (count-up on number)** | Number element has `elev-count-up` class OR `useCountUp` is applied to it (confirm animation hook wired) |
| **Scenario (axe a11y)** | `jest-axe` zero violations; `<h1>` in order; gradient-clip `color: transparent` headline has `aria-label` covering the full text for screen readers |
| **Expected outcome** | All 7 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/context-panel/ContextPanelHero.test.tsx` (NEW) |
| **Fixture provenance** | N/A — props-driven; count comes from `matchedGroups.length` (mocked as integer prop in tests) |

#### T025 — Author `QuickRedirectForm.tsx`

| Field | Value |
|---|---|
| **Scenario (always visible — no modal trigger)** | Render `<QuickRedirectForm ... />` directly; form is in DOM without any preceding button click |
| **Scenario (source pre-populated)** | Source input value equals `pageInfo.url` prop (`"/products/sneaker-x"`) on initial render |
| **Scenario (no-match / create-new mode: RedirectType select enabled)** | `matchedGroups=[]` → `<select>` element is NOT `disabled`; shows all 3 enum options via `redirectTypeDisplayName()` — `"301"`, `"302"`, `"Server Transfer"`; no `"307"` option |
| **Scenario (no-match: auto-name preview)** | `pageInfo.url="/products/sneaker-x"` → auto-name preview text contains `"sneaker-x-redirects"` |
| **Scenario (add-to-existing mode: RedirectType select disabled)** | `matchedGroups=[{...}]` with `selectedMapId` set → select is `disabled`; hint text `"Uses"` and map name visible |
| **Scenario (Add button disabled when source empty)** | Clear source input → Add `<button>` has `disabled` attribute |
| **Scenario (create-new submit fires createRedirectMap)** | `matchedGroups=[]`; fill source; click Add → `createRedirectMap` wrapper called with `mode: 'create-new'`, auto-name, `redirectType: 'Redirect301'` |
| **Scenario (add-to-existing submit fires updateRedirectMap)** | `matchedGroups=[{ id: "abc", ...}]`; fill source; click Add → `updateRedirectMap` wrapper called with `mode: 'add-to-existing'`, `mapId: "abc"` |
| **Scenario (success: toast + source resets)** | Successful submit → `toast("Redirect added to...")` fires; source input resets to `pageInfo.url` |
| **Scenario (error: form preserves values)** | SDK wrapper throws; toast error fires; source input value unchanged |
| **Scenario (axe a11y across all 3 states)** | `jest-axe` zero violations in no-match, single-match, multi-match states |
| **Expected outcome** | All 11 behavioral + 1 a11y pass; SDK fixture provenance cited |
| **Test type** | UI |
| **File** | `site/tests/ui/context-panel/QuickRedirectForm.test.tsx` (NEW — this file is what T048 also produces; they are the same file) |
| **Fixture provenance** | `// source: site/lib/sdk/redirects-write.ts createRedirectMap / updateRedirectMap wrapper shapes + node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData` (carry from PRD-000 AddRedirectModal fixture — category (a) behavior assertions; do NOT rewrite fixture from scratch) |
| **RED before GREEN** | T025 test file (`QuickRedirectForm.test.tsx`) is written before `QuickRedirectForm.tsx` exists. T025 and T048 refer to the same test file; the test is created at T025 time. |

#### T026 — Author `MultiMatchDropdown.tsx`

| Field | Value |
|---|---|
| **Scenario (renders only when ≥ 2 matches)** | `matchedGroups.length=1` → component returns `null` |
| **Scenario (renders when ≥ 2)** | `matchedGroups.length=2` → `<select>` dropdown present; label `"Adding to:"` present |
| **Scenario (emits onMapSelect on change)** | Change `<select>` value → `onMapSelect` callback called with the new `mapId` |
| **Scenario (options sorted by updatedAt descending)** | Most-recently-updated map appears first in option list |
| **Scenario (axe a11y)** | `jest-axe` zero violations; select has accessible label |
| **Expected outcome** | All 5 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/context-panel/MultiMatchDropdown.test.tsx` (NEW) |
| **Fixture provenance** | Mock `matchedGroups` array with `updatedAt` timestamps; typed per `MatchedMapGroup` from `site/lib/domain/types.ts` |

#### T027 — Modify `ContextPanel.tsx` (shell composition)

| Field | Value |
|---|---|
| **Scenario (ContextPanelHero renders with count)** | Render `ContextPanel` with 3 matched groups → `ContextPanelHero` count text `"3 redirects"` present |
| **Scenario (QuickRedirectForm always visible)** | Form present without any button click |
| **Scenario (no AddRedirectModal imports)** | Source file does NOT contain string `"AddRedirectModal"` — confirmed by T054 + grep; test file confirms by checking rendered DOM has no modal-open button |
| **Scenario (handleQuickSubmit wires to existing SDK wrappers)** | Integration: `create-new` submission calls `createRedirectMap`; `add-to-existing` calls `updateRedirectMap` (behavior asserted in T049 + QuickRedirectForm tests) |
| **Expected outcome** | No existing `pages.context` / matcher / `canvasReload` behavior broken; T049 covers new composition |
| **Test type** | UI (ContextPanel.states updated in T049) |
| **File** | `site/tests/ui/context-panel/ContextPanel.states.test.tsx` (updated in T049) |
| **Fixture provenance** | Carry from PRD-000 (`pages.context` mock, `matchPageRedirects` mock) |

#### T028 — Re-skin `MatchedMapGroup.tsx`

| Field | Value |
|---|---|
| **Scenario (no Active/Draft)** | No element in rendered tree has text `"Active"` or `"Draft"`; no class `status-pill--active`, `status-pill--draft`, `--draft`; T043 guard passes |
| **Scenario (RedirectType badge uses redirectTypeDisplayName)** | Badge text is `"301"` / `"302"` / `"Server Transfer"` — from `redirectTypeDisplayName()` |
| **Scenario (edit/delete handlers carry)** | Existing `InlineEditForm` behavior tests carry verbatim (category (a)) |
| **Scenario (hover-lift class present)** | Card has `elev-card` class (behavior: hover lift is visually present; class is the CSS contract) |
| **Expected outcome** | All 4 pass; T043 guard clean |
| **Test type** | UI (updated in T053) |
| **File** | `site/tests/ui/context-panel/MatchedMapGroup.test.tsx` (updated in T053) |
| **Fixture provenance** | Carry from PRD-000 |

#### T029 — Re-skin `RegexBanner.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 alert chrome)** | Rendered component has `blok-alert--info` class or equivalent info-variant role |
| **Scenario (copy unchanged)** | Banner text matches the PRD-000 copy (carry) |
| **Expected outcome** | Anatomy assertion updated; copy assertion unchanged |
| **Test type** | UI (updated in T053) |
| **File** | `site/tests/ui/context-panel/RegexBanner.test.tsx` (updated in T053) |
| **Fixture provenance** | N/A |

#### T030 — Re-skin `EditMapSettingsModal.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 chrome)** | `elev-glass-surface` on dialog |
| **Scenario (updateRedirectMap SDK call intact)** | Behavior test: form submit fires `updateRedirectMap` (carry from PRD-000) |
| **Expected outcome** | Chrome updated; behavior carries |
| **Test type** | UI (updated in T053) |
| **File** | `site/tests/ui/context-panel/EditMapSettingsModal.test.tsx` (updated in T053) |
| **Fixture provenance** | Carry from PRD-000 |

---

### Epic F — Dashboard Widget redesign

#### T031 — Author `DashboardHero.tsx`

| Field | Value |
|---|---|
| **Scenario (hero stat value from PREVIEW_DATA)** | Rendered text includes `"12,428"` (formatted with `toLocaleString('en-US')`) |
| **Scenario (delta renders)** | `"+412 this week"` present |
| **Scenario (all elements mock-tagged)** | Hero stat element, delta, subhead all have `data-preview-mock="true"` |
| **Scenario (subhead uses marketing voice)** | Text `"Your redirect operations, at a glance."` present (utility label `<h2>` is separate — NOT the marketing subhead) |
| **Scenario (reduced-motion: count-up skipped)** | `matchMedia` mocked to `matches: true` → hero number renders at `12,428` immediately |
| **Scenario (gradient-text contrast — dark mode)** | Per § 9.5: hero number contrast ≥ 3:1 in dark mode |
| **Scenario (axe a11y)** | `jest-axe` zero violations |
| **Expected outcome** | All 7 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/DashboardHero.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.heroStat + PREVIEW_DATA.dashboardFooter) |

#### T032 — Author `Sparkline.tsx`

| Field | Value |
|---|---|
| **Scenario (aria-hidden)** | `<svg>` element has `aria-hidden="true"` |
| **Scenario (no keyboard focus)** | SVG is not focusable (no `tabIndex` on SVG or its children) |
| **Scenario (data-preview-mock)** | SVG has `data-preview-mock="true"` |
| **Scenario (21 data points)** | SVG `<path>` renders using all 21 points from `PREVIEW_DATA.sparkline.points` (assert path string is non-empty and changes when points are different) |
| **Scenario (no hex colors in SVG)** | Stroke uses `var(--primary)` or `currentColor`; no `#` literal in SVG attributes |
| **Expected outcome** | All 5 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/Sparkline.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.sparkline.points) |

#### T033 — Author `TopDestinations.tsx`

| Field | Value |
|---|---|
| **Scenario (5 rows render)** | 5 row elements in DOM |
| **Scenario (all rows mock-tagged)** | All 5 carry `data-preview-mock="true"` |
| **Scenario (en-only paths)** | All rendered path strings match `/^\/[a-z0-9\-\/]+$/`; no `/de/` or other locale prefix |
| **Scenario (bar-fill: IntersectionObserver in useEffect)** | Source code does NOT call `new IntersectionObserver(...)` in render body or `useState` init — static-analysis assertion; verified by code-review grep |
| **Scenario (reduced-motion: bar renders at final %)** | When `matchMedia` `matches: true`, bar-fill `width` is already at `barFillPct`% without waiting for intersection |
| **Scenario (axe a11y)** | `jest-axe` zero violations; hit counts have accessible labels |
| **Expected outcome** | All 6 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/TopDestinations.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.topDestinations) |

#### T034 — Author `RecentlyShipped.tsx`

| Field | Value |
|---|---|
| **Scenario (3 rows render)** | 3 recently-shipped rows in DOM |
| **Scenario (4th mock tile renders)** | Count tile with value `4` and sub `"+4 last 24h"` present |
| **Scenario (all mock-tagged)** | Both the count tile and all 3 rows have `data-preview-mock="true"` |
| **Scenario (no status pill — no Active/Draft)** | No text `"Active"` or `"Draft"` in tree; T043 guard passes |
| **Scenario (RedirectType badges)** | Each row shows a `redirectTypeDisplayName()` badge (all `"301"` per mock data) |
| **Scenario (en-only paths)** | All source/target path strings are en-only; no `/de/` |
| **Scenario (axe a11y)** | `jest-axe` zero violations |
| **Expected outcome** | All 7 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/RecentlyShipped.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.recentlyShipped) |

#### T035 — Author `HealthBadge.tsx`

| Field | Value |
|---|---|
| **Scenario (inline SVG, not emoji)** | Rendered HTML contains an `<svg>` element; does NOT contain `✅` or `ⓘ` Unicode codepoints |
| **Scenario (currentColor stroke)** | SVG `stroke` attribute is `"currentColor"` (theme-aware) |
| **Scenario (mock-tagged)** | Badge has `data-preview-mock="true"` |
| **Scenario (label text)** | `"all healthy"` text present from `PREVIEW_DATA.dashboardFooter.healthStatus` |
| **Scenario (axe a11y)** | `jest-axe` zero violations; badge has accessible role |
| **Expected outcome** | All 5 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/HealthBadge.test.tsx` (NEW) |
| **Fixture provenance** | `// source: site/lib/mocks/preview-data.ts` (PREVIEW_DATA.dashboardFooter.healthStatus) |

#### T036 — Modify `DashboardWidget.tsx` (shell composition)

| Field | Value |
|---|---|
| **Scenario (banner mounted)** | `PreviewDataBanner surface="dashboardWidget"` rendered at top |
| **Scenario (3 real tiles — no mock attribute)** | The 3 real tiles (Maps / Mappings / Last-updated) do NOT have `data-preview-mock="true"` |
| **Scenario (4th tile + lists + footer have mock attribute)** | 4th tile + sparkline + TopDestinations + RecentlyShipped + HealthBadge all have `data-preview-mock="true"` |
| **Scenario (FootnoteSeparated removed)** | No `"Redirect counts only"` text in rendered tree |
| **Scenario (aggregateStats real data intact)** | Existing `aggregateStats` behavior test: Maps / Mappings / Last-updated compute from the same SDK reads (carry from PRD-000) |
| **Expected outcome** | All 5 pass; updated in T050 |
| **Test type** | UI (updated in T050) |
| **File** | `site/tests/ui/dashboard-widget/DashboardWidget.test.tsx` (updated in T050) |
| **Fixture provenance** | Carry from PRD-000 for real-tile SDK reads |

#### T037 — Re-skin `StatTile.tsx`

| Field | Value |
|---|---|
| **Scenario (V4 chrome classes)** | Tile has `elev-glass-surface` and `elev-card` |
| **Scenario (count-up for numeric values)** | Numeric value rendered with `elev-count-up` class or `useCountUp` applied |
| **Scenario (timestamp graceful degrade)** | Last-updated tile (string value) renders without crashing (count-up gracefully skipped for non-numeric) |
| **Scenario (no mock attribute on real tiles)** | `StatTile` itself does NOT add `data-preview-mock` — only the caller (DashboardWidget) controls this |
| **Expected outcome** | All 4 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/StatTile.test.tsx` (NEW or update from PRD-000 if exists) |
| **Fixture provenance** | N/A — presentational |

---

### Epic G — Reduced-motion + theme audit

#### T038 — Audit existing `@keyframes` for reduced-motion pairing

| Field | Value |
|---|---|
| **Scenario** | Every `@keyframes` block in `site/**/*.css` that existed in PRD-000 has a corresponding `@media (prefers-reduced-motion: reduce)` rule — specifically `blok-skeleton-shimmer` (already paired per architecture § 9 R-4; verify the pairing still exists after `elevated.css` is added) |
| **Expected outcome** | Audit table written to implementation runbook; any PRD-000 unpaired keyframes identified and fixed; T041 guard then passes over ALL CSS files |
| **Test type** | structural (T041 codifies the assertion after this audit) |
| **File** | T041 guard in `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

#### T039 — Verify theme switching end-to-end

| Field | Value |
|---|---|
| **Scenario (theme test carries from PRD-000)** | Existing `site/tests/theme/dark-mode-primary-foreground.test.ts` still passes — `--primary-foreground` override confirmed active in dark mode |
| **Scenario (manual: all 3 surfaces)** | Operator toggles light ↔ dark on Full Page, Context Panel, Dashboard Widget; V4 token-composed gradients switch correctly |
| **Scenario (no static color values)** | T040 no-hex guard is green — confirms all color is token-driven |
| **Expected outcome** | Existing theme test passes; manual confirmation at m5 |
| **Test type** | structural + manual-smoke |
| **File** | `site/tests/theme/dark-mode-primary-foreground.test.ts` (carry) |
| **Fixture provenance** | Carry from PRD-000 |

---

### Epic H — Structural guards

Each guard in T040–T045 is itself a RED test that must exist before the code it enforces is written. The developer writes the guard `it()` block (RED — immediately passes because the violation doesn't exist yet, OR is pre-seeded with a known violation to confirm it fails first), then uses it as the ongoing contract.

**Important:** Each guard's RED state should be confirmed by temporarily injecting a known violation into a test fixture file (not source) and verifying the guard reports it, then removing the violation. This is the only way to confirm the guard is not a "trivially passes" test.

#### T040 — Guard #1: no `#` hex literals outside `site/app/globals.css`

| Field | Value |
|---|---|
| **Scenario** | Any `.ts`, `.tsx`, or `.css` file under `site/` (excluding `node_modules`, `.next`, `tests/fixtures`) containing `#[0-9a-fA-F]{3,8}\b` fails the test with file path + line number, EXCEPT files matching the allow-list path `site/app/globals.css` |
| **Regression baseline** | PRD-000 source currently passes this guard — verified by running it against current `site/` before any PRD-002 work begins |
| **Expected outcome** | Guard passes when all source files are clean; fails on a seed violation in a test fixture (confirming guard is live) |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

#### T041 — Guard #2: `@keyframes` ↔ reduced-motion pairing

| Field | Value |
|---|---|
| **Scenario** | Every CSS file under `site/` that contains one or more `@keyframes` declarations also contains a `@media (prefers-reduced-motion: reduce)` block |
| **Regression baseline** | PRD-000 `blok-skeleton-shimmer` keyframe in `theme.css` is already paired — guard confirms this remains true |
| **Seed violation test** | Add a bare `@keyframes test-anim {}` without a reduced-motion block to a temp fixture CSS file; guard must fail; remove and guard passes |
| **Expected outcome** | Guard passes on all CSS files after T038 audit completes |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

#### T042 — Guard #3: banner ↔ `data-preview-mock` pairing

| Field | Value |
|---|---|
| **Scenario (Full Page has both)** | Files under `site/components/full-page/` contain `data-preview-mock="true"` AND `<PreviewDataBanner` |
| **Scenario (Dashboard Widget has both)** | Files under `site/components/dashboard-widget/` contain both |
| **Scenario (Context Panel has neither)** | Files under `site/components/context-panel/` do NOT contain `data-preview-mock="true"` AND do NOT contain `<PreviewDataBanner` |
| **Seed violation test** | Add `data-preview-mock="true"` to a Context Panel component without a banner; guard must fail |
| **Expected outcome** | Guard passes after T017 + T036 implement correct pairing |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

#### T043 — Guard #4: no "Active" / "Draft" string literals; no `--draft` CSS classes

| Field | Value |
|---|---|
| **Scenario (no JSX Active/Draft)** | No `.tsx` file under `site/` matches `>(Active\|Draft)<` or `={"(Active\|Draft)"}` in a status-pill / badge context |
| **Scenario (no CSS draft class)** | No file matches `status-pill--active`, `status-pill--draft`, `lr-row__dot--draft`, `--draft` |
| **Regression baseline** | PRD-000 shipped WITHOUT Active/Draft (already clean) — guard confirms this carries |
| **Seed violation test** | Add `<span>Active</span>` to a temp `.tsx` fixture; guard must fail |
| **Expected outcome** | Guard passes cleanly after T028 + T034 implement V4 re-skins |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

#### T044 — Guard #5: `elevated-plumes.css` imported only by Full Page subtree

| Field | Value |
|---|---|
| **Scenario** | Any file under `site/` (excluding tests) that contains `elevated-plumes.css` in an import statement MUST be located under `site/app/full-page/` or `site/components/full-page/`; any other location fails the guard with the violating file path |
| **Seed violation test** | Add `import "../styles/elevated-plumes.css"` to a temp Context Panel fixture file; guard must fail; remove and guard passes |
| **Expected outcome** | Guard passes after T004 wires import only to Full Page route |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

#### T045 — Guard #6: no language-count strings

| Field | Value |
|---|---|
| **Scenario** | No file under `site/` (excluding `site/tests/fixtures/**`) matches `\b\d+\s+languages?\b` or `\bacross\s+\d+\s+languages?\b` |
| **Regression baseline** | PRD-000 source is clean of these strings (ADR-0010 en-only) |
| **Seed violation test** | Add `"Edge caches refreshed across 7 languages"` to a temp `.tsx` fixture; guard must fail |
| **Expected outcome** | Guard passes; Full Page workspace hero never contains the dropped V4 copy |
| **Test type** | structural |
| **File** | `site/tests/structural/structural-guards.test.ts` |
| **Fixture provenance** | N/A |

---

### Epic I — Test rework cascade (R-12 — DEDICATED TRANCHE T7)

#### T046 — Audit Vitest suite (categorize tests)

| Field | Value |
|---|---|
| **Scenario** | Every `it()` block in `site/tests/ui/**` is categorized as (a) behavior / (b) anatomy / (c) AddRedirectModal — no uncategorized tests; audit table complete in implementation runbook |
| **Expected outcome** | Audit table written; count of each category reported; T047-T053 implementors know exactly which lines to touch |
| **Test type** | manual (audit task) |
| **File** | Implementation runbook |
| **Fixture provenance** | N/A |
| **Lead-Dev gap flag** | If any test file is found to have ZERO behavior assertions (only class-string anatomy), that is a gap — flag it. The test provides zero regression value post-rework if behavior was never asserted. |

#### T047 — Bulk class-string assertion replacements

| Field | Value |
|---|---|
| **Scenario** | Every category (b) entry's class string is updated to its V4 equivalent; after update, Vitest suite is green except `AddRedirectModal.test.tsx` |
| **Replacement contract** | Documented in implementation runbook per T046 audit (e.g., `toHaveClass("bg-card")` → `toHaveClass("elev-glass-surface")`). No speculative replacements — only those confirmed by T046 audit. |
| **Expected outcome** | All category (b) tests updated; suite green minus AddRedirectModal file |
| **Test type** | structural (update task) |
| **File** | `site/tests/ui/**/*.test.tsx` (per T046 audit list) |
| **Fixture provenance** | N/A — class updates only |
| **Behavior assertions in same it() block** | If a category (b) `it()` block also contains a behavior assertion, the behavior assertion is left entirely untouched. Only the class string literal is changed. |

#### T048 — Rewrite `AddRedirectModal.test.tsx` → `QuickRedirectForm.test.tsx`

| Field | Value |
|---|---|
| **Scenario (form always visible)** | No modal-open button queried; form present in initial render |
| **Scenario (source pre-populated)** | Source input value = `pageInfo.url` |
| **Scenario (RedirectType select — no-match mode)** | Select enabled; all 3 enum options present via `redirectTypeDisplayName()`; no `"307"` |
| **Scenario (RedirectType select — add-to-existing mode)** | Select `disabled`; hint copy `"Uses {name}'s redirect type"` visible |
| **Scenario (auto-name preview — create-new mode)** | `"New map: sneaker-x-redirects"` visible |
| **Scenario (Add disabled when source empty)** | Add button disabled |
| **Scenario (createRedirectMap fired — no-match)** | Behavior assertion CARRIED FROM PRD-000 `AddRedirectModal` test verbatim: same wrapper, same args shape |
| **Scenario (updateRedirectMap fired — add-to-existing)** | Behavior assertion CARRIED FROM PRD-000 verbatim |
| **Scenario (multi-match: MultiMatchDropdown renders)** | `matchedGroups.length >= 2` → dropdown present above source input |
| **Scenario (multi-match: dropdown selection re-binds RedirectType display)** | Change dropdown → RedirectType hint updates to new map's type |
| **Expected outcome** | `QuickRedirectForm.test.tsx` exists; `AddRedirectModal.test.tsx` deleted; all 10 scenarios pass |
| **Test type** | UI |
| **File** | `site/tests/ui/context-panel/QuickRedirectForm.test.tsx` |
| **Fixture provenance** | `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData / Authoring.GraphqlResponse` (carry verbatim from PRD-000 AddRedirectModal behavior assertions — do NOT rewrite from scratch) |

#### T049 — Update `ContextPanel.states.test.tsx`

| Field | Value |
|---|---|
| **Scenario (ContextPanelHero count visible)** | With 2 matched groups, `"2 redirects point here."` text present |
| **Scenario (MultiMatchDropdown conditional)** | With 1 match: dropdown absent; with 2 matches: dropdown present |
| **Scenario (QuickRedirectForm always present)** | Form in DOM regardless of matched count |
| **Scenario (no AddRedirectModal open/close state)** | No assertions on `isModalOpen` state or modal trigger button |
| **Scenario (matcher + canvasReload behavior carry)** | Existing assertions on `matchPageRedirects` + `canvasReload` carry verbatim |
| **Expected outcome** | Test file updated; passes green |
| **Test type** | UI |
| **File** | `site/tests/ui/context-panel/ContextPanel.states.test.tsx` |
| **Fixture provenance** | Carry from PRD-000 (`pages.context` mock) |

#### T050 — Update `DashboardWidget.test.tsx`

| Field | Value |
|---|---|
| **Scenario (banner mounted)** | `PreviewDataBanner surface="dashboardWidget"` in rendered tree |
| **Scenario (3 real tiles — no mock attribute)** | The 3 real tiles do NOT have `data-preview-mock` |
| **Scenario (4th tile + lists + footer — mock attribute)** | All carry `data-preview-mock="true"` |
| **Scenario (FootnoteSeparated absent)** | No `"Redirect counts only"` text |
| **Scenario (aggregateStats behavior carries)** | Existing `aggregateStats` data-flow assertion untouched |
| **Expected outcome** | All 5 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/dashboard-widget/DashboardWidget.test.tsx` |
| **Fixture provenance** | Carry from PRD-000 |

#### T051 — Update `FullPage.layout.test.tsx`

| Field | Value |
|---|---|
| **Scenario (plume backdrop)** | `.fp-plume-backdrop` element with `aria-hidden="true"` present |
| **Scenario (banner mounted)** | `PreviewDataBanner surface="fullPage"` rendered |
| **Scenario (WorkspaceHero)** | Hero eyebrow + headline + sub-line + 2 CTA buttons all present |
| **Scenario (StatStrip — 4 tiles with mock attribute)** | 4 tile elements, all carrying `data-preview-mock="true"` |
| **Scenario (existing layout intact)** | Left rail + right detail present at ≥1024px viewport (carry) |
| **Expected outcome** | All 5 pass |
| **Test type** | UI |
| **File** | `site/tests/ui/full-page/FullPage.layout.test.tsx` |
| **Fixture provenance** | Carry from PRD-000 |

#### T052 — Update remaining Full Page test files

| Field | Value |
|---|---|
| **Scenario** | Per T046 audit, every category (b) class-string assertion in `RedirectMapList.test.tsx`, `RedirectMapDetail.test.tsx`, `TopActionRow.test.tsx`, `NewRedirectMapModal.test.tsx`, `DeleteMapConfirmModal.test.tsx`, `CollectionPicker.test.tsx`, `SitePicker.test.tsx` is updated to the V4 equivalent; no behavior assertions changed |
| **Specific assertions to add** | `RedirectMapDetail.test.tsx`: assert no `"Status"` column header; assert `"Server Transfer"` badge option present |
| **Expected outcome** | All 7 test files green |
| **Test type** | UI |
| **File** | 7 files under `site/tests/ui/full-page/` |
| **Fixture provenance** | Carry from PRD-000 |

#### T053 — Update remaining Context Panel test files

| Field | Value |
|---|---|
| **Scenario (MatchedMapGroup)** | No `"Active"` / `"Draft"` / `"unpublished"` text asserted (add assertion for ABSENCE); `redirectTypeDisplayName()` output present; `elev-card` class present; inline-edit behavior assertions carry |
| **Scenario (RegexBanner)** | `blok-alert--info` (or info-variant equivalent) class present; copy assertion carries |
| **Scenario (EditMapSettingsModal)** | `elev-glass-surface` on dialog; `updateRedirectMap` behavior carry |
| **Expected outcome** | 3 test files green |
| **Test type** | UI |
| **File** | `site/tests/ui/context-panel/MatchedMapGroup.test.tsx`, `RegexBanner.test.tsx`, `EditMapSettingsModal.test.tsx` |
| **Fixture provenance** | Carry from PRD-000 |

---

### Epic I (continued) — Deletion

#### T054 — Delete `AddRedirectModal.tsx`

| Field | Value |
|---|---|
| **Scenario (absence assertion)** | `grep -r "AddRedirectModal" site/` returns zero results (only the planning document references it, which is not under `site/`) |
| **OUT of TDD** | The test for this task is the absence-assertion grep + T044 guard confirming no plume-boundary violations from this file path. No Vitest `it("file should not exist")` required. |
| **Pre-condition** | T027 (no more imports in ContextPanel.tsx) AND T048 (test file rewritten) MUST be complete first |
| **Expected outcome** | File deleted; grep returns zero; suite still green |
| **Test type** | structural (grep assertion) |
| **File** | N/A (file removal) |
| **Fixture provenance** | N/A |

---

### Epic J — Smoke prep + documentation

#### T055 — Author m2 host-frame visual smoke checklist

| Field | Value |
|---|---|
| **Scenario** | Checklist file at `products/redirect-manager/project-planning/smoke/m2-host-frame-checklist-prd002.md` exists; covers all 6 POC frames; lists 5-axis comparison items per frame; includes light + dark + reduced-motion variant coverage; includes `npx serve` recipe for Playwright MCP `file://` workaround |
| **Expected outcome** | File exists with all required sections |
| **Test type** | manual-smoke (artifact) |
| **File** | `products/redirect-manager/project-planning/smoke/m2-host-frame-checklist-prd002.md` |
| **Fixture provenance** | `products/redirect-manager/pocs/poc-v1-prd002/` — POC frames are the checklist ground truth |
| **OUT of TDD** | Documentation artifact. |

#### T056 — Author m5 live walkthrough checklist

| Field | Value |
|---|---|
| **Scenario** | Checklist file at `products/redirect-manager/project-planning/smoke/m5-live-walkthrough-checklist-prd002.md` exists; covers ≥5-min session items; inline quick-add efficiency check (single-match / multi-match / no-match); PRD-000 functional regression items (US-1..US-10 per PRD § 6.1 verification matrix) |
| **Expected outcome** | File exists with all required sections |
| **Test type** | manual-smoke (artifact) |
| **File** | `products/redirect-manager/project-planning/smoke/m5-live-walkthrough-checklist-prd002.md` |
| **OUT of TDD** | Documentation artifact. |

#### T057 — Update `docs/architecture.md`

| Field | Value |
|---|---|
| **Scenario** | New section appended covering V4 elevation pattern, mock-data architecture, 15 `--v4-*` variable inventory, z-index hierarchy, 5 new structural guards |
| **Expected outcome** | Section present in `products/redirect-manager/docs/architecture.md` |
| **Test type** | manual (artifact) |
| **OUT of TDD** | Documentation artifact. |

#### T058 — Update `docs/decisions.md`

| Field | Value |
|---|---|
| **Scenario** | New section appended covering D1-D10 redesign decisions + ADR-0028, ADR-0029, ADR-0030 |
| **Expected outcome** | Section present in `products/redirect-manager/docs/decisions.md` |
| **Test type** | manual (artifact) |
| **OUT of TDD** | Documentation artifact. |

#### T059 — Final lint + typecheck + test + build

| Field | Value |
|---|---|
| **Scenario** | `npm run lint && npm run typecheck && npm run test && npm run build` all exit with code 0 from `site/` directory |
| **Expected outcome** | Zero lint errors; zero type errors; Vitest suite green (all structural guards + all UI tests + all unit tests); Next.js build succeeds with ≤ +15 KB gzipped delta (NFR-R5) |
| **Test type** | E2E (CI gate) |
| **File** | N/A (command sequence) |
| **OUT of TDD** | CI gate, not a TDD task. |

---

### Depends-on reorderings for test-first ordering

The following Depends-on adjustments enforce RED before GREEN. The Lead Developer's stable Task IDs are preserved; no splits were needed because the plan already separates test tasks from source tasks.

| Task | Lead Dev Depends-on | QA-corrected Depends-on | Reason |
|---|---|---|---|
| T005 (`preview-data.ts`) | none | none (unchanged) | T007 is the RED test; Developer writes T007 before T005 even though T007 formally "depends on T005" in the plan. Note for Developer: write T007 file first (it will error-import), then T005. |
| T007 (`preview-data.test.ts`) | T005 | **none** (write test first; it will fail on missing import) | TDD: RED test written before implementation. The test file can exist with a failing import before T005 exists. |
| T008 (`preview-data-banner.test.tsx`) | T006 | **T005** (write test before banner component; import `PREVIEW_DATA_ACTIVE` for expected behavior assertions) | TDD: test written before component. |
| T013 (`hook unit tests`) | T011, T012 | **none** (write test files first; they fail on missing hook imports) | TDD: both hook test files written before hooks implemented. |
| T025 (`QuickRedirectForm.tsx`) | T001, T004 | **T001, T004** (unchanged — but Developer should write `QuickRedirectForm.test.tsx` file as part of this task's RED step before implementing the component) | The QuickRedirectForm test file IS T048 by content; write it in the T025 RED step. |
| T040–T045 (structural guards) | Various — all after source code lands | **Add T001-T004 as early as possible to T040/T041/T044** so guards run as CI contracts from Tranche 1 forward | Guards become RED contracts BEFORE component code is written. Add T040 to Tranche 1 execution order immediately after T004. |

**No task splits were needed** — the Lead Developer's plan already has test tasks as separate Task IDs (T007, T008, T013) and the structural guard tasks (T040–T045) as their own IDs. The reorderings above are execution-sequence instructions to the Developer, not plan restructurings.

---

## Handoff Metadata

- Canonical run manifest: `products/redirect-manager/project-planning/workflow/run-20260513T194022Z.json`
- Source PRD: `products/redirect-manager/project-planning/PRD/prd-002.md`
- Source architecture: `products/redirect-manager/project-planning/architecture/architecture-20260514T000000Z.md`
- Selected UI variant: `products/redirect-manager/project-planning/ui-design/ui-design-20260513T194022Z-v1.md`
- Winning POC: `products/redirect-manager/pocs/poc-v1-prd002/` (16 files; 58 click-targets; 6 frames)
- Recommended next command: `/task-breakdown` continues to QA Specialist enrichment (§ 9 + § 10 populated; possible TDD restructure flipping `task_breakdown_style` to `tdd`). Then `/implement`.
- Recommended next input file: `project-planning/plans/qa-report.md` (if QA Specialist produces a standalone report; otherwise this file is enriched in place).
