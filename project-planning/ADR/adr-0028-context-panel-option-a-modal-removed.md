# ADR-0028: Context Panel inline quick-add Option A locked — `AddRedirectModal` removed entirely

## Status

Accepted (amends ADR-0026; resolves the Option A / Option B fork left open there)

## Context

ADR-0026 introduced the Context Panel modal → inline quick-add UX evolution (US-R5) but left an open architectural decision:

- **Option A** — Remove `AddRedirectModal` entirely. Inline `QuickRedirectForm` handles both add-to-existing-map and create-new-map (with auto-name + default flags). The "create new map with full flag control" path lives at the Full Page workspace via `NewRedirectMapModal` (unchanged).
- **Option B** — Keep `AddRedirectModal` as a fallback. Inline form is the primary path; a "Configure new map..." link in the inline form opens the modal for the rare full-flag-control case.

The /architect pass needed to lock one. ADR-0026 recommended Option A; PRD-002 § 5 hinted toward Option A. The architecture review confirmed Option A is the right call.

## Decision

**Option A locked: `AddRedirectModal` is removed entirely from the codebase as part of PRD-002.**

- The Context Panel inline `QuickRedirectForm` (US-R5; AC-R2.4) is the only add-redirect surface on the Context Panel route.
- Add-to-existing-map: form adds a mapping to the most-recently-updated matched map by default (architectural rule per ADR-0029). When multiple maps match the current page, an affordance lets the operator switch (chip cluster vs. dropdown is a UI Designer choice). RedirectType select is disabled-with-display-only in this case — the parent map's `redirectType` governs (per ADR-0029).
- Create-new-map (when `matchedGroups.length === 0`): form creates a new map with auto-name (`${pageSlug}-redirects` lower-kebab-case derived from `pageInfo.url`), default flags (`PreserveQueryString=false`, `PreserveLanguage=false`, `IncludeVirtualFolder=false`), and the operator's selected RedirectType. First mapping is the form's source → current page.
- The "create new map with full flag control" path lives at the **Full Page workspace** via the existing `NewRedirectMapModal` component (unchanged from PRD-000). Operators wanting full control of the three flag checkboxes (`PreserveQueryString` / `PreserveLanguage` / `IncludeVirtualFolder`) open Full Page, pick collection + site, click "Create new Redirect Map", and use the existing modal there.
- `site/components/context-panel/AddRedirectModal.tsx` is deleted as part of the PRD-002 implementation tranche T6 ("Context Panel inline form ships").
- Existing Vitest tests against `AddRedirectModal` are re-pointed at `QuickRedirectForm` in the dedicated test-rework tranche T7 (per R-12 mitigation in PRD-002 § 13).
- The Full Page's `NewRedirectMapModal` is unaffected — different component, different workflow context.

## Consequences

**Easier:**

- One fewer component file to maintain (`AddRedirectModal.tsx` deleted). Cleaner Context Panel component graph.
- One fewer surface to smoke-test on every release. R-12 partial mitigation (the test rework still happens for the inline form, but the surface area is smaller).
- Faster add-redirect flow on Context Panel — 2 clicks (type into form → Add) vs. 4 clicks of the previous button → modal → fill → save sequence. Material productivity gain on every authoring session where the operator adds redirects.
- The inline form is always visible — better discoverability than a button-and-modal pattern, especially for operators new to the product.
- The "Configure new map with full flag control" path has a clear single home (Full Page workspace) instead of two competing surfaces. Architectural clarity for future PRDs.

**Harder:**

- Operators who used the Context Panel modal for full-flag-control map creation must move to Full Page workspace. This was the unusual path (most Context Panel adds use defaults); empirical signal from PRD-000 smoke + live walkthrough is that operators rarely needed full flag control from the Context Panel.
- The Context Panel `<AddRedirectButton>` and `AddRedirectModal` test fixtures and Vitest tests must be replaced by `QuickRedirectForm` tests during T7. R-12 captures this cost.
- If a future PRD discovers the empirical signal *was* there and operators wanted full flag control on the Context Panel after all, restoring it requires resurrecting `AddRedirectModal` (or a minimal new modal). Acceptable: the resurrection cost is bounded (one component + one button + reattached state); restoration risk is low because the inline form's auto-name + default flags work for the overwhelmingly common case.

**Neutral:**

- The `NewRedirectMapModal` component on Full Page workspace is unchanged. ADR-0028 does not affect that surface.
- The SDK envelope is unchanged. Both `QuickRedirectForm`'s add-to-existing-map and create-new-map paths execute the same Authoring GraphQL mutations the existing modal flow runs (per ADR-0026 functional-contract preservation).
- ADR-0026 stays Accepted; ADR-0028 amends it by locking the Option A choice. The two ADRs are read together as the full Context Panel UX-evolution decision record.

## Date

2026-05-14
