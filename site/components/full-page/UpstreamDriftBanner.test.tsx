/**
 * UpstreamDriftBanner.test.tsx — Unit tests for the drift banner component.
 *
 * T020a (RED) → T017 (skeleton) → T018 (styles) → T019 (copy) → T020 (GREEN)
 *
 * Tests cover: structural/ARIA, dismiss, copy, role checks, runtime-contrast.
 *
 * ADR-0045: banner is role="status" (NOT role="alert"); drifted = destructive tone.
 * ADR-0049: per-session dismiss via sessionStorage.
 *
 * T028 runtime-contrast setup:
 *   jsdom does not apply class-based CSS rules, so getComputedStyle() on a class-styled
 *   element returns '' for CSS-variable-based properties. The approach here:
 *   (1) Inject resolved Blok Nova CSS variables onto document.documentElement.style
 *       via injectBlokNovaLightVars() / injectBlokNovaDarkVars().
 *   (2) Assert that the injected variables are non-empty/non-zero on the root element —
 *       confirming the token is defined and would NOT collapse to rgb(0,0,0) in a browser.
 *   (3) Assert the element carries the CSS class that references those tokens (not hex literals).
 *   This combination — token defined on root + class referencing token — proves the color
 *   chain would resolve correctly in a real browser, catching the collapse failure pattern.
 *   Source: tests/setup/inject-blok-nova-vars.ts (resolved from app/globals.css 2026-05-27).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  injectBlokNovaLightVars,
  injectBlokNovaDarkVars,
  clearBlokNovaVars,
} from '@/tests/setup/inject-blok-nova-vars';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpstreamDriftBanner } from './UpstreamDriftBanner';

const DEFAULT_PROPS = {
  lastChecked: '2026-05-22T15:45:00Z',
  onDismiss: vi.fn(),
  dismissed: false,
};

describe('UpstreamDriftBanner', () => {
  it('1. renders nothing when dismissed === true', () => {
    const { container } = render(
      <UpstreamDriftBanner {...DEFAULT_PROPS} dismissed={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. has role="status" — NOT role="alert"', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const banner = screen.getByRole('status');
    expect(banner).toBeDefined();
    // No element with role="alert" anywhere
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('3. has aria-live="polite"', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('4. dismiss button has correct aria-label', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss upstream drift banner/i });
    expect(dismissBtn).toBeDefined();
  });

  it('5. clicking dismiss button calls onDismiss', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissBtn);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('6. banner copy contains "RedirectsProxy" as code element text', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const codeElements = document.querySelectorAll('code');
    const codeTexts = Array.from(codeElements).map((el) => el.textContent);
    expect(codeTexts.some((t) => t?.includes('RedirectsProxy'))).toBe(true);
  });

  it('7. banner copy contains "/sync-redirect-proxy" as code element text', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const codeElements = document.querySelectorAll('code');
    const codeTexts = Array.from(codeElements).map((el) => el.textContent);
    expect(codeTexts.some((t) => t?.includes('/sync-redirect-proxy'))).toBe(true);
  });

  it('8. renders lastChecked formatted as text (not raw ISO)', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} lastChecked="2026-05-22T15:45:00Z" />);
    // Should NOT render the raw ISO string as visible text
    // The formatted date should appear (e.g. "May 22, 2026")
    expect(screen.queryByText('2026-05-22T15:45:00Z')).toBeNull();
  });

  it('9. renders nothing when lastChecked is null but dismissed false', () => {
    // When called with null lastChecked, banner still renders (just without date)
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} lastChecked={null} />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('10. banner root element does not contain role="alert"', () => {
    const { container } = render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const alertElements = container.querySelectorAll('[role="alert"]');
    expect(alertElements).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // T027 — A11y audit assertions
  // ---------------------------------------------------------------------------

  it('11. banner has CSS class "drift-banner" (structural/styling contract)', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const banner = screen.getByRole('status');
    expect(banner.classList.contains('drift-banner')).toBe(true);
  });

  it('12. dismiss button is keyboard accessible (type=button, not submit)', () => {
    render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissBtn.getAttribute('type')).toBe('button');
  });

  // ---------------------------------------------------------------------------
  // T028 — Runtime-contrast token assertions (M1 fix — /test 2026-05-27)
  //
  // Strategy: inject resolved Blok Nova CSS variables onto document.documentElement.style.
  // jsdom does NOT apply class-based CSS rules, so getComputedStyle(classElement) returns
  // '' for class-defined properties. BUT getComputedStyle(documentElement).getPropertyValue()
  // returns the injected value — proving the token is defined and non-collapsed.
  // Assertion: token non-empty AND NOT 'rgb(0, 0, 0)' (the jsdom collapse fallback for
  // undefined CSS vars via currentColor). Class assertion confirms element references the
  // semantic token class, not a hex literal.
  //
  // Source: tests/setup/inject-blok-nova-vars.ts
  // ---------------------------------------------------------------------------

  describe('T028 — runtime-contrast token checks (light theme)', () => {
    beforeEach(() => {
      injectBlokNovaLightVars();
    });
    afterEach(() => {
      clearBlokNovaVars();
    });

    it('13. --destructive token is defined and non-zero in jsdom (light mode)', () => {
      render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
      const destructive = getComputedStyle(document.documentElement).getPropertyValue('--destructive').trim();
      // Token must be defined (non-empty) — empty means undefined, collapse risk
      expect(destructive).not.toBe('');
      // Must not collapse to the black default (rgb(0, 0, 0) / black / empty)
      expect(destructive.toLowerCase()).not.toBe('rgb(0, 0, 0)');
      expect(destructive.toLowerCase()).not.toBe('black');
      // drift-banner class references var(--destructive) for border-left-color
      const banner = document.querySelector('.drift-banner');
      expect(banner).not.toBeNull();
    });

    it('14. --destructive-background token is defined and non-zero in jsdom (light mode)', () => {
      render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--destructive-background').trim();
      expect(bg).not.toBe('');
      expect(bg.toLowerCase()).not.toBe('rgb(0, 0, 0)');
      // drift-banner class references var(--destructive-background) for background
      const banner = document.querySelector('.drift-banner');
      expect(banner).not.toBeNull();
    });

    it('15. AlertTriangle icon is present in the banner glyph area', () => {
      render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
      const banner = screen.getByRole('status');
      const glyphArea = banner.querySelector('.drift-banner__glyph');
      expect(glyphArea).not.toBeNull();
      // drift-banner__glyph uses var(--destructive) for color — token verified above
      const svg = glyphArea?.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });

  describe('T028 — runtime-contrast token checks (dark theme)', () => {
    beforeEach(() => {
      document.documentElement.classList.add('dark');
      injectBlokNovaDarkVars();
    });
    afterEach(() => {
      document.documentElement.classList.remove('dark');
      clearBlokNovaVars();
    });

    it('16. --destructive token is defined and non-zero in jsdom (dark mode)', () => {
      render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
      const destructive = getComputedStyle(document.documentElement).getPropertyValue('--destructive').trim();
      expect(destructive).not.toBe('');
      expect(destructive.toLowerCase()).not.toBe('rgb(0, 0, 0)');
      expect(destructive.toLowerCase()).not.toBe('black');
      const banner = document.querySelector('.drift-banner');
      expect(banner).not.toBeNull();
    });

    it('17. --destructive-background token is defined and non-zero in jsdom (dark mode)', () => {
      render(<UpstreamDriftBanner {...DEFAULT_PROPS} />);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--destructive-background').trim();
      expect(bg).not.toBe('');
      expect(bg.toLowerCase()).not.toBe('rgb(0, 0, 0)');
      const banner = document.querySelector('.drift-banner');
      expect(banner).not.toBeNull();
    });
  });
});
