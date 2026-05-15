/**
 * StatStrip tests — REAL-data mode (operator polish 2026-05-15).
 *
 * StatStrip now takes `maps: RedirectMapItem[]` and computes:
 *   - Mappings total
 *   - 301 Permanent count + % of total
 *   - 302 Temporary count + % of total
 *   - Conflicts (duplicate source URLs)
 *
 * Empty maps array (no site picked) → all tiles render with value 0 and
 * appropriate empty-state sub-lines.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatStrip } from "@/components/full-page/StatStrip";
import type { RedirectMapItem } from "@/lib/domain/types";

function makeMap(
  id: string,
  redirectType: RedirectMapItem["redirectType"],
  mappingCount: number,
  sourcePrefix = "/x",
): RedirectMapItem {
  return {
    id,
    name: `Map ${id}`,
    redirectType,
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt: "20260515T100000Z",
    mappings: Array.from({ length: mappingCount }, (_, i) => ({
      source: `${sourcePrefix}-${id}-${i}`,
      target: `/t-${id}-${i}`,
    })),
  };
}

describe("StatStrip", () => {
  it("renders the 4 expected labels", () => {
    render(<StatStrip maps={[]} />);
    expect(screen.getByText("Redirects")).toBeDefined();
    expect(screen.getByText("301 Permanent")).toBeDefined();
    expect(screen.getByText("302 Temporary")).toBeDefined();
    expect(screen.getByText("Conflicts")).toBeDefined();
  });

  it("renders empty-state sub-lines when maps is []", () => {
    render(<StatStrip maps={[]} />);
    expect(screen.getByText(/no maps loaded/i)).toBeDefined();
    expect(screen.getByText(/all clear/i)).toBeDefined();
  });

  it("renders 'no 301s' sub-line when total > 0 but no 301 maps", () => {
    render(<StatStrip maps={[makeMap("m1", "Redirect302", 3)]} />);
    expect(screen.getByText(/no 301s/i)).toBeDefined();
  });

  it("computes 301 percentage of total mappings", () => {
    const maps = [
      makeMap("m1", "Redirect301", 7),
      makeMap("m2", "Redirect302", 3),
    ]; // 10 total, 70% 301
    render(<StatStrip maps={maps} />);
    expect(screen.getByText(/70% of total/)).toBeDefined();
  });

  it("counts conflicts as duplicate sources across all maps' mappings", () => {
    // /dup appears in m1 once and m2 once → 1 collision (extra past first)
    const maps: RedirectMapItem[] = [
      {
        id: "m1",
        name: "M1",
        redirectType: "Redirect301",
        preserveQueryString: false,
        preserveLanguage: false,
        includeVirtualFolder: false,
        updatedAt: "20260515T100000Z",
        mappings: [
          { source: "/dup", target: "/a" },
          { source: "/uniq", target: "/b" },
        ],
      },
      {
        id: "m2",
        name: "M2",
        redirectType: "Redirect302",
        preserveQueryString: false,
        preserveLanguage: false,
        includeVirtualFolder: false,
        updatedAt: "20260515T101000Z",
        mappings: [{ source: "/dup", target: "/aa" }],
      },
    ];
    render(<StatStrip maps={maps} />);
    expect(screen.getByText(/duplicate sources/i)).toBeDefined();
  });

  it("renders 'all clear' when no conflicts", () => {
    const maps = [
      makeMap("m1", "Redirect301", 2, "/x"),
      makeMap("m2", "Redirect302", 2, "/y"),
    ];
    render(<StatStrip maps={maps} />);
    expect(screen.getByText(/all clear/i)).toBeDefined();
  });

  it("no #hex inline color styles", () => {
    render(<StatStrip maps={[]} />);
    const allElements = document.querySelectorAll("*");
    let hexFound = false;
    allElements.forEach((el) => {
      const style = (el as HTMLElement).getAttribute("style") ?? "";
      if (/#[0-9a-fA-F]{3,8}/.test(style)) hexFound = true;
    });
    expect(hexFound).toBe(false);
  });

  it("no data-preview-mock attribute (data is real now)", () => {
    render(<StatStrip maps={[makeMap("m1", "Redirect301", 1)]} />);
    expect(document.querySelector('[data-preview-mock="true"]')).toBeNull();
  });
});
