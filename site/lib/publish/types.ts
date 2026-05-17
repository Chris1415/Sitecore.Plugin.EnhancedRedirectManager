/**
 * T006 — Publish service shared types.
 *
 * Tranche 3a: PublishScope is no longer a discriminated union — item publish removed.
 * Tranche 3b: site scope adds collectionName + siteName for job name format + list-scan key.
 *
 * ADR-0033 § 1 defines the original scope shape; superseded by ADR-0032 removal.
 * PRD-003 AC-P1.4 defines the API request body shape.
 */

/**
 * Publish scope for a site-wide publish job.
 * Tranche 3a: item publish variant removed — site publish is the only supported path.
 */
export interface PublishScope {
  /** Sitecore collection name (used in job name + list-scan key). */
  collectionName: string;
  /** Sitecore site name (used in job name + list-scan key). */
  siteName: string;
  /** Human-readable site display name, shown in the confirmation dialog. */
  siteDisplayName: string;
  /** Pre-resolved locale list. */
  locales: string[];
}

/**
 * JSON body shape for POST /authoring/publishing/v1/jobs.
 * PRD-003 AC-P1.4 (site only — item publish removed in Tranche 3a).
 * ADR-0033 § 2.
 */
export interface PublishApiRequest {
  name: string;
  source: string;
  description?: string;
  options: {
    xmc: {
      site?: {
        mode: "Republish" | "Smart" | "Incremental";
      };
      locales?: string[];
    };
  };
}

/**
 * Consumed slice of the 201 success response from SitecoreAI Publishing v1.
 * ADR-0033 § 3.
 */
export interface PublishApiResponse {
  id: string;
  system: {
    status: "Queued" | "Running" | "Completed" | "Failed" | "Canceled" | "Canceling";
  };
}

/**
 * Detailed job response from GET /authoring/publishing/v1/jobs/{id}.
 * Tranche 3b: polling + resume use this shape.
 */
export interface PublishJobDetail {
  id: string;
  name?: string;
  source?: string;
  system: {
    status: PublishJobStatus;
    queuedTime?: string;
    startTime?: string;
    endTime?: string;
  };
  statistics?: PublishStatistics;
}

/**
 * Job status values from SitecoreAI Publishing v1.
 * Tranche 3b.
 */
export type PublishJobStatus =
  | "Queued"
  | "Running"
  | "Canceling"
  | "Completed"
  | "Failed"
  | "Canceled";

/**
 * Processing statistics returned in the job detail response.
 * Tranche 3b.
 */
export interface PublishStatistics {
  itemsProcessed?: number;
  itemsFailed?: number;
  itemsSkipped?: number;
}

/**
 * RFC 7807 ProblemDetails — returned by SitecoreAI Publishing on 4xx/5xx.
 * ADR-0033 § 3.
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

/**
 * Outcome returned by publish() and outcomeFrom().
 * ADR-0033 § 4.
 */
export type PublishOutcome =
  | {
      kind: "queued";
      /** Full job ID from the API response. */
      jobId: string;
      /** First 8 characters of jobId for display in toasts. */
      jobIdShort: string;
    }
  | {
      kind: "failed";
      /** HTTP status code (or 0 for network-level failure). */
      status: number;
      /** Human-readable error detail — from `body.detail ?? body.title ?? "HTTP <status>"`. */
      detail: string;
    };

/**
 * Transport function contract. Returns `{ status, body }` for all code paths.
 * Does NOT throw on non-2xx — the caller (publish()) inspects status.
 * ADR-0033 § 6.
 */
export type CallPublish = (
  body: PublishApiRequest,
) => Promise<{ status: number; body: PublishApiResponse | ProblemDetails }>;

/**
 * Toast adapter interface — wraps the Sonner surface for testability.
 * ADR-0033 § 5.
 */
export interface ToastAdapter {
  /** Show a loading toast. Returns the toast id for later dismiss-and-replace. */
  requested(message: string): string | number;
  /** Replace the loading toast with a success toast. */
  queued(message: string, opts?: { dismissId?: string | number }): void;
  /** Replace the loading toast with an error toast. */
  failed(message: string, opts?: { dismissId?: string | number }): void;
}
