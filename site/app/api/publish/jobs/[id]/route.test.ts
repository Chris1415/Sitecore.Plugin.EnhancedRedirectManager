/**
 * Tranche 3b — GET /api/publish/jobs/{id} route handler tests.
 *
 * 4 tests: happy 200 with body, 404 forwarded, token failure → 502, 401 upstream → clears cache.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MOCK_TOKEN = "mock-bearer-token-get";
const PUBLISHING_BASE = "https://pub.example.com";
const JOB_ID = "job-abc123";

describe("GET /api/publish/jobs/[id] route", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  function mockFetch(upstreamStatus: number, upstreamBody: unknown) {
    fetchSpy.mockImplementation(async (url: string | URL | Request) => {
      const urlStr =
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : (url as Request).url;
      if (urlStr.includes("auth.example.com")) {
        return new Response(
          JSON.stringify({ access_token: MOCK_TOKEN, expires_in: 86400 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify(upstreamBody), {
        status: upstreamStatus,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    process.env.SITECORE_PUBLISH_CLIENT_ID = "test-client-id";
    process.env.SITECORE_PUBLISH_CLIENT_SECRET = "test-secret";
    process.env.SITECORE_OAUTH_TOKEN_URL = "https://auth.example.com/token";
    process.env.SITECORE_OAUTH_AUDIENCE = "https://api.example.com";
    process.env.SITECORE_PUBLISHING_BASE_URL = PUBLISHING_BASE;
    vi.resetModules();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.SITECORE_PUBLISH_CLIENT_ID;
    delete process.env.SITECORE_PUBLISH_CLIENT_SECRET;
    delete process.env.SITECORE_OAUTH_TOKEN_URL;
    delete process.env.SITECORE_OAUTH_AUDIENCE;
    delete process.env.SITECORE_PUBLISHING_BASE_URL;
  });

  it("GET happy path → forwards to upstream with Bearer token → 200 + job body", async () => {
    const jobDetail = {
      id: JOB_ID,
      system: { status: "Running", queuedTime: "2026-05-16T10:00:00Z" },
      statistics: { itemsProcessed: 5, itemsFailed: 0 },
    };
    mockFetch(200, jobDetail);

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/publish/jobs/${JOB_ID}`);
    const response = await GET(req, { params: Promise.resolve({ id: JOB_ID }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({ id: JOB_ID, system: { status: "Running" } });

    // Verify upstream was called with the correct URL + auth
    const upstreamCall = fetchSpy.mock.calls.find(([url]) => {
      const urlStr =
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : (url as Request).url;
      return urlStr.includes("authoring/publishing") && urlStr.includes(JOB_ID);
    });
    expect(upstreamCall).toBeDefined();
    const [upstreamUrl, upstreamInit] = upstreamCall as [string, RequestInit];
    expect(upstreamUrl).toBe(`${PUBLISHING_BASE}/authoring/publishing/v1/jobs/${JOB_ID}`);
    expect((upstreamInit?.headers as Record<string, string>)?.["Authorization"]).toBe(
      `Bearer ${MOCK_TOKEN}`,
    );
  });

  it("upstream returns 404 → route forwards 404", async () => {
    mockFetch(404, { title: "Not Found" });

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/publish/jobs/${JOB_ID}`);
    const response = await GET(req, { params: Promise.resolve({ id: JOB_ID }) });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json).toMatchObject({ title: "Not Found" });
  });

  it("token acquisition fails → 502 with error shape", async () => {
    // Don't mock a token endpoint so getSitecoreAccessToken throws
    process.env.SITECORE_PUBLISH_CLIENT_ID = "";

    vi.resetModules();
    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/publish/jobs/${JOB_ID}`);
    const response = await GET(req, { params: Promise.resolve({ id: JOB_ID }) });

    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json).toHaveProperty("error");
    expect(json.upstream_status).toBe(0);
    expect(json.upstream_body).toBeNull();
  });

  it("upstream returns 401 → route forwards 401 + clearSitecoreAiTokenCache called", async () => {
    fetchSpy.mockImplementation(async (url: string | URL | Request) => {
      const urlStr =
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : (url as Request).url;
      if (urlStr.includes("auth.example.com")) {
        return new Response(
          JSON.stringify({ access_token: MOCK_TOKEN, expires_in: 86400 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ title: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });

    const tokenModule = await import("@/lib/auth/sitecoreai-token");
    const clearSpy = vi.spyOn(tokenModule, "clearSitecoreAiTokenCache");

    const { GET } = await import("./route");
    const req = new Request(`http://localhost/api/publish/jobs/${JOB_ID}`);
    const response = await GET(req, { params: Promise.resolve({ id: JOB_ID }) });

    expect(response.status).toBe(401);
    expect(clearSpy).toHaveBeenCalledOnce();
  });
});
