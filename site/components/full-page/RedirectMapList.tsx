"use client";

/**
 * T038 — RedirectMapList
 *
 * Virtualized list of Redirect Map items in the left rail.
 * Calls listRedirectMaps when sitePath provided. Uses react-virtuoso per ADR-0012.
 *
 * Each row renders:
 *   - Map name (sm/500)
 *   - Metadata line: "<N> mappings · <last-updated>"
 *   - RedirectType badge (right-aligned)
 *   - 2px primary left-edge stripe on the selected row
 *
 * States: loading (Skeleton rows), empty (RouteOff icon + copy), error (Alert + Retry), filled.
 *
 * OQ-7: sitePath built as /sitecore/content/{collectionName}/{siteName}/Settings/Redirects
 * by caller. Decoder in redirects-read.ts already filters out Redirect Map Grouping items.
 *
 * Keyboard: arrow keys navigate (Virtuoso built-in), Enter selects.
 *
 * POC reference: full-page.html, full-page-no-redirects.html.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { ClientSDK } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";

interface RedirectMapListProps {
  client: ClientSDK;
  sitecoreContextId: string;
  /** Full Sitecore path: /sitecore/content/{collection}/{site}/Settings/Redirects */
  sitePath: string;
  selectedMapId: string | null;
  onSelect: (map: RedirectMapItem) => void;
  onRetry: () => void;
  /**
   * Tranche 6b: incrementing this value forces a refetch (used by FullPage to
   * refresh the list after a successful write — create / update / rename / delete).
   */
  refreshKey?: number;
  /**
   * Tranche 6b: emits the freshly-loaded list to the parent so it can re-select
   * a map by id after a write (e.g. after create, parent wants to select the new map).
   */
  onLoaded?: (maps: RedirectMapItem[]) => void;
}

type Status = "loading" | "loaded" | "empty" | "error";

/** Format updatedAt (Sitecore compact) into a relative/short display string. */
function formatUpdatedAt(compact: string): string {
  const date = parseSitecoreCompactDate(compact);
  if (!date) return compact;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "today";
  if (diffDays < 2) return "yesterday";
  if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
  if (diffDays < 14) return "1 wk ago";
  if (diffDays < 60) return `${Math.floor(diffDays / 7)} wk ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mo ago`;
  return `${Math.floor(diffDays / 365)} yr ago`;
}

export function RedirectMapList({
  client,
  sitecoreContextId,
  sitePath,
  selectedMapId,
  onSelect,
  onRetry,
  refreshKey = 0,
  onLoaded,
}: RedirectMapListProps) {
  const [maps, setMaps] = useState<RedirectMapItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const result = await listRedirectMaps(client, sitecoreContextId, sitePath);
      setMaps(result);
      setStatus(result.length === 0 ? "empty" : "loaded");
      onLoaded?.(result);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [client, sitecoreContextId, sitePath, onLoaded]);

  useEffect(() => {
    // IIFE pattern per DashboardWidget convention: setState inside callback not effect body.
    // refreshKey is included as a dep so parent-triggered refreshes refetch the list.
    (async () => { await load(); })();
  }, [load, refreshKey]);

  // Keyboard navigation: arrow keys move through the list; Enter selects
  const handleKeyDown = (e: React.KeyboardEvent, index: number, map: RedirectMapItem) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(map);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      virtuosoRef.current?.scrollToIndex({ index: Math.min(index + 1, maps.length - 1), behavior: "smooth" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      virtuosoRef.current?.scrollToIndex({ index: Math.max(index - 1, 0), behavior: "smooth" });
    }
  };

  // Show the skeleton ONLY on the first load (no maps yet). Subsequent refreshes
  // keep the previous list visible — avoids the white-bar flash the operator
  // flagged when clicking the Refresh button.
  if (status === "loading" && maps.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-2" aria-live="polite" aria-label="Loading redirect maps">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" data-slot="skeleton" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="p-3 space-y-2">
        <Alert variant="danger">
          <AlertDescription className="text-xs">
            Couldn&apos;t load redirect maps.
            {errorMsg && (
              <span className="block mt-1 font-mono text-[10px] opacity-70">{errorMsg}</span>
            )}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            onRetry();
            load();
          }}
          aria-label="Retry loading redirect maps"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center" role="status">
        <p className="text-sm font-medium text-foreground">No redirect maps for this site yet</p>
        <p className="text-xs text-muted-foreground">Create one to start managing redirects.</p>
      </div>
    );
  }

  // Header row.
  // NOTE: parent (`flex-1 -mx-3 overflow-hidden` in FullPage.tsx) is `display:block`,
  // so `flex-1` would be ignored and Virtuoso (height:100%) would collapse to 0px.
  // Use `h-full` to fill the parent's measured height.
  return (
    <div
      role="listbox"
      aria-label="Redirect maps"
      className="h-full overflow-hidden"
    >
      <Virtuoso
        ref={virtuosoRef}
        data={maps}
        style={{ height: "100%" }}
        itemContent={(index, map) => {
          const isSelected = map.id === selectedMapId;
          return (
            <div
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              className={[
                "lr-row elev-card flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer",
                "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "border-l-2 transition-colors",
                isSelected
                  ? "border-l-primary bg-muted/40"
                  : "border-l-transparent",
              ].join(" ")}
              onClick={() => onSelect(map)}
              onKeyDown={(e) => handleKeyDown(e, index, map)}
            >
              {/* Left-rail dot — single static --primary color (no --draft variant per ADR-0024) */}
              <span className="lr-row__dot" aria-hidden="true" />
              <div className="lr-row__main flex flex-col min-w-0 flex-1">
                <span className="lr-row__name text-sm font-medium truncate">{map.name}</span>
                <span className="lr-row__meta text-xs text-muted-foreground font-mono">
                  {map.mappings.length} {map.mappings.length === 1 ? "mapping" : "mappings"}{" "}
                  &middot; {formatUpdatedAt(map.updatedAt)}
                </span>
              </div>
              <Badge colorScheme="neutral" size="sm" className="font-normal shrink-0">
                {redirectTypeDisplayName(map.redirectType)}
              </Badge>
            </div>
          );
        }}
      />
    </div>
  );
}
