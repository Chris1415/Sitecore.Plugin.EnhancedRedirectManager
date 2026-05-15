/**
 * RecentlyShipped — mini-widget showing the most-recently-updated Redirect Maps
 * for the selected site (operator polish 2026-05-15).
 *
 * Real data: receives `recentMaps` from DashboardWidget aggregateStats, which
 * sorts the fetched RedirectMapItem[] by updatedAt desc and slices the top 4.
 *
 * Granularity caveat: stock Sitecore Redirect Map template carries updatedAt at
 * MAP level only — there is no per-mapping updatedAt. So this section can only
 * show which MAP was shipped, not which individual mapping inside that map.
 *
 * Each row renders: map name + relative time (e.g. "3 h ago") + RedirectType badge.
 *
 * RecentlyShippedTile (the 4th mock tile) is still exported for any callers that
 * still mount it, but DashboardWidget no longer uses it — it now mounts a real
 * "Server Transfer" StatTile in that slot.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { PREVIEW_DATA } from "@/lib/mocks/preview-data";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RecentMap } from "@/components/dashboard-widget/DashboardWidget";

// ── 4th mock tile (deprecated — kept exported for backward compat) ──────────

export function RecentlyShippedTile() {
  const { countLast24h } = PREVIEW_DATA.recentlyShipped;

  return (
    <div className="dw-tile" data-preview-mock="true">
      <span className="dw-tile__value" data-preview-mock="true">
        {countLast24h}
      </span>
      <span className="dw-tile__label">Recently shipped</span>
      <span className="dw-tile__sub">last 24 hours</span>
    </div>
  );
}

// ── Relative-time helper ────────────────────────────────────────────────────

function relativeTimeFromCompact(compact: string): string {
  const date = parseSitecoreCompactDate(compact);
  if (!date) return compact;
  const now = Date.now();
  const diffMs = now - date.getTime();
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
  }).format(date);
}

// ── Real recently-shipped-maps mini-widget ──────────────────────────────────

export interface RecentlyShippedProps {
  /** Most-recently-updated maps from aggregateStats. Pass [] to render nothing. */
  recentMaps: RecentMap[];
}

export function RecentlyShipped({ recentMaps }: RecentlyShippedProps) {
  if (recentMaps.length === 0) return null;

  return (
    <section className="dw-recent" aria-label="Recently shipped maps">
      <div className="dw-recent__head">
        <div>
          <p className="dw-recent__title">Recently shipped maps</p>
          <p className="dw-recent__sub">Top {recentMaps.length}</p>
        </div>
      </div>

      <div className="dw-recent__rows">
        {recentMaps.map((m) => (
          <div key={m.id} className="dw-recent__row">
            <span className="dw-recent__row-pair">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-muted-foreground"> · {relativeTimeFromCompact(m.updatedAt)}</span>
            </span>
            <Badge colorScheme="neutral" size="sm" variant="bold">
              {redirectTypeDisplayName(m.redirectType)}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}
