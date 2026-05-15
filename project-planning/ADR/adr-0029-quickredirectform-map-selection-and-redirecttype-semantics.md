# ADR-0029: Context Panel `QuickRedirectForm` map-selection model + RedirectType semantics

## Status

Accepted (resolves PRD-002 OQ-9 ambiguity in AC-R2.4)

## Context

ADR-0026 + ADR-0028 lock the Context Panel UX evolution: inline `QuickRedirectForm` replaces the existing `AddRedirectModal` flow. PRD-002 AC-R2.4 specified the form's fields and the functional contract but left two architectural questions ambiguous:

1. **Default map-selection when multiple maps match the current page.** When `matchedGroups.length >= 2`, which map does the form add to by default? Most-recently-updated? Alphabetically first? Most-mappings? Operator picks every time?
2. **RedirectType select semantics across the two paths.** The form has one RedirectType select. In the create-new-map path (`matchedGroups.length === 0`), the select is enabled and the chosen value becomes the new map's `redirectType`. In the add-to-existing-map path, what does the select control? `RedirectType` is a per-Item field in the Sitecore schema (see `site/lib/domain/types.ts:17`), not a per-mapping field — so picking a different RedirectType in the form while adding to an existing map cannot change the parent map's type without surprising the operator.

These ambiguities surfaced during the architecture pass and need explicit resolution before `/task-breakdown` so the Lead Developer can write deterministic task descriptions.

## Decision

### Default map-selection rule

**The inline form adds to the most-recently-updated matched map by default.** Specifically:

- `matchedGroups` from the existing `matchPageRedirects` algorithm is sorted by `updatedAt` descending; the form binds to `matchedGroups[0]` on initial render.
- When `matchedGroups.length === 1`, the single match is used; no operator choice involved.
- When `matchedGroups.length >= 2`, an affordance lets the operator switch. **Architectural commitment:** *some* affordance exists (chip cluster, dropdown, or other UI Designer choice). **Visual choice deferred to UI Designer.** PRD-002 AC-R2.4 / AC-R5 already mentions the affordance; UI Designer iterates the exact pattern at next stage.
- The "most-recently-updated" rule is grounded in operator-mental-model intuition: the map you most recently edited is most likely the one you want to add to next. Empirically this should be right ≥80% of the time per casual reasoning; UI Designer's affordance gives the operator easy override for the remaining cases.

### Auto-name pattern for create-new-map path

When `matchedGroups.length === 0`, the form creates a new Redirect Map with:

- **Name:** `${pageSlug}-redirects` where `pageSlug` is derived from `pageInfo.url` via the existing `lower-kebab-case` slug helper (or equivalent: strip leading `/`, replace `/` with `-`, lowercase, strip query string + hash, collapse multiple `-` into one). Example: `pageInfo.url = "/about/team"` → `pageSlug = "about-team"` → map name = `about-team-redirects`. Example: `pageInfo.url = "/"` → `pageSlug = "home"` → map name = `home-redirects`.
- **`redirectType`:** the value of the form's RedirectType select (enabled in this path).
- **Flags:** `PreserveQueryString=false`, `PreserveLanguage=false`, `IncludeVirtualFolder=false`. Defaults match PRD-000's `NewRedirectMapModal` defaults for operator continuity. Operators wanting non-default flags use the Full Page workspace path per ADR-0028.
- **First mapping:** source = form's source input (pre-populated with the current page route, editable); target = current page route.

### RedirectType select semantics

**The select is rendered in two distinct states across the two paths:**

- **Create-new-map path (`matchedGroups.length === 0`):** select is **enabled**. The operator picks one of the 3 enum values (`Redirect301`, `Redirect302`, `ServerTransfer`; default `Redirect301`). The chosen value becomes the new map's `redirectType`.
- **Add-to-existing-map path (`matchedGroups.length >= 1`):** select is **disabled** and **pre-set to the chosen map's `redirectType`** (i.e. `matchedGroups[i].redirectType` where `i` is the active selection — 0 by default). A small "uses existing map's redirect type" inline hint renders below the select. **The operator cannot change the parent map's RedirectType from the inline form** — that would require an edit-existing-map flow (which is a different operation; lives at Full Page workspace's existing edit affordance).

This semantics resolves the AC-R2.4 ambiguity: when the operator switches the map selection (multi-match affordance), the disabled select re-binds to the newly-selected map's `redirectType` automatically. The hint copy reflects which map's type is being shown.

### State machine for the form's controls

| Path | Source input | RedirectType select | Add button |
|---|---|---|---|
| `matchedGroups.length === 0` (no maps) | Editable, pre-populated with `pageInfo.url` | **Enabled**, default `Redirect301`, operator-choosable | Enabled when source non-empty AND RedirectType non-empty |
| `matchedGroups.length === 1` (single match) | Editable, pre-populated with `pageInfo.url` | **Disabled**, value = `matchedGroups[0].redirectType`, hint visible | Enabled when source non-empty |
| `matchedGroups.length >= 2` (multi-match) | Editable, pre-populated with `pageInfo.url` | **Disabled**, value = `matchedGroups[selectedIndex].redirectType`, hint visible, re-binds when operator switches map | Enabled when source non-empty |

## Consequences

**Easier:**

- The form's UX is unambiguous in every match-state. Operators always know what RedirectType is going to be assigned (it's visibly displayed, even when disabled).
- Lead Developer at `/task-breakdown` writes deterministic task descriptions for `QuickRedirectForm` with no open questions about default behaviour.
- Empirical "most-recently-updated map" default matches operator intuition; multi-match affordance handles the edge cases without forcing a default choice on the operator.
- Disabled-with-display semantics for the select preserves the form's visual completeness (the select renders consistently across all paths) without exposing a footgun (operator accidentally changing a parent map's type while just adding a mapping).
- Auto-name pattern is deterministic and reversible (`pageSlug` algorithm is well-defined), so two operators authoring the same redirect at the same time would name new maps consistently.

**Harder:**

- The disabled-but-visible RedirectType select is slightly unusual UX — operators may initially try to click it. The inline hint mitigates ("uses existing map's redirect type"). UI Designer at next stage may refine the visual treatment (e.g. subtle "info"-state styling instead of standard "disabled" greyout) to make the read-only-display intent clearer.
- "Most-recently-updated" as the default rule depends on `updatedAt` being reliable on Redirect Map items. PRD-000 already reads this field for the Dashboard Widget "Last updated" tile; same data source.
- Multi-match affordance (chip cluster vs dropdown) is left to UI Designer. Architecture commits to existence + behaviour, not visual form.

**Neutral:**

- The SDK envelope is unchanged. Both paths execute the same Authoring GraphQL mutations as the existing modal flow (per ADR-0026 + ADR-0028 functional-contract preservation).
- This ADR does not modify the `RedirectType` enum (still 3 values per ADR-0024) or any other Sitecore data model.
- The "Configure new map with full flag control" path on Context Panel is explicitly NOT addressed here — operators use Full Page workspace's existing `NewRedirectMapModal` per ADR-0028.

## Date

2026-05-14
