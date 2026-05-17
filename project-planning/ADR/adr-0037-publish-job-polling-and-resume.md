# ADR-0037: Lightweight publish-job polling + cross-session resume

## Status

Accepted (2026-05-17).

## Context

After Tranche 2 shipped a fire-and-forget Site publish (button → POST /jobs → 201 Queued → toast → done), operator surfaced two real-tenant UX gaps during m_publish smoke:

1. **Operators can re-click the button while a job is queued/running**, accidentally firing multiple parallel publishes. The client-side disabled-state guard (NFR-P6) covered the synchronous-click window only — once the 201 came back, the button re-enabled even though the publish job was still active.
2. **There is no signal that the publish completed.** Operators had to leave the app and check the SitecoreAI publishing list to know when the job finished. For a Site publish that processes ~19k items and runs 3-5 minutes, this is meaningful friction.

A full job-history / progress-bar UI is out of scope for PRD-003's light-rigor charter. Operator asked for the lightweight floor: prevent re-trigger while in flight, surface completion.

A secondary ask landed in the same conversation: cross-session resume — if the operator closes the tab or refreshes the browser mid-publish, the app should re-discover the in-flight job on next visit and continue tracking it.

## Decision

Three-tier in-flight job tracking, layered:

### Tier 1 — Polling (in-tab)
- After publish 201, store the returned `jobId` in component state and start polling `GET /api/publish/jobs/{jobId}` every **3 seconds** (operator-chosen interval).
- Stop polling when `system.status` ∈ `{Completed, Failed, Canceled}`.
- While polling, button is disabled and shows `"Publishing… {elapsedSec}s"`.
- On terminal:
  - `Completed` → success toast with `statistics.itemsProcessed` / `itemsFailed`
  - `Failed` → sticky error toast
  - `Canceled` → sticky info toast

Implementation: `site/lib/publish/use-publish-job-tracker.ts` — React hook. Treats 404 from the GET endpoint as `Canceled` (job evaporated). Single silent retry on 5xx; second 5xx surfaces as terminal `Failed`.

### Tier 2 — localStorage resume (same-browser-session)
- On publish 201, write `{ jobId, kickedOffAt, siteContextKey }` to `localStorage['redirect-manager:publish-in-flight:<collection>:<site>']`.
- On Full Page mount + on site picker change, read localStorage for the current `siteContextKey`. If found, fetch the jobId via `GET /jobs/{id}` to check status:
  - Non-terminal → resume Tier 1 polling. Surface a "Found in-progress publish from {Xm} ago — tracking…" toast (distinct from a fresh-publish toast).
  - Terminal → clear localStorage and fall through to Tier 3.

Implementation: `site/lib/publish/in-flight-store.ts` + integration in `use-publish-resume.ts`. SSR-safe (no-op when `typeof window === "undefined"`).

### Tier 3 — Name-prefix list-scan resume (cross-machine / no-localStorage)
- If Tier 2 found nothing, call `GET /api/publish/jobs?source=Redirect+Manager` (filtered to our app's jobs only — operator-chosen filter A from the design discussion).
- Client-side filter for `name` starting with `Redirect Manager — <collection>/<site> — ` AND `system.status` ∈ `{Queued, Running, Canceling}` AND `system.queuedTime` within the last 60 minutes.
- Sort by `queuedTime` desc; take the most recent match.
- If found: write to localStorage (so future tab opens use the faster Tier 2) and resume Tier 1 polling.

Implementation: `site/lib/publish/use-publish-resume.ts` — composes Tier 2 + Tier 3.

### Name format change (enables Tier 3)
- Before: `Site publish — ${siteDisplayName} — ${nowIso}`
- After: `Redirect Manager — ${collectionName}/${siteName} — ${nowIso}`
- Prefix `Redirect Manager — <collection>/<site> —` is the stable search key for Tier 3 list-scan.
- Bonus: jobs in SitecoreAI's publishing list are now operator-recognizable at a glance.

### Required server routes (restored from Tranche 1.5 spike, generalized)
- `site/app/api/publish/jobs/[id]/route.ts` — GET. Proxies `GET /authoring/publishing/v1/jobs/{id}`.
- `site/app/api/publish/jobs/route.ts` — GET. Proxies `GET /authoring/publishing/v1/jobs?source=...` (query params forwarded).

Both reuse `getSitecoreAccessToken()` and `SITECORE_PUBLISHING_BASE_URL` defaults from the existing POST `/api/publish` infrastructure.

## Consequences

**Easier:**
- Operator cannot fire parallel publishes by accident — button locks until terminal.
- Tab close / refresh / brief power loss no longer leaves the operator wondering whether their publish landed; the app re-finds it on next visit.
- Site-publish jobs are operator-identifiable in the SitecoreAI publishing list by name prefix.
- All tracking is read-only — no risk of mutating job state from the polling hook.
- Foundation for future PRDs: the same hook + routes power Job History UI, cancellation UX, multi-job views.

**Harder:**
- Adds two new server routes (the GET `/jobs` and `/jobs/{id}` proxies) — first listing/retrieval surface in the app beyond the bare POST. Minimal infra impact (same OAuth flow, same host).
- `usePublishJobTracker` runs a `setInterval` — must clean up on unmount (handled in implementation) to avoid leaked timers.
- Adds localStorage as a state surface — must be SSR-safe (handled by `typeof window` guard).
- 3-second poll interval means ~20 API calls per minute per active publisher per tab. For multi-tenant operators with many concurrent publishes, this could add up — out of scope for PRD-003 (single-operator scale), worth monitoring.

**Not done (deliberate scope limit):**
- No "recent publishes" history UI — operator explicitly excluded.
- No progress bar — just elapsed time on the button. Progress data is available via `statistics.itemsProcessed / .itemsSent` if a future PRD wants to surface it.
- No cancel button — `POST /jobs/{id}/cancel` exists in the API (Tranche 1.5 probed it) but not wired to UI. Future PRD candidate.

## Date

2026-05-17.
