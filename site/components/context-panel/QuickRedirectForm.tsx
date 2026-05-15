/**
 * QuickRedirectForm — T025 (Epic E, T4)
 *
 * Always-visible inline form at the top of the Context Panel body.
 * Replaces AddRedirectModal as the primary add-redirect surface per ADR-0028 Option A.
 *
 * Three-state machine (ADR-0029):
 *   - no-match (matchedGroups.length === 0): create-new; RedirectType select ENABLED; auto-name preview
 *   - single-match (matchedGroups.length === 1): add-to-existing; RedirectType select DISABLED
 *   - multi-match (matchedGroups.length >= 2): add-to-existing + dropdown to pick target map
 *
 * Auto-name slug: last non-empty segment of pageInfo.url, lower-kebab-cased + "-redirects"
 *
 * Functional contract: same SDK wrappers as AddRedirectModal (createRedirectMap /
 * updateRedirectMap via ContextPanel's handleQuickSubmit callback — no direct SDK import).
 *
 * Browser-globals discipline: no typeof window in render or useState init.
 */

"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { REDIRECT_TYPES, redirectTypeDisplayName } from "@/lib/redirects/redirect-type-enum";
import type { RedirectMapItem, RedirectType } from "@/lib/domain/types";
import type { MatchedGroup } from "@/lib/match/context-panel-matcher";

/** Direction the redirect points relative to the page being edited.
 *  - "to-this-page": the user-typed URL is the SOURCE (X → this page). Default.
 *  - "from-this-page": the user-typed URL is the TARGET (this page → X). */
export type QuickRedirectDirection = "to-this-page" | "from-this-page";

// ─── Slug helper ────────────────────────────────────────────────────────────

/**
 * Derives an auto-name slug from a page URL.
 * Strip leading /, replace / with -, strip query/hash, lowercase, collapse --.
 * E.g. /products/sneaker-cloud-runner → sneaker-cloud-runner
 *      /products/foo/bar             → bar
 */
function derivePageSlug(url: string): string {
  // Strip query + hash
  const clean = url.split("?")[0].split("#")[0];
  // Split into segments and take last non-empty
  const segments = clean.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  // Lower-kebab-case: lowercase and collapse multiple dashes
  return last.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-");
}

// ─── Relative time helper ───────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "recently";
    const diff = Date.now() - t;
    if (diff < 0) return "just now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} h ago`;
    const days = Math.floor(hrs / 24);
    return `${days} d ago`;
  } catch {
    return "recently";
  }
}

// ─── Props ──────────────────────────────────────────────────────────────────

export type QuickSubmitArgs =
  | { mode: "add-to-existing"; mapId: string; source: string; target: string }
  | {
      mode: "create-new";
      name: string;
      source: string;
      target: string;
      redirectType: RedirectType;
    };

export interface QuickRedirectFormProps {
  pageInfo: { url: string };
  /** Matched groups from matchPageRedirects — the form extracts RedirectMapItem from each */
  matchedGroups: MatchedGroup[] | RedirectMapItem[];
  /** When multi-match, the currently-selected map id (controlled externally) */
  selectedMapId?: string;
  onSubmit: (args: QuickSubmitArgs) => Promise<void>;
}

/** Normalize matchedGroups to RedirectMapItem[] regardless of input type */
function toMaps(groups: MatchedGroup[] | RedirectMapItem[]): RedirectMapItem[] {
  if (groups.length === 0) return [];
  // Check if it's MatchedGroup[] (has .map property) or RedirectMapItem[] (has .id property)
  const first = groups[0];
  if ("map" in first) {
    return (groups as MatchedGroup[]).map((g) => g.map);
  }
  return groups as RedirectMapItem[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function QuickRedirectForm({
  pageInfo,
  matchedGroups: matchedGroupsRaw,
  selectedMapId,
  onSubmit,
}: QuickRedirectFormProps) {
  const matchedGroups = toMaps(matchedGroupsRaw);
  const isCreateNew = matchedGroups.length === 0;

  // Determine target map for add-to-existing
  const sortedGroups = [...matchedGroups].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const [internalSelectedId, setInternalSelectedId] = useState<string>(() =>
    sortedGroups[0]?.id ?? "",
  );

  // Resolve the effective selected map id (external prop takes precedence)
  const effectiveMapId = selectedMapId ?? internalSelectedId;
  const targetMap = sortedGroups.find((m) => m.id === effectiveMapId) ?? sortedGroups[0];

  const [urlInput, setUrlInput] = useState(pageInfo.url);
  const [direction, setDirection] = useState<QuickRedirectDirection>("to-this-page");
  const [redirectType, setRedirectType] = useState<RedirectType>("Redirect301");
  const [submitting, setSubmitting] = useState(false);

  const pageSlug = derivePageSlug(pageInfo.url);
  const autoName = pageSlug ? `${pageSlug}-redirects` : "page-redirects";

  const isMultiMatch = matchedGroups.length >= 2;

  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Map the form state to the wire (source, target) pair. */
  function resolveSourceTarget(): { source: string; target: string } {
    const trimmed = urlInput.trim();
    if (direction === "to-this-page") {
      return { source: trimmed, target: pageInfo.url };
    }
    return { source: pageInfo.url, target: trimmed };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { source, target } = resolveSourceTarget();
      if (isCreateNew) {
        await onSubmit({
          mode: "create-new",
          name: autoName,
          source,
          target,
          redirectType,
        });
      } else {
        await onSubmit({
          mode: "add-to-existing",
          mapId: targetMap?.id ?? "",
          source,
          target,
        });
      }
      // On success: reset URL input to pageInfo.url
      setUrlInput(pageInfo.url);
      if (isCreateNew) setRedirectType("Redirect301");
    } catch (err) {
      // Preserve entered values so the operator can retry.
      // The parent (ContextPanel.handleQuickSubmit) already shows a toast — we
      // just record the error locally so it does not escape as an unhandled
      // Promise rejection.
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleDirection() {
    setDirection((d) => (d === "to-this-page" ? "from-this-page" : "to-this-page"));
  }

  const directionLabel =
    direction === "to-this-page" ? "→ this page" : "this page →";
  const directionAria =
    direction === "to-this-page"
      ? "Redirecting to this page — click to flip"
      : "Redirecting from this page — click to flip";
  const urlPlaceholder =
    direction === "to-this-page" ? "/old-source-url" : "/new-target-url";
  const urlAriaLabel =
    direction === "to-this-page" ? "Source URL" : "Target URL";

  return (
    <form
      className="cp-quick-form"
      onSubmit={handleSubmit}
      aria-label="Quick-add redirect for this page"
    >
      {/* Multi-match dropdown affordance — T026 */}
      {isMultiMatch && (
        <div className="cp-quick-form__multi-match">
          <label
            className="cp-quick-form__multi-match-label"
            htmlFor="cp-multi-match-select"
          >
            Adding to
          </label>
          <select
            id="cp-multi-match-select"
            className="blok-select w-full text-sm"
            value={effectiveMapId}
            onChange={(e) => setInternalSelectedId(e.target.value)}
            aria-label="Adding to"
          >
            {sortedGroups.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({relativeTime(m.updatedAt)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Source input label */}
      <label className="cp-quick-form__label" htmlFor="cp-quick-source">
        Quick redirect
      </label>

      {/* URL input — mono font, editable. Acts as source OR target depending
       *  on `direction` state (see resolveSourceTarget). */}
      <Input
        id="cp-quick-source"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        placeholder={urlPlaceholder}
        className="font-mono text-xs"
        aria-label={urlAriaLabel}
        autoComplete="off"
      />

      {/* Row: RedirectType select + direction toggle + Add button */}
      <div className="cp-quick-form__row">
        {/* Native select — matches POC pattern; testable in jsdom */}
        <select
          className="blok-select blok-input--mono cp-quick-form__type text-xs"
          value={isCreateNew ? redirectType : (targetMap?.redirectType ?? "Redirect301")}
          onChange={(e) => isCreateNew && setRedirectType(e.target.value as RedirectType)}
          disabled={!isCreateNew}
          aria-label="Redirect type"
          aria-disabled={!isCreateNew || undefined}
        >
          {REDIRECT_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {redirectTypeDisplayName(rt)}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="cp-quick-form__direction"
          onClick={toggleDirection}
          aria-label={directionAria}
          aria-pressed={direction === "from-this-page"}
          title="Flip direction"
        >
          <span>{directionLabel}</span>
          <ArrowLeftRight className="h-3 w-3 opacity-70" aria-hidden="true" />
        </button>

        <Button
          type="submit"
          size="sm"
          className="cp-quick-form__add"
          disabled={!urlInput.trim() || submitting}
        >
          {submitting ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* Hint copy — add-to-existing mode */}
      {!isCreateNew && targetMap && (
        <p className="cp-quick-form__hint">
          Uses <strong>{targetMap.name}</strong>&apos;s redirect type
        </p>
      )}

      {/* Auto-name preview — create-new mode only */}
      {isCreateNew && (
        <p className="cp-quick-form__auto-name">
          New map: <strong>{autoName}</strong>
        </p>
      )}

      {/* Submit error — shown below form fields; parent toast already announced it */}
      {submitError && (
        <p
          role="alert"
          className="text-xs text-destructive font-mono"
          aria-live="assertive"
        >
          {submitError}
        </p>
      )}
    </form>
  );
}
