# Click targets — Operator Console (v1)

Every clickable element across every frame in this POC, with the post-state file it leads to. Navigation is faithful per-frame: the next state is a real HTML file, never a generic "details modal".

## Landing — `index.html`

| Element | Click → | Post-state file |
|---|---|---|
| Surface tile "Context Panel" header link | open default Context Panel | `context-panel.html` |
| Surface tile "Context Panel" state link "default" | open default Context Panel | `context-panel.html` |
| Surface tile "Context Panel" state link "empty" | open empty Context Panel | `context-panel-empty.html` |
| Surface tile "Context Panel" state link "loading" | open loading Context Panel | `context-panel-loading.html` |
| Surface tile "Context Panel" state link "error" | open error Context Panel | `context-panel-error.html` |
| Surface tile "Context Panel" state link "add modal" | open add modal | `context-panel-add-modal.html` |
| Surface tile "Context Panel" state link "add to existing" | open add-to-existing inline form | `context-panel-add-existing.html` |
| Surface tile "Context Panel" state link "create new map" | open create-new-map inline form | `context-panel-create-new-map.html` |
| Surface tile "Context Panel" state link "edit row" | open inline-edit-row state | `context-panel-edit-row.html` |
| Surface tile "Dashboard Widget" header link | open default Dashboard Widget | `dashboard-widget.html` |
| Surface tile "Dashboard Widget" state link "default" | open default | `dashboard-widget.html` |
| Surface tile "Dashboard Widget" state link "empty" | open empty | `dashboard-widget-empty.html` |
| Surface tile "Dashboard Widget" state link "loading" | open loading | `dashboard-widget-loading.html` |
| Surface tile "Dashboard Widget" state link "error" | open error | `dashboard-widget-error.html` |
| Surface tile "Full Page" header link | open default Full Page | `full-page.html` |
| Surface tile "Full Page" state link "default" | open default | `full-page.html` |
| Surface tile "Full Page" state link "no selection" | open first-load empty state | `full-page-empty-no-selection.html` |
| Surface tile "Full Page" state link "no maps" | open zero-redirect-maps state | `full-page-no-redirects.html` |
| Surface tile "Full Page" state link "create map" | open create-map form | `full-page-create-redirect-map.html` |
| Surface tile "Full Page" state link "edit map" | open edit-map form | `full-page-edit-redirect-map.html` |
| Surface tile "Full Page" state link "import preview" | open import preview | `full-page-import-preview.html` |
| Surface tile "Full Page" state link "import summary" | open import summary | `full-page-import-summary.html` |
| Surface tile "Full Page" state link "error" | open error state | `full-page-error.html` |
| "click-targets.md" link | open this file | `click-targets.md` |
| "v1 spec" link | open variant spec markdown | `../../project-planning/ui-design/ui-design-20260509T191751Z-v1.md` |

## Context Panel — `context-panel.html`

| Element | Click → | Post-state file |
|---|---|---|
| Row 1 (Marketing campaigns / source-matched) "Edit" icon button | inline edit on that mapping row | `context-panel-edit-row.html` |
| Row 1 "Delete" icon button | inline confirm on that row (visual cue stays on same frame) | `context-panel.html` (no nav) |
| Row 2 (Marketing campaigns / target-matched) "Edit" icon button | inline edit form | `context-panel-edit-row.html` |
| Row 2 "Delete" icon button | inline confirm | `context-panel.html` |
| Row 3 (Legacy product URLs) "Edit" icon button | inline edit form | `context-panel-edit-row.html` |
| Row 3 "Delete" icon button | inline confirm | `context-panel.html` |
| Row 4 (A/B test variants) "Edit" icon button | inline edit form | `context-panel-edit-row.html` |
| Row 4 "Delete" icon button | inline confirm | `context-panel.html` |
| Footer "Add redirect for this page" button | open add modal | `context-panel-add-modal.html` |
| Bottom "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-empty.html`

| Element | Click → | Post-state file |
|---|---|---|
| Footer "Add redirect for this page" primary button | open add modal | `context-panel-add-modal.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-loading.html`

| Element | Click → | Post-state file |
|---|---|---|
| "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-error.html`

| Element | Click → | Post-state file |
|---|---|---|
| "Show technical details" disclosure | expand verbatim GraphQL error (in-frame `<details>`) | `context-panel-error.html` |
| "Retry" button | re-fire load (visual cue stays on frame) | `context-panel-error.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-add-modal.html`

| Element | Click → | Post-state file |
|---|---|---|
| Search input "Search redirect maps…" | filters list in place (visual cue) | `context-panel-add-modal.html` |
| Command-list item "+ Create new Redirect Map" | inline create-new-map form | `context-panel-create-new-map.html` |
| Command-list item "Marketing campaigns" | add-to-existing inline form (Type inherited) | `context-panel-add-existing.html` |
| Command-list item "Legacy product URLs" | add-to-existing inline form | `context-panel-add-existing.html` |
| Command-list item "A/B test variants" | add-to-existing inline form | `context-panel-add-existing.html` |
| Command-list item "Geo-IP fallbacks" | add-to-existing inline form | `context-panel-add-existing.html` |
| Command-list item "404 rescue chain" | add-to-existing inline form | `context-panel-add-existing.html` |
| Footer "Cancel" button | close modal, return to default | `context-panel.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-add-existing.html`

| Element | Click → | Post-state file |
|---|---|---|
| "Source" input (read-only — pre-populated from page URL) | no nav (read-only) | `context-panel-add-existing.html` |
| "Target" input | no nav — typing here | `context-panel-add-existing.html` |
| "Cancel" button (footer) | close, return to default | `context-panel.html` |
| "Save mapping" primary button | mutation fires, success toast, return to default | `context-panel.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-create-new-map.html`

| Element | Click → | Post-state file |
|---|---|---|
| "Map name" input | no nav — typing here | `context-panel-create-new-map.html` |
| "Type" select (initial: empty placeholder "Pick a type…") | no nav — selecting here | `context-panel-create-new-map.html` |
| Three flag checkboxes | no nav — toggling here | `context-panel-create-new-map.html` |
| "Source" input (read-only — pre-populated) | no nav | `context-panel-create-new-map.html` |
| "Target" input | no nav — typing here | `context-panel-create-new-map.html` |
| "Back" footer button | return to add modal | `context-panel-add-modal.html` |
| "Create map" primary button | mutation fires, success toast, return to default with new group | `context-panel.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Context Panel — `context-panel-edit-row.html`

| Element | Click → | Post-state file |
|---|---|---|
| "Source" inline-edit input | no nav — typing here | `context-panel-edit-row.html` |
| "Target" inline-edit input | no nav — typing here | `context-panel-edit-row.html` |
| "Cancel" small button (inline) | discard edit, return to default | `context-panel.html` |
| "Save" small primary button | mutation fires, return to default with success toast | `context-panel.html` |
| Row 2 "Edit" / "Delete" icon buttons | enter inline edit on that row | `context-panel-edit-row.html` |
| "Add redirect for this page" footer button | open add modal | `context-panel-add-modal.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Dashboard Widget — `dashboard-widget.html`

| Element | Click → | Post-state file |
|---|---|---|
| "← Back to all surfaces" link | landing | `index.html` |

(Tiles are non-interactive in MVP per Q1 — see v1 spec § 6.1.)

## Dashboard Widget — `dashboard-widget-empty.html`

| Element | Click → | Post-state file |
|---|---|---|
| "← Back to all surfaces" link | landing | `index.html` |

## Dashboard Widget — `dashboard-widget-loading.html`

| Element | Click → | Post-state file |
|---|---|---|
| "← Back to all surfaces" link | landing | `index.html` |

## Dashboard Widget — `dashboard-widget-error.html`

| Element | Click → | Post-state file |
|---|---|---|
| "Show technical details" disclosure | expand verbatim error in-frame | `dashboard-widget-error.html` |
| "Retry" button | re-fire load (visual cue) | `dashboard-widget-error.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page.html` (default — Marketing campaigns selected)

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "SneakerCo" | navigate up — clear site/map | `full-page-empty-no-selection.html` |
| Breadcrumb "MainSite" | navigate up — clear map selection | `full-page.html` |
| Topbar "Import" button | open import flow | `full-page-import-preview.html` |
| Topbar "Export" button | trigger JSON download (visual cue) | `full-page.html` |
| Topbar "New map" primary button | open create form | `full-page-create-redirect-map.html` |
| Collection select | switch collection (visual cue) | `full-page.html` |
| Site select | switch site (visual cue) | `full-page.html` |
| Rail row "Marketing campaigns" (selected) | re-select (no nav) | `full-page.html` |
| Rail row "Legacy product URLs" | select that map | `full-page-edit-redirect-map.html` |
| Rail row "A/B test variants" | select that map | `full-page-edit-redirect-map.html` |
| Rail row "Geo-IP fallbacks" | select that map | `full-page-edit-redirect-map.html` |
| Rail row "404 rescue chain" | select that map | `full-page-edit-redirect-map.html` |
| Rail row "Holiday landing pages 2025" | select that map | `full-page-edit-redirect-map.html` |
| Rail row "Influencer partner links" | select that map | `full-page-edit-redirect-map.html` |
| Rail row "Affiliate trackers" | select that map | `full-page-edit-redirect-map.html` |
| GUID badge (top-right of detail) | copy GUID to clipboard, show toast | `full-page.html` |
| Form: Name input | edit name (no nav) | `full-page.html` |
| Form: Type select | change type (no nav) | `full-page.html` |
| Form: 3 flag checkboxes | toggle flags (no nav) | `full-page.html` |
| Mapping row 1 (drag handle) | start drag-reorder (no nav) | `full-page.html` |
| Mapping row 1 source/target inputs | edit row (no nav) | `full-page.html` |
| Mapping row 1 "Delete row" icon button | delete row (visual cue) | `full-page.html` |
| Mapping rows 2–6: same anatomy | same | `full-page.html` |
| "Add mapping" ghost button (table footer) | append new empty row | `full-page.html` |
| Bottom "Delete map" destructive-outline button | open delete-confirm modal (visual cue) | `full-page.html` |
| Bottom "Cancel" ghost button | revert form changes | `full-page.html` |
| Bottom "Save changes" primary button | mutation fires, success toast | `full-page.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-empty-no-selection.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "Pick a collection to begin" (text only) | no nav | `full-page-empty-no-selection.html` |
| Topbar "Import" / "Export" / "New map" buttons | all disabled — no nav | `full-page-empty-no-selection.html` |
| Collection select | pick a collection (visual cue) | `full-page-empty-no-selection.html` |
| Site select (disabled) | no nav until collection picked | `full-page-empty-no-selection.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-no-redirects.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "SneakerCo" | clear site selection | `full-page-empty-no-selection.html` |
| Topbar "Import" button | open import flow | `full-page-import-preview.html` |
| Topbar "Export" button (disabled) | no nav | `full-page-no-redirects.html` |
| Topbar "New map" primary button | open create form | `full-page-create-redirect-map.html` |
| Collection select | switch collection | `full-page-no-redirects.html` |
| Site select | switch site | `full-page-no-redirects.html` |
| Rail empty-state "New map" button | open create form | `full-page-create-redirect-map.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-create-redirect-map.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "SneakerCo" | navigate up | `full-page-empty-no-selection.html` |
| Breadcrumb "MainSite" | back to default | `full-page.html` |
| Topbar "Import" / "Export" / "New map" buttons | new-map disabled (already in create); others standard | `full-page-create-redirect-map.html` |
| Rail row "Marketing campaigns" | switch to that map (cancel-with-confirm if dirty) | `full-page.html` |
| Rail row "Legacy product URLs" / "A/B test variants" / "Geo-IP fallbacks" | switch to that map | `full-page-edit-redirect-map.html` |
| Form: Name input | typing (no nav) | `full-page-create-redirect-map.html` |
| Form: Type select (initial empty "Pick a type…") | pick type | `full-page-create-redirect-map.html` |
| Form: 3 flag checkboxes | toggle (no nav) | `full-page-create-redirect-map.html` |
| Mapping row 1 (valid) drag handle | drag-reorder | `full-page-create-redirect-map.html` |
| Mapping row 1 source / target inputs | typing | `full-page-create-redirect-map.html` |
| Mapping row 1 "Delete row" | delete | `full-page-create-redirect-map.html` |
| Mapping row 2 (invalid — empty source) source input | typing fixes the validation | `full-page-create-redirect-map.html` |
| Mapping row 2 "Delete row" | delete | `full-page-create-redirect-map.html` |
| "Add mapping" ghost button | append empty row | `full-page-create-redirect-map.html` |
| Bottom "Cancel" link | discard, return to default | `full-page.html` |
| Bottom "Create map" primary button | mutation fires; on success → detail of new map | `full-page-edit-redirect-map.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-edit-redirect-map.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "SneakerCo" | navigate up | `full-page-empty-no-selection.html` |
| Breadcrumb "MainSite" | back to default | `full-page.html` |
| Topbar "Import" / "Export" / "New map" | standard | `full-page-import-preview.html` / no-nav / `full-page-create-redirect-map.html` |
| Rail row "Marketing campaigns" | switch to that map | `full-page.html` |
| Rail row "Legacy product URLs" (selected) | re-select (no nav) | `full-page-edit-redirect-map.html` |
| Rail row "A/B test variants" / "Geo-IP fallbacks" | switch | `full-page-edit-redirect-map.html` |
| GUID badge | copy to clipboard | `full-page-edit-redirect-map.html` |
| Form: Name input | typing | `full-page-edit-redirect-map.html` |
| Form: Type select | change | `full-page-edit-redirect-map.html` |
| Form: 3 flag checkboxes | toggle | `full-page-edit-redirect-map.html` |
| Mapping row 1 (in active drag-reorder state) drag handle | drag | `full-page-edit-redirect-map.html` |
| Mapping rows 1–6 source / target inputs | typing | `full-page-edit-redirect-map.html` |
| Mapping rows 1–6 "Delete row" icon | delete | `full-page-edit-redirect-map.html` |
| "Add mapping" ghost button | append | `full-page-edit-redirect-map.html` |
| Bottom "Delete map" destructive-outline | open delete-confirm modal (visual cue) | `full-page-edit-redirect-map.html` |
| Bottom "Cancel" | discard, restore | `full-page-edit-redirect-map.html` |
| Bottom "Save changes" primary | mutation fires | `full-page-edit-redirect-map.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-import-preview.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "SneakerCo" | abandon import, navigate up | `full-page-empty-no-selection.html` |
| Breadcrumb "MainSite" | abandon import, back to default | `full-page.html` |
| Topbar "Cancel" link | abandon import, back to default | `full-page.html` |
| Bulk action select "(no bulk action) / Create / Overwrite / Skip" | sync all conflict pickers (visual cue) | `full-page-import-preview.html` |
| Row 1 (New: Spring 2026 launch) chevron | expand diff (visual cue) | `full-page-import-preview.html` |
| Row 1 action select | change action (visual cue) | `full-page-import-preview.html` |
| Row 2 (Conflict: Marketing campaigns) chevron | expand diff | `full-page-import-preview.html` |
| Row 2 action select (initial empty "Pick action…") | pick action; resolves the unresolved indicator | `full-page-import-preview.html` |
| Row 3 (Conflict: Legacy product URLs — diff already expanded) chevron | collapse | `full-page-import-preview.html` |
| Row 3 action select (showing "Overwrite") | change action | `full-page-import-preview.html` |
| Row 4 (Conflict: A/B test variants) chevron | expand | `full-page-import-preview.html` |
| Row 4 action select | pick action | `full-page-import-preview.html` |
| Row 5 (Unchanged: Geo-IP fallbacks) chevron | expand (shows "no changes") | `full-page-import-preview.html` |
| Row 5 action select | change | `full-page-import-preview.html` |
| Row 6 (New: Influencer Q2 partners) chevron / select | standard | `full-page-import-preview.html` |
| Row 7 (Conflict: 404 rescue chain) chevron / select | standard | `full-page-import-preview.html` |
| Row 8 (Unchanged: Holiday landing pages 2025) chevron / select | standard | `full-page-import-preview.html` |
| Bottom "Cancel" link | abandon, back to default | `full-page.html` |
| Bottom "Confirm import" disabled primary (with tooltip) | when all conflicts resolved → confirm; on completion → import summary | `full-page-import-summary.html` |
| Footer "View completed import →" demo link | jump to summary | `full-page-import-summary.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-import-summary.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb "SneakerCo" | navigate up | `full-page-empty-no-selection.html` |
| Breadcrumb "MainSite" | back to default | `full-page.html` |
| Rail rows | select a map | `full-page-edit-redirect-map.html` |
| Failed row 1 (A/B test variants) "Show technical details" | expand verbatim error in-frame | `full-page-import-summary.html` |
| Failed row 2 (Affiliate trackers) "Show technical details" | expand verbatim error | `full-page-import-summary.html` |
| Disclosure "View all 22 successful items" | expand success list in-frame | `full-page-import-summary.html` |
| Bottom "Retry failed items only" outline button | re-fire mutations on failed GUIDs (visual cue) | `full-page-import-summary.html` |
| Bottom "Done" primary link | back to default detail | `full-page.html` |
| "← Back to all surfaces" link | landing | `index.html` |

## Full Page — `full-page-error.html`

| Element | Click → | Post-state file |
|---|---|---|
| Breadcrumb segments | navigate as usual | `full-page-empty-no-selection.html` / `full-page.html` |
| Topbar "Import" / "Export" / "New map" | standard | `full-page-import-preview.html` / no-nav / `full-page-create-redirect-map.html` |
| Rail rows | select map (form blocked until error dismissed/retried) | `full-page-edit-redirect-map.html` |
| Banner "Show technical details" (open by default) | toggle disclosure | `full-page-error.html` |
| Banner "Retry" destructive small button | re-fire last mutation | `full-page-error.html` |
| Banner "Dismiss" ghost small button | hide banner, return to detail | `full-page.html` |
| Form fields (name, type, flags) | disabled while banner present | `full-page-error.html` |
| "← Back to all surfaces" link | landing | `index.html` |

---

**Total click-target rows captured: 168 across 17 frames + landing.**
