# ADR-0049: Drift detection hook is a 5-state machine with sequential per-file fetches and reentrancy protection

## Status

Accepted

## Context

The in-app drift detector (`use-upstream-drift.ts`) reads a build-time-bundled snapshot JSON and calls `api.github.com/commits` once per watched file. Two design questions surfaced during architecture:

1. **Concurrent calls.** Operator double-clicks "Check upstream" — what happens? Each click invokes `recheck()`. Without protection, two concurrent fetch sequences race; the second can finish first; the hook's `state` flickers. The architecture must specify the contract.
2. **Fetch ordering.** PRD-005 watches 2 files. Parallel fetch finishes faster but counts as 2 simultaneous API calls; sequential fetch is slower (2× round-trip) but plays nicely with the 60/hr/IP rate limit. PRD § 9 notes "(not parallel — keep simple and respect rate limit)" but the architecture should encode this as a contract, not a comment.

## Decision

1. **Five explicit states** in the hook's discriminated union:
   - `'idle'` — initial state on mount; nothing fetched. No banner; no "in-sync" inline message; just the "Check upstream" button.
   - `'checking'` — at least one fetch is in flight. Button shows a loading spinner and is disabled. No banner.
   - `'in-sync'` — all watched-file SHAs match snapshot baseline. No banner; inline "In sync with upstream `dev` (checked Nm ago)" appears below the button.
   - `'drifted'` — at least one SHA differs. Banner renders if not dismissed for the session.
   - `'error'` — any non-ok GitHub client response. Banner renders the error copy + retry button (where applicable). Retry button calls `recheck()`.

2. **State transitions are unidirectional from `idle` or terminal states only:**
   - `idle → checking` (on `recheck()`)
   - `checking → in-sync | drifted | error` (terminal; all watched files resolved)
   - `in-sync | drifted | error → checking` (on `recheck()` from any terminal state)

3. **Sequential per-file fetches.** When watching N files, the hook issues N fetches one after another (await each before starting the next). Failure of any single file short-circuits to `'error'` state with the first failure's `errorReason`. Successful fetches accumulate in a temporary array; the hook compares against the snapshot only after ALL N succeed.

4. **Reentrancy protection (FR-C5).** If `state === 'checking'` and `recheck()` is called again, the hook returns immediately (no-op). The UI layer ALSO disables the button while `state === 'checking'`, providing defense-in-depth. The hook's protection is the contract; the UI's protection is the safety net.

5. **`lastChecked` updates on every terminal state** (success or error). Persists for the component's lifetime (no localStorage).

6. **No `useEffect` auto-fetch on mount.** The hook is idle until `recheck()` is called. This honors PRD § Non-negotiables "On-demand only — no auto-check on Test-tab mount".

## Consequences

**Easier:**
- The hook's behavior is documentable in a single state-machine diagram. No hidden race windows. No partial-update states.
- Sequential fetches respect the 60/hr/IP rate limit cleanly: each "Check upstream" click consumes exactly N requests, never N+1 or 2N due to concurrent invocations.
- The 5 states map 1:1 to the 5 UI render branches in the banner + status indicator. The component is a pure function of `state`.
- Test surface is simple: each state transition is a unit-testable function call.

**Harder:**
- Two-file sequential fetch is slower than parallel (one extra round-trip — typically ~150ms on a typical network). Within the 2-second M1 budget; acceptable.
- The reentrancy contract requires both hook-level and UI-level enforcement. A future engineer who removes button-disabled styling without understanding the contract could trigger the no-op without realizing. Documented in JSDoc on `recheck()`.

**Trade-offs:**
- We trade fetch parallelism for rate-limit headroom + simpler state model. The trade is negligible at 2 files; if PRD-005 ever watches more files (FO-5.7 transitive deps), revisit.
- The "no auto-check on mount" rule means an operator must remember to click "Check upstream" to learn about drift. Mitigated by the cheapness of the click + clear inline status indicator.

## Date

2026-05-22
