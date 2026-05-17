/**
 * T016 — Branch B client-side transport adapter.
 *
 * `callPublishViaServerRoute` implements the `CallPublish` contract (ADR-0033 § 6)
 * by POSTing to the same-origin `/api/publish` route.
 *
 * The route holds the OAuth client-credentials server-side — the client never
 * sees or sends the secret (NFR-P2 / ADR-0034).
 *
 * ADR-0033 § 6 / ADR-0034 (Branch B accepted).
 */

import type { PublishApiRequest, PublishApiResponse, ProblemDetails, CallPublish } from "./types";

/**
 * Branch B transport: POST to the same-origin /api/publish proxy route.
 *
 * Returns `{ status, body }` for all code paths — never throws on non-2xx.
 * A thrown exception (network failure) propagates as-is per the no-try/catch
 * contract of `publish()` (ADR-0033 § 6).
 */
export const callPublishViaServerRoute: CallPublish = async (
  body: PublishApiRequest,
): Promise<{ status: number; body: PublishApiResponse | ProblemDetails }> => {
  const response = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let responseBody: PublishApiResponse | ProblemDetails;
  try {
    responseBody = (await response.json()) as PublishApiResponse | ProblemDetails;
  } catch {
    responseBody = { title: "Unparseable response", status: response.status } as ProblemDetails;
  }

  return { status: response.status, body: responseBody };
};
