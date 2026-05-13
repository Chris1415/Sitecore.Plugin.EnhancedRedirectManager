# ADR-0018: Delete scope safety — confirmation modal with explicit radio, strict no-default

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — delete-scope multilingual modal not shipped; PRD-000's single-confirm whole-item delete remains)

## Context

PRD-000 shipped a single delete affordance: clicking "Delete" on a Redirect Map called the Authoring `deleteItem` mutation, removing the entire item (all language versions, mappings, metadata). The en-only MVP made this unambiguous — there was only ever one language version to delete.

PRD-001 introduces multilingual CRUD. "Delete" on a map now has two plausible scopes:

- **(a) Delete current language version only** — other language versions remain; operator "un-translates" the map for the current language.
- **(b) Delete entire map (all language versions)** — equivalent to PRD-000's behavior.

The choice is high-blast-radius: a wrong click on (b) destroys translations the operator did not mean to touch. Three UX options were considered during /rubber-ducky discovery:

- **(i)** Default to (b) (current behavior); operator who wants (a) must clear `UrlMapping` field content manually. Hides the version dimension; operator's mental model of "delete this version" is unsupported.
- **(ii)** Default to (a); separate affordance for (b). Safer-default for the per-language case but easy to miss the destructive option.
- **(iii)** Confirmation modal with explicit radio choice; operator must pick (a) or (b). Two clicks for either path.

Operator decision (D-Delete-Scope): **(iii)** — confirmation modal with explicit radio. Two-click safety; no ambiguous default.

The critical review (2026-05-13) flagged a contradiction in the first draft: AC-8.2 required "no default radio is pre-selected" while AC-8.6 (single-version edge case) auto-selected (b). The contradiction has been reconciled in favor of the strict no-default rule.

## Decision

Every "Delete" action on a Redirect Map that has ≥1 language version opens a confirmation modal with the following structure:

- **Modal title:** "Delete `[map display name]`?"
- **Modal body:** "This map has `N` language versions: `[en, de, fr, ...]`."
- **Radio choice (two options, vertically stacked):**
  - "Delete `[current language]` version only — other languages remain."
  - "Delete entire map and all language versions."
- **No default radio is pre-selected.** Operator must explicitly click one before the "Delete" button enables. This rule applies uniformly, including the single-version edge case.
- **Single-version edge case:** When the map has only one language version, both radio options are still rendered. Below the radios, an informational note states: *"This map has only one language version; both options remove all redirect data. Choose explicitly to confirm intent."* No auto-default. The operator still picks one explicitly.
- **Hard-fail variant** when `deleteItemVersion` is absent from the Authoring schema (resolved at `/architect` per OQ-1 / R-1): the modal shows only option (b) with copy *"Single-version-delete is unavailable in this Authoring schema. Delete the entire map across all languages?"* PRD-001 scope reduces to whole-item delete only.
- **Modal footer buttons:** "Cancel" (closes modal, no mutation) and "Delete" (executes the chosen path; button disabled until a radio is selected).
- **Side effects:**
  - Choosing (a) calls `deleteItemVersion(itemId, language: <current>)`.
  - Choosing (b) calls `deleteItem(itemId)` (PRD-000 path).
- **Toast feedback:** Success toast names the action explicitly — *"Deleted `[language]` version of `[map name]`."* or *"Deleted `[map name]` and all language versions."*

The modal pattern reuses PRD-000's `DeleteMapConfirmModal` component as the base; new component (`DeleteScopeConfirmModal` or extended `DeleteMapConfirmModal`) implements the radio + version-count display.

## Consequences

**Easier:**

- Operator never accidentally deletes "the entire map across all languages" with one click. The two-click pattern is the safety guarantee.
- Both delete paths are equally discoverable — no operator wondering "how do I delete just the `de` version?"
- Single-version edge case still gets a confirmation modal; consistency across cases beats "shortcut for the simple case."
- Toast feedback names the action explicitly, so operator immediately knows what just happened (handy if they picked the wrong radio).

**Harder:**

- Slightly more clicks than PRD-000's single-confirm pattern. The cost is acceptable for the safety win.
- The two radios with no default + explanatory note in the single-version case adds modal real estate. Modal layout must be tested at minimum viewport.
- When `deleteItemVersion` is absent (OQ-1 hard-fail variant), the operator gets a degraded UX — only one option, with explanatory copy. Mitigation is PRD-001 explicitly cuts the version-only path rather than silently substituting a stub-fallback that corrupts the version model. See ADR-0014 + PRD-001 R-1.

## Date

2026-05-13
