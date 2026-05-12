"use client";

/**
 * T039 + T040 + T046 — RedirectMapDetail (editable).
 *
 * Right pane content. States:
 *   1. No map selected — empty state with keyboard hint.
 *   2. Map selected — editable detail view (Tranche 6b).
 *
 * Edit affordances:
 *   - Click map name → inline rename (renameRedirectMap mutation, separate from updateItem).
 *   - RedirectType dropdown → updateRedirectMap.
 *   - Flag checkboxes → updateRedirectMap.
 *   - Mappings table: each row has hover-revealed edit + delete icons.
 *     Inline editing per row; commit-on-blur or Enter.
 *   - "+ Add mapping" inline at bottom of table.
 *   - Delete map button in header (opens DeleteMapConfirmModal at parent level).
 *
 * All writes show Sonner toasts. Parent receives onUpdated/onRenamed/onDeleteRequested
 * callbacks and re-fetches the list to refresh the read-side state.
 *
 * Verified against real-tenant capture 2026-05-11 (Tranche 6a).
 */

import { useCallback, useEffect, useState } from "react";
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
import { Inbox, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";

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

export function RedirectMapDetail({
  client,
  sitecoreContextId,
  selectedMap,
  hasSitePicked = false,
  onWriteSuccess,
  onDeleteRequested,
}: RedirectMapDetailProps) {
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
      client={client}
      sitecoreContextId={sitecoreContextId}
      map={selectedMap}
      onWriteSuccess={onWriteSuccess}
      onDeleteRequested={onDeleteRequested}
    />
  );
}

interface EditableMapDetailProps {
  client: ClientSDK;
  sitecoreContextId: string;
  map: RedirectMapItem;
  onWriteSuccess: () => void;
  onDeleteRequested: () => void;
}

function EditableMapDetail({
  client,
  sitecoreContextId,
  map,
  onWriteSuccess,
  onDeleteRequested,
}: EditableMapDetailProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(map.name);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<Mapping>({ source: "", target: "" });
  const [addingRow, setAddingRow] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<Mapping>({ source: "", target: "" });
  const [saving, setSaving] = useState(false);

  // Reset local edit state when the selected map changes (different item)
  useEffect(() => {
    const reset = () => {
      setEditingName(false);
      setNameDraft(map.name);
      setEditingRow(null);
      setAddingRow(false);
      setRowDraft({ source: "", target: "" });
      setNewRowDraft({ source: "", target: "" });
    };
    reset();
  }, [map.id, map.name]);

  /** Issue an updateRedirectMap call with the current map plus overrides. */
  const writeUpdate = useCallback(
    async (overrides: Partial<Pick<RedirectMapItem, "redirectType" | "preserveQueryString" | "preserveLanguage" | "includeVirtualFolder" | "mappings">>, successLabel: string) => {
      setSaving(true);
      try {
        const result = await updateRedirectMap(client, sitecoreContextId, {
          itemId: map.id,
          name: map.name,
          redirectType: overrides.redirectType ?? map.redirectType,
          preserveQueryString:
            overrides.preserveQueryString ?? map.preserveQueryString,
          preserveLanguage: overrides.preserveLanguage ?? map.preserveLanguage,
          includeVirtualFolder:
            overrides.includeVirtualFolder ?? map.includeVirtualFolder,
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

  function startEditRow(index: number) {
    setEditingRow(index);
    setRowDraft({ ...map.mappings[index] });
    setAddingRow(false);
  }

  async function commitRowEdit() {
    if (editingRow === null) return;
    const trimmedSource = rowDraft.source.trim();
    const trimmedTarget = rowDraft.target.trim();
    if (!trimmedSource || !trimmedTarget) {
      toast.error("Source and target are required");
      return;
    }
    // Server dedups by source — block the edit if it would collide with a different row.
    const duplicateRow = map.mappings.findIndex(
      (m, i) => i !== editingRow && m.source === trimmedSource,
    );
    if (duplicateRow !== -1) {
      toast.error(`Another mapping already uses source "${trimmedSource}"`);
      return;
    }
    const newMappings = map.mappings.map((m, i) =>
      i === editingRow ? { source: trimmedSource, target: trimmedTarget } : m,
    );
    await writeUpdate({ mappings: newMappings }, "Mapping updated");
    setEditingRow(null);
  }

  async function deleteRow(index: number) {
    const newMappings = map.mappings.filter((_, i) => i !== index);
    await writeUpdate({ mappings: newMappings }, "Mapping deleted");
  }

  async function commitAddRow() {
    const trimmedSource = newRowDraft.source.trim();
    const trimmedTarget = newRowDraft.target.trim();
    if (!trimmedSource || !trimmedTarget) {
      toast.error("Source and target are required");
      return;
    }
    // Server dedups by source — block the add if the source is already used.
    if (map.mappings.some((m) => m.source === trimmedSource)) {
      toast.error(`A mapping with source "${trimmedSource}" already exists`);
      return;
    }
    const newMappings = [
      ...map.mappings,
      { source: trimmedSource, target: trimmedTarget },
    ];
    await writeUpdate({ mappings: newMappings }, "Mapping added");
    setAddingRow(false);
    setNewRowDraft({ source: "", target: "" });
  }

  function startAddRow() {
    setAddingRow(true);
    setEditingRow(null);
    setNewRowDraft({ source: "", target: "" });
  }

  return (
    <div className="flex flex-col gap-0 overflow-auto h-full">
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

        {/* Section 2 — Mappings (editable) */}
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
              onClick={startAddRow}
              disabled={saving || addingRow}
            >
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Add mapping
            </Button>
          </header>

          <div
            role="table"
            aria-label="Redirect mappings"
            className="w-full border border-border rounded-md overflow-hidden text-xs"
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
              <div role="columnheader" className="px-2 py-1.5 text-xs font-medium text-muted-foreground w-[80px]" aria-hidden="true" />
            </div>

            {/* Existing rows */}
            {map.mappings.map((mapping, i) => {
              const isEditing = editingRow === i;
              return (
                <div
                  key={i}
                  role="row"
                  className={[
                    "group grid grid-cols-[1fr_auto_1fr_auto] gap-0 items-center",
                    i < map.mappings.length - 1 || addingRow ? "border-b border-border" : "",
                  ].join(" ")}
                >
                  {isEditing ? (
                    <>
                      <div role="cell" className="px-3 py-1.5">
                        <Input
                          value={rowDraft.source}
                          onChange={(e) => setRowDraft({ ...rowDraft, source: e.target.value })}
                          autoFocus
                          disabled={saving}
                          aria-label="Source"
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div role="cell" className="px-2 py-1.5 text-muted-foreground font-mono text-xs select-none" aria-hidden="true">
                        →
                      </div>
                      <div role="cell" className="px-3 py-1.5">
                        <Input
                          value={rowDraft.target}
                          onChange={(e) => setRowDraft({ ...rowDraft, target: e.target.value })}
                          disabled={saving}
                          aria-label="Target"
                          className="h-7 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void commitRowEdit();
                            } else if (e.key === "Escape") {
                              setEditingRow(null);
                            }
                          }}
                        />
                      </div>
                      <div role="cell" className="px-2 py-1.5 flex gap-1 w-[80px]">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => void commitRowEdit()}
                          disabled={saving}
                          aria-label="Save mapping"
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditingRow(null)}
                          disabled={saving}
                          aria-label="Cancel edit"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div role="cell" className="px-3 py-2 font-mono text-xs text-foreground truncate" title={mapping.source}>
                        {mapping.source}
                      </div>
                      <div role="cell" className="px-2 py-2 text-muted-foreground font-mono text-xs select-none" aria-hidden="true">
                        →
                      </div>
                      <div role="cell" className="px-3 py-2 font-mono text-xs text-foreground truncate" title={mapping.target}>
                        {mapping.target}
                      </div>
                      <div role="cell" className="px-2 py-2 flex gap-1 w-[80px] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => startEditRow(i)}
                          disabled={saving || editingRow !== null || addingRow}
                          aria-label={`Edit mapping ${i + 1}`}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => void deleteRow(i)}
                          disabled={saving || editingRow !== null || addingRow}
                          aria-label={`Delete mapping ${i + 1}`}
                          title="Delete"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Add-row inline */}
            {addingRow && (
              <div role="row" className="grid grid-cols-[1fr_auto_1fr_auto] gap-0 items-center bg-muted/20">
                <div role="cell" className="px-3 py-1.5">
                  <Input
                    value={newRowDraft.source}
                    onChange={(e) => setNewRowDraft({ ...newRowDraft, source: e.target.value })}
                    autoFocus
                    disabled={saving}
                    aria-label="New source"
                    placeholder="/old-path"
                    className="h-7 text-xs font-mono"
                  />
                </div>
                <div role="cell" className="px-2 py-1.5 text-muted-foreground font-mono text-xs select-none" aria-hidden="true">
                  →
                </div>
                <div role="cell" className="px-3 py-1.5">
                  <Input
                    value={newRowDraft.target}
                    onChange={(e) => setNewRowDraft({ ...newRowDraft, target: e.target.value })}
                    disabled={saving}
                    aria-label="New target"
                    placeholder="/new-path"
                    className="h-7 text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void commitAddRow();
                      } else if (e.key === "Escape") {
                        setAddingRow(false);
                      }
                    }}
                  />
                </div>
                <div role="cell" className="px-2 py-1.5 flex gap-1 w-[80px]">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => void commitAddRow()}
                    disabled={saving}
                    aria-label="Save new mapping"
                    title="Save"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setAddingRow(false)}
                    disabled={saving}
                    aria-label="Cancel add"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}

            {map.mappings.length === 0 && !addingRow && (
              <div className="px-3 py-3 text-xs text-muted-foreground italic">
                No mappings configured yet. Click &ldquo;Add mapping&rdquo; above.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
