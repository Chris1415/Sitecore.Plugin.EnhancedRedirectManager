"use client";

/**
 * Exhaustive switch-renderer over the SimulationStage union — assertNeverStage
 * in the default branch makes a new stage a COMPILE-time failure rather than a
 * silently unrendered card.
 *
 * ⚠ All colours are semantic tokens via var(--token), never hex, and never
 * hsl(var(--token)) — the tokens carry hex values, so wrapping one in hsl()
 * yields an invalid colour that silently collapses.
 * See docs/build-decisions.md#semantic-tokens.
 */

import type { SimulationStage } from "@/lib/redirects/proxy-simulator";
import { assertNeverStage } from "@/lib/redirects/proxy-simulator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TraceCardProps {
  stage: SimulationStage;
  index: number;
}

// ---------------------------------------------------------------------------
// Shared card shell
// ---------------------------------------------------------------------------

interface StageCardShellProps {
  index: number;
  label: string;
  labelId: string;
  borderClass: string;
  bgStyle?: React.CSSProperties;
  children: React.ReactNode;
}

function StageCardShell({
  index,
  label,
  labelId,
  borderClass,
  bgStyle,
  children,
}: StageCardShellProps) {
  return (
    <section
      aria-labelledby={labelId}
      className={cn(
        "elev-card rounded-lg border-l-4 p-4",
        borderClass,
      )}
      style={bgStyle}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <h3
          id={labelId}
          className="text-sm font-semibold text-foreground leading-tight"
        >
          {label}
        </h3>
      </div>
      <div className="pl-8 text-xs text-muted-foreground space-y-1">
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Per-stage renderers
// ---------------------------------------------------------------------------

function PreFilterCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "pre-filter" }>; index: number }) {
  const labelId = `stage-pre-filter-${index}`;
  return (
    <StageCardShell
      index={index}
      label={`Pre-filter — ${stage.reason}`}
      labelId={labelId}
      borderClass="border-l-muted-foreground/40"
    >
      <p className="text-muted-foreground/80">
        Informational — runtime would skip this URL ({stage.reason}), but simulator continues for diagnostic visibility.
      </p>
    </StageCardShell>
  );
}

function NormalizeCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "normalize" }>; index: number }) {
  const labelId = `stage-normalize-${index}`;
  return (
    <StageCardShell
      index={index}
      label="Normalize"
      labelId={labelId}
      borderClass="border-l-primary/60"
    >
      <p>
        <span className="font-medium text-foreground">Original:</span>{" "}
        <code className="font-mono">{stage.originalUrl}</code>
      </p>
      <p>
        <span className="font-medium text-foreground">Path:</span>{" "}
        <code className="font-mono">{stage.normalizedPath}</code>
      </p>
      {stage.queryString && (
        <p>
          <span className="font-medium text-foreground">Query:</span>{" "}
          <code className="font-mono">{stage.queryString}</code>
        </p>
      )}
    </StageCardShell>
  );
}

function CandidatesCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "candidates" }>; index: number }) {
  const labelId = `stage-candidates-${index}`;
  return (
    <StageCardShell
      index={index}
      label="Candidates"
      labelId={labelId}
      borderClass="border-l-primary/60"
    >
      <ul className="list-disc pl-4 space-y-0.5">
        {stage.candidates.map((c, i) => (
          <li key={i}>
            <code className="font-mono">{c}</code>
          </li>
        ))}
      </ul>
    </StageCardShell>
  );
}

function EvaluateRowCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "evaluate-row" }>; index: number }) {
  const labelId = `stage-eval-${index}`;
  const isTimeout = stage.outcome === "timeout";
  const isMatch = stage.outcome === "match";
  return (
    <StageCardShell
      index={index}
      label={`Evaluate row — map ${stage.rule.mapId} row ${stage.rule.rowIndex}`}
      labelId={labelId}
      borderClass={
        isTimeout
          ? "border-l-destructive/60"
          : isMatch
          ? "border-l-primary"
          : "border-l-muted-foreground/40"
      }
      bgStyle={
        isTimeout
          ? { background: "color-mix(in oklch, var(--destructive) 8%, var(--card))" }
          : undefined
      }
    >
      <p>
        <span className="font-medium text-foreground">Source:</span>{" "}
        <code className="font-mono">{stage.rule.source}</code>
      </p>
      <p>
        <span className="font-medium text-foreground">Detected mode:</span>{" "}
        {stage.detectedMode}
      </p>
      <p>
        <span className="font-medium text-foreground">Outcome:</span>{" "}
        {isTimeout ? (
          <span className="text-destructive font-semibold">
            pattern too slow — runtime would also stall here
          </span>
        ) : isMatch ? (
          <span className="text-primary font-semibold">match</span>
        ) : (
          "no-match"
        )}
      </p>
      {isMatch && stage.candidateThatMatched && (
        <p>
          <span className="font-medium text-foreground">Matched candidate:</span>{" "}
          <code className="font-mono">{stage.candidateThatMatched}</code>
        </p>
      )}
      {stage.capturedGroups && stage.capturedGroups.length > 0 && (
        <p>
          <span className="font-medium text-foreground">Captured groups:</span>{" "}
          {stage.capturedGroups.join(", ")}
        </p>
      )}
    </StageCardShell>
  );
}

function SubstituteCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "substitute" }>; index: number }) {
  const labelId = `stage-substitute-${index}`;
  return (
    <StageCardShell
      index={index}
      label="Substitute"
      labelId={labelId}
      borderClass="border-l-primary/60"
    >
      <p>
        <span className="font-medium text-foreground">Original target:</span>{" "}
        <code className="font-mono">{stage.originalTarget}</code>
      </p>
      <p>
        <span className="font-medium text-foreground">After substitution:</span>{" "}
        <code className="font-mono">{stage.substitutedTarget}</code>
      </p>
      {Object.keys(stage.substitutions).length > 0 && (
        <ul className="list-disc pl-4 space-y-0.5">
          {Object.entries(stage.substitutions).map(([k, v]) => (
            <li key={k}>
              <code className="font-mono">{k}</code> → <code className="font-mono">{v}</code>
            </li>
          ))}
        </ul>
      )}
    </StageCardShell>
  );
}

function FlagEffectsCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "flag-effects" }>; index: number }) {
  const labelId = `stage-flags-${index}`;
  return (
    <StageCardShell
      index={index}
      label="Flag effects"
      labelId={labelId}
      borderClass="border-l-primary/60"
    >
      <p>
        <span className="font-medium text-foreground">Preserve query string:</span>{" "}
        {stage.preserveQueryString ? "yes" : "no"}
        {stage.queryStringApplied && (
          <> — applied: <code className="font-mono">{stage.queryStringApplied}</code></>
        )}
      </p>
      <p>
        <span className="font-medium text-foreground">Preserve language:</span>{" "}
        {stage.preserveLanguage ? "yes" : "no"}
        {stage.languageApplied && (
          <> — applied: <code className="font-mono">{stage.languageApplied}</code></>
        )}
      </p>
      <p>
        <span className="font-medium text-foreground">Include virtual folder:</span>{" "}
        {stage.includeVirtualFolder ? "yes" : "no"}
      </p>
    </StageCardShell>
  );
}

function DispatchCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "dispatch" }>; index: number }) {
  const labelId = `stage-dispatch-${index}`;
  return (
    <StageCardShell
      index={index}
      label="Dispatch"
      labelId={labelId}
      borderClass="border-l-primary"
    >
      <p>
        <span className="font-medium text-foreground">Final URL:</span>{" "}
        <code className="font-mono">{stage.finalUrl}</code>
      </p>
      <p>
        <span className="font-medium text-foreground">Redirect type:</span>{" "}
        {stage.redirectType}
      </p>
    </StageCardShell>
  );
}

function DiagnosticIncompleteCard({ stage, index }: { stage: Extract<SimulationStage, { kind: "diagnostic-incomplete" }>; index: number }) {
  const labelId = `stage-diagnostic-${index}`;
  return (
    <StageCardShell
      index={index}
      label="Diagnostic incomplete"
      labelId={labelId}
      borderClass="border-l-destructive/70"
      bgStyle={{ background: "color-mix(in oklch, var(--destructive) 10%, var(--card))" }}
    >
      <p className="text-destructive font-semibold">
        Diagnostic incomplete after 3s — evaluated {stage.evaluatedRows} of {stage.totalRows} rows
      </p>
      <p className="text-muted-foreground/80">
        The simulation hit the 3-second wall-clock cap. Results above are partial.
        Simplify regex patterns or reduce the number of rules to improve performance.
      </p>
    </StageCardShell>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function TraceCard({ stage, index }: TraceCardProps) {
  switch (stage.kind) {
    case "pre-filter":
      return <PreFilterCard stage={stage} index={index} />;
    case "normalize":
      return <NormalizeCard stage={stage} index={index} />;
    case "candidates":
      return <CandidatesCard stage={stage} index={index} />;
    case "evaluate-row":
      return <EvaluateRowCard stage={stage} index={index} />;
    case "substitute":
      return <SubstituteCard stage={stage} index={index} />;
    case "flag-effects":
      return <FlagEffectsCard stage={stage} index={index} />;
    case "dispatch":
      return <DispatchCard stage={stage} index={index} />;
    case "diagnostic-incomplete":
      return <DiagnosticIncompleteCard stage={stage} index={index} />;
    default:
      // T007: compile-time exhaustiveness check
      return assertNeverStage(stage);
  }
}
