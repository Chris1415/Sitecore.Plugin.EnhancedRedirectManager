/**
 * HealthBadge tests — standalone "all healthy" placeholder badge.
 *
 * Semantic: health = end-to-end resolve correctness. Verification deferred
 * to a follow-on PRD; component renders a mock 'all healthy' label and
 * carries data-preview-mock so the deferred status is discoverable.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HealthBadge } from "@/components/dashboard-widget/HealthBadge";

describe("HealthBadge", () => {
  it("renders 'all healthy' text", () => {
    render(<HealthBadge />);
    expect(screen.getByText(/all healthy/i)).toBeDefined();
  });

  it("carries data-preview-mock='true' (verification deferred)", () => {
    const { container } = render(<HealthBadge />);
    const mocked = container.querySelector('[data-preview-mock="true"]');
    expect(mocked).not.toBeNull();
  });

  it("renders an SVG check glyph (NOT an emoji)", () => {
    const { container } = render(<HealthBadge />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(document.body.textContent).not.toContain("\u2705"); // ✅
  });

  it("SVG uses currentColor for theme-awareness", () => {
    const { container } = render(<HealthBadge />);
    const svg = container.querySelector("svg");
    const innerHTML = svg?.innerHTML ?? "";
    expect(
      innerHTML.includes("currentColor") ||
        svg?.getAttribute("stroke") === "currentColor" ||
        svg?.getAttribute("fill") === "currentColor",
    ).toBe(true);
  });
});
