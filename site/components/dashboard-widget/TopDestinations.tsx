/**
 * TopDestinations — 5/6-row mock list of top redirect destinations.
 *
 * Bar fill animation (operator polish 2026-05-15, fix #2):
 *   - CSS sets each bar to width: 0% with a width transition.
 *   - On mount, useEffect snaps width back to 0% (defensive — in case React
 *     remount didn't re-apply the inline style) then in the next RAF tick
 *     sets it to the target percentage, which lets the CSS transition
 *     animate from 0% → barFillPct%.
 *   - This runs on EVERY mount, so the keyed wide-zone remount on refresh
 *     reliably restarts the animation. (IntersectionObserver was unreliable
 *     after fast remounts; @keyframes with var() inside the keyframe was
 *     not interpolating without @property registration.)
 *
 * All rows still carry data-preview-mock="true" (the counts are mock; only
 * the row STRUCTURE is real). En-only paths enforced by PREVIEW_DATA.
 */

"use client";

import { useEffect, useRef } from "react";
import { PREVIEW_DATA } from "@/lib/mocks/preview-data";

function DestinationRow({
  name,
  count,
  barFillPct,
}: {
  name: string;
  count: number;
  barFillPct: number;
}) {
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      el.style.width = `${barFillPct}%`;
      return;
    }

    // Snap to 0% first (defensive — React may have just reused the element
    // after a key change and the inline style may already be at the target).
    el.style.width = "0%";

    // RAF so the browser registers the 0% baseline before we hand it the
    // target — otherwise the transition would have nothing to interpolate
    // from and we'd see an instant snap to the final width.
    const raf = requestAnimationFrame(() => {
      if (barRef.current) {
        barRef.current.style.width = `${barFillPct}%`;
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [barFillPct]);

  return (
    <div className="dw-row" data-preview-mock="true">
      <span className="dw-row__name">
        <span className="swatch" aria-hidden="true" />
        {name}
      </span>
      <span className="dw-row__right">
        <span className="dw-row__bar">
          <span
            ref={barRef}
            className="dw-row__bar-fill"
            style={{ width: "0%" }}
            aria-hidden="true"
          />
        </span>
        <span className="dw-row__count">
          {count.toLocaleString("en-US")}
        </span>
      </span>
    </div>
  );
}

export function TopDestinations() {
  return (
    <div className="dw-rows" data-preview-mock="true">
      <span className="dw-rows__head">Top destinations</span>
      {PREVIEW_DATA.topDestinations.map((dest) => (
        <DestinationRow
          key={dest.name}
          name={dest.name}
          count={dest.count}
          barFillPct={dest.barFillPct}
        />
      ))}
    </div>
  );
}
