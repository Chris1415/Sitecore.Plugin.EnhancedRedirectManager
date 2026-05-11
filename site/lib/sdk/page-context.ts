/**
 * T013 — lib/sdk/page-context.ts
 *
 * Typed wrapper around pages.context subscribe-via-query (Path A).
 * Verb: client.query('pages.context', { subscribe: true, onSuccess })
 * Unwrap: the onSuccess callback receives the PagesContext directly (no extra .data unwrap).
 *
 * Per UI v1 § 1.6 working assumption (OQ-A): matcher key is pageInfo.url.
 * Divergence-detection: logs both pageInfo.url AND pageInfo.route on first message so the
 * smoke checklist (T065) can close OQ-A by inspection.
 *
 * Type import:
 *   node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContext (line ~73)
 *   PagesContext.pageInfo.url — published URL (matcher key in MVP)
 *   PagesContext.pageInfo.route — route path (logged for OQ-A divergence detection)
 *   PagesContext.pageInfo.path — Sitecore item tree path (NOT the matcher key)
 *
 * assumed-shape: tests/fixtures/graphql/page-context.json
 * Capture point: T065 real-tenant CRUD smoke
 *
 * Divergence-detection logging: logs pageInfo.url and pageInfo.route on first message
 * under [redirect-manager:dev:capture] prefix, gated on NODE_ENV !== 'production'.
 *
 * Depends on: T009 (requireContextId indirectly; context is pre-resolved by Provider)
 */

import type { ClientSDK, PagesContext } from '@sitecore-marketplace-sdk/client';

/** Re-export so call sites outside lib/sdk/* (e.g. routes) don't import the SDK package directly. */
export type { PagesContext };

/** Function to stop the subscription */
export type UnsubscribeFn = () => void;

function devLog(prefix: string, payload: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[redirect-manager:dev:capture] ${prefix}`, payload);
  }
}

let _firstMessage = true;

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
  _firstMessage = true;

  const result = await client.query('pages.context', {
    subscribe: true,
    onSuccess: (ctx: PagesContext) => {
      if (_firstMessage) {
        // Log both fields for OQ-A closure — operator inspects these at T065 smoke
        devLog('pages.context first message — pageInfo.url:', ctx.pageInfo?.url);
        devLog('pages.context first message — pageInfo.route:', ctx.pageInfo?.route);
        devLog('pages.context first message — pageInfo.path:', ctx.pageInfo?.path);
        devLog('pages.context first message — siteInfo.name:', ctx.siteInfo?.name);
        _firstMessage = false;
      }
      callback(ctx);
    },
  });

  // Path A: unsubscribe is on the result object (may be undefined if subscribe:true not honoured)
  const unsub = (result as { unsubscribe?: () => void })?.unsubscribe;
  return () => unsub?.();
}
