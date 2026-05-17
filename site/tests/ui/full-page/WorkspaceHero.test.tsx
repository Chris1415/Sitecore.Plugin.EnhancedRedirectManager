/**
 * WorkspaceHero tests — slim real-data hero.
 *
 * Real data: maps prop drives the active-maps count and the Last-Modified
 * sub-line (sourced from the most-recently-updated map in the list).
 *
 * Tranche 3b: polling/resume hooks mocked to idle/null so these tests
 * don't trigger real fetch calls or timers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkspaceHero } from "@/components/full-page/WorkspaceHero";
import type { RedirectMapItem } from "@/lib/domain/types";

// Tranche 3b — mock hooks and collaborators to keep tests focused on hero display logic
const { trackerIdle, resumeNull } = vi.hoisted(() => ({
  trackerIdle: vi.fn().mockReturnValue({ kind: "idle" as const }),
  resumeNull: vi.fn().mockReturnValue({ jobId: null, kickedOffAt: null, resumedFrom: null }),
}));

vi.mock("@/lib/publish/use-publish-job-tracker", () => ({
  usePublishJobTracker: trackerIdle,
}));
vi.mock("@/lib/publish/use-publish-resume", () => ({
  usePublishResume: resumeNull,
}));
vi.mock("@/lib/publish/in-flight-store", () => ({
  setInFlightJob: vi.fn(),
  clearInFlightJob: vi.fn(),
  getInFlightJob: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/publish/publish-service", () => ({
  publish: vi.fn().mockResolvedValue({ kind: "queued", jobId: "test", jobIdShort: "test" }),
}));
vi.mock("@/lib/publish/transport-server", () => ({
  callPublishViaServerRoute: vi.fn(),
}));
vi.mock("@/lib/publish/toast-adapter", () => ({
  createSonnerToastAdapter: vi.fn(() => ({
    requested: vi.fn().mockReturnValue("t"),
    queued: vi.fn(),
    failed: vi.fn(),
  })),
}));
vi.mock("sonner", () => ({
  toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

function makeMap(
  id: string,
  updatedAt: string,
  updatedBy: string,
  mappingCount = 2,
): RedirectMapItem {
  return {
    id,
    name: `Map ${id}`,
    redirectType: "Redirect301",
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt,
    updatedBy,
    mappings: Array.from({ length: mappingCount }, (_, i) => ({
      source: `/s-${id}-${i}`,
      target: `/t-${id}-${i}`,
    })),
  };
}

describe("WorkspaceHero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trackerIdle.mockReturnValue({ kind: "idle" as const });
    resumeNull.mockReturnValue({ jobId: null, kickedOffAt: null, resumedFrom: null });
  });

  it("renders the eyebrow chip with site name when site is selected", () => {
    render(<WorkspaceHero siteName="MainSite" maps={[]} />);
    expect(screen.getByText(/Workspace/i)).toBeDefined();
    expect(screen.getByText(/MainSite/i)).toBeDefined();
  });

  it("renders 'pick a site' eyebrow when no site selected", () => {
    render(<WorkspaceHero siteName={null} maps={[]} />);
    expect(screen.getByText(/pick a site/i)).toBeDefined();
  });

  it("renders the active maps count in the headline (singular)", () => {
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[makeMap("m1", "20260515T120000Z", "Anna")]}
      />,
    );
    const headline = screen.getByRole("heading", { level: 2 });
    expect(headline.textContent).toMatch(/1 active map\./);
  });

  it("renders the active maps count in the headline (plural)", () => {
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[
          makeMap("m1", "20260515T120000Z", "Anna"),
          makeMap("m2", "20260515T130000Z", "Anna"),
        ]}
      />,
    );
    const headline = screen.getByRole("heading", { level: 2 });
    expect(headline.textContent).toMatch(/2 active maps\./);
  });

  it("renders the empty-state headline when site is picked but no maps", () => {
    render(<WorkspaceHero siteName="MainSite" maps={[]} />);
    const headline = screen.getByRole("heading", { level: 2 });
    expect(headline.textContent).toMatch(/no redirect maps yet/i);
  });

  it("renders 'pick a site to begin' headline when no site", () => {
    render(<WorkspaceHero siteName={null} maps={[]} />);
    const headline = screen.getByRole("heading", { level: 2 });
    expect(headline.textContent).toMatch(/pick a site to begin/i);
  });

  it("renders Last Modified line with editor name from the latest map", () => {
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[
          makeMap("m1", "20260514T100000Z", "Bob"),
          makeMap("m2", "20260515T120000Z", "Anna"),
        ]}
      />,
    );
    expect(screen.getByText(/Last modified.*by Anna/)).toBeDefined();
  });

  it("does not contain any 'languages' copy (FR-R11 guard)", () => {
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[makeMap("m1", "20260515T120000Z", "Anna")]}
      />,
    );
    expect(document.body.textContent).not.toMatch(/\blanguages\b/i);
  });

  it("renders all four CTAs: Refresh · View activity · Validate health · Publish Site (PRD-003 rename)", () => {
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[makeMap("m1", "20260515T120000Z", "Anna")]}
      />,
    );
    expect(screen.getByRole("button", { name: /refresh/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /view activity/i })).toBeDefined();
    expect(screen.getByText(/validate health/i)).toBeDefined();
    // PRD-003 AC-P1.1 — "Publish all" renamed to "Publish Site"
    expect(screen.queryByText(/publish all/i)).toBeNull();
    expect(screen.getByRole("button", { name: /publish site/i })).toBeDefined();
  });

  it("Refresh button disabled when there are no maps", () => {
    render(<WorkspaceHero siteName="MainSite" maps={[]} onRefresh={() => {}} />);
    const btn = screen.getByRole("button", { name: /refresh/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("Refresh button enabled and invokes onRefresh when maps present", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    let called = 0;
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[makeMap("m1", "20260515T120000Z", "Anna")]}
        onRefresh={() => {
          called += 1;
        }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(called).toBe(1);
  });

  it("does not render data-preview-mock attributes (data is real)", () => {
    const { container } = render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[makeMap("m1", "20260515T120000Z", "Anna")]}
      />,
    );
    expect(container.querySelector('[data-preview-mock="true"]')).toBeNull();
  });

  it("no raw #hex inline color styles (token discipline)", () => {
    render(
      <WorkspaceHero
        siteName="MainSite"
        maps={[makeMap("m1", "20260515T120000Z", "Anna")]}
      />,
    );
    const allElements = document.querySelectorAll("*");
    let hexFound = false;
    allElements.forEach((el) => {
      const style = (el as HTMLElement).getAttribute("style") ?? "";
      if (/#[0-9a-fA-F]{3,8}/.test(style)) hexFound = true;
    });
    expect(hexFound).toBe(false);
  });
});
