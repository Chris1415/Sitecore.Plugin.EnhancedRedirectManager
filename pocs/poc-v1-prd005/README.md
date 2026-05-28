# PRD-005 POC — "Quiet Diagnostic"

Single-variant POC clickdummy for **PRD-005 Upstream proxy drift detection** in the Redirect Manager Marketplace app. The design direction is **Quiet Diagnostic**: a chrome-neutral, muted-foreground micro-surface stitched into the existing Test-tab left rail and the top of the right column. The whole drift system reads as *informational instrumentation* — never alarm. No red borders, no exclamation iconography, no new visual identity. Inherits the PRD-002 V4 Blok Elevated tokens + the PRD-004 two-column Test surface verbatim; only three small additions (Check button below Test, inline status block, muted banner) are new. Lucide glyphs are inlined as monochrome SVG with `currentColor` — never emoji codepoints (per `blok-theming` skill, "Color-emoji codepoints are CSS poison for state icons"). Light + dark + mobile (≤768 px) variants per state.

## How to open

Open `index.html` in your browser via `file://` — no build step or server is required. All assets are local. The index lists 21 state frames (7 base states × 3 theme/viewport variants), plus `click-targets.md` (the click matrix) and this README.

## Frames (21)

- **Idle:** `screen-test-idle.html` + `-dark.html` + `-mobile.html` — Check button visible in rail; no banner; no inline status.
- **Checking:** `screen-test-checking.html` + `-dark.html` + `-mobile.html` — spinner + "Checking…" label; button `aria-busy="true"` + disabled.
- **In sync:** `screen-test-in-sync.html` + `-dark.html` + `-mobile.html` — check icon + muted "In sync with `dev` (checked 2 minutes ago)"; persists until next recheck.
- **Drifted:** `screen-test-drifted.html` + `-dark.html` + `-mobile.html` — muted banner above the trace area with Info icon + dismiss X; 2 px left accent border (using `--border`, not `--destructive`); `role="status" aria-live="polite"`.
- **Error · rate-limit:** `screen-test-error-rate-limit.html` + `-dark.html` + `-mobile.html` — Info icon + "Try again in 23 minutes."; retry button DISABLED.
- **Error · not-found:** `screen-test-error-not-found.html` + `-dark.html` + `-mobile.html` — Info icon + "engineer review required"; NO retry button.
- **Error · network:** `screen-test-error-network.html` + `-dark.html` + `-mobile.html` — Info icon + "Couldn't reach GitHub. Try again."; outline retry button ENABLED.

## Token discipline

All colors / backgrounds / borders compose existing Blok semantic tokens via `color-mix(in oklch, var(--<token>) <pct>%, transparent)`. Zero invented hex outside `theme.css`. Tokens are sourced from `poc-v1-prd004/theme.css` (Blok Nova preset, copied 2026-05-14 via the `blok-theming` skill snapshot). The new CSS lives in `prd005.css` § 19–22; everything else is identical to the PRD-004 baseline.
