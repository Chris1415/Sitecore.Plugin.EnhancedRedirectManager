/**
 * Tranche 3b — usePublishResume
 *
 * On mount (or when siteContextKey changes), attempts to resume an in-progress
 * publish job for the current site context via a two-tier strategy:
 *
 *   Tier 2 — localStorage:
 *     Read getInFlightJob(siteContextKey). If found, verify job is non-terminal
 *     via GET /api/publish/jobs/{jobId}. If still running, return it.
 *     If terminal, clearInFlightJob and fall through to Tier 3.
 *
 *   Tier 3 — list scan:
 *     Call GET /api/publish/jobs?source=Redirect+Manager.
 *     Client-side filter for:
 *       - name starts with `Redirect Manager — {collection}/{site} — `
 *       - system.status ∈ { Queued, Running, Canceling }
 *       - system.queuedTime within the last 60 minutes
 *     Sort by queuedTime desc. Take first match. Write to localStorage. Return it.
 *
 * Returns { jobId: null, kickedOffAt: null, resumedFrom: null } if nothing found.
 * Defensive: all fetches wrapped in try/catch — errors produce null result.
 */

import { useEffect, useState } from "react";
import { getInFlightJob, setInFlightJob, clearInFlightJob } from "./in-flight-store";
import type { PublishJobDetail } from "./types";

export interface ResumeResult {
  jobId: string | null;
  kickedOffAt: string | null;
  resumedFrom: "localStorage" | "list-scan" | null;
}

const NULL_RESULT: ResumeResult = {
  jobId: null,
  kickedOffAt: null,
  resumedFrom: null,
};

const ACTIVE_STATUSES = new Set(["Queued", "Running", "Canceling"]);
const TERMINAL_STATUSES = new Set(["Completed", "Failed", "Canceled"]);
const LIST_SCAN_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

export function usePublishResume(siteContextKey: string | null): ResumeResult {
  const [result, setResult] = useState<ResumeResult>(NULL_RESULT);

  useEffect(() => {
    if (!siteContextKey) {
      // Deferred setState avoids react-hooks/set-state-in-effect lint error
      const id = setTimeout(() => setResult(NULL_RESULT), 0);
      return () => clearTimeout(id);
    }

    let cancelled = false;

    async function attemptResume() {
      // Derive collection/site from the context key for the name prefix filter
      // siteContextKey format: "<collectionName>:<siteName>"
      const parts = siteContextKey!.split(":");
      const collectionName = parts[0] ?? "";
      const siteName = parts.slice(1).join(":"); // safe if siteName contains ":"
      const namePrefix = `Redirect Manager — ${collectionName}/${siteName} — `;

      // ── Tier 2: localStorage ─────────────────────────────────────────────
      const stored = getInFlightJob(siteContextKey!);
      if (stored) {
        try {
          const res = await fetch(`/api/publish/jobs/${stored.jobId}`);
          if (!cancelled && res.ok) {
            const detail = (await res.json()) as PublishJobDetail;
            if (!cancelled) {
              const status = detail.system?.status;
              if (status && ACTIVE_STATUSES.has(status)) {
                setResult({
                  jobId: stored.jobId,
                  kickedOffAt: stored.kickedOffAt,
                  resumedFrom: "localStorage",
                });
                return;
              }
              if (status && TERMINAL_STATUSES.has(status)) {
                clearInFlightJob(siteContextKey!);
              }
            }
          } else if (!cancelled && !res.ok) {
            // Non-2xx (e.g. 404) — job gone; clear
            clearInFlightJob(siteContextKey!);
          }
        } catch {
          // fetch failed — fall through to Tier 3
        }
      }

      if (cancelled) return;

      // ── Tier 3: list scan ────────────────────────────────────────────────
      try {
        const res = await fetch(
          `/api/publish/jobs?source=${encodeURIComponent("Redirect Manager")}`,
        );
        if (!cancelled && res.ok) {
          const data = (await res.json()) as unknown;
          // The jobs list may be an array directly or wrapped (e.g. { items: [...] })
          const jobs: PublishJobDetail[] = Array.isArray(data)
            ? (data as PublishJobDetail[])
            : Array.isArray((data as { items?: unknown }).items)
              ? ((data as { items: PublishJobDetail[] }).items)
              : [];

          const now = Date.now();
          const candidates = jobs.filter((job) => {
            if (!job.name?.startsWith(namePrefix)) return false;
            const status = job.system?.status;
            if (!status || !ACTIVE_STATUSES.has(status)) return false;
            if (!job.system.queuedTime) return true; // no time info — include
            const queuedMs = new Date(job.system.queuedTime).getTime();
            if (isNaN(queuedMs)) return true;
            return now - queuedMs <= LIST_SCAN_WINDOW_MS;
          });

          if (!cancelled && candidates.length > 0) {
            // Sort by queuedTime desc, take first
            candidates.sort((a, b) => {
              const ta = a.system.queuedTime
                ? new Date(a.system.queuedTime).getTime()
                : 0;
              const tb = b.system.queuedTime
                ? new Date(b.system.queuedTime).getTime()
                : 0;
              return tb - ta;
            });
            const best = candidates[0];
            const kickedOffAt = best.system.queuedTime ?? new Date().toISOString();
            // Write back to localStorage for next session
            setInFlightJob({
              jobId: best.id,
              kickedOffAt,
              siteContextKey: siteContextKey!,
            });
            setResult({
              jobId: best.id,
              kickedOffAt,
              resumedFrom: "list-scan",
            });
            return;
          }
        }
      } catch {
        // list-scan fetch failed — return null
      }

      if (!cancelled) {
        setResult(NULL_RESULT);
      }
    }

    void attemptResume();

    return () => {
      cancelled = true;
    };
  }, [siteContextKey]);

  return result;
}
