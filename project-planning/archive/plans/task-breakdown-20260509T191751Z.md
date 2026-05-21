# Development Execution Plan — Redirect Manager (PRD-000)

---
document_type: task_breakdown
artifact_name: task-breakdown-20260509T191751Z.md
generated_at: 2026-05-10T12:00:00Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260509T191751Z.json
source_inputs:
  - products/redirect-manager/project-planning/PRD/prd-000.md
  - products/redirect-manager/project-planning/architecture/architecture-20260509T191751Z.md
  - products/redirect-manager/project-planning/ui-design/ui-design-20260509T191751Z-v1.md
  - products/redirect-manager/pocs/poc-v1/
  - products/redirect-manager/project-planning/ADR/adr-0001-use-adrs-as-architecture-backbone.md
  - products/redirect-manager/project-planning/ADR/adr-0002-marketplace-sdk-mode-a-scaffold.md
  - products/redirect-manager/project-planning/ADR/adr-0003-authoring-graphql-as-canonical-source.md
  - products/redirect-manager/project-planning/ADR/adr-0004-three-prd-phasing.md
  - products/redirect-manager/project-planning/ADR/adr-0005-context-panel-exact-match-only.md
  - products/redirect-manager/project-planning/ADR/adr-0006-import-conflict-resolution-three-actions.md
  - products/redirect-manager/project-planning/ADR/adr-0007-tenant-identifier-tenantid.md
  - products/redirect-manager/project-planning/ADR/adr-0008-urlmapping-encoding-contract.md
  - products/redirect-manager/project-planning/ADR/adr-0009-import-match-by-item-guid.md
  - products/redirect-manager/project-planning/ADR/adr-0010-mvp-language-scope-en-only.md
  - products/redirect-manager/project-planning/ADR/adr-0011-extension-points-and-routes.md
  - products/redirect-manager/project-planning/ADR/adr-0012-list-virtualization-react-virtuoso.md
  - products/redirect-manager/project-planning/ADR/adr-0013-real-tenant-fixture-capture-workflow.md
consumed_by:
  - QA Specialist (07) enriches this file (§ 9, § 10, restructure to TDD)
  - Developer Code Monkey (08) implements from this file + prd-minimal-000.md only
next_input:
  - products/redirect-manager/project-planning/plans/qa-report.md (QA enrichment in place — same file)
---

## 1. Implementation Overview

PRD-000 ships the **Redirect Manager** as a single client-side Marketplace app (Mode A, ClientSDK + `xmc` module) hosting **three Cloud Portal extension routes** under `products/redirect-manager/site/`. The implementation is a **stateless Next.js App Router SPA** with **zero backend** — every read and write rides the operator's Cloud Portal session through `client.query` / `client.mutate` against Authoring GraphQL and the Sites SDK.

**Containment.** All source code lives under `products/redirect-manager/site/`. The repo is `Sitecore.Plugin.EnhancedRedirectManager` on the `prd-000` branch. No code anywhere else.

**Working mode (ADR-0013 revised 2026-05-10).** The architecture flagged 9 PENDING SDK shapes. Operator chose to proceed with assumed shapes rather than blocking on a pre-`/task-breakdown` capture session. Tasks that touch unverified shapes carry an `assumed-shape: <fixture-filename>` annotation on a single line in the task body. The QA Specialist will lift these into § 9 / § 10 so divergence-detection is explicit at `/test`.

**SDK call inventory (cited in § 4c-6).** The app makes exactly **9 distinct SDK calls** across 4 surfaces:

| Call | Verb | Unwrap | Captured? |
|---|---|---|---|
| `pages.context` (subscribe) | `query` | single `.data` | assumed |
| `xmc.sites.listSites` | `query` | double `.data.data` | assumed |
| `xmc.sites.listCollections` | `query` | double `.data.data` | assumed |
| `xmc.authoring.graphql` (read item) | `mutate` | single `.data` | **captured** (PRD § 9) |
| `xmc.authoring.graphql` (read children) | `mutate` | single `.data` | assumed |
| `xmc.authoring.graphql` (createItem) | `mutate` | single `.data` | assumed |
| `xmc.authoring.graphql` (updateItem) | `mutate` | single `.data` | assumed |
| `xmc.authoring.graphql` (deleteItem) | `mutate` | single `.data` | assumed |
| `application.context` | `query` | single `.data` | assumed |
| `pages.reloadCanvas` | `mutate` | single `.data` | n/a (void) |

**Visual ground truth.** `products/redirect-manager/pocs/poc-v1/` is the canonical visual reference. When this breakdown's prose and the clickdummy diverge on visual details, the clickdummy wins. The dark-mode `--primary-foreground: var(--color-blackAlpha-900)` override (theme.css lines 156-160 and 199-200) is a **non-negotiable contract** — implementation must carry the same flip and not silently revert if the Nova preset bumps. `theme-toggle.js` is **POC-only** convenience and does NOT ship.

**Scale.** 67 tasks, 10 epics. Foundation (Epics A–C) sequential; surface epics (D, E, F) parallel after foundation; G–I parallel after foundation; J sequential at the tail.

## 2. Epics

| Epic | Title | Tasks | Depends on |
|---|---|---|---|
| **A** | Scaffold and infrastructure | T001–T007 | none |
| **B** | SDK plumbing (typed wrappers + Provider) | T008–T015 | A |
| **C** | Domain layer (parser, schema, diff, types) | T016–T021 | A (test runner) |
| **D** | Context Panel (`/context-panel`) | T022–T030 | B, C |
| **E** | Dashboard Widget (`/dashboard-widget`) | T031–T034 | B |
| **F** | Full Page (`/full-page`) — picker, list, CRUD | T035–T046 | B, C |
| **G** | Import / Export (Full Page) | T047–T054 | C, F |
| **H** | Theme + a11y polish (cross-surface) | T055–T058 | D, E, F |
| **I** | Test stack and structural guards | T059–T062 | A |
| **J** | Marketplace install + smoke | T063–T067 | H, G |

## 3. Feature Breakdown

**Epic A — Scaffold and infrastructure.** Run the canonical Marketplace Client-Side scaffold; flatten `next-app/` per skill; install Blok primitives + composite blocks; install `react-virtuoso`, `@dnd-kit/core`, `react-hook-form`, `zod`, `fast-check`; configure Vitest + jsdom; create three extension routes; replace root `/` with `notFound()` per ADR-0011; copy POC `theme.css` into `app/globals.css` with the dark-mode `--primary-foreground` override preserved.

**Epic B — SDK plumbing.** Replace the scaffold's `as string` cast with a typed `requireContextId()` helper. Build typed wrappers around the 9 SDK calls. The single `MarketplaceProvider` lives in `app/layout.tsx`; downstream code uses `useMarketplaceClient()` / `useAppContext()` only.

**Epic C — Domain layer.** Pure modules with zero SDK dependency: `lib/url-mapping/{parse,serialize}.ts` (ADR-0008 round-trip), `lib/import-export/schema.ts` (Zod for `redirect-manager/v1`), `lib/import-export/diff.ts` (GUID-keyed classifier per ADR-0009), `lib/match/context-panel-matcher.ts` (exact-string per ADR-0005), `lib/domain/types.ts` (`RedirectMapItem` and supporting types), `lib/redirects/redirect-type-enum.ts` (the 4 enum values, with introspection-fallback shape).

**Epic D — Context Panel.** Persistent regex-banner, page-context callout, grouped-by-Map list, "Add redirect for this page" modal (two-step: pick map → fill form), inline edit/delete on rows, all 6 states (default, loading, empty, error, focus, success-toast), `pages.reloadCanvas` after writes.

**Epic E — Dashboard Widget.** 3 stat tiles (Redirect Maps, Mappings, Last updated), footnote "Redirect counts only — usage analytics ship in a follow-on release", 4 states (default, loading, empty, error). Tiles non-interactive in MVP per UI v1 § 3.2.

**Epic F — Full Page.** Two-pane layout (280 px rail + fluid right pane) with tabbed fallback at <960 px. Collection picker → site picker → virtualized redirect-map list (left rail). Right pane: empty state OR detail editor (form + virtualized mappings table with drag-reorder via `@dnd-kit/core` keyboard sensor). Top action row: breadcrumb + Import/Export/+New buttons. Delete confirmation modal.

**Epic G — Import / Export.** Export emits `redirect-manager/v1` JSON with item GUIDs. Import flow: 4-step wizard (upload → schema validate → preview → apply+summary). Diff-aware preview with per-conflict action picker (create/overwrite/skip), bulk action, disabled confirm-until-resolved, virtualized list, collapsible per-item diff. Sequential mutations during apply; per-item success/fail summary; "Retry failed items only" affordance.

**Epic H — Theme + a11y polish.** WCAG 2.1 AA cross-cutting: focus-visible ring everywhere, aria-live regions, monochrome glyphs (`✓` U+2713, `✕` U+2715 — never color-emoji codepoints), reduced-motion honors, color-contrast audit including the `--primary-foreground` dark-mode override.

**Epic I — Test stack and structural guards.** Vitest config + jsdom, fixture directory scaffold, structural test that forbids direct `@sitecore-marketplace-sdk/*` imports outside `lib/sdk/` and `MarketplaceProvider`, structural test that forbids raw-HTML React props and direct `innerHTML` writes (NFR-Sec3), structural test that the dark-mode `--primary-foreground` override is present in `app/globals.css`.

**Epic J — Marketplace install + smoke.** `docs/architecture.md` Test App registration runbook (the exact 8-field paste-in for App Studio); host-frame visual smoke harness at `/test`; real-tenant CRUD checklist; real-tenant import/export checklist; live-walkthrough checklist.

## 4. Task Breakdown

### Epic A — Scaffold and infrastructure

#### T001 — Run the canonical Marketplace Client-Side scaffold

- **Title:** Scaffold the Marketplace Client-Side app
- **Description:** From `products/redirect-manager/`, run the canonical scaffold per `sitecore:setup-marketplace-client-side` § Scaffold. Run literally per rule `50-scaffold.mdc`; do not hand-pin `package.json` from training data.
- **Expected Output:** `products/redirect-manager/site/` directory created with `package.json`, `next.config.*`, `app/layout.tsx`, `app/page.tsx`, scaffold's `MarketplaceProvider` at `components/providers/marketplace.tsx`. Hard stop and report if the scaffold command fails.
- **Depends on:** none
- **Command:** `cd products/redirect-manager && npx shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-client-side-xmc.json` — answer prompts: directory `site`, app name `redirect-manager`, install Blok, install Vitest. Then flatten `next-app/` per skill (move contents up if scaffold creates the nested folder).

#### T002 — Lint + typecheck baseline

- **Title:** Verify scaffold lints and typechecks clean
- **Description:** Run the scaffold's lint and typecheck. Apply the Badge-API fix from `sitecore:setup-marketplace-client-side` § Lint+Badge fixes if a Blok primitive references the old API.
- **Expected Output:** `npm run lint` and `npm run typecheck` (or `tsc --noEmit`) both exit 0 from `products/redirect-manager/site/`.
- **Depends on:** T001

#### T003 — Install Blok primitives + composite blocks

- **Title:** Install the full Blok primitive set required by the v1 spec
- **Description:** Run the install command from UI v1 § 4.1. The Marketplace quickstart only ships a subset; this superset is required. Use whichever install verb the scaffold output documents (typically `npx shadcn@latest add`).
- **Expected Output:** All Blok primitives present under `components/ui/` (or the scaffold's equivalent path) and importable as `@/components/ui/<name>`. Specifically: `alert`, `alert-dialog`, `badge`, `breadcrumb`, `button`, `card`, `checkbox`, `collapsible`, `command`, `dialog`, `draggable`, `dropdown`, `empty-states`, `error-states`, `icon`, `input`, `label`, `popover`, `progress`, `scroll-area`, `select`, `separator`, `skeleton`, `sonner`, `tabs`, `tooltip`, `dashboard-widget`. (Note: `@blok/dropdown` is not a published primitive — the correct registry slug is `@blok/dropdown-menu`. Fixed in command on line 122 by Tranche 1 implementer 2026-05-10.)
- **Depends on:** T002
- **Command:** `cd products/redirect-manager/site && npx shadcn@latest add @blok/alert @blok/alert-dialog @blok/badge @blok/breadcrumb @blok/button @blok/card @blok/checkbox @blok/collapsible @blok/command @blok/dialog @blok/draggable @blok/dropdown-menu @blok/empty-states @blok/error-states @blok/icon @blok/input @blok/label @blok/popover @blok/progress @blok/scroll-area @blok/select @blok/separator @blok/skeleton @blok/sonner @blok/tabs @blok/tooltip @blok/dashboard-widget`

#### T004 — Install non-Blok runtime dependencies

- **Title:** Install `react-virtuoso`, `@dnd-kit/core`, `react-hook-form`, `zod`, `fast-check`, `lucide-react`
- **Description:** Architecture § 7 locks these. `lucide-react` may already be in the Blok dependency tree — confirm presence; install only if missing.
- **Expected Output:** Each package present in `package.json` with versions resolved by the package manager (npm — scaffold default; do NOT switch to pnpm). `npm install` exits 0.
- **Depends on:** T002
- **Command:** `cd products/redirect-manager/site && npm install react-virtuoso @dnd-kit/core react-hook-form zod && npm install --save-dev fast-check`

#### T005 — Set up Vitest + jsdom test stack

- **Title:** Configure Vitest with jsdom for component and unit tests
- **Description:** Apply the Vitest + jsdom + tsconfig setup from `sitecore:setup-marketplace-client-side` § Test stack. Add `tests/` directory scaffold with `tests/fixtures/graphql/` subdir and a `tests/setup.ts` for jsdom globals.
- **Expected Output:** `vitest.config.ts` (or `.mts`) at `site/` root pointing at `jsdom`. `tests/setup.ts` registers any DOM polyfills. `npm run test -- --run` exits 0 (no tests yet — clean run). `tests/fixtures/graphql/` directory created with a `.gitkeep`.
- **Depends on:** T002

#### T006 — Create three extension routes + replace root with notFound()

- **Title:** Scaffold the three extension-point page modules and lock the root route
- **Description:** Per ADR-0011 and `sitecore:marketplace-sdk-extension-routes`, create:
  - `app/context-panel/page.tsx` (renders a `<main>Context Panel placeholder</main>` for now)
  - `app/dashboard-widget/page.tsx` (placeholder)
  - `app/full-page/page.tsx` (placeholder)
  - Replace the scaffold's `app/page.tsx` body with `import { notFound } from 'next/navigation'; export default function Root() { notFound(); }`
- **Expected Output:** All three routes return 200 in dev mode at `https://localhost:3000/context-panel`, `/dashboard-widget`, `/full-page`. Root `/` returns 404.
- **Depends on:** T003

#### T007 — Copy POC theme.css into app/globals.css with dark-mode override preserved

- **Title:** Wire Blok theme tokens with the dark-mode `--primary-foreground` contrast override
- **Description:** Take the POC's `pocs/poc-v1/theme.css` token blocks (`:root`, `@media (prefers-color-scheme: dark) :root:not(.light)`, `.dark`) and graft them into `site/app/globals.css`. The Nova preset by default sets `--primary-foreground: var(--color-white)` in the dark block — flip it to `var(--color-blackAlpha-900)` per the POC override comment dated 2026-05-10. Keep the comment block describing the override and the date.
- **Expected Output:** `app/globals.css` contains the Blok tokens including `--primary-foreground: var(--color-blackAlpha-900)` inside both `@media (prefers-color-scheme: dark) :root:not(.light) { ... }` and `.dark { ... }`. The override comment from `pocs/poc-v1/theme.css` lines 156-160 is preserved verbatim. The `--ring`, `--text-*`, `--font-sans`, `--font-mono`, `--radius-*` tokens are all present.
- **Depends on:** T003

### Epic B — SDK plumbing (typed wrappers + Provider)

#### T008 — Verify MarketplaceProvider sits at app/layout.tsx and exposes useMarketplaceClient/useAppContext

- **Title:** Confirm Provider placement and lock the SDK boundary
- **Description:** The scaffold's `components/providers/marketplace.tsx` should already wrap `app/layout.tsx`. Confirm `modules: [XMC]` in the ClientSDK init. Export `useMarketplaceClient()` and `useAppContext()` hooks from the provider module if the scaffold doesn't already.
- **Expected Output:** `app/layout.tsx` imports and wraps `<MarketplaceProvider>` around `{children}`. `useMarketplaceClient()` and `useAppContext()` are exported from `components/providers/marketplace.tsx` and return typed values.
- **Depends on:** T006, T007

#### T009 — Add typed `requireContextId()` helper (replace scaffold `as string` cast)

- **Title:** Lock sitecoreContextId access through a guarded helper
- **Description:** Per architecture § 5.7, the scaffold ships an `as string` cast on `appCtx?.resourceAccess?.[0]?.context?.preview` — anti-pattern. Replace with a guarded helper that throws a typed error when the resource is unavailable.
- **Expected Output:** `site/lib/sdk/require-context-id.ts` exports `function requireContextId(appCtx: ApplicationContext): string` that returns `appCtx.resourceAccess[0].context.preview` or throws `new Error('Sitecore context unavailable — app not bound to a resource')`. All call sites in the codebase use this helper; zero `as string` casts remain on `context.preview` access.
- **Depends on:** T008
- **Note:** Policy is `.preview` for ALL `xmc.*` calls in MVP per architecture § 5.7. Do NOT use `.live`.

#### T010 — Build `lib/sdk/sites.ts` typed wrapper around xmc.sites.listSites + listCollections

- **Title:** Typed wrapper for site + collection discovery
- **Description:** Wraps `client.query('xmc.sites.listSites', { params: { query: { sitecoreContextId } } })` and `client.query('xmc.sites.listCollections', ...)`. **Double `.data.data`** unwrap (xmc module queries). Returns `Sites.Site[]` and `Sites.Collection[]`.
- **Expected Output:** `site/lib/sdk/sites.ts` exports `async function listSites(client, sitecoreContextId): Promise<Sites.Site[]>` and `async function listCollections(client, sitecoreContextId): Promise<Sites.Collection[]>`. Both unwrap via `result.data?.data ?? []`. Type imports cited from `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts`.
- **Depends on:** T009
- **assumed-shape:** tests/fixtures/graphql/sites-list.json
- **assumed-shape:** tests/fixtures/graphql/collections-list.json

#### T011 — Build `lib/sdk/redirects-read.ts` Authoring GraphQL read wrapper

- **Title:** Typed wrapper to list Redirect Map children + decode wire-to-domain
- **Description:** Wraps `client.mutate('xmc.authoring.graphql', { params: { query: { sitecoreContextId } }, body: { query, variables } })`. Single `.data` unwrap. Decodes the `{ name, jsonValue }` array shape into the domain `RedirectMapItem` (defined in T016). The list query targets `/sitecore/content/<COLLECTION>/<SITE>/Settings/Redirects` with `language: "en"` and includes `RedirectType`, `UrlMapping`, `PreserveQueryString`, `PreserveLanguage`, `IncludeVirtualFolder`, `__Updated`, `__Created`, `itemId`, `name`.
- **Expected Output:** `site/lib/sdk/redirects-read.ts` exports `async function listRedirectMaps(client, sitecoreContextId, sitePath): Promise<RedirectMapItem[]>`. Wire shape (per item) matches PRD § 9. Decoder handles missing fields gracefully (warn-and-skip on malformed `UrlMapping` segments per ADR-0008).
- **Depends on:** T009, T016
- **Note:** Read shape is **captured** (PRD § 9) — fixture `tests/fixtures/graphql/redirect-map-item.read.json` from PRD § 9 verbatim. The list-children envelope (`item.children.results[]`) is **not** captured.
- **assumed-shape:** tests/fixtures/graphql/redirect-map-list.json

#### T012 — Build `lib/sdk/redirects-write.ts` Authoring GraphQL write wrapper

- **Title:** Typed wrapper for createItem / updateItem / deleteItem mutations
- **Description:** Three exported async functions: `createRedirectMap(...)`, `updateRedirectMap(...)`, `deleteRedirectMap(...)`. All use `client.mutate('xmc.authoring.graphql', ...)`. Single `.data` unwrap. Per ADR-0010 all mutations pass `language: "en"`. Field representation for booleans, the create-with-supplied-id question (ADR-0009 consequence), and the exact mutation verb names are unverified — see assumed-shape below. The wrapper exposes a stable function signature regardless of which mutation verb the captured shape uses; the implementation is the only thing that flexes.
- **Expected Output:** `site/lib/sdk/redirects-write.ts` exports the three functions with typed inputs (`{ name, redirectType, preserveQueryString, preserveLanguage, includeVirtualFolder, mappings }`). All write paths funnel through this module — no other file calls `client.mutate('xmc.authoring.graphql', ...)` for write operations.
- **Depends on:** T009, T016, T017
- **assumed-shape:** tests/fixtures/graphql/redirect-map.create.json
- **assumed-shape:** tests/fixtures/graphql/redirect-map.update.json
- **assumed-shape:** tests/fixtures/graphql/redirect-map.delete.json

#### T013 — Build `lib/sdk/page-context.ts` subscription wrapper

- **Title:** Typed wrapper around pages.context subscribe-via-query
- **Description:** Wraps `client.query('pages.context', { subscribe: true, onSuccess })`. Single `.data` unwrap. Exposes a typed subscription that yields `{ pageUrl: string, pageRoute: string, sitePath: string, siteName: string }`. Uses **`pageInfo.url`** as the matcher key per UI v1 § 1.6 working assumption (OQ-A). The wrapper logs both `pageInfo.url` and `pageInfo.route` to the dev console at first message so the smoke checklist can verify which one the head-app's resolver agrees with.
- **Expected Output:** `site/lib/sdk/page-context.ts` exports `function subscribePageContext(client, callback): UnsubscribeFn`. Type imports from `node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContext`.
- **Depends on:** T009
- **assumed-shape:** tests/fixtures/graphql/page-context.json

#### T014 — Build `lib/sdk/application-context.ts` accessor

- **Title:** Typed wrapper around application.context query
- **Description:** Wraps `client.query('application.context')`. Single `.data` unwrap. Exposes `tenantId` (per ADR-0007) and `sitecoreContextId` (preview channel per architecture § 5.7) for downstream consumers. Most consumers use `useAppContext()` from the Provider — this module is for any explicit refresh/re-fetch.
- **Expected Output:** `site/lib/sdk/application-context.ts` exports `function selectTenantId(appCtx)` and `function selectContextId(appCtx)`. Both use the guarded helper from T009 internally.
- **Depends on:** T009
- **assumed-shape:** tests/fixtures/graphql/application-context.json

#### T015 — Build `lib/sdk/canvas-reload.ts` reload-after-write helper

- **Title:** Typed wrapper around pages.reloadCanvas mutation
- **Description:** Wraps `client.mutate('pages.reloadCanvas')`. Used after every successful Context Panel write so Pages canvas reflects the redirect immediately (architecture § 5.6).
- **Expected Output:** `site/lib/sdk/canvas-reload.ts` exports `async function reloadPagesCanvas(client): Promise<void>`. Errors are swallowed and logged (canvas reload is a UX nicety, not a correctness gate).
- **Depends on:** T009

### Epic C — Domain layer

#### T016 — Define domain types

- **Title:** `lib/domain/types.ts` — RedirectMapItem and supporting types
- **Description:** Pure module. Defines `RedirectMapItem`, `Mapping`, `RedirectType`, `RedirectMapAttributes`. The wire-to-domain split per architecture § 4.1 — domain types DO NOT carry the `{ name, jsonValue }` envelope.
- **Expected Output:** `site/lib/domain/types.ts` exports:
  ```typescript
  export type RedirectType = '301' | '302' | '307' | 'ServerTransfer';
  export interface Mapping { source: string; target: string; }
  export interface RedirectMapItem {
    id: string;          // Sitecore item GUID
    name: string;
    redirectType: RedirectType;
    preserveQueryString: boolean;
    preserveLanguage: boolean;
    includeVirtualFolder: boolean;
    updatedAt: string;   // ISO-8601
    mappings: Mapping[];
  }
  export interface RedirectMapAttributes { /* same minus id, mappings, updatedAt */ }
  ```
- **Depends on:** T005

#### T017 — Build `lib/url-mapping/parse.ts` and `serialize.ts`

- **Title:** Pure UrlMapping round-trip parser + serializer (ADR-0008)
- **Description:** Two exports:
  - `parse(raw: string): { rows: Mapping[], warnings: string[] }` — split on `&`, split each segment on **first** `=`, `decodeURIComponent` source and target, collect ordered list. Malformed segments produce warnings, not throws.
  - `serialize(rows: Mapping[]): string` — `encodeURIComponent` source and target separately (uppercase hex), join with `=`, join all rows with `&`. Operator-defined order is authoritative.
  - Round-trip property invariant: `parse(serialize(rows)).rows === rows` for all valid `rows` (no empty source/target).
- **Expected Output:** `site/lib/url-mapping/parse.ts` and `site/lib/url-mapping/serialize.ts`. Zero SDK dependency. Property test scaffold ready (T060).
- **Depends on:** T016

#### T018 — Build `lib/import-export/schema.ts` (Zod schema for redirect-manager/v1)

- **Title:** Zod schema validating the `redirect-manager/v1` JSON shape
- **Description:** Pure module. Zod schema mirrors PRD § 10 exactly. Item count cap at parse time: reject files with >1000 items per architecture § 8.2. Future-version rejection (any `schema` other than `redirect-manager/v1`) returns a friendly error.
- **Expected Output:** `site/lib/import-export/schema.ts` exports `RedirectExportSchema` (Zod) and `validateExport(json: unknown): { ok: true, data } | { ok: false, error: string }`. Validation runs **before** any nested field access — no field access on untrusted input.
- **Depends on:** T016

#### T019 — Build `lib/import-export/diff.ts` (GUID-keyed classifier per ADR-0009)

- **Title:** Per-item GUID-keyed diff between incoming JSON and target-site items
- **Description:** Pure module. Inputs: incoming JSON items + target-site domain `RedirectMapItem[]`. Output: array of `{ incoming, classification: 'new' | 'conflicting' | 'unchanged', existing?, fieldDiff? }`. Keying is on `id` (the Sitecore item GUID) per ADR-0009. `unchanged` is the architecture's UI extension (UI v1 § 3.3.5 step 3 names the `unchanged` classification for items where every field matches).
- **Expected Output:** `site/lib/import-export/diff.ts` exports `function classifyImport(incoming: ExportItem[], target: RedirectMapItem[]): ImportClassification[]`. Field comparison covers: `name`, `redirectType`, `preserveQueryString`, `preserveLanguage`, `includeVirtualFolder`, `mappings` (array compared element-wise after both sides are normalized via parse/serialize round-trip).
- **Depends on:** T016, T017, T018

#### T020 — Build `lib/match/context-panel-matcher.ts` (exact-string matcher per ADR-0005)

- **Title:** Pure exact-string matcher for Context Panel
- **Description:** Pure module. Input: current page URL + array of `RedirectMapItem`. Output: array of `{ map: RedirectMapItem, matchedRows: Mapping[] }` where every `matchedRows[i]` has `source === pageUrl` OR `target === pageUrl`. Regex sources are excluded entirely (string equality only — ADR-0005). The persistent banner copy "Direct-string matches only — regex pattern matches are not yet covered" is owned by the Context Panel UI, not this module.
- **Expected Output:** `site/lib/match/context-panel-matcher.ts` exports `function matchPageRedirects(pageUrl: string, items: RedirectMapItem[]): MatchedGroup[]`. Maps with zero matched rows are filtered out.
- **Depends on:** T016

#### T021 — Build `lib/redirects/redirect-type-enum.ts` (the 4 enum values)

- **Title:** Source-of-truth list of valid RedirectType values
- **Description:** Pure module. Exports `REDIRECT_TYPES` as a const array of the 4 enum values. The architecture-stage introspection (OQ-8) will close the open question of the exact wire enum names beyond `ServerTransfer`; the assumed values are `'301'`, `'302'`, `'307'`, `'ServerTransfer'` per UI v1 § 1.6. Module also exports a display-name helper (`'301'` displays as `'301 Permanent'`, etc.).
- **Expected Output:** `site/lib/redirects/redirect-type-enum.ts` exports `REDIRECT_TYPES: readonly RedirectType[]` and `redirectTypeLabel(t: RedirectType): string`. The dropdown's options (T038) read from this module.
- **Depends on:** T016
- **assumed-shape:** tests/fixtures/graphql/redirect-type-enum.json

### Epic D — Context Panel (`/context-panel`)

#### T022 — Context Panel page shell + persistent regex banner

- **Title:** Build the panel's outer chrome, banner, and page-context callout
- **Description:** Implement `app/context-panel/page.tsx` as a `'use client'` component using the Blok primitives per UI v1 § 3.1. Outer `<Card>`. Top: persistent `<Alert variant="default">` "Direct-string matches only — regex pattern matches are not yet covered" — non-dismissible. Below: page-context callout (Lucide `MapPin` icon + monospace page URL). Hairline `<Separator />` below. Match this against `pocs/poc-v1/context-panel.html` for spacing and copy.
- **Expected Output:** `/context-panel` route renders the shell at `https://localhost:3000/context-panel`. Visual diff vs `pocs/poc-v1/context-panel.html` is acceptable (smoke gate at T065).
- **Depends on:** T013, T020

#### T023 — Context Panel grouped-by-Map list

- **Title:** Render matched redirects grouped by parent Redirect Map
- **Description:** For each map in `MatchedGroup[]` (from T020), render a group: header row with map name + `RedirectType` badge + flag chips (only chips for flags that are `true`); below, matched mapping rows (`source → target` in mono with the matched side weight 500, the other side `--muted-foreground`); hairline `<Separator />` between groups. Match `pocs/poc-v1/context-panel.html` for layout.
- **Expected Output:** Given a fixture page-context + fixture redirect-map list, the panel renders the correct grouped structure. Empty state when matches are zero (T026).
- **Depends on:** T011, T013, T020, T022

#### T024 — Context Panel "Add redirect for this page" two-step modal

- **Title:** Modal that picks a map (or creates new) and adds a mapping
- **Description:** Per UI v1 § 3.1.2. Step 1: `<Dialog>` titled "Add a redirect for `<pageUrl>`" with a searchable `<Command>` list — first item is "+ Create new Redirect Map", below it existing maps in the current site (name + last-updated). Step 2a (existing map): inline form with read-only source (pre-populated) + target input + recap line; inherits `RedirectType` and flags from the chosen map. Step 2b (create-new): full form with name, RedirectType select (initial empty), 3 flag checkboxes, plus first mapping. Validation per FR-11. Cancel-with-dirty triggers confirm prompt per FR-12. Match `pocs/poc-v1/context-panel-add-modal.html`, `context-panel-add-existing.html`, `context-panel-create-new-map.html`.
- **Expected Output:** Modal opens via "+ Add redirect for this page" button at panel bottom. Both flows succeed against fixture mutations. On success: modal closes, list refreshes, `pages.reloadCanvas` fires.
- **Depends on:** T012, T015, T021, T022

#### T025 — Context Panel inline edit on a mapping row

- **Title:** Click pencil → row inflates inline → Save / Cancel
- **Description:** Per UI v1 § 3.1.3. Pencil icon button on each mapping row (visible on hover/focus) inflates the row in place: source becomes editable, target becomes editable, `Save` and `Cancel` buttons appear. Inline validation. Pristine cancel closes silently; dirty cancel triggers confirm prompt. Save triggers `updateRedirectMap` (T012) which re-serializes `UrlMapping` with the edited row and POSTs the mutation. Optimistic skeleton on the row for 200–300 ms during the in-flight mutation. Match `pocs/poc-v1/context-panel-edit-row.html`.
- **Expected Output:** Edit succeeds against fixture; row settles to new values; success toast fires.
- **Depends on:** T012, T015, T017, T023

#### T026 — Context Panel inline delete on a mapping row

- **Title:** Click trash → inline confirm → delete
- **Description:** Per UI v1 § 3.1.4. Trash icon button replaces the row content for 5 seconds with a small inline confirm: "Delete this mapping? `Yes` `No`". `Yes` triggers `updateRedirectMap` (T012) with the row removed from the mappings list. `No` reverts. Per US-3 AC, if the parent map ends up with zero mappings as a result, the empty map remains intact.
- **Expected Output:** Delete succeeds against fixture; row vanishes; success toast fires.
- **Depends on:** T012, T023

#### T027 — Context Panel loading state

- **Title:** Skeleton state while data is in-flight
- **Description:** Per UI v1 § 3.1.5. Banner + page-context callout + 3 skeleton group blocks (each: skeleton header row over 2 skeleton mapping rows). No "Add" button while loading. `aria-live="polite"` announces "Loading redirects" once on entry. Match `pocs/poc-v1/context-panel-loading.html`.
- **Expected Output:** Loading state visible during in-flight requests; transitions cleanly to default / empty / error.
- **Depends on:** T022

#### T028 — Context Panel empty state

- **Title:** Empty state when no redirects match the current page
- **Description:** Per UI v1 § 3.1.5. Banner + page-context callout + `<EmptyState>` with `Filter` Lucide icon, copy "No redirects affect this page", supporting copy "Add the first one with the button below". `+ Add redirect for this page` button below. Match `pocs/poc-v1/context-panel-empty.html`.
- **Expected Output:** Visible when matcher returns zero groups. The Add button still routes to the same modal as T024.
- **Depends on:** T024

#### T029 — Context Panel error state with collapsible technical details

- **Title:** Friendly error UX per FR-13
- **Description:** Per UI v1 § 3.1.5 + FR-13. `<Alert variant="destructive">` with monochrome `✕` (U+2715 — never the color-emoji codepoint U+274C), summary "Couldn't load redirects for this page.", `<Collapsible>` "Show technical details" containing the verbatim GraphQL error in mono. Retry button. `aria-live="assertive"`. Match `pocs/poc-v1/context-panel-error.html`.
- **Expected Output:** Visible when read or mutation fails. Retry re-fires the failed operation. Focus moves to Retry on first render of the error.
- **Depends on:** T011, T022

#### T030 — Context Panel orchestration: useEffect → page-context → match → render

- **Title:** Wire the four states together with a single state machine
- **Description:** Top-level component subscribes to `subscribePageContext` (T013). On message: triggers `listRedirectMaps` (T011). Combines via `matchPageRedirects` (T020). Renders one of: loading / default / empty / error. Success-toast fires after each successful write (T024–T026). After write, calls `reloadPagesCanvas` (T015).
- **Expected Output:** Full Context Panel surface works end-to-end against fixtures. State transitions are clean (no stuck loading states). Visual fidelity matches `pocs/poc-v1/context-panel*.html` files.
- **Depends on:** T023, T024, T025, T026, T027, T028, T029

### Epic E — Dashboard Widget (`/dashboard-widget`)

#### T031 — Dashboard widget shell + 3 stat tiles

- **Title:** Build the widget chrome and 3 tiles per UI v1 § 3.2
- **Description:** Implement `app/dashboard-widget/page.tsx` as `'use client'`. Outer `<DashboardWidget>` (composite blok). Title row: "Redirects" weight 600 + right-aligned site name caption. Stat tile row: 3 tiles separated by vertical hairline separators (stacks vertically below 480 px). Tiles non-interactive in MVP. Footnote line at bottom: "Redirect counts only — usage analytics ship in a follow-on release." Match `pocs/poc-v1/dashboard-widget.html`.
- **Expected Output:** `/dashboard-widget` renders the shell with 3 placeholder tiles + footnote. Visual diff vs POC acceptable.
- **Depends on:** T008, T014

#### T032 — Dashboard widget data flow: read site → aggregate items → render

- **Title:** Wire the widget's data flow per FR-8
- **Description:** Read current site from `application.context` resourceAccess + parent `site` query param if present (otherwise the first site in the tenant — confirm at smoke). Use `listRedirectMaps` (T011) on the site's `Settings/Redirects` path. Aggregate: `count(items)`, `sum(parsed UrlMapping rows across items)`, `max(__Updated)`. Tiles render the three numbers in `--text-3xl --font-mono` tabular figures. Last-updated tile renders relative for recent (<24h) and absolute for older.
- **Expected Output:** All 3 tile values are non-zero against a fixture site that has redirects.
- **Depends on:** T010, T011, T017, T031

#### T033 — Dashboard widget loading + empty + error states

- **Title:** 3 skeleton tiles + empty state + destructive alert with retry
- **Description:** Per UI v1 § 3.2 states. Loading: 3 skeleton tiles + footnote. Empty: `<EmptyState>` with `RouteOff` icon, copy "No redirects configured for this site." Error: `<Alert variant="destructive">` with friendly + collapsible technical details + retry; footnote stays. Match `pocs/poc-v1/dashboard-widget-loading.html`, `dashboard-widget-empty.html`, `dashboard-widget-error.html`.
- **Expected Output:** All 3 states visible against fixtures. Retry re-fires the read.
- **Depends on:** T032

#### T034 — Dashboard widget a11y wiring

- **Title:** Region landmarks + aria-live + visible labels
- **Description:** Per UI v1 § 4.2. `<section aria-label="Redirects summary for <site>">`. Each tile is `<article aria-label="<N> redirect maps">`. Loading announces "Loading redirect counts." Empty section labelled "No redirects configured". Error `aria-live="assertive"` with focus on Retry.
- **Expected Output:** Screen-reader walkthrough produces the expected announcements at each state transition.
- **Depends on:** T033

### Epic F — Full Page (`/full-page`)

#### T035 — Full Page shell + responsive container

- **Title:** Two-pane layout with tabbed fallback at <960 px
- **Description:** Implement `app/full-page/page.tsx` as `'use client'`. Container hosts top action row + two-pane (rail + right pane) at ≥1024 px, switches to tabbed (`<Tabs>` Picker / Maps / Detail) at 800–960 px. Per UI v1 § 3.3 layout.
- **Expected Output:** Layout responds correctly to viewport changes from 800 to 1920 px. Match `pocs/poc-v1/full-page.html` at default size.
- **Depends on:** T008

#### T036 — Full Page top action row

- **Title:** Breadcrumb + Import / Export / + New map buttons
- **Description:** Per UI v1 § 3.3.1. `<Breadcrumb>` shows "Collection / Site / Map name" with non-link last segment. Right-aligned: `Import` (outline, disabled until site picked), `Export` (outline, same), `+ New map` (primary, same). `+ New map` opens the create form in the right pane (T038). Export triggers JSON download (T047). Import opens the import flow (T049).
- **Expected Output:** Buttons enable/disable based on site selection. Clicks route to correct surfaces.
- **Depends on:** T035

#### T037 — Full Page left rail: collection + site picker + virtualized list

- **Title:** Collection picker → site picker → react-virtuoso list of redirect maps
- **Description:** Per UI v1 § 3.3.2. Collection `<Select>` (full-width inside rail) populated from `listCollections` (T010). Site `<Select>` (full-width, disabled until collection picked) filtered by selected collection. Hairline separator. Redirect-map list: `react-virtuoso` `<Virtuoso>` rendering each row (~36 px) with name (sm/500) + metadata line ("12 mappings · 3 days ago" mono) + `RedirectType` badge right. Selected row: 2 px `--primary` left-edge stripe (other rows: transparent stripe to keep alignment). Arrow keys navigate, Enter selects.
- **Expected Output:** Picker → list flow works against fixtures. Virtualization confirmed at 100+ rows. Selection updates right pane (T038–T039).
- **Depends on:** T010, T011, T035

#### T038 — Full Page right pane: detail editor (form section)

- **Title:** Map attributes form: name + RedirectType + 3 flags + GUID badge
- **Description:** Per UI v1 § 3.3.3 Section 1. Form fields with `react-hook-form` + `zod`: name (`<Input>`, required), `RedirectType` (`<Select>` initial state empty placeholder "Pick a type…", options from T021, required), 3 flag `<Checkbox>` controls. Right side top-aligned: GUID `<Badge variant="outline">` mono showing last 12 chars, click → copy full GUID + toast "GUID copied", `<Tooltip>` on hover shows full GUID. Inline validation per FR-11.
- **Expected Output:** Form renders pre-filled on edit, blank on create. Validation blocks submit on empty fields. Match `pocs/poc-v1/full-page-edit-redirect-map.html` and `full-page-create-redirect-map.html`.
- **Depends on:** T021, T035

#### T039 — Full Page right pane: mappings table with drag-reorder

- **Title:** Compact two-column table with @dnd-kit/core keyboard reorder
- **Description:** Per UI v1 § 3.3.3 Section 2. Each row: drag handle (Lucide `GripVertical`) at far left + source `<Input>` (mono) + `→` glyph + target `<Input>` (mono) + row actions (Save / Cancel / Delete icons). `@dnd-kit/core` keyboard sensor: Space to grab, arrow keys to move, Space to drop. `aria-label` per UI v1 § 4.3 drag-and-drop a11y. `+ Add mapping` ghost button below (full-width). Virtualized via `react-virtuoso` once row count >50.
- **Expected Output:** Drag reorder works via mouse AND keyboard. Add row works. Per-row inline validation. Match POC fidelity.
- **Depends on:** T017, T038

#### T040 — Full Page right pane: bottom action row + Save / Cancel / Delete

- **Title:** Save commits all attribute + mapping changes; Delete opens confirm modal
- **Description:** Per UI v1 § 3.3.3 Section 3. Left: `Delete map` (`destructive-outline`, hidden on create). Right: `Cancel` (ghost) + `Save changes` (primary). Save triggers `updateRedirectMap` (T012) on edit OR `createRedirectMap` on create. Brief skeleton on the button during in-flight (≤3 s p95). On success: toast + refresh rail. On failure: friendly banner (T044). Cancel-with-dirty triggers confirm prompt per FR-12.
- **Expected Output:** Save round-trips against fixture mutations. Delete opens the confirm modal (T041). Cancel-dirty prompts.
- **Depends on:** T012, T038, T039

#### T041 — Full Page delete-map confirmation modal

- **Title:** AlertDialog confirm before delete
- **Description:** Per UI v1 § 3.3.4. `<AlertDialog>` titled "Delete `<map name>`?" Body: "This will remove the map and all `<N>` mappings inside it. This cannot be undone." Cancel (outline) + Delete (destructive). On confirm: `deleteRedirectMap` (T012) fires; on success → toast "Map deleted" + clear selection in rail.
- **Expected Output:** Delete round-trips against fixture mutation.
- **Depends on:** T012, T040

#### T042 — Full Page right pane: empty-no-selection state

- **Title:** "Pick a site to begin" or "Pick a redirect map" empty states
- **Description:** Per UI v1 § 3.3.6. `<EmptyState>` centered with `Inbox` Lucide icon. Copy switches based on selection state: no site → "Pick a site to begin", site picked but no map → "Pick a redirect map". Subtle keyboard hint: "Tip: ↑ / ↓ to navigate the list, Enter to open." Match `pocs/poc-v1/full-page-empty-no-selection.html` and `full-page-no-redirects.html`.
- **Expected Output:** Empty state visible when nothing selected; replaced by detail editor once a map is picked.
- **Depends on:** T035

#### T043 — Full Page right pane: loading-detail state

- **Title:** Form skeletons matching the detail editor structure
- **Description:** Per UI v1 § 3.3.6. While `listRedirectMaps` is in flight or while the detail is settling, render: 1 input-height skeleton (name) + 1 select-height skeleton (type) + 3 checkbox-line skeletons + separator + 5 mapping-row skeletons (each: handle skeleton + 2 input skeletons).
- **Expected Output:** Loading state visible during in-flight reads.
- **Depends on:** T038, T039

#### T044 — Full Page error states (right pane + left rail)

- **Title:** Friendly error banners with retry per FR-13
- **Description:** Per UI v1 § 3.3.6. Right pane: `<Alert variant="destructive">` above the form with verbatim GraphQL error in collapsible "Show technical details", retry button. Left rail: smaller `<Alert variant="destructive">` at top of rail with retry. Match `pocs/poc-v1/full-page-error.html`.
- **Expected Output:** Both error states visible against fixture failures. Retry re-fires the failed operation.
- **Depends on:** T037, T040

#### T045 — Full Page rail: empty-no-collections / empty-no-sites / empty-no-maps states

- **Title:** Three flavors of left-rail empty state per UI v1 § 3.3.6
- **Description:** Empty-no-collections: `<EmptyState>` "No collections found", supporting copy "Check Cloud Portal access". Empty-no-sites: "No sites in this collection". Empty-no-maps: "No redirect maps for this site yet" with primary `+ New map` button.
- **Expected Output:** All three states visible based on the rail's current loaded data.
- **Depends on:** T037

#### T046 — Full Page success toasts via Sonner

- **Title:** Sonner toasts on save / delete / export / import outcomes
- **Description:** Per UI v1 § 3.3.6. After successful create / update / delete: toast in bottom-right with `✓` glyph + friendly summary ("Redirect map saved", "Mapping updated", "Map deleted"). Toast wrapper has `role="status" aria-live="polite"`. Auto-dismiss in 3 s; click to dismiss earlier. The Sonner provider lives in `app/layout.tsx` so all routes share it.
- **Expected Output:** Toasts appear for every successful write across the Full Page surface (and Context Panel — shared provider).
- **Depends on:** T040, T041

### Epic G — Import / Export (Full Page)

#### T047 — Export JSON download

- **Title:** Emit `redirect-manager/v1` JSON file download for the selected site
- **Description:** Per FR-9 + UI v1 § 3.3.5. On `Export` click: read all Redirect Map items for the current site (T011), serialize to the `redirect-manager/v1` JSON shape (T018 schema), trigger a browser download as `redirects-<site>-<ISO-timestamp>.json`. Each item record includes the Sitecore item GUID. No analytics fields. Toast "Exported N redirect maps for `<site>`".
- **Expected Output:** Download fires; JSON parses and re-validates against the Zod schema (T018). For a typical site (≤30 items, ≤500 mappings) export completes in ≤5 seconds.
- **Depends on:** T011, T017, T018, T036, T046

#### T048 — Import flow: step 1 Upload

- **Title:** File-upload dialog accepting .json
- **Description:** Per UI v1 § 3.3.5 step 1. Right pane switches into the import flow. Title "Import redirects". `<Input type="file">` accepting `.json`. `<Alert variant="default">` reminder: "Tip: export the current site first as a backup before importing." Sticky Cancel at top-right.
- **Expected Output:** File selection moves to step 2 (T049). Cancel returns to detail.
- **Depends on:** T036

#### T049 — Import flow: step 2 Schema validation

- **Title:** Validate the uploaded JSON against the redirect-manager/v1 schema
- **Description:** Per UI v1 § 3.3.5 step 2 + NFR-Sec2. On file selection: read text, JSON.parse, run T018 `validateExport`. On parse or schema failure: render `<Alert variant="destructive">` with friendly copy + collapsible technical details. Cancel + "Choose another file" buttons. No way to proceed past validation errors.
- **Expected Output:** Malformed JSON, wrong schema version, or missing required fields all reject before any preview is shown.
- **Depends on:** T018, T048

#### T050 — Import flow: step 3 Preview screen

- **Title:** Diff-aware preview with summary header, bulk action, virtualized list
- **Description:** Per UI v1 § 3.3.5 step 3. Layout:
  - Summary header: "Importing N redirect maps into `<site>` (`<collection>`). N new · N conflicting · N unchanged."
  - Bulk action `<Select>`: "Apply same action to all conflicts" — `(no bulk action)` / `Create` / `Overwrite` / `Skip`. Setting it syncs every conflicting row's per-row picker.
  - Virtualized item list (`react-virtuoso`): each row ~44 px with classification badge (`New` / `Conflict` / `Unchanged`), name, GUID truncated to last 12 chars (mono), `Show diff` collapsible toggle, action picker right.
  - Per-row action picker: `<Select>` with `Create` / `Overwrite` / `Skip`. `New` items default to `Create`. `Unchanged` items default to `Skip`. `Conflict` items: empty initial value (placeholder "Pick action…") with red dot indicator until picked.
  - `Show diff` reveals collapsible per-row diff: 2-column current/incoming on `Name`, `RedirectType`, 3 flags, plus mapping-level sub-diff (added / removed / changed-source-or-target).
- **Expected Output:** Preview renders correctly against fixture exports. Match `pocs/poc-v1/full-page-import-preview.html`.
- **Depends on:** T019, T037, T049

#### T051 — Import flow: step 3 bottom actions + Confirm-disabled-until-resolved

- **Title:** Cancel + Confirm import button with disabled-until-all-conflicts-picked semantics
- **Description:** Per UI v1 § 3.3.5 step 3 bottom + PRD US-10 AC. Cancel returns to detail. Confirm import is `<Button variant="primary">` disabled until every conflict row has an explicit action. When disabled, `<Tooltip>` on hover: "Resolve all conflicts to enable import" with the count of unresolved conflicts.
- **Expected Output:** Confirm enables only when every `Conflict` row has a non-empty action picker value. Tooltip count is accurate.
- **Depends on:** T050

#### T052 — Import flow: step 4 Apply with progress bar

- **Title:** Sequential per-item mutations with `<Progress>` bar
- **Description:** Per UI v1 § 3.3.5 step 4 + PRD § 12 NFR-P5. On Confirm: iterate the items in order; for each: `Skip` is a no-op; `Create` calls `createRedirectMap` (T012); `Overwrite` calls `updateRedirectMap`. `<Progress>` bar shows `n/N items applied`. Capture per-item success / fail (with error message). 100 mappings end-to-end ≤30 s per NFR-P5.
- **Expected Output:** Apply runs to completion. Per-item outcomes captured for the summary (T053). No transactional rollback (per FR-10).
- **Depends on:** T012, T051

#### T053 — Import flow: step 4 Summary screen

- **Title:** Per-item success / fail summary with "Retry failed items only"
- **Description:** Per UI v1 § 3.3.5 step 4. Title: "Import complete" or "Import completed with issues" if any failures. Counter pills: `Created: N`, `Overwritten: N`, `Skipped: N`, `Failed: N` (`--destructive` accent if non-zero). Detail list: failed items expanded by default; success items collapsed under "View all" toggle. Each failed row shows: item name + GUID + collapsible technical error. Footer: `Done` (primary, returns to detail) + `Retry failed items only` (visible only if failures, re-runs apply targeting only failed GUIDs). Match `pocs/poc-v1/full-page-import-summary.html`.
- **Expected Output:** Summary visible after every apply. Retry-failed-only re-runs T052 with only the failed items.
- **Depends on:** T052

#### T054 — Import flow: a11y polish

- **Title:** aria-live announcements + per-row aria labels per UI v1 § 4.2 + § 4.3
- **Description:** Each preview row: `<article aria-label="<name>, <classification>">`. Confirm button `aria-disabled` with announcement of unresolved count. Action picker `aria-required` for Conflict rows. Apply progress: announce "X of N items imported" throttled to 10 % progress. Settle: "Import complete: X of N succeeded" or "Import completed with Y failures." (polite).
- **Expected Output:** Screen-reader walkthrough of the import flow produces the expected announcements at each step.
- **Depends on:** T053

### Epic H — Theme + a11y polish (cross-surface)

#### T055 — Cross-surface focus-visible audit

- **Title:** Verify every focusable element shows the Blok `--ring` outline on focus-visible
- **Description:** Per NFR-A4. Walk every interactive element across all 3 surfaces with keyboard only. Confirm `:focus-visible` ring fires (mouse click does not show ring). Fix any that show `outline: none` without a replacement.
- **Expected Output:** Manual checklist covering every element. Zero focusable elements without a visible focus ring.
- **Depends on:** T030, T034, T046, T053

#### T056 — Cross-surface aria-live audit

- **Title:** Verify all state transitions announce per UI v1 § 4.3
- **Description:** Walk loading / settle / save / error / import-progress / import-settle transitions. Confirm announcements fire in the right `aria-live` channel (polite vs assertive). Throttle import progress to once per 10 %.
- **Expected Output:** Manual checklist with screen-reader recording per transition. All expected announcements present.
- **Depends on:** T030, T034, T046, T053

#### T057 — Cross-surface monochrome glyph audit

- **Title:** Replace any color-emoji codepoints with monochrome equivalents
- **Description:** Per `blok-theming` "Color-emoji codepoints" + agent identity. Forbidden codepoints: U+274C, U+2705, U+26A0+VS16, U+2757. Use `✕` U+2715, `✓` U+2713, `⚠` U+26A0 (without VS16). Run a regex grep for those forbidden codepoints across `app/`, `components/`, `lib/` and confirm zero matches.
- **Expected Output:** No color-emoji glyphs anywhere in the source. All status icons are monochrome `currentColor`-inheriting glyphs.
- **Depends on:** T030, T034, T046, T053

#### T058 — Cross-surface dark-mode contrast verification

- **Title:** Verify the `--primary-foreground` dark-mode override holds on all surfaces
- **Description:** Walk every primary button + every Blok element using `bg-primary text-primary-foreground` in dark mode. Confirm dark text on lavender (`primary-200`) — never white-on-lavender. If Blok's Nova preset has been bumped and silently re-collapsed `--primary-foreground` to `--color-white`, the override in `app/globals.css` (T007) takes precedence; the structural test (T062) fails the build if the override is missing.
- **Expected Output:** Manual screenshot pairs (light + dark) on every surface confirming primary buttons render dark-on-lavender in dark mode.
- **Depends on:** T007, T055, T062

### Epic I — Test stack and structural guards

#### T059 — Vitest unit tests for SDK wrappers

- **Title:** Vitest tests for lib/sdk/* using mock client
- **Description:** Use the typed mock-client pattern from `sitecore:marketplace-sdk-client`. Cover request-shape (params + body) and response-unwrap (single vs double `.data`) for all 9 SDK calls. Fixtures from `tests/fixtures/graphql/`. Read fixture is captured (PRD § 9); write fixtures are placeholders with assumed-shape annotations until the divergence-detection workflow lands them. Tests run from `npm run test`.
- **Expected Output:** `tests/unit/sdk/*.test.ts` covering `sites.test.ts`, `redirects-read.test.ts`, `redirects-write.test.ts`, `page-context.test.ts`, `application-context.test.ts`, `canvas-reload.test.ts`. All green against fixtures.
- **Depends on:** T010, T011, T012, T013, T014, T015

#### T060 — Vitest property-based tests for UrlMapping round-trip

- **Title:** fast-check property tests for parse/serialize stability
- **Description:** Per ADR-0008 + PRD R3. Property: `parse(serialize(rows)).rows === rows` for arbitrary `Mapping[]` (excluding empty source/target). Edge cases: case differences in URL-encoding (`%2f` vs `%2F`), `=` or `&` literal in source/target (must encode), operator-defined ordering preserved. Plus a parse-warning test: malformed segments produce warnings, not throws.
- **Expected Output:** `tests/unit/url-mapping/round-trip.test.ts` covering at least 100 fast-check iterations. Edge-case tests for `%2f`/`%2F` parity, literal `=` / `&`, ordering, malformed segments.
- **Depends on:** T017

#### T061 — Vitest unit tests for domain layer

- **Title:** Tests for diff classifier, schema validator, matcher
- **Description:** `lib/import-export/diff.ts`: classify a fixture pair into `new` / `conflicting` / `unchanged` with correct field diffs. `lib/import-export/schema.ts`: accept `redirect-manager/v1`, reject `redirect-manager/v2`, reject malformed JSON, reject >1000 items. `lib/match/context-panel-matcher.ts`: exact source match, exact target match, both-side match, no-match, regex-source skipped (per ADR-0005 — regex sources never match in MVP).
- **Expected Output:** `tests/unit/import-export/*.test.ts`, `tests/unit/match/*.test.ts`. All green.
- **Depends on:** T018, T019, T020

#### T062 — Structural tests (boundary + a11y + theme guards)

- **Title:** Static-grep tests that fail the build on architectural drift
- **Description:** Three structural tests in `tests/structural/`:
  - **SDK boundary**: only `lib/sdk/*` and `components/providers/marketplace.tsx` may import `@sitecore-marketplace-sdk/*`. Pattern modeled on `products/last-edit-trail/site/__tests__/structural.test.ts`.
  - **No raw HTML injection**: a regex grep for the React unsafe-HTML prop name AND for `\.innerHTML\s*=` returns zero matches under `app/`, `components/`, `lib/` (NFR-Sec3). The forbidden React prop name is constructed at test time from string fragments to avoid the literal token tripping security tooling — the test imports nothing dangerous; it only reads source files via `fs` and runs a regex.
  - **Dark-mode `--primary-foreground` override present**: `app/globals.css` contains `--primary-foreground: var(--color-blackAlpha-900)` inside both `@media (prefers-color-scheme: dark)` and `.dark` blocks, with the override-comment naming the date.
- **Expected Output:** `tests/structural/sdk-boundary.test.ts`, `no-html-injection.test.ts`, `theme-override.test.ts`. All green; each fails the build on regression.
- **Depends on:** T007, T008

### Epic J — Marketplace install + smoke

#### T063 — Cloud Portal Test App registration runbook

- **Title:** `docs/architecture.md` runbook with the 8-field paste-in for App Studio
- **Description:** Per architecture § 6.2 + PRD OQ-7. Document in `products/redirect-manager/site/docs/architecture.md`: role required (`Organization Admin` or `Organization Owner`), App name, Custom-vs-public (Custom for MVP), App URL (dev + prod), the 3-row extension-point paste table from architecture § 2.2, API access scopes (`Authoring`, `Sites` only — NO AI scopes, NO Publishing/Live), Authorization type (Portal-brokered), HTTPS+mkcert local-dev steps from `sitecore:marketplace-sdk-testing-debug`. The README at `products/redirect-manager/site/README.md` links to this runbook.
- **Expected Output:** Operator follows the runbook end-to-end and the app is registered + reachable on a real tenant.
- **Depends on:** T006

#### T064 — Host-frame visual smoke harness at `/test`

- **Title:** Build the smoke-comparison page per `sitecore:marketplace-sdk-host-frame-testing`
- **Description:** Implement `app/test/page.tsx` that renders all three extension routes side-by-side with the corresponding POC clickdummy frames. Apply the canonical 5-axis pixel comparison (per the skill). Use `pocs/poc-v1/*.html` as the visual ground truth.
- **Expected Output:** Visiting `/test` shows the comparison grid. The smoke gate passes when all three extension points match within tolerance against the POC.
- **Depends on:** T030, T034, T046, T053

#### T065 — Real-tenant CRUD round-trip checklist

- **Title:** `docs/smoke-crud.md` checklist for the m3 success metric
- **Description:** Per PRD m3. Checklist of operations against a real tenant:
  - Create a Redirect Map item with 3 mappings via Full Page; verify it appears in Content Editor under `/sitecore/content/.../Settings/Redirects/`.
  - Edit one mapping (change target URL) via Context Panel; verify Authoring GraphQL persists the new value.
  - Delete the Redirect Map item; verify it's gone from Content Editor.
  - Each operation completes in <10 seconds end-to-end (form submit → UI confirm).
- **Expected Output:** `products/redirect-manager/site/docs/smoke-crud.md` + a corresponding entry in the run manifest's `smoke_outcomes`.
- **Depends on:** T030, T040, T041, T063

#### T066 — Real-tenant import / export round-trip checklist

- **Title:** `docs/smoke-import-export.md` checklist for the m4 success metric
- **Description:** Per PRD m4. Checklist:
  - Export site A's redirect set via Full Page; download JSON.
  - Switch to site B (different site or environment). Import the JSON.
  - Verify schema validation passes.
  - Verify preview shows the correct classification breakdown.
  - Pick actions for conflicts; click Confirm.
  - Verify summary reports zero failures (or document any failures + their cause).
  - Re-export site B. Diff against the original site A export should show only environmental differences (GUIDs of newly minted items if `createItem` doesn't accept supplied IDs — see ADR-0009 consequence).
- **Expected Output:** `products/redirect-manager/site/docs/smoke-import-export.md` + run-manifest `smoke_outcomes` entry.
- **Depends on:** T047, T053, T063

#### T067 — Live-walkthrough checklist for m5

- **Title:** `docs/smoke-live-walkthrough.md` for the ≥5-minute editor exploration
- **Description:** Per PRD m5. Operator (preferably non-author of this app) opens Pages on a real tenant, navigates pages with redirects, opens the Context Panel, edits a redirect, opens the Dashboard widget, opens the Full Page, drives the rail picker, opens a few Redirect Maps, drags a mapping to reorder, runs an export, runs an import. Total time ≥5 minutes; friction-log captures any unrecoverable errors (must be zero to pass m5).
- **Expected Output:** `products/redirect-manager/site/docs/smoke-live-walkthrough.md` + run-manifest `smoke_outcomes` entry. Zero unrecoverable errors observed during the walkthrough.
- **Depends on:** T065, T066

## 4b. Important Test Cases (by epic / feature)

*Enriched by QA Specialist (07) — 2026-05-10. This section operates at the epic level for human readers. The per-task behavioral contracts (with fixture citations, divergence-detection patterns, and RED test specs) live in § 10. The TDD mandate, property-based testing requirement, fixture provenance rules, and smoke gate matrix live in § 9. Do NOT duplicate § 10 detail here — this section is the human-readable summary only.*

The QA Specialist enriched and confirmed the following test cases from the Lead Developer's seed. Cases marked **[assumed-shape]** touch unverified SDK shapes; their divergence-detection assertions are in the corresponding § 10 task spec.

- **Epic A — Scaffold**
  - Scaffold output is reproducible (T001 → T007 land identical bytes on a clean machine, modulo lockfile timestamps). (regression)
  - Three extension routes return 200; root returns 404. (UI smoke)
  - Vitest test command exits 0 on fresh scaffold. (unit)

- **Epic B — SDK plumbing**
  - `requireContextId` throws a typed error when `resourceAccess[0].context.preview` is undefined. (unit)
  - Each SDK wrapper unwraps the correct depth (single `.data` for mutate + base map; double `.data.data` for xmc module queries). (unit, fixture-driven)
  - **assumed-shape divergence cases** — write fixtures intentionally vary in shape; tests must fail loudly when divergence-detection captures the real shape and the fixture is updated. (unit, fixture-driven, **assumed-shape**)

- **Epic C — Domain layer**
  - `parse(serialize(rows)).rows === rows` for 100 fast-check iterations. (property)
  - `parse` produces warnings (not throws) on malformed segments. (unit)
  - `validateExport` rejects `redirect-manager/v2`, malformed JSON, >1000 items. (unit)
  - `classifyImport` correctly classifies new/conflicting/unchanged items by GUID. (unit)
  - `matchPageRedirects` skips regex sources entirely (no false positive). (unit)

- **Epic D — Context Panel**
  - Empty page-URL never crashes the matcher. (unit)
  - Modal flow: existing-map vs create-new produces correct mutation payloads. (UI)
  - Cancel-with-dirty triggers confirm prompt; pristine-cancel closes silently. (UI)
  - `pages.reloadCanvas` fires on every successful write. (UI, fixture-driven)
  - Loading → settle → error → retry transitions. (UI)

- **Epic E — Dashboard Widget**
  - 3 tile aggregates match expected values for a fixture site. (unit)
  - Empty state visible when site has zero redirects. (UI)
  - Tiles non-interactive in MVP (no hover affordance, no click handler). (UI)

- **Epic F — Full Page**
  - Picker → list → detail flow against fixtures. (UI)
  - Drag-reorder (mouse + keyboard) preserves operator-defined order in the serialized `UrlMapping`. (UI + unit)
  - Save round-trips correctly for create / edit / delete. (UI, fixture-driven, **assumed-shape**)
  - Cancel-with-dirty in detail editor triggers confirm. (UI)
  - Tabbed-fallback layout activates at <960 px. (UI)

- **Epic G — Import / Export**
  - Export round-trips: parse(export(items)) === items modulo timestamps. (unit + UI)
  - Import schema validation rejects malformed JSON before any preview. (unit)
  - Conflict picker — Confirm disabled until all picked; tooltip count accurate. (UI)
  - Per-item failure during apply doesn't block subsequent items; summary captures all outcomes. (UI, fixture-driven, **assumed-shape**)
  - Retry-failed-only re-runs only failed GUIDs. (UI)

- **Epic H — Theme + a11y**
  - Every focusable element shows `--ring` on focus-visible. (visual + a11y)
  - Dark-mode `--primary-foreground` override holds on every primary button. (visual + structural test T062)
  - Zero color-emoji codepoints (grep). (structural)

- **Epic I — Test stack**
  - SDK boundary structural test fails the build on direct `@sitecore-marketplace-sdk/*` import outside `lib/sdk/`. (structural)
  - No-HTML-injection structural test fails the build on use of the React unsafe-HTML prop. (structural)
  - Theme-override structural test fails the build if the dark-mode `--primary-foreground` flip is missing. (structural)

- **Epic J — Smoke gates**
  - host-frame visual smoke at `/test` matches POC for all 3 extension points. (E2E visual)
  - Real-tenant CRUD round-trip succeeds end-to-end <10 s per op. (E2E manual)
  - Real-tenant import / export round-trip succeeds with zero rule loss. (E2E manual)
  - Live walkthrough ≥5 min produces zero unrecoverable errors. (E2E manual)

## 4c. Implementation execution contract (for Developer 08)

**Note to Developer 08:** This subsection is your single source for non-code context during `/implement`. You should NOT need to open the architecture document, the UI spec, or any ADR file. If you find yourself needing one of those, that means § 4c is incomplete — open a friction-log entry and continue.

### 4c-1. Non-negotiable technical boundaries

- **Mode A only — no server-side OAuth proxy, no `experimental_createXMCClient`, no Auth0 / `@auth0/nextjs-auth0`.** ADR-0002. The app is a static-rendered Next.js bundle; every Sitecore call rides the operator's Cloud Portal session.
- **Authoring GraphQL is the single canonical source for redirect rules.** ADR-0003. No second data store. No localStorage/sessionStorage for redirect data. No Upstash, no Redis, no KV, no IndexedDB.
- **`en` only.** ADR-0010. Every Authoring GraphQL call passes `language: "en"` — both reads and mutations. The UI does not show a language switcher anywhere.
- **Import matches by Sitecore item GUID.** ADR-0009. The export JSON includes the GUID for every item; the importer keys diff classification on `id`.
- **Context Panel matches direct strings only.** ADR-0005. No regex evaluation. The persistent banner explicitly states this — non-dismissible.
- **`UrlMapping` round-trip is lossless.** ADR-0008. Operator-defined row order is authoritative. Property-tested via fast-check.
- **List virtualization via `react-virtuoso`.** ADR-0012. Used in: redirect-map list (Full Page rail), mappings table (>50 rows), import preview list.
- **Three Cloud Portal extension routes only:** `/context-panel` (`xmc:pages:contextpanel`), `/dashboard-widget` (`xmc:dashboardblocks`), `/full-page` (`xmc:fullscreen`). Root `/` returns `notFound()`. ADR-0011. Cloud Portal binds by extension-point route URL — never by `/`.
- **One ClientSDK init.** The `MarketplaceProvider` singleton in `app/layout.tsx` is the only place `ClientSDK.init` runs. Every other call site uses `useMarketplaceClient()` / `useAppContext()`.
- **SDK boundary lock.** Only `lib/sdk/*` and `components/providers/marketplace.tsx` may import `@sitecore-marketplace-sdk/*`. Enforced by structural test T062. Components and `lib/{domain,url-mapping,import-export,match,redirects}/*` are SDK-blind.
- **`sitecoreContextId = .preview` for ALL `xmc.*` calls.** Architecture § 5.7. Never `.live` in MVP. Access only through `requireContextId()` (T009) — no `as string` casts on `appCtx?.resourceAccess?.[0]?.context?.preview`.
- **No raw HTML React props anywhere; no direct `.innerHTML` writes.** NFR-Sec3. Enforced by structural test T062.
- **No analytics, no Upstash, no head-app dependency.** Deferred to PRD-001 / PRD-002. Don't add an `UsageCount` field anywhere; don't add Upstash / Redis / KV; don't add head-app instrumentation.
- **Container.** All source code lives under `products/redirect-manager/site/`. The branch is `prd-000`.

### 4c-2. ADR one-liners

- **ADR-0001:** ADRs are the architecture backbone — one decision per ADR, located in `project-planning/ADR/`. Cite by number; never re-litigate accepted ADRs.
- **ADR-0002:** Scaffold via `sitecore:setup-marketplace-client-side` (Mode A only). No server-side OAuth proxy. No Auth0. The app is a static-rendered Next.js bundle.
- **ADR-0003:** Authoring GraphQL is the single canonical source for redirect rules in MVP. No second data store of any kind.
- **ADR-0004:** Three-PRD phasing — PRD-000 ships pure Sitecore CRUD in `en` only; PRD-001 brings multilingual + analytics; PRD-002 brings sync-back. Don't pre-build for later PRDs.
- **ADR-0005:** Context Panel matching is exact-string only in MVP. Regex sources are skipped entirely. Persistent non-dismissible banner is mandatory.
- **ADR-0006:** Import conflict resolution = per-item action picker with three actions (create / overwrite / skip) + collapsible diff preview + "apply same action to all conflicts" bulk control + disabled-confirm-until-resolved.
- **ADR-0007:** Tenant identifier for cross-environment scoping = `tenantId` from `application.context.resourceAccess[0]`. Stable across sessions.
- **ADR-0008:** `UrlMapping` field encoding = URL-encoded source=target pairs joined by `&`. Round-trip parse/serialize is lossless. Uppercase hex on serialize; case-insensitive on parse. Operator-defined row order is authoritative.
- **ADR-0009:** Import matches incoming items to target items by Sitecore item GUID, not by name. Cross-environment promotion depends on stable item IDs. **Caveat:** if Authoring `createItem` does not accept caller-supplied GUIDs, "create" actions on cross-environment imports mint new GUIDs — pending real-tenant verification.
- **ADR-0010:** MVP language scope = `en` only. Multilingual CRUD deferred to PRD-001.
- **ADR-0011:** Extension-point identifiers and route URLs (see § 4c-1). Root `/` returns `notFound()` — provider-trap mitigation.
- **ADR-0012:** List virtualization via `react-virtuoso`. Blok-compatible primitive. Supports `aria-rowindex` for screen-reader compliance.
- **ADR-0013:** Real-tenant fixture-capture workflow — assumed shapes are used now (operator decision 2026-05-10), fixtures land in `tests/fixtures/graphql/` as the divergence-detection workflow captures them. Tasks touching unverified shapes carry `assumed-shape: <fixture-filename>` annotations.

### 4c-3. Stack / tooling specifics

- **Package manager:** **`npm`** (scaffold default). Do NOT switch to pnpm — the scaffold's lockfile is `package-lock.json`.
- **Working directory:** `products/redirect-manager/site/`. ALL `npm` commands run from here.
- **Scaffold command (T001):** `cd products/redirect-manager && npx shadcn@latest add https://blok.sitecore.com/r/marketplace/next/quickstart-with-client-side-xmc.json` — answer prompts: directory `site`, app name `redirect-manager`, install Blok, install Vitest. Then flatten `next-app/` per `sitecore:setup-marketplace-client-side` § Scaffold if scaffold creates a nested folder. Run literally per rule `50-scaffold.mdc`. **If the scaffold fails: HARD STOP and report.** Do not hand-write `package.json` / `next.config.*` from training data.
- **Blok install (T003):** `npx shadcn@latest add @blok/alert @blok/alert-dialog @blok/badge @blok/breadcrumb @blok/button @blok/card @blok/checkbox @blok/collapsible @blok/command @blok/dialog @blok/draggable @blok/dropdown-menu @blok/empty-states @blok/error-states @blok/icon @blok/input @blok/label @blok/popover @blok/progress @blok/scroll-area @blok/select @blok/separator @blok/skeleton @blok/sonner @blok/tabs @blok/tooltip @blok/dashboard-widget`
- **Runtime deps (T004):** `npm install react-virtuoso @dnd-kit/core react-hook-form zod` + `npm install --save-dev fast-check`. `lucide-react` may already be in the Blok dependency tree.
- **Forbidden packages:** `@sitecore/blok-theme` (Chakra v1 — replaced by current Blok), `experimental_createXMCClient` (would imply Mode B — supersedes ADR-0002), `@auth0/nextjs-auth0` (Mode A is portal-brokered).
- **Test runner:** **Vitest + jsdom** (scaffold default). Config at `vitest.config.ts` or `.mts`. Run: `npm run test` (all) / `npm run test -- <pattern>` (filtered) / `npm run test -- --run` (single-pass for CI).
- **Lint:** `npm run lint` (Next.js scaffold default). Apply Badge-API fix from `sitecore:setup-marketplace-client-side` § Lint+Badge fixes if the lint complains about a Blok primitive.
- **Typecheck:** `npm run typecheck` or `npx tsc --noEmit`. Strict TypeScript per rule `10-language.mdc`.
- **Dev server:** `npm run dev -- --experimental-https`. HTTPS+mkcert is mandatory (iframe handshake won't succeed over HTTP). Serves at `https://localhost:3000`. Smoke routes: `/context-panel`, `/dashboard-widget`, `/full-page`. Root `/` → 404.
- **Build:** `npm run build` (static-rendered Next.js bundle). Output is the deployable artifact.
- **Test app registration runbook** (T063): `products/redirect-manager/site/docs/architecture.md`. Required role: `Organization Admin` or `Organization Owner`. Custom-vs-public: Custom for MVP. API access scopes: `Authoring`, `Sites` only — NO AI scopes, NO Publishing/Live scopes.

### 4c-4. UI implementation notes

**Visual source of truth:** `products/redirect-manager/pocs/poc-v1/` — the HTML clickdummy is the canonical visual reference. Open the relevant HTML files during implementation to match look-and-feel. When this breakdown's prose and the clickdummy diverge on visual details, the clickdummy wins.

**Per-surface POC files:**
- Context Panel: `context-panel.html`, `context-panel-add-modal.html`, `context-panel-add-existing.html`, `context-panel-create-new-map.html`, `context-panel-edit-row.html`, `context-panel-empty.html`, `context-panel-error.html`, `context-panel-loading.html`.
- Dashboard Widget: `dashboard-widget.html`, `dashboard-widget-empty.html`, `dashboard-widget-error.html`, `dashboard-widget-loading.html`.
- Full Page: `full-page.html`, `full-page-create-redirect-map.html`, `full-page-edit-redirect-map.html`, `full-page-empty-no-selection.html`, `full-page-error.html`, `full-page-import-preview.html`, `full-page-import-summary.html`, `full-page-no-redirects.html`.

**Theme tokens (Blok semantic tokens — never invent or hex-code):**
- Surfaces: `--background`, `--card`, `--popover`.
- Text: `--foreground`, `--muted-foreground`, `--card-foreground`.
- Interaction: `--primary` + `--primary-foreground` + `--ring`.
- State: `--destructive` + `--destructive-foreground` + `--destructive-background`; `--success` + `--success-foreground` + `--success-background`; `--warning` + `--warning-foreground` + `--warning-background`; `--info`.
- Borders: `--border`, `--border-a11y`, `--input`.
- Type scale: `--text-2xs`, `--text-xs`, `--text-sm`, `--text-base`, `--text-md`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`.
- Fonts: `--font-sans` (Geist Sans + system fallback), `--font-mono` (Geist Mono + system fallback). Already shipped via Blok Nova preset — do NOT add raw Google Fonts.
- Radius: `--radius-sm` (badges, buttons), `--radius-md` (inputs), `--radius-lg` (cards/dialogs). Do NOT use any larger radius — too soft for an operator tool.
- Shadows: `--shadow-xs`, `--shadow-sm` ONLY. Larger shadows clip at iframe edges.

**Non-negotiable theme contract — dark-mode `--primary-foreground` override:**

The Nova preset (and the sibling `last-edit-trail/site/app/globals.css` it was copied from) sets `--primary-foreground: var(--color-white)` in BOTH the light and the dark blocks. In dark mode `--primary` becomes `primary-200` (light lavender `#d9d4ff`) — white-on-lavender is unreadable. The POC's `theme.css` flips `--primary-foreground` to `var(--color-blackAlpha-900)` in dark mode. **Implementation must carry the same override** in `app/globals.css` inside both `@media (prefers-color-scheme: dark) :root:not(.light) { ... }` AND `.dark { ... }`. The override is tested by structural test T062. If Blok bumps the Nova preset and silently re-collapses the pair, the override stays — it is an intentional contract, not a workaround.

The override comment from `pocs/poc-v1/theme.css` lines 156-160 must be preserved verbatim to document the contract:

```css
/* Dark-mode contrast fix (Christian flagged 2026-05-10): in dark mode --primary
   becomes primary-200 (#d9d4ff, light lavender). The Nova/sibling preset set
   --primary-foreground: white, producing white-on-lavender = unreadable.
   Flip to dark so primary buttons render dark-text-on-lavender (WCAG AA). */
```

**POC-only convenience that does NOT ship:** `pocs/poc-v1/theme-toggle.js` is a per-frame Light/Dark/System toggle pill for clickdummy navigation. Production behavior: the Marketplace app inherits theme from Cloud Portal — no toggle in the live app.

**Glyphs and icons:**
- Status glyphs are monochrome `currentColor`-inheriting Unicode — `✓` U+2713 (success), `✕` U+2715 (error), `⚠` U+26A0 *without* VS16 (warning), `→` U+2192 (mapping arrow). NEVER use color-emoji codepoints (U+274C, U+2705, U+26A0+VS16, U+2757). Enforced by T057 audit.
- All other icons via `lucide-react`: `MapPin`, `Filter`, `Inbox`, `RouteOff`, `Plus`, `Pencil`, `Trash2`, `GripVertical`, `ChevronRight`, `AlertCircle`. Already in the Blok dependency tree.

**Density and spacing rhythm:**
- Row heights: redirect-map list ~36 px, mapping table rows ~28 px, top action row ~52 px.
- Hairline `<Separator />` between rows in lists; never multi-pixel borders inside list rhythm.
- Selected redirect-map row: 2 px `--primary` left-edge stripe; other rows: transparent stripe (preserves alignment).
- Focus rings: Blok default via `--ring` — `:focus-visible` only (mouse click does not show ring).

**State coverage per surface (default / loading / empty / error / focus / success-toast):** every state has a POC file. Implement the state with the matching POC's HTML/CSS as the visual truth.

**Iframe constraints:**
- Context Panel: 320–400 px wide, scrollable. **No topbar.**
- Dashboard Widget: 300–800 px × 200–400 px. Single widget; no internal navigation.
- Full Page: 1024–1920 px × 600–1080 px. Two-pane at ≥1024 px; tabbed fallback at 800–960 px.
- Shadows clip at iframe edges — use `shadow-sm` only.

### 4c-5. File / module structure and naming conventions

```
products/redirect-manager/site/
├── app/
│   ├── layout.tsx                          # Root layout — hosts MarketplaceProvider
│   ├── globals.css                         # Blok tokens + dark-mode --primary-foreground override
│   ├── page.tsx                            # Root — returns notFound()
│   ├── context-panel/page.tsx              # Extension route 1 (xmc:pages:contextpanel)
│   ├── dashboard-widget/page.tsx           # Extension route 2 (xmc:dashboardblocks)
│   ├── full-page/page.tsx                  # Extension route 3 (xmc:fullscreen)
│   └── test/page.tsx                       # Host-frame visual smoke harness
├── components/
│   ├── providers/marketplace.tsx           # MarketplaceProvider — single ClientSDK init point
│   ├── ui/                                 # Blok primitives (installed via shadcn)
│   ├── context-panel/                      # Surface-specific components
│   │   ├── PanelShell.tsx, MatchGroup.tsx, AddRedirectModal.tsx, MappingRow.tsx, …
│   ├── dashboard-widget/
│   │   ├── WidgetShell.tsx, StatTile.tsx, …
│   └── full-page/
│       ├── PageShell.tsx, LeftRail.tsx, DetailEditor.tsx, MappingsTable.tsx,
│       ├── ImportFlow.tsx, ImportPreview.tsx, ImportSummary.tsx, …
├── lib/
│   ├── sdk/                                # SDK boundary — only place that imports @sitecore-marketplace-sdk/*
│   │   ├── require-context-id.ts
│   │   ├── sites.ts
│   │   ├── redirects-read.ts
│   │   ├── redirects-write.ts
│   │   ├── page-context.ts
│   │   ├── application-context.ts
│   │   └── canvas-reload.ts
│   ├── domain/types.ts                     # RedirectMapItem, Mapping, RedirectType
│   ├── url-mapping/{parse,serialize}.ts    # Pure ADR-0008 round-trip
│   ├── import-export/{schema,diff}.ts      # Zod schema + GUID-keyed diff
│   ├── match/context-panel-matcher.ts      # Pure exact-string matcher (ADR-0005)
│   └── redirects/redirect-type-enum.ts     # 4 enum values + display labels
├── tests/
│   ├── setup.ts                            # jsdom polyfills
│   ├── fixtures/graphql/                   # Real-tenant captured + assumed-shape fixtures
│   ├── unit/                               # Vitest unit + property tests
│   └── structural/                         # Boundary + a11y + theme guards
└── docs/
    ├── architecture.md                      # Test App registration runbook (T063)
    ├── smoke-crud.md                        # m3 checklist (T065)
    ├── smoke-import-export.md               # m4 checklist (T066)
    └── smoke-live-walkthrough.md            # m5 checklist (T067)
```

**Naming conventions:**

- Component files: `PascalCase.tsx`. One component per file when ≥30 lines; multiple small subcomponents per file when shared private state.
- Module files: `kebab-case.ts`.
- Test files: `<source-file>.test.ts` co-located OR under `tests/unit/<area>/<source-file>.test.ts`.
- Structural tests: `tests/structural/<topic>.test.ts`.
- Hook names: `useXxx` (e.g. `useRedirectMaps`, `useSelectedSite`).
- Type names: `PascalCase`, no `I`-prefix.
- Constants: `UPPER_SNAKE_CASE` for module-level frozen values; `const` for everything else.
- Imports: absolute via `@/` alias (scaffold default), e.g. `import { Button } from '@/components/ui/button'`.

### 4c-6. Integration and API contract notes

The app makes 9 distinct SDK calls. Each is documented below with verb, unwrap level, type citation, and capture status.

**Single source for the `MarketplaceProvider` and the typed wrappers:** all 9 calls funnel through `lib/sdk/*` (see § 4c-5). No component imports `@sitecore-marketplace-sdk/*` directly except the provider — enforced by structural test T062.

#### 6.1 — `pages.context` (Context Panel page-context subscription)

```typescript
// Verb: client.query (subscribe-via-query)
// Unwrap: SINGLE .data
// Request type:  node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContextSubscribeOptions
// Response type: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContext
// shape: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContext (line ~73)

const result = client.query('pages.context', {
  subscribe: true,
  onSuccess: (ctx: PagesContext) => {
    // ctx.pageInfo?.url   — published URL (e.g. "/foo/bar") — MATCHER KEY in MVP per UI v1 § 1.6
    // ctx.pageInfo?.route — route path (logged for OQ-A divergence detection)
    // ctx.pageInfo?.path  — Sitecore item tree path (NOT the matcher key)
    // ctx.siteInfo?.name  — site name
    // ctx.siteInfo?.startItemId — site-root item GUID
  },
});
```
- **Capture status:** assumed. Fixture path: `tests/fixtures/graphql/page-context.json`.
- **Matcher decision:** use `pageInfo.url` per UI v1 § 1.6 working assumption. Log both `pageInfo.url` AND `pageInfo.route` to dev console at first message — this lets the smoke checklist (T065) close OQ-A by inspection.

#### 6.2 — `xmc.sites.listSites`

```typescript
// Verb: client.query (xmc module query)
// Unwrap: DOUBLE .data.data
// Request type:  node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesData (line ~2561)
// Response type: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesResponse (line ~2589) = Array<Sites.Site>
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.Site (line ~964)

const result = await client.query('xmc.sites.listSites', {
  params: { query: { sitecoreContextId } },
});
const sites: Sites.Site[] = result.data?.data ?? [];
```
- **Capture status:** assumed. Fixture path: `tests/fixtures/graphql/sites-list.json`.

#### 6.3 — `xmc.sites.listCollections`

```typescript
// Verb: client.query (xmc module query)
// Unwrap: DOUBLE .data.data
// Request type:  node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListCollectionsData
// Response type: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListCollectionsResponse = Array<Sites.Collection>
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.Collection

const result = await client.query('xmc.sites.listCollections', {
  params: { query: { sitecoreContextId } },
});
const collections = result.data?.data ?? [];
```
- **Capture status:** assumed. Fixture path: `tests/fixtures/graphql/collections-list.json`.

#### 6.4 — `xmc.authoring.graphql` (read — list Redirect Maps)

```typescript
// Verb: client.MUTATE (graph endpoints are mutations even when used for reads)
// Unwrap: SINGLE .data
// Request type:  node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData (line ~2)
// Response type: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlResponse (line ~61)
// shape (request):  Authoring.GraphqlData = { body: { query, variables?, operationName? }, query: { sitecoreContextId? } }
// shape (response): Authoring.GraphqlResponse = { data?: { [key: string]: unknown }, errors?: Array<{ message?, locations?, path? }> }

const result = await client.mutate('xmc.authoring.graphql', {
  params: { query: { sitecoreContextId } },
  body: {
    query: `
      query GetRedirectsForSite($sitePath: String!) {
        item(path: $sitePath, language: "en") {
          children(includeTemplateIDs: ["{REDIRECT_MAP_TEMPLATE_GUID}"]) {
            results {
              itemId
              name
              fields(ownFields: false) { name jsonValue }
            }
          }
        }
      }
    `,
    variables: { sitePath: '/sitecore/content/<COLLECTION>/<SITE>/Settings/Redirects' },
  },
});

// SINGLE .data unwrap (mutate)
const root = result?.data;                           // { item: { children: { results: [...] } } } | undefined
const items = root?.item?.children?.results ?? [];
```
- **Capture status (per-item field shape):** **CAPTURED** — verbatim from PRD § 9 (real-tenant Preview endpoint capture). Fixture path: `tests/fixtures/graphql/redirect-map-item.read.json`.
- **Capture status (list-children envelope):** assumed. Fixture path: `tests/fixtures/graphql/redirect-map-list.json`.
- **Sibling cross-check:** the same `client.mutate('xmc.authoring.graphql', ...)` + single-`.data` pattern is in production at `products/last-edit-trail/site/lib/sdk/authoring-graphql.ts:91` and `products/component-usage-atlas/site/lib/sdk/authoring-resolve.ts:95`. Mirror verbatim.

#### 6.5 — `xmc.authoring.graphql` (write — create / update / delete Redirect Map item)

```typescript
// Verb: client.MUTATE
// Unwrap: SINGLE .data
// Request / Response types: same as 6.4
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData / Authoring.GraphqlResponse

// Working assumption (TBV — assumed-shape):
// Create:
const createResult = await client.mutate('xmc.authoring.graphql', {
  params: { query: { sitecoreContextId } },
  body: {
    query: `
      mutation CreateRedirectMap($input: CreateItemInput!) {
        createItem(input: $input) { itemId name }
      }
    `,
    variables: {
      input: {
        name: 'New Redirect Map',
        templateId: '{REDIRECT_MAP_TEMPLATE_GUID}',
        parent: '<parent-item-guid>',
        language: 'en',
        fields: [
          { name: 'RedirectType', value: 'ServerTransfer' },
          { name: 'UrlMapping', value: '%2ffoo=%2Fbar' },
          { name: 'PreserveQueryString', value: '0' },     // boolean as 0/1 string TBV
          { name: 'PreserveLanguage', value: '0' },
          { name: 'IncludeVirtualFolder', value: '0' },
        ],
      },
    },
  },
});

// Update (per-field):
//   mutation UpdateRedirectMap($input: UpdateItemInput!) {
//     updateItem(input: $input) { itemId }
//   }
//   variables: { input: { itemId, language: 'en', fields: [...] } }

// Delete:
//   mutation DeleteRedirectMap($input: DeleteItemInput!) {
//     deleteItem(input: $input) { successful }
//   }
//   variables: { input: { itemId } }
```
- **Capture status:** ALL THREE are assumed. Fixture paths: `tests/fixtures/graphql/redirect-map.create.json`, `redirect-map.update.json`, `redirect-map.delete.json`.
- **Open questions tracked here (close at smoke / divergence-detection):**
  - Exact mutation verb names (`createItem` vs `create_item`).
  - Whether `createItem` accepts a caller-supplied `id` (ADR-0009 GUID-preservation consequence).
  - Boolean field representation on writes (`"0" / "1"` vs `"true" / "false"` vs raw boolean).
  - `RedirectType` enum exact values beyond `ServerTransfer` (assumed: `301`, `302`, `307`).

#### 6.6 — `application.context`

```typescript
// Verb: client.query (base map — NOT xmc module)
// Unwrap: SINGLE .data
// Response type: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → ApplicationContext (line ~86)
// shape: ApplicationContext = { id, name, type, resourceAccess: Array<{ tenantId, tenantName, context: { live, preview }, ... }>, permissions, ... }

const appCtx = await client.query('application.context');
const resource = appCtx.data?.resourceAccess?.[0];
const tenantId = resource?.tenantId;                        // ADR-0007
const sitecoreContextId = requireContextId(appCtx.data);    // T009 helper — uses .preview channel
```
- **Capture status:** assumed. Fixture path: `tests/fixtures/graphql/application-context.json`.

#### 6.7 — `pages.reloadCanvas`

```typescript
// Verb: client.mutate (base map)
// Unwrap: SINGLE .data
// shape: marketplace-sdk-client base MutationMap — void return

await client.mutate('pages.reloadCanvas');
// Fired after every successful Context Panel write. Errors swallowed and logged (UX nicety).
```

#### 6.8 — Auth headers and error codes

- **Auth:** every call rides the operator's authenticated Cloud Portal session via the postMessage bridge. The app holds no tokens. No `Authorization` header to set explicitly.
- **Error codes** (`marketplace-sdk-client` § 8f): `TOKEN_ERROR` (operator's portal session expired — surface friendly banner with re-login hint), `INVALID_REQUEST` (malformed query / variables), `RESPONSE_ERROR` (Sitecore returned non-2xx). The friendly error UX (FR-13) surfaces all three with collapsible technical details.

### 4c-7. Parity / rebuild pointers

`N/A — greenfield`. PRD-000 has no source repo to mirror, no asset bundle to consume, no content-dump to map per route. The closest parity reference is the sibling Marketplace apps in the workspace (`products/last-edit-trail/`, `products/component-usage-atlas/`) — they exist for SDK-pattern verification (cross-cited in § 4c-6), not for behavior parity.

## 5. Dependencies

### Ordering constraints

- Scaffold (Epic A) must be complete before any other work can compile.
- Domain types (T016) are imported by both SDK wrappers (Epic B) and pure modules (rest of Epic C) — splits Epic B and C into a partial dependency.
- Both SDK wrappers (Epic B) and domain modules (Epic C) must exist before any UI surface (D, E, F) can render.
- Full Page (Epic F) must exist before Import / Export (Epic G) — Import/Export occupies the Full Page right pane.
- All UI surfaces (D, E, F, G) must exist before cross-surface a11y polish (Epic H) is meaningful.
- Scaffold + provider (Epic A → T008) must exist before structural tests (T062).
- All UI surfaces and the visual smoke harness (T064) must exist before real-tenant smoke checklists (T065–T067) are meaningful.

### Execution order (numbered list of all Task IDs in valid dependency order)

1. T001 (scaffold)
2. T002 (lint + typecheck baseline)
3. T003 (Blok primitives) — parallel-eligible with T004, T005
4. T004 (runtime deps)
5. T005 (Vitest setup)
6. T006 (3 routes + root 404)
7. T007 (theme.css with dark override)
8. T008 (Provider verification)
9. T009 (requireContextId helper)
10. T016 (domain types) — parallel-eligible with T010 (Epic B side)
11. T017 (UrlMapping parse/serialize)
12. T018 (Zod schema)
13. T021 (RedirectType enum)
14. T010 (sites wrapper) — parallel-eligible with T011 once T016 lands
15. T011 (redirects-read wrapper)
16. T012 (redirects-write wrapper)
17. T013 (page-context wrapper) — parallel-eligible with T014, T015
18. T014 (application-context wrapper)
19. T015 (canvas-reload wrapper)
20. T019 (import-export diff)
21. T020 (context-panel matcher)
22. T022 (Context Panel shell + banner) — parallel-eligible with E and F shells
23. T023 (Context Panel grouped list)
24. T024 (Context Panel Add modal)
25. T025 (Context Panel inline edit)
26. T026 (Context Panel inline delete)
27. T027 (Context Panel loading)
28. T028 (Context Panel empty)
29. T029 (Context Panel error)
30. T030 (Context Panel orchestration)
31. T031 (Dashboard widget shell + tiles) — parallel-eligible with D + F shells
32. T032 (Dashboard data flow)
33. T033 (Dashboard loading + empty + error)
34. T034 (Dashboard a11y)
35. T035 (Full Page shell) — parallel-eligible with D + E shells
36. T036 (Full Page top action row)
37. T037 (Full Page left rail)
38. T038 (Full Page detail editor — form)
39. T039 (Full Page mappings table)
40. T040 (Full Page Save / Cancel / Delete)
41. T041 (Full Page delete-map confirm modal)
42. T042 (Full Page empty-no-selection)
43. T043 (Full Page loading-detail)
44. T044 (Full Page error states)
45. T045 (Full Page rail empty states)
46. T046 (Sonner toasts)
47. T047 (Export JSON download)
48. T048 (Import step 1 Upload)
49. T049 (Import step 2 Schema validation)
50. T050 (Import step 3 Preview)
51. T051 (Import step 3 Confirm-disabled-until-resolved)
52. T052 (Import step 4 Apply with progress)
53. T053 (Import step 4 Summary)
54. T054 (Import a11y)
55. T055 (focus-visible audit)
56. T056 (aria-live audit)
57. T057 (monochrome glyph audit)
58. T058 (dark-mode contrast verification)
59. T059 (SDK wrapper unit tests) — parallel-eligible with T060, T061
60. T060 (UrlMapping property tests)
61. T061 (domain layer unit tests)
62. T062 (structural tests)
63. T063 (registration runbook)
64. T064 (host-frame smoke harness)
65. T065 (CRUD smoke checklist)
66. T066 (import/export smoke checklist)
67. T067 (live-walkthrough checklist)

### Parallel groups

```
Group 1 (sequential — foundation): T001 → T002
Group 2 (parallel — depends on T002): T003, T004, T005
Group 3 (sequential — depends on T003): T006 → T007 → T008
Group 4 (sequential — depends on T008): T009
Group 5 (parallel — depends on T005): T016 (domain types side)
Group 6 (parallel — depends on T009 + T016): T010, T013, T014, T015
Group 7 (parallel — depends on T009 + T016): T011 (depends T016), T017 (depends T016), T018 (depends T016), T021 (depends T016)
Group 8 (sequential — depends on T011, T016, T017): T012
Group 9 (parallel — depends on Groups 6+7+8 settle): T019 (diff), T020 (matcher)
Group 10 (parallel — three surface shells): T022, T031, T035
Group 11 (sequential within Context Panel — depends on T011/T013/T020/T022): T023 → T024 → T025/T026 → T027/T028/T029 → T030
Group 12 (sequential within Dashboard — depends on T032/T033/T034 chain): T032 → T033 → T034
Group 13 (sequential within Full Page — depends on T036 → T037 → T038/T039 → T040/T041 → T042/T043/T044/T045 → T046)
Group 14 (sequential — Import/Export, depends on Group 13 settle): T047 → T048 → T049 → T050 → T051 → T052 → T053 → T054
Group 15 (parallel — cross-surface polish, depends on D/E/F/G settle): T055, T056, T057, T058
Group 16 (parallel — test stack, depends on relevant Epic A/B/C settle): T059, T060, T061, T062
Group 17 (sequential — Marketplace install + smoke, depends on Group 15 + Group 16): T063 → T064 → T065 → T066 → T067
```

**Foundation depth:** 4 sequential groups before parallelism opens up (T001 → T002 → T003 → T006 → T007 → T008 → T009).

**Parallelism windows:** 3 surface shells (T022, T031, T035) can spawn in parallel once Epic B + C are settled. Within each surface, the state-coverage tasks (loading / empty / error) are weakly dependent and can be parallelized within a single Developer agent's context.

**Notes for the Team Lead:** if spawning multiple Developer agents, the natural three-way fork is per surface (D / E / F). Epic G (Import / Export) depends on F settling, so it follows the F agent. Epic H (cross-surface a11y) is a single-agent sweep at the end. Epic I (test stack) can run in parallel with the surface epics if the QA Specialist has TDD-restructured § 9 / § 10 — Lead Developer left ordering at test-after; QA Specialist may flip to test-first.

## 6. Suggested Milestones

- **M1 — Scaffold green** (T001–T007). Three extension routes return 200; root returns 404. `npm run lint`, `npm run typecheck`, `npm run test -- --run` all exit 0.
- **M2 — SDK + domain layer green** (T008–T021). All 9 SDK wrappers + domain modules compile + have unit-test placeholders. Provider exposes hooks. `requireContextId` covers the resourceAccess gap.
- **M3 — Three surface shells render** (T022, T031, T035). Each route renders its outer chrome with placeholder content matching POC clickdummies at first glance.
- **M4 — Context Panel feature-complete** (T023–T030). End-to-end against fixtures: load → settle → match → CRUD → toast → `pages.reloadCanvas`.
- **M5 — Dashboard Widget feature-complete** (T032–T034). Tiles populate from real read data. All 4 states visible.
- **M6 — Full Page feature-complete (CRUD only, no import/export)** (T036–T046). Picker → list → detail → form save / delete round-trips against fixtures.
- **M7 — Import / Export feature-complete** (T047–T054). Export round-trips. Import 4-step flow with all states.
- **M8 — Cross-surface polish complete** (T055–T058). Focus-visible everywhere, aria-live coverage, monochrome glyphs only, dark-mode contrast verified.
- **M9 — Test stack green** (T059–T062). All unit + property + structural tests pass.
- **M10 — Smoke gates open** (T063–T064). Test app registered, host-frame visual smoke harness operational.
- **M11 — All real-tenant smoke gates passed** (T065–T067). m3 (CRUD round-trip <10 s), m4 (import/export round-trip with zero rule loss), m5 (≥5-min walkthrough with zero unrecoverable errors).

## 7. Risk Areas

- **R-T1 — Authoring write-mutation shape divergence (high impact).** Per ADR-0013 (revised) the operator chose to proceed with assumed mutation shapes. If the real tenant rejects `createItem` / `updateItem` / `deleteItem` with a different verb name, argument structure, or boolean repr, T012 will need a fix. **Mitigation:** all writes funnel through one module (`lib/sdk/redirects-write.ts`); tests are fixture-driven and the divergence-detection workflow flags the gap loudly. The wrapper's exposed signature does not change — only the internal payload does.
- **R-T2 — `createItem` GUID preservation (medium impact).** ADR-0009 consequence. If the Authoring `createItem` mutation does not accept a caller-supplied `id`, cross-environment imports lose GUID identity on "create" actions — re-imports become non-idempotent. **Mitigation:** the smoke checklist (T066) explicitly tests this; if the gap is real, surface a "newly minted ID" indicator in the import-summary screen as a fast-follow.
- **R-T3 — Page-context matcher field selection (medium impact).** OQ-A. The matcher uses `pageInfo.url` per UI v1 § 1.6 working assumption. If the head-app's resolver actually consumes `pageInfo.route`, the Context Panel produces false negatives on every redirect. **Mitigation:** T013 logs both fields to the dev console at first message. T065 closes OQ-A by inspection.
- **R-T4 — `RedirectType` enum drift (low–medium impact).** OQ-8. Only `ServerTransfer` is real-tenant verified. `301` / `302` / `307` are assumed. **Mitigation:** T021 owns the canonical list; if real-tenant introspection reveals different names, T021 is the only file that changes. The dropdown derives from this module.
- **R-T5 — Blok Nova preset bumps re-collapse `--primary-foreground` (low impact, high blast).** If `npm install` pulls a newer Blok preset that silently flips `--primary-foreground` back to `--color-white` in dark mode, the override in `app/globals.css` keeps the dark-on-lavender contrast. **Mitigation:** T062 structural test fails the build if the override is missing.
- **R-T6 — `react-virtuoso` + `aria-rowindex` integration (low impact).** ADR-0012 names `aria-rowindex` for screen-reader compliance. If the version installed at T004 has a regression here, `lib/match` / Full Page rail / mappings table all degrade to non-virtualized at the small scale and break accessibility at the large one. **Mitigation:** T034 + T056 test this explicitly; cap virtualization opt-in at >50 rows so small-list a11y is not affected.
- **R-T7 — Iframe viewport at 1024 px is tight for two-pane import preview (low impact).** UI v1 Q2. If real-tenant testing shows the diff sub-table is cramped, fast-follow with a collapsible left rail (~80 px icons + names only).
- **R-T8 — `@dnd-kit/core` keyboard-reorder a11y (medium impact).** Drag-handle keyboard sensor must announce position changes during reorder. **Mitigation:** UI v1 § 4.3 lists the canonical announcements; T039 + T056 cover via a11y audit. Falls back to no-keyboard reorder + a row-level "Move up / Move down" affordance if the a11y bar can't be cleared.
- **R-T9 — Cloud Portal Test App registration friction (low–medium impact, blocking).** OQ-7 captured. **Mitigation:** T063 documents the 8-field paste-in. If a step is wrong, the friction-log captures it, and T063 iterates until the operator can self-serve install.
- **R-T10 — Live-walkthrough surface mismatch (low impact).** m5 requires zero unrecoverable errors over ≥5 min. If something asymmetric surfaces (e.g. one extension point hangs in the iframe due to provider trap rerunning), the friction-log captures it; the fix may land outside this PRD.

## 8. Suggested Team Structure

**Single-developer baseline (recommended for MVP).** One Developer agent works through the execution order linearly. Foundation (Groups 1–4) is sequential; surface implementation (D / E / F) is the largest single block but each surface is self-contained.

**Two-developer fork (optional, after Group 9 settles).** One agent owns Context Panel + Dashboard Widget (Groups 11 + 12); the other owns Full Page + Import/Export (Groups 13 + 14). They join up at Group 15 (cross-surface polish) — single agent again.

**Three-developer fork (only if velocity justifies).** Per-surface fork (Context Panel / Dashboard / Full Page+Import). The three agents work on independent subtrees; coordination is needed only on shared Blok primitive choices and the Sonner-provider placement (T046 lives in `app/layout.tsx`). Fold-back to single agent at Group 15.

**QA Specialist (07) handoff:** after Lead Developer (06) emits this breakdown, QA Specialist enriches in place — populates § 9 (TDD contract: RED → GREEN → REFACTOR per layer) and § 10 (per-task tests including the assumed-shape divergence-detection cases). QA may also restructure the test-task ordering to test-first (TDD) where the SDK boundary or pure-module layer warrants it.

**Marketplace install + smoke (Epic J):** owned by the operator (Christian) — these tasks require real-tenant access. The Developer agent produces the runbooks (T063), the smoke harness (T064), and the checklists (T065–T067); the operator executes the checklists.

## 9. TDD and quality contract

*Populated by QA Specialist (07) — 2026-05-10. This section is the governing test contract for all PRD-000 implementation. Developer 08 reads this before writing any production code.*

---

### 9.1 — RED → GREEN → REFACTOR mandate

**No production code before a failing test for that behavior.** This applies unconditionally to:

- Every task in Epic B (SDK wrappers — T009 through T015).
- Every task in Epic C (domain pure modules — T016 through T021).
- Every task in Epic I (test stack / structural guards — T059 through T062) — the structural tests are themselves TDD artifacts; they write the assertion first, confirm it fails without the guard, then enforce the guard.
- Component-state tasks in Epics D, E, F, G where a distinct behavioral invariant exists (empty-state rendering, error-state rendering, cancel/discard prompt, confirm-disabled semantics).

For scaffold tasks (Epic A) and UI-shell tasks (T022, T031, T035) that have no unit-testable logic until wired to data, the Developer writes the **structural test first** (T062 boundary/theme guards), confirms it fails, then implements the shell.

---

### 9.2 — Test type per layer

| Layer | Test type | Tooling | Location |
|---|---|---|---|
| SDK wrappers (`lib/sdk/*`) | Unit — typed-mock client + fixture-driven | Vitest + typed mock from `sitecore:marketplace-sdk-client` | `tests/unit/sdk/*.test.ts` |
| Domain pure modules (`lib/url-mapping/*`, `lib/import-export/*`, `lib/match/*`, `lib/redirects/*`, `lib/domain/*`) | Unit + property-based | Vitest + `fast-check` | `tests/unit/url-mapping/`, `tests/unit/import-export/`, `tests/unit/match/`, `tests/unit/domain/` |
| React components (all surfaces) | UI — component render + interaction | Vitest + jsdom + Testing Library | `tests/ui/<surface>/*.test.tsx` |
| Structural guards (boundary, XSS, theme) | Structural — `fs`-read + regex | Vitest (no jsdom; reads source files via Node `fs`) | `tests/structural/*.test.ts` |
| Host-frame visual smoke | E2E visual diff | Playwright + `npx serve pocs/poc-v1/` | `tests/e2e/` or the `app/test/page.tsx` harness |
| Real-tenant smoke gates | Manual E2E | Operator-executed checklists (T065–T067) | `docs/smoke-*.md` + `manifest.smoke_outcomes` |

---

### 9.3 — Property-based testing requirement (ADR-0008 + PRD R3)

`lib/url-mapping/parse.ts` and `serialize.ts` are the highest-correctness-risk pure modules in the codebase (ADR-0008 encoding contract). `fast-check` property tests are **mandatory, not optional**. Required properties:

1. **Round-trip stability:** `parse(serialize(rows)).rows` deep-equals `rows` for any `Mapping[]` where `source.length > 0` and `target.length > 0`. Minimum 200 `fast-check` samples.
2. **Case normalization on serialize:** `serialize` always emits uppercase hex (`%2F` not `%2f`); `parse` accepts both. Property: `parse(raw).rows` deep-equals `parse(raw.toLowerCase()).rows` (excluding lowercase decode of source/target content that contains literal casing).
3. **First-`=` split:** source strings containing literal `=` characters survive the round-trip unchanged. `fast-check` generates sources with embedded `=` characters.
4. **Order preservation:** input array order is exactly preserved in both directions.
5. **Malformed-segment tolerance:** any segment without `=` produces a non-fatal warning entry; no throw; remaining segments still parse correctly.

---

### 9.4 — Fixture provenance contract

Every test file that loads a fixture MUST include one of these comments immediately above the import:

```typescript
// captured: real-tenant Authoring/Preview endpoint on 2026-05-09
// source: tests/fixtures/graphql/redirect-map-item.read.json
```

OR for assumed shapes:

```typescript
// assumed: per sitecore:marketplace-sdk-xmc .d.ts + sibling-app evidence 2026-05-10
//          tracked for divergence at T065 (CRUD smoke) / T066 (import/export smoke)
// source: tests/fixtures/graphql/sites-list.json
```

**Fixtures without a provenance comment are rejected at code review.** This is the direct lesson from QuickCopy v0.1 — 167 passing tests against shared-fiction fixtures, zero of which caught a production shape mismatch.

The one fully captured fixture is:

- `tests/fixtures/graphql/redirect-map-item.read.json` — **captured: real-tenant Preview/Authoring endpoint on 2026-05-09** (verbatim from PRD § 9). This is the ground truth for all read-shape assertions.

All other fixtures are assumed. The 12 assumed-shape annotations from the task bodies are:

| Task | Fixture file | Risk | Canonical capture point |
|---|---|---|---|
| T010 | `sites-list.json` | medium | T065 (smoke — list sites against real tenant) |
| T010 | `collections-list.json` | medium | T065 (smoke — list collections against real tenant) |
| T011 | `redirect-map-list.json` | medium | T065 (smoke — list redirect maps against real tenant) |
| T012 | `redirect-map.create.json` | HIGH | T065 (smoke — createItem mutation) |
| T012 | `redirect-map.update.json` | HIGH | T065 (smoke — updateItem mutation) |
| T012 | `redirect-map.delete.json` | HIGH | T065 (smoke — deleteItem mutation) |
| T013 | `page-context.json` | medium | T065 (smoke — Pages context in real Pages session) |
| T014 | `application-context.json` | medium | T065 (smoke — application.context in real tenant) |
| T021 | `redirect-type-enum.json` | low–medium | T065 (smoke — RedirectType introspection query) |

Note: T015 (`pages.reloadCanvas`) has no fixture — the call is fire-and-forget with void return. Errors are swallowed. Test covers that errors do NOT propagate. Total assumed-shape fixtures: 9 (some tasks carry more than one — T010 carries 2, T012 carries 3 — giving 12 `assumed-shape:` annotation lines across the task bodies).

---

### 9.5 — Divergence-detection assertion pattern

For every RED test that loads an assumed-shape fixture, include a **divergence-detection assertion** as the final `expect` in the test. This assertion confirms that the fixture itself has the expected top-level shape — so when a real-tenant capture replaces the fixture and the shape genuinely differs, the test fails loudly with a clear message rather than silently accepting a new shape.

Pattern (TypeScript Vitest):

```typescript
// divergence-detection: if this assert fails after replacing the fixture with
// a real-tenant capture, the shape has diverged. Update the wrapper, not the
// assertion. Capture point: T065 CRUD smoke.
expect(fixture, 'assumed-shape divergence: sites-list fixture top-level shape').toMatchObject({
  // exactly the fields the wrapper depends on, no more
  data: expect.objectContaining({
    data: expect.arrayContaining([
      expect.objectContaining({ id: expect.any(String), name: expect.any(String) })
    ])
  })
});
```

The failure message must name the fixture file and the capture point task. Do NOT write `expect.anything()` divergence guards — those always pass and defeat the purpose.

---

### 9.6 — Accessibility test requirements (NFR-A1 through NFR-A5)

Every UI component task in Epics D, E, F, G, H gets:

1. **`axe-core` assertion** via `@testing-library/jest-dom` + `jest-axe` (or `vitest-axe` if the Vitest equivalent is available): `await expect(container).toHaveNoViolations()`. This catches WCAG 2.1 AA violations including the contrast rule.
2. **Focus-order assertion**: `userEvent.tab()` through the component in order; confirm each focusable element receives focus in reading order; confirm no element is skipped; confirm no `outline: none` style is applied at focus time.
3. **Monochrome glyph assertion** for any component that renders status glyphs: confirm the glyph codepoint is `\u2713` (✓), `\u2715` (✕), or `\u26a0` (⚠ without VS16). A test that finds `\u274c` (❌) or `\u2705` (✅) fails.

Structural test T062 reinforces these via static analysis. The component-level assertions catch runtime regressions that static analysis misses.

---

### 9.7 — Runtime contrast assertion for theme-token components

Any component that paints with `bg-primary` + `text-primary-foreground` in dark mode MUST include a runtime contrast assertion — not just `toHaveClass("bg-primary")`. The Nova preset has shipped a collapsed pair (`--primary-foreground: var(--color-white)` on `bg-primary` = lavender) at least once in the Sitecore ecosystem (QuickCopy Share Link strip — see `blok-theming`).

Required assertion pattern in the dark-mode component test:

```typescript
import { getComputedStyle } from '@testing-library/dom'; // or via jsdom window

// Set .dark on html before rendering
document.documentElement.classList.add('dark');
render(<PrimaryButton>Save</PrimaryButton>);
const btn = screen.getByRole('button');
const style = window.getComputedStyle(btn);
// --primary-foreground in dark mode must resolve to a dark tone (blackAlpha-900 = rgba(0,0,0,0.92))
// Accept any computed color where luminance < 0.4 (dark-on-lavender)
expect(isDarkEnough(style.color), 'primary-foreground must be dark in dark mode').toBe(true);
```

Where `isDarkEnough(color: string): boolean` is a small helper that parses the RGB value and returns `true` when relative luminance < 0.4.

This is in addition to — not a replacement for — the structural test T062 that checks the CSS token override is present.

---

### 9.8 — Host-frame visual smoke harness (T064)

Per `sitecore:marketplace-sdk-host-frame-testing` and the QA Specialist role contract for `platform_target == marketplace`:

**Harness location:** `app/test/page.tsx` (renders side-by-side comparison grid) + Playwright spec at `tests/e2e/host-frame-smoke.spec.ts`.

**Ground truth:** `products/redirect-manager/pocs/poc-v1/` — served at smoke time via `npx serve products/redirect-manager/pocs/poc-v1/` (Playwright MCP rejects `file://` URLs).

**5-axis comparison** (per the host-frame testing recipe):
1. **Layout** — two-pane rail + right-pane proportions; left-edge stripe alignment; group headers flush.
2. **Typography** — Geist Mono vs Geist Sans application to correct elements; size scale; weight hierarchy.
3. **Color** — token resolution at rest and in dark mode; `--primary` left-edge stripe; `--destructive` error alerts; `--muted-foreground` secondary text.
4. **Component anatomy** — badge geometry (radius-sm), button variants (primary vs outline vs ghost), separator hairlines, skeleton placeholder shapes.
5. **State fidelity** — loading skeletons match POC skeleton dimensions; empty states match icon + copy; error alerts match glyph + message.

**Three extension routes to capture:** `/context-panel`, `/dashboard-widget`, `/full-page` — each captured inside the host iframe, not as a standalone localhost render (standalone is blank — the SDK handshake never resolves outside the iframe).

**Inputs are operator-supplied and mandatory.** If host URL or app origin is not supplied at `/test` time, record visual testing as `deferred — host URL not supplied` with a `WARN` verdict in `manifest.smoke_outcomes`. Do NOT fall back to a standalone localhost screenshot.

**Auth:** interactive only — operator logs into the host URL, waits for `READY`. Do NOT script SSO.

**PASS threshold:** all three routes pass all five axes with no findings of severity HIGH or CRITICAL. COLOR and TYPOGRAPHY axis WARNs may be accepted with operator sign-off and a note in `smoke_outcomes`.

---

### 9.9 — Smoke gate matrix

These 5 gates must all be in `passed` state before `status` may move from `tested_pending_smoke` to `shipped`. Each gate links to the task IDs that satisfy it.

| Gate | Satisfied by | PRD metric |
|---|---|---|
| `host_frame_smoke` | T064 (harness), visual smoke at `/test` | m2 |
| `crud_round_trip` | T065 checklist (create + edit + delete < 10 s each) | m3 |
| `import_export_round_trip` | T066 checklist (site-A export → site-B import, zero rule loss) | m4 |
| `live_walkthrough` | T067 checklist (≥5 min, zero unrecoverable errors) | m5 |
| `registration` | T063 runbook executed on real tenant; all 3 extension points reachable | m1 |

Status transitions: `tested_pending_smoke` while any gate is `pending`; `tested` only after all five are `passed`.

---

### 9.10 — Long-list visibility check

Per UI v1 § 3.3.2 (NFR-S1) and PRD § 8: at 30 redirect maps with 500 total mappings, the `react-virtuoso` list must track selection state correctly and render without layout thrash. A specific automated test is required (see § 10 — T037 spec, RED-5).

---

### 9.11 — Smoke outcomes initialization

Per the QA Specialist role contract (`platform_target == marketplace`): `manifest.smoke_outcomes` is initialized to all `pending`. This blocks `status` from advancing past `tested_pending_smoke` until each gate is manually executed. The entries are set in the run manifest at the bottom of this enrichment pass.

```json
{
  "host_frame_smoke":         { "outcome": "pending", "notes": null },
  "crud_round_trip":          { "outcome": "pending", "notes": null },
  "import_export_round_trip": { "outcome": "pending", "notes": null },
  "live_walkthrough":         { "outcome": "pending", "notes": null },
  "registration":             { "outcome": "pending", "notes": null }
}
```

---

## 10. Per-task test specifications

*Populated by QA Specialist (07) — 2026-05-10. For each task, specs are listed as RED test cases. Where a task is docs-only or manual-smoke-only, it is labelled accordingly.*

---

### Epic A — Scaffold and infrastructure

#### T001 — Scaffold

Non-code scaffold command. No automated tests possible until scaffold output exists.

- **RED-1: three extension routes return 200** — after T006 depends on T001. Type: UI smoke (manual dev-server check). Confirmed by M1 milestone gate.
- **RED-2: root `/` returns 404** — same. Type: UI smoke.

These become automated structural tests via T062. No dedicated T001 test file required.

#### T002 — Lint + typecheck baseline

Non-code verification. No test file. CI gate: `npm run lint` + `npm run typecheck` both exit 0.

#### T003 — Blok primitives install

Non-code. No test file. Confirmation: `import { Button } from '@/components/ui/button'` compiles without error in T005 test setup.

#### T004 — Non-Blok runtime deps

Non-code. No test file. Confirmation: `import { Virtuoso } from 'react-virtuoso'` compiles; `import * as fc from 'fast-check'` compiles.

#### T005 — Vitest + jsdom setup

- **RED-1: test runner exits 0 on empty suite** — `npm run test -- --run` exits 0. File: none (infrastructure check).
- **RED-2: jsdom provides `window` and `document`** — a single sanity test `expect(typeof window).toBe('object')`. File: `tests/setup.test.ts`.

#### T006 — Extension routes + root notFound

- **RED-1: structural test — three routes exist** — `tests/structural/routes.test.ts` asserts `app/context-panel/page.tsx`, `app/dashboard-widget/page.tsx`, `app/full-page/page.tsx` all exist on disk via `fs.existsSync`. Type: structural.
- **RED-2: structural test — root page calls notFound** — same file asserts `app/page.tsx` content contains the `notFound()` call. Type: structural.

Both RED tests fail until T006 creates the files.

#### T007 — Theme.css with dark override

- **RED-1: theme-override structural test (pre-T062)** — `tests/structural/theme-override.test.ts` reads `app/globals.css` and asserts:
  - Contains `--primary-foreground: var(--color-blackAlpha-900)` inside `@media (prefers-color-scheme: dark)` block. Type: structural.
  - Contains same override inside `.dark` block. Type: structural.
  - Contains the verbatim override comment mentioning `2026-05-10`. Type: structural.

This is the early-fail version of T062's theme guard — T062 will consolidate it.

---

### Epic B — SDK plumbing

**TDD ordering note:** tests for T009–T015 are written BEFORE the wrapper implementations. The Developer reads the spec below, writes the failing test, then implements the wrapper to make it green.

#### T009 — `requireContextId()` helper

```
// source: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → ApplicationContext
// assumed: per sitecore:marketplace-sdk-client reference + sibling-app evidence 2026-05-10
```

- **RED-1: returns preview contextId when resourceAccess is present** — mock `ApplicationContext` with `resourceAccess[0].context.preview = "ctx-123"`. Assert `requireContextId(appCtx) === "ctx-123"`. Type: unit. File: `tests/unit/sdk/require-context-id.test.ts`.
- **RED-2: throws typed error when resourceAccess is empty** — mock `{ resourceAccess: [] }`. Assert throws with message containing `'Sitecore context unavailable'`. Type: unit.
- **RED-3: throws when context.preview is undefined** — mock `{ resourceAccess: [{ context: {} }] }`. Assert throws. Type: unit.
- **RED-4: throws when resourceAccess is undefined** — mock `{ }`. Assert throws. Type: unit.

No assumed-shape fixture needed — `ApplicationContext` shape is fully defined in `.d.ts`. Source: `node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts`.

#### T010 — `lib/sdk/sites.ts` (assumed-shape: sites-list.json, collections-list.json)

```
// assumed: per sitecore:marketplace-sdk-xmc .d.ts Sites.Site / Sites.ListSitesResponse 2026-05-10
// tracked for divergence at T065 (CRUD smoke — list sites/collections against real tenant)
// source: tests/fixtures/graphql/sites-list.json
// source: tests/fixtures/graphql/collections-list.json
```

- **RED-1: request shape — listSites** — typed mock asserts call is `client.query('xmc.sites.listSites', { params: { query: { sitecoreContextId: 'ctx-123' } } })`. Type: unit. File: `tests/unit/sdk/sites.test.ts`. Fixture: `tests/fixtures/graphql/sites-list.json`.
- **RED-2: response unwrap — double .data.data for listSites** — fixture is `{ data: { data: [{ id: "...", name: "MySite", ... }] } }`; wrapper returns the inner `Sites.Site[]` array. Type: unit.
- **RED-3: empty tenant listSites** — fixture `{ data: { data: [] } }`; `listSites` returns `[]` without crash. Type: unit.
- **RED-4: request shape — listCollections** — same as RED-1 but for `'xmc.sites.listCollections'`. Type: unit.
- **RED-5: response unwrap — double .data.data for listCollections** — same pattern as RED-2 for `Sites.Collection[]`. Type: unit.
- **RED-6: divergence-detection — sites-list fixture shape** — `expect(sitesListFixture, 'assumed-shape divergence: sites-list').toMatchObject({ data: { data: expect.arrayContaining([expect.objectContaining({ id: expect.any(String), name: expect.any(String) })]) } })`. Type: unit. Capture point: T065.
- **RED-7: divergence-detection — collections-list fixture shape** — same pattern for collections fixture. Capture point: T065.

#### T011 — `lib/sdk/redirects-read.ts` (assumed-shape: redirect-map-list.json; captured: redirect-map-item.read.json)

```
// captured: real-tenant Authoring/Preview endpoint on 2026-05-09
// source: tests/fixtures/graphql/redirect-map-item.read.json

// assumed: list-children envelope per sitecore:marketplace-sdk-xmc .d.ts + architecture § 5.3 2026-05-10
// tracked for divergence at T065
// source: tests/fixtures/graphql/redirect-map-list.json
```

- **RED-1: request shape — correct mutate verb and body** — mock asserts `client.mutate('xmc.authoring.graphql', { params: { query: { sitecoreContextId } }, body: { query: expect.stringContaining('GetRedirectsForSite'), variables: { sitePath: expect.any(String) } } })`. Type: unit. File: `tests/unit/sdk/redirects-read.test.ts`.
- **RED-2: single .data unwrap on mutate** — fixture `{ data: { item: { children: { results: [<item>] } } } }`; wrapper returns `RedirectMapItem[]`. Type: unit. Fixture: `tests/fixtures/graphql/redirect-map-list.json`.
- **RED-3: per-item field decoding — captured fixture** — using the captured `redirect-map-item.read.json` (verbatim PRD § 9), assert that decoding produces `{ redirectType: 'ServerTransfer', preserveQueryString: false, preserveLanguage: false, includeVirtualFolder: true, mappings: [{ source: '/test', target: '/newTest' }, { source: '/hello', target: '/world' }] }`. Type: unit. Source: **captured** `tests/fixtures/graphql/redirect-map-item.read.json`.
- **RED-4: malformed UrlMapping segment — warn-and-skip** — fixture item with `UrlMapping` value `"%2fbad-segment&%2ftest=%2Fgood"` produces `warnings: ['...']` and parses the valid segment; no throw. Type: unit.
- **RED-5: empty children results** — fixture `{ data: { item: { children: { results: [] } } } }` returns `[]`. Type: unit.
- **RED-6: divergence-detection — redirect-map-list envelope** — `expect(fixture, 'assumed-shape divergence: redirect-map-list children envelope').toMatchObject({ data: { item: { children: { results: expect.any(Array) } } } })`. Capture point: T065.

#### T012 — `lib/sdk/redirects-write.ts` (assumed-shape: redirect-map.create.json, redirect-map.update.json, redirect-map.delete.json)

```
// assumed: Authoring GraphQL createItem/updateItem/deleteItem per architecture § 5.4 2026-05-10
// tracked for divergence at T065 (createItem), T065 (updateItem), T065 (deleteItem)
// source: tests/fixtures/graphql/redirect-map.create.json
// source: tests/fixtures/graphql/redirect-map.update.json
// source: tests/fixtures/graphql/redirect-map.delete.json
```

- **RED-1: createRedirectMap — request shape** — mock asserts `client.mutate('xmc.authoring.graphql', { ..., body: { query: expect.stringContaining('createItem'), variables: { input: expect.objectContaining({ name: expect.any(String), templateId: expect.any(String), language: 'en' }) } } })`. Type: unit. File: `tests/unit/sdk/redirects-write.test.ts`.
- **RED-2: createRedirectMap — single .data unwrap** — fixture `{ data: { createItem: { itemId: '{ABC}', name: 'My Map' } } }`; wrapper returns the decoded response without crash. Type: unit.
- **RED-3: updateRedirectMap — request shape** — mutation body contains `updateItem` verb + `{ itemId, language: 'en', fields: [...] }`. Type: unit.
- **RED-4: deleteRedirectMap — request shape** — mutation body contains `deleteItem` verb + `{ itemId }`. Type: unit.
- **RED-5: all mutations pass language: 'en' (ADR-0010)** — mock spy asserts `language: 'en'` is always present in create and update. Type: unit.
- **RED-6: divergence-detection — create fixture** — `expect(createFixture, 'assumed-shape divergence: createItem response').toMatchObject({ data: expect.objectContaining({ createItem: expect.objectContaining({ itemId: expect.any(String) }) }) })`. Capture point: T065.
- **RED-7: divergence-detection — update fixture** — same pattern for updateItem. Capture point: T065.
- **RED-8: divergence-detection — delete fixture** — `expect(deleteFixture, 'assumed-shape divergence: deleteItem response').toMatchObject({ data: expect.objectContaining({ deleteItem: expect.objectContaining({ successful: expect.any(Boolean) }) }) })`. Capture point: T065.

#### T013 — `lib/sdk/page-context.ts` (assumed-shape: page-context.json)

```
// assumed: per sitecore:marketplace-sdk-client .d.ts PagesContext (line ~73) 2026-05-10
// tracked for divergence at T065 (log pageInfo.url + pageInfo.route in real Pages session)
// source: tests/fixtures/graphql/page-context.json
```

- **RED-1: subscribe call uses correct verb and subscribe:true** — mock asserts `client.query('pages.context', { subscribe: true, onSuccess: expect.any(Function) })`. Type: unit. File: `tests/unit/sdk/page-context.test.ts`.
- **RED-2: single .data unwrap** — fixture `{ siteInfo: { name: 'MySite', ... }, pageInfo: { url: '/foo/bar', route: '/foo', path: '/sitecore/...' } }`; callback receives the unwrapped `PagesContext`. Type: unit.
- **RED-3: pageInfo.url is exposed as matcher key** — callback payload's `pageUrl` field equals `pageInfo.url` from the fixture. Type: unit.
- **RED-4: both pageInfo.url and pageInfo.route are logged to console.log** — spy on `console.log`; assert that first subscription message produces a log containing both values. Type: unit. (This enables OQ-A closure at T065.)
- **RED-5: divergence-detection — page-context fixture shape** — `expect(pageContextFixture, 'assumed-shape divergence: page-context').toMatchObject({ siteInfo: expect.objectContaining({ name: expect.any(String) }), pageInfo: expect.objectContaining({ url: expect.any(String), route: expect.any(String) }) })`. Capture point: T065.

#### T014 — `lib/sdk/application-context.ts` (assumed-shape: application-context.json)

```
// assumed: per sitecore:marketplace-sdk-client .d.ts ApplicationContext (line ~86) 2026-05-10
// tracked for divergence at T065
// source: tests/fixtures/graphql/application-context.json
```

- **RED-1: selectTenantId returns resourceAccess[0].tenantId** — mock context with `resourceAccess[0].tenantId = 'tenant-abc'`; assert return value equals `'tenant-abc'`. Type: unit. File: `tests/unit/sdk/application-context.test.ts`.
- **RED-2: selectContextId delegates to requireContextId** — assert it does NOT re-implement the guard but calls `requireContextId`. Type: unit (spy on the helper).
- **RED-3: divergence-detection — application-context fixture** — `expect(appCtxFixture, 'assumed-shape divergence: application-context').toMatchObject({ resourceAccess: expect.arrayContaining([expect.objectContaining({ tenantId: expect.any(String), context: expect.objectContaining({ preview: expect.any(String) }) })]) })`. Capture point: T065.

#### T015 — `lib/sdk/canvas-reload.ts`

No assumed-shape annotation (void return, no fixture). Source: `sitecore:marketplace-sdk-client` base MutationMap.

- **RED-1: fires client.mutate('pages.reloadCanvas')** — mock asserts the correct call. Type: unit. File: `tests/unit/sdk/canvas-reload.test.ts`.
- **RED-2: swallows and logs errors — does NOT propagate** — mock rejects; assert `reloadPagesCanvas` resolves (does not throw); assert `console.error` or `console.warn` is called once. Type: unit.

---

### Epic C — Domain layer

**TDD note:** all Epic C modules are pure — no SDK dependency. Tests run without any client mock.

#### T016 — `lib/domain/types.ts`

Types-only module. No runtime behavior to test. Confirm via `tsc --noEmit` that `RedirectMapItem` is well-formed and `RedirectType` is a union of exactly 4 values. No test file needed beyond the typecheck gate.

#### T017 — `lib/url-mapping/parse.ts` + `serialize.ts`

- **RED-1: parse real-tenant UrlMapping value** — input `"%2ftest=%2FnewTest&%2fhello=%2Fworld"` → `{ rows: [{ source: '/test', target: '/newTest' }, { source: '/hello', target: '/world' }], warnings: [] }`. Source: captured real-tenant value from PRD § 9. Type: unit. File: `tests/unit/url-mapping/parse.test.ts`.
- **RED-2: parse lowercase %2f** — input `"%2ftest=%2fnewtest"` → same decoded source/target as `%2Ftest=%2Fnewtest`. Type: unit.
- **RED-3: serialize produces uppercase hex** — `serialize([{ source: '/test', target: '/newTest' }])` produces `"%2Ftest=%2FnewTest"` (uppercase `%2F`, not `%2f`). Type: unit. File: `tests/unit/url-mapping/serialize.test.ts`.
- **RED-4: serialize preserves order** — `serialize([{ source: '/b', target: '/b2' }, { source: '/a', target: '/a2' }])` produces `b` before `a` in the output. Type: unit.
- **RED-5: malformed segment — warn-and-skip** — `parse("noseparator&%2fvalid=%2Fgood")` → `{ rows: [{ source: '/valid', target: '/good' }], warnings: ['...'] }`. Type: unit.
- **RED-6: literal `=` in source** — `parse(serialize([{ source: '/key=val', target: '/dest' }])).rows[0].source === '/key=val'`. Type: unit.
- **RED-7: literal `&` in source** — same pattern with `&` in source. Type: unit.
- **RED-8: property test — round-trip stability** — `fast-check` arbitrary: `Mapping[]` with non-empty source and target. Property: `parse(serialize(rows)).rows` deep-equals `rows`. 200 samples minimum. File: `tests/unit/url-mapping/round-trip.test.ts`.
- **RED-9: property test — case normalization** — `fast-check` arbitrary raw string. Property: `parse(raw).rows` deep-equals `parse(raw.toUpperCase()).rows` where `toUpperCase()` is applied only to the percent-encoding characters (not to source/target text content). 100 samples.
- **RED-10: property test — order preservation** — `fast-check` arbitrary `Mapping[]`. Property: `parse(serialize(rows)).rows` array is the same length and same order as input. 200 samples.

#### T018 — `lib/import-export/schema.ts`

- **RED-1: valid redirect-manager/v1 JSON passes validation** — fixture from PRD § 10 data model. `validateExport(json)` returns `{ ok: true }`. Type: unit. File: `tests/unit/import-export/schema.test.ts`.
- **RED-2: rejects redirect-manager/v2** — `schema: "redirect-manager/v2"` → `{ ok: false, error: expect.stringContaining('version') }`. Type: unit.
- **RED-3: rejects malformed JSON** — `validateExport("not json")` → `{ ok: false, ... }`. Type: unit.
- **RED-4: rejects >1000 items** — `items: Array(1001).fill(...)` → `{ ok: false, error: expect.stringContaining('1000') }`. Type: unit.
- **RED-5: rejects missing required fields** — fixture with `items[0]` missing `id` → `{ ok: false }`. Type: unit.
- **RED-6: does not access nested fields on untrusted input** — a fixture that is a `null` at the top level returns `{ ok: false }` and does NOT throw a TypeError. Type: unit.

#### T019 — `lib/import-export/diff.ts`

- **RED-1: new item classification** — incoming item with GUID not in target → `classification: 'new'`. Type: unit. File: `tests/unit/import-export/diff.test.ts`.
- **RED-2: unchanged item classification** — incoming item with GUID in target, all fields identical → `classification: 'unchanged'`. Type: unit.
- **RED-3: conflicting item — redirectType changed** — incoming `redirectType: '301'`, existing `redirectType: 'ServerTransfer'` → `classification: 'conflicting'`, `fieldDiff.redirectType` present. Type: unit.
- **RED-4: conflicting item — mapping added** — incoming has one extra mapping → `classification: 'conflicting'`, `fieldDiff.mappings` reflects addition. Type: unit.
- **RED-5: conflicting item — name changed** — `fieldDiff.name` present. Type: unit.
- **RED-6: mapping comparison uses parse/serialize round-trip normalization** — one side has `%2ftest=%2Fnew`, the other has `%2Ftest=%2Fnew`; after normalization they are equal → `unchanged`. Type: unit.
- **RED-7: all three flags in fieldDiff** — `preserveQueryString`, `preserveLanguage`, `includeVirtualFolder` each diffed individually. Type: unit.

#### T020 — `lib/match/context-panel-matcher.ts`

- **RED-1: exact source match** — item with mapping `{ source: '/foo/bar', target: '/other' }`; page URL `'/foo/bar'` → match. Type: unit. File: `tests/unit/match/context-panel-matcher.test.ts`.
- **RED-2: exact target match** — item with mapping `{ source: '/other', target: '/foo/bar' }`; page URL `'/foo/bar'` → match. Type: unit.
- **RED-3: both source and target match same page URL** — both sides equal the page URL; row appears once (not duplicated). Type: unit.
- **RED-4: no match** — no item has source or target equal to page URL → returns `[]`. Type: unit.
- **RED-5: empty page URL does not crash** — `matchPageRedirects('', items)` returns `[]`. Type: unit.
- **RED-6: regex-pattern source excluded** — item with `source: '^/foo.*'` (contains regex chars). Current-page URL `'/foo/bar'`. Assert this item is NOT returned (ADR-0005 — exact-string only, regex skipped entirely). Type: unit.
- **RED-7: maps with zero matched rows filtered out** — input with 3 maps; only 1 has a match; result has length 1. Type: unit.
- **RED-8: grouped output structure** — result `[{ map: RedirectMapItem, matchedRows: Mapping[] }]` where `matchedRows` contains only the rows that matched, not all rows. Type: unit.

#### T021 — `lib/redirects/redirect-type-enum.ts` (assumed-shape: redirect-type-enum.json)

```
// assumed: RedirectType enum values per UI v1 § 1.6 + architecture § 4.4 2026-05-10
// tracked for divergence at T065 (real-tenant introspection query)
// source: tests/fixtures/graphql/redirect-type-enum.json
```

- **RED-1: REDIRECT_TYPES contains exactly 4 values** — `['301', '302', '307', 'ServerTransfer']`. Type: unit. File: `tests/unit/domain/redirect-type-enum.test.ts`.
- **RED-2: redirectTypeLabel produces non-empty string for every value** — all 4 values return a non-empty display label. Type: unit.
- **RED-3: divergence-detection — redirect-type-enum fixture** — fixture contains `enumValues` array; all 4 assumed values are present. `expect(fixture, 'assumed-shape divergence: redirect-type-enum').toMatchObject({ data: { __type: { enumValues: expect.arrayContaining([expect.objectContaining({ name: expect.any(String) })]) } } })`. Capture point: T065.

---

### Epic D — Context Panel

**Accessibility mandate:** every component test in this epic includes `axe-core` assertion + focus-order assertion.

#### T022 — Context Panel shell + persistent regex banner

- **RED-1: renders persistent alert banner** — `render(<PanelShell />)`; `screen.getByRole('alert')` returns element containing "Direct-string matches only". Type: UI. File: `tests/ui/context-panel/PanelShell.test.tsx`.
- **RED-2: banner is non-dismissible** — no close/dismiss button inside or near the banner. Type: UI.
- **RED-3: axe-core passes on shell** — `await expect(container).toHaveNoViolations()`. Type: UI + a11y.
- **RED-4: focus-order** — `Tab` from start of panel reaches banner, then page-context callout, then first interactive element below. Type: UI + a11y.
- **RED-5: dark-mode primary-foreground contrast** — if any primary button is rendered in this shell, assert resolved color is dark-on-lavender (§ 9.7). Type: UI + a11y.

#### T023 — Context Panel grouped-by-Map list

- **RED-1: renders correct group headers** — fixture `MatchedGroup[]` with 2 groups; assert both map names rendered; both `RedirectType` badges rendered. Type: UI. File: `tests/ui/context-panel/MatchGroup.test.tsx`.
- **RED-2: renders only true-flag chips** — fixture map with `preserveQueryString: true`, `preserveLanguage: false`; only "Pres. QS" chip visible. Type: UI.
- **RED-3: matched side rendered weight-500** — source side that matched the page URL has `font-weight` 500 class; other side is muted. Type: UI.
- **RED-4: hairline separator between groups** — at least one `<hr>` or separator between two groups. Type: UI.
- **RED-5: axe-core passes** — Type: UI + a11y.
- **RED-6: keyboard focus reveals edit/delete buttons** — `userEvent.tab()` to a mapping row; assert edit and delete buttons become visible (not hidden). Type: UI + a11y.

#### T024 — Context Panel Add modal

- **RED-1: step 1 shows searchable command list** — modal open; `screen.getByRole('combobox')` or `screen.getByRole('listbox')` renders map options. Type: UI. File: `tests/ui/context-panel/AddRedirectModal.test.tsx`.
- **RED-2: "+ Create new Redirect Map" is first option** — `getByText(/Create new Redirect Map/)` appears before any existing map in the list. Type: UI.
- **RED-3: step 2a — source field pre-populated** — picking existing map; source field value equals the page URL from context. Type: UI.
- **RED-4: step 2b — RedirectType initial state empty** — picking "Create new"; `select` for RedirectType has no selected value (placeholder visible). Type: UI.
- **RED-5: validation blocks save on empty target** — target field empty; click Save; button remains in error state; no mutation fired. Type: UI.
- **RED-6: cancel-with-dirty triggers confirm prompt** — type in target field; click Cancel; confirm dialog appears. Type: UI.
- **RED-7: pristine cancel closes silently** — click Cancel without typing; no confirm dialog; modal closes. Type: UI.
- **RED-8: on success — modal closes, list refreshes, pages.reloadCanvas fires** — mock mutation success; assert modal unmounts; assert `reloadPagesCanvas` mock called once. Type: UI.
- **RED-9: axe-core passes on modal** — Type: UI + a11y.
- **RED-10: focus trapped in modal** — `Tab` cycles within modal bounds; focus does not escape to panel behind. Type: UI + a11y.

#### T025 — Context Panel inline edit

- **RED-1: pencil click inflates row inline** — click pencil; source and target become `<input>` fields inline; Save and Cancel appear. Type: UI. File: `tests/ui/context-panel/MappingRow.test.tsx`.
- **RED-2: save fires updateRedirectMap with re-serialized UrlMapping** — edit target; click Save; mock asserts `updateRedirectMap` called with correct `UrlMapping` value (re-serialized). Type: UI.
- **RED-3: inline validation blocks save on empty source** — clear source; click Save; blocked. Type: UI.
- **RED-4: cancel-with-dirty triggers confirm** — edit target; click Cancel; confirm prompt appears. Type: UI.
- **RED-5: optimistic skeleton visible during in-flight mutation** — mock mutation with 200 ms delay; assert skeleton class on row during delay. Type: UI.
- **RED-6: success toast fires after save** — mock mutation success; assert Sonner toast rendered with success copy. Type: UI.

#### T026 — Context Panel inline delete

- **RED-1: trash click shows inline confirm** — click trash; "Delete this mapping?" text + Yes/No buttons visible within the row. Type: UI. File: (extend `MappingRow.test.tsx`).
- **RED-2: Yes fires updateRedirectMap with row removed** — click Yes; mock asserts `updateRedirectMap` called with the row absent from the serialized payload. Type: UI.
- **RED-3: No reverts without mutation** — click No; row returns to normal; no `updateRedirectMap` call. Type: UI.
- **RED-4: empty parent map remains intact** — deleting the last mapping; mock captures that `updateRedirectMap` was called (not `deleteRedirectMap`); parent map persists in list. Type: UI.

#### T027 — Context Panel loading state

- **RED-1: loading state renders 3 skeleton group blocks** — `render(<ContextPanelPage status="loading" />)`; assert 3 skeleton elements. Type: UI. File: `tests/ui/context-panel/states.test.tsx`.
- **RED-2: no Add button while loading** — assert "Add redirect" button absent in loading state. Type: UI.
- **RED-3: aria-live="polite" announces loading** — assert element with `aria-live="polite"` contains "Loading redirects". Type: UI + a11y.

#### T028 — Context Panel empty state

- **RED-1: empty state renders Blok empty-states component** — `render(<ContextPanelPage status="empty" />)`; assert icon and "No redirects affect this page" text. Type: UI. File: (extend `states.test.tsx`).
- **RED-2: Add button still present in empty state** — assert "Add redirect for this page" button visible. Type: UI.

#### T029 — Context Panel error state

- **RED-1: error alert renders with monochrome ✕ glyph** — `render(<ContextPanelPage status="error" error={...} />)`; assert `✕` (U+2715) present; assert NOT `❌` (U+274C). Type: UI. File: (extend `states.test.tsx`).
- **RED-2: collapsible "Show technical details" expands verbatim error** — click collapsible; assert verbatim error message visible. Type: UI.
- **RED-3: Retry button fires re-fetch** — click Retry; assert mock `listRedirectMaps` called again. Type: UI.
- **RED-4: focus moves to Retry on first error render** — assert `document.activeElement === retryButton` immediately after error state renders. Type: UI + a11y.
- **RED-5: aria-live="assertive" on error alert** — assert error container has `aria-live="assertive"`. Type: UI + a11y.

#### T030 — Context Panel orchestration

- **RED-1: full state-machine: subscribe → load → settle → render groups** — mock `subscribePageContext` emitting one message; mock `listRedirectMaps` resolving; mock `matchPageRedirects`; assert groups rendered. Type: UI. File: `tests/ui/context-panel/ContextPanelPage.test.tsx`.
- **RED-2: loading state shown during in-flight** — delay `listRedirectMaps` 100 ms; assert loading state first, then default state. Type: UI.
- **RED-3: error state shown on listRedirectMaps rejection** — reject mock; assert error state with verbatim error. Type: UI.
- **RED-4: reloadPagesCanvas fired after every successful write** — mock edit; assert canvas-reload called. Type: UI.

---

### Epic E — Dashboard Widget

#### T031 — Dashboard widget shell + 3 stat tiles

- **RED-1: renders three tiles with correct labels** — `render(<DashboardWidgetPage />)`; assert tiles with labels "Redirect maps", "Total mappings", "Last updated" visible. Type: UI. File: `tests/ui/dashboard-widget/DashboardWidgetPage.test.tsx`.
- **RED-2: footnote rendered** — assert "Redirect counts only — usage analytics ship in a follow-on release." text. Type: UI.
- **RED-3: tiles non-interactive** — no `<button>` inside tile elements; no click handlers. Type: UI.
- **RED-4: axe-core passes** — Type: UI + a11y.

#### T032 — Dashboard widget data flow

- **RED-1: tile values match fixture aggregates** — fixture site with 3 redirect maps, 12 total mappings; tiles render `3`, `12`, and the expected last-updated string. Type: UI. File: (extend `DashboardWidgetPage.test.tsx`).
- **RED-2: aggregation — sum of parsed UrlMapping rows** — fixture with 2 maps, mappings counts `5` and `7`; "Total mappings" tile renders `12`. Type: unit. File: `tests/unit/dashboard/aggregation.test.ts`.
- **RED-3: last-updated tile — relative for recent** — timestamp <24 h ago → relative display ("X hours ago"). Type: unit.
- **RED-4: last-updated tile — absolute for older** — timestamp >24 h ago → absolute date display. Type: unit.

#### T033 — Dashboard widget states

- **RED-1: loading — 3 skeleton tiles visible** — `render(<DashboardWidgetPage status="loading" />)`; assert 3 skeleton elements. Type: UI. File: `tests/ui/dashboard-widget/states.test.tsx`.
- **RED-2: empty — RouteOff icon + copy** — assert "No redirects configured for this site." text. Type: UI.
- **RED-3: error — destructive alert + retry** — assert `variant="destructive"` alert; retry button. Type: UI.
- **RED-4: footnote present in all states** — assert footnote text in all 3 states. Type: UI.

#### T034 — Dashboard widget a11y

- **RED-1: section aria-label present** — `screen.getByRole('region', { name: /Redirects summary/ })`. Type: UI + a11y. File: `tests/ui/dashboard-widget/a11y.test.tsx`.
- **RED-2: each tile has article aria-label** — `screen.getAllByRole('article')` has length 3; each has an aria-label containing the count. Type: UI + a11y.
- **RED-3: axe-core passes in default state** — Type: UI + a11y.
- **RED-4: axe-core passes in error state** — Type: UI + a11y.

---

### Epic F — Full Page

#### T035 — Full Page shell + responsive container

- **RED-1: two-pane layout at 1024px** — render with `window.innerWidth = 1024`; assert left rail and right pane both visible. Type: UI. File: `tests/ui/full-page/FullPageShell.test.tsx`.
- **RED-2: tabbed fallback at 800px** — render with `window.innerWidth = 800`; assert `Tabs` component visible; two-pane not visible. Type: UI.
- **RED-3: axe-core passes** — Type: UI + a11y.

#### T037 — Full Page left rail: collection + site picker + virtualized list

- **RED-1: collection picker populated from fixture** — fixture `collections: [{ id: '1', name: 'MyCollection' }]`; assert select option "MyCollection" visible. Type: UI. File: `tests/ui/full-page/LeftRail.test.tsx`.
- **RED-2: site picker disabled until collection selected** — assert site select has `disabled` attribute before collection picked. Type: UI.
- **RED-3: site picker filtered by selected collection** — pick collection; assert only sites from that collection appear. Type: UI.
- **RED-4: selected map row carries left-edge stripe** — after selecting a map, the row element has a CSS class or style corresponding to `--primary` left-edge stripe. Type: UI.
- **RED-5: long-list selection stability — 30 maps / 500 mappings** — render fixture with 30 maps each having ~17 mappings (500 total); pick map #20; assert map #20 selected; `Virtuoso` list still renders correctly; no layout thrash. Type: UI (performance gate). File: `tests/ui/full-page/LeftRail.long-list.test.tsx`. This is the § 9.10 long-list visibility check.
- **RED-6: arrow keys navigate list** — `userEvent.keyboard('{ArrowDown}')` moves selection. Type: UI + a11y.
- **RED-7: Enter selects focused map** — `userEvent.keyboard('{Enter}')` on focused map; assert right pane shows detail. Type: UI + a11y.

#### T038 — Full Page right pane: detail editor form

- **RED-1: form pre-fills on edit** — fixture `RedirectMapItem`; assert name input, RedirectType select, flag checkboxes all pre-filled. Type: UI. File: `tests/ui/full-page/DetailEditor.test.tsx`.
- **RED-2: RedirectType initial state empty on create** — `render(<DetailEditor mode="create" />)`; assert select has no value; placeholder "Pick a type…" visible. Type: UI.
- **RED-3: GUID badge shows last 12 chars** — fixture item with `id: '{E39157F3-A81F-4692-B05D-178D48C836DE}'`; badge shows `178D48C836DE`. Type: UI.
- **RED-4: GUID click copies full value** — mock `navigator.clipboard.writeText`; click badge; assert called with full GUID. Type: UI.
- **RED-5: validation blocks save on empty name** — clear name; click Save; blocked. Type: UI.
- **RED-6: validation blocks save on empty RedirectType** — clear selection; click Save; blocked. Type: UI.
- **RED-7: axe-core passes on create form** — Type: UI + a11y.
- **RED-8: axe-core passes on edit form** — Type: UI + a11y.

#### T039 — Full Page mappings table with drag-reorder

- **RED-1: mapping rows rendered** — fixture item with 3 mappings; assert 3 rows with source/target inputs. Type: UI. File: `tests/ui/full-page/MappingsTable.test.tsx`.
- **RED-2: drag-reorder preserves order in serialized UrlMapping** — simulate keyboard reorder (Space → ArrowDown → Space) on row 1; assert row 1's source appears after row 2's in the serialized output. Type: UI.
- **RED-3: Add mapping appends empty row** — click "+ Add mapping"; assert 4th row appears with empty inputs. Type: UI.
- **RED-4: per-row validation blocks save on empty source** — clear source in row 1; attempt save; blocked. Type: UI.
- **RED-5: drag-handle aria-label present on each row** — each drag handle has `aria-label` per UI v1 § 4.3. Type: UI + a11y.
- **RED-6: virtualization kicks in at >50 rows** — render 51 mapping rows; assert `Virtuoso` component used. Type: UI.

#### T040 — Full Page bottom action row: Save / Cancel / Delete

- **RED-1: Save calls updateRedirectMap on edit** — click Save; mock asserts `updateRedirectMap` called. Type: UI. File: `tests/ui/full-page/ActionRow.test.tsx`.
- **RED-2: Save calls createRedirectMap on create** — `mode="create"`; click Save; mock asserts `createRedirectMap` called. Type: UI.
- **RED-3: button skeleton visible during in-flight** — delay mutation 150 ms; assert Save button shows loading indicator. Type: UI.
- **RED-4: cancel-with-dirty triggers confirm** — edit name; click Cancel; confirm prompt appears. Type: UI.
- **RED-5: Delete button hidden on create** — `mode="create"`; assert no "Delete map" button. Type: UI.

#### T041 — Full Page delete-map confirm modal

- **RED-1: confirmation text names the map and count** — fixture item named "My Map" with 3 mappings; confirm dialog shows "Delete My Map?" and "3 mappings". Type: UI. File: `tests/ui/full-page/DeleteMapModal.test.tsx`.
- **RED-2: confirm calls deleteRedirectMap** — click Delete; mock asserts `deleteRedirectMap` called. Type: UI.
- **RED-3: cancel does not call deleteRedirectMap** — click Cancel; assert no call. Type: UI.

#### T042 — Full Page right pane: empty states

- **RED-1: no site selected → "Pick a site to begin"** — `render(<RightPane selectionState="no-site" />)`; assert that text. Type: UI. File: `tests/ui/full-page/RightPaneEmpty.test.tsx`.
- **RED-2: site picked but no map → "Pick a redirect map"** — assert "Pick a redirect map" text. Type: UI.
- **RED-3: keyboard hint visible** — assert "↑ / ↓ to navigate" hint text. Type: UI.

#### T044 — Full Page error states

- **RED-1: right pane error shows destructive alert** — fixture write failure; assert `Alert variant="destructive"` above form. Type: UI. File: `tests/ui/full-page/ErrorStates.test.tsx`.
- **RED-2: verbatim GraphQL error in collapsible** — expand "Show technical details"; assert verbatim error string visible. Type: UI.
- **RED-3: retry re-fires the failed operation** — click Retry; assert the mutation is called again. Type: UI.
- **RED-4: rail error state renders smaller alert** — rail fetch failure; assert smaller alert in rail area. Type: UI.

#### T046 — Sonner toasts

- **RED-1: success toast renders with ✓ glyph** — mock successful save; assert toast contains `✓` (U+2713). Type: UI. File: `tests/ui/full-page/Toasts.test.tsx`.
- **RED-2: glyph is NOT ❌ or ✅** — assert toast does NOT contain U+274C or U+2705. Type: UI.
- **RED-3: toast auto-dismisses in 3 s** — use fake timers; advance 3001 ms; assert toast unmounted. Type: UI.
- **RED-4: toast has role="status" aria-live="polite"** — assert wrapper has those attributes. Type: UI + a11y.

---

### Epic G — Import / Export

#### T047 — Export JSON download

- **RED-1: exported JSON validates against redirect-manager/v1 schema** — mock `listRedirectMaps` returning fixture items; trigger export; parse downloaded JSON; `validateExport(json).ok === true`. Type: unit + UI. File: `tests/unit/import-export/export.test.ts`.
- **RED-2: exported JSON includes item GUID** — each item in `items[]` has an `id` field matching the fixture's GUID. Type: unit.
- **RED-3: no analytics fields in export** — assert exported item does NOT have `usageCount`, `usageLastSyncedAt`. Type: unit.
- **RED-4: filename includes site name and ISO timestamp** — assert download filename matches `redirects-<site>-<ISO-timestamp>.json` pattern. Type: UI.
- **RED-5: export toast fires** — assert Sonner toast "Exported N redirect maps". Type: UI.

#### T049 — Import schema validation

- **RED-1: malformed JSON rejected before any preview** — upload non-JSON text; assert error alert rendered; no preview rendered. Type: UI. File: `tests/ui/full-page/ImportFlow.test.tsx`.
- **RED-2: wrong schema version rejected** — upload `{ "schema": "redirect-manager/v2", ... }`; assert error alert. Type: UI.
- **RED-3: missing required field rejected** — upload item with no `id`; assert error. Type: UI.
- **RED-4: no field access on untrusted input before schema check** — spy on `validateExport`; assert it is called before any field access. Type: unit.

#### T050 — Import preview screen

- **RED-1: summary header shows correct counts** — fixture 2 new, 1 conflict, 1 unchanged; assert "2 new · 1 conflicting · 1 unchanged" in summary. Type: UI. File: `tests/ui/full-page/ImportPreview.test.tsx`.
- **RED-2: new item defaults to Create action** — `New` classified item shows `Create` pre-selected. Type: UI.
- **RED-3: conflict item has empty picker** — `Conflict` item has no default action; red dot indicator visible. Type: UI.
- **RED-4: unchanged item defaults to Skip** — `Unchanged` item shows `Skip` pre-selected. Type: UI.
- **RED-5: Show diff expands field-by-field changes** — click "Show diff" on conflict row; assert field comparison table rendered. Type: UI.
- **RED-6: bulk action syncs all conflict rows** — pick "Overwrite" in bulk select; all conflict rows' pickers update to Overwrite. Type: UI.
- **RED-7: virtualized list renders fixture with 50+ items** — 60 import items; assert `Virtuoso` used. Type: UI.

#### T051 — Confirm disabled until resolved

- **RED-1: Confirm disabled with unresolved conflicts** — 1 conflict with no action picked; Confirm button has `disabled` attribute. Type: UI. File: `tests/ui/full-page/ImportConfirm.test.tsx`.
- **RED-2: Confirm enabled after all resolved** — pick action for conflict; Confirm becomes enabled. Type: UI.
- **RED-3: tooltip shows unresolved count** — hover disabled Confirm; assert tooltip "Resolve all conflicts to enable import" with count. Type: UI + a11y.

#### T052 — Import apply with progress

- **RED-1: progress bar advances per item** — mock 3 items each with 100 ms mutation; advance timers; assert `<Progress>` value increases. Type: UI. File: `tests/ui/full-page/ImportApply.test.tsx`.
- **RED-2: Skip items are no-ops** — item with `action: 'skip'`; assert `createRedirectMap` and `updateRedirectMap` NOT called for that item. Type: UI.
- **RED-3: Create calls createRedirectMap** — item with `action: 'create'`; assert `createRedirectMap` called. Type: UI.
- **RED-4: Overwrite calls updateRedirectMap** — item with `action: 'overwrite'`; assert `updateRedirectMap` called. Type: UI.
- **RED-5: per-item failure captured — does not block subsequent items** — second of 3 items rejects; assert third item's mutation still called; summary shows 1 failed. Type: UI.
- **RED-6: aria-live announces progress** — assert `aria-live` region text updates with progress. Type: UI + a11y.

#### T053 — Import summary

- **RED-1: success summary shows Created / Overwritten / Skipped / Failed counts** — mock outcomes 2 created, 1 overwritten, 1 skipped, 0 failed; assert all 4 counters visible. Type: UI. File: `tests/ui/full-page/ImportSummary.test.tsx`.
- **RED-2: "Retry failed items only" visible only when failures > 0** — 0 failures → no retry button; 1 failure → retry button visible. Type: UI.
- **RED-3: Retry-failed-only calls mutations only for failed GUIDs** — mock 1 failure; click Retry; assert only that GUID's mutation called again. Type: UI.
- **RED-4: final aria-live settlement announcement** — assert announcement "Import complete: X of N succeeded" after all items processed. Type: UI + a11y.

---

### Epic H — Theme + a11y polish

#### T055, T056 — Focus-visible and aria-live audits

`non-code — manual checklists. No automated test file. See docs/smoke-live-walkthrough.md for the manual audit procedure.`

Evidence of automated coverage: T022–T053 each include `axe-core` assertions and focus-order assertions inline.

#### T057 — Monochrome glyph audit

- **RED-1: structural grep for forbidden codepoints** — part of T062 structural tests. `tests/structural/no-color-emoji.test.ts` reads all `.tsx` and `.ts` files under `app/`, `components/`, `lib/`; asserts zero occurrences of U+274C, U+2705, U+26A0 followed by VS16 (U+FE0F), U+2757. Type: structural.

This RED test is part of T062 — see below.

#### T058 — Dark-mode contrast verification

`non-code — manual screenshot pair review (light + dark) on every surface.`

Automated coverage: structural test T062 theme-override guard + per-component dark-mode contrast assertions (§ 9.7) in T022, T031, T035.

---

### Epic I — Test stack and structural guards

#### T059 — SDK wrapper unit tests

Test file grouping only — covered by the per-task specs above (T009–T015). `tests/unit/sdk/` is the canonical location. All green = M9 milestone.

#### T060 — UrlMapping property tests

Covered in T017 specs (RED-8, RED-9, RED-10). File: `tests/unit/url-mapping/round-trip.test.ts`. Minimum 200 samples for round-trip stability, 100 for case normalization, 200 for order preservation.

#### T061 — Domain layer unit tests

Covered in T018, T019, T020, T021 specs above. No additional cases needed.

#### T062 — Structural tests (SDK boundary + XSS + theme guard + glyph guard)

- **RED-1: SDK boundary** — `tests/structural/sdk-boundary.test.ts` reads all `.ts` and `.tsx` files under `app/`, `components/` (excluding `components/providers/marketplace.tsx`), `lib/` (excluding `lib/sdk/`). Asserts zero imports from `@sitecore-marketplace-sdk/*`. Pattern modeled on `products/last-edit-trail/site/__tests__/structural.test.ts`. Type: structural.
- **RED-2: no raw HTML injection** — `tests/structural/no-html-injection.test.ts` reads all `.tsx` files; asserts zero matches for the React unsafe-HTML prop name (constructed at test-time from fragments, e.g. `'dangerous' + 'lySetInner' + 'HTML'`) AND for `\.innerHTML\s*=`. Type: structural.
- **RED-3: dark-mode primary-foreground override present** — `tests/structural/theme-override.test.ts` reads `app/globals.css`; asserts `--primary-foreground: var(--color-blackAlpha-900)` inside both `@media (prefers-color-scheme: dark)` and `.dark` blocks AND the verbatim override comment from T007. Type: structural.
- **RED-4: no color-emoji codepoints** — `tests/structural/no-color-emoji.test.ts` reads all `.tsx` and `.ts` under `app/`, `components/`, `lib/`; asserts zero occurrences of U+274C (`❌`), U+2705 (`✅`), `\u26a0\ufe0f` (⚠️ with VS16), U+2757 (`❗`). Type: structural.

All four RED tests FAIL before the relevant production code is written. They are the first tests the Developer writes for Epic I — before implementing any guards, the tests demonstrate that guards are absent.

---

### Epic J — Marketplace install + smoke

#### T063 — Cloud Portal registration runbook

`non-code — docs authoring. No automated tests. Manual smoke: operator follows runbook end-to-end and all 3 extension points are reachable.`

#### T064 — Host-frame visual smoke harness

`E2E — operator-driven per § 9.8. Automated component of the harness is the Playwright spec at tests/e2e/host-frame-smoke.spec.ts. Manual component: operator supplies host URL + app origin at /test time. If host URL not supplied, status = tested_pending_smoke + WARN in smoke_outcomes.`

#### T065 — Real-tenant CRUD round-trip checklist

`non-code — manual E2E checklist. Primary function: closes the assumed-shape annotations for sites-list.json, collections-list.json, redirect-map-list.json, redirect-map.create.json, redirect-map.update.json, redirect-map.delete.json, application-context.json, page-context.json, redirect-type-enum.json. When the real-tenant fixture captures replace the assumed fixtures and any shape differs, the corresponding divergence-detection assertions (§ 10 specs for T010–T014, T021) MUST fail — that is the intended behavior. Fix the wrapper, not the assertion.`

#### T066 — Real-tenant import/export round-trip checklist

`non-code — manual E2E checklist. Capture point for GUID-preservation behavior (ADR-0009 OQ-B). Document whether createItem accepted a caller-supplied id; if not, surface the "newly minted ID" indicator as a fast-follow.`

#### T067 — Live-walkthrough checklist

`non-code — manual E2E. Zero unrecoverable errors required for m5 gate.`

QA Specialist will produce per-Task-ID test specs covering the cases listed in § 4b, expanded with assumed-shape divergence-detection cases.

## Handoff Metadata

- **Canonical run manifest:** `products/redirect-manager/project-planning/workflow/run-20260509T191751Z.json`
- **Source PRD:** `products/redirect-manager/project-planning/PRD/prd-000.md`
- **Source architecture:** `products/redirect-manager/project-planning/architecture/architecture-20260509T191751Z.md`
- **Selected UI variant:** `products/redirect-manager/project-planning/ui-design/ui-design-20260509T191751Z-v1.md` (Operator Console)
- **POC clickdummy (visual ground truth):** `products/redirect-manager/pocs/poc-v1/`
- **ADRs (all accepted):** ADR-0001 → ADR-0013 in `products/redirect-manager/project-planning/ADR/`
- **Recommended next command:** QA Specialist enrichment (in-place: § 9 + § 10), then `/implement` (pipeline mode).
- **Recommended next input file:** the same file (this breakdown), enriched in place by QA Specialist (07).
