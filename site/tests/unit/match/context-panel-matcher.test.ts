/**
 * T020 — lib/match/context-panel-matcher.ts RED tests
 *
 * Exact-string matcher for Context Panel (ADR-0005).
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import { matchPageRedirects } from '@/lib/match/context-panel-matcher';
import type { RedirectMapItem } from '@/lib/domain/types';

const makeMap = (id: string, mappings: Array<{ source: string; target: string }>): RedirectMapItem => ({
  id,
  name: `Map ${id}`,
  redirectType: 'ServerTransfer',
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: '2026-05-09T18:38:02Z',
  mappings,
});

describe('matchPageRedirects', () => {
  it('matches when page URL equals a mapping source', () => {
    const map = makeMap('1', [{ source: '/about', target: '/about-us' }]);
    const result = matchPageRedirects('/about', [map]);
    expect(result).toHaveLength(1);
    expect(result[0].map).toBe(map);
    expect(result[0].matchedMappings).toEqual([{ source: '/about', target: '/about-us' }]);
  });

  it('matches when page URL equals a mapping target', () => {
    const map = makeMap('1', [{ source: '/old', target: '/current-page' }]);
    const result = matchPageRedirects('/current-page', [map]);
    expect(result).toHaveLength(1);
    expect(result[0].matchedMappings).toEqual([{ source: '/old', target: '/current-page' }]);
  });

  it('matches when page URL is both source and target (in different rows)', () => {
    const map = makeMap('1', [
      { source: '/page', target: '/other' },
      { source: '/other2', target: '/page' },
    ]);
    const result = matchPageRedirects('/page', [map]);
    expect(result).toHaveLength(1);
    expect(result[0].matchedMappings).toHaveLength(2);
  });

  it('returns empty array when no mappings match', () => {
    const map = makeMap('1', [{ source: '/foo', target: '/bar' }]);
    const result = matchPageRedirects('/baz', [map]);
    expect(result).toEqual([]);
  });

  it('filters out maps with no matching rows', () => {
    const matchingMap = makeMap('1', [{ source: '/target-page', target: '/other' }]);
    const nonMatchingMap = makeMap('2', [{ source: '/foo', target: '/bar' }]);
    const result = matchPageRedirects('/target-page', [matchingMap, nonMatchingMap]);
    expect(result).toHaveLength(1);
    expect(result[0].map).toBe(matchingMap);
  });

  it('returns only the matched rows, not all rows in the map', () => {
    const map = makeMap('1', [
      { source: '/match', target: '/other' },
      { source: '/no-match', target: '/also-no-match' },
    ]);
    const result = matchPageRedirects('/match', [map]);
    expect(result[0].matchedMappings).toHaveLength(1);
    expect(result[0].matchedMappings[0].source).toBe('/match');
  });

  it('handles multiple maps with overlapping matches correctly', () => {
    const map1 = makeMap('1', [{ source: '/shared', target: '/x' }]);
    const map2 = makeMap('2', [
      { source: '/shared', target: '/y' },
      { source: '/other', target: '/z' },
    ]);
    const result = matchPageRedirects('/shared', [map1, map2]);
    expect(result).toHaveLength(2);
    const map2Result = result.find(r => r.map.id === '2')!;
    // Only the /shared row should match, not /other -> /z
    expect(map2Result.matchedMappings).toHaveLength(1);
    expect(map2Result.matchedMappings[0].source).toBe('/shared');
  });

  it('returns empty array when items array is empty', () => {
    const result = matchPageRedirects('/page', []);
    expect(result).toEqual([]);
  });

  it('does NOT match partial strings (exact match only — ADR-0005)', () => {
    const map = makeMap('1', [{ source: '/page', target: '/other' }]);
    // "/pages" is NOT the same as "/page"
    const result = matchPageRedirects('/pages', [map]);
    expect(result).toEqual([]);
  });

  it('does NOT match case-insensitively (exact byte match — ADR-0005)', () => {
    const map = makeMap('1', [{ source: '/Page', target: '/other' }]);
    const result = matchPageRedirects('/page', [map]);
    expect(result).toEqual([]);
  });

  it('handles empty page URL without crashing', () => {
    const map = makeMap('1', [{ source: '', target: '/other' }]);
    // source is empty, pageUrl is empty — they match (exact equality)
    const result = matchPageRedirects('', [map]);
    expect(result).toHaveLength(1);
  });
});
