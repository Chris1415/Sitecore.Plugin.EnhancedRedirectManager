"use client";

/**
 * ResultCard.tsx — T035 + T038 (PRD-004 T4)
 *
 * Visually distinct card rendered at the bottom of the trace stack.
 * Shows matched vs unmatched state.
 *
 * Matched state:
 *   - Accent border (var(--primary))
 *   - HTTP code chip
 *   - "Open this rule in Manage →" CTA button (deep-link to EditRowModal)
 *
 * Unmatched state:
 *   - "rows considered" — first 5 shown collapsed → 20 expanded → "+ N more" chunked footer
 *   - "Add a rule for this URL" CTA (deep-links to Manage + add-row modal)
 *
 * Visual contract:
 *   pocs/poc-v1-prd004/test-matched.html
 *   pocs/poc-v1-prd004/test-unmatched.html
 *   pocs/poc-v1-prd004/test-unmatched-expanded.html
 *
 * AC-T2.2: rows-considered display cap at 20 + "+ N more rows" expand control.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { SimulationResult } from "@/lib/redirects/proxy-simulator";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResultCardProps {
  result: SimulationResult;
  onRowClick: (mapId: string, rowIndex: number) => void;
}

// ---------------------------------------------------------------------------
// Matched result
// ---------------------------------------------------------------------------

function httpCodeLabel(redirectType: string): string {
  switch (redirectType) {
    case "Redirect301":
      return "301";
    case "Redirect302":
      return "302";
    case "ServerTransfer":
      return "SrvXfr";
    default:
      return redirectType;
  }
}

function MatchedCard({
  result,
  onRowClick,
}: {
  result: Extract<SimulationResult, { matched: true }>;
  onRowClick: (mapId: string, rowIndex: number) => void;
}) {
  return (
    <section
      aria-labelledby="result-card-heading"
      className="rounded-lg border-2 p-5 space-y-3"
      style={{ borderColor: "var(--primary)" }}
    >
      <div className="flex items-center gap-2">
        <h3 id="result-card-heading" className="text-base font-semibold text-foreground">
          Match found
        </h3>
        {/* HTTP code chip */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: "color-mix(in oklch, var(--primary) 20%, var(--card))",
            color: "var(--primary)",
          }}
          aria-label={`Redirect type ${httpCodeLabel(result.redirectType)}`}
        >
          {httpCodeLabel(result.redirectType)}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground">Destination:</span>{" "}
          <code className="font-mono">{result.finalUrl}</code>
        </p>
        <p>
          <span className="font-medium text-foreground">Map:</span>{" "}
          <code className="font-mono">{result.rule.mapId}</code>
        </p>
        <p>
          <span className="font-medium text-foreground">Row index:</span>{" "}
          {result.rule.rowIndex}
        </p>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => onRowClick(result.rule.mapId, result.rule.rowIndex)}
        className="gap-1"
        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
      >
        Open this rule in Manage →
      </Button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Unmatched result
// ---------------------------------------------------------------------------

const INITIAL_SHOW = 5;
const EXPANDED_SHOW = 20;
const CHUNK_SIZE = 50;

function UnmatchedCard({
  result,
  onRowClick,
}: {
  result: Extract<SimulationResult, { matched: false }>;
  onRowClick: (mapId: string, rowIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [chunkLimit, setChunkLimit] = useState(EXPANDED_SHOW);

  const rows = result.rowsConsidered;
  const total = result.rowsConsideredTotal;
  const showCount = expanded ? Math.min(chunkLimit, rows.length) : INITIAL_SHOW;
  const visibleRows = rows.slice(0, showCount);
  // hiddenCount must be based on rows.length (the items we actually have to show),
  // not total (which may exceed rows.length due to the simulator's 20-row cap).
  // Using `total - showCount` when rows.length < total caused an infinite load-more
  // loop: chunkLimit grew but rows.length stayed at 20, so hiddenCount never reached 0.
  // (code-review finding M2, 2026-05-21)
  const hiddenCount = rows.length - showCount;

  const handleExpand = useCallback(() => {
    setExpanded(true);
    setChunkLimit(EXPANDED_SHOW);
  }, []);

  const handleLoadMore = useCallback(() => {
    setChunkLimit((prev) => prev + CHUNK_SIZE);
  }, []);

  return (
    <section
      aria-labelledby="result-card-heading"
      className="rounded-lg border border-border p-5 space-y-3"
    >
      <h3 id="result-card-heading" className="text-base font-semibold text-foreground">
        No match
      </h3>
      <p className="text-xs text-muted-foreground">
        None of the {total} rule{total === 1 ? "" : "s"} in the selected
        maps matched the provided URL.
      </p>

      {/* Rows considered */}
      {rows.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1">
            Rows considered ({total}):
          </p>
          <ul className="space-y-1">
            {visibleRows.map((rule) => (
              <li key={`${rule.mapId}-${rule.rowIndex}`} className="text-xs text-muted-foreground flex items-center gap-2">
                <code className="font-mono flex-1 truncate">{rule.source}</code>
                <span className="text-muted-foreground/50 text-[10px]">
                  row {rule.rowIndex}
                </span>
              </li>
            ))}
          </ul>

          {/* Expand / load-more controls */}
          {!expanded && rows.length > INITIAL_SHOW && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs text-muted-foreground"
              onClick={handleExpand}
            >
              + {total - INITIAL_SHOW} more rows considered (no match)
            </Button>
          )}
          {expanded && hiddenCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs text-muted-foreground"
              onClick={handleLoadMore}
            >
              + {Math.min(hiddenCount, CHUNK_SIZE)} more rows
            </Button>
          )}
        </div>
      )}

      {/* Add a rule CTA — deep-link to Manage + add-row modal */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onRowClick("", -1)} // -1 = add-row sentinel; FullPage interprets empty mapId as "add new"
        className="gap-1"
      >
        Add a rule for this URL
      </Button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function ResultCard({ result, onRowClick }: ResultCardProps) {
  if (result.matched) {
    return <MatchedCard result={result} onRowClick={onRowClick} />;
  }
  return <UnmatchedCard result={result} onRowClick={onRowClick} />;
}
