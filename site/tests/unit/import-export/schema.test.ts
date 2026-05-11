/**
 * T019 — lib/import-export/schema.ts RED tests
 *
 * Zod schema for redirect-manager/v1 JSON shape.
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import { validateExport } from '@/lib/import-export/schema';

const validItem = {
  id: '{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}',
  name: 'Test Redirect Map',
  redirectType: 'ServerTransfer',
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: '2026-05-09T18:38:02Z',
  mappings: [
    { source: '/old', target: '/new' },
  ],
};

const validExport = {
  schema: 'redirect-manager/v1',
  exportedAt: '2026-05-09T18:38:02Z',
  items: [validItem],
};

describe('validateExport', () => {
  it('accepts a valid redirect-manager/v1 export', () => {
    const result = validateExport(validExport);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schema).toBe('redirect-manager/v1');
      expect(result.data.items).toHaveLength(1);
    }
  });

  it('rejects unknown schema version (redirect-manager/v2)', () => {
    const result = validateExport({ ...validExport, schema: 'redirect-manager/v2' });
    expect(result.ok).toBe(false);
  });

  it('rejects completely unknown schema name', () => {
    const result = validateExport({ ...validExport, schema: 'unknown/v1' });
    expect(result.ok).toBe(false);
  });

  it('rejects missing schema field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { schema: _schema, ...noSchema } = validExport;
    const result = validateExport(noSchema);
    expect(result.ok).toBe(false);
  });

  it('rejects missing items field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { items: _items, ...noItems } = validExport;
    const result = validateExport(noItems);
    expect(result.ok).toBe(false);
  });

  it('rejects non-array items', () => {
    const result = validateExport({ ...validExport, items: 'not-an-array' });
    expect(result.ok).toBe(false);
  });

  it('rejects an item missing required id field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...noId } = validItem;
    const result = validateExport({ ...validExport, items: [noId] });
    expect(result.ok).toBe(false);
  });

  it('rejects an item missing required name field', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name: _name, ...noName } = validItem;
    const result = validateExport({ ...validExport, items: [noName] });
    expect(result.ok).toBe(false);
  });

  it('rejects an item with malformed mappings (not an array)', () => {
    const result = validateExport({
      ...validExport,
      items: [{ ...validItem, mappings: 'not-an-array' }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an export with >1000 items', () => {
    const tooManyItems = Array.from({ length: 1001 }, (_, i) => ({
      ...validItem,
      id: `{GUID-${i}}`,
      name: `Map ${i}`,
    }));
    const result = validateExport({ ...validExport, items: tooManyItems });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/1000/);
    }
  });

  it('accepts exactly 1000 items', () => {
    const exactly1000 = Array.from({ length: 1000 }, (_, i) => ({
      ...validItem,
      id: `{GUID-${i}}`,
      name: `Map ${i}`,
    }));
    const result = validateExport({ ...validExport, items: exactly1000 });
    expect(result.ok).toBe(true);
  });

  it('rejects null input', () => {
    const result = validateExport(null);
    expect(result.ok).toBe(false);
  });

  it('rejects non-object input (string)', () => {
    const result = validateExport('not-an-object');
    expect(result.ok).toBe(false);
  });

  it('returns error string (not throws) on failure', () => {
    const result = validateExport({ invalid: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    }
  });

  it('accepts items with empty mappings array', () => {
    const result = validateExport({
      ...validExport,
      items: [{ ...validItem, mappings: [] }],
    });
    expect(result.ok).toBe(true);
  });
});
