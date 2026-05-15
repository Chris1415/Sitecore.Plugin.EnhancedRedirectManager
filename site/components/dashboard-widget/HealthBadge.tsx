/**
 * HealthBadge — "all healthy" placeholder badge.
 *
 * Semantic intent (operator clarification 2026-05-15): "healthy" means every
 * redirect actually resolves and works end-to-end (HTTP probe of the source →
 * verify the response status matches the configured redirectType, and the
 * target resolves). That verification is NOT implemented yet — it needs a
 * separate worker / scheduled probe outside the Sitecore Authoring path. So
 * the badge currently renders a static "all healthy" mock and carries
 * data-preview-mock so a future operator can spot it as deferred.
 *
 * Collisions are a SEPARATE concern with their own badge (CollisionsBadge) —
 * a collision is "two mappings have the same source URL", which we CAN
 * compute today from the fetched maps.
 */

function CheckGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <polyline points="2,6.5 5,9.5 10,3" />
    </svg>
  );
}

export function HealthBadge() {
  return (
    <span
      className="elev-success-badge"
      data-preview-mock="true"
      role="status"
      aria-label="All healthy (deferred verification)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "var(--text-xs)",
        color: "var(--success-foreground)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <CheckGlyph />
      all healthy
    </span>
  );
}
