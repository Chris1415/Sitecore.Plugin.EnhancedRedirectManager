# ADR-0027: Mixed motion budget — full V4 motion on Full Page; quieter on Context Panel and Dashboard Widget

## Status

Accepted

## Context

V4 Blok Elevated (ADR-0024) ships a rich motion language: drifting `--primary`/`--info` plumes on a 28-second loop, gradient-clip text on hero headlines, kinetic letter reveals on initial load (~28ms stagger across characters), hover-lift cards with primary-tinted glow, count-up animations on stat numbers, theme-aware shimmer on certain accent elements. The motion is the marketing-grade signal — without it, V4 reads as static and the elevation pitch is meaningfully weaker.

But not every Sitecore Marketplace surface should carry the same motion budget. The three extension-point routes have very different contexts:

- **Full Page** — operator's main workspace. Roomy (~1280px viewport in Cloud Portal). Used in dedicated authoring sessions. Operator can absorb premium motion as polish; it doesn't interrupt task flow.
- **Context Panel** — narrow (~360px), embedded in Pages alongside the page-authoring canvas. Operator is in *do-the-work* mode, focused on the page they're editing. Drifting plumes in the corner of their visual field would actively distract.
- **Dashboard Widget** — compact (~480px wide), embedded in a Cloud Portal dashboard board. Operator is in *scan-multiple-widgets* mode. Plumes drifting on one widget while others stay static would draw attention away from peer widgets.

The brain-dump (D3) and the operator's directive on 2026-05-13 explicitly accepted a **mixed motion budget**: full V4 motion on Full Page; quieter motion on Context Panel + Dashboard Widget.

What "quieter" means needs an explicit decision so structural enforcement is possible. Without enforcement, a developer can trivially import the plume CSS into Context Panel and the smoke gate may miss it depending on viewport screenshot timing.

## Decision

**Mixed motion budget enforced per surface:**

### Full Page — full V4 motion budget

- **Drifting plumes** — two `radial-gradient` plumes (one `--primary` 18%, one `--info` 14%) absolutely-positioned in the workspace backdrop; `@keyframes` translate + opacity drift on a 28-second loop. Animation pauses under `prefers-reduced-motion: reduce`.
- **Gradient-clip text on hero headlines** — Geist Sans 700 at hero scale; `background: linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 55%, var(--info)))` + `background-clip: text` + `color: transparent`. Theme-switching automatic.
- **Kinetic letter reveals** — hero headline characters split into spans; CSS transitions stagger opacity + `translateY` on initial mount at ~28ms per character (~800ms total). Disabled under reduced-motion.
- **Hover-lift cards** — `translateY(-2px) scale(1.005)` + primary-tinted shadow (`box-shadow: 0 12px 32px color-mix(in oklch, var(--primary) 14%, transparent)`) on map cards + Blok primitives. Easing `cubic-bezier(0.16, 1, 0.3, 1)`. Always active.
- **Count-up on stat numbers** — initial-render-only count-up using `requestAnimationFrame` + `easeOutCubic` over 1200ms. Disabled under reduced-motion (numbers render at final value immediately).
- **Status pill pulse** (V4-introduced; tiny opacity oscillation on `status-pill--active` analogue, now removed since Active/Draft was dropped per ADR-0025; this bullet superseded but kept here to record the absence is intentional).

### Context Panel — quieter motion budget

- **Hover-lift only.** Inline-quick-add form's Add button gets a subtle hover; matched-redirect rows get a faint elevation on hover.
- **No drifting plumes.** Context Panel CSS does NOT import plume utilities.
- **No kinetic letter reveals.** The hero `<h1>` count header (introduced by V4 — *"N redirects point here"*) renders statically. Theme transitions work normally.
- **Gradient-clip text on the hero `<h1>` count is OK** — gradient-clip is static colour treatment, not motion.
- **No count-ups.** Count number in the hero header renders at final value immediately.

### Dashboard Widget — quieter motion budget

- **Hover-lift only.** Tiles + rows in the top-destinations list + Recently-shipped rows get subtle hover.
- **No drifting plumes.** Dashboard Widget CSS does NOT import plume utilities.
- **No kinetic letter reveals.** Hero stat number (mocked per ADR-0025) does not letter-reveal.
- **Count-up on hero stat number IS allowed.** The hero stat is the centrepiece of Dashboard Widget; count-up animation is essential for the marketing-grade impression. Disabled under reduced-motion.
- **Sparkline gradient stroke renders statically.** No animated path-draw. (Architect may revisit — a one-shot path-draw on initial render is acceptable if it doesn't loop.)
- **Gradient-clip text on the hero stat IS allowed** — gradient-clip is static colour treatment.

### Enforcement

**Two-layer structural enforcement** so the contract is grep-checkable:

1. **CSS-import boundary.** The plume CSS lives in a dedicated module (e.g. `site/styles/elevated-plumes.css` or `site/styles/full-page-motion.css`). Only Full Page route source files (under `site/app/full-page/`, `site/components/full-page/`) import this module. A new structural guard greps for plume-CSS imports outside the Full Page subtree and fails the build if found.
2. **Kinetic-letter-reveal selector boundary.** The kinetic-reveal JS / CSS keys off a class like `.hero-reveal-letters` or a `data-reveal` attribute. The structural guard asserts this class/attribute appears only in Full Page route source.

The host-frame smoke gate (m2 in PRD-002 § 3) catches violations visually as a backup. The structural guard catches them at build time.

### Reduced-motion respect — non-negotiable across all surfaces

Every `@keyframes` block in `site/` source MUST have a corresponding `@media (prefers-reduced-motion: reduce)` rule that disables the animation OR be in a class that's universally suppressed by the reduced-motion query. A new structural guard greps for `@keyframes` blocks and asserts pairing. Failed pairing fails the build.

This applies regardless of surface — even hover-lift transitions stop under reduced-motion (transition duration becomes ≤50ms or `none`). Operator with reduced-motion preference experiences a polished but completely still V4 redesign.

## Consequences

**Easier:**

- Operator with reduced-motion preference (vestibular sensitivity, slow hardware, or simple preference) gets a clean static experience — no jarring motion, no surprise pulses.
- Context Panel + Dashboard Widget remain task-focused surfaces. Operators working in Pages with the Context Panel open don't have peripheral drift competing with their page-authoring canvas.
- Full Page becomes the dramatic centrepiece — the surface where operators feel the marketing-grade investment most.
- Structural enforcement makes the contract grep-checkable; future PRDs that touch any of the three surfaces inherit the boundary clearly.
- The two-layer enforcement (CSS-import boundary + selector boundary + host-frame smoke) is robust against accidental drift.

**Harder:**

- The CSS architecture must separate plume utilities from the rest of the elevated styling. A naive "everything in one elevated.css" approach won't satisfy the structural guard. Architect designs the file split at `/architect`.
- Reduced-motion testing needs an explicit assertion in the smoke gate — `host_frame_smoke` should run twice (once in normal mode, once with reduced-motion enabled) so the static fallback is verified. Adds one Playwright test variant.
- The Dashboard Widget hero stat count-up is allowed despite the "quieter" motion budget — that's an explicit carve-out that needs to be documented so future contributors don't try to remove it for "consistency."
- Drift over time across files (R-13 in PRD-002 § 13) — multiple components hard-coding 28s duration or 18px blur radius and falling out of sync. Mitigated by the design-token CSS variable set defined in one place (per ADR-0024 + PRD-002 § 11 Design contract values).

**Neutral:**

- The mixed motion budget does not affect SDK contracts, GraphQL fields, or Cloud Portal Test App registration.
- The boundary is per-surface (the 3 extension-point routes); it does not apply to the IntroPage `/` (out of scope per ADR-0024) or to any future routes.

## Date

2026-05-14
