/**
 * Tranche 3b — in-flight-store tests.
 *
 * 3 tests: set/get round-trip, clear, SSR no-window safety.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getInFlightJob, setInFlightJob, clearInFlightJob } from "./in-flight-store";
import type { InFlightJob } from "./in-flight-store";

const SAMPLE: InFlightJob = {
  jobId: "job-abc-123",
  kickedOffAt: "2026-05-16T10:00:00.000Z",
  siteContextKey: "my-collection:my-site",
};

describe("in-flight-store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("setInFlightJob + getInFlightJob round-trip returns the stored value", () => {
    setInFlightJob(SAMPLE);
    const retrieved = getInFlightJob(SAMPLE.siteContextKey);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.jobId).toBe(SAMPLE.jobId);
    expect(retrieved!.kickedOffAt).toBe(SAMPLE.kickedOffAt);
    expect(retrieved!.siteContextKey).toBe(SAMPLE.siteContextKey);
  });

  it("clearInFlightJob removes the entry; subsequent get returns null", () => {
    setInFlightJob(SAMPLE);
    clearInFlightJob(SAMPLE.siteContextKey);
    expect(getInFlightJob(SAMPLE.siteContextKey)).toBeNull();
  });

  it("SSR no-window safety — get/set/clear are no-ops when window is undefined", () => {
    const originalWindow = globalThis.window;
    // Simulate SSR by deleting window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = undefined;

    expect(() => setInFlightJob(SAMPLE)).not.toThrow();
    expect(getInFlightJob(SAMPLE.siteContextKey)).toBeNull();
    expect(() => clearInFlightJob(SAMPLE.siteContextKey)).not.toThrow();

    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
  });
});
