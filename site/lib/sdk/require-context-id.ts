/**
 * T009 — requireContextId() typed helper
 *
 * Replaces any `as string` cast on appCtx?.resourceAccess?.[0]?.context?.preview.
 * Per architecture § 5.7 + ADR-0007: always use .preview (never .live) for all xmc.* calls in MVP.
 *
 * Source: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts → ApplicationContext (line ~128)
 *         ApplicationResourceContext.context = { live: string; preview: string }
 *
 * Depends on: T008 (Provider wires ApplicationContext via useAppContext)
 */

import type { ApplicationContext } from '@sitecore-marketplace-sdk/client';

/**
 * Returns the `.preview` sitecoreContextId for the first resource in the application context.
 * Throws a typed error when the context is unavailable (app not bound to a resource, or
 * preview channel is null/undefined).
 *
 * Policy (architecture § 5.7 + ADR-0007): use `.preview` for ALL xmc.* calls in MVP.
 * Do NOT use `.live` in this codebase until PRD-001+ changes this policy.
 */
export function requireContextId(appCtx: ApplicationContext): string {
  // The SDK ApplicationContext type exposes BOTH `resourceAccess` (current) AND
  // `resources` (deprecated). Real tenants in the wild return one OR the other
  // depending on the gateway version — `xmc-sitecoresaa516c-chahdevexjoee24-...`
  // returned only `resources` 2026-05-11. Check both so the wrapper works
  // regardless of which field the gateway populates.
  const preview =
    appCtx?.resourceAccess?.[0]?.context?.preview ??
    appCtx?.resources?.[0]?.context?.preview;
  if (!preview) {
    throw new Error(
      'Sitecore context unavailable — app not bound to a resource',
    );
  }
  return preview;
}
