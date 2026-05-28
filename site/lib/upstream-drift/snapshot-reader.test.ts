/**
 * snapshot-reader.test.ts — Unit tests for snapshot reader module.
 *
 * T009a (RED) → T008 (source) → T009 (GREEN)
 *
 * Tests cover: parse result shape, getWatchedFiles() array,
 * frozen object return, schema-validation failure.
 *
 * ADR-0044: upstream-snapshot.json is authoritative for baseline SHAs.
 */

import { describe, it, expect } from 'vitest';

// We import the module under test — it will fail to import in T009a (RED phase)
// until T008 creates snapshot-reader.ts
import { getSnapshot, getWatchedFiles, validateSchema } from './snapshot-reader';

describe('snapshot-reader', () => {
  it('getSnapshot() returns object with all required fields', () => {
    const snapshot = getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.repository).toBe('Sitecore/content-sdk');
    expect(snapshot.branch).toBe('dev');
    expect(snapshot.originalPort).toBeDefined();
    expect(Array.isArray(snapshot.originalPort.ports)).toBe(true);
    expect(snapshot.originalPort.ports).toHaveLength(2);
    expect(Array.isArray(snapshot.watchedFiles)).toBe(true);
    expect(Array.isArray(snapshot.knownDivergences)).toBe(true);
  });

  it('originalPort.branch is dev and ports contains both PRD-004 SHAs', () => {
    const snapshot = getSnapshot();
    expect(snapshot.originalPort.branch).toBe('dev');
    const shas = snapshot.originalPort.ports.map((p) => p.sha);
    expect(shas).toContain('30b0db8fe768b83f03fd6b9772b0d3e14711c6b2');
    expect(shas).toContain('e6153e5e80c2076704cad0876eec3b85ec3a1a9f');
  });

  it('getSnapshot() returns a frozen object — mutation attempt fails or is a no-op', () => {
    const snapshot = getSnapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('getWatchedFiles() returns array with at least 2 entries with required fields', () => {
    const files = getWatchedFiles();
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThanOrEqual(2);
    for (const f of files) {
      expect(typeof f.path).toBe('string');
      expect(typeof f.sha).toBe('string');
      expect(typeof f.retrievedAt).toBe('string');
      expect(typeof f.fileHash).toBe('string');
    }
  });

  it('validateSchema returns false when schemaVersion !== 1', () => {
    expect(validateSchema({ schemaVersion: 2 } as unknown as Parameters<typeof validateSchema>[0])).toBe(false);
    expect(validateSchema({ schemaVersion: 0 } as unknown as Parameters<typeof validateSchema>[0])).toBe(false);
    expect(validateSchema({ schemaVersion: 1 } as unknown as Parameters<typeof validateSchema>[0])).toBe(true);
  });
});
