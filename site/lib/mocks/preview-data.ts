/**
 * T005 — Mock-data architecture: PREVIEW_DATA + PREVIEW_DATA_ACTIVE.
 *
 * ADR-0025: Single canonical swap point for mock → real data migration.
 * The follow-on data-plumbing PRD flips PREVIEW_DATA_ACTIVE flags per surface
 * as live data sources land. Components never know if data is real or mock.
 *
 * Discipline:
 * - All source/target paths are en-only (no /de/..., /fr/..., etc.)
 * - recentlyShipped.rows[].type uses real RedirectType values only
 *   (Redirect301 | Redirect302 | ServerTransfer — ADR-0003 / prd-minimal-002)
 * - Zero # hex literals — all color references via CSS custom properties
 * - No "Active" / "Draft" status labels anywhere
 * - Pure TypeScript constants — zero SDK dependencies, zero runtime side-effects
 *
 * Source: site/lib/domain/types.ts:17 (RedirectType enum — 3 values only)
 */

import type { RedirectType } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Per-surface "preview data is in use" flags.
// Set to false per surface when the follow-on data-plumbing PRD wires real
// data. The PreviewDataBanner component reads these flags at render time.
// ---------------------------------------------------------------------------

export const PREVIEW_DATA_ACTIVE = {
  fullPage: true,
  dashboardWidget: true,
  contextPanel: false, // CP has no mocks; banner not rendered
} as const;

// ---------------------------------------------------------------------------
// Typed mock constants.
// Shapes match the eventual real-data shapes so consumers swap source, not type.
// ---------------------------------------------------------------------------

export const PREVIEW_DATA = {
  heroStat: {
    value: 12428,
    label: 'Active redirects',
    delta: { value: 412, period: 'this week' },
  },

  sparkline: {
    points: [42, 38, 40, 32, 34, 28, 30, 22, 26, 18, 24, 14, 18, 10, 16, 8, 12, 6, 10, 4, 8],
    accent: 'var(--primary)',
  },

  topDestinations: [
    { name: '/products', count: 3184, barFillPct: 100 },
    { name: '/black-friday', count: 2247, barFillPct: 71 },
    { name: '/campaigns/promo', count: 1602, barFillPct: 50 },
    { name: '/sale', count: 1011, barFillPct: 32 },
    { name: '/early-access', count: 638, barFillPct: 20 },
    { name: '/newsletter-signup', count: 412, barFillPct: 13 },
  ] satisfies Array<{ name: string; count: number; barFillPct: number }>,

  recentlyShipped: {
    countLast24h: 4,
    rows: [
      { source: '/old/products', target: '/products', type: 'Redirect301' as RedirectType },
      { source: '/promo-legacy', target: '/campaigns/promo', type: 'Redirect301' as RedirectType },
      { source: '/black-friday-2024', target: '/black-friday', type: 'Redirect301' as RedirectType },
      { source: '/summer-sale-old', target: '/sale', type: 'Redirect301' as RedirectType },
    ],
  },

  dashboardFooter: {
    lastPublishedAgo: '14 m ago',
    author: 'Anna',
    healthStatus: 'all healthy',
  },

  fullPageStatStrip: {
    mappingsTotal: { value: 68, sub: '+4 today' },
    redirect301Count: { value: 64, sub: '94% of total' },
    redirect302Count: { value: 4, sub: 'expire in 21d' },
    conflictsCount: { value: 0, sub: 'all clear' },
  },

  fullPageHero: {
    activeMapsCount: 8,
    healthStatus: 'all healthy',
    lastPublishAgo: '14 minutes ago',
    lastPublishBy: 'Anna',
    conflictsResolved: true,
  },
} as const;
