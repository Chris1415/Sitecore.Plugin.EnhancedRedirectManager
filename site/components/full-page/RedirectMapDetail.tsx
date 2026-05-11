"use client";

/**
 * T039 — RedirectMapDetail (read-only)
 *
 * Right pane content. Two states:
 *   1. No map selected — empty state with keyboard hint.
 *   2. Map selected — read-only detail view.
 *
 * Read-only detail shows:
 *   - Map name (heading)
 *   - RedirectType badge
 *   - Flag chips: PreserveQueryString, PreserveLanguage, IncludeVirtualFolder
 *     (rendered ONLY when the flag is true — per instruction)
 *   - Last updated (formatted via parseSitecoreCompactDate + Intl.DateTimeFormat)
 *   - Mappings table — read-only, monospace paths, NO edit/delete actions in Tranche 5
 *
 * Edit/Delete/Save buttons are intentionally absent in Tranche 5.
 * Tranche 6 will add the CRUD forms to this pane.
 *
 * POC reference:
 *   - Empty: full-page-empty-no-selection.html
 *   - Detail: full-page-edit-redirect-map.html (ignoring form widgets — read-only rendering only)
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import { redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem } from "@/lib/domain/types";
import { Inbox } from "lucide-react";

interface RedirectMapDetailProps {
  selectedMap: RedirectMapItem | null;
}

/** Format updatedAt (Sitecore compact) with Intl.DateTimeFormat short style. */
function formatDate(compact: string): string {
  const date = parseSitecoreCompactDate(compact);
  if (!date) return compact;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function RedirectMapDetail({ selectedMap }: RedirectMapDetailProps) {
  if (!selectedMap) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Inbox
            className="h-10 w-10 text-muted-foreground/50"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            Pick a site to begin
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Choose a collection and site in the left rail. The redirect maps for
            that site will appear here.
          </p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            Tip: ↑ / ↓ to navigate the list, Enter to open.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 overflow-auto h-full">
      <div className="p-5 space-y-5">
        {/* Section 1 — Map attributes */}
        <section aria-label="Map attributes">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">{selectedMap.name}</h2>
            <Badge colorScheme="neutral" size="sm" className="font-normal">
              {redirectTypeDisplayName(selectedMap.redirectType)}
            </Badge>
          </header>

          {/* Flag chips — only rendered when true */}
          <div className="flex flex-wrap gap-1.5 mb-3" aria-label="Flags">
            {selectedMap.preserveQueryString && (
              <Badge colorScheme="neutral" size="sm" className="font-normal">
                Preserve query string
              </Badge>
            )}
            {selectedMap.preserveLanguage && (
              <Badge colorScheme="neutral" size="sm" className="font-normal">
                Preserve language
              </Badge>
            )}
            {selectedMap.includeVirtualFolder && (
              <Badge colorScheme="neutral" size="sm" className="font-normal">
                Include virtual folder
              </Badge>
            )}
          </div>

          {/* Last updated */}
          <p className="text-xs text-muted-foreground">
            Last updated:{" "}
            <time dateTime={selectedMap.updatedAt} className="font-medium">
              {formatDate(selectedMap.updatedAt)}
            </time>
          </p>
        </section>

        <Separator />

        {/* Section 2 — Mappings table (read-only) */}
        <section aria-label="Mappings">
          <header className="flex items-baseline gap-2 mb-3">
            <span className="text-sm font-medium">Mappings</span>
            <span className="text-xs text-muted-foreground">
              {selectedMap.mappings.length}{" "}
              {selectedMap.mappings.length === 1 ? "row" : "rows"}
            </span>
          </header>

          {selectedMap.mappings.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No mappings configured yet.
            </p>
          ) : (
            <div
              role="table"
              aria-label="Redirect mappings"
              className="w-full border border-border rounded-md overflow-hidden text-xs"
            >
              {/* Table header */}
              <div
                role="row"
                className="grid grid-cols-[1fr_auto_1fr] gap-0 bg-muted/40 border-b border-border"
              >
                <div role="columnheader" className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Source
                </div>
                <div role="columnheader" className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center">
                  {/* Arrow column */}
                </div>
                <div role="columnheader" className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Target
                </div>
              </div>

              {/* Table rows */}
              {selectedMap.mappings.map((mapping, i) => (
                <div
                  key={i}
                  role="row"
                  className={[
                    "grid grid-cols-[1fr_auto_1fr] gap-0 items-center",
                    i < selectedMap.mappings.length - 1 ? "border-b border-border" : "",
                  ].join(" ")}
                >
                  <div
                    role="cell"
                    className="px-3 py-2 font-mono text-xs text-foreground truncate"
                    title={mapping.source}
                  >
                    {mapping.source}
                  </div>
                  <div
                    role="cell"
                    className="px-2 py-2 text-muted-foreground font-mono text-xs select-none"
                    aria-hidden="true"
                  >
                    →
                  </div>
                  <div
                    role="cell"
                    className="px-3 py-2 font-mono text-xs text-foreground truncate"
                    title={mapping.target}
                  >
                    {mapping.target}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
