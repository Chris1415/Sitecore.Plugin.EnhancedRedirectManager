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

function makeMap(id: string, updatedAt: string, mappingCount: number): RedirectMapItem {
  return {
    id,
    name: `Map ${id}`,
    redirectType: "Redirect301",
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
});
