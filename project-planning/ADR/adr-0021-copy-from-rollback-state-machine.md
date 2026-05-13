# ADR-0021: Copy-from create-version partial-failure rollback state machine

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — no copy-from flow ships)

## Context

The "Copy from another language" path in the create-version flow (US-7, ADR-0016) is implemented as **two sequential mutations** because the Marketplace SDK runs Mode A (client-side, no server-side transaction layer):

1. `addItemVersion(input: { itemId, language })` — create the new language version (architecture § 5.2 / ADR-0019).
2. `updateItem(input: { ... fields: [{ name: "UrlMapping", value: <serialized-source-mappings> }] ... })` — populate the new version's `UrlMapping` field from the source language's mappings.

This produces three observable outcomes:

- **(a) Both succeed** → new version exists with mappings populated. Operator lands in standard edit flow per US-7 AC-7.5.
- **(b) `addItemVersion` succeeds, `updateItem` fails** → new (empty) version exists in Sitecore but mappings did not populate. Half-done state.
- **(c) `addItemVersion` fails** → no version created; operator unchanged. Trivial recovery.

ADR-0016 § Decision § "Partial-failure recovery (Path B only)" sketched the rollback shape but did not pin the exact state machine. The /architect SDK contract verification gate surfaced that the state machine is non-trivial (3 outcome paths, two of which need operator-visible UX) and merits a dedicated ADR so the wrapper module, toast copy, and manual-cleanup affordance stay in sync.

This ADR amplifies and supersedes ADR-0016 § "Partial-failure recovery" — that paragraph remains correct but ADR-0021 is the canonical specification.

## Decision

The copy-from path implements the following state machine in `site/lib/sdk/redirects-version.ts` (or wherever the version-create wrapper lands at /implement):

```
START
  ├─→ call addItemVersion(itemId, language)
  │   ├─ SUCCESS → state = "version-created"
  │   └─ FAILURE → toast "Could not create [language] version. <Technical details>" → END (no rollback needed)
  │
  ├─ (if version-created) call updateItem(itemId, language, fields=[{ UrlMapping, <source-mappings> }])
  │   ├─ SUCCESS → state = "populated" → toast "Created [language] version from [source]." → land in edit flow → END
  │   └─ FAILURE → state = "populate-failed" → enter ROLLBACK
  │
  └─ ROLLBACK (state = "populate-failed")
      ├─ call deleteItemVersion(itemId, language, version=<the-just-created-version>)
      │   ├─ SUCCESS → state = "rolled-back" → toast "Could not copy mappings — new version removed. <Technical details>" → END (operator unchanged from start)
      │   └─ FAILURE → state = "partial-version-detected" → render warning + cleanup affordance (see below) → END
```

**State `partial-version-detected` UX:**

A persistent warning banner renders at the top of Full Page (non-dismissible by default; dismissible after operator confirms cleanup):

> ⚠️ **Partially populated `[language]` version detected on `[map name]`.** The new version was created but mappings could not be copied, and automatic cleanup failed. Click "Delete `[language]` version" to remove the empty version, or "Add mappings manually" to enter the standard edit flow and complete the version by hand.

The two CTAs route to:

- "Delete `[language]` version" → opens the standard `DeleteScopeConfirmModal` from ADR-0018, pre-selected to "Delete current language version only" (single explicit exception to ADR-0018's strict no-default rule — operator already explicitly confirmed cleanup intent by clicking the warning CTA).
- "Add mappings manually" → routes to the detail pane for the map; operator lands in US-5 "empty version" state with the inline "Add first mapping" affordance.

**Wrapper return shape:**

```typescript
type CopyFromResult =
  | { state: "populated"; newVersion: SitecoreItemVersion }
  | { state: "rolled-back"; reason: GraphQLError }
  | { state: "partial-version-detected"; reason: GraphQLError; rollbackReason: GraphQLError };
```

The UI consumes the result discriminant and renders the right toast / warning. RED tests cover all three success-and-failure-mode paths.

**Hard prerequisite:** the rollback path itself depends on `deleteItemVersion` existing (per ADR-0019 / PRD R-1). If `deleteItemVersion` is absent at /implement probe time, the entire copy-from path is cut from PRD-001 (along with US-7 per R-1). The state machine simplifies to:

```
START → addItemVersion → SUCCESS → updateItem → SUCCESS → END  (only path that ships)
                                              → FAILURE → toast "Could not copy mappings. The version was created but is empty; you can either keep it and add mappings manually, or use the standard edit flow to populate it." → END
```

This degraded UX is operator-acceptable because the per-language create flow itself is at risk per R-1; if PRD-001 ships without `deleteItemVersion`, the copy-from rollback also doesn't ship and the operator gets a clear-but-uncomfortable message instead of automatic recovery.

## Consequences

**Easier:**

- Three outcome paths are explicit, named, and discriminator-typed at the wrapper boundary — no implicit branching, no "did it work or didn't it" ambiguity.
- The persistent warning banner for `partial-version-detected` makes the rarest-but-worst failure mode visible rather than swallowed.
- ADR-0018's strict no-default rule has exactly one explicit exception, scoped narrowly to the cleanup-from-banner flow.
- RED tests can exercise each state path with focused fixtures (one per outcome).

**Harder:**

- Three outcome paths to test → larger test surface for one user story (US-7). Bounded — not a maintenance burden.
- The `partial-version-detected` UI is a new banner pattern (PRD-000 had no comparable persistent system-error UI). Blok primitive selection at /implement should pick an appropriate banner component or compose from `@blok/alert` + actions.
- The "Delete `[language]` version" CTA bypasses ADR-0018's strict no-default rule. The exception is justified (operator already explicitly invoked cleanup) but it does create a second code path through the delete modal. Structural test should assert the pre-selected default is ONLY set when the banner flow is the caller.

## Date

2026-05-13
