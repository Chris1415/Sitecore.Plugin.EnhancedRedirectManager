# ADR-0011: Extension-point identifiers, route URLs, and root-route policy

## Status

Accepted

## Context

PRD-000 § 1 commits to three Cloud Portal extension points: a Pages Context Panel, a per-site Dashboard Widget, and a Full Page surface. The PRD does **not** lock the SDK extension-point identifiers, the Next.js route URLs, or the root-route (`/`) behavior — the architecture must.

Three decisions are entangled:

1. **Extension-point identifier per surface.** The SDK enumerates five values in `AllowedExtensionPoints` (`marketplace-sdk-client` § 7): `standalone`, `xmc:fullscreen`, `xmc:dashboardblocks`, `xmc:pages:contextpanel`, `xmc:pages:customfield`. Picking the right one matters because it determines which queries are available (e.g. `pages.context` only works in `contextpanel` / `customfield`) and what the iframe viewport looks like.
2. **Route URL per extension point.** Cloud Portal binds extension points by route URL paste. The values picked here go into App Studio → Extension points and must match files served by the Next.js app.
3. **Root `/` route behavior.** The scaffold ships a demo `app/page.tsx` at `/`. The Marketplace skill (`marketplace-sdk-extension-routes` § 5c-bis) documents a known trap: `<MarketplaceProvider>` wraps `app/layout.tsx`, so the provider's "Attempting to connect..." loading state renders for **every** route — including `/`. Outside the portal iframe the SDK handshake never resolves and the provider sits on the loader forever; downstream `redirect()` / `notFound()` never fire. Three options exist:
   - (a) Accept the trap; treat `/` as out-of-surface.
   - (b) Move `<MarketplaceProvider>` into a per-extension layout, leaving `/` provider-free.
   - (c) Bind an extension point to `/` (skill explicitly warns against this).

These three decisions move together — they are bound by Cloud Portal registration: any change to the set requires re-registering all three extension points. One ADR captures them as a single committed decision rather than three brittle independent records.

## Decision

**Extension-point identifiers and route URLs:**

| Surface | SDK enum identifier | Route URL | Cloud Portal label |
|---|---|---|---|
| Pages Context Panel | `xmc:pages:contextpanel` | `/context-panel` | "Page context panel — left-hand panel" |
| Dashboard Widget | `xmc:dashboardblocks` | `/dashboard-widget` | "Dashboard widgets — SitecoreAI" |
| Full Page | `xmc:fullscreen` | `/full-page` | "Full screen — SitecoreAI" |

**Why `xmc:fullscreen` (not `standalone`) for Full Page.** PRD-000 is a per-tenant tool, not an organisation-level umbrella. `standalone` would expose `application.context.resourceAccess[]` as multi-install fan-out (`marketplace-sdk-xmc` § 2c) and would force the operator through a "pick which install" UX before the actual app loads — meaningless for a tenant-scoped CRUD app. `xmc:fullscreen` binds to a single tenant per install, which is exactly the intended model.

**Why `xmc:dashboardblocks` (single widget) for Dashboard.** PRD US-4 specifies one widget with three stat tiles. The skill notes Dashboard widgets *can* expose multiple routes; we don't need that. One route, one widget — simplest.

**Root-route policy.** Option (a) — `app/page.tsx` returns `notFound()` from `next/navigation`. The root is treated as out-of-surface; Cloud Portal binds by extension-point route URL only, never by `/`. The README and onboarding doc explicitly instruct operators that local smoke tests must hit `/context-panel`, `/dashboard-widget`, or `/full-page` directly, never `/`.

**Why option (a) over (b) for the root route.** Option (b) (per-extension layout that hosts `<MarketplaceProvider>`) is a real refactor — three new layout files, three duplicated provider invocations, and a non-trivial decision about where shared state lives. PRD-000 has no per-extension provider differences that would justify the cost. If PRD-001 later introduces an Upstash-backed analytics provider with different config per surface, revisit; until then, accept the trap and document the smoke-test path.

## Consequences

**Easier:**

- One ADR covers the binding decision; future PRDs see one record to consult, not three.
- `xmc:fullscreen` for Full Page means the app gets `application.context` and the full XMC query surface without the multi-install fan-out boilerplate of `standalone`.
- `xmc:pages:contextpanel` for the Context Panel gives subscribable `pages.context` (`marketplace-sdk-client` § 6 path A) — the matcher reacts live as the operator navigates between pages.
- `notFound()` at root prevents the silent "loader hangs forever" UX bug during local dev — operators see a clean 404 and know to use the right route.
- Cloud Portal registration is mechanical: paste the table from architecture § 2.2 into App Studio.

**Harder:**

- A future PRD that needs the multi-install Standalone surface (e.g. an admin tool that operates across many tenants in one organisation) would need a new ADR superseding this one and changing the Cloud Portal registration.
- Operators (or anyone exploring locally) must learn that hitting `https://localhost:3000/` does nothing useful. The README must call this out explicitly.
- The decision binds three extension points together — adding a fourth surface (e.g. a Custom Field for a single field type) means a fresh registration round-trip and re-running `sitecore:marketplace-sdk-extension-routes`.

## Date

2026-05-10
