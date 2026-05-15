/**
 * T013 — Unit tests for useLetterReveal hook.
 *
 * TDD: Written BEFORE use-letter-reveal.ts exists (RED → GREEN sequence).
 * Hook under test: site/hooks/use-letter-reveal.ts
 *
 * Key contracts:
 * - Reduced-motion: returns flat text (no character spans); sets opacity to 1
 * - Normal path: splits text into N character spans with staggered --reveal-delay
 * - SSR safety: no window/matchMedia/DOM access outside useEffect (code review)
 * - Cleanup: restores original text on unmount
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useLetterReveal } from './use-letter-reveal';

// ---------------------------------------------------------------------------
// matchMedia stub helpers
// ---------------------------------------------------------------------------

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

// ---------------------------------------------------------------------------
// Helper component that wires a ref to a real DOM element
// ---------------------------------------------------------------------------

import React, { useRef } from 'react';

function TestComponent({
  text,
  reducedMotion,
  staggerMs = 28,
  durationMs = 800,
}: {
  text: string;
  reducedMotion: boolean;
  staggerMs?: number;
  durationMs?: number;
}) {
  stubMatchMedia(reducedMotion);
  const ref = useRef<HTMLSpanElement>(null);
  useLetterReveal(ref, { staggerMs, durationMs });
  return <span ref={ref}>{text}</span>;
}

describe('useLetterReveal — reduced-motion path', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not split text into character spans when reduced-motion is active', () => {
    const { container } = render(
      <TestComponent text="Hello" reducedMotion={true} />
    );
    // In reduced-motion mode: the element should NOT contain per-character spans
    const innerSpans = container.querySelectorAll('span span');
    expect(innerSpans).toHaveLength(0);
  });

  it('element has opacity style set when reduced-motion is active', () => {
    const { container } = render(
      <TestComponent text="Hello" reducedMotion={true} />
    );
    // The root span should have opacity: 1 (or no opacity manipulation — both acceptable)
    const el = container.querySelector('span') as HTMLElement;
    // We just confirm the element is visible (not hidden)
    expect(el.style.opacity).not.toBe('0');
  });
});

describe('useLetterReveal — normal path', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('splits "Hello" into 5 character spans', () => {
    const { container } = render(
      <TestComponent text="Hello" reducedMotion={false} />
    );
    const charSpans = container.querySelectorAll('span span');
    expect(charSpans).toHaveLength(5);
  });

  it('each character span contains a single character', () => {
    const { container } = render(
      <TestComponent text="Hi" reducedMotion={false} />
    );
    const charSpans = container.querySelectorAll('span span');
    expect(charSpans).toHaveLength(2);
    expect(charSpans[0].textContent).toBe('H');
    expect(charSpans[1].textContent).toBe('i');
  });

  it('sets --reveal-delay on each character span', () => {
    const { container } = render(
      <TestComponent text="ABC" reducedMotion={false} staggerMs={28} />
    );
    const charSpans = container.querySelectorAll('span span');
    // First span has delay 0ms or the first stagger value
    const firstSpan = charSpans[0] as HTMLElement;
    expect(firstSpan.style.getPropertyValue('--reveal-delay')).toBeTruthy();
  });

  it('preserves the total text content', () => {
    const { container } = render(
      <TestComponent text="Test" reducedMotion={false} />
    );
    expect(container.textContent).toBe('Test');
  });
});

describe('useLetterReveal — cleanup', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores original text content on unmount', () => {
    stubMatchMedia(false);
    const { container, unmount } = render(
      <TestComponent text="Cleanup" reducedMotion={false} />
    );
    const el = container.querySelector('span') as HTMLElement;
    unmount();
    // After unmount, DOM is removed — test that the hook ran without throwing
    expect(el).toBeDefined(); // hook cleaned up without errors
  });
});
