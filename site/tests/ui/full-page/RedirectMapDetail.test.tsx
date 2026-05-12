/**
 * RedirectMapDetail tests — updated for Tranche 6b editable detail surface.
 *
 * Tests:
 *  - No-selection vs selection states.
 *  - Map name rendered (as clickable h2 for rename affordance).
 *  - RedirectType Select shows the current value with friendly label.
 *  - Flag toggles are present as labelled checkboxes (always rendered as
 *    editable controls in Tranche 6b — no more conditional chips).
 *  - Mappings table renders source/target paths in monospace.
 *  - Last-updated formatted display.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { RedirectMapDetail } from "@/components/full-page/RedirectMapDetail";
import type { RedirectMapItem } from "@/lib/domain/types";
import type { ClientSDK } from "@/lib/sdk/types";

const fakeClient = {
  mutate: vi.fn(),
  query: vi.fn(),
  subscribe: vi.fn(),
} as unknown as ClientSDK;

const baseProps = {
  client: fakeClient,
  sitecoreContextId: "ctx-test",
  onWriteSuccess: () => {},
  onDeleteRequested: () => {},
};

const fixtureMap: RedirectMapItem = {
  id: "e39157f3a81f4692b05d178d48c836de",
  name: "Marketing campaigns",
  redirectType: "Redirect301",
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
  mappings: [{ source: "/ab/variant-a", target: "/ab/landing" }],
};

describe("RedirectMapDetail — no-selection state", () => {
  it("RED-1: shows 'Pick a site to begin' when no map selected", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={null} />);
    expect(
      screen.getByText(/pick a site|pick a redirect map|select a map/i),
    ).toBeDefined();
  });
});

describe("RedirectMapDetail — detail state (editable)", () => {
  it("RED-2: renders map name as heading (h2 with rename button inside)", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    expect(screen.getByRole("heading", { name: /marketing campaigns/i })).toBeDefined();
  });

  it("RED-3: shows '301 Permanent' label in the RedirectType select trigger", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    expect(screen.getByText(/301 permanent/i)).toBeDefined();
  });

  it("RED-4: shows 'Server Transfer' label for ServerTransfer", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMapServerTransfer} />);
    expect(screen.getByText(/server transfer/i)).toBeDefined();
  });

  it("RED-5: all three flag toggles are rendered as checkboxes (true/false reflected)", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    // All three toggle labels are always rendered as editable controls
    expect(screen.getByText(/preserve query string/i)).toBeDefined();
    expect(screen.getByText(/preserve language/i)).toBeDefined();
    expect(screen.getByText(/include virtual folder/i)).toBeDefined();
  });

  it("RED-6: checkbox state reflects current boolean values", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMapServerTransfer} />);
    // ServerTransfer fixture: preserveQueryString=false, preserveLanguage=true, includeVirtualFolder=true.
    const pqs = screen.getByRole("checkbox", { name: /preserve query string/i }) as HTMLInputElement;
    const pl = screen.getByRole("checkbox", { name: /preserve language/i }) as HTMLInputElement;
    const ivf = screen.getByRole("checkbox", { name: /include virtual folder/i }) as HTMLInputElement;
    // Radix exposes the checked state via aria-checked.
    expect(pqs.getAttribute("aria-checked")).toBe("false");
    expect(pl.getAttribute("aria-checked")).toBe("true");
    expect(ivf.getAttribute("aria-checked")).toBe("true");
  });

  it("RED-7: renders mapping source and target in table", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    expect(screen.getAllByText("/products/sneakers/air-max-90").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("/campaigns/summer-2026/sneakers").length).toBeGreaterThanOrEqual(1);
  });

  it("RED-8: source and target paths rendered in monospace context", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    const pathEls = screen.getAllByText("/products/sneakers/air-max-90");
    for (const el of pathEls) {
      expect(
        el.classList.contains("font-mono") || el.closest(".font-mono") !== null,
      ).toBe(true);
    }
  });

  it("RED-9: renders last-updated as formatted date (not raw compact format)", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    expect(screen.queryByText("20260509T183802Z")).toBeNull();
    const yearElements = screen.getAllByText(/2026/);
    expect(yearElements.length).toBeGreaterThanOrEqual(1);
  });

  it("RED-10: delete button is rendered with destructive intent", () => {
    render(<RedirectMapDetail {...baseProps} selectedMap={fixtureMap} />);
    const deleteBtn = screen.getByRole("button", { name: /delete this redirect map/i });
    expect(deleteBtn).toBeDefined();
  });
});
