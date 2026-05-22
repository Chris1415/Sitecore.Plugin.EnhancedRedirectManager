# ADR-0043: `EditRowModal` replaces inline row editing in `RedirectMapDetail`

## Status

Accepted (supersedes the R8 risk class from architecture-20260520T080000Z.md § 9 — see Consequences)

## Context

PRD-004 needs a place to host the new Pattern / Regex mode toggle, regex authoring helpers (snippet library, capture-group chips, `$siteLang` chip, optional live tester), save-time validation, and inline hints. Two competing approaches were on the table during /architect:

1. **Extract `RowEditForm` from `RedirectMapDetail.tsx`** — refactor the existing inline edit affordance into its own component, then add the new affordances to that component. Architecturally clean, but introduces a non-trivial refactor of a stable PRD-000 surface; carries R8 (extraction-regression risk). The architect rated R8 medium-likelihood / medium-impact and added a dedicated regression test suite as a T3 prerequisite.

2. **Add a small modal dialog** — leave `RedirectMapDetail` untouched in its inline-edit form, build a separate `EditRowModal` component that opens on row click and owns the new affordances. Two ways to edit (inline + modal) coexist.

A third option emerged from the operator (2026-05-20): **modal replaces inline editing entirely.** One way to edit, no UX duality. `RedirectMapDetail` is touched only to rewire the row click handler to open the modal (a small surgical change), not to extract an entire form. The R8 extraction risk is sidestepped completely — there is no extraction to fail. The cost is a UX change for existing operators: they previously could edit inline; now they get a modal.

The operator's working preference is to keep map-level fields (`RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage`) out of the row-edit experience — those are SHARED fields on the parent Redirect Map item per the stock Sitecore template (captured 2026-05-13, see `reference_sitecore_redirect_map_template_field_versioning`). Having a small modal that owns ONLY row-level concerns (source + destination + mode + helpers) aligns the UI with the data model.

The third option also resolves a subtler conflict: when the operator clicks "Open this rule in Manage" from the Test surface's matched-result card, the deep-link target needs to be a focused affordance the operator can immediately read and edit. An inline-row-edit UI is harder to focus and scroll to; a modal opens cleanly with focus management trivially correct.

## Decision

**`EditRowModal` is the sole row-edit affordance.** The existing PRD-000 inline edit UI in `RedirectMapDetail` is removed. Clicking any row in the map opens the modal.

Modal structure (top to bottom):

1. Mode toggle (Pattern / Regex segmented control, full-width)
2. Source input
3. Inline-hint slot (visible when `isRegexOrUrl(source)` disagrees with manual mode; `role="status"`)
4. Snippet library (collapsible, open by default in Regex mode, closed in Pattern)
5. Live regex sample-URL tester (collapsible, closed by default; MVP-deferable per brain-dump D-009)
6. Destination input
7. Capture-group chip strip (visible in Regex mode when source has groups; `$1..$N` + always `$siteLang`)
8. Save / Cancel footer

Modal does **NOT** contain:
- `RedirectType` (map-level SHARED field)
- `IncludeVirtualFolder` (map-level SHARED field)
- `PreserveQueryString` (map-level SHARED field)
- `PreserveLanguage` (map-level SHARED field)

These remain managed in the existing map-settings UI (carry-forward from PRD-000/002, unchanged).

Save action commits the row's source + destination back to the parent map's `UrlMapping` field via existing `lib/sdk/redirects-write.ts` — no new SDK calls. Cancel discards edits. Dismiss via Esc / close button / click-outside; if source/destination differ from the original, prompt "unsaved changes — discard?" before closing.

`RedirectMapDetail` rewire: the existing inline-edit click handler is replaced by a "open `EditRowModal` for row N" call. No structural refactor of the component; the row layout, table chrome, and read-display logic stay as-is.

## Consequences

**Easier:**
- **R8 extraction-regression risk is eliminated** — there is no `RowEditForm` to extract; `RedirectMapDetail`'s structure is preserved
- Deep-link from Test → Manage now opens a focused modal that's trivially correct for focus management (no scroll-to + inline-affordance dance)
- The data-model boundary is reflected in the UI: row-level fields in the row-edit UI; map-level fields in the map-settings UI. Fewer "which field goes where?" questions for future contributors
- Adding more row-level fields later (e.g. per-row notes) has an obvious home: this modal
- T3 work is more linear: build the modal in isolation, wire the click handler last; no "what does the inline editor do that the modal must replicate" matrix
- The Test → Manage deep-link unwinds simply: `setActiveTab('manage')` → `detailRef.current?.scrollToRow(...)` → `setEditModalState({ open: true, mapId, rowIndex })`. ADR-0041's lifted state pattern still applies but `lastTrace` no longer needs to coordinate with an inline editor's focus.

**Harder:**
- Existing PRD-000 operators experience a UX change: edit is now click → modal instead of click → inline focus. Slight click-throughput regression for power users. Mitigated by: modal opens fast (no network), respects keyboard shortcuts, focus management trivial.
- New R8b risk class: the modal's CRUD path must produce identical persistence behavior to the previous inline-edit path. T3 carry-over CRUD smoke (round-trip a row: read → open modal → edit → save → re-read) is mandatory before mode-toggle / regex affordances are added on top.
- Auto-lite release notes must call out the inline-edit removal so existing operators are not blindsided ("you click the row and a modal opens now instead of editing in-place").
- Mobile responsiveness gets a small win and a small loss: modal centers cleanly on mobile (better than inline editing in a wide table) but the modal now needs explicit small-viewport sizing rules.

**Supersedes:**
- Architecture document § 2.8 "New component — `RowEditForm` (extracted from RedirectMapDetail)" is obsoleted by this ADR. The component name is `EditRowModal`; there is no extraction.
- Architecture document § 9 R8 ("RowEditForm extraction introduces regressions in CRUD") is replaced by R8b ("EditRowModal CRUD path regresses parity with prior inline edit"). Same general risk class, different specifics: the regression vector is the new modal-mediated save path, not an extracted-component refactor.

**Re-affirms:**
- ADR-0040 (mode is transient UI state) — still applies; mode defaults to Pattern on every modal open
- ADR-0041 (Test-surface state lifted to FullPage) — still applies; modal-open state lives at the `FullPage` level so the Test→Manage deep-link can drive it directly

## Date

2026-05-20
