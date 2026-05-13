# ADR-0019: `addItemVersion` is the canonical Authoring verb for new-language-version creation

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13. The factual finding — `addItemVersion` is the canonical verb with `{itemId, language}` input and `{ item: { itemId, language: { name }, version } }` response — survives in `docs/decisions.md` as durable SDK knowledge for any future multilingual work.)

## Context

PRD-001 § 9 § 10 assumed the new-language-version creation mutation was named `createItemVersion`. The /architect SDK contract verification gate (rule `40-sdk-contracts`) checked the actual Sitecore Authoring GraphQL schema documentation via the `sitecore:sitecoreai-graphql-schemas` skill. The schema documents the verb as **`addItemVersion`**, not `createItemVersion` — a naming convention that aligns with other Sitecore mutation verbs (`addItemVersion`, `addItem`, `addItemLanguage`).

Additionally, the SDK envelope contract for `xmc.authoring.graphql` was clarified during this verification pass:

- **Method:** `client.mutate` (all GraphQL endpoints route through `mutate` in the Marketplace SDK, regardless of whether the underlying GraphQL operation is a query or mutation).
- **Body location:** INSIDE `params` (the params-wrapper trap from `marketplace-sdk-client § 8b` — the body wraps under `params.body`).
- **Unwrap level:** **DOUBLE `.data.data`** for all `xmc.authoring.graphql` operations, including mutations (this corrects an outdated single-unwrap reference in PRD-000's architecture doc; production code in `site/lib/sdk/redirects-write.ts` correctly uses double-unwrap, verified against real tenant 2026-05-11 per memory `reference_marketplace_sdk_envelope_authoring_graphql`).

The verb name is load-bearing across multiple PRD-001 downstream artifacts (FR-5, US-6, US-7, AC-6.1, AC-7.4, ADR-0016 create-version flow). Pinning it in a dedicated ADR prevents drift between the PRD's prose, the task breakdown, the implementation wrapper module, and the test fixtures.

## Decision

- **Canonical verb name:** `addItemVersion`. PRD-001 references to `createItemVersion` are corrected to `addItemVersion`. ADR-0016 amended-in-place to reflect the correction.
- **Wrapper module:** `site/lib/sdk/redirects-version.ts` (new file at /implement) exposes a typed wrapper `addRedirectMapLanguageVersion(itemId, language, sourceVersion?)` that internally calls `xmc.authoring.graphql` with body inside `params` and double-unwraps `.data.data`.
- **Assumed input shape** (pending real-tenant probe at /implement Tranche 1, per architecture § 10 OQ-A1):
  ```graphql
  mutation AddItemVersion($input: AddItemVersionInput!) {
    addItemVersion(input: $input) {
      item { itemId language version }
    }
  }
  # AddItemVersionInput assumed: { itemId: ID!, language: String!, version?: Int (source-version for clone) }
  ```
- **Empty vs copy-from semantics:** for empty start (US-6), call `addItemVersion(input: { itemId, language })` with no `version` arg. For copy-from (US-7), if probe-time discovery confirms a source-version arg is supported, pass `version: <latest-source-language-version>` resolved via the `versionsByLanguage` discovery query (architecture § 5.4). If not supported, fall through to the two-step flow (architecture § 5.2 / ADR-0021 rollback state machine).
- **Honest absence:** `AddItemVersionInput` field names + payload `item` subfields are NOT declared in `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts` — that file only types the SDK envelope (`Authoring.GraphqlData`/`Authoring.GraphqlResponse`), not the GraphQL operations carried inside. The Authoring schema confirms the verb exists. Exact input shape captured at /implement Tranche 1 against `CHAH DevEx Journey / PROD` (or operator-supplied multilingual tenant per PRD OQ-7).
- **Decision rule on probe failure** (per PRD § 13 R-1): if `addItemVersion` is absent or has an input shape that cannot be resolved after one round of trial-and-error against the real tenant, US-6 + US-7 + US-11-create are cut from PRD-001 and the PRD re-scopes to read-and-edit on existing versions only. **No silent fallback.**

## Consequences

**Easier:**

- Naming aligned with Sitecore's documented mutation surface — no future surprise when an external tool or reference cites `addItemVersion`.
- Wrapper module `lib/sdk/redirects-version.ts` is cleanly scoped — single responsibility, one file, easy structural-guard enforcement.
- The double-unwrap convention is now explicit for the version-mutation family alongside the existing PRD-000 mutations.

**Harder:**

- PRD-001 prose carries the verb-correction footnote; readers who skim might miss the rename. ADR-0016 amend-in-place + this ADR jointly document the change.
- The honest-absence on input shape means /implement Tranche 1 has a hard capture pass before any RED tests can be written against the version-creation flow. The capture pass is bounded (~30 minutes per architecture § 10) and PRD-001 R-1 decision rule is in place.

## Date

2026-05-13
