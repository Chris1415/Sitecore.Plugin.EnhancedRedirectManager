/**
 * ContextPanel — T022–T030 orchestration
 *
 * Top-level container for the Context Panel extension point.
 * Handles all 6 states: loading, default (matched results), empty, error,
 * focus (keyboard-navigable list), success-toast (via Sonner after writes).
 *
 * Wiring:
 * - subscribePageContext (T013) → pageInfo.route is the matcher key (OQ-A closed 2026-05-11)
 * - listRedirectMaps (T011) → fetches all maps for the current site
 * - matchPageRedirects (T020) → groups by parent map
 * - After writes: reloadPagesCanvas (T015) + re-fetch
 *
 * WRITE NOTE (Tranche 6): write operations are assumed-shape pending real-tenant capture.
 * updateRedirectMap / createRedirectMap / deleteRedirectMap calls in handlers below are marked
 * with TODO comments. The actual GraphQL verb names and boolean field repr are unverified.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RegexBanner } from "@/components/context-panel/RegexBanner";
import { MatchedMapGroup } from "@/components/context-panel/MatchedMapGroup";
import { AddRedirectModal } from "@/components/context-panel/AddRedirectModal";
import { InlineEditForm } from "@/components/context-panel/InlineEditForm";
import { subscribePageContext, type PagesContext } from "@/lib/sdk/page-context";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { updateRedirectMap, createRedirectMap } from "@/lib/sdk/redirects-write";
import { reloadPagesCanvas } from "@/lib/sdk/canvas-reload";
import { matchPageRedirects } from "@/lib/match/context-panel-matcher";
import type { ClientSDK } from "@/lib/sdk/types";
import type { Mapping, RedirectMapItem, RedirectType } from "@/lib/domain/types";

// PLACEHOLDER — real GUIDs captured at T065
const PLACEHOLDER_TEMPLATE_ID = "{REDIRECT_MAP_TEMPLATE_GUID}";
const PLACEHOLDER_PARENT_ID = "{SETTINGS_REDIRECTS_FOLDER_GUID}";

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

export function ContextPanel({ client, sitecoreContextId }: ContextPanelProps) {
  const [pageCtx, setPageCtx] = useState<PagesContext | null>(null);
  const [maps, setMaps] = useState<RedirectMapItem[]>([]);
  const [status, setStatus] = useState<"loading" | "default" | "empty" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteConfirmState | null>(null);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const retryRef = useRef<HTMLButtonElement>(null);

  // Build sitePath from the current page context's siteInfo
  function buildSitePath(ctx: PagesContext): string {
    // siteInfo.name is used here — the full path requires knowing the collection
    // TODO (OQ-7 follow-up): derive collection name from listCollections if needed
    // For now, use a best-effort path using site name and startItemId
    const siteName = ctx.siteInfo?.name ?? "";
    // The startItemId is the Home item; parent 2 levels up would be the site root.
    // Real path format: /sitecore/content/<collection>/<site>/Settings/Redirects
    // We approximate using siteInfo.name only — operator may need to override.
    return `/sitecore/content/solo/${siteName}/Settings/Redirects`;
  }

  const fetchMaps = useCallback(
    async (ctx: PagesContext) => {
      setStatus("loading");
      setLoadError(null);
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
        // Focus Retry button on error
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

  async function refreshAfterWrite() {
    if (pageCtx) {
      await fetchMaps(pageCtx);
    }
    // Fire canvas reload (errors swallowed inside reloadPagesCanvas per T015)
    await reloadPagesCanvas(client);
  }

  // ---- Edit mapping handler ----
  async function handleSaveEdit(updated: Mapping) {
    if (!editState) return;
    const { mapId, mappingIndex, allMappings } = editState;
    const newMappings = [...allMappings];
    newMappings[mappingIndex] = updated;

    const map = maps.find((m) => m.id === mapId);
    if (!map) return;

    // TODO (Tranche 6): updateRedirectMap assumed-shape — verb/boolean repr unverified
    await updateRedirectMap(client, sitecoreContextId, {
      itemId: mapId,
      name: map.name,
      redirectType: map.redirectType,
      preserveQueryString: map.preserveQueryString,
      preserveLanguage: map.preserveLanguage,
      includeVirtualFolder: map.includeVirtualFolder,
      mappings: newMappings,
    });

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

    // Per US-3 AC: if parent map ends up with zero mappings, it remains intact.
    // TODO (Tranche 6): updateRedirectMap assumed-shape — verb/boolean repr unverified
    await updateRedirectMap(client, sitecoreContextId, {
      itemId: mapId,
      name: map.name,
      redirectType: map.redirectType,
      preserveQueryString: map.preserveQueryString,
      preserveLanguage: map.preserveLanguage,
      includeVirtualFolder: map.includeVirtualFolder,
      mappings: newMappings,
    });

    setDeleteState(null);
    toast.success("\u2713 Mapping deleted");
    await refreshAfterWrite();
  }

  // ---- Add to existing map ----
  async function handleAddToExistingMap(
    mapId: string,
    source: string,
    target: string,
    existingMap: RedirectMapItem
  ) {
    const newMappings = [...existingMap.mappings, { source, target }];
    // TODO (Tranche 6): updateRedirectMap assumed-shape — verb/boolean repr unverified
    await updateRedirectMap(client, sitecoreContextId, {
      itemId: mapId,
      name: existingMap.name,
      redirectType: existingMap.redirectType,
      preserveQueryString: existingMap.preserveQueryString,
      preserveLanguage: existingMap.preserveLanguage,
      includeVirtualFolder: existingMap.includeVirtualFolder,
      mappings: newMappings,
    });
    toast.success("\u2713 Redirect added");
  }

  // ---- Create new map ----
  async function handleCreateNewMap(attrs: {
    name: string;
    redirectType: RedirectType;
    preserveQueryString: boolean;
    preserveLanguage: boolean;
    includeVirtualFolder: boolean;
    source: string;
    target: string;
  }) {
    // TODO (Tranche 6): createRedirectMap assumed-shape — parentId/templateId are placeholders
    await createRedirectMap(client, sitecoreContextId, {
      name: attrs.name,
      redirectType: attrs.redirectType,
      preserveQueryString: attrs.preserveQueryString,
      preserveLanguage: attrs.preserveLanguage,
      includeVirtualFolder: attrs.includeVirtualFolder,
      mappings: [{ source: attrs.source, target: attrs.target }],
      parentId: PLACEHOLDER_PARENT_ID,
      templateId: PLACEHOLDER_TEMPLATE_ID,
    });
    toast.success("\u2713 Redirect map created");
  }

  return (
    <aside
      aria-label="Redirects affecting this page"
      className="flex flex-col gap-2 p-3 h-full overflow-y-auto"
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

      {/* Persistent regex banner — always visible */}
      <RegexBanner />

      {/* Page context callout */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>On</span>
        <span className="font-mono font-medium text-foreground">{pageRoute || "…"}</span>
      </div>

      <Separator />

      {/* State rendering */}
      {status === "loading" && <LoadingState />}

      {status === "error" && (
        <ErrorState
          error={loadError ?? "Unknown error"}
          expanded={errorExpanded}
          onToggleExpanded={() => setErrorExpanded((v) => !v)}
          onRetry={() => pageCtx && fetchMaps(pageCtx)}
          retryRef={retryRef}
        />
      )}

      {status === "empty" && (
        <EmptyState />
      )}

      {status === "default" && (
        <div className="space-y-3">
          {matchedGroups.map((group, groupIdx) => (
            <div key={group.map.id}>
              {groupIdx > 0 && <Separator className="my-2" />}
              <MatchedMapGroup
                map={group.map}
                matchedMappings={group.matchedMappings}
                pageRoute={pageRoute}
                onEditMapping={(mapping, idx) => {
                  // Find the true index in the full mappings array
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

      {/* Add button — shown in default and empty states */}
      {(status === "default" || status === "empty") && (
        <div className="mt-auto pt-2">
          <Separator className="mb-2" />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add redirect for this page
          </Button>
        </div>
      )}

      {/* Add redirect modal */}
      <AddRedirectModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        pageRoute={pageRoute}
        existingMaps={maps}
        onSuccess={refreshAfterWrite}
        onAddToExistingMap={handleAddToExistingMap}
        onCreateNewMap={handleCreateNewMap}
      />
    </aside>
  );
}

// ---- State sub-components ----

function LoadingState() {
  return (
    <div className="space-y-3">
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <span className="text-lg text-muted-foreground" aria-hidden="true">
          &#9744;
        </span>
      </div>
      <div>
        <p className="text-sm font-medium">No redirects affect this page</p>
        <p className="text-xs text-muted-foreground">Add the first one with the button below.</p>
      </div>
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
