"use client";

/**
 * components/dev/T1ProbeButton.tsx — PRD-004 Tranche 1 diagnostic
 *
 * Env-gated UI surface for the T1 regex round-trip probe.
 * Rendered only when NEXT_PUBLIC_T1_PROBE === 'true'.
 *
 * Dialog sections:
 *   1. Run controls — parentPath + templateId inputs + "Run T1 probe" button
 *   2. Per-row results table (after run)
 *   3. Per-character-class matrix (after run)
 *   4. Cleanup status (after run)
 *   5. Copy-to-capture buttons (after run)
 *   6. Result summary banner (after run, above section 1)
 *
 * Colour tokens used:
 *   - text-success-fg / bg-success-bg  (PASS indicators)
 *   - text-danger-fg / bg-danger-bg    (FAIL indicators)
 *   - text-warning-fg / bg-warning-bg  (INCOMPLETE indicator)
 *   All sourced from the Blok token set — NO invented hex values.
 *
 * NOT production code — never reaches operators because the button is
 * not rendered unless NEXT_PUBLIC_T1_PROBE=true.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { runT1Probe, type T1ProbeResult } from "@/lib/dev/t1-probe-runner";
import { fetchUpstreamShas } from "@/lib/dev/t1-probe-github-sha";
import { T1_PROBE_SPECS, ALL_CHARACTER_CLASSES } from "@/lib/dev/t1-probe-specs";
import type { ClientSDK } from "@/lib/sdk/types";

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------
const LS_PARENT_PATH = 'redirect-manager:t1-probe:parentPath';
const LS_TEMPLATE_ID = 'redirect-manager:t1-probe:templateId';

function readLS(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeLS(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage quota or private browsing — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Markdown emission helpers
// ---------------------------------------------------------------------------

function buildT001T002Markdown(result: T1ProbeResult): string {
  const rows = T1_PROBE_SPECS.map((spec, idx) => {
    const r = result.perRowResults[idx];
    const status = r?.status === 'PASS' ? 'PASS' : `FAIL: source=${r?.sourceDiff ? `"${r.sourceDiff.observed}"` : 'ok'} target=${r?.targetDiff ? `"${r.targetDiff.observed}"` : 'ok'}`;
    return `| ${idx + 1}   | ${r?.sourceDiff?.observed ?? spec.authoredSource} | ${r?.targetDiff?.observed ?? spec.authoredTarget} | ${status} |`;
  });

  return [
    '## T001 — Authored rows',
    '',
    '(Rows authored programmatically by T1 probe — see t1-probe-specs.ts for source)',
    '',
    '## T002 — Observed (round-tripped) rows',
    '',
    '| Row | Observed source | Observed target | Status (PASS / FAIL: <diff>) |',
    '|-----|-----------------|-----------------|------------------------------|',
    ...rows,
  ].join('\n');
}

function buildClassMatrixMarkdown(result: T1ProbeResult): string {
  const rows = result.perClassMatrix.map((cls) => {
    const exampleRows = ALL_CHARACTER_CLASSES.find((c) => c.key === cls.key)?.rows.join(', ') ?? '—';
    return `| ${cls.label} | ${exampleRows} | ${cls.status} | ${cls.failingRows.length > 0 ? `Failed in: ${cls.failingRows.join(', ')}` : ''} |`;
  });

  return [
    '### Per-character-class matrix',
    '',
    '| Class | Example token | Status (PASS / FAIL) | Notes |',
    '|-------|---------------|----------------------|-------|',
    ...rows,
  ].join('\n');
}

function buildT003Markdown(shas: { proxyFile: { sha: string; permalinkRaw: string; permalinkBlob: string; retrievedAt: string }; utilsFile: { sha: string; permalinkRaw: string; permalinkBlob: string; retrievedAt: string } }): string {
  return [
    '## T003 — Upstream SHA capture',
    '',
    '| File | Commit SHA | Permalink (raw) | Permalink (blob) | Retrieved (ISO-8601 UTC) |',
    '|------|-----------|------------------|------------------|--------------------------|',
    `| \`packages/nextjs/src/proxy/redirects-proxy.ts\` | \`${shas.proxyFile.sha}\` | ${shas.proxyFile.permalinkRaw} | ${shas.proxyFile.permalinkBlob} | ${shas.proxyFile.retrievedAt} |`,
    `| \`packages/core/src/tools/utils.ts\` | \`${shas.utilsFile.sha}\` | ${shas.utilsFile.permalinkRaw} | ${shas.utilsFile.permalinkBlob} | ${shas.utilsFile.retrievedAt} |`,
  ].join('\n');
}

function buildT005Markdown(result: T1ProbeResult): string {
  const gateDecision = result.status === 'pass' && result.deletedCleanly ? 'PASS' : 'FAIL';
  const timestamp = new Date().toISOString();
  return [
    '## T005 — Gate decision',
    '',
    `### Outcome`,
    '',
    `- [${gateDecision === 'PASS' ? 'x' : ' '}] **PASS** — every character class round-trips byte-identical; queue T2`,
    `- [${gateDecision === 'FAIL' ? 'x' : ' '}] **FAIL** — one or more classes failed`,
    '',
    `### Gate timestamp`,
    '',
    `\`${timestamp}\``,
  ].join('\n');
}

async function copyToClipboard(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied: ${label}`);
  } catch {
    toast.error(`Copy failed — check clipboard permissions`);
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ResultBannerProps {
  result: T1ProbeResult;
}

function ResultBanner({ result }: ResultBannerProps) {
  if (!result.deletedCleanly) {
    return (
      <div className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-fg font-semibold">
        GATE INCOMPLETE — throwaway map may still exist in the tenant (itemId:{' '}
        <code className="font-mono text-xs">{result.mapId || 'unknown'}</code>). Delete it
        manually before recording a gate decision.
      </div>
    );
  }

  if (result.status === 'pass') {
    return (
      <div className="rounded-md bg-success-bg px-4 py-3 text-sm text-success-fg font-semibold">
        GATE PASS — all 8 rows and all character classes round-tripped byte-identical. Throwaway
        map deleted cleanly.
      </div>
    );
  }

  const failCount = result.perClassMatrix.filter((c) => c.status === 'FAIL').length;
  return (
    <div className="rounded-md bg-danger-bg px-4 py-3 text-sm text-danger-fg font-semibold">
      GATE FAIL — {failCount} character class{failCount !== 1 ? 'es' : ''} failed. Do NOT start
      T2 until Tranche 0 fix tasks are GREEN. Throwaway map deleted cleanly.
    </div>
  );
}

interface RowResultsTableProps {
  result: T1ProbeResult;
}

function RowResultsTable({ result }: RowResultsTableProps) {
  if (result.perRowResults.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No per-row data — the probe failed before rows could be compared.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-1.5 pr-2 font-medium">Row</th>
            <th className="py-1.5 pr-2 font-medium">Description</th>
            <th className="py-1.5 pr-2 font-medium">Source</th>
            <th className="py-1.5 pr-2 font-medium">Target</th>
            <th className="py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {result.perRowResults.map((row, idx) => (
            <tr key={row.specId} className="border-b border-border/50">
              <td className="py-1.5 pr-2 font-mono">{idx + 1}</td>
              <td className="py-1.5 pr-2 max-w-[140px] truncate" title={row.description}>
                {row.description}
              </td>
              <td className="py-1.5 pr-2">
                {row.sourceDiff ? (
                  <span className="text-danger-fg" title={`Authored: ${row.sourceDiff.authored}\nObserved: ${row.sourceDiff.observed}`}>
                    <span className="line-through opacity-60">{truncate(row.sourceDiff.authored, 20)}</span>
                    {' → '}
                    <span className="font-semibold">{truncate(row.sourceDiff.observed, 20)}</span>
                  </span>
                ) : (
                  <span className="text-success-fg">OK</span>
                )}
              </td>
              <td className="py-1.5 pr-2">
                {row.targetDiff ? (
                  <span className="text-danger-fg" title={`Authored: ${row.targetDiff.authored}\nObserved: ${row.targetDiff.observed}`}>
                    <span className="line-through opacity-60">{truncate(row.targetDiff.authored, 20)}</span>
                    {' → '}
                    <span className="font-semibold">{truncate(row.targetDiff.observed, 20)}</span>
                  </span>
                ) : (
                  <span className="text-success-fg">OK</span>
                )}
              </td>
              <td className="py-1.5">
                <span
                  className={
                    row.status === 'PASS'
                      ? 'text-success-fg font-semibold'
                      : 'text-danger-fg font-semibold'
                  }
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ClassMatrixTableProps {
  result: T1ProbeResult;
}

function ClassMatrixTable({ result }: ClassMatrixTableProps) {
  if (result.perClassMatrix.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No matrix data — the probe failed before classes could be evaluated.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-1.5 pr-2 font-medium">Character class</th>
            <th className="py-1.5 pr-2 font-medium">Rows</th>
            <th className="py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {result.perClassMatrix.map((cls) => (
            <tr key={cls.key} className="border-b border-border/50">
              <td className="py-1.5 pr-2 font-mono text-[10px]">{cls.label}</td>
              <td className="py-1.5 pr-2">{cls.rowIds.join(', ') || '—'}</td>
              <td className="py-1.5">
                <span
                  className={
                    cls.status === 'PASS'
                      ? 'text-success-fg font-semibold'
                      : cls.status === 'FAIL'
                        ? 'text-danger-fg font-semibold'
                        : 'text-muted-foreground'
                  }
                >
                  {cls.status}
                  {cls.failingRows.length > 0 && (
                    <span className="font-normal ml-1">({cls.failingRows.join(', ')})</span>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface T1ProbeButtonProps {
  client: ClientSDK;
  sitecoreContextId: string;
}

export function T1ProbeButton({ client, sitecoreContextId }: T1ProbeButtonProps) {
  const [open, setOpen] = useState(false);
  const [parentPath, setParentPath] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<T1ProbeResult | null>(null);
  const [fetchingShas, setFetchingShas] = useState(false);

  // Hydrate from localStorage when dialog opens
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      setParentPath(readLS(LS_PARENT_PATH));
      setTemplateId(readLS(LS_TEMPLATE_ID));
      setResult(null);
    }
    setOpen(isOpen);
  }, []);

  const handleRun = useCallback(async () => {
    if (!parentPath.trim() || !templateId.trim()) {
      toast.error('Both Parent path and Template ID are required');
      return;
    }

    writeLS(LS_PARENT_PATH, parentPath.trim());
    writeLS(LS_TEMPLATE_ID, templateId.trim());

    setRunning(true);
    setResult(null);

    try {
      const probeResult = await runT1Probe(
        client,
        sitecoreContextId,
        parentPath.trim(),
        templateId.trim(),
      );
      setResult(probeResult);

      if (probeResult.status === 'pass' && probeResult.deletedCleanly) {
        toast.success('T1 probe complete — GATE PASS');
      } else if (!probeResult.deletedCleanly) {
        toast.error('T1 probe done but cleanup failed — manual delete required');
      } else {
        toast.error('T1 probe complete — GATE FAIL');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`T1 probe threw unexpectedly: ${msg}`);
    } finally {
      setRunning(false);
    }
  }, [client, sitecoreContextId, parentPath, templateId]);

  const handleCopyT001T002 = useCallback(async () => {
    if (!result) return;
    await copyToClipboard(buildT001T002Markdown(result), 'T001 + T002 markdown');
  }, [result]);

  const handleCopyClassMatrix = useCallback(async () => {
    if (!result) return;
    await copyToClipboard(buildClassMatrixMarkdown(result), 'Per-class matrix markdown');
  }, [result]);

  const handleFetchCopyT003 = useCallback(async () => {
    setFetchingShas(true);
    try {
      const shas = await fetchUpstreamShas();
      await copyToClipboard(buildT003Markdown(shas), 'T003 SHA markdown');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`SHA fetch failed: ${msg}`);
    } finally {
      setFetchingShas(false);
    }
  }, []);

  const handleCopyT005 = useCallback(async () => {
    if (!result) return;
    await copyToClipboard(buildT005Markdown(result), 'T005 gate decision markdown');
  }, [result]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(true)}
            aria-label="T1 probe"
          >
            T1 probe
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          PRD-004 Tranche 1 hard gate — automated regex round-trip probe (dev only)
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="xl" className="flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>T1 Probe — Regex Round-Trip Gate</DialogTitle>
            <DialogDescription>
              PRD-004 Tranche 1 hard gate. Creates a throwaway Redirect Map with 8 probe rows,
              reads it back, diffs byte-for-byte, then deletes the map. Results can be copied
              as markdown into{' '}
              <code className="font-mono text-xs">
                project-planning/captures/tranche-1-regex-roundtrip-20260520.md
              </code>
              .
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto pr-1">
            <div className="flex flex-col gap-5 pb-2">

              {/* Section 6 — Result banner (top, only after run) */}
              {result && <ResultBanner result={result} />}

              {/* Error summary if probe failed outright */}
              {result?.error && (
                <div className="rounded-md bg-danger-bg px-4 py-3 text-xs text-danger-fg">
                  <p className="font-semibold mb-1">Probe error:</p>
                  <pre className="whitespace-pre-wrap break-all">{result.error}</pre>
                </div>
              )}

              {/* Section 1 — Run controls */}
              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Run probe</h3>
                <p className="text-xs text-muted-foreground">
                  Paste the Sitecore item path to your Settings/Redirects folder and the Redirect
                  Map template GUID. The probe will create a throwaway map, read it back, and
                  delete it automatically.
                </p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium" htmlFor="t1-parent-path">
                    Parent path (Settings/Redirects folder)
                  </label>
                  <Input
                    id="t1-parent-path"
                    placeholder="/sitecore/content/MarketingSiteCollection/MarketingSite/Settings/Redirects"
                    value={parentPath}
                    onChange={(e) => setParentPath(e.target.value)}
                    disabled={running}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium" htmlFor="t1-template-id">
                    Redirect Map template GUID
                  </label>
                  <Input
                    id="t1-template-id"
                    placeholder="{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    disabled={running}
                    className="font-mono text-xs"
                  />
                </div>
                <Button
                  onClick={handleRun}
                  disabled={running || !parentPath.trim() || !templateId.trim()}
                  size="sm"
                  className="self-start"
                >
                  {running ? 'Running…' : 'Run T1 probe'}
                </Button>
              </section>

              {/* Sections 2–5 — only after a completed run */}
              {result && (
                <>
                  {/* Section 2 — Per-row results */}
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">Per-row results</h3>
                    <RowResultsTable result={result} />
                  </section>

                  {/* Section 3 — Per-class matrix */}
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">Per-character-class matrix</h3>
                    <ClassMatrixTable result={result} />
                  </section>

                  {/* Section 4 — Cleanup status */}
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">Cleanup status</h3>
                    {result.deletedCleanly ? (
                      <p className="text-xs text-success-fg">
                        Throwaway map deleted cleanly (itemId:{' '}
                        <code className="font-mono">{result.mapId}</code>).
                      </p>
                    ) : (
                      <p className="text-xs text-danger-fg font-semibold">
                        WARNING: throwaway map may still exist in the tenant — itemId:{' '}
                        <code className="font-mono">{result.mapId || 'unknown'}</code>. Delete it
                        manually in the Sitecore Content Editor before recording the gate decision.
                      </p>
                    )}
                  </section>

                  {/* Section 5 — Copy buttons */}
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-semibold">Copy to capture file</h3>
                    <p className="text-xs text-muted-foreground">
                      Click each button to copy a markdown block, then paste into{' '}
                      <code className="font-mono text-xs">
                        project-planning/captures/tranche-1-regex-roundtrip-20260520.md
                      </code>
                      .
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyT001T002}>
                        Copy T001 + T002 markdown
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCopyClassMatrix}>
                        Copy per-class matrix markdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFetchCopyT003}
                        disabled={fetchingShas}
                      >
                        {fetchingShas ? 'Fetching SHAs…' : 'Fetch + copy T003 SHA markdown'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCopyT005}>
                        Copy gate decision (PASS/FAIL)
                      </Button>
                    </div>
                  </section>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
