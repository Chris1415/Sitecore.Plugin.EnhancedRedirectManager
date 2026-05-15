/**
 * MatchedMapGroup — T023 (+ Tranche 4 fix-up #2: accordion + map-settings edit)
 *                   Re-skinned T4 (Epic E): V4 cp-item anatomy, no status pill.
 *
 * V4 reconciliation (architecture § 11.2):
 *   - NO status pill. NO Active/Draft labels. NO --draft CSS class.
 *   - NO "unpublished" meta line.
 *   - RedirectType badge (real enum value via redirectTypeDisplayName()).
 *   - V4 cp-item card anatomy per POC pocs/poc-v1-prd002/context-panel.html.
 *   - Hover lift via elev-hover-lift / elev-card utility class.
 *
 * pageRoute: the current page route used as the matcher key (OQ-A closed: pageInfo.route)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import type { Mapping, RedirectMapItem } from "@/lib/domain/types";
import { Pencil, Settings2, Trash2 } from "lucide-react";

export interface MatchedMapGroupProps {
  map: RedirectMapItem;
  matchedMappings: Mapping[];
  pageRoute: string;
  onEditMapping: (mapping: Mapping, index: number) => void;
  onDeleteMapping: (mapping: Mapping, index: number) => void;
  onEditMapSettings: (map: RedirectMapItem) => void;
}

/** Relative time from updatedAt ISO/compact string */
function relativeTime(updatedAt: string): string {
  const date = parseSitecoreCompactDate(updatedAt) ?? new Date(updatedAt);
  if (!date || isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

export function MatchedMapGroup({
  map,
  matchedMappings,
  pageRoute,
  onEditMapping,
  onDeleteMapping,
  onEditMapSettings,
}: MatchedMapGroupProps) {
  return (
    <section className="cp-list" aria-label={`${map.name} redirect map`}>
      {matchedMappings.map((mapping, idx) => {
        const srcMatched = mapping.source === pageRoute;
        const tgtMatched = mapping.target === pageRoute;
        return (
          <article
            key={`${mapping.source}|${mapping.target}`}
            className="cp-item elev-hover-lift"
          >
            {/* Item header: RedirectType badge + actions */}
            <div className="cp-item__hd">
              <Badge size="sm" className="cp-item__type-badge">
                {redirectTypeDisplayName(map.redirectType)}
              </Badge>
              <span className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  aria-label="Edit mapping"
                  onClick={() => onEditMapping(mapping, idx)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  aria-label="Delete mapping"
                  onClick={() => onDeleteMapping(mapping, idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </span>
            </div>

            {/* Source → target URL pair in mono */}
            <div className="cp-item__url">
              <span className={srcMatched ? "font-medium text-foreground" : ""}>
                {mapping.source}
              </span>
              <span className="arrow" aria-hidden="true"> &rarr; </span>
              <span className={tgtMatched ? "font-medium text-foreground" : ""}>
                {mapping.target}
              </span>
            </div>

            {/* Meta: parent map name + last-updated */}
            <div className="cp-item__meta">
              <span className="mono">{map.name}</span>
              <span className="sep" aria-hidden="true">&middot;</span>
              <span className="mono">{relativeTime(map.updatedAt)}</span>
            </div>
          </article>
        );
      })}

      {/* Edit map settings button */}
      <div className="pt-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onEditMapSettings(map)}
          aria-label={`Edit settings for ${map.name}`}
        >
          <Settings2 className="h-3 w-3" />
          Edit map
        </Button>
      </div>
    </section>
  );
}
