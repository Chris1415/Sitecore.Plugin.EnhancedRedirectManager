# ADR-0048: No app-level Content-Security-Policy is introduced in PRD-005; in-app `fetch()` to `api.github.com` works without CSP changes

## Status

Accepted

## Context

The original PRD-005 draft assumed widening `connect-src` in `next.config.ts` headers to include `https://api.github.com` (and `raw.githubusercontent.com`) for the in-app drift check. Critical review (B5) raised the question: what is the current `connect-src` directive? Without a baseline, the change could either be (a) a no-op (the directive is already permissive), (b) a tightening (the directive was wider, narrowing introduces risk to other surfaces), or (c) the first introduction of an app-level CSP entirely.

T1 audit of the existing codebase: `site/next.config.mjs` is empty (`/** @type {import('next').NextConfig} */ const nextConfig = {}`). No middleware sets a `Content-Security-Policy` response header. No layout, route handler, or proxy file sets one either. The Marketplace iframe runs with whatever CSP Cloud Portal sets on the outer document (`frame-ancestors`), but the app's own responses carry no `Content-Security-Policy` header.

This means: the in-app `fetch()` to `api.github.com` is not restricted by an app-level CSP today. Adding one would be option (c) — the first introduction of CSP into this app — which is a wider blast radius than PRD-005 should absorb.

## Decision

1. **PRD-005 does NOT introduce an app-level CSP.** `next.config.mjs` remains unchanged. No `headers()` function added. No middleware-set `Content-Security-Policy` header.

2. **The in-app `fetch()` to `api.github.com` works without CSP changes.** Confirmed by the absence of any restricting `Content-Security-Policy` response header on the app's HTML responses.

3. **`raw.githubusercontent.com` is used ONLY by the dev-time slash command** (runs outside the browser via Claude Code's Bash / WebFetch). It is NOT used by the deployed app. There is no need to add it to a (non-existent) in-app CSP.

4. **Forward-looking guidance:** if a future PRD or platform mandate introduces an app-level CSP, the migration MUST include `https://api.github.com` in the `connect-src` directive (otherwise the drift detector breaks). This requirement is documented in PRD-005 § 9 "Network access" and in this ADR.

5. **T5 structural guard.** Verify `next.config.mjs` is still empty (no `Content-Security-Policy` header introduced during PRD-005). This is a guard against accidental scope creep — drift detection should not be the place where CSP gets introduced for the first time.

## Consequences

**Easier:**
- PRD-005 stays scoped. No CSP migration work, no risk of breaking other Marketplace surfaces (Authoring GraphQL endpoints, Publishing API, Marketplace SDK), no test thrashing.
- The drift feature ships with zero header-related risk.

**Harder:**
- Future engineers who want to introduce CSP (for security hardening, compliance, etc.) will inherit a "must remember to allow `api.github.com`" requirement. Documented in PRD-005 § 9 and ADR-0048 itself.
- If Sitecore Marketplace ever adds a platform-mandated CSP (e.g. forcing apps to declare `connect-src`), this app will need to adapt — but at that point, every Marketplace app will, so the migration is platform-driven, not feature-driven.

**Trade-offs:**
- We accept the smaller security posture (no in-app CSP) in exchange for not absorbing an architecturally larger change in PRD-005. This is consistent with the broader pattern of "Marketplace apps inherit Cloud Portal's outer CSP for `frame-ancestors`; app-level CSP is opt-in by the app developer".
- If a security-hardening PRD lands later, ADR-0048 will need to be superseded with explicit guidance on the `connect-src` contents.

## Date

2026-05-22
