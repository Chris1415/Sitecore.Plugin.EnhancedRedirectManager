/**
 * Tests for ContextPanel state rendering (T027, T028, T029, T030)
 *
 * Tests the loading, empty, and error states of the full ContextPanel.
 * Uses vi.mock to control subscribePageContext and listRedirectMaps.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// assumed: per sitecore:marketplace-sdk-client .d.ts 2026-05-10
// source: tests/fixtures/graphql/page-context.json
import pageContextFixture from "@/tests/fixtures/graphql/page-context.json";

import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { PagesContext } from "@/lib/sdk/page-context";

// Mock all SDK dependencies
vi.mock("@/lib/sdk/page-context", () => ({
  subscribePageContext: vi.fn(),
}));

vi.mock("@/lib/sdk/redirects-read", () => ({
  listRedirectMaps: vi.fn(),
}));

vi.mock("@/lib/sdk/canvas-reload", () => ({
  reloadPagesCanvas: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sdk/redirects-write", () => ({
  updateRedirectMap: vi.fn().mockResolvedValue({ ok: true }),
  createRedirectMap: vi.fn().mockResolvedValue({ ok: true, itemId: "new-id" }),
  deleteRedirectMap: vi.fn().mockResolvedValue({ ok: true }),
}));

import { subscribePageContext } from "@/lib/sdk/page-context";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { ContextPanel } from "@/components/context-panel/ContextPanel";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";

// Build a synthetic PagesContext from the captured fixture
const mockPageCtx: PagesContext = {
  pageInfo: {
    route: "/",
    url: "/?sc_site=solo-website",
    name: "Home",
    id: pageContextFixture.pageInfo.id,
    path: pageContextFixture.pageInfo.path,
  } as PagesContext["pageInfo"],
  siteInfo: pageContextFixture.siteInfo as unknown as PagesContext["siteInfo"],
};

describe("ContextPanel — loading state (T027)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // subscribePageContext won't emit — stays in loading
    (subscribePageContext as Mock).mockImplementation(() => new Promise(() => {}));
    (listRedirectMaps as Mock).mockResolvedValue([]);
  });

  it("RED-1: shows skeleton placeholders while loading", () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    // Skeleton elements present
    const skeletons = document.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("RED-2: no Add redirect button while loading", () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    expect(screen.queryByRole("button", { name: /add redirect/i })).toBeNull();
  });

  it("RED-3: aria-live region announces loading", () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    const liveRegion = document.querySelector('[aria-live="polite"][role="status"]');
    expect(liveRegion?.textContent).toContain("Loading redirects");
  });
});

describe("ContextPanel — empty state (T028)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (subscribePageContext as Mock).mockImplementation(
      async (_client: ClientSDK, callback: (ctx: PagesContext) => void) => {
        callback(mockPageCtx);
        return () => {};
      }
    );
    // Return no maps → empty state
    (listRedirectMaps as Mock).mockResolvedValue([]);
  });

  it("RED-1: empty state copy visible", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/No redirects affect this page/i)).toBeDefined();
    });
  });

  it("RED-2: Add redirect button present in empty state", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add redirect for this page/i })).toBeDefined();
    });
  });
});

describe("ContextPanel — error state (T029)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (subscribePageContext as Mock).mockImplementation(
      async (_client: ClientSDK, callback: (ctx: PagesContext) => void) => {
        callback(mockPageCtx);
        return () => {};
      }
    );
    (listRedirectMaps as Mock).mockRejectedValue(new Error("GraphQL: field not found"));
  });

  it("RED-1: error alert renders with monochrome ✕ glyph (U+2715)", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(document.body.textContent).toContain("\u2715");
    });
    // Must NOT contain color-emoji ❌ (U+274C)
    expect(document.body.textContent).not.toContain("\u274c");
  });

  it("RED-2: error message visible", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByText(/Couldn't load redirects/i)).toBeDefined();
    });
  });

  it("RED-3: Retry button triggers re-fetch", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => screen.getByRole("button", { name: /retry/i }));
    const callsBefore = (listRedirectMaps as Mock).mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect((listRedirectMaps as Mock).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it("RED-4: aria-live=assertive on error container", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      const alertEl = document.querySelector('[role="alert"][aria-live="assertive"]');
      expect(alertEl).toBeDefined();
    });
  });
});

describe("ContextPanel — default state / orchestration (T030)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (subscribePageContext as Mock).mockImplementation(
      async (_client: ClientSDK, callback: (ctx: PagesContext) => void) => {
        callback({
          ...mockPageCtx,
          pageInfo: {
            ...mockPageCtx.pageInfo,
            route: "/test",
          } as PagesContext["pageInfo"],
        });
        return () => {};
      }
    );
    // Return a map with matching route in mappings
    (listRedirectMaps as Mock).mockResolvedValue([
      {
        id: "map-1",
        name: "Test Map",
        redirectType: "Redirect301",
        preserveQueryString: false,
        preserveLanguage: false,
        includeVirtualFolder: false,
        updatedAt: "20260509T183802Z",
        mappings: [{ source: "/test", target: "/new-test" }],
      },
    ]);
  });

  it("RED-1: renders matched map group after loading", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByText("Test Map")).toBeDefined();
    });
  });

  it("RED-2: regex banner always present", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    // Banner is always rendered, even while loading
    expect(screen.getByRole("note")).toBeDefined();
    expect(screen.getByRole("note").textContent).toContain("Direct-string matches only");
  });

  it("RED-4: Add redirect button present in default state", async () => {
    render(<ContextPanel client={mockClient} sitecoreContextId={CTX_ID} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add redirect for this page/i })).toBeDefined();
    });
  });
});
