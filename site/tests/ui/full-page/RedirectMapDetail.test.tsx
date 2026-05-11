/**
 * T039 RED — RedirectMapDetail tests
 *
 * Tests: no-selection vs selection states, flag chips only when true,
 * mappings table, formatted-date display.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { RedirectMapDetail } from "@/components/full-page/RedirectMapDetail";
import type { RedirectMapItem } from "@/lib/domain/types";

const fixtureMap: RedirectMapItem = {
  id: "e39157f3a81f4692b05d178d48c836de",
  name: "Marketing campaigns",
  redirectType: "301",
  preserveQueryString: true,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183802Z",
  mappings: [
    { source: "/products/sneakers/air-max-90", target: "/campaigns/summer-2026/sneakers" },
    { source: "/legacy/airmax", target: "/products/sneakers/air-max-90" },
  ],
};

const fixtureMapServerTransfer: RedirectMapItem = {
  id: "aabbccdd11223344",
  name: "A/B test variants",
  redirectType: "ServerTransfer",
  preserveQueryString: false,
  preserveLanguage: true,
  includeVirtualFolder: true,
  updatedAt: "20260509T120000Z",
  mappings: [
    { source: "/ab/variant-a", target: "/ab/landing" },
  ],
};

describe("RedirectMapDetail — no-selection state (T039)", () => {
  it("RED-1: shows 'Pick a site to begin' when no map selected", () => {
    render(<RedirectMapDetail selectedMap={null} />);
    // Shows some empty/selection-prompt copy
    expect(
      screen.getByText(/pick a site|pick a redirect map|select a map/i)
    ).toBeDefined();
  });
});

describe("RedirectMapDetail — detail state (T039)", () => {
  it("RED-2: renders map name as heading", () => {
    render(<RedirectMapDetail selectedMap={fixtureMap} />);
    expect(screen.getByRole("heading", { name: /marketing campaigns/i })).toBeDefined();
  });

  it("RED-3: renders RedirectType badge", () => {
    render(<RedirectMapDetail selectedMap={fixtureMap} />);
    // Badge with redirect type label
    expect(screen.getByText(/301/)).toBeDefined();
  });

  it("RED-4: renders ServerTransfer badge correctly", () => {
    render(<RedirectMapDetail selectedMap={fixtureMapServerTransfer} />);
    expect(screen.getByText(/server transfer/i)).toBeDefined();
  });

  it("RED-5: flag chips only appear when true (preserveQueryString=true, others=false)", () => {
    render(<RedirectMapDetail selectedMap={fixtureMap} />);
    // preserveQueryString is true — should appear
    expect(screen.getByText(/preserve query string/i)).toBeDefined();
    // preserveLanguage is false — should NOT appear
    expect(screen.queryByText(/preserve language/i)).toBeNull();
    // includeVirtualFolder is false — should NOT appear
    expect(screen.queryByText(/include virtual folder/i)).toBeNull();
  });

  it("RED-6: all three flag chips appear when all true", () => {
    render(<RedirectMapDetail selectedMap={fixtureMapServerTransfer} />);
    expect(screen.getByText(/preserve language/i)).toBeDefined();
    expect(screen.getByText(/include virtual folder/i)).toBeDefined();
  });

  it("RED-7: renders mapping source and target in table", () => {
    render(<RedirectMapDetail selectedMap={fixtureMap} />);
    // Use getAllByText since the same path can appear as both source and target
    expect(screen.getAllByText("/products/sneakers/air-max-90").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("/campaigns/summer-2026/sneakers").length).toBeGreaterThanOrEqual(1);
  });

  it("RED-8: source and target paths rendered in monospace context", () => {
    render(<RedirectMapDetail selectedMap={fixtureMap} />);
    // All path cells should be inside font-mono elements
    const pathEls = screen.getAllByText("/products/sneakers/air-max-90");
    for (const el of pathEls) {
      expect(
        el.classList.contains("font-mono") || el.closest(".font-mono") !== null
      ).toBe(true);
    }
  });

  it("RED-9: renders last-updated as formatted date (not raw compact format)", () => {
    render(<RedirectMapDetail selectedMap={fixtureMap} />);
    // Should NOT render the raw "20260509T183802Z" string
    expect(screen.queryByText("20260509T183802Z")).toBeNull();
    // Should render some human-readable date representation with the year 2026
    // Use getAllByText in case "2026" appears in multiple places
    const yearElements = screen.getAllByText(/2026/);
    expect(yearElements.length).toBeGreaterThanOrEqual(1);
  });
});
