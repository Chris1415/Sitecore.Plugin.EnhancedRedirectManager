/**
 * DashboardWidget — per-site stats with picker fallback.
 *
 * Cloud Portal embeds the widget on a site dashboard page, but the iframe
 * URL and the @sitecore-marketplace-sdk ApplicationContext do NOT expose
 * "current site" today (verified against shared-types.d.ts — no site field
 * on ApplicationContext, ApplicationResourceContext, or extensionPointContext).
 *
 * Workaround: the widget shows per-site stats with a small site picker.
 *   - If only one site exists in the tenant → auto-selected.
 *   - If the operator has picked before → restore from localStorage.
 *   - Otherwise → small dropdown in the header so they can switch any time.
 *
 * Stats (for the selected site):
 *   - Maps        = count of Redirect Map items
 *   - Mappings    = sum of .mappings.length across maps
 *   - Last updated = max __Updated across maps, formatted relative/absolute
 *
 * States: loading / default / empty / error / no-site-picked.
 *
 * Footnote (verbatim per PRD US-4 AC):
 *   "Redirect counts only — usage analytics ship in a follow-on release."
 *
 * Accessibility (T034): section aria-label, per-tile article aria-label,
 * aria-live regions for state announcements.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatTile } from "@/components/dashboard-widget/StatTile";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { listSites, listCollections } from "@/lib/sdk/sites";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import { ArrowLeftRight, Clock, Map as MapIcon } from "lucide-react";
import type { ClientSDK } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";

interface DashboardWidgetProps {
  client: ClientSDK;
  sitecoreContextId: string;
}

type WidgetStatus =
  | "discovering" // initial site discovery in flight
  | "no-site-picked" // sites loaded, operator hasn't picked yet
  | "loading" // a site is picked and its data is being fetched
  | "default"
  | "empty"
  | "error";

/** A site option carrying both the SDK ids and the resolved sitePath. */
interface SiteOption {
  id: string;
  name: string;
  collectionName: string;
  sitePath: string;
}

const STORAGE_KEY = "redirect-manager:dashboard-widget:selected-site-id";

function readStoredSiteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredSiteId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  } catch {
    // ignore quota / privacy errors
  }
}

/**
 * Best-effort attempt to detect "which site dashboard am I rendered on?"
 *
 * Cloud Portal does not pass site context through the iframe URL or the
 * Marketplace SDK ApplicationContext (verified against shared-types.d.ts).
 * However the parent Cloud Portal page URL almost certainly contains the
 * site slug — e.g. `.../channels/solo-website/overview`. The widget can
 * read this via document.referrer (set on iframe load).
 *
 * Strategy: scan the referrer's path AND the iframe's own URL search/hash
 * for any path segment / param value that matches one of the known site
 * names. If exactly one site name matches, return it. Ambiguous matches
 * (multiple sites match different segments) return null so the picker can
 * step in. Empty referrer (no-referrer policy) also returns null.
 */
function detectSiteFromHostContext(
  siteOptions: { id: string; name: string }[],
): string | null {
  if (typeof window === "undefined" || siteOptions.length === 0) return null;

  // Build the search corpus: referrer URL + own URL search/hash.
  const corpus: string[] = [];
  try {
    if (document.referrer) corpus.push(document.referrer);
  } catch {
    /* ignore */
  }
  try {
    corpus.push(window.location.search ?? "");
    corpus.push(window.location.hash ?? "");
  } catch {
    /* ignore */
  }
  const haystack = corpus.join(" ").toLowerCase();
  if (haystack.length === 0) return null;

  // Find every site whose name appears in the haystack. Use word boundaries
  // so we don't match a longer site name as a substring of another.
  const matches: string[] = [];
  for (const opt of siteOptions) {
    const needle = opt.name.toLowerCase();
    // Surround needle with non-alphanumeric characters or boundaries.
    const re = new RegExp(`(?:^|[^a-z0-9-])${escapeRegex(needle)}(?:[^a-z0-9-]|$)`);
    if (re.test(haystack)) matches.push(opt.id);
  }
  return matches.length === 1 ? matches[0] : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Format a Date as relative (<24h) or absolute short date. */
function formatLastUpdated(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const diffH = Math.floor(diffHours);
    const diffM = Math.floor((diffMs / (1000 * 60)) % 60);
    if (diffH === 0) {
      return diffM <= 1 ? "just now" : `${diffM} minutes ago`;
    }
    return diffH === 1 ? "1 hour ago" : `${diffH} hours ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Aggregate stats from a set of maps. */
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
}: DashboardWidgetProps) {
  const [status, setStatus] = useState<WidgetStatus>("discovering");
  const [error, setError] = useState<string | null>(null);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [siteOptions, setSiteOptions] = useState<SiteOption[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalMaps: number;
    totalMappings: number;
    lastUpdated: string;
  } | null>(null);

  // Step 1: discover sites + collections, derive site options, auto-select if 1 site
  // or if localStorage has a stored choice that still matches.
  const discoverSites = useCallback(async () => {
    setStatus("discovering");
    setError(null);
    try {
      const [sites, collections] = await Promise.all([
        listSites(client, sitecoreContextId),
        listCollections(client, sitecoreContextId),
      ]);
      const collectionNameById = new Map<string, string>();
      for (const c of collections) {
        if (c.id && c.name) collectionNameById.set(c.id, c.name);
      }
      const options: SiteOption[] = [];
      for (const site of sites) {
        const collectionName = site.collectionId
          ? collectionNameById.get(site.collectionId)
          : undefined;
        if (!site.id || !site.name || !collectionName) continue;
        options.push({
          id: site.id,
          name: site.name,
          collectionName,
          sitePath: `/sitecore/content/${collectionName}/${site.name}/Settings/Redirects`,
        });
      }
      // Stable display order
      options.sort((a, b) => a.name.localeCompare(b.name));
      setSiteOptions(options);

      // Selection priority:
      //   1. localStorage (operator's last explicit choice)
      //   2. host-frame auto-detect (parent Cloud Portal URL contains the slug)
      //   3. only one site exists → auto-pick
      //   4. otherwise → prompt operator to pick
      const stored = readStoredSiteId();
      const storedExists =
        stored && options.some((o) => o.id === stored) ? stored : null;

      const autoDetected = !storedExists
        ? detectSiteFromHostContext(options)
        : null;

      if (storedExists) {
        setSelectedSiteId(storedExists);
      } else if (autoDetected) {
        setSelectedSiteId(autoDetected);
      } else if (options.length === 1) {
        setSelectedSiteId(options[0].id);
      } else if (options.length === 0) {
        setStatus("empty");
      } else {
        setStatus("no-site-picked");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [client, sitecoreContextId]);

  useEffect(() => {
    (async () => {
      await discoverSites();
    })();
  }, [discoverSites]);

  // Step 2: when a site is selected, fetch its maps.
  const selectedSite = useMemo(
    () => siteOptions.find((o) => o.id === selectedSiteId) ?? null,
    [siteOptions, selectedSiteId],
  );

  const fetchForSite = useCallback(async () => {
    if (!selectedSite) return;
    setStatus("loading");
    setError(null);
    try {
      const maps = await listRedirectMaps(client, sitecoreContextId, selectedSite.sitePath);
      if (maps.length === 0) {
        setStats(null);
        setStatus("empty");
      } else {
        setStats(aggregateStats(maps));
        setStatus("default");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [client, sitecoreContextId, selectedSite]);

  useEffect(() => {
    if (!selectedSite) return;
    (async () => {
      await fetchForSite();
    })();
  }, [selectedSite, fetchForSite]);

  function handleSiteChange(nextId: string) {
    writeStoredSiteId(nextId);
    setSelectedSiteId(nextId);
  }

  const showPicker = siteOptions.length > 1;

  return (
    <section
      aria-label={
        selectedSite
          ? `Redirects summary for ${selectedSite.name}`
          : "Redirects summary"
      }
      className="flex flex-col gap-3 rounded-md border bg-card p-3 shadow-sm"
    >
      {/* Loading announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status === "loading" || status === "discovering"
          ? "Loading redirect counts."
          : ""}
        {status === "empty" ? "No redirects configured." : ""}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-base font-semibold shrink-0">Redirects</h2>
          {selectedSite && !showPicker && (
            <Badge colorScheme="neutral" size="sm" className="font-normal truncate">
              {selectedSite.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPicker && (
            <Select
              value={selectedSiteId ?? ""}
              onValueChange={handleSiteChange}
            >
              <SelectTrigger
                className="h-7 text-xs w-[160px]"
                aria-label="Pick a site"
              >
                <SelectValue placeholder="Pick a site" />
              </SelectTrigger>
              <SelectContent align="end">
                {siteOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-xs">
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ThemeSwitcher />
        </div>
      </header>

      {/* Discovering — initial sites lookup */}
      {status === "discovering" && <LoadingTiles />}

      {/* No site picked yet (multi-site tenant) */}
      {status === "no-site-picked" && (
        <>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Pick a site from the top-right dropdown to see its redirects.
            </p>
          </div>
          <FootnoteSeparated />
        </>
      )}

      {/* Per-site data loading */}
      {status === "loading" && <LoadingTiles />}

      {/* Error */}
      {status === "error" && (
        <>
          <ErrorDisplay
            error={error ?? "Unknown error"}
            expanded={errorExpanded}
            onToggleExpanded={() => setErrorExpanded((v) => !v)}
            onRetry={selectedSite ? fetchForSite : discoverSites}
          />
          <FootnoteSeparated />
        </>
      )}

      {/* Empty: site found but no redirect maps, OR no sites at all */}
      {status === "empty" && (
        <>
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {siteOptions.length === 0
                ? "No sites found in this tenant."
                : `No redirects configured for ${selectedSite?.name ?? "this site"}.`}
            </p>
          </div>
          <FootnoteSeparated />
        </>
      )}

      {/* Default: tiles */}
      {status === "default" && stats && (
        <>
          <div className="flex items-stretch divide-x divide-border rounded-md border border-border bg-background/40">
            <StatTile
              label="Maps"
              value={stats.totalMaps}
              icon={MapIcon}
              ariaLabel={`${stats.totalMaps} redirect maps`}
            />
            <StatTile
              label="Mappings"
              value={stats.totalMappings}
              icon={ArrowLeftRight}
              ariaLabel={`${stats.totalMappings} total mappings`}
            />
            <StatTile
              label="Last updated"
              value={stats.lastUpdated}
              icon={Clock}
              ariaLabel={`Last updated ${stats.lastUpdated}`}
            />
          </div>
          <FootnoteSeparated />
        </>
      )}
    </section>
  );
}

function LoadingTiles() {
  return (
    <div className="flex items-stretch rounded-md border border-border bg-background/40">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`flex flex-1 flex-col items-center justify-center gap-2 py-3 ${
            i < 2 ? "border-r border-border" : ""
          }`}
        >
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-14" />
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

function FootnoteSeparated() {
  return (
    <p className="text-[11px] text-muted-foreground pt-2 mt-1 border-t border-border">
      Redirect counts only — usage analytics ship in a follow-on release.
    </p>
  );
}
