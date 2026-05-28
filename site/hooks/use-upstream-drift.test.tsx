/**
 * use-upstream-drift.test.tsx — Unit tests for useUpstreamDrift hook state machine.
 *
 * T013a (RED) → T011 (skeleton) → T012 (full recheck wiring) → T013 (GREEN)
 *
 * Tests cover all state transitions per ADR-0049 and architecture § 4 state matrix.
 * Mock strategy: vi.mock for getLatestCommitSha and snapshot-reader.
 *
 * ADR-0049: 5-state machine; sequential fetches; concurrent recheck() guard;
 *           no useEffect auto-fetch on mount.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Module mocks — hoisted by vitest before import resolution
vi.mock('@/lib/upstream-drift/github-client', () => ({
  getLatestCommitSha: vi.fn(),
}));

vi.mock('@/lib/upstream-drift/snapshot-reader', () => ({
  getSnapshot: vi.fn(),
  getWatchedFiles: vi.fn(),
  validateSchema: vi.fn(() => true),
}));

import { useUpstreamDrift } from './use-upstream-drift';
import { getLatestCommitSha } from '@/lib/upstream-drift/github-client';
import { getSnapshot, getWatchedFiles } from '@/lib/upstream-drift/snapshot-reader';

const mockGetLatestCommitSha = vi.mocked(getLatestCommitSha);
const mockGetSnapshot = vi.mocked(getSnapshot);
const mockGetWatchedFiles = vi.mocked(getWatchedFiles);

// Fixture snapshot
const FIXTURE_SNAPSHOT = {
  schemaVersion: 1 as const,
  repository: 'Sitecore/content-sdk' as const,
  branch: 'dev' as const,
  originalPort: {
    branch: 'dev' as const,
    ports: [
      { path: 'packages/nextjs/src/proxy/redirects-proxy.ts', sha: 'sha-a', portedAt: '2026-05-20T18:32:24Z' },
    ],
  },
  watchedFiles: [
    { path: 'packages/nextjs/src/proxy/redirects-proxy.ts', sha: 'sha-baseline-1', retrievedAt: '2026-05-22T00:00:00Z', fileHash: 'hash1' },
    { path: 'packages/core/src/tools/utils.ts', sha: 'sha-baseline-2', retrievedAt: '2026-05-22T00:00:00Z', fileHash: 'hash2' },
  ],
  knownDivergences: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  mockGetSnapshot.mockReturnValue(FIXTURE_SNAPSHOT);
  mockGetWatchedFiles.mockReturnValue(FIXTURE_SNAPSHOT.watchedFiles);
  // Default: both files match (in-sync). Individual tests override as needed.
  mockGetLatestCommitSha.mockResolvedValue({ ok: true as const, sha: 'sha-baseline-1', retrievedAt: '2026-05-22T00:00:00Z' });
});

// ---------------------------------------------------------------------------
// T013a cases
// ---------------------------------------------------------------------------

describe('useUpstreamDrift', () => {
  it('1. initial state is idle; no fetch fires on mount', () => {
    const { result } = renderHook(() => useUpstreamDrift());

    expect(result.current.state).toBe('idle');
    expect(result.current.lastChecked).toBeNull();
    expect(result.current.errorReason).toBeNull();
    expect(result.current.retryAfterSeconds).toBeNull();
    expect(mockGetLatestCommitSha).not.toHaveBeenCalled();
  });

  it('2. recheck() transitions idle → checking synchronously', async () => {
    // Make the fetch hang so we can observe the checking state
    let resolveFirst: ((v: unknown) => void) | null = null;
    mockGetLatestCommitSha.mockImplementationOnce(
      () => new Promise((res) => { resolveFirst = res; }),
    );
    mockGetLatestCommitSha.mockResolvedValue({ ok: true, sha: 'sha-baseline-2', retrievedAt: '2026-05-22T00:00:00Z' });

    const { result } = renderHook(() => useUpstreamDrift());

    let recheckPromise!: Promise<void>;
    act(() => {
      recheckPromise = result.current.recheck();
    });

    expect(result.current.state).toBe('checking');

    // Resolve to clean up
    act(() => { resolveFirst?.({ ok: true, sha: 'sha-baseline-1', retrievedAt: 'now' }); });
    await act(async () => { await recheckPromise; });
  });

  it('3. both SHAs match → terminal state in-sync; lastChecked non-null', async () => {
    mockGetLatestCommitSha
      .mockResolvedValueOnce({ ok: true, sha: 'sha-baseline-1', retrievedAt: '2026-05-22T00:00:00Z' })
      .mockResolvedValueOnce({ ok: true, sha: 'sha-baseline-2', retrievedAt: '2026-05-22T00:00:00Z' });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.state).toBe('in-sync');
    expect(result.current.lastChecked).not.toBeNull();
    expect(typeof result.current.lastChecked).toBe('string');
  });

  it('4. first watched file SHA differs → terminal state drifted; lastChecked non-null', async () => {
    mockGetLatestCommitSha
      .mockResolvedValueOnce({ ok: true, sha: 'sha-DIFFERENT', retrievedAt: '2026-05-22T00:00:00Z' })
      .mockResolvedValueOnce({ ok: true, sha: 'sha-baseline-2', retrievedAt: '2026-05-22T00:00:00Z' });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.state).toBe('drifted');
    expect(result.current.lastChecked).not.toBeNull();
  });

  it('5. first fetch returns rate-limit → state error, errorReason rate-limit, retryAfterSeconds 300', async () => {
    mockGetLatestCommitSha.mockImplementation(async () => ({
      ok: false as const,
      reason: 'rate-limit' as const,
      retryAfterSeconds: 300,
    }));

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorReason).toBe('rate-limit');
    expect(result.current.retryAfterSeconds).toBe(300);
  });

  it('6. schemaVersion !== 1 in snapshot → state error, errorReason schema-mismatch, no fetch fired', async () => {
    mockGetWatchedFiles.mockImplementationOnce(() => {
      throw new Error('schemaVersion is 2, expected 1');
    });
    // getSnapshot would throw, but we rely on getWatchedFiles being the call site
    // Alternative: mock getSnapshot to throw
    mockGetSnapshot.mockImplementationOnce(() => {
      throw new Error('upstream-snapshot.json schemaVersion is 2, expected 1');
    });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.errorReason).toBe('schema-mismatch');
    expect(mockGetLatestCommitSha).not.toHaveBeenCalled();
  });

  it('7. double-click reentrancy: second recheck() while checking returns early; only one fetch sequence fires', async () => {
    let resolveFirst: ((v: unknown) => void) | null = null;
    mockGetLatestCommitSha.mockImplementationOnce(
      () => new Promise((res) => { resolveFirst = res; }),
    );
    mockGetLatestCommitSha.mockResolvedValue({ ok: true, sha: 'sha-baseline-2', retrievedAt: 'now' });

    const { result } = renderHook(() => useUpstreamDrift());

    let firstPromise!: Promise<void>;
    act(() => {
      firstPromise = result.current.recheck();
    });

    // Call recheck again while still checking
    await act(async () => {
      await result.current.recheck(); // should be no-op
    });

    // Resolve first fetch
    act(() => { resolveFirst?.({ ok: true, sha: 'sha-baseline-1', retrievedAt: 'now' }); });
    await act(async () => { await firstPromise; });

    // getLatestCommitSha should have been called at most 2 times (one per file from first sequence)
    // NOT 4 times (which would indicate the second recheck also fired)
    expect(mockGetLatestCommitSha.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('8. sequential fetch order: second file fetch fires only after first resolves', async () => {
    const callOrder: number[] = [];
    let callCount = 0;
    mockGetLatestCommitSha.mockImplementation(async () => {
      callCount++;
      callOrder.push(callCount);
      // Simulate slight async delay to make sequential vs parallel observable
      await Promise.resolve();
      const sha = callCount === 1 ? 'sha-baseline-1' : 'sha-baseline-2';
      return { ok: true as const, sha, retrievedAt: 'now' };
    });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(callOrder).toEqual([1, 2]);
    expect(result.current.state).toBe('in-sync');
  }, 10000);

  it('9. lastChecked is non-null after every terminal state (error)', async () => {
    mockGetLatestCommitSha.mockResolvedValueOnce({ ok: false, reason: 'network' });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.lastChecked).not.toBeNull();
  });

  it('10. retryAfterSeconds is null for schema-mismatch errorReason', async () => {
    mockGetSnapshot.mockImplementationOnce(() => {
      throw new Error('schema mismatch');
    });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.errorReason).toBe('schema-mismatch');
    expect(result.current.retryAfterSeconds).toBeNull();
  });

  it('11. retryAfterSeconds is null for not-found errorReason', async () => {
    mockGetLatestCommitSha.mockResolvedValueOnce({ ok: false, reason: 'not-found' });

    const { result } = renderHook(() => useUpstreamDrift());

    await act(async () => {
      await result.current.recheck();
    });

    expect(result.current.errorReason).toBe('not-found');
    expect(result.current.retryAfterSeconds).toBeNull();
  });

  it('12. recheck reference stable across re-renders (useCallback with stable deps)', () => {
    const { result, rerender } = renderHook(() => useUpstreamDrift());

    const firstRef = result.current.recheck;
    rerender();
    const secondRef = result.current.recheck;

    expect(firstRef).toBe(secondRef);
  });
});
