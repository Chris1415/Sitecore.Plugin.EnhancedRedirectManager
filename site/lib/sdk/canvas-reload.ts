/**
 * T015 — lib/sdk/canvas-reload.ts
 *
 * Typed wrapper around pages.reloadCanvas mutation.
 * Verb: client.mutate('pages.reloadCanvas') — no params, void return.
 * Source: sitecore:marketplace-sdk-client base MutationMap ('pages.reloadCanvas' → void)
 *
 * Fired after every successful Context Panel write so the Pages canvas reflects the
 * redirect immediately (architecture § 5.6).
 *
 * Error handling: errors are swallowed and logged (canvas reload is a UX nicety, not a
 * correctness gate). The calling component must not be blocked by canvas reload failure.
 *
 * Depends on: T009 (Provider wires client; this module accepts it as a param)
 */

import type { ClientSDK } from '@sitecore-marketplace-sdk/client';

/**
 * Triggers a Pages canvas reload after a successful Context Panel write.
 *
 * Errors from the canvas reload are swallowed and logged — they must not propagate
 * to the caller since canvas reload is a UX enhancement, not a correctness gate.
 */
export async function reloadPagesCanvas(client: ClientSDK): Promise<void> {
  try {
    await client.mutate('pages.reloadCanvas');
  } catch (err) {
    // Canvas reload failure must NOT propagate — log and continue.
    console.error('[redirect-manager] pages.reloadCanvas failed (non-blocking):', err);
  }
}
