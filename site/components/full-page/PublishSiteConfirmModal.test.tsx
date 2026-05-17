/**
 * T024a / T024b — PublishSiteConfirmModal component tests.
 *
 * Tests 4–10 from task breakdown § 10 T024a.
 * Covers: renders site info / locale count / mode / source / Cancel / Confirm / isPublishing disabled state.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublishSiteConfirmModal } from "./PublishSiteConfirmModal";

describe("PublishSiteConfirmModal", () => {
  const defaultProps = {
    open: true,
    siteDisplayName: "Solo Website",
    localeCount: 2,
    isPublishing: false,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
  };

  it("renders Site display name (AC-P1.2a)", () => {
    render(<PublishSiteConfirmModal {...defaultProps} />);
    expect(screen.getByText(/Site: Solo Website/)).toBeTruthy();
  });

  it("renders locale count (AC-P1.2b)", () => {
    render(<PublishSiteConfirmModal {...defaultProps} />);
    expect(screen.getByText(/Locales: 2 being published/)).toBeTruthy();
  });

  it("renders Mode: Republish (full) (AC-P1.2c)", () => {
    render(<PublishSiteConfirmModal {...defaultProps} />);
    expect(screen.getByText(/Mode: Republish \(full\)/)).toBeTruthy();
  });

  it("renders Source: Redirect Manager (AC-P1.2d)", () => {
    render(<PublishSiteConfirmModal {...defaultProps} />);
    expect(screen.getByText(/Source: Redirect Manager/)).toBeTruthy();
  });

  it("clicking Cancel calls onOpenChange(false) and does NOT call onConfirm (AC-P1.3)", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <PublishSiteConfirmModal
        {...defaultProps}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );
    const cancelBtn = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("clicking 'Republish site' calls onConfirm (AC-P1.3)", () => {
    const onConfirm = vi.fn();
    render(<PublishSiteConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    const confirmBtn = screen.getByRole("button", { name: "Republish site" });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("isPublishing=true → Republish site button is disabled (AC-P1.7)", () => {
    render(<PublishSiteConfirmModal {...defaultProps} isPublishing={true} />);
    const confirmBtn = screen.getByRole("button", { name: "Republish site" });
    expect(confirmBtn).toBeDisabled();
  });
});
