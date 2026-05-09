# ADR-0002: Marketplace SDK Mode A scaffold (no server-side OAuth proxy)

## Status

Accepted

## Context

Redirect Manager is a Sitecore Marketplace app that performs Authoring GraphQL reads and writes on Redirect Map items. The Marketplace SDK supports three architectures:

- **Mode A (Client-Side)** — browser-only, all SDK calls ride the operator's authenticated Cloud Portal session via the typed postMessage bridge. Scaffold: `sitecore:setup-marketplace-client-side`.
- **Mode A + server-side OAuth proxy** — same as Mode A plus a Next.js API route that uses client-credentials to call Sitecore APIs the SDK doesn't wrap.
- **Full-Stack (Mode A + Mode B Auth0 PKCE)** — full SSR with `experimental_createXMCClient` for server-side calls on behalf of a logged-in user.

PRD-000 needs only Authoring GraphQL (which the SDK wraps via `xmc.authoring.graphql`) and `xmc.sites.list`. There is no Sitecore REST endpoint without an SDK wrapper that the app must call. There is no server-rendered data fetch on behalf of an unauthenticated user.

## Decision

Scaffold the app via `sitecore:setup-marketplace-client-side` (Mode A only). No server-side OAuth client-credentials proxy. No `experimental_createXMCClient`. No Auth0 PKCE flow.

Every Sitecore call rides the operator's Cloud Portal session through ClientSDK + the `xmc` package. App Router defaults are fine — RSC for static shell, CSR for interactive surfaces.

## Consequences

**Easier:**
- Zero infrastructure to provision (no OAuth client, no Auth0 application, no server credentials).
- The app deploys to any static host; Vercel is a default but not a hard requirement.
- Permission boundary is exactly the operator's session — no privilege escalation risk from the app.
- Simpler scaffold, fewer moving parts at QA time.

**Harder:**
- The app cannot perform Sitecore writes outside an authenticated user context — no scheduled jobs, no machine-to-machine flows. (Acceptable; PRD-000 has no such requirement.)
- If a future PRD needs to call a Sitecore REST API the SDK does not wrap, the OAuth proxy or a different scaffold must be revisited at that point.

## Date

2026-05-09
