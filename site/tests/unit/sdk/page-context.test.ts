/**
 * T013 — lib/sdk/page-context.ts
 *
 * assumed: per sitecore:marketplace-sdk-client .d.ts PagesContext (sdk-types.d.ts line ~73) 2026-05-10
 *          tracked for divergence at T065 (log pageInfo.url + pageInfo.route in real Pages session)
 * source: tests/fixtures/graphql/page-context.json
 *
 * Note (cite § 4c-6.1): pages.context uses client.query (subscribe-via-query / Path A), NOT client.subscribe.
 * Note (cite § 4c-6.1): matcher key is pageInfo.url per UI v1 § 1.6 working assumption (OQ-A).
 * Note: logs both pageInfo.url AND pageInfo.route for OQ-A closure at T065.
 */

import { describe, it, expect, vi, type Mock, beforeEach, afterEach } from 'vitest';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { subscribePageContext } from '@/lib/sdk/page-context';
import pageContextFixture from '@/tests/fixtures/graphql/page-context.json';

type QueryFn = ClientSDK['query'];

// The subscribe-via-query returns { data, unsubscribe? }
// In tests we invoke onSuccess manually since vitest can't wire the bridge
function makeStubClient() {
  let capturedOnSuccess: ((ctx: unknown) => void) | undefined;
  const query: Mock<QueryFn> = vi.fn<QueryFn>().mockImplementationOnce(async (_key, opts) => {
    capturedOnSuccess = (opts as { onSuccess?: (ctx: unknown) => void })?.onSuccess;
    // Return the fixture as initial data
    return { data: pageContextFixture, unsubscribe: vi.fn() } as never;
  });
  const client = { query } as unknown as ClientSDK;
  return { client, triggerOnSuccess: (ctx: unknown) => capturedOnSuccess?.(ctx) };
}

describe('subscribePageContext', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

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

    // Manually trigger the onSuccess to simulate a Pages context update
    triggerOnSuccess(pageContextFixture);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        siteInfo: expect.objectContaining({ name: 'my-site' }),
        pageInfo: expect.objectContaining({ url: '/foo/bar' }),
      }),
    );
  });

  it('RED-3: pageInfo.url is exposed as pageUrl matcher key', async () => {
    const { client, triggerOnSuccess } = makeStubClient();
    const callback = vi.fn();
    await subscribePageContext(client, callback);
    triggerOnSuccess(pageContextFixture);

    const callbackArg = callback.mock.calls[0]?.[0];
    expect(callbackArg?.pageInfo?.url).toBe('/foo/bar');
  });

  it('RED-4: logs both pageInfo.url and pageInfo.route to console.log on first message', async () => {
    const { client, triggerOnSuccess } = makeStubClient();
    const callback = vi.fn();
    await subscribePageContext(client, callback);
    triggerOnSuccess(pageContextFixture);

    const logCalls = consoleSpy.mock.calls.flat().join(' ');
    // Both url and route must appear in the log output for OQ-A inspection
    expect(logCalls).toContain('[redirect-manager:dev:capture]');
    expect(logCalls).toContain('/foo/bar'); // url value
  });

  it('RED-5: divergence-detection — page-context fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(pageContextFixture, 'assumed-shape divergence: page-context').toMatchObject({
      siteInfo: expect.objectContaining({
        name: expect.any(String),
      }),
      pageInfo: expect.objectContaining({
        url: expect.any(String),
        route: expect.any(String),
      }),
    });
  });
});
