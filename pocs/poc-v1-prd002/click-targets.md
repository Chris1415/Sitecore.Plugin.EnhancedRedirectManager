# Click targets — PRD-002 V4 Refined POC

Every clickable element on every screen, with the post-state file or anchor. In-place interactions (toast, inline state changes) are documented inline.

## index.html — POC navigation index

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| index.html | `.idx-card` "Full Page workspace" | opens Full Page surface | full-page.html |
| index.html | `.idx-card` "Context Panel · default (single match)" | opens single-match Context Panel | context-panel.html |
| index.html | `.idx-card` "Context Panel · multi-match" | opens multi-match Context Panel | context-panel-multi-match.html |
| index.html | `.idx-card` "Context Panel · no match (create new)" | opens no-match Context Panel | context-panel-no-match.html |
| index.html | `.idx-card` "Dashboard Widget" | opens Dashboard Widget surface | dashboard-widget.html |
| index.html | `.tone-toggle__btn[data-theme="light"\|"dark"\|"auto"]` | switches theme | (no nav; html.className flips) |

## full-page.html — Full Page workspace

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| full-page.html | breadcrumb "Redirect Manager" | back to overview | index.html |
| full-page.html | topbar "Import" button | (no-op in POC) production: opens ImportRedirectMapModal | (in-place; modal would mount) |
| full-page.html | topbar "Export" button | (no-op in POC) production: triggers JSON file download | (in-place; download fires) |
| full-page.html | topbar "New map" button | (no-op in POC) production: opens NewRedirectMapModal | (in-place; modal would mount) |
| full-page.html | hero CTA "View activity" (decorative per ADR-0030) | shows Sonner-style toast | (no nav; toast renders inline: *"Activity log coming in a follow-on release. For now, the Dashboard Widget shows the most recent change timestamp."*) |
| full-page.html | hero CTA "Publish all" (decorative per ADR-0030) | shows Sonner-style toast | (no nav; toast renders inline: *"Bulk publish coming in a follow-on release. For now, individual map changes save and publish immediately."*) |
| full-page.html | left-rail `.lr-row` (any of 8 map rows) | (in POC, all link to self) production: selects map + loads map detail | full-page.html (re-render with new selection) |
| full-page.html | map detail "Rename" button | (no-op in POC) production: inline-edit name + Save | (in-place; field becomes editable) |
| full-page.html | map detail "Edit settings" button | (no-op in POC) production: opens EditMapSettingsModal | (in-place; modal would mount) |
| full-page.html | detail tools "Add mapping" button | (no-op in POC) production: appends empty row to mappings table | (in-place; row inserts) |
| full-page.html | detail tools search input | (no-op in POC) production: filters mappings table | (in-place; rows filter) |
| full-page.html | mappings table row "Edit" icon button | (no-op in POC) production: inline-edit source/target | (in-place; row becomes editable) |
| full-page.html | mappings table row "Delete" icon button | (no-op in POC) production: opens delete confirm | (in-place; small confirm popover) |
| full-page.html | bottom nav "← Back to overview" | back to POC index | index.html |
| full-page.html | bottom nav "Context Panel" | navigates to single-match panel | context-panel.html |
| full-page.html | bottom nav "Dashboard Widget" | navigates to widget surface | dashboard-widget.html |
| full-page.html | `.tone-toggle__btn` (3x) | switches theme | (no nav) |

## context-panel.html — Single-match (common case)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| context-panel.html | inline form `Add` button | submits; shows success toast | (no nav; toast: *"Redirect added to Black Friday 2025."* — in production, form clears + matcher refetches + new row appears) |
| context-panel.html | inline form source input | editable | (in-place; text edits) |
| context-panel.html | inline form RedirectType select | disabled (read-only display per ADR-0029) | (no interaction; aria-disabled) |
| context-panel.html | existing redirect row "Edit" icon button | (no-op in POC) production: opens InlineEditForm | (in-place; row becomes editable) |
| context-panel.html | existing redirect row "Delete" icon button | (no-op in POC) production: opens delete confirm | (in-place; small confirm) |
| context-panel.html | `.cp-cta` "Open full workspace" | navigates to Full Page | full-page.html |
| context-panel.html | bottom nav "← Overview" | back to POC index | index.html |
| context-panel.html | bottom nav "Multi-match" | switches to multi-match state | context-panel-multi-match.html |
| context-panel.html | bottom nav "No match" | switches to no-match state | context-panel-no-match.html |
| context-panel.html | `.tone-toggle__btn` (3x) | switches theme | (no nav) |

## context-panel-multi-match.html — Multi-match

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| context-panel-multi-match.html | multi-match dropdown `<select>` change event | re-binds RedirectType display + hint copy | (in-place; the disabled RedirectType select switches to the newly-selected map's type, and the hint copy updates to *"Uses {map-name}'s redirect type"*) |
| context-panel-multi-match.html | inline form `Add` button | submits to currently-selected map; toast | (no nav; toast: *"Redirect added to Black Friday 2025."*) |
| context-panel-multi-match.html | inline form source input | editable | (in-place) |
| context-panel-multi-match.html | inline form RedirectType select | disabled; bound to dropdown selection | (no interaction) |
| context-panel-multi-match.html | matched row "Edit"/"Delete" icon buttons (3 rows × 2 actions) | (no-op in POC) production: opens InlineEditForm / delete confirm | (in-place) |
| context-panel-multi-match.html | `.cp-cta` "Open full workspace" | navigates to Full Page | full-page.html |
| context-panel-multi-match.html | bottom nav "← Overview" | back to POC index | index.html |
| context-panel-multi-match.html | bottom nav "Single match" | switches to single-match state | context-panel.html |
| context-panel-multi-match.html | bottom nav "No match" | switches to no-match state | context-panel-no-match.html |
| context-panel-multi-match.html | `.tone-toggle__btn` (3x) | switches theme | (no nav) |

## context-panel-no-match.html — No match (create new)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| context-panel-no-match.html | inline form `Add` button | submits createRedirectMap; toast | (no nav; toast: *"Created sneaker-cloud-runner-redirects with one redirect."* — in production, transitions to single-match state) |
| context-panel-no-match.html | inline form source input | editable | (in-place; auto-name preview beneath updates if source changes — currently static in POC) |
| context-panel-no-match.html | inline form RedirectType select | **ENABLED** (per ADR-0029 create-new path) | (in-place; operator picks 301/302/Server Transfer) |
| context-panel-no-match.html | `.cp-cta` "Open full workspace" | navigates to Full Page | full-page.html |
| context-panel-no-match.html | bottom nav "← Overview" | back to POC index | index.html |
| context-panel-no-match.html | bottom nav "Single match" | switches to single-match state | context-panel.html |
| context-panel-no-match.html | bottom nav "Multi-match" | switches to multi-match state | context-panel-multi-match.html |
| context-panel-no-match.html | `.tone-toggle__btn` (3x) | switches theme | (no nav) |

## dashboard-widget.html — Dashboard tile

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| dashboard-widget.html | header "Open" button | navigates to Full Page | full-page.html |
| dashboard-widget.html | (tiles, top-destination rows, recently-shipped rows) | non-interactive in widget surface | (no clickable affordance; widget is at-a-glance) |
| dashboard-widget.html | bottom nav "← Overview" | back to POC index | index.html |
| dashboard-widget.html | bottom nav "Full Page" | navigates to Full Page | full-page.html |
| dashboard-widget.html | bottom nav "Context Panel" | navigates to single-match Context Panel | context-panel.html |
| dashboard-widget.html | `.tone-toggle__btn` (3x) | switches theme | (no nav) |

## Summary

| Frame | Click-target rows |
|---|---|
| index.html | 6 |
| full-page.html | 17 |
| context-panel.html | 10 |
| context-panel-multi-match.html | 10 |
| context-panel-no-match.html | 9 |
| dashboard-widget.html | 6 |
| **Total** | **58** |
