/**
 * StatTile — dashboard widget stat tile.
 *
 * Equal-width, centred, non-interactive (per § 4c-4).
 * Numeric values render large in font-mono; text values (e.g. "1 hour ago"
 * or a formatted date) render at a smaller size so they don't wrap.
 *
 * Each tile is <article> with aria-label per T034 a11y spec.
 */

import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string | number;
  /** Optional icon rendered above the label for visual hierarchy. */
  icon?: LucideIcon;
  /** aria-label for the article — should include the value for screen readers. */
  ariaLabel: string;
}

export function StatTile({ label, value, icon: Icon, ariaLabel }: StatTileProps) {
  const isNumeric = typeof value === "number";
  return (
    <article
      aria-label={ariaLabel}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-3 px-2 text-center min-w-0"
    >
      <span
        className={
          isNumeric
            ? "font-mono text-3xl font-semibold tabular-nums leading-none text-foreground"
            : "text-base font-semibold leading-tight text-foreground whitespace-nowrap"
        }
        title={String(value)}
      >
        {value}
      </span>
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
        {label}
      </span>
    </article>
  );
}
