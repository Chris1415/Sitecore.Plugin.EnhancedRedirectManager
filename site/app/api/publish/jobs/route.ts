/**
 * Tranche 3b — GET /api/publish/jobs
 *
 * Server-side proxy to SitecoreAI Publishing v1:
 *   GET ${SITECORE_PUBLISHING_BASE_URL}/authoring/publishing/v1/jobs
 *
 * Forwards all query params from the client request (e.g. ?source=Redirect+Manager).
 * Auth: same OAuth client-credentials pattern as POST /api/publish.
 * On 2xx: forward body verbatim.
 * On non-2xx: forward status + body.
 * On token failure: 502 with { error, upstream_status: 0, upstream_body: null }.
 *
 * ADR-0034 (Branch B — server-side OAuth).
 */

import "server-only";

import { NextResponse } from "next/server";
import {
  getSitecoreAccessToken,
  clearSitecoreAiTokenCache,
} from "@/lib/auth/sitecoreai-token";

export async function GET(request: Request): Promise<Response> {
  // Acquire OAuth token (server-side only)
  let token: string;
  try {
    token = await getSitecoreAccessToken();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to acquire publishing token", upstream_status: 0, upstream_body: null, detail },
      { status: 502 },
    );
  }

  const baseUrl =
    process.env.SITECORE_PUBLISHING_BASE_URL ??
    "https://edge-platform.sitecorecloud.io";

  // Forward all query params from the client request
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${baseUrl}/authoring/publishing/v1/jobs`);
  incomingUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Network error reaching publishing API", upstream_status: 0, upstream_body: null, detail },
      { status: 502 },
    );
  }

  // 401 — evict stale token
  if (upstreamResponse.status === 401) {
    clearSitecoreAiTokenCache();
  }

  let upstreamBody: unknown;
  try {
    upstreamBody = await upstreamResponse.json();
  } catch {
    upstreamBody = {};
  }

  return NextResponse.json(upstreamBody, { status: upstreamResponse.status });
}
