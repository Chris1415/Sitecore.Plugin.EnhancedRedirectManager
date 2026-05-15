# <img src="https://hachweb.wordpress.com/wp-content/uploads/2025/08/2022-05-03-09_10_13-receipt-stickerapp-removebg-preview.png" alt="Hahn-Solo logo" height="40" align="center" /> Redirect Manager

**Author:** [Christian Hahn](https://www.linkedin.com/in/christian-hahn-solo/) — _Technical Product Manager DevEx & SDKs @ Sitecore_

A Sitecore Marketplace client-side app that gives content authors, site managers, and Sitecore implementers a purpose-built UI for redirect operations across a SitecoreAI tenant. It replaces the awkward Content-Editor workflow for managing items under `/sitecore/content/{COLLECTION}/{SITE}/Settings/Redirects/*` and surfaces redirects where editors already work — inside the Pages editor, on the site dashboard, and on a dedicated full-page workshop.

<p align="center">
  <img src="docs/screenshots/full-page-prd002-general.png" alt="Redirect Manager — Full Page surface (PRD-002 redesign): workspace hero with real Last modified line, 5-tile stat strip (Redirects · 301 · 302 · Server Transfer · Conflicts), wider rail of Redirect Maps, mappings table" width="960" />
</p>
<p align="center">
  <img src="docs/screenshots/context-panel-prd002-general.png" alt="Context Panel inside Pages editor (PRD-002): page route as headline, compact match-scope notice with inline refresh + theme actions, two-column split hero (1 → sources to this page · 1 this page → targets), Quick redirect inline form with direction toggle, existing redirects list with subtle redirect-type pills" width="720" />
</p>
<p align="center">
  <img src="docs/screenshots/dashboard-widget-prd002-wide.png" alt="Dashboard Widget — PRD-002 wide variant (4-column on a full-width dashboard iframe, with all-healthy + collisions badges, 8 real stat tiles, top destinations bar list, and recently-shipped-maps panel)" width="960" />
</p>

> **PRD-002 V4 Blok Elevated redesign shipped (2026-05-15).** All three extension-point routes now use V4 Blok Elevated chrome (frosted glass, gradient text, plume backdrop on Full Page, mixed motion budget). The Dashboard Widget screenshot above is the **wide variant** captured on the Cloud Portal Test App (~1800px iframe) — header status badges (all-healthy placeholder + real source-URL collision count), 8 real stat tiles (Maps, Mappings, 301/302/Server Transfer, Avg/map, Largest map, Last updated), top-destinations bar list, and a real recently-shipped-maps panel sourced from `map.updatedAt`. The Full Page hero image is from the live PRD-002 build — real Last modified line, real 5-tile stat strip including a click-through Conflicts tile, and four hero CTAs (Refresh / View activity / Validate health / Publish all). The Context Panel image is also from the live PRD-002 build — two-column split hero (sources-to-this-page vs this-page-to-targets), one-line match-scope notice, full-width shell, inline Quick redirect form with a direction toggle (`→ this page` ↔ `this page →`). See [CHANGELOG.md](CHANGELOG.md) for what changed.

## What this does

Redirect Manager exposes three Cloud Portal extension points, all backed by a single canonical data source — Sitecore Authoring GraphQL.

- **Context Panel** in the Pages editor. For the page being edited, list every redirect that affects it (where this page is the source OR target by exact-string match), grouped by parent Redirect Map. Add, edit, and delete inline without leaving Pages.
- **Dashboard Widget** on a site dashboard. Three at-a-glance count tiles — Redirect Map items, individual mappings, last-updated timestamp. Site picker at the top right (the SDK does not surface "current site" today; pick once and the widget remembers it via `localStorage`).
- **Full Page** workshop. Site-collection + site picker, virtualized Redirect Map list, full item and mapping CRUD with drag-reorder, JSON import / export keyed by Sitecore item GUID with a per-conflict three-action picker (create / overwrite / skip).

MVP operates in the default content language `en` only. Multilingual CRUD, usage analytics (hit counters, broken-vs-healthy), template sync-back, regex matching, and concurrent-edit detection are all deferred to follow-on PRDs.

## Tech stack

| Layer | Choice |
|---|---|
| Scaffold | `sitecore:setup-marketplace-client-side` (Mode A only) — no server-side OAuth proxy |
| Framework | Next.js App Router on `next@16.x` + React 19 |
| SDK | `@sitecore-marketplace-sdk/client` + `@sitecore-marketplace-sdk/xmc` (versions pinned in `site/package.json`) |
| UI | Blok primitives via shadcn registry, Tailwind v4, lucide icons |
| Data | Sitecore Authoring GraphQL via `xmc.authoring.graphql` |
| State / forms | `react-hook-form`, `zod` v4, `sonner` for toasts |
| Lists | `react-virtuoso` for the redirect-map list |
| Drag-reorder | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Tests | Vitest + `@testing-library/react` + jsdom + `fast-check` for property-based tests |

The scaffold ADR is [ADR-0002](project-planning/ADR/adr-0002-marketplace-sdk-mode-a-scaffold.md); the scaffold command itself is recorded there. Architecture variant rationale lives in [`docs/architecture.md`](docs/architecture.md).

## Getting started

### Prerequisites

Marketplace apps cannot run at plain `http://localhost` — Cloud Portal embeds the iframe over HTTPS and the parent enforces secure-context constraints. See the `sitecore:marketplace-sdk-testing-debug` skill for the full setup (mkcert root CA, Chrome Local Network Access, etc).

1. **Node** — version pinned by `site/package.json` (Next 16 + React 19 toolchain).
2. **mkcert** — local trusted root CA for `https://localhost`.
3. **A Cloud Portal Test App registration** — see [`site/docs/registration.md`](site/docs/registration.md) for the runbook. You need three extension-point entries mapped to:
   - `xmc:pages:contextpanel` → `/context-panel`
   - `xmc:dashboardblocks` → `/dashboard-widget`
   - `xmc:fullscreen` → `/full-page`
4. **A SitecoreAI tenant** where the Cloud Portal user has Authoring GraphQL write access on `Settings/Redirects` items.

### Install and run

```bash
cd site
npm install
cp .env.example .env.local   # populate with values from your Cloud Portal Test App
npm run dev                  # boots Next on https://localhost:3000
```

Open the registered Cloud Portal Test App and navigate to one of the three extension points to load the corresponding route.

### Common commands

```bash
npm run dev          # dev server with Turbopack
npm run build        # production build
npm run lint         # ESLint (Next + Blok overrides)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest single-pass
npm run test:watch   # Vitest watch mode
```

## Project structure

```
products/redirect-manager/
├── README.md                ← you are here
├── CHANGELOG.md             ← release entries derived from /ship reports
├── docs/                    ← architecture narrative + decision log
│   ├── architecture.md      ← includes § 11 PRD-002 V4 redesign architecture
│   ├── decisions.md         ← includes PRD-002 ADR-0024–0030 section
│   └── screenshots/         ← README screenshots (refresh after PRD-002 live walkthrough)
├── pocs/poc-v1/             ← PRD-000 UI variant POC clickdummy
├── pocs/poc-v1-prd002/      ← PRD-002 V4 canonical visual reference (ground truth for m2 smoke)
├── project-planning/        ← PRDs, ADRs, task breakdowns, run manifests (operational)
│   ├── PRD/
│   ├── ADR/                 ← ADR-0024 through ADR-0030 added for PRD-002
│   ├── architecture/
│   ├── plans/
│   ├── smoke/               ← operator smoke checklists for m2 + m5 (PRD-002)
│   ├── ui-design/
│   └── workflow/
└── site/                    ← implementation
    ├── app/
    │   ├── context-panel/page.tsx
    │   ├── dashboard-widget/page.tsx
    │   └── full-page/page.tsx   ← imports elevated-plumes.css (Full Page only)
    ├── components/
    │   ├── context-panel/       ← QuickRedirectForm replaces AddRedirectModal (PRD-002)
    │   ├── dashboard-widget/    ← DashboardHero, Sparkline, TopDestinations, RecentlyShipped, HealthBadge (PRD-002)
    │   ├── full-page/           ← WorkspaceHero, StatStrip added (PRD-002)
    │   ├── providers/marketplace.tsx
    │   └── ui/                  ← Blok primitives + PreviewDataBanner, GradientText, DecorativeCta (PRD-002)
    ├── hooks/                   ← useCountUp, useLetterReveal (PRD-002)
    ├── lib/
    │   ├── sdk/             ← typed SDK wrappers (the boundary)
    │   ├── domain/
    │   ├── mocks/           ← PREVIEW_DATA constants + PREVIEW_DATA_ACTIVE flags (PRD-002)
    │   ├── url-mapping/     ← parse + serialize per ADR-0008
    │   ├── import-export/
    │   ├── match/
    │   └── redirects/
    ├── styles/              ← elevated.css + elevated-plumes.css + surfaces.css (PRD-002)
    ├── docs/                ← operator-facing smoke checklists + registration runbook (PRD-002 additions)
    └── tests/
        ├── fixtures/graphql/   ← real-tenant captures
        ├── structural/
        ├── ui/
        └── unit/
```

## Architecture in three paragraphs

The app is a **client-side Marketplace app (Mode A)**. Every Sitecore call rides the operator's authenticated Cloud Portal session — there is no server-side OAuth proxy, no `experimental_createXMCClient`, no backend the operator must provision. Three Next.js App Router routes are registered against three Cloud Portal extension points; the root route returns `notFound()` so the iframe URL cannot be abused as a standalone page.

All redirect data flows through **Authoring GraphQL via `xmc.authoring.graphql`** — a single canonical source for reads and writes. There is no KV cache, no parallel datastore, no analytics layer in MVP. Site and collection discovery uses `xmc.sites.listSites` / `listCollections`. The `UrlMapping` field is a single URL-encoded string of `source=target` pairs joined by `&`; the app parses, edits, and re-serializes it losslessly — round-trip stability is enforced via property-based tests.

JSON import / export uses a **versioned schema (`redirect-manager/v1`)** keyed by **Sitecore item GUID** so rule sets can be promoted between environments. Cross-environment imports create fresh GUIDs on the target tenant because the Authoring `createItem` mutation does not accept a caller-supplied id; the import summary surfaces this. Conflict resolution is three actions only — create / overwrite / skip — with a per-item diff drawer.

For the full narrative see [`docs/architecture.md`](docs/architecture.md). For the decision log see [`docs/decisions.md`](docs/decisions.md). For per-ADR detail see [`project-planning/ADR/`](project-planning/ADR/).

## Feature tour

### Dashboard Widget

At-a-glance count tiles per site — maps, individual mappings, last-updated timestamp. Embeds on the SitecoreAI site dashboard. The widget includes a site picker at the top right because the SDK does not surface "current site" to dashboard widgets today (operator's last pick persisted via `localStorage`).

<p align="center">
  <img src="docs/screenshots/dashboard-widget.png" alt="Dashboard Widget — focused view of the redirect count tiles" width="720" />
</p>
<p align="center">
  <img src="docs/screenshots/dashboard-widget-context.png" alt="Dashboard Widget rendered in the full SitecoreAI site overview" width="720" />
</p>

### Context Panel (inside the Pages editor)

For the page being edited, lists every redirect that affects it (where this page is the source OR target by exact-string match), grouped by parent Redirect Map. Add, edit, and delete inline without leaving Pages. PRD-002 replaces the add-redirect modal with an always-visible inline `QuickRedirectForm` — no button click needed to start adding a redirect. The PRD-002 polish also adds a two-column hero (inbound vs outbound), a one-line match-scope notice, a source/target direction toggle on the Quick redirect form, and a full-width shell that follows the host iframe.

**General view.** Page route as the hero headline; the redirect-count noun phrase is delegated to the split hero tile below. Two columns split matched mappings into *sources → this page* (other URLs that redirect here) and *this page → targets* (URLs this page itself redirects to) — each side count-ups from 0 independently and replays on every refresh. The compact match-scope notice shares a row with a refresh icon button (spins while loading, replays the count-ups) and the theme toggle.

<p align="center">
  <img src="docs/screenshots/context-panel-prd002-general.png" alt="Context Panel — PRD-002 general view rendered inside Sitecore Pages: eyebrow 'Redirects for this page', page route '/' as the gradient headline, one-line 'Exact match only — no regex, query string, or language variants.' notice flanked by refresh + theme icons, two-column hero (1 → sources to this page · 1 this page → targets), Quick redirect input with direction toggle '→ this page', existing redirects list with subtle 'Server Transfer' pills and an Edit map row at the bottom" width="720" />
</p>

**Edit map settings.** The per-group **Edit map** button opens a modal to rename the map and adjust its redirect type + three flags (Preserve query string, Preserve language, Include virtual folder). Mappings themselves stay untouched — they are edited inline in the list (see below).

<p align="center">
  <img src="docs/screenshots/context-panel-prd002-edit-map.png" alt="Context Panel — Edit map settings modal: Map name input (My Redirect Map 2), Redirect type select (Server Transfer), three flag checkboxes (Preserve Query String, Preserve Language, Include Virtual Folder), Save / Cancel buttons" width="720" />
</p>

**Edit individual redirect.** Clicking the pencil on any row swaps it for an inline edit form with source + target inputs and Save / Cancel actions. Editing checks for in-map duplicate sources before writing — the server dedupes silently, so the guard surfaces the collision as an explicit toast instead.

<p align="center">
  <img src="docs/screenshots/context-panel-prd002-edit-redirect.png" alt="Context Panel — inline edit of an existing redirect row: source input ('/') and target input ('/test222') side by side with an arrow between them, Save and Cancel buttons underneath, the rest of the panel chrome unchanged" width="720" />
</p>

### Full Page (the power-user workshop)

Site-collection + site picker drives a virtualized list of Redirect Maps. Per map: editable name, redirect type, three flags, plus a mappings table with inline add/edit/delete and drag-reorder. Import / export JSON keyed by Sitecore item GUID with a per-conflict three-action picker. The PRD-002 redesign adds a workspace hero (real Last modified line + four hero CTAs), a 5-tile stat strip (Redirects · 301 · 302 · Server Transfer · Conflicts), a click-through Conflicts resolver, and a View activity popover sourced from `map.updatedAt`.

**General view.** Workspace hero, 5-tile stat strip, rail of Redirect Maps, selected map with mappings table.

<p align="center">
  <img src="docs/screenshots/full-page-prd002-general.png" alt="Full Page — PRD-002 general view: hero with Last modified line and four CTAs, 5-tile stat strip (Redirects 9 / 301 Permanent 2 / 302 Temporary 3 / Server Transfer 4 / Conflicts 2 in warning tone), wider rail listing four Redirect Maps, selected map shows flags + mappings table" width="960" />
</p>

**Conflict management.** When two mappings share the same source URL only one resolves at runtime — the others are dead config. The Conflicts tile in the stat strip becomes clickable (warning tone) when collisions exist; it opens a dialog that groups every duplicate source across all maps for the selected site, with an **Open map** shortcut per occurrence.

<p align="center">
  <img src="docs/screenshots/full-page-prd002-conflicts.png" alt="Full Page — Conflicts dialog: two conflicting source URLs (/hello and /) with their per-map occurrences listed (map name, source → target, redirect type) and an Open map button on each row" width="960" />
</p>

**Recent activity.** The hero **View activity** button opens a popover with the most-recently-modified maps for the current site (top 8 by `map.updatedAt`, name + relative time + author, click-through to select the map in the rail).

<p align="center">
  <img src="docs/screenshots/full-page-prd002-activity.png" alt="Full Page — View activity popover: most-recently-modified maps for this site (test 9m ago, SEO 1h ago, My Redirect Map 2 1h ago, Black Friday 1h ago — each with the modifier identity and the map's redirect type)" width="960" />
</p>

**Create a new map.** The **New map** top-right button opens a dialog that creates a Redirect Map under `{currentSite}/Settings/Redirects` with name, redirect type, and the three flags.

<p align="center">
  <img src="docs/screenshots/full-page-prd002-new-map.png" alt="Full Page — New redirect map dialog: name field (My Redirect Map), Type select (Server Transfer chosen), three flag checkboxes (Preserve query string, Preserve language, Include virtual folder), Cancel / Create buttons" width="960" />
</p>

**Inline mapping edit.** Per-mapping inline edit row with drag-reorder.

<p align="center">
  <img src="docs/screenshots/full-page-mapping-edit.png" alt="Full Page — inline mapping edit row" width="900" />
</p>

**Import.** Versioned `redirect-manager/v1` JSON keyed by Sitecore item GUID. Pick a file or paste the JSON; the next step previews per-item conflicts and offers a three-action picker (create / overwrite / skip).

<p align="center">
  <img src="docs/screenshots/full-page-prd002-import.png" alt="Full Page — Import redirect maps dialog: file picker, or-separator, JSON paste textarea with redirect-manager/v1 sample, Cancel / Validate & preview buttons" width="960" />
</p>

**Export.** Versioned JSON export with three delivery modes — open in a new tab, copy to clipboard, or download (download is queued for a follow-on PRD).

<p align="center">
  <img src="docs/screenshots/full-page-prd002-export.png" alt="Full Page — Export menu open from the top bar: Open in new tab, Copy to clipboard, Download (marked SOON)" width="960" />
</p>

## Known limitations (PRD-000 MVP)

- **`en` only.** Multilingual CRUD deferred to PRD-001. [ADR-0010](project-planning/ADR/adr-0010-mvp-language-scope-en-only.md)
- **Exact-string match in the Context Panel.** Regex source rows are skipped. A non-dismissible banner makes this explicit in the UI. [ADR-0005](project-planning/ADR/adr-0005-context-panel-exact-match-only.md)
- **No concurrent-edit detection.** Last writer wins. [PRD § R10]
- **No usage analytics.** Counts and last-updated timestamps only. Analytics deferred to PRD-001.
- **Cloud Portal does not pass per-site context to Dashboard Widget embeds.** The widget falls back to a site picker (operator's last pick persisted via `localStorage`).
- **Import on cross-tenant promotion mints fresh GUIDs** for `create` actions. The import summary calls this out per item.

## Smoke and validation

Before `/ship` the operator runs five real-tenant smoke checklists, all documented under [`site/docs/`](site/docs/):

- [`registration.md`](site/docs/registration.md) — Cloud Portal Test App registration (one-time)
- [`smoke-crud.md`](site/docs/smoke-crud.md) — CRUD round-trip (m3)
- [`smoke-import-export.md`](site/docs/smoke-import-export.md) — Import / export round-trip (m4)
- [`smoke-live-walkthrough.md`](site/docs/smoke-live-walkthrough.md) — 5-minute live walkthrough (m5)
- [`host-frame-smoke.md`](site/docs/host-frame-smoke.md) — 5-axis pixel comparison (m2)

Outcomes get recorded in `project-planning/workflow/current-run.json` → `smoke_outcomes` and are required before `/ship` can flip status to `shipped` (vs `shipped_with_caveats`).

## Roadmap

- **PRD-001** — Cancelled. Multilingual CRUD is blocked by the stock Sitecore Redirect Map template having `UrlMapping` as a SHARED field (no language axis). See [ADR-0023](project-planning/ADR/adr-0023-cancel-prd-001-multilingual-template-shared.md).
- **PRD-002** — SHIPPED (2026-05-15). V4 Blok Elevated visual redesign of all three extension-point routes. See [CHANGELOG.md](CHANGELOG.md).
- **PRD-003 (candidate)** — Data plumbing: wire real data into the PRD-002 visual chassis by flipping `PREVIEW_DATA_ACTIVE` flags. Hero stats, sparkline, top-destinations, recently-shipped become live.
- **Later** — Regex-aware Context Panel matching, concurrent-edit detection, bulk operations, audit log, public Marketplace submission. See PRD-000 § 15 Future Opportunities.

## License

Internal — distribution policy TBD.
