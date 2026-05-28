/**
 * github-client.ts — Single async function wrapping the GitHub commits API.
 *
 * ADR-0046: GitHub API unauthenticated in v0 (60 req/hr/IP); on-demand only.
 *           No Authorization header; no retries; no `@octokit/rest` dependency.
 *
 * API contract (architecture § 5b):
 *   GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=<path>&sha=<branch>&per_page=1
 *   Response: PLAIN JSON ARRAY (no envelope). Read (await res.json())[0]?.sha — NOT .data[0].sha.
 *
 * Reason-mapping table (architecture § 5b):
 *   200 + non-empty array → ok: true, sha: body[0].sha
 *   200 + empty []        → ok: false, reason: 'not-found'
 *   403 + rate-limit body → ok: false, reason: 'rate-limit', retryAfterSeconds: <from header>
 *   404                   → ok: false, reason: 'not-found'
 *   fetch throw OR 5xx    → ok: false, reason: 'network'
 *   anything else         → ok: false, reason: 'unknown'
 */

import type { GitHubCommitResult } from './types';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPO = 'Sitecore/content-sdk';

/**
 * Fetches the latest commit SHA for a file on a given branch via the GitHub commits API.
 * Unauthenticated; no retries (ADR-0046).
 *
 * @param filePath - Repo-relative file path (e.g. 'packages/nextjs/src/proxy/redirects-proxy.ts')
 * @param branch   - Branch name (e.g. 'dev')
 */
export async function getLatestCommitSha(
  filePath: string,
  branch: string,
): Promise<GitHubCommitResult> {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/commits?path=${encodeURIComponent(filePath)}&sha=${branch}&per_page=1`;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    // NO Authorization header — unauthenticated per ADR-0046
  };

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    return { ok: false, reason: 'network' };
  }

  // 5xx → network error
  if (res.status >= 500) {
    return { ok: false, reason: 'network' };
  }

  // 403 → check for rate limit
  if (res.status === 403) {
    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {
      // ignore text-read errors
    }
    if (/rate limit/i.test(bodyText)) {
      const resetHeader = res.headers.get('X-RateLimit-Reset');
      const resetEpoch = resetHeader ? parseInt(resetHeader, 10) : 0;
      const retryAfterSeconds = Math.max(0, resetEpoch - Math.floor(Date.now() / 1000));
      return { ok: false, reason: 'rate-limit', retryAfterSeconds };
    }
    return { ok: false, reason: 'unknown' };
  }

  // 404 → not-found
  if (res.status === 404) {
    return { ok: false, reason: 'not-found' };
  }

  // 200 — parse JSON array
  if (res.status === 200) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return { ok: false, reason: 'unknown' };
    }

    if (!Array.isArray(body)) {
      return { ok: false, reason: 'unknown' };
    }

    // Empty array → file not found on this branch
    if (body.length === 0) {
      return { ok: false, reason: 'not-found' };
    }

    // Read sha from body[0].sha — plain array, NOT .data[0].sha
    const sha = (body[0] as Record<string, unknown>)?.sha;
    if (typeof sha !== 'string' || sha.length === 0) {
      return { ok: false, reason: 'unknown' };
    }

    return {
      ok: true,
      sha,
      retrievedAt: new Date().toISOString(),
    };
  }

  // Anything else (4xx not handled above, etc.)
  return { ok: false, reason: 'unknown' };
}
