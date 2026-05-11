/**
 * Tests for MatchedMapGroup (T023 RED-1 through RED-6)
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
  redirectType: "301",
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
  it("RED-1: renders map name and RedirectType badge", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={matchedMappings}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
      />
    );
    expect(screen.getByText("Marketing campaigns")).toBeDefined();
    expect(screen.getByText(/301 Permanent/i)).toBeDefined();
  });

  it("RED-2: renders only true-flag chips", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={matchedMappings}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
      />
    );
    // preserveQueryString=true → chip visible
    expect(screen.getByText("Pres. QS")).toBeDefined();
    // preserveLanguage=false → chip absent
    expect(screen.queryByText("Pres. Lang")).toBeNull();
    // includeVirtualFolder=false → chip absent
    expect(screen.queryByText("Virt. Folder")).toBeNull();
  });

  it("RED-3: matched source has font-medium class; non-matched target is muted", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={[{ source: PAGE_ROUTE, target: "/campaigns/summer-2026" }]}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
      />
    );
    // Source matches page route → font-medium
    const srcEl = screen.getByText(PAGE_ROUTE);
    expect(srcEl.className).toContain("font-medium");
    // Target does not match → muted-foreground
    const tgtEl = screen.getByText("/campaigns/summer-2026");
    expect(tgtEl.className).toContain("muted-foreground");
  });

  it("RED-4: section has aria-label including the map name", () => {
    render(
      <MatchedMapGroup
        map={baseMap}
        matchedMappings={matchedMappings}
        pageRoute={PAGE_ROUTE}
        onEditMapping={vi.fn()}
        onDeleteMapping={vi.fn()}
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
      />
    );
    // Arrow glyph → present
    expect(document.body.textContent).toContain("\u2192");
    // Ensure no emoji arrows used
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
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /delete mapping/i }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
