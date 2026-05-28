/**
 * snapshot-reader.ts — Typed accessor for the upstream-snapshot.json baseline.
 *
 * ADR-0044: upstream-snapshot.json at site/lib/redirects/__fixtures__/ is authoritative.
 *           Statically imported (bundled at build time per Next 16 resolveJsonModule: true).
 *           This module is 'use client'-safe (no 'server-only' directive).
 *
 * Exports:
 *   getSnapshot()       — Returns a frozen copy of the upstream snapshot.
 *   getWatchedFiles()   — Derived selector returning watchedFiles[].
 *   validateSchema()    — Pure validator: schemaVersion must equal 1.
 */

import type { UpstreamSnapshot, WatchedFile } from './types';

// Static import — bundled at build time (Next 16 resolveJsonModule: true per tsconfig.json)
// The @/ alias resolves to the site/ root.
import snapshotJson from '@/lib/redirects/__fixtures__/upstream-snapshot.json';

/**
 * Returns true if the snapshot's schemaVersion is 1.
 * Exported as a pure function so it can be tested in isolation (no mock machinery needed).
 */
export function validateSchema(snapshot: { schemaVersion: unknown }): boolean {
  return snapshot.schemaVersion === 1;
}

/**
 * Returns the upstream snapshot as a frozen, typed object.
 * Throws if schemaVersion !== 1 (should not happen in normal operation — guarded by T029).
 */
export function getSnapshot(): UpstreamSnapshot {
  if (!validateSchema(snapshotJson)) {
    // This is a developer-facing invariant violation, not a user-facing error.
    // The hook maps this to errorReason: 'schema-mismatch' before calling getSnapshot().
    throw new Error(
      `upstream-snapshot.json schemaVersion is ${snapshotJson.schemaVersion}, expected 1. ` +
        'Update the snapshot file or bump the schemaVersion guard.',
    );
  }
  return Object.freeze(snapshotJson as unknown as UpstreamSnapshot);
}

/**
 * Derived selector: returns watchedFiles[] from the snapshot.
 * Convenience wrapper to avoid repeated getSnapshot().watchedFiles in callers.
 */
export function getWatchedFiles(): WatchedFile[] {
  return getSnapshot().watchedFiles;
}
