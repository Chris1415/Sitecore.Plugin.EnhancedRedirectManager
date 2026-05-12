# Click targets — POC v2 "Editor's Studio"

Every clickable element on every screen, the source-of-truth file it lives in, and the post-state file it leads to. Anything not listed is not interactive in this clickdummy (decorative SVGs, captions, kicker labels, dimmed parent panels behind modals, etc.).

Real-link targets only — no generic post-state labels. If a flow loops back ("Cancel"), the target file shows the prior visual state.

---

## index.html

| Click target | Element | Leads to |
|---|---|---|
| Context Panel — Default | `a.index-card` | `context-panel.html` |
| Context Panel — Empty | `a.index-card` | `context-panel-empty.html` |
| Context Panel — Add modal | `a.index-card` | `context-panel-add-modal.html` |
| Context Panel — Add picked existing | `a.index-card` | `context-panel-add-existing.html` |
| Context Panel — Create new map | `a.index-card` | `context-panel-create-new-map.html` |
| Context Panel — Edit row inline | `a.index-card` | `context-panel-edit-row.html` |
| Dashboard — Default | `a.index-card` | `dashboard-widget.html` |
| Dashboard — Empty | `a.index-card` | `dashboard-widget-empty.html` |
| Full Page — Default | `a.index-card` | `full-page.html` |
| Full Page — Empty no selection | `a.index-card` | `full-page-empty-no-selection.html` |
| Full Page — Site no redirects | `a.index-card` | `full-page-no-redirects.html` |
| Full Page — Create map drawer | `a.index-card` | `full-page-create-redirect-map.html` |
| Full Page — Edit map drawer | `a.index-card` | `full-page-edit-redirect-map.html` |
| Full Page — Import preview | `a.index-card` | `full-page-import-preview.html` |
| Full Page — Import summary | `a.index-card` | `full-page-import-summary.html` |
| Full Page — Error banner | `a.index-card` | `full-page-error.html` |
| click-targets.md | `a.index-card` | `click-targets.md` (this file) |

---

## context-panel.html  (default — 2 expanded map cards, light + dark)

| Click target | Element | Leads to |
|---|---|---|
| All screens (top breadcrumb) | `a` in nav | `index.html` |
| "+ Add redirect for this page" row | `a.btn-ghost` (full-width) | `context-panel-add-modal.html` |
| Mapping row 1 — `<Pencil>` (edit) | `a.btn-ghost.btn-icon` inside `.actions` | `context-panel-edit-row.html` |
| Mapping row 1 — `<Trash2>` (delete) | `button.btn-ghost.btn-icon` inside `.actions` | (static — would open inline popover; no post-state file) |
| Map card header 1 (Spring Launch Map) | `div.map-card-header` (focusable, role="button") | (already expanded — no-op in POC) |
| Map card header 2 (Legacy Path Cleanup) | `div.map-card-header` (focusable, role="button") | (already expanded — no-op in POC) |

Per spec § 3a: in the Context Panel, cards are **always expanded** — header click does not collapse. Hover/focus on a row reveals action icons; only the first row in the first card has them rendered statically here so the operator can see the visual treatment.

---

## context-panel-empty.html

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Empty-state CTA "Add redirect for this page" | `a.btn-primary` | `context-panel-add-modal.html` |

---

## context-panel-add-modal.html

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Search input | `input.input` | (no-op — type-ahead filter visualisation) |
| "+ Create new Redirect Map" featured row | `a` (highlighted accent row) | `context-panel-create-new-map.html` |
| Existing map row "Spring Launch Map" | `a` | `context-panel-add-existing.html` |
| Existing map row "Legacy Path Cleanup" | `a` | `context-panel-add-existing.html` |
| Existing map row "Marketing Campaigns 2025" | `a` | `context-panel-add-existing.html` |
| Existing map row "Product Launch Migrations" | `a` | `context-panel-add-existing.html` |
| Modal footer Cancel | `a.btn-outline` | `context-panel.html` |

---

## context-panel-add-existing.html  (inline form, source pre-filled)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Back arrow (modal header) | `a.btn-ghost.btn-icon` | `context-panel-add-modal.html` |
| Source URL input | `input` (read-only) | (no-op — visual indication of pre-fill) |
| Target URL input | `input` (autofocus) | (no-op — visual focus state) |
| Cancel | `a.btn-outline` | `context-panel-add-modal.html` |
| Add mapping | `a.btn-primary` | `context-panel.html` |

---

## context-panel-create-new-map.html  (fuller form, type empty initially)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Back arrow | `a.btn-ghost.btn-icon` | `context-panel-add-modal.html` |
| Map name input | `input` (autofocus) | (no-op) |
| Redirect type select | `select.input` (initial value empty) | (no-op — visual placeholder state) |
| Behavior toggles (3 × `.switch`) | `span.switch` | (no-op — toggle visualisation; "Include virtual folder" rendered ON) |
| First-mapping source input | `input` (read-only, pre-filled) | (no-op) |
| First-mapping target input | `input` (placeholder) | (no-op) |
| Cancel | `a.btn-outline` | `context-panel-add-modal.html` |
| Create map (disabled) | `button.btn-primary` (`disabled`) | (disabled until type chosen + target filled) |

---

## context-panel-edit-row.html  (row swapped to inline form)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Source input (in edit row) | `input.input` | (no-op) |
| Target input (in edit row) | `input.input` | (no-op) |
| Cancel | `a.btn-outline.btn-sm` | `context-panel.html` |
| Save | `a.btn-primary.btn-sm` | `context-panel.html` |

---

## dashboard-widget.html  (populated tiles)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Tile 1 "12 Maps" | `a.tile` | `full-page.html` |
| Tile 2 "87 Mappings" | `a.tile` | `full-page.html` |
| Tile 3 "2h Last edit" | `a.tile` | `full-page.html` |

(Each tile carries `aria-label` describing both the value and the destination intent.)

---

## dashboard-widget-empty.html

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| "Open Redirects" CTA | `a.btn-outline.btn-sm` | `full-page-no-redirects.html` |

---

## full-page.html  (default — site selected, card 2 expanded)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Header "Import" button | `a.btn-outline` | `full-page-import-preview.html` |
| Header "Export" button | `button.btn-outline` | (no-op — would trigger file download) |
| Sidebar Collection "Marketing" (active) | `button.sidebar-item.active` | (already active — no-op) |
| Sidebar Collection "Sales" | `button.sidebar-item` | (no-op — would re-load sites) |
| Sidebar Site "Northwind Marketing" (active) | `button.sidebar-item.active` | (already active — no-op) |
| Sidebar Site "Northwind Investors" | `button.sidebar-item` | (no-op — would re-load cards) |
| Sidebar Site "Promo 2026" | `button.sidebar-item` | (no-op — see `full-page-no-redirects.html` for that state) |
| Sidebar "Search sites…" input | `input.input` | (no-op) |
| Header "+ New Redirect Map" | `a.btn-primary` | `full-page-create-redirect-map.html` |
| Card 1 header (Spring Launch Map — collapsed) | `button.map-card-header` (`aria-expanded="false"`) | (no-op — would expand inline) |
| Card 2 header (Legacy Path Cleanup — expanded) | `button.map-card-header` (`aria-expanded="true"`) | (no-op — would collapse inline) |
| Card 2 mapping row 1 — `<Pencil>` | `a.btn-ghost.btn-icon` | `full-page-edit-redirect-map.html` |
| Card 2 mapping row 1 — `<Trash2>` | `button.btn-ghost.btn-icon` | (no-op — would open inline popover) |
| Card 2 footer "+ Add mapping" | `a.btn-ghost.btn-sm` | `full-page-edit-redirect-map.html` |
| Card 2 footer "Edit" | `a.btn-outline.btn-sm` | `full-page-edit-redirect-map.html` |
| Card 2 footer "Delete" | `button.btn-outline.btn-sm` (destructive accent) | (no-op — would open `@blok/alert-dialog`) |
| Card 3 header (Marketing Campaigns 2025) | `button.map-card-header` | (no-op) |
| Card 4 header (Product Launch Migrations) | `button.map-card-header` | (no-op) |
| Card 5 header (Career Page Renames — empty draft) | `button.map-card-header` | (no-op) |

---

## full-page-empty-no-selection.html  (first load, sidebar collections only)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Header Import (disabled) | `button.btn-outline` (`disabled`) | (no-op — disabled until site picked) |
| Header Export (disabled) | `button.btn-outline` (`disabled`) | (no-op) |
| Sidebar Collection "Marketing" | `button.sidebar-item` | (no-op — would unfold sites; see `full-page.html` for next state) |
| Sidebar Collection "Sales" | `button.sidebar-item` | (no-op) |

---

## full-page-no-redirects.html  (site has zero maps)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Header Import | `a.btn-outline` | `full-page-import-preview.html` |
| Header Export (disabled) | `button.btn-outline` (`disabled`) | (no-op — nothing to export) |
| Sidebar Collection "Marketing" (active) | `button.sidebar-item.active` | (already active) |
| Sidebar Site "Promo 2026" (active) | `button.sidebar-item.active` | (already active) |
| Sidebar Site "Northwind Marketing" | `button.sidebar-item` | `full-page.html` |
| Sidebar Site "Northwind Investors" | `button.sidebar-item` | (no-op) |
| Empty-state primary "+ Create your first Redirect Map" | `a.btn-primary` | `full-page-create-redirect-map.html` |
| Empty-state secondary "Import JSON" | `a.btn-outline` | `full-page-import-preview.html` |

---

## full-page-create-redirect-map.html  (drawer, type empty)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Drawer close (X) | `a.btn-ghost.btn-icon` | `full-page.html` |
| Name input | `input.input` (autofocus) | (no-op) |
| Redirect type select (initial empty) | `select.input` | (no-op — visual placeholder state) |
| Behavior toggle "Preserve query string" | `span.switch` | (no-op) |
| Behavior toggle "Preserve language" | `span.switch` | (no-op) |
| Behavior toggle "Include virtual folder" | `span.switch` | (no-op) |
| "+ Add mapping" ghost button | `button.btn-ghost.btn-sm` | (no-op — would append a row inline) |
| Footer Cancel | `a.btn-outline` | `full-page.html` |
| Footer Save (disabled) | `button.btn-primary` (`disabled`) | (no-op — disabled until name + type filled) |

---

## full-page-edit-redirect-map.html  (drawer pre-filled, has invalid row)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Drawer close (X) | `a.btn-ghost.btn-icon` | `full-page.html` |
| Name input (pre-filled) | `input.input` | (no-op) |
| Redirect type select (302 selected) | `select.input` | (no-op) |
| 3 behavior toggles (2 ON, 1 OFF) | `span.switch` | (no-op) |
| Each row drag handle (4 rows) | `span` (focusable, `role="button"`) | (no-op — keyboard reorder spec only) |
| Each row source input (4 rows; row 3 invalid) | `input.input` (row 3 carries `.invalid`) | (no-op — row 3 shows inline error) |
| Each row target input (4 rows) | `input.input` | (no-op) |
| Each row delete `<Trash2>` (4 rows) | `button.btn-ghost.btn-icon` | (no-op — would remove the row) |
| "+ Add mapping" ghost button | `button.btn-ghost.btn-sm` | (no-op — appends a new empty row) |
| Footer Cancel | `a.btn-outline` | `full-page.html` |
| Footer Save (disabled) | `button.btn-primary` (`disabled`) | (no-op — disabled until invalid row fixed) |

---

## full-page-import-preview.html  (Step 2 of 3 — review)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Header X (cancel import) | `a.btn-ghost.btn-icon` | `full-page.html` |
| Sticky bulk "Apply to all conflicts" — Create | `button` in `.radio-group` | (no-op — would set all CONFLICT rows to Create) |
| Sticky bulk "Apply to all conflicts" — Overwrite | `button` in `.radio-group` | (no-op — sets all to Overwrite) |
| Sticky bulk "Apply to all conflicts" — Skip | `button` in `.radio-group` | (no-op — sets all to Skip) |
| Row 1 (NEW) — radio Create (selected) | `button.selected` | (already selected) |
| Row 1 (NEW) — radio Overwrite (disabled) | `button` (`disabled`) | (no-op — Overwrite n/a for NEW) |
| Row 1 (NEW) — radio Skip | `button` | (no-op — switches selection visually) |
| Row 2 (CONFLICT) — "Hide diff" toggle | `button` | (no-op — would collapse the diff block) |
| Row 2 (CONFLICT) — radio Create / Overwrite / Skip | `button` × 3 in `.radio-group` | (no-op — picks an action for this conflict) |
| Row 3 (NEW) — radio Create (selected) | `button.selected` | (already selected) |
| Row 3 (NEW) — radio Skip | `button` | (no-op) |
| Row 4 (CONFLICT) — "Show diff" toggle | `button` | (no-op — would expand a diff block like Row 2's) |
| Row 4 (CONFLICT) — radio Create / Overwrite / Skip | `button` × 3 | (no-op) |
| Row 5 (NEW) — radio Create (selected) | `button.selected` | (already selected) |
| Row 5 (NEW) — radio Skip | `button` | (no-op) |
| Footer Back | `a.btn-outline` | `full-page.html` |
| Footer "Confirm import (3 actions)" (disabled) | `button.btn-primary` (`disabled`) | (no-op — disabled until both CONFLICT rows have an action; once decided → `full-page-import-summary.html`) |

---

## full-page-import-summary.html  (Step 3 of 3 — per-item outcomes)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Failed-row "Show technical details" | `button` | (no-op — would expand a verbatim error block) |
| Footer "Retry failed (1)" | `button.btn-outline` | (no-op — would re-run the failed row only) |
| Footer "Done" | `a.btn-primary` | `full-page.html` |

---

## full-page-error.html  (friendly error banner, technical details expanded)

| Click target | Element | Leads to |
|---|---|---|
| All screens | `a` in nav | `index.html` |
| Header Import | `a.btn-outline` | `full-page-import-preview.html` |
| Header Export | `button.btn-outline` | (no-op) |
| Sidebar collection / sites | `button.sidebar-item` × 2 | (no-op) |
| Banner "Try again" | `button.btn-outline.btn-sm` | (no-op — would retry the failed write) |
| Banner "Hide technical details" | `button.btn-ghost.btn-sm` | (no-op — would collapse the details block) |
| Banner Copy icon (in details block) | `button.btn-ghost.btn-icon.btn-sm` | (no-op — would copy verbatim error to clipboard) |
| Card 1 header (Spring Launch Map — Save failed kicker) | `button.map-card-header` | (no-op) |
| Card 2 header (Legacy Path Cleanup) | `button.map-card-header` | (no-op) |

---

## Element-naming legend

- `a` = `<a href="…">`. Real navigation in this clickdummy.
- `button` (no `a`) = no-op visualisation; in the real app these would dispatch a Sitecore SDK call or an in-page state change.
- `(disabled)` = element rendered with `disabled` attribute and `aria-disabled="true"`; calls out the operator that the action is gated.
- `(no-op)` = clickable element that has no post-state file in the POC because the real interaction stays inside the same surface (drawer, expand/collapse, in-place form swap, popover). Each spec section calls out what would actually happen.

## Long-list relationship-visibility check (agent identity § 92)

Cards on Full Page contain their mappings inside the same `<article>` (collapsed body / expanded body inside the parent card). Mappings are never rendered as a parallel sibling list outside the card. At 30+ maps × 30+ mappings each, the parent-child link is structural, not hover-affinity-dependent. Verified — pattern safe at scale per ADR-0012 + spec § 1.
