/**
 * T035a + T038a — ResultCard component tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultCard } from './ResultCard';
import type { SimulationResult } from '@/lib/redirects/proxy-simulator';

const BASE_RULE = {
  mapId: 'map-1',
  rowIndex: 5,
  source: '/old-path',
  target: '/new-path',
  redirectType: 'Redirect301' as const,
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
};

describe('ResultCard — matched', () => {
  const result: SimulationResult = {
    matched: true,
    rule: BASE_RULE,
    finalUrl: '/new-path',
    redirectType: 'Redirect301',
  };

  it('shows "Match found" heading', () => {
    render(<ResultCard result={result} onRowClick={() => {}} />);
    expect(screen.getByRole('heading', { name: /match found/i })).toBeInTheDocument();
  });

  it('shows "301" HTTP code chip for Redirect301', () => {
    render(<ResultCard result={result} onRowClick={() => {}} />);
    expect(screen.getByText('301')).toBeInTheDocument();
  });

  it('shows "302" HTTP code chip for Redirect302', () => {
    const r302: SimulationResult = { ...result, redirectType: 'Redirect302' };
    render(<ResultCard result={r302} onRowClick={() => {}} />);
    expect(screen.getByText('302')).toBeInTheDocument();
  });

  it('shows "SrvXfr" chip for ServerTransfer', () => {
    const rSrv: SimulationResult = { ...result, redirectType: 'ServerTransfer' };
    render(<ResultCard result={rSrv} onRowClick={() => {}} />);
    expect(screen.getByText('SrvXfr')).toBeInTheDocument();
  });

  it('shows the final URL', () => {
    render(<ResultCard result={result} onRowClick={() => {}} />);
    expect(screen.getByText('/new-path')).toBeInTheDocument();
  });

  it('calls onRowClick with mapId and rowIndex when "Open this rule" button is clicked', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<ResultCard result={result} onRowClick={onRowClick} />);
    await user.click(screen.getByRole('button', { name: /open this rule/i }));
    expect(onRowClick).toHaveBeenCalledWith('map-1', 5);
  });
});

describe('ResultCard — unmatched', () => {
  const makeResult = (rowCount: number): SimulationResult => ({
    matched: false,
    candidatesTried: ['/old-path'],
    rowsConsidered: Array.from({ length: rowCount }, (_, i) => ({
      ...BASE_RULE,
      rowIndex: i,
      source: `/pattern-${i}`,
    })),
    rowsConsideredTotal: rowCount,
  });

  it('shows "No match" heading', () => {
    render(<ResultCard result={makeResult(0)} onRowClick={() => {}} />);
    expect(screen.getByRole('heading', { name: /no match/i })).toBeInTheDocument();
  });

  it('shows "Add a rule for this URL" button', () => {
    render(<ResultCard result={makeResult(0)} onRowClick={() => {}} />);
    expect(screen.getByRole('button', { name: /add a rule/i })).toBeInTheDocument();
  });

  it('calls onRowClick("", -1) when "Add a rule" is clicked (deep-link sentinel)', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<ResultCard result={makeResult(0)} onRowClick={onRowClick} />);
    await user.click(screen.getByRole('button', { name: /add a rule/i }));
    expect(onRowClick).toHaveBeenCalledWith('', -1);
  });

  it('shows first 5 rows when there are more than 5', () => {
    render(<ResultCard result={makeResult(10)} onRowClick={() => {}} />);
    // First 5 should be visible (pattern-0 through pattern-4)
    expect(screen.getByText('/pattern-0')).toBeInTheDocument();
    expect(screen.getByText('/pattern-4')).toBeInTheDocument();
    // pattern-5 should NOT be visible initially
    expect(screen.queryByText('/pattern-5')).not.toBeInTheDocument();
  });

  it('shows "more rows considered" expand button when rows > 5', () => {
    render(<ResultCard result={makeResult(10)} onRowClick={() => {}} />);
    expect(screen.getByRole('button', { name: /more rows considered/i })).toBeInTheDocument();
  });

  it('expands to show more rows when expand button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResultCard result={makeResult(10)} onRowClick={() => {}} />);
    await user.click(screen.getByRole('button', { name: /more rows considered/i }));
    // After expansion, pattern-5 should be visible
    expect(screen.getByText('/pattern-5')).toBeInTheDocument();
  });

  it('does not show expand button when 5 or fewer rows', () => {
    render(<ResultCard result={makeResult(5)} onRowClick={() => {}} />);
    expect(screen.queryByRole('button', { name: /more rows/i })).not.toBeInTheDocument();
  });

  it('load-more button disappears after all rows are revealed (regression: infinite loop fix M2)', async () => {
    // Pre-fix: rowsConsidered is capped at 20 by the simulator but rowsConsideredTotal
    // may be larger. If hiddenCount used `total - showCount` instead of
    // `rows.length - showCount`, the button would never disappear (chunkLimit grows
    // but rows.length stays at 20, so hiddenCount stays positive forever).
    const user = userEvent.setup();

    // Simulate: 25 evaluated rows total, 20 in rowsConsidered (simulator cap)
    const rows20 = Array.from({ length: 20 }, (_, i) => ({
      ...BASE_RULE,
      rowIndex: i,
      source: `/pattern-${i}`,
    }));
    const result: SimulationResult = {
      matched: false,
      candidatesTried: ['/url'],
      rowsConsidered: rows20,
      rowsConsideredTotal: 25,
    };

    render(<ResultCard result={result} onRowClick={() => {}} />);

    // Initial: 5 visible, expand button present
    expect(screen.getByRole('button', { name: /more rows considered/i })).toBeInTheDocument();

    // Click expand: reveals up to 20 rows (all of rowsConsidered)
    await user.click(screen.getByRole('button', { name: /more rows considered/i }));

    // All 20 rows are now shown — no "Load more" button should remain
    expect(screen.queryByRole('button', { name: /\+ \d+ more rows$/i })).not.toBeInTheDocument();
  });
});
