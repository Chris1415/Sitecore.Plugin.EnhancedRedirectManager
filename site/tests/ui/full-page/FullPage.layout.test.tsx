/**
 * T035 RED — FullPage layout tests
 *
 * Tests two-pane vs tabbed-fallback layout at viewport widths.
 * Two-pane at ≥960px, tabbed at <960px.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/sdk/sites", () => ({
  listCollections: vi.fn(),
  listSites: vi.fn(),
}));
vi.mock("@/lib/sdk/redirects-read", () => ({
  listRedirectMaps: vi.fn(),
}));

import { listCollections, listSites } from "@/lib/sdk/sites";
import { listRedirectMaps } from "@/lib/sdk/redirects-read";
import { FullPage } from "@/components/full-page/FullPage";
import type { ClientSDK } from "@sitecore-marketplace-sdk/client";
import type { Sites } from "@sitecore-marketplace-sdk/xmc";
import collectionsFixture from "@/tests/fixtures/graphql/collections-list.json";
import sitesFixture from "@/tests/fixtures/graphql/sites-list.json";

const mockClient = {} as ClientSDK;
const CTX_ID = "ctx-test-123";

const fixtureCollections = collectionsFixture as Sites.SiteCollection[];
const fixtureSites = sitesFixture as Sites.Site[];

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("FullPage — layout (T035)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listCollections as Mock).mockResolvedValue(fixtureCollections);
    (listSites as Mock).mockResolvedValue(fixtureSites);
    (listRedirectMaps as Mock).mockResolvedValue([]);
  });

  it("RED-1: renders the rail landmark at wide viewport", () => {
    setViewport(1280);
    render(
      <FullPage client={mockClient} sitecoreContextId={CTX_ID} />
    );
    expect(screen.getByRole("complementary")).toBeDefined();
  });

  it("RED-2: renders tabbed fallback at narrow viewport (<960)", () => {
    setViewport(800);
    render(
      <FullPage client={mockClient} sitecoreContextId={CTX_ID} />
    );
    // Tabs are present in narrow mode
    expect(screen.getByRole("tablist")).toBeDefined();
  });

  it("RED-3: top action row renders breadcrumb nav", () => {
    setViewport(1280);
    render(
      <FullPage client={mockClient} sitecoreContextId={CTX_ID} />
    );
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeDefined();
  });

  it("RED-4: Import / Export / New map stubs are present", () => {
    setViewport(1280);
    render(
      <FullPage client={mockClient} sitecoreContextId={CTX_ID} />
    );
    expect(screen.getByRole("button", { name: /import/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /export/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /new map/i })).toBeDefined();
  });
});
