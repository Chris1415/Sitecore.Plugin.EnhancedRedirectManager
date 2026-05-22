# ADR-0040: Mode is transient UI state; simulator is async (Promise-returning)

## Status

Accepted

## Context

Two questions were resolved together because they share the same underlying tension: how much to lean on storage / synchrony to make the feature feel "simple."

**Question 1 — where does regex/URL mode live?**

The Content SDK proxy auto-detects per row at runtime via `isRegexOrUrl()` — there is no Sitecore-side flag, no per-row storage. PRD-004 introduces an explicit Pattern / Regex mode toggle in the edit modal as an authoring affordance. Where does the operator's choice live? Three options:

1. **Persist in Sitecore.** Requires either a new template field (breaks stock template parity — exactly what PRD-001's cancellation made us avoid) or an encoding sentinel in the existing `UrlMapping` field (e.g. `R:^/blog/.*=` vs `U:/old=`). The proxy never reads such a flag; we'd encode it for ourselves and strip it on read.
2. **Persist locally** (localStorage, IndexedDB). Avoids template changes; couples the operator's authoring intent to their browser. Cross-machine drift; cross-operator drift.
3. **Transient — UI-only, never stored.** Toggle defaults to Pattern on every modal open; operator switches manually if they want regex affordances. Inline hint surfaces when `isRegexOrUrl()` would interpret the pattern as regex but the toggle shows Pattern (or vice versa).

Operator preference (captured 2026-05-19): manual mode, default Pattern, no auto-detect on read.

**Question 2 — sync or async simulator?**

The simulator wraps `regex.test()` calls in `Promise.race` against a 100ms timeout (ADR-0039). That alone forces some async surface. The PRD's initial draft said the simulator was "fully synchronous from the caller's perspective using a microtask-pumped Promise" — but that phrasing describes a hybrid that doesn't actually exist in JavaScript. A truly sync-feeling timed test is impossible: the timeout requires the event loop. The critical review caught this contradiction.

The choice is: commit to a `Promise<SimulationTrace>` return, or remove the per-row timeout (and lose ADR-0039's safety). The latter regresses the safety story; the former is honest.

## Decision

**Mode = transient UI state.**

- Mode is a local component-state field in the edit modal; not persisted anywhere
- Default on every modal open: **Pattern**
- Operator manually switches via the segmented toggle
- When `isRegexOrUrl(source) === 'regex'` but mode is Pattern (or vice versa), render an inline hint with a one-click "Switch mode" button; hint is `role="status"` (advisory) and never blocks save

**Simulator = async (Promise-returning).**

- `simulate(input): Promise<SimulationTrace>` — honest about the underlying async machinery
- UI side: while the Promise is pending, the Test button shows a loading spinner; on resolve, the trace cards animate in with a visual stagger (one card per ~40ms)
- `prefers-reduced-motion: reduce` falls back to instant render of all cards at once
- **Not a streaming model** — the simulator computes the full trace synchronously where it can, awaits the per-row timeouts where it must, and resolves once. The UI does not render cards as they become available; it renders all at once with animation

## Consequences

**Easier:**
- Zero Sitecore data-model changes — PRD-004 ships without coordinating with content engineers
- Template parity preserved — same risk class that bit PRD-001 is avoided here
- Mode UX is operator-driven and predictable: every modal open is a clean slate
- Promise-based simulator is the honest model — engineers don't have to invent a synchronous-async hybrid
- The hint pattern reuses existing inline-message styling (PRD-002) — minimal new design

**Harder:**
- Mode is not preserved across sessions. Operator authors a regex row today, reopens it tomorrow, sees Pattern selected (with the inline hint nudging them to switch). Slight UX friction, accepted as the cost of zero-storage simplicity. Worth revisiting if operators complain about repeated re-selection on heavy authoring sessions.
- Async simulator means components consuming the simulator need an "isLoading" state. The Test surface owns this; the edit-modal live tester (US-R1 AC-R1.4) also has to deal with it — incrementally re-test on every keystroke could fire many pending Promises. Mitigation: debounce the live tester input by 250ms; abort prior Promise on new keystroke.
- Inline hint copy quality matters more than usual — it's the only nudge linking manual mode to runtime semantics. Bad copy = operator confusion. T3 must validate the hint copy with the operator.

## Amendment — 2026-05-21 (post-implementation simplification)

Following operator visual smoke testing, the **inline mode-mismatch hint was removed** from `EditRowModal`.

**Original decision (still binding):** Mode = transient UI state, default Pattern on every open, never stored.

**Amended:** The inline hint (AC-R2.1, AC-R2.2, FR-A4) is deferred to Future Opportunities (FO-14 in PRD-004 § 15). The `isRegexOrUrl()` import in `EditRowModal.tsx` is removed. The `detectedMode` local state and `ModeMismatchHint` subcomponent are removed.

The save-time validation (FR-A5, AC-R1.5, AC-R1.6) is retained as-is. `countCapturingGroups()` is retained for the group-count cross-check.

**Rationale:** Operator preferred a simpler modal; hint added cognitive load without clear operator benefit in initial use. Can be reintroduced in a later PRD.

## Date

2026-05-20
