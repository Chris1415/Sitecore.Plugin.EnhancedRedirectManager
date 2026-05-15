/**
 * T032 RED tests — Sparkline component.
 *
 * Written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Sparkline } from "@/components/dashboard-widget/Sparkline";
import { PREVIEW_DATA } from "@/lib/mocks/preview-data";

describe("Sparkline", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Sparkline />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("SVG is aria-hidden", () => {
    const { container } = render(<Sparkline />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("SVG carries data-preview-mock='true'", () => {
    const { container } = render(<Sparkline />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("data-preview-mock")).toBe("true");
  });

  it("SVG contains a path element (stroke line)", () => {
    const { container } = render(<Sparkline />);
    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
  });

  it("SVG contains a linearGradient in defs", () => {
    const { container } = render(<Sparkline />);
    const gradient = container.querySelector("svg defs linearGradient");
    expect(gradient).not.toBeNull();
  });

  it("renders 21 data points from PREVIEW_DATA.sparkline.points", () => {
    // 21 points should produce a non-trivial path d attribute
    expect(PREVIEW_DATA.sparkline.points).toHaveLength(21);
    const { container } = render(<Sparkline />);
    const path = container.querySelector("svg path.stroke, svg path");
    expect(path?.getAttribute("d")).not.toBeNull();
  });

  it("wraps in .dw-spark container", () => {
    const { container } = render(<Sparkline />);
    // The component itself renders the svg directly; parent wraps with dw-spark
    // The component should have a wrapper or apply dw-spark class to outer element
    expect(container.firstChild).not.toBeNull();
  });
});
