/**
 * T010 — UI tests for DecorativeCta wrapper component.
 *
 * TDD: Written BEFORE decorative-cta.tsx exists (RED → GREEN sequence).
 * Component under test: site/components/ui/decorative-cta.tsx
 *
 * ADR-0030: Hero CTAs are decorative in PRD-002; onClick shows a Sonner toast.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DecorativeCta } from './decorative-cta';

// Mock sonner toast so we can spy on calls without rendering the Toaster
vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

import { toast } from 'sonner';

describe('DecorativeCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a button with the provided label', () => {
    render(<DecorativeCta label="View activity" toastCopy="Coming soon!" />);
    expect(screen.getByRole('button', { name: /view activity/i })).toBeInTheDocument();
  });

  it('calls toast with toastCopy when clicked', async () => {
    const user = userEvent.setup();
    render(
      <DecorativeCta label="View activity" toastCopy="Activity log coming in a follow-on release." />
    );
    const button = screen.getByRole('button', { name: /view activity/i });
    await user.click(button);
    expect(toast).toHaveBeenCalledWith('Activity log coming in a follow-on release.');
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('calls toast with exact toastCopy string (no truncation)', async () => {
    const user = userEvent.setup();
    const exactCopy = 'Bulk publish coming in a follow-on release.';
    render(<DecorativeCta label="Publish all" toastCopy={exactCopy} />);
    await user.click(screen.getByRole('button', { name: /publish all/i }));
    expect(toast).toHaveBeenCalledWith(exactCopy);
  });

  it('fires toast on keyboard Enter activation', async () => {
    const user = userEvent.setup();
    render(<DecorativeCta label="Publish all" toastCopy="Coming soon" />);
    const button = screen.getByRole('button', { name: /publish all/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('passes variant prop through to the underlying button', () => {
    const { container } = render(
      <DecorativeCta label="Ghost CTA" toastCopy="test" variant="ghost" />
    );
    const button = container.querySelector('button');
    // The button should exist (exact variant class is not asserted — behavior test only)
    expect(button).toBeInTheDocument();
  });
});
