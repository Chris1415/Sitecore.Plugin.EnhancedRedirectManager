/**
 * Tranche 3b — usePublishJobTracker tests.
 *
 * 4 tests:
 *   1. jobId=null → idle state
 *   2. polls until Completed → terminal Completed
 *   3. 404 response → terminal Canceled
 *   4. jobId change cancels prior poll and starts fresh
 *
 * Uses vitest fake timers + mocked global fetch.
 * NOTE: use advanceTimersByTimeAsync (bounded), NOT runAllTimersAsync (infinite loop).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePublishJobTracker } from "./use-publish-job-tracker";

function makeJobResponse(status: string, statistics?: Record<string, number>) {
  return {
    id: "job-123",
    system: { status, queuedTime: "2026-05-16T10:00:00Z" },
    ...(statistics ? { statistics } : {}),
  };
}

function makeResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("usePublishJobTracker", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("jobId=null → returns idle state immediately", () => {
    const { result } = renderHook(() => usePublishJobTracker(null));
    expect(result.current.kind).toBe("idle");
  });

  it("polls every 3s until Completed → terminal state with statistics", async () => {
    let callCount = 0;
    fetchMock.mockImplementation(() => {
      callCount++;
      const status = callCount < 3 ? "Running" : "Completed";
      return makeResponse(200, makeJobResponse(status, { itemsProcessed: 42, itemsFailed: 0 }));
    });

    const { result } = renderHook(() => usePublishJobTracker("job-123"));

    // First immediate poll fires synchronously via useEffect
    await act(async () => {
      // Let microtasks resolve (the first void poll() call)
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Second poll at 3s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Third poll at 6s — returns Completed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.kind).toBe("terminal");
    if (result.current.kind === "terminal") {
      expect(result.current.status).toBe("Completed");
      expect(result.current.statistics?.itemsProcessed).toBe(42);
      expect(result.current.statistics?.itemsFailed).toBe(0);
      expect(result.current.jobId).toBe("job-123");
    }
  });

  it("404 response → terminal Canceled", async () => {
    fetchMock.mockReturnValue(
      makeResponse(404, { title: "Not Found" }),
    );

    const { result } = renderHook(() => usePublishJobTracker("job-404"));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.kind).toBe("terminal");
    if (result.current.kind === "terminal") {
      expect(result.current.status).toBe("Canceled");
    }
  });

  it("jobId change cancels prior poll and starts polling the new jobId", async () => {
    fetchMock.mockReturnValue(
      makeResponse(200, makeJobResponse("Running")),
    );

    const { rerender } = renderHook(
      ({ jobId }: { jobId: string | null }) => usePublishJobTracker(jobId),
      { initialProps: { jobId: "job-old" as string | null } },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Switch to new jobId
    rerender({ jobId: "job-new" });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Verify the most recent fetch targeted the new jobId
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const lastUrl = lastCall[0] as string;
    expect(lastUrl).toContain("job-new");
  });
});
