# ADR-0034: Publish surface branch resolution (Tranche 1 outcome)

## Status

**Accepted** (2026-05-17). All Tranche 1 gates resolved via the inline publish probe panel (Tranche 1.5 spike). Branch B selected. Two real-tenant 201 Queued responses confirmed both Site and Items publish wire shapes (see Tranche 1 capture log below). OAuth service client `Redirect Manager` (id `dkX4dPUYJrARgicYCK3W5og6xBaGH1I2`, type `Application`) is registered against the solo tenant with all required scopes (`xmcloud.cm:admin` + `xmcpub.jobs.*:r` + `xmcpub.jobs.*:w` — `permissions.canCreate: true`, `canViewDetailsOfAll: true`).

## Context

ADR-0031 deferred the publish-surface architectural choice between **Branch A** (SDK wrapper for publishing exists in `@sitecore-marketplace-sdk/xmc`) and **Branch B** (no wrapper; introduce a server-side Next.js API route holding OAuth client-credentials) to PRD-003 /implement Tranche 1. The operator pre-committed Branch B as the fallback. ADR-0033 locked the branch-agnostic service-module contract so both branches plug into the same surface.

This ADR is the **record** of the Tranche 1 outcome. Status is `Proposed` at creation (2026-05-16) so the artifact exists in the index ahead of /implement. The Developer running Tranche 1 strikes the losing option, fills in the specifics, and flips the status to `Accepted` (with the Tranche-1-capture date).

Planning-time evidence (already collected by /architect; see ADR-0033 § SDK probe evidence): a grep of `products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/augmentation.gen.d.ts` and the adjacent `*.gen.d.ts` files found **no** `xmc.publishing.*` or `xmc.jobs.*` mutation/query. Only `xmc.sites.listJobs` / `xmc.sites.retrieveJob` exist, which are *sites* background jobs, not publishing jobs. This is consistent with the operator's pre-PRD inspection. **Branch B is the expected outcome.** Tranche 1 confirms (it does NOT re-open the decision).

## Tranche 1 probe protocol (5 steps — Developer runs verbatim)

1. **Inspect SDK augmentation files for publishing surface.** Run:

   ```
   grep -rni "publish\|publishing" \
     products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/**/augmentation.gen.d.ts \
     products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/**/sdk.gen.d.ts
   ```

   Record every hit. Hits inside `client-sites` referring to *sites* jobs (`listJobs`, `retrieveJob`) DO NOT count — those are not publishing endpoints. Hits referring to a true publishing endpoint (e.g. `xmc.publishing.createJob`, `xmc.publishing.jobs.create`, or similar) DO count.

2. **Decide D-T1.1.** If step 1 found a true publishing surface: **Branch A** — record the SDK method name, the `.d.ts` path, the response unwrap level (single `.data` vs double `.data.data` per the hey-api convention used by `xmc.sites.listSites` in `site/lib/sdk/sites.ts`). Strike Branch B below. If step 1 found nothing: **Branch B** — proceed to step 3.

3. **Decide D-T1.2 (live probe — both branches).** Against the solo tenant, send a Publish Site call with `options.xmc.locales = ["*"]`. If the API returns 201, record "shorthand accepted" and use it in the body. If the API returns 400 with a locale-format error, record "shorthand rejected" and fall back to enumerated locales from `Sites.Site.languages` (which is the default body shape per PRD AC-P1.4 either way). Capture the actual response status + body either way.

4. **Decide D-T1.3 (Branch B only).** Verify OAuth client-credentials are registered for the solo tenant with the required scopes: API scope (one of `xmcpub.jobs.a:w` / `xmcpub.jobs.t:w` / `xmcpub.jobs.t:wl`) + client scope `xmcloud.cm:admin` (per PRD § 9.2). If not registered, HARD STOP — operator setup blocker before Tranche 2 starts. If registered, record token endpoint + scope set in the Tranche 1 capture artifact.

5. **Flip this ADR's status from Proposed to Accepted.** Strike the losing option in the Decision section below. Fill the Consequences section's chosen branch with any Tranche-1-discovered specifics (SDK method name, OAuth scope strings, etc.). Append the Tranche 1 capture date to the Date field. Commit the ADR change as part of the Tranche 1 capture commit.

## Decision

**D-T1.1 = Branch B** (resolved 2026-05-16). Branch A is struck — see evidence below. Branch B is the selected path.

### ~~Branch A — SDK wrapper used~~ [NOT SELECTED — D-T1.1 = Branch B]

> ~~Selected if Tranche 1 step 1 finds an `xmc.publishing.*` (or equivalent) mutation. The publish service module's `callPublish` adapter (ADR-0033 § 3) is bound to a `client.mutate({ method: "<discovered-method>", params: { body: PublishApiRequest } })` call. The response is unwrapped per the discovered shape (likely double `.data.data` matching `xmc.sites.listSites`). **No** server-side route is added. **ADR-0002 remains intact** (no server-side OAuth proxy).~~
>
> ~~Specifics filled at Tranche 1: SDK method name, `.d.ts` citation path, unwrap level, request/response type names.~~
>
> **Evidence confirming Branch A not selected:** Grep of all `*.gen.d.ts` files across `@sitecore-marketplace-sdk/xmc/dist/xmc/src/**` (8 client modules + experimental variants, ~60 files total) found zero `xmc.publishing.*` entries, zero `createPublishJob` entries, and zero mutations calling `/authoring/publishing/v1/jobs`. All `publish*` hits were page-state properties (`canPublish`, `isPublishable`, `Publishing` type) or docstrings. All `jobs` hits were `xmc.sites.listJobs`, `xmc.sites.retrieveJob`, `xmc.xmapp.listJobs`, `xmc.xmapp.retrieveJob` (sites/xmapp background jobs — excluded per ADR-0034 step 1), and `xmc.agent.jobsGetJob` / `xmc.agent.jobsListOperations` (AI agent jobs, unrelated). Full hit list in `project-planning/captures/tranche-1-publish-20260516.md § SDK probe`.

### Branch B — server-side OAuth proxy added [SELECTED — D-T1.1 = Branch B]

> Selected: Tranche 1 step 1 found no `xmc.publishing.*` surface (see struck Branch A above). A new Next.js API route at `app/api/publish/route.ts` is added. The route:
>
> - Accepts `POST` with a JSON body matching `PublishApiRequest` (validated server-side).
> - Reads OAuth client-credentials from server-only env vars (`SITECORE_OAUTH_CLIENT_ID`, `SITECORE_OAUTH_CLIENT_SECRET`, `SITECORE_OAUTH_TOKEN_URL`, `SITECORE_PUBLISHING_BASE_URL`, `SITECORE_TENANT_ID` — per PRD § 9.4). Documented in `.env.example`, never committed in `.env.local`.
> - Caches the OAuth token in process memory with a TTL slightly shorter than the token's `expires_in` (per `sitecore:sitecoreai-auth`).
> - Forwards the body to `${SITECORE_PUBLISHING_BASE_URL}/authoring/publishing/v1/jobs` with `Authorization: Bearer <token>`.
> - Returns the upstream response (status + JSON body) to the client unchanged for 2xx; for non-2xx, forwards the upstream ProblemDetails verbatim so the toast (ADR-0033 § 4) surfaces the real error.
> - **Never** leaks the OAuth secret to the client bundle (NFR-P2). The route runs server-side only; the client only sees `{ jobId, status, ... safe fields }`.
>
> The publish service module's `callPublish` adapter is bound to `fetch("/api/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })`.
>
> **Specifics confirmed at Tranche 1 (2026-05-17):**
> - Route path: `site/app/api/publish/route.ts` (Tranche 2 production path; probe spike currently routes through `site/app/api/publishing/...` — Tranche 2 collapses to the canonical `/api/publish` per PRD § 9.4 + § 11.2 of task breakdown)
> - OAuth API scope: aggregate-write granted (probe permissions response `canCreate: true`, `canReadAll: true`, `canViewDetailsOfAll: true`). Exact scope string is one of `xmcpub.jobs.a:w` (aggregate) — `canViewDetailsOfAll: true` rules out the `:t:wl` limited variant. Per `sitecoreai-auth` skill recipe, the operator's automation client uses `xmcpub.jobs.a:w` + `xmcpub.jobs.a:r` + `xmcloud.cm:admin`.
> - Client scope: `xmcloud.cm:admin` (verified — probe POST returned 201 with `createdBy.type: "Application"`)
> - OAuth client identity: id `dkX4dPUYJrARgicYCK3W5og6xBaGH1I2`, name `Redirect Manager`, type `Application` — service client registered against solo tenant
> - OAuth token endpoint: `https://auth.sitecorecloud.io/oauth/token` (confirmed via probe)
> - OAuth audience: `https://api.sitecorecloud.io` (confirmed via probe)
> - Publishing base URL: `https://edge-platform.sitecorecloud.io` (single edge proxy host, same for every tenant — see memory `reference_sitecoreai_edge_platform_host.md`; confirmed via probe)
> - Wire shape: NESTED per `/sai/publishing-api/jobs/create.md`. `options.xmc.site.{mode}` + sibling `options.xmc.locales` for Site publish; `options.items[]` + `options.xmc.items.{mode, publishChildren, publishRelatedItems}` for Items publish. GET responses normalize to flat shape — informational only; trust create.md for input contract. See memory `reference_sitecoreai_jobs_input_vs_output_shape.md`.
> - Env vars: `SITECORE_PUBLISH_CLIENT_ID`, `SITECORE_PUBLISH_CLIENT_SECRET`, `SITECORE_OAUTH_TOKEN_URL`, `SITECORE_OAUTH_AUDIENCE`, `SITECORE_PUBLISHING_BASE_URL` — three-segment `SITECORE_PUBLISH_*` naming per `sitecoreai-auth` skill convention

## Consequences

### Consequences of Branch A (if selected)

1. **ADR-0002 stays intact.** The "no server-side OAuth proxy" stance holds. Future PRDs continue to default to Mode A.
2. **One transport seam.** All Sitecore calls in the app continue to ride ClientSDK Mode A — uniform error handling, uniform iframe-session permission model.
3. **No new env vars.** No `.env.example` change. No infrastructure footprint.
4. **No CSP frame-ancestors change.** The app remains a pure client-side iframe.
5. **`sitecoreai-auth` skill becomes informational reference only** for this PRD — not load-bearing.

### Consequences of Branch B (if selected)

1. **ADR-0002 is partially superseded** — for the publishing surface only. ADR-0002's "no server-side OAuth proxy" stance is relaxed to "no server-side OAuth proxy *except for SitecoreAI REST APIs the SDK does not wrap*". Other Sitecore calls in this app remain Mode A (Authoring GraphQL via `xmc.authoring.graphql`, sites via `xmc.sites.*`). ADR-0002 stays Accepted overall; the supersede is a documented carve-out, not a full replacement. ADR-0002's Consequences section explicitly anticipated this: *"If a future PRD needs to call a Sitecore REST API the SDK does not wrap, the OAuth proxy or a different scaffold must be revisited at that point."*
2. **First server-side route in Redirect Manager.** Routes still deploy inside the same Next.js app — no infrastructure split. App still deploys to Vercel (or any Node-capable host). The static-host flexibility ADR-0002 cited as a benefit is now narrower: the app is still Vercel-friendly but no longer a pure static export.
3. **Secret hygiene becomes a permanent discipline.** The OAuth secret is server-only. Linting / PR review checks for accidental client-side imports of the env vars. `sitecoreai-auth` skill's "secret hygiene" recipe applies.
4. **CSP frame-ancestors unchanged.** The API route is not part of the iframe surface — it is a server endpoint the client calls via same-origin `fetch`. No Cloud Portal re-registration. No `frame-ancestors` allow-list change.
5. **Pattern established for future REST integrations.** Any future PRD that needs a SitecoreAI REST surface the SDK does not wrap (e.g. parts of the Agent API, Pages API not yet wrapped) inherits this pattern cleanly: add a new route under `app/api/<surface>/route.ts`, share the OAuth token cache.

### Consequences common to both branches

- **ADR-0033's service-module contract works unchanged for whichever branch ships.** The `callPublish` adapter is the only swapped surface.
- **PRD-003's Tranche 2 implementation is unblocked.** The Developer reads this ADR (now `Accepted`), picks up the body-builders + outcome mapping + toast contract from ADR-0033, and wires the per-map icon (ADR-0032) + the renamed "Publish Site" CTA.
- **Carry-forward smoke gates** (m1 registration, m3 CRUD round-trip) are not at risk — neither branch touches those surfaces.

## Date

Created 2026-05-16 (status `Proposed`). Tranche 1 partial capture: 2026-05-16 (D-T1.1 = Branch B confirmed). Tranche 1.5 spike (inline probe panel) capture: 2026-05-17 (all gates resolved via real-tenant 201 responses). **Status flipped to `Accepted` 2026-05-17**.

---

## Tranche 1 capture log

| Item | Status | Detail |
|------|--------|--------|
| D-T1.1 — SDK probe | RESOLVED | Branch B selected. No `xmc.publishing.*` surface in SDK. Full hit list in `captures/tranche-1-publish-20260516.md`. |
| T002 — Site languages shape | RESOLVED | `Sites.Site.languages?: Array<string> \| null` at `client-sites/types.gen.d.ts:1019`. Wire-tested `xx` (`"en"`) and `xx-YY` (`"de-DE"`) both accepted on the wire by the Publishing API (probe POST 201 with `locales: ["en"]`). |
| T003 — Publishing host URL | RESOLVED | `https://edge-platform.sitecorecloud.io` — Sitecore-managed single proxy host for ALL tenants (memory `reference_sitecoreai_edge_platform_host.md`). Probe POST 201 confirmed. |
| T004 — Locale shorthand `["*"]` probe | DEFERRED | Operator chose to skip the `["*"]` probe this round; enumerated locales work (probe POST 201 with `["en"]`). PRD AC-P1.4 default = enumerated, so no impact on Tranche 2. Future operator can probe `["*"]` from the probe panel if shorthand simplification is wanted later. |
| D-T1.3 — OAuth credentials | RESOLVED | Service client `Redirect Manager` (id `dkX4dPUYJrARgicYCK3W5og6xBaGH1I2`, type `Application`) registered. Permissions endpoint returned `canCreate: true`, `canReadAll: true`, `canViewDetailsOfAll: true`. POST /jobs returned 201 with `createdBy.type: "Application"`. |
| Wire-shape sanity check (Site + Items) | RESOLVED | Two real 201 Queued responses (job ids `job_046dd6ae7f34440d831872fecb5093af` for Site, `job_91b3e0aa43e2467dadc6997582c6d1e9` for Items). NESTED body shape per `/sai/publishing-api/jobs/create.md` is correct — PRD AC-P1.4 / AC-P2.3 and ADR-0033 body builders need NO revision. |
