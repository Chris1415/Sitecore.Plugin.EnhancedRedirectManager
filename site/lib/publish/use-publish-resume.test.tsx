/**
 * Tranche 3b — usePublishResume tests.
 *
 * 4 tests:
 *   1. localStorage hit → job still non-terminal → resume from localStorage
 *   2. localStorage hit → job terminal → cleared + null returned
 *   3. localStorage miss → list-scan hit → resume from list-scan
 *   4. all miss → null result
 *
 * Mocks: fetch (global) + localStorage (jsdom provides it).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePublishResume } from "./use-publish-resume";
import { setInFlightJob } from "./in-flight-store";

const SITE_KEY = "my-collection:my-site";

describe("usePublishResume", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("localStorage hit → non-terminal job → returns localStorage resume result", async () => {
    // Plant a stored job
    setInFlightJob({
      jobId: "job-running-123",
      kickedOffAt: "2026-05-16T10:00:00.000Z",
      siteContextKey: SITE_KEY,
    });

    // Job is still Running
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "job-running-123", system: { status: "Running" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => usePublishResume(SITE_KEY));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.jobId).toBe("job-running-123");
    expect(result.current.kickedOffAt).toBe("2026-05-16T10:00:00.000Z");
    expect(result.current.resumedFrom).toBe("localStorage");
  });

  it("localStorage hit → terminal job → clears entry + falls through to null (no list results)", async () => {
    setInFlightJob({
      jobId: "job-done-456",
      kickedOffAt: "2026-05-16T09:00:00.000Z",
      siteContextKey: SITE_KEY,
    });

    // Job is Completed
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ id: "job-done-456", system: { status: "Completed" } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    // List scan returns empty
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => usePublishResume(SITE_KEY));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.jobId).toBeNull();
    // Verify it was cleared from localStorage
    expect(localStorage.getItem(`redirect-manager:publish-in-flight:${SITE_KEY}`)).toBeNull();
  });

  it("localStorage miss → list-scan finds active job → returns list-scan resume result", async () => {
    // No localStorage entry

    const now = new Date();
    const queuedTime = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 min ago

    // List scan returns a matching active job
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "job-scanned-789",
            name: `Redirect Manager — my-collection/my-site — ${queuedTime}`,
            source: "Redirect Manager",
            system: { status: "Queued", queuedTime },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => usePublishResume(SITE_KEY));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.jobId).toBe("job-scanned-789");
    expect(result.current.resumedFrom).toBe("list-scan");
    expect(result.current.kickedOffAt).toBe(queuedTime);
  });

  it("all miss → null result", async () => {
    // No localStorage entry, list scan returns empty
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => usePublishResume(SITE_KEY));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.jobId).toBeNull();
    expect(result.current.kickedOffAt).toBeNull();
    expect(result.current.resumedFrom).toBeNull();
  });

  it("siteContextKey=null → returns null result without fetching", () => {
    const { result } = renderHook(() => usePublishResume(null));
    expect(result.current.jobId).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
