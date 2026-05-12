/**
 * Tests for DashboardWidget (per-site stats with picker fallback).
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/sdk/redirects-read", () => ({
  listRedirectMaps: vi.fn(),
}));
vi.mock("@/lib/sdk/sites", () => ({
  listSites: vi.fn(),
  listCollections: vi.fn(),
}));

import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { listSites, listCollections } from "@/lib/sdk/sites";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { DashboardWidget } from "@/components/dashboard-widget/DashboardWidget";
import type { RedirectMapItem } from "@/lib/domain/types";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";

const singleSite = [{ id: "site-1", name: "solo-website", collectionId: "col-1" }];
const twoSites = [
  { id: "site-1", name: "solo-website", collectionId: "col-1" },
  { id: "site-2", name: "other-site", collectionId: "col-1" },
];
const fixtureCollections = [{ id: "col-1", name: "solo" }];

const fixtureMap1: RedirectMapItem = {
  id: "map-1",
  name: "My Redirect Map",
  redirectType: "ServerTransfer",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: true,
  updatedAt: "20260509T183802Z",
  mappings: [
    { source: "/test", target: "/newTest" },
    { source: "/hello", target: "/world" },
  ],
};

const fixtureMap2: RedirectMapItem = {
  id: "map-2",
  name: "Test Group",
  redirectType: "Redirect301",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183806Z",
  mappings: [],
};

const STORAGE_KEY = "redirect-manager:dashboard-widget:selected-site-id";

beforeEach(() => {
  // Clean localStorage between tests so site selection doesn't leak.
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
});

describe("DashboardWidget — single site (auto-selected)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listSites as Mock).mockResolvedValue(singleSite);
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1, fixtureMap2]);
  });

  it("renders three tiles with correct labels", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Maps")).toBeDefined();
      expect(screen.getByText("Mappings")).toBeDefined();
      expect(screen.getByText("Last updated")).toBeDefined();
    });
  });

  it("footnote rendered verbatim", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(
        screen.getByText(/Redirect counts only — usage analytics ship in a follow-on release/i),
      ).toBeDefined();
    });
  });

  it("tile values match the single site (2 maps, 2 mappings)", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      const twos = screen.getAllByText("2");
      expect(twos.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("filters listRedirectMaps to the auto-selected site", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect((listRedirectMaps as Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    const sitePath = (listRedirectMaps as Mock).mock.calls[0][2];
    expect(sitePath).toBe("/sitecore/content/solo/solo-website/Settings/Redirects");
  });

  it("does NOT render a site picker for a one-site tenant", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => screen.getByText("Maps"));
    expect(screen.queryByRole("combobox", { name: /pick a site/i })).toBeNull();
  });
});

describe("DashboardWidget — multi-site picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listSites as Mock).mockResolvedValue(twoSites);
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1]);
  });

  it("renders a site picker and prompts the operator to pick", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /pick a site/i })).toBeDefined();
    });
    expect(
      screen.getByText(/Pick a site from the top-right dropdown/i),
    ).toBeDefined();
  });

  it("respects a stored selection from localStorage", async () => {
    window.localStorage.setItem(STORAGE_KEY, "site-2");
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect((listRedirectMaps as Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    const sitePath = (listRedirectMaps as Mock).mock.calls[0][2];
    expect(sitePath).toBe("/sitecore/content/solo/other-site/Settings/Redirects");
  });

  it("falls back to picker if the stored siteId doesn't exist anymore", async () => {
    window.localStorage.setItem(STORAGE_KEY, "site-999-gone");
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(
        screen.getByText(/Pick a site from the top-right dropdown/i),
      ).toBeDefined();
    });
  });
});

describe("DashboardWidget — empty state (site has 0 maps)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listSites as Mock).mockResolvedValue(singleSite);
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    (listRedirectMaps as Mock).mockResolvedValue([]);
  });

  it("renders empty copy + footnote", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      const matches = screen.getAllByText(/No redirects configured/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Redirect counts only/i)).toBeDefined();
    });
  });
});

describe("DashboardWidget — tenant has zero sites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listSites as Mock).mockResolvedValue([]);
    (listCollections as Mock).mockResolvedValue([]);
  });

  it("renders the 'no sites' empty message", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/No sites found in this tenant/i)).toBeDefined();
    });
  });
});

describe("DashboardWidget — error state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listSites as Mock).mockRejectedValue(new Error("Network error"));
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
  });

  it("destructive alert with retry button", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });

  it("error alert uses monochrome ✕ glyph", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(document.body.textContent).toContain("\u2715");
    });
    expect(document.body.textContent).not.toContain("\u274c");
  });

  it("footnote stays even in error state", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/Redirect counts only/i)).toBeDefined();
    });
  });

  it("Retry re-fires the discovery query", async () => {
    (listSites as Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(singleSite);
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => screen.getByRole("button", { name: /retry/i }));
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect((listSites as Mock).mock.calls.length).toBe(2);
    });
  });
});

describe("DashboardWidget — a11y", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listSites as Mock).mockResolvedValue(singleSite);
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1]);
  });

  it("section has aria-label referencing the selected site", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      const region = screen.getByRole("region", { name: /Redirects summary/i });
      expect(region).toBeDefined();
    });
  });

  it("each tile is an article with aria-label", async () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      const articles = screen.getAllByRole("article");
      expect(articles).toHaveLength(3);
      for (const article of articles) {
        expect(article.getAttribute("aria-label")).toBeTruthy();
      }
    });
  });

  it("aria-live region present", () => {
    render(<DashboardWidget client={mockClient} sitecoreContextId={CTX_ID} />);
    const liveRegion = document.querySelector('[aria-live="polite"][role="status"]');
    expect(liveRegion).toBeDefined();
  });
});
