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
