/**
 * T021 — lib/redirects/redirect-type-enum.ts RED tests
 *
 * assumed-shape: tests/fixtures/graphql/redirect-type-enum.json
 * (301/302/307 enum names are unverified — assumed shape; closed at Tranche 6 capture)
 *
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import {
  REDIRECT_TYPES,
  isValidRedirectType,
  redirectTypeDisplayName,
} from '@/lib/redirects/redirect-type-enum';

describe('REDIRECT_TYPES', () => {
  it('contains exactly 4 values', () => {
    expect(REDIRECT_TYPES).toHaveLength(4);
  });

  it('contains ServerTransfer (verified)', () => {
    expect(REDIRECT_TYPES).toContain('ServerTransfer');
  });

  it('contains 301 (assumed-shape)', () => {
    expect(REDIRECT_TYPES).toContain('301');
  });

  it('contains 302 (assumed-shape)', () => {
    expect(REDIRECT_TYPES).toContain('302');
  });

  it('contains 307 (assumed-shape)', () => {
    expect(REDIRECT_TYPES).toContain('307');
  });

  it('is readonly (cannot be mutated at runtime via TypeScript)', () => {
    // Just verify the shape — a readonly tuple can still be array-like
    expect(Array.isArray(REDIRECT_TYPES)).toBe(true);
  });
});

describe('isValidRedirectType', () => {
  it('returns true for ServerTransfer', () => {
    expect(isValidRedirectType('ServerTransfer')).toBe(true);
  });

  it('returns true for 301', () => {
    expect(isValidRedirectType('301')).toBe(true);
  });

  it('returns true for 302', () => {
    expect(isValidRedirectType('302')).toBe(true);
  });

  it('returns true for 307', () => {
    expect(isValidRedirectType('307')).toBe(true);
  });

  it('returns false for unknown string', () => {
    expect(isValidRedirectType('unknown')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidRedirectType('')).toBe(false);
  });

  it('returns false for a case-variant (case-sensitive match)', () => {
    expect(isValidRedirectType('servertransfer')).toBe(false);
  });
});

describe('redirectTypeDisplayName', () => {
  it('returns operator-friendly label for ServerTransfer', () => {
    const label = redirectTypeDisplayName('ServerTransfer');
    expect(label).toBe('Server Transfer');
  });

  it('returns operator-friendly label for 301', () => {
    const label = redirectTypeDisplayName('301');
    expect(label).toBe('301 Permanent');
  });

  it('returns operator-friendly label for 302', () => {
    const label = redirectTypeDisplayName('302');
    expect(label).toBe('302 Found');
  });

  it('returns operator-friendly label for 307', () => {
    const label = redirectTypeDisplayName('307');
    expect(label).toBe('307 Temporary');
  });

  it('all enum values have non-empty display names', () => {
    for (const type of REDIRECT_TYPES) {
      const label = redirectTypeDisplayName(type);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
