/**
 * T007 / T009 / T011 — Publish service module (site publish only).
 *
 * Tranche 3a: buildItemPublishBody removed — item publish was broken-by-design
 * (Redirect Map items are not Edge-published content). Site publish is the only
 * supported path.
 *
 * Tranche 3b: name format updated to include collectionName + siteName for
 * job list-scan / resume key matching.
 *
 * Exports:
 *   buildSitePublishBody  — T007 — PRD-003 AC-P1.4 (updated name format)
 *   outcomeFrom           — T009 — ADR-0033 § 4
 *   publish               — T011 — ADR-0033 § 6
 *
 * This module is branch-agnostic: it accepts a CallPublish dependency-injection
 * parameter and does not import any transport adapter directly.
 *
 * ADR-0033 §§ 2, 4, 5, 6.
 */

import type {
  PublishScope,
  PublishApiRequest,
  PublishApiResponse,
  ProblemDetails,
  PublishOutcome,
  CallPublish,
  ToastAdapter,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// T007 — buildSitePublishBody (PRD-003 AC-P1.4, Tranche 3b name format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the request body for a site-wide publish job.
 *
 * Name format (Tranche 3b):
 *   `Redirect Manager — {collectionName}/{siteName} — {nowIso}`
 * This allows the resume hook to match jobs back to the current site context
 * via a prefix scan on the jobs list.
 *
 * @param scope   Site publish scope.
 * @param nowIso  ISO timestamp injected for testability; defaults to `new Date().toISOString()`.
 *
 * PRD-003 AC-P1.4 + ADR-0033 § 2.
 */
export function buildSitePublishBody(
  scope: PublishScope,
  nowIso?: string,
): PublishApiRequest {
  const ts = nowIso ?? new Date().toISOString();
  return {
    name: `Redirect Manager — ${scope.collectionName}/${scope.siteName} — ${ts}`,
    source: "Redirect Manager",
    description: "Triggered from Redirect Manager Full Page workspace hero",
    options: {
      xmc: {
        site: { mode: "Republish" },
        locales: scope.locales,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// T009 — outcomeFrom (ADR-0033 § 4)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map an HTTP status + raw response body to a typed PublishOutcome.
 *
 * Rules:
 *   201 + body.id (non-empty string)  → { kind: "queued", jobId, jobIdShort }
 *   201 + body.id missing/empty       → { kind: "failed", status: 201, detail: "Unexpected …" }
 *   any non-201                        → { kind: "failed", status, detail: detail ?? title ?? "HTTP <status>" }
 *
 * ADR-0033 § 4. PRD-003 AC-P1.5/P1.6.
 */
export function outcomeFrom(
  status: number,
  body: PublishApiResponse | ProblemDetails | Record<string, unknown>,
): PublishOutcome {
  if (status === 201) {
    const id = (body as Partial<PublishApiResponse>).id;
    if (typeof id === "string" && id.length > 0) {
      return {
        kind: "queued",
        jobId: id,
        jobIdShort: id.slice(0, 8),
      };
    }
    return {
      kind: "failed",
      status,
      detail: "Unexpected response shape from publishing API",
    };
  }

  const problem = body as Partial<ProblemDetails>;
  const detail =
    typeof problem.detail === "string" && problem.detail.length > 0
      ? problem.detail
      : typeof problem.title === "string" && problem.title.length > 0
        ? problem.title
        : `HTTP ${status}`;

  return { kind: "failed", status, detail };
}

// ─────────────────────────────────────────────────────────────────────────────
// T011 — publish() orchestration (ADR-0033 § 6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Orchestrate a site publish job: build body, show loading toast, call transport,
 * map outcome, dismiss loading toast → success or error toast.
 *
 * Dependency-injected `deps.callPublish` and `deps.toasts` allow testing without
 * any real network or Sonner calls.
 *
 * Contract:
 *   - NO try/catch around callPublish — transports MUST return { status, body }
 *     for all code paths (including upstream errors). A thrown exception is a
 *     programmer error and surfaces to the React error boundary at the call site.
 *   - NO in-flight state — idempotency is the CALLER's responsibility (NFR-P6 /
 *     ADR-0033 § 6). This module is stateless.
 *
 * ADR-0033 § 6.
 */
export async function publish(
  scope: PublishScope,
  deps: { callPublish: CallPublish; toasts: ToastAdapter },
): Promise<PublishOutcome> {
  const body = buildSitePublishBody(scope);

  const requestedMessage = `Publishing site — ${scope.siteDisplayName}`;

  const dismissId = deps.toasts.requested(requestedMessage);

  const { status, body: responseBody } = await deps.callPublish(body);
  const outcome = outcomeFrom(status, responseBody);

  if (outcome.kind === "queued") {
    deps.toasts.queued(`Site publish queued — job ${outcome.jobIdShort}`, { dismissId });
  } else {
    deps.toasts.failed(`Publish failed — ${outcome.status}: ${outcome.detail}`, { dismissId });
  }

  return outcome;
}
