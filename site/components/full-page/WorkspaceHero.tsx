"use client";

/**
 * WorkspaceHero — slimmer Full Page hero.
 *
 * PRD-003 Tranche 1/2 changes:
 *   - "Publish all" DecorativeCta replaced with real "Publish Site" Button
 *     wired to PublishSiteConfirmModal + SitecoreAI Publishing v1 (T019/T021)
 *
 * PRD-003 Tranche 3b changes:
 *   - Job-status polling via usePublishJobTracker
 *   - Cross-session resume via usePublishResume
 *   - In-flight store writes via setInFlightJob / clearInFlightJob
 *   - Button label shows "Publishing… Xs" while polling
 *   - Terminal toasts: Completed (8s auto-dismiss) / Failed (sticky) / Canceled (sticky)
 *
 * Layout:
 *   - Eyebrow chip: "Workspace · {siteName}"
 *   - Gradient headline: "{N} active maps."
 *   - Sub-line: "Last modified {relativeTime} by {updatedBy}"
 *   - CTAs: Refresh · View activity · Validate health (placeholder) · Publish Site (real)
 *
 * Discipline:
 * - No #hex literals (T040 guard)
 * - No "N languages" copy (FR-R11 / T045 guard)
 * - No status-pill--active/--draft (T042 guard)
 * - Hydration-safe: no typeof window in render body
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GradientText } from "@/components/ui/gradient-text";
import { DecorativeCta } from "@/components/ui/decorative-cta";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLetterReveal } from "@/hooks/use-letter-reveal";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import { publish } from "@/lib/publish/publish-service";
import { callPublishViaServerRoute } from "@/lib/publish/transport-server";
import { createSonnerToastAdapter } from "@/lib/publish/toast-adapter";
import { setInFlightJob, clearInFlightJob } from "@/lib/publish/in-flight-store";
import { usePublishJobTracker } from "@/lib/publish/use-publish-job-tracker";
import { usePublishResume } from "@/lib/publish/use-publish-resume";
import { PublishSiteConfirmModal } from "@/components/full-page/PublishSiteConfirmModal";
import type { RedirectMapItem } from "@/lib/domain/types";
import { RefreshCw, History } from "lucide-react";

interface WorkspaceHeroProps {
  /** Display name of the currently-selected site (null when none picked). */
  siteName: string | null;
  /** Sitecore collection name — used for publish job name + resume key. */
  collectionName?: string | null;
  /** Sitecore site name (internal) — used for publish job name + resume key. */
  siteInternalName?: string | null;
  /** Pre-resolved locale list for the site — used by Publish Site body. */
  siteLocales?: string[];
  /** Live list of maps for the selected site — drives count + Last Modified. */
  maps: RedirectMapItem[];
  /** Refresh button click — refetch the list. Disabled when no site picked. */
  onRefresh?: () => void;
  /** View Activity row click — select a recently-edited map in the rail. */
  onSelectMap?: (map: RedirectMapItem) => void;
}

function relativeTime(compact: string): string {
  const date = parseSitecoreCompactDate(compact);
  if (!date) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} w ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Format elapsed milliseconds as "Xs" or "Xm Xs". */
function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function WorkspaceHero({
  siteName,
  collectionName,
  siteInternalName,
  siteLocales = [],
  maps,
  onRefresh,
  onSelectMap,
}: WorkspaceHeroProps) {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  useLetterReveal(headlineRef, { enabled: true });

  const activeMapsCount = maps.length;
  const lastModified = useMemo(() => {
    if (maps.length === 0) return null;
    let latest: RedirectMapItem | null = null;
    let latestMs = -Infinity;
    for (const m of maps) {
      const t = parseSitecoreCompactDate(m.updatedAt)?.getTime() ?? -Infinity;
      if (t > latestMs) {
        latestMs = t;
        latest = m;
      }
    }
    if (!latest) return null;
    return {
      ago: relativeTime(latest.updatedAt),
      by: latest.updatedBy?.trim() || null,
    };
  }, [maps]);

  // Recent activity — top N maps by updatedAt desc for the View activity popover.
  const recentActivity = useMemo(() => {
    return [...maps]
      .filter((m) => m.id && m.updatedAt)
      .sort((a, b) => {
        const da = parseSitecoreCompactDate(a.updatedAt)?.getTime() ?? 0;
        const db = parseSitecoreCompactDate(b.updatedAt)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 8);
  }, [maps]);

  // Tranche 3b — site context key for localStorage + list-scan resume
  const siteContextKey =
    collectionName && siteInternalName
      ? `${collectionName}:${siteInternalName}`
      : null;

  // T021 — Publish Site flow state (confirm dialog)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Idempotency guard (code-review fix): true while handleConfirmPublish is in flight
  // (awaiting the POST /api/publish response). Prevents double-submit in the race window
  // between dialog-close and the first tracker polling tick that sets isPolling=true.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tranche 3b — polling job id (set after 201 response or resume)
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  // Tranche 3b — tracker (polls /api/publish/jobs/{id} every 3s)
  const trackerState = usePublishJobTracker(pollingJobId);

  // Tranche 3b — resume on mount / site change
  const resumeResult = usePublishResume(siteContextKey);
  const resumeShownRef = useRef<string | null>(null);

  // Show one-time resume toast when a prior in-flight job is found
  useEffect(() => {
    if (!resumeResult.jobId) return;
    if (resumeShownRef.current === resumeResult.jobId) return;
    resumeShownRef.current = resumeResult.jobId;

    const timeAgo = resumeResult.kickedOffAt
      ? relativeTime(resumeResult.kickedOffAt)
      : "recently";
    toast.loading(
      `Found in-progress site publish from ${timeAgo} — tracking…`,
      { id: `resume-${resumeResult.jobId}`, duration: 8000 },
    );

    setPollingJobId(resumeResult.jobId);
  }, [resumeResult.jobId, resumeResult.kickedOffAt]);

  // Handle tracker terminal state — success / fail / canceled toasts.
  // Uses a STABLE id `publish-job-<jobId>` so the terminal toast REPLACES any
  // prior queued / polling toast (Sonner replaces by id). Also explicitly
  // dismisses the resume toast in case terminal lands within its 8s lifetime.
  const handledTerminalRef = useRef<string | null>(null);
  useEffect(() => {
    if (trackerState.kind !== "terminal") return;
    if (handledTerminalRef.current === trackerState.jobId) return;
    handledTerminalRef.current = trackerState.jobId;

    // Clear from localStorage
    if (siteContextKey) {
      clearInFlightJob(siteContextKey);
    }

    const stableId = `publish-job-${trackerState.jobId}`;
    // Dismiss any still-visible resume toast for this job
    toast.dismiss(`resume-${trackerState.jobId}`);

    if (trackerState.status === "Completed") {
      const processed = trackerState.statistics?.itemsProcessed ?? 0;
      const failed = trackerState.statistics?.itemsFailed ?? 0;
      toast.success(
        `Site publish complete — ${processed} items processed, ${failed} failed`,
        { id: stableId, duration: 8000 },
      );
    } else if (trackerState.status === "Failed") {
      const detail =
        trackerState.statistics?.itemsFailed !== undefined
          ? `${trackerState.statistics.itemsFailed} items failed`
          : "Check publishing service logs for details";
      toast.error("Site publish failed", {
        id: stableId,
        description: detail,
        duration: Infinity,
      });
    } else if (trackerState.status === "Canceled") {
      toast.warning("Site publish canceled", {
        id: stableId,
        duration: Infinity,
      });
    }

    // Stop polling
    setPollingJobId(null);
  }, [trackerState, siteContextKey]);

  // Is a publish in flight (either submitting or polling)?
  const isPolling = trackerState.kind === "polling";
  const isPublishing = isPolling;

  // Elapsed display for polling button label
  const elapsedMs = trackerState.kind === "polling" ? trackerState.elapsedMs : 0;

  async function handleConfirmPublish() {
    if (!siteName || !collectionName || !siteInternalName) return;
    setPublishDialogOpen(false);
    setIsSubmitting(true);

    try {
      const outcome = await publish(
        {
          collectionName,
          siteName: siteInternalName,
          siteDisplayName: siteName,
          locales: siteLocales.length > 0 ? siteLocales : ["en"],
        },
        { callPublish: callPublishViaServerRoute, toasts: createSonnerToastAdapter() },
      );

      if (outcome.kind === "queued" && siteContextKey) {
        const now = new Date().toISOString();
        setInFlightJob({
          jobId: outcome.jobId,
          kickedOffAt: now,
          siteContextKey,
        });
        setPollingJobId(outcome.jobId);

        // Reposition the toast onto the stable `publish-job-<jobId>` id so the
        // terminal handler can REPLACE it instead of stacking. The publish-service's
        // queued() toast auto-dismisses on Sonner default (~4s) — we replace it with
        // a sticky loading toast under the stable id so operators have continuous
        // visual feedback through the polling phase.
        toast.loading(
          `Publishing site — job ${outcome.jobId.slice(0, 8)}`,
          { id: `publish-job-${outcome.jobId}`, duration: Infinity },
        );
      }
    } finally {
      // Always clear submitting state so the button re-enables.
      // If a polling job was started, isPolling will immediately take over
      // as the disabled guard; if it failed/errored, we release the lock.
      setIsSubmitting(false);
    }
  }

  // Reset polling + resume ref when site context changes
  const prevSiteContextKeyRef = useRef(siteContextKey);
  useEffect(() => {
    if (prevSiteContextKeyRef.current !== siteContextKey) {
      prevSiteContextKeyRef.current = siteContextKey;
      setPollingJobId(null);
      resumeShownRef.current = null;
      handledTerminalRef.current = null;
    }
  }, [siteContextKey]);

  // Redirect rules are stored on a SHARED Sitecore field — they apply to every
  // language version of the site. No per-language scoping in the eyebrow.
  const eyebrowSiteLabel = siteName ?? "pick a site";
  const headlineText =
    activeMapsCount === 0
      ? siteName
        ? "No redirect maps yet."
        : "Pick a site to begin."
      : `${activeMapsCount} active map${activeMapsCount === 1 ? "" : "s"}.`;

  const publishButtonLabel = isPolling
    ? `Publishing… ${formatElapsed(elapsedMs)}`
    : "Publish Site";

  // Button disabled when no site context, while submitting (awaiting POST response),
  // or while polling (awaiting terminal job status). isSubmitting covers the race
  // window between dialog-close and the first polling tick (code-review fix).
  const publishButtonDisabled =
    !siteName || !collectionName || !siteInternalName || isSubmitting || isPublishing;

  return (
    <section className="fp-hero" aria-label="Workspace hero">
      <div className="fp-hero__body">
        <span className="elev-eyebrow" aria-hidden="true">
          <span className="dot" aria-hidden="true" />
          Workspace &middot; {eyebrowSiteLabel}
        </span>

        <GradientText
          as="h2"
          className="fp-hero__headline elev-hero-text"
        >
          <span ref={headlineRef} data-letter-reveal="true">{headlineText}</span>
        </GradientText>

        {lastModified && (
          <p className="fp-hero__sub">
            Last modified {lastModified.ago}
            {lastModified.by ? ` by ${lastModified.by}` : ""}.
          </p>
        )}
      </div>

      {/* CTA cluster — Refresh (real) · View activity (real popover) ·
          Validate health (placeholder) · Publish Site (real + polling) */}
      <div className="fp-hero__cta">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefresh?.()}
          disabled={!onRefresh || maps.length === 0}
          className="elev-btn"
          aria-label="Refresh redirect maps"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Refresh
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={recentActivity.length === 0}
              className="elev-btn"
              aria-label="View activity"
            >
              <History className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              View activity
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] p-0">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium">Recent activity</p>
              <p className="text-xs text-muted-foreground">
                Most-recently-modified maps for this site
              </p>
            </div>
            <ul className="max-h-[280px] overflow-auto" role="list">
              {recentActivity.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMap?.(m)}
                    disabled={!onSelectMap}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed"
                  >
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground font-mono truncate">
                        {relativeTime(m.updatedAt)}
                        {m.updatedBy?.trim() ? ` · ${m.updatedBy.trim()}` : ""}
                      </span>
                    </span>
                    <Badge colorScheme="neutral" size="sm" className="shrink-0">
                      {redirectTypeDisplayName(m.redirectType)}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <DecorativeCta
          label="Validate health"
          toastCopy="Health validation (probe every source/target for resolve correctness) lands in a follow-on release. Status is a deferred-verification placeholder for now."
          variant="outline"
          className="elev-btn"
        />

        {/* T021 + Tranche 3b — Publish Site: opens confirm dialog; button label shows
            "Publishing… Xs" while polling (disabled until terminal). */}
        <Button
          variant="default"
          size="sm"
          onClick={() => setPublishDialogOpen(true)}
          disabled={publishButtonDisabled}
          className="elev-btn"
          aria-label={publishButtonLabel}
        >
          {publishButtonLabel}
        </Button>
      </div>

      {/* T019 — Confirmation dialog (only for site-wide publish — AC-P1.2/P1.3) */}
      <PublishSiteConfirmModal
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        siteDisplayName={siteName ?? ""}
        localeCount={siteLocales.length}
        isPublishing={isPublishing}
        onConfirm={handleConfirmPublish}
      />
    </section>
  );
}
