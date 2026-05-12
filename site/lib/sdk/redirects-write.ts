/**
 * T012 — lib/sdk/redirects-write.ts
 *
 * Typed wrappers for createItem / updateItem / deleteItem / renameItem
 * Authoring GraphQL mutations.
 *
 * Verb: client.mutate('xmc.authoring.graphql', ...)
 * Envelope: body INSIDE params (verified 2026-05-11)
 * Unwrap: DOUBLE — result.data.data.<mutation> (verified 2026-05-11)
 *
 * Per ADR-0010: ALL mutations pass language: 'en' (MVP language scope).
 *
 * VERIFIED 2026-05-11 (Tranche 6a real-tenant capture session — closes all 7 assumed-shape annotations):
 *
 *   - createItem(input: CreateItemInput!) { item { itemId name path } }
 *     CreateItemInput accepts: name (required), templateId (required), parent (required), language, fields.
 *     **`id` field is NOT accepted** — server returns EXEC_INVALID_TYPE.
 *     This closes OQ-B / ADR-0009: caller-supplied id is impossible; cross-env
 *     imports always mint a NEW GUID on "create" actions. The import summary
 *     screen must flag newly minted GUIDs as a fast-follow indicator.
 *
 *   - updateItem(input: UpdateItemInput!) { item { itemId } }
 *     Single-field semantics: sending only one field in fields[] updates just
 *     that field and leaves the rest untouched. Boolean write repr: '0' / '1'
 *     (string). The server also tolerates 'true' / 'false' strings, but '0' /
 *     '1' is the canonical write repr we ship.
 *     **`name` field is NOT accepted on UpdateItemInput** — rename has its own
 *     dedicated mutation (see renameRedirectMap below).
 *
 *   - deleteItem(input: DeleteItemInput!) { successful }
 *
 *   - renameItem(input: RenameItemInput!) { item { itemId name } }
 *     RenameItemInput accepts: itemId (required), newName (required).
 *
 *   - RedirectType field values (string at GraphQL level — NOT an enum):
 *     'ServerTransfer', 'Redirect301', 'Redirect302'.
 *     'Redirect307' is rejected by the head-app resolver (operator confirmation).
 *
 * Fixtures: tests/fixtures/graphql/redirect-map.{create,update,delete,rename}.json.
 *
 * Depends on: T009 (requireContextId), T016 (domain types), T017 (serialize).
 */

import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import type { RedirectMapAttributes } from '@/lib/domain/types';
import { serializeMappings } from '@/lib/url-mapping/serialize';

/** Input for creating a new Redirect Map item */
export interface CreateRedirectMapInput extends RedirectMapAttributes {
  /** Sitecore GUID of the parent Settings/Redirects folder */
  parentId: string;
  /** Sitecore template GUID for the Redirect Map template */
  templateId: string;
}

/** Input for updating an existing Redirect Map item */
export interface UpdateRedirectMapInput extends RedirectMapAttributes {
  /** Sitecore item GUID of the Redirect Map to update */
  itemId: string;
}

/** Input for renaming a Redirect Map item (separate mutation — not via updateItem.name) */
export interface RenameRedirectMapInput {
  /** Sitecore item GUID of the Redirect Map to rename */
  itemId: string;
  /** New item name */
  newName: string;
}

/** Stable output shape from all write operations */
export interface WriteResult {
  ok: boolean;
  itemId?: string;
  name?: string;
}

/**
 * Build the fields array for create/update mutations.
 * Boolean fields are represented as '0' / '1' strings (verified 2026-05-11).
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

const CREATE_REDIRECT_MAP = `
  mutation CreateRedirectMap($input: CreateItemInput!) {
    createItem(input: $input) { item { itemId name path } }
  }
`;

const UPDATE_REDIRECT_MAP = `
  mutation UpdateRedirectMap($input: UpdateItemInput!) {
    updateItem(input: $input) { item { itemId } }
  }
`;

const DELETE_REDIRECT_MAP = `
  mutation DeleteRedirectMap($input: DeleteItemInput!) {
    deleteItem(input: $input) { successful }
  }
`;

const RENAME_REDIRECT_MAP = `
  mutation RenameRedirectMap($input: RenameItemInput!) {
    renameItem(input: $input) { item { itemId name } }
  }
`;

/**
 * Creates a new Redirect Map item under Settings/Redirects.
 * Per ADR-0010: passes language: 'en'.
 *
 * Note: caller-supplied id is NOT supported (verified 2026-05-11). The server
 * always mints a fresh GUID. Import flows that match by GUID must surface this
 * as a "newly minted ID" indicator on the import summary screen.
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
      fields: buildFieldsArray(input),
    },
  };


  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: CREATE_REDIRECT_MAP, variables },
    },
  });


  const data = result.data?.data as
    | { createItem?: { item?: { itemId?: string; name?: string } } }
    | undefined;
  const itemId = data?.createItem?.item?.itemId;
  return {
    ok: Boolean(itemId),
    itemId,
    name: data?.createItem?.item?.name,
  };
}

/**
 * Updates an existing Redirect Map item's fields.
 * Per ADR-0010: passes language: 'en'.
 *
 * Note: this wrapper sends ALL field values on every call. For single-field
 * updates (the common case from inline edit) the schema also supports partial
 * fields[] — callers wanting that optimization should compose the variables
 * directly. The current wrapper preserves the simpler "send everything" shape
 * because the field count is small and idempotent.
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


  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: UPDATE_REDIRECT_MAP, variables },
    },
  });


  const data = result.data?.data as
    | { updateItem?: { item?: { itemId?: string } } }
    | undefined;
  const itemId = data?.updateItem?.item?.itemId;
  return {
    ok: Boolean(itemId),
    itemId,
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


  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: DELETE_REDIRECT_MAP, variables },
    },
  });


  const data = result.data?.data as
    | { deleteItem?: { successful?: boolean } }
    | undefined;
  return {
    ok: Boolean(data?.deleteItem?.successful),
  };
}

/**
 * Renames a Redirect Map item. Uses the dedicated `renameItem` mutation —
 * the schema does NOT accept a `name` field on UpdateItemInput.
 */
export async function renameRedirectMap(
  client: ClientSDK,
  sitecoreContextId: string,
  input: RenameRedirectMapInput,
): Promise<WriteResult> {
  const variables = {
    input: {
      itemId: input.itemId,
      newName: input.newName,
    },
  };


  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: RENAME_REDIRECT_MAP, variables },
    },
  });


  const data = result.data?.data as
    | { renameItem?: { item?: { itemId?: string; name?: string } } }
    | undefined;
  const itemId = data?.renameItem?.item?.itemId;
  return {
    ok: Boolean(itemId),
    itemId,
    name: data?.renameItem?.item?.name,
  };
}
