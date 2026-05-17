# ADR-0035: Server-side OAuth proxy for publishing — narrow carve-out from ADR-0002

## Status

Accepted (2026-05-17). Partially supersedes ADR-0002 — for the publishing surface only.

## Context

ADR-0002 (2026-05-09) committed Redirect Manager to a pure Marketplace **Mode A / Client-Side** scaffold: no server-side OAuth proxy, no Auth0 PKCE flow, every Sitecore call rides the operator's authenticated Cloud Portal session via the typed postMessage bridge. ADR-0002 named the rationale (zero infrastructure, static-host deployable, minimal permission surface) and explicitly anticipated the boundary case:

> If a future PRD needs to call a Sitecore REST API the SDK does not wrap, the OAuth proxy or a different scaffold must be revisited at that point.

PRD-003 hit that boundary. The SitecoreAI Publishing v1 API (`POST /authoring/publishing/v1/jobs` and siblings) is REST-only — the Marketplace SDK does not expose a publishing surface (confirmed by Tranche 1 grep of `@sitecore-marketplace-sdk/xmc/dist/**/*.gen.d.ts`; only `xmc.sites.listJobs` / `xmc.xmapp.listJobs` exist, both for background jobs unrelated to publishing). ADR-0034 selected **Branch B** (server-side OAuth proxy via a Next.js API route) as the implementation path for this PRD. ADR-0033 locked the branch-agnostic service-module contract so the choice did not leak past the transport adapter.

This ADR records the **narrow carve-out** that ADR-0034 produced. It is authored at `/ship` time (deferred from `/architect` per the planning trade-off — wait until Tranche 1 confirms Branch B before formally relaxing ADR-0002) rather than upfront.

## Decision

ADR-0002's stance "no server-side OAuth proxy" is **partially superseded** with the following carve-out:

- **For the SitecoreAI Publishing v1 REST API and any GET routes derived from the same OAuth credential** (currently: `POST /api/publish`, `GET /api/publish/jobs`, `GET /api/publish/jobs/{id}`), Redirect Manager runs a server-side Next.js API route that holds OAuth client-credentials and forwards to `https://edge-platform.sitecorecloud.io/authoring/publishing/v1/...`.
- **All other Sitecore calls remain Mode A** — Authoring GraphQL (`xmc.authoring.graphql`), site enumeration (`xmc.sites.*`), and any future SDK-wrapped surfaces use ClientSDK + the operator's Cloud Portal session unchanged.

ADR-0002 itself **stays Accepted overall**. The carve-out is a documented narrowing, not a full replacement. New PRDs that touch other SitecoreAI REST APIs the SDK does not wrap (e.g. parts of the Agent API, Pages API) may extend the carve-out by adding new `/api/<surface>/` routes that share the same OAuth token module; new ADRs in that case reference this one rather than re-opening ADR-0002.

## Concrete shape

- **OAuth module**: `site/lib/auth/sitecoreai-token.ts` — `import "server-only"` directive enforces server-only access. Reads `SITECORE_PUBLISH_CLIENT_ID` / `SITECORE_PUBLISH_CLIENT_SECRET` from `process.env`. Token endpoint and audience have hardcoded defaults (`https://auth.sitecorecloud.io/oauth/token` + `https://api.sitecorecloud.io`); env-var overrides exist for non-standard Sitecore Cloud regions only. Token cache keyed by audience; expires 60 seconds before token `expires_in`. Token-acquire failures throw with response status + body included.
- **API routes**: `site/app/api/publish/route.ts` (POST), `site/app/api/publish/jobs/route.ts` (GET — list/filter), `site/app/api/publish/jobs/[id]/route.ts` (GET — retrieve). Each route is a thin proxy: acquire token via `getSitecoreAccessToken()`, forward the request to the matching `https://edge-platform.sitecorecloud.io/authoring/publishing/v1/...` endpoint, return the upstream response (status + JSON body) verbatim. On token-acquire failure, return 502 with `{ error, upstream_status: 0, upstream_body: null }`.
- **Client-side transport**: `site/lib/publish/transport-server.ts` — `callPublishViaServerRoute: CallPublish` — uses `fetch('/api/publish', ...)` from Client Components. Never imports `sitecoreai-token`; the `import "server-only"` directive enforces this at build time.
- **Secret hygiene regression backstop**: structural test in `site/app/api/publish/route.test.ts` asserts no Client Component reachable file references `process.env.SITECORE_PUBLISH_CLIENT_SECRET`. Complemented by `/code-review` and the `import "server-only"` build-time gate.

## Consequences

**Compared to staying within ADR-0002 (would have required a different scaffold change):**

**Easier:**
- The narrow carve-out lets ADR-0002 keep working for the 95% of Sitecore calls that don't need REST-only surfaces. No full reshape to Mode A + Mode B Auth0 PKCE.
- Server route runs inside the same Next.js app — no new infrastructure, no new auth flow, no Auth0 application to register.
- Pattern is reusable: a future PRD that needs (say) the Agent API or Publishing job-list-with-filtering inherits this cleanly — add an `/api/<surface>` route, share the OAuth module.
- ADR-0002 stays Accepted overall — no thrash on the foundational scaffold decision; the supersede is a documented carve-out, not a reversal.

**Harder:**
- Redirect Manager is no longer a pure static-host-deployable app — the Next.js server runtime is now load-bearing for publishing. Vercel / equivalent Node-capable host is required. Static export is no longer an option.
- Secret hygiene becomes a permanent discipline. Three layers of defense: (a) `import "server-only"` directive in the auth module, (b) structural test enforcing no client-bundle reference, (c) `/code-review` pass for any code touching `app/api/publish/`.
- Operator must register a Cloud Portal automation client with `xmcloud.cm:admin` + `xmcpub.jobs.a:r` + `xmcpub.jobs.a:w` scopes per the `sitecore:sitecoreai-auth` skill. This is a manual setup step that did not exist in pure Mode A. Documented in `.env.example` + this PRD's ship docs.
- Operators using the app on their own tenants must provide their own OAuth credentials; the credentials are not shared across tenants. (This is the correct security posture — each tenant scopes its own publish authority.)

**No change to (ADR-0002 still wins):**
- Authoring GraphQL (`xmc.authoring.graphql`) — Mode A, postMessage bridge, operator's session
- Site enumeration (`xmc.sites.*`) — Mode A
- Any future surface that the Marketplace SDK exposes natively — defaults back to Mode A

## Related

- ADR-0002 — Marketplace SDK Mode A scaffold (Accepted overall; narrowed by this ADR for publishing)
- ADR-0031 — Publish surface decided at Tranche 1 (Accepted; the decision-deferral pattern)
- ADR-0033 — Publish service module contract (Accepted; branch-agnostic skeleton)
- ADR-0034 — Publish surface branch resolution (Accepted; Branch B selected)
- ADR-0036 — Per-map publish removed (Accepted; Tranche 3 amendment)
- ADR-0037 — Lightweight publish-job polling + cross-session resume (Accepted; Tranche 3 addition)

## Date

2026-05-17. Authored at `/ship` time per the deferral pattern in ADR-0034 § Consequences ("ADR-0035 authored at /ship time, not Tranche 1").
