/**
 * Tests for QuickRedirectForm (T4 RED — T025 + T026)
 *
 * TDD discipline: these tests are written BEFORE implementation.
 * They will fail (RED) until QuickRedirectForm.tsx and MultiMatchDropdown.tsx are created.
 *
 * Covers three state machines:
 *   1. no-match (create-new): RedirectType select enabled; auto-name preview shown
 *   2. single-match (add-to-existing): RedirectType select disabled; hint copy shown
 *   3. multi-match (add-to-existing + dropdown): dropdown renders above form
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickRedirectForm } from "@/components/context-panel/QuickRedirectForm";
import type { RedirectMapItem } from "@/lib/domain/types";

// matchMedia stub
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const PAGE_INFO = { url: "/products/sneaker-cloud-runner" };

const singleMap: RedirectMapItem = {
  id: "map-1",
  name: "Black Friday 2025",
  redirectType: "Redirect301",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "2026-05-10T14:00:00Z",
  mappings: [],
};

const secondMap: RedirectMapItem = {
  id: "map-2",
  name: "Q1 Product Launches",
  redirectType: "Redirect302",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "2026-05-09T10:00:00Z",
  mappings: [],
};

describe("QuickRedirectForm — form is always visible", () => {
  it("RED-QF-1: form renders without a modal-open trigger", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    // Form should be in the DOM directly
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
  });

  it("RED-QF-2: source input pre-populated with pageInfo.url", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    const sourceInput = screen.getByDisplayValue(PAGE_INFO.url);
    expect(sourceInput).toBeDefined();
  });

  it("RED-QF-3: Add button disabled when source is empty", async () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    const sourceInput = screen.getByDisplayValue(PAGE_INFO.url);
    await userEvent.clear(sourceInput);
    const addBtn = screen.getByRole("button", { name: /add/i });
    expect(addBtn).toHaveAttribute("disabled");
  });
});

describe("QuickRedirectForm — no-match (create-new) state", () => {
  it("RED-QF-4: RedirectType select is enabled in create-new state", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    // Native select should be enabled (not disabled)
    const select = screen.getByRole("combobox", { name: /redirect type/i });
    expect(select).not.toHaveAttribute("disabled");
  });

  it("RED-QF-5: auto-name preview shows '{pageSlug}-redirects'", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    // pageSlug from /products/sneaker-cloud-runner = 'sneaker-cloud-runner'
    expect(screen.getByText(/sneaker-cloud-runner-redirects/i)).toBeDefined();
  });

  it("RED-QF-6: RedirectType select shows all 3 enum values", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    // All 3 options should exist
    expect(screen.getByRole("option", { name: /301/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /302/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /server transfer/i })).toBeDefined();
  });

  it("RED-QF-7: submit emits create-new mode with correct args", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={onSubmit}
      />
    );
    const addBtn = screen.getByRole("button", { name: /add/i });
    await userEvent.click(addBtn);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.mode).toBe("create-new");
    expect(arg.name).toMatch(/sneaker-cloud-runner-redirects/);
    expect(arg.source).toBe(PAGE_INFO.url);
    expect(arg.redirectType).toBe("Redirect301");
  });
});

describe("QuickRedirectForm — single-match (add-to-existing) state", () => {
  it("RED-QF-8: RedirectType select is disabled in add-to-existing state", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap]}
        onSubmit={vi.fn()}
      />
    );
    // Native select — disabled attribute present
    const select = screen.getByRole("combobox", { name: /redirect type/i });
    expect(select).toHaveAttribute("disabled");
  });

  it("RED-QF-9: hint copy shows the map name's redirect type", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap]}
        onSubmit={vi.fn()}
      />
    );
    // Hint: "Uses Black Friday 2025's redirect type" (case-insensitive)
    expect(screen.getByText(/black friday 2025/i)).toBeDefined();
    expect(screen.getByText(/redirect type/i)).toBeDefined();
  });

  it("RED-QF-10: auto-name preview is NOT shown in single-match state", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap]}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByText(/-redirects/)).toBeNull();
  });

  it("RED-QF-11: submit emits add-to-existing mode with mapId", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap]}
        onSubmit={onSubmit}
      />
    );
    const addBtn = screen.getByRole("button", { name: /add/i });
    await userEvent.click(addBtn);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.mode).toBe("add-to-existing");
    expect(arg.mapId).toBe("map-1");
    expect(arg.source).toBe(PAGE_INFO.url);
  });
});

describe("QuickRedirectForm — multi-match state", () => {
  it("RED-QF-12: MultiMatchDropdown renders when matchedGroups.length >= 2", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap, secondMap]}
        onSubmit={vi.fn()}
      />
    );
    // "Adding to" label should appear
    expect(screen.getByText(/adding to/i)).toBeDefined();
  });

  it("RED-QF-13: MultiMatchDropdown does NOT render for single-match", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap]}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.queryByText(/adding to/i)).toBeNull();
  });

  it("RED-QF-14: dropdown shows both map names as options", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap, secondMap]}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByRole("option", { name: /black friday 2025/i })).toBeDefined();
    expect(screen.getByRole("option", { name: /q1 product launches/i })).toBeDefined();
  });

  it("RED-QF-15: changing dropdown updates the hint to reflect new map's redirect type", async () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap, secondMap]}
        onSubmit={vi.fn()}
      />
    );
    // Initially the hint paragraph mentions Black Friday 2025 (behavior: text visible)
    // Use getAllByText since map name also appears in the dropdown option
    expect(screen.getAllByText(/black friday 2025/i).length).toBeGreaterThan(0);

    // Change to Q1 Product Launches (302)
    const dropdown = screen.getByRole("combobox", { name: /adding to/i });
    await userEvent.selectOptions(dropdown, "map-2");

    await waitFor(() => {
      // After selection: hint text updates to new map name (behavior assertion)
      expect(screen.getAllByText(/q1 product launches/i).length).toBeGreaterThan(0);
    });
  });

  it("RED-QF-16: submit in multi-match uses selectedMapId", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[singleMap, secondMap]}
        onSubmit={onSubmit}
      />
    );
    // Change dropdown to second map
    const dropdown = screen.getByRole("combobox", { name: /adding to/i });
    await userEvent.selectOptions(dropdown, "map-2");

    const addBtn = screen.getByRole("button", { name: /add/i });
    await userEvent.click(addBtn);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.mode).toBe("add-to-existing");
    expect(arg.mapId).toBe("map-2");
  });
});

describe("QuickRedirectForm — direction toggle (PRD-002 polish)", () => {
  it("RED-QF-17: default direction renders '→ this page' label", () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    const toggle = screen.getByRole("button", { name: /redirecting to this page/i });
    expect(toggle).toBeDefined();
    expect(toggle.textContent).toMatch(/→ this page/);
  });

  it("RED-QF-18: clicking the toggle flips direction label to 'this page →'", async () => {
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={vi.fn()}
      />
    );
    const toggle = screen.getByRole("button", { name: /redirecting to this page/i });
    await userEvent.click(toggle);
    const flipped = screen.getByRole("button", { name: /redirecting from this page/i });
    expect(flipped.textContent).toMatch(/this page →/);
    expect(flipped).toHaveAttribute("aria-pressed", "true");
  });

  it("RED-QF-19: default direction emits source=input, target=pageRoute", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={onSubmit}
      />
    );
    const addBtn = screen.getByRole("button", { name: /^add$/i });
    await userEvent.click(addBtn);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.source).toBe(PAGE_INFO.url);
    expect(arg.target).toBe(PAGE_INFO.url);
  });

  it("RED-QF-20: flipped direction emits source=pageRoute, target=input", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <QuickRedirectForm
        pageInfo={PAGE_INFO}
        matchedGroups={[]}
        onSubmit={onSubmit}
      />
    );
    // Type a distinct URL so source/target can be told apart
    const urlInput = screen.getByLabelText(/source url/i);
    await userEvent.clear(urlInput);
    await userEvent.type(urlInput, "/new-home");

    // Flip the direction
    const toggle = screen.getByRole("button", { name: /redirecting to this page/i });
    await userEvent.click(toggle);

    // Now the input's aria-label is "Target URL"
    expect(screen.getByLabelText(/target url/i)).toBeDefined();

    const addBtn = screen.getByRole("button", { name: /^add$/i });
    await userEvent.click(addBtn);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.source).toBe(PAGE_INFO.url);
    expect(arg.target).toBe("/new-home");
  });
});
