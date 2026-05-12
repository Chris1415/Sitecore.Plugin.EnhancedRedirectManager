/**
 * RegexBanner — T022
 *
 * Persistent, non-dismissible banner stating that Context Panel matching is
 * exact-string only. Rendered at the top of the panel in all states.
 *
 * Per ADR-0005: regex pattern matching is deferred. This banner is
 * non-dismissible — it is a load-bearing UI contract.
 *
 * Uses role="note" (calm, informational) — NOT role="alert" (urgent).
 * Per § 4c-4: "Use Blok Alert with role='note' (NOT alert — calm tone per v1 spec)."
 *
 * The Alert component sets role="alert" by default; we override it here.
 */

export function RegexBanner() {
  return (
    <div
      role="note"
      aria-label="Matching scope notice"
      className="flex items-start gap-2 rounded-md bg-primary-bg px-3 py-2.5 text-sm text-foreground"
    >
      <span className="mt-0.5 shrink-0 text-primary-500 dark:text-primary-200" aria-hidden="true">
        ℹ
      </span>
      <span>
        Direct-string matches only — regex pattern matches are not yet covered.
      </span>
    </div>
  );
}
