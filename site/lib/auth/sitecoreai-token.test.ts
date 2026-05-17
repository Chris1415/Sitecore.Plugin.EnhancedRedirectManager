/**
 * T018a / T018b — sitecoreai-token.ts unit tests (token cache)
 *
 * Tests 7–10 from task breakdown § 10 (T018a / T018b).
 * Network mocked via vi.spyOn(globalThis, "fetch").
 *
 * NOTE: env vars use SITECORE_PUBLISH_CLIENT_ID / SITECORE_PUBLISH_CLIENT_SECRET
 * (matching the existing sitecoreai-token.ts implementation that uses those names).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Module reset between tests so the module-level cache is cleared ---
// We need to re-import after clearing cache via the exported function.
// Use dynamic imports with vi.resetModules() for cache isolation.

describe("getSitecoreAccessToken + clearSitecoreAiTokenCache", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const MOCK_TOKEN = "mock-access-token-xyz";
  const MOCK_TOKEN_2 = "mock-access-token-abc";

  function mockSuccessfulFetch(token: string = MOCK_TOKEN) {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ access_token: token, expires_in: 86400 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    process.env.SITECORE_PUBLISH_CLIENT_ID = "test-client-id";
    process.env.SITECORE_PUBLISH_CLIENT_SECRET = "SHHH-do-not-leak";
    process.env.SITECORE_OAUTH_TOKEN_URL = "https://auth.example.com/token";
    process.env.SITECORE_OAUTH_AUDIENCE = "https://api.example.com";
    vi.resetModules();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.SITECORE_PUBLISH_CLIENT_ID;
    delete process.env.SITECORE_PUBLISH_CLIENT_SECRET;
    delete process.env.SITECORE_OAUTH_TOKEN_URL;
    delete process.env.SITECORE_OAUTH_AUDIENCE;
  });

  it("first call fetches token from token endpoint with correct form body", async () => {
    mockSuccessfulFetch();

    const { getSitecoreAccessToken } = await import("./sitecoreai-token");
    const token = await getSitecoreAccessToken();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://auth.example.com/token");
    expect(init.method).toBe("POST");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("test-client-id");
    expect(body.get("client_secret")).toBe("SHHH-do-not-leak");
    expect(token).toBe(MOCK_TOKEN);
  });

  it("second call within TTL returns cached token (fetch called once total)", async () => {
    mockSuccessfulFetch();

    const { getSitecoreAccessToken } = await import("./sitecoreai-token");
    const token1 = await getSitecoreAccessToken();
    const token2 = await getSitecoreAccessToken();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(token1).toBe(MOCK_TOKEN);
    expect(token2).toBe(MOCK_TOKEN);
  });

  it("clearSitecoreAiTokenCache then another call re-fetches from endpoint", async () => {
    mockSuccessfulFetch();

    const { getSitecoreAccessToken, clearSitecoreAiTokenCache } = await import(
      "./sitecoreai-token"
    );

    await getSitecoreAccessToken();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    clearSitecoreAiTokenCache();

    // Now mock a different token for the second fetch
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ access_token: MOCK_TOKEN_2, expires_in: 86400 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const token2 = await getSitecoreAccessToken();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(token2).toBe(MOCK_TOKEN_2);
  });

  it("missing SITECORE_PUBLISH_CLIENT_SECRET throws with no secret in error message", async () => {
    delete process.env.SITECORE_PUBLISH_CLIENT_SECRET;

    const { getSitecoreAccessToken } = await import("./sitecoreai-token");

    await expect(getSitecoreAccessToken()).rejects.toThrow();
    // Error message must NOT contain the literal secret value
    try {
      await getSitecoreAccessToken();
    } catch (err) {
      if (err instanceof Error) {
        expect(err.message).not.toContain("SHHH-do-not-leak");
      }
    }
  });
});
