# ADR-0046: GitHub REST API used unauthenticated in v0 (60 req/hr/IP); drift check is on-demand only (no scheduled background check)

## Status

Accepted

## Context

The in-app drift detector needs to fetch the latest commit SHA per watched file from `api.github.com/repos/Sitecore/content-sdk/commits`. Two orthogonal decisions:

1. **Authentication.** Unauthenticated (60 req/hr/IP) vs PAT-based (5000 req/hr) vs server-side proxy with a stored token.
2. **Trigger.** On-demand operator click vs automatic on Test-tab mount vs scheduled background check (cron / GitHub Action).

The trade-offs interact: unauthenticated + scheduled would risk hitting the rate limit; PAT-based opens up scheduled but adds credential management.

## Decision

1. **Unauthenticated GitHub API in v0.** No `Authorization` header. 60 req/hr/IP is the rate limit; for an on-demand-only traffic profile (each "Check upstream" click = 2 requests), this is sufficient even for a small team sharing an egress IP.

2. **On-demand only.** "Check upstream" button is the ONLY trigger. No `useEffect` auto-fetch on Test-tab mount. No scheduled background check (no Vercel cron, no GitHub Action). Banner appears only after explicit operator action.

3. **PAT-based auth is FO-5.2.** Add when 60/hr/IP becomes painful in real usage (large team on shared NAT, very frequent checks, etc.).

4. **Scheduled checks are FO-5.1.** Re-introduce if operators report "I forget to click Check upstream". Today's stance: explicit operator action is cheap and self-documenting.

## Consequences

**Easier:**
- Zero credential management in the deployed app. No `GITHUB_TOKEN` env var. No rotation policy. No risk of leaked PAT in client-side bundle (impossible — no token to leak).
- Predictable traffic profile: per-operator volume is bounded by their click rate. No background traffic chasing rate limits.
- Banner appears only when an operator has explicitly engaged with the question "is my simulator current?" — the signal is intentional, not surprise.

**Harder:**
- Operator must remember to click "Check upstream" — if they don't, they won't know about drift. Mitigated by the click being cheap and surfacing inline status.
- Teams sharing an egress IP (office NAT) may hit the rate limit faster than individuals — surfacing as a graceful "rate limit reached; try again in N minutes" banner state.
- No CI gate on drift — a developer could ship a release while drift exists, and no automated check catches it. (Adding a CI gate is FO-5.1-adjacent; could ship in PRD-006+.)

**Trade-offs:**
- Choosing on-demand over scheduled trades operator-discipline cost (must remember to click) for simplicity cost (no cron infrastructure, no credentials). Acceptable given small team + early-stage feature.
- Choosing unauthenticated over PAT trades rate-limit headroom for zero credential surface. Headroom is fine for v0; we can add a PAT in a small follow-on PRD without architectural change.

## Date

2026-05-22
