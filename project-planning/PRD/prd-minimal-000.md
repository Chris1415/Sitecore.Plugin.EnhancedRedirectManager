# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-000.md
pairs_with_prd: project-planning/PRD/prd-000.md
generated_at: 2026-05-09T20:30:00Z
run_manifest: project-planning/workflow/run-20260509T191751Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Condensed north-star for implementation. Keeps token use low: agent 08 reads this plus
  the enriched task breakdown only — not the full PRD or architecture doc.
---

## Problem (one short paragraph)

Sitecore content authors, site managers, and admins have no purpose-built UI for redirect operations on XM Cloud. Today it means leaving Pages, opening Content Editor, and editing raw `Settings/Redirects` items by hand. Marketers can't see redirects affecting the page they're editing. Site managers have no per-site totals. Admins have no portable way to promote rules between environments.

## Goal (one short paragraph)

Ship a Sitecore Marketplace **client-side** app with three extension points (Context Panel, Dashboard Widget, Full Page) that performs Redirect Map item CRUD via Authoring GraphQL on the `en` language version, plus JSON import/export keyed by Sitecore item GUID. No external infrastructure beyond Sitecore. Multilingual, analytics, sync-back, and concurrent-edit detection are all deferred to follow-on PRDs.

## Non-negotiables

- **Scaffold:** `sitecore:setup-marketplace-client-side` (Mode A only). No server-side OAuth proxy. No `experimental_createXMCClient`. (ADR-A)
- **Stack:** Next.js App Router, Vitest, Blok. App Router defaults are fine — RSC for static shell, CSR for interactive surfaces.
- **All Sitecore reads/writes via Authoring GraphQL** — single canonical source for redirect rules. No KV, no datastore, no caching layer in MVP. (ADR-B)
- **Three Marketplace extension points** registered via `sitecore:marketplace-sdk-extension-routes`: Context Panel, Dashboard Widget, Full Page.
- **Site discovery via `xmc.sites.list`** (or current SDK equivalent — verified against `node_modules/@sitecore-marketplace-sdk/xmc/*.d.ts`). No GraphQL traversal fallback.
- **MVP language scope = `en` only.** Authoring GraphQL queries and mutations always pass `language: "en"`. (ADR-J)
- **Match by Sitecore item GUID** for import (not by item name). JSON export includes the GUID. (ADR-I)
- **Three import actions only:** create / overwrite / skip. No "merge" action. (ADR-F)
- **Context Panel matching is exact-string only** (source OR target) — regex matching deferred. UI banner is non-dismissible. (ADR-D)
- **`UrlMapping` field encoding:** URL-encoded `source=target` pairs joined by `&`. Round-trip parse/serialize must be lossless and order-preserving. (ADR-H)
- **Tenant identifier:** `tenantId` from Marketplace app context (forward-looking for PRD-001+). (ADR-G)
- **Authoring GraphQL fixtures:** captured from real tenant during architecture phase. Real-tenant captures only — never paraphrased prose. Per rule `40-sdk-contracts`.
- **TDD discipline:** RED before GREEN per rule `30-tdd`. SDK-touching RED tests need independently sourced fixtures.
- **Container enforcement:** code under `products/redirect-manager/site/`. Branch `prd-000`.
- **Accessibility:** WCAG 2.1 AA, keyboard-operable across all three extension points.
- **Browser support:** Chrome / Edge / Firefox / Safari, latest 2 major versions each.
- **Security:** no tokens in localStorage; no credentials in bundle; user input rendered with React's default escaping (no raw-HTML APIs on user data).

## In scope / out of scope (very short)

**In scope:**
- 3 extension points + scaffolding + extension-point registration
- Site / collection picker (via SDK)
- Redirect Map item CRUD via Authoring GraphQL (`en` only)
- Mapping CRUD within `UrlMapping` field (parse / edit / re-serialize)
- Field editing: `RedirectType`, `PreserveQueryString`, `PreserveLanguage`, `IncludeVirtualFolder`
- Context Panel grouped-by-Redirect-Map listing (exact source/target match)
- Dashboard count tiles (item count, mapping count, last-updated)
- JSON import / export keyed by item GUID (3-action conflict resolution)
- Inline validation (empty source/target/Type)
- Friendly error UX with expandable technical details
- Cancel/discard prompt only when there are unsaved changes
- Vitest test stack + host-frame visual smoke
- Blok styling

**Out of scope (PRD-000):**
- Multilingual / per-language CRUD (deferred to PRD-001)
- Usage analytics / Upstash / head-app instrumentation (deferred to PRD-001)
- Sync-back to Sitecore template + template change (deferred to PRD-002)
- Regex-aware Context Panel matching (later PRD)
- Concurrent-edit detection (later PRD)
- Bulk operations (later PRD)
- Live HTTP probing of redirect targets (later PRD)
- Permission-detection runtime gate (verified-not-needed for MVP target tenant)

## Success criteria (3–7 bullets)

- **C1** All three extension points install on a real XM Cloud tenant in approximately 5 minutes via Cloud Portal Test App registration.
- **C2** Host-frame visual smoke (5-axis pixel comparison) passes against the chosen UI variant POC clickdummy on all three extension routes.
- **C3** Real-tenant CRUD round-trip (create → edit → delete a Redirect Map with ≥3 mappings) succeeds end-to-end in <10 s per operation.
- **C4** Real-tenant import/export round-trip (export site A → import into site B with the resulting JSON) succeeds with zero data loss on rules; conflict prompts fire correctly.
- **C5** ≥5-minute editor-driven live walkthrough on a real tenant produces zero unrecoverable errors.
- **C6** Vitest suite is green; all SDK-touching tests use real-tenant captured fixtures.
- **C7** WCAG 2.1 AA accessibility checks pass across all three extension points.

## Key constraints & assumptions

- **A1 — Authoring write permissions verified** for the operator's Cloud Portal session on `Settings/Redirects` items in the target environment (Q-CR-19). No runtime permission check in MVP.
- **A2 — Mapping field name is `UrlMapping` (singular)** — captured from real tenant.
- **A3 — `RedirectType` is a string enum.** `ServerTransfer` is confirmed; 301/302/307 names verified at architecture (OQ-8).
- **A4 — All flag fields (`PreserveQueryString`, `PreserveLanguage`, `IncludeVirtualFolder`) are shared booleans** — same value across all language versions (relevant for PRD-001+ multilingual; just background for MVP).
- **A5 — Site discovery wrapper is available** in `marketplace-sdk-xmc` (Q-CR-24). No fallback path required.
- **A6 — JSON import is per-item, sequential, no rollback** — partial commits are acceptable; per-item summary lists outcomes.
- **A7 — Architecture phase captures real-tenant fixtures BEFORE task breakdown** (Q-CR-25). Lead Developer writes tasks against captured fixtures, not speculative shapes.
- **ADR references** — see `project-planning/ADR/` for ADRs A, B, C, D, F, G, H, I, J. (E is intentionally skipped — multilingual is deferred.)

## Handoff

- **Full PRD:** `project-planning/PRD/prd-000.md` (for humans and upstream agents only — not loaded by agent 08 in normal flow.)
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **ADRs:** `project-planning/ADR/adr-0002-*` through `adr-0010-*` — read by Architect, Lead Developer, QA Specialist; not by agent 08 directly.
