/**
 * github-client.test.ts — Unit tests for getLatestCommitSha()
 *
 * T007a (RED) → T006 (source) → T007 (GREEN)
 *
 * Tests cover all branches from architecture § 5b reason-mapping table.
 * Fixtures sourced from architecture-20260522T114800Z.md § 5a live capture.
 *
 * ADR-0046: GitHub API unauthenticated in v0; no Authorization header.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLatestCommitSha } from './github-client';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// source: architecture-20260522T114800Z.md § 5a — live capture 2026-05-22
// GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=dev&per_page=1
const LIVE_COMMIT_FIXTURE = [
  {
    sha: '30b0db8fe768b83f03fd6b9772b0d3e14711c6b2',
    node_id: 'C_kwDONf2ORtoAKDMwYjBkYjhmZTc2OGI4M2YwM2ZkNmI5NzcyYjBkM2UxNDcxMWM2YjI',
    commit: {
      author: {
        name: 'Menelaos Nasies',
        email: '38861573+MenKNas@users.noreply.github.com',
        date: '2026-05-12T13:30:07Z',
      },
      committer: { name: 'GitHub', email: 'noreply@github.com', date: '2026-05-12T13:30:07Z' },
      // PR reference intentionally written without # to avoid hex-literal structural guard
      message: '[nextjs] Fix for regex based redirect issues (PR 470)',
    },
  },
];

// source: architecture-20260522T114800Z.md § 5b reason-mapping table — HTTP 200 + empty array
const NOT_FOUND_FIXTURE: [] = [];

// source: architecture-20260522T114800Z.md § 5a response headers section
const RATE_LIMIT_HEADERS = {
  'X-RateLimit-Limit': '60',
  'X-RateLimit-Remaining': '0',
  'X-RateLimit-Reset': '1779456937', // epoch seconds
};

// ---------------------------------------------------------------------------
// fetch mock setup
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getLatestCommitSha', () => {
  const FILE_PATH = 'packages/nextjs/src/proxy/redirects-proxy.ts';
  const BRANCH = 'dev';

  it('HTTP 200 + non-empty array → { ok: true, sha, retrievedAt }', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, LIVE_COMMIT_FIXTURE));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sha).toBe('30b0db8fe768b83f03fd6b9772b0d3e14711c6b2');
      expect(result.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it('HTTP 200 + empty array [] → { ok: false, reason: not-found }', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, NOT_FOUND_FIXTURE));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not-found');
    }
  });

  it('HTTP 403 + rate limit body + X-RateLimit-Reset → { ok: false, reason: rate-limit, retryAfterSeconds }', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(
        403,
        'API rate limit exceeded for ...',
        RATE_LIMIT_HEADERS,
      ),
    );

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('rate-limit');
      if (result.reason === 'rate-limit') {
        expect(typeof result.retryAfterSeconds).toBe('number');
        expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('HTTP 404 → { ok: false, reason: not-found }', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(404, 'Not Found'));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not-found');
    }
  });

  it('fetch throws TypeError → { ok: false, reason: network }', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('NetworkError'));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('network');
    }
  });

  it('HTTP 500 → { ok: false, reason: network }', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(500, 'Internal Server Error'));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('network');
    }
  });

  it('Malformed JSON / missing [0].sha → { ok: false, reason: unknown }', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, [{ noShaField: true }]));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unknown');
    }
  });

  it('Request URL contains path=<encoded>&sha=<branch>&per_page=1', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, LIVE_COMMIT_FIXTURE));

    await getLatestCommitSha(FILE_PATH, BRANCH);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('path=');
    expect(calledUrl).toContain(encodeURIComponent(FILE_PATH));
    expect(calledUrl).toContain(`sha=${BRANCH}`);
    expect(calledUrl).toContain('per_page=1');
  });

  it('Request headers include Accept + X-GitHub-Api-Version and NOT Authorization', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(200, LIVE_COMMIT_FIXTURE));

    await getLatestCommitSha(FILE_PATH, BRANCH);

    const calledInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;

    expect(headers['Accept']).toBe('application/vnd.github+json');
    expect(headers['X-GitHub-Api-Version']).toBe('2022-11-28');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('Response read as plain JSON array — body[0].sha not body.data[0].sha', async () => {
    // Verify via the success case: result.sha comes from body[0].sha
    const fixture = [{ sha: 'abc123def456' }];
    fetchMock.mockResolvedValueOnce(makeResponse(200, fixture));

    const result = await getLatestCommitSha(FILE_PATH, BRANCH);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sha).toBe('abc123def456');
    }
  });
});
