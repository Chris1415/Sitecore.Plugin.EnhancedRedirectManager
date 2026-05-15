"use client";

/**
 * StatStrip — 4-tile stat strip above RedirectMapDetail on Full Page.
 *
 * Operator polish 2026-05-15: every tile is now REAL data computed from the
 * `maps` prop synced from FullPage.handleListLoaded:
 *   1. Mappings — total sum of mappings.length across all maps
 *   2. 301 Permanent — sum of mappings for maps with redirectType=Redirect301
 *      + share-of-total in the sub-line ("N% of total" or "no 301s")
 *   3. 302 Temporary — sum of mappings for maps with redirectType=Redirect302
 *   4. Conflicts — count of duplicate source URLs across all maps' mappings
 *      (case-insensitive, whitespace-trimmed, empty-string sources ignored)
 *
 * No more data-preview-mock — these are real numbers.
 *
 * Discipline:
 * - No #hex literals (T040 guard)
 * - No status-pill--active/--draft (T042 guard)
 * - Hydration-safe: useCountUp handles all window access in useEffect
 */

import { useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import type { RedirectMapItem } from "@/lib/domain/types";

interface StatTileProps {
  value: number;
  label: string;
  sub: string;
  /** Visual tone — drives accent color of the value + spark + sub-line.
   *  `warning` is used for Conflicts when > 0; "duplicate sources" reads as
   *  a problem and shouldn't borrow the success-green sub-line styling. */
  tone?: "default" | "warning";
  /** When provided, the tile becomes a clickable button. Used by Conflicts
   *  tile to open the resolution dialog. */
  onClick?: () => void;
  /** Accessible label for the clickable variant. */
  ariaLabel?: string;
}

function StatTile({ value, label, sub, tone = "default", onClick, ariaLabel }: StatTileProps) {
  const animatedValue = useCountUp(value);

  const inner = (
    <>
      <span className="fp-stat__value elev-count-up">{animatedValue}</span>
      <span className="fp-stat__label">{label}</span>
      <span className="fp-stat__sub">{sub}</span>
      <span className="fp-stat__spark" aria-hidden="true" />
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="fp-stat fp-stat--clickable elev-glass-surface elev-card text-left"
        data-tone={tone === "default" ? undefined : tone}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className="fp-stat elev-glass-surface elev-card"
      data-tone={tone === "default" ? undefined : tone}
    >
      {inner}
    </div>
  );
}

interface StatStripProps {
  maps: RedirectMapItem[];
  /** When conflicts > 0, the Conflicts tile becomes clickable and calls this. */
  onConflictsClick?: () => void;
}

interface StripStats {
  totalMappings: number;
  count301: number;
  count302: number;
  countServerTransfer: number;
  conflicts: number;
}

function computeStats(maps: RedirectMapItem[]): StripStats {
  let totalMappings = 0;
  let count301 = 0;
  let count302 = 0;
  let countServerTransfer = 0;

  for (const map of maps) {
    const n = map.mappings.length;
    totalMappings += n;
    if (map.redirectType === "Redirect301") count301 += n;
    else if (map.redirectType === "Redirect302") count302 += n;
    else if (map.redirectType === "ServerTransfer") countServerTransfer += n;
  }

  // Conflicts: extra copies past the first occurrence of each source URL.
  const sourceCounts = new Map<string, number>();
  for (const map of maps) {
    for (const mapping of map.mappings) {
      const src = (mapping.source ?? "").trim().toLowerCase();
      if (!src) continue;
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    }
  }
  let conflicts = 0;
  for (const n of sourceCounts.values()) {
    if (n > 1) conflicts += n - 1;
  }

  return { totalMappings, count301, count302, countServerTransfer, conflicts };
}

export function StatStrip({ maps, onConflictsClick }: StatStripProps) {
  const stats = useMemo(() => computeStats(maps), [maps]);

  const pct301 =
    stats.totalMappings > 0
      ? Math.round((stats.count301 / stats.totalMappings) * 100)
      : 0;
  const pct302 =
    stats.totalMappings > 0
      ? Math.round((stats.count302 / stats.totalMappings) * 100)
      : 0;
  const pctServerTransfer =
    stats.totalMappings > 0
      ? Math.round((stats.countServerTransfer / stats.totalMappings) * 100)
      : 0;

  return (
    <div className="fp-stat-strip" role="region" aria-label="Redirect statistics">
      <StatTile
        value={stats.totalMappings}
        label="Redirects"
        sub={maps.length === 0 ? "no maps loaded" : `across ${maps.length} map${maps.length === 1 ? "" : "s"}`}
      />
      <StatTile
        value={stats.count301}
        label="301 Permanent"
        sub={
          stats.totalMappings === 0
            ? "—"
            : stats.count301 === 0
              ? "no 301s"
              : `${pct301}% of total`
        }
      />
      <StatTile
        value={stats.count302}
        label="302 Temporary"
        sub={
          stats.totalMappings === 0
            ? "—"
            : stats.count302 === 0
              ? "no 302s"
              : `${pct302}% of total`
        }
      />
      <StatTile
        value={stats.countServerTransfer}
        label="Server Transfer"
        sub={
          stats.totalMappings === 0
            ? "—"
            : stats.countServerTransfer === 0
              ? "no transfers"
              : `${pctServerTransfer}% of total`
        }
      />
      <StatTile
        value={stats.conflicts}
        label="Conflicts"
        sub={stats.conflicts === 0 ? "all clear" : "duplicate sources"}
        tone={stats.conflicts === 0 ? "default" : "warning"}
        onClick={
          stats.conflicts > 0 && onConflictsClick ? onConflictsClick : undefined
        }
        ariaLabel={
          stats.conflicts > 0
            ? `${stats.conflicts} conflicts — open resolver`
            : undefined
        }
      />
    </div>
  );
}
