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
 * The <aside> renders as complementary landmark for the rail.
 *
 * OQ-7: sitePath built as /sitecore/content/{collectionName}/{siteName}/Settings/Redirects
 * TODO (OQ-7): derive collection name from collection.name — using collection.name directly for now
 * per the convention established in DashboardWidget. Tranche 6 smoke may refine this.
 *
 * POC reference: full-page.html, full-page-empty-no-selection.html
 */

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopActionRow } from "@/components/full-page/TopActionRow";
import { CollectionPicker } from "@/components/full-page/CollectionPicker";
import { SitePicker } from "@/components/full-page/SitePicker";
import { RedirectMapList } from "@/components/full-page/RedirectMapList";
import { RedirectMapDetail } from "@/components/full-page/RedirectMapDetail";
import { Separator } from "@/components/ui/separator";
import type { ClientSDK, Sites } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";

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

  // Reset map selection when site changes — callback pattern to satisfy react-hooks/set-state-in-effect.
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

  // OQ-7: build sitePath from collection.name + site.name
  // TODO (OQ-7): collection.name comes from Sites SDK — using it directly.
  // The convention matches DashboardWidget: /sitecore/content/{collectionName}/{siteName}/Settings/Redirects
  const sitePath =
    selectedCollection && selectedSite
      ? `/sitecore/content/${selectedCollection.name}/${selectedSite.name}/Settings/Redirects`
      : null;

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
              onRetry={() => {}} // list re-fetches internally on retry
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
    <RedirectMapDetail selectedMap={selectedMap} />
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top action row — always visible */}
      <TopActionRow
        selectedCollection={selectedCollection}
        selectedSite={selectedSite}
        selectedMapName={selectedMap?.name ?? null}
      />

      {/* Body */}
      {isTwoPane ? (
        /* Two-pane layout ≥960px */
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside
            className="w-[280px] shrink-0 border-r border-border flex flex-col overflow-hidden"
            aria-label="Redirect maps"
          >
            {railContent}
          </aside>
          <main
            className="flex-1 overflow-auto"
            aria-label="Redirect map detail"
          >
            {detailContent}
          </main>
        </div>
      ) : (
        /* Tabbed fallback <960px */
        <Tabs defaultValue="browse" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-3 mt-2 self-start">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="detail">Detail</TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex flex-col flex-1 overflow-auto">
              {railContent}
            </div>
          </TabsContent>
          <TabsContent value="detail" className="flex-1 overflow-auto mt-0">
            {detailContent}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
