/**
 * Tests for lib/import-export/apply.ts (T052).
 *
 * Cover:
 *   - skip + create + overwrite mix
 *   - newly-minted GUID propagation (ADR-0009 — incomingId vs newId)
 *   - per-item failure capture (batch continues)
 *   - empty input
 *   - progress callbacks
 */

import { describe, it, expect, vi } from 'vitest';
import {
  applyImport,
  type ApplyDependencies,
  type ResolvedItem,
} from '@/lib/import-export/apply';
import type { ExportItem } from '@/lib/import-export/schema';

function makeItem(overrides: Partial<ExportItem> = {}): ExportItem {
  return {
    id: 'src-1',
    name: 'sample',
    redirectType: 'ServerTransfer',
    preserveQueryString: false,
    preserveLanguage: false,
    includeVirtualFolder: false,
    updatedAt: '20260509T120000Z',
    mappings: [],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<ApplyDependencies> = {}): ApplyDependencies {
  return {
    create: vi.fn().mockResolvedValue({ ok: true, itemId: 'server-minted' }),
    update: vi.fn().mockResolvedValue({ ok: true, itemId: 'unchanged' }),
    parentId: 'parent-guid',
    templateId: 'template-guid',
    ...overrides,
  };
}

describe('applyImport', () => {
  it('returns zero totals on empty input', async () => {
    const deps = makeDeps();
    const result = await applyImport([], deps);
    expect(result.results).toEqual([]);
    expect(result.totals).toEqual({ created: 0, overwritten: 0, skipped: 0, failed: 0 });
  });

  it('handles skip without calling create or update', async () => {
    const deps = makeDeps();
    const resolved: ResolvedItem[] = [{ item: makeItem(), action: 'skip' }];
    const result = await applyImport(resolved, deps);
    expect(deps.create).not.toHaveBeenCalled();
    expect(deps.update).not.toHaveBeenCalled();
    expect(result.totals.skipped).toBe(1);
    expect(result.results[0].action).toBe('skip');
    expect(result.results[0].ok).toBe(true);
  });

  it('flags newly-minted GUIDs when create returns a different itemId', async () => {
    const deps = makeDeps({
      create: vi.fn().mockResolvedValue({ ok: true, itemId: 'minted-by-server' }),
    });
    const resolved: ResolvedItem[] = [
      { item: makeItem({ id: 'caller-supplied' }), action: 'create' },
    ];
    const result = await applyImport(resolved, deps);
    expect(result.totals.created).toBe(1);
    expect(result.results[0].newId).toBe('minted-by-server');
    expect(result.results[0].incomingId).toBe('caller-supplied');
  });

  it('reports overwrite success against existingId', async () => {
    const updateSpy = vi.fn().mockResolvedValue({ ok: true, itemId: 'target-guid' });
    const deps = makeDeps({ update: updateSpy });
    const resolved: ResolvedItem[] = [
      {
        item: makeItem({ id: 'src', name: 'My map' }),
        action: 'overwrite',
        existingId: 'target-guid',
      },
    ];
    const result = await applyImport(resolved, deps);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 'target-guid', name: 'My map' }),
    );
    expect(result.totals.overwritten).toBe(1);
  });

  it('records failures without throwing and continues the batch', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({ ok: false }) // first item fails
      .mockResolvedValueOnce({ ok: true, itemId: 'second-id' });
    const deps = makeDeps({ create });
    const resolved: ResolvedItem[] = [
      { item: makeItem({ id: 'a', name: 'A' }), action: 'create' },
      { item: makeItem({ id: 'b', name: 'B' }), action: 'create' },
    ];
    const result = await applyImport(resolved, deps);
    expect(result.totals.created).toBe(1);
    expect(result.totals.failed).toBe(1);
    expect(result.results[0].ok).toBe(false);
    expect(result.results[1].ok).toBe(true);
  });

  it('captures thrown errors per-item without aborting', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ ok: true, itemId: 'ok-id' });
    const deps = makeDeps({ create });
    const resolved: ResolvedItem[] = [
      { item: makeItem({ id: 'a' }), action: 'create' },
      { item: makeItem({ id: 'b' }), action: 'create' },
    ];
    const result = await applyImport(resolved, deps);
    expect(result.totals.failed).toBe(1);
    expect(result.totals.created).toBe(1);
    expect(result.results[0].error).toBe('boom');
  });

  it('emits progress callbacks for every item including skips', async () => {
    const deps = makeDeps();
    const onProgress = vi.fn();
    const resolved: ResolvedItem[] = [
      { item: makeItem({ id: 'a', name: 'A' }), action: 'skip' },
      { item: makeItem({ id: 'b', name: 'B' }), action: 'create' },
      { item: makeItem({ id: 'c', name: 'C' }), action: 'skip' },
    ];
    await applyImport(resolved, deps, onProgress);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, { current: 1, total: 3, name: 'A' });
    expect(onProgress).toHaveBeenNthCalledWith(2, { current: 2, total: 3, name: 'B' });
    expect(onProgress).toHaveBeenNthCalledWith(3, { current: 3, total: 3, name: 'C' });
  });

  it('runs writes sequentially (deterministic order)', async () => {
    const order: string[] = [];
    const create = vi.fn().mockImplementation(async (input) => {
      order.push(`create:${input.name}`);
      return { ok: true, itemId: `id-${input.name}` };
    });
    const update = vi.fn().mockImplementation(async (input) => {
      order.push(`update:${input.name}`);
      return { ok: true, itemId: input.itemId };
    });
    const deps = makeDeps({ create, update });
    const resolved: ResolvedItem[] = [
      { item: makeItem({ id: '1', name: 'first' }), action: 'create' },
      { item: makeItem({ id: '2', name: 'second' }), action: 'overwrite', existingId: '2' },
      { item: makeItem({ id: '3', name: 'third' }), action: 'create' },
    ];
    await applyImport(resolved, deps);
    expect(order).toEqual(['create:first', 'update:second', 'create:third']);
  });
});
