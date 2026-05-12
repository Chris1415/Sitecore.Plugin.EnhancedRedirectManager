/**
 * T013 — lib/sdk/page-context.ts
 *
 * captured: real-tenant Pages editor 2026-05-11 (Capture Point #1) — fixture is the
 *           PagesContext payload as delivered to the onSuccess callback.
 * source: tests/fixtures/graphql/page-context.json
 *
 * OQ-A CLOSED 2026-05-11: matcher key is pageInfo.route (NOT pageInfo.url).
 *   - pageInfo.route   = "/"                       — clean published path; correct matcher key
 *   - pageInfo.url     = "/?sc_site=solo-website"  — Pages-editor URL with sc_site query param
 *   - pageInfo.path    = "/sitecore/content/..."   — Sitecore item-tree path, NOT a URL
 *
 * Note (cite § 4c-6.1): pages.context uses client.query (subscribe-via-query / Path A).
 * Note: logs pageInfo.url + .route + .path for forensics, matcher consumes .route.
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { subscribePageContext } from '@/lib/sdk/page-context';
import pageContextFixture from '@/tests/fixtures/graphql/page-context.json';

type QueryFn = ClientSDK['query'];

function makeStubClient() {
  let capturedOnSuccess: ((ctx: unknown) => void) | undefined;
  const query: Mock<QueryFn> = vi.fn<QueryFn>().mockImplementationOnce(async (_key, opts) => {
    capturedOnSuccess = (opts as { onSuccess?: (ctx: unknown) => void })?.onSuccess;
    return { data: pageContextFixture, unsubscribe: vi.fn() } as never;
  });
  const client = { query } as unknown as ClientSDK;
  return { client, triggerOnSuccess: (ctx: unknown) => capturedOnSuccess?.(ctx) };
}

describe('subscribePageContext', () => {
  it('RED-1: subscribe call uses correct verb (client.query) and subscribe:true', async () => {
    const { client } = makeStubClient();
    const callback = vi.fn();
    await subscribePageContext(client, callback);
    expect(client.query).toHaveBeenCalledWith(
      'pages.context',
      expect.objectContaining({
        subscribe: true,
        onSuccess: expect.any(Function),
      }),
    );
  });

  it('RED-2: callback receives unwrapped PagesContext (siteInfo + pageInfo)', async () => {
    const { client, triggerOnSuccess } = makeStubClient();
    const callback = vi.fn();
    await subscribePageContext(client, callback);
    triggerOnSuccess(pageContextFixture);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        siteInfo: expect.objectContaining({ name: 'solo-website' }),
        pageInfo: expect.objectContaining({
          route: '/',                       // matcher key
          url: '/?sc_site=solo-website',    // NOT the matcher key — has sc_site qs
          path: '/sitecore/content/solo/solo-website/Home',
        }),
      }),
    );
  });

  it('RED-3: pageInfo.route is the matcher key (OQ-A closed) — NOT pageInfo.url', async () => {
    const { client, triggerOnSuccess } = makeStubClient();
    const callback = vi.fn();
    await subscribePageContext(client, callback);
    triggerOnSuccess(pageContextFixture);

    const callbackArg = callback.mock.calls[0]?.[0];
    // pageInfo.route is the clean published path — what redirect sources match against.
    expect(callbackArg?.pageInfo?.route).toBe('/');
    // pageInfo.url is the Pages-editor URL with sc_site qs — would never match a clean redirect source.
    expect(callbackArg?.pageInfo?.url).toBe('/?sc_site=solo-website');
    // Document the divergence explicitly for future readers:
    expect(callbackArg.pageInfo.route).not.toBe(callbackArg.pageInfo.url);
  });

  it('divergence-detection — captured page-context fixture shape', () => {
    // If a re-capture replaces this fixture and the shape drifts, this assertion
    // fails with a named delta. Update the wrapper, not the assertion.
    expect(pageContextFixture, 'page-context: siteInfo + pageInfo with three path candidates').toMatchObject({
      siteInfo: expect.objectContaining({
        name: expect.any(String),
      }),
      pageInfo: expect.objectContaining({
        route: expect.any(String),
        url: expect.any(String),
        path: expect.any(String),
      }),
    });
  });
});
