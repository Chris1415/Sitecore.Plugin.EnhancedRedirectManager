/**
 * sync-helpers.test.ts — Unit tests for slash-command logic helpers.
 *
 * T035a (RED) → T034 (source) → T035 (GREEN)
 *
 * Tests cover compareSnapshot() and honorDivergences() pure functions.
 * These functions are unit-testable extractions of the slash command's logic core.
 */

import { describe, it, expect } from 'vitest';
import { compareSnapshot, honorDivergences } from './sync-helpers';
import type { UpstreamSnapshot, WatchedFile, KnownDivergence } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WATCHED_FILE_1: WatchedFile = {
  path: 'packages/nextjs/src/proxy/redirects-proxy.ts',
  sha: 'sha-baseline-1',
  retrievedAt: '2026-05-22T00:00:00Z',
  fileHash: 'hash1',
};

const WATCHED_FILE_2: WatchedFile = {
  path: 'packages/core/src/tools/utils.ts',
  sha: 'sha-baseline-2',
  retrievedAt: '2026-05-22T00:00:00Z',
  fileHash: 'hash2',
};

const FIXTURE_SNAPSHOT: Pick<UpstreamSnapshot, 'watchedFiles' | 'knownDivergences'> = {
  watchedFiles: [WATCHED_FILE_1, WATCHED_FILE_2],
  knownDivergences: [],
};

// Simulated hunk type for honorDivergences tests
type ParsedHunk = { targetFunction: string; content: string };

// ---------------------------------------------------------------------------
// compareSnapshot
// ---------------------------------------------------------------------------

describe('compareSnapshot', () => {
  it('1. returns { inSync: true } when all watchedFiles[].sha match latest', () => {
    const latest = [
      { path: WATCHED_FILE_1.path, sha: WATCHED_FILE_1.sha },
      { path: WATCHED_FILE_2.path, sha: WATCHED_FILE_2.sha },
    ];

    const result = compareSnapshot(
      { watchedFiles: FIXTURE_SNAPSHOT.watchedFiles },
      latest,
    );

    expect(result.inSync).toBe(true);
    expect(result.drifted).toHaveLength(0);
  });

  it('2. returns { inSync: false, drifted: [file1] } when one SHA differs', () => {
    const latest = [
      { path: WATCHED_FILE_1.path, sha: 'sha-DIFFERENT' },
      { path: WATCHED_FILE_2.path, sha: WATCHED_FILE_2.sha },
    ];

    const result = compareSnapshot(
      { watchedFiles: FIXTURE_SNAPSHOT.watchedFiles },
      latest,
    );

    expect(result.inSync).toBe(false);
    expect(result.drifted).toHaveLength(1);
    expect(result.drifted[0].path).toBe(WATCHED_FILE_1.path);
  });
});

// ---------------------------------------------------------------------------
// honorDivergences
// ---------------------------------------------------------------------------

describe('honorDivergences', () => {
  it('3. removes hunks targeting a function listed in knownDivergences', () => {
    const diff: ParsedHunk[] = [
      { targetFunction: 'isRegexOrUrl', content: 'some diff' },
      { targetFunction: 'matchesRedirect', content: 'another diff' },
    ];
    const divergences: KnownDivergence[] = [
      {
        at: '2026-05-20T18:32:24Z',
        reason: 'Deliberately not porting — Content SDK feature not used',
        function: 'isRegexOrUrl',
        upstreamSha: 'sha-baseline-1',
      },
    ];

    const result = honorDivergences(diff, divergences);

    expect(result).toHaveLength(1);
    expect(result[0].targetFunction).toBe('matchesRedirect');
  });

  it('4. returns hunks unchanged when knownDivergences is empty', () => {
    const diff: ParsedHunk[] = [
      { targetFunction: 'isRegexOrUrl', content: 'some diff' },
      { targetFunction: 'matchesRedirect', content: 'another diff' },
    ];

    const result = honorDivergences(diff, []);

    expect(result).toHaveLength(2);
    expect(result).toEqual(diff);
  });

  it('5. leaves unaffected hunks intact when only some functions are in knownDivergences', () => {
    const diff: ParsedHunk[] = [
      { targetFunction: 'isRegexOrUrl', content: 'diff 1' },
      { targetFunction: 'matchesRedirect', content: 'diff 2' },
      { targetFunction: 'processRedirect', content: 'diff 3' },
    ];
    const divergences: KnownDivergence[] = [
      {
        at: '2026-05-20T18:32:24Z',
        reason: 'Deliberately skipped',
        function: 'isRegexOrUrl',
        upstreamSha: 'sha-baseline-1',
      },
    ];

    const result = honorDivergences(diff, divergences);

    expect(result).toHaveLength(2);
    expect(result.map((h) => h.targetFunction)).toEqual(['matchesRedirect', 'processRedirect']);
  });
});
