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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const handleChange = (id: string) => {
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
    <div className="space-y-1 elev-glass-surface p-2 rounded-lg">
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
        /* Radix Select — owned popover renders in the React tree so it picks
           up the dark theme. Native <select> opens an OS-controlled list that
           ignores CSS and renders white on dark. */
        <Select value={selectedId} onValueChange={handleChange}>
          <SelectTrigger
            id="collection-picker"
            aria-labelledby={labelId}
            className="h-9 w-full text-sm"
          >
            <SelectValue placeholder="Pick a collection" />
          </SelectTrigger>
          <SelectContent>
            {collections.map((c) => (
              <SelectItem key={c.id ?? c.name} value={c.id ?? ""}>
                {c.displayName || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
