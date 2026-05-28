# ADR-0047: Slash command auto-bumps snapshot SHA only after fixture regeneration + tests pass; failed-test state leaves simulator and snapshot consistent (no half-applied state); `knownDivergences[]` is the escape hatch for deliberate non-ports

## Status

Accepted

## Context

The `/sync-redirect-proxy` slash command performs a multi-step flow: fetch upstream → propose patch → operator review → regenerate fixtures → run tests → update snapshot SHA. Each step can fail. Two questions:

1. **What happens on failure?** Specifically: if the proposed patch passes operator review but fails fixture-parity tests, what state are we left in?
2. **How do we handle deliberate non-ports?** ADR-0038 requires verbatim parity; but sometimes upstream introduces a behavior we don't want to port (e.g. a feature tied to a Content SDK capability this app doesn't support). What's the escape valve?

The risk of not deciding cleanly: half-applied state where the simulator has new code but the snapshot still has old SHAs (or vice versa), making the drift signal lie.

## Decision

1. **Atomic state transitions.** The slash command updates the snapshot SHA ONLY in a single atomic step (Step 8a of the flow) AFTER:
   - Operator has accepted the proposed patch (Step 5 succeeded).
   - Fixture regeneration via `npm run extract:upstream-fixtures` succeeded (Step 6).
   - `npm test -- proxy-simulator` exited with code 0 (Step 7).

2. **On test failure (Step 8b):** leave the simulator edits in place but do NOT bump the snapshot. Print failing case names and prompt the operator with two options: (a) refine the port further, then re-run; (b) add a `knownDivergences[]` entry to `upstream-snapshot.json` with rationale, then re-run. The simulator + snapshot remain consistent — no half-applied state.

3. **On operator decline (AC-3.10):** slash command exits with no changes. Simulator + snapshot unchanged. Idempotent re-run produces the same proposal.

4. **`knownDivergences[]` escape hatch.** When upstream introduces a change the team deliberately does not want to port (e.g. a function specific to a feature this app does not support), the operator adds a structured entry to `upstream-snapshot.json`:
   ```json
   "knownDivergences": [
     { "at": "2026-08-15T10:00:00Z", "reason": "Upstream added support for X which this app does not surface", "function": "matchFooBarRedirect", "upstreamSha": "<sha-at-divergence>" }
   ]
   ```
   The slash command honors this: when proposing patches, it skips proposing changes to functions whose names match a `knownDivergences[]` entry, printing an explicit skip message (AC-3.12).

5. **Idempotency (NFR-7).** Running the slash command twice in a row when SHAs match produces "Already in sync — no patch proposed" both times. No spurious file edits, no SHA bumps, no test runs.

## Consequences

**Easier:**
- The drift signal never lies. If SHAs match baseline, the simulator is current OR the divergence is recorded as known. If SHAs don't match, drift exists or the engineer hasn't yet bumped the snapshot. There is no fourth state.
- Operator agency is preserved — declining a patch is a valid outcome. Adding a `knownDivergences[]` entry is a valid outcome. The slash command never silently does the wrong thing.
- Git history captures the durable record. A single commit landing simulator edits + snapshot bump + regenerated fixtures together is the audit trail.

**Harder:**
- `knownDivergences[]` requires operator discipline. An engineer who adds a vague entry ("upstream change is ugly, skipping") undermines the parity contract. T6 operator smoke includes a "does the divergence list look reasonable?" pass; long-term, periodic operator review of the list is the safeguard.
- The slash command flow has more conditional branches than a one-shot edit (declined, test failure, divergence skip) — each branch is tested + documented in US-3 ACs.

**Trade-offs:**
- We accept that `knownDivergences[]` could become a dumping ground over time (R10 records this risk). The structured `reason` field + the slash command's "show existing entries" behavior aim to keep it honest.
- Half-applied state is technically possible if the engineer manually edits the simulator + commits without re-running the slash command. The honor system + git diff review + `npm test` in CI catch this.

## Date

2026-05-22
