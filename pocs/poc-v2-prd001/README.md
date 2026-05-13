# POC clickdummy — V2 "Coverage Atlas" (PRD-001 multilingual CRUD)

Self-contained HTML/CSS clickdummy realizing **Variant V2 — Coverage Atlas** of the PRD-001 multilingual CRUD spec. Static files, no build step, no backend, placeholder content only.

**Spec:** `products/redirect-manager/project-planning/ui-design/ui-design-20260513T092023Z-v2.md`
**Visual continuity reference:** `products/redirect-manager/pocs/poc-v1/` (PRD-000 winner — theme tokens carried verbatim)

## V2 thesis in one sentence

The map list is the multilingual radar — every row exposes a horizontal **language-coverage chip strip** so operators scan the list and immediately see which maps have filled / empty / missing versions across every site language. The picker is demoted to a secondary tool because the list itself answers "where is content?" before any switch is needed.

## V2 signature elements rendered in this POC

- **Multi-chip coverage strip per map row** — `[en●][de◌][fr−]` style, on every list row, repeated on detail, import, delete preview, and Dashboard. Color + border-style + glyph + aria-label — never color-alone.
- **Demoted topbar picker** — smaller, subdued, tucked beside the breadcrumb at `--text-xs` height 1.75rem.
- **Inline mini language-switcher** — chip pills as a `radiogroup` at the top of the detail pane; bi-directional with the topbar picker.
- **Stepper create-version modal** — 2 steps for Empty, 3 steps for Copy-from; the dot count makes the path's length visible.
- **Delete card pattern** — two cards, each showing the post-deletion chip strip inside. Strict no-default (ADR-0018).
- **Expandable import preview rows** — collapsed → tenant-vs-bundle chip strips at a glance; expanded → per-language diff with chip vocabulary + verdict tags.
- **Twin Dashboard tiles** — `Maps in de` next to `Maps total`. No toggle.
- **Languages-with-content tile** — site-level zoom-out of the row chip strip with aggregate fractions (`8/12`).
- **Pages-aware Context Panel banner** — strong-info card, two copy variants based on Pages language.
- **Partial-version recovery banner** — ADR-0021 fallback when copy-from rolled back partially.

## How to open

Static files. Open `index.html` directly via the local filesystem:

```
file:///C:/Projects/.../products/redirect-manager/pocs/poc-v2-prd001/index.html
```

Or serve over HTTP (no build step required):

```
cd products/redirect-manager/pocs/poc-v2-prd001
npx serve .
# then http://localhost:3000/
```

All navigation is plain HTML — clicking links / picker / buttons jumps to a dedicated post-state file.

## Navigation hint

`index.html` is the **Full Page home** with picker on `en`. From there:

- Topbar picker → `de` switches to `full-page-de.html`
- Any rail map row → `map-detail.html` (or its no-version / empty-version variants in the de view)
- Bottom `Delete map` → `delete-modal-card-multi.html` (the most distinctive screen — see V2 hallmark below)
- Topbar `Import` → `import-wizard-preview.html`
- A missing-state chip in the mini-switcher (e.g. `es−`) → `create-version-stepper-step1.html`
- Footer links jump to Dashboard, Context Panel, click-targets, and the partial-version banner

The full click-target enumeration lives in `click-targets.md` — every interactive element on every frame is listed with its post-state file.

## Frames in this POC (16)

| File | Purpose |
|---|---|
| `index.html` | Full Page home, picker = en, multi-chip strips on every row |
| `full-page-de.html` | Full Page home, picker = de (semantics unchanged; current-language perspective shifts) |
| `map-detail.html` | Map detail (existing version) with inline mini-switcher + display-name editor |
| `map-detail-no-version.html` | Map detail when the current language has no version yet (mini-switcher chip is missing) |
| `map-detail-empty-version.html` | Map detail when the version exists but `UrlMapping` is empty |
| `create-version-stepper-step1.html` | Stepper modal — Step 1 of 3, Path choice (Empty vs Copy-from) |
| `create-version-stepper-step2-empty.html` | Stepper — Step 2 of 2 Confirm, Empty path |
| `create-version-stepper-step3-copy.html` | Stepper — Step 2 of 3 Source, Copy-from path with filtered source combobox |
| `delete-modal-card-multi.html` | **V2 most distinctive screen** — two cards each showing post-deletion chip strip |
| `delete-modal-card-single.html` | Delete card pattern, single-language edge case (AC-8.6) |
| `import-wizard-preview.html` | Import preview, all rows collapsed (tenant + bundle chip strips, action picker) |
| `import-wizard-preview-expanded.html` | Same screen with `marketing-campaigns` expanded showing per-language diff |
| `dashboard-widget.html` | Dashboard widget with twin tiles per stat + Languages-with-content tile |
| `context-panel-en.html` | Context Panel with strong-info banner (en or unavailable copy variant) |
| `context-panel-de.html` | Context Panel with Pages-aware banner naming `de` |
| `partial-version-banner.html` | Recovery state from ADR-0021 partial-copy failure with 2 CTAs |

## What this POC is NOT

- **Not a functional prototype** — there is no state machine, no SDK calls, no localStorage picker reactivity. The picker `<select>` `onchange` only navigates between `index.html` ↔ `full-page-de.html` to demonstrate the switch.
- **Not the production component contract** — class names mirror `@blok/*` primitives so engineers can grep them, but the implementation will compose real `@blok/badge` / `@blok/dialog` / `@blok/select` etc., not these hand-written reproductions.
- **Not exhaustive** — error states, loading skeletons, dirty-edit-protection dimming, the toggle-to-stack Dashboard at < 600px, and the 8+ language overflow popover are described in the spec but not separately illustrated in HTML (they reuse already-spec'd patterns).

## Theme + typography continuity

`theme.css` is copied **verbatim** from `pocs/poc-v1/theme.css` — Blok Nova preset semantic tokens, Geist Sans + Geist Mono via the same npm CDN. Dark/light flip via the same `theme-toggle.js` button (top-right, cycles System → Light → Dark).

## Color-emoji codepoint discipline

V2 leans heavily on state chips. The deleted-preview state uses `✕` (U+2715, monochrome glyph) — **never** `❌` (U+274C, color emoji). The empty-version state uses `◌` (U+25CC); the no-version state uses `–` (U+2013); the filled state uses `●` (U+25CF). All respect `color: currentColor` and theme flips. Per the `sitecore:blok-theming` skill color-emoji-poison rule (carried from QuickCopy 2026-04-27 friction log).
