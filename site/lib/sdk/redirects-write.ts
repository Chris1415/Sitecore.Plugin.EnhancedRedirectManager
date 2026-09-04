/**
 * Typed wrappers for the createItem / updateItem / deleteItem / renameItem
 * Authoring GraphQL mutations. Envelope: body INSIDE params. Unwrap: DOUBLE —
 * result.data.data.<mutation>. All mutations pass language: 'en'.
 *
 * ⚠ createItem does NOT accept `id` (EXEC_INVALID_TYPE), so a cross-environment
 * import always mints a NEW GUID. updateItem does NOT accept `name` — rename is
 * its own mutation. RedirectType is a string, not an enum, and 'Redirect307' is
 * rejected by the head-app resolver.
 * Verified against a live tenant — docs/build-decisions.md#authoring-mutations.
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
