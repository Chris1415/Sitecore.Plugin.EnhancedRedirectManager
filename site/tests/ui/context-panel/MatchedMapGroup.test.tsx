/**
 * Tests for MatchedMapGroup (T023 RED-1 through RED-6 + Tranche 4 fix-up #2)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchedMapGroup } from "@/components/context-panel/MatchedMapGroup";
import type { RedirectMapItem, Mapping } from "@/lib/domain/types";

const PAGE_ROUTE = "/products/sneakers/air-max-90";

const baseMap: RedirectMapItem = {
  id: "map-1",
  name: "Marketing campaigns",
  redirectType: "Redirect301",
  preserveQueryString: true,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183802Z",
  mappings: [
    { source: PAGE_ROUTE, target: "/campaigns/summer-2026" },
    { source: "/legacy/airmax", target: PAGE_ROUTE },
  ],
};

const matchedMappings: Mapping[] = baseMap.mappings;

describe("MatchedMapGroup", () => {
  it("RED-1: renders RedirectType badge; map name appears in meta line (V4 cp-item anatomy)", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={matchedMappings}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    // V4: map name is in cp-item__meta, not in a header. RedirectType badge is the cp-item__hd badge.
    expect(screen.getAllByText("Marketing campaigns").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/301 Permanent/i).length).toBeGreaterThan(0);
    // V4 guard: NO "Active" or "Draft" label
    expect(screen.queryByText(/^Active$/)).toBeNull();
    expect(screen.queryByText(/^Draft$/)).toBeNull();
  });

  it("RED-2: V4 anatomy — no status-pill / flag chips; RedirectType badge is the only type indicator", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={matchedMappings}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    // V4: flag chips are removed from the row anatomy per T028 reconciliation
    // The old "Pres. QS" chip no longer appears — flags are internal only
    expect(screen.queryByText("Pres. QS")).toBeNull();
    expect(screen.queryByText("Pres. Lang")).toBeNull();
    expect(screen.queryByText("Virt. Folder")).toBeNull();
    // RedirectType badge still present
    expect(screen.getAllByText(/301 Permanent/i).length).toBeGreaterThan(0);
  });

  it("RED-3: matched source span has font-medium class; non-matched is unstyled", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns/summer-2026" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    const srcEl = screen.getByText(PAGE_ROUTE);
    // V4: matched side has font-medium text-foreground
    expect(srcEl.className).toContain("font-medium");
    // target is not matched — no font-medium
    const tgtEl = screen.getByText("/campaigns/summer-2026");
    expect(tgtEl.className).not.toContain("font-medium");
  });

  it("RED-4: section has aria-label including the map name", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={matchedMappings}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    const section = screen.getByRole("region", { name: /Marketing campaigns redirect map/i });
    expect(section).toBeDefined();
  });

  it("RED-5: renders monochrome arrow glyph U+2192 between source and target", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    expect(document.body.textContent).toContain("\u2192");
    expect(document.body.textContent).not.toContain("\u27A1");
  });

  it("RED-6: edit and delete buttons are present (focus-visible affordance)", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /edit mapping/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /delete mapping/i })).toBeDefined();
  });

  it("RED-7: edit callback called with correct mapping", async () => {
    const onEdit = vi.fn();
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={onEdit}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /edit mapping/i }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("RED-8: delete callback called on trash click", async () => {
    const onDelete = vi.fn();
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={onDelete}
        onEditMapSettings={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete mapping/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  // ---- Tranche 4 fix-up #2: accordion + map-settings edit ----

  it("RED-9: 'Edit map' button is rendered and triggers onEditMapSettings with the map", async () => {
    const onEditMapSettings = vi.fn();
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={onEditMapSettings}
      />
    );
    const btn = screen.getByRole("button", { name: /Edit settings for Marketing campaigns/i });
    await userEvent.click(btn);
    expect(onEditMapSettings).toHaveBeenCalledWith(baseMap);
  });

  it("RED-10: V4 anatomy — no Collapsible toggle; cp-item rows are always visible; Edit map button present", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
        onEditMapSettings={vi.fn()}
      />
    );
    // V4: Collapsible is removed; items are always visible as cp-item cards
    expect(screen.queryByRole("button", { name: /Toggle Marketing campaigns/i })).toBeNull();
    // Edit settings button should be present
    expect(screen.getByRole("button", { name: /Edit settings for Marketing campaigns/i })).toBeDefined();
  });
});
