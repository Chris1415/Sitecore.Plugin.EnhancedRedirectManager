# Click targets — V1 Topbar Pilot (PRD-001 multilingual)

Static HTML clickdummy. Every clickable element on every frame is enumerated below
together with the post-state file it advances to. Generic targets ("opens modal",
"shows details") are forbidden — each click target lands on its own named frame.

The 14 frames in this POC:

1. `index.html` — Full Page home, EN populated
2. `full-page-de.html` — Full Page home, DE post-switch (picker open, dots flip)
3. `map-detail.html` — map detail with populated EN version
4. `map-detail-no-version.html` — no version in current language (DE), with two CTAs
5. `map-detail-empty-version.html` — version exists in current language but has 0 mappings; inline "first mapping" affordance
6. `create-version-modal.html` — modal step 1, two large CTAs side-by-side
7. `create-version-copy-from-source.html` — modal step 2, source-language picker
8. `delete-modal-multi.html` — delete confirmation, 3-version case, strict no-default radios
9. `delete-modal-single.html` — delete confirmation, single-version edge case (AC-8.6)
10. `import-wizard-preview.html` — language-columns preview with sticky-left map column
11. `dashboard-widget.html` — compact 4-tile read-only summary, current language only + "Languages with content" tile
12. `context-panel-en.html` — narrow context panel, static EN banner copy
13. `context-panel-de.html` — same panel, Pages-aware banner naming `de`
14. `partial-version-banner.html` — Full Page top banner for ADR-0021 rollback failure

## index.html — Full Page home (EN)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| index.html | topbar picker trigger `.lp-trigger` | open dropdown (POC: jumps to DE post-switch view) | full-page-de.html |
| index.html | topbar `Import` button | open import wizard preview | import-wizard-preview.html |
| index.html | topbar `Export` button | (no nav — POC inert) | — |
| index.html | topbar `New map` button | (no nav — POC inert) | — |
| index.html | list row `Marketing campaigns` (has-EN, selected) | open populated detail | map-detail.html |
| index.html | list row `Legacy product URLs` (has-EN) | open populated detail | map-detail.html |
| index.html | list row `Press release pages` (no-EN, outlined dot) | open no-version detail | map-detail-no-version.html |
| index.html | list row `Product routes` (has-EN) | open populated detail | map-detail.html |
| index.html | list row `A/B test variants` (has-EN, 0 mappings) | open empty-version detail | map-detail-empty-version.html |
| index.html | list row `Geo-IP fallbacks` (no-EN, outlined dot) | open no-version detail | map-detail-no-version.html |
| index.html | list row `404 rescue chain` (has-EN) | open populated detail | map-detail.html |
| index.html | list row `Influencer partner links` (has-EN) | open populated detail | map-detail.html |
| index.html | bottom `Delete map` button | open delete modal (multi-version) | delete-modal-multi.html |
| index.html | bottom `Save changes` button | (no nav — POC inert) | — |
| index.html | bottom `Cancel` button | (no nav — POC inert) | — |
| index.html | footer link `switch to DE` | DE post-switch view | full-page-de.html |
| index.html | footer link `dashboard widget` | Dashboard widget | dashboard-widget.html |
| index.html | footer link `context panel (en)` | Context Panel EN | context-panel-en.html |
| index.html | footer link `context panel (de)` | Context Panel DE | context-panel-de.html |
| index.html | footer link `import preview` | import wizard preview | import-wizard-preview.html |
| index.html | footer link `partial-version banner` | partial-version banner state | partial-version-banner.html |
| index.html | footer link `click-targets.md` | this file | click-targets.md |

## full-page-de.html — Full Page home (DE, post-switch)

Shows the picker open (post-state) and dots flipped to reflect DE coverage.

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| full-page-de.html | open picker option `EN  English` | switch back to EN | index.html |
| full-page-de.html | open picker option `DE  Deutsch` (current) | self-link, no change | full-page-de.html |
| full-page-de.html | open picker option `FR  Français` | (no nav — POC) | — |
| full-page-de.html | open picker option `IT  Italiano` | (no nav — POC) | — |
| full-page-de.html | open picker option `JA 日本語` (tenant-wide group) | (no nav — POC) | — |
| full-page-de.html | open picker option `PT  Português` (tenant-wide group) | (no nav — POC) | — |
| full-page-de.html | topbar `Import` button | open import wizard preview | import-wizard-preview.html |
| full-page-de.html | topbar `Export` button | (no nav — POC inert) | — |
| full-page-de.html | topbar `New map` button | (no nav — POC inert) | — |
| full-page-de.html | list row `Marketing campaigns` (has-DE, selected) | open populated detail | map-detail.html |
| full-page-de.html | list row `Legacy product URLs` (no-DE, outlined) | open no-version detail | map-detail-no-version.html |
| full-page-de.html | list row `Press release pages` (no-DE, outlined) | open no-version detail | map-detail-no-version.html |
| full-page-de.html | list row `Product routes` (has-DE) | open populated detail | map-detail.html |
| full-page-de.html | list row `A/B test variants` (no-DE, outlined) | open no-version detail | map-detail-no-version.html |
| full-page-de.html | list row `Geo-IP fallbacks` (no-DE, outlined) | open no-version detail | map-detail-no-version.html |
| full-page-de.html | list row `404 rescue chain` (has-DE) | open populated detail | map-detail.html |
| full-page-de.html | list row `Influencer partner links` (no-DE, outlined) | open no-version detail | map-detail-no-version.html |
| full-page-de.html | bottom `Delete map` button | open delete modal (multi-version) | delete-modal-multi.html |
| full-page-de.html | footer link `back to EN home` | EN home | index.html |
| full-page-de.html | footer link `no-version state` | no-version detail | map-detail-no-version.html |

## map-detail.html — populated EN version

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| map-detail.html | breadcrumb `SneakerCo` / `MainSite` | back to list | index.html |
| map-detail.html | picker trigger | switch to DE | full-page-de.html |
| map-detail.html | topbar `Back to list` button | back to list | index.html |
| map-detail.html | display-name pencil icon | (inline edit, POC inert) | — |
| map-detail.html | mapping row `Delete row` icon ×3 | (POC inert — no per-row destination) | — |
| map-detail.html | `Add mapping` button | (POC inert) | — |
| map-detail.html | bottom `Delete map` button | open delete modal (multi-version) | delete-modal-multi.html |
| map-detail.html | bottom `Cancel` / `Save changes` | (POC inert) | — |
| map-detail.html | footer link `Back to list` | list | index.html |

## map-detail-no-version.html — no DE version yet

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| map-detail-no-version.html | breadcrumb `SneakerCo` / `MainSite` | back to DE list | full-page-de.html |
| map-detail-no-version.html | picker trigger | switch to DE | full-page-de.html |
| map-detail-no-version.html | topbar `Back to list` | back to DE list | full-page-de.html |
| map-detail-no-version.html | empty-card primary CTA `Create Deutsch version` | create-version modal entry | create-version-modal.html |
| map-detail-no-version.html | empty-card secondary CTA `Copy from another language` | copy-from step 2 directly | create-version-copy-from-source.html |
| map-detail-no-version.html | empty-card chip `EN English` (existing version) | switch picker to EN (home) | index.html |
| map-detail-no-version.html | empty-card chip `FR Français` (existing version) | (POC inert — no fr frame) | — |
| map-detail-no-version.html | footer link `Back to list (DE)` | DE list | full-page-de.html |
| map-detail-no-version.html | footer link `create-version modal` | create-version modal | create-version-modal.html |
| map-detail-no-version.html | footer link `copy-from path` | copy-from step 2 | create-version-copy-from-source.html |

## map-detail-empty-version.html — empty mappings list

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| map-detail-empty-version.html | breadcrumb / `Back to list` | EN list | index.html |
| map-detail-empty-version.html | picker trigger | switch to DE | full-page-de.html |
| map-detail-empty-version.html | display-name pencil icon | (inline edit, POC inert) | — |
| map-detail-empty-version.html | first-mapping row inputs | (POC inert — typing) | — |
| map-detail-empty-version.html | `Add mapping` button (first-mapping card) | (POC inert) | — |
| map-detail-empty-version.html | mapping row `Delete row` icon | (POC inert) | — |
| map-detail-empty-version.html | bottom `Delete map` button | open delete modal (multi-version) | delete-modal-multi.html |
| map-detail-empty-version.html | bottom `Save first mapping` | (POC inert) | — |
| map-detail-empty-version.html | footer link `Back to list` | EN list | index.html |

## create-version-modal.html — entry (two CTAs)

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| create-version-modal.html | left CTA card `Create empty` | empty version detail (post-create) | map-detail-empty-version.html |
| create-version-modal.html | right CTA card `Copy from language` | source picker step 2 | create-version-copy-from-source.html |
| create-version-modal.html | `Cancel` button | back to no-version detail | map-detail-no-version.html |

## create-version-copy-from-source.html — source picker

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| create-version-copy-from-source.html | back arrow in title | back to modal entry | create-version-modal.html |
| create-version-copy-from-source.html | radio row `EN English 47 mappings` (selected) | (radio select — POC inert) | — |
| create-version-copy-from-source.html | radio row `FR Français 32 mappings` | (radio select — POC inert) | — |
| create-version-copy-from-source.html | radio row `IT Italiano 18 mappings` | (radio select — POC inert) | — |
| create-version-copy-from-source.html | `Back` footer button | back to modal entry | create-version-modal.html |
| create-version-copy-from-source.html | `Create version from EN` footer button | post-create detail (EN-copy succeeded) | map-detail.html |

## delete-modal-multi.html — multilingual delete

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| delete-modal-multi.html | radio card a `Delete Deutsch version only` | (radio select — POC inert; would enable Delete button) | — |
| delete-modal-multi.html | radio card b `Delete entire map` | (radio select — POC inert; would enable Delete button) | — |
| delete-modal-multi.html | `Cancel` button | back to DE Full Page | full-page-de.html |
| delete-modal-multi.html | `Delete` button (disabled — no radio selected) | (disabled — no nav) | — |

## delete-modal-single.html — single-version edge case

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| delete-modal-single.html | radio card a `Delete English version only` (pre-selected for visual) | (radio select — POC inert) | — |
| delete-modal-single.html | radio card b `Delete entire map` | (radio select — POC inert) | — |
| delete-modal-single.html | `Cancel` button | back to EN home | index.html |
| delete-modal-single.html | `Delete English version` button | (POC inert — would dispatch mutation) | — |

## import-wizard-preview.html — language-columns preview

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| import-wizard-preview.html | step pill `1 · Upload` | (POC inert — stepper navigation not wired) | — |
| import-wizard-preview.html | step pill `2 · Validate` | (POC inert) | — |
| import-wizard-preview.html | step pill `4 · Apply` | (POC inert) | — |
| import-wizard-preview.html | row 1 action select `Marketing campaigns` | (POC inert — would re-render cells) | — |
| import-wizard-preview.html | row 2 action select `Legacy product URLs` | (POC inert) | — |
| import-wizard-preview.html | row 3 action select `Press release pages` | (POC inert) | — |
| import-wizard-preview.html | row 4 action select `A/B test variants` | (POC inert) | — |
| import-wizard-preview.html | `Cancel` button | back to EN home | index.html |
| import-wizard-preview.html | `Back` button | (POC inert) | — |
| import-wizard-preview.html | `Apply` button (disabled — conflict exists) | (disabled — no nav) | — |

## dashboard-widget.html — compact, current-language

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| dashboard-widget.html | read-only `EN English` chip in header | (read-only — POC inert; live impl reads picker, no click) | — |
| dashboard-widget.html | tile `Maps in EN 12` | (POC inert) | — |
| dashboard-widget.html | tile `Mappings in EN 84` | (POC inert) | — |
| dashboard-widget.html | tile `Last updated 3 d ago` | (POC inert) | — |
| dashboard-widget.html | tile `Languages with content` chips | (read-only — no toggle by design) | — |
| dashboard-widget.html | footer link `Back to Full Page` | EN home | index.html |

## context-panel-en.html — static EN banner

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| context-panel-en.html | row `Edit` ×N | (POC inert) | — |
| context-panel-en.html | row `Delete` ×N | (POC inert) | — |
| context-panel-en.html | `Add redirect for this page` button | (POC inert — modal not in PRD-001 scope) | — |
| context-panel-en.html | footer link `see DE-page variant` | DE banner variant | context-panel-de.html |
| context-panel-en.html | footer link `Full Page` | EN home | index.html |

## context-panel-de.html — Pages-aware DE banner

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| context-panel-de.html | banner copy (announces aria-live polite) | (read-only) | — |
| context-panel-de.html | row `Edit` ×N | (POC inert) | — |
| context-panel-de.html | row `Delete` ×N | (POC inert) | — |
| context-panel-de.html | `Add redirect for this page` button | (POC inert) | — |
| context-panel-de.html | footer link `see EN-page variant` | EN banner variant | context-panel-en.html |
| context-panel-de.html | footer link `Full Page` | EN home | index.html |

## partial-version-banner.html — ADR-0021 rollback failure

| Screen | Element | Click → | Post-state file/anchor |
|--------|---------|---------|------------------------|
| partial-version-banner.html | picker trigger | switch to DE | full-page-de.html |
| partial-version-banner.html | topbar `Import` button | import preview | import-wizard-preview.html |
| partial-version-banner.html | topbar `Export` button | (POC inert) | — |
| partial-version-banner.html | topbar `New map` button | (POC inert) | — |
| partial-version-banner.html | banner CTA `Delete Deutsch version` | delete modal multi | delete-modal-multi.html |
| partial-version-banner.html | banner CTA `Add mappings manually` | empty-version detail | map-detail-empty-version.html |
| partial-version-banner.html | banner CTA `View technical details` | (POC inert — collapsible) | — |
| partial-version-banner.html | list row `Press release pages` (selected, warning icon) | self-link, no change | partial-version-banner.html |
| partial-version-banner.html | list row `Marketing campaigns` (has-DE) | open populated detail | map-detail.html |
| partial-version-banner.html | list row `Geo-IP fallbacks` (no-DE) | open no-version detail | map-detail-no-version.html |
| partial-version-banner.html | footer link `back to DE list` | DE list | full-page-de.html |

---

## Graceful-degradation notes

- **Mobile responsive:** `index.html`, `full-page-de.html`, `map-detail*.html`, and the dashboard widget render at 360px wide (single-pane stacking via the inherited `@media (max-width: 960px)` rule from `surfaces.css`). Modal screens (`create-version-modal.html`, `delete-modal-multi.html`, etc.) work at 360px because the dialog's `max-width` collapses to viewport with padding from `.blok-overlay`.
- **Dark mode:** every screen honors `prefers-color-scheme: dark` via `theme.css`. The `theme-toggle.js` button (top-right corner) toggles `.light` / `.dark` manually for evaluation.
- **No JS state machine.** Every "selected", "open dropdown", or "checked radio" pattern is rendered as a static post-state in its own file.
- **Source language radio appears pre-selected on `create-version-copy-from-source.html`** because there is only one non-empty version language displayed-as-default. The radio component is real in implementation; the POC shows the "EN already selected" visual.
- **`delete-modal-multi.html` shows the strict no-default state** — neither radio is pre-checked and the Delete button is disabled with an `aria-describedby` reason. The single-version variant (`delete-modal-single.html`) intentionally pre-selects radio a for AC-8.6 demonstration only — both radios are still present.
