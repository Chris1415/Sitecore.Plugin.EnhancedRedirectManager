# Click targets — V2 Coverage Atlas (PRD-001 multilingual CRUD)

Every clickable element on every frame of `pocs/poc-v2-prd001/`. Each row is one named target → one post-state file. Generic labels like "drilldown" / "details modal" are forbidden.

The clickdummy interactions are faithful **per frame**, not wired with a JS state machine. Where a single click would in production switch state on the same screen (e.g. expand an import row), the POC links to a dedicated *post-state* file.

---

## index.html (Full Page home — picker = en)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Breadcrumb `SneakerCo` | navigate back to landing | `index.html` |
| Breadcrumb `MainSite` | navigate to home | `index.html` |
| `.fp-topbar__picker__sel` topbar picker select | switches to `de` (onchange) | `full-page-de.html` |
| `.fp-topbar__actions` `Import` button | open Import preview | `import-wizard-preview.html` |
| `.fp-topbar__actions` `Export` button | (informational; no-op in POC) | (none) |
| `.fp-topbar__actions` `New map` button | (informational; no-op in POC) | (none) |
| Rail `Collection` `<select>` | (informational) | (none) |
| Rail `Site` `<select>` | (informational) | (none) |
| Map row `.row[data-map-id="marketing-campaigns"]` body | open map detail | `map-detail.html` |
| Map row `.row[data-map-id="legacy-product-urls"]` body | open map detail | `map-detail.html` (re-uses) |
| Map row `.row[data-map-id="ab-test-variants"]` body | open map detail | `map-detail.html` |
| Map row `.row[data-map-id="geoip-fallbacks"]` body | (informational) | (none — POC scope) |
| Map row `.row[data-map-id="404-rescue-chain"]` body | (informational) | (none) |
| Map row `.row[data-map-id="influencer-partner-links"]` body | (informational) | (none) |
| Map row `.row[data-map-id="holiday-2025"]` body | (informational) | (none) |
| Map row `.row[data-map-id="affiliate-trackers"]` body | (informational) | (none) |
| Per-row coverage chip `.cov-chip` inside `.fp-rail-row__strip` | NO click action — chip is informational only (pointer cursor not applied) | (none) |
| Detail header `Edit en display name` button | open inline editor (anchor) | `map-detail.html#edit-display` |
| Mini-switcher chip `en` (`role=radio aria-checked=true`) | no-op (current) | (none) |
| Mini-switcher chip `de` (filled) | switch to de detail | `map-detail.html` |
| Mini-switcher chip `fr` (empty) | switch to fr detail | `map-detail.html` |
| Mini-switcher chip `es` (missing) | open create stepper (pre-seeded with es) | `create-version-stepper-step1.html` |
| Mapping row `Edit` (`<input>`) | (informational; placeholder values) | (none) |
| Mapping row `Delete` icon button | (informational; would remove row) | (none) |
| `Add mapping` button | (informational; would add empty row) | (none) |
| Shared flag checkboxes | (informational toggles) | (none) |
| Bottom-bar `Delete map` button | open delete card-pattern modal | `delete-modal-card-multi.html` |
| Bottom-bar `Cancel` button | (informational) | (none) |
| Bottom-bar `Save changes` button | (informational; would commit and toast) | (none) |
| Footer link `Dashboard` | open Dashboard widget | `dashboard-widget.html` |
| Footer link `Context Panel` | open Context Panel | `context-panel-en.html` |
| Footer link `Import preview` | open Import wizard | `import-wizard-preview.html` |
| Footer link `Partial-version banner` | open recovery banner state | `partial-version-banner.html` |
| Footer link `click-targets.md` | open this file | `click-targets.md` |

## full-page-de.html (Full Page — picker = de)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Topbar picker `<select>` change to `en` | switch back to en view | `index.html` |
| Map row `marketing-campaigns` body | open map detail (de selected) | `map-detail.html` |
| Map row `legacy-product-urls` body | open empty-version detail | `map-detail-empty-version.html` |
| Map row `ab-test-variants` body | open no-version detail | `map-detail-no-version.html` |
| Per-row coverage chip (any) | NO click action (informational) | (none) |
| Detail header `Edit de display name` button | go to inline-editor state | `map-detail.html` |
| Mini-switcher chip `en` (filled, not selected) | switch to en detail | `index.html` |
| Mini-switcher chip `de` (filled, selected) | no-op | (none) |
| Mini-switcher chip `fr` (empty) | switch to fr detail | `map-detail.html` |
| Mini-switcher chip `es` (missing) | open create stepper | `create-version-stepper-step1.html` |
| Mapping inputs | (informational) | (none) |
| Bottom `Delete map` | open delete card modal | `delete-modal-card-multi.html` |
| Bottom `Cancel` / `Save changes` | (informational) | (none) |
| Footer link `Back to en view` | return to home (en) | `index.html` |
| Footer link `Dashboard` | open Dashboard | `dashboard-widget.html` |

## map-detail.html (existing version — de)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Breadcrumb `SneakerCo` / `MainSite` | back to list (de) | `full-page-de.html` |
| Topbar picker `<select>` | (informational toggle) | (none) |
| Topbar `Import` button | open Import preview | `import-wizard-preview.html` |
| Topbar `Export` button | (informational) | (none) |
| Rail row `marketing-campaigns` (current) | re-open same detail | `map-detail.html` |
| Rail row `legacy-product-urls` | open empty-version detail | `map-detail-empty-version.html` |
| Rail row `ab-test-variants` | open no-version detail | `map-detail-no-version.html` |
| Detail header `Edit de display name` button | inline editor shown below (active) | (anchor on same page) |
| Inline editor `Save` button | (informational; would toast + close) | (none) |
| Inline editor `Cancel` button | (informational) | (none) |
| Mini-switcher chip `en` (filled) | switch to en detail | `map-detail.html` |
| Mini-switcher chip `de` (filled, current) | no-op | (none) |
| Mini-switcher chip `fr` (empty) | switch to fr empty-version detail | `map-detail-empty-version.html` |
| Mini-switcher chip `es` (missing) | open create stepper | `create-version-stepper-step1.html` |
| Mapping row inputs | (informational) | (none) |
| Mapping row delete icon | (informational) | (none) |
| `Add mapping` button | (informational) | (none) |
| Shared flag checkboxes / type select | (informational) | (none) |
| Bottom `Delete map` | open delete card modal | `delete-modal-card-multi.html` |
| Bottom `Cancel` / `Save changes` | (informational) | (none) |
| Footer link `Back to map list (de)` | return to list | `full-page-de.html` |
| Footer link `Full Page (en)` | switch to en home | `index.html` |

## map-detail-no-version.html (no version — current language = de, missing)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Breadcrumb back-links | return to list | `full-page-de.html` |
| Topbar picker | (informational) | (none) |
| Topbar `Import` | open Import preview | `import-wizard-preview.html` |
| Topbar `Export` | (informational) | (none) |
| Rail row `marketing-campaigns` | open existing-version detail | `map-detail.html` |
| Rail row `ab-test-variants` (current) | re-open same | `map-detail-no-version.html` |
| Detail header `Add de display name` button | (informational) | (none) |
| Mini-switcher chip `en` (filled) | switch to en detail | `map-detail.html` |
| Mini-switcher chip `de` (missing, current) | no-op | (none) |
| Mini-switcher chip `fr` (missing) | open create stepper (pre-seeded fr) | `create-version-stepper-step1.html` |
| Mini-switcher chip `es` (missing) | open create stepper (pre-seeded es) | `create-version-stepper-step1.html` |
| Center `Create de version` primary button | open create stepper | `create-version-stepper-step1.html` |
| Footer link `Back to map list (de)` | return | `full-page-de.html` |

## map-detail-empty-version.html (empty version — de version exists, UrlMapping empty)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Breadcrumb back-links | return | `full-page-de.html` |
| Topbar picker | (informational) | (none) |
| Topbar `Import` | open Import preview | `import-wizard-preview.html` |
| Rail row `marketing-campaigns` | open existing-version detail | `map-detail.html` |
| Rail row `legacy-product-urls` (current) | re-open same | `map-detail-empty-version.html` |
| Detail header `Add de display name` | (informational) | (none) |
| Mini-switcher chip `en` (filled) | switch to en detail | `map-detail.html` |
| Mini-switcher chip `de` (empty, current) | no-op | (none) |
| Mini-switcher chip `fr` (missing) | open create stepper | `create-version-stepper-step1.html` |
| Mini-switcher chip `es` (missing) | open create stepper | `create-version-stepper-step1.html` |
| Empty-state `Add first mapping` | (informational; would add row) | (none) |
| Empty-state `Copy from another language` | jump to stepper Source step | `create-version-stepper-step3-copy.html` |
| Bottom `Delete map` | open delete card-single | `delete-modal-card-single.html` |
| Bottom `Cancel` / `Save changes (disabled)` | (informational) | (none) |
| Footer link `Back to map list (de)` | return | `full-page-de.html` |

## create-version-stepper-step1.html (Step 1 — Path)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Modal close (`×`) | close modal | `map-detail.html` |
| `Empty version` radio + card | (informational selection) | (none) |
| `Copy from another language` radio + card | (informational selection — preselected) | (none) |
| `Cancel` button | close modal | `map-detail.html` |
| `Next` button | proceed to next step (copy-from path → Source step) | `create-version-stepper-step3-copy.html` |
| Footer link `View "Empty" path → Step 2/2 Confirm` | jump to alternate path | `create-version-stepper-step2-empty.html` |
| Footer link `View "Copy from" path → Step 3/3` | jump to source-pick step | `create-version-stepper-step3-copy.html` |
| Footer link `Back to map detail` | close modal | `map-detail.html` |

## create-version-stepper-step2-empty.html (Step 2 of 2 — Confirm, Empty path)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Modal close (`×`) | close modal | `map-detail.html` |
| `Back` button | step back to Path | `create-version-stepper-step1.html` |
| `Cancel` button | close modal | `map-detail.html` |
| `Create empty version` primary button | execute and open new version detail | `map-detail-empty-version.html` |
| Footer link `Step 1 (Path)` | step back | `create-version-stepper-step1.html` |
| Footer link `View Step 3 (Copy-from path)` | sibling step | `create-version-stepper-step3-copy.html` |

## create-version-stepper-step3-copy.html (Step 2 of 3 — Source, Copy-from path)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Modal close (`×`) | close modal | `map-detail.html` |
| Source combobox input | (informational filter) | (none) |
| Source option `en — English` (active) | (informational selection) | (none) |
| Source option `de — Deutsch` | (informational selection) | (none) |
| Source option `fr — Français` (disabled, empty) | NO click action — disabled | (none) |
| `Back` button | step back | `create-version-stepper-step1.html` |
| `Cancel` button | close modal | `map-detail.html` |
| `Next` button | proceed (illustrative — jumps to result detail; production would go to Confirm step) | `map-detail.html` |
| Footer link `Step 1 (Path)` | step back | `create-version-stepper-step1.html` |
| Footer link `View Step 2/2 (Empty path)` | sibling step | `create-version-stepper-step2-empty.html` |
| Footer link `View partial-failure recovery state` | recovery banner state | `partial-version-banner.html` |

## delete-modal-card-multi.html (multi-version normal case)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Modal close (`×`) | close modal | `map-detail.html` |
| Card A `Delete de version only` (radio + label) | (informational selection) | (none) |
| Card B `Delete entire map` (radio + label) | (informational selection) | (none) |
| Per-card coverage chips inside Card A and Card B | NO click action — informational preview | (none) |
| `Cancel` button | close modal | `map-detail.html` |
| `Delete` button (disabled until a card selected) | (informational; would execute + toast) | (none) |
| Footer link `Back to map detail (cancel)` | close modal | `map-detail.html` |
| Footer link `View single-version-edge case` | sibling variant | `delete-modal-card-single.html` |

## delete-modal-card-single.html (single-version edge case AC-8.6)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Modal close (`×`) | close modal | `map-detail.html` |
| Card A `Delete en version only` (radio + label) | (informational selection) | (none) |
| Card B `Delete entire map` (radio + label) | (informational selection) | (none) |
| Per-card coverage chips | NO click action — informational | (none) |
| `Cancel` button | close modal | `map-detail.html` |
| `Delete` button (disabled until selection) | (informational) | (none) |
| Footer link `View multi-version normal case` | sibling | `delete-modal-card-multi.html` |

## import-wizard-preview.html (all rows collapsed)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Topbar `Cancel` | return | `index.html` |
| Bulk-action select | (informational) | (none) |
| `Expand all` button | (illustrative; sibling has one expanded) | (none) |
| `Collapse all` button | (already collapsed; no-op) | (none) |
| Row `marketing-campaigns` head (chevron region) | expand row | `import-wizard-preview-expanded.html` |
| Row `legacy-product-urls` head | expand row (illustrative) | `import-wizard-preview-expanded.html#legacy` |
| Row `ab-test-variants` head | expand row (illustrative) | `import-wizard-preview-expanded.html#ab` |
| Per-row tenant / bundle chips | NO click action — informational | (none) |
| Per-row action radio (Create / Overwrite / Skip) | (informational selection; row click default-suppressed) | (none) |
| Bottom `Cancel` button | return | `index.html` |
| Bottom `Apply changes` primary | (informational; would open confirm sub-modal in production) | (none) |
| Footer link `Back to Full Page` | return | `index.html` |
| Footer link `View row expanded` | jump to expanded state | `import-wizard-preview-expanded.html` |

## import-wizard-preview-expanded.html (one row expanded)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Topbar `Cancel` | return | `index.html` |
| Bulk-action select | (informational) | (none) |
| `Collapse all` link | collapse expanded row | `import-wizard-preview.html` |
| Expanded row `marketing-campaigns` chevron | collapse row | `import-wizard-preview.html` |
| Per-language diff table rows | NO click action — informational | (none) |
| Per-row tenant / bundle chips | NO click action | (none) |
| Per-row action radio | (informational selection; row click suppressed) | (none) |
| Other rows `legacy-product-urls` head | (illustrative expand) | `import-wizard-preview.html#legacy` |
| Other rows `ab-test-variants` head | (illustrative expand) | `import-wizard-preview.html#ab` |
| Bottom `Cancel` button | return | `index.html` |
| Bottom `Apply changes` | (informational) | (none) |
| Footer link `Collapse all rows` | return to collapsed state | `import-wizard-preview.html` |

## dashboard-widget.html (twin tiles + Languages-with-content)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Twin tiles (`Maps in de`, `Maps total`, `Mappings in de`, `Mappings total`) | NO click action — informational stats | (none) |
| Languages-with-content chip `en` | filter Full Page to en | `index.html` |
| Languages-with-content chip `de` | filter Full Page to de | `full-page-de.html` |
| Languages-with-content chip `fr` | filter Full Page to fr (illustrative; jumps to de view) | `full-page-de.html` |
| Languages-with-content chip `es` | filter Full Page to es (illustrative) | `full-page-de.html` |
| Footer link `Full Page (en)` | open Full Page | `index.html` |
| Footer link `Full Page (de)` | open Full Page (de) | `full-page-de.html` |
| Footer link `Context Panel` | open Context Panel | `context-panel-en.html` |

## context-panel-en.html (en page)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Banner (info card) | non-dismissible status; no action | (none) |
| Matching redirect rows | NO click action in POC (production would open Full Page on that map) | (none) |
| `Open in Full Page` ghost button | open Full Page | `index.html` |
| Footer link `View de-page variant` | switch panel variant | `context-panel-de.html` |
| Footer link `Full Page` | return | `index.html` |

## context-panel-de.html (de page)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Banner (info card, non-en variant) | non-dismissible; no action | (none) |
| Matching redirect rows | NO click action in POC | (none) |
| `Open in Full Page (de)` ghost button | open Full Page (de) | `full-page-de.html` |
| Footer link `en-page variant` | switch | `context-panel-en.html` |
| Footer link `Full Page (de)` | open | `full-page-de.html` |

## partial-version-banner.html (recovery state — ADR-0021)

| Element | Click → | Post-state file/anchor |
|---|---|---|
| Breadcrumb back-links | return | `full-page-de.html` |
| Topbar `Import` | open Import preview | `import-wizard-preview.html` |
| Rail row `marketing-campaigns` (current) | re-open same | `map-detail.html` |
| Per-row chips | NO click action | (none) |
| Recovery CTA `Clean up — delete empty es version` | open delete card modal | `delete-modal-card-multi.html` |
| Recovery CTA `Retry copy from en` | jump to stepper Source step | `create-version-stepper-step3-copy.html` |
| Mini-switcher chips | switch to respective detail (filled → existing, empty → empty, etc.) | `map-detail.html` / `map-detail-empty-version.html` / `partial-version-banner.html` |
| Footer link `Back to detail (de)` | return | `map-detail.html` |
| Footer link `Full Page (de)` | return | `full-page-de.html` |
| Footer link `Stepper Copy-from` | open stepper directly | `create-version-stepper-step3-copy.html` |

---

## Notes on click semantics

- **Coverage chips in the LIST and IMPORT PREVIEW are informational.** They convey state via color + border + glyph + aria-label and are not interactive (cursor: default). This is OQ-V2-2 — V2 keeps row-click-selection clarity rather than competing with chip-click semantics.
- **Coverage chips in the MINI-SWITCHER and the DASHBOARD `Languages-with-content` tile are interactive.** They have `cursor: pointer`, are wrapped in `<a>` elements, and (in production) act as a `radiogroup` / cross-surface filter respectively.
- **Coverage chips in the DELETE CARDS are informational** — they preview the post-deletion state. The whole card is the clickable affordance (`<label>` wraps the radio).
- **All informational text is real placeholder content** — no lorem ipsum.
- **No JS state machine.** Each post-state is a separate file. Theme cycling is the only interactive script (carried from v1 `theme-toggle.js`).
