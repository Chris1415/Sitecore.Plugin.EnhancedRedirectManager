# ADR-0039: Regex safety via dual time-cap (100ms per row + 3s total), not Web Worker isolation

## Status

Accepted

## Context

The PRD-004 Test surface runs operator-authored regex against a list of redirect rules. A pathological regex like `(a+)+$` against a non-matching string can backtrack catastrophically and hang the JavaScript main thread for seconds to minutes. The operator clicks Test, the tab hangs, the operator force-quits — feature feels broken.

Three mitigations sit on the design table:

1. **Web Worker isolation.** Run the simulator in a Web Worker; terminate after a hard timeout. Truly isolated; main thread stays responsive. Cost: bundle complexity, message-passing types, harder debug story, worker initialization latency on first click. The Marketplace SDK environment also has constraints on Workers in iframed contexts that need verification.
2. **100ms `Promise.race` per `regex.test()` call.** Wrap each call in a Promise that loses to a 100ms timeout. Single offending row marked `outcome: 'timeout'`; other rows still evaluate. Cheap to implement. Does not bound total simulation time — on a 500-rule inventory with every row pathological, 500 × 100ms = 50 seconds.
3. **Total wall-clock cap on simulation.** Stop all evaluation after N seconds; emit a "diagnostic incomplete" trace card showing how far we got. Bounds worst case explicitly.

The PRD-004 Test surface has two use modes:
- **Match diagnosis (common).** Operator pastes a URL they expect to match; simulator finds it in the first few rows; latency dominated by row count up to the match, not by pathological patterns. 100ms per-row + early exit on match keeps this fast.
- **No-match diagnosis (uncommon but important).** Operator pastes a URL they think *should* match but doesn't; simulator must evaluate every row to produce the "rows considered" diagnostic. This is the case where a 500-rule pathological inventory blows up.

Operator preference (captured 2026-05-19, PRD-004 brain-dump D-015): regex safety is in-scope but Worker isolation is overkill for v0.

## Decision

Implement **two cooperating time caps**, no Web Worker:

1. **Per-row cap: 100ms.** Each `regex.test(candidate)` call is wrapped in `Promise.race([test, sleep(100).then(() => 'timeout')])`. On timeout, the row's trace entry records `outcome: 'timeout'` with explanatory text; evaluation continues to the next row.
2. **Total cap: 3 seconds.** Track wall-clock from `simulate()` start; before evaluating each next row, check elapsed time. If ≥3000ms, stop evaluation and emit a final trace entry: `kind: 'diagnostic-incomplete'` with `evaluatedRows`, `totalRows`, and `reason: 'wall-clock-cap'`.

Web Worker isolation is **rejected for v0**. Bundle complexity, iframe-Worker constraints in the Marketplace SDK environment, and message-passing overhead are not justified for the current authoring patterns (operators rarely author catastrophic regex on purpose; the 100ms + 3s caps are loud enough to surface the problem). Reconsider at PRD-006+ if pathological patterns become an authoring norm.

The UI cap on "rows considered" (first 20 + "+ N more" expandable; AC-T2.2) is **separate** from the computational cap — it bounds visible verbosity, not evaluation. Both are needed.

## Consequences

**Easier:**
- v0 simulator ships without Worker infrastructure — pure single-file TypeScript module
- Operator UX feels honest: pathological rows surfaced as "pattern too slow" with the offending pattern visible; pathological inventories get a clear "diagnostic incomplete after 3s" message rather than a frozen tab
- Tests can exercise both caps deterministically (mock timers; assert trace entries)
- Bundle stays within NFR-6's 25KB gz budget

**Harder:**
- 3-second worst-case latency on pathological inventories — operator perception of "click Test, wait 3s, no useful output" needs UX care (loading spinner with progress hint: "evaluating rules...")
- Main thread is non-responsive during the per-row `regex.test()` call itself — 100ms blocking is brief but visible if it accumulates; mitigated by yielding between rows via `await new Promise(r => setTimeout(r, 0))` or `requestIdleCallback`
- If operators ever start authoring large inventories with sophisticated regex (more sophisticated than today), the 3s cap will bite often; PRD-006+ may need to revisit Worker isolation

**Telemetry note:** instrument the diagnostic-incomplete trace count if/when telemetry lands — if >5% of Test invocations hit the 3s cap, that is a signal to escalate.

## Amendment — 2026-05-20T21:30:00Z (T2 implementation finding)

The original wording "wrap each `regex.test(candidate)` in `Promise.race([test, sleep(100).then(() => 'timeout')])`" overstates what JavaScript can do. `regex.test()` is **synchronous** and blocks the event loop — the Promise race only resolves *after* the blocking call returns. A catastrophic regex still freezes the tab for however long the engine takes to give up; the per-row cap does NOT interrupt a single offending row mid-evaluation.

What the dual cap **actually** delivers:

1. **Inter-row safety:** after one pathological row's `regex.test()` returns (whenever that is), the per-row `Promise.race` correctly emits `outcome: 'timeout'` for that row, and the simulator continues to the next row. Without the cap, the trace would record `'match'` or `'no-match'` for a regex that took 30 seconds — operators would have no signal that the row is dangerous.
2. **Total-budget visibility:** the 3-second wall-clock checkpoint between rows reliably stops further evaluation and emits `diagnostic-incomplete`. Bounds total wait when many rows are slow but none individually catastrophic.

What the dual cap **does not** deliver:

- **Hard interrupt on a single catastrophic row.** Single-threaded JS cannot preempt synchronous code without `setTimeout` yield points inside the routine being interrupted, which `regex.test()` does not have. The first pathological row still hangs the tab for its full backtracking duration.

This is documented honestly in the simulator's wall-clock cap test (`proxy-simulator.test.ts`), which uses `vi.spyOn(Date, 'now')` to verify the *wiring* (deadline-exceeded path emits the right trace stage) rather than asserting real wall-clock interruption that single-threaded JS cannot provide.

**True hard-interrupt path:** Web Worker isolation with `worker.terminate()` after a timeout. This is deferred per the original decision in this ADR; revisit only if pathological patterns become an authoring norm (PRD-006+).

**Operator UX update:** the "pathological pattern hangs the tab" risk surfaces honestly — the loading spinner during a hang IS the right signal. The "diagnostic incomplete after 3s" final card explains what happened once the hang clears. No silent failures.

## Date

2026-05-20 (original); amended 2026-05-20T21:30:00Z (T2 implementation finding)
