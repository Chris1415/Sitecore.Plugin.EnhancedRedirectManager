/**
 * T011 — lib/sdk/redirects-read.ts
 *
 * captured: real-tenant Authoring/Preview endpoint on 2026-05-09
 * source: tests/fixtures/graphql/redirect-map-item.read.json (per-item field shape — captured)
 *
 * assumed: list-children envelope per sitecore:marketplace-sdk-xmc .d.ts + architecture § 5.3 2026-05-10
 *          tracked for divergence at T065
 * source: tests/fixtures/graphql/redirect-map-list.json
 *
 * Note (cite ADR-0008): the UrlMapping decoding (warn-and-skip on malformed) follows ADR-0008.
 * Note (cite § 4c-6.4): xmc.authoring.graphql is client.MUTATE even for reads; single .data unwrap.
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { listRedirectMaps } from '@/lib/sdk/redirects-read';
import redirectMapListFixture from '@/tests/fixtures/graphql/redirect-map-list.json';

type MutateFn = ClientSDK['mutate'];

function makeStubClient(mutateReturn: unknown) {
  const mutate: Mock<MutateFn> = vi.fn<MutateFn>().mockResolvedValueOnce(mutateReturn as never);
  return { mutate } as unknown as ClientSDK;
}

const CTX_ID = 'ctx-123';
const SITE_PATH = '/sitecore/content/my-collection/my-site/Settings/Redirects';

describe('listRedirectMaps', () => {
  it('RED-1: request shape — correct mutate verb and body', async () => {
    const client = makeStubClient(redirectMapListFixture);
    await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        params: { query: { sitecoreContextId: CTX_ID } },
        body: expect.objectContaining({
          query: expect.stringContaining('GetRedirectsForSite'),
          variables: expect.objectContaining({ sitePath: SITE_PATH }),
        }),
      }),
    );
  });

  it('RED-2: single .data unwrap on mutate — returns RedirectMapItem[]', async () => {
    const client = makeStubClient(redirectMapListFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('RED-3: per-item field decoding — captured fixture shape (ADR-0008 field names, real-tenant)', async () => {
    // The per-item field shape in redirect-map-list.json mirrors the captured PRD § 9 single-item shape.
    // Source: captured real-tenant Authoring/Preview endpoint 2026-05-09.
    const client = makeStubClient(redirectMapListFixture);
    const [item] = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(item).toMatchObject({
      id: '{E39157F3-A81F-4692-B05D-178D48C836DE}',
      name: 'My Redirect Map',
      redirectType: 'ServerTransfer',
      preserveQueryString: false,
      preserveLanguage: false,
      includeVirtualFolder: true,
      mappings: [
        { source: '/test', target: '/newTest' },
        { source: '/hello', target: '/world' },
      ],
    });
  });

  it('RED-4: malformed UrlMapping segment — warn-and-skip, no throw', async () => {
    const malformedFixture = {
      data: {
        item: {
          children: {
            results: [
              {
                itemId: '{AAA}',
                name: 'Bad Map',
                fields: [
                  { name: 'RedirectType', jsonValue: { value: 'ServerTransfer' } },
                  // "noseparator" has no = so it is malformed; valid segment follows
                  { name: 'UrlMapping', jsonValue: { value: '%2fbad-segment&%2ftest=%2Fgood' } },
                  { name: 'PreserveQueryString', jsonValue: { value: '0' } },
                  { name: 'PreserveLanguage', jsonValue: { value: '0' } },
                  { name: 'IncludeVirtualFolder', jsonValue: { value: '0' } },
                  { name: '__Updated', jsonValue: { value: '20260509T120000Z' } },
                  { name: '__Created', jsonValue: { value: '20260509T100000Z' } },
                ],
              },
            ],
          },
        },
      },
    };
    const client = makeStubClient(malformedFixture);
    // Should not throw; should parse valid segment
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(result).toHaveLength(1);
    expect(result[0].mappings).toEqual([{ source: '/test', target: '/good' }]);
  });

  it('RED-5: empty children results — returns []', async () => {
    const emptyFixture = {
      data: {
        item: {
          children: {
            results: [],
          },
        },
      },
    };
    const client = makeStubClient(emptyFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(result).toEqual([]);
  });

  it('RED-6: divergence-detection — redirect-map-list children envelope', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(
      redirectMapListFixture,
      'assumed-shape divergence: redirect-map-list children envelope',
    ).toMatchObject({
      data: {
        item: {
          children: {
            results: expect.any(Array),
          },
        },
      },
    });
  });
});
