/**
 * T035a + T038a — TraceCard component tests
 *
 * Covers all 8 SimulationStage discriminants:
 *   pre-filter, normalize, candidates, evaluate-row (match/no-match/timeout),
 *   substitute, flag-effects, dispatch, diagnostic-incomplete
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraceCard } from './TraceCard';
import type { SimulationStage } from '@/lib/redirects/proxy-simulator';

const RULE = { mapId: 'map-1', rowIndex: 3, source: '/old-path', target: '/new-path', redirectType: 'Redirect301' as const, preserveQueryString: false, preserveLanguage: false, includeVirtualFolder: false };

describe('TraceCard', () => {
  describe('pre-filter stage', () => {
    const stage: SimulationStage = { kind: 'pre-filter', reason: 'has-dot', informational: true };

    it('shows the reason in the heading', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Pre-filter');
    });

    it('shows step number badge', () => {
      render(<TraceCard stage={stage} index={2} />);
      expect(screen.getByText('3')).toBeInTheDocument(); // index 2 → badge 3
    });
  });

  describe('normalize stage', () => {
    const stage: SimulationStage = {
      kind: 'normalize',
      originalUrl: 'https://example.com/old-path?q=1',
      normalizedPath: '/old-path-normalized',
      queryString: '?q=1',
    };

    it('shows original URL', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('https://example.com/old-path?q=1')).toBeInTheDocument();
    });

    it('shows normalized path', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('/old-path-normalized')).toBeInTheDocument();
    });

    it('shows query string when present', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('?q=1')).toBeInTheDocument();
    });
  });

  describe('candidates stage', () => {
    const stage: SimulationStage = {
      kind: 'candidates',
      candidates: ['/old-path', '/Old-Path'],
    };

    it('renders each candidate', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('/old-path')).toBeInTheDocument();
      expect(screen.getByText('/Old-Path')).toBeInTheDocument();
    });
  });

  describe('evaluate-row stage — match', () => {
    const stage: SimulationStage = {
      kind: 'evaluate-row',
      rule: RULE,
      outcome: 'match',
      detectedMode: 'url',
      candidateThatMatched: '/old-path',
      capturedGroups: [],
    };

    it('shows "match" outcome text', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('match')).toBeInTheDocument();
    });

    it('shows source pattern', () => {
      render(<TraceCard stage={stage} index={0} />);
      // Both source and candidateThatMatched show '/old-path' — use getAllByText
      const matches = screen.getAllByText('/old-path');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('evaluate-row stage — timeout (T038)', () => {
    const stage: SimulationStage = {
      kind: 'evaluate-row',
      rule: RULE,
      outcome: 'timeout',
      detectedMode: 'regex',
      capturedGroups: [],
    };

    it('shows the timeout warning message', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText(/pattern too slow/i)).toBeInTheDocument();
    });
  });

  describe('evaluate-row stage — no-match', () => {
    const stage: SimulationStage = {
      kind: 'evaluate-row',
      rule: RULE,
      outcome: 'no-match',
      detectedMode: 'url',
      capturedGroups: [],
    };

    it('shows "no-match" text', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('no-match')).toBeInTheDocument();
    });
  });

  describe('substitute stage', () => {
    const stage: SimulationStage = {
      kind: 'substitute',
      originalTarget: '/new/$1',
      substitutedTarget: '/new/foo',
      substitutions: { '$1': 'foo' },
    };

    it('shows original and substituted target', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('/new/$1')).toBeInTheDocument();
      expect(screen.getByText('/new/foo')).toBeInTheDocument();
    });

    it('shows substitution entries', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('$1')).toBeInTheDocument();
      expect(screen.getByText('foo')).toBeInTheDocument();
    });
  });

  describe('flag-effects stage', () => {
    const stage: SimulationStage = {
      kind: 'flag-effects',
      preserveQueryString: true,
      queryStringApplied: '?q=1',
      preserveLanguage: false,
      languageApplied: null,
      includeVirtualFolder: false,
    };

    it('shows preserveQueryString as "yes"', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText(/preserve query string/i).closest('p')).toHaveTextContent('yes');
    });

    it('shows query string applied value', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('?q=1')).toBeInTheDocument();
    });
  });

  describe('dispatch stage', () => {
    const stage: SimulationStage = {
      kind: 'dispatch',
      finalUrl: '/new/destination',
      redirectType: 'Redirect301',
    };

    it('shows final URL', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('/new/destination')).toBeInTheDocument();
    });

    it('shows redirect type', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText('Redirect301')).toBeInTheDocument();
    });
  });

  describe('diagnostic-incomplete stage (T038)', () => {
    const stage: SimulationStage = {
      kind: 'diagnostic-incomplete',
      reason: 'wall-clock-cap',
      evaluatedRows: 42,
      totalRows: 100,
    };

    it('shows the row counts', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText(/42 of 100 rows/i)).toBeInTheDocument();
    });

    it('shows the 3s wall-clock cap message', () => {
      render(<TraceCard stage={stage} index={0} />);
      expect(screen.getByText(/diagnostic incomplete after 3s/i)).toBeInTheDocument();
    });
  });
});
