/**
 * lib/sdk/redirects-discover.ts — Tranche 6b
 *
 * Discovery helpers for the create-flow:
 *   - resolveItemIdByPath: resolves a Sitecore content/template path to its itemId.
 *   - discoverRedirectMapTemplateId: scans an existing Settings/Redirects parent's
 *     children for the Redirect Map template id (we can't hardcode it — the
 *     template lives at tenant-specific paths, but every existing map under the
 *     parent references it).
 *
 * Both queries verified against real tenant 2026-05-11 during Tranche 6a capture.
 *
 * Envelope: body INSIDE params + DOUBLE .data.data unwrap.
 */

import type { ClientSDK } from '@sitecore-marketplace-sdk/client';

const RESOLVE_ITEM_BY_PATH = `
  query ($path: String!) {
    item(where: { path: $path }) {
      itemId
      name
      path
    }
  }
`;

const DISCOVER_TEMPLATE_BY_PARENT_CHILDREN = `
  query ($parentId: ID!) {
    item(where: { itemId: $parentId }) {
      itemId
      children {
        nodes {
          itemId
          name
          template { templateId name }
        }
      }
    }
  }
`;

/** Template name on the Redirect Map item — used to filter the parent's children. */
const REDIRECT_MAP_TEMPLATE_NAME = 'Redirect Map';

/**
 * Resolves a Sitecore path to its itemId. Returns null if the path doesn't exist.
 */
export async function resolveItemIdByPath(
  client: ClientSDK,
  sitecoreContextId: string,
  path: string,
): Promise<string | null> {
  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: RESOLVE_ITEM_BY_PATH, variables: { path } },
    },
  });
  const itemId = (result.data?.data as { item?: { itemId?: string } } | undefined)
    ?.item?.itemId;
  return typeof itemId === 'string' ? itemId : null;
}

/**
 * Scans a parent's children for the Redirect Map template id.
 * Returns the first matching template id, or null if no Redirect Map items
 * exist under the parent yet.
 *
 * Operator flow: when the operator hits "+ New map" on a brand-new site with
 * no existing maps, this returns null and the modal must surface a guidance
 * message ("Create your first Redirect Map manually in Sitecore CMS, then
 * subsequent maps can be created here").
 */
export async function discoverRedirectMapTemplateId(
  client: ClientSDK,
  sitecoreContextId: string,
  parentId: string,
): Promise<string | null> {
  const result = await client.mutate('xmc.authoring.graphql', {
    params: {
      query: { sitecoreContextId },
      body: { query: DISCOVER_TEMPLATE_BY_PARENT_CHILDREN, variables: { parentId } },
    },
  });
  const nodes = (result.data?.data as {
    item?: {
      children?: {
        nodes?: Array<{ template?: { templateId?: string; name?: string } }>;
      };
    };
  } | undefined)?.item?.children?.nodes;
  if (!Array.isArray(nodes)) return null;
  for (const node of nodes) {
    if (node?.template?.name === REDIRECT_MAP_TEMPLATE_NAME && node.template.templateId) {
      return node.template.templateId;
    }
  }
  return null;
}
