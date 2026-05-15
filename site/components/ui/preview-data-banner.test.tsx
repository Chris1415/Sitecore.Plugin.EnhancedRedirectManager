/**
 * T008 — UI tests for PreviewDataBanner component.
 *
 * TDD: Written BEFORE preview-data-banner.tsx exists (RED → GREEN sequence).
 *
 * Depends on: T005 (PREVIEW_DATA_ACTIVE flags used by the component)
 * Component under test: site/components/ui/preview-data-banner.tsx
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreviewDataBanner } from './preview-data-banner';

describe('PreviewDataBanner', () => {
  describe('when surface is "fullPage" (PREVIEW_DATA_ACTIVE.fullPage === true)', () => {
    it('renders banner DOM', () => {
      render(<PreviewDataBanner surface="fullPage" />);
      // The banner must be present in the document
      expect(document.body.innerHTML).not.toBe('');
    });

    it('banner text contains "preview data"', () => {
      render(<PreviewDataBanner surface="fullPage" />);
      expect(screen.getByText(/preview data/i)).toBeInTheDocument();
    });

    it('renders with role="alert" (from @blok/alert primitive)', () => {
      render(<PreviewDataBanner surface="fullPage" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('carries data-preview-banner attribute with the surface name', () => {
      const { container } = render(<PreviewDataBanner surface="fullPage" />);
      const banner = container.querySelector('[data-preview-banner="fullPage"]');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('when surface is "dashboardWidget" (PREVIEW_DATA_ACTIVE.dashboardWidget === true)', () => {
    it('renders banner DOM', () => {
      render(<PreviewDataBanner surface="dashboardWidget" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('banner text contains "preview data"', () => {
      render(<PreviewDataBanner surface="dashboardWidget" />);
      expect(screen.getByText(/preview data/i)).toBeInTheDocument();
    });

    it('carries data-preview-banner="dashboardWidget"', () => {
      const { container } = render(<PreviewDataBanner surface="dashboardWidget" />);
      const banner = container.querySelector('[data-preview-banner="dashboardWidget"]');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('when surface is "contextPanel" (PREVIEW_DATA_ACTIVE.contextPanel === false)', () => {
    it('returns null (no DOM output)', () => {
      const { container } = render(<PreviewDataBanner surface="contextPanel" />);
      expect(container.firstChild).toBeNull();
    });

    it('does not render a role="alert" element', () => {
      render(<PreviewDataBanner surface="contextPanel" />);
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('copy content', () => {
    it('contains "wired up in a follow-on release"', () => {
      render(<PreviewDataBanner surface="fullPage" />);
      expect(screen.getByText(/wired up in a follow-on release/i)).toBeInTheDocument();
    });

    it('does not contain emoji characters (no ⓘ)', () => {
      const { container } = render(<PreviewDataBanner surface="fullPage" />);
      expect(container.innerHTML).not.toContain('ⓘ');
      // Unicode emoji codepoints that should not appear
      expect(container.innerHTML).not.toContain('\u24D8'); // ⓘ
    });
  });
});
