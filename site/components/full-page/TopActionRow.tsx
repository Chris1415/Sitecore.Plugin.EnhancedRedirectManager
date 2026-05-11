"use client";

/**
 * T040 — TopActionRow
 *
 * Top action bar for the Full Page surface (xmc:fullscreen).
 *
 * Renders:
 * - Blok Breadcrumb: Redirect Manager → {collection} → {site} → {mapName}
 * - Right-aligned stub action buttons: Import / Export / + New map
 *   All three are stubs in Tranche 5 — no write actions wired.
 *
 * Stub TODOs:
 * - Import: TODO (Tranche 7) — triggers JSON import wizard
 * - Export: TODO (Tranche 7) — triggers JSON download
 * - + New map: TODO (Tranche 6) — opens create form in right pane
 *
 * POC reference: full-page.html, full-page-empty-no-selection.html
 */

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Upload, Download, Plus } from "lucide-react";
import type { Sites } from "@/lib/sdk/types";

interface TopActionRowProps {
  selectedCollection: Sites.SiteCollection | null;
  selectedSite: Sites.Site | null;
  selectedMapName: string | null;
}

export function TopActionRow({
  selectedCollection,
  selectedSite,
  selectedMapName,
}: TopActionRowProps) {
  const hasSite = selectedCollection !== null && selectedSite !== null;

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border min-h-[48px]">
      {/* Breadcrumb */}
      <Breadcrumb className="flex-1 min-w-0">
        <BreadcrumbList>
          {!selectedCollection ? (
            <BreadcrumbItem>
              <BreadcrumbPage className="text-muted-foreground">
                Pick a collection to begin
              </BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem>
                <BreadcrumbPage className={selectedSite ? "text-foreground" : "text-muted-foreground"}>
                  {selectedCollection.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
              {selectedSite && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className={selectedMapName ? "text-foreground" : "text-muted-foreground"}>
                      {selectedSite.name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                  {selectedMapName && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-foreground font-medium">
                          {selectedMapName}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Action buttons — Tranche 5 stubs */}
      <div className="flex items-center gap-2 shrink-0">
        {/* TODO (Tranche 7): Import — triggers JSON import wizard */}
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSite}
          aria-label="Import redirects"
          onClick={() => {
            // TODO (Tranche 7): open import wizard
          }}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Import
        </Button>

        {/* TODO (Tranche 7): Export — triggers JSON download */}
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSite}
          aria-label="Export redirects"
          onClick={() => {
            // TODO (Tranche 7): trigger JSON download
          }}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Export
        </Button>

        {/* TODO (Tranche 6): + New map — opens create form in right pane */}
        <Button
          variant="default"
          size="sm"
          disabled={!hasSite}
          aria-label="New map"
          onClick={() => {
            // TODO (Tranche 6): open create form
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          New map
        </Button>
      </div>
    </header>
  );
}
