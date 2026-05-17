/**
 * T018a / T018b — /api/publish route handler tests.
 *
 * Tests 1–6 from task breakdown § 10.
 * Network mocked via vi.spyOn(globalThis, "fetch").
 *
 * Secret isolation structural test (T018a requirement / NFR-P2):
 *   process.env.SITECORE_PUBLISH_CLIENT_SECRET = "SHHH-do-not-leak"
 *   → no response body/header must echo that value back to the client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MOCK_TOKEN = "mock-bearer-token-abc";
const PUBLISHING_BASE = "https://pub.example.com";

describe("POST /api/publish route", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  /** Helper: mock fetch for token endpoint + optionally for upstream publishing endpoint */
  function mockFetch(
    upstreamStatus: number,
    upstreamBody: unknown,
  ) {
    fetchSpy.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
      // Token endpoint
      if (urlStr.includes("auth.example.com")) {
        return new Response(
          JSON.stringify({ access_token: MOCK_TOKEN, expires_in: 86400 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      // Upstream publishing endpoint
      return new Response(JSON.stringify(upstreamBody), {
        status: upstreamStatus,
        headers: { "Content-Type": "application/json" },
      });
    });
  }

  const validSiteBody = {
    name: "Site publish — Solo Website — 2026-05-16T20:00:00.000Z",
    source: "Redirect Manager",
    description: "Triggered from Redirect Manager Full Page workspace hero",
    options: {
      xmc: {
        site: { mode: "Republish" },
        locales: ["en-US"],
      },
    },
  };

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
    process.env.SITECORE_PUBLISH_CLIENT_ID = "test-client-id";
    process.env.SITECORE_PUBLISH_CLIENT_SECRET = "SHHH-do-not-leak";
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

  it("POST valid body → forwards to upstream with Bearer token → returns 201 + upstream JSON", async () => {
    const upstreamResponse = { id: "job-abc", system: { status: "Queued" } };
    mockFetch(201, upstreamResponse);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validSiteBody),
    });

    const response = await POST(req);

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json).toMatchObject({ id: "job-abc" });

    // Verify upstream was called with the correct URL and auth header
    const upstreamCall = fetchSpy.mock.calls.find(([url]) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : (url as Request).url;
      return urlStr.includes("authoring/publishing");
    });
    expect(upstreamCall).toBeDefined();
    const [upstreamUrl, upstreamInit] = upstreamCall as [string, RequestInit];
    expect(upstreamUrl).toBe(`${PUBLISHING_BASE}/authoring/publishing/v1/jobs`);
    expect((upstreamInit.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${MOCK_TOKEN}`,
    );
  });

  it("POST with malformed JSON body → 400 with title 'Invalid JSON'", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not valid json",
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.title).toMatch(/invalid json/i);
  });

  it("POST body missing 'source' field → 400 ProblemDetails", async () => {
    const { POST } = await import("./route");
    const bodyMissingSource = {
      name: "Test",
      options: { xmc: { site: { mode: "Republish" } } },
    };
    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyMissingSource),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty("title");
  });

  it("upstream returns 401 → clearSitecoreAiTokenCache called + route returns 401", async () => {
    fetchSpy.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : (url as Request).url;
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

    // Import clearSitecoreAiTokenCache to spy on it
    const tokenModule = await import("../../../lib/auth/sitecoreai-token");
    const clearSpy = vi.spyOn(tokenModule, "clearSitecoreAiTokenCache");

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validSiteBody),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    expect(clearSpy).toHaveBeenCalledOnce();
  });

  it("upstream returns 500 → route forwards 500 + upstream body verbatim", async () => {
    const upstream500Body = { title: "Internal Server Error", detail: "Something broke" };
    mockFetch(500, upstream500Body);

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validSiteBody),
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toMatchObject(upstream500Body);
  });

  it("secret isolation — no response code path leaks SITECORE_PUBLISH_CLIENT_SECRET", async () => {
    // 201 happy path
    mockFetch(201, { id: "job-abc", system: { status: "Queued" } });
    const { POST } = await import("./route");

    const req = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validSiteBody),
    });

    const response = await POST(req);
    const responseText = JSON.stringify(await response.json());
    expect(responseText).not.toContain("SHHH-do-not-leak");

    // 400 validation rejection
    vi.resetModules();
    const { POST: POST2 } = await import("./route");
    const req2 = new Request("http://localhost/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json",
    });
    const response2 = await POST2(req2);
    const responseText2 = JSON.stringify(await response2.json());
    expect(responseText2).not.toContain("SHHH-do-not-leak");
  });
});
