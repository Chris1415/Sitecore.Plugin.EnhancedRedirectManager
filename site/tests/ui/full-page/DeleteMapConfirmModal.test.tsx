/**
 * DeleteMapConfirmModal tests — Tranche 6b.
 *
 * Verifies confirm-modal copy reflects the map under deletion and that
 * the cancel button is available alongside the destructive confirm action.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DeleteMapConfirmModal } from "@/components/full-page/DeleteMapConfirmModal";
import type { RedirectMapItem } from "@/lib/domain/types";
import type { ClientSDK } from "@/lib/sdk/types";

const fakeClient = {
  mutate: vi.fn(),
  query: vi.fn(),
  subscribe: vi.fn(),
} as unknown as ClientSDK;

const map: RedirectMapItem = {
  id: "abc",
  name: "Marketing campaigns",
  redirectType: "Redirect301",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T120000Z",
  mappings: [
    { source: "/a", target: "/b" },
    { source: "/c", target: "/d" },
  ],
};

describe("DeleteMapConfirmModal", () => {
  it("renders the map name in the confirm prompt", () => {
    render(
      <DeleteMapConfirmModal
        client={fakeClient}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        map={map}
        onDeleted={() => {}}
      />,
    );
    expect(screen.getByText(/marketing campaigns/i)).toBeDefined();
  });

  it("renders the mapping count plural form", () => {
    render(
      <DeleteMapConfirmModal
        client={fakeClient}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        map={map}
        onDeleted={() => {}}
      />,
    );
    expect(screen.getByText(/2 mappings/)).toBeDefined();
  });

  it("renders mapping count singular when only one mapping", () => {
    const single = { ...map, mappings: [{ source: "/a", target: "/b" }] };
    render(
      <DeleteMapConfirmModal
        client={fakeClient}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        map={single}
        onDeleted={() => {}}
      />,
    );
    expect(screen.getByText(/1 mapping[^s]/)).toBeDefined();
  });

  it("renders both Cancel and Delete actions", () => {
    render(
      <DeleteMapConfirmModal
        client={fakeClient}
        sitecoreContextId="ctx"
        open={true}
        onOpenChange={() => {}}
        map={map}
        onDeleted={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeDefined();
  });
});
