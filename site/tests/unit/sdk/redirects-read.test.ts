/**
 * T011 — lib/sdk/redirects-read.ts
 *
 * captured: real-tenant Authoring GraphQL gateway 2026-05-11 (Capture Point #1).
 * source: tests/fixtures/graphql/redirect-map-list.json
 *
 * Verified contract (per reference_marketplace_sdk_envelope_authoring_graphql.md):
 * - client.mutate('xmc.authoring.graphql', ...) — body lives INSIDE params, not at top level.
 * - Response is DOUBLE-unwrapped — result.data.data carries the GraphQL body. Apollo / Hot
 *   Chocolate `extensions` (e.g. tracing) sits at result.data.extensions and is ignored.
 * - The wire item shape uses aliased Item.field(name:) accessors per
 *   reference_sitecore_field_aliased_accessor_query_pattern.md.
 *
 * Note (ADR-0008): UrlMapping decoder warns-and-skips on malformed segments.
 * Note (OQ-C): boolean fields are "1" (true) / "" (false) on the read surface.
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
  it('RED-1: request shape — body inside params, no top-level body', async () => {
    const client = makeStubClient(redirectMapListFixture);
    await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(client.mutate).toHaveBeenCalledWith(
      'xmc.authoring.graphql',
      expect.objectContaining({
        params: expect.objectContaining({
          query: { sitecoreContextId: CTX_ID },
          body: expect.objectContaining({
            query: expect.stringContaining('GetRedirectsForSite'),
            variables: expect.objectContaining({ sitePath: SITE_PATH }),
          }),
        }),
      }),
    );
    // Defensive — the broken pattern (body at top level) must NOT appear.
    const callArg = (client.mutate as Mock).mock.calls[0][1];
    expect(callArg.body, 'body must be INSIDE params, not at top level').toBeUndefined();
  });

  it('RED-2: double .data.data unwrap + Redirect Map Grouping filter — returns only real Redirect Maps', async () => {
    // Fixture has 2 children but one is a "Redirect Map Grouping" template
    // (template name verified against real tenant 2026-05-11). The grouping
    // must be filtered out — only the real Redirect Map item is returned.
    const client = makeStubClient(redirectMapListFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Redirect Map');
  });

  it('RED-3: per-item field decoding — fully-populated Redirect Map (captured real-tenant)', async () => {
    const client = makeStubClient(redirectMapListFixture);
    const [first] = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(first).toMatchObject({
      id: 'e39157f3a81f4692b05d178d48c836de',
      name: 'My Redirect Map',
      redirectType: 'ServerTransfer',
      preserveQueryString: false,          // captured "" → false
      preserveLanguage: false,             // captured "" → false
      includeVirtualFolder: true,          // captured "1" → true
      updatedAt: '20260509T183802Z',       // Sitecore compact format — Tranche 3 will parse to Date
      mappings: [
        { source: '/test', target: '/newTest' },
        { source: '/hello', target: '/world' },
      ],
    });
  });

  it('RED-3b: "Redirect Map Grouping" items are filtered out by template name', async () => {
    // The captured "Test Group" item has template.name = "Redirect Map Grouping"
    // and all redirect-specific fields null. The decoder MUST return null for it
    // so listRedirectMaps doesn't surface it as a fake Redirect Map with defaults.
    const client = makeStubClient(redirectMapListFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(result.find((m) => m.name === 'Test Group')).toBeUndefined();
  });

  it('RED-3c: defensive heuristic — items lacking RedirectType + UrlMapping fields are filtered', async () => {
    // If a future template name appears that we haven't enumerated in
    // NON_REDIRECT_MAP_TEMPLATES, the heuristic (no RedirectType + no UrlMapping
    // = not a Redirect Map) still filters it out so the operator never sees
    // ghost redirects with default values.
    const unknownTemplateFixture = {
      data: {
        data: {
          item: {
            itemId: 'root',
            name: 'Redirects',
            children: {
              nodes: [
                {
                  itemId: 'unknown-item-id',
                  name: 'Future Grouping Template',
                  template: { name: 'Some Unknown Folder Template' },
                  IncludeVirtualFolder: null,
                  PreserveQueryString: null,
                  RedirectType: null,
                  PreserveLanguage: null,
                  UrlMapping: null,
                  __Updated: { value: '20260511T100000Z' },
                },
              ],
            },
          },
        },
      },
    };
    const client = makeStubClient(unknownTemplateFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(result).toEqual([]);
  });

  it('RED-4: malformed UrlMapping segment — warn-and-skip, no throw', async () => {
    const malformedFixture = {
      data: {
        data: {
          item: {
            itemId: 'root',
            name: 'Redirects',
            children: {
              nodes: [
                {
                  itemId: '{AAA}',
                  name: 'Bad Map',
                  RedirectType: { value: 'ServerTransfer' },
                  // "noseparator" has no = so it is malformed; valid segment follows
                  UrlMapping: { value: '%2fbad-segment&%2ftest=%2Fgood' },
                  PreserveQueryString: { value: '0' },
                  PreserveLanguage: { value: '0' },
                  IncludeVirtualFolder: { value: '0' },
                  __Updated: { value: '20260509T120000Z' },
                },
              ],
            },
          },
        },
      },
    };
    const client = makeStubClient(malformedFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(result).toHaveLength(1);
    expect(result[0].mappings).toEqual([{ source: '/test', target: '/good' }]);
  });

  it('RED-5: empty children — returns []', async () => {
    const emptyFixture = {
      data: {
        data: {
          item: {
            itemId: 'root',
            name: 'Redirects',
            children: {
              nodes: [],
            },
          },
        },
      },
    };
    const client = makeStubClient(emptyFixture);
    const result = await listRedirectMaps(client, CTX_ID, SITE_PATH);
    expect(result).toEqual([]);
  });

  it('RED-6: divergence-detection — redirect-map-list captured envelope', () => {
    // If the gateway changes envelope shape and a re-capture rewrites this file,
    // this assertion fails LOUDLY with a named delta — update the wrapper, not
    // the assertion. Capture point #1 closed 2026-05-11; revisit at T065 for writes.
    expect(
      redirectMapListFixture,
      'envelope: result.data.data.item.children.nodes',
    ).toMatchObject({
      data: {
        data: {
          item: {
            children: {
              nodes: expect.any(Array),
            },
          },
        },
      },
    });
    // Verify the captured aliased field shape on at least one item.
    const firstNode = (
      redirectMapListFixture as {
        data: { data: { item: { children: { nodes: unknown[] } } } };
      }
    ).data.data.item.children.nodes[0];
    expect(firstNode, 'first item must expose aliased field accessors').toMatchObject({
      itemId: expect.any(String),
      name: expect.any(String),
      UrlMapping: { value: expect.any(String) },
      RedirectType: { value: expect.any(String) },
    });
  });
});
