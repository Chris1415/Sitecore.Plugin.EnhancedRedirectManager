/**
 * T010 — lib/sdk/sites.ts
 *
 * captured: real tenant `xmc-sitecoresaa516c-chahdevexjoee24-proda41d.sitecorecloud.io` 2026-05-11
 *           via Capture Point #1. Fixtures hold the post-unwrap inner array (what the
 *           wrapper RETURNS); tests construct the SDK envelope { data: { data: <fixture> } }
 *           on the way in (what the wrapper RECEIVES from the SDK).
 *
 * source: tests/fixtures/graphql/sites-list.json
 * source: tests/fixtures/graphql/collections-list.json
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { listSites, listCollections } from '@/lib/sdk/sites';
import sitesListFixture from '@/tests/fixtures/graphql/sites-list.json';
import collectionsListFixture from '@/tests/fixtures/graphql/collections-list.json';

type QueryFn = ClientSDK['query'];

function makeStubClient(queryReturn: unknown) {
  const query: Mock<QueryFn> = vi.fn<QueryFn>().mockResolvedValueOnce(queryReturn as never);
  return { query } as unknown as ClientSDK;
}

/** Wrap the captured inner array in the SDK's double-wrapped envelope. */
function envelope<T>(payload: T): { data: { data: T } } {
  return { data: { data: payload } };
}

describe('listSites', () => {
  const CTX_ID = 'ctx-123';

  it('RED-1: request shape — uses correct key and params', async () => {
    const client = makeStubClient(envelope(sitesListFixture));
    await listSites(client, CTX_ID);
    expect(client.query).toHaveBeenCalledWith('xmc.sites.listSites', {
      params: { query: { sitecoreContextId: CTX_ID } },
    });
  });

  it('RED-2: response unwrap — double .data.data returns Site[]', async () => {
    const client = makeStubClient(envelope(sitesListFixture));
    const result = await listSites(client, CTX_ID);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: '881d69ec-0566-40ad-95ca-04eade2b4deb',
      name: 'shared',
    });
    expect(result[1]).toMatchObject({
      id: 'c541f0fd-54fc-4834-8967-a16af0bd68cb',
      name: 'solo-website',
    });
  });

  it('RED-3: empty tenant — returns [] without crash', async () => {
    const client = makeStubClient(envelope([]));
    const result = await listSites(client, CTX_ID);
    expect(result).toEqual([]);
  });

  it('RED-6: divergence-detection — sites-list fixture is an array of objects with id + name', () => {
    // captured fixture lives at tests/fixtures/graphql/sites-list.json (real-tenant 2026-05-11).
    // If the gateway changes the shape and a re-capture rewrites this file, this assertion
    // fails LOUDLY with a named delta — update the wrapper, not the assertion.
    expect(Array.isArray(sitesListFixture), 'sites-list fixture must be an array').toBe(true);
    expect(sitesListFixture, 'each site must have at minimum id + name').toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      ]),
    );
  });
});

describe('listCollections', () => {
  const CTX_ID = 'ctx-123';

  it('RED-4: request shape — uses correct key and params', async () => {
    const client = makeStubClient(envelope(collectionsListFixture));
    await listCollections(client, CTX_ID);
    expect(client.query).toHaveBeenCalledWith('xmc.sites.listCollections', {
      params: { query: { sitecoreContextId: CTX_ID } },
    });
  });

  it('RED-5: response unwrap — double .data.data returns SiteCollection[]', async () => {
    const client = makeStubClient(envelope(collectionsListFixture));
    const result = await listCollections(client, CTX_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '343b1245e77541cda8f2094b70531eb3',
      name: 'solo',
    });
  });

  it('RED-7: divergence-detection — collections-list fixture is an array of objects with id + name', () => {
    expect(Array.isArray(collectionsListFixture), 'collections-list fixture must be an array').toBe(true);
    expect(collectionsListFixture, 'each collection must have at minimum id + name').toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      ]),
    );
  });
});
