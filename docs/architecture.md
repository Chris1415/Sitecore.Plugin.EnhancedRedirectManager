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
