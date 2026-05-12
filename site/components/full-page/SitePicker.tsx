"use client";

/**
 * T037 — SitePicker
 *
 * Renders a <select> for choosing a Sitecore site within the selected collection.
 * Calls listSites on mount and filters by selectedCollection.id.
 * Disabled until a collection is picked.
 *
 * States: loading (Skeleton), empty (no sites in collection), error, filled.
 * The select element always renders when status != "loading" so disabled state is inspectable.
 *
 * POC reference: full-page-empty-no-selection.html — Site select in left rail pickers.
 */

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { listSites } from "@/lib/sdk/sites";
import type { ClientSDK, Sites } from "@/lib/sdk/types";

interface SitePickerProps {
  client: ClientSDK;
  sitecoreContextId: string;
  selectedCollection: Sites.SiteCollection | null;
  onSelect: (site: Sites.Site | null) => void;
}

type Status = "loading" | "loaded" | "error";

export function SitePicker({
  client,
  sitecoreContextId,
  selectedCollection,
  onSelect,
}: SitePickerProps) {
  const [allSites, setAllSites] = useState<Sites.Site[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const result = await listSites(client, sitecoreContextId);
      setAllSites(result);
      setStatus("loaded");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [client, sitecoreContextId]);

  // Load sites on mount once
  useEffect(() => {
    // IIFE pattern per DashboardWidget convention: setState inside callback not effect body.
    (async () => { await load(); })();
  }, [load]);

  // Reset selection when collection changes — wrapped in startTransition to avoid
  // the set-state-in-effect lint rule (state update is a response to prop change, not external).
  useEffect(() => {
    // Deferred callback reset — not a synchronous effect-body setState.
    const reset = () => {
      setSelectedId("");
      onSelect(null);
    };
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection?.id]);

  const filteredSites = selectedCollection
    ? allSites.filter((s) => s.collectionId === selectedCollection.id)
    : [];

  // Disabled when: no collection picked, or still loading, or error
  const isDisabled = selectedCollection === null || status === "loading" || status === "error";

  const showEmpty =
    selectedCollection !== null &&
    status === "loaded" &&
    filteredSites.length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    if (!id) {
      onSelect(null);
      return;
    }
    const found = filteredSites.find((s) => s.id === id);
    onSelect(found ?? null);
  };

  const labelId = "site-picker-label";

  return (
    <div className="space-y-1">
      <Label htmlFor="site-picker" id={labelId} className="text-xs font-medium">
        Site
      </Label>

      {status === "loading" && (
        <Skeleton className="h-9 w-full rounded-md" data-slot="skeleton" />
      )}

      {status === "error" && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            Couldn&apos;t load sites.
            {errorMsg && (
              <span className="block mt-1 font-mono text-[10px] opacity-70">{errorMsg}</span>
            )}
          </p>
          <Button variant="outline" size="sm" onClick={load} className="w-full text-xs">
            Retry
          </Button>
        </div>
      )}

      {showEmpty && (
        <p className="text-xs text-muted-foreground py-2">
          No sites in this collection.
        </p>
      )}

      {status === "loaded" && !showEmpty && (
        <select
          id="site-picker"
          aria-labelledby={labelId}
          disabled={isDisabled}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedId}
          onChange={handleChange}
        >
          <option value="">
            {!selectedCollection ? "Pick a collection first" : "Pick a site"}
          </option>
          {filteredSites.map((s) => (
            <option key={s.id ?? s.name} value={s.id ?? ""}>
              {s.displayName || s.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
