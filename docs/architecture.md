# Architecture

This document is a readable narrative of how Redirect Manager is structured. It synthesizes the architecture blueprint and the thirteen ADRs under [`../project-planning/ADR/`](../project-planning/ADR/) into a single overview for developers and reviewers. Individual ADRs remain the source of truth for the *why* behind each decision; this document tells the story that connects them.

For a quick reference table of ADRs grouped by theme, see [`decisions.md`](decisions.md).

## 1. System at a glance

Redirect Manager is a **Sitecore Marketplace client-side app (Mode A)** with three Cloud Portal extension points, all backed by a single canonical data source — Sitecore Authoring GraphQL — and styled with Blok primitives.

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloud Portal (parent)                    │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│   │ Pages editor │   │ Site dash    │   │ Fullscreen   │    │
│   │ Context Panel│   │ Dashboard    │   │ extension    │    │
│   │   iframe     │   │ Widget iframe│   │ iframe       │    │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘    │
└──────────┼──────────────────┼──────────────────┼─────────────┘
           │ ClientSDK (postMessage bridge — Mode A)
           ▼                  ▼                  ▼
       ┌──────────────────────────────────────────────┐
       │   Redirect Manager Next.js App Router app    │
       │   /context-panel  /dashboard-widget  /full-page
       │                                              │
       │   lib/sdk/  ← only file family allowed to    │
       │              import @sitecore-marketplace-sdk│
       └────────────────────┬─────────────────────────┘
                            │ xmc.authoring.graphql
                            │ xmc.sites.listSites
                            │ xmc.sites.listCollections
                            ▼
            ┌────────────────────────────────┐
            │    Sitecore Authoring GraphQL  │
            │  /sitecore/content/.../Settings/Redirects/*
            └────────────────────────────────┘
```

The architecture variant choice is **Marketplace Client-Side** per the `sitecore:marketplace-sdk-lifecycle` and `sitecore:setup-marketplace-client-side` skills. Every Sitecore call rides the operator's authenticated Cloud Portal session via the SDK's postMessage bridge — no server-side OAuth, no `experimental_createXMCClient`, no backend the operator must provision. ADR-0002 carries the rationale.

The choice of Authoring GraphQL (rather than a separate KV cache, a parallel datastore, or hybrid analytics infrastructure) is locked in ADR-0003. MVP keeps everything in Sitecore — analytics, sync-back, and cross-environment counters are deferred to follow-on PRDs along clean seams.

## 2. Three extension points, three viewport profiles

| Extension point ID | Route | Viewport profile | Primary user |
|---|---|---|---|
| `xmc:pages:contextpanel` | `/context-panel` | Narrow vertical strip in Pages sidebar | Marketer in the Pages editor |
| `xmc:dashboardblocks` | `/dashboard-widget` | Bounded card on site dashboard (300–800 × 200–400 px) | Site manager |
| `xmc:fullscreen` | `/full-page` | Full iframe width with two-pane → tabbed fallback below 960 px | Sitecore admin / implementer |

The extension-point identifiers and route URLs are locked in ADR-0011, which also documents the root-route policy — the root `/` route returns `notFound()` so the iframe URL cannot be abused as a standalone page. The registration runbook for Cloud Portal Test App entries is at [`../site/docs/registration.md`](../site/docs/registration.md).

Each route is a separate page module under `site/app/`. The Marketplace Provider initializes the ClientSDK and exposes the `ApplicationContext` plus the typed client to every route via context. The Provider is the only React surface that calls `ClientSDK.init`; everything downstream consumes hooks (`useMarketplaceClient`, `useAppContext`).

### Per-surface notes

- **Context Panel** subscribes to the Pages page-context channel (`client.query('pages.context', { subscribe: true, ... })` — Path A). The matcher key is `pageInfo.route` — the clean published path — not `pageInfo.url` which carries the `?sc_site=…` query string. This was closed by inspection during Tranche 2 capture; see ADR-0005 and the `reference_*` capture in `tests/fixtures/graphql/page-context.json`.

- **Dashboard Widget** has no SDK-surfaced "current site" today. The `ApplicationContext` is tenant-scoped only — `resourceAccess[0].tenantId` and `tenantDisplayName` are identical between embeds on different site dashboards. The widget falls back to a site picker (operator's last choice persisted in `localStorage`), with a host-frame `document.referrer` scan as a best-effort auto-detect.

- **Full Page** is the power-user surface. Two-pane layout above 960 px (collection/site picker on the left, redirect-map list and detail on the right); tabbed fallback below. The redirect-map list uses `react-virtuoso` for virtualization — ADR-0012 documents the choice.

## 3. Data flow

### Reads

Reads use a single typed wrapper family under [`site/lib/sdk/`](../site/lib/sdk/). The wrappers are the only modules in the app allowed to import `@sitecore-marketplace-sdk/*` — this boundary is enforced by a structural test in `tests/structural/`. Every component and domain module talks to the SDK through this layer.

- `sites.ts` — `listSites`, `listCollections` via `xmc.sites.*`
- `redirects-read.ts` — `listRedirectMaps(sitePath)` via `xmc.authoring.graphql` using **aliased field accessors** (`field(name:)`) rather than the `fields(...)` connection. The aliased pattern ships ~75% smaller responses for known-set field reads.
- `page-context.ts` — `subscribePageContext` (Path A subscribe-via-query)
- `application-context.ts` — selectors over the pre-resolved `ApplicationContext` (delegates to `requireContextId`)
- `redirects-discover.ts` — runtime discovery of the parent `Settings/Redirects` folder GUID and the Redirect Map template GUID (the template GUID is per-tenant)

Boolean fields on the read surface deserialize as `'1'` / `''` strings, not native booleans. The `__Updated` field uses Sitecore compact format `yyyyMMddTHHmmssZ`, not ISO-8601 — `lib/domain/sitecore-date.ts` parses both.

### Writes

Writes go through `redirects-write.ts` with three Authoring GraphQL mutations:

- `createRedirectMap` — `createItem` mutation. **Does not accept a caller-supplied `id`**; the schema rejects it. ADR-0009 closes the cross-environment promotion question definitively: imports create fresh GUIDs on the target.
- `updateRedirectMap` — `updateItem` mutation. Field updates only; `name` is not a valid field on `UpdateItemInput`.
- `renameRedirectMap` — dedicated `renameItem` mutation (separate from `updateItem`).
- `deleteRedirectMap` — `deleteItem` mutation with `{ successful }` selection.

The Marketplace SDK envelope for `xmc.authoring.graphql` mutations is non-obvious: the GraphQL body lives **inside** `params`, not at the top level of the mutate call, and the response double-unwraps to `result.data.data` (not single). This was discovered during Tranche 2 capture and documented inline in the wrappers. The `RedirectType` wire enum is `ServerTransfer` / `Redirect301` / `Redirect302` — `Redirect307` is rejected by the head-app resolver, so it's removed from the UI. Boolean fields serialize as `'0'` / `'1'` strings on writes.

### The `UrlMapping` encoding contract

The `UrlMapping` field on a Redirect Map item is a single URL-encoded string of `source=target` pairs joined by `&`. Example: `%2ftest=%2FnewTest&%2fhello=%2Fworld` decodes to two mappings (`/test` → `/newTest`, `/hello` → `/world`).

`lib/url-mapping/{parse,serialize}.ts` round-trips this format losslessly and order-preservingly. The contract is locked in ADR-0008 and enforced via `fast-check` property-based tests — three invariants × 100 iterations each. Sources and targets containing literal `=` or `&` must be `%3D`/`%26`-encoded before serialization; case differences in URL-encoded characters (`%2f` vs `%2F`) are preserved verbatim.

## 4. Domain layer

Pure modules under `site/lib/`, independent of the SDK:

- `domain/types.ts` — `RedirectMapItem`, `RedirectMapping`, `RedirectType` union
- `domain/sitecore-date.ts` — `parseSitecoreCompactDate` handles both compact (`yyyyMMddTHHmmssZ`) and ISO-8601 formats
- `url-mapping/` — parse / serialize with property-based test coverage
- `import-export/` — Zod v4 schema (`redirect-manager/v1`), GUID-keyed diff classifier, batch applier, scalar + mappings diff helpers for the drill-down UI, exporter
- `match/` — exact-string Context Panel matcher per ADR-0005
- `redirects/` — `redirect-type-enum.ts` derived from real-tenant introspection

## 5. Component layout

```
components/
├── context-panel/    ContextPanel, RegexBanner, MatchedMapGroup, InlineEditForm,
│                     AddRedirectModal, EditMapSettingsModal
├── dashboard-widget/ DashboardWidget, StatTile
├── full-page/        FullPage (orchestrator), CollectionPicker, SitePicker,
│                     RedirectMapList (virtuoso), RedirectMapDetail (editable),
│                     TopActionRow, NewRedirectMapModal, DeleteMapConfirmModal,
│                     ImportRedirectMapModal (4-step wizard)
├── providers/        marketplace.tsx (ClientSDK init, AppContext + Client hooks)
├── theme-provider.tsx
├── theme-switcher.tsx (env-gated 3-state Light/Dark/System, 'd' hotkey)
└── ui/               Blok primitives (Button, Badge, Select, Skeleton, …)
```

All UI surfaces use **Blok primitives** via the shadcn registry. Blok's Nova preset uses `.dark` class only (no `@media (prefers-color-scheme: dark)` block); the app overrides `--primary-foreground` in `globals.css` to fix the white-on-lavender contrast bug that Blok ships by default. A structural test enforces the override is present.

Toasts are global via Sonner (`<Toaster />` mounted in `app/layout.tsx`). All write operations check `result.ok` and surface failures through the friendly error UX — short banner with an expandable "Show technical details" section containing the verbatim GraphQL error.

## 6. State coverage

Every surface implements all six states from the v1 UI design: **default, loading, empty, error, focus, success-toast**. The state matrix is captured per surface in [`../project-planning/ui-design/ui-design-20260509T191751Z-v1.md`](../project-planning/ui-design/ui-design-20260509T191751Z-v1.md). Accessibility is WCAG 2.1 AA — `role=status` aria-live regions on each surface, `:focus-visible` everywhere, no `outline: none` without paired focus styles (a structural test enforces this).

## 7. Import / export semantics

JSON import / export uses a **versioned schema (`redirect-manager/v1`)** keyed by **Sitecore item GUID** so rule sets can be promoted between environments. The shape is documented in PRD-000 § 10 and validated by a Zod v4 schema.

The import wizard has four steps:

1. **Upload** — file picker + textarea paste fallback. Schema is validated up-front; malformed input never reaches mutation execution.
2. **Preview** — classification table (new / conflicting) with per-row action select and a collapsible drill-down showing scalar diffs and mappings buckets (added / removed / changed). Per ADR-0006, the three actions are **create / overwrite / skip** — no merge action.
3. **Applying** — progress bar; mutations execute sequentially with per-item failure capture.
4. **Summary** — totals + per-item outcomes, with a "newly-minted GUID" warning per ADR-0009 for `create` actions on cross-environment promotion.

There is no transactional rollback across the batch — partial commits are acceptable per PRD-000 § FR-10. The summary surfaces every per-item outcome so the operator can act.

## 8. Testing strategy

- **Vitest + jsdom** for component and integration tests.
- **`fast-check`** for property-based testing of `UrlMapping` parse / serialize.
- **Typed mock client** patterns from the `sitecore:marketplace-sdk-client` skill — typed Vitest stubs over `ClientSDK`.
- **Real-tenant captured fixtures** under `site/tests/fixtures/graphql/` — every SDK-touching test uses a real capture, never paraphrased prose. ADR-0013 documents the progressive capture-and-fix workflow that replaced the original hard-gate model.
- **Structural tests** under `site/tests/structural/`: SDK boundary lock, three-extension-routes assertion, dark-mode `--primary-foreground` override, no raw-HTML React injection on user data, no `outline: none` without paired focus styles.

Smoke validation against a real tenant is **manual and operator-driven**. Five checklists under [`../site/docs/`](../site/docs/) cover registration, CRUD round-trip, import/export round-trip, host-frame visual smoke, and a 5-minute live walkthrough. Outcomes flow into the run manifest's `smoke_outcomes` and gate `/ship` status (`shipped` vs `shipped_with_caveats`).

## 9. Known limitations and forward seams

PRD-000 is intentionally narrow. The architecture leaves these seams open:

- **`en` only.** All Authoring GraphQL queries pass `language: "en"`. Multilingual CRUD adds language enumeration + per-item version indicators + "create version" prompts; the read query and write mutations parameterize `language` cleanly. [ADR-0010]
- **Exact-string Context Panel matching.** The matcher in `lib/match/` is one function. Regex matching adds a second pathway behind the same group-by-Redirect-Map UI. [ADR-0005]
- **No usage analytics.** Adding Upstash counters means a second SDK wrapper family and a head-app instrumentation contract — neither exists in MVP.
- **No concurrent-edit detection.** Writes do not check freshness tokens. Last writer wins.
- **No bulk operations.** Each mutation is per-item, sequential.

Each of these is captured as a PRD-000 § 15 Future Opportunity. The decision log at [`decisions.md`](decisions.md) maps them back to the ADRs that locked the trade-off.

## 10. References

- **PRD-000:** [`../project-planning/PRD/prd-000.md`](../project-planning/PRD/prd-000.md)
- **Architecture blueprint (planning artifact):** [`../project-planning/architecture/architecture-20260509T191751Z.md`](../project-planning/architecture/architecture-20260509T191751Z.md)
- **ADRs:** [`../project-planning/ADR/`](../project-planning/ADR/)
- **UI design v1 (selected):** [`../project-planning/ui-design/ui-design-20260509T191751Z-v1.md`](../project-planning/ui-design/ui-design-20260509T191751Z-v1.md)
- **POC clickdummy:** [`../pocs/poc-v1/`](../pocs/poc-v1/)
- **Setup skill (rebuild reference):** `sitecore:setup-marketplace-client-side`
- **Lifecycle skill:** `sitecore:marketplace-sdk-lifecycle`
- **Host-frame testing skill:** `sitecore:marketplace-sdk-host-frame-testing`

---

## 11. V4 redesign architecture (PRD-002)

PRD-002 is a **pure presentation-layer redesign** of the three extension-point routes. Zero new SDK calls, zero new GraphQL mutations, zero new GraphQL fields, zero Cloud Portal re-registration. The functional contract is preserved 1:1 from PRD-000.

See **[PRD-002](../project-planning/PRD/prd-002.md)** for the full product scope, and **[ADR-0024 through ADR-0030](../project-planning/ADR/)** for the governing design decisions.

### 11.1 CSS architecture — 3 modules

Three new CSS files layer on top of the PRD-000 `globals.css` baseline:

| File | Scope | Key contents |
|------|-------|-------------|
| `site/styles/elevated.css` | Site-wide | 15 `--v4-*` design-contract variables (R-13 mitigation); `.elev-glass-surface`, `.elev-card`, `.elev-hover-lift`, `.elev-hero-text`, `.elev-btn`, `[data-letter-reveal]` utilities; `@supports not (backdrop-filter)` fallback; blanket `@media (prefers-reduced-motion: reduce)` guard |
| `site/styles/elevated-plumes.css` | Full Page only (ADR-0027) | `.fp-plume-backdrop` with `@keyframes fp-backdrop-drift` (28s loop); `@keyframes fp-letter-reveal-up` (kinetic letter stagger); all `@keyframes` paired with `animation: none` reduced-motion gates |
| `site/styles/surfaces.css` | All 3 surfaces | Per-surface layout shells (`.fp-*`, `.cp-*`, `.dw-*`), frosted topbar, stat strip, modal overlay, all with reduced-motion gates on hover-lift transitions |

All three files compose Blok semantic tokens exclusively — zero `#` hex literals (enforced by structural guard T040). Import order: `globals.css` → `elevated.css` → `surfaces.css` (root layout); `elevated-plumes.css` imported ONLY by Full Page route files (structural guard T044).

**15 design-contract variables (R-13 mitigation):** `--v4-plume-duration`, `--v4-plume-easing`, `--v4-glass-blur`, `--v4-glass-saturation`, `--v4-glass-alpha`, `--v4-hover-lift-distance`, `--v4-hover-lift-scale`, `--v4-hover-glow-tint`, `--v4-hover-glow-blur`, `--v4-hero-clamp-min`, `--v4-hero-clamp-max`, `--v4-hero-clamp-vw`, `--v4-letter-reveal-stagger`, `--v4-letter-reveal-total`, `--v4-count-up-duration`, `--v4-premium-ease`. Single source of truth for all V4 tunable values; every component reads from these variables.

### 11.2 Mock-data architecture (ADR-0025)

All speculative UI content (hero stats, sparklines, top-destinations, "all healthy" badge, "by Anna" attribution, stat strip) ships as hardcoded TypeScript constants at `site/lib/mocks/preview-data.ts`. This module exports:

- `PREVIEW_DATA_ACTIVE` — `{ fullPage: true, dashboardWidget: true, contextPanel: false }` flags. When a follow-on data-plumbing PRD wires real data, flipping these flags is the only change needed.
- `PREVIEW_DATA` — typed constants matching the eventual real-data shapes. Consumers swap the data source without changing types.

The `PreviewDataBanner` component (`site/components/ui/preview-data-banner.tsx`) reads `PREVIEW_DATA_ACTIVE[surface]` and renders only when the flag is true. Structural guard T042 enforces that any file containing `data-preview-mock="true"` also imports `<PreviewDataBanner`, and vice versa — pairing can never drift.

### 11.3 Context Panel interaction-pattern change (ADR-0026)

The `AddRedirectModal` component was deleted (ADR-0028 Option A). It is replaced by `QuickRedirectForm` — an always-visible inline form that implements a 3-state machine:

1. **add-to-existing** — user selects a redirect map from the multi-match dropdown (ADR-0029); source is inherited from the current page context; user fills target.
2. **create-new** — no existing maps, or user explicitly chooses "Create new"; auto-generates map name as `{pageSlug}-redirects`.
3. **submitting** — disabled state with loading indicator while the SDK write executes.

No modal trigger button exists in the PRD-002 Context Panel. The QuickRedirectForm is the primary CRUD path. The `EditMapSettingsModal` (map-level metadata: name / type / flags) is retained as the only remaining modal on the Context Panel.

### 11.4 Reduced-motion strategy

PRD-002 ships a layered reduced-motion strategy:

1. **Per-`@keyframes` gates** (strongest): `elevated-plumes.css` sets `animation: none` on both `fp-backdrop-drift` and `fp-letter-reveal-up` selectors inside `@media (prefers-reduced-motion: reduce)`. This is the primary gate — no animation fires at all.
2. **JS hook early-returns**: `useCountUp` and `useLetterReveal` both check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` inside `useEffect` (never in render body — hydration-safety rule). When true, they deliver the final value immediately via a single `requestAnimationFrame` frame without any multi-frame animation.
3. **Per-class transition gates** (`elevated.css`, `surfaces.css`): all transition-bearing utility classes (`.elev-card`, `.elev-hover-lift`, `.elev-btn`, `.fp-stat`, `.lr-row`, `.dw-tile`, `.dw-row__bar-fill`, `.cp-item`) have explicit `@media (prefers-reduced-motion: reduce)` blocks setting `transform: none; transition: none`.
4. **Blanket defensive guard** (`elevated.css` bottom): `* { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }` under reduced-motion. Note: this uses `0.001ms` (near-zero) rather than `animation: none` — it is a defensive backstop, not the primary gate. Any animation that escapes layers 1–3 will effectively not be perceived, though technically it does fire one frame.

Structural guard T041 enforces that every CSS file containing `@keyframes` also contains `@media (prefers-reduced-motion: reduce)`.

### 11.5 Mixed motion budget (ADR-0027)

Full motion (drifting plumes, gradient text, kinetic letter-reveals, count-up animations) is scoped exclusively to the Full Page surface. Context Panel and Dashboard Widget use **hover lifts only** — no plume backdrop, no kinetic reveals. This is enforced at two levels: structural guard T044 (plume CSS import boundary) prevents `elevated-plumes.css` from reaching the other routes, and the component compositions in Context Panel / Dashboard Widget do not use `useLetterReveal`.

### 11.6 Theme system (carry from PRD-000)

The Blok Nova preset and the `globals.css` override for `--primary-foreground` in dark mode are unchanged. All PRD-002 color expressions compose token variables (`var(--primary)`, `var(--info)`, `var(--success)`, etc.) via `color-mix(in oklch, ...)`, ensuring light/dark switching happens automatically via Blok's token recomposition. No static hex colors were introduced (structural guard T040 enforces).

### 11.7 Component layout changes (PRD-002)

The component tree additions are summarized in the PRD-002 task breakdown § 1 file-level table. Key changes:

- **Added:** `WorkspaceHero`, `StatStrip`, `PreviewDataBanner`, `GradientText`, `DecorativeCta`, `useCountUp`, `useLetterReveal`, `ContextPanelHero`, `QuickRedirectForm`, `MultiMatchDropdown`, `DashboardHero`, `Sparkline`, `TopDestinations`, `RecentlyShipped`, `HealthBadge`
- **Deleted:** `AddRedirectModal` (per ADR-0028)
- **Modified:** all three surface shells + supporting components re-skinned with V4 chrome; CRUD modals re-skinned with frosted dialog shell

The `components/ui/` tree docs at § 5 is updated: `AddRedirectModal` is no longer listed.

### 11.8 Governing ADRs (PRD-002 specific)

| ADR | Decision |
|-----|----------|
| [ADR-0024](../project-planning/ADR/adr-0024-v4-blok-elevated-visual-base.md) | V4 Blok Elevated as the visual base; relaxed D1 guard (token discipline, not strict Blok primitive coverage) |
| [ADR-0025](../project-planning/ADR/adr-0025-mock-data-architecture.md) | `PREVIEW_DATA` constants + `PREVIEW_DATA_ACTIVE` flags + per-surface banner as the mock-data architecture |
| [ADR-0026](../project-planning/ADR/adr-0026-context-panel-inline-quick-add.md) | Inline `QuickRedirectForm` replaces `AddRedirectModal` as the primary Context Panel add-redirect path (US-R5) |
| [ADR-0027](../project-planning/ADR/adr-0027-mixed-motion-budget.md) | Full motion on Full Page only; Context Panel + Dashboard Widget: hover lifts only |
| [ADR-0028](../project-planning/ADR/adr-0028-add-redirect-modal-deletion.md) | `AddRedirectModal.tsx` deleted (Option A — no fallback retained) |
| [ADR-0029](../project-planning/ADR/adr-0029-quick-redirect-form-map-selection.md) | Multi-match dropdown in `QuickRedirectForm`; map's `RedirectType` sets the form's type (operator cannot override per-mapping) |
| [ADR-0030](../project-planning/ADR/adr-0030-hero-ctas-decorative.md) | Full Page hero CTAs ("View activity", "Publish all") are decorative — fire toast on click; no real navigation (follow-on PRD wires them) |

Carry-over ADRs from PRD-000 remain in force: ADR-0002, 0003, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0012, 0013.
