/**
 * T016 — sitecore-date.ts RED tests
 *
 * Sitecore compact date format: yyyyMMddTHHmmssZ
 * e.g. "20260509T183802Z"
 *
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import { parseSitecoreCompactDate } from '@/lib/domain/sitecore-date';

describe('parseSitecoreCompactDate', () => {
  it('parses a known-good captured value "20260509T183802Z"', () => {
    const result = parseSitecoreCompactDate('20260509T183802Z');
    expect(result).not.toBeNull();
    const d = result!;
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(4); // May = 4 (0-indexed)
    expect(d.getUTCDate()).toBe(9);
    expect(d.getUTCHours()).toBe(18);
    expect(d.getUTCMinutes()).toBe(38);
    expect(d.getUTCSeconds()).toBe(2);
  });

  it('returns null for empty string', () => {
    expect(parseSitecoreCompactDate('')).toBeNull();
  });

  it('returns null for a string missing the T separator', () => {
    expect(parseSitecoreCompactDate('20260509183802Z')).toBeNull();
  });

  it('returns null for a string missing the Z suffix', () => {
    expect(parseSitecoreCompactDate('20260509T183802')).toBeNull();
  });

  it('returns null for an invalid date string with wrong length', () => {
    expect(parseSitecoreCompactDate('2026-05-09T18:38:02Z')).toBeNull();
  });

  it('returns null for completely malformed input', () => {
    expect(parseSitecoreCompactDate('not-a-date')).toBeNull();
  });

  it('returns null for a string with correct format but invalid date values', () => {
    // month 13 does not exist
    expect(parseSitecoreCompactDate('20261399T000000Z')).toBeNull();
  });

  it('parses midnight correctly', () => {
    const result = parseSitecoreCompactDate('20260101T000000Z');
    expect(result).not.toBeNull();
    expect(result!.getUTCFullYear()).toBe(2026);
    expect(result!.getUTCMonth()).toBe(0);
    expect(result!.getUTCDate()).toBe(1);
    expect(result!.getUTCHours()).toBe(0);
    expect(result!.getUTCMinutes()).toBe(0);
    expect(result!.getUTCSeconds()).toBe(0);
  });
});
