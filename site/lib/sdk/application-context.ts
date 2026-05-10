/**
 * T014 — lib/sdk/application-context.ts
 *
 * Typed accessors for application.context data.
 * Verb: client.query('application.context') — used by the Provider; this module provides
 * selectors over the already-resolved ApplicationContext for downstream consumers.
 *
 * Most consumers use useAppContext() from components/providers/marketplace.tsx.
 * This module is for explicit re-fetch scenarios and selector helpers.
 *
 * Type import:
 *   node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts → ApplicationContext (line ~128)
 *   ApplicationResourceContext.tenantId — per ADR-0007
 *   ApplicationResourceContext.context.preview — per architecture § 5.7
 *
 * assumed-shape: tests/fixtures/graphql/application-context.json
 * Capture point: T065 real-tenant CRUD smoke
 *
 * Divergence-detection logging: logs resourceAccess[0].context.preview and tenantId
 * at first contact under [redirect-manager:dev:capture] prefix, gated on NODE_ENV !== 'production'.
 *
 * Depends on: T009 (requireContextId — selectContextId delegates to it, never re-implements)
 */

import type { ApplicationContext } from '@sitecore-marketplace-sdk/client';
import { requireContextId } from '@/lib/sdk/require-context-id';

function devLog(prefix: string, payload: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[redirect-manager:dev:capture] ${prefix}`, payload);
  }
}

/**
 * Extracts the tenant ID from the application context (ADR-0007).
 * Returns undefined if resourceAccess is empty or missing.
 */
export function selectTenantId(appCtx: ApplicationContext): string | undefined {
  const tenantId = appCtx?.resourceAccess?.[0]?.tenantId;
  devLog('selectTenantId:', tenantId);
  return tenantId;
}

/**
 * Extracts the preview sitecoreContextId from the application context.
 * Delegates to requireContextId — never re-implements the guard.
 * Per architecture § 5.7: always .preview for all xmc.* calls in MVP.
 *
 * Throws if preview context is unavailable (same error as requireContextId).
 */
export function selectContextId(appCtx: ApplicationContext): string {
  const contextId = requireContextId(appCtx);
  devLog('selectContextId (preview):', contextId);
  return contextId;
}
