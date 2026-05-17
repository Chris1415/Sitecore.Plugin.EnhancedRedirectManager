/**
 * Tranche 3b — GET /api/publish/jobs route handler tests.
 *
 * 3 tests: happy list, query params forwarded, error forward.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const MOCK_TOKEN = "mock-bearer-token-list";
const PUBLISHING_BASE = "https://pub.example.com";

describe("GET /api/publish/jobs route", () => {
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

  it("GET happy path → 200 + job list body forwarded verbatim", async () => {
    const jobList = [
      { id: "job-1", system: { status: "Queued" } },
      { id: "job-2", system: { status: "Completed" } },
    ];
    mockFetch(200, jobList);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/publish/jobs");
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(2);
    expect(json[0]).toMatchObject({ id: "job-1" });
  });

  it("query params are forwarded to upstream URL", async () => {
    mockFetch(200, []);

    const { GET } = await import("./route");
    const req = new Request(
      "http://localhost/api/publish/jobs?source=Redirect+Manager",
    );
    await GET(req);

    // Find the upstream jobs call (not the token endpoint)
    const upstreamCall = fetchSpy.mock.calls.find(([url]) => {
      const urlStr =
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : (url as Request).url;
      return urlStr.includes("authoring/publishing/v1/jobs");
    });
    expect(upstreamCall).toBeDefined();
    const urlStr =
      typeof upstreamCall![0] === "string"
        ? upstreamCall![0]
        : upstreamCall![0] instanceof URL
          ? upstreamCall![0].toString()
          : (upstreamCall![0] as Request).url;
    expect(urlStr).toContain("source=Redirect+Manager");
  });

  it("upstream error → route forwards status + body", async () => {
    mockFetch(500, { title: "Internal Server Error" });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/publish/jobs");
    const response = await GET(req);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json).toMatchObject({ title: "Internal Server Error" });
  });
});
