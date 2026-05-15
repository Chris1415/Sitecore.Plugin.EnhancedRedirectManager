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

/**
 * RegexBanner — T029 (Epic E, T4)
 *
 * Re-skinned with V4 @blok/alert--info chrome per ADR-0027.
 * Copy unchanged from PRD-000.
 * Role remains "note" (calm, not urgent) — overrides Alert's default role="alert".
 */

export function RegexBanner() {
  const fullText =
    "Exact match only — no regex, query string, or language variants.";
  return (
    <div
      role="note"
      aria-label="Matching scope notice"
      className="cp-regex-banner"
      title={fullText}
    >
      <svg
        className="cp-regex-banner__icon"
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="4.5" r="0.75" fill="currentColor" />
      </svg>
      <span className="cp-regex-banner__text">{fullText}</span>
    </div>
  );
}
