/**
 * T018 — lib/url-mapping/serialize.ts RED tests
 *
 * ADR-0008: encodeURIComponent(source)=encodeURIComponent(target) joined by &.
 * Uppercase hex normalization on output.
 *
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import { serializeMappings } from '@/lib/url-mapping/serialize';

describe('serializeMappings', () => {
  it('returns empty string for empty array', () => {
    expect(serializeMappings([])).toBe('');
  });

  it('serializes a single mapping to source=target form', () => {
    expect(serializeMappings([{ source: '/foo', target: '/bar' }])).toBe('%2Ffoo=%2Fbar');
  });

  it('joins multiple mappings with &', () => {
    const result = serializeMappings([
      { source: '/foo', target: '/bar' },
      { source: '/baz', target: '/qux' },
    ]);
    expect(result).toBe('%2Ffoo=%2Fbar&%2Fbaz=%2Fqux');
  });

  it('produces uppercase hex encoding (ADR-0008 contract)', () => {
    // / encodes to %2F (uppercase F)
    const result = serializeMappings([{ source: '/test', target: '/newTest' }]);
    expect(result).toBe('%2Ftest=%2FnewTest');
    // confirm no lowercase a-f hex letters in percent sequences
    expect(result).not.toMatch(/%[0-9A-Fa-f][a-f]/);
    expect(result).not.toMatch(/%[a-f][0-9A-Fa-f]/);
  });

  it('encodes & in source/target as %26 (uppercase)', () => {
    const result = serializeMappings([{ source: '/a&b', target: '/c&d' }]);
    expect(result).toBe('%2Fa%26b=%2Fc%26d');
  });

  it('encodes = in source/target as %3D (uppercase)', () => {
    const result = serializeMappings([{ source: '/page?key=val', target: '/target' }]);
    expect(result).toBe('%2Fpage%3Fkey%3Dval=%2Ftarget');
  });

  it('preserves operator-defined order of mappings', () => {
    const mappings = [
      { source: '/a', target: '/z' },
      { source: '/b', target: '/y' },
      { source: '/c', target: '/x' },
    ];
    const result = serializeMappings(mappings);
    const parts = result.split('&');
    expect(parts[0]).toBe('%2Fa=%2Fz');
    expect(parts[1]).toBe('%2Fb=%2Fy');
    expect(parts[2]).toBe('%2Fc=%2Fx');
  });

  it('produces a re-serialized canonical form from captured value', () => {
    // Captured: "%2ftest=%2FnewTest" — parse then re-serialize gives uppercase canonical form
    const mappings = [
      { source: '/test', target: '/newTest' },
      { source: '/hello', target: '/world' },
    ];
    const result = serializeMappings(mappings);
    expect(result).toBe('%2Ftest=%2FnewTest&%2Fhello=%2Fworld');
  });
});
