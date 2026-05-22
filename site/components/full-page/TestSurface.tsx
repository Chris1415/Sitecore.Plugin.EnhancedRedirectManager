"use client";

/**
 * TestSurface.tsx — T030 (PRD-004 T4) — right-panel only (operator UX restructure)
 *
 * Renders the right-side content of the Test tab:
 *   - URL input + Test button
 *   - TraceCardStack when lastTrace is set
 *   - EmptyState when no trace yet
 *
 * The left rail (CollectionPicker + SitePicker + read-only RedirectMapList) is
 * rendered by FullPage.tsx — shared across both Manage and Test tabs.
 * TestSurface no longer owns any left-rail UI.
 *
 * ADR-0041: lastTrace + activeTab live in FullPage (parent), not here.
 *           TestSurface is a controlled component receiving lastTrace + onTraceComplete.
 *
 * Maps prop: maps loaded by FullPage (from RedirectMapList) are passed in so
 * the simulator has rules to evaluate. The visual maps list is in the shared rail.
 *
 * Locale derivation: regex ^/([a-z]{2}(-[A-Z]{2})?)/ on URL path; defaults to 'en'.
 *
 * Visual contract: pocs/poc-v1-prd004/test-empty.html (shared-rail layout)
 *                  pocs/poc-v1-prd004/test-matched.html
 */

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TraceCardStack } from "@/components/full-page/TraceCardStack";
import { EmptyState } from "@/components/full-page/EmptyState";
import { simulate } from "@/lib/redirects/proxy-simulator";
import type { SimulationTrace } from "@/lib/redirects/proxy-simulator";
import type { RedirectMapItem } from "@/lib/domain/types";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Locale derivation (replaces the locale dropdown)
// ---------------------------------------------------------------------------

const LOCALE_PREFIX_REGEX = /^\/([a-z]{2}(-[A-Z]{2})?)(?=\/|$)/;

/**
 * Derives locale from a URL path prefix.
 *   /de-DE/old-page   -> 'de-DE'
 *   /en/old-page      -> 'en'
 *   /old-page         -> 'en' (default)
 *   https://host/de-DE/page -> 'de-DE'
 */
export function deriveLocaleFromUrl(url: string): string {
  let path = url;
  try {
    if (/^https?:\/\//.test(url)) {
      path = new URL(url).pathname;
    }
  } catch {
    // treat as path
  }
  const match = LOCALE_PREFIX_REGEX.exec(path);
  return match ? match[1] : "en";
}

// ---------------------------------------------------------------------------
// URL validation helper
// ---------------------------------------------------------------------------

function isValidUrl(value: string): boolean {
  if (!value) return false;
  return value.startsWith("http") || value.startsWith("/");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TestSurfaceProps {
  siteLanguage: string;
  /** Maps already loaded from the Manage tab's RedirectMapList. */
  maps: RedirectMapItem[];
  /** Lifted state from FullPage -- survives Manage<->Test tab toggles (ADR-0041). */
  lastTrace: SimulationTrace | null;
  onTraceComplete: (trace: SimulationTrace) => void;
  /** Test->Manage deep-link callback -- drives FullPage to switch tab + open modal. */
  onRequestEditRow: (mapId: string, rowIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TestSurface({
  siteLanguage,
  maps,
  lastTrace,
  onTraceComplete,
  onRequestEditRow,
}: TestSurfaceProps) {
  // URL input state
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    if (val && !isValidUrl(val)) {
      setUrlError("URL must start with http or /");
    } else {
      setUrlError(null);
    }
  }, []);

  // Test button -- enabled when URL is valid
  const isTestEnabled = urlInput.length > 0 && isValidUrl(urlInput) && !urlError;

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const handleTest = useCallback(async () => {
    if (!isTestEnabled || isSimulating) return;
    setIsSimulating(true);
    setSimulationError(null);

    const locale = deriveLocaleFromUrl(urlInput);

    try {
      const rules = (maps ?? []).flatMap((map) =>
        map.mappings.map((mapping, rowIndex) => ({
          mapId: map.id,
          rowIndex,
          source: mapping.source,
          target: mapping.target,
          redirectType: map.redirectType,
          preserveQueryString: map.preserveQueryString,
          preserveLanguage: map.preserveLanguage,
          includeVirtualFolder: map.includeVirtualFolder,
        })),
      );

      const trace = await simulate({
        url: urlInput,
        locale,
        rules,
        siteLanguage,
      });

      onTraceComplete(trace);
    } catch (err) {
      const message = `Simulator error: ${err instanceof Error ? err.message : String(err)}`;
      setSimulationError(message);
      toast.error("Simulation failed", { description: message });
    } finally {
      setIsSimulating(false);
    }
  }, [isTestEnabled, isSimulating, maps, urlInput, siteLanguage, onTraceComplete]);

  const safeMaps = maps ?? [];
  const hasMaps = safeMaps.length > 0;
  const firstRule = safeMaps[0]?.mappings?.[0]?.source ?? null;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 h-full">
      {/* URL input + Test button — always visible at top of right panel */}
      <div className="flex flex-col gap-3 max-w-xl">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-url-input" className="text-sm font-medium">
            URL to test
          </Label>
          <Input
            id="test-url-input"
            value={urlInput}
            onChange={handleUrlChange}
            placeholder="https://example.com/path or /path"
            aria-invalid={urlError !== null}
            aria-describedby={urlError ? "test-url-error" : undefined}
            className="font-mono text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && isTestEnabled && !isSimulating) {
                void handleTest();
              }
            }}
          />
          {urlError && (
            <p
              id="test-url-error"
              role="status"
              className="text-xs text-destructive"
            >
              {urlError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Include a locale prefix to test locale-aware rules (e.g.{" "}
            <code className="font-mono">/de-DE/old-page</code>).
          </p>
        </div>

        <Button
          onClick={() => void handleTest()}
          disabled={!isTestEnabled || isSimulating}
          className="w-full max-w-xs"
        >
          {isSimulating ? "Running..." : "Test"}
        </Button>
      </div>

      {/* Trace area — empty state or results */}
      <div className="min-w-0 flex-1">
        {simulationError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {simulationError}
          </div>
        )}

        {lastTrace !== null ? (
          <TraceCardStack
            trace={lastTrace}
            onRowClick={onRequestEditRow}
          />
        ) : (
          <EmptyState
            scopePicked={hasMaps}
            firstRule={firstRule}
            onTrySample={(sampleUrl) => setUrlInput(sampleUrl)}
          />
        )}
      </div>
    </div>
  );
}
