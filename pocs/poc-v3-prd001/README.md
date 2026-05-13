# Redirect Manager — Workspace Frame (V3 · PRD-001) POC

Variant 3 of 3 for PRD-001 (multilingual CRUD). Named direction: **Workspace Frame**.

## What V3 buys

The Full Page surface becomes a **workspace**, not a list-with-picker. The signature patterns:

- **Sticky left language sidebar** (220 px wide). Every site language is a nav row composed from `@blok/navigation-stack`. Active language has an accent tint + left accent bar. One click switches working language from anywhere.
- **Coverage-matrix map list.** Each row shows a horizontal strip of small cells (one per language) instead of badges. Filled / empty / missing states are color + shape (Blok `--primary` filled, dashed border for empty, muted outline for missing). The active-language column gets a ring across all rows simultaneously — a heatmap of where the working language stands per map.
- **Language tabs at top of map detail** (`@blok/tabs`). Each tab shows language code; tabs for languages without versions render `(create)` and a dashed underline. Clicking such a tab opens the create-version drawer with that language pre-selected.
- **Right-edge create-version drawer** (`@blok/sheet`). Two CTAs side-by-side — Empty start vs Copy from another language. The workspace remains visible behind a scrim so the operator can see the list while creating. Strict no-default per ADR-0018.
- **Consequence-preview delete dialog** (`@blok/alert-dialog`). Radios start unselected (strict no-default, ADR-0018). Consequence panel renders as placeholder until a radio is chosen; on selection, it populates with live data ("Removes: 6 mappings in de · Preserves: 12 in en, 4 in ja, shared settings").
- **Grouped-by-language import preview** (`@blok/accordion`). One collapsible section per language with a one-line summary that survives collapse. Per-map action picker bound to map GUID — same choice reflects across language groups.
- **Dashboard inline scope toggle** per tile (composed segmented control). Each tile carries a `Current (de) | All langs` toggle. Persists per-tile in `localStorage`.
- **Pages-aware Context Panel banner.** Workspace-style banner with left accent bar matching the sidebar treatment; copy adapts to the Pages-language (`Viewing a de page — matches shown are en-only.`).

## How to open

Static HTML — no build step, no server.

```text
# from a file explorer
double-click  poc-index.html

# or with a local server (Windows)
npx serve products/redirect-manager/pocs/poc-v3-prd001
```

Open `poc-index.html` first — it lists all 18 screens with thumbnails and click-target hints.

## Navigation hint

Each screen has a small footer link `← All V3 screens` returning to `poc-index.html`. Click targets between screens follow the spec's Flow A–F transitions. See `click-targets.md` for the full enumeration — every distinct click target has its own post-state file (no generic labels).

## Theme

`theme.css` is the verbatim Blok Nova token set inherited from PRD-000 winner POC (`pocs/poc-v1/theme.css`). Geist Sans + Geist Mono load from npm CDN; system fallback stack renders correctly if offline. Light + dark mode supported (`prefers-color-scheme` + a top-right theme toggle button that cycles System → Light → Dark).

V3 introduces zero new Blok tokens — all visual choices are semantic (`--primary`, `--muted`, `--destructive`, `--success`, `--warning`, `--accent`, `--ring`, etc.). Coverage cell fill uses `--primary` (filled) / `--primary` at 22% with dashed border (empty) / `--muted` (missing). Consequence panels use `--destructive-background` + `--success-background` pairings already defined in theme.css.

## Iframe viewport budgets (per `sitecore:blok-marketplace-integration`)

| Surface | Width budget | V3 layout |
|---|---|---|
| Full Page | 1024–1920 px | 220 px sidebar + workspace area; collapses to top-bar select below 900 px |
| Pages Context Panel | 320–400 px | No sidebar; workspace-style banner only |
| Dashboard Block | 300–800 px | No sidebar; per-tile inline scope toggle |

At 1280 px (default Full Page viewport), the sidebar leaves ~1060 px for the workspace — comfortable. The drawer (40% = ~520 px) fits with the sidebar open. Below 900 px the sidebar collapses and the drawer slides up from the bottom edge (verified responsive at 800 px and 600 px in the CSS media queries; see `workspace.css` § Responsive).

## Files

```
poc-index.html                                       — landing (start here)
index.html                                           — Full Page · en active
full-page-de.html                                    — Full Page · de active (+ partial-version warning)
map-detail.html                                      — Map detail · en tab
map-detail-de.html                                   — Map detail · de tab
map-detail-no-version-tab.html                       — Map detail · fr missing (create affordance)
create-version-drawer.html                           — Drawer · both radios unselected
create-version-drawer-copyfrom.html                  — Drawer · copy-from source picker revealed
delete-consequence-preview.html                      — Dialog · radios unselected (placeholder consequence)
delete-consequence-preview-version-only.html         — Dialog · version-only chosen (populated panels)
delete-consequence-preview-entire-item.html          — Dialog · entire-map chosen (populated panels)
delete-consequence-preview-single-lang.html          — Dialog · single-language edge case
import-wizard-preview.html                           — Grouped accordion · all groups open
import-wizard-preview-collapsed.html                 — Grouped accordion · en + fr collapsed
dashboard-widget.html                                — Widget · current-lang scope
dashboard-widget-all-langs.html                      — Widget · all-langs scope
context-panel-en.html                                — Pages panel on an /en URL
context-panel-de.html                                — Pages panel on a /de URL
partial-version-banner.html                          — ADR-0021 recovery surface
theme.css                                            — Blok Nova tokens (verbatim from PRD-000 winner)
workspace.css                                        — V3-specific layout + components
icons.js                                             — Lucide-style monochrome SVG icons
theme-toggle.js                                      — System/Light/Dark cycle button
click-targets.md                                     — every distinct click target
```

## Mapping to Blok primitives

| Pattern | Blok primitive / blok |
|---|---|
| Language sidebar | `@blok/navigation-stack` |
| Map list row | `@blok/table` row + inline matrix of `@blok/badge`-shaped cells |
| Coverage matrix cell | custom `<button>` styled with Blok semantic tokens |
| Map detail tabs | `@blok/tabs` |
| Click-to-edit title | `@blok/editable` |
| Create-version drawer | `@blok/sheet` (side="right") |
| Source-language picker | `@blok/select` |
| Consequence-preview dialog | `@blok/alert-dialog` + two `@blok/alert` panels (destructive + success) |
| Radio group | `@blok/radio-group` |
| Import preview groups | `@blok/accordion` |
| Action picker | `@blok/select` |
| Dashboard tile toggle | composed segmented control (`<button role="radio">` per `blok-components` skill, "toggle-group" note) |
| Context Panel banner | `@blok/alert` variant="info" |
| Toast | `@blok/sonner` |

## Limitations

- Static HTML; no state management, no SDK calls. Click targets follow scripted transitions.
- Display name click-to-edit is a visual cue only — pressing the title doesn't enter an input in the POC.
- Drawer and dialog overlay traps focus visually but not programmatically. A11y patterns are encoded in markup (`role`, `aria-*`) for the eventual implementation, not exercised by this POC.
- Coverage matrix tooltips use CSS `::after` on hover only — keyboard focus rings still show, but tooltip-on-focus would need JS.
- `prefers-reduced-motion` disables drawer slide + accordion chevron rotation; content is never hidden purely by motion.

## Spec reference

Canonical design: `products/redirect-manager/project-planning/ui-design/ui-design-20260513T092023Z-v3.md`.
PRD: `products/redirect-manager/project-planning/PRD/prd-001.md`.
ADRs bound: ADR-0014 through ADR-0022.
