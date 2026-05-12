/**
 * Tests for RegexBanner (T022 RED-1, RED-2, RED-3)
 *
 * Verifies: persistent, non-dismissible, correct role, correct copy.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RegexBanner } from "@/components/context-panel/RegexBanner";

describe("RegexBanner", () => {
  it("RED-1: renders with role=note and matching copy", () => {
    render(<RegexBanner />);
    const banner = screen.getByRole("note");
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain(
      "Direct-string matches only — regex pattern matches are not yet covered."
    );
  });

  it("RED-2: non-dismissible — no close button inside or near banner", () => {
    render(<RegexBanner />);
    // No button with dismiss/close semantics anywhere
    const buttons = document.querySelectorAll("button");
    expect(buttons.length).toBe(0);
  });

  it("RED-3: does not use role=alert (calm tone, not urgent)", () => {
    render(<RegexBanner />);
    const alertEl = document.querySelector('[role="alert"]');
    expect(alertEl).toBeNull();
  });

  it("RED-4: banner copy contains the regex limitation phrase", () => {
    render(<RegexBanner />);
    expect(screen.getByText(/regex pattern matches are not yet covered/i)).toBeDefined();
  });
});
