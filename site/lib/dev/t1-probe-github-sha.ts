/**
 * lib/dev/t1-probe-github-sha.ts — PRD-004 Tranche 1 diagnostic
 *
 * Fetches the latest commit SHA for two upstream files in the public
 * Sitecore/content-sdk repo (dev branch) via the GitHub Commits API.
 * No auth required for public repos — rate-limited to ~60 req/hr for
 * unauthenticated callers, which is fine for one-shot diagnostic use.
 *
 * NOT production code — dead unless NEXT_PUBLIC_T1_PROBE=true.
 */

export interface ShaCapture {
  /** Full 40-char commit SHA */
  sha: string;
  /** Raw file URL with SHA pinned — paste into _upstream-source.ts header */
  permalinkRaw: string;
  /** GitHub blob URL with SHA pinned — paste into captures file */
  permalinkBlob: string;
  /** ISO-8601 UTC timestamp of when this fetch ran */
  retrievedAt: string;
}

export interface UpstreamShas {
  proxyFile: ShaCapture;
  utilsFile: ShaCapture;
}

const REPO = 'Sitecore/content-sdk';
const BRANCH = 'dev';

const PROXY_PATH = 'packages/nextjs/src/proxy/redirects-proxy.ts';
const UTILS_PATH = 'packages/core/src/tools/utils.ts';

function buildCommitsApiUrl(filePath: string): string {
  return `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(filePath)}&sha=${BRANCH}&per_page=1`;
}

function buildRawUrl(sha: string, filePath: string): string {
  return `https://raw.githubusercontent.com/${REPO}/${sha}/${filePath}`;
}

function buildBlobUrl(sha: string, filePath: string): string {
  return `https://github.com/${REPO}/blob/${sha}/${filePath}`;
}

async function fetchShaForFile(filePath: string, retrievedAt: string): Promise<ShaCapture> {
  const url = buildCommitsApiUrl(filePath);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'redirect-manager-t1-probe/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API returned ${response.status} for path "${filePath}". ` +
        `URL: ${url}. ` +
        `If you are rate-limited (403), wait ~60 seconds and retry.`,
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny: GitHub API response is untyped
  const commits = (await response.json()) as Array<{ sha?: string }>;

  if (!Array.isArray(commits) || commits.length === 0 || !commits[0].sha) {
    throw new Error(
      `GitHub API returned an empty commits array for path "${filePath}". ` +
        `The file may not exist on the "${BRANCH}" branch, or the branch name has changed.`,
    );
  }

  const sha = commits[0].sha;
  return {
    sha,
    permalinkRaw: buildRawUrl(sha, filePath),
    permalinkBlob: buildBlobUrl(sha, filePath),
    retrievedAt,
  };
}

/**
 * Fetches the latest commit SHAs for redirects-proxy.ts + utils.ts in parallel.
 *
 * Throws on network error or GitHub API error — the caller (T1ProbeButton) wraps
 * this in a try/catch and surfaces the error message to the operator.
 */
export async function fetchUpstreamShas(): Promise<UpstreamShas> {
  const retrievedAt = new Date().toISOString();

  const [proxyFile, utilsFile] = await Promise.all([
    fetchShaForFile(PROXY_PATH, retrievedAt),
    fetchShaForFile(UTILS_PATH, retrievedAt),
  ]);

  return { proxyFile, utilsFile };
}
