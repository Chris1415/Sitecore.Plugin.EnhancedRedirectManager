# ADR-0033: Publish service module contract — branch-agnostic skeleton

## Status

Accepted

## Context

PRD-003 introduces two publish flows — site-wide ("Publish Site") and per-map ("Publish") — that BOTH POST to the SitecoreAI Publishing v1 API (`POST /authoring/publishing/v1/jobs`). The transport differs depending on the Tranche 1 SDK probe outcome (ADR-0031):

- **Branch A** — if `@sitecore-marketplace-sdk/xmc` exposes a wrapper (`xmc.publishing.*` or similar), the call rides ClientSDK Mode A.
- **Branch B** — if no wrapper, a new Next.js API route at `app/api/publish/route.ts` proxies the call using OAuth client-credentials.

If the body construction, response handling, idempotency guard, and toast UX were duplicated per-flow OR re-implemented per-branch, the PRD would carry four code paths (2 flows × 2 branches) and the Tranche 1 outcome would force code churn across all of them. The clean answer is a **single service module with a branch-agnostic surface** where only the transport adapter differs between branches.

PRD § FR-P4 names this module explicitly: *"A publish-call service module encapsulates the body construction, the request, and the response-to-toast mapping. Both Publish Site and per-map Publish call into the same module with different parameters."* This ADR locks the shape so the Lead Developer and QA can write tests against the contract before Tranche 1 even resolves which branch ships.

## Decision

A new module at `site/lib/publish/publish-service.ts` (path may vary slightly during implementation — `lib/publish/` is the recommended directory) exposes the following contract. Branch A and Branch B differ ONLY in the `callPublish` adapter implementation; every other surface is shared.

### 1. Input types — `PublishScope` discriminated union

```ts
export type PublishScope =
  | {
      kind: "site";
      siteId: string;            // SitecoreAI site id, used for display + diagnostics
      siteDisplayName: string;   // for toast + dialog body
      locales: string[];         // enumerated locales from Sites.Site.languages (FR-P6)
                                 // OR ["*"] only if Tranche 1 D-T1.2 confirms the API accepts it
    }
  | {
      kind: "item";
      mapId: string;             // Sitecore item GUID of the Redirect Map
      mapDisplayName: string;    // for toast
    };
```

### 2. Body construction — pure functions

```ts
/** Build the SitecoreAI Publishing v1 request body for a Publish Site flow.
 *  Implements PRD AC-P1.4 verbatim. Pure: same input → same output. */
export function buildSitePublishBody(scope: Extract<PublishScope, { kind: "site" }>): PublishApiRequest;

/** Build the SitecoreAI Publishing v1 request body for a per-map Publish flow.
 *  Implements PRD AC-P2.3 verbatim. Pure. */
export function buildItemPublishBody(scope: Extract<PublishScope, { kind: "item" }>): PublishApiRequest;
```

Both functions stamp `source: "Redirect Manager"` (FR-P7), a deterministic ISO timestamp inside `name`, and the `description` strings from FR-P10.

### 3. Transport adapter — `callPublish`

```ts
/** Single transport seam. Branch A implementation calls the SDK wrapper;
 *  Branch B implementation fetches '/api/publish'. SIGNATURE is identical
 *  in both branches — only the implementation body differs. */
export type CallPublish = (body: PublishApiRequest) => Promise<{
  status: number;
  body: PublishApiResponse | ProblemDetails;
}>;
```

- **Branch A** binds `callPublish` to a thin wrapper around `client.mutate({ method: "xmc.publishing.<verb>", ... })` (verb name discovered at Tranche 1).
- **Branch B** binds `callPublish` to `fetch("/api/publish", { method: "POST", headers: {...}, body: JSON.stringify(body) })` and reads `response.status` + parsed JSON.
- The service module accepts a `callPublish` parameter (dependency injection) OR imports it from a sibling `publish-transport-{a,b}.ts` module. Implementor picks the seam; either way the test contract is the same.

### 4. Outcome mapping — `outcomeFrom`

```ts
export type PublishOutcome =
  | { kind: "queued"; jobId: string; jobIdShort: string }   // jobIdShort = jobId.slice(0, 8)
  | { kind: "failed"; status: number; detail: string };     // detail = ProblemDetails.detail ?? .title ?? `HTTP ${status}`

/** Pure mapping from the raw transport response to a normalized outcome. */
export function outcomeFrom(
  status: number,
  body: PublishApiResponse | ProblemDetails
): PublishOutcome;
```

Behavior:
- `status === 201` and `body.id` present → `{ kind: "queued", jobId: body.id, jobIdShort: body.id.slice(0, 8) }`.
- Any other status → `{ kind: "failed", status, detail: body.detail ?? body.title ?? \`HTTP ${status}\` }` (PRD AC-P1.6 / AC-P2.5).
- A 2xx with malformed body (no `id`) is treated as failure with `detail: "Unexpected response shape from publishing API"` and the actual status.

### 5. Toast contract

The service module dispatches three toasts per flow, in this exact order:

```ts
type ToastAdapter = {
  requested: (message: string) => string | number;     // returns toast id for dismiss
  queued: (message: string, opts?: { dismissId?: string | number }) => void;
  failed: (message: string, opts?: { dismissId?: string | number }) => void;
};
```

- **Requested** (transient ≤ ~1s): fires immediately when `publish(scope)` is called.
  - Site: `"Publishing site — <siteDisplayName>"`.
  - Item: `"Publishing <mapDisplayName>"`.
- **Queued** (sticky success, dismisses the requested toast):
  - Site: `"Site publish queued — job <jobIdShort>"` (PRD AC-P1.5).
  - Item: `"<mapDisplayName> publish queued — job <jobIdShort>"` (PRD AC-P2.4).
- **Failed** (sticky error, dismisses the requested toast):
  - Site: `"Publish failed — <status>: <detail>"` (PRD AC-P1.6).
  - Item: `"<mapDisplayName> publish failed — <status>: <detail>"` (PRD AC-P2.5).

The `ToastAdapter` is the existing Blok / sonner toast surface re-used from PRD-002 (FR-P8). No new toast styling. The service module accepts a `ToastAdapter` parameter (or imports the singleton) so tests can swap a spy.

### 6. Idempotency guard — caller-side

```ts
/** The service module exposes `publish(scope, deps)` as the public surface.
 *  It does NOT manage in-flight state internally — that is the CALLER's job
 *  (e.g. the Publish Site button or the per-map icon button). */
export async function publish(
  scope: PublishScope,
  deps: { callPublish: CallPublish; toasts: ToastAdapter }
): Promise<PublishOutcome>;
```

The originating component (`WorkspaceHero` Publish Site button OR `RedirectMapList` per-map icon button per ADR-0032) holds the in-flight state:

```ts
const [isPublishing, setIsPublishing] = useState(false);
// or useRef<boolean> for cases where re-render is not desired
```

While `isPublishing === true`, the button is `disabled` (NFR-P6). The service module never returns a "rejected because in-flight" outcome — the disabled button is the guard. This pattern is local to each call site and does not require module-level state.

For the per-map case, the in-flight state is per-row (one boolean per map id, not a single global). Recommended implementation: a `Set<string>` of in-flight map ids inside `RedirectMapList` (or in a parent), checked at render time to derive `disabled` per row.

## SDK contract verification (rule `40-sdk-contracts`)

### `Sites.Site.languages` — source of enumerated locales (FR-P6)

- **Path**: `products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts`
- **Type**: `Sites.Site` at line 964; `languages?: Array<string> | null;` at line 1019 (description: *"The list of languages in use by the site. Example value: ['en-US', 'en-CA']"*).
- **Method**: the existing app reads sites via `xmc.sites.listSites` (see `site/lib/sdk/sites.ts` lines 11–15 + 38–39 with the documented **double `.data.data` unwrap** for hey-api Mode A responses). Per-site retrieval via `xmc.sites.retrieveSite` (`augmentation.gen.d.ts` line 83) returns the same `Sites.Site` shape.
- **Format**: regional ISO codes like `"en-US"`, `"da"`, `"en-CA"`. The Publishing v1 `options.xmc.locales` array (per operator-supplied spec) accepts the same regional ISO codes — format compatible.
- **Carry-over**: PRD-001's `Sites.Site.languages` work was cancelled (ADR-0023) but the type is unchanged. This is the SAME field PRD-000's site picker reads today.

### SitecoreAI Publishing v1 — REST contract (not SDK)

- **Source**: operator-supplied SitecoreAI Publishing v1 API spec, captured verbatim in PRD-003 § 9.1 and AC-P1.4 / AC-P2.3 (dated 2026-05-16).
- **Endpoint**: `POST /authoring/publishing/v1/jobs`.
- **Auth**: Bearer (OAuth 2.0 client-credentials).
- **Request type**: `PublishApiRequest` is the app-internal name for the operator-spec body shape; the spec defines `{ name, source, description?, options: { items?, xmc: { site?, items?, locales? } } }`.
- **Response (201)**: `{ id, name, options, permissions, source, description, statistics, system: { status: "Queued" | "Running" | "Completed" | "Failed" | "Canceled" | "Canceling" } }`. The service module consumes only `{ id, system.status }`.
- **Error (4xx/5xx)**: RFC 7807 ProblemDetails `{ type, title, status, detail, instance }`.
- **No `.d.ts` exists** for this contract because it is REST and `@sitecore-marketplace-sdk/xmc` does not (as of Tranche 1 inspection at planning time) expose a wrapper. The PRD § 9.1 captured spec is the source of truth. If Tranche 1 finds a SDK wrapper (Branch A), THAT wrapper's `.d.ts` becomes the canonical citation and the service module's types are aliased to it.

### SDK probe evidence (at planning time)

A grep of `products/redirect-manager/site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/augmentation.gen.d.ts` for `publish` / `publishing` finds **no publishing query/mutation**. The only "jobs" mentioned are `xmc.sites.listJobs` and `xmc.sites.retrieveJob` (lines 6–13) — those are **sites** background jobs, not publishing jobs. This is consistent with the operator's pre-PRD inspection. ADR-0031's pre-commitment to Branch B as fallback stands. **Tranche 1 still runs the formal probe** — this ADR records the planning-time evidence, not the final verdict.

## Consequences

**Easier:**

- Branch A vs Branch B differ in **one file** (the transport adapter). Body construction, outcome mapping, toast dispatch, idempotency guard, types — all shared.
- QA can write tests against `buildSitePublishBody`, `buildItemPublishBody`, `outcomeFrom`, and the `publish` orchestration BEFORE Tranche 1 resolves. The fixtures for `callPublish` are spies; no real transport is invoked in unit tests.
- The contract makes the per-map and Publish Site flows visibly symmetric — same module, same return type, same toast trio. Reviewers can compare directly.
- A future flow (e.g. "Publish selected" bulk, "Publish with schedule") fits the same surface — add a new variant to `PublishScope`, add a new body-builder, re-use `publish()` and `outcomeFrom`.
- The toast contract is centralized — copy changes happen in one place, not at every call site.

**Harder:**

- The discriminated-union `PublishScope` couples two distinct surfaces (site / item) into one module. If a third scope (e.g. "language", "branch") were added with very different fields, the union would grow. Acceptable at 2; revisit at 4.
- The `callPublish` seam adds a small indirection compared to a direct SDK call. Implementor must resist inlining the transport into the service module to "simplify" — the seam is the whole point.
- Caller-side idempotency means the discipline lives at each button. If a future contributor forgets the `disabled={isPublishing}` guard on a new Publish button, the double-click risk returns. Mitigation: test for the disabled state on each new button.

**Neutral:**

- This ADR does not pick Branch A vs Branch B — that is ADR-0034's job at Tranche 1. This ADR's contract works for either.
- This ADR does not touch the Cloud Portal extension-point registration (ADR-0011 unchanged), the Authoring GraphQL surface (ADR-0003 unchanged), or the CSP frame-ancestors (no iframe change).

## Date

2026-05-16
