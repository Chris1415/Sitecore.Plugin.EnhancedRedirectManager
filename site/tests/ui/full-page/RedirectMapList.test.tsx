/**
 * T038 RED — RedirectMapList tests
 *
 * Tests: virtuoso rendering, selection state, click handler, all states
 * (default/filled, loading, empty, error).
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("@/lib/sdk/redirects-read", () => ({
  listRedirectMaps: vi.fn(),
}));

// Mock react-virtuoso to render items without virtualization in jsdom
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({
    data,
    itemContent,
  }: {
    data: unknown[];
    itemContent: (index: number, item: unknown) => React.ReactNode;
  }) => (
    <div data-testid="virtuoso-list">
      {data?.map((item, index) => (
        <div key={index} data-testid={`virtuoso-item-${index}`}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  ),
}));

import { RedirectMapList } from "@/components/full-page/RedirectMapList";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { RedirectMapItem } from "@/lib/domain/types";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import React from "react";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";
const SITE_PATH = "/sitecore/content/solo/solo-website/Settings/Redirects";

const fixtureMap1: RedirectMapItem = {
  id: "e39157f3a81f4692b05d178d48c836de",
  name: "Marketing campaigns",
  redirectType: "301",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183802Z",
  mappings: [
    { source: "/old", target: "/new" },
    { source: "/old2", target: "/new2" },
  ],
};

const fixtureMap2: RedirectMapItem = {
  id: "590b53834e394203abe42bd6e575615a",
  name: "Legacy product URLs",
  redirectType: "302",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183806Z",
  mappings: [],
};

describe("RedirectMapList (T038)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("RED-1: renders map names from fixture", async () => {
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1, fixtureMap2]);
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("Marketing campaigns")).toBeDefined();
      expect(screen.getByText("Legacy product URLs")).toBeDefined();
    });
  });

  it("RED-2: shows skeleton while loading", () => {
    (listRedirectMaps as Mock).mockImplementation(() => new Promise(() => {}));
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThanOrEqual(1);
  });

  it("RED-3: shows empty state when no maps", async () => {
    (listRedirectMaps as Mock).mockResolvedValue([]);
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/no redirect maps/i)).toBeDefined();
    });
  });

  it("RED-4: shows error state on failure and retry button", async () => {
    (listRedirectMaps as Mock).mockRejectedValue(new Error("fetch failed"));
    const onRetry = vi.fn();
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={null}
        onSelect={vi.fn()}
        onRetry={onRetry}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });

  it("RED-5: calls onSelect when a map row is clicked", async () => {
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1]);
    const onSelect = vi.fn();
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={null}
        onSelect={onSelect}
        onRetry={vi.fn()}
      />
    );
    await waitFor(() => screen.getByText("Marketing campaigns"));
    fireEvent.click(screen.getByText("Marketing campaigns").closest("[role='option']")!);
    expect(onSelect).toHaveBeenCalledWith(fixtureMap1);
  });

  it("RED-6: selected row has aria-selected=true", async () => {
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1, fixtureMap2]);
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={fixtureMap1.id}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    await waitFor(() => {
      const selectedRow = screen
        .getByText("Marketing campaigns")
        .closest("[role='option']");
      expect(selectedRow?.getAttribute("aria-selected")).toBe("true");
    });
  });

  it("RED-7: renders mapping count metadata", async () => {
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1]);
    render(
      <RedirectMapList
        client={mockClient}
        sitecoreContextId={CTX_ID}
        sitePath={SITE_PATH}
        selectedMapId={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/2 mappings/i)).toBeDefined();
    });
  });
});
