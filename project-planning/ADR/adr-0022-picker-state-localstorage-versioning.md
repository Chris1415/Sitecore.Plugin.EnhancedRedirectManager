# ADR-0022: Picker-state `localStorage` key shape — v1 contract + future-migration namespace policy

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — no picker state ships)

## Context

ADR-0017 introduced the language-picker `localStorage` key with shape `redirect-manager.language.<tenantId>.<siteId>` and a payload of `{ tenantId, siteId, language, lastUsedAt }`. ADR-0017 mentions key-version pinning in a single-paragraph aside but does not record the migration contract.

The /architect pass surfaced that the key shape is plausibly load-bearing for future PRDs:

- A future PRD that adds **per-user** scoping (e.g. shared team Sitecore tenants where two operators want independent picker preferences) would need to extend the key with a `userId` segment.
- A future PRD that adds **per-app-installation** scoping (e.g. multiple Cloud Portal Test App installs of Redirect Manager) would need an installation ID.
- A future PRD that needs to **migrate payload shape** (e.g. add `viewMode: "list" | "grid"` or other UI state) would need a key-version dimension.

If those changes happen ad-hoc, existing operators' picker state becomes stale data with unpredictable read/write semantics — exactly the brittleness that ADR-0017's "no migration from prior keys" was trying to avoid for the PRD-000→PRD-001 transition.

This ADR promotes the one-paragraph aside in ADR-0017 to an explicit migration contract so a future PRD planning the change has a known starting point.

## Decision

- **PRD-001 v1 key contract** (canonical, frozen):

  ```
  Key:     redirect-manager.language.<tenantId>.<siteId>
  Payload: PickerState (per ADR-0017)
  ```

- **Future key shape changes** use a **`v2.` namespace**:

  ```
  v1 → redirect-manager.language.<tenantId>.<siteId>
  v2 → redirect-manager.language.v2.<scoped-segments>
  v3 → redirect-manager.language.v3.<scoped-segments>
  ```

  The version segment immediately follows `language.` so all picker-related keys share a common prefix (`redirect-manager.language.*`) for cleanup operations (e.g. "clear all picker state").

- **Migration policy on key-shape change:**

  1. **Transition window:** during the PRD that introduces the new shape, the app reads both `v1` and `vN` keys on load. The newer key (vN) takes precedence; v1 is a fallback if vN is missing.
  2. **One-shot migration on read:** when v1 is read as a fallback, the app writes the equivalent vN value (transformed per the new payload contract) and continues. v1 is **not** deleted in this step — read it on subsequent loads is harmless because vN now exists.
  3. **Cleanup window:** the PRD that introduces vN+1 (i.e. two PRDs later) deletes v1 keys during its initial-load cleanup. This bounds the window where v1 keys can persist to two PRD cycles, preventing indefinite legacy buildup.
  4. **Unknown key handling:** keys that match `redirect-manager.language.*` but no recognized version are ignored on read; not deleted (other tools or future code may own them).

- **Cross-version invariant:** every payload version MUST include a `version` field (e.g. `version: 1` for v1, `version: 2` for v2). v1's `PickerState` currently does not include `version`; the v1→vN migration's "read v1 as fallback" branch synthesizes `version: 1` when transforming for upgrade.

- **No automatic prune in PRD-001.** ADR-0017's mention of pruning stale `lastUsedAt` entries (older than 6 months) is **not** implemented in PRD-001. Operators with browser-restrictive privacy settings naturally lose persistence anyway; no operator-visible cost from not pruning yet. Prune logic ships when a future PRD demonstrates need.

## Consequences

**Easier:**

- Future PRDs that need to evolve the picker key have a deterministic migration recipe; no re-deriving on every change.
- The shared `redirect-manager.language.*` prefix makes bulk cleanup (e.g. "logout from this tenant clears all picker state for this tenant") implementable as a single prefix-match scan.
- The `version` field requirement on payloads gives runtime code a discriminator for handling mixed-version reads during the transition window.
- ADR-0017's already-correct base contract stays unchanged — this ADR only adds a forward-looking provision.

**Harder:**

- Adds 8 extra characters per future key (`v2.`, `v3.`, etc.) — negligible.
- The transition-window logic must be implemented in every PRD that introduces a new vN. Documented; not silent.
- v1's payload currently lacks the `version: 1` discriminator. Code that performs the v1→vN migration must handle the absent-discriminator case (treat as v1). One-time complexity, bounded.

## Date

2026-05-13
