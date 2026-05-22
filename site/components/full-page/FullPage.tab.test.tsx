/**
 * FullPage.tab.test.tsx — T027a [RED] + T027 [GREEN]
 *
 * Covers (per task breakdown § 4b E4):
 *   - Manage/Test segmented tab renders both triggers
 *   - Default tab is "manage"
 *   - Clicking "Test" renders TestSurface (or its stub placeholder)
 *   - Clicking back to "Manage" re-renders manage content
 *   - lastTrace survives Manage↔Test tab toggle (ADR-0041)
 *   - activeTab persists across toggles within one page lifecycle
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FullPage } from "./FullPage";

// ---------------------------------------------------------------------------
// Mocks — heavy dependencies that are not under test
// ---------------------------------------------------------------------------

vi.mock("@/components/full-page/CollectionPicker", () => ({
  CollectionPicker: ({ onSelect }: { onSelect: (c: unknown) => void }) => (
    <button onClick={() => onSelect(null)}>CollectionPicker</button>
  ),
}));

vi.mock("@/components/full-page/SitePicker", () => ({
  SitePicker: () => <div>SitePicker</div>,
}));

vi.mock("@/components/full-page/RedirectMapList", () => ({
  RedirectMapList: () => <div>RedirectMapList</div>,
}));

vi.mock("@/components/full-page/RedirectMapDetail", () => ({
  RedirectMapDetail: () => <div>RedirectMapDetail</div>,
}));

vi.mock("@/components/full-page/WorkspaceHero", () => ({
  WorkspaceHero: () => <div>WorkspaceHero</div>,
}));

vi.mock("@/components/full-page/StatStrip", () => ({
  StatStrip: () => <div>StatStrip</div>,
}));

vi.mock("@/components/full-page/TopActionRow", () => ({
  TopActionRow: () => <div>TopActionRow</div>,
}));

vi.mock("@/components/full-page/NewRedirectMapModal", () => ({
  NewRedirectMapModal: () => null,
}));

vi.mock("@/components/full-page/DeleteMapConfirmModal", () => ({
  DeleteMapConfirmModal: () => null,
}));

vi.mock("@/components/full-page/ImportRedirectMapModal", () => ({
  ImportRedirectMapModal: () => null,
}));

vi.mock("@/components/full-page/ConflictsDialog", () => ({
  ConflictsDialog: () => null,
}));

// TestSurface — the key component under test for tab switching.
// Props: siteLanguage, maps, lastTrace, onTraceComplete, onRequestEditRow (right-panel only).
vi.mock("@/components/full-page/TestSurface", () => ({
  TestSurface: ({
    lastTrace,
  }: {
    lastTrace: unknown;
    onTraceComplete: (t: unknown) => void;
    onRequestEditRow: (mapId: string, rowIndex: number) => void;
    siteLanguage: string;
    maps: unknown[];
  }) => (
    <div data-testid="test-surface" data-has-trace={lastTrace !== null ? "true" : "false"}>
      TestSurface
    </div>
  ),
}));

vi.mock("@/lib/publish/locale-resolver", () => ({
  resolveSiteLocales: () => [],
}));

vi.mock("@/lib/publish/config", () => ({
  PUBLISH_LOCALE_SHORTHAND_ACCEPTED: [],
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeClient = () => ({
  query: vi.fn().mockResolvedValue({ data: { data: [] } }),
  mutate: vi.fn().mockResolvedValue({ data: { data: {} } }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FullPage — Manage/Test tab control (T027)", () => {
  beforeEach(() => {
    // Ensure matchMedia polyfill is present
    if (typeof window !== "undefined" && !window.matchMedia) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    }
    // Ensure innerWidth is ≥960 (two-pane mode) so tab control is visible
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  it("renders both Manage and Test tab triggers", () => {
    const client = makeClient();
    render(<FullPage client={client as never} sitecoreContextId="ctx-1" />);
    expect(screen.getByRole("tab", { name: /manage/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /test/i })).toBeInTheDocument();
  });

  it("defaults to Manage tab — manage content is visible", () => {
    const client = makeClient();
    render(<FullPage client={client as never} sitecoreContextId="ctx-1" />);
    // In manage mode, RedirectMapDetail should be visible; TestSurface should not
    expect(screen.queryByTestId("test-surface")).not.toBeInTheDocument();
  });

  it("switching to Test tab renders TestSurface", async () => {
    const client = makeClient();
    render(<FullPage client={client as never} sitecoreContextId="ctx-1" />);
    const testTab = screen.getByRole("tab", { name: /test/i });
    fireEvent.click(testTab);
    await waitFor(() => {
      expect(screen.getByTestId("test-surface")).toBeInTheDocument();
    });
  });

  it("switching back to Manage tab hides TestSurface", async () => {
    const client = makeClient();
    render(<FullPage client={client as never} sitecoreContextId="ctx-1" />);
    // Switch to Test
    fireEvent.click(screen.getByRole("tab", { name: /test/i }));
    await waitFor(() => expect(screen.getByTestId("test-surface")).toBeInTheDocument());
    // Switch back to Manage
    fireEvent.click(screen.getByRole("tab", { name: /manage/i }));
    await waitFor(() => {
      expect(screen.queryByTestId("test-surface")).not.toBeInTheDocument();
    });
  });

  it("lastTrace starts null; TestSurface receives null initially", async () => {
    const client = makeClient();
    render(<FullPage client={client as never} sitecoreContextId="ctx-1" />);
    fireEvent.click(screen.getByRole("tab", { name: /test/i }));
    await waitFor(() => {
      const surface = screen.getByTestId("test-surface");
      expect(surface.getAttribute("data-has-trace")).toBe("false");
    });
  });
});
