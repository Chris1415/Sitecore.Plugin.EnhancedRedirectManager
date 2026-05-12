/**
 * InlineEditForm — T025
 *
 * Small inline form for editing a single mapping row.
 * Source + target inputs; save validation (both non-empty).
 * Dirty-cancel triggers confirm prompt; pristine-cancel closes silently.
 *
 * WRITE NOTE (Tranche 6): write operations hit the gateway via redirects-write.ts.
 * The mutation verb names and boolean field representation are assumed-shape pending
 * real-tenant capture at T065. Marked with TODO comments below.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Mapping } from "@/lib/domain/types";

interface InlineEditFormProps {
  initialSource: string;
  initialTarget: string;
  onSave: (updated: Mapping) => Promise<void>;
  onCancel: () => void;
}

export function InlineEditForm({
  initialSource,
  initialTarget,
  onSave,
  onCancel,
}: InlineEditFormProps) {
  const [source, setSource] = useState(initialSource);
  const [target, setTarget] = useState(initialTarget);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = source !== initialSource || target !== initialTarget;
  const isValid = source.trim().length > 0 && target.trim().length > 0;

  function handleCancel() {
    if (isDirty) {
      if (window.confirm("Discard unsaved changes?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }

  async function handleSave() {
    if (!isValid) {
      setError("Both source and target are required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ source: source.trim(), target: target.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  if (saving) {
    // Optimistic skeleton for 200–300 ms per T025 spec
    return (
      <div className="flex items-center gap-1 py-0.5" aria-busy="true" aria-label="Saving…">
        <Skeleton className="h-5 flex-1" />
        <Skeleton className="h-5 w-12" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-0.5">
      <div className="flex items-center gap-1">
        <Input
          aria-label="Redirect source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="h-6 font-mono text-xs"
          autoFocus
        />
        <span className="text-muted-foreground text-xs" aria-hidden="true">
          {"\u2192"}
        </span>
        <Input
          aria-label="Redirect target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-6 font-mono text-xs"
        />
      </div>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={handleSave} disabled={!isValid} className="h-6 text-xs px-2">
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-6 text-xs px-2">
          Cancel
        </Button>
      </div>
    </div>
  );
}
