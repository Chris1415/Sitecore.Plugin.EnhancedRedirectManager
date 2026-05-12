/**
 * T014 — lib/sdk/application-context.ts
 *
 * assumed: per sitecore:marketplace-sdk-client .d.ts ApplicationContext
 *          (core/dist/shared-types.d.ts line ~128) 2026-05-10
 *          tracked for divergence at T065
 * source: tests/fixtures/graphql/application-context.json
 *
 * Note (cite ADR-0007): tenantId from resourceAccess[0].tenantId.
 * Note (cite architecture § 5.7): contextId uses .preview channel for all xmc.* calls.
 */

import { describe, it, expect } from 'vitest';
import type { ApplicationContext } from '@sitecore-marketplace-sdk/client';
import { selectTenantId, selectContextId } from '@/lib/sdk/application-context';
import appCtxFixture from '@/tests/fixtures/graphql/application-context.json';

function makeAppCtx(overrides: Partial<ApplicationContext> = {}): ApplicationContext {
  return {
    id: 'app-1',
    url: 'https://localhost:3000',
    ...overrides,
  } as ApplicationContext;
}

describe('selectTenantId', () => {
  it('RED-1: returns resourceAccess[0].tenantId (ADR-0007)', () => {
    const appCtx = makeAppCtx({
      resourceAccess: [
        {
          resourceId: 'r1',
          tenantId: 'tenant-abc',
          context: { live: 'live', preview: 'preview' },
        },
      ],
    });
    expect(selectTenantId(appCtx)).toBe('tenant-abc');
  });

  it('returns undefined when resourceAccess is empty', () => {
    const appCtx = makeAppCtx({ resourceAccess: [] });
    expect(selectTenantId(appCtx)).toBeUndefined();
  });
});

describe('selectContextId', () => {
  it('RED-2: delegates to requireContextId (does not re-implement guard)', () => {
    // selectContextId must use requireContextId internally.
    // If requireContextId is the guard (throws on missing), selectContextId must throw too.
    const appCtx = makeAppCtx({ resourceAccess: [] });
    expect(() => selectContextId(appCtx)).toThrow('Sitecore context unavailable');
  });

  it('returns preview contextId via requireContextId', () => {
    const appCtx = makeAppCtx({
      resourceAccess: [
        {
          resourceId: 'r1',
          tenantId: 'tenant-abc',
          context: { live: 'live-ctx', preview: 'preview-ctx' },
        },
      ],
    });
    expect(selectContextId(appCtx)).toBe('preview-ctx');
  });

  it('RED-3: divergence-detection — application-context fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(appCtxFixture, 'assumed-shape divergence: application-context').toMatchObject({
      resourceAccess: expect.arrayContaining([
        expect.objectContaining({
          tenantId: expect.any(String),
          context: expect.objectContaining({
            preview: expect.any(String),
          }),
        }),
      ]),
    });
  });
});
