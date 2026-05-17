# Changelog

All notable changes to Redirect Manager are recorded here. Entries are derived from ship reports under `project-planning/` and are written in user-facing language — see individual PRDs for full scope and ADRs for decision rationale.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) loosely; releases are tracked per PRD rather than by semantic version while the product is pre-1.0.

## [PRD-003] — Publish Site wired + lightweight job tracking — 2026-05-17

**Ship status:** shipped_with_caveats

The decorative "Publish all" hero CTA from PRD-002 is now a real **"Publish Site"** button wired to the SitecoreAI Publishing v1 API. Operators trigger a site-wide Republish without leaving the Redirect Manager, see in-flight elapsed time on the button, and get a completion toast with items-processed / items-failed counts. Cross-session resume — close the tab and reopen, the app re-finds the in-flight job and continues tracking. First server-side Next.js API route in this app (narrow carve-out from ADR-0002 documented in ADR-0035).

### Delivered

- "Publish all" hero CTA renamed to **"Publish Site"** + wired to a real publish (US-P1, FR-P1).
- Confirmation dialog (`PublishSiteConfirmModal`) reusing the Blok AlertDialog shell from PRD-002 — shows site name, locale count, mode "Republish (full)", source "Redirect Manager". Primary action triggers the publish; Cancel closes cleanly (US-P1, FR-P2, NFR-P3).
- Server-side OAuth proxy route at `app/api/publish/route.ts` — holds `xmcloud.cm:admin` + `xmcpub.jobs.a:r` + `xmcpub.jobs.a:w` scoped client-credentials and forwards to `https://edge-platform.sitecorecloud.io/authoring/publishing/v1/jobs`. Server-only enforcement via `import "server-only"` + structural test (FR-P4, NFR-P2, ADR-0035).
- Branch-agnostic publish service module (`lib/publish/`) — `PublishScope` types, `buildSitePublishBody` per the create.md docs nested shape, `outcomeFrom` mapper handling 201/4xx/5xx + ProblemDetails detail/title fallback, Sonner-backed toast adapter, `publish()` orchestration with the transport adapter as the only branch-specific seam (ADR-0033, FR-P5..P10).
- **Lightweight job-status polling (US-P3, ADR-0037)** — 3-second `GET /api/publish/jobs/{id}` polling via `usePublishJobTracker` hook; button shows `Publishing… Xs` while polling; terminal toast replaces the loading toast via stable `publish-job-<jobId>` Sonner id pattern; resume toast explicitly dismissed on terminal so toasts never stack.
- **Cross-session resume (US-P3)** — `usePublishResume` hook chains Tier 2 (localStorage `redirect-manager:publish-in-flight:<collection>:<site>`) + Tier 3 (name-prefix list scan against `GET /api/publish/jobs?source=Redirect+Manager`, filtered to non-terminal jobs queued in the last 60 min). Resumed jobs show a one-time "Found in-progress publish from Xm ago — tracking…" toast.
- **Operator-readable job names** — publish jobs land in SitecoreAI's publishing list as `Redirect Manager — <collection>/<site> — <ISO timestamp>` (stable prefix doubles as the list-scan search key).
- Idempotency guard (NFR-P6) — `isSubmitting` state closes the race window between dialog-close and the first polling tick; button stays disabled across the gap. Code-review major fix.
- Theme parity (NFR-P5) — dialog renders correctly in dark/light/system themes; 6 structural theme tests.
- Mobile responsive verified at 375/768/1280 viewports — no horizontal scroll, no grid overflow, no fixed-width sidebar, no headline overflow.

### Deferred

- **Per-map "Publish" button (US-P2 cut)** — discovered during real-tenant smoke that Sitecore silently no-ops Items publish for Redirect Map items (not Edge-published content). The whole feature was removed cleanly before ship; ADR-0036 records the finding. Only **Site publish** updates redirect content on Edge.
- **Multi-locale publish** — simplified to `["en"]` only because `UrlMapping` is a SHARED Sitecore field (no language axis). Publishing multiple locales would re-publish byte-identical data. Resolver signature retained for future flexibility.
- **`locales: ["*"]` shorthand** — operator skipped the Tranche 1 live probe. Enumerated `["en"]` works; revisit if multi-locale returns to scope.
- **Recent publishes panel** — out of "lightweight" charter for this PRD. Routes (`GET /api/publish/jobs`) are in place; a future PRD can add the panel cheaply.
- **Cancel-mid-publish UI** — `POST /jobs/{id}/cancel` endpoint exists (Tranche 1.5 spike probed it); UI not wired. Future PRD candidate.
- **Server-side body validation defense-in-depth** — `validateBody` only enforces `source` non-empty. No production exposure (typed client builder + same-origin route). Future cleanup pass.

### Known limitations

- Operators must register a Cloud Portal automation client (`xmcloud.cm:admin` + `xmcpub.jobs.a:r` + `xmcpub.jobs.a:w`) and populate `SITECORE_PUBLISH_CLIENT_ID` + `SITECORE_PUBLISH_CLIENT_SECRET` in `.env.local`. Token endpoint + audience + Publishing base URL have universal defaults — no setup needed for those.
- Cross-machine resume is best-effort within a 60-minute window — list-scan does not look further back. Publishes triggered on machine A more than an hour ago must be verified via SitecoreAI's publishing list directly when opened on machine B.
- Polling interval is 3s with no progress bar; elapsed time only. Statistics (`itemsProcessed / itemsSent`) are available via the API and could be surfaced in a future PRD.
- Host-frame Playwright pixel-comparison test was skipped this PRD (no POC produced — light-rigor scope). Visual fidelity verified by operator live walkthrough on the solo tenant.

### Stats

- **Tests:** 521 passing across 66 files (+61 vs PRD-002 baseline of 460)
- **Lint:** 0 errors / 2 baseline warnings (unchanged from PRD-002)
- **Build:** clean — 9 routes (5 static + 3 dynamic API routes + 1 not-found)
- **Smoke:** m_publish PASSED 2026-05-17 (operator-driven on solo tenant); m1 + m3 carry-forward PASSED; host_frame_smoke SKIPPED (no POC)
- **ADRs authored:** 7 (ADR-0031 deferred decision, ADR-0032 superseded by ADR-0036, ADR-0033 module contract, ADR-0034 Branch B selected, ADR-0035 server-route carve-out from ADR-0002, ADR-0036 per-map removed, ADR-0037 polling + resume)

## [PRD-002] — V4 Blok Elevated redesign — 2026-05-15

**Ship status:** shipped

V4 Blok Elevated visual redesign of all three extension-point routes. Functional contract with Sitecore preserved 1:1 — same SDK calls, same GraphQL, same Cloud Portal registration.

### Changed

- All three routes (Full Page, Context Panel, Dashboard Widget) redesigned with V4 Blok Elevated chrome: frosted-glass surfaces, gradient text, Geist Sans 700 at large hero scales, token-composed gradients and shadows.
- Full Page gains a workspace hero zone (eyebrow + headline + decorative CTAs), a 4-tile stat strip, and a drifting plume backdrop (28s loop, Full Page only per the mixed motion budget).
- Context Panel gains a hero count header ("N redirects point here") and an always-visible inline quick-add form — the add-redirect modal is replaced with the inline form as the primary CRUD path.
- Dashboard Widget gains a hero stat number + sparkline zone, a top-destinations section, a recently-shipped mini-widget, and a footer attribution — all preview data under the Preview Data banner.
- Light + dark mode both fully validated with token-composed color (no `#` hex literals in any component).
- `prefers-reduced-motion: reduce` respected across all surfaces: plumes, count-ups, letter-reveals, and hover lifts all suppress correctly.

### Added

- **Preview Data banner** on Full Page and Dashboard Widget — explains which metrics are mocked and names the follow-on release that wires real data. Context Panel shows real data only (no banner).
- Inline `QuickRedirectForm` in Context Panel — 3-state machine (add-to-existing / create-new / submitting); no modal required for the primary add-redirect flow.
- Multi-match dropdown in the Context Panel form — when the current page appears in multiple Redirect Maps, the operator selects which map to add to.
- `PREVIEW_DATA` constants module (`site/lib/mocks/preview-data.ts`) — single canonical swap point for the follow-on data-plumbing PRD. Flip `PREVIEW_DATA_ACTIVE.fullPage` and `.dashboardWidget` to wire real data.

### Removed

- `AddRedirectModal` — deleted per ADR-0028. The inline `QuickRedirectForm` is the primary add-redirect path.

### Deferred

- HealthBadge real verification probe (Context Panel + Dashboard Widget badge + Full Page "Validate health" CTA all remain placeholders) → follow-on PRD wires a real probe worker.
- Full Page hero CTAs "Validate health" and "Publish all" remain decorative toasts → follow-on PRD wires real bulk publish.
- POC clickdummy refresh for `pocs/poc-v1-prd002/context-panel.html` — production added split hero + direction toggle + toolbar row during the polish wave the POC hasn't caught up to.
- Playwright MCP host-frame smoke (m2) — operator visually verified rather than running the formal 5-axis recipe.

### Operator polish (post-ship, 2026-05-15)

Substantial polish wave landed during the live walkthrough smoke (m5). All changes ship in the same `prd-002` branch.

- **Dashboard Widget** — wide-variant 4-column layout, edge-to-edge shell, 8 real-data tiles (Maps / Mappings / 301 / 302 / Server Transfer / Avg-per-map / Largest map / Last updated), header HealthBadge + new real CollisionsBadge, JS-driven animated top-destinations bars (`--color-primary-500` for theme-independent contrast), real recently-shipped-maps panel sourced from `map.updatedAt`, refresh button with full count-up + bar replay, no-skeleton refresh.
- **Full Page** — real 5-tile stat strip (Redirects · 301 · 302 · Server Transfer · Conflicts in warning tone) replaces the mocked stat strip, click-through Conflicts dialog with per-source resolver and Open-map shortcut, slim WorkspaceHero with real Last modified line (uses new `updatedBy` field) + four hero CTAs (Refresh + View activity popover are now real; Validate health + Publish all remain decorative), wider 380px rail, dark-mode-correct Radix `<Select>` dropdowns for collection/site pickers, no-skeleton refresh with count-up replay.
- **Context Panel** — full-width shell (was hard 360px), page-route as h1 headline (redirect count moved to a new split summary tile showing inbound + outbound mappings), one-line regex banner on a toolbar row beside refresh + theme actions, subtle redirect-type pill, `QuickRedirectForm` direction toggle so the operator can flip "X → this page" ↔ "this page → X" for the same form, in-map duplicate-source guard now consistent across all 4 write paths, count-up replay on refresh.
- **Documentation** — 11 new screenshots in `docs/screenshots/` (`full-page-prd002-*.png`, `context-panel-prd002-*.png`, `dashboard-widget-prd002-wide.png`). README hero and feature-tour galleries rebuilt around the PRD-002 live build for Full Page and Context Panel. PRD-000 era screenshots remain in place but most are now unreferenced.
- **Tests** — 460/460 (was 432/432). +28 tests covering direction toggle, hero rework, isEmpty branch, conflicts dialog, split hero, dashboard widget tile additions.

### Fixed (polish wave)

- Edit map dialog rendered off-screen — `.elev-modal` is a full-viewport backdrop class; renamed to `.elev-modal-content` to match the convention used by the other modals.
- Skeleton-on-refresh flicker eliminated on all three surfaces (skeleton only renders when `priorData.length === 0`; subsequent refreshes keep prior content and use spin-icon on the trigger).
- Native `<select>` not following dark theme on Full Page collection/site pickers — migrated to Radix `<Select>`.
- Token-vs-theme contrast bugs (dashboard bars + Context Panel redirect-type pill nearly invisible in dark mode) — switched to theme-independent `--color-primary-500` for the bars; redirect-type pill switched to muted-foreground tones.

---

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
