/**
 * types.ts — TypeScript type definitions for the upstream drift detection module.
 *
 * These types define the shape of upstream-snapshot.json (the authoritative baseline),
 * the GitHub commits API result union, and the drift hook's public return contract.
 *
 * ADR-0044: upstream-snapshot.json is authoritative for baseline SHAs; tracked branch is
 *           'dev' for v0 (main 404s on upstream). Promote to 'main' via JSON edit only.
 * ADR-0045: In-app detection is SHA-mismatch only; no LLM in deployed app.
 * ADR-0049: 5-state machine; sequential fetches; concurrent recheck() guard.
 */

// ---------------------------------------------------------------------------
// Snapshot JSON schema (architecture § 4)
// ---------------------------------------------------------------------------

export type KnownDivergence = {
  /** ISO-8601 date when the divergence was recorded. */
  at: string;
  /** Human-readable rationale for not porting this change. */
  reason: string;
  /** The function name that was deliberately NOT ported from upstream. */
  function: string;
  /** The upstream commit SHA at which this divergence was recorded. */
  upstreamSha: string;
};

export type WatchedFile = {
  /** Repo-relative path to the watched file (e.g. 'packages/nextjs/src/proxy/redirects-proxy.ts'). */
  path: string;
  /** Latest commit SHA on the tracked branch for this file. */
  sha: string;
  /** ISO-8601 timestamp of when this SHA was retrieved. */
  retrievedAt: string;
  /** SHA-256 of the file content at retrieval time. */
  fileHash: string;
};

export type UpstreamSnapshot = {
  /** Schema version guard. Must equal 1. */
  schemaVersion: 1;
  /** GitHub repository in owner/repo format. */
  repository: 'Sitecore/content-sdk';
  /** Tracked branch for v0. 'dev' until Sitecore publishes 'main' with the watched files. */
  branch: 'dev' | 'main';
  /**
   * Audit record of the original PRD-004 port. Set ONCE at T1; never mutated by the slash command.
   * Only watchedFiles[].sha / retrievedAt / fileHash change on slash-command accept.
   */
  originalPort: {
    branch: 'dev';
    ports: Array<{
      path: string;
      sha: string;
      portedAt: string;
    }>;
  };
  /** Current baseline SHAs from the tracked branch. Updated on slash-command accept. */
  watchedFiles: WatchedFile[];
  /** Escape hatch for deliberate non-ports. ADR-0038 + C2 contract. */
  knownDivergences: KnownDivergence[];
};

// ---------------------------------------------------------------------------
// GitHub commits API result (discriminated union — architecture § 5b)
// ---------------------------------------------------------------------------

export type GitHubCommitResult =
  | {
      ok: true;
      sha: string;
      /** ISO-8601 timestamp of when this result was fetched. */
      retrievedAt: string;
    }
  | {
      ok: false;
      reason: 'rate-limit';
      /** Seconds until the rate limit resets. Non-null ONLY for rate-limit. */
      retryAfterSeconds: number;
    }
  | {
      ok: false;
      reason: 'not-found' | 'network' | 'schema-mismatch' | 'unknown';
    };

// ---------------------------------------------------------------------------
// Drift hook state machine (ADR-0049)
// ---------------------------------------------------------------------------

/** Five-state machine per ADR-0049. */
export type DriftState = 'idle' | 'checking' | 'in-sync' | 'drifted' | 'error';

/** Discriminated error reasons surfaced in the hook. */
export type DriftError =
  | 'rate-limit'
  | 'not-found'
  | 'network'
  | 'schema-mismatch'
  | 'unknown';

/** Public return shape of useUpstreamDrift(). */
export type UseUpstreamDriftReturn = {
  state: DriftState;
  lastChecked: string | null;
  errorReason: DriftError | null;
  /** Non-null ONLY when errorReason === 'rate-limit'. */
  retryAfterSeconds: number | null;
  /** Triggers a drift check. No-op if state === 'checking'. */
  recheck: () => Promise<void>;
};
