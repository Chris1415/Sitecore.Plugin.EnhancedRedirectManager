/**
 * sync-helpers.ts — Pure functions for the slash command's logic core.
 *
 * T034: Unit-testable extractions from the /sync-redirect-proxy slash command.
 *
 * These functions are pure TS — no React, no Next.js, no HTTP calls.
 * They can be tested in isolation via Vitest without any DOM or network mocking.
 *
 * ADR-0047: Slash command auto-bumps SHA only after fixture regen + tests pass.
 *           knownDivergences[] is the escape hatch for deliberate non-ports.
 */

import type { WatchedFile, KnownDivergence } from './types';

// ---------------------------------------------------------------------------
// compareSnapshot
// ---------------------------------------------------------------------------

/**
 * Typed hunk shape — minimal subset for honorDivergences filtering.
 * The full hunk shape is defined by the operator's patch review flow; this is
 * the minimal contract needed for unit-testable divergence filtering.
 */
export type ParsedHunk = {
  /** The function name this hunk modifies. Used for divergence filtering. */
  targetFunction: string;
  /** Raw diff content of this hunk. Opaque string from the slash command's diff. */
  content: string;
};

/**
 * Compares the snapshot's baseline SHAs against the latest upstream SHAs.
 *
 * @param snapshot - Subset of UpstreamSnapshot with watchedFiles[]
 * @param latest   - Array of { path, sha } from the GitHub commits API
 * @returns { inSync: true, drifted: [] } or { inSync: false, drifted: WatchedFile[] }
 */
export function compareSnapshot(
  snapshot: { watchedFiles: WatchedFile[] },
  latest: Array<{ path: string; sha: string }>,
): { inSync: boolean; drifted: WatchedFile[] } {
  const latestByPath = new Map(latest.map((entry) => [entry.path, entry.sha]));
  const drifted: WatchedFile[] = [];

  for (const file of snapshot.watchedFiles) {
    const latestSha = latestByPath.get(file.path);
    if (latestSha !== undefined && latestSha !== file.sha) {
      drifted.push(file);
    }
  }

  return {
    inSync: drifted.length === 0,
    drifted,
  };
}

// ---------------------------------------------------------------------------
// honorDivergences
// ---------------------------------------------------------------------------

/**
 * Filters out hunks whose targetFunction appears in the knownDivergences list.
 * Used by the slash command to skip deliberate non-ports per ADR-0047 + C2 contract.
 *
 * @param diff             - Parsed hunks from the upstream diff
 * @param knownDivergences - Entries from upstream-snapshot.json knownDivergences[]
 * @returns Filtered hunks with deliberate non-ports removed
 */
export function honorDivergences(
  diff: ParsedHunk[],
  knownDivergences: KnownDivergence[],
): ParsedHunk[] {
  if (knownDivergences.length === 0) return diff;

  const divergedFunctions = new Set(knownDivergences.map((d) => d.function));
  return diff.filter((hunk) => !divergedFunctions.has(hunk.targetFunction));
}
