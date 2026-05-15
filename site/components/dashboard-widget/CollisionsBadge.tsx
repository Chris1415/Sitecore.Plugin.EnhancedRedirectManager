/**
 * CollisionsBadge — header badge that surfaces source-URL collisions on the
 * Dashboard Widget.
 *
 * A collision is two (or more) mappings — in any map across the selected site —
 * that share the SAME source URL. Computed by aggregateStats.collisionCount,
 * which counts the extra copies past the first occurrence (so /home appearing
 * 3× → 2 collisions). Case-insensitive, whitespace-trimmed.
 *
 *   collisionCount === 0  → "no collisions" with a check glyph (success colors)
 *   collisionCount  >  0  → "N collision(s)" with an alert glyph (warning colors)
 *
 * Distinct from HealthBadge — health is end-to-end resolve correctness (still
 * deferred to a follow-on PRD); collisions is a config-level conflict we can
 * detect today from the fetched maps alone.
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

function AlertGlyph() {
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
      <line x1="6" y1="2" x2="6" y2="7.5" />
      <circle cx="6" cy="9.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export interface CollisionsBadgeProps {
  collisionCount: number;
}

export function CollisionsBadge({ collisionCount }: CollisionsBadgeProps) {
  const hasCollisions = collisionCount > 0;
  const label = hasCollisions
    ? `${collisionCount} collision${collisionCount === 1 ? "" : "s"}`
    : "no collisions";
  const className = hasCollisions ? "elev-warning-badge" : "elev-success-badge";
  const color = hasCollisions
    ? "var(--warning-foreground, var(--destructive-foreground))"
    : "var(--success-foreground)";

  return (
    <span
      className={className}
      role="status"
      aria-label={
        hasCollisions
          ? `${collisionCount} colliding sources`
          : "No source-URL collisions"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "var(--text-xs)",
        color,
        fontFamily: "var(--font-mono)",
      }}
    >
      {hasCollisions ? <AlertGlyph /> : <CheckGlyph />}
      {label}
    </span>
  );
}
