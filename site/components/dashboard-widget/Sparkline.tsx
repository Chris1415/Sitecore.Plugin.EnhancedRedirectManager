/**
 * T032 — Sparkline component.
 *
 * Inline SVG sparkline from PREVIEW_DATA.sparkline.points (21 data points).
 * Static render (no animated path-draw per ADR-0027 quieter motion budget).
 * viewBox: 0 0 480 60 — matches the refined POC dashboard-widget.html geometry.
 *
 * Two paths:
 *   - .fill: filled area under the line using the linearGradient
 *   - .stroke: the line itself at var(--primary)
 *
 * Gradient: currentColor (top, 30% opacity) → transparent (bottom, 0%).
 * Theme-aware via CSS custom properties.
 *
 * data-preview-mock="true" on the SVG element.
 * aria-hidden="true" — decorative; no screen-reader content.
 * .dw-spark class applied to the outer wrapper.
 *
 * Depends on: T005 (PREVIEW_DATA)
 */

import { PREVIEW_DATA } from "@/lib/mocks/preview-data";

const VIEWBOX_W = 480;
const VIEWBOX_H = 60;
const PADDING = 4; // vertical padding so the line doesn't clip at edges

function buildSparklinePath(points: readonly number[]): { fill: string; stroke: string } {
  const n = points.length;
  if (n === 0) return { fill: "", stroke: "" };

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  // Map each point to (x, y) in viewBox coordinate space
  const coords = points.map((v, i) => {
    const x = (i / (n - 1)) * VIEWBOX_W;
    // Invert y: higher values = lower y coordinate (higher on screen)
    const y = PADDING + ((maxVal - v) / range) * (VIEWBOX_H - PADDING * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Stroke path: L-segment polyline
  const strokeD = "M" + coords.join(" L");

  // Fill path: close the area back to the bottom baseline
  const fillD =
    strokeD +
    ` L${VIEWBOX_W},${VIEWBOX_H} L0,${VIEWBOX_H} Z`;

  return { fill: fillD, stroke: strokeD };
}

export function Sparkline() {
  const { points } = PREVIEW_DATA.sparkline;
  const { fill, stroke } = buildSparklinePath(points);

  return (
    <div className="dw-spark" aria-hidden="true">
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        data-preview-mock="true"
      >
        <defs>
          <linearGradient id="dw-spark-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.30" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g style={{ color: "var(--primary)" }}>
          {fill && (
            <path className="fill" d={fill} />
          )}
          {stroke && (
            <path className="stroke" d={stroke} />
          )}
        </g>
      </svg>
    </div>
  );
}
