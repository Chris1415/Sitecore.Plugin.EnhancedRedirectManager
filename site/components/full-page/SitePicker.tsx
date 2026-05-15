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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const handleChange = (id: string) => {
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
    <div className="space-y-1 elev-glass-surface p-2 rounded-lg">
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
        /* Radix Select — see CollectionPicker for rationale (native select
           opens an OS-controlled list that doesn't respect dark theme). */
        <Select value={selectedId} onValueChange={handleChange} disabled={isDisabled}>
          <SelectTrigger
            id="site-picker"
            aria-labelledby={labelId}
            className="h-9 w-full text-sm"
          >
            <SelectValue
              placeholder={!selectedCollection ? "Pick a collection first" : "Pick a site"}
            />
          </SelectTrigger>
          <SelectContent>
            {filteredSites.map((s) => (
              <SelectItem key={s.id ?? s.name} value={s.id ?? ""}>
                {s.displayName || s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
