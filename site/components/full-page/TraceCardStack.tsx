"use client";

/**
 * TraceCardStack.tsx — T035 + T037 + T038 (PRD-004 T4)
 *
 * Orchestrates staggered rendering of trace stage cards + the final ResultCard.
 * Copy-as-JSON button with Sonner toast (T037).
 *
 * ADR-0040: Simulator is async; UI staggers card reveal via useStaggeredRender.
 * ADR-0027: prefers-reduced-motion → instant render (handled in useStaggeredRender).
 *
 * Visual contract:
 *   pocs/poc-v1-prd004/test-matched.html
 *   pocs/poc-v1-prd004/test-unmatched.html
 *   pocs/poc-v1-prd004/test-diagnostic-incomplete.html
 */

import { useCallback } from "react";
import { TraceCard } from "@/components/full-page/TraceCard";
import { ResultCard } from "@/components/full-page/ResultCard";
import { useStaggeredRender } from "@/hooks/use-staggered-render";
import { Button } from "@/components/ui/button";
import type { SimulationTrace } from "@/lib/redirects/proxy-simulator";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TraceCardStackProps {
  trace: SimulationTrace;
  onRowClick: (mapId: string, rowIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TraceCardStack({ trace, onRowClick }: TraceCardStackProps) {
  const visibleStages = useStaggeredRender(trace.stages, { intervalMs: 40 });

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
      toast.success("Copied", {
        description: "Full trace JSON copied to clipboard.",
      });
    } catch {
      toast.error("Copy failed", {
        description: "Could not write to clipboard.",
      });
    }
  }, [trace]);

  return (
    <div className="space-y-3">
      {/* Stage cards — staggered via useStaggeredRender */}
      {visibleStages.map((stage, i) => (
        <TraceCard key={`stage-${i}-${stage.kind}`} stage={stage} index={i} />
      ))}

      {/* Result card — shown after all stages are revealed */}
      {visibleStages.length === trace.stages.length && (
        <ResultCard result={trace.result} onRowClick={onRowClick} />
      )}

      {/* Copy-as-JSON footer — always available when trace is present */}
      <div className="flex justify-end pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyJson}
          className="text-xs gap-1.5"
          aria-label="Copy trace as JSON"
        >
          Copy as JSON
        </Button>
      </div>

      {/* Trace metadata */}
      <p className="text-xs text-muted-foreground text-right">
        Simulated in {trace.durationMs}ms · started {new Date(trace.startedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
