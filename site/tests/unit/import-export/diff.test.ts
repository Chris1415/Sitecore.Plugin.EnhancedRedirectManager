/**
 * T019 (diff portion) — lib/import-export/diff.ts RED tests
 *
 * GUID-keyed diff classifier (ADR-0009).
 * Tests written BEFORE the implementation (TDD RED phase).
 */

import { describe, it, expect } from 'vitest';
import {
  classifyImport,
  buildScalarDiffs,
  buildMappingsDiff,
} from '@/lib/import-export/diff';
import type { Mapping, RedirectMapItem } from '@/lib/domain/types';
import type { ExportItem } from '@/lib/import-export/schema';

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
    const incoming = makeItem({ redirectType: 'Redirect301' });
    const existing = makeItem({ redirectType: 'ServerTransfer' });
    const result = classifyImport([incoming], [existing]);
    expect(result[0].fieldDiff).toEqual(['redirectType']);
  });

  it('reports multi-field delta when multiple fields differ', () => {
    const incoming = makeItem({ name: 'New Name', redirectType: 'Redirect302', preserveQueryString: true });
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

// ─── Detailed diff helpers (drill-down support) ──────────────────────────

function toExportItem(map: RedirectMapItem): ExportItem {
  // ExportItem is structurally a subset of RedirectMapItem.
  return map;
}

describe('buildScalarDiffs', () => {
  it('returns empty array when all scalars match', () => {
    const existing = makeItem();
    const diffs = buildScalarDiffs(existing, toExportItem(existing));
    expect(diffs).toEqual([]);
  });

  it('flags name change with current and incoming values', () => {
    const existing = makeItem({ name: 'Old' });
    const incoming = toExportItem(makeItem({ name: 'New' }));
    const diffs = buildScalarDiffs(existing, incoming);
    expect(diffs).toEqual([{ field: 'name', current: 'Old', incoming: 'New' }]);
  });

  it('flags multiple field changes simultaneously', () => {
    const existing = makeItem({
      redirectType: 'ServerTransfer',
      preserveQueryString: false,
      includeVirtualFolder: false,
    });
    const incoming = toExportItem(
      makeItem({
        redirectType: 'Redirect301',
        preserveQueryString: true,
        includeVirtualFolder: true,
      }),
    );
    const diffs = buildScalarDiffs(existing, incoming);
    const fields = diffs.map((d) => d.field).sort();
    expect(fields).toEqual(['includeVirtualFolder', 'preserveQueryString', 'redirectType']);
  });

  it('ignores mappings (they get their own diff)', () => {
    const existing = makeItem({ mappings: [{ source: '/a', target: '/b' }] });
    const incoming = toExportItem(makeItem({ mappings: [{ source: '/x', target: '/y' }] }));
    const diffs = buildScalarDiffs(existing, incoming);
    expect(diffs).toEqual([]);
  });
});

describe('buildMappingsDiff', () => {
  it('returns empty buckets when arrays match exactly', () => {
    const m: Mapping[] = [{ source: '/a', target: '/b' }];
    const diff = buildMappingsDiff(m, m);
    expect(diff).toEqual({ added: [], removed: [], changed: [] });
  });

  it('detects added mappings (source only in incoming)', () => {
    const diff = buildMappingsDiff(
      [{ source: '/a', target: '/b' }],
      [
        { source: '/a', target: '/b' },
        { source: '/new', target: '/new-target' },
      ],
    );
    expect(diff.added).toEqual([{ source: '/new', target: '/new-target' }]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it('detects removed mappings (source only in existing)', () => {
    const diff = buildMappingsDiff(
      [
        { source: '/keep', target: '/k' },
        { source: '/gone', target: '/g' },
      ],
      [{ source: '/keep', target: '/k' }],
    );
    expect(diff.removed).toEqual([{ source: '/gone', target: '/g' }]);
    expect(diff.added).toEqual([]);
  });

  it('detects changed targets (same source, different target)', () => {
    const diff = buildMappingsDiff(
      [{ source: '/a', target: '/old' }],
      [{ source: '/a', target: '/new' }],
    );
    expect(diff.changed).toEqual([
      { source: '/a', currentTarget: '/old', incomingTarget: '/new' },
    ]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('handles a mix of added, removed, and changed in one diff', () => {
    const diff = buildMappingsDiff(
      [
        { source: '/keep', target: '/k' },
        { source: '/changed', target: '/old' },
        { source: '/gone', target: '/g' },
      ],
      [
        { source: '/keep', target: '/k' },
        { source: '/changed', target: '/new' },
        { source: '/added', target: '/a' },
      ],
    );
    expect(diff.added).toEqual([{ source: '/added', target: '/a' }]);
    expect(diff.removed).toEqual([{ source: '/gone', target: '/g' }]);
    expect(diff.changed).toEqual([
      { source: '/changed', currentTarget: '/old', incomingTarget: '/new' },
    ]);
  });
});
