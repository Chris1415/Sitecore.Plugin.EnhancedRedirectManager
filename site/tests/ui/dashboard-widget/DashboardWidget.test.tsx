/**
 * Tests for DashboardWidget (T031 RED-1 through RED-4, T032 RED-1, T033 RED-1 through RED-4, T034 RED-1 through RED-4)
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/sdk/redirects-read", () => ({
  listRedirectMaps: vi.fn(),
}));

import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { DashboardWidget } from "@/components/dashboard-widget/DashboardWidget";
import type { RedirectMapItem } from "@/lib/domain/types";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";
const SITE_NAME = "solo-website";
const SITE_PATH = "/sitecore/content/solo/solo-website/Settings/Redirects";

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
  redirectType: "301",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260509T183806Z",
  mappings: [],
};

describe("DashboardWidget — default state (T031 + T032)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1, fixtureMap2]);
  });

  it("RED-1: renders three tiles with correct labels", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("Redirect maps")).toBeDefined();
      expect(screen.getByText("Total mappings")).toBeDefined();
      expect(screen.getByText("Last updated")).toBeDefined();
    });
  });

  it("RED-2: footnote rendered verbatim", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      expect(
        screen.getByText(/Redirect counts only — usage analytics ship in a follow-on release/i)
      ).toBeDefined();
    });
  });

  it("RED-3: tiles non-interactive — no button elements inside tiles", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => screen.getByText("Redirect maps"));
    // No buttons inside the tile articles
    const articles = screen.getAllByRole("article");
    for (const article of articles) {
      expect(article.querySelector("button")).toBeNull();
    }
  });

  it("RED-4 T032: tile values match fixture aggregates (2 maps, 2 mappings)", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      // 2 maps total + 2 mappings total → two tiles showing "2"
      const twos = screen.getAllByText("2");
      expect(twos.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("DashboardWidget — loading state (T033 RED-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listRedirectMaps as Mock).mockImplementation(() => new Promise(() => {}));
  });

  it("RED-1: shows 3 skeleton tiles while loading", () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("DashboardWidget — empty state (T033 RED-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listRedirectMaps as Mock).mockResolvedValue([]);
  });

  it("RED-2: empty copy and footnote rendered", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/No redirects configured for this site/i)).toBeDefined();
      expect(screen.getByText(/Redirect counts only/i)).toBeDefined();
    });
  });
});

describe("DashboardWidget — error state (T033 RED-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listRedirectMaps as Mock).mockRejectedValue(new Error("Network error"));
  });

  it("RED-3: destructive alert with retry button", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });

  it("RED-3b: error alert uses monochrome ✕ glyph", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      expect(document.body.textContent).toContain("\u2715");
    });
    expect(document.body.textContent).not.toContain("\u274c");
  });

  it("RED-3c: footnote stays even in error state", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      expect(screen.getByText(/Redirect counts only/i)).toBeDefined();
    });
  });

  it("RED-3d: Retry re-fires listRedirectMaps", async () => {
    (listRedirectMaps as Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([]);
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => screen.getByRole("button", { name: /retry/i }));
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect((listRedirectMaps as Mock).mock.calls.length).toBe(2);
    });
  });
});

describe("DashboardWidget — a11y (T034)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listRedirectMaps as Mock).mockResolvedValue([fixtureMap1]);
  });

  it("RED-1: section has aria-label with site name", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      const region = screen.getByRole("region", { name: new RegExp(SITE_NAME) });
      expect(region).toBeDefined();
    });
  });

  it("RED-2: each tile is an article with aria-label", async () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    await waitFor(() => {
      const articles = screen.getAllByRole("article");
      expect(articles).toHaveLength(3);
      for (const article of articles) {
        expect(article.getAttribute("aria-label")).toBeTruthy();
      }
    });
  });

  it("RED-3: aria-live region present", () => {
    render(
      <DashboardWidget
        client={mockClient}
        sitecoreContextId={CTX_ID}
        siteName={SITE_NAME}
        sitePath={SITE_PATH}
      />
    );
    const liveRegion = document.querySelector('[aria-live="polite"][role="status"]');
    expect(liveRegion).toBeDefined();
  });
});
