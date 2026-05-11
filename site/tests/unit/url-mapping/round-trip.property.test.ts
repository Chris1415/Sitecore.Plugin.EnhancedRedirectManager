/**
 * T060 — UrlMapping round-trip property tests (ADR-0008)
 *
 * Invariant: parse(serialize(parse(x))) === parse(x) for any x produced by the serializer.
 * Also: serialize(parse(x)) produces canonical-uppercase form for any logically-equivalent input.
 *
 * Uses fast-check for property-based testing.
 * Default: 100 runs per property (fast-check default numRuns).
 *
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseUrlMapping } from '@/lib/url-mapping/parse';
import { serializeMappings } from '@/lib/url-mapping/serialize';
import type { Mapping } from '@/lib/domain/types';

// Arbitrary that generates valid URL path segments (no & or = unencoded, no empty strings)
// We use printable ASCII chars excluding & = % (these require encoding) to keep paths readable.
// We do NOT use fc.webPath because we need cross-version compatibility.
const validPathChar = fc.stringMatching(/^[a-zA-Z0-9\-._~:@!$'()*+,;\/]+$/);
const nonEmptyPath = validPathChar.filter(s => s.length > 0);

const mappingArb: fc.Arbitrary<Mapping> = fc.record({
  source: nonEmptyPath,
  target: nonEmptyPath,
});

const mappingsArb: fc.Arbitrary<Mapping[]> = fc.array(mappingArb, { minLength: 1, maxLength: 50 });

describe('UrlMapping round-trip property invariants', () => {
  it('parse(serialize(mappings)).mappings deep-equals original mappings', () => {
    fc.assert(
      fc.property(mappingsArb, (mappings) => {
        const serialized = serializeMappings(mappings);
        const { mappings: parsed } = parseUrlMapping(serialized);
        expect(parsed).toEqual(mappings);
      }),
      { numRuns: 100 },
    );
  });

  it('parse(serialize(parse(x).mappings)) === parse(x) — idempotent round-trip', () => {
    fc.assert(
      fc.property(mappingsArb, (mappings) => {
        const step1 = serializeMappings(mappings);
        const { mappings: parsed1 } = parseUrlMapping(step1);
        const step2 = serializeMappings(parsed1);
        const { mappings: parsed2 } = parseUrlMapping(step2);
        expect(parsed2).toEqual(parsed1);
      }),
      { numRuns: 100 },
    );
  });

  it('serialize produces canonical uppercase hex (no lowercase a-f in %xx sequences)', () => {
    fc.assert(
      fc.property(mappingsArb, (mappings) => {
        const serialized = serializeMappings(mappings);
        // Check that no percent-encoded sequences contain lowercase a-f letters.
        // Digits (0-9) are case-neutral, so we only check for lowercase letters.
        expect(serialized).not.toMatch(/%[0-9A-Fa-f][a-f]/);
        expect(serialized).not.toMatch(/%[a-f][0-9A-Fa-f]/);
      }),
      { numRuns: 100 },
    );
  });

  it('order preservation: parse preserves the order of pairs from serialize', () => {
    fc.assert(
      fc.property(mappingsArb, (mappings) => {
        const serialized = serializeMappings(mappings);
        const { mappings: parsed } = parseUrlMapping(serialized);
        expect(parsed.map(m => m.source)).toEqual(mappings.map(m => m.source));
      }),
      { numRuns: 100 },
    );
  });

  it('empty list serializes to empty string and back to empty list', () => {
    const serialized = serializeMappings([]);
    expect(serialized).toBe('');
    const { mappings, warnings } = parseUrlMapping(serialized);
    expect(mappings).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('single pair round-trips correctly', () => {
    fc.assert(
      fc.property(mappingArb, (mapping) => {
        const serialized = serializeMappings([mapping]);
        const { mappings, warnings } = parseUrlMapping(serialized);
        expect(warnings).toEqual([]);
        expect(mappings).toEqual([mapping]);
      }),
      { numRuns: 100 },
    );
  });

  it('large list (100 pairs) round-trips correctly', () => {
    const largeMappings: Mapping[] = Array.from({ length: 100 }, (_, i) => ({
      source: `/source-${i}`,
      target: `/target-${i}`,
    }));
    const serialized = serializeMappings(largeMappings);
    const { mappings, warnings } = parseUrlMapping(serialized);
    expect(warnings).toEqual([]);
    expect(mappings).toEqual(largeMappings);
  });

  it('paths containing = must round-trip (= encoded as %3D)', () => {
    const mappings: Mapping[] = [{ source: '/page?a=1&b=2', target: '/result' }];
    const serialized = serializeMappings(mappings);
    const { mappings: parsed } = parseUrlMapping(serialized);
    expect(parsed).toEqual(mappings);
  });

  it('paths containing & must round-trip (& encoded as %26)', () => {
    const mappings: Mapping[] = [{ source: '/a&b', target: '/c&d' }];
    const serialized = serializeMappings(mappings);
    const { mappings: parsed } = parseUrlMapping(serialized);
    expect(parsed).toEqual(mappings);
  });

  it('captured fixture value %2ftest=%2FnewTest&%2fhello=%2Fworld decodes correctly', () => {
    const raw = '%2ftest=%2FnewTest&%2fhello=%2Fworld';
    const { mappings, warnings } = parseUrlMapping(raw);
    expect(warnings).toEqual([]);
    expect(mappings).toEqual([
      { source: '/test', target: '/newTest' },
      { source: '/hello', target: '/world' },
    ]);
    // Re-serializes to canonical uppercase form
    const reserialized = serializeMappings(mappings);
    expect(reserialized).toBe('%2Ftest=%2FnewTest&%2Fhello=%2Fworld');
  });

  it('mixed-case encoding inputs normalize to the same logical pairs', () => {
    // %2f and %2F both decode to /
    const lower = '%2ftest=%2fvalue';
    const upper = '%2Ftest=%2Fvalue';
    const { mappings: mLower } = parseUrlMapping(lower);
    const { mappings: mUpper } = parseUrlMapping(upper);
    expect(mLower).toEqual(mUpper);
  });
});
