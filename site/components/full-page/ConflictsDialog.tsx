"use client";

/**
 * ConflictsDialog — surfaces source-URL collisions across all maps for the
 * selected site so the operator can resolve them quickly.
 *
 * Triggered by clicking the Conflicts tile in StatStrip when count > 0.
 *
 * Each conflict group:
 *   - Header: the conflicting source URL (case as first occurrence) + count
 *   - One row per occurrence: map name · target · redirect type · "Open map"
 *     button. Clicking Open closes the dialog and calls onSelectMap to jump
 *     the rail + detail pane to that map. The operator then removes the
 *     duplicate mapping or edits the source to be distinct.
 *
 * Collision detection mirrors StatStrip / aggregateStats: case-insensitive,
 * whitespace-trimmed; empty-string sources ignored.
 */

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem, RedirectType } from "@/lib/domain/types";

interface ConflictOccurrence {
  mapId: string;
  mapName: string;
  source: string;
  target: string;
  redirectType: RedirectType;
}

interface ConflictGroup {
  /** Normalized source key — lowercased, trimmed. Used for keying. */
  key: string;
  /** Display label — preserves case from the first occurrence. */
  displaySource: string;
  occurrences: ConflictOccurrence[];
}

/** Compute conflict groups from a maps array. Returns ONLY sources that
 *  appear more than once. Groups are ordered by occurrence count desc. */
function computeConflicts(maps: RedirectMapItem[]): ConflictGroup[] {
  const groups = new Map<string, ConflictGroup>();
  for (const map of maps) {
    for (const mapping of map.mappings) {
      const raw = mapping.source ?? "";
      const key = raw.trim().toLowerCase();
      if (!key) continue;
      let group = groups.get(key);
      if (!group) {
        group = { key, displaySource: raw.trim(), occurrences: [] };
        groups.set(key, group);
      }
      group.occurrences.push({
        mapId: map.id,
        mapName: map.name,
        source: raw,
        target: mapping.target,
        redirectType: map.redirectType,
      });
    }
  }
  return [...groups.values()]
    .filter((g) => g.occurrences.length > 1)
    .sort((a, b) => b.occurrences.length - a.occurrences.length);
}

export interface ConflictsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maps: RedirectMapItem[];
  /** Called with a map when the operator clicks "Open map" — parent should
   *  select the map in the rail and close the dialog. */
  onOpenMap: (map: RedirectMapItem) => void;
}

export function ConflictsDialog({
  open,
  onOpenChange,
  maps,
  onOpenMap,
}: ConflictsDialogProps) {
  const conflicts = useMemo(() => computeConflicts(maps), [maps]);
  const totalExtras = conflicts.reduce(
    (sum, g) => sum + (g.occurrences.length - 1),
    0,
  );

  const handleOpenMap = (mapId: string) => {
    const map = maps.find((m) => m.id === mapId);
    if (!map) return;
    onOpenMap(map);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 text-warning-foreground"
              aria-hidden="true"
            />
            {totalExtras === 0
              ? "No conflicts"
              : `${totalExtras} conflicting source URL${totalExtras === 1 ? "" : "s"}`}
          </DialogTitle>
          <DialogDescription>
            Each redirect should have a unique source. When two mappings share
            the same source URL, only one of them resolves at runtime — the
            others are dead config. Open the map and either remove the duplicate
            mapping or change one of the source URLs.
          </DialogDescription>
        </DialogHeader>

        {conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            All sources are unique. Nothing to resolve.
          </p>
        ) : (
          <ul className="space-y-3 max-h-[60vh] overflow-auto" role="list">
            {conflicts.map((group) => (
              <li
                key={group.key}
                className="rounded-md border border-border bg-card"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
                  <code className="text-xs font-mono break-all">
                    {group.displaySource}
                  </code>
                  <Badge
                    colorScheme="warning"
                    size="sm"
                    className="shrink-0"
                  >
                    {group.occurrences.length} occurrences
                  </Badge>
                </div>
                <ul className="divide-y divide-border" role="list">
                  {group.occurrences.map((occ, idx) => (
                    <li
                      key={`${occ.mapId}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <span className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">
                          {occ.mapName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 truncate">
                          <span className="truncate">{occ.source}</span>
                          <ArrowRight
                            className="h-3 w-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{occ.target}</span>
                        </span>
                      </span>
                      <Badge
                        colorScheme="neutral"
                        size="sm"
                        className="shrink-0"
                      >
                        {redirectTypeDisplayName(occ.redirectType)}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenMap(occ.mapId)}
                      >
                        Open map
                      </Button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
