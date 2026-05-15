/**
 * T007 — Unit tests for PREVIEW_DATA shape + PREVIEW_DATA_ACTIVE flags.
 *
 * TDD: Written BEFORE preview-data.ts exists (RED → GREEN sequence).
 * Source: site/lib/mocks/preview-data.ts (self-referential shape assertion)
 *
 * Depends on: T005 (preview-data.ts makes these tests green)
 */

import { describe, it, expect } from 'vitest';
import { PREVIEW_DATA, PREVIEW_DATA_ACTIVE } from './preview-data';

describe('PREVIEW_DATA_ACTIVE flags', () => {
  it('fullPage flag is true', () => {
    expect(PREVIEW_DATA_ACTIVE.fullPage).toBe(true);
  });

  it('dashboardWidget flag is true', () => {
    expect(PREVIEW_DATA_ACTIVE.dashboardWidget).toBe(true);
  });

  it('contextPanel flag is false', () => {
    expect(PREVIEW_DATA_ACTIVE.contextPanel).toBe(false);
  });

  it('exports both PREVIEW_DATA and PREVIEW_DATA_ACTIVE as separate named exports', () => {
    expect(PREVIEW_DATA).toBeDefined();
    expect(PREVIEW_DATA_ACTIVE).toBeDefined();
  });
});

describe('PREVIEW_DATA.heroStat', () => {
  it('heroStat.value is a positive number', () => {
    expect(typeof PREVIEW_DATA.heroStat.value).toBe('number');
    expect(PREVIEW_DATA.heroStat.value).toBeGreaterThan(0);
  });

  it('heroStat.delta.value is a positive number', () => {
    expect(typeof PREVIEW_DATA.heroStat.delta.value).toBe('number');
    expect(PREVIEW_DATA.heroStat.delta.value).toBeGreaterThan(0);
  });

  it('heroStat.label is a non-empty string', () => {
    expect(typeof PREVIEW_DATA.heroStat.label).toBe('string');
    expect(PREVIEW_DATA.heroStat.label.length).toBeGreaterThan(0);
  });
});

describe('PREVIEW_DATA.sparkline', () => {
  it('has 21 data points', () => {
    expect(PREVIEW_DATA.sparkline.points).toHaveLength(21);
  });

  it('all points are positive numbers', () => {
    for (const point of PREVIEW_DATA.sparkline.points) {
      expect(typeof point).toBe('number');
      expect(point).toBeGreaterThanOrEqual(0);
    }
  });

  it('accent is a CSS variable reference', () => {
    expect(PREVIEW_DATA.sparkline.accent).toContain('var(--');
  });
});

describe('PREVIEW_DATA.topDestinations', () => {
  const EN_ONLY_PATH = /^\/[a-z0-9\-\/]+$/;

  it('has exactly 6 rows (operator polish 2026-05-15)', () => {
    expect(PREVIEW_DATA.topDestinations).toHaveLength(6);
  });

  it('all name paths are en-only (no locale prefix)', () => {
    for (const row of PREVIEW_DATA.topDestinations) {
      expect(row.name).toMatch(EN_ONLY_PATH);
      // must not contain a locale prefix pattern like /de/ or /fr/
      expect(row.name).not.toMatch(/\/[a-z]{2}\//);
    }
  });

  it('all counts are positive numbers', () => {
    for (const row of PREVIEW_DATA.topDestinations) {
      expect(typeof row.count).toBe('number');
      expect(row.count).toBeGreaterThan(0);
    }
  });

  it('all barFillPct are between 0 and 100', () => {
    for (const row of PREVIEW_DATA.topDestinations) {
      expect(row.barFillPct).toBeGreaterThanOrEqual(0);
      expect(row.barFillPct).toBeLessThanOrEqual(100);
    }
  });
});

describe('PREVIEW_DATA.recentlyShipped', () => {
  const VALID_REDIRECT_TYPES = ['Redirect301', 'Redirect302', 'ServerTransfer'] as const;
  const EN_ONLY_PATH = /^\/[a-z0-9\-\/]+$/;

  it('rows count matches countLast24h (4 — operator polish 2026-05-15)', () => {
    expect(PREVIEW_DATA.recentlyShipped.rows).toHaveLength(
      PREVIEW_DATA.recentlyShipped.countLast24h,
    );
  });

  it('all row.type values are valid RedirectType enum values', () => {
    for (const row of PREVIEW_DATA.recentlyShipped.rows) {
      expect(VALID_REDIRECT_TYPES).toContain(row.type);
    }
  });

  it('all row.source paths are en-only', () => {
    for (const row of PREVIEW_DATA.recentlyShipped.rows) {
      expect(row.source).toMatch(EN_ONLY_PATH);
      expect(row.source).not.toMatch(/\/[a-z]{2}\//);
    }
  });

  it('all row.target paths are en-only', () => {
    for (const row of PREVIEW_DATA.recentlyShipped.rows) {
      expect(row.target).toMatch(EN_ONLY_PATH);
      expect(row.target).not.toMatch(/\/[a-z]{2}\//);
    }
  });

  it('countLast24h is a non-negative number', () => {
    expect(typeof PREVIEW_DATA.recentlyShipped.countLast24h).toBe('number');
    expect(PREVIEW_DATA.recentlyShipped.countLast24h).toBeGreaterThanOrEqual(0);
  });
});

describe('PREVIEW_DATA.dashboardFooter', () => {
  it('has lastPublishedAgo as a non-empty string', () => {
    expect(typeof PREVIEW_DATA.dashboardFooter.lastPublishedAgo).toBe('string');
    expect(PREVIEW_DATA.dashboardFooter.lastPublishedAgo.length).toBeGreaterThan(0);
  });

  it('has author as a non-empty string', () => {
    expect(typeof PREVIEW_DATA.dashboardFooter.author).toBe('string');
    expect(PREVIEW_DATA.dashboardFooter.author.length).toBeGreaterThan(0);
  });

  it('has healthStatus as a non-empty string', () => {
    expect(typeof PREVIEW_DATA.dashboardFooter.healthStatus).toBe('string');
    expect(PREVIEW_DATA.dashboardFooter.healthStatus.length).toBeGreaterThan(0);
  });
});

describe('PREVIEW_DATA.fullPageStatStrip', () => {
  const REQUIRED_KEYS = ['mappingsTotal', 'redirect301Count', 'redirect302Count', 'conflictsCount'] as const;

  it('has all 4 required tile keys', () => {
    for (const key of REQUIRED_KEYS) {
      expect(PREVIEW_DATA.fullPageStatStrip).toHaveProperty(key);
    }
  });

  it('each tile has value: number and sub: string', () => {
    for (const key of REQUIRED_KEYS) {
      const tile = PREVIEW_DATA.fullPageStatStrip[key];
      expect(typeof tile.value).toBe('number');
      expect(typeof tile.sub).toBe('string');
    }
  });
});

describe('PREVIEW_DATA.fullPageHero', () => {
  it('has activeMapsCount as a positive number', () => {
    expect(typeof PREVIEW_DATA.fullPageHero.activeMapsCount).toBe('number');
    expect(PREVIEW_DATA.fullPageHero.activeMapsCount).toBeGreaterThan(0);
  });

  it('has lastPublishAgo as a non-empty string', () => {
    expect(typeof PREVIEW_DATA.fullPageHero.lastPublishAgo).toBe('string');
    expect(PREVIEW_DATA.fullPageHero.lastPublishAgo.length).toBeGreaterThan(0);
  });

  it('has lastPublishBy as a non-empty string', () => {
    expect(typeof PREVIEW_DATA.fullPageHero.lastPublishBy).toBe('string');
    expect(PREVIEW_DATA.fullPageHero.lastPublishBy.length).toBeGreaterThan(0);
  });
});

describe('no Active/Draft TYPE values in PREVIEW_DATA', () => {
  // Assert that no redirect-type fields use the forbidden status label strings.
  // Note: the word "active" may appear in other contexts (e.g., "Active redirects"
  // as a label string) — that is acceptable. What must NOT appear is the legacy
  // status type value used as a redirect type discriminator.

  it('recentlyShipped rows do not use legacy status-type string as type field', () => {
    for (const row of PREVIEW_DATA.recentlyShipped.rows) {
      // type must only be Redirect301, Redirect302, or ServerTransfer
      expect(['Redirect301', 'Redirect302', 'ServerTransfer']).toContain(row.type);
    }
  });

  it('no entry contains a de/ locale prefix path', () => {
    const json = JSON.stringify(PREVIEW_DATA);
    expect(json).not.toMatch(/\/de\//);
    expect(json).not.toMatch(/\/fr\//);
    expect(json).not.toMatch(/\/es\//);
  });
});
