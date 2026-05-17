/**
 * T024a / Tranche 3b — WorkspaceHero component tests.
 *
 * Tests 1–3: original Tranche 1/2 (Publish Site button + dialog)
 * Tests 4–5: Tranche 3b (polling label + resume toast)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceHero } from "./WorkspaceHero";
import * as trackerModule from "@/lib/publish/use-publish-job-tracker";
import * as resumeModule from "@/lib/publish/use-publish-resume";

// Hoisted mocks — factories must not reference out-of-scope variables.
const { toastLoading, toastSuccess, toastError, toastWarning } = vi.hoisted(() => ({
  toastLoading: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/lib/publish/publish-service", () => ({
  publish: vi.fn().mockResolvedValue({ kind: "queued", jobId: "test-job-id-full", jobIdShort: "test-job" }),
}));
vi.mock("@/lib/publish/transport-server", () => ({
  callPublishViaServerRoute: vi.fn(),
}));
vi.mock("@/lib/publish/toast-adapter", () => ({
  createSonnerToastAdapter: vi.fn(() => ({
    requested: vi.fn().mockReturnValue("toast-id"),
    queued: vi.fn(),
    failed: vi.fn(),
  })),
}));
vi.mock("@/lib/publish/in-flight-store", () => ({
  setInFlightJob: vi.fn(),
  clearInFlightJob: vi.fn(),
  getInFlightJob: vi.fn().mockReturnValue(null),
}));
vi.mock("@/lib/publish/use-publish-job-tracker", () => ({
  usePublishJobTracker: vi.fn().mockReturnValue({ kind: "idle" }),
}));
vi.mock("@/lib/publish/use-publish-resume", () => ({
  usePublishResume: vi.fn().mockReturnValue({ jobId: null, kickedOffAt: null, resumedFrom: null }),
}));
vi.mock("sonner", () => ({
  toast: {
    loading: toastLoading,
    success: toastSuccess,
    error: toastError,
    warning: toastWarning,
  },
}));

const defaultProps = {
  siteName: "Solo Website",
  collectionName: "my-collection",
  siteInternalName: "solo-website",
  siteLocales: ["en-US"],
  maps: [],
  onRefresh: vi.fn(),
  onSelectMap: vi.fn(),
};

describe("WorkspaceHero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trackerModule.usePublishJobTracker).mockReturnValue({ kind: "idle" });
    vi.mocked(resumeModule.usePublishResume).mockReturnValue({
      jobId: null,
      kickedOffAt: null,
      resumedFrom: null,
    });
  });

  it("does NOT render 'Publish all' (old label must be absent — AC-P1.1)", () => {
    render(<WorkspaceHero {...defaultProps} />);
    expect(screen.queryByText("Publish all")).toBeNull();
  });

  it("renders 'Publish Site' button (new label — AC-P1.1)", () => {
    render(<WorkspaceHero {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Publish Site" })).toBeTruthy();
  });

  it("clicking 'Publish Site' opens the confirmation dialog with heading 'Republish site'", () => {
    render(<WorkspaceHero {...defaultProps} />);
    const btn = screen.getByRole("button", { name: "Publish Site" });
    fireEvent.click(btn);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Republish site" })).toBeTruthy();
  });

  it("while polling → 'Publishing… Xs' text visible and Publish Site button is disabled", () => {
    vi.mocked(trackerModule.usePublishJobTracker).mockReturnValue({
      kind: "polling",
      jobId: "test-job-id-full",
      status: "Running",
      statistics: null,
      elapsedMs: 7000,
    });

    render(<WorkspaceHero {...defaultProps} />);

    const btn = screen.getByRole("button", { name: "Publish Site" });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Publishing…/)).toBeTruthy();
  });

  it("on mount with resume result → shows resume toast via sonner", async () => {
    vi.mocked(resumeModule.usePublishResume).mockReturnValue({
      jobId: "job-resumed",
      kickedOffAt: "2026-05-16T09:00:00.000Z",
      resumedFrom: "localStorage",
    });

    render(<WorkspaceHero {...defaultProps} />);

    await waitFor(() => {
      expect(toastLoading).toHaveBeenCalledWith(
        expect.stringContaining("Found in-progress site publish"),
        expect.objectContaining({ id: "resume-job-resumed" }),
      );
    });
  });
});
