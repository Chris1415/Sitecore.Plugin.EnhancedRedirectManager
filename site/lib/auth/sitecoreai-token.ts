/**
 * PRD-003 — OAuth 2.0 client-credentials token acquisition + caching for the
 * SitecoreAI Publishing API. Production module — Branch B transport.
 *
 * Skill source: sitecore:sitecoreai-auth
 * Token endpoint: https://auth.sitecorecloud.io/oauth/token
 * Audience: https://api.sitecorecloud.io (fixed — never substitute the API base URL)
 * Lifetime: 86400 s (24 h). Cache with 60 s safety margin.
 *
 * Required env vars:
 *   SITECORE_PUBLISH_CLIENT_ID        — automation client id
 *   SITECORE_PUBLISH_CLIENT_SECRET    — automation client secret
 *   SITECORE_OAUTH_TOKEN_URL          — defaults to https://auth.sitecorecloud.io/oauth/token
 *   SITECORE_OAUTH_AUDIENCE           — defaults to https://api.sitecorecloud.io
 *
 * ADR-0034 (Branch B accepted).
 */

import "server-only";

type Cached = { token: string; expiresAt: number };
let cached: Cached | null = null;

/** Decode the `sub` claim from a JWT without verifying signature. */
function decodeJwtSub(jwt: string): string | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) return null;
    // Base64url → Base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return typeof parsed.sub === "string" ? parsed.sub : null;
  } catch {
    return null;
  }
}

async function fetchFreshToken(): Promise<string> {
  const clientId = process.env.SITECORE_PUBLISH_CLIENT_ID;
  const clientSecret = process.env.SITECORE_PUBLISH_CLIENT_SECRET;
  const tokenUrl =
    process.env.SITECORE_OAUTH_TOKEN_URL ??
    "https://auth.sitecorecloud.io/oauth/token";
  const audience =
    process.env.SITECORE_OAUTH_AUDIENCE ?? "https://api.sitecorecloud.io";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SITECORE_PUBLISH_CLIENT_ID or SITECORE_PUBLISH_CLIENT_SECRET. " +
        "Add them to .env.local (see .env.example).",
    );
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience,
    }),
  });

  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    throw new Error(
      `SitecoreAI OAuth failed: HTTP ${res.status} ${res.statusText}. Body: ${body}`,
    );
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  const { access_token, expires_in } = json;

  // Cache token. Safety margin: invalidate 60 s before actual expiry.
  cached = {
    token: access_token,
    expiresAt: Date.now() + expires_in * 1000,
  };

  // Log tenant identifier on cold-cache fetch (inside fetchFreshToken — not at call site,
  // per sitecore:sitecoreai-auth § 5 tenant-id logging placement note).
  const sub = decodeJwtSub(access_token);
  if (sub) {
    console.log(`[redirect-manager] publish-probe tenant=${sub}`);
  }

  return access_token;
}

/**
 * Returns a cached JWT bearer token for the SitecoreAI Publishing API.
 * Acquires a fresh token on first call, then reuses until 60 s before expiry.
 *
 * @throws Error if env vars are missing or the token endpoint returns non-2xx.
 */
export async function getSitecoreAccessToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt - now > 60_000) {
    return cached.token;
  }
  return fetchFreshToken();
}

/**
 * Evict the cached token so the next call to getSitecoreAccessToken() will
 * re-fetch from the token endpoint. Called by the /api/publish route handler
 * when the upstream publishing API returns 401 (indicating a stale or revoked token).
 *
 * ADR-0033 § 6 / ADR-0034.
 */
export function clearSitecoreAiTokenCache(): void {
  cached = null;
}
