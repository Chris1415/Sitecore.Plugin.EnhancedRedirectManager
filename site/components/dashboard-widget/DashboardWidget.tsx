/**
 * DashboardWidget — T031–T034
 *
 * Dashboard Widget extension point UI.
 *
 * Stats (T032):
 * - Total Redirect Maps = count of items from listRedirectMaps
 * - Total Mappings = sum of .mappings.length across all items
 * - Last updated = max parseSitecoreCompactDate(item.updatedAt) formatted as locale date/time
 *
 * States: default, loading (3 skeleton tiles), empty (no maps), error (destructive alert + retry).
 *
 * Site resolution (T032 / OQ-7):
 * Dashboard Widget runs in the per-site dashboard context. The SDK exposes the site via
 * application.context resourceAccess, but the full site path requires knowing the collection.
 * For now: read siteInfo from application.context if available, else fall back to
 * the first site in the tenant (with a TODO comment for OQ-7 closure at smoke).
 * The sitePath is built as /sitecore/content/solo/<siteName>/Settings/Redirects for now.
 *
 * Footnote (verbatim per PRD US-4 AC):
 * "Redirect counts only — usage analytics ship in a follow-on release."
 *
 * Accessibility (T034): section aria-label, per-tile article aria-label, aria-live regions.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatTile } from "@/components/dashboard-widget/StatTile";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import type { ClientSDK } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";

interface DashboardWidgetProps {
  client: ClientSDK;
  sitecoreContextId: string;
  /** Site name for display. Resolved by the page from application.context. */
  siteName: string;
  /** Full Sitecore path to Settings/Redirects for the current site */
  sitePath: string;
}

type WidgetStatus = "loading" | "default" | "empty" | "error";

/** Format a Date as locale short date/time using Intl.DateTimeFormat (no third-party library). */
function formatLastUpdated(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    // Relative for recent (<24h)
    const diffH = Math.floor(diffHours);
    const diffM = Math.floor((diffMs / (1000 * 60)) % 60);
    if (diffH === 0) {
      return diffM <= 1 ? "just now" : `${diffM} minutes ago`;
    }
    return diffH === 1 ? "1 hour ago" : `${diffH} hours ago`;
  }

  // Absolute for older
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Aggregate stats from redirect maps */
export function aggregateStats(maps: RedirectMapItem[]): {
  totalMaps: number;
  totalMappings: number;
  lastUpdated: string;
} {
  const totalMaps = maps.length;
  const totalMappings = maps.reduce((sum, m) => sum + m.mappings.length, 0);

  let latestDate: Date | null = null;
  for (const map of maps) {
    if (!map.updatedAt) continue;
    const d = parseSitecoreCompactDate(map.updatedAt);
    if (d && (!latestDate || d > latestDate)) {
      latestDate = d;
    }
  }

  const lastUpdated = latestDate ? formatLastUpdated(latestDate) : "—";
  return { totalMaps, totalMappings, lastUpdated };
}

export function DashboardWidget({
  client,
  sitecoreContextId,
  siteName,
  sitePath,
}: DashboardWidgetProps) {
  const [status, setStatus] = useState<WidgetStatus>("loading");
  const [stats, setStats] = useState<{ totalMaps: number; totalMappings: number; lastUpdated: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorExpanded, setErrorExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const maps = await listRedirectMaps(client, sitecoreContextId, sitePath);
      if (maps.length === 0) {
        setStatus("empty");
        setStats(null);
      } else {
        setStats(aggregateStats(maps));
        setStatus("default");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [client, sitecoreContextId, sitePath]);

  useEffect(() => {
    // IIFE pattern: state is set in a callback, not synchronously in effect body.
    // Matches the ContextPanel pattern to satisfy react-hooks/set-state-in-effect.
    (async () => {
      await fetchData();
    })();
  }, [fetchData]);

  return (
    <section
      aria-label={`Redirects summary for ${siteName}`}
      className="flex flex-col gap-2 rounded-md border bg-card p-3 shadow-sm"
    >
      {/* Loading announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status === "loading" ? "Loading redirect counts." : ""}
        {status === "empty" ? "No redirects configured." : ""}
      </div>

      {/* Header */}
      <header className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Redirects</h2>
        {siteName && (
          <span className="text-xs text-muted-foreground">{siteName}</span>
        )}
      </header>

      {/* Tile row */}
      {status === "loading" && <LoadingTiles />}

      {status === "error" && (
        <>
          <ErrorDisplay
            error={error ?? "Unknown error"}
            expanded={errorExpanded}
            onToggleExpanded={() => setErrorExpanded((v) => !v)}
            onRetry={fetchData}
          />
          <Footnote />
        </>
      )}

      {status === "empty" && (
        <>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              No redirects configured for this site.
            </p>
          </div>
          <Footnote />
        </>
      )}

      {status === "default" && stats && (
        <>
          <div className="flex items-stretch">
            <StatTile
              label="Redirect maps"
              value={stats.totalMaps}
              ariaLabel={`${stats.totalMaps} redirect maps`}
            />
            <Separator orientation="vertical" className="self-stretch" />
            <StatTile
              label="Total mappings"
              value={stats.totalMappings}
              ariaLabel={`${stats.totalMappings} total mappings`}
            />
            <Separator orientation="vertical" className="self-stretch" />
            <StatTile
              label="Last updated"
              value={stats.lastUpdated}
              ariaLabel={`Last updated ${stats.lastUpdated}`}
            />
          </div>
          <Footnote />
        </>
      )}
    </section>
  );
}

function LoadingTiles() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5 py-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

function ErrorDisplay({
  error,
  expanded,
  onToggleExpanded,
  onRetry,
}: {
  error: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <span className="text-destructive" aria-hidden="true">{"\u2715"}</span>
        <div className="flex-1 space-y-1.5">
          <p className="font-medium">Couldn&apos;t load redirect counts.</p>
          <Collapsible open={expanded} onOpenChange={onToggleExpanded}>
            <CollapsibleTrigger asChild>
              <button className="text-xs text-muted-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {expanded ? "Hide technical details" : "Show technical details"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                {error}
              </pre>
            </CollapsibleContent>
          </Collapsible>
          <Button size="sm" variant="outline" onClick={onRetry} autoFocus>
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

function Footnote() {
  return (
    <p className="text-xs text-muted-foreground">
      Redirect counts only — usage analytics ship in a follow-on release.
    </p>
  );
}
