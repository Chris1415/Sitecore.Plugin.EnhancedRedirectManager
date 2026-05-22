# POC v1 — PRD-004 "Trace & Tame" (Redirect Manager)

Self-contained HTML/CSS clickdummy for PRD-004. Visually polished baseline the operator can open in a browser to evaluate look, feel, and flow before any code is written.

## Post-write amendment 2026-05-20

This POC was rewritten in place 2026-05-20T13:00 to reflect three design pivots that landed after the original variant was generated:

1. **`EditRowModal` replaces standalone `RowEditForm`.** All five `rowedit-*.html` frames are now **modal overlays** on top of a dimmed `index.html` shell — a centered Blok dialog opens on row click; close button + click-outside + Esc all return to Manage. Map-level fields (`RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage`) are no longer in the modal — they remain in the existing map-settings UI.
2. **Two-column Test surface with sticky scope picker.** All `test-*.html` frames now render as a `.test-surface-twocol` CSS grid (360px sticky left rail + flex-1 right area). The left rail carries three cascading `@blok/select` instances (Collection → Site → Map(s)), URL input, locale, and Test button. Trace cards live in the right column.
3. **Simulator scope is per-picked-maps, not tenant-wide.** "Rows considered" only enumerates rows from picked maps. Empty-state copy updated to *"Pick a collection, site, and at least one map to start testing."* — no more "Try a sample URL" CTA. New frames `test-scope-collection-only.html`, `test-scope-site-loading.html`, and `test-scope-stale-localstorage.html` cover the cascading picker states.

The original 5-snippet library, motion budget (180 ms tab cross-fade + 40 ms card stagger), theme parity, monochrome SVG icons, and `color-mix(in oklch, var(--token) ...)` accent discipline are unchanged.

- **Source spec:** `products/redirect-manager/project-planning/ui-design/ui-design-20260520T080000Z-v1.md`
- **Visual base:** PRD-002 V4 Blok Elevated, carry-forward (theme.css, elevated.css, surfaces.css, icons.js, theme-toggle.js, script.js — copied verbatim 2026-05-20).
- **Surfaces in `prd004.css`:** Manage/Test workspace tabs, TestSurface, TraceCard variants, ResultCard (match / unmatched / diagnostic-incomplete), TestEmptyState, **EditRowModal + overlay + dimmed-shell**, **two-column Test grid + sticky scope-picker rail + scope-picker skeleton/error/cascading-disabled states**, SnippetLibrary, CaptureGroupChipStrip, InlineHint, SaveErrorMessage, RowsConsidered card, LiveRegexTester, TraceFooter, mobile-<768px scope-picker accordion.

## Start here

Open **`index.html`** in a browser via `file://` (or `npx serve` from this folder).

From `index.html` you can:

1. Click any **row** in the redirect table → the **EditRowModal** opens on a dimmed backdrop. Click outside the modal, click ✕, or click Cancel → return to Manage.
2. Click the **Test** tab (top, right of "Manage") → walks through the two-column Test surface (empty → scope picker stages → matched).
3. Use the **Light / Dark / Auto** toggle (top-right) on every frame — theme parity is part of the design contract.

## Frames

| File | What it demonstrates | Key spec anchor |
|------|----------------------|-----------------|
| `index.html` | Canonical "before" baseline. Manage tab active; rows clickable to open EditRowModal. | § 2 Layout & structure (workspace tab placement above two-pane); amendment Change 1 |
| `test-empty.html` | TestSurface S6 — Test tab first visit, **no scope picked**. Two-column layout: empty scope picker on left, scope-precondition empty state on right. | § 3 S6, § 4.10 amended TestEmptyState |
| `test-scope-collection-only.html` | S12 — Collection picked ("Marketing"); Site picker showing initial skeleton; Map picker cascading-disabled. | § 3 S12, § 4.12 ScopePicker cascading-disabled state |
| `test-scope-site-loading.html` | S13 — Collection picked; Site picker showing `listSites` mid-fetch skeleton. | § 3 S13, § 4.12 loading state |
| `test-scope-stale-localstorage.html` | S14 — Persisted scope's IDs no longer resolve; inline info alert "previous selection no longer available — pick again" above empty pickers; auto-dismisses on first picker change (OD-7 default). | § 3 S14, § 4.12 persisted-stale state, § 6 OD-7 |
| `test-loading.html` | TestSurface S7 — scope picker filled (Marketing → Production → Blog Migration 2026) + URL filled + Test clicked; right column shows 6 skeleton trace cards. Auto-advances after 2.4s. | § 3 S7, § 4.4 trace skeleton |
| `test-matched.html` | TestSurface S8 — full trace + matched ResultCard with "Open this rule in Manage →" CTA (deep-links to EditRowModal). | § 3 S8, § 4.5 ResultCard match |
| `test-unmatched.html` | TestSurface S9 — RowsConsidered (collapsed, 5 of 20 within Blog Migration 2026) + unmatched ResultCard with "Add a rule for this URL" CTA. | § 3 S9, § 4.4 rows-considered card, amendment Change 3 (per-map scope) |
| `test-unmatched-expanded.html` | RowsConsidered expanded to 20 + footer "+ 122 more rows in Blog Migration 2026". | § 3 S9 expansion, AC-T2.2 |
| `test-diagnostic-incomplete.html` | TestSurface S10 — 3s cap hit; final card replaced with warning-tinted "Diagnostic incomplete — evaluated 142 of 487 rows in Legacy URL Cleanup". | § 3 S10, § 4.5 result diagnostic-incomplete |
| `test-timeout-row.html` | TestSurface S11 — row 5 evaluation hit per-row time cap; warning-bordered row card with pattern `^(a+)+$` and copy "pattern too slow — runtime would also stall here". | § 3 S11, § 4.4 evaluate-row timeout variant |
| `rowedit-pattern.html` | **EditRowModal** S2 — Pattern mode (default per FR-A2). Modal overlay on dimmed Manage shell. Footer Cancel + Save row. No map-level fields. | § 3 S2, § 4.11 EditRowModal, FR-A2 |
| `rowedit-regex.html` | **EditRowModal** S3 — Regex mode. Snippet library expanded (5 PM-proposed snippets with `* PM-proposed; pending T3 validation` flag), capture-chip strip below destination. | § 3 S3, § 4.6 SnippetLibrary, § 4.7 CaptureGroupChipStrip, A-UI-6, A-UI-7 |
| `rowedit-hint-pattern-detected-regex.html` | **EditRowModal** S4 — Pattern mode active but source `^/blog/.*$` contains regex chars. Muted inline hint with `role="status"` + "Switch to Regex →" link button. | § 3 S4, § 4.8 InlineHint, FR-A4 |
| `rowedit-save-error.html` | **EditRowModal** S5 — Save attempted with invalid regex `(unclosed group`. Modal stays open; source input gets destructive border + `aria-invalid="true"`; inline `role="alert"` error renders below. | § 3 S5, § 4.9 SaveErrorMessage, AC-R1.5 |
| `rowedit-sample-tester.html` | **EditRowModal** Regex + live sample-URL tester open. Sample URL `/blog/my-post` matched against `^/blog/(.+)$` showing `match · $1 = "my-post"`. | § 4.10 LiveRegexTester (MVP-deferable) |

## Files

| File | Purpose | Source |
|------|---------|--------|
| `theme.css` | Blok Nova preset tokens (light + dark + system). | Carry-forward from PRD-002 (verbatim) |
| `elevated.css` | V4 utilities (`.elev-glass-surface`, `.elev-hover-lift`, `.elev-btn`, `.elev-eyebrow`, etc.). | Carry-forward from PRD-002 |
| `surfaces.css` | Surface-specific layouts (Manage workspace, FullPage chrome, http-code chip, `.glyph`). | Carry-forward from PRD-002 |
| `prd004.css` | **NEW.** Workspace tabs, TestSurface (legacy single-column + new two-column grid), TraceCard, ResultCard, EmptyState, RowEditForm mode toggle, SnippetLibrary, CaptureChipStrip, InlineHint, SaveError, RowsConsidered, sample tester, TraceFooter. **Amendment 2026-05-20:** added `.edit-row-modal-overlay`, `.edit-row-modal`, `.fp-shell--dimmed`, `.test-surface-twocol`, `.test-rail`, `.scope-picker` family + skeleton shimmer + error + cascading-disabled, mobile <768px accordion. All accents composed via `color-mix(in oklch, var(--<token>) <pct>%, transparent)`. Zero invented hex. | New for PRD-004 |
| `icons.js` | Monochrome inline-SVG icons. All use `stroke="currentColor"`. | Carry-forward from PRD-002 |
| `script.js` | Vanilla letter-reveal, count-up, bar-fill, Sonner toast, decorative CTA glue. | Carry-forward from PRD-002 |
| `theme-toggle.js` | Light/Dark/Auto persistence via `localStorage["rm-prd002-theme"]`. | Carry-forward from PRD-002 |
| `click-targets.md` | Mandatory click-target enumeration; every interactive element → its post-state file. Amended 2026-05-20 to cover modal-overlay targets + scope-picker targets + the 3 new scope-state frames. | New for PRD-004 |

## Visual constraints honored

- **Token discipline:** Every accent expression goes through `color-mix(in oklch, var(--<blok-token>) <pct>%, transparent)`. Zero invented hex outside `theme.css`. Verified by grep: no `#[0-9a-fA-F]{3,6}` outside `theme.css` and `prd004.css` shimmer keyframes (which use only `var()` references).
- **Geist Sans / Geist Mono** via the same loading mechanism inherited from PRD-002 POC.
- **Light + dark + system parity:** Every frame ships the `theme-toggle.js` floating pill (bottom-right above the HahnSoloFooter). Try toggling Dark → every surface flips. `--primary-foreground` dark-mode contrast fix (Christian-flagged 2026-05-10) inherited via `theme.css`. Modal overlay backdrop, dimmed Manage shell, scope picker skeleton, and inline info alert all theme-aware.
- **Monochrome glyphs only:** Lucide-style inline SVG with `stroke="currentColor"`. **No emoji codepoints** anywhere — verified by grep.
- **Motion budget (ADR-0027 inheritance):**
  - **180ms tab cross-fade** — honored.
  - **40ms per-card trace stagger** — staged via `is-revealed` classes.
  - **Modal scale 0.96→1 + fade 180ms** — short-circuited under reduced-motion.
  - **Scope-picker skeleton shimmer 1.4s** — short-circuited under reduced-motion.
- **Real Blok component DOM anatomy:** Tabs use `role="tablist"` + `role="tab"` + `aria-selected`; mode toggle uses `role="radiogroup"` + `role="radio"` + `aria-checked`; **modal uses `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + `aria-describedby` + focus trap (Radix Dialog semantics)**; **scope picker selects use `aria-disabled="true"` for cascading-disabled state, `aria-busy="true"` for loading state**; inline hint is `role="status"`; save error is `role="alert"` + `aria-describedby` linked from the source input; stale-localStorage alert is `role="status"` + `aria-live="polite"`; capture-chip strip is `role="group"`.

## What this POC is — and is not

**Is:** A faithful visual ground-truth for the design contract. Open it in any browser; the typography, color, spacing, layout, responsive behavior, dark/light parity, modal overlay anatomy, and two-column scope-picker layout are all production-grade.

**Is not:** A functional prototype. The simulator does not run, no Sitecore SDK is involved, no real fetch happens. Test button → loading frame → matched frame is a hardcoded `<meta refresh>` sequence to demonstrate the visual transition. The scope picker dropdowns are stand-ins that navigate to the next demo frame; production implementation will wire them via Radix `@blok/select`. Snippet pills, capture chips, modal save buttons, and "Copy as JSON" trigger decorative Sonner toasts only.

## Handoff

- **Source spec:** `products/redirect-manager/project-planning/ui-design/ui-design-20260520T080000Z-v1.md` (amended 2026-05-20T13:00; § 1 carries the amendment header; § 3 enumerates every frame including S12–S14; § 4.11 covers `EditRowModal`; § 4.12 covers `ScopePicker`).
- **ADR-0043** records the amendment: EditRowModal replaces RowEditForm; Test surface is two-column with sticky scope picker; simulator scope is per-picked-maps.
- **Next step:** Operator confirms this amended POC. Once confirmed, the run manifest's `ui_design.selected_variant_path` continues to point at the same spec file (still v1 since `ui_variants: 1`). The POC at `pocs/poc-v1-prd004/` is the canonical visual reference. `/task-breakdown` consumes spec + POC.
- **POC supersedes nothing.** Lives alongside `pocs/poc-v1-prd002/` (PRD-002 V4 baseline). Operators can A/B Manage tab (open `pocs/poc-v1-prd002/full-page.html`) against the new workspace-tab-wrapped Manage tab in this POC's `index.html` to verify "operators must not perceive a 'new screen' — they must perceive an extension of the same workspace" (PRD-004 § 1 goal 1).
