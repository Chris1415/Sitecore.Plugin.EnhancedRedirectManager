/**
 * T035a / T035 — EmptyState component tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  describe('when scope is not picked', () => {
    it('renders instructional heading', () => {
      render(<EmptyState scopePicked={false} firstRule={null} onTrySample={() => {}} />);
      expect(screen.getByText('Pick a scope to get started')).toBeInTheDocument();
    });

    it('does not render the Try a sample URL button', () => {
      render(<EmptyState scopePicked={false} firstRule="/old-path" onTrySample={() => {}} />);
      expect(screen.queryByRole('button', { name: /try a sample/i })).not.toBeInTheDocument();
    });
  });

  describe('when scope is picked', () => {
    it('renders ready heading', () => {
      render(<EmptyState scopePicked={true} firstRule={null} onTrySample={() => {}} />);
      expect(screen.getByText('Ready to test')).toBeInTheDocument();
    });

    it('does not render Try a sample URL button when firstRule is null', () => {
      render(<EmptyState scopePicked={true} firstRule={null} onTrySample={() => {}} />);
      expect(screen.queryByRole('button', { name: /try a sample/i })).not.toBeInTheDocument();
    });

    it('renders Try a sample URL button when firstRule is provided', () => {
      render(<EmptyState scopePicked={true} firstRule="/old-path" onTrySample={() => {}} />);
      expect(screen.getByRole('button', { name: /try a sample url/i })).toBeInTheDocument();
    });

    it('calls onTrySample with firstRule when Try a sample URL button is clicked', async () => {
      const user = userEvent.setup();
      const onTrySample = vi.fn();
      render(<EmptyState scopePicked={true} firstRule="/sample-path" onTrySample={onTrySample} />);
      await user.click(screen.getByRole('button', { name: /try a sample url/i }));
      expect(onTrySample).toHaveBeenCalledWith('/sample-path');
    });
  });
});
