/**
 * T — UI tests for HoverLiftCard wrapper component.
 *
 * TDD: Written BEFORE hover-lift-card.tsx exists (RED → GREEN sequence).
 * Component under test: site/components/ui/hover-lift-card.tsx
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { HoverLiftCard } from './hover-lift-card';

describe('HoverLiftCard', () => {
  it('renders children content', () => {
    const { container } = render(
      <HoverLiftCard>
        <span>Card content</span>
      </HoverLiftCard>
    );
    expect(container.textContent).toContain('Card content');
  });

  it('applies elev-card class to the wrapper', () => {
    const { container } = render(
      <HoverLiftCard>Content</HoverLiftCard>
    );
    // The outermost element must carry the elev-card class
    const card = container.firstChild as HTMLElement;
    expect(card?.className).toContain('elev-card');
  });

  it('merges additional className', () => {
    const { container } = render(
      <HoverLiftCard className="my-custom-class">Content</HoverLiftCard>
    );
    const card = container.firstChild as HTMLElement;
    expect(card?.className).toContain('elev-card');
    expect(card?.className).toContain('my-custom-class');
  });
});
