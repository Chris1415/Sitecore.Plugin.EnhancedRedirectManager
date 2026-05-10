/**
 * T010 — lib/sdk/sites.ts
 *
 * Typed wrappers around xmc.sites.listSites + xmc.sites.listCollections.
 * Verb: client.query (xmc module query)
 * Unwrap: DOUBLE .data.data (xmc module queries — see sitecore:marketplace-sdk-client § 8b)
 *
 * Type imports:
 *   node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts
 *     → Sites.ListSitesData (line ~2561)
 *     → Sites.ListSitesResponse (line ~2589) = Array<Sites.Site>
 *     → Sites.Site (line ~964)
 *     → Sites.ListCollectionsData (line ~1757)
 *     → Sites.ListCollectionsResponse = Array<Sites.SiteCollection>
 *     → Sites.SiteCollection (line ~1050)
 *
 * assumed-shape: tests/fixtures/graphql/sites-list.json
 * assumed-shape: tests/fixtures/graphql/collections-list.json
 * Capture point: T065 real-tenant CRUD smoke
 *
 * Depends on: T009 (requireContextId)
 */

import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import type { Sites } from '@sitecore-marketplace-sdk/xmc';

/**
 * Lists all sites visible in the current Sitecore context.
 * Uses double .data.data unwrap (xmc module query envelope).
 */
export async function listSites(
  client: ClientSDK,
  sitecoreContextId: string,
): Promise<Sites.Site[]> {
  const result = await client.query('xmc.sites.listSites', {
    params: { query: { sitecoreContextId } },
  });
  // DOUBLE unwrap: result.data (SDK wrapper) → .data (hey-api envelope) → Array<Sites.Site>
  return (result as { data?: { data?: Sites.Site[] } }).data?.data ?? [];
}

/**
 * Lists all site collections visible in the current Sitecore context.
 * Uses double .data.data unwrap (xmc module query envelope).
 */
export async function listCollections(
  client: ClientSDK,
  sitecoreContextId: string,
): Promise<Sites.SiteCollection[]> {
  const result = await client.query('xmc.sites.listCollections', {
    params: { query: { sitecoreContextId } },
  });
  // DOUBLE unwrap: result.data (SDK wrapper) → .data (hey-api envelope) → Array<Sites.SiteCollection>
  return (result as { data?: { data?: Sites.SiteCollection[] } }).data?.data ?? [];
}
