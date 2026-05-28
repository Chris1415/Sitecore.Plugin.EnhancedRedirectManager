# Implementation Runbook

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260520T080000Z.md
generated_at: 2026-05-20T16:45:00Z
prd_id: PRD-004
run_manifest: project-planning/workflow/run-20260520T080000Z.json
source_inputs:
  - project-planning/PRD/prd-minimal-004.md  (Developer slim-context orientation)
  - project-planning/plans/task-breakdown-20260520T080000Z.md  (executable contract — 2,136 lines, 72 tasks)
  - pocs/poc-v1-prd004/  (visual contract per ui-design § 7)
consumed_by:
  - Developer (08) — implements T2-T5 build tranches under this command; T1 + T6 are operator-driven probes/smokes
  - /test — uses § 8 below as global testing runbook
next_input:
  - products/redirect-manager/site (implementation target)
---

## 1. Implementation Scope

Feature-scoped delta on existing Marketplace app (predecessor PRD-003 merged at `9d58a6f`). Two co-shipping capabilities, **zero new SDK surfaces**:

1. **`EditRowModal`** — Blok dialog replacing inline row editing in `RedirectMapDetail` (ADR-0043). Owns ONLY source + destination + Pattern/Regex mode toggle + regex helpers. Map-level fields stay in existing map-settings UI.
2. **Test surface** — secondary "Test" tab on Full Page, two-column layout, sticky scope picker (Collection → Site → Map(s)) + URL + locale + Test button on left; trace cards on right. Local `simulate()` port of upstream Content SDK `RedirectsProxy`.

Tranche skeleton honored exactly from PRD § 12 + task-breakdown § 5: T1 (probe — operator) → T2 (simulator) → T3 (modal + helpers; T18 carry-over CRUD hard gate) → T4 (Test surface + scope picker) → T5 (a11y + theme + guards) → T6 (smoke — operator).

## 2. Canonical Inputs

**Slim context for Developer (08) — load these ONLY:**

- `project-planning/PRD/prd-minimal-004.md` — scope/orientation/non-negotiables (problem, goal, in/out scope, success criteria, key constraints)
- `project-planning/plans/task-breakdown-20260520T080000Z.md` — execution contract; § 4c carries all architectural boundaries; § 9 + § 10 carry TDD discipline + per-task test specs; § 5 carries execution order
- `pocs/poc-v1-prd004/` — visual contract (per ui-design § 7); open `index.html`, the 5 `rowedit-*.html` modal overlays, the 7 `test-*.html` two-column frames, and the 3 `test-scope-*.html` picker states as visual reference

**Do NOT load:** full PRD, architecture document, UI design spec. The task breakdown § 4c was sized to make these unnecessary; if the Developer feels they need them, that is an escalation signal (gap in § 4c) — follow the escalation protocol.

## 3. Target Directory Decision

**Target:** `products/redirect-manager/site/`

**Container convention enforced:** `site/` exists with source files (`app/`, `components/`, `lib/`, `hooks/`, `package.json`, etc.). No deviation needed.

**Existing system landmarks (read but do NOT redesign):**

- `site/lib/sdk/sites.ts:30-50` — `listSites()` + `listCollections()` with verified shapes; reused by `ScopePicker` (T031/T032/T033)
- `site/lib/sdk/redirects-read.ts` — existing map-loading helper; reused by `MapsPicker` (T034)
- `site/lib/sdk/redirects-write.ts` — existing save helper; reused by `EditRowModal` Save action (T018 + T019)
- `site/lib/url-mapping/{parse,serialize}.ts` — existing UrlMapping field encoding/decoding (ADR-0008); T1 probe verifies regex char-class preservation
- `site/lib/domain/types.ts` — `RedirectType` enum (3 values)
- `site/components/...RedirectMapDetail.tsx` — existing inline edit affordance; T17 rewires its row click handler; T17b (or paired with T17) deletes the inline-edit JSX

**New files PRD-004 introduces (per task breakdown § 4c-5):**

| File | Tranche | Task(s) |
|------|---------|---------|
| `site/lib/redirects/proxy-simulator.ts` + `simulator-types.ts` | T2 | T006-T015 |
| `site/lib/redirects/__fixtures__/upstream-cases.json` | T2 | T012 (via extractor) |
| `site/lib/redirects/__fixtures__/tenant-cases.json` | T2 | T011 (from T1 captures) |
| `site/scripts/extract-upstream-fixtures.ts` | T2 | T010 (ADR-0042) |
| `site/hooks/use-staggered-render.ts` | T4 | T028 |
| `site/components/EditRowModal.tsx` | T3 | T016-T026 (incl. T018 carry-over CRUD gate) |
| `site/components/full-page/TestSurface.tsx` | T4 | T030 |
| `site/components/full-page/TraceCardStack.tsx` + `TraceCard.tsx` + `ResultCard.tsx` + `EmptyState.tsx` | T4 | T037-T038 |
| `site/components/full-page/ScopePicker.tsx` (or 3 separate pickers) | T4 | T031-T034 |
| `site/lib/test-surface/scope-picker-state.ts` | T4 | T029 |

## 4. Planned Delivery Order

Tranche-sequential. Within a tranche, follow § 5 execution order from the task breakdown (TDD pairing: RED scaffold `Txxxa` precedes GREEN implementation `Txxx`).

| # | Tranche | Tasks | Type | Hard gate |
|---|---------|-------|------|-----------|
| 1 | **T1 — Probe** | T001-T005 | operator-driven capture | **GREEN before T2 starts** (any character-class FAIL → file Tranche 0 fix task against `lib/url-mapping/{parse,serialize}.ts` before T2) |
| 2 | T2 — Simulator + fixtures | T006-T015 (+ RED scaffolds T008a, T009a, T012a, T013a) | build | Upstream-fixture parity GREEN before T16 starts (M2 100% parity) |
| 3 | T3 — Modal + helpers | T016-T026 (+ RED scaffolds T018a, T019a-T024a) | build | **T018 carry-over CRUD smoke GREEN before T19+ starts** (R8b mitigation) |
| 4 | T4 — Test surface | T027-T041 (+ RED scaffolds T027a, T028a, T029a, T031a-T039a) | build | All US-T0/T1/T2 ACs GREEN before T5 starts |
| 5 | T5 — A11y + theme + guards | T042-T046 | build | All structural guards GREEN before T6 starts |
| 6 | **T6 — Smoke** | T047-T049 | operator-driven smoke | M3 closure with response-policy branching (≥80% pass → shipped; <80% → shipped_with_caveats; parity-bug → hard-stop) |

**Pipeline-mode execution model:** Developer (08) is spawned per-tranche (or per-task-group within a tranche) AFTER its predecessor tranche's hard gate is GREEN. Operator runs T1 + T6 directly with this runbook as guidance.

## 5. Verification Checklist

Before `/implement` declares this run `implemented`:

- [ ] T1 capture file present at `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` with per-character-class PASS/FAIL matrix and upstream SHAs
- [ ] All T2-T5 GREEN tasks complete (every `Txxx` paired with its `Txxxa` RED that fails before, GREEN after)
- [ ] `npm run lint` from `site/` — no new errors vs pre-PRD-004 baseline (pre-existing warnings tolerated)
- [ ] `npm run build` from `site/` — GREEN; strict-TS clean
- [ ] `npm test` from `site/` — full suite GREEN, including all new RED-then-GREEN test specs from § 10 of task breakdown
- [ ] `git status --porcelain` from `site/` — no untracked source files (every new file either `git add`ed or explicitly `keep-untracked-with-reason`d)
- [ ] T18 carry-over CRUD parity smoke (modal CRUD = byte-identical to prior inline edit) recorded as PASS in runbook § 8
- [ ] T6 real-tenant smoke walkthrough recorded in `project-planning/smoke/smoke-prd-004-<timestamp>.md` with ≥80% URL prediction match per M3

## 6. Risks To Watch During Implementation

| Risk | Mitigation in this run |
|------|------------------------|
| **R1** — existing CRUD strips regex chars | T1 hard gate; T0 fix-first if any class fails |
| **R2** — simulator drifts from upstream | T2 fixture-test parity GREEN gate; ADR-0042 extractor reproducible |
| **R3** — catastrophic backtracking hangs UI | T009a + T013a tests assert 100ms per-row + 3s wall-clock caps fire correctly |
| **R8b** — modal CRUD diverges from prior inline edit | T018 carry-over CRUD smoke is a HARD GATE before T19+ |
| **Hydration safety** (PRD-003 V-1) | Every new component task in T3/T4 has `useEffect` guard for browser globals; Vitest cannot catch — Playwright smoke at T046 is the gate |
| **Theme + a11y** assertions class-string-only | T5 mandates `getComputedStyle()` runtime assertions for contrast; keyboard nav assertions for a11y |

## 7. Completion Criteria

Implementation is complete when:

1. All 72 tasks have an `outcome: completed` entry (or explicit `skipped` with rationale for any descoped MVP-deferable affordances — chips / sample tester per brain-dump D-009)
2. All RED tests are GREEN (no `.skip()` calls left in the suite)
3. The verification checklist (§ 5 above) is fully ticked
4. `stage_history` contains entries for `implemented` with `outcome: completed`
5. The operator has reviewed the diff via `/code-review` and signed off

## 8. What Needs To Be Tested (global testing runbook)

This section is the single project-level reference for "what needs to be tested" — `/test` reads it to drive automated and manual verification.

### Unit tests (scope: every new module under `site/lib/redirects/` + `site/hooks/` + `site/lib/test-surface/`)

- **`proxy-simulator.ts`** — fixture-parameterized test runner against `__fixtures__/upstream-cases.json` (100% pass per M2) AND `__fixtures__/tenant-cases.json` (≥80% pass per M3); per-helper tests for `isRegexOrUrl()` (must replicate `.slice(0,-1)` quirk verbatim), `getRedirectPatternRegex()`, `escapeNonSpecialQuestionMarks()`, `mergeURLSearchParams()`, `areURLSearchParamsEqual()`, `runTimedTest()` (100ms cap fires within 150ms tolerance)
- **`scope-picker-state.ts`** — 6 localStorage scenarios: persist round-trip; tenantId mismatch → reset; persisted collectionId missing → cascade reset; schema version mismatch → reset; corrupted JSON → reset; cascading invalidation on Collection/Site change
- **`use-staggered-render.ts`** — yields N cards over 40ms intervals; `prefers-reduced-motion: reduce` short-circuits to immediate full render

### UI / component tests (scope: every new component under `site/components/` + `site/components/full-page/`)

- **`EditRowModal.tsx`** — opens on row click (T018 carry-over CRUD smoke gate); mode toggle defaults to Pattern on every open; save-time validation (invalid regex → block save with inline error; capture-group reference exceeds groups → block save); inline hint surfaces when manual mode disagrees with `isRegexOrUrl()` auto-detect; dismiss with unsaved-changes confirmation when source/destination differ; **structural guard: no RedirectType / IncludeVirtualFolder / PreserveQueryString / PreserveLanguage strings in source** (per ADR-0043)
- **`TestSurface.tsx`** — two-column layout sticky at viewport ≥768px; scope-picker accordion collapse below 768px; URL parses both absolute + path+query; Test button disabled until scope and URL valid
- **`ScopePicker.tsx`** (or `CollectionPicker` + `SitePicker` + `MapsPicker`) — cascading invalidation; loading skeleton; error + retry; stale-localStorage inline message; reuses `lib/sdk/sites.ts` + `redirects-read.ts` (zero new SDK surfaces)
- **Trace cards** (`TraceCard.tsx`, `ResultCard.tsx`, `EmptyState.tsx`) — render each pipeline stage (pre-filter / normalize / candidates / evaluate-row / substitute / flag-effects / dispatch); ResultCard accent border + http-code chip + deep-link CTA; EmptyState pre-fills sample URL when scope is filled

### E2E tests (scope: critical user flows)

- **Test → Manage deep-link** — operator runs a Test that matches; clicks "Open this rule in Manage →"; tab switches to Manage; `RedirectMapDetail` scrolls to the parent map; `EditRowModal` opens pre-focused on that row (per ADR-0041 forwardRef imperative handle)
- **Trace persistence across tab toggles** — operator runs a Test; clicks Manage; clicks back to Test; previous trace cards still rendered (state lifted to `FullPage` per ADR-0041)
- **Modal CRUD round-trip** (T018) — operator clicks row → modal opens → edits source + destination → Save → modal closes → `RedirectMapDetail` reflects updated row → reopens modal → values match what was saved (byte-identical to pre-PRD-004 inline-edit persistence)

### Regression

- Full pre-PRD-004 test suite must pass (PRD-000 CRUD; PRD-002 V4 visual surfaces; PRD-003 publish + job tracking)
- `RedirectMapDetail` row layout unchanged from pre-PRD-004 (only row click handler rewired)
- Existing Authoring GraphQL helpers (`listSites`, `listCollections`, `redirects-read`, `redirects-write`) called with byte-identical shapes

### Host-frame Playwright smoke (T046)

- 5-axis comparison vs winning POC at `pocs/poc-v1-prd004/`:
  - Light + Dark + Reduced-motion (3 axes)
  - Test tab two-column layout matches `test-matched.html` / `test-unmatched.html`
  - `EditRowModal` overlay matches `rowedit-pattern.html` / `rowedit-regex.html` / `rowedit-save-error.html`
- Per the framework's POC rule: every named click target from `click-targets.md` lands on its named post-state frame; no conflated drilldowns

### Test commands

- Unit + UI: `cd site && npm test` (Vitest)
- Build: `cd site && npm run build`
- Lint: `cd site && npm run lint`
- E2E (when configured): `cd site && npm run e2e` (Playwright; host-frame smoke gate)

## Handoff Metadata

- Canonical run manifest: `project-planning/workflow/run-20260520T080000Z.json`
- Implementation target directory: `site/`
- Recommended next command: `/code-review` after `/implement` completes; then `/test`; then `/ship`
- Recommended next input file: code-review report — auto-generated by `/code-review`
