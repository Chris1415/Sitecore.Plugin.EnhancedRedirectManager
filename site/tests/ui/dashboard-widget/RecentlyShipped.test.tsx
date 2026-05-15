/**
 * T034 RED tests — RecentlyShipped + RecentlyShippedTile (FourthTile) components.
 *
 * Written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentlyShipped, RecentlyShippedTile } from "@/components/dashboard-widget/RecentlyShipped";
import { PREVIEW_DATA } from "@/lib/mocks/preview-data";

describe("RecentlyShippedTile (4th mock tile)", () => {
  it("renders the count (4) from PREVIEW_DATA", () => {
    render(<RecentlyShippedTile />);
    // The tile shows the countLast24h value
    expect(
      document.body.textContent?.includes(String(PREVIEW_DATA.recentlyShipped.countLast24h)),
    ).toBe(true);
  });

  it("renders 'Recently shipped' label", () => {
    render(<RecentlyShippedTile />);
    expect(screen.getByText(/recently shipped/i)).toBeDefined();
  });

  it("renders sub-line mentioning 'last 24'", () => {
    render(<RecentlyShippedTile />);
    expect(screen.getByText(/last 24/i)).toBeDefined();
  });

  it("tile carries data-preview-mock='true'", () => {
    const { container } = render(<RecentlyShippedTile />);
    const mocked = container.querySelector('[data-preview-mock="true"]');
    expect(mocked).not.toBeNull();
  });

  it("no status-pill Active or Draft", () => {
    render(<RecentlyShippedTile />);
    expect(document.body.textContent).not.toMatch(/\bActive\b/);
    expect(document.body.textContent).not.toMatch(/\bDraft\b/);
  });
});

describe("RecentlyShipped (real recent-maps mini-widget)", () => {
  const SAMPLE_RECENT_MAPS = [
    {
      id: "m1",
      name: "homepage-redirects",
      redirectType: "Redirect301" as const,
      updatedAt: "20260515T120000Z",
      mappingCount: 4,
    },
    {
      id: "m2",
      name: "campaign-redirects",
      redirectType: "Redirect302" as const,
      updatedAt: "20260515T100000Z",
      mappingCount: 2,
    },
    {
      id: "m3",
      name: "legacy-redirects",
      redirectType: "Redirect301" as const,
      updatedAt: "20260514T080000Z",
      mappingCount: 7,
    },
  ];

  it("renders one row per recentMap entry", () => {
    const { container } = render(<RecentlyShipped recentMaps={SAMPLE_RECENT_MAPS} />);
    const rows = container.querySelectorAll(".dw-recent__row");
    expect(rows).toHaveLength(SAMPLE_RECENT_MAPS.length);
  });

  it("renders nothing when recentMaps is empty", () => {
    const { container } = render(<RecentlyShipped recentMaps={[]} />);
    expect(container.querySelector(".dw-recent")).toBeNull();
  });

  it("has NO data-preview-mock attributes (data is real)", () => {
    const { container } = render(<RecentlyShipped recentMaps={SAMPLE_RECENT_MAPS} />);
    expect(container.querySelector('[data-preview-mock="true"]')).toBeNull();
  });

  it("no Active or Draft text anywhere", () => {
    render(<RecentlyShipped recentMaps={SAMPLE_RECENT_MAPS} />);
    expect(document.body.textContent).not.toMatch(/\bActive\b/);
    expect(document.body.textContent).not.toMatch(/\bDraft\b/);
  });

  it("renders 'Recently shipped maps' heading", () => {
    render(<RecentlyShipped recentMaps={SAMPLE_RECENT_MAPS} />);
    expect(screen.getByText(/recently shipped maps/i)).toBeDefined();
  });

  it("renders RedirectType badges per row", () => {
    render(<RecentlyShipped recentMaps={SAMPLE_RECENT_MAPS} />);
    // Two Redirect301 + one Redirect302 → at least 2 of "301", at least 1 of "302"
    expect(screen.getAllByText(/301/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/302/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the map name in each row (not source → target)", () => {
    render(<RecentlyShipped recentMaps={SAMPLE_RECENT_MAPS} />);
    expect(document.body.textContent).toContain("homepage-redirects");
    expect(document.body.textContent).toContain("campaign-redirects");
    expect(document.body.textContent).toContain("legacy-redirects");
  });
});
