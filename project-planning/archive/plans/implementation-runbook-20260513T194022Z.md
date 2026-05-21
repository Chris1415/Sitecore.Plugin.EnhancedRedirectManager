# Implementation Runbook — PRD-002 V4-aligned redesign

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260513T194022Z.md
generated_at: 2026-05-15T10:30:00Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260513T194022Z.json
source_inputs:
  - products/redirect-manager/project-planning/PRD/prd-minimal-002.md (primary scope/orientation for Developer)
  - products/redirect-manager/project-planning/plans/task-breakdown-20260513T194022Z.md (execution contract — § 4c + 59 tasks + § 9 TDD + § 10 per-task tests)
  - products/redirect-manager/pocs/poc-v1-prd002/ (winning POC — canonical visual reference; 16 files, 6 frames, 58 click targets)
consumed_by:
  - Engineering Team (sub-agent Developer 08, one invocation per tranche T1-T8)
next_input:
  - products/redirect-manager/site/ (implementation target directory)
---

## 1. Implementation Scope

**PRD-002 — V4-aligned visual redesign + one UX evolution.** Adds:

- CSS architecture foundation: `site/styles/elevated.css` (15 V4 design-contract CSS variables + shared utilities), `site/styles/elevated-plumes.css` (Full-Page-only drifting plume backdrop), `site/styles/surfaces.css` (per-surface layouts).
- Mock-data architecture: `site/lib/mocks/preview-data.ts` (`PREVIEW_DATA` constants + `PREVIEW_DATA_ACTIVE` flags) + `PreviewDataBanner` component (ADR-0025).
- Shared utilities: `GradientText`, `DecorativeCta` (toast onClick per ADR-0030), `HoverLiftCard`, count-up animation hook, kinetic letter-reveal helper.
- Full Page redesign: `WorkspaceHero` (marketing-voice headline with gradient-text), `StatStrip` (4 mocked tiles with count-ups), re-skinned map list + detail + all CRUD modals.
- Context Panel redesign + UX evolution: hero `<h1>` count header (`ContextPanelHero`), inline `QuickRedirectForm` (replaces `AddRedirectModal` per ADR-0026/0028; 3-state machine per ADR-0029), re-skinned matched rows.
- Dashboard Widget redesign: 3 real tiles re-skinned + hero stat mock + sparkline mock + 4th tile mock + top-destinations + recently-shipped + footer attribution + Preview Data banner.
- 6 new structural guards (T040-T045): no `#` hex outside `site/app/globals.css`; no Active/Draft strings; `@keyframes` reduced-motion pairing; banner ↔ `data-preview-mock` pairing; no language-count copy; plume-CSS-import-boundary.
- Light + dark mode validated; `prefers-reduced-motion` respected everywhere.
- `AddRedirectModal.tsx` deleted in T6 (ADR-0028); tests re-pointed at `QuickRedirectForm` in T7 (R-12 dedicated tranche).

**Out of scope:** IntroPage `/` (D6); real data wiring for mocks (deferred to follow-on PRD-003 candidate); regex matching; multilingual; analytics; sync-back; new extension points.

## 2. Canonical Inputs

| Input | Path | Role |
|---|---|---|
| **prd-minimal** | `project-planning/PRD/prd-minimal-002.md` | Developer's primary north-star |
| **task breakdown (QA-enriched)** | `project-planning/plans/task-breakdown-20260513T194022Z.md` | Execution contract — § 4c, 59 tasks T001-T059, § 9 TDD, § 10 per-task tests, § 4b cases, § 5 execution order |
| **POC clickdummy (winner)** | `pocs/poc-v1-prd002/` | Canonical visual reference — 16 files, 6 frames, 58 click targets |
| **`node_modules` `.d.ts`** | `site/node_modules/@sitecore-marketplace-sdk/*/dist/**/*.d.ts` | SDK shape citations — but PRD-002 has 0 new SDK calls; all carry from PRD-000 |
| **Sitecore plugin skills** | invoked via Skill tool per task as needed (e.g. `sitecore:blok-components`, `sitecore:blok-theming`, `sitecore:marketplace-sdk-host-frame-testing` for m2 smoke) | Per-concern reference |

**Developer DOES NOT load:** full PRD, architecture document, UI spec text, brain-dump, predecessor PRD-000 task breakdown, PRD-001 cancelled artifacts, V4 source POC (use the refined PRD-002 POC instead). Slim context chain per `.agent/glossary.md`.

## 3. Target Directory Decision

**Target:** `products/redirect-manager/site/`

**Rationale:** Container convention enforced — `site/` already populated with PRD-000 implementation. PRD-002 is **additive** on top of PRD-000 — no new scaffold, no fresh `npx create-content-sdk-app` or `shadcn add`. Existing install continues per ADR-0002.

**Container deviation:** none.

**Git branch:** `prd-002` (off `main`; PRD-000 + PRD-001-cancellation already merged). Verified — currently on `prd-002`.

## 4. Planned Delivery Order

PRD-002 implementation organized into **8 tranches** per task breakdown § 6 + architecture R-12 strategy. Each tranche = one Developer sub-agent invocation + lint/build verification before proceeding.

| Tranche | Epics | Tasks | Goal | Status |
|---|---|---|---|---|
| **T1** | A (CSS foundation) + H (structural guards early) | T001-T009, T040-T045 | `elevated.css` (15 CSS variables + shared utilities), `elevated-plumes.css` (Full-Page-only), `surfaces.css` shells, all 6 structural guards with seed violations (G3) | not started |
| **T2** | B (Mock-data) + C (Shared components) | T010-T020 | `site/lib/mocks/preview-data.ts` + `PREVIEW_DATA_ACTIVE` flags + `PreviewDataBanner` + shared utilities (GradientText, DecorativeCta, count-up hook, letter-reveal helper, hover-lift) | not started |
| **T3** | D (Full Page) | T021-T030 | Full Page redesign: WorkspaceHero, StatStrip, map list + detail re-skin, all CRUD modals re-skinned | not started |
| **T4** | E (Context Panel + UX evolution) | T031-T040 | ContextPanelHero count header, inline QuickRedirectForm (3-state machine per ADR-0029), matched rows re-skin | not started |
| **T5** | F (Dashboard Widget) | T031-T038 (parallel epic) | Dashboard Widget redesign: DashboardHero (mock), Sparkline (mock), TopDestinations (mock), RecentlyShipped (mock), 3 real tiles re-skin | not started |
| **T6** | Cleanup | T054 | Delete `AddRedirectModal.tsx`. **Sequenced AFTER T048 test rewrite** so suite never goes red mid-tranche. | not started |
| **T7** | I (Test rework cascade — DEDICATED) | T046-T053 | Audit class-string assertions; categorize behavior-tests vs anatomy-tests; re-point AddRedirectModal-flow tests at QuickRedirectForm. **R-12 mitigation.** | not started |
| **T8** | G (Reduced-motion audit) + J (Smoke prep + docs) | T054-T059 | Reduced-motion audit; m1-m5 smoke checklists; host-frame smoke recipe; docs/architecture.md + docs/decisions.md updates per `scope_dial.docs_at_ship: full` | not started |

Authoritative execution order is task breakdown § 5 (numbered list of all 59 Task IDs). Tranche boundaries are advisory checkpoints; the dependency graph is the contract.

## 5. Verification Checklist (per tranche)

After each Developer sub-agent completes a tranche, run the three pre-completion-gate checks:

- **Lint** — `npm run lint` from `site/`. Pre-existing baseline (2 warnings from PRD-000 scaffold) tolerated. Any **new** errors fail the gate.
- **Build** — `npm run build` from `site/`. **Non-negotiable.** Strict-TS errors, missing-types, config drift only surface in build.
- **Git status** — `git status --porcelain` clean in `site/`. Untracked files force operator decision (commit / keep-untracked-with-reason / delete).
- **Tests** — `npm run test` (Vitest). All passing. New tests for new behavior per § 9 + § 10.

After all 8 tranches complete: append `implemented` stage_history entry; manifest status → `implemented`.

## 6. Risks To Watch During Implementation

| Risk | Mitigation | Trigger |
|---|---|---|
| **R-12 test-rework cascade volume** (G1) | T046 audit flags class-string-only-no-behavior tests early. T7 is dedicated tranche; budget separately. | T7 audit reveals >50 test files needing class-string updates |
| **R-13 design-token drift** | 15 CSS variables locked at top of `elevated.css` (T001). Structural guard at T040 enforces no-hex. | T1 ships; no drift expected |
| **TDD inversion** (G2) | T007/T008/T013 must be WRITTEN BEFORE their source files (RED-first). § 10 execution notes call out the inversion. | Solo developer must consciously invert; if test isn't first, RED step is implicit |
| **Guard seed-violation discipline** (G3) | Every Epic H guard (T040-T045) has a confirmed-failing seed before guard is "complete." | T40-T045 each verify the seed catches |
| **`backdrop-filter` performance inside iframe** | NFR-R1; profile during /test smoke. Reduce plume blur radius / drop drift if jank. | Operator-observed jank during live walkthrough |
| **Browser-globals hydration** (memory `feedback_hydration_mismatch_pattern`) | Use `useEffect` for all `typeof window` / `matchMedia` / `IntersectionObserver` references. Called out in T011, T012, T025, T033. | SSR/CSR mismatch warning in dev server console |
| **`QuickRedirectForm` test file conflict** (G4) | T025 creates `QuickRedirectForm.test.tsx` (RED); T048 extends with rework | Both Task IDs target the same file |

## 7. Completion Criteria

PRD-002 is `implemented` when:

- All 59 tasks (T001-T059) marked complete in the implementation runbook.
- Lint + build + Vitest test suite all pass on `prd-002` branch.
- Git status clean in `site/`.
- All 6 structural guards passing.
- All 6 smoke gates remain `pending` (operator-driven at `/test`).

`PRD-002` transitions to `tested_pending_smoke` after `/test` runs its checks; transitions to `shipped` after all 6 smoke gates pass at `/ship`.

## 8. What Needs To Be Tested (global testing runbook)

Source: task breakdown § 4b (per-epic important cases), § 9 TDD contract (1,847 words across 11 subsections), § 10 per-task test specifications (59 tasks covered).

### Unit tests
- Mock-data module: `site/lib/mocks/preview-data.ts` typed shape; en-only paths; no Active/Draft string literals; flag toggling semantics.
- Shared utilities: GradientText (light + dark contrast); DecorativeCta toast; count-up hook (reduced-motion gated); letter-reveal helper.

### UI / component tests
- **All 3 surfaces** with full state coverage (default / loading / empty / error / focus / success-toast). PRD-000 patterns extend.
- **New components:**
  - `WorkspaceHero` — gradient headline + decorative CTAs + mock subline
  - `StatStrip` — 4 mock tiles with count-ups (reduced-motion gated)
  - `ContextPanelHero` — count-aware copy (singular/plural)
  - `QuickRedirectForm` — 3-state machine (no-match / single / multi); RedirectType disabled-with-display in add-to-existing; auto-name pattern
  - `DashboardHero` — hero stat count-up; gradient-text headline
  - `Sparkline` — mock data renders; theme-aware accent
  - `TopDestinations` — 5 mock rows, en-only paths
  - `RecentlyShipped` — 3 mock rows; no Active/Draft pills
  - `PreviewDataBanner` — renders when flag true; hides when false
- **Modified components:** all CRUD modals re-skinned; `RedirectMapList` + `RedirectMapDetail` + `ContextPanel` + `DashboardWidget` shells.
- **Runtime contrast assertions** on theme-token UI via `getComputedStyle`.

### Structural tests (Epic H, 6 guards)
1. No `#` hex outside `site/app/globals.css`
2. No Active/Draft strings in JSX
3. Every `@keyframes` reduced-motion-gated
4. Banner ↔ `data-preview-mock` pairing
5. No language-count strings
6. `elevated-plumes.css` imported only by Full Page route

Each guard has a confirmed-failing seed violation per G3.

### E2E / smoke (operator-driven at `/test`)
- **m1** registration — Cloud Portal Test App + 3 extension points
- **m2** `host_frame_smoke` — 5-axis Playwright vs `pocs/poc-v1-prd002/` × 3 variants (light + dark + reduced-motion)
- **m3** `crud_round_trip` — PRD-000 paths + inline QuickRedirectForm
- **m4** `import_export_round_trip` — JSON wizard
- **m5** `live_walkthrough` — ≥5 min covering all surfaces; operator confirms inline ≥ modal efficiency

### Test commands
- `npm run lint` (from `site/`)
- `npm run build` (from `site/`)
- `npm run test` (Vitest — from `site/`)

## Handoff Metadata
- **Canonical run manifest:** `products/redirect-manager/project-planning/workflow/run-20260513T194022Z.json`
- **Implementation target directory:** `products/redirect-manager/site/`
- **Recommended next command:** `/code-review` then `/test` then `/document` then `/ship`
- **Recommended next input file:** task breakdown § 5 execution order (Developer reads + executes)
