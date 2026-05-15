/**
 * DashboardWidget — V4 redesign (T036).
 *
 * V4 composition order:
 *   1. <PreviewDataBanner surface="dashboardWidget" /> — at top (AC-R3.7)
 *   2. Widget header: utility-voice h2 + site meta + Open ghost button
 *   3. <DashboardHero /> — marketing subhead + hero count-up + delta (MOCK)
 *   4. <Sparkline /> — gradient SVG sparkline (MOCK)
 *   5. 3 real stat tiles (Maps / Mappings / Last-updated) + 4th mock tile from
 *      <RecentlyShippedTile /> — in a 2×2 .dw-tiles grid
 *   6. <TopDestinations /> — 5 mock rows
 *   7. <RecentlyShipped /> — 3 mock rows mini-widget
 *   8. Footer attribution: "Last publish N ago by Author" + <HealthBadge /> (MOCK)
 *
 * Deleted: FootnoteSeparated "Redirect counts only..." line (AC-R3.7 / ADR-0025 —
 *   consolidated into the PreviewDataBanner; T036 explicitly removes it).
 *
 * Real tiles (Maps / Mappings / Last-updated): carry V4 chrome via StatTile
 *   (which now uses .dw-tile). They do NOT carry data-preview-mock.
 *
 * Existing site-selection logic (discoverSites, fetchForSite, handleSiteChange,
 *   detectSiteFromHostContext, localStorage, aggregateStats) all carry unchanged.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatTile } from "@/components/dashboard-widget/StatTile";
import { DashboardHero } from "@/components/dashboard-widget/DashboardHero";
import { Sparkline } from "@/components/dashboard-widget/Sparkline";
import { TopDestinations } from "@/components/dashboard-widget/TopDestinations";
import { RecentlyShipped } from "@/components/dashboard-widget/RecentlyShipped";
import { HealthBadge } from "@/components/dashboard-widget/HealthBadge";
import { CollisionsBadge } from "@/components/dashboard-widget/CollisionsBadge";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { listSites, listCollections } from "@/lib/sdk/sites";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import {
  ArrowLeftRight,
  BarChart3,
  Clock,
  Crown,
  Lock,
  Map as MapIcon,
  RefreshCw,
  Server,
  Timer,
} from "lucide-react";
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

/** A condensed row used by the RecentlyShipped section (real data, top N most recent). */
export interface RecentMap {
  id: string;
  name: string;
  redirectType: RedirectMapItem["redirectType"];
  updatedAt: string;
  mappingCount: number;
}

/** Aggregate stats from a set of maps. */
export function aggregateStats(maps: RedirectMapItem[]): {
  totalMaps: number;
  totalMappings: number;
  lastUpdated: string;
  count301: number;
  count302: number;
  countServerTransfer: number;
  avgMappingsPerMap: number;
  largestMapMappings: number;
  collisionCount: number;
  recentMaps: RecentMap[];
} {
  const totalMaps = maps.length;
  const totalMappings = maps.reduce((sum, m) => sum + m.mappings.length, 0);

  // Mappings counted by their parent map's redirectType. Each map has ONE type
  // that applies to all its mappings (PRD-000 + ADR-0003).
  let count301 = 0;
  let count302 = 0;
  let countServerTransfer = 0;
  let largestMapMappings = 0;
  for (const map of maps) {
    const n = map.mappings.length;
    if (map.redirectType === "Redirect301") count301 += n;
    else if (map.redirectType === "Redirect302") count302 += n;
    else if (map.redirectType === "ServerTransfer") countServerTransfer += n;
    if (n > largestMapMappings) largestMapMappings = n;
  }

  // Average mappings per map — rounded to one decimal place. Zero when no maps.
  const avgMappingsPerMap =
    totalMaps > 0 ? Math.round((totalMappings / totalMaps) * 10) / 10 : 0;

  // Collision count — a collision is two mappings (in any map) that share the
  // SAME source URL. We count the EXTRA copies past the first occurrence so a
  // source repeated 3 times reports as 2 collisions. Empty-string sources are
  // ignored to avoid noise from in-progress edits in the wild.
  const sourceCounts = new Map<string, number>();
  for (const map of maps) {
    for (const mapping of map.mappings) {
      const src = (mapping.source ?? "").trim().toLowerCase();
      if (!src) continue;
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    }
  }
  let collisionCount = 0;
  for (const n of sourceCounts.values()) {
    if (n > 1) collisionCount += n - 1;
  }

  let latestDate: Date | null = null;
  for (const map of maps) {
    if (!map.updatedAt) continue;
    const d = parseSitecoreCompactDate(map.updatedAt);
    if (d && (!latestDate || d > latestDate)) {
      latestDate = d;
    }
  }
  const lastUpdated = latestDate ? formatLastUpdated(latestDate) : "—";

  // Top 4 maps by most recent updatedAt (descending). Maps without a parseable
  // updatedAt sink to the end. We can only show map-level recency — there is no
  // per-mapping updatedAt on the stock Sitecore template.
  const recentMaps: RecentMap[] = [...maps]
    .filter((m) => m.id && m.name && m.updatedAt)
    .sort((a, b) => {
      const da = parseSitecoreCompactDate(a.updatedAt)?.getTime() ?? 0;
      const db = parseSitecoreCompactDate(b.updatedAt)?.getTime() ?? 0;
      return db - da;
    })
    .slice(0, 4)
    .map((m) => ({
      id: m.id,
      name: m.name,
      redirectType: m.redirectType,
      updatedAt: m.updatedAt,
      mappingCount: m.mappings.length,
    }));

  return {
    totalMaps,
    totalMappings,
    lastUpdated,
    count301,
    count302,
    countServerTransfer,
    avgMappingsPerMap,
    largestMapMappings,
    collisionCount,
    recentMaps,
  };
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
    count301: number;
    count302: number;
    countServerTransfer: number;
    avgMappingsPerMap: number;
    largestMapMappings: number;
    collisionCount: number;
    recentMaps: RecentMap[];
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

  // Refresh: incrementing this key remounts the entire .dw-wide-zone subtree,
  // restarting count-ups, sparkline reveal, bar-fill animations, and the
  // recently-shipped relative-time labels — alongside refetching real data.
  const [refreshKey, setRefreshKey] = useState(0);
  function handleRefresh() {
    setRefreshKey((k) => k + 1);
    if (selectedSite) {
      void fetchForSite();
    } else {
      void discoverSites();
    }
  }

  const showPicker = siteOptions.length > 1;

  return (
    <section
      aria-label={
        selectedSite
          ? `Redirects summary for ${selectedSite.name}`
          : "Redirects summary"
      }
      className="dw-shell"
    >
      {/* Loading announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status === "loading" || status === "discovering"
          ? "Loading redirect counts."
          : ""}
        {status === "empty" ? "No redirects configured." : ""}
      </div>

      {/* Header (utility voice) — HealthBadge moved here from the dropped
          .dw-foot footer (operator polish 2026-05-15). The previous footer
          duplicated 'Last updated' which now lives in the tiles grid. */}
      <div className="dw-content" style={{ paddingBottom: 0 }}>
        <header className="dw-hd">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h2>Redirect Manager</h2>
            {/* Badge cluster keyed on refreshKey: remounts on every refresh so
                both badges replay their CSS entrance animation alongside the
                wide-zone re-animation below. */}
            <div key={`badges-${refreshKey}`} className="dw-badge-cluster" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <HealthBadge />
              <CollisionsBadge collisionCount={stats?.collisionCount ?? 0} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {selectedSite && (
              <p style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", margin: 0, fontFamily: "var(--font-mono)" }}>
                {selectedSite.name}
              </p>
            )}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={status === "loading" || status === "discovering"}
              aria-label="Refresh redirect counts"
              title="Refresh"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  status === "loading" || status === "discovering" ? "animate-spin" : ""
                }`}
              />
            </Button>
            <ThemeSwitcher />
          </div>
        </header>
      </div>

      {/* Wide-zone: 3 columns at ≥960px (hero | tiles | lists); stacked below.
          Keyed on refreshKey: clicking the header refresh button remounts this
          subtree so every animation (count-ups, sparkline reveal, bar fills,
          relative-time labels) restarts together with the data fetch. */}
      <div key={refreshKey} className="dw-wide-zone">
        {/* Column 1 — overall numbers: marketing hero (D5 zone b) + sparkline */}
        <div className="dw-wide-zone__col dw-wide-zone__col--hero">
          <DashboardHero />
          <Sparkline />
        </div>

        {/* Column 2 — 4 stat tiles (or loading / empty / error in their place).
            LoadingTiles only shows during the FIRST load (stats is null). On
            subsequent refreshes the existing tiles stay visible and re-animate
            via the keyed remount of the wide-zone, so the operator doesn't see
            a skeleton flash that reads as "white bars". */}
        <div className="dw-wide-zone__col dw-wide-zone__col--tiles">
          {(status === "discovering" || status === "loading") && !stats && <LoadingTiles />}

          {status === "no-site-picked" && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Pick a site from the top-right dropdown to see its redirects.
              </p>
            </div>
          )}

          {status === "error" && (
            <ErrorDisplay
              error={error ?? "Unknown error"}
              expanded={errorExpanded}
              onToggleExpanded={() => setErrorExpanded((v) => !v)}
              onRetry={selectedSite ? fetchForSite : discoverSites}
            />
          )}

          {status === "empty" && (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                {siteOptions.length === 0
                  ? "No sites found in this tenant."
                  : `No redirects configured for ${selectedSite?.name ?? "this site"}.`}
              </p>
            </div>
          )}

          {status === "default" && stats && (
            <div className="dw-tiles">
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
                label="301 Permanent"
                value={stats.count301}
                icon={Lock}
                ariaLabel={`${stats.count301} permanent (301) redirects`}
              />
              <StatTile
                label="302 Temporary"
                value={stats.count302}
                icon={Timer}
                ariaLabel={`${stats.count302} temporary (302) redirects`}
              />
              <StatTile
                label="Server Transfer"
                value={stats.countServerTransfer}
                icon={Server}
                ariaLabel={`${stats.countServerTransfer} server transfer redirects`}
              />
              <StatTile
                label="Avg / map"
                value={stats.avgMappingsPerMap}
                icon={BarChart3}
                ariaLabel={`Average ${stats.avgMappingsPerMap} mappings per map`}
              />
              <StatTile
                label="Largest map"
                value={stats.largestMapMappings}
                icon={Crown}
                ariaLabel={`Largest map has ${stats.largestMapMappings} mappings`}
              />
              <StatTile
                label="Last updated"
                value={stats.lastUpdated}
                icon={Clock}
                ariaLabel={`Last updated ${stats.lastUpdated}`}
              />
            </div>
          )}
        </div>

        {/* Column 3 — Top destinations (MOCK) + Recently shipped maps (REAL).
            RecentlyShipped uses real stats.recentMaps when available; otherwise
            renders nothing (it self-handles the empty/undefined state). */}
        <div className="dw-wide-zone__col dw-wide-zone__col--lists">
          <TopDestinations />
          <RecentlyShipped recentMaps={stats?.recentMaps ?? []} />
        </div>
      </div>

    </section>
  );
}

function LoadingTiles() {
  // 8 skeletons: Maps, Mappings, 301, 302, Server Transfer, Avg/map,
  // Largest map, Last updated
  return (
    <div className="dw-tiles">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="dw-tile">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="h-3 w-14 mt-1" />
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
