/**
 * T012 — lib/sdk/redirects-write.ts
 *
 * Typed wrappers for createItem / updateItem / deleteItem Authoring GraphQL mutations.
 * Verb: client.mutate('xmc.authoring.graphql', ...)
 * Unwrap: SINGLE .data
 *
 * Per ADR-0010: ALL mutations pass language: 'en' (MVP language scope).
 * Per ADR-0009: createItem may accept caller-supplied id for GUID preservation — TBV at T065.
 *
 * Open questions (closed at T065 capture point):
 *   - Exact mutation verb names (createItem vs create_item)
 *   - Whether createItem accepts caller-supplied id (ADR-0009 GUID-preservation consequence)
 *   - Boolean field representation on writes ("0"/"1" vs "true"/"false" vs raw boolean) — OQ-C
 *   - RedirectType enum exact values beyond ServerTransfer (assumed: 301, 302, 307) — OQ-8
 *
 * assumed-shape: tests/fixtures/graphql/redirect-map.create.json
 * assumed-shape: tests/fixtures/graphql/redirect-map.update.json
 * assumed-shape: tests/fixtures/graphql/redirect-map.delete.json
 * Capture point: T065 real-tenant CRUD smoke
 *
 * Divergence-detection logging: every call logs request + response under
 * [redirect-manager:dev:capture] prefix when NODE_ENV !== 'production'.
 *
 * Depends on: T009 (requireContextId), T016 (domain types), T017 (serialize — inline stub here)
 */

import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import type { RedirectMapAttributes, Mapping } from '@/lib/domain/types';

/** Input for creating a new Redirect Map item */
export interface CreateRedirectMapInput extends RedirectMapAttributes {
  /** Sitecore GUID of the parent Settings/Redirects folder */
  parentId: string;
  /** Sitecore template GUID for the Redirect Map template */
  templateId: string;
  /**
   * Optional caller-supplied item ID for GUID preservation on cross-env imports (ADR-0009).
   * Whether Authoring accepts this is TBV at T065 capture point.
   */
  id?: string;
}

/** Input for updating an existing Redirect Map item */
export interface UpdateRedirectMapInput extends RedirectMapAttributes {
  /** Sitecore item GUID of the Redirect Map to update */
  itemId: string;
}

/** Stable output shape from all write operations */
export interface WriteResult {
  ok: boolean;
  itemId?: string;
}

/**
 * Inline UrlMapping serializer — URL-encodes source=target pairs joined by &.
 * ADR-0008: uppercase hex encoding.
 * NOTE: Tranche 3 T017 implements the full round-trip serializer in lib/url-mapping/serialize.ts.
 * This implementation will be replaced by the canonical one in Tranche 3.
 */
function serializeMappings(mappings: Mapping[]): string {
  return mappings
    .map((m) => `${encodeURIComponent(m.source)}=${encodeURIComponent(m.target)}`)
    .join('&')
    .replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase());
}

/**
 * Build the fields array for create/update mutations.
 * Boolean fields are represented as "0"/"1" strings (assumed — TBV at T065 capture point / OQ-C).
 */
function buildFieldsArray(attrs: RedirectMapAttributes): Array<{ name: string; value: string }> {
  return [
    { name: 'RedirectType', value: attrs.redirectType },
    { name: 'UrlMapping', value: serializeMappings(attrs.mappings) },
    { name: 'PreserveQueryString', value: attrs.preserveQueryString ? '1' : '0' },
    { name: 'PreserveLanguage', value: attrs.preserveLanguage ? '1' : '0' },
    { name: 'IncludeVirtualFolder', value: attrs.includeVirtualFolder ? '1' : '0' },
  ];
}

function devLog(prefix: string, payload: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[redirect-manager:dev:capture] ${prefix}`, JSON.stringify(payload, null, 2));
  }
}

const CREATE_REDIRECT_MAP = `
  mutation CreateRedirectMap($input: CreateItemInput!) {
    createItem(input: $input) { itemId name }
  }
`;

const UPDATE_REDIRECT_MAP = `
  mutation UpdateRedirectMap($input: UpdateItemInput!) {
    updateItem(input: $input) { itemId }
  }
`;

const DELETE_REDIRECT_MAP = `
  mutation DeleteRedirectMap($input: DeleteItemInput!) {
    deleteItem(input: $input) { successful }
  }
`;

/**
 * Creates a new Redirect Map item under Settings/Redirects.
 * Per ADR-0010: passes language: 'en'.
 */
export async function createRedirectMap(
  client: ClientSDK,
  sitecoreContextId: string,
  input: CreateRedirectMapInput,
): Promise<WriteResult> {
  const variables = {
    input: {
      name: input.name,
      templateId: input.templateId,
      parent: input.parentId,
      language: 'en',
      ...(input.id ? { id: input.id } : {}),
      fields: buildFieldsArray(input),
    },
  };

  devLog('createRedirectMap REQUEST', { sitecoreContextId, variables });

  // Envelope contract (verified against real tenant 2026-05-11):
  // - `body` lives INSIDE `params`, not at the top level — Marketplace SDK / hey-api wrapper.
  // - Response is DOUBLE-unwrapped: `result.data.data.createItem` is the GraphQL body.
  // - No `as never` cast needed; the type accepts this shape natively.
  // See: memory `reference_marketplace_sdk_envelope_authoring_graphql.md`.
  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: CREATE_REDIRECT_MAP, variables },
    },
  });

  devLog('createRedirectMap RESPONSE', result);

  // DOUBLE `.data.data` unwrap — outer is SDK wrapper, inner is GraphQL body.
  const data = (result.data?.data as { createItem?: { itemId?: string; name?: string } } | undefined);
  return {
    ok: Boolean(data?.createItem?.itemId),
    itemId: data?.createItem?.itemId,
  };
}

/**
 * Updates an existing Redirect Map item's fields.
 * Per ADR-0010: passes language: 'en'.
 */
export async function updateRedirectMap(
  client: ClientSDK,
  sitecoreContextId: string,
  input: UpdateRedirectMapInput,
): Promise<WriteResult> {
  const variables = {
    input: {
      itemId: input.itemId,
      language: 'en',
      fields: buildFieldsArray(input),
    },
  };

  devLog('updateRedirectMap REQUEST', { sitecoreContextId, variables });

  // Envelope: body inside params + double-unwrap (see createRedirectMap above).
  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: UPDATE_REDIRECT_MAP, variables },
    },
  });

  devLog('updateRedirectMap RESPONSE', result);

  const data = (result.data?.data as { updateItem?: { itemId?: string } } | undefined);
  return {
    ok: Boolean(data?.updateItem?.itemId),
    itemId: data?.updateItem?.itemId,
  };
}

/**
 * Deletes a Redirect Map item by item GUID.
 */
export async function deleteRedirectMap(
  client: ClientSDK,
  sitecoreContextId: string,
  itemId: string,
): Promise<WriteResult> {
  const variables = { input: { itemId } };

  devLog('deleteRedirectMap REQUEST', { sitecoreContextId, variables });

  // Envelope: body inside params + double-unwrap (see createRedirectMap above).
  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: DELETE_REDIRECT_MAP, variables },
    },
  });

  devLog('deleteRedirectMap RESPONSE', result);

  const data = (result.data?.data as { deleteItem?: { successful?: boolean } } | undefined);
  return {
    ok: Boolean(data?.deleteItem?.successful),
  };
}
