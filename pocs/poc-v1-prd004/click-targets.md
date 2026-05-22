# Click targets — PRD-004 POC v1 ("Trace & Tame")

Generated 2026-05-20. Amended 2026-05-20T13:00 to reflect the EditRowModal + two-column-Test pivot. Amended 2026-05-21 to reflect operator UX simplification: ScopePicker + locale dropdown removed from Test tab; snippet library, capture-group chips, sample-URL tester, and inline mode-mismatch hint removed from EditRowModal. Amended 2026-05-19 (shared-rail restructure): CollectionPicker + SitePicker are now shared across Manage and Test tabs (rendered in the persistent left rail). Test tab left rail shows pickers + read-only maps list + URL input + Test button.

One row per distinct interactive element across every frame. Every clickable target is wired with a real `<a href>` (or, for decorative toasts, the existing `data-decorative-cta` pattern carried from PRD-002). No conflated targets — distinct labels for distinct post-states.

## Post-write amendment 2026-05-20

The standalone `rowedit-*.html` pages from the original POC have been recast as **modal overlays** on top of the Manage tab (`index.html` chrome shown dimmed behind a centered Blok dialog). The `test-*.html` series now uses a **two-column layout** with a read-only maps list on the left rail (no pickers) and trace cards on the right.

## Post-implementation amendment 2026-05-21 (operator UX simplification)

Removed frames (deleted): `test-scope-collection-only.html`, `test-scope-site-loading.html`, `test-scope-stale-localstorage.html`, `rowedit-hint-pattern-detected-regex.html`, `rowedit-sample-tester.html`.

Simplified Test tab: Collection/Site/Maps pickers and locale dropdown replaced by a read-only maps list (maps passed from Manage tab). Locale derived from URL prefix (`/de-DE/path` → `de-DE`). Simplified EditRowModal: snippet library, capture-group chips, and live sample-URL tester removed; mode toggle + source + destination + save/cancel remain.

## Frame inventory

| Frame | Purpose | Active workspace tab | Active mode |
|-------|---------|----------------------|-------------|
| `index.html` | Manage tab (canonical "before" baseline). Rows are click-targets that open EditRowModal. | Manage | n/a |
| `test-empty.html` | Test tab, first visit, no maps loaded yet. "Pick a scope" empty state. | Test | n/a |
| `test-loading.html` | URL entered + Test clicked; skeleton trace cards | Test | n/a |
| `test-matched.html` | Two-column: read-only maps list on left, trace + matched ResultCard on right | Test | n/a |
| `test-unmatched.html` | Two-column: read-only maps list on left, no-match + rows-considered collapsed on right | Test | n/a |
| `test-unmatched-expanded.html` | rows-considered expanded to first 20 + footer "+ N more in this map" | Test | n/a |
| `test-diagnostic-incomplete.html` | 3s wall-clock cap hit; warning-tinted final card; partial trace | Test | n/a |
| `test-timeout-row.html` | Single row evaluation hit per-row cap (warning border on row 5) | Test | n/a |
| `rowedit-pattern.html` | **EditRowModal** overlay on dimmed Manage; Pattern mode (default per FR-A2). No map-level fields. | Manage (dimmed) | Pattern |
| `rowedit-regex.html` | **EditRowModal** overlay; Regex mode (simplified: no snippets/chips/tester) | Manage (dimmed) | Regex |
| `rowedit-save-error.html` | **EditRowModal** overlay; Save attempted with invalid regex; modal stays open, error renders | Manage (dimmed) | Regex |

## Click-target map

### Manage tab (`index.html`)

| Element | Click → | Post-state file |
|---------|---------|-----------------|
| `.fp-tab[data-tab="test"]` | switches to Test tab (empty, no scope) | `test-empty.html` |
| `.fp-tab[data-tab="manage"]` | already-active no-op | `index.html` |
| `.fp-detail__tools .blok-btn--primary` (Add mapping) | opens EditRowModal in Pattern mode | `rowedit-pattern.html` |
| row 1 (cell click OR edit icon) — `/old-page` | opens EditRowModal for that row in Pattern mode | `rowedit-pattern.html` |
| row 2 (cell click OR edit icon) — `^/blog/(.+)$` | opens EditRowModal for that row in Regex mode | `rowedit-regex.html` |
| row 3 (cell click OR edit icon) — `\.html?$` | opens EditRowModal for that row in Regex mode | `rowedit-regex.html` |
| row 4 (cell click OR edit icon) — `/promo-legacy` | opens EditRowModal for that row in Pattern mode | `rowedit-pattern.html` |
| row 5 (cell click OR edit icon) — `/landing/teaser` | opens EditRowModal for that row in Pattern mode | `rowedit-pattern.html` |
| row delete icon (any row) | event.stopPropagation; in-place decorative no-nav | (in-place) |
| "Open Test tab →" footer link | switches to Test tab | `test-empty.html` |
| "RowEditForm (Pattern)" footer link | jump to Pattern modal | `rowedit-pattern.html` |
| "RowEditForm (Regex)" footer link | jump to Regex modal | `rowedit-regex.html` |
| "README" footer link | open POC overview | `README.md` |

### EditRowModal frames (`rowedit-*.html`)

Three frames share the modal-overlay shell on top of a dimmed `index.html` shell. Backdrop click + close button + Cancel button all return to `index.html`.

Simplified 2026-05-21: snippet library, capture-group chips, and sample-URL tester removed. Inline mode-mismatch hint removed.

| Frame | Element | Click → | Post-state file |
|-------|---------|---------|-----------------|
| `rowedit-pattern.html` | backdrop (`.edit-row-modal-overlay__dismiss`) | close modal, return to Manage | `index.html` |
| `rowedit-pattern.html` | `.edit-row-modal__close` (✕ glyph, top-right) | close modal, return to Manage | `index.html` |
| `rowedit-pattern.html` | `.mode-toggle__btn[data-mode="pattern"]` | already active no-op | `rowedit-pattern.html` |
| `rowedit-pattern.html` | `.mode-toggle__btn[data-mode="regex"]` | switch to Regex modal | `rowedit-regex.html` |
| `rowedit-pattern.html` | Cancel | close modal | `index.html` |
| `rowedit-pattern.html` | `.save-btn` (Save row) | save success; close modal + decorative toast | `index.html` |
| `rowedit-pattern.html` | footer "Switch to Regex →" | direct switch | `rowedit-regex.html` |
| `rowedit-pattern.html` | footer "Save error" | error modal | `rowedit-save-error.html` |
| `rowedit-regex.html` | backdrop | close modal | `index.html` |
| `rowedit-regex.html` | `.edit-row-modal__close` | close modal | `index.html` |
| `rowedit-regex.html` | `.mode-toggle__btn[data-mode="pattern"]` | switch to Pattern modal | `rowedit-pattern.html` |
| `rowedit-regex.html` | `.save-btn` (Save row) | decorative success toast (no nav) | (in-place toast) |
| `rowedit-regex.html` | Cancel | close modal | `index.html` |
| `rowedit-save-error.html` | `.mode-toggle__btn[data-mode="pattern"]` | switch to Pattern modal | `rowedit-pattern.html` |
| `rowedit-save-error.html` | Save row | decorative warning toast (no nav) | (in-place) |

### Test tab — shared-rail layout (`test-*.html`)

Shared-rail restructure 2026-05-19: CollectionPicker + SitePicker are now rendered in the persistent left rail alongside the read-only maps list. Scope picked in either Manage or Test tab is shared (FullPage state). Test tab left rail: Collection select + Site select + separator + read-only maps list (no hover, no click) + separator + URL input + Test button. Locale derived from URL prefix.

| Element (any test-*.html) | Click → | Post-state file |
|---------------------------|---------|-----------------|
| Collection `<select>` | pick collection (decorative) | (in-place) |
| Site `<select>` | pick site (decorative) | (in-place) |
| Map rows (read-only `<span>`) | no navigation (non-clickable) | (in-place, no-op) |
| URL input `#test-url-input` | edit URL (decorative) | (in-place) |
| Test button (`.test-rail__submit`) — disabled when URL empty or invalid | nav to loading state | `test-loading.html` |
| Test button — enabled | nav to loading state | `test-loading.html` |

#### Per-frame:

| Frame | Element | Click → | Post-state file |
|-------|---------|---------|-----------------|
| `test-empty.html` | `.fp-tab[data-tab="manage"]` | back to Manage | `index.html` |
| `test-empty.html` | footer "Loading state" | direct skip | `test-loading.html` |
| `test-empty.html` | footer "Matched" | direct skip | `test-matched.html` |
| `test-empty.html` | footer "Unmatched" | direct skip | `test-unmatched.html` |
| `test-empty.html` | footer "3s cap" | direct skip | `test-diagnostic-incomplete.html` |
| `test-empty.html` | footer "Row timeout" | direct skip | `test-timeout-row.html` |
| `test-loading.html` | (auto-advance via `<meta refresh>` 2.4s) | simulator resolves to match | `test-matched.html` |
| `test-loading.html` | "Skip to matched →" footer | manual advance | `test-matched.html` |
| `test-loading.html` | "← Back to empty" footer | back to empty | `test-empty.html` |
| `test-matched.html` | `.fp-tab[data-tab="manage"]` | back to Manage | `index.html` |
| `test-matched.html` | `.result-card .open-in-manage-btn` ("Open this rule in Manage") | open EditRowModal for matched row | `rowedit-pattern.html` |
| `test-matched.html` | `.copy-json-btn` (Copy as JSON) | decorative Sonner toast | (in-place toast) |
| `test-matched.html` | footer "Unmatched →" | jump to unmatched | `test-unmatched.html` |
| `test-unmatched.html` | `.rows-considered .expand-btn` ("Show all 20 rows") | expand the list | `test-unmatched-expanded.html` |
| `test-unmatched.html` | result-card "Add a rule for this URL" | open EditRowModal in Add mode | `rowedit-pattern.html` |
| `test-unmatched.html` | `.copy-json-btn` | decorative Sonner toast | (in-place) |
| `test-unmatched.html` | footer "Expand rows considered →" | nav | `test-unmatched-expanded.html` |
| `test-unmatched.html` | footer "3s cap →" | nav | `test-diagnostic-incomplete.html` |
| `test-unmatched-expanded.html` | "← Collapse" footer | back to collapsed | `test-unmatched.html` |
| `test-unmatched-expanded.html` | result-card "Add a rule for this URL" | nav | `rowedit-pattern.html` |
| `test-unmatched-expanded.html` | `.copy-json-btn` | decorative toast | (in-place) |
| `test-diagnostic-incomplete.html` | result-card "Inspect slow patterns" | nav | `test-timeout-row.html` |
| `test-diagnostic-incomplete.html` | `.copy-json-btn` | decorative toast | (in-place) |
| `test-diagnostic-incomplete.html` | footer "Row-level timeout →" | nav | `test-timeout-row.html` |
| `test-timeout-row.html` | result-card "Fix the slow pattern" | open EditRowModal Regex | `rowedit-regex.html` |
| `test-timeout-row.html` | `.copy-json-btn` | decorative toast | (in-place) |
| `test-timeout-row.html` | footer "Matched →" | direct nav | `test-matched.html` |

## Cross-frame conventions

- **Theme toggle** (top-right floating pill, Light / Dark / Auto) — works on every frame including modal-overlay frames. State persists across navigation via `localStorage["rm-prd002-theme"]` carried from the PRD-002 implementation.
- **Workspace tab control** (Manage / Test) — every frame includes it. Manage variants set `aria-selected="true"` on Manage; Test variants set it on Test. Tabs are anchors so navigation works pre-JS. On `rowedit-*.html` overlays, the tab control is visible in the dimmed Manage shell underneath but is `tabindex="-1"` (modal traps focus).
- **EditRowModal overlay** — `rowedit-*.html` frames render `.fp-shell.fp-shell--dimmed` (Manage chrome blurred + dimmed via CSS) with a `.edit-row-modal-overlay` containing the centered `.edit-row-modal` dialog. Backdrop click anywhere outside the modal returns to `index.html`. Demo-frame footer nav sits below the overlay backdrop (z-index: 50) so reviewers can swap between modal variants without explicit dismissal.
- **Sonner toasts** — fire on `.copy-json-btn` and on decorative save buttons via the carried `data-decorative-cta` + `window.elevToast()` pattern from PRD-002. Appear in-place (no navigation) and announce via `aria-live="polite"`.
- **HahnSoloFooter** — present on every frame, bottom-right corner, `z-index: 50`.
- **In-place interactions** — theme toggle and "Copy as JSON" do not navigate to a new file. They demonstrate behavior in place. Distinct named post-states exist for every navigation transition between frames.
