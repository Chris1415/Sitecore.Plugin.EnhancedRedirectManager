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

import type { ClientSDK } from "@sitecore-marketplace-sdk/client"
import type { RedirectMapItem, RedirectType } from "@/lib/domain/types"
import { parseUrlMapping } from "@/lib/url-mapping/parse"

/** Wire shape for an individual aliased field accessor on a Redirect Map item.
 *  Authoring's `Item.field(name: String!): ItemField` returns a single field.
 *  We alias each field by name in the GraphQL query so the response is flat. */
interface WireFieldValue {
  value?: string
}

/** Wire shape for a single Redirect Map item using aliased field(name:) accessors.
 *  Each known field is its own property on the item — no inner connection / nodes list.
 *
 *  `template { name }` carries the Sitecore template name so we can filter out
 *  non-Redirect-Map siblings — see decodeWireItem below. Operator confirmed
 *  2026-05-11 that "Redirect Map Grouping" items live alongside real Redirect
 *  Maps under /Settings/Redirects/ and must be ignored. */
interface WireItem {
  itemId?: string
  name?: string
  template?: { name?: string } | null
  IncludeVirtualFolder?: WireFieldValue
  PreserveQueryString?: WireFieldValue
  RedirectType?: WireFieldValue
  PreserveLanguage?: WireFieldValue
  UrlMapping?: WireFieldValue
  __Updated?: WireFieldValue
}

/** Wire shape for the full Authoring GraphQL children response.
 *  ItemConnection — Relay-style with `nodes` (flattened) | `edges` | `pageInfo`. We use `nodes`. */
interface WireChildrenResponse {
  item?: {
    children?: {
      nodes?: WireItem[]
    }
  }
}

// parseUrlMapping is now the canonical lib/url-mapping/parse.ts implementation (T017, Tranche 3).
// Imported above — the inline copy has been removed.

/**
 * Parse the boolean flag from an Authoring ItemField.value.
 * Authoring returns ItemField.value: String! — booleans serialize as "0"/"1" or "true"/"false"
 * (OQ-C confirmed 2026-05-11: real tenant returns "1" for true, "" empty string for false —
 * neither "0" nor "false"). The check below accepts all three forms on read.
 */
function parseBoolField(field: WireFieldValue | undefined): boolean {
  const val = field?.value
  if (val === "1" || val === "true") return true
  return false
}

/**
 * Names of Sitecore templates that are NOT Redirect Maps and must be filtered out
 * of the children list. Operator confirmed 2026-05-11:
 * - "Redirect Map Grouping" lives alongside Redirect Map items under
 *   /Settings/Redirects/ as an organisational template. It has none of the
 *   Redirect Map fields (RedirectType / UrlMapping / Preserve* / IncludeVirtualFolder).
 *
 * NOTE — possible nested hierarchy (Tranche 6+): operators may place "Redirect Map
 * Grouping" items as folders containing Redirect Maps beneath. The current query
 * traverses one level (`children { nodes { ... } }`); deep traversal is a follow-on.
 * For now: skip groupings entirely. Their children are invisible to the app until
 * the recursive traversal lands.
 */
const NON_REDIRECT_MAP_TEMPLATES = new Set<string>(['Redirect Map Grouping'])

/**
 * Decode a wire item into the domain RedirectMapItem.
 * Returns null when:
 * - the item is missing id or name (shouldn't happen for real Sitecore items)
 * - the item is a known non-Redirect-Map template (e.g. "Redirect Map Grouping")
 * - the item lacks the Redirect Map signature fields entirely (defensive heuristic
 *   for templates whose name we haven't enumerated yet)
 *
 * The query aliases each field as a top-level property on the item via Authoring's
 * `field(name:)` accessor. `template { name }` is fetched so we can filter precisely.
 * Items whose template doesn't define a field return `null` for that field — that's
 * the defensive heuristic for unknown grouping/folder templates.
 */
function decodeWireItem(wire: WireItem): RedirectMapItem | null {
  if (!wire.itemId || !wire.name) {
    console.warn(
      "[redirect-manager] Skipping redirect map item with missing id or name",
      wire
    )
    return null
  }

  // Precise filter: known non-Redirect-Map template names.
  const templateName = wire.template?.name
  if (templateName && NON_REDIRECT_MAP_TEMPLATES.has(templateName)) {
    return null
  }

  // Defensive heuristic: any item lacking BOTH RedirectType and UrlMapping fields
  // is not a Redirect Map (the template doesn't declare these fields). This catches
  // grouping templates we haven't enumerated by name yet.
  const hasRedirectMapSignature =
    wire.RedirectType !== null &&
    wire.RedirectType !== undefined &&
    wire.UrlMapping !== null &&
    wire.UrlMapping !== undefined
  if (!hasRedirectMapSignature) {
    return null
  }

  const rawUrlMapping = wire.UrlMapping?.value ?? ""
  const { mappings, warnings } = parseUrlMapping(rawUrlMapping)

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(
        `[redirect-manager] UrlMapping parse warning on item "${wire.name}": ${w}`
      )
    }
  }

  const redirectType = (wire.RedirectType?.value ??
    "ServerTransfer") as RedirectType
  const updatedAt = wire.__Updated?.value ?? ""

  return {
    id: wire.itemId,
    name: wire.name,
    redirectType,
    preserveQueryString: parseBoolField(wire.PreserveQueryString),
    preserveLanguage: parseBoolField(wire.PreserveLanguage),
    includeVirtualFolder: parseBoolField(wire.IncludeVirtualFolder),
    updatedAt,
    mappings,
  }
}

/**
 * GraphQL query to list all children under a site's Settings/Redirects path.
 *
 * Two design choices verified against real tenant 2026-05-11:
 *
 * 1. `item(where: { path, language })` — Authoring's Query.item only accepts
 *    `where: ItemQueryInput` (not flat path/language args — that's the Edge schema).
 *
 * 2. **Aliased `field(name:)` accessors** for each known Redirect Map field instead
 *    of the heavy `fields(excludeStandardFields, ownFields, withLanguageFallback)
 *    { nodes { name value } }` connection. The connection variant pulls every field
 *    on the item (30+ for SXA pages, including __Sortorder / __Semantics / __Created /
 *    __Source / __Standard values / etc.); the aliased variant pulls only the 5 fields
 *    we use + __Updated. Lighter request, smaller response, simpler decoder.
 *
 * No template-ID filter — returns ALL children. Real-tenant `/Settings/Redirects/` is
 * always a Redirect Maps folder so a filter is unnecessary. Items missing any of the
 * named fields just return `null` value, which decodeWireItem handles.
 */
export const GET_REDIRECTS_FOR_SITE = `
  query GetRedirectsForSite($sitePath: String!) {
    item(where: { path: $sitePath, language: "en" }) {
      name
      itemId
      children {
        nodes {
          itemId
          name
          template { name }
          IncludeVirtualFolder: field(name: "IncludeVirtualFolder") { value }
          PreserveQueryString:  field(name: "PreserveQueryString")  { value }
          RedirectType:         field(name: "RedirectType")         { value }
          PreserveLanguage:     field(name: "PreserveLanguage")     { value }
          UrlMapping:           field(name: "UrlMapping")           { value }
          __Updated:            field(name: "__Updated")            { value }
        }
      }
    }
  }
`

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
  sitePath: string
): Promise<RedirectMapItem[]> {
  const result = await client.mutate("xmc.authoring.graphql", {
    params: {
      query: { sitecoreContextId },
      body: {
        query: GET_REDIRECTS_FOR_SITE,
        variables: { sitePath },
      },
    },
  })

  // DOUBLE .data.data unwrap (mutate against xmc.* module keys — see
  // reference_marketplace_sdk_envelope_authoring_graphql.md).
  const root = result.data?.data as WireChildrenResponse
  const items = root?.item?.children?.nodes ?? []

  const decoded: RedirectMapItem[] = []
  for (const wire of items) {
    const item = decodeWireItem(wire as WireItem)
    if (item) decoded.push(item)
  }

  return decoded
}

