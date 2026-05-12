# Implementation Runbook — Redirect Manager (PRD-000)

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260509T191751Z.md
generated_at: 2026-05-10T14:30:00Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260509T191751Z.json
source_inputs:
  - products/redirect-manager/project-planning/PRD/prd-minimal-000.md (primary scope for Developer 08)
  - products/redirect-manager/project-planning/plans/task-breakdown-20260509T191751Z.md (execution contract — § 4c + § 9 + § 10)
  - products/redirect-manager/pocs/poc-v1/ (canonical visual reference)
consumed_by:
  - Engineering Team — phased execution (8 tranches)
next_input:
  - products/redirect-manager/site/
---

## 1. Implementation Scope

PRD-000 ships the **Redirect Manager** as a Sitecore Marketplace **client-side** app (Mode A only) with three Cloud Portal extension points (`xmc:pages:contextpanel` → `/context-panel`, `xmc:dashboardblocks` → `/dashboard-widget`, `xmc:fullscreen` → `/full-page`). MVP is **`en` only**, **Sitecore Authoring GraphQL is the single canonical data source**, and there is **no Upstash, no head-app dependency, no analytics in MVP**. 67 tasks across 10 epics (A–J), enriched by QA Specialist (07) with § 9 TDD contract + § 10 per-task tests + 12 assumed-shape divergence-detection assertions.

## 2. Canonical Inputs

- **`prd_minimal`:** `products/redirect-manager/project-planning/PRD/prd-minimal-000.md`
- **`task_breakdown`:** `products/redirect-manager/project-planning/plans/task-breakdown-20260509T191751Z.md` (§ 4c carries all architectural boundaries; Developer never opens architecture file)
- **`qa_report`:** `null` — the enriched task breakdown IS the QA contract
- **`selected_poc_path`:** `products/redirect-manager/pocs/poc-v1/` — canonical visual reference; Developer opens HTML/CSS files when implementing matching components

## 3. Target Directory Decision

- **Container:** `products/redirect-manager/site/` — confirmed per manifest `implementation.target_directory`. Branch `prd-000` is checked out. `site/` does not yet exist; the Tranche 1 scaffold will create it via the canonical Marketplace Client-Side scaffold command (per ADR-0002 + § 4c-3).
- **All source code lands under `site/`.** Planning artifacts at `project-planning/` are never touched by `/implement`.

## 4. Planned Delivery Order — phased / tranched (operator-chosen 2026-05-10)

The operator chose a **phased / tranched** approach over a single big-bang implementation run. Rationale: ADR-0013 (revised) plus operator's `feedback_assumed_shapes_progressive_capture` working mode — the architecture flagged 9 unverified SDK shapes; surfacing divergences early through small validated tranches is cheaper than carrying them through a 67-task implementation and discovering at smoke. Each tranche is autonomous within itself; **between tranches the run stops for an explicit operator gate** (real-tenant smoke when applicable, otherwise lint+build+test verification only).

### The 8 tranches

| # | Tasks | What | Real-tenant value | Closes |
|---|---|---|---|---|
| 1 | T001–T007 + T062 (skeleton) | Scaffold via `setup-marketplace-client-side` quickstart, three extension-point routes, root `notFound()`, Blok install, theme.css with dark-mode `--primary-foreground` override, Vitest+jsdom, structural-guard skeleton | Dev server boots; 3 routes load; root → 404 | Foundation. No SDK shapes resolved yet. |
| 2 | T008–T015 | SDK plumbing — typed wrappers + Provider + mock-client harness; RED tests vs assumed-shape fixtures | **Capture point #1** — register Cloud Portal Test App, boot in real tenant, log first-contact responses, capture deltas | 5 of 12 fixtures (`page-context`, `sites-list`, `collections-list`, `application-context`, Authoring read of children); closes OQ-A (`pageInfo.url` vs `.route`) by inspection |
| 3 | T016–T021 | Domain layer — UrlMapping parse/serialize (property-based), schema, diff, matcher, types, RedirectType enum | None (pure modules) | All unit tests green |
| 4 | T022–T034 | Context Panel + Dashboard Widget — full state coverage per `pocs/poc-v1/` | Real-tenant smoke: Context Panel listing populates on Pages page open; Dashboard tiles populate on a site | Read-side validation across Context Panel + Dashboard |
| 5 | T035–T040 | Full Page read paths — two-pane layout, collection→site picker, virtualized redirect-map list (`react-virtuoso`) | Real-tenant smoke: Full Page navigation collection → site → list | Read surface fully validated |
| 6 | T041–T046 | Full Page CRUD — create/edit/delete forms, mapping CRUD with `@dnd-kit` drag-reorder, error UX | **Capture point #2** — create/edit/delete a Redirect Map on real tenant | 6 of 12 fixtures (`redirect-map.{create,update,delete}.json`, `redirect-type-enum.json`); closes OQ-C (boolean rep) and ADR-0009 caveat (`createItem` accepts caller-supplied `id`?) |
| 7 | T047–T054 | Import / Export — JSON export with item GUIDs, 4-step import wizard with 3-action conflict picker | Real-tenant smoke: export site A → import site B with conflict prompts | Cross-environment promotion validated |
| 8 | T055–T067 | Polish + smoke harness + install runbook — WCAG 2.1 AA polish, host-frame visual smoke harness at `/test`, Cloud Portal registration runbook, smoke checklists for `/test` to consume | Final gate — 5 smoke gates flip from `pending` to `passed` in manifest | Ready for `/code-review` and `/test` |

### Gate cadence

- **End-of-tranche default action:** run lint + build + test suite. Commit to git on `prd-000`. Update runbook § 8 with the actual delivery shape. **Stop and wait** for operator confirmation.
- **Capture-point gates (Tranches 2 and 6):** in addition to lint+build+test, the operator runs the real-tenant smoke before approving the next tranche. Captured fixtures land in `products/redirect-manager/site/tests/fixtures/graphql/` and the divergence-detection RED tests in `lib/sdk/*` re-run green against the new fixtures. If divergence is genuine (the assumed shape was wrong), the affected `lib/sdk/*` code AND its tests are updated in the same tranche before we advance. Friction-log entry recorded with severity `medium`.
- **Surface-smoke gates (Tranches 4, 5, 7):** operator opens the relevant extension point on a real tenant after the tranche commits and confirms the surface behaves. No fixture capture expected unless something diverges.

### Parallelization within tranches

All tranches run as a single sequential Developer sub-agent — `task_breakdown_style: tdd` per the manifest forbids in-tranche parallelism (TDD requires sequential RED→GREEN→REFACTOR per the breakdown's § 9 contract).

## 5. Verification Checklist (per-tranche end-of-pass gate)

Before marking a tranche complete:

- [ ] `npm run lint` — no new errors (pre-existing baseline tolerated when recorded)
- [ ] `npm run build` — succeeds (HARD STOP on failure per `/implement` step 9b — strict-TS / config-drift errors only surface here)
- [ ] `npm run test` — full suite green; new tests cover the tranche's tasks per § 10
- [ ] `git status --porcelain` — no untracked files in `site/` (HARD STOP on untracked: operator decides commit / keep-with-reason / delete per `/implement` step 9c)
- [ ] Runbook § 8 (What Needs To Be Tested) updated with what the tranche added to the test suite
- [ ] `stage_history` entry appended for the tranche (substage of `implementation_in_progress`)
- [ ] Tranche-specific real-tenant smoke executed when the tranche table requires it

## 6. Risks To Watch During Implementation

- **R-Impl-1 — Scaffold registry drift.** The `npx shadcn@latest add quickstart-with-client-side-xmc.json` command pulls a pinned bundle; if the registry has bumped React / Next / SDK versions since architecture, lint or build may fail on first run. Per rule `50-scaffold.mdc`: HARD STOP and report — do not hand-write `package.json` from training data.
- **R-Impl-2 — `--primary-foreground` Nova preset re-collapse.** Blok ships the buggy white-on-lavender pair. The override in `app/globals.css` (post-T007) must be carried verbatim into both the `@media (prefers-color-scheme: dark)` block AND the `.dark` block. Structural test T062 enforces this.
- **R-Impl-3 — `createItem` GUID-supply rejection.** ADR-0009 hopes for caller-supplied `id` on cross-environment imports. If Authoring rejects it, "create" actions on fresh-tenant imports mint new GUIDs. T065 closes by inspection — log the response `itemId` and compare to the requested one. If different, file a follow-on PRD task to handle it (option: ID-remap table; option: accept the limitation and document).
- **R-Impl-4 — Page-context field name (`url` / `route` / `path`).** UI v1 § 1.6 chose `pageInfo.url`; T013 RED-4 logs both. If real tenant returns `null` for `url` but populates `route`, switch the matcher key in the same tranche. The test contract pattern (RED-3 divergence-detection in T010 / T013) makes this a 2-line fix.
- **R-Impl-5 — Boolean representation in Authoring write mutations.** OQ-C: `"0"/"1"` vs `"true"/"false"` vs raw boolean. T012's RED-1 cannot pin the format until capture; T065 closes it. Per `feedback_assumed_shapes_progressive_capture` this is acceptable — fix when surfaced, don't gate on it now.
- **R-Impl-6 — Token budget for sub-agents.** The Lead Developer hit a usage limit on the manifest-write step. Phased tranches mitigate this — each tranche is 6–13 tasks, well within a single sub-agent's budget. If a tranche still hits the limit, the Team Lead resumes it via SendMessage.
- **R-Impl-7 — Iframe handshake / mkcert traps.** `sitecore:marketplace-sdk-testing-debug` documents the Chrome Local Network Access trap. First Tranche 1 dev-server boot may need mkcert root CA installed. Surface to operator if `https://localhost:3000` doesn't resolve.

## 7. Completion Criteria

- All 8 tranches committed to `prd-000` with passing lint + build + test on each.
- All 12 assumed-shape annotations replaced with captured real-tenant fixtures (Capture Point #1 closes 5; Capture Point #2 closes 6; the RedirectType enum closes alongside #2).
- All 5 smoke gates in the manifest's `smoke_outcomes` flipped from `pending` to either `passed` or `pass_with_caveats` (Tranche 8).
- Cloud Portal Test App registration runbook complete in `site/docs/architecture.md` (T063).
- Host-frame visual smoke harness at `/test` runs against `pocs/poc-v1/` (T064).
- Run manifest `status: implemented` (or `implementation_in_progress` if a tranche surfaces a blocker that needs a follow-on PRD).

## 8. What Needs To Be Tested (global testing runbook)

Source: enriched task breakdown § 9 (TDD & quality contract) + § 10 (per-task test specs). The QA Specialist already produced a comprehensive contract; this section restates the global picture for `/test` orientation.

### Unit tests

- **`lib/url-mapping/{parse,serialize}.test.ts`** — round-trip parse/serialize with property-based testing via `fast-check`. Covers: random valid URL paths, paths with `=` and `&` (must `%3D`/`%26`-encode), already-encoded characters, mixed encoding case, empty list, single-pair, large lists. ADR-0008 invariant: `parse(serialize(parse(x))) === parse(x)` for any `x`.
- **`lib/import-export/{schema,diff}.test.ts`** — Zod schema validation of `redirect-manager/v1`; rejection of unknown major versions; GUID-keyed diff classifier (new vs conflicting) per ADR-0009.
- **`lib/match/context-panel-matcher.test.ts`** — exact-string match against parsed `UrlMapping` rows per ADR-0005; explicitly does NOT evaluate regex source rows.
- **`lib/redirects/redirect-type-enum.test.ts`** — RedirectType enum values; introspection-fallback shape (assumed-shape: `redirect-type-enum.json`).
- **`lib/sdk/{sites,authoring,page-context,application-context}.test.ts`** — typed-mock + fixture-driven request/response/unwrap tests for all 9 SDK calls. Each carries an `assumed-shape: <fixture>` annotation; divergence-detection assertions fail loudly when captured fixture shape differs from assumed.

### UI / component tests

- **Context Panel:** all 6 states (default, loading, empty, error, focus, success-toast); modal state machine (pick map → fill form for both existing-map and create-new-map paths); inline edit/delete; persistent regex banner is non-dismissible.
- **Dashboard Widget:** 4 states (default, loading, empty, error); 3 stat tiles render correctly; footnote present.
- **Full Page:** 2-pane layout above 960px / tabbed below; collection→site picker drives list; virtualized redirect-map list scrolls smoothly at 30 items / 500 mappings; create/edit form (RedirectType empty initially, three flag toggles, mappings list with drag-reorder); delete confirmation modal; friendly error UX with expandable technical details.
- **Import wizard:** 4-step wizard (upload → schema validate → preview → apply+summary); per-conflict 3-action picker; bulk action; disabled-confirm-until-resolved; collapsible diff per item; final summary with per-item outcomes.
- **Theme contract:** runtime contrast assertion that `--primary-foreground` resolves to a dark token in dark mode; structural test T062 enforces the override.
- **Accessibility:** `axe-core` assertions on every component; focus-order assertions; visible focus styles; sr-only live regions for state changes.

### Structural tests (T062)

- No raw-HTML React injection on user data anywhere in `site/` (the unsafe React prop is forbidden via lint + structural assertion).
- No `outline: none` without a replacement focus style.
- Only `lib/sdk/*` and `components/providers/marketplace.tsx` import `@sitecore-marketplace-sdk/*` (SDK boundary lock).
- `--primary-foreground` override present in both dark blocks of `app/globals.css`.
- Three extension routes registered; root `/` returns `notFound()`.

### Integration / E2E

- **Host-frame visual smoke at `/test` (T064):** 5-axis pixel comparison vs `pocs/poc-v1/` for all 3 extension routes — passes per ADR-driven smoke definition in PRD § 12.
- **Real-tenant CRUD round-trip checklist (T065):** create → edit → delete a Redirect Map with mappings on a real tenant, manually executed; documents the 6 fixture captures from Capture Point #2.
- **Real-tenant import/export round-trip checklist (T066):** export from site A, import into site B, verify zero rule loss + 3-action conflict picker fires correctly.
- **Live walkthrough checklist (T067):** ≥5-minute editor-driven exploration on real tenant produces zero unrecoverable errors.

### Test commands

- `npm run test` — full Vitest suite (unit + UI).
- `npm run test -- <pattern>` — filtered.
- `npm run test -- --run` — single-pass for CI.
- `npm run lint` — Next.js scaffold default + Blok overrides per `sitecore:setup-marketplace-client-side` § Lint+Badge fixes.
- `npm run build` — static-rendered Next.js bundle.
- `npm run typecheck` — `tsc --noEmit` strict.

## Handoff Metadata
- Canonical run manifest: `products/redirect-manager/project-planning/workflow/run-20260509T191751Z.json`
- Implementation target directory: `products/redirect-manager/site/`
- Recommended next command (tranche-by-tranche): tranche-1 Developer sub-agent → operator gate → tranche-2 Developer sub-agent → … → tranche-8 → `/code-review` → `/test` → `/document` → `/ship`
- Recommended next input file: `products/redirect-manager/project-planning/plans/task-breakdown-20260509T191751Z.md` (the Developer reads only this + `prd-minimal-000.md`)
