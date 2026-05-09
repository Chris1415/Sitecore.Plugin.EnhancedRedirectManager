# ADR-0004: Three-PRD phasing — pure CRUD, then multilingual+analytics, then sync-back

## Status

Accepted

## Context

The original concept brief bundled Sitecore CRUD, multilingual support, usage analytics (via Upstash + head-app instrumentation), and Sitecore-side sync-back of consolidated counters into a single MVP. Three of those four features carry independent install preconditions:

- **Multilingual** depends on a Sitecore SDK wrapper (or a fallback Authoring GraphQL `languages` query) that may behave differently than expected.
- **Analytics** depends on Vercel Marketplace + Upstash provisioning AND a parallel head-app instrumentation deliverable owned by the stakeholder.
- **Sync-back** depends on a Sitecore template change (adding `UsageCount` + `UsageLastSyncedAt` fields), which is a platform-level change, not an app deployment.

Bundling these into one MVP creates a release where any one of those preconditions can block the others. It also fights the working principle that 3+ new SDK surfaces (or, by extension, 3+ independent install dependencies) should be split into ship-and-verify phases (memory: `feedback_phase_per_sdk_surface`).

The user explicitly chose during /create-prd discovery to defer multilingual to PRD-001 (Q-D2 area), defer analytics to PRD-001 (mid-discovery scope refinement), and defer sync-back to PRD-002 (concept-brief decision D18).

## Decision

Adopt three sequential PRDs:

- **PRD-000 (this PRD) — MVP — Pure CRUD.** Three Marketplace extension points; Authoring GraphQL CRUD on Redirect Map items in `en` only; site/collection picker; JSON import/export. **No external infrastructure beyond Sitecore.** Ships standalone.
- **PRD-001 — Multilingual + Analytics.** Multilingual / per-language CRUD via SDK-driven content-language enumeration; Upstash via Vercel Marketplace; head-app instrumentation as a precondition; Dashboard widget enrichment (used vs unused, broken vs healthy, top-5 lists); per-mapping analytics column. (Whether multilingual and analytics travel together or split into PRD-001 / PRD-002 is decided at PRD-001 discovery.)
- **PRD-002 — Sync-back to Sitecore.** Redirect Map template change (`UsageCount`, `UsageLastSyncedAt` or final names); "Sync analytics to Sitecore" button; optional inclusion of synced counter in JSON export.

**Hard gate between phases: real-tenant smoke must pass on the previous PRD before the next opens.**

## Consequences

**Easier:**
- MVP install is trivial — no external infrastructure, no Sitecore template changes, no head-app dependency.
- Each phase has a tight verification loop on a single concern.
- Post-MVP discoveries on multilingual and analytics inform PRD-001 design instead of getting shoehorned mid-flight.
- Schema-drift risk is contained per phase: if PRD-000 reveals an Authoring mutation surprise, only the CRUD scope iterates, not the whole app.

**Harder:**
- Three separate PRD discovery / architecture / task-breakdown / implement / test / ship cycles. Process overhead is real.
- Operators see a "phase 1 only" app first; the analytics empty state in the Dashboard Widget must clearly communicate "redirect counts only — usage analytics ship in a follow-on release."
- Single-language MVP may feel limited to multi-locale tenants. Counter-balanced by the explicit Phase 2 commitment and UI banner.

## Date

2026-05-09
