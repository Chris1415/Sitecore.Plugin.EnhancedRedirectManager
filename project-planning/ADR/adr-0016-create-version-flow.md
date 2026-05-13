# ADR-0016: Create-version flow — two paths (empty + copy-from), no name input

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — create-version flow not shipped. The verb-name correction `createItemVersion` → `addItemVersion` is preserved in `docs/decisions.md` as durable SDK knowledge.)

## Context

Multilingual CRUD requires a flow for operators to create a new language version of an existing Redirect Map item when one does not yet exist. Sitecore's authoring model distinguishes:

- **Item name** — shared across all language versions (cannot be set per language).
- **`__Display name`** — versioned per language; can be empty.
- **`UrlMapping`** — versioned per language; content per language.

When an operator selects a language in the picker that has no version on a Redirect Map (US-4 "no version" state), the app must offer a way to create the version. Three sub-decisions:

1. **What does the create flow ask the operator to provide?**
2. **Should there be an option to pre-fill from another language's mappings?**
3. **Which source languages should the "copy from" picker offer?**

Operator decisions during /rubber-ducky (D-Create-Version-Flow, D-Copy-From-Eligibility, D-Copy-From-Scope):

- No name input at create time. Item name is already set (shared); `__Display name` can be edited later (US-9). Asking for a name at create time confuses the operator about which name is being asked for.
- Two paths offered: empty start, or copy-from-language.
- Copy-from picker filtered to languages with existing **non-empty** versions on the same map (clarified during critical review — see PRD-001 AC-7.2).

## Decision

The create-version flow exposes **two paths**, no name input at any step:

**Path A — Create empty version.**

1. Operator clicks "Create empty `[language]` version" CTA on the no-version state.
2. App calls `addItemVersion` (or operator-confirmed substitute — see OQ-1 / R-1) on the Redirect Map item with the picker's current language.
3. New version is created with: item name inherited (shared); `__Display name` empty (versioned, falls back to item name in UI); `UrlMapping` empty; flags inherited from shared block (or per OQ-2 field-matrix capture).
4. Operator lands in the standard edit flow (US-5 "empty version" inline affordance).

**Path B — Copy from another language.**

1. Operator clicks "Copy from another language" CTA on the no-version state.
2. Modal opens with a **source-language picker**. The picker enumerates only languages that have **existing versions with non-empty `UrlMapping` content** on this map. Languages without versions, or with versions but empty `UrlMapping`, are filtered out (not shown as disabled).
3. Operator picks a source language.
4. App calls `addItemVersion` to create the target language version, then `updateItem` to populate `UrlMapping` with the source language's parsed mappings (re-serialized via `UrlMapping` encoding contract from ADR-0008).
5. UI hint communicates the copy scope: *"Mappings will be copied from [source language]. Flags and redirect type are shared across all languages and apply automatically."* Final hint copy adjusts after OQ-2 if any flag turns out versioned.
6. Operator lands in the standard edit flow with mappings pre-populated and editable.

**Partial-failure recovery (Path B only):**

If the `addItemVersion` succeeds but the populate `updateItem` fails, the new (empty) version is rolled back by calling `deleteItemVersion` on the just-created version. The operator is left in the original "no version" state with a friendly error toast. If the rollback itself fails (rare), the operator sees a "Partially populated version detected" warning and is offered a manual cleanup affordance (delete the partial version via the delete-scope modal).

## Consequences

**Easier:**

- Empty-start path is dead simple: one click → version exists → operator types mappings. No friction.
- Copy-from path solves the "translate the URL structure" use case directly — no manual re-typing of 50 mappings.
- Filtering the source picker to non-empty versions prevents the "I copied from `de` and got an empty result" frustration.
- No name-input field means no schema for what that name is (a display name? a version comment? confusion avoided).

**Harder:**

- Copy-from path is two sequential mutations (`addItemVersion` then `updateItem`). Partial-failure rollback adds code complexity and an edge-case UX (the "Partially populated version detected" warning).
- Both paths depend on `addItemVersion` existing in the Authoring schema. R-1 decision rule: if absent, both paths are cut from PRD-001 and the PRD re-scopes to "read and edit on existing language versions only."

## Date

2026-05-13
