# ADR-0025: Mock-data architecture — PREVIEW_DATA constants + PREVIEW_DATA_ACTIVE flags + per-surface "Preview data" banner

## Status

Accepted

## Context

V4 Blok Elevated (ADR-0024) ships speculative content on Full Page (stat strip with Mappings count, 301 count, 302 count, Conflicts count; hero banner with "Last publish 14 minutes ago by Anna", "all healthy" badge) and on Dashboard Widget (hero stat number with `+412 this week` delta; gradient sparkline; top-destinations list; "Recently shipped · Last 24 hours" mini-widget; "by Anna" footer; "all healthy" badge; 4th metric tile beyond the 3 real PRD-000 count tiles). None of this content has a real data source in PRD-000 today — it would require new analytics infrastructure (hit tracking, time-series aggregation, last-publish authorship attribution, health checks) that belongs to a future "data plumbing" PRD.

Three approaches were considered for handling the speculative content during PRD-002:

1. **Drop the speculative content entirely.** Ship V4 chrome without the speculative elements. Preserves "honest UX" but loses much of V4's marketing-grade impression — the stat strip + hero stat + sparkline + top-destinations are the visual elements that signal premium product.

2. **Ship the future data-plumbing work alongside PRD-002.** Bundle redesign + analytics infrastructure in one PRD. Massive scope inflation; requires Upstash or equivalent KV provisioning + head-app instrumentation + aggregation pipelines + per-redirect hit tracking. PRD-001 was cancelled exactly because of this kind of scope ambition without the data foundation.

3. **Ship the visual chassis with hardcoded mocks; defer real-data wiring to a follow-on PRD.** Operator-visible labeling ("Preview data" banners) makes the mocks transparent so operators don't mistake them for live metrics. The follow-on PRD swaps mocks for live data by flipping a single per-surface flag — no design work, no component refactor.

Operator directive on 2026-05-13: *"What I want is the great new design with the values from today. What does not exist will be hard coded."* This selects approach (3).

## Decision

PRD-002 implements **hardcoded mock-data architecture** with three coordinated pieces:

### 1. Single canonical constants module

All mock values live in **one TypeScript constants file** at `site/lib/mocks/preview-data.ts` (path tentative; architect confirms final path during `/architect`). Components import their mock values from this file; no scattered mock values across component source.

Approximate shape:

```ts
// site/lib/mocks/preview-data.ts

/** Per-surface "preview data is in use" flags. The follow-on data-plumbing PRD
 *  flips these to `false` per surface as live data sources land. When all
 *  flags are `false`, the "Preview data" banners disappear and the data
 *  pipeline is fully live. */
export const PREVIEW_DATA_ACTIVE = {
  fullPage: true,
  dashboardWidget: true,
  contextPanel: false, // CP has no mocks; banner not rendered
} as const;

export const PREVIEW_DATA = {
  fullPage: {
    statStrip: {
      mappings: { count: 247, delta: { value: 4, period: "today" } },
      redirect301Count: { count: 189 },
      redirect302Count: { count: 51 },
      conflicts: { count: 7 },
    },
    workspaceHeroBanner: {
      activeMapsCount: 8,           // sourced from real data where possible
      allHealthy: true,
      lastPublishAgo: "14 minutes",
      lastPublishBy: "Anna",
      noConflicts: true,
    },
  },
  dashboardWidget: {
    heroStat: {
      value: 12428,
      label: "Active redirects",
      delta: { value: 412, period: "this week" },
    },
    sparkline: {
      points: [/* ~21 numbers — match V4 POC point count */],
      accent: "var(--primary)",
    },
    fourthTile: {
      value: 94,
      unit: "%",
      label: "301 vs 302 ratio",
      sub: "healthy distribution",
    },
    topDestinations: [
      // 5 rows; en-only paths per ADR-0023
      { source: "/old/products", target: "/products", count: 12428, barFillPercent: 100 },
      { source: "/legacy/contact", target: "/contact", count: 8214, barFillPercent: 66 },
      // ... 3 more, all en-only
    ],
    recentlyShipped: [
      // 3 rows
      { source: "/promo-legacy", target: "/campaigns/promo", type: "Redirect301" },
      // ... 2 more
    ],
    lastPublishAgo: "14 m",
    lastPublishBy: "Anna",
    healthStatus: "allHealthy",
  },
} as const;
```

**Why a single file:** the follow-on data-plumbing PRD has exactly one location to swap. No grep-and-replace across components. The TypeScript shape of each mock element matches the eventual real-data shape — consumers don't know whether they read from constants or from a live SDK aggregator.

### 2. Per-surface `PREVIEW_DATA_ACTIVE` flags

The constants module exports a `PREVIEW_DATA_ACTIVE` object with one boolean per surface. The "Preview data" banner reads from this flag — when `PREVIEW_DATA_ACTIVE.fullPage` is `true`, the Full Page banner renders; when `false`, the banner does not render. Same for `dashboardWidget`.

**Migration path** (the entire reason this flag exists): the follow-on "data plumbing" PRD wires live data into the visual slots one surface at a time. When all of Full Page's mocks are replaced by real-data reads, that PRD flips `PREVIEW_DATA_ACTIVE.fullPage` to `false` and the banner disappears. No component refactor required. Same when Dashboard Widget's mocks are migrated.

### 3. Per-surface "Preview data" banner + structural guard

A new shared component (e.g. `site/components/ui/preview-data-banner.tsx`) renders at the top of any surface where `PREVIEW_DATA_ACTIVE[surface] === true`. Suggested copy: *"Some metrics on this surface use preview data — wired up in a future release."* Final copy iterated at `/architect`.

**Structural guard:** every element whose value comes from `PREVIEW_DATA` must carry a `data-preview-mock="true"` attribute. A new structural test asserts: **if any element on a rendered surface has `data-preview-mock="true"`, the `PreviewDataBanner` component must be mounted on that surface.** Pairing prevents the drift where a mock element exists but the banner was accidentally omitted (or vice versa).

### Specific scrubbing — V4-content reality alignment

The following V4 content does NOT ship as mocks; it is dropped entirely:

- **"Edge caches refreshed across 7 languages"** line in the Full Page hero banner — contradicts ADR-0010 (en-only MVP) + ADR-0023 (multilingual cancelled).
- **"Active" / "Draft" status pills** (V4's `status-pill--active` / `status-pill--draft` / left-rail `--draft` dot variant) — drop entirely; use real `RedirectType` enum badges (`301` / `302` / `Server Transfer`) per ADR-0024 + ADR-0008. Structural guard bans `status-pill--active`, `status-pill--draft`, `--draft` CSS class anywhere in `site/` source.
- **`/de/...` mock paths** anywhere — rewrite all mock content to en-only paths per ADR-0023.
- **"7 Languages" stat / chip / mention** in any V4 element — drop.

## Consequences

**Easier:**

- The follow-on data-plumbing PRD becomes a focused, well-scoped piece of work: define data sources, write aggregation queries, swap constants for live reads, flip flags. No design churn; no component refactor.
- Operators see honest labeling immediately — "Preview data" banner makes mocks transparent.
- The structural guard pairing (`data-preview-mock` → banner-presence) prevents the silent-drift failure mode where mocks slip into a banner-less surface.
- Mock values are realistic-range — when the data-plumbing PRD wires live data, slot designs already accommodate likely real value ranges (5-digit hero stats, 3-digit count tiles, etc.). No layout surprises.
- Component code reads naturally — `const data = PREVIEW_DATA.dashboardWidget.heroStat` rather than scattered fake-data fixtures inline. Reviewable.

**Harder:**

- Operators reading the surface get one banner per surface, not per element — they know mocks exist on Dashboard Widget but must distinguish the 3 real tiles from the 4 mock elements visually. Mitigated by `data-preview-mock` attribute making it inspect-able; trade-off recorded as R-11 in PRD-002 § 13. Live walkthrough explicitly probes mock identification (R-11 mitigation).
- The PREVIEW_DATA shape is essentially a forecast of the future data-plumbing PRD's data model. If the data-plumbing PRD discovers the real data has a very different shape (e.g. hit counts come pre-aggregated from a different source than expected), the mock shape may not survive the migration cleanly. Mitigated by realistic-range + realistic-shape mock authoring; data-plumbing PRD verifies shape assumptions at its own architecture stage.
- The `PREVIEW_DATA_ACTIVE` flags can ship in a "live tests fail" state if a developer flips a flag prematurely (e.g. `dashboardWidget: false` while components still read mock values). Mitigated by structural guard requiring banner + `data-preview-mock` to remain paired — if banner is hidden but `data-preview-mock` elements still exist, the guard fails.
- A future PRD that flips a single flag to `false` but keeps reading from PREVIEW_DATA constants would silently fail the structural guard. Treat as feature: forces the data-plumbing PRD to actually swap reads, not just hide the banner.

## Date

2026-05-14
