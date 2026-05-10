/**
 * T009 — requireContextId() helper
 *
 * source: node_modules/@sitecore-marketplace-sdk/core/dist/shared-types.d.ts → ApplicationContext (line ~128)
 * assumed: per sitecore:marketplace-sdk-client reference + sibling-app evidence 2026-05-10
 */

import { describe, it, expect } from 'vitest';
import { requireContextId } from '@/lib/sdk/require-context-id';
import type { ApplicationContext } from '@sitecore-marketplace-sdk/client';

function makeAppCtx(overrides: Partial<ApplicationContext> = {}): ApplicationContext {
  return {
    id: 'app-1',
    url: 'https://localhost:3000',
    ...overrides,
  } as ApplicationContext;
}

describe('requireContextId', () => {
  it('RED-1: returns preview contextId when resourceAccess is present', () => {
    const appCtx = makeAppCtx({
      resourceAccess: [
        {
          resourceId: 'r1',
          tenantId: 'tenant-1',
          context: { live: 'live-ctx', preview: 'ctx-123' },
        },
      ],
    });
    expect(requireContextId(appCtx)).toBe('ctx-123');
  });

  it('RED-2: throws typed error when resourceAccess is empty', () => {
    const appCtx = makeAppCtx({ resourceAccess: [] });
    expect(() => requireContextId(appCtx)).toThrow('Sitecore context unavailable');
  });

  it('RED-3: throws when context.preview is undefined', () => {
    const appCtx = makeAppCtx({
      resourceAccess: [
        {
          resourceId: 'r1',
          tenantId: 'tenant-1',
          context: { live: 'live-ctx', preview: undefined as unknown as string },
        },
      ],
    });
    expect(() => requireContextId(appCtx)).toThrow('Sitecore context unavailable');
  });

  it('RED-4: throws when resourceAccess is undefined', () => {
    const appCtx = makeAppCtx({ resourceAccess: undefined });
    expect(() => requireContextId(appCtx)).toThrow('Sitecore context unavailable');
  });
});
