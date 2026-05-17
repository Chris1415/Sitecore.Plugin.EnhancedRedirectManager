/**
 * Tranche 3b — localStorage utility for tracking which publish job is in flight.
 *
 * Key format: `redirect-manager:publish-in-flight:<siteContextKey>`
 * where siteContextKey = "<collectionName>:<siteName>"
 *
 * SSR-safe: all localStorage calls are guarded by typeof window check.
 */

export interface InFlightJob {
  jobId: string;
  kickedOffAt: string; // ISO
  siteContextKey: string;
}

function storageKey(siteContextKey: string): string {
  return `redirect-manager:publish-in-flight:${siteContextKey}`;
}

/**
 * Read the in-flight job for a given site context key.
 * Returns null in SSR context or if no entry exists.
 */
export function getInFlightJob(siteContextKey: string): InFlightJob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(siteContextKey));
    if (!raw) return null;
    return JSON.parse(raw) as InFlightJob;
  } catch {
    return null;
  }
}

/**
 * Persist an in-flight job to localStorage.
 * No-op in SSR context.
 */
export function setInFlightJob(value: InFlightJob): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(value.siteContextKey), JSON.stringify(value));
  } catch {
    // localStorage quota exceeded or blocked — ignore
  }
}

/**
 * Remove the in-flight job entry for a given site context key.
 * No-op in SSR context.
 */
export function clearInFlightJob(siteContextKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(siteContextKey));
  } catch {
    // ignore
  }
}
