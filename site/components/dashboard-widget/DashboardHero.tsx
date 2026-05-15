/**
 * T031 — DashboardHero component.
 *
 * Dashboard Widget hero zone:
 *   - Marketing-voice subhead: "Your redirect operations, at a glance."
 *   - Hero stat number: PREVIEW_DATA.heroStat.value with useCountUp + GradientText
 *   - Stat sub-stack: "Active redirects" label + "+412 this week" delta
 *
 * Motion budget (ADR-0027 quieter):
 *   - Count-up animation IS allowed (one-shot, reduced-motion gated via useCountUp)
 *   - NO plumes, NO kinetic letter reveals
 *
 * All mocked elements carry data-preview-mock="true".
 * Uses .dw-hero + .dw-subhead from surfaces.css.
 *
 * Depends on: T005 (PREVIEW_DATA), T009 (GradientText), T011 (useCountUp)
 */

"use client";

import { GradientText } from "@/components/ui/gradient-text";
import { useCountUp } from "@/hooks/use-count-up";
import { PREVIEW_DATA } from "@/lib/mocks/preview-data";

export function DashboardHero() {
  const { value: heroStatValue, delta } = PREVIEW_DATA.heroStat;
  const animatedValue = useCountUp(heroStatValue, { duration: 1400 });

  return (
    <div>
      {/* Marketing-grade subhead (D5 zone b) — not mocked, static copy */}
      <p className="dw-subhead">
        Your redirect operations,{" "}
        <GradientText as="span">at a glance.</GradientText>
      </p>

      {/* Hero stat zone */}
      <div className="dw-hero" data-preview-mock="true">
        <div className="dw-hero__big elev-count-up">
          <span data-preview-mock="true">
            {animatedValue.toLocaleString("en-US")}
          </span>
        </div>
        <div className="dw-hero__sub" data-preview-mock="true">
          <small>{PREVIEW_DATA.heroStat.label}</small>
          <strong>
            +{delta.value} {delta.period}
          </strong>
        </div>
      </div>
    </div>
  );
}
