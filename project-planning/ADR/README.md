# Architecture Decision Records

This directory holds ADRs for this product workspace.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| ADR-0001 | Use ADRs as architecture backbone | Accepted |
| ADR-0002 | Marketplace SDK Mode A scaffold (no server-side OAuth proxy) | Accepted |
| ADR-0003 | Authoring GraphQL is the single canonical source for redirect rules | Accepted |
| ADR-0004 | Three-PRD phasing — pure CRUD, then multilingual+analytics, then sync-back | Superseded by ADR-0014 |
| ADR-0005 | Context Panel matching is exact-string only in MVP | Accepted |
| ADR-0006 | Import conflict resolution — per-item action picker with three actions | Accepted |
| ADR-0007 | Tenant identifier for cross-environment scoping = `tenantId` | Accepted |
| ADR-0008 | `UrlMapping` field encoding contract — URL-encoded `=`/`&`-delimited pairs | Accepted |
| ADR-0009 | Import matching by Sitecore item GUID (not by item name) | Accepted |
| ADR-0010 | MVP language scope = `en` only; multilingual deferred to PRD-001 | Accepted |
| ADR-0011 | Extension-point identifiers, route URLs, and root-route policy | Accepted |
| ADR-0012 | List virtualization — `react-virtuoso` | Accepted |
| ADR-0013 | Real-tenant fixture-capture workflow | Accepted |
| ADR-0014 | Four-PRD phasing — multilingual CRUD split from analytics + head-app contract | Superseded by ADR-0023 |
| ADR-0015 | JSON import/export schema v2 — multi-language bundle, no v1 back-compat | Superseded by ADR-0023 |
| ADR-0016 | Create-version flow — two paths (empty + copy-from), no name input | Superseded by ADR-0023 |
| ADR-0017 | Language picker state — localStorage-persisted, shared across surfaces | Superseded by ADR-0023 |
| ADR-0018 | Delete scope safety — confirmation modal with explicit radio, strict no-default | Superseded by ADR-0023 |
| ADR-0019 | `addItemVersion` is the canonical Authoring verb for new-language-version creation | Superseded by ADR-0023 |
| ADR-0020 | Language enumeration prefers site-scoped `Sites.Site.languages`; tenant-wide fallback | Superseded by ADR-0023 |
| ADR-0021 | Copy-from create-version partial-failure rollback state machine | Superseded by ADR-0023 |
| ADR-0022 | Picker-state `localStorage` key shape — v1 contract + future-migration namespace policy | Superseded by ADR-0023 |
| ADR-0023 | Cancel PRD-001 multilingual — stock Redirect Map template `UrlMapping` is SHARED | Accepted |

## Next number

Use the next free four-digit id after the highest existing `adr-*.md`.
