/**
 * ContextPanel — T027 (Epic E, T4) V4 composition
 *
 * V4 changes (T4):
 *   - ContextPanelHero mounted at top (count header + page route).
 *   - Hero summary tile inline (cp-summary).
 *   - QuickRedirectForm always-visible inline form replaces AddRedirectModal button.
 *   - MultiMatchDropdown integrated via QuickRedirectForm's multi-match state.
 *   - MatchedMapGroup re-skinned (cp-item anatomy, no status pill).
 *   - RegexBanner re-skinned (V4 alert chrome).
 *   - AddRedirectModal REMOVED from mount (file stays until T6 deletion).
 *   - .cp-shell surface class applied.
 *   - No PreviewDataBanner — Context Panel is real-data only per ADR-0025.
 *
 * Wiring (unchanged from PRD-000):
 * - subscribePageContext → pageInfo.route is the matcher key (OQ-A closed 2026-05-11)
 * - listRedirectMaps → fetches all maps for the current site
 * - matchPageRedirects → groups by parent map
 * - After writes: reloadPagesCanvas + re-fetch
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RotateCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContextPanelHero } from "@/components/context-panel/ContextPanelHero";
import { QuickRedirectForm, type QuickSubmitArgs } from "@/components/context-panel/QuickRedirectForm";
import { MatchedMapGroup } from "@/components/context-panel/MatchedMapGroup";
import { RegexBanner } from "@/components/context-panel/RegexBanner";
import { EditMapSettingsModal } from "@/components/context-panel/EditMapSettingsModal";
import { InlineEditForm } from "@/components/context-panel/InlineEditForm";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { subscribePageContext, type PagesContext } from "@/lib/sdk/page-context";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { updateRedirectMap, createRedirectMap } from "@/lib/sdk/redirects-write";
import {
  resolveItemIdByPath,
  discoverRedirectMapTemplateId,
} from "@/lib/sdk/redirects-discover";
import { reloadPagesCanvas } from "@/lib/sdk/canvas-reload";
import { matchPageRedirects } from "@/lib/match/context-panel-matcher";
import { useCountUp } from "@/hooks/use-count-up";
import type { ClientSDK } from "@/lib/sdk/types";
import type { Mapping, RedirectMapItem, RedirectType } from "@/lib/domain/types";

interface EditState {
  mapId: string;
  mappingIndex: number;
  mapping: Mapping;
  allMappings: Mapping[];
}

interface DeleteConfirmState {
  mapId: string;
  mappingIndex: number;
  allMappings: Mapping[];
  mapName: string;
}

export interface ContextPanelProps {
  client: ClientSDK;
  sitecoreContextId: string;
}

// ─── Hero summary tile ─────────────────────────────────────────────────────

/**
 * Two-column hero summary: inbound (other URLs redirect TO this page) and
 * outbound (this page redirects to other URLs). Mirrors the QuickRedirectForm
 * direction toggle so operators see both flows at a glance.
 */
function HeroSummaryTile({
  inboundCount,
  outboundCount,
}: {
  inboundCount: number;
  outboundCount: number;
}) {
  const animatedIn = useCountUp(inboundCount, { duration: 900 });
  const animatedOut = useCountUp(outboundCount, { duration: 900 });
  return (
    <div className="cp-summary cp-summary--split" role="group" aria-label="Redirect summary">
      <div className="cp-summary__col">
        <div className="cp-summary__value elev-count-up">{animatedIn}</div>
        <div className="cp-summary__label">
          <span aria-hidden="true">&rarr;</span> sources to this page
        </div>
      </div>
      <div className="cp-summary__col">
        <div className="cp-summary__value elev-count-up">{animatedOut}</div>
        <div className="cp-summary__label">
          this page <span aria-hidden="true">&rarr;</span> targets
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function ContextPanel({ client, sitecoreContextId }: ContextPanelProps) {
  const [pageCtx, setPageCtx] = useState<PagesContext | null>(null);
  const [maps, setMaps] = useState<RedirectMapItem[]>([]);
  const [status, setStatus] = useState<"loading" | "default" | "empty" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteConfirmState | null>(null);
  const [editingMapSettings, setEditingMapSettings] = useState<RedirectMapItem | null>(null);
  const [errorExpanded, setErrorExpanded] = useState(false);
  // Bumped on every fetchMaps invocation — used as the `key` of the hero
  // summary tile so its count-up animation replays from 0 on each refresh.
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const retryRef = useRef<HTMLButtonElement>(null);

  // Build sitePath from the current page context's siteInfo
  function buildSitePath(ctx: PagesContext): string {
    const siteName = ctx.siteInfo?.name ?? "";
    return `/sitecore/content/solo/${siteName}/Settings/Redirects`;
  }

  const fetchMaps = useCallback(
    async (ctx: PagesContext) => {
      setStatus("loading");
      setLoadError(null);
      setSummaryRefreshKey((k) => k + 1);
      try {
        const sitePath = buildSitePath(ctx);
        const fetched = await listRedirectMaps(client, sitecoreContextId, sitePath);
        setMaps(fetched);
        const pageRoute = ctx.pageInfo?.route ?? ctx.pageInfo?.url ?? "";
        const matched = matchPageRedirects(pageRoute, fetched);
        setStatus(matched.length > 0 ? "default" : "empty");
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
        setStatus("error");
        setTimeout(() => retryRef.current?.focus(), 50);
      }
    },
    [client, sitecoreContextId]
  );

  // Subscribe to page context changes
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        unsubscribe = await subscribePageContext(client, (ctx) => {
          if (!active) return;
          setPageCtx(ctx);
          fetchMaps(ctx);
        });
      } catch (err) {
        if (active) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        }
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [client, fetchMaps]);

  const pageRoute = pageCtx?.pageInfo?.route ?? pageCtx?.pageInfo?.url ?? "";
  const matchedGroups = matchPageRedirects(pageRoute, maps);

  // Split matched mappings by direction relative to the current page:
  //   inbound  = this page is the TARGET (other URL → this page)
  //   outbound = this page is the SOURCE (this page → other URL)
  const inboundCount = matchedGroups.reduce(
    (acc, g) => acc + g.matchedMappings.filter((m) => m.target === pageRoute).length,
    0,
  );
  const outboundCount = matchedGroups.reduce(
    (acc, g) => acc + g.matchedMappings.filter((m) => m.source === pageRoute).length,
    0,
  );

  async function refreshAfterWrite() {
    if (pageCtx) {
      await fetchMaps(pageCtx);
    }
    await reloadPagesCanvas(client);
  }

  // ---- Edit mapping handler ----
  async function handleSaveEdit(updated: Mapping) {
    if (!editState) return;
    const { mapId, mappingIndex, allMappings } = editState;

    // In-map duplicate-source guard: a single Redirect Map cannot have two
    // mappings with the same source URL. The server dedupes silently, so we
    // catch it client-side and surface a clear error. Cross-map collisions
    // are surfaced separately via the Conflicts dialog on Full Page.
    const trimmedSource = updated.source.trim();
    const dupIdx = allMappings.findIndex(
      (m, i) => i !== mappingIndex && m.source === trimmedSource,
    );
    if (dupIdx !== -1) {
      toast.error(`Another mapping in this map already uses source "${trimmedSource}"`);
      return;
    }

    const newMappings = [...allMappings];
    newMappings[mappingIndex] = updated;

    const map = maps.find((m) => m.id === mapId);
    if (!map) return;

    const result = await updateRedirectMap(client, sitecoreContextId, {
      itemId: mapId,
      name: map.name,
      redirectType: map.redirectType,
      preserveQueryString: map.preserveQueryString,
      preserveLanguage: map.preserveLanguage,
      includeVirtualFolder: map.includeVirtualFolder,
      mappings: newMappings,
    });
    if (!result.ok) {
      toast.error("Update failed");
      return;
    }

    setEditState(null);
    toast.success("\u2713 Mapping updated");
    await refreshAfterWrite();
  }

  // ---- Delete confirm handler ----
  async function handleConfirmDelete() {
    if (!deleteState) return;
    const { mapId, mappingIndex, allMappings } = deleteState;
    const newMappings = allMappings.filter((_, i) => i !== mappingIndex);

    const map = maps.find((m) => m.id === mapId);
    if (!map) return;

    const result = await updateRedirectMap(client, sitecoreContextId, {
      itemId: mapId,
      name: map.name,
      redirectType: map.redirectType,
      preserveQueryString: map.preserveQueryString,
      preserveLanguage: map.preserveLanguage,
      includeVirtualFolder: map.includeVirtualFolder,
      mappings: newMappings,
    });
    if (!result.ok) {
      toast.error("Delete failed");
      return;
    }

    setDeleteState(null);
    toast.success("\u2713 Mapping deleted");
    await refreshAfterWrite();
  }

  // ---- Add to existing map (carry from PRD-000 duplicate-guard logic) ----
  async function handleAddToExistingMap(
    mapId: string,
    source: string,
    target: string,
    _existingMap: RedirectMapItem,
  ) {
    void _existingMap;
    if (!pageCtx) throw new Error("Page context not loaded yet.");
    const sitePath = buildSitePath(pageCtx);
    const freshMaps = await listRedirectMaps(client, sitecoreContextId, sitePath);
    const freshMap = freshMaps.find((m) => m.id === mapId);
    if (!freshMap) {
      throw new Error("This map no longer exists. Refresh and try again.");
    }
    if (freshMap.mappings.some((m) => m.source === source)) {
      throw new Error(`A redirect with source "${source}" already exists in this map.`);
    }
    const newMappings = [...freshMap.mappings, { source, target }];
    const result = await updateRedirectMap(client, sitecoreContextId, {
      itemId: mapId,
      name: freshMap.name,
      redirectType: freshMap.redirectType,
      preserveQueryString: freshMap.preserveQueryString,
      preserveLanguage: freshMap.preserveLanguage,
      includeVirtualFolder: freshMap.includeVirtualFolder,
      mappings: newMappings,
    });
    if (!result.ok) throw new Error("Server rejected the update.");
  }

  // ---- Create new map ----
  async function handleCreateNewMap(attrs: {
    name: string;
    redirectType: RedirectType;
    source: string;
    target: string;
  }) {
    if (!pageCtx) throw new Error("Page context not loaded yet.");
    const sitePath = buildSitePath(pageCtx);
    const parentId = await resolveItemIdByPath(client, sitecoreContextId, sitePath);
    if (!parentId) {
      throw new Error(`Settings/Redirects folder not found at ${sitePath}.`);
    }
    const templateId = await discoverRedirectMapTemplateId(
      client,
      sitecoreContextId,
      parentId,
    );
    if (!templateId) {
      throw new Error(
        "No existing Redirect Map under the site — create the first one manually in Sitecore CMS so the template GUID becomes discoverable.",
      );
    }
    const result = await createRedirectMap(client, sitecoreContextId, {
      name: attrs.name,
      redirectType: attrs.redirectType,
      preserveQueryString: false,
      preserveLanguage: false,
      includeVirtualFolder: false,
      mappings: [{ source: attrs.source, target: attrs.target }],
      parentId,
      templateId,
    });
    if (!result.ok) throw new Error("Server rejected the create.");
  }

  // ---- Edit map-level settings ----
  async function handleSaveMapSettings(attrs: {
    name: string;
    redirectType: RedirectType;
    preserveQueryString: boolean;
    preserveLanguage: boolean;
    includeVirtualFolder: boolean;
  }) {
    if (!editingMapSettings) return;
    await updateRedirectMap(client, sitecoreContextId, {
      itemId: editingMapSettings.id,
      name: attrs.name,
      redirectType: attrs.redirectType,
      preserveQueryString: attrs.preserveQueryString,
      preserveLanguage: attrs.preserveLanguage,
      includeVirtualFolder: attrs.includeVirtualFolder,
      mappings: editingMapSettings.mappings,
    });
    setEditingMapSettings(null);
    toast.success("\u2713 Map settings updated");
    await refreshAfterWrite();
  }

  // ---- QuickRedirectForm submit dispatcher ----
  async function handleQuickSubmit(args: QuickSubmitArgs) {
    try {
      if (args.mode === "create-new") {
        await handleCreateNewMap({
          name: args.name,
          redirectType: args.redirectType,
          source: args.source,
          target: args.target,
        });
        toast.success(`\u2713 Created ${args.name} with one redirect.`);
      } else {
        const existingMap = maps.find((m) => m.id === args.mapId);
        await handleAddToExistingMap(args.mapId, args.source, args.target, existingMap!);
        const mapName = existingMap?.name ?? args.mapId;
        toast.success(`\u2713 Redirect added to ${mapName}.`);
      }
      await refreshAfterWrite();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      // Re-throw so QuickRedirectForm preserves entered values
      throw err;
    }
  }

  const pageInfo = { url: pageRoute || "…" };

  return (
    <aside
      aria-label="Redirects affecting this page"
      className="cp-shell flex flex-col gap-0 h-full overflow-y-auto"
    >
      {/* Live region for state announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {status === "loading" ? "Loading redirects" : ""}
      </div>

      {/* V4: ContextPanelHero — page-route headline (counts live in HeroSummaryTile) */}
      <ContextPanelHero
        pageUrl={pageRoute || "…"}
        isEmpty={inboundCount + outboundCount === 0}
      />

      {/* Panel body */}
      <div className="cp-body flex-1 overflow-y-auto">
        {/* Toolbar row — info banner + actions on a single line. */}
        <div className="cp-toolbar-row">
          <RegexBanner />
          <div className="cp-toolbar-row__actions">
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => pageCtx && fetchMaps(pageCtx)}
              disabled={status === "loading" || !pageCtx}
              aria-label="Refresh redirects"
              title="Refresh"
            >
              <RotateCw
                className={cn("h-4 w-4", status === "loading" && "animate-spin")}
                aria-hidden="true"
              />
            </Button>
            <ThemeSwitcher />
          </div>
        </div>

        <Separator className="my-2" />

        {/* State rendering. On refresh (status === "loading" with prior maps),
         * keep the previous content visible — the refresh button's spin
         * animation is the work indicator. Only the very first load (no maps
         * yet) shows the skeleton. */}
        {status === "loading" && maps.length === 0 && <LoadingState />}

        {status === "error" && (
          <ErrorState
            error={loadError ?? "Unknown error"}
            expanded={errorExpanded}
            onToggleExpanded={() => setErrorExpanded((v) => !v)}
            onRetry={() => pageCtx && fetchMaps(pageCtx)}
            retryRef={retryRef}
          />
        )}

        {/* Hero summary tile — shown whenever we have content (or are
         * refreshing on top of prior content). Keyed on summaryRefreshKey so
         * each refresh re-mounts the tile and the two count-ups replay from 0. */}
        {(status === "default" ||
          status === "empty" ||
          (status === "loading" && maps.length > 0)) && (
          <HeroSummaryTile
            key={`summary-${summaryRefreshKey}`}
            inboundCount={inboundCount}
            outboundCount={outboundCount}
          />
        )}

        {/* QuickRedirectForm — always visible in default + empty + refresh-with-data */}
        {(status === "default" ||
          status === "empty" ||
          (status === "loading" && maps.length > 0)) && (
          <QuickRedirectForm
            pageInfo={pageInfo}
            matchedGroups={matchedGroups}
            onSubmit={handleQuickSubmit}
          />
        )}

        {/* Matched redirect rows — show whenever we have matched groups,
         * including during refresh-with-data. */}
        {(status === "default" ||
          (status === "loading" && matchedGroups.length > 0)) && (
          <div className="space-y-3">
            {/* List header */}
            <div className="cp-list__head">
              <span className="cp-list__head-label">Existing redirects</span>
              <span className="text-xs text-muted-foreground font-mono">
                {matchedGroups.reduce((acc, g) => acc + g.matchedMappings.length, 0)}
              </span>
            </div>

            {matchedGroups.map((group, groupIdx) => (
              <div key={group.map.id}>
                {groupIdx > 0 && <Separator className="my-2" />}
                <MatchedMapGroup
                  map={group.map}
                  matchedMappings={group.matchedMappings}
                  pageRoute={pageRoute}
                  onEditMapSettings={(m) => setEditingMapSettings(m)}
                  onEditMapping={(mapping, idx) => {
                    const fullIdx = group.map.mappings.findIndex(
                      (m) => m.source === mapping.source && m.target === mapping.target
                    );
                    setEditState({
                      mapId: group.map.id,
                      mappingIndex: fullIdx >= 0 ? fullIdx : idx,
                      mapping,
                      allMappings: group.map.mappings,
                    });
                  }}
                  onDeleteMapping={(mapping, idx) => {
                    const fullIdx = group.map.mappings.findIndex(
                      (m) => m.source === mapping.source && m.target === mapping.target
                    );
                    setDeleteState({
                      mapId: group.map.id,
                      mappingIndex: fullIdx >= 0 ? fullIdx : idx,
                      allMappings: group.map.mappings,
                      mapName: group.map.name,
                    });
                  }}
                />

                {/* Inline edit form for this group */}
                {editState?.mapId === group.map.id && (
                  <div className="mt-1 rounded-md border p-2">
                    <InlineEditForm
                      initialSource={editState.mapping.source}
                      initialTarget={editState.mapping.target}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditState(null)}
                    />
                  </div>
                )}

                {/* Inline delete confirm for this group */}
                {deleteState?.mapId === group.map.id && (
                  <div className="mt-1 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                    <p className="text-xs">Delete this mapping?</p>
                    <div className="mt-1 flex gap-2">
                      <Button
                        size="sm"
                        colorScheme="danger"
                        className="h-6 text-xs px-2"
                        onClick={handleConfirmDelete}
                      >
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        onClick={() => setDeleteState(null)}
                      >
                        No
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Open full workspace CTA — also visible during refresh-with-data */}
        {(status === "default" ||
          status === "empty" ||
          (status === "loading" && maps.length > 0)) && (
          <div className="mt-auto pt-4">
            <Separator className="mb-3" />
            <a
              href="/full-page"
              className="cp-cta"
              aria-label="Open full workspace"
            >
              <span className="cp-cta__left text-sm font-medium">
                Open full workspace
              </span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        )}
      </div>

      {/* Edit map settings modal */}
      <EditMapSettingsModal
        open={editingMapSettings !== null}
        onOpenChange={(o) => {
          if (!o) setEditingMapSettings(null);
        }}
        map={editingMapSettings}
        onSave={handleSaveMapSettings}
      />

      {/* AddRedirectModal removed entirely per ADR-0028 Option A.
          The inline QuickRedirectForm above is the front door for add-redirect.
          Full-flag-control "create new map" path lives at Full Page workspace. */}
    </aside>
  );
}

// ---- State sub-components ----

function LoadingState() {
  return (
    <div className="space-y-3 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  error,
  expanded,
  onToggleExpanded,
  onRetry,
  retryRef,
}: {
  error: string;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRetry: () => void;
  retryRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
    >
      <div className="flex items-start gap-2">
        <span className="text-destructive" aria-hidden="true">
          {"\u2715"}
        </span>
        <div className="flex-1 space-y-2">
          <p className="font-medium">Couldn&apos;t load redirects for this page.</p>
          <Collapsible open={expanded} onOpenChange={onToggleExpanded}>
            <CollapsibleTrigger asChild>
              <button className="text-xs text-muted-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {expanded ? "Hide technical details" : "Show technical details"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-1 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                {error}
              </pre>
            </CollapsibleContent>
          </Collapsible>
          <Button
            ref={retryRef}
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="mt-1"
          >
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}
