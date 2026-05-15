# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-002.md
pairs_with_prd: products/redirect-manager/project-planning/PRD/prd-002.md
generated_at: 2026-05-14T00:30:00Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260513T194022Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Condensed north-star for implementation. Keeps token use low: agent 08 reads this plus
  the enriched task breakdown only—not the full PRD, architecture doc, or V4 POC walkthrough.
---

## Problem

PRD-000 ships a working, operator-grade Redirect Manager but visually quiet to the point that it under-sells the engineering care. A 4-variant marketing exploration (V1 Aurora / V2 Brutalism / V3 Editorial / V4 Blok Elevated) identified V4 as the right answer — premium feel within the existing Blok Nova token system. PRD-002 takes V4 from exploration to shipped product across 3 extension-point routes (Full Page, Context Panel, Dashboard Widget); IntroPage `/` stays unchanged.

## Goal

Ship a V4-aligned redesign — visual chrome + V4 UX evolutions where V4 reveals better interaction patterns — across the 3 extension-point routes. Functional contract with Sitecore preserved 1:1. Where V4 shows speculative content (hero stats, sparklines, top-destinations, "all healthy" badges, "by Anna" attribution, stat strips, mini-widgets), ship hardcoded mocks under per-surface "Preview data" banners. A follow-on PRD wires real data into the pre-built visual chassis by flipping a per-surface `PREVIEW_DATA_ACTIVE` flag.

## Non-negotiables

- **Marketplace Mode A** scaffold continues from PRD-000 (ADR-0002). No server-side OAuth proxy. No re-scaffold.
- **No new SDK surfaces, no new GraphQL mutations, no new backend.** All `xmc.authoring.graphql` calls, all `site/lib/sdk/*` wrappers untouched.
- **Authoring GraphQL** is the single canonical source (ADR-0003). No KV cache, no parallel datastore.
- **`RedirectType` has 3 values, not 4.** Current code at `site/lib/domain/types.ts:17` + `site/lib/redirects/redirect-type-enum.ts:26` ships `'Redirect301' | 'Redirect302' | 'ServerTransfer'`. **Redirect307 is NOT in the enum** — head-app resolver does not honour 307 (per `docs/decisions.md` Tranche 6a 2026-05-11 capture). Any code that adds 307 fails the structural guard.
- **No "Active" / "Draft" status labels anywhere.** No `status-pill--active`, `status-pill--draft`, `lr-row__dot--draft` CSS class. Status pills use ONLY the 3-value RedirectType enum.
- **Blok token discipline** — zero `#` hex literals outside `site/app/globals.css` (the canonical theme.css location). All gradients composed via `color-mix(in oklch, var(--primary), var(--info))` or equivalent token expressions. All shadows from `--shadow-*` tokens or composed via `color-mix` with primary tint.
- **Geist Sans + Geist Mono only.** No Inter, no Space Grotesk, no Fraunces. Headlines scale up dramatically (Geist Sans 700 at clamp(48px, 8vw, 96px)); body / UI / table content stays at PRD-000 scales.
- **WCAG 2.1 AA** on all redesigned surfaces. Reduced-motion respect (`prefers-reduced-motion: reduce` disables plumes, kinetic reveals, count-ups, pulses). Every `@keyframes` block has a reduced-motion gate (structural guard).
- **HahnSoloFooter** stays mounted on every route per intro commit; new motion layers must not occlude.
- **Light + dark theme** both work end-to-end. Theme switching unchanged from PRD-000.
- **Mixed motion budget** — full V4 motion (drifting plumes, gradient text, kinetic letter reveals) on Full Page ONLY; Context Panel + Dashboard Widget get hover lifts only (no plumes, no kinetic reveals). Structural enforcement: plume CSS imports only in Full Page route module.
- **Hybrid voice — 3 zones** — marketing-grade on (a) Full Page workspace hero, (b) Dashboard Widget headline, (c) Context Panel hero count header (`<h1>` "N redirects point here"). Utility-tool voice everywhere else (modal titles, body, form fields, table content, footer text).
- **No new affordances** beyond what V4 introduces. UX evolutions during implementation that aren't already in V4 become follow-on PRDs.
- **No `dangerouslySetInnerHTML`** outside `components/ui/*`.
- **SDK boundary** — `@sitecore-marketplace-sdk/*` imported only from `lib/sdk/*` (PRD-000 structural test extends).

## In scope / out of scope

- **In scope:**
  - Full Page route redesign with full V4 motion, frosted-glass topbar, plume backdrop (28s drift loop), workspace hero headline, stat strip (Mappings count + 301 count + 302 count + Conflicts count, each with sparkline glyph — ALL mocked), map list with frosted-glass cards + RedirectType badges (real enum), all CRUD modals re-skinned, empty + error states.
  - Context Panel route redesign with hero `<h1>` count header ("N redirects point here" — real count from `matchedGroups.length`), "Sources redirecting to this URL" hero summary tile, inline quick-add form (US-R5; replaces modal flow), matched-redirect rows, Pages-aware en-only banner refined. Quieter motion budget.
  - Dashboard Widget route redesign with hero stat number + "+412 this week" delta (mocked), sparkline (mocked), top-destinations list (mocked; en-only paths), "Recently shipped · Last 24 hours" mini-widget (mocked), "Last publish by Anna" footer (mocked), "all healthy" badge (mocked), 3 real count tiles (Maps / Mappings / Last-updated), 4th metric tile (mocked). Quieter motion budget.
  - "Preview data" banner at top of Full Page AND Dashboard Widget (both surfaces have mocks). Context Panel: no banner (real data only there).
  - `PREVIEW_DATA` constants at single canonical location (`site/lib/mocks/preview-data.ts`) with `PREVIEW_DATA_ACTIVE.fullPage` + `.dashboardWidget` flags for future one-flip migration.
  - All status pills use 3-value RedirectType enum. No Active/Draft anywhere.
  - HahnSoloFooter visible on all 3 routes with proper z-index above motion layers.
  - Light + dark mode validated end-to-end.
  - `prefers-reduced-motion: reduce` disables all `@keyframes` animations.
  - Inline quick-add form (US-R5) replaces existing `AddRedirectModal` as the primary add-redirect path. Modal kept as fallback only if architect decides it's needed for the "create new map with full flag control" path.
- **Out of scope:**
  - IntroPage `/` redesign (rationale: 3 daily-driver routes prioritized; IntroPage redesign is future opportunity).
  - Real data wiring for mocks → follow-on "data plumbing" PRD (PRD-003 candidate).
  - Multilingual (deferred indefinitely per ADR-0023).
  - Regex matching, sync-back, analytics-beyond-mock-chassis → future PRDs.
  - New Sitecore Authoring mutations, new GraphQL fields, new SDK calls.

## Success criteria

- **m1 — `registration`** — Cloud Portal Test App loads, all 3 extension points mount without console errors.
- **m2 — `host_frame_smoke`** — 5-axis Playwright comparison against `pocs/poc-v1-prd002/` (refined V4 POC produced at `/architect`); 5 axes pass.
- **m3 — `crud_round_trip`** — every PRD-000 CRUD path (create map / edit / delete / add mapping / reorder / edit mapping / delete mapping) executes successfully on real tenant under V4 chrome. Plus US-R5 inline quick-add flow on Context Panel.
- **m4 — `import_export_round_trip`** — JSON v1 export + import wizard (incl. conflict resolution) work end-to-end on real tenant.
- **m5 — `live_walkthrough`** — ≥5-min operator session covering every redesigned surface and every flow. Zero unrecoverable errors. Operator confirms premium feel without visual regressions of PRD-000 functionality. Explicit operator probe: *"Tell me which numbers on Dashboard Widget / Full Page are real vs. preview"* — operator can identify them via banners.

All 5 must pass before `shipped`.

## Key constraints & assumptions

- **No SDK changes** — purely client-side rendering / styling + one interaction-pattern change (modal → inline form in Context Panel). Mock data lives in TypeScript constants, consumed by components that don't know whether the data is real or mock.
- **`backdrop-filter` + `color-mix(in oklch, ...)` browser floor** — Cloud Portal evergreen browsers (Chromium, Safari ≥ 14, Firefox ≥ 113). Architect confirms at `/architect`; if older browsers must be supported, add `@supports not` fallbacks (recipe: solid surface composed from `color-mix(in oklch, var(--background) 95%, var(--primary) 5%)`).
- **Motion performance inside iframe** — drifting plumes (28s loop) + frosted-glass + count-ups should not degrade host frame. Profile at `/test`. If jank surfaces, reduce blur radius, kill plume drift, or gate behind `prefers-reduced-data`.
- **Test continuity** — every existing PRD-000 Vitest test must still pass functionally. Class-string assertions may need bulk updates (R-12). Specifically `AddRedirectModal` tests (if any) need re-pointing at the new inline form OR keeping if modal is retained as fallback. Lead Developer audits at `/task-breakdown`.
- **Footer z-index** — HahnSoloFooter must remain visible above plume layers (z-index audit during `/architect`).
- **Marketing copy** — at least one candidate string per voice zone proposed in PRD § 11 OQ-1. Designer iterates at `/architect`.
- **POC refined at `/architect`** — designer takes V4 + applies all reconciliations (drop Active/Draft, drop "7 languages", drop `/de/...` paths, ensure 3-value enum, hero count header tied to `matchedGroups.length`), produces winning POC at `pocs/poc-v1-prd002/`. Architect records V4-to-refined diff (R-14).
- **Branch:** `prd-002` (stacked off `main`; PRD-000 shipped, PRD-001 cancelled — both already on main).
- **Scope dial:** rigor=standard, track=full, ui_variants=1, docs_at_ship=full, task_breakdown_review=skip_gate.
- **ADRs that govern PRD-002 specifically:** ADR-0024 (V4 Blok Elevated as visual base + relaxed D1), ADR-0025 (Mock-data architecture: PREVIEW_DATA constants + PREVIEW_DATA_ACTIVE flags + per-surface banner), ADR-0026 (Context Panel inline quick-add replaces modal — US-R5), ADR-0027 (Mixed motion budget). Plus carry-over ADRs from PRD-000 (especially ADR-0002, 0003, 0005, 0007, 0008, 0011, 0012, 0013).

## Handoff

- **Full PRD:** `products/redirect-manager/project-planning/PRD/prd-002.md` (15 sections + § 6.1 verification matrix + design contract values + R-12/R-13/R-14 — for humans and upstream agents only).
- **Executable contract:** `products/redirect-manager/project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **ADRs to read for context:** ADR-0024, 0025, 0026, 0027 (new) + carry-overs (ADR-0002, 0003, 0005, 0006, 0007, 0008, 0011, 0012, 0013).
- **V4 POC reference:** `pocs/poc-marketing-v4-blok-elevated/` (original; design intent). Refined POC at `pocs/poc-v1-prd002/` lands at `/architect` and becomes the canonical visual reference for implementation.
