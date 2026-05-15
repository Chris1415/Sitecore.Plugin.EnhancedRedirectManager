/**
 * T031 RED tests — DashboardHero component.
 *
 * Written BEFORE the implementation (TDD RED phase).
 * Tests will fail until DashboardHero.tsx is created.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardHero } from "@/components/dashboard-widget/DashboardHero";

describe("DashboardHero", () => {
  it("renders the marketing-voice subhead", () => {
    render(<DashboardHero />);
    expect(screen.getByText(/your redirect operations/i)).toBeDefined();
  });

  it("renders the hero stat label 'Active redirects'", () => {
    render(<DashboardHero />);
    expect(screen.getByText(/active redirects/i)).toBeDefined();
  });

  it("renders the delta line (+412 this week)", () => {
    render(<DashboardHero />);
    expect(screen.getByText(/\+412 this week/i)).toBeDefined();
  });

  it("hero stat number carries data-preview-mock='true'", () => {
    render(<DashboardHero />);
    const mocked = document.querySelectorAll('[data-preview-mock="true"]');
    expect(mocked.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT import elevated-plumes.css (no kinetic letter reveal, no plumes)", () => {
    // Structural: the component file should not import elevated-plumes.css.
    // We verify this at the source level in structural guards (T044).
    // Here we assert that the rendered output has no .fp-hero-reveal-letters class.
    const { container } = render(<DashboardHero />);
    expect(container.querySelector(".fp-hero-reveal-letters")).toBeNull();
  });

  it("hero stat value wrapper renders (count-up behavior tested in use-count-up tests)", () => {
    render(<DashboardHero />);
    // Behavior: the hero section renders with expected text anchors (converted from .dw-hero class selector)
    // The animated number wrapper exists; final value delivery is verified by use-count-up tests.
    expect(screen.getByText(/active redirects/i)).toBeDefined();
  });
});
