"use client";

/**
 * T036 — CollectionPicker
 *
 * Renders a <select> (native, accessible) for choosing a Sitecore site collection.
 * Calls listCollections on mount. Parent is notified via onSelect callback.
 *
 * States: loading (Skeleton), empty, error, filled.
 *
 * POC reference: full-page-empty-no-selection.html — left rail pickers section.
 */

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listCollections } from "@/lib/sdk/sites";
import type { ClientSDK, Sites } from "@/lib/sdk/types";

interface CollectionPickerProps {
  client: ClientSDK;
  sitecoreContextId: string;
  onSelect: (collection: Sites.SiteCollection | null) => void;
}

type Status = "loading" | "loaded" | "empty" | "error";

export function CollectionPicker({
  client,
  sitecoreContextId,
  onSelect,
}: CollectionPickerProps) {
  const [collections, setCollections] = useState<Sites.SiteCollection[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  const load = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const result = await listCollections(client, sitecoreContextId);
      setCollections(result);
      setStatus(result.length === 0 ? "empty" : "loaded");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [client, sitecoreContextId]);

  useEffect(() => {
    // IIFE pattern: setState calls happen inside the async callback, not directly in the effect body.
    // Matches DashboardWidget / ContextPanel pattern to satisfy react-hooks/set-state-in-effect.
    (async () => { await load(); })();
  }, [load]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    if (!id) {
      onSelect(null);
      return;
    }
    const found = collections.find((c) => c.id === id);
    onSelect(found ?? null);
  };

  const labelId = "collection-picker-label";

  return (
    <div className="space-y-1">
      <Label htmlFor="collection-picker" id={labelId} className="text-xs font-medium">
        Collection
      </Label>

      {status === "loading" && (
        <Skeleton className="h-9 w-full rounded-md" data-slot="skeleton" />
      )}

      {status === "empty" && (
        <p className="text-xs text-muted-foreground py-2">
          No collections found. Check Cloud Portal access.
        </p>
      )}

      {status === "error" && (
        <div className="space-y-1">
          <p className="text-xs text-destructive">
            Couldn&apos;t load collections.
          </p>
          <Alert variant="danger" className="py-2">
            <AlertDescription className="text-xs font-mono">{errorMsg}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={load} className="w-full text-xs">
            Retry
          </Button>
        </div>
      )}

      {status === "loaded" && (
        <select
          id="collection-picker"
          aria-labelledby={labelId}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedId}
          onChange={handleChange}
        >
          <option value="">Pick a collection</option>
          {collections.map((c) => (
            <option key={c.id ?? c.name} value={c.id ?? ""}>
              {c.displayName || c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
