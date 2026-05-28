"use client";

/**
 * TestSurface.tsx — T030 (PRD-004 T4) — right-panel only (operator UX restructure)
 *
 * Renders the right-side content of the Test tab:
 *   - URL input + Test button
 *   - PRD-005: "Check upstream" button + inline status (T023-T025)
 *   - PRD-005: UpstreamDriftBanner above trace area when drifted + not dismissed (T026)
 *   - TraceCardStack when lastTrace is set
 *   - EmptyState when no trace yet
 *
 * ADR-0041: lastTrace + activeTab live in FullPage (parent), not here.
 * ADR-0049: drift hook idle-on-mount; banner per-session dismiss via sessionStorage.
 *
 * Visual contract: pocs/poc-v1-prd004/test-empty.html (shared-rail layout)
 *                  pocs/poc-v1-prd004/test-matched.html
 *                  pocs/poc-v1-prd005/screen-test-idle.html
 *                  pocs/poc-v1-prd005/screen-test-drifted.html
 */

import { useCallback, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TraceCardStack } from "@/components/full-page/TraceCardStack";
import { EmptyState } from "@/components/full-page/EmptyState";
import { UpstreamDriftBanner } from "@/components/full-page/UpstreamDriftBanner";
import { simulate } from "@/lib/redirects/proxy-simulator";
import type { SimulationTrace } from "@/lib/redirects/proxy-simulator";
import type { RedirectMapItem } from "@/lib/domain/types";
import { useUpstreamDrift } from "@/hooks/use-upstream-drift";
import { ERROR_COPY } from "@/components/full-page/upstream-drift-copy";
import type { DriftError } from "@/lib/upstream-drift/types";
import { toast } from "sonner";
import { Check, Info, RefreshCw, Loader2 } from "lucide-react";

// Session-storage key for drift banner dismiss (per-session, per ADR-0049 R-arch2)
const DRIFT_BANNER_DISMISSED_KEY = "rm-drift-banner-dismissed";

// Helper: relative time formatter (used in inline status)
function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = new Date(isoString).getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
    const diffHour = Math.round(diffMin / 60);
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
    const diffDay = Math.round(diffHour / 24);
    return rtf.format(diffDay, "day");
  } catch {
    return "";
  }
}

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
  // PRD-005: upstream drift detection (ADR-0049 — no auto-fetch on mount)
  const { state: driftState, lastChecked, errorReason, retryAfterSeconds, recheck } =
    useUpstreamDrift();

  // SSR-safe sessionStorage dismiss — read in useEffect to avoid hydration mismatch.
  // setState inside useEffect is intentional here: we need the initial read to happen
  // client-side only (sessionStorage is not available during SSR). The re-render from
  // this single state update is acceptable and expected at mount time.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      const dismissed = sessionStorage.getItem(DRIFT_BANNER_DISMISSED_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR-safe client-only init: sessionStorage unavailable during SSR; single re-render at mount is acceptable (hydration mismatch guard)
      setBannerDismissed(dismissed);
    }
  }, []);

  const handleDismissBanner = useCallback(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(DRIFT_BANNER_DISMISSED_KEY, "1");
    }
    setBannerDismissed(true);
  }, []);

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

  // PRD-005: inline status block (T024 error, T025 in-sync)
  function renderInlineStatus() {
    if (driftState === "in-sync") {
      return (
        <div className="drift-status drift-status--in-sync" aria-live="polite">
          <span className="drift-status__glyph" aria-hidden="true">
            <Check size={12} strokeWidth={2.5} />
          </span>
          <span>
            In sync with upstream <code>dev</code> (checked{" "}
            {lastChecked ? formatRelativeTime(lastChecked) : "just now"})
          </span>
        </div>
      );
    }
    if (driftState === "error" && errorReason) {
      const copy = ERROR_COPY[errorReason as DriftError];
      const retryMin = retryAfterSeconds ? Math.ceil(retryAfterSeconds / 60) : null;
      const bodyText = copy.body.replace("{N}", retryMin != null ? String(retryMin) : "a few");
      return (
        <div className="drift-status drift-status--error" aria-live="polite">
          <span className="drift-status__glyph" aria-hidden="true">
            <Info size={12} strokeWidth={2} />
          </span>
          <div>
            <span>
              {copy.title}
              {bodyText ? ` ${bodyText}` : ""}
            </span>
            {copy.retry === "enabled" && (
              <div className="drift-status__retry">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void recheck()}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw size={10} className="mr-1" />
                  Retry
                </Button>
              </div>
            )}
            {copy.retry === "disabled-until-reset" && (
              <div className="drift-status__retry">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  aria-disabled="true"
                  className="h-6 px-2 text-xs"
                >
                  Retry in {retryMin ?? "a few"} min
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Operator-driven toolbar split (2026-05-28): testing on the left, upstream parity on the right.
          Below 1024px stacks vertically. Vertical divider on the right column visually separates the
          two distinct affordances — "what URL am I testing" vs "is my simulator current". */}
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT — Testing: URL input + Test button */}
        <section className="flex flex-col gap-3" aria-labelledby="test-section-label">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="test-url-input"
              id="test-section-label"
              className="text-sm font-medium"
            >
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
            className="w-full"
          >
            {isSimulating ? "Running..." : "Test"}
          </Button>
        </section>

        {/* RIGHT — Upstream parity: Check upstream button + inline status (PRD-005) */}
        <section
          className="flex flex-col gap-3 lg:border-l lg:border-border lg:pl-8"
          aria-labelledby="upstream-section-label"
        >
          <div className="flex flex-col gap-1.5">
            <span
              id="upstream-section-label"
              className="text-sm font-medium"
            >
              Upstream parity
            </span>
            <p className="text-xs text-muted-foreground">
              Verify the simulator is in sync with the upstream{" "}
              <code className="font-mono">RedirectsProxy</code> before you rely on the trace.
            </p>
          </div>

          <button
            type="button"
            className="drift-check-btn"
            onClick={() => void recheck()}
            disabled={driftState === "checking"}
            aria-busy={driftState === "checking" ? "true" : undefined}
            aria-label="Re-check upstream RedirectsProxy for drift"
          >
            {driftState === "checking" ? (
              <>
                <Loader2 size={14} className="drift-spinner-anim animate-spin" aria-hidden="true" />
                Checking…
              </>
            ) : (
              <>
                <RefreshCw size={14} aria-hidden="true" />
                Check upstream
              </>
            )}
          </button>

          {renderInlineStatus()}
        </section>
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

        {/* PRD-005: drift banner ABOVE trace area when drifted + not dismissed (T026) */}
        {driftState === "drifted" && (
          <UpstreamDriftBanner
            lastChecked={lastChecked}
            dismissed={bannerDismissed}
            onDismiss={handleDismissBanner}
          />
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
