/**
 * T033 RED tests — TopDestinations component.
 *
 * Written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopDestinations } from "@/components/dashboard-widget/TopDestinations";
import { PREVIEW_DATA } from "@/lib/mocks/preview-data";

describe("TopDestinations", () => {
  it("renders one row per PREVIEW_DATA.topDestinations entry", () => {
    render(<TopDestinations />);
    const rows = document.querySelectorAll('[data-preview-mock="true"].dw-row');
    expect(rows).toHaveLength(PREVIEW_DATA.topDestinations.length);
  });

  it("all 5 paths are en-only (no /de/ or other locale prefixes)", () => {
    render(<TopDestinations />);
    for (const dest of PREVIEW_DATA.topDestinations) {
      // path should match en-only pattern
      expect(dest.name).toMatch(/^\/[a-z0-9-/]+$/);
      expect(dest.name).not.toMatch(/\/de\//);
    }
  });

  it("each row carries data-preview-mock='true'", () => {
    const { container } = render(<TopDestinations />);
    const rows = container.querySelectorAll(".dw-row");
    for (const row of rows) {
      expect(row.getAttribute("data-preview-mock")).toBe("true");
    }
  });

  it("renders the section heading 'Top destinations'", () => {
    render(<TopDestinations />);
    const heading = screen.getByText(/top destinations/i);
    expect(heading).toBeDefined();
  });

  it("renders /products path", () => {
    render(<TopDestinations />);
    expect(screen.getByText("/products")).toBeDefined();
  });

  it("renders hit counts for each destination row", () => {
    render(<TopDestinations />);
    // Behavior: each of the 5 mock destinations has a visible hit count number
    // Converted from .dw-row__count class selector: check localized count appears
    // (component renders count.toLocaleString("en-US") — e.g. 3,184)
    for (const dest of PREVIEW_DATA.topDestinations) {
      expect(document.body.textContent).toContain(dest.count.toLocaleString("en-US"));
    }
  });

  it("renders one bar-fill element per row (visual bar present)", () => {
    const { container } = render(<TopDestinations />);
    // V4 design contract: each row has a proportional bar. Count tracks the
    // fixture length rather than a hardcoded number.
    const bars = container.querySelectorAll(".dw-row__bar-fill");
    expect(bars).toHaveLength(PREVIEW_DATA.topDestinations.length);
  });
});
