# Decisions

The decision log for Redirect Manager. Each ADR is a single decision with full context — this page summarizes them for quick lookup. Click an ADR number for the detailed rationale, consequences, and alternatives considered.

Grouping below is by theme, not by date. For the chronological sequence see the filenames under [`../project-planning/ADR/`](../project-planning/ADR/).

| Status legend |
|---|
| ✅ Accepted — in force |
| 🧭 Process — governs how we work, not what we build |

## Sitecore platform

| # | Title | Status | One-line rationale |
|---|---|:--:|---|
| [ADR-0002](../project-planning/ADR/adr-0002-marketplace-sdk-mode-a-scaffold.md) | Marketplace SDK Mode A scaffold | ✅ | Client-side iframe app — every Sitecore call rides the operator's Cloud Portal session via the SDK postMessage bridge; no server-side OAuth proxy. |
| [ADR-0003](../project-planning/ADR/adr-0003-authoring-graphql-as-canonical-source.md) | Authoring GraphQL as single canonical source | ✅ | All redirect reads and writes go through `xmc.authoring.graphql`. No KV cache, no parallel datastore, no analytics layer in MVP. |
| [ADR-0007](../project-planning/ADR/adr-0007-tenant-identifier-tenantid.md) | `tenantId` as cross-environment identifier | ✅ | Use `resourceAccess[0].tenantId` from the `ApplicationContext` (not `contextId`) — `tenantId` is the stable cross-environment key for PRD-001+ analytics keying. |
| [ADR-0011](../project-planning/ADR/adr-0011-extension-points-and-routes.md) | Extension-point IDs, route URLs, and root-route policy | ✅ | `xmc:pages:contextpanel` → `/context-panel`, `xmc:dashboardblocks` → `/dashboard-widget`, `xmc:fullscreen` → `/full-page`. Root `/` returns `notFound()`. |
| [ADR-0013](../project-planning/ADR/adr-0013-real-tenant-fixture-capture-workflow.md) | Real-tenant fixture-capture workflow | 🧭 | Progressive capture-and-fix during implementation (not a hard pre-task-breakdown gate) — proceed with assumed shapes sourced from skills + sibling apps, capture when surfaced. |

## Domain — redirects, mapping, import/export

| # | Title | Status | One-line rationale |
|---|---|:--:|---|
| [ADR-0005](../project-planning/ADR/adr-0005-context-panel-exact-match-only.md) | Context Panel exact-string matching only | ✅ | MVP matcher is exact source/target equality. Regex source rows skipped; non-dismissible banner makes the limitation visible to operators. |
| [ADR-0006](../project-planning/ADR/adr-0006-import-conflict-resolution-three-actions.md) | Import conflict resolution — three actions | ✅ | Per-item action picker with **create / overwrite / skip**. No merge action (collapsed into overwrite during PM critical review). |
| [ADR-0008](../project-planning/ADR/adr-0008-urlmapping-encoding-contract.md) | `UrlMapping` field encoding contract | ✅ | URL-encoded `source=target` pairs joined by `&`. Round-trip parse/serialize is lossless and order-preserving; enforced via `fast-check` property tests. |
| [ADR-0009](../project-planning/ADR/adr-0009-import-match-by-item-guid.md) | Import matching by Sitecore item GUID | ✅ | Cross-environment imports key on item GUID, not item name. Note: `createItem` does not accept caller-supplied `id`; cross-tenant `create` actions mint fresh GUIDs on the target. |
| [ADR-0010](../project-planning/ADR/adr-0010-mvp-language-scope-en-only.md) | MVP language scope = `en` only | ✅ | All Authoring queries / mutations pass `language: "en"`. Multilingual CRUD deferred to PRD-001 along clean parametric seams. |

## Phasing

| # | Title | Status | One-line rationale |
|---|---|:--:|---|
| [ADR-0004](../project-planning/ADR/adr-0004-three-prd-phasing.md) | Three-PRD phasing | ✅ | PRD-000 ships pure Sitecore CRUD (en-only); PRD-001 adds multilingual + analytics (Upstash + head-app instrumentation); PRD-002 adds sync-back with template change. |

## Frontend

| # | Title | Status | One-line rationale |
|---|---|:--:|---|
| [ADR-0012](../project-planning/ADR/adr-0012-list-virtualization-react-virtuoso.md) | List virtualization — `react-virtuoso` | ✅ | Virtualization library for the redirect-map list on the Full Page. Chosen for Blok compatibility and accessibility characteristics. |

## Process / framework

| # | Title | Status | One-line rationale |
|---|---|:--:|---|
| [ADR-0001](../project-planning/ADR/adr-0001-use-adrs-as-architecture-backbone.md) | Use ADRs as the architecture backbone | 🧭 | One decision per ADR, numbered, immutable once accepted. ADRs are the source of truth for "why"; this page is the index. |

## Notable findings recorded inline in source

These are not ADRs (they're SDK-shape findings discovered during real-tenant capture) but they have the same authority. They live in code comments and the captured fixtures under `site/tests/fixtures/graphql/`, and are summarized here so reviewers don't have to grep:

- **Marketplace SDK envelope for `xmc.authoring.graphql` mutations.** The GraphQL body must sit **inside** the `params` object, not at the top level of the `mutate` call. Wrong shape returns HTTP 400 with an empty body. Two sibling apps had this wrong; the correct shape was captured in Tranche 2 and pushed back to the `sitecore:marketplace-sdk-client` and `sitecore:marketplace-sdk-xmc` skill docs.
- **Mutation response shape is a double-unwrap.** `result.data.data` — not single `.data`. Earlier sibling apps had this wrong too.
- **Pages `pageInfo.route` is the Context Panel matcher key**, not `pageInfo.url`. `pageInfo.url` carries the `?sc_site=…` query string; `pageInfo.route` is the clean published path.
- **Authoring `createItem` rejects a caller-supplied `id` field.** Schema introspection confirms it isn't defined on `CreateItemInput`. This closes ADR-0009 with a definitive NO: cross-environment imports always mint a fresh GUID on `create` actions; the import summary must surface this per item.
- **`RedirectType` wire enum is `ServerTransfer` / `Redirect301` / `Redirect302`.** `Redirect307` is rejected by the head-app resolver — removed from the UI picker.
- **Boolean fields serialize as `'0'` / `'1'`** on writes (wire also accepts `'true'`/`'false'` but `'0'`/`'1'` is what we ship). Read surface deserializes to `'1'` / `''` strings, not native booleans.
- **`__Updated` field uses Sitecore compact format `yyyyMMddTHHmmssZ`**, not ISO-8601.
- **Aliased `field(name:)` accessors are ~75% smaller** than the `fields(...)` connection for known-set field reads. Used everywhere we know the field set up-front.
- **Rename requires the dedicated `renameItem` mutation.** `updateItem` does not accept `name` as a field on `UpdateItemInput`.
- **The Marketplace SDK `ApplicationContext` is tenant-scoped, not site-scoped.** Embedding the Dashboard Widget on different site dashboards yields identical `ApplicationContext` snapshots — there is no per-site signal from the SDK. The widget falls back to a site picker.

These findings are stable as of 2026-05-12 and will be revisited if SDK behavior changes.

---

## PRD-002 V4-aligned redesign (2026-05-15)

PRD-002 shipped a V4 Blok Elevated visual redesign of all three extension-point routes. Zero new SDK calls, zero new GraphQL mutations, zero new backend — purely presentation-layer changes plus one client-side interaction-pattern replacement (modal → inline form). The governing ADRs are ADR-0024 through ADR-0030.

### Design decisions shipped

**D1 — V4 Blok Elevated as the visual base (ADR-0024).** The four-variant marketing exploration (V1 Aurora / V2 Brutalism / V3 Editorial / V4 Blok Elevated) selected V4 as the shipping target — premium feel within the existing Blok Nova token system. Token discipline is enforced: all color/gradient/shadow expressions compose Blok semantic tokens via `color-mix(in oklch, ...)`. Zero `#` hex literals outside `globals.css` (structural guard T040). Operator-facing content reconciliation: `Active`/`Draft` labels dropped (structural guard T043), `Redirect307` not in enum, `/de/...` paths not in mocks, language-count strings banned.

**D2 — Mock-data architecture (ADR-0025).** Speculative V4 content (hero stats, sparklines, top-destinations, "all healthy" badge, "by Anna" attribution, stat strips) ships as TypeScript constants at `site/lib/mocks/preview-data.ts` with `PREVIEW_DATA_ACTIVE` per-surface flags. A `PreviewDataBanner` component renders on Full Page and Dashboard Widget surfaces (not Context Panel, which uses real data only). When a follow-on data-plumbing PRD wires real data, flipping `PREVIEW_DATA_ACTIVE.fullPage` and `.dashboardWidget` to `false` is the only change needed — consumers swap data source, not types.

**D3 — Inline QuickRedirectForm replaces AddRedirectModal (ADR-0026, ADR-0028, ADR-0029).** The `AddRedirectModal` component was deleted entirely (Option A — no fallback retained). The primary add-redirect path in the Context Panel is now an always-visible `QuickRedirectForm` implementing a 3-state machine: `add-to-existing` / `create-new` / `submitting`. Map selection via a multi-match dropdown when the page appears in multiple Redirect Maps. The map's `RedirectType` sets the form type — operator cannot set per-mapping type (consistent with PRD-000's map-level type model per ADR-0029). Auto-generated map name on `create-new` path: `{pageSlug}-redirects`.

**D4 — Mixed motion budget (ADR-0027).** Full V4 motion (drifting plumes, gradient text, kinetic letter-reveals, count-up animations) is scoped to the Full Page surface only. Context Panel and Dashboard Widget use hover lifts only. Structural guard T044 enforces the plume-CSS import boundary at CI time. Reduced-motion strategy uses three defensive layers: per-`@keyframes` `animation: none` gates, JS hook early-returns (`useCountUp`, `useLetterReveal` both check `matchMedia` inside `useEffect`), and per-class transition suppression.

**D5 — Hero CTAs are decorative (ADR-0030).** The Full Page workspace hero CTAs ("View activity", "Publish all") fire a Sonner toast on click. They are visual elements anticipating a follow-on PRD that wires real navigation. Rationale: shipping functional-looking CTAs that do nothing silently is worse than CTAs that acknowledge their preview status via a toast.

**D6 — Hybrid voice — 3 zones.** Marketing-grade copy on: (a) Full Page workspace hero, (b) Dashboard Widget headline, (c) Context Panel hero count header. Utility-tool voice everywhere else (modal titles, form fields, table content, footer text). Keeps the product feeling purposeful without over-marketing a CRUD tool.

### PRD-002 ADR index

| ADR | Title | Status |
|-----|-------|:------:|
| [ADR-0024](../project-planning/ADR/adr-0024-v4-blok-elevated-visual-base.md) | V4 Blok Elevated visual base + relaxed D1 guard | ✅ |
| [ADR-0025](../project-planning/ADR/adr-0025-mock-data-architecture.md) | Mock-data architecture: PREVIEW_DATA constants + flags + banner | ✅ |
| [ADR-0026](../project-planning/ADR/adr-0026-context-panel-inline-quick-add.md) | Context Panel inline quick-add replaces modal (US-R5) | ✅ |
| [ADR-0027](../project-planning/ADR/adr-0027-mixed-motion-budget.md) | Mixed motion budget — Full Page only gets full motion | ✅ |
| [ADR-0028](../project-planning/ADR/adr-0028-add-redirect-modal-deletion.md) | AddRedirectModal deleted (Option A — no fallback) | ✅ |
| [ADR-0029](../project-planning/ADR/adr-0029-quick-redirect-form-map-selection.md) | QuickRedirectForm map-selection + RedirectType semantics | ✅ |
| [ADR-0030](../project-planning/ADR/adr-0030-hero-ctas-decorative.md) | Full Page hero CTAs decorative — toast on click | ✅ |

For the full architecture narrative covering PRD-002 changes, see [architecture.md § 11](architecture.md#11-v4-redesign-architecture-prd-002).

## PRD-001 Tranche 1 captures (real-tenant probes, 2026-05-13)

PRD-001 (app-internal multilingual CRUD) was cancelled at the Tranche 1 capture pass — see [ADR-0023](../project-planning/ADR/adr-0023-cancel-prd-001-multilingual-template-shared.md). These findings survive the cancellation; they are durable SDK-level knowledge about the Authoring GraphQL surface and the stock Sitecore Redirect Map template.

- **`addItemVersion` mutation exists** in the Authoring schema and accepts `{ itemId: ID!, language: String! }` as input. Response shape: `{ addItemVersion: { item: { itemId, language: { name }, version } } }`. **Note: `item.language` is an object `{ name }`, not a string.** Version returned as a number. Verified against `CHAH DevEx Journey / PROD` on 2026-05-13.
- **`deleteItemVersion` mutation exists**. Payload type is `DeleteItemVersionPayload`; the field `successful` does NOT exist on it (an earlier guess was wrong). Minimal probe shape: `{ deleteItemVersion(input: { itemId, language }) { __typename } }`. Introspection via `__type(name: "DeleteItemVersionPayload")` reveals the real payload subfields. Verb confirmed; full payload shape capture deferred (PRD-001 cancelled before re-run).
- **`__Display name` field write accepts the literal name `"__Display name"`** in `updateItem(input: { ..., fields: [{ name: "__Display name", value: ... }] })`. No need to fall back to the templateFieldId GUID for writes. Response field uses the alias `Display_Name` when the read query aliases `field(name: "__Display name")`.
- **`Item.versions(allLanguages: true)` returns all language versions in a single round trip** — ~410ms against PROD for an item with 2 language versions. Well under the 2s threshold that would have triggered designing a lighter summary query.
- **Field-versioning matrix on the stock Redirect Map template (PROD).** The killer finding — drove PRD-001 cancellation:

  | Field | `versioning` |
  |---|---|
  | `UrlMapping` (the redirect rules) | `SHARED` |
  | `RedirectType` | `SHARED` |
  | `IncludeVirtualFolder` | `SHARED` |
  | `PreserveQueryString` | `SHARED` |
  | `PreserveLanguage` | `SHARED` |
  | `__Display name` | `UNVERSIONED` |

  **`UrlMapping` SHARED means redirect rules are stored once per item with no language axis.** Creating a `de-DE` language version is mechanically possible (`addItemVersion` works), but every language version of the item returns the same `UrlMapping` content. Empirically confirmed by `Item.versions(allLanguages: true)` returning byte-identical `UrlMapping` values across `en` and `de-DE` versions of `My Redirect Map 2`.

  Sitecore versioning semantics for reference:
  - `SHARED` — one value for the entire item, no language or version axis.
  - `UNVERSIONED` — per-language, but shared across numbered versions within a language.
  - `VERSIONED` — per-language AND per-version.

- **`__Display name` is UNVERSIONED** — different per language but shared across versions within a language. Real per-language axis exists for the display label only.
- **Sitecore versioning conventions on standard fields** (captured incidentally during A4): most `__*`-prefixed standard fields are `SHARED`. Notable exceptions: `__Source` (VERSIONED), `__Final Renderings` (VERSIONED), `__Hide version` (VERSIONED), `__Valid from` / `__Valid to` (VERSIONED), `__Display name` / `__Long description` / `__Short description` (UNVERSIONED). Useful reference for future PRDs that interact with these fields.

**Implication for any future multilingual work:** the stock Redirect Map template cannot support per-language redirect rules without a template-level change. A real multilingual story for Redirect Manager would need to bundle a Sitecore template modification (`UrlMapping` → VERSIONED, or a new versioned field) with a head-app resolver change to honor per-language `UrlMapping` content at runtime, plus the app-side UI. No clean phase split is possible; all three changes must ship together. See ADR-0023 for the full rationale.
