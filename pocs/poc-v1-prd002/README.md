# PRD-002 V4 Refined POC — Redirect Manager

PRD-002 refined V4 POC. **Visual source of truth for implementation.** When this POC and the design spec at `project-planning/ui-design/ui-design-20260513T194022Z-v1.md` disagree on a visual detail, the POC wins.

## Open it

```bash
npx serve products/redirect-manager/pocs/poc-v1-prd002/
```

Or double-click `index.html` to open via `file://`.

## Frames

| File | Purpose |
|---|---|
| `index.html` | Visually-quiet POC navigation index (NOT a redesigned IntroPage — IntroPage is out of scope per D6). Links to all surface frames. |
| `full-page.html` | Full Page workspace (1280px). Plumes + workspace hero + 4-tile stat strip + map detail + decorative hero CTAs (toast onClick per ADR-0030). |
| `context-panel.html` | Context Panel single-match state (360px). Hero count header + inline QuickRedirectForm (RedirectType disabled) + 1 matched row. |
| `context-panel-multi-match.html` | Context Panel multi-match state (360px). Adds multi-match dropdown affordance per OQ-9 commitment; 3 matched rows. |
| `context-panel-no-match.html` | Context Panel no-match / create-new state (360px). RedirectType select enabled + auto-name preview. |
| `dashboard-widget.html` | Dashboard Widget compact tile (480px). Preview Data banner + hero stat + sparkline + 3 real tiles + 4th mock tile + top destinations (en-only) + recently-shipped + monochrome "all healthy" badge. |

## Key reconciliations applied (from architecture § 11.2)

- "Edge caches refreshed across 7 languages" hero subline **dropped** (contradicts ADR-0010 + ADR-0023; FR-R11).
- Full Page table `status` column **removed entirely** (RedirectType column already carries state; FR-R4 + D7).
- Left rail `--draft` dot variant **dropped** — single static `--primary` color for every map row.
- Context Panel RedirectType select **adds `Server Transfer`** as 3rd option (V4 was missing it).
- Context Panel matched-row `status-pill` **removed** (no Active/Draft labels anywhere).
- Context Panel "unpublished" meta **removed**.
- Dashboard Widget POC-only nav bar + helper text + eyebrow **removed**.
- All `/de/...` mock paths **rewritten** to en-only (`/products`, `/black-friday`, `/campaigns/promo`, `/sale`, `/early-access`).
- Full Page hero CTAs (`View activity`, `Publish all`) **kept**, rendered decorative — onClick shows Sonner-style toast per ADR-0030.
- Context Panel quiet header **replaced** by hero `<h1>` count header `"N redirects point here."` with gradient-clip text.
- Context Panel button → modal flow **replaced** by always-visible inline `QuickRedirectForm` (ADR-0028 Option A — `AddRedirectModal` removed entirely).
- `PreviewDataBanner` **mounted** at the top of Full Page and Dashboard Widget; NOT on Context Panel (no mocks there).
- PRD-000 `FootnoteSeparated` "Redirect counts only..." line **removed** (consolidated into Preview Data banner per AC-R3.7).
- "all healthy" badge **uses monochrome inline SVG check glyph** (not emoji `✅` — respects theme color per `sitecore:blok-theming` Color-emoji codepoints note).
- Recently-shipped rows show RedirectType badge only (no Active pills).
- Dashboard 4th tile (mock) added for `Recently shipped` count (per prompt requirement: 3 real + 4th mock).

## CSS file boundaries

- `theme.css` — Blok Nova preset tokens (copied verbatim from `pocs/poc-marketing-v4-blok-elevated/theme.css`). **NO invented hex outside this file.**
- `elevated.css` — site-wide V4 utilities + the 15 `--v4-*` design contract variables (R-13 mitigation). Loaded by every frame.
- `elevated-plumes.css` — Full-Page-only motion utilities. **Loaded ONLY by `full-page.html`** per ADR-0027 + plume-CSS-import-boundary structural guard.
- `surfaces.css` — surface-specific layouts (Full Page, Context Panel, Dashboard Widget, index). Loaded by every frame.

## JS file boundaries

- `theme-toggle.js` — light/dark/auto theme switcher (POC stand-in for production `ThemeSwitcher`).
- `icons.js` — monochrome inline SVG icon helpers (NEVER emoji codepoints).
- `script.js` — kinetic letter reveal + count-up + bar-fill + toast helper + multi-match dropdown re-bind + decorative-CTA toast wiring + quick-form submit stub.

## Voice copy (3 marketing zones — operator may override during /architect)

1. **Full Page workspace hero headline** — `"Eight active maps, all healthy."` (`Eight` = real activeMapsCount; `"all healthy"` = mocked).
2. **Dashboard Widget headline** — `"Your redirect operations, at a glance."`.
3. **Context Panel hero count header** — `"N redirects point here."` (singular: `"1 redirect points here."`; zero: `"0 redirects point here."` + subline guidance).

## Accessibility

- WCAG 2.1 AA target. Focus-visible ring carries from PRD-000 theme.
- All decorative motion respects `prefers-reduced-motion: reduce` (both CSS @media and JS early-return).
- Status icons are inline SVG with `currentColor` (never emoji — emoji codepoints render as platform bitmaps that ignore theme color).
- Multi-match dropdown uses native `<select>` for full keyboard + screen-reader support.
- `data-preview-mock="true"` paired with `PreviewDataBanner` (FR-R3 structural guard).

## Click navigation

See `click-targets.md` (58 click-target rows across 6 frames) for the exhaustive mapping of every interactive element to its post-state file or in-place outcome.

## What this POC is NOT

- It is NOT a redesigned IntroPage at `/` (out of scope per D6).
- It is NOT a functional prototype — no real SDK calls, no real CRUD against Sitecore.
- It is NOT a partial-version banner placeholder (PRD-001 was cancelled per ADR-0023).
- It is NOT production code — placeholder text, mock data, no build step required.
