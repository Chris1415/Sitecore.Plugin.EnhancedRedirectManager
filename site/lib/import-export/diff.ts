/**
 * T020a — lib/import-export/diff.ts
 *
 * GUID-keyed diff classifier for the import preview step (ADR-0009).
 *
 * Inputs:
 *   - incoming: items from the imported JSON (ExportItem[])
 *   - target: existing items in the target site (RedirectMapItem[])
 *
 * Output: ImportClassification[] — one entry per incoming item:
 *   - 'new': no existing item shares the GUID
 *   - 'conflicting': GUID matches but at least one field differs
 *   - 'unchanged': GUID matches and all fields are identical
 *
 * Matching key: item.id (Sitecore item GUID) per ADR-0009.
 *
 * Field comparison covers: name, redirectType, preserveQueryString,
 * preserveLanguage, includeVirtualFolder, mappings (element-wise).
 * updatedAt is excluded from diff comparison (it is a metadata timestamp,
 * not an operator-editable field).
 *
 * Pure module. Zero SDK dependency.
 */

import type { Mapping, RedirectMapItem } from '@/lib/domain/types';
import type { ExportItem } from '@/lib/import-export/schema';

export type ImportClassification = {
  incoming: ExportItem;
  classification: 'new' | 'conflicting' | 'unchanged';
  existing?: RedirectMapItem;
  fieldDiff?: string[];
};

/** Structured diff for a single non-mapping (scalar) field. */
export type ScalarFieldDiff = {
  field: 'name' | 'redirectType' | 'preserveQueryString' | 'preserveLanguage' | 'includeVirtualFolder';
  current: string | boolean;
  incoming: string | boolean;
};

/** Structured diff for the mappings array. Source is the dedup key. */
export type MappingsDiff = {
  /** Sources present in incoming but missing from existing. */
  added: Mapping[];
  /** Sources present in existing but missing from incoming. */
  removed: Mapping[];
  /** Same source, different target. */
  changed: Array<{ source: string; currentTarget: string; incomingTarget: string }>;
};

/** Compare two mappings arrays element-wise. Returns true if identical. */
function mappingsEqual(
  a: Array<{ source: string; target: string }>,
  b: Array<{ source: string; target: string }>,
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (m, i) => m.source === b[i].source && m.target === b[i].target,
  );
}

/**
 * Classify incoming import items against the target site's existing items.
 *
 * @param incoming - Items from the import JSON
 * @param target - Existing RedirectMapItem[] from the target site
 * @returns Classification array (one entry per incoming item)
 */
export function classifyImport(
  incoming: ExportItem[],
  target: RedirectMapItem[],
): ImportClassification[] {
  // Build a lookup map keyed by Sitecore item GUID (case-insensitive for safety)
  const existingById = new Map<string, RedirectMapItem>(
    target.map((item) => [item.id.toLowerCase(), item]),
  );

  return incoming.map((item) => {
    const existing = existingById.get(item.id.toLowerCase());

    if (!existing) {
      return { incoming: item, classification: 'new' };
    }

    // Compare fields
    const fieldDiff: string[] = [];

    if (item.name !== existing.name) fieldDiff.push('name');
    if (item.redirectType !== existing.redirectType) fieldDiff.push('redirectType');
    if (item.preserveQueryString !== existing.preserveQueryString)
      fieldDiff.push('preserveQueryString');
    if (item.preserveLanguage !== existing.preserveLanguage)
      fieldDiff.push('preserveLanguage');
    if (item.includeVirtualFolder !== existing.includeVirtualFolder)
      fieldDiff.push('includeVirtualFolder');
    if (!mappingsEqual(item.mappings, existing.mappings)) fieldDiff.push('mappings');

    if (fieldDiff.length === 0) {
      return { incoming: item, classification: 'unchanged', existing };
    }

    return {
      incoming: item,
      classification: 'conflicting',
      existing,
      fieldDiff,
    };
  });
}

/**
 * Detailed scalar-field diffs (excludes mappings).
 * Returns one entry per differing field; empty array if all scalars match.
 */
export function buildScalarDiffs(
  existing: RedirectMapItem,
  incoming: ExportItem,
): ScalarFieldDiff[] {
  const diffs: ScalarFieldDiff[] = [];
  if (incoming.name !== existing.name) {
    diffs.push({ field: 'name', current: existing.name, incoming: incoming.name });
  }
  if (incoming.redirectType !== existing.redirectType) {
    diffs.push({
      field: 'redirectType',
      current: existing.redirectType,
      incoming: incoming.redirectType,
    });
  }
  if (incoming.preserveQueryString !== existing.preserveQueryString) {
    diffs.push({
      field: 'preserveQueryString',
      current: existing.preserveQueryString,
      incoming: incoming.preserveQueryString,
    });
  }
  if (incoming.preserveLanguage !== existing.preserveLanguage) {
    diffs.push({
      field: 'preserveLanguage',
      current: existing.preserveLanguage,
      incoming: incoming.preserveLanguage,
    });
  }
  if (incoming.includeVirtualFolder !== existing.includeVirtualFolder) {
    diffs.push({
      field: 'includeVirtualFolder',
      current: existing.includeVirtualFolder,
      incoming: incoming.includeVirtualFolder,
    });
  }
  return diffs;
}

/**
 * Bucketed mappings diff: what would be added, removed, changed when the
 * incoming mappings array replaces the existing one.
 *
 * Source string is the dedup key (matches the server's behaviour — see
 * UrlMapping URL-decode collapsing). If multiple existing rows share a
 * source (shouldn't happen given client-side dedup, but the data isn't
 * structurally guaranteed), only the first is considered for comparison.
 */
export function buildMappingsDiff(
  existingMappings: Mapping[],
  incomingMappings: Mapping[],
): MappingsDiff {
  const existingBySource = new Map<string, string>();
  for (const m of existingMappings) {
    if (!existingBySource.has(m.source)) existingBySource.set(m.source, m.target);
  }
  const incomingBySource = new Map<string, string>();
  for (const m of incomingMappings) {
    if (!incomingBySource.has(m.source)) incomingBySource.set(m.source, m.target);
  }

  const added: Mapping[] = [];
  const removed: Mapping[] = [];
  const changed: MappingsDiff['changed'] = [];

  for (const [source, incomingTarget] of incomingBySource) {
    const currentTarget = existingBySource.get(source);
    if (currentTarget === undefined) {
      added.push({ source, target: incomingTarget });
    } else if (currentTarget !== incomingTarget) {
      changed.push({ source, currentTarget, incomingTarget });
    }
  }

  for (const [source, currentTarget] of existingBySource) {
    if (!incomingBySource.has(source)) {
      removed.push({ source, target: currentTarget });
    }
  }

  return { added, removed, changed };
}
