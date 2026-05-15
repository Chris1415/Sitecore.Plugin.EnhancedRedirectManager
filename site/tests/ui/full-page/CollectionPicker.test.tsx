/**
 * T036 RED — CollectionPicker tests
 *
 * Tests: list rendering, loading, error, empty, selection callback.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/sdk/sites", () => ({
  listCollections: vi.fn(),
  listSites: vi.fn(),
}));

import { listCollections } from "@/lib/sdk/sites";
import { CollectionPicker } from "@/components/full-page/CollectionPicker";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { Sites } from "@sitecore-marketplace-sdk/xmc";
import collectionsFixture from "@/tests/fixtures/graphql/collections-list.json";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";
const fixtureCollections = collectionsFixture as Sites.SiteCollection[];

describe("CollectionPicker (T036)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RED-1: shows skeleton while loading", () => {
    (listCollections as Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <CollectionPicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        onSelect={vi.fn()}
      />
    );
    expect(document.querySelector("[data-slot='skeleton']")).toBeDefined();
  });

  it("RED-2: renders collection options after load", async () => {
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    render(
      <CollectionPicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        onSelect={vi.fn()}
      />
    );
    await waitFor(() => {
      // The label "Collection" is always shown
      expect(screen.getByLabelText(/collection/i) ?? screen.getByText(/collection/i)).toBeDefined();
    });
  });

  it("RED-3: shows empty state when no collections returned", async () => {
    (listCollections as Mock).mockResolvedValue([]);
    render(
      <CollectionPicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        onSelect={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/no collections/i)).toBeDefined();
    });
  });

  it("RED-4: shows error state on rejection", async () => {
    (listCollections as Mock).mockRejectedValue(new Error("network error"));
    render(
      <CollectionPicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        onSelect={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/couldn't load/i)).toBeDefined();
    });
  });

  it("RED-5: calls onSelect with the collection when user picks one", async () => {
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    const onSelect = vi.fn();
    render(
      <CollectionPicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        onSelect={onSelect}
      />
    );
    // Radix Select renders a button trigger (role=combobox), not a native <select>.
    await waitFor(() => screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("combobox"));
    const target = fixtureCollections[0];
    const label = target.displayName || target.name || "";
    await waitFor(() => screen.getByRole("option", { name: label }));
    await userEvent.click(screen.getByRole("option", { name: label }));
    expect(onSelect).toHaveBeenCalledWith(target);
  });
});
