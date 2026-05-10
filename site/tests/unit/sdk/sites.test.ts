/**
 * T010 — lib/sdk/sites.ts
 *
 * assumed: per sitecore:marketplace-sdk-xmc .d.ts Sites.Site / Sites.ListSitesResponse 2026-05-10
 *          tracked for divergence at T065 (CRUD smoke — list sites/collections against real tenant)
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

describe('listSites', () => {
  const CTX_ID = 'ctx-123';

  it('RED-1: request shape — uses correct key and params', async () => {
    const client = makeStubClient(sitesListFixture);
    await listSites(client, CTX_ID);
    expect(client.query).toHaveBeenCalledWith('xmc.sites.listSites', {
      params: { query: { sitecoreContextId: CTX_ID } },
    });
  });

  it('RED-2: response unwrap — double .data.data returns Site[]', async () => {
    const client = makeStubClient(sitesListFixture);
    const result = await listSites(client, CTX_ID);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: '497f6eca-6276-4993-bfeb-53cbbbba6f08', name: 'my-site' });
  });

  it('RED-3: empty tenant — returns [] without crash', async () => {
    const client = makeStubClient({ data: { data: [] } });
    const result = await listSites(client, CTX_ID);
    expect(result).toEqual([]);
  });

  it('RED-6: divergence-detection — sites-list fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(sitesListFixture, 'assumed-shape divergence: sites-list fixture top-level shape').toMatchObject({
      data: {
        data: expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
        ]),
      },
    });
  });
});

describe('listCollections', () => {
  const CTX_ID = 'ctx-123';

  it('RED-4: request shape — uses correct key and params', async () => {
    const client = makeStubClient(collectionsListFixture);
    await listCollections(client, CTX_ID);
    expect(client.query).toHaveBeenCalledWith('xmc.sites.listCollections', {
      params: { query: { sitecoreContextId: CTX_ID } },
    });
  });

  it('RED-5: response unwrap — double .data.data returns SiteCollection[]', async () => {
    const client = makeStubClient(collectionsListFixture);
    const result = await listCollections(client, CTX_ID);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: '5aae1eeaea2440bf96f11f43da82c77b', name: 'my-collection' });
  });

  it('RED-7: divergence-detection — collections-list fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(collectionsListFixture, 'assumed-shape divergence: collections-list fixture top-level shape').toMatchObject({
      data: {
        data: expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
        ]),
      },
    });
  });
});
