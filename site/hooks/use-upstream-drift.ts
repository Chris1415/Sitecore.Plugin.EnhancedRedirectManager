'use client';

/**
 * use-upstream-drift.ts — 5-state drift detection hook.
 *
 * ADR-0049: Five-state machine (idle / checking / in-sync / drifted / error).
 *           Sequential per-file fetches (NOT Promise.all — rate-limit-friendlier).
 *           Concurrent recheck() calls return early when state === 'checking'.
 *           NO useEffect auto-fetch on mount (FR-C4 / ADR-0046).
 *
 * ADR-0044: Reads snapshot via snapshot-reader (getSnapshot / getWatchedFiles).
 *
 * State transitions:
 *   idle → checking (on recheck())
 *   checking → in-sync   (all SHAs match)
 *   checking → drifted   (any SHA differs)
 *   checking → error     (fetch error OR schema mismatch)
 *   any terminal → checking (on next recheck())
 *
 * recheck() is wrapped in useCallback with empty deps (reads state via functional setter)
 * so the reference is stable across re-renders. This prevents the button's onClick from
 * triggering memoization cascades downstream.
 */

import { useState, useCallback, useRef } from 'react';
import type { DriftState, DriftError, UseUpstreamDriftReturn } from '@/lib/upstream-drift/types';
import { getLatestCommitSha } from '@/lib/upstream-drift/github-client';
import { getSnapshot } from '@/lib/upstream-drift/snapshot-reader';

export function useUpstreamDrift(): UseUpstreamDriftReturn {
  const [state, setState] = useState<DriftState>('idle');
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<DriftError | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);

  // Reentrancy guard — using a ref so it doesn't trigger re-renders
  const isCheckingRef = useRef(false);

  const recheck = useCallback(async (): Promise<void> => {
    // Reentrancy guard: second call while checking is a no-op (ADR-0049 FR-C5)
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;
    setState('checking');
    setErrorReason(null);
    setRetryAfterSeconds(null);

    try {
      // Schema validation: getSnapshot throws if schemaVersion !== 1
      let snapshot: ReturnType<typeof getSnapshot>;
      try {
        snapshot = getSnapshot();
      } catch {
        // Map to schema-mismatch error — do NOT call getLatestCommitSha
        setErrorReason('schema-mismatch');
        setRetryAfterSeconds(null);
        setState('error');
        setLastChecked(new Date().toISOString());
        return;
      }

      const watchedFiles = snapshot.watchedFiles;
      const branch = snapshot.branch;
      let hasDrift = false;

      // Sequential per-file fetches (NOT Promise.all — ADR-0049)
      for (const file of watchedFiles) {
        const result = await getLatestCommitSha(file.path, branch);

        if (!result.ok) {
          // Map GitHubCommitResult error reason to DriftError
          const reason: DriftError = result.reason;
          setErrorReason(reason);
          setRetryAfterSeconds(
            result.reason === 'rate-limit' ? result.retryAfterSeconds : null,
          );
          setState('error');
          setLastChecked(new Date().toISOString());
          return;
        }

        if (result.sha !== file.sha) {
          hasDrift = true;
          // Continue checking remaining files (first error short-circuits, but SHA diff continues)
          // Per architecture § 4 state matrix: any SHA differs → drifted
          // We still want to check all files but mark drifted on first divergence found.
          // Early break is valid (drifted is the terminal state regardless of remaining files).
          break;
        }
      }

      setLastChecked(new Date().toISOString());
      setState(hasDrift ? 'drifted' : 'in-sync');
    } finally {
      isCheckingRef.current = false;
    }
  }, []);
  // Empty deps array — stable reference (ADR-0049 + T015).
  // State reads use functional-setter pattern or refs where needed.

  return {
    state,
    lastChecked,
    errorReason,
    retryAfterSeconds,
    recheck,
  };
}
