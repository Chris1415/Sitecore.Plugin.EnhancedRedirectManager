/**
 * T021 — lib/redirects/redirect-type-enum.ts RED tests
 *
 * Real-tenant confirmed 2026-05-11: '307' is NOT a valid RedirectType on the
 * Redirect Map template (operator removed it from the user-facing list).
 * '301', '302', and 'ServerTransfer' only.
 *
 * '301'/'302' wire-enum names remain assumed pending Tranche 6 write capture (OQ-8).
 */

import { describe, it, expect } from 'vitest';
import {
  REDIRECT_TYPES,
  isValidRedirectType,
  redirectTypeDisplayName,
} from '@/lib/redirects/redirect-type-enum';

describe('REDIRECT_TYPES', () => {
  it('contains exactly 3 values (307 removed 2026-05-11)', () => {
    expect(REDIRECT_TYPES).toHaveLength(3);
  });

  it('contains ServerTransfer (verified real-tenant)', () => {
    expect(REDIRECT_TYPES).toContain('ServerTransfer');
  });

  it('contains 301 (assumed wire-enum name, OQ-8)', () => {
    expect(REDIRECT_TYPES).toContain('301');
  });

  it('contains 302 (assumed wire-enum name, OQ-8)', () => {
    expect(REDIRECT_TYPES).toContain('302');
  });

  it('does NOT contain 307 (invalid on the Redirect Map template)', () => {
    expect(REDIRECT_TYPES).not.toContain('307');
  });

  it('is array-like', () => {
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

  it('returns FALSE for 307 (removed from the valid set)', () => {
    expect(isValidRedirectType('307')).toBe(false);
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

  it('all enum values have non-empty display names', () => {
    for (const type of REDIRECT_TYPES) {
      const label = redirectTypeDisplayName(type);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
