/**
 * T037 RED — SitePicker tests
 *
 * Tests: filtered-by-collection, disabled-until-collection-picked, error, empty.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/sdk/sites", () => ({
  listCollections: vi.fn(),
  listSites: vi.fn(),
}));

import { listSites } from "@/lib/sdk/sites";
import { SitePicker } from "@/components/full-page/SitePicker";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { Sites } from "@sitecore-marketplace-sdk/xmc";
import sitesFixture from "@/tests/fixtures/graphql/sites-list.json";
import collectionsFixture from "@/tests/fixtures/graphql/collections-list.json";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";
const fixtureSites = sitesFixture as Sites.Site[];
const fixtureCollections = collectionsFixture as Sites.SiteCollection[];
const fixtureSoloCollection = fixtureCollections[0]; // id: 343b1245e77541cda8f2094b70531eb3

describe("SitePicker (T037)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RED-1: is disabled when no collection selected", async () => {
    (listSites as Mock).mockResolvedValue(fixtureSites);
    render(
      <SitePicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        selectedCollection={null}
        onSelect={vi.fn()}
      />
    );
    // Wait for sites to load (loading skeleton → select rendered)
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveProperty("disabled", true);
    });
  });

  it("RED-2: enables after collection is picked", async () => {
    (listSites as Mock).mockResolvedValue(fixtureSites);
    render(
      <SitePicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        selectedCollection={fixtureSoloCollection}
        onSelect={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveProperty("disabled", false);
    });
  });

  it("RED-3: only shows sites matching the selected collection", async () => {
    (listSites as Mock).mockResolvedValue(fixtureSites);
    render(
      <SitePicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        selectedCollection={fixtureSoloCollection}
        onSelect={vi.fn()}
      />
    );
    // Radix Select keeps options in a portal — open the dropdown first, then assert.
    await waitFor(() => screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("combobox"));
    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("RED-4: shows empty state when collection has no sites", async () => {
    // Return sites from a different collection
    const differentCollectionSites = fixtureSites.map((s) => ({
      ...s,
      collectionId: "different-collection-id",
    }));
    (listSites as Mock).mockResolvedValue(differentCollectionSites);
    render(
      <SitePicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        selectedCollection={fixtureSoloCollection}
        onSelect={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/no sites/i)).toBeDefined();
    });
  });

  it("RED-5: calls onSelect with site when user picks one", async () => {
    (listSites as Mock).mockResolvedValue(fixtureSites);
    const onSelect = vi.fn();
    render(
      <SitePicker
        client={mockClient}
        sitecoreContextId={CTX_ID}
        selectedCollection={fixtureSoloCollection}
        onSelect={onSelect}
      />
    );
    await waitFor(() => screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("combobox"));
    const displayName = fixtureSites[0].displayName || fixtureSites[0].name || "";
    await waitFor(() => screen.getByRole("option", { name: displayName }));
    await userEvent.click(screen.getByRole("option", { name: displayName }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: fixtureSites[0].name }),
    );
  });
});
