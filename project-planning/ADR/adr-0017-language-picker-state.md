# ADR-0017: Language picker state — localStorage-persisted, shared across surfaces

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — no language picker ships)

## Context

PRD-001 introduces a language picker in the Full Page surface and a language-scoped Dashboard Widget. Three sub-decisions:

1. **State lifetime** — Does picker state persist across reloads (localStorage / sessionStorage / cookie / nothing), and across browser sessions?
2. **State scope** — Is picker state per-surface (Full Page has its own picker, Dashboard has its own) or shared across surfaces?
3. **State key shape** — How is the persisted value keyed? (Per-tenant, per-site, per-user, per-app-installation?)

Operator decision during /rubber-ducky discovery round 1 (D-Picker-State):

> "localStorage-persisted, shared across surfaces (Full Page + Dashboard inherit each other). Last choice survives reload."

Rationale: language is the operator's working context, not a transient filter. An operator who works primarily in `de` should not have to re-set the picker every time they reload, and the Dashboard tile that says "12 mappings" should refer to the same language as the Full Page list they were just looking at.

## Decision

- **State lifetime:** Persisted via `localStorage` (browser-scoped, survives reload and browser session).
- **State scope:** Shared across Full Page and Dashboard Widget within the same browser context. Both surfaces read and write the same key.
- **State key shape:** `redirect-manager.language.<tenantId>.<siteId>` — scoped per (tenant, site) pair so an operator who switches between multiple Sitecore tenants (or multiple sites within a tenant) keeps independent language preferences per context.
- **State payload shape:**
  ```ts
  type PickerState = {
    tenantId: string;
    siteId: string;
    language: string;          // e.g. "en", "de", "fr-CH"
    lastUsedAt: string;        // ISO-8601 — for future cleanup of stale entries
  };
  ```
- **Default resolution chain** (when no persisted value or persisted value is invalid):
  1. Last-used language for this `(tenantId, siteId)` (persisted).
  2. Site's default language (from `xmc.sites.list` or equivalent).
  3. `en`.
  4. First language in the enumerated language set for this site.
- **Invalid-state recovery:** When the persisted language is no longer in the enumerated set for this site (e.g., a language was removed from the site's `supportedLanguages` between sessions), fall back to default-resolution-chain step 2 and surface a one-time toast: *"Your last-used language `[code]` is no longer available on this site. Switched to `[default]`."*
- **No migration from prior keys:** PRD-000 did not persist any picker state (en-only). No `localStorage` keys from prior installs need to be migrated; unknown keys are ignored.
- **PRD-001 schema version pinning:** Key shape is currently v1 (`redirect-manager.language.<tenantId>.<siteId>`). If a future PRD changes the shape (e.g. adds `userId` for per-user scoping), introduce a new key `redirect-manager.language.v2.<...>` and treat the v1 key as deprecated; v1 values can be one-shot migrated when both old and new keys exist.

## Consequences

**Easier:**

- Operator's working context survives reload — matches mental model of "I'm working in `de` today."
- Single persisted key avoids a Full-Page-vs-Dashboard mismatch where the two surfaces show different language data.
- Per-(tenant, site) scoping prevents accidental cross-context leaks when an operator switches Sitecore tenants in the same browser.
- Invalid-state recovery is graceful — operator never sees a stuck state where the picker is pointing at a non-existent language.

**Harder:**

- `localStorage` is shared across all tabs in the same browser. If the operator opens Full Page in Tab A on `de` and Dashboard Widget in Tab B on `fr`, the last-written value wins. PRD-001 accepts this; per-tab independent state would require `sessionStorage` and lose the cross-surface sharing requirement.
- `localStorage` is not synced across devices. Operator working from two machines maintains independent picker preferences. Accepted; cross-device sync is out of scope.
- Operators with browser-restrictive privacy settings (incognito mode, strict cookie/storage policies) lose persistence. Fallback to default-resolution-chain on every load is the honest behavior; UX degrades from "remembers" to "always shows the site default" but does not break.
- The `lastUsedAt` field is currently unused (recorded for future cleanup of stale entries — e.g., on app load, prune entries older than 6 months). No cleanup logic ships in PRD-001.

## Date

2026-05-13
