# Architecture Baseline — redirect-manager

---
document_type: architecture_baseline
artifact_name: baseline.md
generated_at: 2026-05-22T13:45:00Z
run_manifest: project-planning/workflow/run-20260522T114800Z.json
promoted_from:
  - project-planning/ADR/adr-0002-marketplace-sdk-mode-a-scaffold.md
  - project-planning/ADR/adr-0003-authoring-graphql-as-canonical-source.md
  - project-planning/ADR/adr-0005-context-panel-exact-match-only.md
  - project-planning/ADR/adr-0006-import-conflict-resolution-three-actions.md
  - project-planning/ADR/adr-0007-tenant-identifier-tenantid.md
  - project-planning/ADR/adr-0008-urlmapping-encoding-contract.md
  - project-planning/ADR/adr-0009-import-match-by-item-guid.md
  - project-planning/ADR/adr-0010-mvp-language-scope-en-only.md
  - project-planning/ADR/adr-0011-extension-points-and-routes.md
  - project-planning/ADR/adr-0012-list-virtualization-react-virtuoso.md
  - project-planning/ADR/adr-0013-real-tenant-fixture-capture-workflow.md
  - project-planning/ADR/adr-0023-cancel-prd-001-multilingual-template-shared.md
  - project-planning/ADR/adr-0024-v4-blok-elevated-visual-base.md
  - project-planning/ADR/adr-0025-mock-data-architecture-preview-banner.md
  - project-planning/ADR/adr-0026-context-panel-inline-quick-add-replaces-modal.md
  - project-planning/ADR/adr-0027-mixed-motion-budget-across-surfaces.md
  - project-planning/ADR/adr-0028-context-panel-option-a-modal-removed.md
  - project-planning/ADR/adr-0029-quickredirectform-map-selection-and-redirecttype-semantics.md
  - project-planning/ADR/adr-0030-full-page-hero-ctas-decorative.md
  - project-planning/ADR/adr-0031-publish-surface-decided-at-tranche-1.md
  - project-planning/ADR/adr-0033-publish-service-module-contract.md
  - project-planning/ADR/adr-0034-publish-surface-branch-resolution.md
  - project-planning/ADR/adr-0035-server-side-oauth-proxy-for-publishing.md
  - project-planning/ADR/adr-0036-per-map-publish-removed.md
  - project-planning/ADR/adr-0037-publish-job-polling-and-resume.md
  - project-planning/ADR/adr-0038-simulator-verbatim-upstream-parity.md
  - project-planning/ADR/adr-0039-regex-safety-dual-cap-not-worker.md
  - project-planning/ADR/adr-0040-mode-transient-ui-state-async-simulator.md
  - project-planning/ADR/adr-0041-test-surface-state-lifted-to-fullpage.md
  - project-planning/ADR/adr-0042-upstream-fixtures-generated-by-committed-ast-script.md
  - project-planning/ADR/adr-0043-edit-row-modal-replaces-inline-editing.md
consumed_by:
  - Software Architect (04) on subsequent /architect runs — references baseline.md sections, files only delta ADRs
  - Lead Developer (06) — populates task-breakdown § 4c-2 with delta ADRs only (baseline-bound decisions referenced by anchor)
  - Developer (08) — reads baseline.md in lieu of opening every inherited ADR
  - QA Specialist (07) — references baseline.md for inherited architectural constraints during test enrichment
generation: |
  Initial promotion at /architect's baseline-promotion gate (schema 7+, ≥5 ADRs threshold).
  Total 31 ADRs promoted from PRD-000 + PRD-002 + PRD-003 + PRD-004. PRD-005 ADRs
  (0044-0049) intentionally remain outside — too fresh to be foundational.
  Superseded ADRs (0004, 0014-0022, 0032) are not promoted per gate rules.
  Promoted ADRs are NOT deleted — they remain in project-planning/ADR/ as the source of truth.
---

## How to read this file

This is a consolidated summary of architectural decisions that survived multiple PRDs. Reading order:

1. The decisions below are the **inherited constitution** for this product. They apply to all subsequent PRDs unless an explicit ADR supersedes a baseline entry.
2. Each entry names the source ADR(s) — open them for full Context + Decision + Consequences when needed. The baseline is the entry point, not the full record.
3. New ADRs filed after promotion are **delta ADRs** — they add to or depart from the baseline. Task breakdowns' § 4c-2 lists only the delta ADRs and any baseline anchors a task touches.

## Promoted decisions

### App architecture + scaffold

- **Decision:** The product is a Sitecore Marketplace **client-side (Mode A)** app — every Sitecore read/write call rides the operator's authenticated Cloud Portal session. **Three Cloud Portal extension points** are exposed (Context Panel `xmc:pages:contextpanel` → `/context-panel`, Dashboard Widget `xmc:dashboardblocks` → `/dashboard-widget`, Full Page `xmc:fullscreen` → `/full-page`). PRD-003 added **one server-side Next.js API route** (`app/api/publish/route.ts`) as a narrow carve-out — OAuth client-credentials proxy to SitecoreAI Publishing v1; all other Sitecore calls remain Mode A.
- **Why it matters:** Every future PRD that touches a Sitecore surface inherits the Mode A scaffold; new SDK surfaces extend the existing `xmc.*` client rather than introducing a parallel auth path. Server-side routes are an exception requiring an explicit carve-out ADR.
- **Source ADRs:** ADR-0002 (Mode A scaffold), ADR-0011 (extension points + routes), ADR-0035 (server-side OAuth proxy carve-out from ADR-0002)

### Data layer + content model

- **Decision:** All redirect data flows through **Authoring GraphQL via `xmc.authoring.graphql`** — one canonical source for reads and writes. The `UrlMapping` Sitecore field is a URL-encoded string of `source=target` pairs; the app parses, edits, and re-serializes it losslessly. Items are scoped by **`tenantId`** for cross-environment correctness. JSON import/export uses a versioned schema keyed by **Sitecore item GUID** (not item name); cross-tenant imports always mint fresh GUIDs.
- **Why it matters:** Single canonical data path → no parallel-storage drift; GUID-based matching survives cross-tenant moves; the encoded `UrlMapping` field is the only contract with stock Sitecore Redirect Map items.
- **Source ADRs:** ADR-0003 (Authoring GraphQL canonical), ADR-0007 (tenantId), ADR-0008 (UrlMapping encoding), ADR-0009 (import match by GUID), ADR-0013 (real-tenant fixture-capture workflow)

### Language scope (multilingual cancelled)

- **Decision:** The MVP scope is **`en` content only**. PRD-001 attempted to add multilingual CRUD but was **cancelled at Tranche 1** after real-tenant probe revealed `UrlMapping` is a **SHARED** field on the stock Sitecore Redirect Map template (no language axis). Multilingual is permanently out of scope until/unless the template's field-versioning matrix changes.
- **Why it matters:** Future PRDs that touch redirects can assume one language version; multi-locale publishing (PRD-003) is byte-identical regardless of locale set; locale dropdowns are UI-only knobs, not content selectors.
- **Source ADRs:** ADR-0010 (en-only scope), ADR-0023 (PRD-001 cancellation rationale)

### UI framework + visual language (V4 Blok Elevated)

- **Decision:** All three extension-point routes use **V4 Blok Elevated** as the visual base — frosted-glass surfaces, gradient text, Geist Sans 700 at hero scales, token-composed gradients/shadows. Blok primitives (`@blok/*` registry slugs) are the component vocabulary; theme tokens come from the Blok registry, never hand-picked hex. **Motion budget is mixed** — full V4 motion on Full Page (plumes, count-ups, letter-reveals); quieter on Context Panel and Dashboard Widget; `prefers-reduced-motion: reduce` respected on all surfaces.
- **Why it matters:** Every new UI surface (e.g. PRD-005's drift banner) reuses these tokens; no surface invents its own visual language. The motion budget keeps high-motion confined to one surface.
- **Source ADRs:** ADR-0024 (V4 Blok Elevated visual base), ADR-0027 (mixed motion budget)

### Mock-data architecture

- **Decision:** Mocked data (when the design needs aspirational metrics that the data layer doesn't yet surface) lives in `site/lib/mocks/preview-data.ts` behind a `PREVIEW_DATA_ACTIVE` flag map. Per-surface "Preview Data" banners are mandatory anywhere a mocked metric renders; the banner copy names the follow-on release that wires real data.
- **Why it matters:** Operators never confuse mocked metrics for real data; the single canonical swap point makes the data-plumbing follow-on PRD cheap.
- **Source ADRs:** ADR-0025 (mock-data architecture + PREVIEW_DATA + banner)

### Context Panel patterns

- **Decision:** Context Panel matches redirects to the current page via **exact-string source/target equality only** (no regex / substring matching). The primary add-redirect path is the **inline `QuickRedirectForm`** (not a modal) — `AddRedirectModal` was removed entirely. Form state machine has three phases: no-match / single-match / multi-match (operator picks parent map when ambiguous); default RedirectType is determined by parent map's setting; auto-generated item name follows a stable pattern.
- **Why it matters:** Exact-match is the only contract the head-app proxy guarantees today; inline form is one click less than modal for the most common add path.
- **Source ADRs:** ADR-0005 (Context Panel exact-match), ADR-0026 (inline quick-add), ADR-0028 (AddRedirectModal removed), ADR-0029 (QuickRedirectForm map selection + RedirectType semantics)

### Full Page workspace patterns

- **Decision:** Full Page uses **list virtualization (`react-virtuoso`)** for Redirect Map lists to keep large inventories scrollable. Hero CTAs in the workspace banner are **decorative-by-default** unless a specific PRD wires them up (PRD-003 wired "Publish all" → "Publish Site"; "View activity" + "Validate health" remain decorative). Inline row editing in `RedirectMapDetail` is **replaced by `EditRowModal`** (PRD-004): clicking a row opens a focused modal containing only row-level fields (source, destination, mode toggle); map-level fields (RedirectType, IncludeVirtualFolder, PreserveQueryString, PreserveLanguage) stay in the map-settings UI. Test-surface state (`lastTrace`, `activeTab`) **lifts up to `FullPage`** so the Test→Manage deep-link can unmount `TestSurface` without losing trace state.
- **Why it matters:** Operators always know what's wired vs. decorative on the hero; row editing is single-surface (no inline + modal duplication); cross-tab deep-links work without state loss.
- **Source ADRs:** ADR-0012 (list virtualization), ADR-0030 (hero CTAs decorative), ADR-0043 (EditRowModal replaces inline editing), ADR-0041 (test-surface state lifted to FullPage)

### Import + export

- **Decision:** JSON import wizard uses **three actions per conflict** — Create (new GUID), Overwrite (existing item), Skip. Conflict resolution is per-item, not bulk. Schema is versioned (`redirect-manager/v1`).
- **Why it matters:** Conflicts are resolved deterministically per item; future schema changes can ride a new version (`v2`) without breaking back-compat.
- **Source ADRs:** ADR-0006 (import conflict resolution — three actions)

### Publish flow (PRD-003 lineage)

- **Decision:** Publishing is wired through a **server-side OAuth proxy route** (`app/api/publish/route.ts`) using SitecoreAI Publishing v1 — narrow carve-out from ADR-0002's Mode A scope (see "App architecture" above). The publish surface decision was deferred to Tranche 1 of PRD-003 and resolved as **Branch B (server-side OAuth proxy + SitecoreAI Publishing API)** over the alternative SDK wrapper path. Per-map "Publish" buttons were **removed** after real-tenant smoke revealed Sitecore silently no-ops Items publish for Redirect Map items (not Edge-published content); only **Site publish** updates redirect content on Edge. The publish service is a branch-agnostic module; the transport adapter (`callPublish`) is the only branch-specific seam. **Lightweight job tracking** = 3-second polling + cross-session resume (localStorage + name-prefix list scan over last 60 min). Stable Sonner toast id pattern (`publish-job-<jobId>`) so terminal toasts replace loading toasts in-place.
- **Why it matters:** Future publish-adjacent work (cancel mid-publish, publish history panel, scheduled publishes) extends the existing route + service module; new server-side OAuth needs require an explicit narrow carve-out from ADR-0002.
- **Source ADRs:** ADR-0031 (publish surface deferred to T1), ADR-0034 (Branch B selected), ADR-0033 (publish service module contract), ADR-0036 (per-map publish removed), ADR-0037 (polling + cross-session resume)

### Simulator + parity contract (PRD-004 lineage)

- **Decision:** The redirect simulator (`site/lib/redirects/proxy-simulator.ts`) is a **verbatim local port** of upstream Content SDK `RedirectsProxy` with **100% parity** against imported upstream test fixtures (M2 contract). Quirks (e.g. `isRegexOrUrl` `.slice(0, -1)`) are **replicated, not fixed**. **Regex safety** uses a dual time-cap: 100ms per-row `Promise.race` + 3-second total wall-clock cap; not Web Worker isolation. **Mode toggle is transient UI state** (not stored in Sitecore); resets to Pattern on every modal open. Simulator is **async** (`Promise<SimulationTrace>`); UI staggers trace-card render with reduced-motion fallback to instant. **Fixture parity is mechanical** — upstream test cases extracted by a committed AST-walking script (`site/scripts/extract-upstream-fixtures.ts`); SHA-stamped output (`__fixtures__/upstream-cases.json`). The parity contract has one escape valve: explicit waiver entry in ADR-0038 for any deliberate divergence (none in PRD-004; PRD-005 extends this to `knownDivergences[]` in the snapshot JSON).
- **Why it matters:** PRD-005's drift detection inherits this contract directly — the verbatim-port discipline is what makes drift signal meaningful. Future simulator-touching PRDs cannot "improve" upstream silently.
- **Source ADRs:** ADR-0038 (verbatim port + parity), ADR-0039 (regex dual-cap safety), ADR-0040 (transient mode + async simulator), ADR-0042 (AST extractor for fixtures)

---

## ADRs NOT in this baseline

The following ADRs remained outside the baseline as of this promotion:

- **ADR-0001** — framework boilerplate ("use ADRs as architecture backbone"); meta-decision, not architecturally constraining.
- **ADR-0044, ADR-0045, ADR-0046, ADR-0047, ADR-0048, ADR-0049** — PRD-005 drift detection ADRs. Just landed (2026-05-22); too fresh to be foundational. Re-evaluate at the next /architect run.
- **ADR-0004, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022, ADR-0032** — Superseded ADRs; gate rule excludes them from promotion.

## Re-promotion log

| Date | Promoted-from ADRs | Promoted-by | Notes |
|------|--------------------|-------------|-------|
| 2026-05-22 | ADR-0002, 0003, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0012, 0013, 0023, 0024, 0025, 0026, 0027, 0028, 0029, 0030, 0031, 0033, 0034, 0035, 0036, 0037, 0038, 0039, 0040, 0041, 0042, 0043 (31 total) | /architect baseline-promotion gate, run 20260522T114800Z | Initial baseline. PRD-005 ADRs (0044-0049) deliberately excluded — too fresh. Superseded ADRs (0004, 0014-0022, 0032) excluded per gate rule. |
