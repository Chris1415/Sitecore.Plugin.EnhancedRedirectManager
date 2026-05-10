# POC v3 — Click-target enumeration ("Site Atlas")

This file enumerates every clickable element on every screen of `poc-v3` and
the post-state HTML file each click leads to. The clickdummy is a static
visual prototype — placeholder data only, no SDK, no backend.

Toggle-theme buttons (top-right of every screen) and "← Hub" links (top-left)
are listed once below for brevity; they appear on every page.

Universal elements:

| Element | Selector | Post-state |
|---|---|---|
| `← Hub` link in poc-bar | `.poc-bar a[href="index.html"]` | `index.html` |
| Theme toggle button | `[data-theme-toggle]` | (no navigation — toggles `.dark` on `<html>`) |

---

## `index.html` — Hub

| Element | Post-state |
|---|---|
| "Context panel — populated" hub card | `context-panel.html` |
| "No redirects affect this page" hub card | `context-panel-empty.html` |
| "Add redirect — pick a Map" hub card | `context-panel-add-modal.html` |
| "Inline form — existing map" hub card | `context-panel-add-existing.html` |
| "Inline form — create new map" hub card | `context-panel-create-new-map.html` |
| "Edit a single mapping row" hub card | `context-panel-edit-row.html` |
| "3 stat tiles + mini-graphic" hub card | `dashboard-widget.html` |
| "No redirects configured" hub card | `dashboard-widget-empty.html` |
| "Site Atlas — picker + tree" hub card | `full-page.html` |
| "Pick a collection to begin" hub card | `full-page-empty-no-selection.html` |
| "Site selected, zero maps" hub card | `full-page-no-redirects.html` |
| "New Redirect Map sheet" hub card | `full-page-create-redirect-map.html` |
| "Edit Redirect Map sheet" hub card | `full-page-edit-redirect-map.html` |
| "3-action conflict picker" hub card | `full-page-import-preview.html` |
| "Per-item success / fail" hub card | `full-page-import-summary.html` |
| "Friendly error banner" hub card | `full-page-error.html` |

---

## `context-panel.html` — Context Panel default

| Element | Post-state |
|---|---|
| Persistent regex banner | (non-dismissible — no click target) |
| `+ Add redirect for this page` button | `context-panel-add-modal.html` |
| Mapping row 1 — Edit pencil button (Marketing Campaigns 2026 / `/products/launch-2026 → /launch`) | `context-panel-edit-row.html` |
| Mapping row 1 — kebab `MoreHorizontal` button | (visual menu trigger; remains on `context-panel.html`) |
| Mapping row 2 — Edit pencil button (`/legacy/launch-page → /products/launch-2026`) | `context-panel-edit-row.html` |
| Mapping row 2 — kebab button | (visual; stays on page) |
| Mapping row 3 — Edit pencil button (Product Renames / `/products/launch-2026 → /products/edition-x`) | `context-panel-edit-row.html` |
| Mapping row 3 — kebab button | (visual; stays on page) |
| Mapping row 4 — Edit pencil button (Internal Reorg / `/about/2025-launch → /products/launch-2026`) | `context-panel-edit-row.html` |
| Mapping row 4 — kebab button | (visual; stays on page) |
| Mapping row 5 — Edit pencil button (`/products/launch-2026 → /news/2026-launch-announcement`) | `context-panel-edit-row.html` |
| Mapping row 5 — kebab button | (visual; stays on page) |

---

## `context-panel-empty.html` — Context Panel empty

| Element | Post-state |
|---|---|
| Persistent regex banner | (non-dismissible) |
| `+ Add redirect for this page` button | `context-panel-add-modal.html` |

---

## `context-panel-add-modal.html` — Add Redirect modal step 1

| Element | Post-state |
|---|---|
| Close X button on dialog header | `context-panel.html` |
| Search input | (no navigation; filters list visually) |
| `+ Create new Redirect Map` first row | `context-panel-create-new-map.html` |
| "Marketing Campaigns 2026" map row | `context-panel-add-existing.html` |
| "Product Renames" map row | `context-panel-add-existing.html` |
| "Internal Reorg" map row | `context-panel-add-existing.html` |
| "Legacy URL Cleanup" map row | `context-panel-add-existing.html` |
| Cancel button (footer) | `context-panel.html` |

---

## `context-panel-add-existing.html` — Add Redirect step 2a (existing map form)

| Element | Post-state |
|---|---|
| Back/close X button (header) | `context-panel-add-modal.html` |
| Source URL input (pre-filled) | (text input — no nav) |
| Target URL input | (text input — no nav) |
| Back button (footer) | `context-panel-add-modal.html` |
| `Save redirect` button | `context-panel.html` |

---

## `context-panel-create-new-map.html` — Add Redirect step 2b (create new map form)

| Element | Post-state |
|---|---|
| Back/close X button (header) | `context-panel-add-modal.html` |
| Map name input | (text — no nav) |
| Redirect type select (initially empty) | (select — no nav) |
| Preserve query string checkbox | (toggle — no nav) |
| Preserve language checkbox | (toggle — no nav) |
| Include virtual folder checkbox | (toggle — no nav) |
| Source URL input (pre-filled) | (text — no nav) |
| Target URL input | (text — no nav) |
| Back button (footer) | `context-panel-add-modal.html` |
| `Save` button | `context-panel.html` |

---

## `context-panel-edit-row.html` — Inline edit one row

| Element | Post-state |
|---|---|
| Source input (mono) | (text — no nav) |
| Target input (mono) | (text — no nav) |
| Cancel button | `context-panel.html` |
| Save button | `context-panel.html` |

---

## `dashboard-widget.html` — Dashboard populated

| Element | Post-state |
|---|---|
| Mini-graphic SVG | (decorative; `aria-hidden="true"`; no click) |
| Kebab `MoreHorizontal` button | (visual menu; stays on page) |
| Tile 1 — "3 Redirect Maps" | `full-page.html` |
| Tile 2 — "47 Mappings" | `full-page.html` |
| Tile 3 — "2h ago Last updated" | `full-page.html` |

---

## `dashboard-widget-empty.html` — Dashboard zero maps

| Element | Post-state |
|---|---|
| Kebab button | (visual; stays on page) |
| Empty-state SVG | (decorative; no click) |
| `Open Redirect Manager` button | `full-page-no-redirects.html` |

---

## `full-page.html` — Full Page default with one expanded map

| Element | Post-state |
|---|---|
| Topbar `Import` button | `full-page-import-preview.html` |
| Topbar `Export` button | (visual; stays on page) |
| Topbar `+ New Redirect Map` button | `full-page-create-redirect-map.html` |
| Minimap node (collection) | (decorative `aria-hidden`; no click) |
| Minimap node (you-are-here, MarketingHub) | (decorative; no click) |
| Minimap counter | (decorative; no click) |
| Picker — Collection select | (select; no nav) |
| Picker — Site select | (select; no nav) |
| Picker — Active site card | (decorative; no click) |
| Picker — "FinanceHub" other-site row | `full-page-no-redirects.html` |
| Picker — "SupportHub" other-site row | `full-page.html` |
| Picker — "EventsHub" other-site row | `full-page.html` |
| Atlas row 1 (collapsed) — "Marketing Campaigns 2026" header | (visual collapse; stays on page) |
| Atlas row 1 — Map kebab | (visual menu; stays on page) |
| Atlas row 2 (expanded) — "Product Renames" header | (collapse; stays on page) |
| Atlas row 2 — Map kebab | `full-page-edit-redirect-map.html` |
| Atlas row 2 — Mapping row 1 Edit (pencil) | (inline edit; stays on page) |
| Atlas row 2 — Mapping row 1 Delete (trash) | (visual confirm; stays on page) |
| Atlas row 2 — Mapping row 2 Edit | (inline edit; stays on page) |
| Atlas row 2 — Mapping row 2 Delete | (visual confirm; stays on page) |
| Atlas row 2 — Mapping row 3 Edit | (inline edit; stays on page) |
| Atlas row 2 — Mapping row 3 Delete | (visual confirm; stays on page) |
| Atlas row 2 — `+ Add mapping` ghost button | (inline append; stays on page) |
| Atlas row 3 (collapsed) — "Internal Reorg" header | (visual expand; stays on page) |
| Atlas row 3 — Map kebab | (visual menu; stays on page) |
| Success toast (decorative) | (auto-dismiss display only) |

---

## `full-page-empty-no-selection.html` — first load

| Element | Post-state |
|---|---|
| Topbar `Import` (disabled) | (no nav) |
| Topbar `Export` (disabled) | (no nav) |
| Topbar `+ New Redirect Map` (disabled) | (no nav) |
| Picker — Collection select | (select; no nav) |
| Picker — Site select (disabled) | (no nav) |

---

## `full-page-no-redirects.html` — site selected, zero maps

| Element | Post-state |
|---|---|
| Topbar `Import` button | `full-page-import-preview.html` |
| Topbar `Export` (disabled) | (no nav) |
| Topbar `+ New Redirect Map` button | `full-page-create-redirect-map.html` |
| Minimap nodes / counter | (decorative; no click) |
| Picker — Collection select | (select) |
| Picker — Site select | (select) |
| Empty-state `New Redirect Map` button | `full-page-create-redirect-map.html` |

---

## `full-page-create-redirect-map.html` — Create map sheet

| Element | Post-state |
|---|---|
| Sheet — Close X button | `full-page.html` |
| Map name input | (text; no nav) |
| Redirect type select (initially empty) | (select; no nav) |
| Preserve query string checkbox | (toggle; no nav) |
| Preserve language checkbox | (toggle; no nav) |
| Include virtual folder checkbox | (toggle; no nav) |
| Mapping row 1 — Source input | (text; no nav) |
| Mapping row 1 — Target input | (text; no nav) |
| Mapping row 1 — Delete row button | (visual remove; stays on page) |
| Mapping row 2 — Source input | (text; no nav) |
| Mapping row 2 — Target input | (text; no nav) |
| Mapping row 2 — Delete row button | (visual remove; stays on page) |
| `+ Add mapping` ghost button | (inline append; stays on page) |
| Footer `Cancel` button | `full-page.html` |
| Footer `Save` button | `full-page.html` |

---

## `full-page-edit-redirect-map.html` — Edit map sheet (pre-filled)

| Element | Post-state |
|---|---|
| Sheet — Close X button | `full-page.html` |
| Map name input (pre-filled) | (text; no nav) |
| Redirect type select | (select; no nav) |
| Preserve query string checkbox (checked) | (toggle; no nav) |
| Preserve language checkbox (checked) | (toggle; no nav) |
| Include virtual folder checkbox (unchecked) | (toggle; no nav) |
| Mapping row 1 — Source input (pre-filled) | (text; no nav) |
| Mapping row 1 — Target input (pre-filled) | (text; no nav) |
| Mapping row 1 — Delete row button | (visual remove; stays on page) |
| Mapping row 2 — Source input (pre-filled) | (text; no nav) |
| Mapping row 2 — Target input (pre-filled) | (text; no nav) |
| Mapping row 2 — Delete row button | (visual remove; stays on page) |
| Mapping row 3 — Source input (pre-filled) | (text; no nav) |
| Mapping row 3 — Target input (pre-filled) | (text; no nav) |
| Mapping row 3 — Delete row button | (visual remove; stays on page) |
| `+ Add mapping` ghost button | (inline append; stays on page) |
| Footer `Cancel` button | `full-page.html` |
| Footer `Save changes` button | `full-page.html` |

---

## `full-page-import-preview.html` — Import preview (3-action picker)

| Element | Post-state |
|---|---|
| Bulk action select ("Apply same action to all conflicts") | (select; no nav) |
| New item row 1 ("Q1 Promo Campaign") header | (visual expand; stays on page) |
| New item row 2 ("Black Friday Redirects") header | (visual expand; stays on page) |
| Conflict 1 ("Marketing Campaigns 2026") header — collapsed | (expand; stays on page) |
| Conflict 1 — `Create` toggle button | (selects action — visual) |
| Conflict 1 — `Overwrite` toggle button (currently pressed) | (selects action — visual) |
| Conflict 1 — `Skip` toggle button | (selects action — visual) |
| Conflict 2 ("Product Renames") header — expanded | (collapse; stays on page) |
| Conflict 2 — `Create` toggle button | (selects action — visual) |
| Conflict 2 — `Overwrite` toggle button | (selects action — visual) |
| Conflict 2 — `Skip` toggle button (currently pressed) | (selects action — visual) |
| Conflict 3 ("Internal Reorg") header — undecided | (expand; stays on page) |
| Conflict 3 — `Create` toggle button | (selects action — visual) |
| Conflict 3 — `Overwrite` toggle button | (selects action — visual) |
| Conflict 3 — `Skip` toggle button | (selects action — visual) |
| Footer `Cancel` button | `full-page.html` |
| Footer `Confirm import` button (disabled — 1 conflict undecided) | (no nav until all decided) |

---

## `full-page-import-summary.html` — Per-item success / fail

| Element | Post-state |
|---|---|
| Failed-row "Show technical details" disclosure | (toggles inline `<pre>` block; stays on page) |
| Footer `Done` button | `full-page.html` |
| Footer `Retry failed items only` button | `full-page-import-preview.html` |

---

## `full-page-error.html` — Friendly error banner

| Element | Post-state |
|---|---|
| Topbar `Import` button | (visual; stays on page) |
| Topbar `Export` button | (visual; stays on page) |
| Error banner — "Hide technical details" disclosure (open by default) | (toggles inline `<pre>`; stays on page) |
| Error banner — `Retry` button | `full-page.html` |
| Error banner — `Dismiss` button | `full-page.html` |
| Picker — Collection select | (select; no nav) |
| Picker — Site select | (select; no nav) |
| Atlas row 1 ("Marketing Campaigns 2026") header | (visual expand; stays on page) |
| Atlas row 2 ("Product Renames") header | (visual expand; stays on page) |
