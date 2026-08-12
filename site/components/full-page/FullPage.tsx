"use client";

/**
 * Shell for the xmc:fullscreen extension point: two-pane at >=960px, tabbed
 * below. The breakpoint is JS (window.innerWidth), not a media query, so the
 * behaviour is observable in jsdom — see docs/build-decisions.md#js-breakpoint.
 *
 * Owns the CRUD orchestration, the Manage/Test tab state and lastTrace, plus
 * the Test->Manage deep link (an imperative handle on the detail pane, not a
 * state cascade).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TopActionRow } from "@/components/full-page/TopActionRow";
import { WorkspaceHero } from "@/components/full-page/WorkspaceHero";
import { StatStrip } from "@/components/full-page/StatStrip";
import { CollectionPicker } from "@/components/full-page/CollectionPicker";
import { SitePicker } from "@/components/full-page/SitePicker";
import { RedirectMapList } from "@/components/full-page/RedirectMapList";
import { RedirectMapDetail } from "@/components/full-page/RedirectMapDetail";
import type { RedirectMapDetailHandle } from "@/components/full-page/RedirectMapDetail";
import { TestSurface } from "@/components/full-page/TestSurface";
import { NewRedirectMapModal } from "@/components/full-page/NewRedirectMapModal";
import { DeleteMapConfirmModal } from "@/components/full-page/DeleteMapConfirmModal";
import { ImportRedirectMapModal } from "@/components/full-page/ImportRedirectMapModal";
import { ConflictsDialog } from "@/components/full-page/ConflictsDialog";
import { Separator } from "@/components/ui/separator";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import {
  buildExportFilename,
  serializeExportToJson,
} from "@/lib/import-export/serialize";
import { resolveSiteLocales } from "@/lib/publish/locale-resolver";
import { PUBLISH_LOCALE_SHORTHAND_ACCEPTED } from "@/lib/publish/config";
import type { ClientSDK, Sites } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";
import type { SimulationTrace } from "@/lib/redirects/proxy-simulator";
import { toast } from "sonner";

interface FullPageProps {
  client: ClientSDK;
  sitecoreContextId: string;
}

/** Workspace Manage/Test tab — ADR-0041: transient; never persisted. */
type WorkspaceTab = "manage" | "test";

const TABBED_BREAKPOINT = 960;

function useIsTwoPane(): boolean {
  // HYDRATION FIX (feedback_hydration_mismatch_pattern): useState initializer must
  // not branch on typeof window — SSR renders true (two-pane default), CSR effect
  // corrects immediately after mount before the first visible frame.
  const [isTwoPane, setIsTwoPane] = useState(true);

  useEffect(() => {
    // Sync to real viewport width on mount + on resize
    const handler = () => {
      setIsTwoPane(window.innerWidth >= TABBED_BREAKPOINT);
    };
    handler(); // sync immediately on mount
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isTwoPane;
}

export function FullPage({ client, sitecoreContextId }: FullPageProps) {
  const isTwoPane = useIsTwoPane();

  // ---------------------------------------------------------------------------
  // T027 — Manage/Test segmented tab control (ADR-0041)
  // ---------------------------------------------------------------------------

  /** Active workspace tab — default 'manage'; transient (not persisted). */
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("manage");

  // ---------------------------------------------------------------------------
  // T036 — Lifted trace state (ADR-0041)
  // lastTrace survives Manage↔Test tab toggles within one page lifecycle.
  // Cleared on page reload (not stored in localStorage).
  // ---------------------------------------------------------------------------

  const [lastTrace, setLastTrace] = useState<SimulationTrace | null>(null);

  // ---------------------------------------------------------------------------
  // T039 deep-link ref — wired to RedirectMapDetail's forwardRef imperative handle.
  //  Used by the Test→Manage deep-link callback to drive startEditRow() after tab switch.
  // ---------------------------------------------------------------------------
  const detailRef = useRef<RedirectMapDetailHandle>(null);

  const [selectedCollection, setSelectedCollection] = useState<Sites.SiteCollection | null>(null);
  const [selectedSite, setSelectedSite] = useState<Sites.Site | null>(null);
  const [selectedMap, setSelectedMap] = useState<RedirectMapItem | null>(null);
  /** Mirror of the freshly-loaded list — kept in sync via handleListLoaded.
   *  StatStrip reads this to compute real mapping counts / 301 / 302 / conflicts
   *  instead of mock PREVIEW_DATA. */
  const [maps, setMaps] = useState<RedirectMapItem[]>([]);

  // Tranche 6b — modal + refetch orchestration
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showConflictsDialog, setShowConflictsDialog] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  /** When set, the next list-load will re-select the map with this id (used after Create). */
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);

  // Reset map selection when site changes
  useEffect(() => {
    const reset = () => setSelectedMap(null);
    reset();
  }, [selectedSite?.id]);

  // Reset site + map + maps when collection changes
  const handleCollectionSelect = useCallback((collection: Sites.SiteCollection | null) => {
    setSelectedCollection(collection);
    setSelectedSite(null);
    setSelectedMap(null);
    setMaps([]);
  }, []);

  const handleSiteSelect = useCallback((site: Sites.Site | null) => {
    setSelectedSite(site);
    setSelectedMap(null);
    setMaps([]);
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

  const handleListLoaded = useCallback((loadedMaps: RedirectMapItem[]) => {
    // Keep StatStrip's source-of-truth in sync with the rail's list
    setMaps(loadedMaps);
    if (pendingSelectIdRef.current) {
      const target = loadedMaps.find((m) => m.id === pendingSelectIdRef.current) ?? null;
      setSelectedMap(target);
      setPendingSelectId(null);
      return;
    }
    const current = selectedMapRef.current;
    if (!current) return;
    const fresh = loadedMaps.find((m) => m.id === current.id) ?? null;
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
        const exportMaps = await listRedirectMaps(client, sitecoreContextId, sitePath);
        const json = serializeExportToJson(exportMaps);
        const filename = buildExportFilename(selectedSite.name ?? "site");
        const countLabel = `${exportMaps.length} map${exportMaps.length === 1 ? "" : "s"}`;

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

  // ---------------------------------------------------------------------------
  // T039 — Test→Manage deep-link callback (ADR-0041 / architecture § 4.4)
  //
  // No event bus / pubsub / context provider — plain prop-drilled callback + ref.
  //
  // The `setTimeout(0)` lets React commit setActiveTab + setSelectedMap before
  // the ref-driven startEditRow() fires (architecture § 4.4 sequencing note).
  // ---------------------------------------------------------------------------
  const mapsRef = useRef(maps);
  useEffect(() => {
    mapsRef.current = maps;
  }, [maps]);

  const handleRequestEditRow = useCallback(
    (mapId: string, rowIndex: number) => {
      const map = mapsRef.current.find((m) => m.id === mapId) ?? null;
      if (!map) {
        toast.error("This map no longer exists — please refresh to reload.", {
          description: "The map may have been deleted since the last simulation.",
        });
        return;
      }
      setActiveTab("manage");
      setSelectedMap(map);
      // setTimeout 0: let React commit the tab + map selection before driving the ref
      setTimeout(() => {
        detailRef.current?.startEditRow(rowIndex);
      }, 0);
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  /**
   * railContent — shared across Manage and Test tabs.
   *
   * In Manage: RedirectMapList rows are clickable (readOnly={false}).
   * In Test:   RedirectMapList rows are non-clickable (readOnly={true}) — the
   *            user picks scope but doesn't open maps for editing from that context.
   *
   * The `readOnly` prop is passed here so the same JSX node is used in both
   * paths; FullPage renders it once outside the tab-body branch.
   */
  const buildRailContent = (readOnly: boolean) => (
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
              readOnly={readOnly}
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
      ref={detailRef}
      client={client}
      sitecoreContextId={sitecoreContextId}
      selectedMap={selectedMap}
      hasSitePicked={Boolean(selectedSite && sitePath)}
      onWriteSuccess={handleWriteSuccess}
      onDeleteRequested={() => setShowDeleteConfirm(true)}
    />
  );

  return (
    <div className="fp-shell flex flex-col h-full min-h-0 relative">
      {/* Drifting plume backdrop — z-index: -1 (below all content, below HahnSoloFooter at 50) */}
      <div className="fp-plume-backdrop" aria-hidden="true" />

      <TopActionRow
        selectedCollection={selectedCollection}
        selectedSite={selectedSite}
        selectedMapName={selectedMap?.name ?? null}
        onCreateClick={() => setShowNewMapModal(true)}
        onImportClick={() => setShowImportModal(true)}
        onExportNewTab={handleExportNewTab}
        onExportClipboard={handleExportClipboard}
        t1ProbeClient={client}
        t1ProbeSitecoreContextId={sitecoreContextId}
      />

      {/* Workspace hero zone — keyed on listRefreshKey so a Refresh click (or
          any write) remounts the subtree and the count-up + letter-reveal
          animations replay. */}
      <div key={`hero-${listRefreshKey}`}>
        <WorkspaceHero
          siteName={selectedSite?.displayName || selectedSite?.name || null}
          collectionName={selectedCollection?.name ?? null}
          siteInternalName={selectedSite?.name ?? null}
          siteLocales={selectedSite ? resolveSiteLocales(selectedSite, PUBLISH_LOCALE_SHORTHAND_ACCEPTED) : []}
          maps={maps}
          onRefresh={handleWriteSuccess}
          onSelectMap={handleMapSelect}
        />
      </div>

      {/* T027 — Manage/Test segmented tab control (below WorkspaceHero, above body content).
          Visual contract: pocs/poc-v1-prd004/index.html (Manage) + test-empty.html (Test).
          Uses role="tablist" buttons instead of Radix Tabs component so we can render
          body content outside the Tabs tree (conditional rendering pattern, ADR-0041). */}
      <div className="px-4 pt-3 pb-0 border-b border-border">
        <div
          role="tablist"
          aria-label="Workspace"
          className="inline-flex h-9 items-center"
        >
          <button
            role="tab"
            aria-selected={activeTab === "manage"}
            aria-controls="workspace-manage-panel"
            id="workspace-tab-manage"
            onClick={() => setActiveTab("manage")}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 font-medium whitespace-nowrap px-4 text-sm border-b-2 transition-colors",
              activeTab === "manage"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
            )}
          >
            Manage
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "test"}
            aria-controls="workspace-test-panel"
            id="workspace-tab-test"
            onClick={() => setActiveTab("test")}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 font-medium whitespace-nowrap px-4 text-sm border-b-2 transition-colors",
              activeTab === "test"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
            )}
          >
            Test
          </button>
        </div>
      </div>

      {/* Body — two-pane vs narrow-tabbed.
          In both cases the rail is always present across Manage and Test tabs.
          Only the main-panel content changes (detail in Manage, trace in Test).
          ADR-0041: activeTab lives here; rail is shared. */}
      {isTwoPane ? (
        <div className="flex flex-1 min-h-0 overflow-hidden fp-body">
          {/* Rail — always visible; readOnly when on Test tab */}
          <aside
            className="fp-rail w-[360px] shrink-0 border-r border-border flex flex-col overflow-hidden"
            aria-label="Redirect maps"
          >
            {buildRailContent(activeTab === "test")}
          </aside>

          {/* Main panel — switches on activeTab */}
          {activeTab === "test" ? (
            /* T030 — TestSurface right-panel (URL input + Test button + trace).
               Operator feedback 2026-05-28: dropped `overflow-auto` here — with the
               new toolbar split + grid trace cards, the inner scroll + page scroll
               showed a double scrollbar. Let the page scroll naturally for the Test
               tab; only one scrollbar surfaces. Manage tab keeps `overflow-auto`
               for the detail-pane scrolling pattern. */
            <main
              className="fp-main flex-1 flex flex-col"
              id="workspace-test-panel"
              role="tabpanel"
              aria-labelledby="workspace-tab-test"
            >
              <TestSurface
                siteLanguage={selectedSite?.languages?.[0] ?? "en"}
                maps={maps}
                lastTrace={lastTrace}
                onTraceComplete={setLastTrace}
                onRequestEditRow={handleRequestEditRow}
              />
            </main>
          ) : (
            <main
              className="fp-main flex-1 overflow-auto flex flex-col"
              id="workspace-manage-panel"
              role="tabpanel"
              aria-labelledby="workspace-tab-manage"
            >
              {/* Stat strip — real values (Mappings / 301 / 302 / Server Transfer /
                  Conflicts) computed from the maps state synced from
                  handleListLoaded. Keyed on listRefreshKey so a Refresh click
                  remounts the strip and the count-ups replay. */}
              <div key={`stats-${listRefreshKey}`}>
                <StatStrip
                  maps={maps}
                  onConflictsClick={() => setShowConflictsDialog(true)}
                />
              </div>
              <div className="flex-1 min-h-0">
                {detailContent}
              </div>
            </main>
          )}
        </div>
      ) : (
        /* Narrow (< 960px): tabbed Browse/Detail fallback — Manage only.
           Test tab is not accessible on narrow viewports in this iteration
           (operator scope: desktop-first marketplace app). */
        <Tabs defaultValue="browse" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-3 mt-2 self-start">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="detail">Detail</TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex flex-col flex-1 overflow-auto">{buildRailContent(false)}</div>
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

      {/* Conflicts resolver — opened from the warning Conflicts tile. */}
      <ConflictsDialog
        open={showConflictsDialog}
        onOpenChange={setShowConflictsDialog}
        maps={maps}
        onOpenMap={handleMapSelect}
      />
    </div>
  );
}
