# ADR-0006: Import conflict resolution — per-item action picker with three actions

## Status

Accepted

## Context

JSON import promotes a redirect rule set from one site/environment into another. When an incoming Redirect Map has the same identifier as an existing item in the target, the operator needs an explicit decision rather than a blanket overwrite.

Two design dimensions:

1. **What actions does the operator choose from?** The original concept brief listed four — *create / overwrite / skip / merge*. During PRD-000 critical review (Q-CR-1), the user collapsed *merge* into *overwrite*: "merge" was undefined, and producing a precise definition of "merge" (which fields win? which mappings union? what about reorderings?) would make the import resolver materially more complex without an obvious operator demand.
2. **What does the conflict UI look like?** Per-item action picker with collapsible diff (Q-D4 = a) — operator picks per item, not in bulk by default. A "apply same action to all conflicts" affordance covers the common case where the operator wants uniformity.

## Decision

Import conflict resolution offers **three actions**:

- **`create`** — for new items (no existing match in target). Creates a new Redirect Map item with the incoming values. Default action for new items.
- **`overwrite`** — for conflicting items (match found, fields differ). Replaces the target item's `RedirectType`, flag values, item name, and `UrlMapping` (full mapping list) with the incoming values. No default — operator must select.
- **`skip`** — for conflicting items. Leaves the target item unchanged; the incoming version is discarded for this run. No default — operator must select.

The UI is a per-item action picker with a "Show diff" collapsible per row, plus an "Apply same action to all conflicts" bulk control. "Confirm import" is disabled until every conflict has an explicit action. After confirmation, mutations are sequential per item; per-item success/fail is reported in a final summary.

The matching key for "do these two items conflict" is the **Sitecore item GUID** (see ADR-0009).

## Consequences

**Easier:**
- Three actions are easy for operators to reason about. Each is unambiguous.
- The implementation is trivial: a switch statement on action plus three corresponding mutation paths. No "merge algorithm" to specify, test, or document.
- Fewer edge cases. (Merge would have to handle: same source different target across files, same target different source, reordered mappings, divergent flags — every one a UX decision.)

**Harder:**
- An operator who actually wants merge semantics (rare) must do it manually: split the import into two passes, or edit the JSON before importing. Acceptable; the user signaled overwrite is sufficient for cross-environment promotion.
- "Overwrite" is the more aggressive default for conflicts — clear UI copy plus the diff view should keep operators informed of what they're approving.

## Date

2026-05-09
