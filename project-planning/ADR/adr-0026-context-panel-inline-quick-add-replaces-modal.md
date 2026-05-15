# ADR-0026: Context Panel inline quick-add replaces `AddRedirectModal` flow (US-2 → US-R5 interaction-pattern evolution)

## Status

Accepted

## Context

PRD-000 US-2 (*"Add a redirect for the current page directly from the Context Panel"*) shipped as a **button + modal** flow: the operator clicks "Add redirect for this page" on the Context Panel, which opens a modal containing a searchable list of existing Redirect Maps + "Create new Redirect Map" option, then an inline form for source/target/type/flags.

The V4 Blok Elevated POC at `pocs/poc-marketing-v4-blok-elevated/context-panel.html` ships a different pattern: the Context Panel body has an **inline quick-add form** always visible at the top of the panel. Form fields: source input (pre-populated with current page route, editable), RedirectType select (3 enum values), "→ this page" affordance indicating the current page is the target, and a small "Add" button. No modal opens.

The operator directive on 2026-05-13 explicitly accepted V4 UX evolutions: *"if the UX changes for instance from modal to inline as per design we should do that."* This makes the modal → inline pattern shift one of the V4 UX evolutions covered by ADR-0024's relaxed redesign rule.

Three sub-questions emerged during the PRD-002 revision pass:

1. **What happens to the existing `AddRedirectModal` component?** Two flows live in the modal today: (a) "Add to existing map" (most common; source pre-populated; target required; RedirectType + flags inherited from chosen map), (b) "Create new map" (full flag control: name, RedirectType, three flag checkboxes, plus first mapping). The inline form fits (a) cleanly. Whether (b) survives is a design question.
2. **What does the inline form do when no maps match the current page?** Either it offers an inline "create new map" path or it falls back to the modal for the create-new-map case.
3. **What does the inline form's RedirectType select control?** When adding to an existing map, RedirectType is inherited from that map (the existing modal doesn't ask). When creating a new map, RedirectType must be chosen. The inline form has only one RedirectType select — which case does it govern?

## Decision

**Context Panel inline quick-add (US-R5) replaces the existing `AddRedirectModal` as the primary add-redirect flow.** The interaction-pattern change ships as part of PRD-002 per ADR-0024's relaxed redesign rule.

### Inline quick-add form contract

The form sits at the top of the Context Panel body, always visible (not gated behind a button-click). Form layout:

- **Eyebrow:** *"Quick redirect"* in small-caps label.
- **Source input:** pre-populated with the current page route; editable; mono font (`Geist Mono`); validates non-empty.
- **RedirectType select:** 3-value enum dropdown (`Redirect301` / `Redirect302` / `ServerTransfer` rendered as `301` / `302` / `Server Transfer`); default `Redirect301`.
- **Target affordance:** static "→ this page" label indicating the target is the current page (not editable; the inline form is "redirect *this* source *to* current page", which is the most common Context Panel add-redirect intent).
- **Add button:** primary, small. Disabled until source is non-empty.

### Behavioural contract

- **Default behaviour — add to existing map.** When the current page has matched Redirect Maps (panel state = "has matches" — `matchedGroups.length > 0`), the inline form adds to the *most recently updated* matched map by default. The RedirectType from the form overrides the map's default for this single mapping (architect refines — if PRD-000 modal inherits RedirectType from the chosen map without offering an override, the inline form's select must either inherit-and-hide or stay-and-override; pick at `/architect`).
- **No-matches behaviour — create new map.** When the current page has zero matched maps (panel state = "empty"), the inline form's Add button creates a new Redirect Map. The new map's name is auto-generated (e.g. `<page-slug>-redirects` or operator-provided; architect picks); RedirectType comes from the form's select; flags default to PRD-000's defaults; the first mapping is the inline form's source → current page.
- **Multiple matches — add-to-which-map prompt.** When `matchedGroups.length > 1`, an inline "add to" dropdown (or chip cluster) above the form lets the operator pick which map receives the new mapping. (Architect refines exact pattern; chip cluster is V4-friendly.)
- **Validation:** source required, RedirectType required (default exists but operator may have unset it). Inline validation per PRD-000 FR-11.
- **Functional contract preserved:** Add button triggers the same Authoring GraphQL mutations as the existing modal flow — `createRedirectMap` for new-map path, `updateRedirectMap` for existing-map path. No new SDK surfaces. No new GraphQL fields. Same response handling, same error UX (toast + collapsible technical details).

### Existing `AddRedirectModal` fate

**Primary path is the inline form.** Whether `AddRedirectModal` survives as a **fallback for the "create new map with full flag control" path** (where operator wants to set `PreserveQueryString`, `PreserveLanguage`, `IncludeVirtualFolder` flags on the new map) is an architect decision at `/architect`:

- **Option A — Remove the modal entirely.** The inline form handles both add-to-existing and create-new (with auto-name + default flags). Operators who want full flag control on a new map create it from the Full Page workspace instead.
- **Option B — Keep the modal as a "Configure new map" fallback.** The inline form's no-matches behaviour offers a "Configure new map…" affordance that opens the modal for the full flag-control flow.

**Recommended (subject to architect review):** Option A. The inline form's job is *speed*; full flag control on new map creation belongs to the Full Page workspace where the operator has more room to think. Removing the modal also simplifies the Context Panel component graph.

In either case, **the modal MUST NOT remain as the primary add path**. The inline form is the front door.

### Impact on PRD-000 Vitest tests

The largest test-impact item in PRD-002. The existing `AddRedirectModal` tests (if any) need to be re-pointed at the new inline form OR retained (with adjusted assertions) if the modal stays as a fallback per Option B. Lead Developer audits at `/task-breakdown`; QA Specialist enriches with TDD steps. Captured as R-12 in PRD-002 § 13.

## Consequences

**Easier:**

- **Faster add-redirect flow.** Operator's most common Context Panel intent (add a redirect for the current page to an already-matched map) goes from button-click → modal-open → form → save (4 steps) to inline-type → click Add (2 steps). Real time savings on every authoring session.
- **More discoverable affordance.** Always-visible inline form is easier to find than a button leading to a modal — operators new to the product see the redirect-add capability immediately.
- **Cleaner component graph.** If Option A (remove modal) is selected, one component fewer to maintain. Reduces test surface (R-12 partial mitigation).
- **V4 visual cohesion.** The inline form fits naturally inside the V4 hero-and-body Context Panel pattern; a modal would interrupt the elevated chrome with a separate surface.

**Harder:**

- **PRD-000 modal-flow tests need rework.** R-12 captures the cost; Lead Developer + QA at `/task-breakdown` enumerate the affected tests and decide rework vs. re-point.
- **"Create new map with full flag control" UX moves**. Option A relocates this rare path to Full Page workspace. Operators who relied on the Context Panel modal for new-map-with-flags must learn the new location. Mitigated by Full Page being the natural workspace for new-map creation; the Context Panel modal flow for this case was the unusual one.
- **Behavioural decisions (most-recent map default, multi-match chip cluster) need architect refinement.** PRD-002 captures the contract above; architect refines the exact dropdown/chip pattern + the RedirectType override semantics during `/architect`.
- **Smoke gate m3 (`crud_round_trip`) coverage expands** to cover the new inline form on top of all existing PRD-000 CRUD paths. Operator session at `live_walkthrough` validates both the existing flows (under V4 chrome) and the new inline flow.

**Neutral:**

- ADR-0026 supersedes neither US-2 nor PRD-000 § 7 FR-11 (validation rules) — same validation contract carries forward. The interaction *pattern* changes; the functional contract (validation, SDK mutations executed, response handling) is preserved.
- ADR-0026 does not change the `RedirectType` enum (still 3 values per ADR-0024), does not change the Marketplace SDK contract, and does not introduce any new GraphQL fields.

## Date

2026-05-14
