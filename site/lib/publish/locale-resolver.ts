/**
 * T020b — Locale resolver for site publish bodies.
 *
 * PRD-003 SIMPLIFICATION (operator decision 2026-05-17, post-Tranche-2 smoke):
 * Always returns ["en"]. Redirect content lives in the SHARED `UrlMapping` field
 * on Redirect Map items (no language axis — see memory
 * reference_sitecore_redirect_map_template_field_versioning). Publishing other
 * locales just re-publishes byte-identical data; wasteful and slower. The default
 * language publish is sufficient because all language versions of routes pick up
 * the same redirect rule from the SHARED field.
 *
 * The `site` and `shorthandAccepted` parameters are retained for API stability so
 * downstream callers (WorkspaceHero, FullPage) and tests don't have to change shape.
 * If a future PRD reintroduces multi-locale publishing (e.g. per-language redirect
 * content via a non-shared template field), extend THIS resolver — do not inline
 * ["en"] at the call sites.
 *
 * SDK source (carried forward for future use):
 * node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019
 * Sites.Site.languages?: Array<string> | null
 */

/** Minimal shape of Sites.Site that this resolver needs. */
export interface SiteWithLanguages {
  languages?: Array<string> | null;
}

/**
 * Resolve the locale list for a site publish job.
 * Currently always returns ["en"] per the PRD-003 simplification documented above.
 */
export function resolveSiteLocales(
  site: SiteWithLanguages,
  shorthandAccepted: boolean,
): string[] {
  // Params intentionally unused for now; kept for API stability — see header comment.
  void site;
  void shorthandAccepted;
  return ["en"];
}
