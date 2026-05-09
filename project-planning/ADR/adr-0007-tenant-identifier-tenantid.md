# ADR-0007: Tenant identifier for cross-environment scoping = `tenantId`

## Status

Accepted

## Context

PRD-001 will introduce Upstash-backed analytics keyed by `{tenant}:{site}:{mapId}:{mappingIndex}`. The "tenant" component must be a stable identifier the Marketplace app context can produce AND the head application can read from its own runtime configuration.

The Marketplace app context exposes at least three candidate identifiers:

- **`tenantId`** — stable per Sitecore tenant. One key namespace per tenant; sites partition under it. Most portable across environments.
- **`contextId`** — Edge / preview site context; tighter scope but changes more frequently when site contexts are created/recreated.
- **`organizationId`** — Cloud Portal organization; coarser than tenant; multiple tenants per org would collapse together under one analytics namespace.

The decision is forward-looking from PRD-000's perspective (no analytics in MVP), but locking it now means architecture is consistent and the head app's environment variable contract can be defined upfront. PRD-000 captures `tenantId` as a constant for the run even though it isn't used for storage yet (FR-4).

## Decision

The tenant identifier used for cross-environment analytics scoping (and any future external-store keying) is **`tenantId`** sourced from the Marketplace app context.

Rationale: `tenantId` is the stable, per-Sitecore-tenant identifier with the right granularity for our use case. `contextId` over-shards (changes too often). `organizationId` under-shards (multiple tenants would collide under one org).

The head application reads its corresponding tenant identifier from a config or environment variable when writing analytics — coordinated with this app via documentation.

## Consequences

**Easier:**
- One stable namespace per Sitecore tenant. Site partitioning is a clean prefix beneath it.
- Cross-environment promotion (dev → staging → prod) preserves analytics keys when tenant identifiers are environment-specific (which is the common case).
- The head app's analytics writer has a single env var to populate — no hidden coupling.

**Harder:**
- `tenantId` is recorded in PRD-000 as a constant the app reads but doesn't yet use. A reader of the code in PRD-000 may wonder why it's plumbed through. ADR-0007 + the FR-4 cross-reference makes the rationale traceable.
- If a future PRD discovers `tenantId` is not exposed in some Marketplace context (e.g. a new extension point), this ADR may need superseding.

## Date

2026-05-09
