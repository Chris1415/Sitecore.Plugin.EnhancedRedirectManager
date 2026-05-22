"use client";

/**
 * EditRowModal.tsx — Blok dialog for editing a single redirect mapping row.
 *
 * ADR-0043: This modal REPLACES the inline row editing in RedirectMapDetail entirely.
 *           One way to edit. No UX duality.
 *
 * ADR-0040: Mode is transient UI state. Defaults to 'pattern' on every modal open.
 *           Never persisted to Sitecore. Inline mode-mismatch hint removed
 *           2026-05-21 (operator UX feedback — simplification pass).
 *
 * STRUCTURAL GUARD (T045 / FR-A8 / ADR-0043):
 *   This file MUST NOT contain RedirectType, IncludeVirtualFolder,
 *   PreserveQueryString, or PreserveLanguage references as rendered controls.
 *   Those are map-level SHARED fields owned by the existing map-settings UI.
 *
 * Removed in 2026-05-21 simplification (operator UX feedback after visual smoke):
 *   - Snippet library (5 patterns)
 *   - Capture-group chips ($1, $2, $siteLang)
 *   - Live regex sample-URL tester subform
 *   - Inline mode-mismatch hint (This pattern looks like a plain URL...)
 *
 * Layout (top -> bottom):
 *   1. Mode toggle (Pattern / Regex segmented control, full-width above source)
 *   2. Source input (font-mono)
 *   3. Destination input (font-mono)
 *   4. Footer: Cancel (secondary) + Save (primary)
 */

import { useState, useCallback, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRedirectMap } from "@/lib/sdk/redirects-write";
import type { ClientSDK } from "@/lib/sdk/types";
import type { RedirectMapItem } from "@/lib/domain/types";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Mode = "pattern" | "regex";

interface EditRowModalState {
  source: string;
  target: string;
  /** Transient mode — defaults to 'pattern' on every open (ADR-0040 / FR-A2). */
  mode: Mode;
}

export interface EditRowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientSDK;
  sitecoreContextId: string;
  map: RedirectMapItem;
  /** Integer = edit-existing-row; "new" = add-row mode. */
  rowIndex: number | "new";
  onSaved: (updatedMap: RedirectMapItem) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count capturing groups in a regex source string. Used for save-time validation (FR-A5 / AC-R1.6). */
function countCapturingGroups(source: string): number {
  try {
    return (new RegExp(source).source.match(/\((?!\?)/g) ?? []).length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

/** Full-width Pattern / Regex segmented mode toggle (ADR-0040 / FR-A2). */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Source mode"
      className="flex w-full rounded-md border border-border overflow-hidden text-sm"
    >
      <button
        type="button"
        data-mode="pattern"
        className={[
          "mode-toggle__btn flex-1 py-1.5 px-3 text-center transition-colors",
          mode === "pattern"
            ? "bg-primary text-primary-foreground font-medium"
            : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
        ].join(" ")}
        onClick={() => onChange("pattern")}
        aria-pressed={mode === "pattern"}
      >
        Pattern
      </button>
      <button
        type="button"
        data-mode="regex"
        className={[
          "mode-toggle__btn flex-1 py-1.5 px-3 text-center transition-colors border-l border-border",
          mode === "regex"
            ? "bg-primary text-primary-foreground font-medium"
            : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
        ].join(" ")}
        onClick={() => onChange("regex")}
        aria-pressed={mode === "regex"}
      >
        Regex
      </button>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Save-time validation helpers
// ---------------------------------------------------------------------------

interface ValidationError {
  field: "source" | "target";
  message: string;
}

function validateSaveTime(
  source: string,
  target: string,
  mode: Mode,
): ValidationError | null {
  if (mode === "regex") {
    // FR-A5 / AC-R1.5 — invalid regex blocks save
    try {
      new RegExp(source);
    } catch (e) {
      return {
        field: "source",
        message: `Invalid regex: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    // FR-A5 / AC-R1.6 — capture-group reference cross-check (advisory; known v0 limitations)
    const refs = [...target.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    const groupCount = countCapturingGroups(source);

    for (const ref of refs) {
      if (ref === 0) {
        return {
          field: "target",
          message: "$0 is not supported; use $1+ for capture groups",
        };
      }
      if (ref > groupCount) {
        return {
          field: "target",
          message: `Destination references $${ref} but source has only ${groupCount} capture group${groupCount === 1 ? "" : "s"}`,
        };
      }
    }
    // $siteLang is exempt from the count cross-check (FR-A7)
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EditRowModal(props: EditRowModalProps) {
  const { open, rowIndex, map } = props;

  // Use a key derived from open + rowIndex + map.id so that the inner form
  // remounts fresh on every (open, row) pair — guarantees mode resets to
  // 'pattern' on every open (ADR-0040 / FR-A2) without setState-in-effect.
  const formKey = open ? `${map.id}:${String(rowIndex)}` : "closed";

  return (
    <EditRowModalInner key={formKey} {...props} />
  );
}

function EditRowModalInner({
  open,
  onOpenChange,
  client,
  sitecoreContextId,
  map,
  rowIndex,
  onSaved,
}: EditRowModalProps) {
  const isNew = rowIndex === "new";
  const originalRow = isNew ? null : map.mappings[rowIndex as number] ?? null;

  // Modal state — mode always resets to 'pattern' on every open (ADR-0040 / FR-A2).
  // This is guaranteed because the parent remounts EditRowModalInner via key on each open.
  const [state, setState] = useState<EditRowModalState>({
    source: originalRow?.source ?? "",
    target: originalRow?.target ?? "",
    mode: "pattern",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ValidationError | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // No useEffect-based reset needed — key-based remount handles it.

  const sourceErrorId = useId();
  const targetErrorId = useId();

  function isDirty(): boolean {
    const origSource = originalRow?.source ?? "";
    const origTarget = originalRow?.target ?? "";
    return state.source !== origSource || state.target !== origTarget;
  }

  function handleModeChange(m: Mode) {
    setState((s) => ({ ...s, mode: m }));
    setSaveError(null);
  }

  function handleClose() {
    if (isDirty()) {
      setShowUnsavedConfirm(true);
    } else {
      onOpenChange(false);
    }
  }

  function handleConfirmDiscard() {
    setShowUnsavedConfirm(false);
    onOpenChange(false);
  }

  const handleSave = useCallback(async () => {
    const trimmedSource = state.source.trim();
    const trimmedTarget = state.target.trim();

    if (!trimmedSource || !trimmedTarget) {
      toast.error("Source and target are required");
      return;
    }

    // Save-time validation (T023 / FR-A5)
    const validationError = validateSaveTime(trimmedSource, trimmedTarget, state.mode);
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSaveError(null);

    // Build the new mappings array
    let newMappings: Array<{ source: string; target: string }>;
    if (isNew) {
      // Check for duplicate source
      if (map.mappings.some((m) => m.source === trimmedSource)) {
        toast.error(`A mapping with source "${trimmedSource}" already exists`);
        return;
      }
      newMappings = [...map.mappings, { source: trimmedSource, target: trimmedTarget }];
    } else {
      const idx = rowIndex as number;
      // Check for duplicate source (different row)
      const duplicateRow = map.mappings.findIndex(
        (m, i) => i !== idx && m.source === trimmedSource,
      );
      if (duplicateRow !== -1) {
        toast.error(`Another mapping already uses source "${trimmedSource}"`);
        return;
      }
      newMappings = map.mappings.map((m, i) =>
        i === idx ? { source: trimmedSource, target: trimmedTarget } : m,
      );
    }

    setSaving(true);
    try {
      const result = await updateRedirectMap(client, sitecoreContextId, {
        itemId: map.id,
        name: map.name,
        redirectType: map.redirectType,
        preserveQueryString: map.preserveQueryString,
        preserveLanguage: map.preserveLanguage,
        includeVirtualFolder: map.includeVirtualFolder,
        mappings: newMappings,
      });

      if (result.ok) {
        const updatedMap: RedirectMapItem = {
          ...map,
          mappings: newMappings,
        };
        toast.success(isNew ? "Mapping added" : "Mapping updated");
        onSaved(updatedMap);
        onOpenChange(false);
      } else {
        toast.error("Save failed", { description: "The server returned no itemId." });
      }
    } catch (error) {
      toast.error("Save failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }, [state, isNew, map, rowIndex, client, sitecoreContextId, onSaved, onOpenChange]);

  const title = isNew ? "Add mapping" : "Edit mapping";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent size="md" className="edit-row-modal gap-5">
          {/* Close button is rendered by DialogContent; data-testid for tests */}
          <button
            type="button"
            className="edit-row-modal__close sr-only"
            aria-label="Close dialog"
            tabIndex={-1}
            onClick={handleClose}
          />

          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* 1. Mode toggle */}
            <ModeToggle mode={state.mode} onChange={handleModeChange} />

            {/* 2. Source input */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-row-source">Source</Label>
              <Input
                id="edit-row-source"
                value={state.source}
                onChange={(e) => {
                  setState((s) => ({ ...s, source: e.target.value }));
                  setSaveError(null);
                }}
                placeholder={state.mode === "regex" ? "^/blog/(.+)$" : "/old-path"}
                className="font-mono text-sm"
                disabled={saving}
                aria-describedby={saveError?.field === "source" ? sourceErrorId : undefined}
              />
              {saveError?.field === "source" && (
                <p
                  id={sourceErrorId}
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {saveError.message}
                </p>
              )}

              {/* Compact regex cheatsheet — only shown in Regex mode */}
              {state.mode === "regex" && (
                <div
                  className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5"
                  aria-label="Regex cheatsheet"
                >
                  <p className="font-medium text-foreground">Regex cheatsheet</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    <dt className="font-mono text-foreground">^…$</dt>
                    <dd>anchor start and end (exact match)</dd>
                    <dt className="font-mono text-foreground">(…)</dt>
                    <dd>capture group — reference in destination as <code className="font-mono">$1</code>, <code className="font-mono">$2</code>, …</dd>
                    <dt className="font-mono text-foreground">.+</dt>
                    <dd>one or more of any character</dd>
                    <dt className="font-mono text-foreground">\.</dt>
                    <dd>literal dot (escape)</dd>
                    <dt className="font-mono text-foreground">[a-z]</dt>
                    <dd>character class</dd>
                    <dt className="font-mono text-foreground">a|b</dt>
                    <dd>alternation (a or b)</dd>
                  </dl>
                  <p>
                    In the destination: <code className="font-mono text-foreground">$1</code>, <code className="font-mono text-foreground">$2</code> reference captures; <code className="font-mono text-foreground">$siteLang</code> inserts the current site language.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Destination input */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-row-target">Destination</Label>
              <Input
                id="edit-row-target"
                value={state.target}
                onChange={(e) => {
                  setState((s) => ({ ...s, target: e.target.value }));
                  setSaveError(null);
                }}
                placeholder={state.mode === "regex" ? "/articles/$1" : "/new-path"}
                className="font-mono text-sm"
                disabled={saving}
                aria-describedby={saveError?.field === "target" ? targetErrorId : undefined}
              />
              {saveError?.field === "target" && (
                <p
                  id={targetErrorId}
                  className="text-xs text-destructive"
                  role="alert"
                >
                  {saveError.message}
                </p>
              )}
            </div>
          </div>

          {/* 4. Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="save-btn"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved-changes confirm dialog */}
      <AlertDialog open={showUnsavedConfirm} onOpenChange={setShowUnsavedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this mapping. Closing the dialog will
              discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDiscard}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
