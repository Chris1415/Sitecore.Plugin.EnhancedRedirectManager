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

import type { RedirectMapItem } from '@/lib/domain/types';
import type { ExportItem } from '@/lib/import-export/schema';

export type ImportClassification = {
  incoming: ExportItem;
  classification: 'new' | 'conflicting' | 'unchanged';
  existing?: RedirectMapItem;
  fieldDiff?: string[];
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
