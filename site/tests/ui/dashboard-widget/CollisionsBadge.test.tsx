/**
 * CollisionsBadge tests.
 *
 * Two states: 0 → "no collisions" (success); >0 → "N collision(s)" (warning).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollisionsBadge } from "@/components/dashboard-widget/CollisionsBadge";

describe("CollisionsBadge", () => {
  it("renders 'no collisions' when collisionCount is 0", () => {
    render(<CollisionsBadge collisionCount={0} />);
    expect(screen.getByText(/^no collisions$/i)).toBeDefined();
  });

  it("renders '1 collision' for collisionCount=1 (singular)", () => {
    render(<CollisionsBadge collisionCount={1} />);
    expect(screen.getByText(/^1 collision$/)).toBeDefined();
  });

  it("renders 'N collisions' for collisionCount > 1 (plural)", () => {
    render(<CollisionsBadge collisionCount={4} />);
    expect(screen.getByText(/^4 collisions$/)).toBeDefined();
  });

  it("uses success styling when count is 0", () => {
    const { container } = render(<CollisionsBadge collisionCount={0} />);
    expect(container.querySelector(".elev-success-badge")).not.toBeNull();
    expect(container.querySelector(".elev-warning-badge")).toBeNull();
  });

  it("uses warning styling when collisions present", () => {
    const { container } = render(<CollisionsBadge collisionCount={2} />);
    expect(container.querySelector(".elev-warning-badge")).not.toBeNull();
    expect(container.querySelector(".elev-success-badge")).toBeNull();
  });

  it("renders an SVG glyph (NOT an emoji)", () => {
    const { container } = render(<CollisionsBadge collisionCount={1} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(document.body.textContent).not.toContain("\u26A0"); // ⚠
  });

  it("never carries data-preview-mock — data is real", () => {
    const { container } = render(<CollisionsBadge collisionCount={3} />);
    expect(container.querySelector('[data-preview-mock]')).toBeNull();
  });
});
