/**
 * T012 — lib/sdk/redirects-write.ts
 *
 * assumed: Authoring GraphQL createItem/updateItem/deleteItem mutation verbs + bodies
 *          per architecture § 5.4 / breakdown § 4c-6.5. Wire shapes for the WRITE surface
 *          are NOT YET captured — Capture Point #2 at the start of Tranche 6 closes them.
 *          See: tests/fixtures/graphql/redirect-map-list.meta.md § "Pending — Tranche 6".
 *
 * VERIFIED contract carried over from the read surface (Capture Point #1, 2026-05-11):
 *   - client.mutate('xmc.authoring.graphql', ...) — body lives INSIDE params, not at top level.
 *   - Response is DOUBLE-unwrapped: result.data.data holds the GraphQL body.
 *   - No `as never` cast in the wrapper — the SDK accepts the correct shape natively.
 *
 * source: tests/fixtures/graphql/redirect-map.create.json
 * source: tests/fixtures/graphql/redirect-map.update.json
 * source: tests/fixtures/graphql/redirect-map.delete.json
 *
 * Note (cite ADR-0010): all mutations pass language: 'en'.
 * Open at Tranche 6: exact mutation verb names, boolean rep on writes, createItem
 *   accepting caller-supplied id (ADR-0009), RedirectType non-ServerTransfer enum values (OQ-8).
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
  it('RED-1: request shape — body INSIDE params, createItem mutation, language:en', async () => {
    const client = makeStubClient(createFixture);
    await createRedirectMap(client, CTX_ID, { parentId: PARENT_ID, templateId: TEMPLATE_ID, ...attrs });
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        params: expect.objectContaining({
          query: { sitecoreContextId: CTX_ID },
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
      }),
    );
    // Defensive — body must NOT be at the top level. Top-level body is the broken shape
    // that triggers a 400 from the edge-platform gateway (see Capture Point #1 friction).
    const callArg = (client.mutate as Mock).mock.calls[0][1];
    expect(callArg.body, 'body must be INSIDE params, not at top level').toBeUndefined();
  });

  it('RED-2: double .data.data unwrap — wrapper returns { ok, itemId } from envelope', async () => {
    const client = makeStubClient(createFixture);
    const result = await createRedirectMap(client, CTX_ID, { parentId: PARENT_ID, templateId: TEMPLATE_ID, ...attrs });
    expect(result.ok).toBe(true);
    expect(result.itemId).toBe('{NEWITEM-A81F-4692-B05D-178D48C836DE}');
  });

  it('RED-5a: passes language:en (ADR-0010)', async () => {
    const client = makeStubClient(createFixture);
    await createRedirectMap(client, CTX_ID, { parentId: PARENT_ID, templateId: TEMPLATE_ID, ...attrs });
    const callArgs = (client.mutate as Mock).mock.calls[0];
    const body = callArgs[1].params.body;
    expect(body.variables.input.language).toBe('en');
  });

  it('RED-6: divergence-detection — create fixture wraps response in double .data.data envelope', () => {
    expect(createFixture, 'createItem fixture must use the double-wrapped envelope').toMatchObject({
      data: {
        data: expect.objectContaining({
          createItem: expect.objectContaining({
            itemId: expect.any(String),
          }),
        }),
      },
    });
  });
});

describe('updateRedirectMap', () => {
  it('RED-3: request shape — body INSIDE params, updateItem mutation with itemId + language:en + fields', async () => {
    const client = makeStubClient(updateFixture);
    await updateRedirectMap(client, CTX_ID, { itemId: ITEM_ID, ...attrs });
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        params: expect.objectContaining({
          query: { sitecoreContextId: CTX_ID },
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
      }),
    );
    const callArg = (client.mutate as Mock).mock.calls[0][1];
    expect(callArg.body, 'body must be INSIDE params, not at top level').toBeUndefined();
  });

  it('RED-5b: passes language:en (ADR-0010)', async () => {
    const client = makeStubClient(updateFixture);
    await updateRedirectMap(client, CTX_ID, { itemId: ITEM_ID, ...attrs });
    const callArgs = (client.mutate as Mock).mock.calls[0];
    const body = callArgs[1].params.body;
    expect(body.variables.input.language).toBe('en');
  });

  it('RED-7: divergence-detection — update fixture wraps response in double .data.data envelope', () => {
    expect(updateFixture, 'updateItem fixture must use the double-wrapped envelope').toMatchObject({
      data: {
        data: expect.objectContaining({
          updateItem: expect.objectContaining({
            itemId: expect.any(String),
          }),
        }),
      },
    });
  });
});

describe('deleteRedirectMap', () => {
  it('RED-4: request shape — body INSIDE params, deleteItem mutation with itemId', async () => {
    const client = makeStubClient(deleteFixture);
    await deleteRedirectMap(client, CTX_ID, ITEM_ID);
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        params: expect.objectContaining({
          query: { sitecoreContextId: CTX_ID },
          body: expect.objectContaining({
            query: expect.stringContaining('deleteItem'),
            variables: expect.objectContaining({
              input: expect.objectContaining({ itemId: ITEM_ID }),
            }),
          }),
        }),
      }),
    );
    const callArg = (client.mutate as Mock).mock.calls[0][1];
    expect(callArg.body, 'body must be INSIDE params, not at top level').toBeUndefined();
  });

  it('RED-8: divergence-detection — delete fixture wraps response in double .data.data envelope', () => {
    expect(deleteFixture, 'deleteItem fixture must use the double-wrapped envelope').toMatchObject({
      data: {
        data: expect.objectContaining({
          deleteItem: expect.objectContaining({
            successful: expect.any(Boolean),
          }),
        }),
      },
    });
  });
});
