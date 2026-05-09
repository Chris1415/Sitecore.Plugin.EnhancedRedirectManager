# ADR-0005: Context Panel matching is exact-string only in MVP

## Status

Accepted

## Context

The Sitecore head application's redirect resolver uses regex pattern matching on the `UrlMapping` field — a redirect with source `^/products/(\d+)$` matches any path starting with `/products/` followed by digits. To answer "which redirects affect *this* page" accurately, Redirect Manager would need to evaluate every redirect's source as a regex against the current page path.

Doing regex-aware matching well in the iframe is non-trivial:
- Untrusted regex patterns (operator-authored content) can cause catastrophic backtracking. Every match attempt needs a timeout/complexity guard.
- Reverse-direction matching (does this page satisfy a regex *target*?) is computationally expensive and ambiguous when the target is also regex-shaped.
- The matcher must agree with the head-app's resolver on edge cases (case sensitivity, anchoring, virtual-folder normalization). A divergence produces silent false negatives in the Context Panel, eroding operator trust.

The user's decision during discovery (Q-D9, Q-CR-2): exact-match for MVP, regex deferred. Q-CR-7 confirmed the listing groups by parent Redirect Map and shows the matched mapping rows beneath each group header.

## Decision

For PRD-000, the Context Panel matches a redirect as affecting the current page **only when the current page path equals a mapping's source string verbatim OR equals a mapping's target string verbatim** (after a uniform decoding step on the `UrlMapping` field per ADR-H).

**Regex-aware matching is explicitly deferred.** A persistent, non-dismissible UI banner in the Context Panel reads: *"Direct-string matches only — regex pattern matches are not yet covered."*

Listing groups by parent Redirect Map (per Q-CR-7): each map shows its name, `RedirectType` badge, flag chips, and the specific matched mapping rows beneath it.

## Consequences

**Easier:**
- MVP matcher is trivial: parse `UrlMapping`, iterate rows, string-equal check. Zero regex engine concerns. Zero timeout guards.
- No false-positive matches (a literal source `/foo/bar` cannot accidentally match an unrelated path).
- Test surface is small and tractable.

**Harder:**
- The matcher misses every regex-pattern redirect — potentially the majority of real-world rules. Operators may distrust the panel if they assume regex coverage.
- The non-dismissible banner is a constant visual reminder that the feature is incomplete. Mitigated by explicit Phase 2 priority on regex matching.
- Some legitimate exact-string redirects whose source field is regex-encoded (e.g. `^/foo$` to mean exactly `/foo`) will not match the literal `/foo` page path. Operators authoring redirects this way must be told (README + `docs/architecture.md`).

The follow-on PRD with regex matching (FO-2) is the highest-priority deferred work after multilingual + analytics.

## Date

2026-05-09
