# redirect-map-list.json — capture provenance

**Capture status:** CAPTURED 2026-05-11 from real tenant `xmc-sitecoresaa516c-chahdevexjoee24-proda41d.sitecorecloud.io` via the Tranche 2 capture-helper UI at `/full-page` (Capture Point #1).

**Source query:** `lib/sdk/redirects-read.ts → GET_REDIRECTS_FOR_SITE`
**Source endpoint:** `https://edge-platform.sitecorecloud.io/v1/authoring/graphql?sitecoreContextId=...` (Marketplace SDK gateway, `client.mutate('xmc.authoring.graphql', ...)`)
**Site path used:** `/sitecore/content/solo/solo-website/Settings/Redirects`

## What this fixture covers

- **Two children** under the Redirects folder:
  - `My Redirect Map` — a fully-populated Redirect Map item (all five fields + `__Updated`).
  - `Test Group` — an item where every Redirect Map field is `null` (either an empty stub or a different template). Decoder must handle this — `decodeWireItem` falls back to defaults (`RedirectType: 'ServerTransfer'`, empty mappings).
- The captured wire response confirms:
  - Boolean fields serialize as `"1"` for true and `""` (empty string) for false. Decoder accepts both `"1"`/`"true"` for true; everything else is false.
  - `__Updated` uses Sitecore compact format `yyyyMMddTHHmmssZ` (e.g. `20260509T183802Z`) — **NOT** ISO-8601. Tranche 3 / display code must parse this.
  - `result.data.extensions.tracing` (Apollo / Hot Chocolate instrumentation) sits alongside `result.data.data`. The decoder drills into `result.data.data` so `extensions` is naturally ignored. The fixture preserves a stub `extensions.tracing` block so tests can verify the decoder doesn't accidentally consume it.

## SDK envelope contract verified by this capture

- `body` lives INSIDE `params` on the `client.mutate` call (not at the top level).
- Response is double-`.data.data` unwrap — outer is the SDK / hey-api wrapper, inner is the GraphQL response body.
- See: memory `reference_marketplace_sdk_envelope_authoring_graphql.md` + updated `sitecore:marketplace-sdk-client` § 8b and `sitecore:marketplace-sdk-xmc` § 3.

## Pending — Tranche 6 write surface

The READ envelope is now verified. The WRITE surface (`createItem` / `updateItem` / `deleteItem` mutations against `xmc.authoring.graphql`) is the next capture point — runs at the start of Tranche 6 (Full Page CRUD). Expected discoveries:

- Exact Authoring mutation verb names (`createItem` vs `create_item` vs other).
- Boolean field representation on writes — does the write surface accept `"1"`/`""` (matching the read) or does it require `true`/`false` literals? (OQ-C closure on the write side.)
- Whether `createItem` accepts a caller-supplied `id` (ADR-0009 cross-environment-import idempotency).
- `RedirectType` enum exact values beyond `ServerTransfer` (OQ-8) — confirmed valid values must echo back in the response of an `updateItem` round-trip.
- `UrlMapping` field on writes: must use the same URL-encoded `source=target` format joined by `&` (ADR-0008). The serializer in `lib/sdk/redirects-write.ts → serializeMappings` already produces this.
