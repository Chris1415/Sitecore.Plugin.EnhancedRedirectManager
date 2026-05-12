/**
 * T047 — lib/import-export/serialize.ts
 *
 * Turns the in-memory RedirectMapItem[] for a site into the canonical
 * `redirect-manager/v1` JSON export envelope.
 *
 * Schema mirrors lib/import-export/schema.ts ExportItemSchema:
 *   - id, name, redirectType, preserveQueryString, preserveLanguage,
 *     includeVirtualFolder, updatedAt, mappings.
 *
 * Pure module. Zero SDK dependency.
 */

import type { RedirectMapItem } from '@/lib/domain/types';
import type { RedirectExport } from '@/lib/import-export/schema';

export interface SerializeOptions {
  /** ISO-8601 timestamp; defaults to new Date().toISOString(). */
  exportedAt?: string;
}

/**
 * Serializes a site's redirect maps into the redirect-manager/v1 envelope.
 * Does NOT JSON.stringify the result — callers control formatting.
 */
export function buildExportPayload(
  maps: RedirectMapItem[],
  options: SerializeOptions = {},
): RedirectExport {
  return {
    schema: 'redirect-manager/v1',
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    items: maps.map((map) => ({
      id: map.id,
      name: map.name,
      redirectType: map.redirectType,
      preserveQueryString: map.preserveQueryString,
      preserveLanguage: map.preserveLanguage,
      includeVirtualFolder: map.includeVirtualFolder,
      updatedAt: map.updatedAt,
      mappings: map.mappings.map((m) => ({ source: m.source, target: m.target })),
    })),
  };
}

/**
 * Convenience: builds the envelope and JSON.stringify-s it with 2-space indent.
 */
export function serializeExportToJson(
  maps: RedirectMapItem[],
  options: SerializeOptions = {},
): string {
  return JSON.stringify(buildExportPayload(maps, options), null, 2);
}

/**
 * Builds a filename like
 *   redirect-manager-{siteName}-{YYYYMMDD-HHMMSS}.json
 *
 * Caller passes the site name (or any short identifier) and the function
 * sanitises it for filesystem-safe use. Defaults to the current timestamp.
 */
export function buildExportFilename(siteName: string, at: Date = new Date()): string {
  // Replace anything that isn't alphanumeric / dash / underscore with '-', then
  // collapse repeats and trim leading/trailing dashes. If the result is empty
  // (input was entirely punctuation), fall back to 'site'.
  const sanitised = siteName
    .replace(/[^a-z0-9-_]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const safe = sanitised || 'site';
  const yyyy = at.getUTCFullYear();
  const mm = String(at.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(at.getUTCDate()).padStart(2, '0');
  const hh = String(at.getUTCHours()).padStart(2, '0');
  const mi = String(at.getUTCMinutes()).padStart(2, '0');
  const ss = String(at.getUTCSeconds()).padStart(2, '0');
  return `redirect-manager-${safe}-${yyyy}${mm}${dd}-${hh}${mi}${ss}.json`;
}
