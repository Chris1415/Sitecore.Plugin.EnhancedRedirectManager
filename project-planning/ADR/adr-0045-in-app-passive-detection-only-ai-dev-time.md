# ADR-0045: In-app drift detection is passive SHA-mismatch only; AI involvement lives EXCLUSIVELY in a dev-time slash command, never in the deployed Marketplace app

## Status

Accepted (amended 2026-05-26 — drifted banner tone escalated from muted to destructive-tinted + `AlertTriangle` glyph; error sub-states escalated from muted to warning-tinted; `role="status"` semantic preserved across all states per operator feedback at UI-design lock)

## Context

PRD-005 needs to (a) signal drift to operators and (b) help engineers resolve drift quickly. Two natural questions:

- Should the deployed Marketplace app call an LLM at runtime to detect drift more intelligently (semantic AST diff, content-fingerprint comparison, etc.)?
- Should the slash command live inside the deployed app (a button that triggers an LLM call) or outside (a dev-time tool)?

The decision has architectural consequences (server-side OAuth proxy + API keys + token cost + frontend complexity) vs simplicity.

## Decision

**Strict layering:**

1. **In-app detection is SHA-mismatch only.** The deployed Marketplace app fetches the latest commit SHA per watched file from the GitHub commits API and compares against the snapshot baseline. **No LLM involvement, no API keys, no server-side proxy, no token cost.** Banner copy acknowledges the false-positive cost ("Upstream changed; review the diff" not "drift detected") and trusts the engineer to disambiguate via the slash command.

2. **AI resolution lives EXCLUSIVELY in a dev-time slash command.** `.claude/commands/sync-redirect-proxy.md` lives in the product repo. The engineer runs Claude Code locally inside the product repo and invokes the slash command. Claude Code's standard edit-flow proposes a verbatim re-port patch; the engineer reviews + accepts; tests run; SHA bumps. **The deployed app never sees this flow** — no LLM dependency reaches production traffic.

3. **Operator + engineer roles are deliberately separate.** Operators see the banner; engineers run the slash command. No mixing. The banner copy explicitly tells operators to ask their engineer to run `/sync-redirect-proxy` — it does not offer a "Resolve drift" button.

## Consequences

**Easier:**
- Deployed Marketplace app stays small and dependency-free — one `fetch()` to public GitHub API, one banner component, no server-side OAuth, no API keys.
- No runtime LLM cost. No token-quota concerns. No "OpenAI is down so the app banner is broken" failure mode.
- Security posture is unchanged — no new credentials to manage, no new attack surface in the deployed app.
- The slash command can be more sophisticated than a deployed-app feature could justify (full AST diff, multi-file patch proposals, fixture regeneration + test running) because it runs in the engineer's local Claude Code session.

**Harder:**
- False positives on comment-only upstream changes will show the banner. Operators have to trust the banner copy ("review the diff") and not panic. The slash command's diff view disambiguates quickly, but the operator can't do it themselves.
- The drift signal is one step removed from resolution — operators flag drift to engineers; engineers run the slash command. This delays resolution by the time it takes the engineer to notice and act.
- Engineers must have Claude Code installed locally and be familiar with the product repo to run the slash command.

**Trade-offs:**
- We accept the false-positive cost of SHA-only comparison in exchange for keeping the deployed app simple. File-hash comparison (FO-5.5) and semantic AST diff (FO-5.6) are deferred until operator pain emerges.
- The two-role separation may feel heavy for small teams where one person is both operator and engineer. In that case, the slash command is just one extra step ("see banner, switch to Claude Code, run command") — still cheaper than the alternative (LLM in deployed app).

## Amendment 2026-05-26 — visual tone tier system

**Operator feedback at UI-design lock:** "the error like not in sync more obvious with a red tone or so." The original "muted across all states" stance under-indexed drift's significance — operators need to actually notice the banner.

**Revised tone tier system:**

| State | Tone | Glyph | Token source |
|---|---|---|---|
| `idle` | muted (baseline) | — | — |
| `checking` | muted (baseline) | `@blok/spinner` | `--muted-foreground` |
| `in-sync` | muted-success | `Check` | `--success` (unchanged from original) |
| `drifted` | **destructive (red)** | **`AlertTriangle`** | `--destructive-background` tint + `--destructive` accent border + glyph |
| `error` (rate-limit / not-found / network) | **warning (amber)** | `Info` | `--warning` + `--warning-foreground` |

**`role="status"` preserved across all states.** The tone change is presentational only — drift remains an informational signal (not `role="alert"`), operators can still dismiss the banner per session and continue Test-tab interaction.

**Rationale for two-tier escalation:**
- Drift is the load-bearing signal; if operators don't notice, the feature has no value. Destructive tone gives it the weight operators wanted without breaking the a11y contract.
- Error sub-states (rate-limit / 404 / network) are recoverable via retry — one tier less severe than drift. Warning (amber) differentiates them from the happy path without competing with drift's red.

**Files updated:** `prd005.css` (`.drift-banner`, `.drift-status--error`); `icons.js` (added `alertTriangle`); `screen-test-drifted{,-dark,-mobile}.html` (glyph swap `info` → `alertTriangle`); UI spec `ui-design-20260522T114800Z-v1.md` (§ 1, § 3 D2, § 3 D3, § 8).

## Date

2026-05-22 (original); amended 2026-05-26
