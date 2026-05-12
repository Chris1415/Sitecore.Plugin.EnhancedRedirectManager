"use client";

/**
 * T035 — FullPage
 *
 * Top-level shell for the Full Page extension point (xmc:fullscreen).
 *
 * Layout:
 *   ≥960px:  two-pane — TopActionRow (full width), then:
 *              left rail 280px fixed (CollectionPicker + SitePicker + RedirectMapList)
 *              right pane (fluid) — RedirectMapDetail
 *   <960px:  tabbed fallback — Tabs with "Browse" (left content) and "Detail" (right content)
 *             Tab state is persisted: switching from Detail back to Browse keeps the map selection.
 *
 * Breakpoint: 960px implemented via JS window.innerWidth (not media query) so it works in jsdom.
 *
 * Tranche 6b: owns the CRUD orchestration —
 *   - New Map modal (TopActionRow → onCreateClick).
 *   - Delete Map confirm modal (RedirectMapDetail → onDeleteRequested).
 *   - listRefreshKey: incremented after every write so RedirectMapList refetches.
 *   - onLoaded reconciles selectedMap against the freshly-loaded list (re-selects by id).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopActionRow } from "@/components/full-page/TopActionRow";
import { CollectionPicker } from "@/components/full-page/CollectionPicker";
import { SitePicker } from "@/components/full-page/SitePicker";
import { RedirectMapList } from "@/components/full-page/RedirectMapList";
import { RedirectMapDetail } from "@/components/full-page/RedirectMapDetail";
import { NewRedirectMapModal } from "@/components/full-page/NewRedirectMapModal";
import { DeleteMapConfirmModal } from "@/components/full-page/DeleteMapConfirmModal";
import { ImportRedirectMapModal } from "@/components/full-page/ImportRedirectMapModal";
import { Separator } from "@/components/ui/separator";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import {
  buildExportFilename,
  serializeExportToJson,
} from "@/lib/import-export/serialize";
import type { ClientSDK, Sites } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";
import { toast } from "sonner";

interface FullPageProps {
  client: ClientSDK;
  sitecoreContextId: string;
}

const TABBED_BREAKPOINT = 960;

function useIsTwoPane(): boolean {
  const [isTwoPane, setIsTwoPane] = useState(
    typeof window !== "undefined"
      ? window.innerWidth >= TABBED_BREAKPOINT
      : true
  );

  useEffect(() => {
    const handler = () => {
      setIsTwoPane(window.innerWidth >= TABBED_BREAKPOINT);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isTwoPane;
}

export function FullPage({ client, sitecoreContextId }: FullPageProps) {
  const isTwoPane = useIsTwoPane();

  const [selectedCollection, setSelectedCollection] = useState<Sites.SiteCollection | null>(null);
  const [selectedSite, setSelectedSite] = useState<Sites.Site | null>(null);
  const [selectedMap, setSelectedMap] = useState<RedirectMapItem | null>(null);

  // Tranche 6b — modal + refetch orchestration
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  /** When set, the next list-load will re-select the map with this id (used after Create). */
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);

  // Reset map selection when site changes
  useEffect(() => {
    const reset = () => setSelectedMap(null);
    reset();
  }, [selectedSite?.id]);

  // Reset site + map when collection changes
  const handleCollectionSelect = useCallback((collection: Sites.SiteCollection | null) => {
    setSelectedCollection(collection);
    setSelectedSite(null);
    setSelectedMap(null);
  }, []);

  const handleSiteSelect = useCallback((site: Sites.Site | null) => {
    setSelectedSite(site);
    setSelectedMap(null);
  }, []);

  const handleMapSelect = useCallback((map: RedirectMapItem) => {
    setSelectedMap(map);
  }, []);

  /** After any write succeeds: trigger a list refetch. The onLoaded handler
   *  reconciles selectedMap against the fresh data. */
  const handleWriteSuccess = useCallback(() => {
    setListRefreshKey((k) => k + 1);
  }, []);

  /** Called by RedirectMapList after each refetch. Reconciles selectedMap:
   *  - If pendingSelectId is set (e.g. after Create), select that id.
   *  - Otherwise refresh selectedMap from the fresh list by id (so detail-pane sees latest values).
   *  - If the selected map no longer exists (deleted), clear the selection.
   *
   *  Stable callback identity via refs — otherwise this changes every render
   *  (depends on selectedMap), retriggers RedirectMapList's load effect, which
   *  setSelectedMap-s again, and we loop forever. */
  const pendingSelectIdRef = useRef(pendingSelectId);
  const selectedMapRef = useRef(selectedMap);
  useEffect(() => {
    pendingSelectIdRef.current = pendingSelectId;
  }, [pendingSelectId]);
  useEffect(() => {
    selectedMapRef.current = selectedMap;
  }, [selectedMap]);

  const handleListLoaded = useCallback((maps: RedirectMapItem[]) => {
    if (pendingSelectIdRef.current) {
      const target = maps.find((m) => m.id === pendingSelectIdRef.current) ?? null;
      setSelectedMap(target);
      setPendingSelectId(null);
      return;
    }
    const current = selectedMapRef.current;
    if (!current) return;
    const fresh = maps.find((m) => m.id === current.id) ?? null;
    setSelectedMap(fresh);
  }, []);

  const handleCreated = useCallback((newMapId: string) => {
    setPendingSelectId(newMapId);
    setListRefreshKey((k) => k + 1);
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedMap(null);
    setListRefreshKey((k) => k + 1);
  }, []);

  // OQ-7: build sitePath from collection.name + site.name
  const sitePath =
    selectedCollection && selectedSite
      ? `/sitecore/content/${selectedCollection.name}/${selectedSite.name}/Settings/Redirects`
      : null;

  /**
   * T047 — Export the site's maps as the redirect-manager/v1 JSON envelope.
   * Two delivery modes:
   *   - "new-tab": open a blob URL in a new tab (operator can save-as or
   *     copy from there). Bypasses anchor `download`, which the Cloud Portal
   *     iframe sandbox blocks.
   *   - "clipboard": write directly to navigator.clipboard.
   */
  const runExport = useCallback(
    async (mode: "new-tab" | "clipboard") => {
      if (!sitePath || !selectedSite) return;
      try {
        const maps = await listRedirectMaps(client, sitecoreContextId, sitePath);
        const json = serializeExportToJson(maps);
        const filename = buildExportFilename(selectedSite.name ?? "site");
        const countLabel = `${maps.length} map${maps.length === 1 ? "" : "s"}`;

        if (mode === "clipboard") {
          await navigator.clipboard.writeText(json);
          toast.success(`Copied ${countLabel} to clipboard`, {
            description: `${json.length.toLocaleString()} characters`,
          });
          return;
        }

        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (!opened) {
          toast.error("Export failed", {
            description:
              "The browser blocked the new tab. Allow popups for this origin or use 'Copy to clipboard' instead.",
          });
          return;
        }
        toast.success(`Exported ${countLabel}`, { description: filename });
      } catch (error) {
        toast.error("Export failed", {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [client, sitecoreContextId, sitePath, selectedSite],
  );

  const handleExportNewTab = useCallback(() => runExport("new-tab"), [runExport]);
  const handleExportClipboard = useCallback(() => runExport("clipboard"), [runExport]);

  const railContent = (
    <div className="flex flex-col h-full gap-3 p-3">
      <CollectionPicker
        client={client}
        sitecoreContextId={sitecoreContextId}
        onSelect={handleCollectionSelect}
      />
      <SitePicker
        client={client}
        sitecoreContextId={sitecoreContextId}
        selectedCollection={selectedCollection}
        onSelect={handleSiteSelect}
      />
      {selectedSite && sitePath ? (
        <>
          <Separator />
          <div className="flex items-center justify-between px-0 py-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Redirect maps
            </span>
          </div>
          <div className="flex-1 -mx-3 overflow-hidden">
            <RedirectMapList
              client={client}
              sitecoreContextId={sitecoreContextId}
              sitePath={sitePath}
              selectedMapId={selectedMap?.id ?? null}
              onSelect={handleMapSelect}
              onRetry={() => {}}
              refreshKey={listRefreshKey}
              onLoaded={handleListLoaded}
            />
          </div>
        </>
      ) : (
        <>
          <Separator />
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">No site selected</p>
              <p className="text-xs text-muted-foreground/70">
                Pick a collection and site to see its redirect maps.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const detailContent = (
    <RedirectMapDetail
      client={client}
      sitecoreContextId={sitecoreContextId}
      selectedMap={selectedMap}
      hasSitePicked={Boolean(selectedSite && sitePath)}
      onWriteSuccess={handleWriteSuccess}
      onDeleteRequested={() => setShowDeleteConfirm(true)}
    />
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <TopActionRow
        selectedCollection={selectedCollection}
        selectedSite={selectedSite}
        selectedMapName={selectedMap?.name ?? null}
        onCreateClick={() => setShowNewMapModal(true)}
        onImportClick={() => setShowImportModal(true)}
        onExportNewTab={handleExportNewTab}
        onExportClipboard={handleExportClipboard}
      />

      {isTwoPane ? (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside
            className="w-[280px] shrink-0 border-r border-border flex flex-col overflow-hidden"
            aria-label="Redirect maps"
          >
            {railContent}
          </aside>
          <main className="flex-1 overflow-auto" aria-label="Redirect map detail">
            {detailContent}
          </main>
        </div>
      ) : (
        <Tabs defaultValue="browse" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-3 mt-2 self-start">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="detail">Detail</TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex flex-col flex-1 overflow-auto">{railContent}</div>
          </TabsContent>
          <TabsContent value="detail" className="flex-1 overflow-auto mt-0">
            {detailContent}
          </TabsContent>
        </Tabs>
      )}

      {/* Create modal — only renders when a site is picked (sitePath valid) */}
      {sitePath && (
        <NewRedirectMapModal
          client={client}
          sitecoreContextId={sitecoreContextId}
          open={showNewMapModal}
          onOpenChange={setShowNewMapModal}
          sitePath={sitePath}
          onCreated={handleCreated}
        />
      )}

      {/* Delete confirm — only renders with a selected map */}
      <DeleteMapConfirmModal
        client={client}
        sitecoreContextId={sitecoreContextId}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        map={selectedMap}
        onDeleted={handleDeleted}
      />

      {/* Import wizard */}
      <ImportRedirectMapModal
        client={client}
        sitecoreContextId={sitecoreContextId}
        open={showImportModal}
        onOpenChange={setShowImportModal}
        sitePath={sitePath}
        onImportComplete={handleWriteSuccess}
      />
    </div>
  );
}
