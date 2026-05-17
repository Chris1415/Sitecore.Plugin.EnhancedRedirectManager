/**
 * T015/T016 — POST /api/publish — Branch B server-side OAuth proxy.
 *
 * Accepts a PublishApiRequest body from the client (no auth header required from
 * client — this route holds the OAuth client-credentials server-side).
 * Forwards to SitecoreAI Publishing v1: POST ${SITECORE_PUBLISHING_BASE_URL}/authoring/publishing/v1/jobs
 * Returns the upstream status + body verbatim to the client.
 *
 * Secret hygiene (NFR-P2 / ADR-0034):
 *   - `import "server-only"` prevents accidental bundling into client JS
 *   - The OAuth client secret NEVER appears in any response body or header
 *   - Token is fetched server-side via getSitecoreAccessToken()
 *
 * 401 handling: clears the token cache (stale token) but does NOT auto-retry —
 * the client sees 401 and the toast adapter surfaces it.
 *
 * ADR-0033 §§ 4c-6.D, ADR-0034.
 */

import "server-only";

import { NextResponse } from "next/server";
import {
  getSitecoreAccessToken,
  clearSitecoreAiTokenCache,
} from "@/lib/auth/sitecoreai-token";

/** Validate that the incoming body has the minimum required fields. */
function validateBody(body: unknown): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.source !== "string" || !b.source) {
    return { valid: false, error: "Field 'source' is required and must be a non-empty string." };
  }
  return { valid: true, data: b };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Parse request body
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json(
      { title: "Invalid JSON", status: 400, detail: "Request body could not be parsed as JSON." },
      { status: 400 },
    );
  }

  // 2. Validate minimum required fields
  const validation = validateBody(parsedBody);
  if (!validation.valid) {
    return NextResponse.json(
      { title: "Bad Request", status: 400, detail: validation.error },
      { status: 400 },
    );
  }

  // 3. Acquire OAuth token (server-side only — never exposed to client)
  let token: string;
  try {
    token = await getSitecoreAccessToken();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "Failed to acquire publishing token",
        upstream_status: 0,
        upstream_body: null,
        detail,
      },
      { status: 502 },
    );
  }

  // 4. Forward request to SitecoreAI Publishing v1.
  //    edge-platform.sitecorecloud.io is the Sitecore-managed proxy host — SAME for
  //    every tenant; the path prefix is the routing key. Operator never configures
  //    this (memory: reference_sitecoreai_edge_platform_host.md). Env var is only
  //    an escape hatch for non-standard regions or local tunnels.
  const baseUrl =
    process.env.SITECORE_PUBLISHING_BASE_URL ??
    "https://edge-platform.sitecorecloud.io";

  const upstreamUrl = `${baseUrl}/authoring/publishing/v1/jobs`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(parsedBody),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Network error reaching publishing API", upstream_status: 0, upstream_body: null, detail },
      { status: 502 },
    );
  }

  // 5. Handle 401 — evict stale token (no retry per ADR-0033 § 6)
  if (upstreamResponse.status === 401) {
    clearSitecoreAiTokenCache();
  }

  // 6. Forward upstream response verbatim
  let upstreamBody: unknown;
  try {
    upstreamBody = await upstreamResponse.json();
  } catch {
    upstreamBody = {};
  }

  return NextResponse.json(upstreamBody, { status: upstreamResponse.status });
}
