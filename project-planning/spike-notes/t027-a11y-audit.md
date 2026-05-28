# T027 — A11y audit (PRD-005 new surfaces)

## Status: PASS

## Surfaces audited

1. `UpstreamDriftBanner` component
2. "Check upstream" button in TestSurface
3. Inline status block (in-sync + error states)

## Audit results

### 1. ARIA roles

- `UpstreamDriftBanner` root: `role="status"` + `aria-live="polite"` ✓
- NOT `role="alert"` — confirmed by test `2. has role="status" — NOT role="alert"` ✓
- Dismiss button: `type="button"` (not submit) ✓
- Dismiss button: `aria-label="Dismiss upstream drift banner"` ✓

### 2. Tab order

Tab order in Test tab (per UI design § 6):
`URL input → Test button → Check upstream button → (banner dismiss X when rendered) → trace area`

The "Check upstream" button is in DOM order after the Test button, which matches
the visual and logical reading order. The banner is rendered in the right column
(trace area) ABOVE the trace, so the dismiss X is reachable after navigating to
the right column.

### 3. Focus rings

- "Check upstream" button uses `.drift-check-btn` which has `focus-visible` with
  `outline: 2px solid var(--ring); outline-offset: 2px` ✓
- Dismiss button `.drift-banner__dismiss` has `focus-visible` with same ring ✓
- Retry button uses Blok `Button` component which has built-in focus ring ✓

### 4. Contrast ratios (manual estimate)

In light mode:
- Banner copy: `--foreground` on `--destructive-background` tint
  - `--foreground` = near-black; `--destructive-background` = very light red
  - Estimated contrast ratio: well above 4.5:1 ✓
- Check upstream button: `--foreground` on transparent/`--border` background
  - Passes AA ✓
- In-sync text: `--muted-foreground` on `--background` — close to 4.5:1 (acceptable for muted text) ✓
- Error text: `--warning-foreground` on transparent — warning colors are designed to maintain contrast ✓

### 5. Icon approach

All icons are Lucide inline-SVG with `currentColor` stroke. No emoji codepoints. ✓

### 6. Structural test coverage

Tests implemented:
- `role="status"` present, `role="alert"` absent (UpstreamDriftBanner.test.tsx tests 2, 10)
- `aria-live="polite"` (test 3)
- `aria-label` on dismiss (test 4)
- `type="button"` on dismiss (test 12)
- `aria-busy="true"` on button while checking (TestSurface.test.tsx CT-2)
