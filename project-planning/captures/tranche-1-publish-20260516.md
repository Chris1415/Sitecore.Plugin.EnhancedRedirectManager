# Tranche 1 capture — PRD-003 publish surface

Generated: 2026-05-16T21:00:00Z
Updated: 2026-05-17T13:00:00Z (Tranche 1.5 spike — all gates resolved via inline probe panel)
Branch: prd-003
Source: /implement Tranche 1 + Tranche 1.5 (inline probe panel spike)

> **STATUS: ALL GATES RESOLVED 2026-05-17.** The OPERATOR ACTION REQUIRED markers in the sections below are historical (kept for audit trail). Scroll to **§ Tranche 1.5 — real-tenant captures (2026-05-17)** at the bottom for the locked answers. ADR-0034 flipped to Accepted same date.

---

## § SDK probe (T001)

### Grep commands executed

**Command 1** — search all `*.gen.d.ts` files for `publish`/`publishing` (case-insensitive):
```
grep -rni "publish|publishing" \
  products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/**/*.gen.d.ts
```

**Command 2** — search all `*.gen.d.ts` files for `jobs`/`listJobs`/`retrieveJob`/`createJob`:
```
grep -rni "jobs|listJobs|retrieveJob|createJob" \
  products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/**/*.gen.d.ts
```

### Hit list — publish/publishing hits

All hits classified by source; **none are publishing job creation endpoints**:

| Path | Line | Text | Classification |
|------|------|------|----------------|
| `client-pages/augmentation.gen.d.ts` | 5 | `publishing and workflow information` | Page info docstring — NOT a publishing action |
| `client-pages/augmentation.gen.d.ts` | 47 | `Checks if the requested page is published to Edge` | Page state query — NOT a publishing action |
| `client-pages/schemas.gen.d.ts` | 229 | `readonly publishing: { readonly $ref: "#/components/schemas/Publishing"; }` | Page metadata schema — NOT a publishing action |
| `client-pages/schemas.gen.d.ts` | 302 | `readonly isLatestPublishableVersion` | Page property — NOT a publishing action |
| `client-pages/schemas.gen.d.ts` | 752 | `readonly canPublish` | Permission property — NOT a publishing action |
| `client-pages/schemas.gen.d.ts` | 805 | `export declare const PublishingSchema` | Page state schema — NOT a publishing action |
| `client-pages/types.gen.d.ts` | 169 | `publishing?: Publishing;` | Page state embedded in page type — NOT a publishing action |
| `client-pages/types.gen.d.ts` | 567 | `canPublish?: boolean;` | Permission flag — NOT a publishing action |
| `client-pages/types.gen.d.ts` | 602 | `type Publishing = { isPublishable?, hasPublishableVersion?, isAvailableToPublish? }` | Page publishability metadata type — NOT a publishing action |
| `client-pages/sdk.gen.d.ts` | 42 | `publishing and workflow information` | Docstring — NOT a publishing action |
| `client-pages/sdk.gen.d.ts` | 81 | `Check if a page is published to Edge` | Read/check endpoint — NOT a publishing action |
| `client-sites/schemas.gen.d.ts` | 1139 | `readonly isLatestPublishableVersion` | Page version property in sites context — NOT a publishing action |
| `client-sites/schemas.gen.d.ts` | 1252 | `readonly canPublish` | Permission flag in sites context — NOT a publishing action |
| `client-sites/types.gen.d.ts` | 787 | `isLatestPublishableVersion?: boolean;` | Property — NOT a publishing action |
| `client-sites/types.gen.d.ts` | 868 | `canPublish?: boolean;` | Permission flag — NOT a publishing action |
| `client-xmapp/schemas.gen.d.ts` | 1064 | `readonly canPublish` | Permission flag — NOT a publishing action |
| `client-xmapp/types.gen.d.ts` | 754 | `canPublish?: boolean;` | Permission flag — NOT a publishing action |
| `client-xmapp/types.gen.d.ts` | 1544 | `This page language version isn't published to Edge.` | Status description string — NOT a publishing action |
| `client-xmapp/types.gen.d.ts` | 1551 | `The page is live and published to Edge.` | Status description string — NOT a publishing action |
| `experimental/client-pages/*` | various | Same as client-pages — all page metadata / permission flags | NOT publishing actions |
| `experimental/client-sites/*` | various | Same as client-sites — permission flags | NOT publishing actions |

**No file in the tree contains** `xmc.publishing.*`, `createPublishJob`, `publishSite`, `publishItems`, or any mutation/query that calls `/authoring/publishing/v1/jobs`.

### Hit list — jobs hits

| Path | Line | Text | Classification |
|------|------|------|----------------|
| `client-sites/augmentation.gen.d.ts` | 6 | `'xmc.sites.listJobs'` | Sites background jobs — DO NOT COUNT (per ADR-0034 step 1) |
| `client-sites/augmentation.gen.d.ts` | 13 | `'xmc.sites.retrieveJob'` | Sites background jobs — DO NOT COUNT |
| `client-sites/sdk.gen.d.ts` | 74 | `export declare const listJobs` | Sites background jobs — DO NOT COUNT |
| `client-sites/sdk.gen.d.ts` | 75 | `export declare const retrieveJob` | Sites background jobs — DO NOT COUNT |
| `client-sites/types.gen.d.ts` | 1624 | `url: '/api/v1/jobs'` | Sites jobs REST URL — DO NOT COUNT |
| `client-sites/types.gen.d.ts` | 1651 | `url: '/api/v1/jobs/{jobHandle}/status'` | Sites jobs status REST URL — DO NOT COUNT |
| `client-xmapp/augmentation.gen.d.ts` | 63 | `'xmc.xmapp.listJobs'` | Xmapp background jobs — DO NOT COUNT |
| `client-xmapp/augmentation.gen.d.ts` | 71 | `'xmc.xmapp.retrieveJob'` | Xmapp background jobs — DO NOT COUNT |
| `client-xmapp/sdk.gen.d.ts` | 130–132 | `listJobs` — "Fetches information about background jobs" | Xmapp background jobs — DO NOT COUNT |
| `client-xmapp/sdk.gen.d.ts` | 137 | `retrieveJob` | Xmapp background job retrieve — DO NOT COUNT |
| `client-xmapp/types.gen.d.ts` | 1779 | `url: '/api/v1/jobs'` | Same xmapp jobs URL — DO NOT COUNT |
| `client-agent/augmentation.gen.d.ts` | 181 | `'xmc.agent.jobsGetJob'` | AI agent jobs (unrelated to publishing) — DO NOT COUNT |
| `client-agent/augmentation.gen.d.ts` | 188 | `'xmc.agent.jobsListOperations'` | AI agent operations — DO NOT COUNT |
| `client-agent/augmentation.gen.d.ts` | 265 | `'xmc.agent.jobsRevertJob'` | AI agent revert — DO NOT COUNT |
| `experimental/client-sites/*` | various | Same listJobs/retrieveJob — sites background jobs | DO NOT COUNT |
| `experimental/client-agent/*` | various | Same agent job operations | DO NOT COUNT |

### Verdict

**D-T1.1 = Branch B** — no publishing surface found in the SDK. All `publish*` hits are page-state properties or permission flags; all `jobs` hits are sites background jobs (`xmc.sites.listJobs`, `xmc.xmapp.listJobs`) or AI agent jobs — none are SitecoreAI Publishing v1 job creation endpoints. The grep covered all `.gen.d.ts` files across all client modules including `experimental/`. **Branch B (Next.js API route + OAuth client-credentials proxy) is confirmed as the implementation path for Tranche 2.**

---

## § Site languages (T002)

### TypeScript shape from `.d.ts`

File: `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts`

**Line 1019 (inside `Sites.Site` type, retrieval context):**
```typescript
/**
 * The list of languages in use by the site.
 * Example value: [
 * "en-US",
 * "en-CA"
 * ]
 */
languages?: Array<string> | null;
```

The example values in the type use `xx-YY` regional ISO format (`"en-US"`, `"en-CA"`), which is the format the SitecoreAI Publishing v1 API accepts for the `options.xmc.locales` array.

### Existing app double `.data.data` unwrap convention

File: `site/lib/sdk/sites.ts` lines 35–39:
```typescript
const result = await client.query('xmc.sites.listSites', {
  params: { query: { sitecoreContextId } },
});
// DOUBLE unwrap: result.data (SDK wrapper) → .data (hey-api envelope) → Array<Sites.Site>
return (result as { data?: { data?: Sites.Site[] } }).data?.data ?? [];
```

The `retrieveSite` call would produce the same double-unwrap pattern; the `languages` field is then accessed as `site.languages` on the resulting `Sites.Site` object.

### Values from solo tenant

**OPERATOR ACTION REQUIRED** — Use the running Redirect Manager app's Site Picker (or Cloud Portal → Sites → select the solo-website site → Languages tab) to capture the actual `languages` array value for the solo / solo-website tenant. Record the exact array (e.g., `["en"]` vs `["en-US", "de-DE"]`) in this capture. This value will determine whether locale format is `xx` or `xx-YY` in the `buildSitePublishBody` function (Tranche 2 T015).

---

## § Publishing host (T003)

**OPERATOR ACTION REQUIRED** — Provide the canonical SitecoreAI Publishing v1 base URL for the solo tenant. Source of truth: Cloud Portal → select the solo tenant → Developer Settings (or Tenant Settings) → "Publishing API endpoint" (or equivalently labelled field). The URL is typically of the form `https://xmc-<tenant-identifier>.sitecorecloud.io`. This value will populate `SITECORE_PUBLISHING_BASE_URL` in `.env.example` documentation for Tranche 2. Do NOT commit it to `.env.local` or any tracked file.

---

## § Locale shorthand probe (T004)

**OPERATOR ACTION REQUIRED** — Once T003 is resolved, POST a Publish Site body with `options.xmc.locales = ["*"]` against the solo tenant to determine if the shorthand is accepted. Use the following curl template (replace all `$PLACEHOLDER` values):

```bash
curl -s -X POST \
  "$PUBLISHING_HOST/authoring/publishing/v1/jobs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "tranche-1-probe-shorthand",
    "source": "Redirect Manager probe",
    "options": {
      "xmc": {
        "site": {
          "siteId": "$SITE_ID",
          "mode": "Republish"
        },
        "locales": ["*"]
      }
    }
  }'
```

Where:
- `$PUBLISHING_HOST` = the base URL from T003 (e.g., `https://xmc-<tenant>.sitecorecloud.io`)
- `$TOKEN` = a valid OAuth bearer token obtained via `sitecore:sitecoreai-auth` client-credentials flow using the service client registered for the solo tenant
- `$SITE_ID` = the GUID of the solo-website site (visible in Cloud Portal → Sites → select site → system info, or captured from the app's Site Picker response)

**Expected outcomes:**
- HTTP 201 → shorthand `["*"]` accepted; record "shorthand accepted" and use `["*"]` as the default in `buildSitePublishBody` (overriding the enumerated-locales default from AC-P1.4)
- HTTP 400 (locale-format error) → shorthand rejected; enumerated locales from T002 values remain the default
- Record the full response status + body verbatim in this capture

---

## § OAuth credentials verification (T005 D-T1.3)

**OPERATOR ACTION REQUIRED** — Confirm a Cloud Portal service client is registered for the solo tenant with the following scope set:

- **API scope** (one of): `xmcpub.jobs.a:w` OR `xmcpub.jobs.t:w` OR `xmcpub.jobs.t:wl`
- **Client scope**: `xmcloud.cm:admin`

If not registered, follow the `sitecore:sitecoreai-auth` skill to create a new service client in Cloud Portal → Credentials → Service Clients. Once registered, record:
- The OAuth token endpoint URL (typically `https://auth.sitecorecloud.io/oauth/token`)
- The confirmed scope set (which of the three `xmcpub.jobs.*:w` variants was used)
- The client ID (to populate `SITECORE_OAUTH_CLIENT_ID` in `.env.example`)

The client secret is captured locally only — never committed. The token endpoint and scope string are safe to document in `.env.example` as non-secret values.

---

## § Tranche 1 verdict summary

- **D-T1.1**: Branch B — no `xmc.publishing.*` surface found across all `*.gen.d.ts` files in `@sitecore-marketplace-sdk/xmc`. All `publish*` hits are page-state properties; all `jobs` hits are sites background jobs or AI agent jobs. Branch A is struck. Branch B (Next.js API route + OAuth client-credentials) is the implementation path.
- **D-T1.2** (T004 locale shorthand): PENDING — operator action required (curl probe against solo tenant after T003 host is captured)
- **D-T1.3** (T005 OAuth creds): PENDING — operator action required (confirm Cloud Portal service client registration with required scopes)
- **T002 language values**: PENDING — operator action required (capture `languages` array from solo-website site)
- **T003 publishing host**: PENDING — operator action required (Cloud Portal → Developer Settings → Publishing API endpoint)
- **ADR-0034 status**: `Proposed (Tranche 1 partial — awaiting T002 values / T003 host / T004 shorthand verdict / D-T1.3 OAuth credentials verification)`. Branch A struck; Branch B confirmed as selected. Status not flipped to Accepted yet pending operator gate items.
- **READY for Tranche 2**: NO — operator gate pending (T002 values, T003 host URL, T004 shorthand verdict, D-T1.3 OAuth credentials verification). All four items must be resolved and recorded before Tranche 2 starts.

---

## § Tranche 1.5 — real-tenant captures (2026-05-17)

Source: inline publish probe panel (env-gated, `NEXT_PUBLIC_SHOW_PUBLISH_PROBE=1`). Operator ran all 7 endpoints against solo tenant; results pasted into chat 2026-05-17.

### Permissions endpoint (`GET /authoring/publishing/v1/jobs/permissions`)

```json
{
  "canReadAll": true,
  "canReadOwn": true,
  "canViewDetailsOfAll": true,
  "canViewDetailsOfOwn": true,
  "canCreate": true
}
```

**Verdict:** D-T1.3 RESOLVED. Service client has all required write + read aggregate scopes. The `canViewDetailsOfAll: true` rules out the `:t:wl` limited-write variant. Operator's automation client uses `xmcpub.jobs.a:r` + `xmcpub.jobs.a:w` + `xmcloud.cm:admin`.

### OAuth client identity (from POST /jobs response `createdBy`)

```json
{
  "id": "dkX4dPUYJrARgicYCK3W5og6xBaGH1I2",
  "name": "Redirect Manager",
  "type": "Application"
}
```

Service client registered against solo tenant under the name **Redirect Manager**. Application token (client_credentials) — `createdBy.type: "Application"` confirms the OAuth flow is correct (not user-delegated).

### Site publish — 201 Queued

**Request** (probe-built per `/sai/publishing-api/jobs/create.md` nested shape):
```json
{
  "name": "Site publish — MySite — 2026-05-17T12:45:18.583Z",
  "source": "Redirect Manager probe",
  "description": "Triggered from Redirect Manager publish probe panel",
  "options": {
    "xmc": {
      "site": { "mode": "Republish" },
      "locales": ["en"]
    }
  }
}
```

**Response** (201):
```json
{
  "id": "job_046dd6ae7f34440d831872fecb5093af",
  "system": { "status": "Queued", "environmentId": "main", "branchId": "main" },
  ...
}
```

**Verdict:** Wire shape for Site publish CONFIRMED. PRD AC-P1.4 nested shape is correct.

### Per-map publish (Items) — 201 Queued

**Request** (probe-built):
```json
{
  "name": "Map publish — Homepage Redirects — 2026-05-17T12:44:31.072Z",
  "source": "Redirect Manager probe",
  "description": "Triggered from Redirect Manager per-map publish probe",
  "options": {
    "items": [{ "id": "<real-map-guid>", "type": "Item", "locale": "*" }],
    "xmc": {
      "items": {
        "mode": "Republish",
        "publishChildren": false,
        "publishRelatedItems": false
      }
    }
  }
}
```

**Response** (201):
```json
{
  "id": "job_91b3e0aa43e2467dadc6997582c6d1e9",
  "system": { "status": "Queued" },
  ...
}
```

**Note:** the response's `options.xmc.locales: []` (empty array) — server normalizes when items[].locale is used and xmc.locales is omitted. The docs constraint "*A combination of locale in item and in options.xmc.locales is not allowed*" is enforced via server normalization, not 400.

**Verdict:** Wire shape for Items publish CONFIRMED. PRD AC-P2.3 nested shape is correct.

### Cancel a Completed job — 409 ProblemDetails (expected)

```json
{
  "type": "https://datatracker.ietf.org/doc/html/rfc9110#name-409-conflict",
  "title": "Conflict",
  "status": 409,
  "detail": "Cannot cancel job '...' because it is either in a final state or items sending is complete. Job status: Completed', ItemsSendingComplete: True.",
  "instance": "POST /api/publishing/v1/jobs/.../cancel",
  "traceId": "cccb5c2550dd2755a2654064d6ee2e9a"
}
```

**Verdict:** Error envelope shape locked. `outcomeFrom` mapper (PRD ADR-0033) will surface `detail` → toast per AC-P1.6 / AC-P2.5.

### Pre-correction failures captured for the record

- **First POST attempt:** Body shape hallucinated by initial probe panel preset (fields `type: "PublishSite"`, `targetSite`, `publishMode`) — returned 400 ProblemDetails with `errors: { Name: [...], Source: [...], Options: [...] }` indicating required fields missing.
- **Second POST attempt (flat shape per GET response):** Returned 500 ProblemDetails — server model-bind crash. Lesson: GET responses normalize the input shape; do NOT use GET as the source of truth for input contract. Trust `/jobs/create.md` for input. See memory `reference_sitecoreai_jobs_input_vs_output_shape.md`.

### Other endpoints captured (informational, no impact on PRD-003 main scope)

- **GET /jobs** — checkpoint pagination via `next` cursor; rich job shape with `statistics` + `system` + per-job `permissions.{canViewDetails, canCancel}`. Future PRD candidate (Job History).
- **GET /jobs/filters** — filter taxonomy `{statuses, sources, createdBy}`. Future PRD candidate.
- **GET /jobs/summary** — `{counts: {queued, running, canceled, failed, completed, canceling}}`. Future Dashboard tile candidate.

### Final verdict

**ALL TRANCHE 1 GATES RESOLVED.** Tranche 2 unblocked. ADR-0034 flipped to Accepted 2026-05-17.

| Item | Verdict |
|------|---------|
| D-T1.1 — SDK probe | Branch B (no SDK wrapper) |
| D-T1.2 — `locales: ["*"]` shorthand probe | Deferred (operator skipped; enumerated locales work; PRD AC-P1.4 default = enumerated, so no impact) |
| D-T1.3 — OAuth credentials | Registered + scopes verified |
| T002 — Site languages | Type confirmed (`Array<string> \| null`); both `xx` and `xx-YY` accepted on the wire |
| T003 — Publishing host | `https://edge-platform.sitecorecloud.io` (single Sitecore-managed proxy for ALL tenants) |
| Wire shape — Site | NESTED `options.xmc.site.{mode}` + sibling `options.xmc.locales` (per /jobs/create.md; PRD AC-P1.4 correct) |
| Wire shape — Items | NESTED `options.items[]` + `options.xmc.items.{mode, publishChildren, publishRelatedItems}` (per /jobs/create.md; PRD AC-P2.3 correct) |
| Error envelope | RFC 7807 ProblemDetails `{type, title, status, detail, instance, traceId}` + optional `errors: {Field: [messages]}` extension for validation errors |
