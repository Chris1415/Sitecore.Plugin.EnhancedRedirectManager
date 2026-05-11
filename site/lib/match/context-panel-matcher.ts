/**
 * T020b — lib/match/context-panel-matcher.ts
 *
 * Pure exact-string matcher for the Context Panel (ADR-0005).
 *
 * A mapping matches the current page URL when:
 *   pageUrl === mapping.source  OR  pageUrl === mapping.target
 *
 * Regex sources are excluded entirely — string equality only per ADR-0005.
 * The persistent non-dismissible banner ("Direct-string matches only — regex
 * pattern matches are not yet covered") is owned by the Context Panel UI, not
 * this module.
 *
 * Maps with zero matched rows are filtered out of the result.
 *
 * Pure module. Zero SDK dependency.
 */

import type { RedirectMapItem, Mapping } from '@/lib/domain/types';

export interface MatchedGroup {
  map: RedirectMapItem;
  matchedMappings: Mapping[];
}

/**
 * Find all redirect maps that contain at least one mapping touching the given page URL.
 *
 * @param pageUrl - The current page URL (from pages.context pageInfo.url)
 * @param items   - All RedirectMapItems for the current site
 * @returns MatchedGroup[] — maps with ≥1 match, with matchedMappings filtered to hits only
 */
export function matchPageRedirects(
  pageUrl: string,
  items: RedirectMapItem[],
): MatchedGroup[] {
  const result: MatchedGroup[] = [];

  for (const map of items) {
    const matchedMappings = map.mappings.filter(
      (m) => m.source === pageUrl || m.target === pageUrl,
    );

    if (matchedMappings.length > 0) {
      result.push({ map, matchedMappings });
    }
  }

  return result;
}
