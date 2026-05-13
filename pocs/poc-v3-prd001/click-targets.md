# Click targets — V3 Workspace Frame (PRD-001)

Each distinct click target has its own HTML post-state file. Generic labels avoided — each row is concrete.

## index.html — Full Page · en active

| Element | Click → | Post-state file |
|---|---|---|
| sidebar `.lang-nav-item[data-lang="de"]` | switches to `de`, sidebar `de` becomes `aria-current="page"`, matrix highlights `de` column | full-page-de.html |
| sidebar `.lang-nav-item[data-lang="fr"]` | switches to `fr` (shares full-page-de.html demo) | full-page-de.html |
| sidebar `.lang-nav-item[data-lang="it"]` | switches to `it` | full-page-de.html |
| sidebar `.lang-nav-item[data-lang="ja"]` | switches to `ja` | full-page-de.html |
| sidebar `.lang-sidebar__ft button[disabled]` | tooltip shows "Add a new site language via Sitecore Authoring." | n/a (disabled) |
| topbar `[Import]` button | opens import wizard preview | import-wizard-preview.html |
| topbar `[New map]` button | opens map detail in create mode | map-detail.html |
| any `.map-row` (whole row click) | opens map detail with current language tab pre-selected | map-detail.html |
| `.coverage__cell[data-state="missing"]` | opens map detail with missing-version tab active + drawer-ready | map-detail-no-version-tab.html |
| `.coverage__cell[data-state="empty"]` | opens map detail with empty-version tab active | map-detail-de.html |
| `.coverage__cell[data-state="filled"][data-lang="de"]` | opens map detail with `de` tab active | map-detail-de.html |
| breadcrumb `SneakerCo` | (no-op in this POC) | n/a |

## full-page-de.html — Full Page · de active

| Element | Click → | Post-state file |
|---|---|---|
| sidebar `.lang-nav-item[data-lang="en"]` | switches back to en | index.html |
| sidebar `.lang-nav-item[data-lang="de"]` (already active) | no-op | (same) |
| partial-banner `[Retry copy]` | reopens drawer pre-populated with copy-from `de` (recovery path) | create-version-drawer-copyfrom.html |
| topbar `[Import]` | opens import wizard | import-wizard-preview.html |
| any `.map-row` | opens map detail in `de` | map-detail-de.html |
| `.coverage__cell[data-state="missing"][data-lang="de"]` | opens detail with `de (create)` tab active | map-detail-de.html |

## map-detail.html — Map detail · en tab active

| Element | Click → | Post-state file |
|---|---|---|
| `.detail__title` (Marketing campaigns) | enters edit mode for `en` __Display name (visual cue only in POC) | n/a |
| topbar `[Delete]` button | opens consequence-preview dialog with both radios unselected | delete-consequence-preview.html |
| topbar `[Save changes]` | (no-op POC — visual cue toast in top-right) | n/a |
| tab `de*` (`#tab-de`) | switches to `de` tab; dirty asterisk indicates unsaved changes blocked | map-detail-de.html |
| tab `fr (create)` (`#tab-fr`) | switches to `fr` missing tab — opens detail in empty-version state | map-detail-no-version-tab.html |
| tab `it (create)` (`#tab-it`) | switches to `it` missing tab | map-detail-no-version-tab.html |
| tab `ja` (`#tab-ja`) | (no-op POC — same panel skeleton) | n/a |
| sidebar `.lang-nav-item[data-lang="de"]` | switches working language to `de`; opens `de` map detail | map-detail-de.html |
| back-button `◀` (icon button before title) | returns to list | index.html |

## map-detail-de.html — Map detail · de tab active

| Element | Click → | Post-state file |
|---|---|---|
| `.detail__title` (Marketing-Kampagnen) | edit-mode for `de` __Display name | n/a |
| topbar `[Delete]` | consequence-preview dialog | delete-consequence-preview.html |
| tab `en` | switches back to `en` | map-detail.html |
| tab `fr (create)` | opens missing-version state | map-detail-no-version-tab.html |
| tab `it (create)` | opens missing-version state for `it` | map-detail-no-version-tab.html |
| sidebar `.lang-nav-item[data-lang="en"]` | switch working language to `en` | map-detail.html |
| back-button `◀` | returns to list | full-page-de.html |

## map-detail-no-version-tab.html — Map detail · fr missing

| Element | Click → | Post-state file |
|---|---|---|
| `.detail__title--placeholder` (italic placeholder) | edit-mode for `fr` __Display name | n/a (drawer takes precedence) |
| empty-state `[Create fr version]` | opens create-version drawer | create-version-drawer.html |
| empty-state `[View English version instead]` | switches to `en` tab | map-detail.html |
| tab `fr (create)` (active) | reopens drawer | create-version-drawer.html |
| tab `it (create)` | switches to `it` missing | (same file, demo) |
| tab `en` | switches to `en` | map-detail.html |
| tab `de` | switches to `de` | map-detail-de.html |
| sidebar `.lang-nav-item[data-lang="en"]` | switch working language | map-detail.html |

## create-version-drawer.html — Drawer default

| Element | Click → | Post-state file |
|---|---|---|
| drawer `[Empty start]` radio CTA | (visual only — clicking would enable Create with empty mode) | n/a |
| drawer `[Copy from another language]` CTA (link) | reveals inline source picker | create-version-drawer-copyfrom.html |
| drawer `[✕ close]` icon | closes drawer, returns to detail | map-detail-no-version-tab.html |
| drawer `[Cancel]` | closes drawer | map-detail-no-version-tab.html |
| drawer `[Create]` button | disabled (strict no-default) | n/a |
| scrim (outside drawer) | closes drawer (a11y trap intentionally not wired) | map-detail-no-version-tab.html |

## create-version-drawer-copyfrom.html — Drawer · copy mode

| Element | Click → | Post-state file |
|---|---|---|
| drawer `[Empty start]` CTA (link) | switches back to default mode | create-version-drawer.html |
| drawer `[Copy from another language]` (checked) | already selected — no-op | n/a |
| drawer source `<select>` | picks source language (visual: de selected) | n/a |
| drawer `[Create from de]` | creates `fr` version from `de`; returns to detail with `fr` populated | map-detail.html |
| drawer `[Cancel]` / `[✕]` | closes drawer | map-detail-no-version-tab.html |

## delete-consequence-preview.html — Delete dialog · radios unselected

| Element | Click → | Post-state file |
|---|---|---|
| radio `Delete current language version only` (link) | populates consequence panel with version-only data | delete-consequence-preview-version-only.html |
| radio `Delete entire map and all language versions` (link) | populates consequence panel with entire-map data | delete-consequence-preview-entire-item.html |
| `[Delete]` button | disabled until radio chosen | n/a |
| `[Cancel]` | closes dialog | map-detail-de.html |

## delete-consequence-preview-version-only.html — Version-only chosen

| Element | Click → | Post-state file |
|---|---|---|
| radio `Delete entire map` (link) | switches to entire-map mode | delete-consequence-preview-entire-item.html |
| radio `Delete version only` (checked) | no-op | n/a |
| `[Delete this version]` (link) | commits delete; returns to list `de` view | full-page-de.html |
| `[Cancel]` | closes dialog | map-detail-de.html |

## delete-consequence-preview-entire-item.html — Entire-map chosen

| Element | Click → | Post-state file |
|---|---|---|
| radio `Delete version only` (link) | switches mode | delete-consequence-preview-version-only.html |
| radio `Delete entire map` (checked) | no-op | n/a |
| `[Delete entire map]` (link) | commits delete; returns to list | full-page-de.html |
| `[Cancel]` | closes dialog | map-detail-de.html |

## delete-consequence-preview-single-lang.html — Single-lang edge

| Element | Click → | Post-state file |
|---|---|---|
| radio `Delete current language version only` (link) | populates consequence panel (version-only) | delete-consequence-preview-version-only.html |
| radio `Delete entire map` (link) | populates consequence panel (entire) | delete-consequence-preview-entire-item.html |
| `[Delete]` | disabled until radio chosen | n/a |
| `[Cancel]` | closes | map-detail.html |

## import-wizard-preview.html — All groups expanded

| Element | Click → | Post-state file |
|---|---|---|
| `.import-group__trigger` (English) | collapses `en` group; keeps summary visible | import-wizard-preview-collapsed.html |
| `.import-group__trigger` (Deutsch) | collapses `de` group (analog) | (analog state — not separately captured) |
| `.import-group__trigger` (Français) | collapses `fr` group | import-wizard-preview-collapsed.html |
| `[Collapse all but Deutsch]` button | collapses `en` + `fr` groups | import-wizard-preview-collapsed.html |
| any row `<select>` action picker | changes per-map action (create / overwrite / skip) | n/a |
| `[Apply 27 changes]` | commits import; returns to list | full-page-de.html |
| `[Back]` / `[Cancel]` | returns to list without applying | index.html |

## import-wizard-preview-collapsed.html — en + fr collapsed

| Element | Click → | Post-state file |
|---|---|---|
| `.import-group__trigger` (English collapsed) | expands `en` group | import-wizard-preview.html |
| `.import-group__trigger` (Français collapsed) | expands `fr` group | import-wizard-preview.html |
| `.import-group__trigger` (Deutsch) | collapses `de` (analog) | n/a |
| `[Expand all]` button | expands all groups | import-wizard-preview.html |
| `[Apply 27 changes]` | applies | full-page-de.html |

## dashboard-widget.html — Current lang scope

| Element | Click → | Post-state file |
|---|---|---|
| Maps tile toggle `[All langs]` (link) | flips toggle on Maps tile | dashboard-widget-all-langs.html |
| Maps tile toggle `[Current (de)]` (active) | no-op | n/a |
| Mappings tile toggle `[All langs]` | flips toggle on Mappings tile | dashboard-widget-all-langs.html |
| any tile (whole click) | (no-op — Dashboard is read-only) | n/a |

## dashboard-widget-all-langs.html — All-langs scope

| Element | Click → | Post-state file |
|---|---|---|
| Maps tile toggle `[Current (de)]` (link) | flips back to current-lang | dashboard-widget.html |
| Mappings tile toggle `[Current (de)]` (link) | flips back | dashboard-widget.html |

## context-panel-en.html — Pages panel · en URL

| Element | Click → | Post-state file |
|---|---|---|
| (read-only banner) | non-dismissible | n/a |
| matched redirect rows | (no-op POC — would route to authoring) | n/a |
| footer link `[View on /de page]` | switches to de demo | context-panel-de.html |

## context-panel-de.html — Pages panel · de URL

| Element | Click → | Post-state file |
|---|---|---|
| (read-only banner) | non-dismissible; names `de` page | n/a |
| empty state | informational | n/a |
| footer link `[View on /en page]` | switches | context-panel-en.html |

## partial-version-banner.html — Partial-version recovery

| Element | Click → | Post-state file |
|---|---|---|
| banner `[Retry copy from de]` | reopens drawer pre-populated with copy-from `de` | create-version-drawer-copyfrom.html |
| banner `[Keep empty version]` | dismisses banner (visual only) | n/a |
| banner `[Rollback (delete fr)]` | opens consequence-preview dialog scoped to `fr` version | delete-consequence-preview-version-only.html |
| tab `fr` (active, with `!` warning glyph) | already selected — shows partial state | n/a |
| topbar `[Delete]` | opens version-only delete dialog | delete-consequence-preview-version-only.html |
| empty-state `[Add mapping manually]` | begins manual authoring (visual cue only) | n/a |
