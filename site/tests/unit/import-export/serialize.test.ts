/**
 * Tests for lib/import-export/serialize.ts (T047 Export support).
 */

import { describe, it, expect } from 'vitest';
import {
  buildExportPayload,
  serializeExportToJson,
  buildExportFilename,
} from '@/lib/import-export/serialize';
import { validateExport } from '@/lib/import-export/schema';
import type { RedirectMapItem } from '@/lib/domain/types';

const sampleMaps: RedirectMapItem[] = [
  {
    id: 'e39157f3a81f4692b05d178d48c836de',
    name: 'My Redirect Map',
    redirectType: 'ServerTransfer',
    preserveQueryString: true,
    preserveLanguage: false,
    includeVirtualFolder: true,
    updatedAt: '20260509T183802Z',
    mappings: [
      { source: '/old', target: '/new' },
      { source: '/legacy', target: '/modern' },
    ],
  },
  {
    id: 'aabbccdd11223344',
    name: 'Empty map',
    redirectType: 'Redirect301',
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt: '20260509T120000Z',
    mappings: [],
  },
];

describe('buildExportPayload', () => {
  it('produces a redirect-manager/v1 envelope', () => {
    const payload = buildExportPayload(sampleMaps);
    expect(payload.schema).toBe('redirect-manager/v1');
    expect(payload.items).toHaveLength(2);
  });

  it('includes a timestamp', () => {
    const payload = buildExportPayload(sampleMaps);
    expect(typeof payload.exportedAt).toBe('string');
    // ISO-8601 sanity check
    expect(payload.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('honours an explicit exportedAt override', () => {
    const payload = buildExportPayload(sampleMaps, {
      exportedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(payload.exportedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('preserves item id, name, type, flags, updatedAt, and mappings', () => {
    const payload = buildExportPayload(sampleMaps);
    const first = payload.items[0];
    expect(first.id).toBe(sampleMaps[0].id);
    expect(first.name).toBe(sampleMaps[0].name);
    expect(first.redirectType).toBe('ServerTransfer');
    expect(first.preserveQueryString).toBe(true);
    expect(first.preserveLanguage).toBe(false);
    expect(first.includeVirtualFolder).toBe(true);
    expect(first.updatedAt).toBe('20260509T183802Z');
    expect(first.mappings).toEqual(sampleMaps[0].mappings);
  });

  it('round-trips through validateExport (own output is valid input)', () => {
    const payload = buildExportPayload(sampleMaps);
    const result = validateExport(payload);
    expect(result.ok).toBe(true);
  });
});

describe('serializeExportToJson', () => {
  it('returns valid JSON with 2-space indentation', () => {
    const json = serializeExportToJson(sampleMaps);
    expect(() => JSON.parse(json)).not.toThrow();
    // 2-space indent puts at least one '\n  ' (newline + 2 spaces) in the output.
    expect(json).toMatch(/\n  "/);
  });

  it('handles empty array', () => {
    const json = serializeExportToJson([]);
    const parsed = JSON.parse(json);
    expect(parsed.items).toEqual([]);
    expect(parsed.schema).toBe('redirect-manager/v1');
  });
});

describe('buildExportFilename', () => {
  it('embeds the site name (lowercased, sanitised)', () => {
    const at = new Date('2026-05-11T18:30:00Z');
    const name = buildExportFilename('Solo Website', at);
    expect(name).toContain('solo-website');
    expect(name.endsWith('.json')).toBe(true);
  });

  it('strips invalid filesystem characters', () => {
    const at = new Date('2026-05-11T18:30:00Z');
    const name = buildExportFilename('My / Bad : Name?', at);
    expect(name).not.toMatch(/[/:?]/);
  });

  it('includes a timestamp in YYYYMMDD-HHMMSS form', () => {
    const at = new Date('2026-05-11T18:30:00Z');
    const name = buildExportFilename('x', at);
    expect(name).toContain('20260511-183000');
  });

  it('falls back to "site" when the input would be empty after sanitisation', () => {
    const at = new Date('2026-05-11T18:30:00Z');
    const name = buildExportFilename('***', at);
    expect(name).toContain('site');
  });
});
