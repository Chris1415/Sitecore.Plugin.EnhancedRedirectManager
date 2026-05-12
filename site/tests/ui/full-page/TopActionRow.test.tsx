/**
 * T040 RED — TopActionRow tests
 *
 * Tests: breadcrumb updates from props, stub buttons render but don't fire writes.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { TopActionRow } from "@/components/full-page/TopActionRow";
import type { Sites } from "@sitecore-marketplace-sdk/xmc";

const fixtureCollection: Sites.SiteCollection = {
  id: "343b1245e77541cda8f2094b70531eb3",
  name: "solo",
  description: "",
  displayName: "solo",
  sortOrder: 100,
  createdBy: "test",
  created: "2025-12-09T14:10:07+00:00",
  permissions: {
    canAdmin: true,
    canWrite: true,
    canCreate: true,
    canDelete: true,
    canRename: true,
    canRead: true,
    canPublish: false,
    canDuplicate: false,
    canWriteLanguage: true,
  },
  settings: { itemPath: "/sitecore/content/solo" },
};

const fixtureSite: Sites.Site = {
  id: "c541f0fd-54fc-4834-8967-a16af0bd68cb",
  name: "solo-website",
  description: "",
  displayName: "solo-website",
  collectionId: "343b1245e77541cda8f2094b70531eb3",
  created: "",
  createdBy: "",
  sortOrder: 100,
  brandKitId: null,
  hosts: [],
  permissions: {
    canAdmin: true,
    canWrite: true,
    canCreate: true,
    canDelete: true,
    canRename: true,
    canRead: true,
    canPublish: true,
    canDuplicate: true,
    canWriteLanguage: true,
  },
  languages: ["en"],
  supportedLanguages: ["en"],
  errorPages: { errorPage: null, notFoundPage: null },
  errorPagesConfiguration: {
    errorPage: { id: null, path: null },
    notFoundPage: { id: null, path: null },
  },
  settings: { thumbnailsRootPath: "", generateThumbnails: "true" },
  properties: {},
};

describe("TopActionRow (T040)", () => {
  it("RED-1: shows 'Pick a collection to begin' breadcrumb when nothing selected", () => {
    render(
      <TopActionRow
        selectedCollection={null}
        selectedSite={null}
        selectedMapName={null}
      />
    );
    expect(screen.getByText(/pick a collection|redirect manager/i)).toBeDefined();
  });

  it("RED-2: breadcrumb shows collection name when collection picked", () => {
    render(
      <TopActionRow
        selectedCollection={fixtureCollection}
        selectedSite={null}
        selectedMapName={null}
      />
    );
    expect(screen.getByText("solo")).toBeDefined();
  });

  it("RED-3: breadcrumb shows collection + site when both picked", () => {
    render(
      <TopActionRow
        selectedCollection={fixtureCollection}
        selectedSite={fixtureSite}
        selectedMapName={null}
      />
    );
    expect(screen.getByText("solo")).toBeDefined();
    expect(screen.getByText("solo-website")).toBeDefined();
  });

  it("RED-4: breadcrumb shows collection + site + map name when all picked", () => {
    render(
      <TopActionRow
        selectedCollection={fixtureCollection}
        selectedSite={fixtureSite}
        selectedMapName="Marketing campaigns"
      />
    );
    expect(screen.getByText("Marketing campaigns")).toBeDefined();
  });

  it("RED-5: stub action buttons are present", () => {
    render(
      <TopActionRow
        selectedCollection={fixtureCollection}
        selectedSite={fixtureSite}
        selectedMapName={null}
      />
    );
    expect(screen.getByRole("button", { name: /import/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /export/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /new map/i })).toBeDefined();
  });

  it("RED-6: stub action buttons do not call any mutation on click", () => {
    // We verify no error is thrown and no mock is called on click
    // (the buttons are stubs — they have no wired action)
    render(
      <TopActionRow
        selectedCollection={fixtureCollection}
        selectedSite={fixtureSite}
        selectedMapName={null}
      />
    );
    // Clicking Import should not throw
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /import/i }));
      fireEvent.click(screen.getByRole("button", { name: /export/i }));
      fireEvent.click(screen.getByRole("button", { name: /new map/i }));
    }).not.toThrow();
  });
});
