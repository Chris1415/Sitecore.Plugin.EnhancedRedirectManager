/**
 * T011 — lib/sdk/redirects-read.ts
 *
 * Typed wrapper to list Redirect Map children + decode wire-to-domain.
 * Verb: client.MUTATE (Authoring GraphQL endpoint is a mutation even when used for reads)
 * Unwrap: SINGLE .data
 *
 * Type imports:
 *   node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts
 *     → Authoring.GraphqlData (line ~2)
 *     → Authoring.GraphqlResponse (line ~61)
 *
 * Per-item field shape: CAPTURED — real-tenant Authoring/Preview endpoint 2026-05-09 (PRD § 9 / ADR-0008).
 * List-children envelope: assumed. Fixture: tests/fixtures/graphql/redirect-map-list.json
 * Capture point: T065 real-tenant CRUD smoke
 *
 * Sibling cross-check: same client.mutate('xmc.authoring.graphql', ...) + single-.data pattern
 * in production at products/last-edit-trail/site/lib/sdk/authoring-graphql.ts:91
 * and products/component-usage-atlas/site/lib/sdk/authoring-resolve.ts:95 (§ 4c-6.4).
 *
 * Depends on: T009 (requireContextId), T016 (domain types — RedirectMapItem, Mapping)
 */

import type { ClientSDK } from '@sitecore-marketplace-sdk/client';
import type { RedirectMapItem, Mapping, RedirectType } from '@/lib/domain/types';

/** Wire shape for a single field in the Authoring GraphQL response */
interface WireField {
  name: string;
  jsonValue?: { value?: string };
}

/** Wire shape for a single item result from the children query */
interface WireItem {
  itemId?: string;
  name?: string;
  fields?: WireField[];
}

/** Wire shape for the full Authoring GraphQL children response */
interface WireChildrenResponse {
  item?: {
    children?: {
      results?: WireItem[];
    };
  };
}

/**
 * Parse a raw UrlMapping field value into Mapping pairs.
 * ADR-0008: URL-encoded source=target pairs joined by &.
 * Malformed segments (no = separator) produce a warning and are skipped.
 *
 * NOTE: Tranche 3 T017 implements the full round-trip parser in lib/url-mapping/parse.ts.
 * This inline version handles the read path only.
 */
function parseUrlMapping(raw: string): { mappings: Mapping[]; warnings: string[] } {
  if (!raw) return { mappings: [], warnings: [] };
  const segments = raw.split('&');
  const mappings: Mapping[] = [];
  const warnings: string[] = [];

  for (const segment of segments) {
    // Find the FIRST = (source strings may contain = which must be percent-encoded per ADR-0008)
    const eqIdx = segment.indexOf('=');
    if (eqIdx === -1) {
      warnings.push(`Malformed UrlMapping segment (no '=' separator): "${segment}"`);
      continue;
    }
    const source = decodeURIComponent(segment.slice(0, eqIdx));
    const target = decodeURIComponent(segment.slice(eqIdx + 1));
    if (!source && !target) continue;
    mappings.push({ source, target });
  }
  return { mappings, warnings };
}

/**
 * Parse the boolean flag from a field jsonValue.
 * Authoring GraphQL returns boolean flags as "0"/"1" strings (assumed — TBV at T065).
 */
function parseBoolField(field: WireField | undefined): boolean {
  const val = field?.jsonValue?.value;
  if (val === '1' || val === 'true') return true;
  return false;
}

/**
 * Decode a wire item into the domain RedirectMapItem.
 * Returns null and logs a warning if the item is missing required fields.
 */
function decodeWireItem(wire: WireItem): RedirectMapItem | null {
  if (!wire.itemId || !wire.name) {
    console.warn('[redirect-manager] Skipping redirect map item with missing id or name', wire);
    return null;
  }

  const fieldMap = new Map<string, WireField>();
  for (const f of wire.fields ?? []) {
    fieldMap.set(f.name, f);
  }

  const rawUrlMapping = fieldMap.get('UrlMapping')?.jsonValue?.value ?? '';
  const { mappings, warnings } = parseUrlMapping(rawUrlMapping);

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`[redirect-manager] UrlMapping parse warning on item "${wire.name}": ${w}`);
    }
  }

  const redirectType = (fieldMap.get('RedirectType')?.jsonValue?.value ?? 'ServerTransfer') as RedirectType;
  const updatedAt = fieldMap.get('__Updated')?.jsonValue?.value ?? '';

  return {
    id: wire.itemId,
    name: wire.name,
    redirectType,
    preserveQueryString: parseBoolField(fieldMap.get('PreserveQueryString')),
    preserveLanguage: parseBoolField(fieldMap.get('PreserveLanguage')),
    includeVirtualFolder: parseBoolField(fieldMap.get('IncludeVirtualFolder')),
    updatedAt,
    mappings,
  };
}

/** GraphQL query to list Redirect Map children under a site's Settings/Redirects path */
const GET_REDIRECTS_FOR_SITE = `
  query GetRedirectsForSite($sitePath: String!) {
    item(path: $sitePath, language: "en") {
      children(includeTemplateIDs: ["{REDIRECT_MAP_TEMPLATE_GUID}"]) {
        results {
          itemId
          name
          fields(ownFields: false) { name jsonValue }
        }
      }
    }
  }
`;

/**
 * Lists Redirect Map items under the given site's Settings/Redirects path.
 *
 * @param client - The Marketplace ClientSDK instance
 * @param sitecoreContextId - Preview channel context ID (architecture § 5.7, always .preview)
 * @param sitePath - Sitecore item path: /sitecore/content/<COLLECTION>/<SITE>/Settings/Redirects
 */
export async function listRedirectMaps(
  client: ClientSDK,
  sitecoreContextId: string,
  sitePath: string,
): Promise<RedirectMapItem[]> {
  const result = await client.mutate('xmc.authoring.graphql', {
    params: { query: { sitecoreContextId } },
    body: {
      query: GET_REDIRECTS_FOR_SITE,
      variables: { sitePath },
    },
  } as never);

  // SINGLE .data unwrap (mutate — see sitecore:marketplace-sdk-client § 8b)
  const root = (result as { data?: WireChildrenResponse })?.data;
  const items = root?.item?.children?.results ?? [];

  const decoded: RedirectMapItem[] = [];
  for (const wire of items) {
    const item = decodeWireItem(wire as WireItem);
    if (item) decoded.push(item);
  }
  return decoded;
}
