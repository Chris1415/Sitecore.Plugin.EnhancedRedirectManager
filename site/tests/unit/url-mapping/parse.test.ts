/**
 * T017 — lib/url-mapping/parse.ts RED tests
 *
 * ADR-0008: URL-encoded source=target pairs joined by &.
 * Split on &, find FIRST =, decodeURIComponent source and target.
 * Malformed segments produce warnings, not throws.
 *
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import { parseUrlMapping } from '@/lib/url-mapping/parse';

describe('parseUrlMapping', () => {
  it('returns empty mappings for empty string', () => {
    const { mappings, warnings } = parseUrlMapping('');
    expect(mappings).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('parses a single source=target pair', () => {
    const { mappings, warnings } = parseUrlMapping('%2Ffoo=%2Fbar');
    expect(mappings).toEqual([{ source: '/foo', target: '/bar' }]);
    expect(warnings).toEqual([]);
  });

  it('parses multiple pairs joined by &', () => {
    const { mappings, warnings } = parseUrlMapping('%2Ffoo=%2Fbar&%2Fbaz=%2Fqux');
    expect(mappings).toEqual([
      { source: '/foo', target: '/bar' },
      { source: '/baz', target: '/qux' },
    ]);
    expect(warnings).toEqual([]);
  });

  it('handles the captured fixture value: %2ftest=%2FnewTest&%2fhello=%2Fworld', () => {
    // Mixed-case encoding: lowercase %2f in source, uppercase %2F in target
    const { mappings, warnings } = parseUrlMapping('%2ftest=%2FnewTest&%2fhello=%2Fworld');
    expect(mappings).toEqual([
      { source: '/test', target: '/newTest' },
      { source: '/hello', target: '/world' },
    ]);
    expect(warnings).toEqual([]);
  });

  it('uses the FIRST = as separator (source may contain = when %3D-encoded)', () => {
    // source contains a literal = encoded as %3D; target is plain
    const { mappings } = parseUrlMapping('%2Fpage%3Fkey%3Dval=%2Ftarget');
    expect(mappings).toEqual([{ source: '/page?key=val', target: '/target' }]);
  });

  it('warns and skips a segment with no = separator', () => {
    const { mappings, warnings } = parseUrlMapping('malformed-no-equals');
    expect(mappings).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('malformed-no-equals');
  });

  it('skips a segment where BOTH source and target decode to empty strings', () => {
    // "=" decodes source="" target="" — should be skipped silently
    const { mappings, warnings } = parseUrlMapping('=');
    expect(mappings).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('preserves order of pairs', () => {
    const raw = '%2Fa=%2Fz&%2Fb=%2Fy&%2Fc=%2Fx';
    const { mappings } = parseUrlMapping(raw);
    expect(mappings.map(m => m.source)).toEqual(['/a', '/b', '/c']);
  });

  it('handles a pair where only source is non-empty (target empty)', () => {
    const { mappings } = parseUrlMapping('%2Ffoo=');
    // source="/foo", target="" — not both empty, so NOT skipped
    expect(mappings).toEqual([{ source: '/foo', target: '' }]);
  });

  it('handles a pair where only target is non-empty (source empty)', () => {
    const { mappings } = parseUrlMapping('=%2Fbar');
    // source="", target="/bar" — not both empty, so NOT skipped
    expect(mappings).toEqual([{ source: '', target: '/bar' }]);
  });

  it('decodes percent-encoded ampersands in source/target correctly', () => {
    // %26 is an encoded & — must survive round-trip
    const { mappings } = parseUrlMapping('%2Fa%26b=%2Fc%26d');
    expect(mappings).toEqual([{ source: '/a&b', target: '/c&d' }]);
  });

  it('warns on malformed segment but continues parsing rest', () => {
    const { mappings, warnings } = parseUrlMapping('bad-segment&%2Fok=%2Fgood');
    expect(mappings).toEqual([{ source: '/ok', target: '/good' }]);
    expect(warnings).toHaveLength(1);
  });
});
