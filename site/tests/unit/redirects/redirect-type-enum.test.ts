/**
 * T021 — lib/redirects/redirect-type-enum.ts tests.
 *
 * Verified 2026-05-11 (Tranche 6a real-tenant write-capture):
 *   wire enum values are 'Redirect301' / 'Redirect302' / 'ServerTransfer'.
 *   'Redirect307' is rejected by the head-app resolver — removed from the UI.
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

  it('contains Redirect301 (verified real-tenant)', () => {
    expect(REDIRECT_TYPES).toContain('Redirect301');
  });

  it('contains Redirect302 (verified real-tenant)', () => {
    expect(REDIRECT_TYPES).toContain('Redirect302');
  });

  it('does NOT contain Redirect307 (rejected by head-app resolver)', () => {
    expect(REDIRECT_TYPES).not.toContain('Redirect307');
  });

  it('is array-like', () => {
    expect(Array.isArray(REDIRECT_TYPES)).toBe(true);
  });
});

describe('isValidRedirectType', () => {
  it('returns true for ServerTransfer', () => {
    expect(isValidRedirectType('ServerTransfer')).toBe(true);
  });

  it('returns true for Redirect301', () => {
    expect(isValidRedirectType('Redirect301')).toBe(true);
  });

  it('returns true for Redirect302', () => {
    expect(isValidRedirectType('Redirect302')).toBe(true);
  });

  it('returns FALSE for Redirect307 (removed from the valid set)', () => {
    expect(isValidRedirectType('Redirect307')).toBe(false);
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

  it('returns operator-friendly label for Redirect301', () => {
    const label = redirectTypeDisplayName('Redirect301');
    expect(label).toBe('301 Permanent');
  });

  it('returns operator-friendly label for Redirect302', () => {
    const label = redirectTypeDisplayName('Redirect302');
    expect(label).toBe('302 Found');
  });

  it('all enum values have non-empty display names', () => {
    for (const type of REDIRECT_TYPES) {
      const label = redirectTypeDisplayName(type);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
