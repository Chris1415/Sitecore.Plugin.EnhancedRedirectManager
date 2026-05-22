"use client";

/**
 * EmptyState.tsx — T035 (PRD-004 T4)
 *
 * Pre-test hero shown in the right column before the first simulation run.
 *
 * Two sub-states:
 *   - No scope picked yet: instructional copy about picking collection + site + maps.
 *   - Scope picked, URL empty: "Try a sample URL" button that pre-fills from the
 *     first rule of the first picked map (OQ-1 default).
 *
 * Visual contract: pocs/poc-v1-prd004/test-empty.html
 */

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  /** Whether at least one map has been selected in the scope picker. */
  scopePicked: boolean;
  /** Source pattern from the first rule of the first picked map, or null. */
  firstRule: string | null;
  /** Callback to pre-fill the URL input with a sample URL. */
  onTrySample: (url: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({ scopePicked, firstRule, onTrySample }: EmptyStateProps) {
  if (!scopePicked) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: "color-mix(in oklch, var(--primary) 10%, var(--card))" }}
          aria-hidden="true"
        >
          🔍
        </div>
        <h2 className="text-base font-semibold text-foreground">
          Pick a scope to get started
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Select a collection, site, and one or more redirect maps on the left.
          Then enter a URL and click <strong>Test</strong> to see a detailed
          simulation trace.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-3">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: "color-mix(in oklch, var(--primary) 10%, var(--card))" }}
        aria-hidden="true"
      >
        ⚡
      </div>
      <h2 className="text-base font-semibold text-foreground">
        Ready to test
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Enter a URL in the field on the left and click <strong>Test</strong> to
        run a local simulation against the selected redirect maps. Results appear
        here as a structured trace.
      </p>
      {firstRule && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onTrySample(firstRule)}
          className="mt-2"
        >
          Try a sample URL
        </Button>
      )}
    </div>
  );
}
