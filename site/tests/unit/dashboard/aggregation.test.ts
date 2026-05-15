/**
 * Unit tests for DashboardWidget aggregation helpers (T032 RED-2, RED-3, RED-4)
 *
 * aggregateStats — pure function; no React; no mocks.
 * formatLastUpdated is tested indirectly via aggregateStats, plus
 * direct export from DashboardWidget is tested here for the date boundary.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { aggregateStats } from "@/components/dashboard-widget/DashboardWidget";
import type { RedirectMapItem } from "@/lib/domain/types";

function makeMap(
  id: string,
  updatedAt: string,
  mappingCount: number,
  redirectType: RedirectMapItem["redirectType"] = "Redirect301",
): RedirectMapItem {
  return {
    id,
    name: `Map ${id}`,
    redirectType,
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt,
    mappings: Array.from({ length: mappingCount }, (_, i) => ({
      source: `/src-${i}`,
      target: `/tgt-${i}`,
    })),
  };
}

describe("aggregateStats", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("RED-2: totalMaps equals input array length", () => {
    const maps = [
      makeMap("m1", "20260509T183802Z", 2),
      makeMap("m2", "20260509T183806Z", 0),
    ];
    const result = aggregateStats(maps);
    expect(result.totalMaps).toBe(2);
  });

  it("RED-3: totalMappings is sum of all .mappings.length", () => {
    const maps = [
      makeMap("m1", "20260509T183802Z", 2),
      makeMap("m2", "20260509T183806Z", 5),
      makeMap("m3", "20260509T183810Z", 0),
    ];
    const result = aggregateStats(maps);
    expect(result.totalMappings).toBe(7);
  });

  it("RED-4: lastUpdated is computed from the most-recent updatedAt", () => {
    // Both dates are old (>24h ago from epoch 0 perspective, but use real dates)
    // Fix "now" to a known point so we can reason about the output
    const FIXED_NOW = new Date("2026-05-09T20:00:00Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    // Older map
    const maps = [
      makeMap("m1", "20260508T100000Z", 1), // yesterday
      makeMap("m2", "20260509T183806Z", 1), // same day, later — should win
    ];
    const result = aggregateStats(maps);

    // 20260509T183806Z = 2026-05-09T18:38:06Z
    // FIXED_NOW         = 2026-05-09T20:00:00Z
    // diff = ~1h21m → should be relative "1 hour ago"
    expect(result.lastUpdated).toContain("hour");
  });

  it("RED-4b: empty maps returns dash for lastUpdated", () => {
    const result = aggregateStats([]);
    expect(result.lastUpdated).toBe("—");
    expect(result.totalMaps).toBe(0);
    expect(result.totalMappings).toBe(0);
  });

  it("RED-4c: date older than 24h returns absolute date string", () => {
    const FIXED_NOW = new Date("2026-05-09T20:00:00Z").getTime();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);

    // 20260507T100000Z is ~58 hours ago → absolute
    const maps = [makeMap("m1", "20260507T100000Z", 0)];
    const result = aggregateStats(maps);

    // Intl.DateTimeFormat produces something like "May 7, 2026"
    expect(result.lastUpdated).toMatch(/2026/);
    expect(result.lastUpdated).not.toContain("ago");
  });

  it("count301 sums mappings across maps with redirectType=Redirect301", () => {
    const maps = [
      makeMap("m1", "20260509T183802Z", 3, "Redirect301"),
      makeMap("m2", "20260509T183806Z", 4, "Redirect302"),
      makeMap("m3", "20260509T183810Z", 2, "Redirect301"),
    ];
    const result = aggregateStats(maps);
    expect(result.count301).toBe(5); // 3 + 2
  });

  it("count302 sums mappings across maps with redirectType=Redirect302", () => {
    const maps = [
      makeMap("m1", "20260509T183802Z", 3, "Redirect301"),
      makeMap("m2", "20260509T183806Z", 4, "Redirect302"),
      makeMap("m3", "20260509T183810Z", 2, "Redirect302"),
    ];
    const result = aggregateStats(maps);
    expect(result.count302).toBe(6); // 4 + 2
  });

  it("ServerTransfer mappings are not counted as 301 or 302", () => {
    const maps = [makeMap("m1", "20260509T183802Z", 5, "ServerTransfer")];
    const result = aggregateStats(maps);
    expect(result.count301).toBe(0);
    expect(result.count302).toBe(0);
    expect(result.totalMappings).toBe(5);
  });

  it("avgMappingsPerMap rounds to one decimal", () => {
    const maps = [
      makeMap("m1", "20260509T183802Z", 4),
      makeMap("m2", "20260509T183806Z", 3),
      makeMap("m3", "20260509T183810Z", 0),
    ]; // total 7 / 3 = 2.333… → 2.3
    const result = aggregateStats(maps);
    expect(result.avgMappingsPerMap).toBe(2.3);
  });

  it("avgMappingsPerMap is 0 when no maps", () => {
    const result = aggregateStats([]);
    expect(result.avgMappingsPerMap).toBe(0);
  });

  it("largestMapMappings is the max mapping count across maps", () => {
    const maps = [
      makeMap("m1", "20260509T183802Z", 4),
      makeMap("m2", "20260509T183806Z", 12),
      makeMap("m3", "20260509T183810Z", 7),
    ];
    const result = aggregateStats(maps);
    expect(result.largestMapMappings).toBe(12);
  });

  it("largestMapMappings is 0 when no maps", () => {
    const result = aggregateStats([]);
    expect(result.largestMapMappings).toBe(0);
  });

  it("collisionCount is 0 when every source URL is unique", () => {
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
          { source: "/a", target: "/aa" },
          { source: "/b", target: "/bb" },
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
        mappings: [{ source: "/c", target: "/cc" }],
      },
    ];
    expect(aggregateStats(maps).collisionCount).toBe(0);
  });

  it("collisionCount counts extra copies past first occurrence", () => {
    // 2 collisions: '/a' appears 3× (2 extras); '/b' appears 2× (1 extra) → total 3
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
          { source: "/a", target: "/aa" },
          { source: "/a", target: "/aa2" },
          { source: "/b", target: "/bb" },
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
        mappings: [
          { source: "/a", target: "/aaa" },
          { source: "/b", target: "/bb2" },
        ],
      },
    ];
    expect(aggregateStats(maps).collisionCount).toBe(3);
  });

  it("collisionCount comparison is case-insensitive and trims whitespace", () => {
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
          { source: "/HOME", target: "/" },
          { source: " /home ", target: "/" },
        ],
      },
    ];
    expect(aggregateStats(maps).collisionCount).toBe(1);
  });

  it("collisionCount ignores empty-string sources", () => {
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
          { source: "", target: "/x" },
          { source: "", target: "/y" },
        ],
      },
    ];
    expect(aggregateStats(maps).collisionCount).toBe(0);
  });
});
