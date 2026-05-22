/**
 * EditRowModal.test.tsx — T018a/T018 + T019a/T019 + T023a/T023 + T025
 *
 * Simplified 2026-05-21 (operator UX feedback):
 *   Removed tests for: T020 (snippet library), T021 (capture-group chips),
 *   T022 (sample URL tester), T024 (inline mode-mismatch hint).
 *   Those affordances were removed from EditRowModal.
 *
 * Covers (per remaining affordances):
 *
 * T018a / T018 — CRUD parity (R8b gate):
 *   - Save invokes updateRedirectMap with correctly mutated mappings array
 *   - Cancel with unsaved changes triggers alert-dialog confirmation
 *   - Cancel without changes closes immediately (no confirm)
 *
 * T019a / T019 — Mode toggle:
 *   - Defaults to 'pattern' on every open (FR-A2)
 *   - Switching mode preserves source + target edits
 *
 * T023a / T023 — Save-time validation:
 *   - Invalid regex blocks save + inline error + modal stays open
 *   - $0 reference rejected
 *   - $N where N > group count rejected
 *   - $siteLang exempt from count cross-check
 *
 * T025 — Additional coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EditRowModal } from "./EditRowModal";
import type { RedirectMapItem } from "@/lib/domain/types";
import type { ClientSDK } from "@/lib/sdk/types";

// ---------------------------------------------------------------------------
// Mock updateRedirectMap (the write SDK helper)
// ---------------------------------------------------------------------------

const mockUpdateRedirectMap = vi.fn();
vi.mock("@/lib/sdk/redirects-write", () => ({
  updateRedirectMap: (...args: unknown[]) => mockUpdateRedirectMap(...args),
  renameRedirectMap: vi.fn(),
  createRedirectMap: vi.fn(),
  deleteRedirectMap: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_MAP: RedirectMapItem = {
  id: "map-guid-001",
  name: "Test Map",
  redirectType: "Redirect301",
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: "20260520T080000Z",
  mappings: [
    { source: "/old-page", target: "/new-page" },
    { source: "/blog/post", target: "/articles/post" },
  ],
};

const DEFAULT_PROPS = {
  open: true,
  onOpenChange: vi.fn(),
  client: {} as ClientSDK,
  sitecoreContextId: "ctx-001",
  map: BASE_MAP,
  rowIndex: 0 as number | "new",
  onSaved: vi.fn(),
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Default: updateRedirectMap succeeds
  mockUpdateRedirectMap.mockResolvedValue({ ok: true, itemId: "map-guid-001" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// T018a — CRUD parity (carry-over R8b gate)
// ---------------------------------------------------------------------------

describe("T018a/T018 — CRUD parity (R8b gate)", () => {
  it("renders source and destination pre-filled from the existing row", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} />);
    expect((screen.getByLabelText("Source") as HTMLInputElement).value).toBe("/old-page");
    expect((screen.getByLabelText("Destination") as HTMLInputElement).value).toBe("/new-page");
  });

  it("Save invokes updateRedirectMap with correctly mutated mappings array (not replacing other rows)", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} />);

    const destInput = screen.getByLabelText("Destination") as HTMLInputElement;
    fireEvent.change(destInput, { target: { value: "/new-destination" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateRedirectMap).toHaveBeenCalledTimes(1);
    });

    const [, , updateInput] = mockUpdateRedirectMap.mock.calls[0] as [unknown, unknown, { mappings: Array<{ source: string; target: string }> }];
    // Row 0 changed; row 1 preserved
    expect(updateInput.mappings).toHaveLength(2);
    expect(updateInput.mappings[0]).toEqual({ source: "/old-page", target: "/new-destination" });
    expect(updateInput.mappings[1]).toEqual({ source: "/blog/post", target: "/articles/post" });
  });

  it("Save in add-row mode appends a new row to the mappings array", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "/brand-new" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/brand-dest" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateRedirectMap).toHaveBeenCalledTimes(1);
    });

    const [, , updateInput] = mockUpdateRedirectMap.mock.calls[0] as [unknown, unknown, { mappings: Array<{ source: string; target: string }> }];
    expect(updateInput.mappings).toHaveLength(3);
    expect(updateInput.mappings[2]).toEqual({ source: "/brand-new", target: "/brand-dest" });
  });

  it("onSaved is called with the updated map after a successful save", async () => {
    const onSaved = vi.fn();
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/changed" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const updatedMap = onSaved.mock.calls[0][0] as RedirectMapItem;
    expect(updatedMap.mappings[0].target).toBe("/changed");
    expect(updatedMap.mappings[1]).toEqual(BASE_MAP.mappings[1]);
  });

  it("Cancel without changes closes immediately — no confirm dialog", () => {
    const onOpenChange = vi.fn();
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    // Should NOT show the unsaved-changes alert
    expect(screen.queryByText(/Discard changes/)).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Cancel WITH unsaved changes triggers alert-dialog confirmation", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} />);

    // Make a change
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/dirty" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    // Alert dialog title should appear (the heading with the question mark)
    await waitFor(() => {
      expect(screen.getByText(/Discard changes\?/i)).toBeTruthy();
    });
  });

});

// ---------------------------------------------------------------------------
// T019a — Mode toggle
// ---------------------------------------------------------------------------

describe("T019a/T019 — Mode toggle", () => {
  it("defaults to 'pattern' mode on every open (FR-A2 / ADR-0040)", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);

    const patternBtn = screen.getByRole("button", { name: /pattern/i });
    expect(patternBtn).toHaveAttribute("aria-pressed", "true");

    const regexBtn = screen.getByRole("button", { name: /regex/i });
    expect(regexBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("switching to Regex mode does not lose source/target edits", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "/my-source" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/my-dest" } });

    // Switch to regex
    fireEvent.click(screen.getByRole("button", { name: /regex/i }));

    expect((screen.getByLabelText("Source") as HTMLInputElement).value).toBe("/my-source");
    expect((screen.getByLabelText("Destination") as HTMLInputElement).value).toBe("/my-dest");
  });

  it("switching back to Pattern mode does not lose source/target edits", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);

    fireEvent.click(screen.getByRole("button", { name: /regex/i }));
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "^/test$" } });
    fireEvent.click(screen.getByRole("button", { name: /pattern/i }));

    expect((screen.getByLabelText("Source") as HTMLInputElement).value).toBe("^/test$");
  });

});

// ---------------------------------------------------------------------------
// T023a — Save-time validation
// ---------------------------------------------------------------------------

describe("T023a/T023 — Save-time validation", () => {
  it("invalid regex blocks save; inline error contains exception message; modal stays open", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);
    fireEvent.click(screen.getByRole("button", { name: /regex/i }));

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "(a+]$" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/dest" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const errorEl = screen.getByRole("alert");
      expect(errorEl.textContent).toMatch(/Invalid regex/i);
    });

    // Modal stays open — updateRedirectMap NOT called
    expect(mockUpdateRedirectMap).not.toHaveBeenCalled();
  });

  it("$0 reference in destination is rejected with appropriate message", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);
    fireEvent.click(screen.getByRole("button", { name: /regex/i }));

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "^/test/(.+)$" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/dest/$0" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const errorEl = screen.getByRole("alert");
      expect(errorEl.textContent).toMatch(/\$0 is not supported/i);
    });

    expect(mockUpdateRedirectMap).not.toHaveBeenCalled();
  });

  it("$3 reference when source has only 1 group → rejected with correct count message", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);
    fireEvent.click(screen.getByRole("button", { name: /regex/i }));

    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "^/test/(.+)$" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/dest/$3" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const errorEl = screen.getByRole("alert");
      expect(errorEl.textContent).toMatch(/\$3.*only 1 capture group/i);
    });

    expect(mockUpdateRedirectMap).not.toHaveBeenCalled();
  });

  it("$siteLang reference is exempt from group-count cross-check — save proceeds", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);
    fireEvent.click(screen.getByRole("button", { name: /regex/i }));

    // Source has 0 capturing groups
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "^/test$" } });
    // Destination uses $siteLang — should NOT be blocked
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/$siteLang/test" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockUpdateRedirectMap).toHaveBeenCalledTimes(1);
    });
  });

});

// ---------------------------------------------------------------------------
// T025 — Additional coverage
// ---------------------------------------------------------------------------

describe("T025 — Additional test coverage", () => {
  it("modal renders with correct title 'Edit mapping' for existing row", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} />);
    expect(screen.getByText("Edit mapping")).toBeTruthy();
  });

  it("modal renders with correct title 'Add mapping' for new row", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);
    expect(screen.getByText("Add mapping")).toBeTruthy();
  });

  it("duplicate source in add-row mode → blocks save with toast (not a validation error)", async () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex="new" />);
    // Use an existing source value
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "/old-page" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/something" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Should NOT call updateRedirectMap (blocked by duplicate check)
    await waitFor(() => {
      expect(mockUpdateRedirectMap).not.toHaveBeenCalled();
    });
  });

  it("save fails from server → does NOT call onSaved or onOpenChange(false)", async () => {
    mockUpdateRedirectMap.mockResolvedValue({ ok: false });
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EditRowModal
        {...DEFAULT_PROPS}
        rowIndex={0}
        onSaved={onSaved}
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "/changed" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onSaved).not.toHaveBeenCalled();
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("structural guard: EditRowModal does NOT render RedirectType / IncludeVirtualFolder / PreserveQueryString / PreserveLanguage controls (ADR-0043 / FR-A8)", () => {
    render(<EditRowModal {...DEFAULT_PROPS} rowIndex={0} />);
    const container = document.body;

    // None of the map-level field names should appear as user-visible text or aria labels
    expect(container.textContent).not.toMatch(/RedirectType/i);
    expect(container.textContent).not.toMatch(/IncludeVirtualFolder/i);
    expect(container.textContent).not.toMatch(/PreserveQueryString/i);
    expect(container.textContent).not.toMatch(/PreserveLanguage/i);
  });
});
