/**
 * T018 — lib/url-mapping/serialize.ts
 *
 * Canonical UrlMapping serializer (ADR-0008).
 *
 * Wire format: URL-encoded source=target pairs joined by &.
 * e.g. [{ source:"/foo", target:"/bar" }] → "%2Ffoo=%2Fbar"
 *
 * Rules:
 * - encodeURIComponent(source) + '=' + encodeURIComponent(target)
 * - Join all pairs with &
 * - Normalize hex to uppercase on output (%2f → %2F per ADR-0008)
 * - Operator-defined row order is authoritative (preserved as-is)
 *
 * Invariant (ADR-0008): parse(serialize(rows)).mappings deep-equals rows
 * for all rows with non-empty source and non-empty target.
 *
 * Pure module. Zero SDK dependency.
 */

import type { Mapping } from '@/lib/domain/types';

/**
 * Serialize Mapping pairs to the UrlMapping wire format.
 *
 * @param mappings - Array of { source, target } pairs
 * @returns URL-encoded string in "source=target&source=target" format
 */
export function serializeMappings(mappings: Mapping[]): string {
  if (mappings.length === 0) return '';

  return mappings
    .map((m) => `${encodeURIComponent(m.source)}=${encodeURIComponent(m.target)}`)
    .join('&')
    // Normalize all percent-encoded sequences to uppercase (ADR-0008 canonical form)
    .replace(/%[0-9a-f]{2}/gi, (match) => match.toUpperCase());
}
