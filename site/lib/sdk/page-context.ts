/**
 * Typed wrapper around pages.context subscribe-via-query. The onSuccess
 * callback receives the PagesContext DIRECTLY — no extra .data unwrap.
 *
 * The matcher key is pageInfo.url, which was a working assumption, so the first
 * message logs BOTH pageInfo.url and pageInfo.route to close it by inspection.
 * pageInfo.path is the Sitecore item tree path and is NOT the matcher key.
 * See docs/build-decisions.md#page-context-key.
 *
 * type: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContext
 */

import type { ClientSDK, PagesContext } from '@sitecore-marketplace-sdk/client';

/** Re-export so call sites outside lib/sdk/* (e.g. routes) don't import the SDK package directly. */
export type { PagesContext };

/** Function to stop the subscription */
export type UnsubscribeFn = () => void;

/**
 * Subscribes to the Pages editor context (selected page + site info).
 *
 * The callback fires on initial resolve AND on every subsequent page navigation
 * in the Pages editor (subscribe-via-query / Path A per sitecore:marketplace-sdk-client).
 *
 * @param client - The Marketplace ClientSDK instance
 * @param callback - Receives the full PagesContext on each update
 * @returns Promise resolving to an unsubscribe function
 */
export async function subscribePageContext(
  client: ClientSDK,
  callback: (ctx: PagesContext) => void,
): Promise<UnsubscribeFn> {
  const result = await client.query('pages.context', {
    subscribe: true,
    onSuccess: (ctx: PagesContext) => {
      callback(ctx);
    },
  });

  // Path A: unsubscribe is on the result object (may be undefined if subscribe:true not honoured)
  const unsub = (result as { unsubscribe?: () => void })?.unsubscribe;
  return () => unsub?.();
}
