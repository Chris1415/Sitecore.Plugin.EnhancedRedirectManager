# Development Execution Plan

---
document_type: task_breakdown
artifact_name: task-breakdown-20260516T194651Z.md
generated_at: 2026-05-16T19:46:51Z
run_manifest: project-planning/workflow/run-20260516T194651Z.json
source_inputs:
  - project-planning/PRD/prd-003.md
  - project-planning/PRD/prd-minimal-003.md (Developer 08 orientation only)
  - project-planning/ADR/adr-0002-marketplace-sdk-mode-a-scaffold.md
  - project-planning/ADR/adr-0011-extension-points-and-routes.md
  - project-planning/ADR/adr-0030-full-page-hero-ctas-decorative.md
  - project-planning/ADR/adr-0031-publish-surface-decided-at-tranche-1.md
  - project-planning/ADR/adr-0032-per-map-publish-placement.md
  - project-planning/ADR/adr-0033-publish-service-module-contract.md
  - project-planning/ADR/adr-0034-publish-surface-branch-resolution.md (Proposed → Accepted at Tranche 1)
consumed_by:
  - QA Specialist (07) enriches this file; Developer (08) implements from this file + prd-minimal-003
next_input:
  - project-planning/plans/qa-report.md (optional — minimal track may skip standalone report)
---

## 1. Implementation Overview

PRD-003 wires the placeholder "Publish all" hero CTA to a real SitecoreAI publish job (renamed "Publish Site"), and adds a per-map "Publish" icon button to every Redirect Map row in the rail. Both surfaces hit `POST /authoring/publishing/v1/jobs` (SitecoreAI Publishing v1 REST API). Operator pre-committed Branch B (server-side Next.js API route holding OAuth client-credentials) as the fallback if Tranche 1 confirms there is no SDK wrapper — which planning-time evidence (ADR-0033 § SDK probe evidence) already strongly suggests.

The plan is split into **two tranches** with a hard operator gate between them:

- **Tranche 1 (T001–T005)** — read-only SDK + tenant probe, plus one ADR amendment. Resolves OQ-P1..P5 and flips ADR-0034 from `Proposed` to `Accepted`. No production code is written. **Operator approval required before Tranche 2 starts.**
- **Tranche 2 (T006–T028)** — implementation. Branch-agnostic service-module core first (ADR-0033 contract — testable without picking the transport), then the branch-specific transport adapter (Branch A SDK or Branch B server route), then UI integration (WorkspaceHero rename + confirmation dialog + RedirectMapList icon button), then the `m_publish` real-tenant smoke gate.

TDD discipline is QA Specialist (07)'s responsibility — the tranche structure groups implementation tasks alongside their unit-test tasks so QA can cleanly invert each pair to RED-then-GREEN. Default `Depends on` here is test-after; QA flips to test-first.

## 2. Epics

- **E-1 — Tranche 1 capture & decide.** Confirm Branch B (or A), capture locale-shorthand acceptance, confirm OAuth credentials, amend ADR-0034.
- **E-2 — Publish service module (branch-agnostic core).** Implement ADR-0033 contract: `PublishScope` types, body builders, outcome mapper, toast adapter, `publish()` orchestration.
- **E-3 — Transport adapter.** Branch-dependent: Branch B = Next.js API route + OAuth token cache + env wiring; Branch A = thin SDK wrapper around `client.mutate`.
- **E-4 — UI integration.** WorkspaceHero rename + confirmation dialog; RedirectMapList icon button with stopPropagation + in-flight icon swap.
- **E-5 — Locale + body wiring.** Resolve site locales via `xmc.sites` for Publish Site; resolve map GUID + display name for per-map publish.
- **E-6 — Smoke gate `m_publish`.** Real-tenant verification + carry-forward gates m1 / m3.

## 3. Feature Breakdown

| Feature | Epics | Key files |
|---|---|---|
| Tranche 1 capture | E-1 | `project-planning/captures/tranche-1-publish-20260516.md`; `project-planning/ADR/adr-0034-publish-surface-branch-resolution.md` |
| Publish service module | E-2 | `site/lib/publish/publish-service.ts`; `site/lib/publish/types.ts`; `site/lib/publish/toast-adapter.ts` |
| Transport (Branch B expected) | E-3 | `site/lib/publish/transport-server.ts`; `site/app/api/publish/route.ts`; `site/lib/auth/sitecoreai-token.ts`; `site/.env.example` |
| Transport (Branch A fallback) | E-3 | `site/lib/publish/transport-sdk.ts` (only if SDK wrapper found) |
| Workspace hero rename + dialog | E-4 | `site/components/full-page/WorkspaceHero.tsx`; `site/components/full-page/PublishSiteConfirmModal.tsx` |
| Per-map icon button | E-4 | `site/components/full-page/RedirectMapList.tsx`; `site/components/full-page/RedirectMapPublishButton.tsx` |
| Locale resolution | E-5 | `site/lib/sdk/sites.ts` (read-only re-use); `site/lib/publish/locale-resolver.ts` |
| Smoke gate `m_publish` | E-6 | `site/docs/smoke-publish.md` (new) |

## 4. Task Breakdown

### Tranche 1 — SDK probe + capture + decide (read-only; HARD OPERATOR GATE at end)

- **Task ID:** T001
- **Title:** SDK publishing-surface probe in `@sitecore-marketplace-sdk/xmc` .d.ts
- **Description:** Run a grep across `products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/**/*.gen.d.ts` for the literals `publish`, `publishing`, `jobs`. Per ADR-0034 step 1: hits in `client-sites` that refer to *sites* background jobs (`listJobs`, `retrieveJob`) DO NOT count. Hits referring to a true publishing endpoint (e.g. `xmc.publishing.createJob`) DO count. Record every hit verbatim with file path + line number into the Tranche 1 capture artifact. **Read-only — no code change.**
- **Expected Output:** A capture artifact at `products/redirect-manager/project-planning/captures/tranche-1-publish-20260516.md` § "SDK probe" containing: grep command run, full hit list with `<path>:<line>:<text>`, and one of the two decisions: "**D-T1.1 = Branch A** — SDK method `<name>` at `<path>:<line>`" OR "**D-T1.1 = Branch B** — no publishing surface in SDK".
- **Depends on:** none

---

- **Task ID:** T002
- **Title:** Capture `Sites.Site.languages` shape for the solo tenant (OQ-P4)
- **Description:** Against the solo / solo-website tenant, read one site via `xmc.sites.retrieveSite` (or use existing `listSites` from `site/lib/sdk/sites.ts` and pick the target site). Capture the full `languages?: Array<string> | null` array verbatim. Confirm the format matches one of `xx` (e.g. `"da"`) or `xx-YY` (e.g. `"en-US"`) — the regional ISO format the Publishing v1 API accepts. Write into the Tranche 1 capture artifact. **Read-only — uses existing SDK client; no new code added to `site/`.**
- **Expected Output:** Capture artifact § "Site languages" containing: tenant + site ID, the `languages` array verbatim (e.g. `["en-US", "de-DE"]`), and a verdict: "format compatible with Publishing v1" OR "format-mismatch — see follow-up".
- **Depends on:** none

---

- **Task ID:** T003
- **Title:** Capture SitecoreAI Publishing host URL for the solo tenant (OQ-P3)
- **Description:** Locate the canonical Publishing API host for the solo tenant. Sources (in order of preference): (a) Cloud Portal → tenant developer settings → "Publishing API endpoint" (or equivalently labelled), (b) operator-supplied value, (c) the existing PRD-000 capture artifacts if the tenant's Publishing URL was incidentally captured. Record the host URL into the capture artifact. **No `.env.local` is written or committed.** This value will populate `SITECORE_PUBLISHING_BASE_URL` in `.env.example` documentation only.
- **Expected Output:** Capture artifact § "Publishing host" containing: the canonical Publishing base URL string (e.g. `https://xmc-<tenant>.sitecorecloud.io` form, or whatever the Cloud Portal exposes) and the source (Cloud Portal screenshot reference / operator-supplied).
- **Depends on:** none

---

- **Task ID:** T004
- **Title:** Live probe — does the Publishing v1 API accept `options.xmc.locales = ["*"]`? (OQ-P2)
- **Description:** Against the solo tenant Publishing v1 endpoint (URL captured in T003), POST a Publish Site body with `options.xmc.locales = ["*"]` using a curl / Postman / equivalent tool (NOT yet wired into the app — this is a manual probe). Capture the response status + body verbatim. If 201 → record "shorthand accepted" and `options.xmc.locales = ["*"]` becomes the default body shape in `buildSitePublishBody`. If 400 with a locale-format error → record "shorthand rejected" and the body must enumerate locales from T002's capture. Either way, capture the actual response payload (id, ProblemDetails, etc.).
- **Expected Output:** Capture artifact § "Locale shorthand probe" containing: full request body sent, response status, response body, and verdict (accepted / rejected). If rejected, also include the expected format the API requires.
- **Depends on:** T003

---

- **Task ID:** T005
- **Title:** Amend ADR-0034 — strike losing branch + flip status to Accepted (Branch B optional follow-on ADR-0035)
- **Description:** Per ADR-0034 step 5, the Developer amends `project-planning/ADR/adr-0034-publish-surface-branch-resolution.md`: (a) strike through the losing option in the Decision section, (b) fill in branch-specific specifics (Branch B: confirmed OAuth scope strings, token endpoint, base URL var name; Branch A: SDK method name, .d.ts citation, unwrap level), (c) append "Accepted YYYY-MM-DD" to the Date field, (d) flip Status from `Proposed` to `Accepted`. If **Branch B** is selected (the operator-pre-committed expectation), additionally also verify OAuth client-credentials are registered against the solo tenant with required scopes (one of `xmcpub.jobs.a:w` / `xmcpub.jobs.t:w` / `xmcpub.jobs.t:wl`) + `xmcloud.cm:admin` (D-T1.3 per ADR-0034). If NOT registered, **HARD STOP** and report to operator — Tranche 2 cannot start. ADR-0035 (capturing the partial supersede of ADR-0002 for the publishing surface) is **not** authored as part of T005 — the operator pre-approved the supersede, and ADR-0035 is written at /ship time as part of the ADR pack, not at Tranche 1. (Confirm with operator at the Tranche 1 gate.)
- **Expected Output:** `adr-0034-publish-surface-branch-resolution.md` updated (Status = Accepted, losing branch struck, specifics filled, date appended). Capture artifact § "OAuth credentials verification" containing: scope set confirmed, token endpoint confirmed, OR a HARD STOP entry pointing the operator at the credential-setup steps in `sitecore:sitecoreai-auth`.
- **Depends on:** T001, T002, T003, T004

---

> **=== HARD OPERATOR GATE — Tranche 1 → Tranche 2 ===**
>
> The Developer (08) stops work after T005 and waits for operator approval before starting T006. Per memory `feedback_real_tenant_probe_caught_assumption_at_T001` (Redirect Manager PRD-001 case) and `feedback_working_style.md` (hard checkpoint between phases against real-tenant), this gate is non-negotiable.
>
> Operator reviews: (a) capture artifact, (b) ADR-0034 amendment, (c) branch decision, (d) any HARD STOP from D-T1.3. Operator approves → Tranche 2 starts.

---

### Tranche 2 — Implement (TDD; QA Specialist 07 will reorder for RED→GREEN)

#### Group 2A — Branch-agnostic service module core (per ADR-0033)

- **Task ID:** T006
- **Title:** `site/lib/publish/types.ts` — `PublishScope`, `PublishApiRequest`, `PublishApiResponse`, `ProblemDetails`, `PublishOutcome`
- **Description:** Define the TypeScript types that the service module + transport + UI all share. `PublishScope` is the discriminated union (ADR-0033 § 1: `kind: "site"` with `siteId, siteDisplayName, locales[]` OR `kind: "item"` with `mapId, mapDisplayName`). `PublishApiRequest` is the body shape per PRD AC-P1.4 / AC-P2.3 (`{ name, source, description?, options: { items?, xmc: { site?, items?, locales? } } }`). `PublishApiResponse` is the consumed slice `{ id: string, system: { status: "Queued" | "Running" | "Completed" | "Failed" | "Canceled" | "Canceling" } }` (other fields like `name, options, permissions, source, description, statistics` MAY be present but are not consumed by the app). `ProblemDetails` matches RFC 7807: `{ type?: string, title?: string, status?: number, detail?: string, instance?: string }`. `PublishOutcome` per ADR-0033 § 4. All types EXPORTED.
- **Expected Output:** `site/lib/publish/types.ts` with the 5 types above, fully exported, with one JSDoc comment per type citing the ADR-0033 section + PRD AC reference.
- **Depends on:** T005

---

- **Task ID:** T007
- **Title:** `site/lib/publish/publish-service.ts` — `buildSitePublishBody`
- **Description:** Pure function implementing PRD AC-P1.4 verbatim. Signature: `export function buildSitePublishBody(scope: Extract<PublishScope, { kind: "site" }>, nowIso?: string): PublishApiRequest;` The `nowIso` parameter is for test injection — defaults to `new Date().toISOString()`. Body fields: `name: \`Site publish — \${scope.siteDisplayName} — \${nowIso}\``, `source: "Redirect Manager"`, `description: "Triggered from Redirect Manager Full Page workspace hero"`, `options.xmc.site.mode: "Republish"`, `options.xmc.locales: scope.locales` (the array passed in — caller pre-resolves: enumerated locales from T020, OR `["*"]` only if T004 confirmed shorthand acceptance). The body MUST be a plain JSON-serializable object; no class instances, no `undefined` values.
- **Expected Output:** Function exported from `site/lib/publish/publish-service.ts` matching the signature; produces a byte-equivalent body when fed scope `{ kind: "site", siteId: "X", siteDisplayName: "My Site", locales: ["en-US","de-DE"] }` + fixed `nowIso` "2026-05-16T20:00:00.000Z" that matches PRD AC-P1.4's example body shape.
- **Depends on:** T006

---

- **Task ID:** T008
- **Title:** `site/lib/publish/publish-service.ts` — `buildItemPublishBody`
- **Description:** Pure function implementing PRD AC-P2.3 verbatim. Signature: `export function buildItemPublishBody(scope: Extract<PublishScope, { kind: "item" }>, nowIso?: string): PublishApiRequest;` Body fields: `name: \`Map publish — \${scope.mapDisplayName} — \${nowIso}\``, `source: "Redirect Manager"`, `description: "Triggered from Redirect Manager per-map publish action"`, `options.items: [{ id: scope.mapId, type: "Item", locale: "*" }]`, `options.xmc.items.mode: "Republish"`, `options.xmc.items.publishChildren: false`, `options.xmc.items.publishRelatedItems: false`. NO `options.xmc.site` and NO `options.xmc.locales` for the item flow.
- **Expected Output:** Function exported from `publish-service.ts`; produces a byte-equivalent body matching PRD AC-P2.3 for fixed scope + nowIso.
- **Depends on:** T006

---

- **Task ID:** T009
- **Title:** `site/lib/publish/publish-service.ts` — `outcomeFrom` mapper
- **Description:** Pure function per ADR-0033 § 4. Signature: `export function outcomeFrom(status: number, body: PublishApiResponse | ProblemDetails): PublishOutcome;` Behavior: (a) `status === 201` AND `body.id` is a non-empty string → return `{ kind: "queued", jobId: body.id, jobIdShort: body.id.slice(0, 8) }`; (b) any non-201 status → `{ kind: "failed", status, detail: body.detail ?? body.title ?? \`HTTP \${status}\` }` per AC-P1.6 / AC-P2.5; (c) `status === 201` but `body.id` missing/empty → `{ kind: "failed", status, detail: "Unexpected response shape from publishing API" }`. Use type narrowing — do not cast.
- **Expected Output:** Function exported from `publish-service.ts`; handles 201/happy, 201/malformed, 400/with-detail, 400/no-detail-with-title, 401, 500 cases per AC.
- **Depends on:** T006

---

- **Task ID:** T010
- **Title:** `site/lib/publish/toast-adapter.ts` — Sonner-backed `ToastAdapter`
- **Description:** Wrap the existing `sonner` toast surface (already a PRD-000 dep at `^2.0.7`, used in `WorkspaceHero`, `NewRedirectMapModal`, `DeleteMapConfirmModal`, `RedirectMapDetail`, `FullPage`) into the `ToastAdapter` interface from ADR-0033 § 5. Signature: `export function createSonnerToastAdapter(): ToastAdapter;` `requested(message)` calls `toast.loading(message)` and returns the toast id. `queued(message, opts?)` calls `toast.success(message, { id: opts?.dismissId })` (passing the id replaces the loading toast). `failed(message, opts?)` calls `toast.error(message, { id: opts?.dismissId })` — same dismiss-and-replace pattern. The adapter file MUST NOT introduce any new toast styles — Sonner defaults only.
- **Expected Output:** `site/lib/publish/toast-adapter.ts` exporting `createSonnerToastAdapter` and the `ToastAdapter` type (or re-exporting from `types.ts`).
- **Depends on:** T006

---

- **Task ID:** T011
- **Title:** `site/lib/publish/publish-service.ts` — `publish(scope, deps)` orchestration
- **Description:** Public orchestration function per ADR-0033 § 6. Signature: `export async function publish(scope: PublishScope, deps: { callPublish: CallPublish; toasts: ToastAdapter }): Promise<PublishOutcome>;` Flow: (1) build body via `buildSitePublishBody` or `buildItemPublishBody` based on `scope.kind`; (2) call `deps.toasts.requested(...)` with the per-flow requested-message per ADR-0033 § 5; (3) `await deps.callPublish(body)`; (4) call `outcomeFrom(status, body)`; (5) dispatch `deps.toasts.queued(...)` or `deps.toasts.failed(...)` with the dismiss-id from step 2; (6) return the outcome. NO try/catch around `callPublish` — the adapter's contract is to return `{ status, body }` for both happy and failure paths; a thrown exception is a programmer error and should surface (will be caught by React error boundary at call site, but service module does NOT swallow). NO in-flight state in this module — idempotency is the CALLER's job (NFR-P6 / ADR-0033 § 6).
- **Expected Output:** `publish` exported from `publish-service.ts`. The CallPublish type signature is also exported (or imported from `types.ts`).
- **Depends on:** T012a, T010 (T012a encapsulates the T007/T008/T009 RED tests; T011 is the GREEN implementation that satisfies T013a)

---

- **Task ID:** T012a
- **Title:** RED tests — body builders + outcome mapper (vitest) — failing tests written before implementation
- **Description:** [TDD RED STEP] Write failing tests colocated as `site/lib/publish/publish-service.test.ts` BEFORE T007/T008/T009 are implemented. Tests must fail at this point (functions don't exist yet). Cover: (a) `buildSitePublishBody` with `scope = { kind: "site", siteId: "site-001", siteDisplayName: "Solo Website", locales: ["en-US", "de-DE"] }` and `nowIso = "2026-05-16T20:00:00.000Z"` deep-equals the expected body (inline fixture — see § 9 "Verbatim body fixtures"); (b) same for `buildItemPublishBody` with `scope = { kind: "item", mapId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", mapDisplayName: "Homepage Redirects" }` and same `nowIso`; (c) `outcomeFrom(201, { id: "abc12345-rest", system: { status: "Queued" } })` → `{ kind: "queued", jobId: "abc12345-rest", jobIdShort: "abc12345" }`; (d) `outcomeFrom(400, { title: "Bad Request", detail: "Invalid locale" })` → `{ kind: "failed", status: 400, detail: "Invalid locale" }`; (e) `outcomeFrom(400, { title: "Bad Request" })` (no `detail`) → `{ kind: "failed", status: 400, detail: "Bad Request" }`; (f) `outcomeFrom(401, {})` → `{ kind: "failed", status: 401, detail: "HTTP 401" }`; (g) `outcomeFrom(500, { detail: "boom" })` → `{ kind: "failed", status: 500, detail: "boom" }`; (h) `outcomeFrom(201, {})` (no `id`) → `{ kind: "failed", status: 201, detail: "Unexpected response shape from publishing API" }`.
- **Expected Output:** `publish-service.test.ts` exists with 8 failing tests (imports the functions; they don't exist yet so tests fail at import or assertion level).
- **Depends on:** T006

---

- **Task ID:** T012b
- **Title:** GREEN — body builders + outcome mapper tests pass
- **Description:** [TDD GREEN STEP] Implement `buildSitePublishBody` (T007), `buildItemPublishBody` (T008), and `outcomeFrom` (T009) in `site/lib/publish/publish-service.ts` until all 8 tests from T012a pass. See § 9 "Verbatim body fixtures" for the exact expected objects. No new tests added in this step — just code. T012b and T007/T008/T009 are the same implementation work; this task signals that GREEN was confirmed.
- **Expected Output:** `publish-service.test.ts` 8 tests all passing. `publish-service.ts` implements the three functions.
- **Depends on:** T012a

---

- **Task ID:** T013a
- **Title:** RED tests — `publish()` orchestration with spy adapters — failing tests written before implementation
- **Description:** [TDD RED STEP] Write failing orchestration tests BEFORE T011 is implemented. File: `site/lib/publish/publish-service.test.ts` (same file as T012a, describe block `"publish() orchestration"`). Cover: (a) site publish happy path — spy `callPublish` that returns `{ status: 201, body: { id: "abc12345-rest", system: { status: "Queued" } } }` — assert `toasts.requested` called once with `"Publishing site — Solo Website"`, then `callPublish` called once, then `toasts.queued` called once with `"Site publish queued — job abc12345"` and `{ dismissId: <the value returned by toasts.requested> }`; (b) item publish happy path — spy `callPublish` returning 201 — assert `toasts.requested` called with `"Publishing Homepage Redirects"`, `toasts.queued` called with `"Homepage Redirects publish queued — job abc12345"` and the same `dismissId`; (c) site publish failure — spy `callPublish` returns `{ status: 400, body: { title: "Bad Request", detail: "Invalid locale" } }` — assert `toasts.failed` called with `"Publish failed — 400: Invalid locale"` and the `dismissId`; (d) item publish failure — spy returning 400 — assert `toasts.failed` called with `"Homepage Redirects publish failed — 400: Invalid locale"`; (e) `dismissId` contract: the spy for `toasts.requested` returns a fixed value (e.g. `"toast-123"`); assert `toasts.queued` or `toasts.failed` opts contain `{ dismissId: "toast-123" }`. Spies are `vi.fn()` with controlled return values.
- **Expected Output:** 5 failing orchestration tests in `publish-service.test.ts`.
- **Depends on:** T006, T010, T012a

---

- **Task ID:** T013b
- **Title:** GREEN — `publish()` orchestration tests pass
- **Description:** [TDD GREEN STEP] Implement `publish(scope, deps)` in `site/lib/publish/publish-service.ts` (T011 work) until all 5 orchestration tests from T013a pass. T013b and T011 are the same implementation work; this task signals GREEN was confirmed.
- **Expected Output:** All 5 orchestration tests in `publish-service.test.ts` passing. `publish-service.ts` exports `publish`.
- **Depends on:** T013a

---

#### Group 2B — Transport adapter (BRANCH-DEPENDENT — wire only the selected branch)

> Per ADR-0034: Branch B is the expected outcome. If Tranche 1 lands Branch A, T014–T018 collapse to a single SDK-adapter task (T014A below); T015–T018 are then `Depends on: N/A` and skipped.

##### Branch B path — server-side OAuth proxy (expected)

- **Task ID:** T014
- **Title:** `site/lib/auth/sitecoreai-token.ts` — OAuth client-credentials token cache
- **Description:** Per `sitecore:sitecoreai-auth`. Server-only module (no `"use client"` directive; throw if `typeof window !== "undefined"`). Signature: `export async function getSitecoreAiAccessToken(): Promise<string>;` Reads `SITECORE_OAUTH_CLIENT_ID`, `SITECORE_OAUTH_CLIENT_SECRET`, `SITECORE_OAUTH_TOKEN_URL` from `process.env` (throw clearly on missing). POSTs to the token endpoint with `grant_type=client_credentials` + `client_id` + `client_secret` (form-encoded). Caches the token in a module-level `let cached: { token: string; expiresAt: number } | null` with TTL = `expires_in - 60` seconds (60s safety margin). On 401 from a downstream call (the API route handles this), the consumer calls `clearSitecoreAiTokenCache()` to force a refresh; export that function too. NEVER log the secret; never include it in error messages.
- **Expected Output:** `site/lib/auth/sitecoreai-token.ts` exporting `getSitecoreAiAccessToken` + `clearSitecoreAiTokenCache`. Module has no client-side imports.
- **Depends on:** T018a (tests exist and are red before this implementation)

---

- **Task ID:** T015
- **Title:** `site/app/api/publish/route.ts` — POST handler proxying to SitecoreAI Publishing
- **Description:** Next.js 16 App Router route handler. Signature: `export async function POST(request: Request): Promise<Response>;` Flow: (1) parse JSON body; if parse fails return 400 `{ title: "Invalid JSON", status: 400, detail: <err.message> }`; (2) minimal server-side validation that `body.name` is non-empty string AND `body.source === "Redirect Manager"` AND `body.options` is an object — return 400 ProblemDetails if not (this is a defense-in-depth check; the client always sends a well-formed body); (3) `const token = await getSitecoreAiAccessToken()`; (4) `const upstream = await fetch(\`\${process.env.SITECORE_PUBLISHING_BASE_URL}/authoring/publishing/v1/jobs\`, { method: "POST", headers: { authorization: \`Bearer \${token}\`, "content-type": "application/json" }, body: JSON.stringify(body) })`; (5) on `upstream.status === 401` call `clearSitecoreAiTokenCache()` (one-shot refresh on stale token); (6) parse upstream body (JSON); (7) return `new Response(JSON.stringify(upstreamJson), { status: upstream.status, headers: { "content-type": "application/json" } })`. CRITICAL: the route MUST NOT leak `process.env.SITECORE_OAUTH_CLIENT_SECRET` (or any env var) in the response body or in error messages. CRITICAL: route does NOT export `runtime = "edge"` — Node runtime is required for the token cache to work across requests.
- **Expected Output:** `site/app/api/publish/route.ts` with `POST` exported. Handler is async, returns `Response`. No client-side imports.
- **Depends on:** T018a, T014 (T018a tests are red; T014 token cache must exist before route can be implemented)

---

- **Task ID:** T016
- **Title:** `site/lib/publish/transport-server.ts` — client-side `callPublish` that fetches `/api/publish`
- **Description:** The branch-agnostic seam from ADR-0033 § 3 bound to the Branch B route. Signature: `export const callPublishViaServerRoute: CallPublish = async (body) => { ... };` Body: `const res = await fetch("/api/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const json = await res.json().catch(() => ({} as unknown)); return { status: res.status, body: json as PublishApiResponse | ProblemDetails };` Same-origin fetch; no auth header needed (the route holds the OAuth token server-side). NO retry, NO timeout (kept simple — caller's idempotency guard prevents double-submit; latency NFR-P1 is ≤ 3s P95 dominated by upstream).
- **Expected Output:** `site/lib/publish/transport-server.ts` exporting `callPublishViaServerRoute` typed as `CallPublish`.
- **Depends on:** T006, T018b (T018b confirms the route is GREEN before the client-side transport wraps it)

---

- **Task ID:** T017
- **Title:** `.env.example` additions — Branch B environment variables
- **Description:** Append the 5 PRD § 9.4 variables to `products/redirect-manager/site/.env.example` (NOT `.env.local`). Document each with a one-line comment: `SITECORE_OAUTH_CLIENT_ID` (service-client ID with publishing + admin scopes), `SITECORE_OAUTH_CLIENT_SECRET` (corresponding secret — server-only — never expose to client bundle), `SITECORE_OAUTH_TOKEN_URL` (per `sitecore:sitecoreai-auth`), `SITECORE_PUBLISHING_BASE_URL` (per T003 capture), `SITECORE_TENANT_ID` (re-use if already present from PRD-000; do not duplicate). Add a top-of-section comment block: `# === PRD-003 Publish (Branch B — server-side OAuth proxy per ADR-0034) ===` and a closing `# === end PRD-003 ===`. **CRITICAL**: `.env.local` is NEVER committed — verify `.gitignore` already excludes it (likely from scaffold).
- **Expected Output:** `site/.env.example` updated; `.env.local` untouched; `.gitignore` unchanged but verified to exclude `.env.local`.
- **Depends on:** T005

---

- **Task ID:** T018a
- **Title:** RED tests — `/api/publish` route handler + token cache (vitest, mocked `fetch`) — failing tests written before implementation
- **Description:** [TDD RED STEP] Write failing tests BEFORE T014/T015 are implemented. Test files: `site/app/api/publish/route.test.ts` and `site/lib/auth/sitecoreai-token.test.ts`. Use `vi.spyOn(globalThis, "fetch")` to mock `fetch`; set `process.env.SITECORE_OAUTH_CLIENT_SECRET = "SHHH-do-not-leak"` and `process.env.SITECORE_OAUTH_CLIENT_ID = "test-client-id"` and `process.env.SITECORE_OAUTH_TOKEN_URL = "https://auth.example.com/token"` and `process.env.SITECORE_PUBLISHING_BASE_URL = "https://pub.example.com"` in `beforeEach`. Cover for `route.test.ts`: (a) POST with valid body `{ name: "Site publish — Solo Website — 2026-05-16T20:00:00.000Z", source: "Redirect Manager", options: { xmc: { site: { mode: "Republish" }, locales: ["en-US"] } } }` → upstream called with `Authorization: Bearer <mocked-token>` + `${SITECORE_PUBLISHING_BASE_URL}/authoring/publishing/v1/jobs` → route returns 201 + upstream JSON `{ id: "job-abc", system: { status: "Queued" } }`; (b) invalid JSON body → response 400 with `title: "Invalid JSON"`; (c) body missing `source` field → response 400 ProblemDetails; (d) upstream returns 401 → `clearSitecoreAiTokenCache` is called (spy it) + route returns 401; (e) upstream 500 → route returns 500 + body verbatim; (f) **secret-leak**: assert `JSON.stringify(await response.json())` does NOT include the string `"SHHH-do-not-leak"`. Cover for `sitecoreai-token.test.ts`: (a) first call POSTs form-encoded `grant_type=client_credentials&client_id=test-client-id&client_secret=SHHH-do-not-leak` to `SITECORE_OAUTH_TOKEN_URL` and returns the token; (b) second call within TTL uses cached token (fetch called only once); (c) `clearSitecoreAiTokenCache` followed by another `getSitecoreAiAccessToken` call re-fetches (fetch called twice total); (d) missing `SITECORE_OAUTH_CLIENT_SECRET` throws an error — assert error message does NOT include the literal secret value.
- **Expected Output:** Two test files with 10 failing tests total.
- **Depends on:** T006

---

- **Task ID:** T018b
- **Title:** GREEN — route handler + token cache tests pass
- **Description:** [TDD GREEN STEP] Implement `site/lib/auth/sitecoreai-token.ts` (T014 work) and `site/app/api/publish/route.ts` (T015 work) until all 10 tests from T018a pass. T018b, T014, and T015 are the same implementation work; this task signals GREEN was confirmed.
- **Expected Output:** Both test files passing with mocked fetch. No live network calls. `sitecoreai-token.ts` and `route.ts` implemented.
- **Depends on:** T018a

---

##### Branch A path — SDK wrapper (fallback if Tranche 1 finds one — unexpected)

- **Task ID:** T014A
- **Title:** `site/lib/publish/transport-sdk.ts` — `callPublish` via ClientSDK Mode A
- **Description:** ONLY EXECUTED IF Tranche 1 lands Branch A. Wraps `client.mutate({ method: "<sdk-method-from-T001>", params: { body } })` and unwraps the response per the double-`.data.data` convention (or single, per Tranche 1 capture). Signature: `export const callPublishViaSdk: CallPublish = async (body) => { ... };` If this task is invoked, then T014–T018 are marked `skipped — Branch B not selected`.
- **Expected Output:** `site/lib/publish/transport-sdk.ts` exporting `callPublishViaSdk`. Only the import + 5–10 lines of body.
- **Depends on:** T005, T006 — but ONLY IF Branch A; otherwise N/A

---

#### Group 2C — UI integration

- **Task ID:** T019
- **Title:** `site/components/full-page/PublishSiteConfirmModal.tsx` — confirmation dialog (re-uses Radix AlertDialog shell from `DeleteMapConfirmModal`)
- **Description:** New component re-using the AlertDialog primitive already in use at `site/components/full-page/DeleteMapConfirmModal.tsx` (imports from `@/components/ui/alert-dialog` per the existing pattern). Props: `{ open: boolean; onOpenChange: (open: boolean) => void; siteDisplayName: string; localeCount: number; isPublishing: boolean; onConfirm: () => void; }`. Render: `AlertDialogContent` with class `"elev-glass-surface elev-modal-content"` (match `DeleteMapConfirmModal` line 74). Title: "Republish site". Description body in `<AlertDialogDescription>` showing 4 lines: `Site: <siteDisplayName>`, `Locales: <localeCount> being published`, `Mode: Republish (full)`, `Source: Redirect Manager`. Footer: `AlertDialogCancel` = "Cancel" (closes dialog, no action); `AlertDialogAction` = "Republish site" (calls `onConfirm`). `AlertDialogAction` is `disabled={isPublishing}` and shows a small spinner glyph (Lucide `Loader2` with `animate-spin`) when `isPublishing` is true (PRD AC-P1.7). A11y: AlertDialog primitive provides focus trap + ESC-to-close + screen-reader labels via `AlertDialogTitle` / `AlertDialogDescription` (NFR-P3). NO new theme colors — re-uses existing Blok tokens; renders correctly in dark / light / system (NFR-P5).
- **Expected Output:** New component file. Imports `AlertDialog*` primitives from the same path `DeleteMapConfirmModal` uses (`@/components/ui/alert-dialog`). NO custom dialog primitive invented.
- **Depends on:** T024a, T013b (T024a tests are red; T013b confirms service module is GREEN)

---

- **Task ID:** T020a
- **Title:** RED tests — `resolveSiteLocales` locale resolver — failing tests written before implementation
- **Description:** [TDD RED STEP] Write 3 failing tests in `site/lib/publish/locale-resolver.test.ts` BEFORE `locale-resolver.ts` is created. Mock `Sites.Site` as a plain object matching the type shape `{ languages?: Array<string> | null }` (source: `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019`). Tests: (a) `resolveSiteLocales({ languages: ["en-US", "de-DE"] }, true)` → `["*"]` (shorthand accepted + non-empty); (b) `resolveSiteLocales({ languages: ["en-US", "de-DE"] }, false)` → `["en-US", "de-DE"]` (shorthand off — returns languages array); (c) `resolveSiteLocales({ languages: [] }, false)` → `["en-US"]` (empty languages → en-US fallback; optionally assert `console.warn` was called once — use `vi.spyOn(console, "warn")`).
- **Expected Output:** `locale-resolver.test.ts` with 3 failing tests.
- **Depends on:** T006

---

- **Task ID:** T020b
- **Title:** GREEN — `resolveSiteLocales` + `locale-resolver.ts` + `config.ts`
- **Description:** [TDD GREEN STEP] Create `site/lib/publish/locale-resolver.ts` implementing `resolveSiteLocales(site: Sites.Site, shorthandAccepted: boolean): string[]` (per Lead Developer's T020 description). Also create `site/lib/publish/config.ts` exporting `PUBLISH_LOCALE_SHORTHAND_ACCEPTED: boolean` (set based on Tranche 1 D-T1.2 outcome). All 3 tests from T020a must pass.
- **Expected Output:** `locale-resolver.ts` + `config.ts` + `locale-resolver.test.ts` 3 tests passing.
- **Depends on:** T020a

---

- **Task ID:** T021
- **Title:** `site/components/full-page/WorkspaceHero.tsx` — rename "Publish all" → "Publish Site" + wire onClick
- **Description:** Edit `WorkspaceHero.tsx` around line 211–216. Replace the `<DecorativeCta label="Publish all" toastCopy="..." variant="default" className="elev-btn" />` with a real `Button` (Blok variant="default" + className="elev-btn") labeled exactly `"Publish Site"`. Add local state `const [isConfirmOpen, setIsConfirmOpen] = useState(false)` + `const [isPublishing, setIsPublishing] = useState(false)`. The button's `onClick` sets `isConfirmOpen` to true. Below the button, render `<PublishSiteConfirmModal open={isConfirmOpen} onOpenChange={setIsConfirmOpen} siteDisplayName={...} localeCount={...} isPublishing={isPublishing} onConfirm={handleConfirmPublish} />`. `handleConfirmPublish` calls `publish({ kind: "site", siteId, siteDisplayName, locales: resolveSiteLocales(site, PUBLISH_LOCALE_SHORTHAND_ACCEPTED) }, { callPublish: callPublishViaServerRoute, toasts: createSonnerToastAdapter() })`; sets `isPublishing` true around the await, false in finally; closes the dialog after the await regardless of outcome. `siteDisplayName` + `localeCount` are sourced from the currently selected site — WorkspaceHero already has access to the site context (verify the prop or context chain during implementation; if not, add a prop). The OLD `"Publish all"` label MUST NOT appear in the rendered DOM (AC-P1.1). The `DecorativeCta` import is removed if no longer used (the "Validate health" CTA stays decorative per ADR-0030 carve-out, so `DecorativeCta` import likely remains).
- **Expected Output:** `WorkspaceHero.tsx` updated; new label rendered; modal mounts at the hero level; confirm → publish flow wired end-to-end.
- **Depends on:** T024a, T016, T019, T020b
- **Branch A note:** If Branch A landed in Tranche 1, swap `callPublishViaServerRoute` for `callPublishViaSdk` (from T014A).

---

- **Task ID:** T022
- **Title:** `site/components/full-page/RedirectMapPublishButton.tsx` — per-row icon button (ADR-0032)
- **Description:** New component. Props: `{ map: { id: string; name: string }; isPublishing: boolean; onPublish: (map: { id: string; name: string }) => void; }`. Render: a `<button type="button">` (or Blok `Button` with `variant="ghost" size="icon"` if available — check `@/components/ui/button` and pick the closest icon-button variant) sized `h-7 w-7` or similar to match the row's vertical rhythm. Icon: Lucide `Send` (recommended — semantically "submit / send for publishing"; the alternative `UploadCloud` is also fine but Send is sharper for fire-and-forget). When `isPublishing` is true, swap to `Loader2` with `animate-spin` and set `disabled={true}` (NFR-P6 idempotency; AC-P2.6 in-flight state). `onClick={(e) => { e.stopPropagation(); onPublish(map); }}` — `stopPropagation` is **mandatory** so clicking Publish does NOT also fire the row's `onSelect` (ADR-0032). `aria-label={\`Publish \${map.name}\`}` (ADR-0032 — screen-reader clarity). `title="Publish map"` (tooltip). Add a stable selector `data-action="publish-map"` per ADR-0032 § Neutral.
- **Expected Output:** New component file.
- **Depends on:** T024a, T013b

---

- **Task ID:** T023
- **Title:** `site/components/full-page/RedirectMapList.tsx` — mount `RedirectMapPublishButton` after the Badge in each row
- **Description:** Edit `RedirectMapList.tsx` around lines 214–217. After the existing `<Badge>` (line 214) and inside the same flex row, render `<RedirectMapPublishButton map={{ id: map.id, name: map.name }} isPublishing={inFlightMapIds.has(map.id)} onPublish={handlePublishMap} />`. Add component-level state `const [inFlightMapIds, setInFlightMapIds] = useState<Set<string>>(() => new Set())` (or `useRef<Set<string>>` if re-render is not needed — but `Set` mutation requires `useState` with new-Set replacement for React to detect change; recommend `useState` for clarity). `handlePublishMap(map)` does: (1) `setInFlightMapIds(prev => new Set(prev).add(map.id))`; (2) `await publish({ kind: "item", mapId: map.id, mapDisplayName: map.name }, { callPublish: callPublishViaServerRoute, toasts: createSonnerToastAdapter() })`; (3) in a `finally`, `setInFlightMapIds(prev => { const next = new Set(prev); next.delete(map.id); return next; })`. The Set-of-ids pattern is per ADR-0033 § 6 (per-row in-flight state, not global). NOTE: this introduces a small re-render scope change — the rail is virtualized (`react-virtuoso`), so verify on smoke that re-render does not jank scroll. The button is wrapped in a `<div onClick={(e) => e.stopPropagation()}>` ONLY IF the button's own `stopPropagation` isn't sufficient for keyboard activation paths — test both `click` and `Enter` to confirm.
- **Expected Output:** `RedirectMapList.tsx` updated; each rendered row includes the Publish icon button; row's `onSelect` does NOT fire when the icon button is clicked.
- **Depends on:** T024a, T022

---

- **Task ID:** T024a
- **Title:** RED tests — `WorkspaceHero` + `PublishSiteConfirmModal` + `RedirectMapList` icon button — failing tests written before implementation
- **Description:** [TDD RED STEP] Write failing component tests BEFORE T019/T021/T022/T023 are implemented. Test files: `site/components/full-page/WorkspaceHero.test.tsx`, `site/components/full-page/PublishSiteConfirmModal.test.tsx`, `site/components/full-page/RedirectMapList.test.tsx`. Use `@testing-library/react` + `vitest` (jsdom environment per `vitest.config.ts`). Stub `publish` and `callPublishViaServerRoute` as `vi.fn()` in test setup to avoid real network calls. For `WorkspaceHero.test.tsx`: (a) `screen.queryByText("Publish all")` returns null (AC-P1.1 — old label GONE); (b) `screen.getByRole("button", { name: "Publish Site" })` exists (AC-P1.1); (c) clicking that button causes `screen.getByRole("alertdialog")` to appear; (d) dialog contains the text `"Republish site"` as heading. For `PublishSiteConfirmModal.test.tsx` — render `<PublishSiteConfirmModal open siteDisplayName="Solo Website" localeCount={2} isPublishing={false} onOpenChange={onChangeSpy} onConfirm={confirmSpy} />`: (e) `screen.getByText(/Site: Solo Website/)` visible; (f) `screen.getByText(/Locales: 2 being published/)` visible; (g) `screen.getByText(/Mode: Republish \(full\)/)` visible; (h) `screen.getByText(/Source: Redirect Manager/)` visible; (i) clicking `screen.getByRole("button", { name: "Cancel" })` calls `onOpenChange(false)`; (j) clicking `screen.getByRole("button", { name: "Republish site" })` calls `onConfirm`; (k) render with `isPublishing={true}` — `screen.getByRole("button", { name: "Republish site" })` is `disabled`. For `RedirectMapList.test.tsx` — render with a 3-map fixture; set up a parent `onSelect` spy: (l) `screen.getAllByRole("button", { name: /^Publish / }).length` equals 3 (one per row); (m) click `screen.getAllByRole("button", { name: "Publish Homepage Redirects" })[0]` — `onSelect` spy was NOT called (`stopPropagation` assertion); (n) `aria-label` of the button equals `"Publish Homepage Redirects"` exactly.
- **Expected Output:** 3 test files with 14 failing tests total.
- **Depends on:** T006, T013b (service module is GREEN so test imports are resolvable; components don't exist yet so renders fail)

---

- **Task ID:** T024b
- **Title:** GREEN — component tests pass (WorkspaceHero + PublishSiteConfirmModal + RedirectMapList)
- **Description:** [TDD GREEN STEP] Implement `PublishSiteConfirmModal.tsx` (T019), `WorkspaceHero.tsx` edits (T021), `RedirectMapPublishButton.tsx` (T022), and `RedirectMapList.tsx` edits (T023) until all 14 tests from T024a pass. T024b, T019, T021, T022, T023 are the same implementation work; this task signals GREEN was confirmed.
- **Expected Output:** All 14 component tests passing.
- **Depends on:** T024a, T016, T020b

---

- **Task ID:** T025
- **Title:** Theme parity check — dark / light / system on new dialog + button
- **Description:** Add a vitest snapshot or a Playwright visual test (preferred when available) that renders `PublishSiteConfirmModal` open + `RedirectMapPublishButton` standalone in each of dark / light / system theme contexts. Assertion: contrast meets ≥ AA on Blok tokens (NFR-P5). Implementation may be a simple jest-axe scan if the Playwright loop isn't budgeted; jest-axe will catch contrast WCAG-AA violations on rendered DOM. Mark this task as `WARN: deferred to host-frame smoke` if jest-axe + Playwright both unavailable — but the manual smoke gate T028 covers theme parity as a backstop.
- **Expected Output:** `site/components/full-page/PublishSiteConfirmModal.theme.test.tsx` (or .playwright file) covering 3 themes. If automated infra is missing, document the manual check in `site/docs/smoke-publish.md` (T028).
- **Depends on:** T024b

---

#### Group 2D — Documentation + smoke

- **Task ID:** T026
- **Title:** `site/docs/smoke-publish.md` — new `m_publish` smoke walkthrough doc
- **Description:** Markdown doc following the pattern of `site/docs/smoke-live-walkthrough.md` and `site/docs/smoke-crud.md`. Sections: (1) Pre-requisites (Branch B: OAuth client-credentials registered with required scopes; `.env.local` populated from `.env.example` per T017); (2) `m_publish.1 — Publish Site happy path` — operator clicks "Publish Site" → confirmation dialog → "Republish site" → success toast `"Site publish queued — job <id>"` → operator opens SitecoreAI Publishing UI → job visible with `source: "Redirect Manager"` and `system.status` = `Queued` or `Running`; (3) `m_publish.2 — per-map publish happy path` — operator clicks Send icon on one map row → success toast `"<map> publish queued — job <id>"` → job visible in SitecoreAI with the correct map item GUID; (4) `m_publish.3 — error case` — operator temporarily revokes the OAuth credential (or sets `SITECORE_OAUTH_CLIENT_SECRET` to a wrong value), clicks Publish Site → error toast surfaces `Publish failed — 401: <detail>` or similar; (5) `m_publish.4 — idempotency` — operator rapid-double-clicks the per-map button → only one job is submitted (second click is disabled); (6) Carry-forward `m1` (registration unchanged — open all three extension-point routes, confirm Provider connects) and `m3` (CRUD round-trip unchanged — create / edit / delete one map, confirm Sitecore reflects the change).
- **Expected Output:** New `site/docs/smoke-publish.md`.
- **Depends on:** T024b, T025

---

- **Task ID:** T027
- **Title:** README / CHANGELOG delta planning notes (for `/ship` auto-lite to consume)
- **Description:** Document into the run manifest (or a sibling notes file) the 1-paragraph README delta + CHANGELOG entry that `/ship` auto-lite will emit. README delta covers: new env vars required for Branch B (with reference to `.env.example`), required OAuth scopes, link to `smoke-publish.md`. CHANGELOG entry covers: "Wired Publish Site CTA + per-map Publish to SitecoreAI Publishing v1 (Branch B server-side OAuth proxy)". The Lead Developer does NOT write the final README/CHANGELOG — that is `/ship`'s job — but captures the talking points so `/ship` auto-lite has them.
- **Expected Output:** Notes in the run manifest under `ship_notes` (or a sibling file at `project-planning/notes/ship-deltas-prd003.md`).
- **Depends on:** T017, T026

---

- **Task ID:** T028
- **Title:** `m_publish` real-tenant smoke gate execution
- **Description:** Operator-executed manual smoke gate against the solo / solo-website tenant. Walk through `site/docs/smoke-publish.md` end-to-end. Verdicts recorded in the run manifest under `smoke_outcomes.m_publish` and `smoke_outcomes.m_publish.idempotency` etc. Outcomes: `pass` / `pass_with_caveats` / `fail` / `deferred`. A `deferred` is recorded as `WARN` per the glossary "Smoke gate" rules (never silent). Carry-forward `m1` + `m3` are also touched and recorded. This task is the **PRD-003 acceptance gate** — failure blocks `/ship`.
- **Expected Output:** Run manifest updated with `smoke_outcomes` block; any caveats / fixes filed as fold-back tasks.
- **Depends on:** T026, T027

## 4b. Important Test Cases (by epic / feature)

QA-enriched cross-reference: each bullet includes the Task ID pair (RED task → GREEN task) so the test task dependency graph is traceable.

- **E-2 Publish service module**
  - `buildSitePublishBody` produces byte-equivalent body to PRD AC-P1.4 (unit) — T012a RED → T007 GREEN
  - `buildItemPublishBody` produces byte-equivalent body to PRD AC-P2.3 (unit) — T012a RED → T008 GREEN
  - `outcomeFrom(201, { id, system.status: "Queued" })` → `{ kind: "queued", jobId, jobIdShort }` (unit) — T012a RED → T009 GREEN
  - `outcomeFrom(400, ProblemDetails with detail)` → `{ kind: "failed", status: 400, detail }` (unit) — T012a RED → T009 GREEN
  - `outcomeFrom(400, ProblemDetails without detail, with title)` → falls back to title (unit) — T012a RED → T009 GREEN
  - `outcomeFrom(401, {})` → `{ kind: "failed", status: 401, detail: "HTTP 401" }` (unit) — T012a RED → T009 GREEN
  - `outcomeFrom(500, { detail })` → `{ kind: "failed", status: 500, detail }` (unit) — T012a RED → T009 GREEN
  - `outcomeFrom(201, malformed body)` → `{ kind: "failed", status: 201, detail: "Unexpected response shape from publishing API" }` (unit) — T012a RED → T009 GREEN
  - `publish()` site flow happy path — calls requested → callPublish → queued in order with shared dismissId (unit) — T013a RED → T011 GREEN
  - `publish()` item flow happy path — mirror assertions with map display name prefix (unit) — T013a RED → T011 GREEN
  - `publish()` failure path — surfaces `Publish failed — <status>: <detail>` toast (unit) — T013a RED → T011 GREEN

- **E-3 Transport (Branch B)**
  - `/api/publish` POST forwards body verbatim with `Authorization: Bearer <token>` (unit, mocked fetch) — T018a RED → T015 GREEN
  - `/api/publish` rejects invalid JSON with 400 ProblemDetails (unit) — T018a RED → T015 GREEN
  - `/api/publish` rejects body without `source === "Redirect Manager"` (unit) — T018a RED → T015 GREEN
  - `/api/publish` clears token cache on upstream 401 (unit) — T018a RED → T015 GREEN
  - `/api/publish` **secret-leak assertion** — response body / headers MUST NOT contain `SITECORE_OAUTH_CLIENT_SECRET` substring (unit, regression) — T018a RED → T015 GREEN
  - `getSitecoreAiAccessToken` caches token within TTL (unit) — T018a RED → T014 GREEN
  - `clearSitecoreAiTokenCache` forces re-fetch (unit) — T018a RED → T014 GREEN
  - `getSitecoreAiAccessToken` throws clearly on missing env vars without leaking the secret (unit) — T018a RED → T014 GREEN

- **E-4 UI integration**
  - `WorkspaceHero` rendered DOM contains "Publish Site" and not "Publish all" (UI, regression for AC-P1.1) — T024a RED → T021 GREEN
  - `WorkspaceHero` button click opens `PublishSiteConfirmModal` (UI) — T024a RED → T021 GREEN
  - `PublishSiteConfirmModal` shows site / locales / mode / source per AC-P1.2 (UI) — T024a RED → T019 GREEN
  - `PublishSiteConfirmModal` Cancel closes without firing onConfirm (UI) — T024a RED → T019 GREEN
  - `PublishSiteConfirmModal` Confirm fires onConfirm (UI) — T024a RED → T019 GREEN
  - `PublishSiteConfirmModal` `isPublishing=true` disables primary button + shows spinner (UI for AC-P1.7) — T024a RED → T019 GREEN
  - `RedirectMapPublishButton` icon click does NOT trigger row `onSelect` (UI — stopPropagation regression for ADR-0032) — T024a RED → T022/T023 GREEN
  - `RedirectMapPublishButton` `isPublishing=true` disables button + swaps to Loader2 (UI for AC-P2.6) — T024a RED → T022 GREEN
  - `RedirectMapPublishButton` `aria-label="Publish <map name>"` per ADR-0032 (UI, a11y) — T024a RED → T022 GREEN
  - Theme parity — dark + light + system contrast ≥ AA on new dialog + button (UI, NFR-P5) — T025 RED+GREEN

- **E-5 Locale resolution**
  - `resolveSiteLocales` with shorthand-on + non-empty languages → `["*"]` (unit) — T020a RED → T020b GREEN
  - `resolveSiteLocales` with shorthand-off → returns `site.languages` (unit) — T020a RED → T020b GREEN
  - `resolveSiteLocales` with empty languages → `["en-US"]` fallback + warning (unit) — T020a RED → T020b GREEN

- **E-6 Smoke (manual, real tenant)**
  - `m_publish.1` — Publish Site → confirmation → confirm → success toast → job visible in SitecoreAI with `source: "Redirect Manager"` (E2E manual) — T028
  - `m_publish.2` — Per-map Publish → success toast → job visible with correct map GUID (E2E manual) — T028
  - `m_publish.3` — Forced credential failure → error toast surfaces status + detail (E2E manual) — T028
  - `m_publish.4` — Rapid double-click on per-map button submits exactly one job (E2E manual, NFR-P6) — T028
  - `m1` — Three extension-point routes load + Provider connects (E2E manual, carry-forward regression) — T028
  - `m3` — CRUD round-trip on one map (E2E manual, carry-forward regression) — T028

## 4c. Implementation execution contract (for Developer 08)

### 4c-1. Non-negotiable technical boundaries

- **Tranche 1 is read-only** — T001–T004 produce ONLY a capture artifact. T005 amends ADR-0034 in place. No code under `site/` is written until the operator approves the Tranche 1 gate.
- **Branch decision is locked at T005** — ADR-0034 flipped to Accepted is the binding record. Developer does NOT re-open the branch question during Tranche 2; the operator pre-committed Branch B and Tranche 1 either confirms or escalates.
- **Service module is branch-agnostic** — ADR-0033. `site/lib/publish/publish-service.ts` contains only body construction, outcome mapping, toast dispatch, and `publish()` orchestration. The transport adapter (`transport-server.ts` for Branch B; `transport-sdk.ts` for Branch A) is the ONLY surface that differs between branches.
- **OAuth secret NEVER reaches the client bundle** (Branch B) — NFR-P2. The OAuth env vars are read only inside `site/lib/auth/sitecoreai-token.ts` and `site/app/api/publish/route.ts`, both server-side modules. The route's response body MUST NOT contain the secret string for any code path (asserted by T018). `.env.local` is NEVER committed.
- **Per-row icon button calls `e.stopPropagation()`** — ADR-0032. Missing stopPropagation causes a Publish click to also select the row, an annoying-but-not-data-corrupting bug; PR review enforces. Verified by component test in T024.
- **In-flight idempotency is caller-side, not service-module-side** — ADR-0033 § 6. The Publish Site button uses `useState<boolean>`; the per-map list uses `useState<Set<string>>`. The service module never returns "rejected because in-flight" — the disabled button is the guard.
- **Theme parity** — NFR-P5 / global Redirect Manager policy. Dark + light + system. Re-use existing Blok tokens; NO new color values. The confirmation dialog uses the same `elev-glass-surface elev-modal-content` shell as `DeleteMapConfirmModal`.
- **CSP frame-ancestors unchanged** — PRD § 9.3. Branch B's `/api/publish` route is NOT part of the iframe surface; it is a same-origin server endpoint. NO Cloud Portal re-registration. NO change to existing CSP headers.
- **`source: "Redirect Manager"` is the literal string** — FR-P7. Surfaces this app's jobs in SitecoreAI's publishing job list. Hardcoded in `buildSitePublishBody` and `buildItemPublishBody`; T018 asserts the route forwards it verbatim.
- **NO retry, NO exponential backoff, NO timeout-and-cancel in the transport** — PRD scope is fire-and-forget. A 5xx surfaces as a toast; the operator retries by clicking again. Adding retry is an explicit out-of-scope item and would need a fresh PRD.
- **Sonner toasts ONLY** — FR-P8. The `ToastAdapter` wraps `sonner` (already a PRD-000 dep at `^2.0.7`, used in 6+ existing files — verified by grep). No new toast library.
- **NO job-status polling** — explicit out-of-scope. The toast on success contains `<id-short>` and that is the only feedback. Operator confirms in SitecoreAI's UI if they want to track the job.
- **Slim-context discipline** — the Developer (08) MUST be able to implement T006–T028 using ONLY `prd-minimal-003.md` and this task breakdown. If a § 4c subsection is incomplete or unclear, that is an escalation (per glossary "Escalation protocol"), not a license to open upstream docs.

### 4c-2. ADR one-liners

- **ADR-0002** — Marketplace SDK Mode A scaffold (no server-side OAuth proxy). **Partially superseded by Branch B for the publishing surface only.** Other Sitecore calls (Authoring GraphQL, `xmc.sites.*`) remain Mode A. If Branch B lands at T005, a follow-on ADR-0035 captures this carve-out at /ship time (per operator pre-approval).
- **ADR-0011** — Three extension-point routes: `/context-panel` (Pages Context Panel), `/dashboard-widget` (Dashboard Widget), `/full-page` (Full Page). Root `/` returns `notFound()`. PRD-003 does NOT change any of this — the new `/api/publish` route is a same-origin server endpoint, not a Cloud Portal extension point.
- **ADR-0030** — "View activity" and "Publish all" hero CTAs were intentionally decorative in PRD-002, surfacing a "coming in a follow-on release" toast. PRD-003 wires "Publish all" (renamed "Publish Site") to a real publish. "Validate health" stays decorative (separate future PRD).
- **ADR-0031** — Publish surface decision (SDK wrapper vs server-side OAuth proxy) is deferred to PRD-003 Tranche 1 capture. Operator pre-committed Branch B as the fallback.
- **ADR-0032** — Per-map Publish renders as a small Lucide `Send` icon button immediately to the right of the existing `RedirectType` Badge in each `RedirectMapList` row. `onClick` calls `e.stopPropagation()`. In-flight state swaps icon to `Loader2` with `animate-spin` and disables the button. `aria-label="Publish <map name>"` for screen-reader clarity.
- **ADR-0033** — Branch-agnostic publish service module at `site/lib/publish/publish-service.ts` exposing `PublishScope` (discriminated union site|item), `buildSitePublishBody`, `buildItemPublishBody`, `outcomeFrom`, `ToastAdapter` (sonner-backed), `publish(scope, deps)`. Transport adapter is the single swappable seam.
- **ADR-0034** — Records the Tranche 1 branch outcome. Status flips from Proposed to Accepted at T005. Branch B (server-side OAuth proxy) is the expected and pre-committed outcome.

### 4c-3. Stack / tooling specifics

- **Package manager**: `npm` (per `package-lock.json` at `site/`). Do NOT switch to pnpm or yarn.
- **Node runtime**: same as PRD-000 (Next.js 16.1.7 supports Node 20+).
- **Test runner**: `vitest` — invoked via `npm run test` (one-shot) or `npm run test:watch`. Test files colocated as `*.test.ts` / `*.test.tsx` next to source.
- **Build command**: `npm run build` (= `next build` with turbopack per PRD-000 convention).
- **Lint**: `npm run lint` (`eslint`). Typecheck: `npm run typecheck` (`tsc --noEmit`). BOTH MUST pass before /code-review.
- **Dev loop**: `npm run dev` (= `next dev --turbopack`) — runs at `https://localhost:3000` per the existing PRD-000 mkcert setup (per `sitecore:marketplace-sdk-testing-debug`). Branch B's `/api/publish` route runs in the same Next.js process — no separate dev server.
- **Scaffold reference** (reproducibility, not for this extension): `sitecore:setup-scaffold` decision tree → `sitecore:setup-marketplace-client-side` § "Optional: server-side OAuth proxy" is the canonical pattern this PRD adopts. The existing app was scaffolded via Marketplace Client-Side (Mode A); Branch B adds the OAuth proxy pattern documented in that skill's § Optional section.
- **Key dependencies (already installed)**: `@sitecore-marketplace-sdk/client@^0.3.2`, `@sitecore-marketplace-sdk/xmc@^0.4.1`, `next@16.1.7`, `react@^19.2.4`, `sonner@^2.0.7`, `lucide-react@^1.14.0`, `next-themes@^0.4.6`, `radix-ui@^1.4.3` (for AlertDialog primitive). NO new dependencies required by this PRD.
- **Branch B env vars** (Branch B only, documented in `.env.example` only): `SITECORE_OAUTH_CLIENT_ID`, `SITECORE_OAUTH_CLIENT_SECRET`, `SITECORE_OAUTH_TOKEN_URL`, `SITECORE_PUBLISHING_BASE_URL`, `SITECORE_TENANT_ID`.

### 4c-4. UI implementation notes

**N/A — UI variants skipped** per `scope_dial.ui_variants = skip`. The architect produced no POC clickdummy and no UI design proposals. This PRD re-uses existing Blok primitives + the PRD-002 dialog shell.

Re-use anchors (cite by file path, do not open architect/UI specs):

- **Confirmation dialog shell** — re-use the AlertDialog primitive pattern from `site/components/full-page/DeleteMapConfirmModal.tsx`. Import path: `@/components/ui/alert-dialog` (the same path `DeleteMapConfirmModal` uses at line 15–22). CSS class on `AlertDialogContent`: `"elev-glass-surface elev-modal-content"` (matches `DeleteMapConfirmModal` line 74). Title in `AlertDialogTitle`, body in `AlertDialogDescription`, footer with `AlertDialogCancel` + `AlertDialogAction`.
- **Toast surface** — re-use `sonner` via `import { toast } from "sonner"`. Existing call sites: `NewRedirectMapModal.tsx:50`, `DeleteMapConfirmModal.tsx:27`, `RedirectMapDetail.tsx:49`, `FullPage.tsx:45`. The `ToastAdapter` from T010 wraps the same `toast.loading` / `toast.success` / `toast.error` API.
- **Hero CTA button** — re-use the existing Blok `Button` primitive imported by `WorkspaceHero.tsx` (already in use; the `DecorativeCta` replacement is a 1-for-1 swap to a real `Button` with `variant="default"` + `className="elev-btn"` per ADR-0030's existing CTA chrome).
- **Per-row icon button (ADR-0032)** — Lucide `Send` (recommended) OR `UploadCloud` (alternative). **Choose `Send`** — semantically sharper for fire-and-forget publish; visually narrower (fits the tight row rhythm at `py-2.5`). Alternative `UploadCloud` is fuller-bodied — use only if PR review feedback prefers it. Loader: Lucide `Loader2` with class `animate-spin` (same pattern as elsewhere if used; otherwise add `animate-spin` from tailwind). Size: `h-3.5 w-3.5` per ADR-0032 to match `WorkspaceHero` Button icon scale.
- **Copy strings** (verbatim — must match PRD AC):
  - Button label: `"Publish Site"` (AC-P1.1; old label `"Publish all"` MUST NOT appear in rendered DOM)
  - Dialog title: `"Republish site"` (AC-P1.2)
  - Dialog primary button: `"Republish site"`; dialog secondary: `"Cancel"` (AC-P1.3)
  - Dialog body lines: `Site: <siteDisplayName>` / `Locales: <localeCount> being published` / `Mode: Republish (full)` / `Source: Redirect Manager` (AC-P1.2)
  - Per-map button aria-label: `\`Publish \${map.name}\`` (ADR-0032)
  - Per-map button tooltip: `"Publish map"` (ADR-0032)
  - Toast messages (per ADR-0033 § 5):
    - Requested (site): `\`Publishing site — \${siteDisplayName}\``
    - Requested (item): `\`Publishing \${mapDisplayName}\``
    - Queued (site): `\`Site publish queued — job \${jobIdShort}\`` (AC-P1.5)
    - Queued (item): `\`\${mapDisplayName} publish queued — job \${jobIdShort}\`` (AC-P2.4)
    - Failed (site): `\`Publish failed — \${status}: \${detail}\`` (AC-P1.6)
    - Failed (item): `\`\${mapDisplayName} publish failed — \${status}: \${detail}\`` (AC-P2.5)

### 4c-5. File / module structure and naming conventions

```
site/
  lib/
    publish/                                # NEW directory (PRD-003)
      types.ts                              # T006 — PublishScope, PublishApiRequest, PublishApiResponse, ProblemDetails, PublishOutcome, CallPublish, ToastAdapter
      config.ts                             # T020 — exports PUBLISH_LOCALE_SHORTHAND_ACCEPTED const (set per Tranche 1 D-T1.2 outcome)
      publish-service.ts                    # T007/T008/T009/T011 — buildSitePublishBody, buildItemPublishBody, outcomeFrom, publish()
      publish-service.test.ts               # T012, T013 — body + outcome + orchestration tests
      transport-server.ts                   # T016 — Branch B: callPublishViaServerRoute (fetches /api/publish)
      transport-sdk.ts                      # T014A — Branch A fallback only: callPublishViaSdk
      locale-resolver.ts                    # T020 — resolveSiteLocales
      locale-resolver.test.ts               # T020 — colocated tests
      toast-adapter.ts                      # T010 — createSonnerToastAdapter
  lib/
    auth/                                   # NEW directory (PRD-003 Branch B)
      sitecoreai-token.ts                   # T014 — getSitecoreAiAccessToken + clearSitecoreAiTokenCache
      sitecoreai-token.test.ts              # T018 — token cache tests
  app/
    api/
      publish/                              # NEW route (PRD-003 Branch B)
        route.ts                            # T015 — POST handler
        route.test.ts                       # T018 — route handler tests
  components/
    full-page/
      WorkspaceHero.tsx                     # T021 — edit existing: rename label + wire onClick
      PublishSiteConfirmModal.tsx           # T019 — new component
      PublishSiteConfirmModal.test.tsx      # T024 — colocated tests
      RedirectMapList.tsx                   # T023 — edit existing: mount per-row icon button
      RedirectMapList.test.tsx              # T024 — colocated tests
      RedirectMapPublishButton.tsx          # T022 — new component
  docs/
    smoke-publish.md                        # T026 — new smoke walkthrough
  .env.example                              # T017 — append Branch B env vars
```

**Naming conventions:**

- Components: `PascalCase.tsx`. Tests colocated as `PascalCase.test.tsx`.
- Library modules: `kebab-case.ts`. Tests colocated as `kebab-case.test.ts`.
- The publish service module is split into multiple files (`types.ts`, `publish-service.ts`, `toast-adapter.ts`, etc.) rather than one fat module — preserves the single-purpose-per-file convention already followed in `site/lib/`.
- Server-only modules (`sitecoreai-token.ts`, `app/api/publish/route.ts`) do NOT contain a `"use client"` directive and MUST NOT import any client-only module.
- Path alias: `@/` resolves to `site/` per existing tsconfig (verify; otherwise use relative imports).

### 4c-6. Integration / API contract notes

#### A. SitecoreAI Publishing v1 (REST — Branch B target)

- **Endpoint**: `POST ${SITECORE_PUBLISHING_BASE_URL}/authoring/publishing/v1/jobs`
- **Auth**: `Authorization: Bearer <token>` — token obtained via OAuth 2.0 client-credentials per `sitecore:sitecoreai-auth` (`POST <SITECORE_OAUTH_TOKEN_URL>` with form-encoded `grant_type=client_credentials&client_id=…&client_secret=…`)
- **Required scopes** (on the OAuth client itself, configured in Cloud Portal):
  - API scope (one of): `xmcpub.jobs.a:w` (admin write) OR `xmcpub.jobs.t:w` (tenant write) OR `xmcpub.jobs.t:wl` (limited write — requires `Sitecore Client Advanced Publishing` / `Sitecore Client Publishing` role or admin flag)
  - Client application scope: `xmcloud.cm:admin`
- **Site-publish request body** (per PRD AC-P1.4 — `buildSitePublishBody` produces this verbatim):
  ```json
  {
    "name": "Site publish — <site display name> — <ISO timestamp>",
    "source": "Redirect Manager",
    "description": "Triggered from Redirect Manager Full Page workspace hero",
    "options": {
      "xmc": {
        "site": { "mode": "Republish" },
        "locales": ["<each configured locale of the current site>"]
      }
    }
  }
  ```
- **Item-publish request body** (per PRD AC-P2.3 — `buildItemPublishBody` produces this verbatim):
  ```json
  {
    "name": "Map publish — <map display name> — <ISO timestamp>",
    "source": "Redirect Manager",
    "description": "Triggered from Redirect Manager per-map publish action",
    "options": {
      "items": [{ "id": "<map-guid>", "type": "Item", "locale": "*" }],
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
- **201 success response** (consumed slice only — full response has more fields the app does not read): `{ id: string, system: { status: "Queued" | "Running" | "Completed" | "Failed" | "Canceled" | "Canceling" } }`. Other fields (`name, options, permissions, source, description, statistics`) MAY be present.
- **Error response (4xx/5xx)**: RFC 7807 ProblemDetails `{ type?: string, title?: string, status?: number, detail?: string, instance?: string }`.
- **No `.d.ts` exists** for this REST contract because `@sitecore-marketplace-sdk/xmc` does not wrap it (confirmed by ADR-0033 § SDK probe evidence and the formal Tranche 1 probe T001). The PRD § 9.1 captured spec is the source of truth.

#### B. Sitecore Marketplace SDK — `xmc.sites.retrieveSite` / `Sites.Site.languages` (re-used for locale resolution)

- **SDK call**: existing app already uses `xmc.sites.listSites` in `site/lib/sdk/sites.ts:35-39`. For PRD-003 the site is already known (selected by operator earlier), so either re-use the listed sites' cached `languages` array OR add a `retrieveSite` call. **Recommend re-use of the existing listed-sites cache** — no new SDK call needed.
- **`.d.ts` citation for the response shape** (per rule `40-sdk-contracts.mdc`):
  - `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019 → Sites.Site.languages?: Array<string> | null`
  - Sites.Site full type at `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:964`
  - `listSites` query keyed via `xmc.sites.listSites` returning `Sites.ListSitesResponse` (= `Array<Sites.Site>`) at `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:2589`
- **Unwrap convention**: double `.data.data` for xmc module queries (per `sitecore:marketplace-sdk-client` § 8b; existing pattern in `site/lib/sdk/sites.ts:38-39` and `:54-55`).
- **Languages format**: regional ISO codes — `"en-US"`, `"de-DE"`, `"da"`, `"en-CA"`. Compatible with Publishing v1 `options.xmc.locales` array.

#### C. OAuth 2.0 client-credentials (Branch B — `sitecore:sitecoreai-auth`)

- **Token endpoint**: `POST ${SITECORE_OAUTH_TOKEN_URL}` (captured at T003)
- **Request body** (form-encoded): `grant_type=client_credentials&client_id=${SITECORE_OAUTH_CLIENT_ID}&client_secret=${SITECORE_OAUTH_CLIENT_SECRET}` — and possibly `audience=…` depending on the Cloud Portal setup (capture at T005 D-T1.3 if needed).
- **Response**: `{ access_token: string, expires_in: number (seconds), token_type: "Bearer", scope?: string }`. Cache `access_token` for `expires_in - 60` seconds.
- **401 handling**: when a downstream call (the `/api/publish` route's upstream POST) returns 401, the route calls `clearSitecoreAiTokenCache()` — does NOT auto-retry the upstream call in this minimal cut. The client sees the 401 and the toast surfaces it.

#### D. Internal `/api/publish` route contract (Branch B)

- **Endpoint**: `POST /api/publish` (same-origin from the client)
- **Request body**: `PublishApiRequest` (from `site/lib/publish/types.ts`) — JSON.
- **Response**:
  - 201: forwarded upstream JSON `{ id, name, options, permissions, source, description, statistics, system }`
  - 400: ProblemDetails generated by the route OR forwarded from upstream
  - 401: forwarded from upstream (token-cache cleared as side effect)
  - 5xx: forwarded from upstream
- **No auth header from client** — the route holds the OAuth token server-side.
- **Same-origin** — no CORS preflight; no CSP frame-ancestors change.

### 4c-7. Parity / rebuild pointers

**N/A — greenfield (extension to existing shipped product).** PRD-003 is an additive feature on top of PRD-000 + PRD-002 shipped code. No source analysis was performed; no rebuild parity is required.

### 4c-8. QA additions — verbatim body fixtures + structural test contract

#### Verbatim body fixtures (inline in T012a tests)

Use the following `const expected` objects in `publish-service.test.ts`. Do NOT paraphrase — copy verbatim.

**Site publish body** (AC-P1.4):

```ts
// source: PRD-003 AC-P1.4 + ADR-0033 § 2
const expectedSiteBody = {
  name: "Site publish — Solo Website — 2026-05-16T20:00:00.000Z",
  source: "Redirect Manager",
  description: "Triggered from Redirect Manager Full Page workspace hero",
  options: {
    xmc: {
      site: { mode: "Republish" },
      locales: ["en-US", "de-DE"],
    },
  },
};
```

Input: `buildSitePublishBody({ kind: "site", siteId: "site-001", siteDisplayName: "Solo Website", locales: ["en-US", "de-DE"] }, "2026-05-16T20:00:00.000Z")` must deep-equal `expectedSiteBody`. The regex for the `name` field in property-form assertions: `/^Site publish — Solo Website — \d{4}-\d{2}-\d{2}T.+Z$/`.

**Item publish body** (AC-P2.3):

```ts
// source: PRD-003 AC-P2.3 + ADR-0033 § 2
const expectedItemBody = {
  name: "Map publish — Homepage Redirects — 2026-05-16T20:00:00.000Z",
  source: "Redirect Manager",
  description: "Triggered from Redirect Manager per-map publish action",
  options: {
    items: [{ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", type: "Item", locale: "*" }],
    xmc: {
      items: {
        mode: "Republish",
        publishChildren: false,
        publishRelatedItems: false,
      },
    },
  },
};
```

Input: `buildItemPublishBody({ kind: "item", mapId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", mapDisplayName: "Homepage Redirects" }, "2026-05-16T20:00:00.000Z")` must deep-equal `expectedItemBody`.

Note: the site body MUST NOT contain `options.items` and MUST NOT contain `options.xmc.items`. The item body MUST NOT contain `options.xmc.site` and MUST NOT contain `options.xmc.locales`. Add negative assertions for these.

#### SDK fixture citation for locale resolver tests

```ts
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019
// Sites.Site.languages?: Array<string> | null
const siteTwoLocales: Pick<Sites.Site, "languages"> = { languages: ["en-US", "de-DE"] };
const siteEmptyLocales: Pick<Sites.Site, "languages"> = { languages: [] };
const siteNullLocales: Pick<Sites.Site, "languages"> = { languages: null };
```

#### Structural test — secret isolation

Add one structural test to `site/app/api/publish/route.test.ts` (inside T018a) asserting that the string `"SHHH-do-not-leak"` does not appear in:
- `JSON.stringify(await response.json())` for any response code path
- `response.headers.get("content-type")` (headers should not echo env values)

This is the regression backstop for NFR-P2 (secret never reaches client bundle). Set `process.env.SITECORE_OAUTH_CLIENT_SECRET = "SHHH-do-not-leak"` in `beforeEach` and restore in `afterEach`.

#### Test environment note (jsdom)

`vitest.config.ts` uses `environment: 'jsdom'` (not happy-dom). `msw` is NOT installed — use `vi.spyOn(globalThis, "fetch")` for all network mocking (confirmed: `msw` not in `devDependencies`). Do NOT add `msw` as a new dependency for this PRD.

## 5. Dependencies

- **Ordering constraints:**
  - Tranche 1 (T001–T005) MUST complete + operator approve before Tranche 2 starts. The HARD GATE is non-negotiable per the locked run context.
  - T006 (types) is the foundation for everything in Tranche 2 — pure types with no runtime cost; T007/T008/T009/T010/T014/T020 all depend on it.
  - T011 (`publish()` orchestration) depends on T007 + T008 + T009 + T010 — orchestrates them.
  - Branch B transport (T015) depends on T014 (token cache).
  - T016 (`callPublishViaServerRoute`) depends on T015 (route exists) AND T006 (types).
  - UI integration (T021, T023) depends on the service module (T011) being functionally complete AND the transport adapter (T016 for Branch B) AND the dialog/button components (T019, T022).
  - T021 (WorkspaceHero edit) additionally depends on T020 (locale resolver) for the site-publish body.
  - T024 (component tests) depends on the components (T021, T022, T023) existing.
  - T028 (smoke gate) depends on the entire E-2/E-3/E-4 chain + T017 (env vars) + T026 (smoke doc).

- **Execution order (TDD — RED before GREEN):** T001, T002, T003, T004, T005, **[OPERATOR GATE]**, T006, **T012a** (RED body+outcome tests), T007, T008, T009, **T012b** (GREEN body+outcome tests pass), T010, **T013a** (RED orchestration tests), T011, **T013b** (GREEN orchestration tests pass), **T018a** (RED route+token tests), T014, T015, **T018b** (GREEN route+token tests pass), T016, T017, **T020a** (RED locale tests), **T020b** (GREEN locale tests pass), **T024a** (RED component tests), T019, T022, T023, T021, **T024b** (GREEN component tests pass), T025, T026, T027, T028.

  (T014A is alternative for Branch A only and is NOT in the default order. If T005 lands Branch A, the order becomes: T001…T005, [GATE], T006, T012a, T007, T008, T009, T012b, T010, T013a, T011, T013b, T014A, T020a, T020b, T024a, T019, T022, T023, T021, T024b, T025, T026, T027, T028 — skipping T018a/T018b/T014/T015/T016/T017.)

- **Parallel groups (TDD-adjusted):**
  ```
  Group 1 (parallel — read-only Tranche 1 probes): T001, T002, T003
  Group 2 (sequential — depends on T003): T004
  Group 3 (sequential — depends on T001/T002/T003/T004): T005
  === HARD OPERATOR GATE ===
  Group 4 (sequential — foundation types): T006
  Group 5 (parallel — RED tests; depends on T006): T012a, T018a, T020a, T024a [all write failing tests only]
  Group 6 (parallel — GREEN core; depends on T012a): T007, T008, T009, T010 [satisfies T012a]
  Group 7 (sequential — orchestration GREEN; depends on T006+T010+T012a): T013a, then T011, then T013b
  Group 8 (sequential — T012b confirm GREEN): T012b [after T007/T008/T009]
  Group 9 (parallel — Branch B transport RED-then-GREEN; depends on T018a): T014, then T015, then T018b
  Group 10 (sequential — transport client; depends on T018b): T016
  Group 11 (parallel — env + locale GREEN; depends on T020a): T017, T020b
  Group 12 (parallel — UI RED tests already written at T024a; GREEN UI; depends on T024a+T016+T020b+T013b): T019, T022 (parallel), then T023, then T021; all culminate in T024b
  Group 13 (sequential — theme parity; depends on T024b): T025
  Group 14 (sequential — smoke doc; depends on T024b+T025): T026
  Group 15 (sequential — ship notes; depends on T017+T026): T027
  Group 16 (sequential — smoke gate; depends on T026+T027): T028
  ```

  Groups 1–3 are Tranche 1 (read-only). Groups 4–16 are Tranche 2 TDD. Note: Groups 5 (RED tests all at once) is the key discipline insertion — all four RED test tasks can be written in parallel immediately after T006, before any implementation starts. This is the correct TDD posture for light rigor: write the failing tests as a batch, then implement to green.

## 6. Suggested Milestones

- **M1 — Tranche 1 complete (after T005)**: capture artifact + ADR-0034 flipped to Accepted. **Operator gate.**
- **M2 — Service module + tests GREEN (after T013)**: branch-agnostic core proves out without needing the transport yet.
- **M3 — Transport adapter + tests GREEN (after T018)**: Branch B server route works end-to-end against mocked upstream.
- **M4 — UI integration complete (after T024)**: Publish Site flow + per-map flow visible in the app.
- **M5 — Smoke gate `m_publish` passed (after T028)**: PRD-003 acceptance reached. `/ship` unblocked.

## 7. Risk Areas

- **R-1 (planning-known) — Branch B is first server-side route in this app.** Existing dev loop (mkcert HTTPS at localhost:3000) supports the route without infra change, but the OAuth secret hygiene is a new permanent discipline. Mitigation: T018's secret-leak assertion test + PR review + `.env.local` always in `.gitignore`.
- **R-2 — Tranche 1 D-T1.3 (OAuth credentials not registered)** would HARD STOP Tranche 2 before T006. Mitigation: operator-facing capture artifact at T005 explicitly identifies the setup gap with reference to `sitecore:sitecoreai-auth`.
- **R-3 — `Sites.Site.languages` is empty or missing for the solo tenant** — locale resolver falls back to `["en-US"]` + logs a warning. Mitigation: T020's fallback + T028 smoke verifies a non-en-US tenant doesn't get silently mis-published.
- **R-4 — Double-click on per-map button submits two jobs** — mitigated by NFR-P6 disabled-while-pending + T024 component test asserts disabled state.
- **R-5 — `e.stopPropagation()` missing on icon button** — row's `onSelect` would also fire on Publish click. Mitigation: T024 component test explicitly asserts `onSelect` NOT called when icon button is clicked.
- **R-6 — `react-virtuoso` row-recycling vs per-row in-flight state** — `Set<string>` of in-flight map IDs lives in the parent (`RedirectMapList`), so virtualization recycling does not lose state. Verify on smoke that scroll-during-publish does not jank.
- **R-7 — `prefers-reduced-motion`** (NFR-P4) — the spinner animation should honor `prefers-reduced-motion: reduce`. Re-use the PRD-002 motion policy. If not enforced, log as a host-frame smoke caveat.
- **R-8 — `locales: ["*"]` shorthand rejected** — T004 captures definitively. Default body shape is enumerated locales either way; this risk is "we paid for the probe + got no shorthand savings", not "we shipped broken".
- **R-9 — Branch A surprise at T001** — if the SDK has a publishing wrapper we missed at planning time, Tranche 2 follows the Branch A path (T014A) and most of Group 8/9/10/11 are skipped. The branch-agnostic service module from Group 5/6/7 is unchanged.

## 8. Suggested Team Structure

- **One Developer (08) end-to-end** is sufficient. Total Tranche 2 task count = 23, most under 1 hour each. Sequential execution per § 5 ordering is the simplest path.
- **Optional parallelism** at Group 5 (5 leaf modules from the types foundation) and Group 12 (dialog + icon button) could shave wall-clock time if multiple Developer agents are spawned. Recommended only if the operator wants to compress the schedule.
- **One QA Specialist (07)** edits this file in place to invert test-after to RED-first per `task_breakdown_style = tdd` (which QA selects). The Lead-Dev → QA diff is NOT snapshotted (per `scope_dial.task_breakdown_review = skip_gate`).
- **No standalone QA report needed** on the minimal track. § 4b's test-case list + QA's in-place enrichment of § 9/§ 10 is sufficient.

## 9. TDD and quality contract

### RED → GREEN → REFACTOR mandate

All Tranche 2 implementation code is governed by TDD discipline:

1. **RED** — write the failing test(s) for the function/component first. The test must fail because the code does not exist yet (import will fail, or assertion will fail). Running `npm run test` at this point produces red failures specifically for the new test.
2. **GREEN** — write the minimum code to make the tests pass. Do not add features not covered by the current failing tests.
3. **REFACTOR** — clean up the implementation (extract helpers, fix names, remove duplication) while keeping tests green.

The dependency graph in § 5 enforces this: every `T###a` (write failing tests) task appears in `Depends on` before the corresponding implementation task. Developer (08) MUST NOT implement `T007`, `T008`, `T009`, `T011`, `T014`, `T015`, `T019`, `T020b`, `T021`, `T022`, `T023` before the corresponding RED test task is written and confirmed failing.

### TDD waiver for Tranche 1

Tasks T001–T005 are **read-only probes, capture writing, and ADR amendments** — no production code is written. TDD does not apply. These tasks are marked `Test type: N/A — read-only / capture / docs-edit task`.

### Test stack

- **Test runner**: `vitest` — invoke via `npm run test` (one-shot) or `npm run test:watch`
- **Component environment**: `jsdom` (per `vitest.config.ts` — NOT happy-dom)
- **UI testing**: `@testing-library/react` + `@testing-library/jest-dom` (both installed; see `package.json`)
- **Network mocking**: `vi.spyOn(globalThis, "fetch")` — `msw` is NOT installed and MUST NOT be added as a new dependency for this PRD
- **Spy/mock**: vanilla `vi.fn()` for all adapters (callPublish, toasts, onSelect, onConfirm)

### Test colocation

All test files colocated with source: `*.test.ts` / `*.test.tsx` immediately next to the source file under `site/`. No separate `__tests__/` directory.

### Mock policy — SDK locales

Stub `Sites.Site` as a plain object matching the shape:

```ts
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019
// Sites.Site.languages?: Array<string> | null
```

Never import the real SDK client in unit tests. Use `Pick<Sites.Site, "languages">` (or a plain `{ languages: [...] }` object) as the fixture. No live SDK calls.

### Mock policy — OAuth

Stub the token endpoint by mocking `globalThis.fetch` with `vi.spyOn`. Set `process.env.SITECORE_OAUTH_TOKEN_URL`, `SITECORE_OAUTH_CLIENT_ID`, `SITECORE_OAUTH_CLIENT_SECRET` to test values in `beforeEach`. NEVER call the real OAuth endpoint from tests.

### Secret isolation structural test

At minimum one test in `route.test.ts` (T018a) must assert:

```
process.env.SITECORE_OAUTH_CLIENT_SECRET = "SHHH-do-not-leak"
// ... POST to the route (any code path)
// Assert:
expect(JSON.stringify(await response.json())).not.toContain("SHHH-do-not-leak")
```

This is the regression backstop for NFR-P2. The test must cover at minimum: happy-path response, 400 validation rejection, 401 upstream response.

### Secret-location structural assertion

The OAuth client secret MUST only be referenced in `site/lib/auth/sitecoreai-token.ts` and `site/app/api/publish/route.ts`. Never in any file under `site/components/` or in any client component. This is enforced by code review + the secret-leak test above. If a future refactor breaks this discipline, the T018a secret-leak test will catch it.

### Coverage target (Light rigor)

~35 meaningful unit/UI tests across all Tranche 2 tasks is the right ballpark. Do not pad with trivial "renders without error" tests — every test must assert a behavioral claim named in the PRD's AC list or ADR contracts.

### Smoke gate

The `m_publish` real-tenant smoke gate (T028) is a **manual gate** — not automated. It is the PRD-003 acceptance gate. Failure or `deferred` status blocks `/ship`. Outcomes are recorded in the run manifest `smoke_outcomes` block. A `deferred` is a `WARN`, not a silent skip.

### `task_breakdown_style`

After this enrichment, the breakdown enforces test-first ordering for all Tranche 2 code tasks via the a/b task split pattern. The Team Lead will set `task_breakdown_style: tdd` in the run manifest.

---

## 10. Per-task test specifications

**Tranche 1 tasks (T001–T005):** `Test type: N/A — read-only / capture / docs-edit task`. No tests.

---

### T006 — `types.ts`

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| — | No behavioral tests for pure type definitions | Types compile with `tsc --noEmit` | Static (build gate) | verified by `npm run typecheck` |

---

### T012a / T012b — Body builders + outcome mapper

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 1 | `buildSitePublishBody` with `siteDisplayName="Solo Website"`, `locales=["en-US","de-DE"]`, `nowIso="2026-05-16T20:00:00.000Z"` | Deep-equals `expectedSiteBody` fixture from § 4c-8. Also assert `options.items` is absent and `options.xmc.items` is absent. | Unit | `site/lib/publish/publish-service.test.ts` |
| 2 | `buildItemPublishBody` with `mapDisplayName="Homepage Redirects"`, `mapId="a1b2c3d4-e5f6-7890-abcd-ef1234567890"`, same nowIso | Deep-equals `expectedItemBody` fixture from § 4c-8. Also assert `options.xmc.site` is absent and `options.xmc.locales` is absent. | Unit | `site/lib/publish/publish-service.test.ts` |
| 3 | `outcomeFrom(201, { id: "abc12345-rest", system: { status: "Queued" } })` | Returns `{ kind: "queued", jobId: "abc12345-rest", jobIdShort: "abc12345" }` | Unit | `site/lib/publish/publish-service.test.ts` |
| 4 | `outcomeFrom(400, { title: "Bad Request", detail: "Invalid locale" })` | Returns `{ kind: "failed", status: 400, detail: "Invalid locale" }` | Unit | `site/lib/publish/publish-service.test.ts` |
| 5 | `outcomeFrom(400, { title: "Bad Request" })` — no `detail` field | Returns `{ kind: "failed", status: 400, detail: "Bad Request" }` (falls back to title) | Unit | `site/lib/publish/publish-service.test.ts` |
| 6 | `outcomeFrom(401, {})` — empty body | Returns `{ kind: "failed", status: 401, detail: "HTTP 401" }` | Unit | `site/lib/publish/publish-service.test.ts` |
| 7 | `outcomeFrom(500, { detail: "boom" })` | Returns `{ kind: "failed", status: 500, detail: "boom" }` | Unit | `site/lib/publish/publish-service.test.ts` |
| 8 | `outcomeFrom(201, {})` — 201 but no `id` | Returns `{ kind: "failed", status: 201, detail: "Unexpected response shape from publishing API" }` | Unit | `site/lib/publish/publish-service.test.ts` |

---

### T013a / T013b — `publish()` orchestration

Spies setup: `callPublish = vi.fn().mockResolvedValue({ status: 201, body: { id: "abc12345-rest", system: { status: "Queued" } } })`. `toasts = { requested: vi.fn().mockReturnValue("toast-123"), queued: vi.fn(), failed: vi.fn() }`.

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 1 | Site publish happy path — `publish({ kind: "site", siteId: "s1", siteDisplayName: "Solo Website", locales: ["en-US"] }, { callPublish, toasts })` | `toasts.requested` called once with `"Publishing site — Solo Website"`, then `callPublish` called once, then `toasts.queued` called once with `("Site publish queued — job abc12345", { dismissId: "toast-123" })`. Return value is `{ kind: "queued", ... }`. | Unit | `site/lib/publish/publish-service.test.ts` |
| 2 | Item publish happy path — `publish({ kind: "item", mapId: "m1", mapDisplayName: "Homepage Redirects" }, { callPublish, toasts })` | `toasts.requested` called with `"Publishing Homepage Redirects"`, `toasts.queued` called with `("Homepage Redirects publish queued — job abc12345", { dismissId: "toast-123" })` | Unit | `site/lib/publish/publish-service.test.ts` |
| 3 | Site publish failure — `callPublish` returns `{ status: 400, body: { title: "Bad Request", detail: "Invalid locale" } }` | `toasts.failed` called with `("Publish failed — 400: Invalid locale", { dismissId: "toast-123" })`. Return value is `{ kind: "failed", status: 400, detail: "Invalid locale" }`. | Unit | `site/lib/publish/publish-service.test.ts` |
| 4 | Item publish failure — same 400 response | `toasts.failed` called with `("Homepage Redirects publish failed — 400: Invalid locale", { dismissId: "toast-123" })` | Unit | `site/lib/publish/publish-service.test.ts` |
| 5 | `dismissId` contract — `toasts.requested` returns `"toast-123"`, happy path | The same id `"toast-123"` appears in `opts.dismissId` passed to `toasts.queued` | Unit | `site/lib/publish/publish-service.test.ts` |

---

### T018a / T018b — Route handler + token cache

`beforeEach`: `process.env.SITECORE_OAUTH_CLIENT_SECRET = "SHHH-do-not-leak"`, `SITECORE_OAUTH_CLIENT_ID = "test-client-id"`, `SITECORE_OAUTH_TOKEN_URL = "https://auth.example.com/token"`, `SITECORE_PUBLISHING_BASE_URL = "https://pub.example.com"`. `fetchSpy = vi.spyOn(globalThis, "fetch")`.

**`route.test.ts`:**

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 1 | POST valid site-publish body → `fetch` called with `Authorization: Bearer mocked-token` + URL `https://pub.example.com/authoring/publishing/v1/jobs` + body forwarded verbatim → upstream returns 201 | Route returns 201 + upstream JSON `{ id: "job-abc", system: { status: "Queued" } }` | Unit (mocked fetch) | `site/app/api/publish/route.test.ts` |
| 2 | POST body with malformed JSON | Route returns 400 with response body containing `title: "Invalid JSON"` | Unit | `site/app/api/publish/route.test.ts` |
| 3 | POST body missing `source` field | Route returns 400 ProblemDetails (validation rejection) | Unit | `site/app/api/publish/route.test.ts` |
| 4 | Upstream returns 401 | `clearSitecoreAiTokenCache` spy called once; route returns 401 to client | Unit | `site/app/api/publish/route.test.ts` |
| 5 | Upstream returns 500 with error body | Route returns 500 + upstream body forwarded verbatim | Unit | `site/app/api/publish/route.test.ts` |
| 6 | **Secret-leak** — any response code path with `SITECORE_OAUTH_CLIENT_SECRET = "SHHH-do-not-leak"` set | `JSON.stringify(await response.json())` does NOT contain `"SHHH-do-not-leak"` | Unit (regression) | `site/app/api/publish/route.test.ts` |

**`sitecoreai-token.test.ts`:**

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 7 | First call to `getSitecoreAiAccessToken` | `fetch` called once with `POST https://auth.example.com/token` and form body `grant_type=client_credentials&client_id=test-client-id&client_secret=SHHH-do-not-leak`. Returns the access token string. | Unit | `site/lib/auth/sitecoreai-token.test.ts` |
| 8 | Second call within TTL | `fetch` called only once total (cache hit). Returns same token. | Unit | `site/lib/auth/sitecoreai-token.test.ts` |
| 9 | `clearSitecoreAiTokenCache()` then another call | `fetch` called a second time (cache cleared, re-fetched). | Unit | `site/lib/auth/sitecoreai-token.test.ts` |
| 10 | `SITECORE_OAUTH_CLIENT_SECRET` is undefined | Throws a clear error. Error message does NOT contain the literal secret value. | Unit | `site/lib/auth/sitecoreai-token.test.ts` |

---

### T020a / T020b — Locale resolver

SDK fixture: `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019 — Sites.Site.languages?: Array<string> | null`

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 1 | `resolveSiteLocales({ languages: ["en-US", "de-DE"] }, true)` (shorthand accepted, non-empty languages) | Returns `["*"]` | Unit | `site/lib/publish/locale-resolver.test.ts` |
| 2 | `resolveSiteLocales({ languages: ["en-US", "de-DE"] }, false)` (shorthand off) | Returns `["en-US", "de-DE"]` | Unit | `site/lib/publish/locale-resolver.test.ts` |
| 3 | `resolveSiteLocales({ languages: [] }, false)` (empty languages array) | Returns `["en-US"]` and `console.warn` called once | Unit | `site/lib/publish/locale-resolver.test.ts` |

---

### T024a / T024b — Component tests

`WorkspaceHero` test setup: render with minimal required props; stub `publish` and `callPublishViaServerRoute` as `vi.fn()` to prevent real network calls.

**`WorkspaceHero.test.tsx`:**

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 1 | Render `WorkspaceHero` | `screen.queryByText("Publish all")` is null (AC-P1.1 — old label absent) | UI | `site/components/full-page/WorkspaceHero.test.tsx` |
| 2 | Render `WorkspaceHero` | `screen.getByRole("button", { name: "Publish Site" })` exists (AC-P1.1) | UI | `site/components/full-page/WorkspaceHero.test.tsx` |
| 3 | Click "Publish Site" button | `screen.getByRole("alertdialog")` appears; dialog contains heading `"Republish site"` | UI | `site/components/full-page/WorkspaceHero.test.tsx` |

**`PublishSiteConfirmModal.test.tsx`:** render `<PublishSiteConfirmModal open siteDisplayName="Solo Website" localeCount={2} isPublishing={false} onOpenChange={onChangeSpy} onConfirm={confirmSpy} />`

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 4 | Render open modal | `screen.getByText(/Site: Solo Website/)` visible (AC-P1.2a) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |
| 5 | Render open modal | `screen.getByText(/Locales: 2 being published/)` visible (AC-P1.2b) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |
| 6 | Render open modal | `screen.getByText(/Mode: Republish \(full\)/)` visible (AC-P1.2c) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |
| 7 | Render open modal | `screen.getByText(/Source: Redirect Manager/)` visible (AC-P1.2d) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |
| 8 | Click "Cancel" | `onOpenChange` called with `false`; `confirmSpy` NOT called (AC-P1.3) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |
| 9 | Click "Republish site" button | `confirmSpy` called once (AC-P1.3) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |
| 10 | Render with `isPublishing={true}` | `screen.getByRole("button", { name: "Republish site" })` is `disabled` (AC-P1.7) | UI | `site/components/full-page/PublishSiteConfirmModal.test.tsx` |

**`RedirectMapList.test.tsx`:** render with 3-map fixture `[{ id: "m1", name: "Homepage Redirects" }, { id: "m2", name: "About Us" }, { id: "m3", name: "Blog" }]`; set up `onSelectSpy = vi.fn()` on parent row:

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 11 | Render 3-map list | `screen.getAllByRole("button", { name: /^Publish / }).length` equals 3 (one per row) | UI | `site/components/full-page/RedirectMapList.test.tsx` |
| 12 | Click `screen.getByRole("button", { name: "Publish Homepage Redirects" })` | `onSelectSpy` was NOT called (`stopPropagation` assertion per ADR-0032) | UI — critical regression | `site/components/full-page/RedirectMapList.test.tsx` |
| 13 | Button `aria-label` | `screen.getByRole("button", { name: "Publish Homepage Redirects" })` has `aria-label="Publish Homepage Redirects"` exactly (ADR-0032) | UI — a11y | `site/components/full-page/RedirectMapList.test.tsx` |
| 14 | Idempotency — simulate `inFlightMapIds.has("m1") === true` (pass prop or trigger click + stub slow callPublish) | The Publish button for `m1` is `disabled` (NFR-P6) | UI | `site/components/full-page/RedirectMapList.test.tsx` |

---

### T025 — Theme parity

| # | Scenario | Expected outcome | Test type | File |
|---|---|---|---|---|
| 1 | Render `PublishSiteConfirmModal` open in dark / light / system theme contexts via jest-axe | No WCAG contrast violations detected on the dialog and its buttons (NFR-P5) | UI / a11y | `site/components/full-page/PublishSiteConfirmModal.theme.test.tsx` |
| 2 | Render `RedirectMapPublishButton` in each theme | No WCAG contrast violations on the icon button in normal + disabled states | UI / a11y | `site/components/full-page/PublishSiteConfirmModal.theme.test.tsx` |

Note: if jest-axe is not installed (`axe-core` + `jest-axe` not in `devDependencies`), this test is `WARN: deferred to m_publish host-frame smoke` — document the manual check in `site/docs/smoke-publish.md` instead. Do NOT add new test dependencies without confirming with operator.

---

### T026 — Smoke walkthrough doc (T028 gate)

`Test type: N/A — documentation task`. No automated tests. Manual smoke steps are documented in `site/docs/smoke-publish.md` and executed at T028.

---

### T027 / T028 — Ship notes + real-tenant smoke

`Test type: manual smoke (m_publish)`. See T028 description. Smoke verdicts recorded in `run-20260516T194651Z.json` under `smoke_outcomes`. A `deferred` is a `WARN` — blocks `/ship`.

## Handoff Metadata
- Canonical run manifest: `project-planning/workflow/run-20260516T194651Z.json`
- Source PRD: `project-planning/PRD/prd-003.md`
- Source architecture: ADRs only — minimal track (ADR-0002, 0011, 0030, 0031, 0032, 0033, 0034)
- Recommended next command: `/task-breakdown` continues with QA Specialist (07) in-place enrichment (RED-first reordering + § 9 + § 10 fill); `task_breakdown_review = skip_gate`, so QA proceeds without operator review of the Lead-Dev diff.
- Recommended next input file: N/A (no standalone qa-report.md on this track)
