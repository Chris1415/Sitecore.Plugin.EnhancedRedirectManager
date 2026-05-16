"use client";

/**
 * WorkspaceHero — slimmer Full Page hero (operator polish 2026-05-15).
 *
 * Layout:
 *   - Eyebrow chip: "Workspace · {siteName}" (or "Workspace · pick a site"
 *     when no site selected yet). No language suffix — redirects apply to
 *     every language version of the site (UrlMapping is SHARED per ADR-0023).
 *   - Gradient headline: "{N} active maps." (counted from real fetched maps;
 *     uses real data only — no mock total).
 *   - Sub-line: "Last modified {relativeTime} by {updatedBy}" sourced from
 *     the most-recently-updated map in the fetched list. Hidden until maps
 *     are loaded.
 *   - "Publish all" CTA — still mocked via DecorativeCta toast (operator
 *     confirmed this is wanted; real bulk-publish lands in a follow-on PRD).
 *
 * Dropped vs prior version:
 *   - "View activity" CTA (operator wasn't sure what to do with it)
 *   - "No conflicting source URLs detected" suffix (Conflicts stat tile in
 *     the strip now shows this status with proper colour)
 *   - Mock "14 minutes ago by Anna" line (replaced with real data)
 *   - data-preview-mock attrs (data is real)
 *
 * Discipline:
 * - No #hex literals (T040 guard)
 * - No "N languages" copy (FR-R11 / T045 guard)
 * - No status-pill--active/--draft (T042 guard)
 * - Hydration-safe: no typeof window in render body
 */

import { useMemo, useRef } from "react";
import { GradientText } from "@/components/ui/gradient-text";
import { DecorativeCta } from "@/components/ui/decorative-cta";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useLetterReveal } from "@/hooks/use-letter-reveal";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem } from "@/lib/domain/types";
import { RefreshCw, History } from "lucide-react";

interface WorkspaceHeroProps {
  /** Display name of the currently-selected site (null when none picked). */
  siteName: string | null;
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

export function WorkspaceHero({ siteName, maps, onRefresh, onSelectMap }: WorkspaceHeroProps) {
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

  // Redirect rules are stored on a SHARED Sitecore field — they apply to every
  // language version of the site. No per-language scoping in the eyebrow.
  const eyebrowSiteLabel = siteName ?? "pick a site";
  const headlineText =
    activeMapsCount === 0
      ? siteName
        ? "No redirect maps yet."
        : "Pick a site to begin."
      : `${activeMapsCount} active map${activeMapsCount === 1 ? "" : "s"}.`;

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
          Validate health (placeholder) · Publish all (placeholder) */}
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

        <DecorativeCta
          label="Publish all"
          toastCopy="Bulk publish coming in a follow-on release. For now, individual map changes save and publish immediately."
          variant="default"
          className="elev-btn"
        />
      </div>
    </section>
  );
}
