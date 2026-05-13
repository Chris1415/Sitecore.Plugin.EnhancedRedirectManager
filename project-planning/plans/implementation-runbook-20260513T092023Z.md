# Implementation Runbook — PRD-001 Multilingual CRUD

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260513T092023Z.md
generated_at: 2026-05-13T17:41:53Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260513T092023Z.json
source_inputs:
  - products/redirect-manager/project-planning/PRD/prd-minimal-001.md (primary scope/orientation for Developer)
  - products/redirect-manager/project-planning/plans/task-breakdown-20260513T092023Z.md (execution contract — § 4c + 42 tasks + § 9 TDD + § 10 per-task tests + § 5 execution order)
  - products/redirect-manager/pocs/poc-v1-prd001/ (winning POC clickdummy — canonical visual reference; opened by Developer for look-and-feel)
consumed_by:
  - Engineering Team (sub-agent Developer 08, multiple invocations across tranches)
next_input:
  - products/redirect-manager/site/ (implementation target directory)
---

## 1. Implementation Scope

**PRD-001 — App-internal multilingual CRUD layered on PRD-000.** Adds:

- Language picker (site-scoped, tenant-wide fallback) in Full Page surface; localStorage-persisted, shared across Full Page + Dashboard.
- Language-aware map list with current-language `__Display name` + fallback to item name; binary filled/outlined dot indicator per row (V1 Topbar Pilot pattern).
- Per-language CRUD on existing language versions (read / edit mappings / edit shared flags with hint / delete).
- Create-version flow — two paths (empty + copy-from-language), no name input, source picker filtered to non-empty versions, rollback state machine for partial failure.
- Per-language `__Display name` editing in detail header via inline pencil affordance.
- Delete confirmation modal with explicit radio (strict no-default; single-version edge case has informational note).
- Dashboard Widget — language-scoped tiles + "Languages with content" listing tile.
- Context Panel — Pages-aware banner reading `pageInfo.language` (behavior unchanged — still en-only matching).
- Import/export schema bump to `redirect-manager/v2` — single multi-language bundle; v1 rejected.

**Out of scope** (deferred to PRD-002/003/004): Context Panel multilingual matching, head-app resolver contract, analytics, sync-back, regex matching, bulk multi-language ops.

## 2. Canonical Inputs

| Input | Path | Role |
|---|---|---|
| **prd-minimal** | `project-planning/PRD/prd-minimal-001.md` | Developer's primary north-star (non-negotiables, in/out scope, success criteria) |
| **task breakdown (QA-enriched)** | `project-planning/plans/task-breakdown-20260513T092023Z.md` | Execution contract — § 4c (7 subsections), 42 tasks, § 9 TDD contract, § 10 per-task tests |
| **POC clickdummy (winner)** | `pocs/poc-v1-prd001/` | Canonical visual reference — 14 HTML frames + `click-targets.md` |
| **`node_modules` `.d.ts`** | `site/node_modules/@sitecore-marketplace-sdk/*/dist/**/*.d.ts` | SDK shape citations per rule `40-sdk-contracts` (no paraphrasing) |
| **Sitecore plugin skills** | invoked via Skill tool — `sitecore:marketplace-sdk-{client,xmc,extension-routes,testing-debug}`, `sitecore:blok-{setup,components,theming}`, `sitecore:sitecoreai-graphql-schemas` | SDK conceptual entry; `.d.ts` is the binding contract |

**Developer DOES NOT load:** full PRD, architecture document, UI specs V2/V3, brain-dump, predecessor PRD-000 task breakdown. Slim context chain per `.agent/glossary.md`.

## 3. Target Directory Decision

**Target:** `products/redirect-manager/site/`

**Rationale:** Container convention enforced — `site/` already exists with PRD-000 implementation (`app/`, `components/`, `lib/`, `tests/`, `package.json`, `next.config.mjs`, etc.). PRD-001 is **additive** on top of PRD-000 — no new scaffold, no fresh `npx create-content-sdk-app` or `shadcn add quickstart-with-client-side-xmc`. The existing PRD-000 install continues. Confirmed by `ls site/` showing populated source tree.

**Container deviation:** none.

**Git branch:** `prd-001` (off `main`; PRD-000 already merged via PR#1 on 2026-05-12). Verified — currently on `prd-001`.

## 4. Planned Delivery Order

PRD-001 work is organized into **9 tranches** per task breakdown § 6 milestones. Tranche 1 is a hard operator-supervised gate; Tranches 2-9 are largely autonomous (Developer sub-agents with occasional checkpoints).

| Tranche | Tasks | Goal | Owner | Status |
|---|---|---|---|---|
| **1** | T001 | Real-tenant probe pass closing OQ-A1..A5 — captures `addItemVersion`/`deleteItemVersion` shapes, field-versioning matrix, `__Display name` accessor variant, `versionsByLanguage` cost. **Operator-supervised, ~30 min against `CHAH DevEx Journey / PROD` (or operator-supplied multilingual tenant).** Per PRD R-1: scope-cuts trigger if verbs absent. | Operator + Developer scaffold | **PENDING** |
| **2** | T002, T003, T008-T013, T039 | SDK layer — `languages.ts`, `redirects-version.ts` (with rollback state machine), extensions to `redirects-read.ts` + `redirects-write.ts`, fixture validation harness | Developer 08 | not started |
| **3** | T004-T006, T007 | Picker state + hook + storage helpers + `LanguagePicker.tsx` | Developer 08 | not started |
| **4** | T014-T020, T021-T022 | Map list + detail (multilingual) + display-name editor + version-aware data fetching + two-state UX | Developer 08 | not started |
| **5** | T023-T026 | Create-version flow + rollback toast + partial-version banner | Developer 08 | not started |
| **6** | T027-T028 | Delete scope safety modal + strict no-default structural guard | Developer 08 | not started |
| **7** | T035-T037, T037b | Dashboard language scoping + Context Panel Pages-aware banner + route wiring | Developer 08 | not started |
| **8** | T029-T034 | Import/export schema v2 — Zod schema, v1 detection, serializer, parser, import wizard preview, action-fan-out | Developer 08 | not started |
| **9** | T040-T042 | Tests + structural guards + smoke prep — final pass, structural guard extensions, smoke checklist, docs polish | Developer 08 | not started |

Authoritative execution order is task breakdown § 5 (numbered list of all Task IDs). Tranche boundaries are advisory checkpoints; the dependency graph is the contract.

## 5. Verification Checklist

Per command § 9 pre-completion validation gate — three checks per tranche:

- **Lint** — `npm run lint` from `site/`. Pre-existing baseline (2 warnings from PRD-000 scaffold) tolerated. Any **new** errors fail the gate.
- **Build** — `npm run build` from `site/`. Non-negotiable. Strict-TS, missing-types, config-drift surface only in build.
- **Git status** — `git status --porcelain` clean in `site/`. Untracked files force operator decision (commit / keep-untracked-with-reason / delete).
- **Tests** — `npm run test` (Vitest). All passing. New tests for new behavior per § 9 + § 10.
- **Structural guards** — per task T040+: SDK boundary lock, delete-radio strict no-default, picker-key shape, envelope discipline, no-silent-fallback.

After each tranche completes its checks, append a `stage_history` entry. Final tranche (Tranche 9) appends the `implemented` entry.

## 6. Risks To Watch During Implementation

| Risk | Mitigation | Trigger |
|---|---|---|
| **T001 capture surprises — `addItemVersion` absent** | PRD R-1 decision rule cuts US-6/US-7/US-11-create. Adjust task breakdown § 6 milestones inline; modal copy in `CreateVersionModal.tsx` collapses to single path. | Probe error / missing verb in schema introspection |
| **T001 capture surprises — `deleteItemVersion` absent** | PRD R-1 decision rule cuts US-8(a). Modal copy switches to single-option variant per AC-8.4. ADR-0018 + ADR-0021 amend in place. | Probe error / missing verb |
| **Field-matrix surprise (OQ-A4)** | ADR-0015 + architecture § 4.3 amend in place. Schema v2 `shared` vs `languages.<code>` block split adjusts. FR-21 hint copy adjusts. | `itemTemplate.fields.nodes[].versioning` differs from assumed matrix |
| **`__Display name` literal accessor rejected (OQ-A3)** | Fall back to templateFieldId GUID. Document in `docs/decisions.md`. | `updateItem` returns field-not-found error |
| **`versionsByLanguage` query expensive (OQ-A5)** | Switch to lighter summary query; cache in component. | Probe timing >2s |
| **POC drift — clickdummy disagrees with operational reality** | POC is canonical for look-and-feel. When implementation reveals POC drift, escalate per `feedback_assumed_shapes_progressive_capture` and amend POC + spec. | Visual contradiction surfaced during implementation |
| **Picker state localStorage cross-tab race** | Accept last-write-wins per ADR-0017 Consequences. Document; not a bug. | Cross-tab observed behavior |
| **Schema v2 import wizard density** | Per PRD R-4, defer per-language-per-map action sub-axis (OQ-6). Map-level action fans out across languages-in-bundle. | Wizard UI gets cramped at /architect or /implement |

## 7. Completion Criteria

PRD-001 is `implemented` when:

- All 42 tasks (T001-T042 + T037b) marked complete in the implementation runbook OR explicitly cut per R-1 scope-rule outcomes.
- Lint + build + Vitest test suite all pass on `prd-001` branch.
- Git status clean in `site/`.
- Structural guards passing (SDK boundary lock, delete-radio strict no-default, picker-key shape, envelope discipline, no-silent-fallback).
- All 6 smoke gates (`m1`, `m2`, `m3`, `m4`, `m5`, `host_frame_smoke`) remain `pending` — they transition at `/test` (operator-driven).

`PRD-001` transitions to `tested_pending_smoke` after `/test` runs its checks; transitions to `shipped` after all 6 smoke gates pass at `/ship`.

## 8. What Needs To Be Tested (global testing runbook)

Source: task breakdown § 4b (per-epic important cases), § 9 TDD contract, § 10 per-task test specifications.

### Unit tests
- SDK wrappers (`lib/sdk/languages.ts`, `redirects-version.ts`, extensions to `redirects-read.ts` + `redirects-write.ts`) — happy + failure paths; fixture provenance citations.
- Picker state (`lib/storage/picker-state.ts`) — default-resolution chain, invalid-state recovery, key shape.
- Schema v2 (`lib/import-export/schema-v2.ts`, `serialize-v2.ts`, `parse-v2.ts`, `v1-detect.ts`) — Zod validation, oversize bundle rejection, ISO-8601 normalization, v1 rejection.
- Conflict tree builder + diff logic for multilingual import.
- `__Display name` accessor variant resolver (literal vs templateFieldId per T001 outcome).

### UI / component tests
- **All 3 surfaces** with full state coverage (default / loading / empty / error / focus / success-toast). Existing PRD-000 patterns extend.
- **New components:**
  - `LanguagePicker.tsx` — enumeration, default-resolution, dirty-edit lock (AC-3.5), error states.
  - `LanguageVersionIndicator.tsx` — filled vs outlined dot.
  - `CreateVersionModal.tsx` — two-path UX, hover states, US-6 + US-7 coverage.
  - `CopyFromSourceModal.tsx` — source picker filtering to non-empty versions, OK/Cancel.
  - `DeleteScopeConfirmModal.tsx` — strict no-default radio enforcement, single-version edge case.
  - `DisplayNameEditor.tsx` — Enter/Save commits, no blur-commit, Escape/Cancel discards, placeholder when empty.
  - `PartialVersionBanner.tsx` — ADR-0021 rare-failure surface + cleanup CTAs.
- **Modified components:** `FullPage` route, `DashboardWidget`, `ContextPanel` banner, `ImportRedirectMapModal` (schema v2 + per-language preview columns), `RedirectMapDetail` + `RedirectMapList`.
- **Runtime contrast assertions** on all theme-token-painted UI (per § 9.5 — `getComputedStyle` + contrast helper, NOT `toHaveClass(...)` alone).

### Structural tests
- SDK boundary lock (existing — extend to new wrappers).
- `@blok/*` token discipline (no invented hex / no non-Blok component names).
- Delete-radio strict no-default (`DeleteScopeConfirmModal` has no `defaultChecked`).
- `localStorage` key shape (`redirect-manager.language.<tenantId>.<siteId>` regex match).
- `xmc.authoring.graphql` envelope discipline (DOUBLE `.data.data`, body INSIDE `params`).
- No silent fallback in `redirects-version.ts` for missing `deleteItemVersion`.

### E2E / smoke (operator-driven at `/test`)
- **m1** — Language picker enumerates site-scoped languages on real tenant; tenant-wide fallback verifies.
- **m2** — Per-language CRUD round-trip <10s for `en`, `de`, and one additional language.
- **m3** — Create-version both paths (empty + copy-from) end-to-end on real tenant.
- **m4** — Multi-language import/export round-trip with all language versions reconstituted.
- **m5** — Live walkthrough ≥5 min covering all surfaces, zero unrecoverable errors.
- **`host_frame_smoke`** — Playwright visual-diff comparing live host-frame render against `pocs/poc-v1-prd001/` on the 5 axes (layout, typography, color, component anatomy, state fidelity). Served via `npx serve pocs/poc-v1-prd001/` to work around Playwright MCP's `file://` rejection.

### Test commands
- `npm run lint` (from `site/`)
- `npm run build` (from `site/`)
- `npm run test` (Vitest — from `site/`)

## Handoff Metadata
- **Canonical run manifest:** `products/redirect-manager/project-planning/workflow/run-20260513T092023Z.json`
- **Implementation target directory:** `products/redirect-manager/site/`
- **Recommended next command:** `/code-review` then `/test` then `/document` then `/ship`
- **Recommended next input file:** task breakdown § 5 execution order (Developer reads + executes)
