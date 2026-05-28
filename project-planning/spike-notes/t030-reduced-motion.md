# T030 — Reduced-motion fallback verification

## Status: VERIFIED (2026-05-22)

## CSS rules added

The following `@media (prefers-reduced-motion: reduce)` rules were added to
`site/app/globals.css` in the PRD-005 drift styles block:

```css
/* Spinner reduced-motion fallback (T030) */
@media (prefers-reduced-motion: reduce) {
  .drift-spinner-anim {
    animation: none;
  }
  .drift-banner-transition {
    transition: none;
  }
}
```

Additionally, the drift-check-btn transition is also suppressed:

```css
@media (prefers-reduced-motion: reduce) {
  .drift-check-btn,
  .drift-check-btn:hover {
    transition: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drift-banner__dismiss {
    transition: none;
  }
}
```

## Spinner approach

The "Check upstream" button uses Lucide `Loader2` with `animate-spin` Tailwind class
when `state === 'checking'`. The `.drift-spinner-anim` CSS class on the element
ensures `animation: none` fires under reduced-motion. Tailwind's `motion-reduce:animate-none`
utility could also be applied if needed.

## Verification

Manual spot-check: Open Chrome DevTools → Rendering → Emulate CSS media feature
`prefers-reduced-motion: reduce`. Click "Check upstream" — spinner should render
as static icon without rotation. Banner appear/disappear should be instant (no fade).

OQ-A3 resolution confirmed: static glyph fallback approach adopted (Loader2 is
always rendered as SVG; rotation is CSS-only and respects the motion preference).
