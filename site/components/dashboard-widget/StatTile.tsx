/**
 * StatTile — dashboard widget stat tile with V4 chrome (T037).
 *
 * Applied V4 chrome: .dw-tile class from surfaces.css for hover-lift + border.
 * Tabular-num typography via .dw-tile__value class.
 * Count-up on numeric values via useCountUp hook from T011.
 * String values (e.g. "1 hour ago") degrade gracefully — no count-up.
 *
 * Real-data tiles (Maps / Mappings / Last-updated) from aggregateStats:
 *   - do NOT carry data-preview-mock
 *   - props unchanged from PRD-000
 *
 * Each tile is <article> with aria-label per T034 a11y spec.
 */

"use client";

import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

interface StatTileProps {
  label: string;
  value: string | number;
  /** Optional icon rendered above the label for visual hierarchy. */
  icon?: LucideIcon;
  /** aria-label for the article — should include the value for screen readers. */
  ariaLabel: string;
}

function NumericValue({ value }: { value: number }) {
  const animated = useCountUp(value, { duration: 900 });
  return (
    <span className="dw-tile__value" title={String(value)}>
      {animated}
    </span>
  );
}

export function StatTile({ label, value, icon: Icon, ariaLabel }: StatTileProps) {
  const isNumeric = typeof value === "number";

  return (
    <article
      aria-label={ariaLabel}
      className="dw-tile"
    >
      {isNumeric ? (
        <NumericValue value={value as number} />
      ) : (
        <span
          className="dw-tile__value"
          style={{ fontSize: "1rem", lineHeight: "1.4" }}
          title={String(value)}
        >
          {value}
        </span>
      )}
      <span className="dw-tile__label">
        {Icon ? <Icon className="h-3 w-3 inline mr-1" aria-hidden="true" /> : null}
        {label}
      </span>
    </article>
  );
}
