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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Upload, Download, Plus, ExternalLink, Clipboard } from "lucide-react";
import type { Sites } from "@/lib/sdk/types";

interface TopActionRowProps {
  selectedCollection: Sites.SiteCollection | null;
  selectedSite: Sites.Site | null;
  selectedMapName: string | null;
  /** Tranche 6b: opens the New Redirect Map modal. */
  onCreateClick?: () => void;
  /** Tranche 7 T047: open JSON export in a new tab. */
  onExportNewTab?: () => void;
  /** Tranche 7 T047: copy JSON export to the clipboard. */
  onExportClipboard?: () => void;
  /** Tranche 7 T048: opens the Import wizard. */
  onImportClick?: () => void;
}

export function TopActionRow({
  selectedCollection,
  selectedSite,
  selectedMapName,
  onCreateClick,
  onExportNewTab,
  onExportClipboard,
  onImportClick,
}: TopActionRowProps) {
  const hasSite = selectedCollection !== null && selectedSite !== null;

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border min-h-[48px]">
      {/* View preferences (left) — renders nothing when env-flag is off */}
      <ThemeSwitcher className="shrink-0" />

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
        <Button
          variant="outline"
          size="sm"
          disabled={!hasSite || !onImportClick}
          aria-label="Import redirects"
          onClick={onImportClick}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          Import
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasSite || (!onExportNewTab && !onExportClipboard)}
              aria-label="Export redirects"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onExportNewTab} disabled={!onExportNewTab}>
              <ExternalLink className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
              Open in new tab
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onExportClipboard}
              disabled={!onExportClipboard}
            >
              <Clipboard className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
              Copy to clipboard
            </DropdownMenuItem>
            {/* Direct file download is sandbox-blocked inside Cloud Portal today;
                surfaced as a coming-soon stub to signal intent. */}
            <DropdownMenuItem disabled aria-disabled="true">
              <Download className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
              <span className="flex-1">Download</span>
              <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="default"
          size="sm"
          disabled={!hasSite || !onCreateClick}
          aria-label="New map"
          onClick={onCreateClick}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          New map
        </Button>
      </div>
    </header>
  );
}
