# Redirect Manager — V1 "Topbar Pilot" clickdummy (PRD-001 multilingual)

Static HTML clickdummy for the **PRD-001 multilingual CRUD** addition on top of
the PRD-000 Operator Console foundation. Visual direction follows the
`ui-design-20260513T092023Z-v1.md` spec — **"Topbar Pilot"**: the language
picker is the dominant element in the global topbar, the map list communicates
per-row coverage with a single 8px dot, the Dashboard is strictly scoped to the
current language, and the import preview lays languages out as columns. Theme,
typography, and card chrome inherit unchanged from PRD-000's POC at
`pocs/poc-v1/` (Blok Nova preset, Geist Sans + Geist Mono, semantic tokens only).

## How to open

Open `index.html` directly in a browser via `file://`. No build step, no server
required. All assets are local; fonts have a CDN URL with a system-font fallback
stack so the POC still reads correctly offline.

```
products/redirect-manager/pocs/poc-v1-prd001/index.html
```

If you prefer a static server (helpful when Chrome blocks some `file://`
features):

```
cd products/redirect-manager/pocs/poc-v1-prd001
npx serve .
```

## Key things to look at

1. **Topbar picker** — `[EN] English` chip with native name and chevron, ~280px
   wide. Click it on `index.html` to land on `full-page-de.html`, where the
   dropdown is shown in its open state.
2. **Per-row coverage dot** — filled purple = has version in current language,
   outlined grey = no version. Compare `index.html` (EN) vs `full-page-de.html`
   (DE) — the same map list flips coverage based on the picker.
3. **No-version state** — click any outlined-dot row → `map-detail-no-version.html`.
   Shows the two CTAs (`Create empty Deutsch version`, `Copy from another
   language`) plus the chips of languages that DO have versions.
4. **Create-version modal** — `create-version-modal.html` — two large CTA cards
   side-by-side, equal weight. Hover gives the "pick me" border accent.
5. **Copy-from step 2** — `create-version-copy-from-source.html` — source-language
   radio list with mapping counts. Empty-version languages are excluded per AC-7.2.
6. **Delete modal (multilingual)** — `delete-modal-multi.html` — strict no-default
   radio stack; Delete button disabled with an `aria-describedby` reason.
7. **Delete modal (single-version edge case)** — `delete-modal-single.html` —
   both radios still present, informational note explains both options remove
   all redirect data (AC-8.6).
8. **Import preview** — `import-wizard-preview.html` — maps down the left
   (sticky), languages across the top, status badges per cell. Includes a
   "Conflict" state on Press release pages / FR to demonstrate FR-16 routing.
9. **Dashboard widget** — `dashboard-widget.html` — strict EN-scope: 3 tiles
   labeled "Maps in EN", "Mappings in EN", "Last updated", plus a 4th
   "Languages with content" tile listing `EN`, `DE`, `FR` chips. No toggle.
10. **Context Panel banner** — `context-panel-en.html` (static) vs
    `context-panel-de.html` (Pages-aware copy naming `de`). Both use the same
    `@blok/alert` info variant; only the body copy switches.
11. **Partial-version warning** — `partial-version-banner.html` — the ADR-0021
    rollback-failure state. Persistent banner at the top with two recovery CTAs.

## Navigation hint

`index.html` is the home. The footer of every Full Page screen has shortcut
links to the other surfaces and to `click-targets.md`, which enumerates every
clickable element and where it lands. There's no nav header — each post-state
is its own file, and back-links live in the breadcrumb / topbar.

## Files

- `index.html` — Full Page EN home (entry point)
- `full-page-de.html` — Full Page DE post-switch (picker open + dots flipped)
- `map-detail.html` — populated map detail (EN)
- `map-detail-no-version.html` — no-version state with create CTAs (DE)
- `map-detail-empty-version.html` — empty-version inline first-mapping affordance
- `create-version-modal.html` — modal step 1, two CTAs
- `create-version-copy-from-source.html` — modal step 2, source picker
- `delete-modal-multi.html` — delete confirmation, 3-version case
- `delete-modal-single.html` — delete confirmation, single-version edge case
- `import-wizard-preview.html` — language-columns preview table
- `dashboard-widget.html` — compact 4-tile read-only widget
- `context-panel-en.html` — Pages context panel, EN page banner
- `context-panel-de.html` — Pages context panel, DE page banner
- `partial-version-banner.html` — ADR-0021 rollback failure state
- `theme.css` — Blok semantic tokens (copied verbatim from PRD-000 POC)
- `multilingual.css` — PRD-001 additions on top of PRD-000 chrome
- `surfaces.css` — PRD-000 layout chrome (inherited)
- `icons.js` — inline-SVG Lucide-style glyphs (no emoji)
- `theme-toggle.js` — manual light/dark switch (top-right corner)
- `click-targets.md` — full enumeration of clickable elements per frame
