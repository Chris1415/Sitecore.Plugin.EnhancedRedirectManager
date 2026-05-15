/**
 * T009 — UI tests for GradientText utility component.
 *
 * TDD: Written BEFORE gradient-text.tsx exists (RED → GREEN sequence).
 * Component under test: site/components/ui/gradient-text.tsx
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GradientText } from './gradient-text';

describe('GradientText', () => {
  it('renders as <span> by default', () => {
    const { container } = render(<GradientText>Hello</GradientText>);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('applies elev-hero-text--gradient class', () => {
    const { container } = render(<GradientText>Hello</GradientText>);
    const el = container.querySelector('span');
    expect(el?.className).toContain('elev-hero-text--gradient');
  });

  it('renders children text content', () => {
    const { container } = render(<GradientText>Gradient Headline</GradientText>);
    expect(container.textContent).toBe('Gradient Headline');
  });

  it('renders as h1 when as="h1"', () => {
    const { container } = render(<GradientText as="h1">Heading</GradientText>);
    expect(container.querySelector('h1')).toBeInTheDocument();
    expect(container.querySelector('span')).not.toBeInTheDocument();
  });

  it('renders as h2 when as="h2"', () => {
    const { container } = render(<GradientText as="h2">Heading</GradientText>);
    expect(container.querySelector('h2')).toBeInTheDocument();
  });

  it('merges additional className prop', () => {
    const { container } = render(
      <GradientText className="extra-class">Text</GradientText>
    );
    const el = container.querySelector('span');
    expect(el?.className).toContain('elev-hero-text--gradient');
    expect(el?.className).toContain('extra-class');
  });
});
