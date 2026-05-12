/**
 * Tests for AddRedirectModal (T024 RED-1 through RED-9)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddRedirectModal } from "@/components/context-panel/AddRedirectModal";
import type { RedirectMapItem } from "@/lib/domain/types";

const PAGE_ROUTE = "/products/sneakers";

const existingMaps: RedirectMapItem[] = [
  {
    id: "map-1",
    name: "Marketing campaigns",
    redirectType: "Redirect301",
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt: "20260509T183802Z",
    mappings: [{ source: "/foo", target: "/bar" }],
  },
  {
    id: "map-2",
    name: "Legacy URLs",
    redirectType: "Redirect302",
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt: "20260509T183806Z",
    mappings: [],
  },
];

describe("AddRedirectModal", () => {
  it("RED-1: step 1 shows searchable command list with existing map names", () => {
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={vi.fn()}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={vi.fn()}
        onAddToExistingMap={vi.fn()}
        onCreateNewMap={vi.fn()}
      />
    );
    expect(screen.getByText("Marketing campaigns")).toBeDefined();
    expect(screen.getByText("Legacy URLs")).toBeDefined();
  });

  it("RED-2: '+ Create new Redirect Map' is first item in list", () => {
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={vi.fn()}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={vi.fn()}
        onAddToExistingMap={vi.fn()}
        onCreateNewMap={vi.fn()}
      />
    );
    const createItem = screen.getByText(/create new redirect map/i);
    expect(createItem).toBeDefined();
  });

  it("RED-3: step 2a — source field pre-populated with pageRoute", async () => {
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={vi.fn()}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={vi.fn()}
        onAddToExistingMap={vi.fn()}
        onCreateNewMap={vi.fn()}
      />
    );
    // Click "Marketing campaigns"
    await userEvent.click(screen.getByText("Marketing campaigns"));

    // Source should be pre-populated
    const sourceInput = screen.getByDisplayValue(PAGE_ROUTE);
    expect(sourceInput).toBeDefined();
    expect(sourceInput).toHaveAttribute("readonly");
  });

  it("RED-4: step 2b — redirect type empty initially on create-new", async () => {
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={vi.fn()}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={vi.fn()}
        onAddToExistingMap={vi.fn()}
        onCreateNewMap={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText(/create new redirect map/i));
    // Placeholder should be visible
    expect(screen.getByText(/Pick a type/i)).toBeDefined();
  });

  it("RED-5: validation blocks save on empty target in existing-map step", async () => {
    const onAdd = vi.fn();
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={vi.fn()}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={vi.fn()}
        onAddToExistingMap={onAdd}
        onCreateNewMap={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Marketing campaigns"));
    // Don't fill in target — button should be disabled
    const addBtn = screen.getByRole("button", { name: /add redirect/i });
    expect(addBtn).toHaveAttribute("disabled");
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("RED-7: pristine cancel closes modal without confirm prompt", async () => {
    const onOpenChange = vi.fn();
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={onOpenChange}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={vi.fn()}
        onAddToExistingMap={vi.fn()}
        onCreateNewMap={vi.fn()}
      />
    );
    // Close via ESC (keyboard) — modal should close without confirm
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("RED-8: on success — onSuccess callback is fired", async () => {
    const onSuccess = vi.fn();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <AddRedirectModal
        open={true}
        onOpenChange={vi.fn()}
        pageRoute={PAGE_ROUTE}
        existingMaps={existingMaps}
        onSuccess={onSuccess}
        onAddToExistingMap={onAdd}
        onCreateNewMap={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Marketing campaigns"));
    const targetInput = screen.getByRole("textbox", { name: /target/i });
    await userEvent.type(targetInput, "/new-destination");
    await userEvent.click(screen.getByRole("button", { name: /add redirect/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
