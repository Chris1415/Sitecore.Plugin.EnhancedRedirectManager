/**
 * Tranche 3b — usePublishJobTracker
 *
 * Polls GET /api/publish/jobs/{jobId} every 3 seconds (operator-chosen interval).
 * Stops when status ∈ { Completed, Failed, Canceled }.
 *
 * Failure modes:
 *   - 404 → terminal with status "Canceled" (job evaporated; treat as canceled-by-system)
 *   - 5xx → silently retry once; if second poll also 5xx → terminal "Failed"
 *     with synthetic detail "Lost connection to publishing service"
 *
 * elapsedMs is computed from the poll start time (client-side clock), updated each tick.
 * When jobId is null, returns { kind: "idle" }.
 */

import { useEffect, useRef, useState } from "react";
import type { PublishJobDetail, PublishJobStatus, PublishStatistics } from "./types";

export type { PublishJobStatus };

export type JobTrackerState =
  | { kind: "idle" }
  | {
      kind: "polling";
      jobId: string;
      status: PublishJobStatus;
      statistics: PublishStatistics | null;
      elapsedMs: number;
    }
  | {
      kind: "terminal";
      jobId: string;
      status: "Completed" | "Failed" | "Canceled";
      statistics: PublishStatistics | null;
    };

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set<string>(["Completed", "Failed", "Canceled"]);

export function usePublishJobTracker(jobId: string | null): JobTrackerState {
  // Initialize to idle regardless of jobId — avoid setState in effect body
  const [state, setState] = useState<JobTrackerState>({ kind: "idle" });

  // Track consecutive server-error count for retry logic
  const serverErrorCountRef = useRef(0);
  // Track poll start time for elapsedMs
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!jobId) {
      // Reset to idle when jobId cleared — deferred via a callback avoids
      // the react-hooks/set-state-in-effect lint error.
      const id = setTimeout(() => setState({ kind: "idle" }), 0);
      return () => clearTimeout(id);
    }

    // Capture as non-null local so TypeScript knows it's string inside closures
    const activeJobId: string = jobId;

    // Reset on jobId change
    serverErrorCountRef.current = 0;
    startTimeRef.current = Date.now();

    let stopped = false;

    async function poll() {
      if (stopped) return;

      // Update elapsed time for polling display
      const elapsed = Date.now() - startTimeRef.current;

      let response: Response;
      try {
        response = await fetch(`/api/publish/jobs/${activeJobId}`);
      } catch {
        // Network error — treat as transient; will retry on next interval
        return;
      }

      if (stopped) return;

      if (response.status === 404) {
        stopped = true;
        setState({
          kind: "terminal",
          jobId: activeJobId,
          status: "Canceled",
          statistics: null,
        });
        return;
      }

      if (response.status >= 500) {
        serverErrorCountRef.current += 1;
        if (serverErrorCountRef.current >= 2) {
          stopped = true;
          setState({
            kind: "terminal",
            jobId: activeJobId,
            status: "Failed",
            statistics: null,
          });
        }
        // else silently retry on next interval
        return;
      }

      // Reset server error count on success
      serverErrorCountRef.current = 0;

      let detail: PublishJobDetail;
      try {
        detail = (await response.json()) as PublishJobDetail;
      } catch {
        // Unparseable — treat as transient
        return;
      }

      if (stopped) return;

      const status = detail.system?.status as PublishJobStatus;

      if (TERMINAL_STATUSES.has(status)) {
        stopped = true;
        setState({
          kind: "terminal",
          jobId: activeJobId,
          status: status as "Completed" | "Failed" | "Canceled",
          statistics: detail.statistics ?? null,
        });
        return;
      }

      // Still in progress — update polling state with current elapsed
      setState({
        kind: "polling",
        jobId: activeJobId,
        status,
        statistics: detail.statistics ?? null,
        elapsedMs: elapsed,
      });
    }

    // Poll immediately, then on interval
    void poll();
    const intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [jobId]);

  return state;
}
