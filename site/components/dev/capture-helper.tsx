"use client";

/**
 * TEMPORARY — Tranche 2 SDK capture helper.
 *
 * Renders the response of a single SDK call as a copy-pasteable JSON block
 * so the operator can paste the captured shape into tests/fixtures/graphql/.
 *
 * Tranche 4+ replaces every route's body with the real surface UI and
 * removes the call sites of this component. This file may be deleted at
 * the end of Tranche 4 — the capture work is one-shot.
 *
 * Source: lib/sdk/* wrappers; assumed-shape fixtures under
 * tests/fixtures/graphql/. Per ADR-0013 (revised 2026-05-10) the capture
 * happens at the Tranche 2 / Tranche 6 gate; this UI exists to make the
 * Tranche 2 gate practical without operator console-spelunking.
 */

import { useEffect, useState, type ReactNode } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; value: unknown }
  | { kind: "error"; error: string };

interface CaptureHelperProps {
  /** Human-readable title shown in the header. */
  label: string;
  /** Fixture filename that this capture replaces (for the paste-target hint). */
  fixtureFile: string;
  /** Optional child shown above the auto-fetch result (e.g. inputs, manual triggers). */
  children?: ReactNode;
  /** Async fn that resolves with the SDK response. Renders as JSON on success. */
  fetcher: () => Promise<unknown>;
  /** When true, auto-fetches on mount. Default true. Set false for manual-trigger routes. */
  autoFetch?: boolean;
}

export function CaptureHelper({
  label,
  fixtureFile,
  children,
  fetcher,
  autoFetch = true,
}: CaptureHelperProps) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const runFetch = async () => {
    setStatus({ kind: "loading" });
    try {
      const value = await fetcher();
      setStatus({ kind: "success", value });
    } catch (err) {
      setStatus({
        kind: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  useEffect(() => {
    if (autoFetch) {
      // The fetcher legitimately drives setState on mount — same canonical
      // pattern Blok ships in `components/ui/dnd-context.tsx`. Next 16's
      // react-hooks/set-state-in-effect rule fires false-positives here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void runFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]);

  const json =
    status.kind === "success" ? JSON.stringify(status.value, null, 2) : "";

  const copyJson = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — operator can select+copy manually
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 my-3">
      <header className="flex items-baseline justify-between gap-2 mb-2">
        <h2 className="text-base font-semibold">{label}</h2>
        <code className="text-xs text-muted-foreground">{fixtureFile}</code>
      </header>

      {children}

      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={() => void runFetch()}
          className="text-xs rounded border border-border-a11y px-2 py-1 hover:bg-muted disabled:opacity-50"
          disabled={status.kind === "loading"}
        >
          {status.kind === "loading" ? "Fetching…" : "Re-fetch"}
        </button>
        <button
          type="button"
          onClick={() => void copyJson()}
          className="text-xs rounded border border-border-a11y px-2 py-1 hover:bg-muted disabled:opacity-50"
          disabled={status.kind !== "success"}
        >
          {copied ? "Copied" : "Copy JSON"}
        </button>
        <span className="text-xs text-muted-foreground">
          Paste into{" "}
          <code className="font-mono">tests/fixtures/graphql/{fixtureFile}</code>
        </span>
      </div>

      {status.kind === "loading" && (
        <p className="text-sm text-muted-foreground mt-2">Loading…</p>
      )}

      {status.kind === "error" && (
        <pre className="text-xs bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded p-2 mt-2 whitespace-pre-wrap break-all">
          {status.error}
        </pre>
      )}

      {status.kind === "success" && (
        <>
          <CaptureDiagnostics value={status.value} />
          <pre className="text-xs bg-muted/40 border border-border rounded p-2 mt-2 max-h-[480px] overflow-auto whitespace-pre">
            {json}
          </pre>
        </>
      )}
    </section>
  );
}

/**
 * Triage hints rendered above the JSON dump:
 * - GraphQL `errors` array (Authoring + Edge both surface here)
 * - Null `data.item` (item not found at the path)
 * - Empty array / empty children (nothing to capture yet)
 */
function CaptureDiagnostics({ value }: { value: unknown }) {
  if (value == null) {
    return (
      <p className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded p-2 mt-2">
        Call returned <code>null</code>/<code>undefined</code>. The SDK call
        completed but the response body is empty. Common causes: dev server
        hot-reload missed the schema fix (restart <code>npm run dev</code>);
        OAuth token expired; the call hit the wrong endpoint.
      </p>
    );
  }

  // Generic dive for GraphQL { errors: [...] } anywhere in the envelope.
  const errors = findGraphqlErrors(value);
  if (errors && errors.length > 0) {
    return (
      <div className="text-xs text-destructive-foreground bg-destructive/10 border border-destructive/30 rounded p-2 mt-2">
        <p className="font-semibold mb-1">
          GraphQL returned {errors.length} error
          {errors.length === 1 ? "" : "s"}:
        </p>
        <ul className="list-disc pl-4 space-y-0.5">
          {errors.map((e, i) => (
            <li key={i}>
              <code>{typeof e === "string" ? e : JSON.stringify(e)}</code>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Drill to data.item — Authoring children query specifically
  const item = findItem(value);
  if (item === null) {
    return (
      <p className="text-xs text-warning-foreground bg-warning/10 border border-warning/30 rounded p-2 mt-2">
        Authoring returned <code>data.item: null</code> — the path you supplied
        does not resolve to a Sitecore item. Check the collection + site names
        and that <code>/Settings/Redirects</code> exists under that site.
      </p>
    );
  }

  if (Array.isArray(value) && value.length === 0) {
    return (
      <p className="text-xs text-muted-foreground bg-muted/20 border border-border rounded p-2 mt-2">
        Empty array — call succeeded but returned no items. Either the
        collection/site is empty or you&apos;ve unwrapped past the actual
        payload.
      </p>
    );
  }

  return null;
}

function findGraphqlErrors(value: unknown): unknown[] | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (Array.isArray(v.errors) && v.errors.length > 0) return v.errors;
  if (v.data && typeof v.data === "object") {
    const d = v.data as Record<string, unknown>;
    if (Array.isArray(d.errors) && d.errors.length > 0) return d.errors;
  }
  return null;
}

function findItem(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  // Single .data unwrap (Authoring mutate path): result.data.item
  if (v.data && typeof v.data === "object") {
    const d = v.data as Record<string, unknown>;
    if ("item" in d) return d.item;
  }
  return undefined;
}
