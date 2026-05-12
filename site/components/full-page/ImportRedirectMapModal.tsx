"use client";

/**
 * T048–T054 — ImportRedirectMapModal
 *
 * Four-step wizard for importing a `redirect-manager/v1` JSON export:
 *   1. Upload — file picker OR textarea paste
 *   2. Preview — per-row classification (new / conflicting / unchanged)
 *                + 3-action resolution (create / overwrite / skip) per ADR-0006
 *   3. Applying — sequential writes with progress
 *   4. Summary — totals + newly-minted GUID warnings (ADR-0009 R-T2)
 *
 * Schema: lib/import-export/schema.ts (validateExport — T019)
 * Diff:   lib/import-export/diff.ts (classifyImport — T020a)
 * Apply:  lib/import-export/apply.ts (applyImport — T052)
 *
 * Discovery: parent + template GUIDs are resolved once at apply time (same
 * helpers powering NewRedirectMapModal). Discovery failures abort with a
 * clear message rather than letting the first row fail mid-batch.
 */

import { Fragment, useCallback, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import {
  createRedirectMap,
  updateRedirectMap,
} from "@/lib/sdk/redirects-write";
import {
  resolveItemIdByPath,
  discoverRedirectMapTemplateId,
} from "@/lib/sdk/redirects-discover";
import { validateExport } from "@/lib/import-export/schema";
import {
  classifyImport,
  buildScalarDiffs,
  buildMappingsDiff,
  type ImportClassification,
} from "@/lib/import-export/diff";
import {
  applyImport,
  type ApplyProgress,
  type ApplyResult,
  type ImportAction,
  type ResolvedItem,
} from "@/lib/import-export/apply";
import type { ClientSDK } from "@/lib/sdk/types";
import { toast } from "sonner";

interface ImportRedirectMapModalProps {
  client: ClientSDK;
  sitecoreContextId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Full Sitecore path to Settings/Redirects for the current site */
  sitePath: string | null;
  /** Called after a successful apply so the parent can refetch the list. */
  onImportComplete: () => void;
}

type WizardStep = "upload" | "preview" | "applying" | "summary";

export function ImportRedirectMapModal({
  client,
  sitecoreContextId,
  open,
  onOpenChange,
  sitePath,
  onImportComplete,
}: ImportRedirectMapModalProps) {
  const [step, setStep] = useState<WizardStep>("upload");
  const [parseError, setParseError] = useState<string | null>(null);
  const [classifications, setClassifications] = useState<ImportClassification[]>([]);
  const [actions, setActions] = useState<Map<string, ImportAction>>(new Map());
  const [textareaValue, setTextareaValue] = useState("");
  const [applyProgress, setApplyProgress] = useState<ApplyProgress | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setParseError(null);
    setClassifications([]);
    setActions(new Map());
    setTextareaValue("");
    setApplyProgress(null);
    setApplyResult(null);
  }, []);

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  /** Parse + validate + classify a raw JSON string, then advance to preview. */
  const ingestJson = useCallback(
    async (rawJson: string) => {
      setParseError(null);
      if (!sitePath) {
        setParseError("Pick a site before importing.");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawJson);
      } catch (err) {
        setParseError(
          `Couldn't parse the file as JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      const validation = validateExport(parsed);
      if (!validation.ok) {
        setParseError(validation.error);
        return;
      }
      // Fetch live site state to classify against
      let existingMaps;
      try {
        existingMaps = await listRedirectMaps(client, sitecoreContextId, sitePath);
      } catch (err) {
        setParseError(
          `Couldn't read the target site: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
      const result = classifyImport(validation.data.items, existingMaps);
      const defaultActions = new Map<string, ImportAction>();
      for (const c of result) {
        // Default actions per classification:
        //   new           → create
        //   conflicting   → skip (operator must opt-in to overwrite)
        //   unchanged     → skip (no change needed)
        if (c.classification === "new") {
          defaultActions.set(c.incoming.id, "create");
        } else {
          defaultActions.set(c.incoming.id, "skip");
        }
      }
      setClassifications(result);
      setActions(defaultActions);
      setStep("preview");
    },
    [client, sitecoreContextId, sitePath],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await ingestJson(text);
    } catch (err) {
      setParseError(
        `Couldn't read the file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async function handleTextareaSubmit() {
    if (!textareaValue.trim()) {
      setParseError("Paste the export JSON into the textarea, or pick a file.");
      return;
    }
    await ingestJson(textareaValue);
  }

  function setAction(incomingId: string, action: ImportAction) {
    setActions((prev) => {
      const next = new Map(prev);
      next.set(incomingId, action);
      return next;
    });
  }

  /** Run the apply step: discover GUIDs, build resolved items, batch-write. */
  async function handleApply() {
    if (!sitePath) return;

    // Build resolved items
    const resolved: ResolvedItem[] = classifications.map((c) => ({
      item: c.incoming,
      action: actions.get(c.incoming.id) ?? "skip",
      existingId: c.existing?.id,
    }));

    const needsCreate = resolved.some((r) => r.action === "create");
    const needsUpdate = resolved.some((r) => r.action === "overwrite");

    if (!needsCreate && !needsUpdate) {
      // Everything is skipped — finish immediately
      setApplyResult({
        results: resolved.map((r) => ({
          incomingId: r.item.id,
          name: r.item.name,
          action: "skip",
          ok: true,
        })),
        totals: { created: 0, overwritten: 0, skipped: resolved.length, failed: 0 },
      });
      setStep("summary");
      return;
    }

    setStep("applying");

    // Discovery: only needed for create actions, but we resolve anyway
    let parentId = "";
    let templateId = "";
    if (needsCreate) {
      const pid = await resolveItemIdByPath(client, sitecoreContextId, sitePath);
      if (!pid) {
        toast.error("Couldn't resolve the site's Settings/Redirects folder.");
        setStep("preview");
        return;
      }
      parentId = pid;
      const tid = await discoverRedirectMapTemplateId(client, sitecoreContextId, parentId);
      if (!tid) {
        toast.error(
          "No existing Redirect Map under this site — seed one manually in Sitecore CMS so the template GUID becomes discoverable.",
        );
        setStep("preview");
        return;
      }
      templateId = tid;
    }

    const result = await applyImport(
      resolved,
      {
        create: (input) => createRedirectMap(client, sitecoreContextId, input),
        update: (input) => updateRedirectMap(client, sitecoreContextId, input),
        parentId,
        templateId,
      },
      (progress) => setApplyProgress(progress),
    );

    setApplyResult(result);
    setStep("summary");
    // Fire-and-forget refresh so the parent's list catches up.
    onImportComplete();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import redirect maps"}
            {step === "preview" && "Review import"}
            {step === "applying" && "Importing…"}
            {step === "summary" && "Import complete"}
          </DialogTitle>
          {step === "upload" && (
            <DialogDescription>
              Pick a JSON file (or paste the contents) exported from any
              redirect-manager/v1-compatible source.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "upload" && (
          <UploadStep
            parseError={parseError}
            textareaValue={textareaValue}
            onTextareaChange={setTextareaValue}
            onFileChange={handleFileChange}
            onSubmit={handleTextareaSubmit}
            onCancel={() => handleOpenChange(false)}
          />
        )}

        {step === "preview" && (
          <PreviewStep
            classifications={classifications}
            actions={actions}
            onActionChange={setAction}
            onApply={handleApply}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "applying" && <ApplyingStep progress={applyProgress} />}

        {step === "summary" && applyResult && (
          <SummaryStep
            result={applyResult}
            onClose={() => handleOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 1 — Upload
// ──────────────────────────────────────────────────────────────────────

function UploadStep({
  parseError,
  textareaValue,
  onTextareaChange,
  onFileChange,
  onSubmit,
  onCancel,
}: {
  parseError: string | null;
  textareaValue: string;
  onTextareaChange: (v: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="import-file">Pick a file</Label>
        <input
          id="import-file"
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/80"
        />
      </div>

      <div className="text-center text-xs text-muted-foreground">
        — or —
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-textarea">Paste JSON</Label>
        <textarea
          id="import-textarea"
          value={textareaValue}
          onChange={(e) => onTextareaChange(e.target.value)}
          placeholder='{"schema":"redirect-manager/v1", ...}'
          className="block w-full h-32 text-xs font-mono p-2 rounded border border-border bg-background"
        />
      </div>

      {parseError && (
        <Alert variant="danger">
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!textareaValue.trim()}>
          Validate &amp; preview
        </Button>
      </DialogFooter>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 2 — Preview
// ──────────────────────────────────────────────────────────────────────

function PreviewStep({
  classifications,
  actions,
  onActionChange,
  onApply,
  onBack,
}: {
  classifications: ImportClassification[];
  actions: Map<string, ImportAction>;
  onActionChange: (id: string, action: ImportAction) => void;
  onApply: () => void;
  onBack: () => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const newCount = classifications.filter((c) => c.classification === "new").length;
  const conflictCount = classifications.filter((c) => c.classification === "conflicting").length;
  const unchangedCount = classifications.filter((c) => c.classification === "unchanged").length;

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-xs">
        <Badge colorScheme="neutral" size="sm">{newCount} new</Badge>
        <Badge colorScheme="warning" size="sm">{conflictCount} conflicting</Badge>
        <Badge colorScheme="neutral" size="sm">{unchangedCount} unchanged</Badge>
      </div>

      <div className="max-h-96 overflow-y-auto border border-border rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="w-6 px-1 py-2" aria-hidden="true" />
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-center px-3 py-2 font-medium">Status</th>
              <th className="text-left px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {classifications.map((c) => {
              const id = c.incoming.id;
              const action = actions.get(id) ?? "skip";
              const isConflicting = c.classification === "conflicting";
              const isNew = c.classification === "new";
              const expanded = expandedIds.has(id);
              return (
                <Fragment key={id}>
                  <tr className="border-t border-border">
                    <td className="px-1 py-2 align-middle text-center">
                      {isConflicting && c.existing ? (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(id)}
                          className="inline-flex items-center justify-center rounded hover:bg-muted/40 p-0.5"
                          aria-label={expanded ? "Hide diff" : "Show diff"}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.incoming.name}</div>
                      {isConflicting && c.fieldDiff && c.fieldDiff.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Differs: {c.fieldDiff.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-center">
                      <Badge
                        colorScheme={
                          c.classification === "new"
                            ? "primary"
                            : c.classification === "conflicting"
                              ? "warning"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {c.classification}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isNew ? (
                        <Select
                          value={action}
                          onValueChange={(v) => onActionChange(id, v as ImportAction)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="create">Create</SelectItem>
                            <SelectItem value="skip">Skip</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : isConflicting ? (
                        <Select
                          value={action}
                          onValueChange={(v) => onActionChange(id, v as ImportAction)}
                        >
                          <SelectTrigger className="h-7 text-xs w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="overwrite">Overwrite</SelectItem>
                            <SelectItem value="skip">Skip</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Skip</span>
                      )}
                    </td>
                  </tr>
                  {isConflicting && expanded && c.existing && (
                    <tr className="bg-muted/20 border-t border-border">
                      <td colSpan={4} className="px-3 py-3">
                        <ConflictDetail
                          existing={c.existing}
                          incoming={c.incoming}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {classifications.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Nothing to import — the file contains 0 items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onApply} disabled={classifications.length === 0}>
          Apply
        </Button>
      </DialogFooter>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 3 — Applying
// ──────────────────────────────────────────────────────────────────────

function ApplyingStep({ progress }: { progress: ApplyProgress | null }) {
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  return (
    <div className="space-y-3 py-4">
      <p className="text-sm">
        {progress ? (
          <>
            Importing <span className="font-medium">{progress.name}</span> —{" "}
            <span className="text-muted-foreground">
              {progress.current} of {progress.total}
            </span>
          </>
        ) : (
          "Preparing…"
        )}
      </p>
      <Progress value={pct} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Step 4 — Summary
// ──────────────────────────────────────────────────────────────────────

function SummaryStep({
  result,
  onClose,
}: {
  result: ApplyResult;
  onClose: () => void;
}) {
  const newlyMinted = result.results.filter(
    (r) => r.action === "create" && r.ok && r.newId && r.newId !== r.incomingId,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge colorScheme="primary" size="sm">{result.totals.created} created</Badge>
        <Badge colorScheme="primary" size="sm">{result.totals.overwritten} overwritten</Badge>
        <Badge colorScheme="neutral" size="sm">{result.totals.skipped} skipped</Badge>
        {result.totals.failed > 0 && (
          <Badge colorScheme="danger" size="sm">{result.totals.failed} failed</Badge>
        )}
      </div>

      {newlyMinted.length > 0 && (
        <Alert>
          <AlertDescription className="text-xs">
            <strong>{newlyMinted.length}</strong>{" "}
            {newlyMinted.length === 1 ? "item was" : "items were"} created with a
            new server-minted GUID (the source GUID couldn&apos;t be preserved —
            this is an Authoring API constraint). Re-importing the same file in
            the future will create more duplicates unless you re-export from the
            target environment.
          </AlertDescription>
        </Alert>
      )}

      <div className="max-h-72 overflow-y-auto border border-border rounded-md">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Name</th>
              <th className="text-left px-3 py-2 font-medium">Action</th>
              <th className="text-left px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {result.results.map((r) => (
              <tr key={r.incomingId} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.name}</div>
                  {r.action === "create" && r.ok && r.newId && r.newId !== r.incomingId && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      New ID: {r.newId}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 capitalize">{r.action}</td>
                <td className="px-3 py-2">
                  {r.ok ? (
                    <Badge colorScheme="primary" size="sm">OK</Badge>
                  ) : (
                    <div>
                      <Badge colorScheme="danger" size="sm">Failed</Badge>
                      {r.error && (
                        <div className="text-[10px] text-destructive-foreground mt-0.5">
                          {r.error}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Conflict detail (collapsible drill-down)
// ──────────────────────────────────────────────────────────────────────

function ConflictDetail({
  existing,
  incoming,
}: {
  existing: import("@/lib/domain/types").RedirectMapItem;
  incoming: import("@/lib/import-export/schema").ExportItem;
}) {
  const scalarDiffs = buildScalarDiffs(existing, incoming);
  const mappingsDiff = buildMappingsDiff(existing.mappings, incoming.mappings);
  const hasMappingChanges =
    mappingsDiff.added.length > 0 ||
    mappingsDiff.removed.length > 0 ||
    mappingsDiff.changed.length > 0;

  return (
    <div className="space-y-3">
      {scalarDiffs.length > 0 && (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Field changes
          </h4>
          <ul className="space-y-1">
            {scalarDiffs.map((d) => (
              <li key={d.field} className="flex items-baseline gap-2 text-xs">
                <span className="font-mono font-medium min-w-[140px]">{d.field}</span>
                <span className="font-mono text-destructive line-through">
                  {String(d.current)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">
                  {String(d.incoming)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasMappingChanges && (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Mapping changes
          </h4>
          <ul className="space-y-0.5 font-mono text-[11px]">
            {mappingsDiff.added.map((m, i) => (
              <li key={`add-${i}`} className="flex items-center gap-2">
                <span className="inline-block w-4 text-emerald-700 dark:text-emerald-400 font-semibold text-center">
                  +
                </span>
                <span>{m.source}</span>
                <span className="text-muted-foreground">→</span>
                <span>{m.target}</span>
              </li>
            ))}
            {mappingsDiff.removed.map((m, i) => (
              <li key={`rem-${i}`} className="flex items-center gap-2">
                <span className="inline-block w-4 text-destructive font-semibold text-center">
                  −
                </span>
                <span className="line-through">{m.source}</span>
                <span className="text-muted-foreground">→</span>
                <span className="line-through">{m.target}</span>
              </li>
            ))}
            {mappingsDiff.changed.map((c, i) => (
              <li key={`chg-${i}`} className="flex items-center gap-2">
                <span className="inline-block w-4 text-amber-700 dark:text-amber-400 font-semibold text-center">
                  ~
                </span>
                <span>{c.source}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-destructive line-through">{c.currentTarget}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {c.incomingTarget}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground mt-1">
            <span className="text-emerald-700 dark:text-emerald-400">+</span> add
            {" · "}
            <span className="text-destructive">−</span> remove
            {" · "}
            <span className="text-amber-700 dark:text-amber-400">~</span> change
          </p>
        </section>
      )}

      {scalarDiffs.length === 0 && !hasMappingChanges && (
        <p className="text-xs text-muted-foreground italic">
          No diff details available.
        </p>
      )}
    </div>
  );
}
