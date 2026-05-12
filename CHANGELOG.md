# Changelog

All notable changes to Redirect Manager are recorded here. Entries are derived from ship reports under `project-planning/` and are written in user-facing language — see individual PRDs for full scope and ADRs for decision rationale.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) loosely; releases are tracked per PRD rather than by semantic version while the product is pre-1.0.

## [PRD-000] — 2026-05-12

**Ship status:** shipped

First public release. Three Cloud Portal extension points (Context Panel, Dashboard Widget, Full Page) backed by Sitecore Authoring GraphQL.

### Added

- Context Panel inside the Pages editor — lists redirects affecting the current page (exact source/target match), grouped by parent Redirect Map, with inline create / edit / delete and an "Add redirect for this page" affordance.
- Dashboard Widget on a site dashboard — count tiles for redirect maps, individual mappings, and last-updated timestamp; per-site picker fallback (operator's last choice persisted).
- Full Page workshop — site-collection + site picker, virtualized Redirect Map list (`react-virtuoso`), editable detail pane with inline rename / type change / flag toggles, mappings table with drag-reorder, delete-map confirm.
- JSON export with three modes (open in new tab / copy to clipboard / download-soon) — `redirect-manager/v1` schema keyed by Sitecore item GUID.
- JSON import wizard — 4 steps (upload → preview → applying → summary), per-conflict three-action picker (create / overwrite / skip), collapsible scalar + mappings diff, newly-minted-GUID warning per ADR-0009.
- Friendly error UX across all surfaces — Sonner toast + expandable "Show technical details" with verbatim GraphQL error.
- Theme switcher (env-gated 3-state Light/Dark/System with `d` hotkey).
- WCAG 2.1 AA accessibility — axe-core assertions on every component, focus-visible, sr-only live regions, structural ban on raw-HTML on user data and `outline:none` without paired focus styles.
- Five operator-facing smoke checklists under `site/docs/` (registration, CRUD round-trip, import/export, host-frame, live walkthrough).
- Full documentation pass — `README.md` with feature gallery, `docs/architecture.md` 10-section narrative, `docs/decisions.md` ADR table grouped by theme + inline SDK findings, `CHANGELOG.md`.

### Notable SDK findings (recorded inline in code, surfaced in `docs/decisions.md`)

- `xmc.authoring.graphql` mutation envelope: GraphQL body sits **inside** `params`, response double-unwraps to `result.data.data`. Pushed back to the `sitecore:marketplace-sdk-{client,xmc}` skills.
- Context Panel matcher key is `pageInfo.route`, not `pageInfo.url` (the latter carries `?sc_site=…`).
- Authoring `createItem` rejects caller-supplied `id` → cross-tenant imports mint fresh GUIDs.
- `RedirectType` wire enum: `ServerTransfer` / `Redirect301` / `Redirect302` (Redirect307 rejected by head-app resolver).
- Boolean fields serialize as `'0'` / `'1'` on writes; deserialize as `'1'` / `''` strings on reads.
- Rename requires the dedicated `renameItem` mutation; `updateItem` does not accept `name` on `UpdateItemInput`.
- `__Updated` uses Sitecore compact format `yyyyMMddTHHmmssZ`, not ISO-8601.
- Marketplace SDK `ApplicationContext` is tenant-scoped, not site-scoped — no per-site signal for Dashboard Widget embeds; site picker is the honest UX.

### Deferred

- Multilingual / per-language CRUD → PRD-001 (ADR-0010).
- Usage analytics (Upstash counters + head-app instrumentation) → PRD-001.
- Sync-back of consolidated counters to Sitecore template (`UsageCount`, `UsageLastSyncedAt`) → PRD-002.
- Regex-aware Context Panel matching → high-priority follow-on PRD (ADR-0005).
- Concurrent-edit detection (freshness tokens, "modified externally" banner) → future PRD.
- Bulk operations (multi-row delete, bulk type change) → future PRD.
- Live HTTP probing of redirect targets → future PRD.
- Audit log → future PRD.
- App UI localization → future PRD.
- Public Marketplace App submission → future PRD.
- Automated host-frame visual smoke harness → follow-up to T064 (currently documented manual procedure).

### Known limitations (PRD-000 by design)

- `en` content language only.
- Context Panel matches by exact-string source/target equality only.
- Cross-tenant imports always mint fresh GUIDs on `create` actions.
- No concurrent-edit detection — last writer wins.
- Cloud Portal does not pass per-site context to Dashboard Widget embeds — picker fallback only.
