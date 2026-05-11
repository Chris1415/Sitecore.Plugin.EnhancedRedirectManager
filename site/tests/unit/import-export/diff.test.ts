/**
 * T019 (diff portion) — lib/import-export/diff.ts RED tests
 *
 * GUID-keyed diff classifier (ADR-0009).
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import { classifyImport } from '@/lib/import-export/diff';
import type { RedirectMapItem } from '@/lib/domain/types';

const makeItem = (overrides: Partial<RedirectMapItem> = {}): RedirectMapItem => ({
  id: '{A1B2C3D4-0000-0000-0000-000000000001}',
  name: 'Test Map',
  redirectType: 'ServerTransfer',
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: false,
  updatedAt: '2026-05-09T18:38:02Z',
  mappings: [{ source: '/old', target: '/new' }],
  ...overrides,
});

describe('classifyImport', () => {
  it('classifies all items as new when target has no existing items', () => {
    const incoming = [makeItem(), makeItem({ id: '{A1B2C3D4-0000-0000-0000-000000000002}', name: 'Map 2' })];
    const result = classifyImport(incoming, []);
    expect(result).toHaveLength(2);
    expect(result.every(r => r.classification === 'new')).toBe(true);
  });

  it('classifies an item as unchanged when all fields match', () => {
    const item = makeItem();
    const result = classifyImport([item], [item]);
    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe('unchanged');
    expect(result[0].fieldDiff).toBeUndefined();
  });

  it('classifies an item as conflicting when any field differs', () => {
    const incoming = makeItem({ name: 'Updated Name' });
    const existing = makeItem({ name: 'Old Name' });
    const result = classifyImport([incoming], [existing]);
    expect(result).toHaveLength(1);
    expect(result[0].classification).toBe('conflicting');
    expect(result[0].fieldDiff).toContain('name');
  });

  it('classifies mixed all-new, all-conflicting, and unchanged correctly', () => {
    const newItem = makeItem({ id: '{NEW-0000-0000-0000-000000000001}', name: 'New' });
    const unchangedItem = makeItem({ id: '{UNCHANGED-0000-0000-0000-000000000002}', name: 'Same' });
    const conflictingIncoming = makeItem({ id: '{CONFLICT-0000-0000-0000-000000000003}', name: 'Changed' });
    const conflictingExisting = makeItem({ id: '{CONFLICT-0000-0000-0000-000000000003}', name: 'Original' });

    const result = classifyImport(
      [newItem, unchangedItem, conflictingIncoming],
      [unchangedItem, conflictingExisting],
    );

    expect(result).toHaveLength(3);
    const byId = Object.fromEntries(result.map(r => [r.incoming.id, r]));
    expect(byId[newItem.id].classification).toBe('new');
    expect(byId[unchangedItem.id].classification).toBe('unchanged');
    expect(byId[conflictingIncoming.id].classification).toBe('conflicting');
  });

  it('reports single-field delta correctly (only redirectType differs)', () => {
    const incoming = makeItem({ redirectType: '301' });
    const existing = makeItem({ redirectType: 'ServerTransfer' });
    const result = classifyImport([incoming], [existing]);
    expect(result[0].fieldDiff).toEqual(['redirectType']);
  });

  it('reports multi-field delta when multiple fields differ', () => {
    const incoming = makeItem({ name: 'New Name', redirectType: '302', preserveQueryString: true });
    const existing = makeItem({ name: 'Old Name', redirectType: 'ServerTransfer', preserveQueryString: false });
    const result = classifyImport([incoming], [existing]);
    const diff = result[0].fieldDiff ?? [];
    expect(diff).toContain('name');
    expect(diff).toContain('redirectType');
    expect(diff).toContain('preserveQueryString');
  });

  it('reports mappings as differing when mapping count changes', () => {
    const incoming = makeItem({ mappings: [{ source: '/a', target: '/b' }, { source: '/c', target: '/d' }] });
    const existing = makeItem({ mappings: [{ source: '/a', target: '/b' }] });
    const result = classifyImport([incoming], [existing]);
    expect(result[0].classification).toBe('conflicting');
    expect(result[0].fieldDiff).toContain('mappings');
  });

  it('reports mappings as differing when source differs', () => {
    const incoming = makeItem({ mappings: [{ source: '/new', target: '/b' }] });
    const existing = makeItem({ mappings: [{ source: '/old', target: '/b' }] });
    const result = classifyImport([incoming], [existing]);
    expect(result[0].classification).toBe('conflicting');
    expect(result[0].fieldDiff).toContain('mappings');
  });

  it('returns empty array when incoming is empty', () => {
    const result = classifyImport([], [makeItem()]);
    expect(result).toEqual([]);
  });

  it('each result has an incoming field referencing the incoming item', () => {
    const item = makeItem();
    const result = classifyImport([item], []);
    expect(result[0].incoming).toBe(item);
  });

  it('conflicting result has an existing field referencing the matched existing item', () => {
    const incoming = makeItem({ name: 'Changed' });
    const existing = makeItem({ name: 'Original' });
    const result = classifyImport([incoming], [existing]);
    expect(result[0].existing).toBe(existing);
  });
});
