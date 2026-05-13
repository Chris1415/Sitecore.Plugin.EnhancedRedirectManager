# ADR-0014: Four-PRD phasing — multilingual CRUD split from analytics + head-app contract

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — multilingual deferred indefinitely; original supersedure of ADR-0004 stands historically)

## Context

ADR-0004 locked a three-PRD phasing plan for Redirect Manager: PRD-000 (en-only CRUD), PRD-001 (multilingual + analytics), PRD-002 (sync-back). PRD-000 shipped on 2026-05-12, validating the en-only MVP and proving the language seam (every Authoring read/write already parametric on `language`).

When `/rubber-ducky` opened the PRD-001 cycle on 2026-05-13, three new realities emerged:

1. **Multilingual is two surfaces, not one.** App-internal multilingual (Full Page picker + per-language CRUD + create-version + Dashboard scoping + import/export schema bump) is purely an app + SDK change. Context Panel multilingual matching, however, requires a parallel head-app resolver contract change — the head-app's runtime resolution must accept a language argument and pick the corresponding redirect. The head-app deliverable is owned outside this app's deployment scope.

2. **Analytics and head-app contract have the same shape of external dependency.** Both require coordination with a head-app deliverable owned by a different party. Bundling them into one PRD (the original PRD-001) means a single head-app slip blocks the entire multilingual story.

3. **Operator's own phasing heuristic applies** (`feedback_phase_per_sdk_surface`): when work has multiple independent install preconditions, split into ship-and-verify phases with a real-tenant smoke gate between phases. Multilingual-CRUD app-internal has one new SDK surface (`xmc.sites.languages`-style) and zero external deliverables. Context Panel multilingual + head-app contract has zero new SDK surfaces but one major external deliverable. Analytics has Upstash + Vercel Marketplace + head-app instrumentation (3 external dependencies).

The original three-PRD plan made sense at the en-only MVP boundary; it bundles concerns that have meaningfully different ship cliffs once the en-only constraint lifts.

## Decision

Reframe the post-MVP roadmap into **four sequential PRDs**, each with a clean external-dependency boundary:

- **PRD-001 — Multilingual CRUD, app-internal only.** Full Page language picker (site-scoped, tenant-wide fallback); language-version CRUD (read, edit, delete-version via `deleteItemVersion` or scope-cut per R-1); create-version flow (empty + copy-from, no name input); per-language `__Display name` editing; two-state UX (no-version vs empty-version); delete-scope safety modal; Dashboard tile language scoping; multi-language JSON bundle (schema `redirect-manager/v2`, no v1 back-compat). Context Panel keeps `en`-only matching with a Pages-aware banner update. **Zero external deliverables.**

- **PRD-002 — Context Panel multilingual + head-app resolver contract.** Context Panel matches in the Pages-host language; head-app resolver picks the correct language at runtime. **Parallel head-app deliverable required.**

- **PRD-003 — Analytics.** Upstash via Vercel Marketplace + head-app instrumentation + Dashboard enrichment (used/unused, broken/healthy, top-5 lists) + per-mapping analytics column. **Multiple external deliverables.**

- **PRD-004 — Sync-back to Sitecore.** Redirect Map template change adds `UsageCount` + `UsageLastSyncedAt` fields; "Sync analytics to Sitecore" button. **Sitecore-side template change required.**

**Hard gate between phases:** real-tenant smoke must pass on the previous PRD before the next opens (carries from ADR-0004 § Decision).

**ADR-0004 superseded** because the three-PRD plan's "multilingual + analytics" bundling does not survive the analysis. ADR-0010 (en-only MVP) is **not** superseded — it was correct at the PRD-000 boundary and PRD-001 fulfills the deferral commitment rather than reversing the decision.

## Consequences

**Easier:**

- PRD-001 ships purely with app + SDK changes — no head-app coordination, no Upstash provisioning, no template change. Cleanest possible ship cliff for the multilingual story.
- Each phase has a single external-dependency profile, making smoke-gate planning honest.
- A head-app slip on PRD-002 cannot block analytics (PRD-003) directly — the operator can re-sequence if priorities shift.
- The natural ordering surfaces — multilingual CRUD before Context Panel multilingual matches the way operators actually adopt: they need to author redirects in their language before they need the panel to surface them.

**Harder:**

- Four PRD cycles instead of three. Process overhead grows by one full cycle.
- PRD-002 ships an "incomplete" multilingual story (CRUD works, Context Panel doesn't match) for the duration between PRD-001 and PRD-002 ship dates. The Pages-aware banner is the operator-visible mitigation; mathematically the gap exists.
- Operators expecting "multilingual" as a single feature will need to understand the phased rollout. README + CHANGELOG must explain.

## Date

2026-05-13
