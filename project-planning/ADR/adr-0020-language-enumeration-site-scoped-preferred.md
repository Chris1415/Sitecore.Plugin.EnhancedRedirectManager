# ADR-0020: Language enumeration prefers site-scoped `Sites.Site.languages` over tenant-wide; tenant-wide is fallback

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — no language enumeration ships)

## Context

PRD-001 needs to enumerate available languages for the language picker (FR-1). Two SDK surfaces are candidates:

- **Site-scoped:** `Sites.Site.languages` — a property on each `Sites.Site` object returned by `xmc.sites.listSites` / `xmc.sites.listCollections` (already used in PRD-000 for site enumeration). Typed `Array<string> | null` per `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019`.
- **Tenant-wide:** `xmc.sites.listLanguages` — a separate call that returns all languages defined in the tenant, regardless of which sites support them. Typed `Sites.ListLanguagesResponse` per the same `.d.ts` (line 1693).

Operator preference during /rubber-ducky (D-Languages-Source):

> Site-scoped preferred; tenant-wide fallback when site-scoped is unavailable or empty.

Rationale: when a site is configured to support `en` and `de` only, offering `fr`/`it`/`ja` in the picker lets the operator create mappings that the head-app resolver will never honor at runtime. Site-scoped enumeration prevents that mistake.

The `.d.ts` reveals a happy architectural finding: `Sites.Site.languages` is already a property on the already-fetched `Site` object from PRD-000's `xmc.sites.listSites` call. **No extra SDK round trip** is required in the happy path — the language list comes free with the site fetch.

## Decision

- **Primary path:** Read `currentSite.languages` from the existing `Sites.Site` payload (already fetched via `xmc.sites.listSites` for site picker rendering). No additional SDK call.
- **Fallback path:** When `currentSite.languages` is `null` or an empty array, call `xmc.sites.listLanguages` (tenant-wide) and use that list, surfacing a non-dismissible UI hint: *"Showing all tenant languages. The current site has no explicit language list configured — verify that mappings you create are honored by the head-app at runtime."*
- **Default-resolution chain** (when picker state is fresh, no `localStorage` value, no last-used):
  1. Operator's last-used language for this `(tenantId, siteId)` — persisted per ADR-0017.
  2. Site's default language (from `Sites.Site.defaultLanguage` if exposed; otherwise first entry in `currentSite.languages`).
  3. `en` (if present in the enumerated set).
  4. First entry in the enumerated set (site-scoped or tenant-wide fallback).
- **Stale persisted value:** When `localStorage` holds a language no longer in the enumerated set (site reconfigured between sessions), surface a one-time toast and fall back to default-resolution-chain step 2. Per ADR-0017 invalid-state-recovery.
- **No live cache of enumerated languages.** Re-read `currentSite.languages` on every site swap; re-call `listLanguages` only when the site's `languages` property is null/empty (rare path).

## Consequences

**Easier:**

- Zero extra SDK calls in the happy path — language enumeration piggybacks on site fetch.
- The fallback path is honest about its tradeoff (UI hint communicates the implication).
- Test fixtures from PRD-000 already include `Sites.Site` objects — RED tests for picker enumeration can use existing fixtures.
- The architectural-finding is recorded so future PRDs don't re-invent the round-trip.

**Harder:**

- Sites where `currentSite.languages` is mis-configured (returns null when the site really does have a language set) will silently fall through to tenant-wide. Operator-visible UI hint is the mitigation. Capture pass at /implement should confirm the property is populated on `CHAH DevEx Journey / PROD`.
- The fallback path requires shipping a second SDK call. The wrapper module (e.g. `site/lib/sdk/languages.ts`) needs to handle both paths cleanly with shared types.

## Date

2026-05-13
