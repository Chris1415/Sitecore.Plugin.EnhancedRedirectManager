/**
 * T017 — lib/url-mapping/parse.ts
 *
 * Canonical UrlMapping parser (ADR-0008).
 *
 * Wire format: URL-encoded source=target pairs joined by &.
 * e.g. "%2Ffoo=%2Fbar&%2Fbaz=%2Fqux" → [{ source:"/foo", target:"/bar" }, ...]
 *
 * Rules:
 * - Split on & first to get segments
 * - For each segment, find the FIRST = (sources may contain = encoded as %3D)
 * - decodeURIComponent both source and target
 * - Warn-and-skip on malformed segments (no = separator)
 * - Skip silently when BOTH source and target decode to empty string
 * - Mixed-case URL encoding is accepted on parse (e.g. %2f and %2F both decode to /)
 *
 * Invariant (ADR-0008): parse(serialize(rows)).mappings deep-equals rows
 * for all rows with non-empty source and non-empty target.
 *
 * Pure module. Zero SDK dependency.
 */

import type { Mapping } from '@/lib/domain/types';

export interface ParseResult {
  mappings: Mapping[];
  warnings: string[];
}

/**
 * Parse a raw UrlMapping field value into Mapping pairs.
 *
 * @param raw - The raw UrlMapping field value from Authoring GraphQL
 * @returns Parsed mappings and any warnings for malformed segments
 */
export function parseUrlMapping(raw: string): ParseResult {
  if (!raw) return { mappings: [], warnings: [] };

  const segments = raw.split('&');
  const mappings: Mapping[] = [];
  const warnings: string[] = [];

  for (const segment of segments) {
    // Find the FIRST = separator. Source strings may contain = when encoded as %3D —
    // the first literal = is always the separator per ADR-0008.
    const eqIdx = segment.indexOf('=');

    if (eqIdx === -1) {
      warnings.push(
        `Malformed UrlMapping segment (no '=' separator): "${segment}"`,
      );
      continue;
    }

    const source = decodeURIComponent(segment.slice(0, eqIdx));
    const target = decodeURIComponent(segment.slice(eqIdx + 1));

    // Skip silently when BOTH source and target are empty (e.g. bare "=")
    if (!source && !target) continue;

    mappings.push({ source, target });
  }

  return { mappings, warnings };
}
