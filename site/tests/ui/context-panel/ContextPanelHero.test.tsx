/**
 * Tests for ContextPanelHero (PRD-002 polish — page-route headline).
 *
 * The hero was reworked to drop the count from the headline. Counts live in
 * the split HeroSummaryTile rendered by ContextPanel. The hero now leads with
 * the page route in the h1 and keeps the "Add the first redirect" guidance
 * subline for the zero-match case.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContextPanelHero } from "@/components/context-panel/ContextPanelHero";

// matchMedia stub — jsdom doesn't implement it
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe("ContextPanelHero", () => {
  it("RED-1: renders eyebrow 'Redirects for this page'", () => {
    render(<ContextPanelHero pageUrl="/products/sneakers" />);
    expect(screen.getByText(/redirects for this page/i)).toBeDefined();
  });

  it("RED-2: h1 contains the page route", () => {
    const { container } = render(<ContextPanelHero pageUrl="/products/sneakers" />);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toContain("/products/sneakers");
  });

  it("RED-3: h1 does NOT contain redundant count noun phrase", () => {
    const { container } = render(<ContextPanelHero pageUrl="/products/sneakers" />);
    const h1 = container.querySelector("h1");
    // The redirect-count noun phrase was moved to HeroSummaryTile. The hero
    // headline must not duplicate it.
    expect(h1?.textContent).not.toMatch(/redirect[s]? points? here/i);
  });

  it("RED-4: zero-match — guidance subline visible when isEmpty=true", () => {
    render(<ContextPanelHero pageUrl="/products/sneakers" isEmpty />);
    expect(screen.getByText(/add the first redirect/i)).toBeDefined();
  });

  it("RED-4b: non-empty — guidance subline NOT shown when isEmpty=false (default)", () => {
    render(<ContextPanelHero pageUrl="/products/sneakers" />);
    expect(screen.queryByText(/add the first redirect/i)).toBeNull();
  });

  it("RED-5: page URL appears in the hero", () => {
    render(<ContextPanelHero pageUrl="/products/sneakers" />);
    expect(screen.getByText("/products/sneakers")).toBeDefined();
  });

  it("RED-6: h1 element exists wrapping the headline", () => {
    const { container } = render(<ContextPanelHero pageUrl="/products/sneakers" />);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
  });

  it("RED-7: gradient-text wrapper is a child of h1 (route displayed with gradient styling)", () => {
    const { container } = render(<ContextPanelHero pageUrl="/products/sneakers" />);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    // GradientText renders as a span child inside the h1 — verify child element exists
    const childSpan = h1?.querySelector("span");
    expect(childSpan).not.toBeNull();
  });
});
