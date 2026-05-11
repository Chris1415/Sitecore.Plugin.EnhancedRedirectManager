/**
 * StatTile — T031
 *
 * Reusable tile component for the Dashboard Widget.
 * Shows a big number (or text) + label.
 * Tiles are non-interactive in MVP.
 *
 * Per § 4c-4: tiles non-interactive (no hover affordance, no click handler).
 * Each tile is <article> with aria-label containing the value per T034 a11y spec.
 */

interface StatTileProps {
  label: string;
  value: string | number;
  /** aria-label for the article — should include the value for screen readers */
  ariaLabel: string;
}

export function StatTile({ label, value, ariaLabel }: StatTileProps) {
  return (
    <article
      aria-label={ariaLabel}
      className="flex flex-col items-center gap-0.5 py-2 px-3 text-center"
    >
      <span className="font-mono text-3xl font-semibold tabular-nums leading-none text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </article>
  );
}
