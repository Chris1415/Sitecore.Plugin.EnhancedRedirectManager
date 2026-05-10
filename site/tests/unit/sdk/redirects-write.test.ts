/**
 * T012 — lib/sdk/redirects-write.ts
 *
 * assumed: Authoring GraphQL createItem/updateItem/deleteItem per architecture § 5.4 2026-05-10
 *          tracked for divergence at T065 (createItem), T065 (updateItem), T065 (deleteItem)
 * source: tests/fixtures/graphql/redirect-map.create.json
 * source: tests/fixtures/graphql/redirect-map.update.json
 * source: tests/fixtures/graphql/redirect-map.delete.json
 *
 * Note (cite ADR-0010): all mutations pass language: 'en'.
 * Note (cite § 4c-6.5): open questions — boolean rep, createItem accepts caller-supplied id?
 *   These are resolved at T065 capture point. Wrapper signature is stable regardless.
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { createRedirectMap, updateRedirectMap, deleteRedirectMap } from '@/lib/sdk/redirects-write';
import createFixture from '@/tests/fixtures/graphql/redirect-map.create.json';
import updateFixture from '@/tests/fixtures/graphql/redirect-map.update.json';
import deleteFixture from '@/tests/fixtures/graphql/redirect-map.delete.json';
import type { RedirectMapAttributes } from '@/lib/domain/types';

type MutateFn = ClientSDK['mutate'];

function makeStubClient(mutateReturn: unknown) {
  const mutate: Mock<MutateFn> = vi.fn<MutateFn>().mockResolvedValueOnce(mutateReturn as never);
  return { mutate } as unknown as ClientSDK;
}

const CTX_ID = 'ctx-123';
const PARENT_ID = '{PARENT-GUID-1234}';
const TEMPLATE_ID = '{REDIRECT-MAP-TEMPLATE-GUID}';
const ITEM_ID = '{E39157F3-A81F-4692-B05D-178D48C836DE}';

const attrs: RedirectMapAttributes = {
  name: 'My Redirect Map',
  redirectType: 'ServerTransfer',
  preserveQueryString: false,
  preserveLanguage: false,
  includeVirtualFolder: true,
  mappings: [{ source: '/test', target: '/newTest' }],
};

describe('createRedirectMap', () => {
  it('RED-1: request shape — mutation body contains createItem with name, templateId, language:en', async () => {
    const client = makeStubClient(createFixture);
    await createRedirectMap(client, CTX_ID, { parentId: PARENT_ID, templateId: TEMPLATE_ID, ...attrs });
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        params: { query: { sitecoreContextId: CTX_ID } },
        body: expect.objectContaining({
          query: expect.stringContaining('createItem'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              name: attrs.name,
              templateId: TEMPLATE_ID,
              language: 'en',
            }),
          }),
        }),
      }),
    );
  });

  it('RED-2: single .data unwrap — returns decoded response without crash', async () => {
    const client = makeStubClient(createFixture);
    const result = await createRedirectMap(client, CTX_ID, { parentId: PARENT_ID, templateId: TEMPLATE_ID, ...attrs });
    expect(result).toBeDefined();
    // ok flag from the stable wrapper interface
    expect(result.ok).toBe(true);
  });

  it('RED-5a: passes language:en (ADR-0010)', async () => {
    const client = makeStubClient(createFixture);
    await createRedirectMap(client, CTX_ID, { parentId: PARENT_ID, templateId: TEMPLATE_ID, ...attrs });
    const callArgs = (client.mutate as Mock).mock.calls[0];
    const body = callArgs[1].body;
    expect(body.variables.input.language).toBe('en');
  });

  it('RED-6: divergence-detection — create fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(createFixture, 'assumed-shape divergence: createItem response').toMatchObject({
      data: expect.objectContaining({
        createItem: expect.objectContaining({
          itemId: expect.any(String),
        }),
      }),
    });
  });
});

describe('updateRedirectMap', () => {
  it('RED-3: request shape — mutation body contains updateItem with itemId, language:en, fields', async () => {
    const client = makeStubClient(updateFixture);
    await updateRedirectMap(client, CTX_ID, { itemId: ITEM_ID, ...attrs });
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        body: expect.objectContaining({
          query: expect.stringContaining('updateItem'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              itemId: ITEM_ID,
              language: 'en',
              fields: expect.any(Array),
            }),
          }),
        }),
      }),
    );
  });

  it('RED-5b: passes language:en (ADR-0010)', async () => {
    const client = makeStubClient(updateFixture);
    await updateRedirectMap(client, CTX_ID, { itemId: ITEM_ID, ...attrs });
    const callArgs = (client.mutate as Mock).mock.calls[0];
    const body = callArgs[1].body;
    expect(body.variables.input.language).toBe('en');
  });

  it('RED-7: divergence-detection — update fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(updateFixture, 'assumed-shape divergence: updateItem response').toMatchObject({
      data: expect.objectContaining({
        updateItem: expect.objectContaining({
          itemId: expect.any(String),
        }),
      }),
    });
  });
});

describe('deleteRedirectMap', () => {
  it('RED-4: request shape — mutation body contains deleteItem with itemId', async () => {
    const client = makeStubClient(deleteFixture);
    await deleteRedirectMap(client, CTX_ID, ITEM_ID);
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        body: expect.objectContaining({
          query: expect.stringContaining('deleteItem'),
          variables: expect.objectContaining({
            input: expect.objectContaining({
              itemId: ITEM_ID,
            }),
          }),
        }),
      }),
    );
  });

  it('RED-8: divergence-detection — delete fixture shape', () => {
    // divergence-detection: if this assert fails after replacing the fixture with
    // a real-tenant capture, the shape has diverged. Update the wrapper, not the
    // assertion. Capture point: T065 CRUD smoke.
    expect(deleteFixture, 'assumed-shape divergence: deleteItem response').toMatchObject({
      data: expect.objectContaining({
        deleteItem: expect.objectContaining({
          successful: expect.any(Boolean),
        }),
      }),
    });
  });
});
