"use client";

/**
 * RedirectMapDetail.tsx — Right pane content; editable redirect map view.
 *
 * T017 (PRD-004): Rewired row click → EditRowModal (ADR-0043).
 *   - DELETED the existing inline row-edit affordance (Input cells + Check/X icons).
 *   - "+ Add mapping" button now opens EditRowModal in add-row mode.
 *   - Added forwardRef imperative handle { startEditRow(rowIndex: number) } so
 *     FullPage's Test→Manage deep-link (T039) can drive it from the Test surface.
 *   - Map-level controls (name rename, RedirectType dropdown, flag checkboxes,
 *     delete map button) are UNTOUCHED.
 *
 * Visual contract: pocs/poc-v1-prd004/rowedit-pattern.html (row click opens modal).
 *
 * Edit affordances:
 *   - Click map name → inline rename (renameRedirectMap mutation, separate from updateItem).
 *   - RedirectType dropdown → updateRedirectMap.
 *   - Flag checkboxes → updateRedirectMap.
 *   - Mappings table: each row opens EditRowModal on click.
 *   - "+ Add mapping" opens EditRowModal in add-row mode.
 *   - Delete map button in header (opens DeleteMapConfirmModal at parent level).
 *
 * Verified against real-tenant capture 2026-05-11 (Tranche 6a).
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditRowModal } from "@/components/EditRowModal";
import { parseSitecoreCompactDate } from "@/lib/domain/sitecore-date";
import {
  REDIRECT_TYPES,
  redirectTypeDisplayName,
} from "@/lib/redirects/redirect-type-enum";
import {
  updateRedirectMap,
  renameRedirectMap,
} from "@/lib/sdk/redirects-write";
import type { ClientSDK } from "@/lib/sdk/types";
import type { Mapping, RedirectMapItem, RedirectType } from "@/lib/domain/types";
import { Inbox, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Imperative handle — exposed via forwardRef for Test→Manage deep-link (T039)
// ---------------------------------------------------------------------------

export interface RedirectMapDetailHandle {
  /** Open the EditRowModal for the given row index. Validates the index first.
   *  If invalid (row deleted since last simulate), toasts and returns silently. */
  startEditRow(rowIndex: number): void;
}

interface RedirectMapDetailProps {
  client: ClientSDK;
  sitecoreContextId: string;
  selectedMap: RedirectMapItem | null;
  hasSitePicked?: boolean;
  /** Called after any successful write so the parent can refetch and refresh. */
  onWriteSuccess: () => void;
  /** Called when the operator clicks the Delete-map button. Parent opens the confirm modal. */
  onDeleteRequested: () => void;
}

/** Format updatedAt (Sitecore compact) with Intl.DateTimeFormat short style. */
function formatDate(compact: string): string {
  const date = parseSitecoreCompactDate(compact);
  if (!date) return compact;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export const RedirectMapDetail = forwardRef<
  RedirectMapDetailHandle,
  RedirectMapDetailProps
>(function RedirectMapDetail(
  {
    client,
    sitecoreContextId,
    selectedMap,
    hasSitePicked = false,
    onWriteSuccess,
    onDeleteRequested,
  },
  ref,
) {
  if (!selectedMap) {
    const heading = hasSitePicked
      ? "Pick a redirect map to view"
      : "Pick a site to begin";
    const body = hasSitePicked
      ? "Choose a redirect map from the left rail. Its details will appear here."
      : "Choose a collection and site in the left rail. The redirect maps for that site will appear here.";
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <Inbox className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">{heading}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{body}</p>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            Tip: ↑ / ↓ to navigate the list, Enter to open.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EditableMapDetail
      ref={ref}
      client={client}
      sitecoreContextId={sitecoreContextId}
      map={selectedMap}
      onWriteSuccess={onWriteSuccess}
      onDeleteRequested={onDeleteRequested}
    />
  );
});

// ---------------------------------------------------------------------------
// EditableMapDetail — inner component carrying all edit state
// ---------------------------------------------------------------------------

interface EditableMapDetailProps {
  client: ClientSDK;
  sitecoreContextId: string;
  map: RedirectMapItem;
  onWriteSuccess: () => void;
  onDeleteRequested: () => void;
}

const EditableMapDetail = forwardRef<RedirectMapDetailHandle, EditableMapDetailProps>(
  function EditableMapDetail(
    { client, sitecoreContextId, map, onWriteSuccess, onDeleteRequested },
    ref,
  ) {
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(map.name);
    const [saving, setSaving] = useState(false);

    // T017 — modal-based row editing state (ADR-0043)
    const [editRowState, setEditRowState] = useState<{
      rowIndex: number | "new";
    } | null>(null);

    // Reset local edit state when the selected map changes (different item)
    useEffect(() => {
      setEditingName(false);
      setNameDraft(map.name);
      setEditRowState(null);
    }, [map.id, map.name]);

    // T017 — forwardRef imperative handle for Test→Manage deep-link (T039)
    useImperativeHandle(ref, () => ({
      startEditRow(rowIndex: number) {
        if (rowIndex < 0 || rowIndex >= map.mappings.length) {
          toast.error("This rule has been edited; please find it manually");
          return;
        }
        setEditRowState({ rowIndex });
      },
    }), [map.mappings.length]);

    /** Issue an updateRedirectMap call with the current map plus overrides. */
    const writeUpdate = useCallback(
      async (
        overrides: Partial<
          Pick<
            RedirectMapItem,
            | "redirectType"
            | "preserveQueryString"
            | "preserveLanguage"
            | "includeVirtualFolder"
            | "mappings"
          >
        >,
        successLabel: string,
      ) => {
        setSaving(true);
        try {
          const result = await updateRedirectMap(client, sitecoreContextId, {
            itemId: map.id,
            name: map.name,
            redirectType: overrides.redirectType ?? map.redirectType,
            preserveQueryString: overrides.preserveQueryString ?? map.preserveQueryString,
            preserveLanguage: overrides.preserveLanguage ?? map.preserveLanguage,
            includeVirtualFolder: overrides.includeVirtualFolder ?? map.includeVirtualFolder,
            mappings: overrides.mappings ?? map.mappings,
          });
          if (result.ok) {
            toast.success(successLabel);
            onWriteSuccess();
          } else {
            toast.error("Update failed", {
              description: "The server returned no itemId.",
            });
          }
        } catch (error) {
          toast.error("Update failed", {
            description: error instanceof Error ? error.message : String(error),
          });
        } finally {
          setSaving(false);
        }
      },
      [client, sitecoreContextId, map, onWriteSuccess],
    );

    async function handleRenameCommit() {
      const trimmed = nameDraft.trim();
      if (!trimmed || trimmed === map.name) {
        setEditingName(false);
        setNameDraft(map.name);
        return;
      }
      setSaving(true);
      try {
        const result = await renameRedirectMap(client, sitecoreContextId, {
          itemId: map.id,
          newName: trimmed,
        });
        if (result.ok) {
          toast.success(`Renamed to "${result.name ?? trimmed}"`);
          setEditingName(false);
          onWriteSuccess();
        } else {
          toast.error("Rename failed");
        }
      } catch (error) {
        toast.error("Rename failed", {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setSaving(false);
      }
    }

    async function deleteRow(index: number) {
      const newMappings = map.mappings.filter((_, i) => i !== index);
      await writeUpdate({ mappings: newMappings }, "Mapping deleted");
    }

    return (
      <div className="flex flex-col gap-0 overflow-auto h-full elev-glass-surface">
        <div className="p-5 space-y-5">
          {/* Section 1 — Map attributes */}
          <section aria-label="Map attributes">
            <header className="flex items-center justify-between gap-2 mb-3">
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRenameCommit();
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => void handleRenameCommit()}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameDraft(map.name);
                      }
                    }}
                    autoFocus
                    disabled={saving}
                    aria-label="Map name"
                    className="text-base font-semibold"
                  />
                </form>
              ) : (
                <h2 className="text-base font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="hover:bg-muted/40 px-1 py-0.5 -mx-1 rounded transition-colors text-left"
                    title="Click to rename"
                  >
                    {map.name}
                  </button>
                </h2>
              )}

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={map.redirectType}
                  onValueChange={(value) =>
                    void writeUpdate(
                      { redirectType: value as RedirectType },
                      "Type updated",
                    )
                  }
                  disabled={saving}
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs" aria-label="Redirect type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REDIRECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {redirectTypeDisplayName(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={onDeleteRequested}
                  disabled={saving}
                  aria-label="Delete this redirect map"
                  title="Delete redirect map"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </header>

            {/* Flag toggles */}
            <div className="flex flex-wrap gap-3 mb-3" aria-label="Flags">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={map.preserveQueryString}
                  disabled={saving}
                  onCheckedChange={(v) =>
                    void writeUpdate(
                      { preserveQueryString: v === true },
                      `Preserve query string ${v === true ? "on" : "off"}`,
                    )
                  }
                />
                <span>Preserve query string</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={map.preserveLanguage}
                  disabled={saving}
                  onCheckedChange={(v) =>
                    void writeUpdate(
                      { preserveLanguage: v === true },
                      `Preserve language ${v === true ? "on" : "off"}`,
                    )
                  }
                />
                <span>Preserve language</span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={map.includeVirtualFolder}
                  disabled={saving}
                  onCheckedChange={(v) =>
                    void writeUpdate(
                      { includeVirtualFolder: v === true },
                      `Include virtual folder ${v === true ? "on" : "off"}`,
                    )
                  }
                />
                <span>Include virtual folder</span>
              </label>
            </div>

            {/* Last updated */}
            <p className="text-xs text-muted-foreground">
              Last updated:{" "}
              <time dateTime={map.updatedAt} className="font-medium">
                {formatDate(map.updatedAt)}
              </time>
            </p>
          </section>

          <Separator />

          {/* Section 2 — Mappings table (T017: row click → EditRowModal) */}
          <section aria-label="Mappings">
            <header className="flex items-baseline justify-between gap-2 mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">Mappings</span>
                <span className="text-xs text-muted-foreground">
                  {map.mappings.length}{" "}
                  {map.mappings.length === 1 ? "row" : "rows"}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditRowState({ rowIndex: "new" })}
                disabled={saving}
              >
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add mapping
              </Button>
            </header>

            <div
              role="table"
              aria-label="Redirect mappings"
              className="w-full border border-border rounded-md overflow-hidden text-xs elev-glass-surface"
            >
              {/* Header row */}
              <div
                role="row"
                className="grid grid-cols-[1fr_auto_1fr_auto] gap-0 bg-muted/40 border-b border-border"
              >
                <div role="columnheader" className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Source
                </div>
                <div role="columnheader" className="px-2 py-1.5 text-xs font-medium text-muted-foreground" aria-hidden="true" />
                <div role="columnheader" className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Target
                </div>
                <div role="columnheader" className="px-2 py-1.5 text-xs font-medium text-muted-foreground w-[56px]" aria-hidden="true" />
              </div>

              {/* Existing rows — click to open EditRowModal (T017) */}
              {map.mappings.map((mapping: Mapping, i: number) => (
                <div
                  key={i}
                  role="row"
                  className={[
                    "group grid grid-cols-[1fr_auto_1fr_auto] gap-0 items-center cursor-pointer hover:bg-muted/20 transition-colors",
                    i < map.mappings.length - 1 ? "border-b border-border" : "",
                  ].join(" ")}
                  onClick={() => setEditRowState({ rowIndex: i })}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditRowState({ rowIndex: i });
                    }
                  }}
                  aria-label={`Edit mapping: ${mapping.source} → ${mapping.target}`}
                >
                  <div role="cell" className="px-3 py-2 font-mono text-xs text-foreground truncate" title={mapping.source}>
                    {mapping.source}
                  </div>
                  <div role="cell" className="px-2 py-2 text-muted-foreground font-mono text-xs select-none" aria-hidden="true">
                    →
                  </div>
                  <div role="cell" className="px-3 py-2 font-mono text-xs text-foreground truncate" title={mapping.target}>
                    {mapping.target}
                  </div>
                  <div role="cell" className="px-2 py-2 flex gap-1 w-[56px] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditRowState({ rowIndex: i });
                      }}
                      disabled={saving}
                      aria-label={`Edit mapping ${i + 1}`}
                      title="Edit"
                      tabIndex={-1}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteRow(i);
                      }}
                      disabled={saving}
                      aria-label={`Delete mapping ${i + 1}`}
                      title="Delete"
                      className="text-destructive hover:bg-destructive/10"
                      tabIndex={-1}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ))}

              {map.mappings.length === 0 && (
                <div className="px-3 py-3 text-xs text-muted-foreground italic">
                  No mappings configured yet. Click &ldquo;Add mapping&rdquo; above.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* T017 — EditRowModal: opened on row click or "+ Add mapping" */}
        {editRowState !== null && (
          <EditRowModal
            open={editRowState !== null}
            onOpenChange={(o) => { if (!o) setEditRowState(null); }}
            client={client}
            sitecoreContextId={sitecoreContextId}
            map={map}
            rowIndex={editRowState.rowIndex}
            onSaved={(updatedMap) => {
              setEditRowState(null);
              onWriteSuccess();
              // Propagate the updated map back to FullPage via the write-success path
              void Promise.resolve(updatedMap);
            }}
          />
        )}
      </div>
    );
  },
);
