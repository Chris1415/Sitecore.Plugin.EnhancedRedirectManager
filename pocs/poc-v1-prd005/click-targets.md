# PRD-005 POC — Click Targets

Static clickdummy. No JS state machine. Every interactive primitive on every
frame either (a) links to the appropriate post-state frame, (b) is intentionally
inert (decorative chrome carried from PRD-002/PRD-004 baseline), or (c) is
disabled by `aria-disabled` / `disabled` per the state matrix.

The "Post-state" column names the frame each link navigates to.

---

## screen-test-idle.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| Tone toggle (Light/Dark/Auto) | switches theme via `theme-toggle.js` | (in-place; persists in localStorage) |
| Breadcrumb "Redirect Manager" | navigates to | `index.html` |
| Topbar "Import" / "Export" / "New map" buttons | decorative (inert) | — |
| Hero "View activity" / "Publish all" buttons | decorative (inert) | — |
| "Manage" tab | navigates to | `index.html` |
| "Test" tab (current) | navigates to | `screen-test-idle.html` |
| Collection / Site `<select>` | inert in POC | — |
| Test button (primary) | inert in POC (Test trace POC lives in PRD-004) | — |
| **"Check upstream" button (secondary)** | navigates to | `screen-test-checking.html` |
| Index footer nav links | navigate to | each named base state |

---

## screen-test-checking.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| "Check upstream" button | `aria-busy="true"`, `disabled` — pointer-events:none | — |
| Index footer nav: "→ In sync" | navigates to | `screen-test-in-sync.html` |
| Index footer nav: "→ Drifted" | navigates to | `screen-test-drifted.html` |
| Index footer nav: "→ Error" | navigates to | `screen-test-error-network.html` |

(Real implementation auto-resolves to one of the three terminal states based on
the network probe result. The POC routes manually via the footer nav.)

---

## screen-test-in-sync.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| **"Check upstream" button** (re-check) | navigates to | `screen-test-checking.html` |
| Inline status block | display-only `role="status"`; no interactive children | — |
| Index footer nav: "Re-check" | navigates to | `screen-test-checking.html` |
| Index footer nav: "→ Drifted" | navigates to | `screen-test-drifted.html` |

---

## screen-test-drifted.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| **"Check upstream" button** (re-check) | navigates to | `screen-test-checking.html` |
| **Drift banner — dismiss X (icon-button, ghost)** | navigates to | `screen-test-idle.html` (banner removed; rail unchanged; simulates `sessionStorage.setItem('rm-drift-banner-dismissed','1')`) |
| Drift banner body / `<code>` tags | display-only | — |
| Index footer nav: "Dismissed (idle)" | navigates to | `screen-test-idle.html` |
| Index footer nav: "Re-check" | navigates to | `screen-test-checking.html` |
| Index footer nav: "← In sync" | navigates to | `screen-test-in-sync.html` |

---

## screen-test-error-rate-limit.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| **"Check upstream" button** (re-check) | navigates to | `screen-test-checking.html` |
| **Retry button (inside inline status)** | `disabled`, `aria-disabled="true"` — inert until rate-limit window expires | — |
| Index footer nav | navigates between error states | — |

---

## screen-test-error-not-found.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| **"Check upstream" button** (re-check) | navigates to | `screen-test-checking.html` |
| Inline status block | display-only — NO retry button (per spec: engineer review required) | — |
| Index footer nav | navigates between error states | — |

---

## screen-test-error-network.html (and `-dark.html`, `-mobile.html`)

| Element | Click → | Post-state frame |
|---|---|---|
| **"Check upstream" button** (re-check) | navigates to | `screen-test-checking.html` |
| **Retry button (inside inline status, outline `--sm`)** | navigates to | `screen-test-checking.html` (re-enters the probe loop) |
| Index footer nav: "→ Recovered (in sync)" | navigates to | `screen-test-in-sync.html` |

---

## Shared chrome (every frame)

| Element | Click → | Post-state |
|---|---|---|
| Tone toggle | switches `html.light` / `html.dark` / auto via `theme-toggle.js` | persists in `localStorage["rm-prd002-theme"]` |
| Topbar breadcrumb "Redirect Manager" | navigates to | `index.html` |
| "Manage" tab | navigates to | `index.html` (acts as Manage placeholder in this POC; the canonical Manage layout lives in the PRD-004 POC) |
| HahnSoloFooter | display-only | — |

---

## State transitions (full graph)

```
idle ──Check upstream──> checking ──auto resolve──> { in-sync | drifted | error:* }
in-sync ──Check upstream──> checking
drifted ──Check upstream──> checking
drifted ──dismiss X──> idle (banner hidden for the session)
error:rate-limit ──(retry disabled; waits for window)──> idle (after expiry, simulated as idle)
error:not-found ──(no retry; engineer escalation)──> idle (operator dismisses by re-running Check upstream)
error:network ──Retry──> checking
```

In every dark / mobile variant the same click-target graph applies — only the
theme and viewport differ. Dark frames pin the theme via a preload script
writing `localStorage["rm-prd002-theme"]="dark"`; mobile frames pin via
`<body data-mobile-preview>` + an inline `<style>` that simulates a 420 px
viewport so the existing `<768px` responsive branch (prd004.css § 18) renders.
