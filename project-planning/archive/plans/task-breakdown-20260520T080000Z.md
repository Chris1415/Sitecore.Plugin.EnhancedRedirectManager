# Development Execution Plan — PRD-004 (Regex Source Mode + Test Surface)

---
document_type: task_breakdown
artifact_name: task-breakdown-20260520T080000Z.md
generated_at: 2026-05-20T14:45:00Z
prd_id: PRD-004
run_manifest: project-planning/workflow/current-run.json
source_inputs:
  - project-planning/PRD/prd-004.md
  - project-planning/PRD/prd-minimal-004.md  (Developer 08 orientation; Lead Dev 06 used full PRD)
  - project-planning/architecture/architecture-20260520T080000Z.md  (post-write amendment block is authoritative)
  - project-planning/ui-design/ui-design-20260520T080000Z-v1.md
  - project-planning/ADR/  (ADR-0038, 0039, 0040, 0041, 0042, 0043 + carry-forward 0002, 0003, 0008, 0022, 0023, 0024, 0027)
  - pocs/poc-v1-prd004/  (visual contract per spec § 7)
consumed_by:
  - QA Specialist (07) enriches §§ 4b, 9, 10 in place
  - Developer Code Monkey (08) implements from this file + prd-minimal-004.md only
next_input:
  - project-planning/plans/qa-report.md  (or, if QA edits in place: this same file with §§ 9/10 populated)
---

## 1. Implementation Overview

PRD-004 is a **feature-scoped delta** on an existing Marketplace app (predecessor PRD-003 already merged at commit `9d58a6f`). It adds two co-shipping capabilities:

1. **`EditRowModal`** — a Blok dialog that replaces the existing inline row editing in `RedirectMapDetail` (ADR-0043). Owns only **source + destination + Pattern/Regex mode toggle + regex helpers**. Map-level fields (`RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage`) stay where they are.
2. **Test surface** — a "Test" tab on the Full Page workspace. Two-column layout: sticky left rail with cascading `ScopePicker` (Collection → Site → Map(s)) + URL input + locale dropdown + Test button; scrollable right column with trace cards from a local `simulate()` port of the upstream `RedirectsProxy`.

**Zero new SDK surfaces. Zero Sitecore data-model changes. Zero new extension-point registrations.** The simulator is a pure-TypeScript local port of the Content SDK proxy algorithm, kept in 100% parity with upstream test fixtures (ADR-0038, M2). Regex safety via dual time-cap (ADR-0039: 100ms per row + 3s wall-clock). Mode is transient UI state (ADR-0040). Test-surface state lifts to `FullPage` so the Test→Manage deep-link can conditionally unmount `TestSurface` without losing trace state (ADR-0041). Upstream fixtures are extracted by a committed AST-walking script (ADR-0042). `EditRowModal` replaces inline editing entirely (ADR-0043).

The plan honors the PRD § 12 tranche skeleton exactly: **T1 (probe) → T2 (port simulator) → T3 (modal + carry-over CRUD smoke FIRST, then helpers) → T4 (Test surface) → T5 (a11y + theme + structural guards) → T6 (smoke)**. Each tranche is one PR-sized commit train; tasks within a tranche follow a clean Depends-on graph.

## 2. Epics

| Epic | Scope | Tranche home |
|------|-------|--------------|
| **E1 — Tenant regex round-trip probe** | Verify the existing CRUD encoder/decoder preserves every regex character class on save/read; capture upstream SHAs into the simulator header | T1 |
| **E2 — Simulator library + fixture parity** | Local port of upstream `RedirectsProxy`; types; AST extractor; upstream-fixtures + tenant-fixtures; parameterized test runner | T2 |
| **E3 — `EditRowModal` + regex authoring** | New modal replaces inline editing; carry-over CRUD smoke; mode toggle; snippet library; capture-group chips; sample-URL tester; save-time validation; inline hint | T3 |
| **E4 — Full Page Test tab + Test surface** | Tab control; two-column layout; `ScopePicker` (3 cascading selectors); localStorage; URL parsing; Test wiring; trace cards; result card; empty state; copy-as-JSON; lifted state; deep-link | T4 |
| **E5 — A11y + theme + structural guards** | WCAG 2.1 AA audit; dark/light/system theme parity; reduced-motion; no-hex + semantic-token-only + focus-management + map-level-field-not-in-modal guards | T5 |
| **E6 — Real-tenant smoke** | Operator-driven walkthrough comparing simulator output vs. tenant Edge; smoke-evidence file; mismatch follow-up tasks if <80% | T6 |

## 3. Feature Breakdown

The breakdown below is grouped by **Tranche → Task**. Every task carries `Task ID`, `Title`, `Description`, `Expected Output`, `Depends on`.

---

### Tranche T1 — Real-tenant regex round-trip probe (HARD GATE)

T1 is a **test tranche**, not a build tranche. Its purpose is to verify the existing `lib/url-mapping/parse.ts` + `serialize.ts` round-trips every regex character class through the Sitecore Authoring + Preview pipeline without character loss. If any class fails, a Tranche 0 fix task is filed against the encoder/decoder and sequenced before T2 starts.

---

- **Task ID:** T001
- **Title:** Author T1 regex fixture rows in the live tenant
- **Description:** Using the existing Redirect Manager Full Page UI (PRD-000 inline edit), create one Redirect Map under a test site dedicated to T1 probes (or reuse an existing test-only map). Author 8 mapping rows covering every regex character class the simulator must support:
  1. anchors only — `^/products$` → `/catalog`
  2. groups (capturing + non-capturing) — `^/blog/(.+)/(?:legacy)$` → `/blog/$1`
  3. escapes — `\\.html?$` → `/static$0` (test escape preservation; `\\.` `\\d` `\\s` `\\w`)
  4. quantifiers — `^/items/[0-9]{4,6}$` → `/products/$0` (covers `?`, `+`, `*`, `{N}`, `{N,M}`)
  5. character classes — `^/users/[a-zA-Z0-9_-]+$` → `/profiles/$0` (covers `[a-z]`, `[^x]`)
  6. alternation — `^/(news|press|media)/(.+)$` → `/announcements/$2`
  7. pattern mode (control case) — `/old-page` → `/new-page`
  8. mixed — `^/legacy/[a-z]+/(.+)?$` → `/archive/$1`
- **Expected Output:** Tenant capture notes pasted into `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` § "Authored rows" — one section per row with: authored-source, authored-target, Sitecore item GUID, expected behavior on round-trip. Operator records observed-source and observed-target after re-loading the map (T002).
- **Depends on:** none

---

- **Task ID:** T002
- **Title:** Verify round-trip preservation per character class
- **Description:** Re-load the T1 probe map(s) via the Full Page Manage tab (or by calling `listRedirectMaps(client, sitecoreContextId, sitePath)` in a scratch script). For each of the 8 rows from T001, diff the authored-source / authored-target against the round-tripped values. Mark **PASS** if byte-identical; **FAIL** with the diff if not. Test classes: anchors (`^`, `$`), capturing groups `(`, `)`, non-capturing `(?:`, escapes `\\.`, `\\d`, `\\s`, `\\w`, `\\?`, quantifiers `?`, `+`, `*`, `{N}`, `{N,M}`, char classes `[a-z]`, `[^x]`, alternation `|`.
- **Expected Output:** Per-character-class PASS/FAIL matrix appended to `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` § "Per-character-class matrix". If any FAIL, the file ends with an explicit "T0 BLOCKER" callout naming the failing class + which side (encoder or decoder) appears to strip the character (based on whether the loss is on serialize → write OR on read → parse).
- **Depends on:** T001

---

- **Task ID:** T003
- **Title:** Capture upstream commit SHAs for `redirects-proxy.ts` + `utils.ts`
- **Description:** Visit upstream GitHub `Sitecore/content-sdk` on the `dev` branch (the canonical branch per PRD source_inputs). Capture the current commit SHA for:
  - `packages/nextjs/src/proxy/redirects-proxy.ts`
  - `packages/core/src/tools/utils.ts`
  Record the SHA per file, the retrieval timestamp (ISO-8601 UTC), and the GitHub permalink (raw + blob). These will be pasted into the `proxy-simulator.ts` header comment in T013.
- **Expected Output:** SHA + permalink + timestamp triples appended to `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` § "Upstream SHA capture".
- **Depends on:** none

---

- **Task ID:** T004
- **Title:** Stage upstream source files locally for the extractor
- **Description:** Copy the upstream `redirects-proxy.test.ts` file content to `site/lib/redirects/__fixtures__/_upstream-source.ts` and gitignore it via a `.gitignore` rule at `site/lib/redirects/__fixtures__/.gitignore` (`_upstream-source.ts`). The committed `upstream-cases.json` is the artifact that ships; the source is for reproducible extraction only (T010 / ADR-0042). Note in the file's leading comment: do NOT commit; regenerated from upstream at T2 start; SHA recorded in `proxy-simulator.ts` header.
- **Expected Output:** `site/lib/redirects/__fixtures__/_upstream-source.ts` (gitignored, locally present on the build machine) + `site/lib/redirects/__fixtures__/.gitignore`.
- **Depends on:** T003

---

- **Task ID:** T005
- **Title:** Close T1 gate or file T0 fix-first tasks
- **Description:** Review the T002 per-character-class matrix. If all classes PASS, mark `smoke_outcomes.tranche_1_regex_roundtrip_probe.outcome = "passed"` in the run manifest with `recorded_at` + `evidence = "project-planning/captures/tranche-1-regex-roundtrip-20260520.md"`. If any class FAILED, **stop the tranche graph** and file new tasks `T005a`, `T005b`, ... under a virtual Tranche 0 against the encoder or decoder side; T006 (T2 entry) does not start until T0 is green. The operator must explicitly approve any T0 fix before it lands on the simulator-port path.
- **Expected Output:** Run-manifest update (smoke_outcomes + stage_history entry) AND either: (a) closure note pasted into `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` § "Gate decision" with the word **PASS** and the timestamp, OR (b) T0 task list in the same file under "T0 follow-ups" with new task IDs + scope.
- **Depends on:** T002, T003, T004

---

### Tranche T2 — Port simulator + types + fixture extractor + parameterized tests

T2 is a **build tranche**. It produces the simulator library, the type system, the AST-walking fixture extractor (ADR-0042), the fixture files, and a parameterized test runner that fails RED on every imported upstream case until the simulator is complete.

---

- **Task ID:** T006
- **Title:** Scaffold `proxy-simulator.ts` with header + exports stub
- **Description:** Create `site/lib/redirects/proxy-simulator.ts` with:
  - The header docblock from architecture § 2.1 — fill `<SHA filled by T2>` with the T003 captures (one line per upstream file); fill `Retrieved:` with the T003 ISO timestamp; cite ADR-0038 + ADR-0039 + ADR-0040 + ADR-0042 by ID.
  - An empty exported `async function simulate(input: SimulationInput): Promise<SimulationTrace>` that throws `new Error("simulate() not yet implemented — RED phase")`.
  - An exported `isRegexOrUrl(source: string): "regex" | "url"` stub that throws.
  - Inline type definitions for `SimulationInput`, `SimulationRule`, `SimulationTrace`, `SimulationStage` (discriminated union), `SimulationResult` per architecture § 4.2. Reuse `RedirectType` from `@/lib/domain/types`.
- **Expected Output:** `site/lib/redirects/proxy-simulator.ts` (new file) with header + types + stubs that compile under `tsc --noEmit`.
- **Depends on:** T005

---

- **Task ID:** T007
- **Title:** Define `SimulationStage` discriminated union (exhaustive)
- **Description:** Within `proxy-simulator.ts`, ensure the `SimulationStage` discriminated union covers every kind produced by the simulator (per architecture § 4.2): `'pre-filter'`, `'normalize'`, `'candidates'`, `'evaluate-row'`, `'substitute'`, `'flag-effects'`, `'dispatch'`, `'diagnostic-incomplete'`. Each variant includes the exact fields from the architecture spec. Add a TypeScript helper `assertNeverStage(s: never): never { throw ... }` to be used by UI switch-renderers (`TraceCard.tsx`) to get exhaustive-check at compile time.
- **Expected Output:** Type definitions in `proxy-simulator.ts` exporting `SimulationStage`, `SimulationResult`, `assertNeverStage`.
- **Depends on:** T006

---

- **Task ID:** T008
- **Title:** Port upstream helpers verbatim — `isRegexOrUrl` + `escapeNonSpecialQuestionMarks` + `mergeURLSearchParams` + `areURLSearchParamsEqual` + `getRedirectPatternRegex`
- **Description:** Open the staged `_upstream-source.ts` (T004) side by side with the upstream `utils.ts` (T003 SHA pinned). Port each helper line-for-line — semantics must be byte-identical to upstream. **CRITICAL:** `isRegexOrUrl` includes a `.slice(0, -1)` quirk that strips the last character before its URL-shape test — replicate verbatim, do NOT "fix" (ADR-0038). Each ported helper gets a JSDoc reference to the upstream line range it ports.
- **Expected Output:** Helpers added to `proxy-simulator.ts` as exported functions with JSDoc upstream-line citations. `isRegexOrUrl` and `getRedirectPatternRegex` are exported (UI `EditRowModal` will reuse `isRegexOrUrl` for the mode-mismatch hint per architecture R4).
- **Depends on:** T007

---

- **Task ID:** T009
- **Title:** Port `runTimedTest` regex-safety wrapper (ADR-0039)
- **Description:** Add `async function runTimedTest(regex: RegExp, candidate: string): Promise<'match' | 'no-match' | 'timeout'>` to `proxy-simulator.ts`. Implementation: `Promise.race([Promise.resolve(regex.test(candidate)).then(m => m ? 'match' : 'no-match'), sleep(100).then(() => 'timeout' as const)])`. The 100ms is the per-row cap. Inline comment cites ADR-0039 + FR-S4.
- **Expected Output:** `runTimedTest` exported from `proxy-simulator.ts`.
- **Depends on:** T008

---

- **Task ID:** T010
- **Title:** Implement AST-walking upstream fixture extractor (ADR-0042)
- **Description:** Create `site/scripts/extract-upstream-fixtures.ts` (new file). Use the TypeScript Compiler API (`typescript` is already a devDep) to:
  1. Parse `site/lib/redirects/__fixtures__/_upstream-source.ts` (gitignored, staged in T004).
  2. Walk the AST collecting every `it('description', () => { ... })` (or `test(...)`) block.
  3. For each block, extract the input redirects array, the request URL + locale, and the expected output (matched/destination/type) from the test body's `expect(...).toEqual(...)` / `expect(...).toBe(...)` assertions.
  4. Emit a deterministic JSON file at `site/lib/redirects/__fixtures__/upstream-cases.json` with shape `{ extractedAt: ISO, upstreamSha: string, count: number, cases: [{ description, redirects, request: { url, locale }, expected: { matched, destination?, type? } }] }`.
  5. Print a one-line summary on stdout: `extracted N cases from <upstreamSha> at <timestamp>`.
  Add an npm script: `"extract:upstream-fixtures": "tsx site/scripts/extract-upstream-fixtures.ts"` in `site/package.json`.
- **Expected Output:** `site/scripts/extract-upstream-fixtures.ts` (new), `site/package.json` script entry, and the first generated `site/lib/redirects/__fixtures__/upstream-cases.json` (committed). Manifest header carries the T003 upstream SHA.
- **Depends on:** T004, T006

---

- **Task ID:** T011
- **Title:** Capture 5+ tenant cases into `tenant-cases.json`
- **Description:** Using the live tenant + the T001 probe rows + 2-3 additional operator-chosen real URLs, build `site/lib/redirects/__fixtures__/tenant-cases.json` with the same case shape as `upstream-cases.json` (description, redirects array — flattened from the T001 maps — request, expected). Minimum 5 cases. Operator selects URLs that exercise the trickiest classes from T002. Each case is annotated with `capturedAt` + `tenantHost` (no secrets, just the public hostname).
- **Expected Output:** `site/lib/redirects/__fixtures__/tenant-cases.json` (committed).
- **Depends on:** T002, T010

---

- **Task ID:** T012
- **Title:** Parameterized RED test runner — `proxy-simulator.test.ts`
- **Description:** Create `site/lib/redirects/proxy-simulator.test.ts` with two `describe` blocks: "upstream parity" (loads `upstream-cases.json`) and "tenant cases" (loads `tenant-cases.json`). Each describe iterates the case array via `it.each` (Vitest), calls `await simulate({ url, locale, rules, siteLanguage })`, and asserts the result matches `expected` exactly (matched flag + destination + redirectType). On T012's first run, EVERY case is RED because `simulate()` throws — that is intentional (RED-first per task-breakdown_style: tdd).
- **Expected Output:** `site/lib/redirects/proxy-simulator.test.ts` with parameterized cases over both fixture files. Runs via `npm test -- proxy-simulator`. All cases RED at this task's commit.
- **Depends on:** T010, T011

---

- **Task ID:** T013
- **Title:** Implement `simulate()` orchestrator — pre-filter + normalize + candidate generation + per-row evaluation + match resolution + substitution + flag effects + dispatch
- **Description:** Fill `simulate()` in `proxy-simulator.ts` by porting the upstream `RedirectsProxy.handle()` + `matchFromRedirectMapRedirect()` + `matchRedirectItemRedirect()` algorithm verbatim (ADR-0038). Pipeline contract per architecture § 4.2:
  1. `simulationDeadline = Date.now() + 3000` (ADR-0039 wall-clock cap)
  2. Emit pre-filter stages (`has-dot`, `preview-mode`, `prefetch`) as **informational** — continue evaluation (FR-S8)
  3. Normalize URL (path + query split; absolute vs path+query)
  4. Generate candidate paths (incoming raw / normalized / locale-stripped × 2; with/without query string)
  5. Loop over `input.rules`:
     - Check `Date.now() > simulationDeadline` → break with `{ kind: 'diagnostic-incomplete', evaluatedRows, totalRows, reason: 'wall-clock-cap' }`
     - For each candidate × this rule's regex (via `getRedirectPatternRegex`), call `runTimedTest` (T009)
     - Emit `{ kind: 'evaluate-row', rule, detectedMode, outcome, capturedGroups?, candidateThatMatched? }`
     - **First match wins** (upstream short-circuits; we match upstream semantics but trace ALL rules in no-match path for diagnostic visibility — see PRD AC-T1.7)
  6. On match: substitute `$N` + `$siteLang` → emit `substitute` stage
  7. Apply flag effects (preserveQueryString, preserveLanguage, includeVirtualFolder) from `rule.parentMap` → emit `flag-effects` stage
  8. Dispatch → emit `dispatch` stage
  9. Build `SimulationResult` (`matched: true` with rule + finalUrl + redirectType, OR `matched: false` with candidatesTried + rowsConsidered (capped 20) + rowsConsideredTotal + diagnosticIncomplete?)
  10. Yield to event loop every 25 rows: `if (i % 25 === 0) await new Promise(r => setTimeout(r, 0))` (architecture OA-3).
- **Expected Output:** Implemented `simulate()` in `proxy-simulator.ts`; T012 fixture tests transition from RED → GREEN per case. Header docblock updated with empty "Known divergences from upstream" list (target: empty per M2).
- **Depends on:** T009, T012

---

- **Task ID:** T014
- **Title:** Achieve 100% upstream-fixture parity (M2 gate)
- **Description:** Run `npm test -- proxy-simulator` and triage every failing case. For each failure, decide: (a) bug in our port → fix it in `simulate()` or its helpers; OR (b) legitimate divergence requiring an ADR-0038 waiver entry → STOP and ask the operator before merge (per PRD M2). Document every fix in the commit message. Document every waiver in the `proxy-simulator.ts` header under "Known divergences from upstream" AND in a new note appended to ADR-0038 (waivers list). Target end-state: header's known-divergences list is **empty** and all upstream cases GREEN.
- **Expected Output:** All upstream-cases GREEN; tenant-cases at least 80% GREEN (the remaining 20% may be tenant-data quirks captured in M3). Header's "Known divergences" list empty (target) or populated with each ADR-0038-waiver entry. `npm test -- proxy-simulator` passes.
- **Depends on:** T013

---

- **Task ID:** T015
- **Title:** Update run manifest — fixture_parity_upstream outcome
- **Description:** Set `smoke_outcomes.fixture_parity_upstream.outcome = "passed"` (or `"shipped_with_waivers"` if T014 ended with explicit ADR-0038 waivers) in `project-planning/workflow/current-run.json`. Record `recorded_at` + `evidence = "site/lib/redirects/proxy-simulator.test.ts"` + notes describing the green run + any waivers.
- **Expected Output:** Updated run manifest.
- **Depends on:** T014

---

### Tranche T3 — `EditRowModal` (replaces inline editing) + regex authoring affordances

T3 is the **operator-facing UX change tranche**. It scaffolds the new `EditRowModal`, rewires `RedirectMapDetail` row clicks to open it, runs the carry-over CRUD smoke FIRST (R8b mitigation per ADR-0043), then layers mode toggle + snippet library + capture-group chips + sample-URL tester + save-time validation + inline hint on top.

**Mandatory order:** modal scaffold (T016) → row click rewire (T017) → carry-over CRUD smoke (T018) → mode toggle (T019+). The carry-over smoke MUST be GREEN before any regex affordance lands.

---

- **Task ID:** T016
- **Title:** Scaffold `EditRowModal.tsx` — Blok dialog shell with source + destination + Save/Cancel
- **Description:** Create `site/components/EditRowModal.tsx` (new file in `site/components/`, NOT in any subdirectory; the pre-amendment PRD § 10 typescript hint mentioning `edit-modal/EditRow.tsx` is obsolete). Modal contract:
  - Built on `@/components/ui/dialog` (Blok-styled `@blok/dialog` shadcn wrapper present in repo).
  - Props: `{ open: boolean; onOpenChange(open: boolean): void; map: RedirectMapItem; rowIndex: number | "new"; onSaved(updatedMap: RedirectMapItem): void; }`. (Index `"new"` = add-row mode; integer = edit-existing-row.)
  - Internal state (`EditRowModalState` per PRD § 10): `source`, `target`, `mode: 'pattern' | 'regex'` (defaults to `'pattern'` on every modal open per ADR-0040 / FR-A2), `detectedMode: 'pattern' | 'regex' | null`.
  - Layout (top → bottom): mode toggle (T019) + source `<Input>` + inline hint slot (T024) + snippet library slot (T020, regex only) + sample tester slot (T022, regex only, collapsed by default) + destination `<Input>` + capture-group chip strip slot (T021, regex only) + footer with Cancel + Save buttons.
  - Save button click → `redirects-write.ts → updateRedirectMap(...)` (existing helper) with the parent map's full attributes + the mutated `mappings` array; on success, calls `onSaved(updatedMap)`; on failure surfaces inline error.
  - Cancel / Esc / backdrop click → if source/target differ from original (unsaved changes), confirm via `@/components/ui/alert-dialog`; otherwise close.
  - **MUST NOT render** `RedirectType` / `IncludeVirtualFolder` / `PreserveQueryString` / `PreserveLanguage` controls — those are map-level fields (ADR-0043 + FR-A8).
  - Visual contract: cite `pocs/poc-v1-prd004/rowedit-pattern.html` and `rowedit-regex.html` as the canonical references.
- **Expected Output:** `site/components/EditRowModal.tsx` rendering a minimal source + destination + Save/Cancel modal with the `pattern` mode toggle wired but no regex affordances yet.
- **Depends on:** T015

---

- **Task ID:** T017
- **Title:** Rewire `RedirectMapDetail` row click → open `EditRowModal`; remove existing inline edit affordance
- **Description:** Modify `site/components/full-page/RedirectMapDetail.tsx`:
  1. Import `EditRowModal` from `@/components/EditRowModal`.
  2. Add local state `editRowState: { rowIndex: number | 'new' } | null`.
  3. Rewire each table-row's click handler to `setEditRowState({ rowIndex: i })` (replace the existing `setEditingIndex(i)` inline-edit flow).
  4. Rewire the "+ Add mapping" inline button to `setEditRowState({ rowIndex: 'new' })`.
  5. Render `<EditRowModal open={editRowState !== null} onOpenChange={...} map={selectedMap} rowIndex={editRowState?.rowIndex ?? 'new'} onSaved={...} />`.
  6. **Delete** the existing inline edit UI inside `RedirectMapDetail` — the inline `<Input>` cells that appeared when `editingIndex === i`, the inline `Check` / `X` icons, the inline `commitRowEdit` invocation paths. The row-row save path now goes through the modal's `updateRedirectMap` call.
  7. The map-level controls (rename, RedirectType dropdown, flag checkboxes, delete map) stay UNTOUCHED in `RedirectMapDetail`.
  8. Add a `forwardRef` imperative handle exposing `{ startEditRow(rowIndex: number): void }` so FullPage's deep-link path (T039) can drive it from the Test surface.
- **Expected Output:** Modified `RedirectMapDetail.tsx`. The component no longer contains inline row-edit JSX. Clicking any row opens the modal; "+ Add mapping" opens the modal in add-row mode.
- **Depends on:** T016

---

- **Task ID:** T018
- **Title:** **Carry-over CRUD smoke** — read → open modal → edit → save → re-read parity test (R8b gate)
- **Description:** **This is the gate for T3.** Operator-driven walkthrough against the live tenant:
  1. Open Full Page Manage tab; pick a real Redirect Map.
  2. Click an existing row → modal opens, source + destination prefilled from the row.
  3. Edit the destination, click Save → modal closes, toast confirms.
  4. Re-load the map (refresh or re-pick from the list).
  5. Verify the edited destination persisted exactly.
  6. Click "+ Add mapping" → modal opens in add-row mode.
  7. Author a new row, click Save → modal closes, toast confirms; row appears in the table.
  8. Re-load; verify the new row persisted.
  9. Repeat with at least one regex-shaped source value (e.g. `^/probe$`) to confirm regex-shape round-trip (depends on T005 PASS).
  Also run automated unit tests: `EditRowModal.test.tsx` covering open/close + source/target binding + Save invokes `updateRedirectMap` with the correct mutated mappings array + unsaved-changes confirm on Cancel.
- **Expected Output:** Smoke walkthrough evidence pasted into `project-planning/captures/tranche-3-modal-crud-smoke-20260520.md` with PASS/FAIL per step. Automated test file `site/components/EditRowModal.test.tsx` covering the listed cases — GREEN. **If any step FAILS, stop T3 here and fix before T019.**
- **Depends on:** T017

---

- **Task ID:** T019
- **Title:** Add Pattern/Regex segmented mode toggle to `EditRowModal`
- **Description:** Implement the full-width Pattern/Regex segmented control above the source input. Use Blok's `@blok/segmented` (or `@/components/ui/tabs` styled as a segmented control if Blok primitive unavailable). Behavior:
  - Default selection is `'pattern'` on every modal open (FR-A2 / ADR-0040).
  - Mode is transient — never persisted to Sitecore. The toggle controls only the in-modal affordances (T020 / T021 / T022) and the inline-hint detector (T024).
  - On mode change: re-render the affordance slots (snippet library + capture-group chips + sample tester appear/disappear), preserving operator's source/target edits.
  - Visual contract: see `pocs/poc-v1-prd004/rowedit-pattern.html` (default selected) and `rowedit-regex.html` (regex selected).
- **Expected Output:** Mode toggle wired in `EditRowModal.tsx`; flipping mode does not lose source/target state.
- **Depends on:** T018

---

- **Task ID:** T020
- **Title:** Add snippet library (5 PM-proposed snippets) — Regex-mode only
- **Description:** Create `site/lib/redirects/regex-snippets.ts` exporting a static const array:
  ```ts
  export const REGEX_SNIPPETS = [
    { id: 'anchor-start',    label: 'Anchored start',        pattern: '^/' },
    { id: 'trailing-slash',  label: 'Trailing slash optional', pattern: '/?$' },
    { id: 'query-strip',     label: 'Strip query string',    pattern: '\\?.*$' },
    { id: 'blog-migration',  label: 'Blog migration capture', pattern: '^/blog/(.+)$' },
    { id: 'file-extension',  label: 'File extension',        pattern: '\\.html?$' },
  ];
  ```
  Render below the source input in `EditRowModal` when mode is `'regex'`. Each snippet is a clickable pill (`<Button variant="outline" size="sm">`) that inserts the pattern at the current source-input cursor position (or replaces selected text). **Locale-prefix snippet is deliberately omitted** per PRD § 5 (avoid confusing operators about multilingual support, ADR-0023 cancellation).
  Operator-validation flag: a comment in the file flags `// T3 operator-walkthrough pending — set may be revised before final ship`.
- **Expected Output:** `site/lib/redirects/regex-snippets.ts` + snippet library rendered in `EditRowModal` (Regex mode only).
- **Depends on:** T019

---

- **Task ID:** T021
- **Title:** Add capture-group chips ($1..$N + $siteLang) — Regex-mode only
- **Description:** In `EditRowModal.tsx`, when mode is `'regex'`:
  1. Parse the source value with `new RegExp(source).source.match(/\((?!\?)/g)` to count capturing groups. Wrap in `try/catch` — invalid regex → 0 groups.
  2. Render `$1` through `$N` chips + always `$siteLang` chip, adjacent to the destination input.
  3. Clicking a chip inserts that token at the destination cursor.
  4. **Known v0 limitation** (per FR-A7): the paren-count is naïve — it over-counts escaped `\\(` and parens inside char classes `[(]`. Document this in a code comment AND on the in-UI tooltip of the chip strip ("count is approximate; if it disagrees, the regex parse check is authoritative").
- **Expected Output:** Chip strip wired; insert-at-cursor behavior works; known-limitation tooltip present.
- **Depends on:** T020

---

- **Task ID:** T022
- **Title:** Add live sample-URL tester — Regex-mode only (MVP-deferable per PRD § 5)
- **Description:** Below the snippet library, render a collapsible panel "Test against a sample URL" (closed by default; click to open). Panel contents: a single text input + a "Test" button (or run-on-input with 250ms debounce per ADR-0040). On test:
  - `try { const re = new RegExp(source, ''); const m = sampleURL.match(re); render either 'No match' or 'Matches' + each capture group's captured value }`.
  - Catastrophic regex protection: wrap the `re.test` call in `runTimedTest` (imported from `proxy-simulator.ts`); on timeout, render "pattern too slow — runtime would also stall here".
  - The tester is **purely advisory** — it never blocks save (save uses save-time validation only).
  - Visual contract: `pocs/poc-v1-prd004/rowedit-sample-tester.html`.
- **Expected Output:** Sample-tester collapsible panel wired in `EditRowModal` (Regex mode only).
- **Depends on:** T021

---

- **Task ID:** T023
- **Title:** Save-time validation — regex parse + $N reference count
- **Description:** In `EditRowModal.tsx`'s Save click handler, BEFORE calling `updateRedirectMap`:
  1. If mode is `'regex'`: `try { new RegExp(source) } catch (e) { setError("Invalid regex: " + e.message); return; }` (FR-A5 / AC-R1.5).
  2. Parse destination for `$N` references: `const refs = [...target.matchAll(/\$(\d+)/g)].map(m => Number(m[1]))`. Reject `$0` with "$0 is not supported; use $1+ for capture groups". For each ref N, if N exceeds the group count (T021's parse), reject with "destination references $N but source has only K capture groups" (FR-A5 / AC-R1.6).
  3. `$siteLang` is **exempt** from the count cross-check.
  4. Pattern mode: warn (non-blocking) if source contains regex meta-chars — render the inline hint instead of blocking (FR-A4).
  5. On error: render inline error message via `aria-describedby` on the source/destination input; focus moves to the error; modal does NOT close.
- **Expected Output:** Save-time validation wired; invalid regex / bad `$N` refs block save with inline errors; pattern-mode-with-regex-shape shows hint but does not block.
- **Depends on:** T022

---

- **Task ID:** T024
- **Title:** Inline mode-mismatch hint (`isRegexOrUrl` vs manual mode)
- **Description:** In `EditRowModal.tsx`, derive `detectedMode = source.length === 0 ? null : isRegexOrUrl(source)` (imported from `proxy-simulator.ts` — single source of truth per architecture R4). When `detectedMode !== mode` AND `detectedMode !== null`, render a non-blocking inline message below the source input:
  - Pattern mode + detected regex: "this pattern contains regex characters; runtime will treat it as regex — switch to Regex mode?" + a "Switch mode" button.
  - Regex mode + detected url: "this pattern looks like a plain URL; switch to Pattern mode for simpler authoring?" + button.
  - Use `role="status"` (NOT `role="alert"`) — does not steal focus; uses muted token color (`--muted-foreground` semantic Blok token), not warning red (FR-A4 / AC-R2.5).
  - The "Switch mode" button flips the mode toggle without losing source/target edits.
- **Expected Output:** Inline hint wired; manual switch via button works; never blocks save.
- **Depends on:** T023

---

- **Task ID:** T025
- **Title:** Tests — `EditRowModal.test.tsx` covers mode toggle + snippets + chips + sample tester + validation + hint
- **Description:** Expand `site/components/EditRowModal.test.tsx` (started at T018) with cases:
  - Mode toggle defaults to `'pattern'` on open, regardless of source content (FR-A2).
  - Switching mode preserves source/target edits.
  - Snippet click inserts pattern at cursor (Regex mode only).
  - Capture-group chip count matches `(?!\?)`-paren count.
  - Sample tester runs `runTimedTest`; timeout case renders "pattern too slow".
  - Invalid regex on save blocks with inline error + modal stays open.
  - `$0` reference rejected.
  - `$N` where N > group count rejected.
  - `$siteLang` exempt from count cross-check.
  - Pattern mode + regex-shape source renders the hint (`role="status"`, not alert).
  - Click "Switch mode" flips the toggle.
- **Expected Output:** GREEN test suite in `EditRowModal.test.tsx` covering all of the above.
- **Depends on:** T024

---

- **Task ID:** T026
- **Title:** Update run manifest — Tranche 3 closure
- **Description:** Append a `stage_history` entry (or update existing) recording T3 closure: outcome `passed_with_carry_over_smoke_green`. Reference the captures file from T018 + the test file from T025.
- **Expected Output:** Updated run manifest.
- **Depends on:** T025

---

### Tranche T4 — Full Page Test tab + Test surface + scope picker + simulator wiring + trace cards

T4 is the **biggest** build tranche. It introduces the segmented Manage/Test tab, the two-column Test layout, the cascading `ScopePicker` with localStorage persistence, the URL input + locale dropdown + Test button wiring, the staggered-render hook, the trace card stack, the result card, the empty state, copy-as-JSON, lifted state in `FullPage`, and the Test→Manage deep-link.

---

- **Task ID:** T027
- **Title:** Add Manage/Test segmented tab control to `FullPage.tsx`
- **Description:** In `site/components/full-page/FullPage.tsx`:
  1. Add transient state `activeTab: 'manage' | 'test'`, default `'manage'`, never persisted (architecture § 4.3).
  2. Render a segmented `<Tabs value={activeTab} onValueChange={setActiveTab}>` from `@/components/ui/tabs` between the existing `StatStrip` and the two-pane / tabbed-fallback split.
  3. When `activeTab === 'manage'`: render the existing rail + RedirectMapDetail tree unchanged.
  4. When `activeTab === 'test'`: render `<TestSurface ... />` (T030 stub for now).
  5. Visual contract: see `pocs/poc-v1-prd004/index.html` (Manage active) and `test-empty.html` (Test active) for the tab placement + visual treatment.
- **Expected Output:** Modified `FullPage.tsx` with the tab control; `<TestSurface>` import points to the T030 stub.
- **Depends on:** T026

---

- **Task ID:** T028
- **Title:** Create `useStaggeredRender` hook
- **Description:** Create `site/hooks/use-staggered-render.ts` per architecture § 2.5:
  ```ts
  export function useStaggeredRender<T>(items: T[] | null, options?: { intervalMs?: number }): T[];
  ```
  Returns the prefix of `items` to render at each tick — `[]` initially, then `[items[0]]`, `[items[0], items[1]]`, ... every `options.intervalMs` (default 40ms). Reduced-motion contract: when `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true, the hook short-circuits and yields the full `items` array immediately (FR-B5 / NFR-4). Cleanup: on `items` change, cancel in-flight stagger and restart; on unmount, clear all timers. **CRITICAL hydration-mismatch guard:** call `matchMedia` only inside `useEffect`, never in `useState` initializer or render body (memory `feedback_hydration_mismatch_pattern.md`).
- **Expected Output:** `site/hooks/use-staggered-render.ts` + sibling unit tests at `site/hooks/use-staggered-render.test.ts` covering default + reduced-motion + cleanup on unmount.
- **Depends on:** T026

---

- **Task ID:** T029
- **Title:** Create `lib/test-surface/scope-picker-state.ts` (localStorage helper, ADR-0022 versioned-key)
- **Description:** Create `site/lib/test-surface/scope-picker-state.ts`:
  ```ts
  export type ScopePickerState = {
    schemaVersion: 1;
    tenantId: string;
    collectionId: string | null;
    siteId: string | null;
    mapIds: string[];
    updatedAt: string;
  };
  export const STORAGE_KEY = 'rm-test-picker-v1';
  export function loadScopeState(tenantId: string): ScopePickerState | null;
  export function saveScopeState(state: ScopePickerState): void;
  export function clearScopeState(): void;
  ```
  `loadScopeState` returns `null` when:
  - `localStorage[STORAGE_KEY]` is absent or unparseable JSON
  - `parsed.schemaVersion !== 1`
  - `parsed.tenantId !== tenantId` (tenant switched — R9 mitigation)
  `saveScopeState` writes JSON + always sets `updatedAt = new Date().toISOString()`.
  **Hydration-mismatch guard:** never call `localStorage` in render or `useState` init — only in `useEffect`. The picker hydrates after mount (T032).
- **Expected Output:** `site/lib/test-surface/scope-picker-state.ts` + unit tests at `scope-picker-state.test.ts` covering schema version mismatch + tenant mismatch + happy-path round-trip + corrupt JSON handling.
- **Depends on:** T026

---

- **Task ID:** T030
- **Title:** Scaffold `TestSurface.tsx` two-column layout — left rail sticky + right area scrollable
- **Description:** Create `site/components/full-page/TestSurface.tsx`:
  - Props: `{ tenantId: string; client: ClientSDK; sitecoreContextId: string; siteLanguage: string; lastTrace: SimulationTrace | null; onTraceComplete(trace: SimulationTrace): void; onRequestEditRow(mapId: string, rowIndex: number): void; }`.
  - Two-column grid layout:
    - **Left rail (sticky, ~360px):** placeholder for `ScopePicker` (T031) + URL input + locale dropdown + Test button (T034).
    - **Right area (scrollable):** placeholder for trace cards (T035).
  - Responsive: below 768px stacks vertically with the scope picker as a top accordion (visual contract: `pocs/poc-v1-prd004/test-empty.html` shows ≥768px layout; the accordion behavior is decorative in POC).
  - Use Tailwind utility classes + `grid grid-cols-[360px_1fr]` at `md:` breakpoint; `gap-6 lg:gap-8`; sticky left via `lg:sticky lg:top-6 lg:self-start`.
- **Expected Output:** `TestSurface.tsx` rendering the two-column shell with placeholders; imported by `FullPage.tsx` (T027).
- **Depends on:** T027

---

- **Task ID:** T031
- **Title:** Build `ScopePicker.tsx` — 3 cascading selectors (Collection → Site → Map(s))
- **Description:** Create `site/components/full-page/ScopePicker.tsx`:
  - Props: `{ tenantId: string; client: ClientSDK; sitecoreContextId: string; value: ScopePickerState | null; onChange(state: ScopePickerState): void; }`.
  - Internal data fetches:
    - `useEffect` on mount → `listCollections(client, sitecoreContextId)` (existing helper at `site/lib/sdk/sites.ts:46-55`).
    - On collection change → filter `listSites(client, sitecoreContextId)` (existing helper at `site/lib/sdk/sites.ts:31-40`) client-side by chosen collection.
    - On site change → `listRedirectMaps(client, sitecoreContextId, sitePath)` (existing helper at `site/lib/sdk/redirects-read.ts:213-240`) where `sitePath` is `/sitecore/content/<collection>/<site>/Settings/Redirects`.
  - Three `<Select>` controls from `@/components/ui/select`, the third with multi-select behavior (operator picks one or more maps). Each shows a skeleton state (`@/components/ui/skeleton`) while loading; inline error + retry button on failure (FR-T4).
  - Cascading invalidation: changing Collection clears Site + Map; changing Site clears Map (FR-T5).
  - Visual contract: `pocs/poc-v1-prd004/test-scope-collection-only.html` (collection picked, site loading), `test-scope-site-loading.html` (mid-fetch), `test-scope-stale-localstorage.html` (info alert for missing IDs).
  - Empty state: when nothing picked, render the inline pre-condition copy from the POC's `.test-rail__precondition` block.
- **Expected Output:** `site/components/full-page/ScopePicker.tsx`; renders 3 cascading selectors with skeleton + error + invalidation logic.
- **Depends on:** T030

---

- **Task ID:** T032
- **Title:** Wire `ScopePicker` to localStorage hydration + persistence
- **Description:** In `TestSurface.tsx`:
  1. On mount (`useEffect`): call `loadScopeState(tenantId)` from T029. If non-null, set as the picker's initial `value`. If null, leave empty.
  2. Pass current `value` + `onChange` to `ScopePicker`. On every change, call `saveScopeState(...)`.
  3. **Stale-ID handling (FR-T7):** after `ScopePicker` fetches collections, if the persisted `collectionId` is not in the fetched list → reset `collectionId + siteId + mapIds` and surface a brief inline alert "previous selection no longer available — pick again". Same for siteId after sites load and mapIds after maps load. The alert auto-dismisses on the next user interaction.
  4. **Hydration-mismatch guard:** the initial render BEFORE the `useEffect` runs must render the empty-state UI (not the persisted state) — otherwise SSR/CSR will mismatch. Always start with empty `value` in `useState`, populate in `useEffect` (memory `feedback_hydration_mismatch_pattern.md`).
- **Expected Output:** `TestSurface.tsx` wires hydration + persistence; stale-ID alert renders + auto-dismisses; no hydration warnings in console.
- **Depends on:** T029, T031

---

- **Task ID:** T033
- **Title:** Build URL input + locale dropdown + Test button (left rail, below picker)
- **Description:** In `TestSurface.tsx`, below the scope picker, render:
  - **URL input** (`<Input>` from `@/components/ui/input`): accepts both absolute (`https://...`) and path+query (`/path?qs=1`); inline validation error when input is non-empty but doesn't start with `http` AND doesn't start with `/`.
  - **Locale dropdown** (`<Select>`): static options `['en', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'nl-NL', 'Other...']`; default `'en'`. Selecting `'Other...'` opens a `<Input>` for free-text matching `/^[a-z]{2}(-[A-Z]{2})?$/`; invalid text shows inline error.
  - **Test button** (primary `<Button>`): disabled when `value.mapIds.length === 0` OR URL is empty OR URL is invalid. Disabled-state `<Tooltip>` text: "Pick a collection, site, and at least one map to enable testing." (AC-T0.5)
  - Visual contract: `pocs/poc-v1-prd004/test-empty.html` (empty + disabled), `test-matched.html` (filled + enabled).
- **Expected Output:** URL input + locale dropdown + Test button wired in `TestSurface.tsx`; disabled state behaves correctly.
- **Depends on:** T032

---

- **Task ID:** T034
- **Title:** Wire Test button to `simulate()` — flatten rules across picked maps + build SimulationInput
- **Description:** In `TestSurface.tsx`'s Test button click handler:
  1. Loading state: set local `isSimulating = true`; show spinner on Test button.
  2. Load the picked maps' full row inventory: for each picked `mapId`, find the map in the already-loaded `maps` list (passed from `FullPage` via prop or via a fresh `listRedirectMaps` call cached at the picker level).
  3. Flatten rules: `const rules: SimulationRule[] = pickedMaps.flatMap(map => map.mappings.map((mapping, rowIndex) => ({ mapId: map.id, rowIndex, source: mapping.source, target: mapping.target, redirectType: map.redirectType, preserveQueryString: map.preserveQueryString, preserveLanguage: map.preserveLanguage, includeVirtualFolder: map.includeVirtualFolder })))`.
  4. Build `SimulationInput`: `{ url, locale, rules, siteLanguage }`.
  5. Call `await simulate(input)`.
  6. On resolve: pass the trace to the parent via `onTraceComplete(trace)` (which sets `lastTrace` at the FullPage level — T036).
  7. On reject: render inline error in the right column ("simulator threw: <message>") via NFR-5 (never silent).
  8. Clear `isSimulating`.
- **Expected Output:** Test button wired end-to-end; click → simulate → trace flows up to `FullPage`.
- **Depends on:** T013, T033

---

- **Task ID:** T035
- **Title:** Build `TraceCardStack.tsx` + `TraceCard.tsx` + `ResultCard.tsx` + `EmptyState.tsx`
- **Description:** Create `site/components/full-page/` files:
  - **`TraceCardStack.tsx`**: takes `trace: SimulationTrace | null`. Calls `useStaggeredRender(trace?.stages ?? null, { intervalMs: 40 })` (T028). Renders one `<TraceCard stage={...}>` per stage in order, then a `<ResultCard result={trace.result} onRowClick={...}>` at the end.
  - **`TraceCard.tsx`**: switch-renders by `stage.kind` (exhaustive via `assertNeverStage` from T007). One subcard per kind: pre-filter / normalize / candidates / evaluate-row / substitute / flag-effects / dispatch / diagnostic-incomplete. Each card uses `@/components/ui/card` (Blok-styled). Reuses the existing `HoverLiftCard` pattern from `@/components/ui/hover-lift-card`. Visual contract: `pocs/poc-v1-prd004/test-matched.html` + `test-unmatched.html` + `test-timeout-row.html` + `test-diagnostic-incomplete.html`.
  - **`ResultCard.tsx`**: visually distinct (accent-border using `--primary` semantic token; NOT `--accent` hex). On `matched: true` renders a clickable "Open this rule in Manage" button → `props.onRowClick(result.rule.mapId, result.rule.rowIndex)`. On `matched: false` renders "Add a rule for this URL" button → opens add-row mode (deep-link to Manage + add-row modal).
  - **`EmptyState.tsx`**: pre-test hero with "Try a sample URL" button that pre-fills a URL from the first rule of the first picked map (OQ-1 default). Visual contract: `pocs/poc-v1-prd004/test-empty.html` (after scope is picked but URL is empty).
- **Expected Output:** All four new components in `site/components/full-page/`; `TestSurface.tsx` renders `<TraceCardStack trace={lastTrace} onRowClick={...} />` in the right column when `lastTrace !== null`, otherwise `<EmptyState />`.
- **Depends on:** T028, T034

---

- **Task ID:** T036
- **Title:** Lift `lastTrace` state + `activeTab` state up to `FullPage` (ADR-0041)
- **Description:** In `FullPage.tsx`:
  - Add transient state `lastTrace: SimulationTrace | null`, default `null`.
  - Pass `lastTrace` + `onTraceComplete: (trace) => setLastTrace(trace)` to `<TestSurface>`.
  - `TestSurface` renders `<TraceCardStack trace={lastTrace} ...>` (reading the lifted state).
  - **Why lift:** the Test→Manage deep-link conditionally unmounts `TestSurface`; if trace lived in `TestSurface`, deep-linking would clobber it. Lifting to `FullPage` keeps the trace stable across tab toggles within one page lifecycle (ADR-0041 / architecture § 4.3).
  - State boundary: `lastTrace` survives Manage↔Test tab toggles within one page; cleared on page reload (no localStorage).
- **Expected Output:** `FullPage.tsx` owns `lastTrace` + `activeTab`; `TestSurface` is a controlled component receiving + forwarding both.
- **Depends on:** T035

---

- **Task ID:** T037
- **Title:** Wire copy-as-JSON footer button
- **Description:** In `TraceCardStack.tsx` (or in `TestSurface.tsx` below the stack), render a "Copy as JSON" `<Button variant="outline">`. On click: `await navigator.clipboard.writeText(JSON.stringify(trace, null, 2))` → fire a Sonner toast "Copied" via the existing PRD-002 DecorativeCta + `toast.success(...)` pattern (visual contract: `pocs/poc-v1-prd004/test-matched.html` shows the button + toast). The trace JSON includes `startedAt` + `durationMs` per architecture § 4.2.
- **Expected Output:** Copy-as-JSON button wired with Sonner toast confirmation.
- **Depends on:** T036

---

- **Task ID:** T038
- **Title:** Wire pre-filter / no-match / row-timeout / diagnostic-incomplete trace card variants
- **Description:** Confirm `TraceCard.tsx`'s switch-render covers all 8 `SimulationStage.kind` values + the `SimulationResult` shapes (`matched: true` vs `matched: false`). Specifically:
  - `'pre-filter'` cards label themselves "informational — runtime would skip, simulator continues" per FR-S8 / AC-T1.9.
  - `'evaluate-row'` cards with `outcome: 'timeout'` get a warning border + "pattern too slow — runtime would also stall here" copy (AC-T2.3). Visual contract: `pocs/poc-v1-prd004/test-timeout-row.html`.
  - The "no-match" path's "rows considered" card caps display at 20 rows + "+ N more rows considered (no match)" with an expand control that reveals the remainder in chunks of 50 (AC-T2.2 UI cap). Visual contract: `pocs/poc-v1-prd004/test-unmatched.html` + `test-unmatched-expanded.html`.
  - `'diagnostic-incomplete'` cards render with a warning-tinted shell + "diagnostic incomplete after 3s — evaluated X of Y rows" copy. Visual contract: `pocs/poc-v1-prd004/test-diagnostic-incomplete.html`.
- **Expected Output:** Every stage + result variant renders without runtime error; visual treatment matches POC frames.
- **Depends on:** T037

---

- **Task ID:** T039
- **Title:** Wire Test → Manage deep-link via `forwardRef` imperative handle (ADR-0041 + R8b)
- **Description:** In `FullPage.tsx`:
  1. Add `detailRef = useRef<{ startEditRow(rowIndex: number): void }>(null)`.
  2. Pass `ref={detailRef}` to `<RedirectMapDetail>` (T017 added the `forwardRef` handle).
  3. Define `handleRequestEditRow = (mapId: string, rowIndex: number) => { setActiveTab('manage'); const map = maps.find(m => m.id === mapId); if (!map) { toast.error('this map no longer exists; refresh'); return; } setSelectedMap(map); setTimeout(() => detailRef.current?.startEditRow(rowIndex), 0); }` (the `setTimeout 0` lets React commit the `setActiveTab` + `setSelectedMap` before driving the ref).
  4. Pass `onRequestEditRow={handleRequestEditRow}` to `<TestSurface>`; it forwards to `<ResultCard>`.
  5. `RedirectMapDetail`'s `startEditRow(rowIndex)` validates the index against the current `map.mappings.length`; if invalid, toasts "this rule has been edited; please find it manually" and returns silently (architecture § 4.4 failure-mode).
  6. **No event bus / no pubsub / no context provider** — plain prop-drilled callback + ref (architecture § 4.4).
- **Expected Output:** Clicking "Open this rule in Manage" in a matched ResultCard switches to the Manage tab, selects the parent map, opens `EditRowModal` for that row. Failure modes (map deleted, row deleted) produce explicit toasts and never throw.
- **Depends on:** T036, T017

---

- **Task ID:** T040
- **Title:** Tests — `TestSurface.test.tsx` + `ScopePicker.test.tsx` + `TraceCardStack.test.tsx`
- **Description:** Cover with Vitest + React Testing Library:
  - `TestSurface.test.tsx`: scope picker hydrates from localStorage on mount (or stays empty); URL input validates; Test button disabled state per gate; click → mock `simulate()` → trace renders.
  - `ScopePicker.test.tsx`: 3 cascading selectors; collection change clears site+map; site change clears map; skeleton state during load; error + retry button on failure; stale-ID alert when persisted ID missing.
  - `TraceCardStack.test.tsx`: `useStaggeredRender` mocked to instant; rendered trace contains every stage kind; ResultCard `matched: true` deep-link click invokes `onRowClick`; `matched: false` rows-considered cap at 20 + expand control.
  - All hydration-mismatch checks: render in jsdom + assert no hydration warnings; `matchMedia` only consulted in `useEffect`.
- **Expected Output:** GREEN test files at the listed paths.
- **Depends on:** T039

---

- **Task ID:** T041
- **Title:** Update run manifest — Tranche 4 closure
- **Description:** Append a `stage_history` entry recording T4 closure with outcome `passed`. Reference T040 test files + the visual POC frames as evidence.
- **Expected Output:** Updated run manifest.
- **Depends on:** T040

---

### Tranche T5 — A11y + theme + reduced-motion + structural guards

T5 is a **polish + guard tranche**. It audits accessibility, verifies the three required themes (dark / light / system), confirms reduced-motion fallback, and codifies structural guards to prevent regressions.

---

- **Task ID:** T042
- **Title:** A11y audit — keyboard navigation, focus management, ARIA labels, ≥4.5:1 contrast (NFR-2)
- **Description:** Walk every new surface with keyboard only:
  - `EditRowModal`: Tab order = mode toggle → source → (snippets, if regex) → destination → (chips, if regex) → Cancel → Save. Esc closes (with confirm if dirty). Focus moves into modal on open; returns to triggering row on close.
  - `ScopePicker`: each `<Select>` is keyboard-operable (Enter to open, arrows to navigate, Enter to commit). Skeleton state announces "loading collections" via `aria-busy="true"`.
  - URL input + locale dropdown + Test button: tab order matches POC frame; disabled tooltip is announced via `aria-describedby`.
  - `TraceCardStack`: each card is a `<section>` with an `aria-labelledby` for its stage-name heading.
  - Inline hint in `EditRowModal`: `role="status"` (NOT alert) — does not steal focus.
  - Contrast: verify every new text element against its background token at AA (≥4.5:1) in BOTH light and dark themes.
- **Expected Output:** A11y findings + remediations recorded in `project-planning/captures/tranche-5-a11y-audit-20260520.md`. Any blocking issue gets a `T042a`, `T042b`, ... follow-up task. Issues fixed inline land as part of T042.
- **Depends on:** T041

---

- **Task ID:** T043
- **Title:** Theme parity tests — dark / light / system (NFR-3 + global theme policy)
- **Description:** Add Vitest theme tests at:
  - `site/components/EditRowModal.theme.test.tsx`
  - `site/components/full-page/TestSurface.theme.test.tsx`
  - `site/components/full-page/TraceCardStack.theme.test.tsx`
  - `site/components/full-page/ScopePicker.theme.test.tsx`
  Each test mounts the component under `<ThemeProvider initialTheme="dark">` and `<ThemeProvider initialTheme="light">` and snapshot-asserts that:
  - All color values come from CSS custom properties (semantic Blok tokens like `--primary`, `--muted-foreground`, `--destructive`) — NEVER inline `#hex` literals.
  - The "system" theme respects `prefers-color-scheme` via `matchMedia` (test by mocking the matchMedia API).
  - **Reference impl:** carry-forward from PRD-002's existing theme tests at `site/components/full-page/PublishSiteConfirmModal.theme.test.tsx`.
- **Expected Output:** GREEN theme tests at all four paths. Failure indicates a hex literal or hardcoded color leaked in.
- **Depends on:** T042

---

- **Task ID:** T044
- **Title:** Reduced-motion compliance test (NFR-4 + ADR-0027)
- **Description:** Add `site/hooks/use-staggered-render.test.ts` cases:
  - When `window.matchMedia('(prefers-reduced-motion: reduce)').matches === true`, the hook yields the full `items` array on the first tick (no staggered reveal).
  - When `false`, the hook reveals items at 40ms intervals.
  Also add an integration test at `site/components/full-page/TraceCardStack.test.tsx` verifying that under `prefers-reduced-motion: reduce`, all trace cards render synchronously on first paint.
- **Expected Output:** GREEN reduced-motion tests.
- **Depends on:** T043

---

- **Task ID:** T045
- **Title:** Structural guards — no-hex + semantic-token-only + focus-management + map-level-field-not-in-modal
- **Description:** Add structural guard tests under `site/lib/__tests__/structural-guards/`:
  1. **`no-hex-in-prd004-components.test.ts`** — scan `site/components/EditRowModal.tsx` + `site/components/full-page/TestSurface.tsx` + `TraceCardStack.tsx` + `ResultCard.tsx` + `EmptyState.tsx` + `ScopePicker.tsx` + `TraceCard.tsx` for `#[0-9a-fA-F]{3,8}` patterns (regex); fail if any are found. (Carry-forward from PRD-002.)
  2. **`semantic-tokens-only.test.ts`** — verify those same files reference only semantic Blok tokens (`var(--primary)`, `var(--muted-foreground)`, `var(--destructive)`, ...) — NOT Tailwind hex aliases like `text-red-500`.
  3. **`focus-management.test.ts`** — render `EditRowModal` open + closed; assert focus moves into the modal on open and returns to the trigger element on close.
  4. **`map-level-field-not-in-modal.test.ts`** — render `EditRowModal`; query for `RedirectType` / `IncludeVirtualFolder` / `PreserveQueryString` / `PreserveLanguage` text + role="combobox" / role="checkbox" combinations; fail if any are present. **This is the ADR-0043 + FR-A8 guard.**
- **Expected Output:** GREEN structural guard test files.
- **Depends on:** T044

---

- **Task ID:** T046
- **Title:** Host-frame smoke test for Test tab + EditRowModal (PRD § 8 NFR-3)
- **Description:** Add a Playwright host-frame smoke under `site/tests/host-frame/test-tab-host-frame.smoke.test.ts` per the `sitecore:marketplace-sdk-host-frame-testing` skill:
  - Mount the app under the operator-supplied Cloud Portal host URL.
  - Locate the iframe by origin; clip the surrounding chrome.
  - Compare against the winning POC at `pocs/poc-v1-prd004/test-matched.html` and `rowedit-pattern.html`.
  - 5-axis: light theme, dark theme, system theme, reduced-motion, mobile (<768px stacked layout).
- **Expected Output:** Playwright smoke file + first run evidence pasted into `project-planning/captures/tranche-5-host-frame-smoke-20260520.md`. Update `smoke_outcomes.host_frame_smoke_test_tab` in the run manifest.
- **Depends on:** T045

---

### Tranche T6 — Real-tenant smoke (M3 gate)

T6 is the **final test tranche**. The operator drives a walkthrough against the live tenant; the simulator output is compared to the actual tenant Edge response for 5-10 selected URLs. Outcomes follow the M3 response policy.

---

- **Task ID:** T047
- **Title:** Prepare smoke-evidence file template
- **Description:** Create `project-planning/smoke/smoke-prd-004-20260520.md` from the M3 procedure: header (date, operator, tenant host, build SHA) + per-URL section template (URL, simulator-predicted destination + type, actual Edge response status + Location header, match? Y/N, notes). Pre-fill 5 sections (operator can extend to 10).
- **Expected Output:** `project-planning/smoke/smoke-prd-004-20260520.md` with header + 5 empty per-URL sections.
- **Depends on:** T046

---

- **Task ID:** T048
- **Title:** Operator-driven smoke walkthrough (5-10 URLs; simulator vs tenant Edge)
- **Description:** Operator selects 5-10 URLs that exercise diverse rules (regex + pattern + capture groups + flag effects). For each:
  1. In the Test tab, pick scope + paste URL + click Test; record the simulator's `result.finalUrl` + `result.redirectType` + `result.matched`.
  2. Open the tenant's published site in a fresh browser window; navigate to the test URL; observe the network response (status code + Location header).
  3. Record (URL, expected, actual, match?) in `project-planning/smoke/smoke-prd-004-20260520.md`.
- **Expected Output:** Filled-in smoke evidence at `project-planning/smoke/smoke-prd-004-20260520.md`; ≥80% match per M3.
- **Depends on:** T047

---

- **Task ID:** T049
- **Title:** Close T6 gate per M3 response policy + update run manifest
- **Description:** Read the T048 smoke evidence. Compute the match rate. Apply M3 response policy:
  - **≥80% match** → set `smoke_outcomes.tranche_6_real_tenant_smoke.outcome = "passed"` (or `"shipped_with_caveats"` if some mismatches captured as follow-ups). Reference the smoke-evidence file as evidence.
  - **<80% match** → set outcome `"shipped_with_caveats"` AND file follow-up tasks per mismatch (T049a, T049b, ...) capturing the trace + actual Edge response.
  - **Parity-breaking bug** (mismatch indicates the simulator misimplements the upstream algorithm, not a tenant-data quirk) → **HARD STOP**, set outcome `"failed"`, file a task to fix and re-run T048.
- **Expected Output:** Run-manifest update with outcome + recorded_at + evidence path. If `passed`, the tranche graph is complete. Any follow-up tasks are appended to this file under T6.
- **Depends on:** T048

---

## 4a. Goals

| ID | Goal | Tracking task |
|----|------|---------------|
| G1 | First-class regex authoring on par with plain-URL | T016–T024 (EditRowModal + helpers + validation) |
| G2 | Eliminate publish-and-pray loop via in-app dry-run | T030–T040 (Test surface end-to-end) |
| G3 | Build simulation foundation for PRD-005 (drift detection) | T006–T015 (simulator + fixtures + parity) |
| M1 | 100% of malformed regex caught at save | T023 + T025 |
| M2 | Simulator parity with upstream on 100% of fixtures | T013 + T014 + T015 |
| M3 | ≥80% real-tenant smoke match | T048 + T049 |
| M4 | Trace is operator-actionable on no-match | T038 + T048 |

## 4b. Important Test Cases (by epic / feature)

The table below is the canonical, traceable test-case register. Every row maps to at least one Task ID; every behavioral claim in the PRD has a row here. Tests are meaningful — they assert user-observable behavior, not implementation details. Trivial identity checks are explicitly absent.

| Test case | Task ID(s) | Type | File location |
|-----------|------------|------|---------------|
| **E1 — T1 probe (character-class round-trip)** | | | |
| Anchors `^` / `$` survive save/read round-trip byte-identical | T002 | regression (live tenant) | `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` |
| Capturing group `(` / `)` survive round-trip | T002 | regression (live tenant) | same capture file |
| Non-capturing group `(?:` survives round-trip | T002 | regression (live tenant) | same capture file |
| Escapes `\\.` `\\d` `\\s` `\\w` `\\?` survive round-trip | T002 | regression (live tenant) | same capture file |
| Quantifiers `?` `+` `*` `{N}` `{N,M}` survive round-trip | T002 | regression (live tenant) | same capture file |
| Char classes `[a-z]` `[^x]` survive round-trip | T002 | regression (live tenant) | same capture file |
| Alternation `\|` survives round-trip | T002 | regression (live tenant) | same capture file |
| Backslash-escaped paren `^/contact\\(us\\)$` preserves BOTH backslashes | T002 | regression (live tenant) | same capture file |
| T1 gate: all classes PASS → manifest `smoke_outcomes.tranche_1_regex_roundtrip_probe.outcome = "passed"` | T005 | regression | `current-run.json` |
| **E2 — Simulator + fixtures (parity, timeouts, trace completeness)** | | | |
| Every upstream fixture case produces byte-identical simulator output (M2) | T012a (RED), T014 (GREEN) | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| Every tenant fixture case matches expected outcome | T012a (RED), T014 (GREEN) | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| `simulate()` resolves within 200ms p95 for ≤100 rules | T013 | unit (perf) | `site/lib/redirects/proxy-simulator.test.ts` |
| Catastrophic regex `(a+)+$` against `aaaaaaaa...!` (32+ chars) triggers per-row 100ms timeout; stage has `outcome: 'timeout'` | T009a (RED), T013 (GREEN) | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| `Promise.race` returns `'timeout'` within 150ms of starting (100ms cap + 50ms scheduling jitter) | T009a (RED), T013 (GREEN) | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| 500-row inventory with all-timeout patterns hits the 3s wall-clock cap; final stage is `{ kind: 'diagnostic-incomplete', reason: 'wall-clock-cap', evaluatedRows: N, totalRows: 500 }` | T013a (RED), T013 (GREEN) | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| Pre-filter stages (`has-dot`, `preview-mode`, `prefetch`) emit informational-only stages; simulator continues evaluation | T013 | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| `$1` substitution from a capturing group produces correct destination | T013 | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| `$siteLang` substitution with `siteLanguage = 'en'` produces correct destination | T013 | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| Flag effects: `preserveQueryString=true` carries original query string to destination | T013 | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| `isRegexOrUrl` `.slice(0, -1)` quirk: `^/path/` (trailing slash stripped) treated as URL; `^/path` (no slash) treated as regex — verbatim upstream behavior | T008a (RED), T008 (GREEN) | unit | `site/lib/redirects/proxy-simulator.test.ts` |
| `isRegexOrUrl` exported as single source of truth; `EditRowModal` imports the same function (no duplication) | T008 | unit | `site/components/EditRowModal.test.tsx` |
| AST extractor `extract-upstream-fixtures.ts` produces `upstream-cases.json` with correct `count` and `extractedAt` | T010 | unit | `site/scripts/extract-upstream-fixtures.test.ts` |
| `upstream-cases.json` is deterministic across two runs against identical source | T010 | unit | `site/scripts/extract-upstream-fixtures.test.ts` |
| **E3 — `EditRowModal` + regex authoring affordances** | | | |
| Carry-over CRUD: read → modal open → edit destination → save → re-read → destination byte-identical (R8b gate) | T018 | regression (live tenant) | `project-planning/captures/tranche-3-modal-crud-smoke-20260520.md` |
| Carry-over CRUD: add-row → modal → author source + destination → save → re-read → row present | T018 | regression (live tenant) | same capture file |
| Carry-over CRUD: regex-shaped source `^/probe$` round-trips without char loss | T018 | regression (live tenant) | same capture file |
| Automated: Save invokes `updateRedirectMap` with correctly mutated `mappings` array (not replacing unrelated rows) | T018a (RED), T018 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Automated: Cancel with unsaved changes triggers `@/components/ui/alert-dialog` confirmation | T018a (RED), T018 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Automated: Cancel without changes closes immediately (no confirm) | T018a (RED), T018 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Mode toggle defaults to `'pattern'` on every modal open, regardless of source content (FR-A2) | T019a (RED), T025 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Switching mode from Pattern to Regex preserves source and target edits | T019a (RED), T025 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Snippet pill click inserts `^/` at cursor position in source input (Regex mode only) | T020a (RED), T025 (GREEN) | UI/component | `site/components/EditRowModal.test.tsx` |
| Snippet library does NOT appear when mode is `'pattern'` | T020 | UI/component | `site/components/EditRowModal.test.tsx` |
| Capture-group chip count: source `^/blog/(.+)/(.*)$` → two chips `$1` `$2` + always `$siteLang` | T021a (RED), T025 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Capture-group chip insert: clicking `$1` inserts at destination cursor | T021a (RED), T025 (GREEN) | UI/component | `site/components/EditRowModal.test.tsx` |
| `$siteLang` chip is always present in Regex mode (even with 0 capture groups) | T021 | unit | `site/components/EditRowModal.test.tsx` |
| Sample tester: valid regex `^/blog/(.+)$` against `https://example.com/blog/post` → "Matches" + `$1 = post` | T022a (RED), T025 (GREEN) | UI/component | `site/components/EditRowModal.test.tsx` |
| Sample tester: catastrophic regex `(a+)+$` → `runTimedTest` timeout → "pattern too slow" | T022a (RED), T025 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Sample tester: invalid regex → "Test" button stays visible but tester renders "invalid regex" | T022 | UI/component | `site/components/EditRowModal.test.tsx` |
| Save-time validation: invalid regex `(a+]$` in Regex mode → blocks save; inline error includes exception `.message` text; modal stays open (M1) | T023a (RED), T025 (GREEN) | UI/component | `site/components/EditRowModal.test.tsx` |
| Save-time validation: `$0` reference rejected with "$0 is not supported; use $1+ for capture groups" | T023a (RED), T025 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Save-time validation: `$3` referenced when source has 2 groups → blocked with "destination references $3 but source has only 2 capture groups" | T023a (RED), T025 (GREEN) | unit | `site/components/EditRowModal.test.tsx` |
| Save-time validation: `$siteLang` exempt from group-count cross-check — save proceeds even with 0 groups | T023 | unit | `site/components/EditRowModal.test.tsx` |
| Save-time validation: Pattern mode + regex-meta chars → non-blocking hint only; save NOT blocked | T023 | unit | `site/components/EditRowModal.test.tsx` |
| Inline hint: Pattern mode + `isRegexOrUrl(source) === 'regex'` → renders `role="status"` message (NOT `role="alert"`) | T024a (RED), T025 (GREEN) | UI/component | `site/components/EditRowModal.test.tsx` |
| Inline hint: Regex mode + `isRegexOrUrl(source) === 'url'` → renders correct advisory text | T024a (RED), T025 (GREEN) | UI/component | `site/components/EditRowModal.test.tsx` |
| Inline hint: "Switch mode" button flips toggle without losing source/target edits | T024 | UI/component | `site/components/EditRowModal.test.tsx` |
| Inline hint: uses `var(--muted-foreground)` token color, not `var(--destructive)` | T043 | theme | `site/components/EditRowModal.theme.test.tsx` |
| `EditRowModal` does NOT render `RedirectType` / `IncludeVirtualFolder` / `PreserveQueryString` / `PreserveLanguage` controls (ADR-0043 structural guard) | T045 | structural guard | `site/lib/__tests__/structural-guards/map-level-field-not-in-modal.test.ts` |
| Focus moves into `EditRowModal` on open; returns to triggering row element on close | T045 | structural guard | `site/lib/__tests__/structural-guards/focus-management.test.ts` |
| Runtime contrast: foreground text over `var(--primary)` button achieves ≥4.5:1 AA in both light and dark themes | T043 | theme | `site/components/EditRowModal.theme.test.tsx` |
| SSR: No browser-global access in render path or `useState` initializer in `EditRowModal.tsx` | T016 | regression | (Playwright smoke gate is the only true catch; note in test file as a comment) |
| **E4 — Test tab + scope picker + simulator wiring** | | | |
| Manage/Test segmented tab switches active surface without losing `lastTrace` state | T027a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| 3 cascading selectors: Collection change clears Site + Map selections; Site change clears Map (FR-T5) | T031a (RED), T040 (GREEN) | UI/component | `site/components/full-page/ScopePicker.test.tsx` |
| Skeleton state renders during Collection/Site/Map data fetch | T031 | UI/component | `site/components/full-page/ScopePicker.test.tsx` |
| Fetch error: inline error + retry button appear; picker not left in broken state | T031 | UI/component | `site/components/full-page/ScopePicker.test.tsx` |
| `loadScopeState` returns non-null → picker initializes with persisted scope on mount (FR-T6) | T029a (RED), T040 (GREEN) | unit | `site/lib/test-surface/scope-picker-state.test.ts` |
| localStorage round-trip: `saveScopeState` then `loadScopeState` returns identical state | T029a (RED), T029 (GREEN) | unit | `site/lib/test-surface/scope-picker-state.test.ts` |
| `tenantId` mismatch in stored state → `loadScopeState` returns `null` (R9 mitigation) | T029a (RED), T029 (GREEN) | unit | `site/lib/test-surface/scope-picker-state.test.ts` |
| `schemaVersion !== 1` in stored state → `loadScopeState` returns `null` | T029a (RED), T029 (GREEN) | unit | `site/lib/test-surface/scope-picker-state.test.ts` |
| Corrupt JSON in localStorage → `loadScopeState` returns `null` without throwing | T029a (RED), T029 (GREEN) | unit | `site/lib/test-surface/scope-picker-state.test.ts` |
| Stale persisted `collectionId` missing from tenant → reset collection + site + maps + surface inline alert "previous selection no longer available — pick again" (FR-T7) | T032a (RED), T040 (GREEN) | UI/component | `site/components/full-page/ScopePicker.test.tsx` |
| Stale persisted `siteId` missing → reset site + maps; collection retained | T032 | UI/component | `site/components/full-page/ScopePicker.test.tsx` |
| Test button disabled when `mapIds.length === 0` (AC-T0.5) | T033a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| Test button disabled when URL field is empty (AC-T0.5) | T033 | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| Disabled-state tooltip text: "Pick a collection, site, and at least one map to enable testing." | T033 | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| URL input: absolute `https://example.com/path?qs=1` and path+query `/path?qs=1` produce identical `SimulationInput.url` values (AC-T1.3) | T034a (RED), T040 (GREEN) | unit | `site/components/full-page/TestSurface.test.tsx` |
| URL input: non-empty input not starting with `http` or `/` shows inline validation error | T033 | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| Locale dropdown: `'Other...'` selection opens free-text; input matching `/^[a-z]{2}(-[A-Z]{2})?$/` is accepted (AC-T1.4) | T033 | unit | `site/components/full-page/TestSurface.test.tsx` |
| Locale free-text: invalid format shows inline error | T033 | unit | `site/components/full-page/TestSurface.test.tsx` |
| Test button click → `simulate()` called with flattened rules from picked maps only (not tenant-wide) | T034 | unit | `site/components/full-page/TestSurface.test.tsx` |
| Trace cards stagger at 40ms intervals per `useStaggeredRender` default | T028a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| `prefers-reduced-motion: reduce` → `useStaggeredRender` yields full items array on first tick (no stagger) (NFR-4) | T028a (RED), T044 (GREEN) | unit | `site/hooks/use-staggered-render.test.ts` |
| `matchMedia` called ONLY in `useEffect`, never in `useState` init or render body | T028 | regression | (comment in test + Playwright smoke gate) |
| `useStaggeredRender` cleanup: timers cleared on `items` change and on unmount | T028 | unit | `site/hooks/use-staggered-render.test.ts` |
| `TraceCardStack` renders every `SimulationStage.kind` without runtime error (exhaustive switch) | T035a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| ResultCard `matched: true`: "Open this rule in Manage" button invokes `onRowClick(mapId, rowIndex)` | T035 | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| ResultCard `matched: true`: deep-link → tab switches to Manage + correct map selected + `EditRowModal` opens for that row | T039a (RED), T040 (GREEN) | E2E | `site/components/full-page/TestSurface.test.tsx` |
| ResultCard `matched: false`: "Add a rule for this URL" → open `EditRowModal` in add-row mode | T035 | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| Map deleted between simulate and deep-link click → toast error + no throw | T039 | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| Row deleted between simulate and deep-link click → toast error + no throw | T039 | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| No-match: rows-considered card shows first 20 rows; "+ N more rows considered" expand control present | T038a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| `diagnostic-incomplete` final card renders with warning-tinted shell + "evaluated X of Y rows" copy | T038 | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| `evaluate-row` stage with `outcome: 'timeout'` → warning border + "pattern too slow — runtime would also stall here" | T038 | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| `pre-filter` stage cards label themselves "informational — runtime would skip, simulator continues" | T038 | UI/component | `site/components/full-page/TraceCardStack.test.tsx` |
| Copy-as-JSON button calls `navigator.clipboard.writeText` with full trace JSON (includes `startedAt` + `durationMs`) | T037a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| Copy-as-JSON fires Sonner toast "Copied" | T037 | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| `lastTrace` survives Manage↔Test tab toggle within one page lifecycle (ADR-0041) | T036a (RED), T040 (GREEN) | UI/component | `site/components/full-page/TestSurface.test.tsx` |
| Hydration: SSR markup matches CSR markup; no `console.error("Warning: ...")` output in jsdom | T032, T040 | regression | `site/components/full-page/TestSurface.test.tsx` |
| SDK call to `listSites` fixture shape matches `.d.ts` at `node_modules/@sitecore-marketplace-sdk/xmc/.../types.gen.d.ts → Sites.ListSitesResponse` | T031 | unit | `site/components/full-page/ScopePicker.test.tsx` (provenance comment in fixture) |
| SDK call to `listCollections` fixture shape matches `.d.ts` at `Sites.ListCollectionsResponse` | T031 | unit | `site/components/full-page/ScopePicker.test.tsx` (provenance comment in fixture) |
| **E5 — A11y + theme + structural guards** | | | |
| `EditRowModal`: Tab order = mode toggle → source → (snippets if Regex) → destination → (chips if Regex) → Cancel → Save | T042 | a11y | `project-planning/captures/tranche-5-a11y-audit-20260520.md` |
| `EditRowModal`: Esc closes (with unsaved-changes confirm if dirty) | T042 | a11y | `site/lib/__tests__/structural-guards/focus-management.test.ts` |
| `ScopePicker`: each `<Select>` keyboard-operable (Enter to open, arrows, Enter to commit) | T042 | a11y | `project-planning/captures/tranche-5-a11y-audit-20260520.md` |
| Skeleton state announces `aria-busy="true"` | T042 | a11y | `site/components/full-page/ScopePicker.test.tsx` |
| Test button disabled tooltip announced via `aria-describedby` | T042 | a11y | `site/components/full-page/TestSurface.test.tsx` |
| `TraceCard` sections have `aria-labelledby` for stage-name heading | T042 | a11y | `site/components/full-page/TraceCardStack.test.tsx` |
| Dark theme: runtime `getComputedStyle(el).color` / `.backgroundColor` contrast ≥4.5:1 AA on `EditRowModal` body text | T043 | theme (runtime contrast) | `site/components/EditRowModal.theme.test.tsx` |
| Dark theme: runtime contrast ≥4.5:1 on `ScopePicker` label + select control text | T043 | theme (runtime contrast) | `site/components/full-page/ScopePicker.theme.test.tsx` |
| Dark theme: runtime contrast ≥3:1 AA large-text on `TraceCard` stage headings (≥18pt or bold 14pt) | T043 | theme (runtime contrast) | `site/components/full-page/TraceCardStack.theme.test.tsx` |
| Light theme: same runtime contrast assertions pass | T043 | theme (runtime contrast) | All `.theme.test.tsx` files |
| System theme: `prefers-color-scheme: dark` mock → dark tokens applied | T043 | theme | `site/components/full-page/TestSurface.theme.test.tsx` |
| No hex literals `#[0-9a-fA-F]{3,8}` in any PRD-004 component file | T043, T045 | structural guard | `site/lib/__tests__/structural-guards/no-hex-in-prd004-components.test.ts` |
| All colors via `var(--<semantic-token>)` only — no Tailwind hex aliases like `text-red-500` | T043, T045 | structural guard | `site/lib/__tests__/structural-guards/semantic-tokens-only.test.ts` |
| Reduced-motion: tab-switch transition and trace-card stagger respect `prefers-reduced-motion: reduce` (ADR-0027) | T044 | a11y | `site/hooks/use-staggered-render.test.ts` + `site/components/full-page/TraceCardStack.test.tsx` |
| Host-frame visual smoke: Test tab (matched) at light theme matches `pocs/poc-v1-prd004/test-matched.html` within visual diff tolerance | T046 | visual regression | `site/tests/host-frame/test-tab-host-frame.smoke.test.ts` |
| Host-frame visual smoke: EditRowModal Pattern mode at dark theme matches `pocs/poc-v1-prd004/rowedit-pattern.html` | T046 | visual regression | `site/tests/host-frame/test-tab-host-frame.smoke.test.ts` |
| Host-frame: `<768px` stacked layout — left rail is an accordion at top; trace area stacks below | T046 | visual regression | `site/tests/host-frame/test-tab-host-frame.smoke.test.ts` |
| **E6 — Real-tenant smoke** | | | |
| 5+ operator-selected URLs; simulator output vs tenant Edge response; ≥80% match (M3) | T048 | smoke | `project-planning/smoke/smoke-prd-004-20260520.md` |
| Diagnose a non-match URL in <30 seconds without leaving the app (M4) | T048 | smoke | `project-planning/smoke/smoke-prd-004-20260520.md` |

## 4c. Implementation execution contract (for Developer 08)

The Developer (08) implements from `prd-minimal-004.md` + this file ONLY. The architecture document, full PRD-004, UI design spec, and ADR files should never need to be opened during normal flow. This section makes that possible.

### 4c-1. Non-negotiable technical boundaries

- **Zero new SDK surfaces.** The simulator + Test surface + EditRowModal reuse only the existing helpers in `site/lib/sdk/sites.ts`, `redirects-read.ts`, and `redirects-write.ts`. No new `client.query` / `client.mutate` calls.
- **Zero Sitecore data-model changes.** The Redirect Map template stays untouched. Mode is transient UI state (ADR-0040); never persisted to Sitecore.
- **`EditRowModal` does NOT contain `RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage`.** These are map-level SHARED fields managed in the existing map-settings UI (ADR-0043, FR-A8, T045 structural guard).
- **`EditRowModal` REPLACES inline editing** in `RedirectMapDetail` — do NOT keep both. One way to edit. Delete the existing inline-edit JSX (T017). The "+ Add mapping" affordance also routes to the modal.
- **Do NOT extract `RowEditForm` from `RedirectMapDetail`.** The pre-amendment plan called for that; the post-amendment plan creates `EditRowModal` as a new component and rewires the row click handler. The PRD § 10 typescript hint mentioning `edit-modal/EditRow.tsx` is pre-amendment and obsolete; the post-amendment file is `site/components/EditRowModal.tsx`.
- **Simulator is a verbatim port** of upstream `RedirectsProxy` (ADR-0038). Replicate quirks (`.slice(0, -1)` in `isRegexOrUrl`) verbatim. 100% upstream-fixture parity required (M2); any divergence requires explicit ADR-0038 waiver — never silently skipped.
- **Regex safety via dual time-cap** (ADR-0039): 100ms per row + 3s wall-clock total. Not Web Worker isolation.
- **Lift Test surface state to `FullPage`** (ADR-0041): `lastTrace` + `activeTab` live in `FullPage`; `TestSurface` is a controlled component. The Test→Manage deep-link uses a plain prop-drilled callback + `forwardRef` imperative handle on `RedirectMapDetail` — no event bus, no context provider.
- **Upstream fixtures are extracted by `extract-upstream-fixtures.ts`** (ADR-0042) — never hand-curated. The output `upstream-cases.json` is committed; the source `_upstream-source.ts` is gitignored.
- **Hydration-mismatch guard** (memory `feedback_hydration_mismatch_pattern.md`): NEVER call `localStorage`, `matchMedia`, `window`, `navigator`, `IntersectionObserver` in render body or `useState` initializer — only in `useEffect`. The scope picker hydrates after mount; the staggered-render hook checks reduced-motion after mount.
- **Locale-prefix snippet is deliberately omitted** from the snippet library (ADR-0023 multilingual cancellation). Five snippets only.
- **No new ADRs without operator confirmation.** The task-level decisions in T013 (`setTimeout 0` every 25 rows for event-loop yield) and T021 (paren-count is naïve; advisory cross-check) are implementation details captured in code comments — they do NOT require new ADRs.

### 4c-2. ADR one-liners

- **ADR-0038** — Simulator is a verbatim local port of upstream `RedirectsProxy`; 100% test-fixture parity required; any divergence needs explicit waiver. `isRegexOrUrl`'s `.slice(0, -1)` quirk is intentional.
- **ADR-0039** — Regex safety via 100ms `Promise.race` per-row + 3s wall-clock total cap; NOT Web Worker isolation.
- **ADR-0040** — Mode is transient UI state (not persisted to Sitecore); resets to `'pattern'` on every modal open; simulator is async (Promise-returning); UI staggers card render with `prefers-reduced-motion` fallback to instant.
- **ADR-0041** — Lift Test surface state (`lastTrace`, `activeTab`) up to `FullPage`; plain props + `forwardRef` imperative handle; no event bus / pubsub / context provider. Sole consumer pair.
- **ADR-0042** — `upstream-cases.json` is generated by a committed AST-walking script (`scripts/extract-upstream-fixtures.ts`), not hand-curated. Makes T2 reproducible; PRD-005 inherits the contract.
- **ADR-0043** — New `EditRowModal` (Blok dialog) replaces the existing inline row editing in `RedirectMapDetail`. Modal owns ONLY source + destination + mode toggle + regex helpers. Map-level fields (RedirectType, 3 flags) stay in the existing map-settings UI. One way to edit, no UX duality. Supersedes the old R8 (RowEditForm extraction); R8b governs the carry-over CRUD parity gate.
- **ADR-0002** (carry-forward) — Marketplace Mode A scaffold; iframe + ClientSDK. No change.
- **ADR-0003** (carry-forward) — Authoring GraphQL is the single source for CRUD. No change.
- **ADR-0008** (carry-forward) — `UrlMapping` field uses URL-encoded `=`/`&`-pair encoding. T1 probe verifies preservation of regex meta-chars.
- **ADR-0022** (carry-forward) — Picker-state localStorage uses versioned schema (`schemaVersion: 1`); `rm-test-picker-v1` is the key for the scope picker. Tenant mismatch returns null on hydration.
- **ADR-0023** (carry-forward) — Multilingual cancelled; UrlMapping is SHARED; no per-language redirects. Locale dropdown in Test surface is a request-side simulation knob only, not a content selector. Locale-prefix snippet omitted.
- **ADR-0024** (carry-forward) — V4 Blok Elevated tokens are the visual base. No new design variants.
- **ADR-0027** (carry-forward) — Motion budget: respect `prefers-reduced-motion: reduce`; falls back to instant render.

### 4c-3. Stack / tooling specifics

- **Project type:** Sitecore Marketplace app, scaffolded via `sitecore:setup-marketplace-client-side` (Mode A; PRD-000) at `products/redirect-manager/site/`. **Do NOT re-scaffold** — the project is already on disk. New files land alongside existing ones.
- **Package manager:** **`npm`** (carry-forward from PRD-000). Lockfile is `package-lock.json` at `products/redirect-manager/site/package-lock.json`. Never use `pnpm` / `yarn`.
- **Test runner:** **`vitest`** (carry-forward). Run with `npm test` (full suite) or `npm test -- <path-pattern>` (targeted). React Testing Library is wired (`@testing-library/react` + `@testing-library/jest-dom`).
- **Build command:** `npm run build` (Next.js production build). Smoke check: `npm run build && npm test`.
- **Dev command:** `npm run dev` (Next.js with `--experimental-https` via mkcert per `sitecore:marketplace-sdk-testing-debug`).
- **Type check:** `npx tsc --noEmit` (no separate npm script; CI runs as part of build).
- **TypeScript:** strict mode on; `@/` path alias resolves to `site/`.
- **HTTPS dev loop:** mkcert + Chrome Local Network Access headers (carry-forward from PRD-000; see `sitecore:marketplace-sdk-testing-debug`). Required for the parent iframe to embed the app during the T018 / T048 live-tenant smokes.
- **Cloud Portal test app:** registered (carry-forward from PRD-000); operator already has the dev URL configured. No re-registration needed for PRD-004 (zero new extension points; `sitecore:marketplace-sdk-extension-routes` not invoked).
- **Marketplace SDK packages in use** (carry-forward, NOT touched by PRD-004):
  - `@sitecore-marketplace-sdk/client` — `ClientSDK.init` / `client.query` / `client.mutate` (used by existing helpers only)
  - `@sitecore-marketplace-sdk/xmc` — `xmc.sites.listSites`, `xmc.sites.listCollections`, `xmc.authoring.graphql` (used by existing helpers only)
- **Lifecycle skill** (`sitecore:marketplace-sdk-lifecycle`) — no re-evaluation needed; auth model + iframe cookie requirements + Cloud Portal registration phases all carry forward from PRD-003.
- **No AI skills** — `sitecore:marketplace-sdk-ai` is NOT invoked by PRD-004. Future PRD-005 will introduce the `/sync-redirect-proxy` slash command but that is out of scope.
- **POC location:** `products/redirect-manager/pocs/poc-v1-prd004/` — open the HTML frames in a browser during implementation to match visual treatment exactly.
- **New devDep usage:** `tsx` is already present for running TypeScript scripts; T010 invokes it via `npm run extract:upstream-fixtures`.
- **Test pattern conventions:** `*.test.tsx` for component tests co-located with the component file; `*.test.ts` for library/hook tests co-located.

### 4c-4. UI implementation notes

**Canonical visual reference:** `products/redirect-manager/pocs/poc-v1-prd004/` — 18 HTML frames. Open these in a browser side-by-side with implementation. The POC's `prd004.css` is the canonical visual contract for new PRD-004 surfaces; `theme.css` / `elevated.css` / `surfaces.css` carry forward from PRD-002 V4 (ADR-0024).

**Binding tokens (semantic Blok V4 Elevated — NO hex literals):**

- **Typography:**
  - Body sans: `var(--font-sans)` — Geist Sans (carry-forward PRD-002)
  - Monospace: `var(--font-mono)` — Geist Mono (used for regex source/target inputs + trace card code snippets)
- **Color (semantic; never hex):**
  - Primary accent: `var(--primary)` — used for ResultCard accent border, Test button primary, mode-toggle active state
  - Background: `var(--background)` / surface: `var(--card)` / muted surface: `var(--muted)`
  - Text: `var(--foreground)` / muted text: `var(--muted-foreground)` (inline mode-mismatch hint uses muted, NOT destructive)
  - Destructive (errors): `var(--destructive)` / `var(--destructive-foreground)` (Save-time validation errors only)
  - Warning (timeout / diagnostic-incomplete): use a tinted card variant — refer to POC `test-timeout-row.html` + `test-diagnostic-incomplete.html` for exact treatment; if no semantic warning token is exported, derive via `color-mix(in oklch, var(--destructive) 30%, var(--card))` (memory `reference_hsl_var_token_broken_with_hex_values.md` — DO NOT wrap hex tokens in `hsl()`).
  - Info (mode-mismatch hint, stale-localStorage alert): `var(--muted-foreground)` for text, `var(--muted)` for background.
- **Spacing / radii / shadows:** all carry-forward from PRD-002 V4 — refer to POC `elevated.css`.

**Snippet library set (5 PM-proposed; T3 operator-validation flag in source code):**
1. `anchor-start` — `^/` ("Anchored start")
2. `trailing-slash` — `/?$` ("Trailing slash optional")
3. `query-strip` — `\?.*$` ("Strip query string")
4. `blog-migration` — `^/blog/(.+)$` ("Blog migration capture")
5. `file-extension` — `\.html?$` ("File extension")

A code comment in `regex-snippets.ts` flags the set as pending T3 operator-walkthrough validation. If the operator adjusts the set during T3, update the const + the snippet pills in the POC `rowedit-regex.html` should still serve as visual reference.

**EditRowModal layout (top → bottom):**

1. Mode toggle (Pattern / Regex segmented control, full-width above source)
2. Source input
3. Inline mode-mismatch hint (when applicable, muted styling)
4. Snippet library (Regex mode only, below source)
5. Sample-URL tester (Regex mode only, collapsed by default)
6. Destination input
7. Capture-group chip strip (Regex mode + groups > 0, adjacent to destination)
8. Footer: Cancel (secondary) + Save (primary)

**Test tab layout:**

- Tab control at top: Manage / Test segmented, below `WorkspaceHero` + `StatStrip`
- Two-column grid (≥768px): `grid-cols-[360px_1fr] gap-6`
- Left rail (sticky): scope picker → URL input → locale dropdown → Test button. Sticky via `lg:sticky lg:top-6 lg:self-start`.
- Right column (scrollable): empty state OR trace card stack OR result card stack
- Below 768px: columns stack; scope picker collapses to a `@/components/ui/collapsible` accordion at the top.

**Trace card stack:**

- Each card uses the existing `HoverLiftCard` pattern from `@/components/ui/hover-lift-card` (carry-forward PRD-002)
- Numeric stage indicators (1, 2, 3, ...) match existing typography
- Final result card (matched / unmatched): accent border via `var(--primary)`
- Diagnostic-incomplete / timeout cards: warning-tinted shell

**Copy-as-JSON button:** below the trace card stack; Sonner toast "Copied" on click via the existing `toast.success(...)` pattern + `DecorativeCta` decoration.

**Empty state — Test tab before first run:** hero illustration + 2-sentence "what is this?" copy + "Try a sample URL" button that pre-fills from the first rule of the first picked map (OQ-1 default).

**Error state — invalid regex on save:** inline error message below the source input; red border via `border-destructive`; error text below via `aria-describedby`; focus moves to the error.

**Hint state — mode mismatch:** subtle non-blocking inline message; muted token color (not warning red); `role="status"` (NOT `role="alert"`).

### 4c-5. File / module structure and naming conventions

**Project root:** `products/redirect-manager/site/` (Next.js app; carry-forward).

**New files PRD-004 introduces (exact paths):**

- `site/lib/redirects/proxy-simulator.ts` — simulator + types (T006-T013)
- `site/lib/redirects/__fixtures__/upstream-cases.json` — generated by T010 (committed)
- `site/lib/redirects/__fixtures__/tenant-cases.json` — manually captured at T011 (committed)
- `site/lib/redirects/__fixtures__/.gitignore` — gitignores `_upstream-source.ts` (T004)
- `site/lib/redirects/__fixtures__/_upstream-source.ts` — staged copy of upstream test file (T004; **gitignored**, never committed)
- `site/scripts/extract-upstream-fixtures.ts` — AST-walking extractor (T010)
- `site/lib/redirects/regex-snippets.ts` — static snippet library (T020)
- `site/lib/test-surface/scope-picker-state.ts` — localStorage helper (T029)
- `site/hooks/use-staggered-render.ts` — staggered-render hook (T028)
- **`site/components/EditRowModal.tsx`** — new modal (T016) — **path is exactly `site/components/EditRowModal.tsx`, NOT `site/components/edit-modal/EditRow.tsx`** (the PRD § 10 typescript hint is pre-amendment and obsolete)
- `site/components/EditRowModal.test.tsx` — modal unit tests (T018, T025)
- `site/components/EditRowModal.theme.test.tsx` — theme parity tests (T043)
- `site/components/full-page/TestSurface.tsx` — two-column shell (T030)
- `site/components/full-page/TestSurface.test.tsx` — integration tests (T040)
- `site/components/full-page/TestSurface.theme.test.tsx` — theme tests (T043)
- `site/components/full-page/ScopePicker.tsx` — cascading selectors (T031)
- `site/components/full-page/ScopePicker.test.tsx` — unit tests (T040)
- `site/components/full-page/ScopePicker.theme.test.tsx` — theme tests (T043)
- `site/components/full-page/TraceCardStack.tsx` — stack + stagger orchestration (T035)
- `site/components/full-page/TraceCard.tsx` — switch-rendered card per stage kind (T035, T038)
- `site/components/full-page/ResultCard.tsx` — visually distinct result card (T035)
- `site/components/full-page/EmptyState.tsx` — pre-test hero (T035)
- `site/components/full-page/TraceCardStack.test.tsx` — stack tests (T040, T043, T044)
- `site/lib/__tests__/structural-guards/no-hex-in-prd004-components.test.ts` (T045)
- `site/lib/__tests__/structural-guards/semantic-tokens-only.test.ts` (T045)
- `site/lib/__tests__/structural-guards/focus-management.test.ts` (T045)
- `site/lib/__tests__/structural-guards/map-level-field-not-in-modal.test.ts` (T045)
- `site/tests/host-frame/test-tab-host-frame.smoke.test.ts` — Playwright smoke (T046)

**Existing files PRD-004 modifies:**

- `site/components/full-page/FullPage.tsx` — add `activeTab` + `lastTrace` state; render Manage/Test tab control; conditionally render `TestSurface`; wire deep-link callback (T027, T036, T039)
- `site/components/full-page/RedirectMapDetail.tsx` — rewire row click + add-mapping button to open `EditRowModal`; delete inline edit JSX; add `forwardRef` imperative handle (T017)
- `site/package.json` — add `"extract:upstream-fixtures": "tsx site/scripts/extract-upstream-fixtures.ts"` (T010)

**Naming conventions:**

- Components: PascalCase TSX files (`EditRowModal.tsx`, `ScopePicker.tsx`)
- Library modules: kebab-case TS files (`proxy-simulator.ts`, `regex-snippets.ts`, `scope-picker-state.ts`)
- Hooks: kebab-case TS files starting with `use-` (`use-staggered-render.ts`)
- Tests: co-located, `.test.tsx` for components, `.test.ts` for libraries/hooks/scripts
- Theme tests: `.theme.test.tsx` (separate file per component; carry-forward PRD-002 pattern)
- Structural guards: under `site/lib/__tests__/structural-guards/`

**Module boundaries:**

- `EditRowModal.tsx` is in `site/components/`, NOT `site/components/full-page/` — it is reusable in principle (though only used by Full Page in PRD-004; could be reused by Context Panel in a future PRD).
- All Test surface components live under `site/components/full-page/` (already the home of `FullPage.tsx`, `RedirectMapList.tsx`, `RedirectMapDetail.tsx`, etc.).
- Simulator + fixtures + extractor live under `site/lib/redirects/`.
- Scope picker state helper lives under `site/lib/test-surface/`.

### 4c-6. Integration and API contract notes

**No new SDK surfaces introduced.** All SDK interaction is via existing helpers. Each integration point is cited below with file:line and a one-line shape summary from the existing comments.

#### 4c-6.1. `site/lib/sdk/sites.ts:31-40` — `listSites(client, sitecoreContextId): Promise<Sites.Site[]>`

- Verb: `client.query('xmc.sites.listSites', { params: { query: { sitecoreContextId } } })`
- Unwrap: DOUBLE `.data.data` (xmc module query envelope)
- Request type: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesData (line ~2561)`
- Response type: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesResponse (line ~2589) = Array<Sites.Site>` (item shape at `Sites.Site` line ~964)
- Used by: T031 `ScopePicker.tsx` (Site selector)

#### 4c-6.2. `site/lib/sdk/sites.ts:46-55` — `listCollections(client, sitecoreContextId): Promise<Sites.SiteCollection[]>`

- Verb: `client.query('xmc.sites.listCollections', { params: { query: { sitecoreContextId } } })`
- Unwrap: DOUBLE `.data.data`
- Request type: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListCollectionsData (line ~1757)`
- Response type: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListCollectionsResponse = Array<Sites.SiteCollection>` (item shape at `Sites.SiteCollection` line ~1050)
- Used by: T031 `ScopePicker.tsx` (Collection selector)

#### 4c-6.3. `site/lib/sdk/redirects-read.ts:213-240` — `listRedirectMaps(client, sitecoreContextId, sitePath): Promise<RedirectMapItem[]>`

- Verb: `client.mutate('xmc.authoring.graphql', ...)` (Authoring is a mutation endpoint even when used for reads)
- Unwrap: DOUBLE `.data.data` (`xmc.authoring.graphql` envelope verified 2026-05-11 — memory `reference_marketplace_sdk_envelope_authoring_graphql.md`)
- Request type: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData (line ~2)`
- Response type: `// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlResponse (line ~61)` — body inside `.data.data` is the GraphQL response shape; decoded to `RedirectMapItem[]` by `decodeWireItem`
- Used by: T031 `ScopePicker.tsx` (Map(s) multi-selector) — same site-path pattern as Manage tab

#### 4c-6.4. `site/lib/sdk/redirects-write.ts` — `updateRedirectMap(...)`

- Verb: `client.mutate('xmc.authoring.graphql', { params: { query: { sitecoreContextId }, body: { query: <updateItem mutation>, variables: {...} } } })`
- Unwrap: DOUBLE `.data.data.updateItem.item`
- Request type: same `Authoring.GraphqlData` envelope as 4c-6.3
- Response type: same `Authoring.GraphqlResponse` envelope; inner shape is `{ updateItem: { item: { itemId } } }`
- Used by: T016 `EditRowModal.tsx` Save action (and T017 retained map-level controls)
- **Verified contract** (real-tenant capture 2026-05-11, Tranche 6a):
  - `UpdateItemInput` accepts: `itemId` (required), `fields` (array of `{ name, value }`)
  - `name` field is NOT accepted on `UpdateItemInput` — rename has a dedicated `renameItem` mutation
  - Boolean write repr: `'0'` / `'1'` (string) — canonical write form
  - `RedirectType` enum values at GraphQL level (string): `'ServerTransfer'`, `'Redirect301'`, `'Redirect302'`. `Redirect307` rejected by resolver.

#### 4c-6.5. Upstream proxy parity contract

**No runtime dependency** — the upstream `Sitecore/content-sdk` package is NOT installed in `site/node_modules/`. The simulator is studied via GitHub source. Rule `40-sdk-contracts.mdc` is **satisfied by absence** — no SDK surface is being called; nothing to cite from a `.d.ts`.

**Upstream sources (T003 captures pinned in `proxy-simulator.ts` header at T013):**
- `https://github.com/Sitecore/content-sdk/blob/<SHA>/packages/nextjs/src/proxy/redirects-proxy.ts`
- `https://github.com/Sitecore/content-sdk/blob/<SHA>/packages/core/src/tools/utils.ts`

**Drift detection** is OUT of scope for PRD-004; PRD-005 introduces it.

#### 4c-6.6. Simulator internal contract

```ts
// site/lib/redirects/proxy-simulator.ts
export async function simulate(input: SimulationInput): Promise<SimulationTrace>;
```

`SimulationInput` / `SimulationTrace` / `SimulationStage` / `SimulationResult` type definitions are in the same file (T006-T007). Used only internally — no network exposure.

#### 4c-6.7. Browser APIs used

- `navigator.clipboard.writeText` — Copy-as-JSON button (T037). Browser API; requires HTTPS or localhost (satisfied by dev `--experimental-https`).
- `window.matchMedia('(prefers-reduced-motion: reduce)')` — useStaggeredRender hook (T028). Hydration-safe: call in `useEffect`, NOT render.
- `localStorage.getItem / setItem` — scope-picker-state helper (T029). Hydration-safe: call in `useEffect`, NOT render.

### 4c-7. Parity / rebuild pointers

**N/A — feature-scoped delta on existing app; carry-forward all unrelated surfaces from PRD-000/002/003.**

This is a feature PRD on an existing app, NOT a greenfield or rebuild. The only existing component touched is `RedirectMapDetail.tsx` (T017: row click handler rewire + inline-edit JSX removal + `forwardRef` imperative handle add). `FullPage.tsx` is modified in three discrete ways (T027 tab control, T036 lifted state, T039 deep-link callback). All other existing surfaces — `CollectionPicker`, `SitePicker`, `RedirectMapList`, `TopActionRow`, `WorkspaceHero`, `StatStrip`, `NewRedirectMapModal`, `DeleteMapConfirmModal`, `ImportRedirectMapModal`, `PublishSiteConfirmModal`, the entire `context-panel/` directory, the entire `dashboard-widget/` directory — are NOT modified.

Visual contract for the post-amendment PRD-004 surfaces is `pocs/poc-v1-prd004/` (18 frames + `click-targets.md` + `prd004.css`). Visual contract for unchanged carry-forward surfaces is the existing PRD-002 V4 Blok Elevated baseline (ADR-0024).

### 4c-8. QA extensions — context Developer (08) needs for test tasks

Added by QA Specialist (07). This subsection contains detail that test tasks in §§ 9 and 10 reference, pulled here from upstream docs so Developer (08) never needs to open them.

#### 4c-8.1. WCAG contrast thresholds (NFR-2 + § 9.6)

All contrast assertions in theme tests must use these exact thresholds:

| Text category | Minimum ratio | Examples in PRD-004 |
|---|---|---|
| Normal text (body, labels, error messages, hint text) | **4.5:1** | Modal source/dest labels, hint text, error message, picker labels, trace card body text |
| Large text (headings ≥18pt bold, stage name headings at ≥14pt bold) | **3:1** | TraceCard stage headings, ResultCard final URL |
| UI components + graphical objects (icon buttons, focus rings, accent borders) | **3:1** | ResultCard accent border via `var(--primary)`, disabled-button state |

Runtime contrast helper pattern (do NOT use `hsl(var(--token))` — the Blok Nova preset stores hex literals; see memory `reference_hsl_var_token_broken_with_hex_values.md`):

```ts
// Use this pattern in *.theme.test.tsx files:
import { getComputedStyle } from 'some-contrast-helper'; // or use jest-axe
const el = screen.getByRole('button', { name: /save/i });
const fg = window.getComputedStyle(el).color;          // resolves to rgb(...)
const bg = window.getComputedStyle(el).backgroundColor; // resolves to rgb(...)
// Pass rgb strings to your contrast ratio helper
expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
```

#### 4c-8.2. Playwright selectors for host-frame smoke (T046) from `pocs/poc-v1-prd004/click-targets.md`

These selectors are the canonical interactive targets for the host-frame visual diff. Use them in `test-tab-host-frame.smoke.test.ts` to interact with the app before taking screenshots:

| Surface | Selector | Action |
|---|---|---|
| Manage→Test tab | `.fp-tab[data-tab="test"]` | click |
| Test→Manage tab | `.fp-tab[data-tab="manage"]` | click |
| Test button (submit) | `.test-rail__submit` | click |
| Collection picker | `.scope-picker__select#scope-collection` | select |
| URL input | `#test-url` | fill |
| Locale select | `#test-locale` | select |
| Copy as JSON | `.copy-json-btn` | click |
| ResultCard "Open in Manage" | `.result-card .open-in-manage-btn` | click |
| Row click (opens EditRowModal) | first row cell in `.fp-detail table` | click |
| EditRowModal Pattern mode toggle | `.mode-toggle__btn[data-mode="pattern"]` | click |
| EditRowModal Regex mode toggle | `.mode-toggle__btn[data-mode="regex"]` | click |
| Snippet pill (anchor-start) | `.snippet-pill[data-snippet="anchor-start"]` | click |
| Capture chip `$siteLang` | `.capture-chip[data-chip="$siteLang"]` | click |
| EditRowModal Save | `.save-btn` | click |
| EditRowModal close (×) | `.edit-row-modal__close` | click |
| Stale localStorage alert | `.scope-picker__stale-alert` or `[role="status"]` containing "previous selection" | assert visible |

POC frames used as visual diff source of truth (served via `npx serve pocs/poc-v1-prd004/`):

| Axis | POC frame |
|---|---|
| Test tab matched (light) | `test-matched.html` |
| Test tab matched (dark) | `test-matched.html` with dark theme toggle activated |
| EditRowModal Pattern (light) | `rowedit-pattern.html` |
| EditRowModal Pattern (dark) | `rowedit-pattern.html` with dark theme |
| Mobile <768px stacked | Any `test-*.html` at 375px viewport |

#### 4c-8.3. Existing fixture file paths (SDK shape parity for ScopePicker tests)

These files contain real-tenant-captured SDK response shapes from prior PRDs. Use them as test fixtures in `ScopePicker.test.tsx` and add provenance comments:

- `site/tests/fixtures/graphql/sites-list.json` — shape matches `Sites.ListSitesResponse` from `node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListSitesResponse` (line ~2589). Provenance: `// source: real-tenant capture — see site/lib/sdk/sites.ts header`
- `site/tests/fixtures/graphql/collections-list.json` — shape matches `Sites.ListCollectionsResponse` (line ~1757 same file). Provenance: `// source: real-tenant capture — see site/lib/sdk/sites.ts header`

If these files do not exist on disk (they were referenced in the architecture and task breakdown as prior-PRD captures but may not yet be committed), fall back to constructing minimal mock objects matching the `.d.ts` shape directly — do NOT paraphrase from this task breakdown. Each field in the mock must be traceable to the `.d.ts` line cited above.

#### 4c-8.4. ADR-0008 `UrlMapping` encoding contract (T018 CRUD parity tests)

The `UrlMapping` field uses URL-encoded `=`/`&`-pair encoding. When testing that `updateRedirectMap` is called with the correct payload in `EditRowModal.test.tsx`, the mock-call assertion must verify the encoded form, not the raw source/target strings.

Encoding rule (from memory `reference_sitecore_redirect_map_field_shape.md`): each mapping row is serialized as `source%3Dtarget` where `=` is encoded as `%3D` and `&` as `%26`. Multiple rows are joined with `&` (unencoded separator). The `parse.ts` / `serialize.ts` helpers in `site/lib/url-mapping/` handle this — test the helpers independently in `parse.test.ts` / `serialize.test.ts` if not already covered; reference them in the `EditRowModal.test.tsx` mock assertion by importing the serializer to produce the expected encoded string rather than hardcoding it.

## 5. Dependencies

**Ordering constraints:**

- T1 (probe) is a HARD GATE. T2 cannot start until T005 closes the T1 gate.
- T2 builds the simulator that T4 wires to. T013 must complete before T034 (Test button click handler).
- T3 must start with modal scaffold (T016) → row click rewire (T017) → carry-over CRUD smoke (T018) BEFORE any regex affordance (T019+) lands. R8b gate per ADR-0043.
- T4 builds on T3's `EditRowModal` (the Test→Manage deep-link in T039 opens the modal).
- T5 audits T2/T3/T4 — must follow them.
- T6 smokes the full end-to-end against the live tenant — must follow T5.

**Execution order** (numbered list; execution agent runs this sequence top-down). QA-inserted RED-test scaffold tasks are marked with `[RED]`; implementation tasks that depend on them are marked `[GREEN]`. T1/T6 probe tranches are marked `[PROBE]` — they are evidence-capture, not test-first coded; TDD discipline does not apply to them.

1. T001 [PROBE]
2. T002 [PROBE]
3. T003 [PROBE]
4. T004 [PROBE]
5. T005 [PROBE]
6. T006
7. T007
8. T008a [RED] — failing tests for `isRegexOrUrl` + `getRedirectPatternRegex` verbatim behavior (new; depends on T007)
9. T008 [GREEN] — port helpers until T008a is GREEN
10. T009a [RED] — failing test for `runTimedTest` 100ms timeout + wall-clock semantics (new; depends on T008)
11. T009 [GREEN] — implement `runTimedTest` until T009a is GREEN
12. T010
13. T011
14. T012a [RED] — write the parameterized fixture test runner shell with stubs that fail (renamed from T012's first-run intent; depends on T010, T011)
15. T012 [GREEN] — verify T012a is RED before T013 starts (this is the explicit RED checkpoint; T013 is the GREEN phase)
16. T013a [RED] — add wall-clock-cap test (500-row all-timeout inventory → `diagnostic-incomplete`) before implementing the cap (new; depends on T012)
17. T013 [GREEN] — implement `simulate()` orchestrator until all fixture tests + T013a are GREEN
18. T014
19. T015
20. T016
21. T017
22. T018a [RED] — write failing unit tests for `EditRowModal` open/close/save/cancel before the modal scaffold lands (new; depends on T017)
23. T018 [GREEN] — carry-over CRUD smoke + make T018a tests GREEN; HARD GATE before T019
24. T019a [RED] — write failing unit tests for mode toggle defaults + mode-change state preservation (new; depends on T018)
25. T019 [GREEN] — implement mode toggle until T019a is GREEN
26. T020a [RED] — write failing UI tests for snippet pill rendering + insert-at-cursor (Regex mode only) (new; depends on T019)
27. T020 [GREEN] — implement snippet library until T020a is GREEN
28. T021a [RED] — write failing unit tests for capture-group chip count + insert + `$siteLang` always-present (new; depends on T020)
29. T021 [GREEN] — implement capture-group chips until T021a is GREEN
30. T022a [RED] — write failing UI tests for sample tester match/no-match/timeout cases (new; depends on T021)
31. T022 [GREEN] — implement sample-URL tester until T022a is GREEN
32. T023a [RED] — write failing unit tests for all save-time validation branches (invalid regex, `$0`, `$N` > groups, `$siteLang` exempt, pattern-mode advisory) (new; depends on T022)
33. T023 [GREEN] — implement save-time validation until T023a is GREEN
34. T024a [RED] — write failing UI tests for inline mode-mismatch hint (`role="status"`, muted token, Switch mode button) (new; depends on T023)
35. T024 [GREEN] — implement inline hint until T024a is GREEN
36. T025
37. T026
38. T027a [RED] — write failing UI test for Manage/Test tab switch + `lastTrace` persistence across tabs (new; depends on T026)
39. T027 [GREEN] — add tab control to `FullPage.tsx` until T027a is GREEN
40. T028a [RED] — write failing unit tests for `useStaggeredRender` default + reduced-motion + cleanup (new; depends on T026)
41. T028 [GREEN] — implement hook until T028a is GREEN
42. T029a [RED] — write failing unit tests for `scope-picker-state.ts` all 5 reset branches (new; depends on T026)
43. T029 [GREEN] — implement `scope-picker-state.ts` until T029a is GREEN
44. T030
45. T031a [RED] — write failing UI tests for ScopePicker 3 cascading selectors + skeleton + error+retry + cascading invalidation (new; depends on T030)
46. T031 [GREEN] — implement `ScopePicker.tsx` until T031a is GREEN
47. T032a [RED] — write failing UI tests for stale-ID detection + inline alert + hydration empty-first (new; depends on T029, T031)
48. T032 [GREEN] — wire localStorage hydration + persistence until T032a is GREEN
49. T033a [RED] — write failing UI tests for URL input validation + locale dropdown + Test button disabled-state + tooltip (new; depends on T032)
50. T033 [GREEN] — implement URL input + locale + Test button until T033a is GREEN
51. T034a [RED] — write failing unit test for rule-flattening + `SimulationInput` construction from picked maps (new; depends on T013, T033)
52. T034 [GREEN] — wire Test button to `simulate()` until T034a is GREEN
53. T035a [RED] — write failing UI tests for TraceCardStack exhaustive stage rendering + ResultCard + EmptyState (new; depends on T028, T034)
54. T035 [GREEN] — build trace UI components until T035a is GREEN
55. T036a [RED] — write failing UI test for `lastTrace` surviving tab toggle (new; depends on T035)
56. T036 [GREEN] — lift state to `FullPage` until T036a is GREEN
57. T037a [RED] — write failing UI test for Copy-as-JSON clipboard write + Sonner toast (new; depends on T036)
58. T037 [GREEN] — wire copy-as-JSON until T037a is GREEN
59. T038a [RED] — write failing UI tests for `pre-filter` informational label, timeout warning border, rows-considered 20-cap + expand, `diagnostic-incomplete` warning shell (new; depends on T037)
60. T038 [GREEN] — wire trace card variants until T038a is GREEN
61. T039a [RED] — write failing E2E-style test for deep-link path (tab switch + map select + modal open + failure toasts) (new; depends on T036, T017)
62. T039 [GREEN] — wire deep-link callback until T039a is GREEN
63. T040
64. T041
65. T042
66. T043
67. T044
68. T045
69. T046
70. T047 [PROBE]
71. T048 [PROBE]
72. T049 [PROBE]

**Parallel groups** (QA-enriched; RED tasks shown explicitly; execution agent MAY spawn multiple Developer agents for independent groups when task count justifies it — recommend sequential execution):

```
Group 1 (sequential — T1 probe):
  T001 → T002 → T003 → T004 → T005

Group 2 (sequential — T2 simulator core with RED-first):
  T006 → T007 → T008a [RED] → T008 [GREEN] → T009a [RED] → T009 [GREEN]

Group 2a (sequential — extractor + parameterized test runner RED-first):
  T010 → T011 (after T002) → T012a [RED] → T012 [GREEN] → T013a [RED] → T013 [GREEN] → T014 → T015

Group 3 (sequential — T3 modal RED-first; T018 HARD GATE before T019+):
  T016 → T017 → T018a [RED] → T018 [GREEN/GATE] →
  T019a [RED] → T019 [GREEN] →
  T020a [RED] → T020 [GREEN] →
  T021a [RED] → T021 [GREEN] →
  T022a [RED] → T022 [GREEN] →
  T023a [RED] → T023 [GREEN] →
  T024a [RED] → T024 [GREEN] →
  T025 → T026

Group 4 (sequential — T4 scaffold RED-first; T027a/T028a/T029a depend only on T026,
          can be written in parallel but implemented sequentially):
  T027a [RED] → T027 [GREEN] → T028a [RED] → T028 [GREEN] → T029a [RED] → T029 [GREEN]

Group 5 (sequential — T4 wiring RED-first):
  T030 → T031a [RED] → T031 [GREEN] →
  T032a [RED] → T032 [GREEN] →
  T033a [RED] → T033 [GREEN] →
  T034a [RED] → T034 [GREEN] →
  T035a [RED] → T035 [GREEN] →
  T036a [RED] → T036 [GREEN] →
  T037a [RED] → T037 [GREEN] →
  T038a [RED] → T038 [GREEN] →
  T039a [RED] → T039 [GREEN] →
  T040 → T041

Group 6 (sequential — T5 audits; each builds on previous findings):
  T042 → T043 → T044 → T045 → T046

Group 7 (sequential — T6 smoke):
  T047 → T048 → T049
```

**Recommendation:** run sequentially. The RED/GREEN pairing in each group is inviolable — no GREEN task may start until its RED counterpart fails in CI. The structural pairing also means the natural parallelism in Groups 4-5 (T027a/T028a/T029a all depend on T026) is below the threshold where parallel agents save meaningful time.

## 6. Suggested Milestones

- **M-T1** — T1 gate closed (T005). Probe evidence in hand; encoder/decoder verified or T0 follow-up filed.
- **M-T2** — Simulator + fixtures GREEN with 100% upstream parity (T015). Foundation for PRD-005 in place.
- **M-T3** — `EditRowModal` shipped with carry-over CRUD smoke GREEN + regex affordances (T026). R8b gate cleared.
- **M-T4** — Test tab end-to-end functional with scope picker + trace cards + deep-link (T041). PR-ready for code review.
- **M-T5** — A11y + theme + structural guards GREEN (T046). Ship-ready.
- **M-T6** — Real-tenant smoke ≥80% match (T049). Shipped (or `shipped_with_caveats`).

## 7. Risk Areas

- **R1 (PRD § 13)** — T1 probe failure on regex chars. **Mitigation:** T005 gates T2; T0 fix-first if any class fails.
- **R2** — Simulator drift from upstream over time. **Mitigation in PRD-004:** T013 header SHA + T015 manifest record. **Long-term:** PRD-005 drift detection.
- **R3** — Catastrophic regex hangs the UI. **Mitigation:** T009 100ms per-row + T013 3s wall-clock; verified in T013 unit tests.
- **R4** — Operator authors regex in Pattern mode. **Mitigation:** T024 inline hint; same `isRegexOrUrl` as simulator (single source of truth).
- **R5** — Trace too dense. **Mitigation:** T035 ResultCard is visually dominant; T035 EmptyState pre-fills sample URL; T048 smoke validates operator readability.
- **R7** — Bundle bloat. **Mitigation:** NFR-6 ≤25KB gz budget; T010 extractor is build-time-only (not shipped); T020 snippet library is static const.
- **R8b** — `EditRowModal` regresses CRUD parity. **Mitigation:** T018 carry-over CRUD smoke is the gate; mandatory GREEN before T019.
- **R9** — Scope-picker localStorage stale across tenant switches. **Mitigation:** T029 includes `tenantId` in persisted shape; hydration resets on mismatch.
- **R10** — Cascading picker clumsy on 50+ sites. **Mitigation:** `@blok/select` search input by default; T048 smoke surfaces complaints → file follow-up.
- **R11 (new)** — Hydration mismatch on `localStorage` / `matchMedia` access in render. **Mitigation:** T028 + T029 + T032 all call browser APIs only in `useEffect`. Memory `feedback_hydration_mismatch_pattern.md` is the canonical pattern.
- **R12 (new)** — `EditRowModal` accidentally re-introduces map-level fields. **Mitigation:** T045 structural guard `map-level-field-not-in-modal.test.ts` blocks PR if any of the four forbidden fields render.

## 8. Suggested Team Structure

Single Developer (08) implements the sequence top-down. The pre-set tranche skeleton makes parallelization unnecessary at the developer level. QA Specialist (07) reviews this file in place after Lead Dev (06) signs off, extending §§ 4b/9/10 with TDD orchestration and per-task RED-first sequencing where it applies.

## 9. TDD and quality contract

Populated by QA Specialist (07). These rules are non-negotiable for all build tranches (T2, T3, T4, T5). Probe tranches (T1, T6) are evidence-capture and are explicitly exempt from RED→GREEN ordering — they produce operator-recorded notes, not automated tests.

---

### 9.1 RED → GREEN → REFACTOR mandate

Every implementation task in Tranches T2, T3, T4, and T5 follows this sequence:

1. **RED:** Write the failing test(s) first. The test file must exist and fail before any production code is written. Failure mode must be a real assertion failure (not a "file not found" or compile error). Commit the RED state.
2. **GREEN:** Write the minimum production code to make every failing test pass. No more, no less. Commit the GREEN state.
3. **REFACTOR:** Clean up — extract named functions, add JSDoc upstream-line citations, remove dead branches — without changing observable behavior. Re-run the test suite; it must remain GREEN.

The QA-inserted RED tasks (`T008a`, `T009a`, `T012a`, `T013a`, `T018a`, `T019a`, `T020a`, `T021a`, `T022a`, `T023a`, `T024a`, `T027a`, `T028a`, `T029a`, `T031a`, `T032a`, `T033a`, `T034a`, `T035a`, `T036a`, `T037a`, `T038a`, `T039a`) each carry exactly this role. Their `Depends on` fields are set so that no GREEN implementation task can start before the RED task is complete.

---

### 9.2 Hard gates (must be GREEN before downstream tasks may start)

| Gate | Condition | Blocks |
|------|-----------|--------|
| **T1 gate** | T005 closes with all character classes PASS in `tranche-1-regex-roundtrip-20260520.md` | T006 (T2 start) |
| **T2 fixture parity gate** | T014: all upstream-case fixtures GREEN in `proxy-simulator.test.ts` | T015 (manifest update) and T016 (T3 start) |
| **T18 R8b gate** | T018 carry-over CRUD smoke GREEN (automated unit tests + live-tenant walkthrough evidence in capture file) | T019a and T019 (mode toggle). **T019 must not start until T018 is GREEN.** |
| **T5 guards gate** | T045 all structural guards GREEN (no-hex, semantic-tokens, focus-management, map-level-field-not-in-modal) | T046 (host-frame smoke) |
| **T6 smoke gate** | T049: outcome set to `passed` or `shipped_with_caveats` in run manifest | PR merge permitted |

---

### 9.3 SDK-touching RED tests — fixture provenance rules

Rule `30-tdd.mdc` + `40-sdk-contracts.mdc`: every fixture that stands in for an SDK response must have an independently sourced provenance comment — not paraphrased from this task breakdown or from skill-catalog prose.

**PRD-004 fixture provenance map:**

| Test surface | Fixture source | Provenance comment required |
|---|---|---|
| `proxy-simulator.test.ts` upstream cases | `upstream-cases.json` generated by `extract-upstream-fixtures.ts` from real upstream `redirects-proxy.test.ts` | `// source: Sitecore/content-sdk <SHA> packages/nextjs/src/proxy/redirects-proxy.test.ts` |
| `proxy-simulator.test.ts` tenant cases | `tenant-cases.json` captured from live tenant at T011 | `// source: real-tenant capture <tenantHost> T011 <capturedAt>` |
| `ScopePicker.test.tsx` — `listCollections` response | Reuse existing `site/tests/fixtures/graphql/collections-list.json` (captured T010/T065 per `lib/sdk/sites.ts` header) | `// source: real-tenant capture — see site/lib/sdk/sites.ts header` |
| `ScopePicker.test.tsx` — `listSites` response | Reuse existing `site/tests/fixtures/graphql/sites-list.json` (captured T010/T065 per `lib/sdk/sites.ts` header) | `// source: real-tenant capture — see site/lib/sdk/sites.ts header` |
| `EditRowModal.test.tsx` — `updateRedirectMap` round-trip | Reuse existing `UrlMapping` round-trip fixtures from PRD-000 era (carry-forward) | `// source: PRD-000 real-tenant capture; see site/lib/sdk/redirects-write.ts header` |

**No PRD-004 task introduces new SDK calls.** Therefore, no new SDK fixture capture is required beyond the tenant cases captured at T011 (simulator parity). The simulator itself has no runtime dependency on any SDK — it is tested against JSON fixture files only. The scope picker reuses existing fixture files from prior PRDs whose provenance is already on disk.

Any fixture that cannot be traced to one of the above sources is rejected. A comment `// source: assumed` is not acceptable.

---

### 9.4 T1 and T6 are probe tranches — not RED-test-driven

T1 (Tasks T001–T005) and T6 (Tasks T047–T049) are operator-driven evidence-capture tranches. Their outputs are markdown capture files and manifest updates, not automated tests. TDD discipline does not apply to them. They are marked `[PROBE]` in the execution order list.

This does NOT mean they are exempt from quality standards: T1 must produce a per-character-class PASS/FAIL matrix that is peer-reviewable. T6 must produce a per-URL smoke evidence table. Both feed into `smoke_outcomes` in the run manifest.

---

### 9.5 Meaningful tests only — prohibited patterns

The following test patterns are prohibited in this codebase and will be flagged at code review:

- `expect(CONSTANT).toBe(CONSTANT)` — testing that a constant equals itself
- `expect(true).toBe(true)` — trivial pass
- `expect(component).toBeTruthy()` — snapshot of "something rendered" with no behavioral assertion
- `toHaveClass("bg-primary")` alone as a theme test — class-string check without runtime contrast assertion
- `toMatchSnapshot()` as the sole assertion for an accessibility or contrast requirement
- Mock that returns `undefined` for every SDK call — test that can never fail because nothing is asserted about the SDK shape

Every test must assert behavior that operators care about: what the user sees, what state is persisted, what error fires, what value is produced.

---

### 9.6 Theme and runtime contrast — assertion standard

All theme tests (`*.theme.test.tsx`) for PRD-004 components must assert RESOLVED foreground/background contrast at runtime, not class-string presence. Required pattern:

```ts
// For each themed element under test:
const el = screen.getByRole('button', { name: /save/i });
const style = window.getComputedStyle(el);
const bg = style.backgroundColor;
const fg = style.color;
const ratio = computeContrastRatio(bg, fg); // use a contrast helper
expect(ratio).toBeGreaterThanOrEqual(4.5); // AA normal text
```

The `computeContrastRatio` helper must resolve CSS custom properties to their actual RGB values in the test environment (jsdom + jest-css-vars or equivalent). Do NOT wrap `--primary` hex values in `hsl()` — the Blok Nova preset stores `--primary` as a hex literal; `hsl(var(--primary))` will collapse to `currentColor` (memory `reference_hsl_var_token_broken_with_hex_values.md`). Use `var(--primary)` directly.

Contrast thresholds:
- Normal text (body, labels, error messages): ≥ **4.5:1** (WCAG 2.1 AA)
- Large text (stage headings ≥18pt or bold ≥14pt): ≥ **3:1** (WCAG 2.1 AA large)
- UI components + graphical elements (icon-only buttons, focus rings): ≥ **3:1**

---

### 9.7 Hydration safety — assertion standard

Every component that accesses browser globals (`localStorage`, `matchMedia`, `window`, `navigator`, `IntersectionObserver`) must access them ONLY inside `useEffect`. Access in `useState` initializers or render bodies causes SSR/CSR hydration mismatches.

**Test assertion standard:** Vitest + jsdom cannot detect hydration mismatches directly. The required test pattern is:

1. Render the component in a test that simulates SSR by NOT running effects (`act()` is deferred or not called).
2. Assert that the component's initial render matches the server-rendered empty/skeleton state — NOT the localStorage-hydrated state.
3. Then run effects and assert the hydrated state loads correctly.

A comment in every relevant test file must read:

```ts
// HYDRATION NOTE: Playwright smoke is the only true SSR/CSR mismatch gate.
// This test verifies the client-side hydration path only (jsdom, effects run).
// Per memory feedback_hydration_mismatch_pattern.md.
```

Components with this requirement: `TestSurface.tsx` (localStorage via `scope-picker-state.ts`), `ScopePicker.tsx` (localStorage hydration in T032), `useStaggeredRender.ts` (`matchMedia` in `useEffect`).

---

### 9.8 Verbatim upstream parity — test standard (ADR-0038 + M2)

The parameterized fixture test runner in `proxy-simulator.test.ts` is the M2 hard gate. Rules:

- Every entry in `upstream-cases.json` runs as its own parameterized `it.each` case.
- The test assertion is byte-identical comparison of the full `SimulationResult` shape (not just `matched` flag). Use `expect(result).toStrictEqual(expected)`.
- A failing upstream-case test is NEVER silently skipped. `test.skip(...)` on any upstream-case fixture requires an explicit ADR-0038 waiver entry (operator approval before merge).
- The test description for each parameterized case includes the upstream fixture's `description` field so failures are immediately readable in CI output.
- Any known divergence between our simulator and upstream is documented in both `proxy-simulator.ts` header ("Known divergences from upstream" list) AND a new note appended to ADR-0038. The target state is an empty divergence list (M2 = 100% parity).

---

### 9.9 Map-level-field-not-in-modal guard (ADR-0043 + T045)

The structural guard test `site/lib/__tests__/structural-guards/map-level-field-not-in-modal.test.ts` must:

1. Render `<EditRowModal open={true} ... />` with a real `RedirectMapItem` prop (using a captured fixture row).
2. Query the rendered DOM for the strings `"RedirectType"`, `"IncludeVirtualFolder"`, `"PreserveQueryString"`, `"PreserveLanguage"` as both text content AND accessible labels.
3. Also scan the **source code** of `site/components/EditRowModal.tsx` for any reference to these four strings using a regex search assertion (not just the rendered DOM — source scan catches JSX comments and dead branches that don't render but are present in the file).
4. Test fails if ANY of the four strings appear in either the DOM or the source.

This guard is the ADR-0043 enforcement mechanism. It runs in CI on every commit that touches `EditRowModal.tsx`.

---

### 9.10 Catastrophic-backtracking and wall-clock-cap tests (ADR-0039)

**Per-row 100ms timeout test (T009a):**

```ts
// Test must NOT use vi.useFakeTimers() — real time is required to verify actual JS event-loop blocking.
// Use a real catastrophic pattern against a long string.
it('runTimedTest: catastrophic pattern resolves timeout within 150ms', async () => {
  const catastrophicRegex = /(a+)+$/;
  const longInput = 'a'.repeat(30) + '!';
  const start = Date.now();
  const result = await runTimedTest(catastrophicRegex, longInput);
  const elapsed = Date.now() - start;
  expect(result).toBe('timeout');
  expect(elapsed).toBeLessThan(150); // 100ms cap + 50ms scheduling jitter
});
```

**3-second wall-clock cap test (T013a):**

```ts
it('simulate: 500-row all-timeout inventory hits wall-clock cap with diagnosticIncomplete', async () => {
  const catastrophicRule: ScopedRedirectRule = { source: '(a+)+$', target: '/dest', rowIndex: 0, parentMap: { ... } };
  const rules = Array.from({ length: 500 }, (_, i) => ({ ...catastrophicRule, rowIndex: i }));
  const input: SimulationInput = { url: '/test/' + 'a'.repeat(30) + '!', locale: 'en', rules, siteLanguage: 'en' };
  const start = Date.now();
  const trace = await simulate(input);
  const elapsed = Date.now() - start;
  // Wall-clock cap is 3s; allow 500ms jitter for test environment scheduling
  expect(elapsed).toBeLessThan(3500);
  const incompleteStage = trace.stages.find(s => s.kind === 'diagnostic-incomplete');
  expect(incompleteStage).toBeDefined();
  expect((incompleteStage as any).reason).toBe('wall-clock-cap');
  expect((incompleteStage as any).totalRows).toBe(500);
}, 10_000); // Vitest timeout: 10s (the test itself caps at ~3.5s)
```

Both tests use REAL timers. `vi.useFakeTimers()` is explicitly prohibited for these tests because the backtracking behavior depends on actual JS thread blocking.

---

### 9.11 POC fidelity — visual smoke standard (platform_target: marketplace)

Per `sitecore:marketplace-sdk-host-frame-testing` skill conventions and the global marketplace rule: the canonical visual test target is the **clipped iframe inside the live host frame**, NOT a standalone localhost render.

**Five axes required for T046 host-frame smoke:**

| Axis | POC source of truth | Tool |
|---|---|---|
| Light theme | `pocs/poc-v1-prd004/test-matched.html` + `rowedit-pattern.html` | Playwright visual diff |
| Dark theme | Same frames with `data-theme="dark"` applied | Playwright visual diff |
| System theme (`prefers-color-scheme: dark`) | Same frames with system dark emulation | Playwright visual diff |
| Reduced-motion | Same frames with `prefers-reduced-motion: reduce` emulation; assert stagger is absent | Playwright visual diff + DOM assertion |
| Mobile (<768px stacked) | Same frames at 375px viewport; left rail collapsed to accordion | Playwright visual diff |

**Playwright MCP note:** `file://` URLs are rejected by Playwright MCP. Serve the POC via `npx serve pocs/poc-v1-prd004/` on localhost before running the visual diff comparison. The host-frame comparison is against the live Cloud Portal iframe, not the local POC directly — the POC is the ground-truth reference for the FIRST run. If the host-frame screenshots diverge from the POC, raise "POC drift" and route back through `/architect` step 3 before declaring a new baseline.

**Inputs required (must be operator-supplied before T046 runs):**
- Host URL: `<Cloud Portal host URL where the app is embedded>`
- App origin: `<the Redirect Manager dev app origin>`

If either is missing, T046 records outcome as `deferred — host URL not supplied` with a `WARN` verdict in `smoke_outcomes.host_frame_smoke_test_tab`.

---

### 9.12 R8b carry-over CRUD smoke — gate before T019 (ADR-0043)

T018 is both an automated unit test task AND an operator-driven live-tenant walkthrough. Both halves must pass before T019 may start.

**Automated half (T018a RED → T018 GREEN):** `EditRowModal.test.tsx` must cover:
- Opening the modal populates `source` and `target` from the passed `rowIndex` row in `map.mappings`
- Save click calls `updateRedirectMap` with the mutated mappings array (the correct row changed, all others unchanged)
- The `UrlMapping` value passed to `updateRedirectMap` encodes the source/target pair in the correct ADR-0008 URL-encoded `=`/`&`-pair encoding
- Cancel with dirty state triggers `alert-dialog`; Cancel without dirty state closes immediately

**Live-tenant half (operator walkthrough, T018 task description steps 1–9):** Evidence file at `project-planning/captures/tranche-3-modal-crud-smoke-20260520.md`. The walkthrough MUST include at least one regex-shaped source value (`^/probe$`) to confirm the R1 mitigation from T005.

**HARD GATE:** T019a (mode toggle RED test) is blocked until BOTH halves of T018 are recorded as GREEN/PASS.

---

### 9.13 `task_breakdown_style`

Both run manifests (`project-planning/workflow/current-run.json` and `project-planning/workflow/run-20260520T080000Z.json`) carry `"task_breakdown_style": "tdd"`. This was set by the Lead Developer at plan time and confirmed by QA Specialist. The TDD flag signals the implementation agent to enforce RED-before-GREEN ordering as described in this section.

## 10. Per-task test specifications

Populated by QA Specialist (07). Every Task ID in the breakdown has an entry below. T1/T6 probe tasks are marked `[PROBE]` — their deliverable is an operator-recorded evidence file, not automated tests. QA-inserted RED tasks (`Txxxa`) list the exact test scenarios the developer must write BEFORE writing production code. GREEN tasks list what must be achieved by the time the task is complete.

Hydration note applies to every component task: "Verify no SSR/CSR mismatch — no browser-global access in render path. Playwright smoke is the only true catch (Vitest cannot detect). See § 9.7."

---

### Tranche T1 — Real-tenant regex round-trip probe [PROBE]

#### T001 — Author T1 regex fixture rows in tenant
- **Type:** PROBE (operator action)
- **Deliverable:** `project-planning/captures/tranche-1-regex-roundtrip-20260520.md` § "Authored rows" with 8 rows including authored-source, authored-target, Sitecore GUID
- **No automated tests.** Gate is T005.

#### T002 — Verify round-trip preservation per character class
- **Type:** PROBE (operator observation + diff)
- **Deliverable:** Per-character-class PASS/FAIL matrix in capture file. Any FAIL surfaces a "T0 BLOCKER" callout.
- **No automated tests.** The probe outcome determines whether T0 fix-first tasks are needed.

#### T003 — Capture upstream commit SHAs
- **Type:** PROBE (URL capture)
- **Deliverable:** SHA + permalink + timestamp triples in capture file § "Upstream SHA capture"
- **No automated tests.**

#### T004 — Stage upstream source files locally
- **Type:** PROBE / setup
- **Deliverable:** `site/lib/redirects/__fixtures__/_upstream-source.ts` (gitignored) + `.gitignore`
- **No automated tests.** Verify `.gitignore` rule by running `git status` — `_upstream-source.ts` must appear as untracked but ignored.

#### T005 — Close T1 gate or file T0 fix-first tasks
- **Type:** PROBE (gate decision)
- **Deliverable:** Run manifest `smoke_outcomes.tranche_1_regex_roundtrip_probe.outcome` updated + closure note in capture file
- **No automated tests.** This task unlocks T006.

---

### Tranche T2 — Port simulator + types + fixture extractor + parameterized tests

#### T006 — Scaffold `proxy-simulator.ts` with header + exports stub
- **Scenario:** Stub compiles with `tsc --noEmit` and exports throw `"simulate() not yet implemented — RED phase"`
- **Outcome:** `import { simulate } from '@/lib/redirects/proxy-simulator'` resolves without type error; calling `simulate(...)` at runtime throws before any test is written
- **Type:** unit (compile-time + runtime stub)
- **File:** `site/lib/redirects/proxy-simulator.ts` — compile check only at this stage; no dedicated test file yet

#### T007 — Define `SimulationStage` discriminated union (exhaustive)
- **Scenario 1:** `assertNeverStage` is exported and causes a TypeScript compile error when a switch does not handle all 8 `kind` values
- **Scenario 2:** All 8 kind values (`pre-filter`, `normalize`, `candidates`, `evaluate-row`, `substitute`, `flag-effects`, `dispatch`, `diagnostic-incomplete`) are present in the union
- **Type:** unit (compile-time exhaustiveness)
- **File:** `site/lib/redirects/proxy-simulator.ts` — TypeScript compiler enforces this; verify with a scratch `switch` in the test file that deliberately omits one case to confirm the compile error fires

#### T008a [RED] — Failing tests for upstream helpers
- **Write BEFORE T008 production code.** Create `site/lib/redirects/proxy-simulator.test.ts` with these failing cases:
  - **Scenario 1:** `isRegexOrUrl('^/path/')` returns `'url'` (trailing slash stripped by `.slice(0,-1)` → remaining `'^/path'` fails URL test) — **verbatim ADR-0038 quirk**
  - **Scenario 2:** `isRegexOrUrl('^/path')` returns `'regex'` (no trailing slash; `'^/pat'` after slice still fails URL test → detected as regex)
  - **Scenario 3:** `isRegexOrUrl('/old-page')` returns `'url'` (plain path, no regex meta-chars)
  - **Scenario 4:** `isRegexOrUrl('^/blog/(.+)$')` returns `'regex'`
  - **Scenario 5:** `getRedirectPatternRegex('^/blog/(.+)$', false)` returns a `RegExp` that matches `/blog/my-post`
  - **Scenario 6:** `escapeNonSpecialQuestionMarks('/path?query=1')` — verify output matches upstream behavior (consult `_upstream-source.ts` for the expected transformation)
- **All scenarios must FAIL** on first run (stubs throw).
- **Type:** unit
- **File:** `site/lib/redirects/proxy-simulator.test.ts`
- **Fixture provenance:** `// source: Sitecore/content-sdk <SHA from T003> packages/core/src/tools/utils.ts`

#### T008 [GREEN] — Port upstream helpers
- **Outcome:** All T008a scenarios pass GREEN. `proxy-simulator.test.ts` T008a block is fully GREEN.
- **Additional:** Verify JSDoc upstream-line citations present on each ported function.
- **Type:** unit
- **File:** `site/lib/redirects/proxy-simulator.ts`

#### T009a [RED] — Failing tests for `runTimedTest` regex-safety wrapper
- **Write BEFORE T009 production code.**
  - **Scenario 1 (catastrophic timeout):** `runTimedTest(/(a+)+$/, 'a'.repeat(30) + '!')` resolves to `'timeout'` within 150ms. Use real timers (see § 9.10).
  - **Scenario 2 (match):** `runTimedTest(/^\/blog$/, '/blog')` resolves to `'match'`.
  - **Scenario 3 (no-match):** `runTimedTest(/^\/blog$/, '/contact')` resolves to `'no-match'`.
  - **Scenario 4 (timeout is < 150ms wall-clock):** assert `Date.now()` difference is `< 150`.
- **All scenarios must FAIL** on first run.
- **Type:** unit (real timers required; `vi.useFakeTimers()` explicitly prohibited — see § 9.10)
- **File:** `site/lib/redirects/proxy-simulator.test.ts`
- **Vitest timeout:** 5_000 (the real catastrophic test may take up to 100ms + scheduling)

#### T009 [GREEN] — Implement `runTimedTest`
- **Outcome:** All T009a scenarios pass GREEN.
- **Type:** unit
- **File:** `site/lib/redirects/proxy-simulator.ts`

#### T010 — Implement AST-walking fixture extractor
- **Scenario 1:** Running `npm run extract:upstream-fixtures` produces `upstream-cases.json` with `count > 0`
- **Scenario 2:** Running twice against the same source file produces byte-identical JSON (determinism)
- **Scenario 3:** Each extracted case has the required fields: `description`, `redirects`, `request.url`, `request.locale`, `expected.matched`
- **Scenario 4:** `extractedAt` is an ISO-8601 timestamp; `upstreamSha` matches the T003 capture
- **Type:** unit (script test)
- **File:** `site/scripts/extract-upstream-fixtures.test.ts` (new)

#### T011 — Capture tenant cases into `tenant-cases.json`
- **Deliverable:** `site/lib/redirects/__fixtures__/tenant-cases.json` with ≥5 cases
- **Provenance comment:** `// source: real-tenant capture <tenantHost> T011 <capturedAt>` in the JSON file header
- **Verification:** Each case has all required fields; `capturedAt` present; no secret values (only public hostname)
- **Type:** PROBE (operator-captured data)
- **File:** `site/lib/redirects/__fixtures__/tenant-cases.json`

#### T012a [RED] — Parameterized fixture test runner shell (all cases RED)
- **Write BEFORE T013 production code.** This is the explicit RED checkpoint.
  - **Scenario:** Every case in `upstream-cases.json` and `tenant-cases.json` is a failing `it.each` test — they fail because `simulate()` throws `"not yet implemented"`. Confirm that the test count equals `upstream-cases.json count` + `tenant-cases.json count`. The number of failures is the number of fixture entries.
  - **Negative:** No `test.skip(...)` or `test.todo(...)` on any upstream case — they must all fail RED, not be skipped.
- **Type:** unit (parameterized)
- **File:** `site/lib/redirects/proxy-simulator.test.ts`
- **Fixture provenance comments required:** see § 9.3

#### T012 [GREEN] — Verify T012a is RED; gate before T013
- **This task has no production code.** It is a checkpoint. Record: `npm test -- proxy-simulator` output showing N failing cases. Commit the test file.
- **Outcome:** Developer has confirmed RED state in their commit message with the failure count.

#### T013a [RED] — Failing wall-clock-cap test
- **Write BEFORE T013 production code's 3s cap implementation.**
  - **Scenario:** 500-row all-timeout inventory → `simulate()` resolves with a `diagnostic-incomplete` stage (see § 9.10 for exact test code). Fails before the cap is implemented.
- **Type:** unit (real timers; Vitest timeout: 10_000)
- **File:** `site/lib/redirects/proxy-simulator.test.ts`

#### T013 [GREEN] — Implement `simulate()` orchestrator
- **Outcome 1:** All `upstream-cases.json` parameterized cases pass GREEN (M2 target: 100%).
- **Outcome 2:** All `tenant-cases.json` cases at least 80% GREEN (remainder may be tenant-data quirks per M3).
- **Outcome 3:** T013a wall-clock cap test passes GREEN.
- **Outcome 4:** T009a timeout tests still GREEN (T009 must not be broken by the orchestrator).
- **Additional scenarios verified:**
  - `$1` substitution from a capturing group produces correct destination string
  - `$siteLang` substitution with `siteLanguage = 'en'` correct
  - Flag effect `preserveQueryString=true` carries original query to destination
  - Pre-filter stages `has-dot` / `preview-mode` / `prefetch` emit informational stages; simulator continues
  - `simulate()` returns within 200ms p95 for ≤100 rules (perf assertion in a single-run timing test)
- **Type:** unit
- **File:** `site/lib/redirects/proxy-simulator.test.ts`

#### T014 — Achieve 100% upstream-fixture parity (M2 gate)
- **Scenario:** `npm test -- proxy-simulator` exits 0 with all upstream-case tests GREEN. Any remaining failure is either fixed or has an ADR-0038 waiver with operator approval.
- **Negative:** No `test.skip` on any upstream fixture without an accompanying ADR-0038 waiver note.
- **Type:** unit (parity gate)
- **File:** `site/lib/redirects/proxy-simulator.test.ts`

#### T015 — Update run manifest — `fixture_parity_upstream`
- **Scenario:** `smoke_outcomes.fixture_parity_upstream.outcome` is `"passed"` (or `"shipped_with_waivers"`) with `recorded_at` + `evidence` path set.
- **Type:** manifest update (no automated test; verified by reading the JSON)

---

### Tranche T3 — `EditRowModal` + regex authoring affordances

**Mandatory order:** T016 → T017 → T018a [RED] → T018 [GREEN/GATE] → T019a+ (mode toggle and helpers only start after T018 GATE is GREEN)

#### T016 — Scaffold `EditRowModal.tsx` — Blok dialog shell
- **Scenario 1:** `<EditRowModal open={true} ...>` renders without runtime error; contains source `<Input>`, destination `<Input>`, Cancel button, Save button
- **Scenario 2:** `<EditRowModal open={false} ...>` renders nothing (dialog closed)
- **Scenario 3:** `EditRowModal` does NOT render any of the four map-level fields (`RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage`) — verified by both DOM query and source-code scan
- **Hydration note:** applies; modal has no browser-global access in this scaffold
- **Type:** UI/component (scaffold verification)
- **File:** `site/components/EditRowModal.test.tsx` (created at this task; T018a will expand it)

#### T017 — Rewire `RedirectMapDetail` row click → open `EditRowModal`
- **Scenario 1:** Clicking a row in `RedirectMapDetail` calls `setEditRowState({ rowIndex: i })` — old inline edit path is absent
- **Scenario 2:** Clicking "+ Add mapping" calls `setEditRowState({ rowIndex: 'new' })`
- **Scenario 3:** `forwardRef` imperative handle `startEditRow(rowIndex)` is exported and callable
- **Scenario 4 (negative):** The old inline `<Input>` cells that appeared when `editingIndex === i` no longer render in `RedirectMapDetail` — source code scan confirms their removal
- **Type:** UI/component
- **File:** `site/components/full-page/RedirectMapDetail.test.tsx` (existing file, add new cases)

#### T018a [RED] — Failing unit tests for `EditRowModal` open/close/save/cancel
- **Write BEFORE T018 production code runs against the live tenant.** These tests cover the automated half of R8b.
  - **Scenario 1:** Opening modal with `rowIndex = 2` populates `source` with `map.mappings[2].source` and `target` with `map.mappings[2].target`
  - **Scenario 2:** Opening modal with `rowIndex = 'new'` starts with empty `source` and `target`
  - **Scenario 3:** Editing `target` and clicking Save calls `updateRedirectMap` with the mutated `mappings` array; row 2's target is changed; all other rows are unchanged
  - **Scenario 4:** The `UrlMapping` value passed to `updateRedirectMap` uses ADR-0008 URL-encoded `=`/`&`-pair encoding (verify by checking the encoded string in the mock call)
  - **Scenario 5:** Cancel with dirty state (source changed) triggers the `alert-dialog` confirmation; modal stays open
  - **Scenario 6:** Cancel without dirty state closes immediately (no confirm dialog)
  - **Scenario 7:** Esc key with dirty state triggers confirmation; without dirty state closes immediately
  - **Scenario 8:** Save on API failure surfaces inline error; modal stays open
- **All scenarios must FAIL** on first run.
- **Type:** unit
- **File:** `site/components/EditRowModal.test.tsx`
- **Fixture provenance:** `// source: PRD-000 real-tenant capture; see site/lib/sdk/redirects-write.ts header`

#### T018 [GREEN] — Carry-over CRUD smoke + make T018a GREEN (R8b HARD GATE)
- **Automated outcome:** All T018a scenarios pass GREEN.
- **Live-tenant outcome:** All walkthrough steps 1–9 in the T018 task description recorded as PASS in `project-planning/captures/tranche-3-modal-crud-smoke-20260520.md`, including at least one regex-shaped source value round-trip.
- **HARD GATE:** T019a is blocked until BOTH are recorded GREEN/PASS.
- **Type:** unit + regression (live tenant)
- **File:** `site/components/EditRowModal.test.tsx` + capture file

#### T019a [RED] — Failing unit tests for mode toggle
- **Write BEFORE T019 production code.**
  - **Scenario 1:** On modal open with any `source` content, mode is `'pattern'` (FR-A2 / ADR-0040)
  - **Scenario 2:** Clicking the Regex segment sets mode to `'regex'`; source input value is preserved unchanged
  - **Scenario 3:** Clicking Pattern segment after Regex sets mode back to `'pattern'`; source and target values preserved
  - **Scenario 4:** Snippet library is NOT present when mode is `'pattern'`
  - **Scenario 5:** Snippet library IS present when mode is `'regex'`
- **All scenarios must FAIL.**
- **Type:** unit
- **File:** `site/components/EditRowModal.test.tsx`

#### T019 [GREEN] — Implement mode toggle
- **Outcome:** All T019a scenarios pass GREEN.
- **Type:** UI/component
- **File:** `site/components/EditRowModal.tsx`

#### T020a [RED] — Failing UI tests for snippet library
- **Write BEFORE T020 production code.**
  - **Scenario 1:** In Regex mode, clicking `anchor-start` pill inserts `^/` at cursor in source input
  - **Scenario 2:** In Regex mode, clicking `blog-migration` pill inserts `^/blog/(.+)$` at cursor
  - **Scenario 3:** Snippet library is NOT rendered in Pattern mode
  - **Scenario 4:** The 5 snippets from `REGEX_SNIPPETS` const are all present as pills
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/EditRowModal.test.tsx`

#### T020 [GREEN] — Implement snippet library
- **Outcome:** All T020a scenarios pass GREEN.
- **Additional:** `regex-snippets.ts` has the operator-validation flag comment.
- **Type:** UI/component
- **File:** `site/components/EditRowModal.tsx` + `site/lib/redirects/regex-snippets.ts`

#### T021a [RED] — Failing unit tests for capture-group chips
- **Write BEFORE T021 production code.**
  - **Scenario 1:** Source `^/blog/(.+)/(.*)$` in Regex mode → chips `$1`, `$2`, `$siteLang` rendered (3 chips total)
  - **Scenario 2:** Source `^/page$` (0 groups) in Regex mode → only `$siteLang` chip rendered
  - **Scenario 3:** Invalid regex source `(a+]$` → 0 group chips, no throw (caught by `try/catch`)
  - **Scenario 4:** Clicking `$1` chip inserts `$1` at destination cursor position
  - **Scenario 5:** `$siteLang` chip inserts `$siteLang` at destination cursor
- **All scenarios must FAIL.**
- **Type:** unit
- **File:** `site/components/EditRowModal.test.tsx`

#### T021 [GREEN] — Implement capture-group chips
- **Outcome:** All T021a scenarios pass GREEN.
- **Additional:** Known-limitation tooltip text present on chip strip: "count is approximate; if it disagrees, the regex parse check is authoritative."
- **Type:** UI/component
- **File:** `site/components/EditRowModal.tsx`

#### T022a [RED] — Failing UI tests for sample-URL tester
- **Write BEFORE T022 production code.**
  - **Scenario 1:** Valid regex `^/blog/(.+)$` + sample URL `https://example.com/blog/my-post` → renders "Matches" + `$1 = my-post`
  - **Scenario 2:** Valid regex `^/blog/(.+)$` + sample URL `/contact` → renders "No match"
  - **Scenario 3:** Catastrophic regex `(a+)+$` + sample `'a'.repeat(20) + '!'` → calls `runTimedTest`; renders "pattern too slow — runtime would also stall here"
  - **Scenario 4:** Sample tester collapsible panel is CLOSED by default; toggle reveals it
  - **Scenario 5:** Sample tester is NOT rendered in Pattern mode
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/EditRowModal.test.tsx`

#### T022 [GREEN] — Implement sample-URL tester
- **Outcome:** All T022a scenarios pass GREEN. `runTimedTest` is imported from `proxy-simulator.ts` (not re-implemented).
- **Type:** UI/component
- **File:** `site/components/EditRowModal.tsx`

#### T023a [RED] — Failing unit tests for save-time validation
- **Write BEFORE T023 production code.**
  - **Scenario 1:** Regex mode + invalid source `(a+]$` → Save blocked; inline error contains the `SyntaxError.message` text; modal stays open
  - **Scenario 2:** Regex mode + valid source `^/blog/(.+)$` + destination `$0/suffix` → blocked with "$0 is not supported; use $1+ for capture groups"
  - **Scenario 3:** Regex mode + source `^/a/(.+)/(.+)$` (2 groups) + destination `/$3` → blocked with "destination references $3 but source has only 2 capture groups"
  - **Scenario 4:** Regex mode + source `^/page$` (0 groups) + destination `$siteLang/suffix` → NOT blocked (`$siteLang` exempt)
  - **Scenario 5:** Regex mode + valid source + valid destination → Save proceeds; `updateRedirectMap` called
  - **Scenario 6:** Pattern mode + source `^/page$` (contains regex meta-chars) → NOT blocked; inline hint rendered instead
  - **Scenario 7:** Error message uses `aria-describedby` on the source/destination input; focus moves to the error
- **All scenarios must FAIL.**
- **Type:** unit
- **File:** `site/components/EditRowModal.test.tsx`

#### T023 [GREEN] — Implement save-time validation
- **Outcome:** All T023a scenarios pass GREEN.
- **Type:** unit
- **File:** `site/components/EditRowModal.tsx`

#### T024a [RED] — Failing UI tests for inline mode-mismatch hint
- **Write BEFORE T024 production code.**
  - **Scenario 1:** Pattern mode + `isRegexOrUrl(source) === 'regex'` → hint element with `role="status"` rendered; text includes "runtime will treat it as regex"
  - **Scenario 2:** Pattern mode hint uses `var(--muted-foreground)` token color — NOT `var(--destructive)` (verify via computed style or class/style assertion)
  - **Scenario 3:** Regex mode + `isRegexOrUrl(source) === 'url'` → hint text includes "looks like a plain URL"
  - **Scenario 4:** Hint element is `role="status"` NOT `role="alert"` (AC-R2.5)
  - **Scenario 5:** Clicking "Switch mode" button in the hint flips mode toggle from Pattern→Regex; source and target edits preserved
  - **Scenario 6:** No hint rendered when `source.length === 0`
  - **Scenario 7:** Hint does NOT steal focus (focus remains on source input after hint appears)
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/EditRowModal.test.tsx`

#### T024 [GREEN] — Implement inline mode-mismatch hint
- **Outcome:** All T024a scenarios pass GREEN. `isRegexOrUrl` imported from `proxy-simulator.ts` (single source of truth per architecture R4).
- **Type:** UI/component
- **File:** `site/components/EditRowModal.tsx`

#### T025 — Tests: `EditRowModal.test.tsx` covers full mode + helpers + validation + hint
- **Outcome:** All T018a, T019a, T020a, T021a, T022a, T023a, T024a test suites are GREEN. This task is the GREEN confirmation checkpoint for the full T3 test coverage.
- **Additional scenario (not covered by earlier RED tasks):** Mode toggle renders correct visual treatment per `pocs/poc-v1-prd004/rowedit-pattern.html` vs `rowedit-regex.html` — verified via snapshot of the mode toggle component at each state.
- **Type:** unit + UI/component
- **File:** `site/components/EditRowModal.test.tsx`

#### T026 — Update run manifest — Tranche 3 closure
- **Scenario:** `stage_history` entry for T3 closure added; references T018 capture file + T025 test file.
- **Type:** manifest update

---

### Tranche T4 — Full Page Test tab + Test surface + scope picker + simulator wiring + trace cards

#### T027a [RED] — Failing UI test for Manage/Test tab switch + `lastTrace` persistence
- **Write BEFORE T027 production code.**
  - **Scenario 1:** Switching from Manage to Test tab renders `TestSurface`; Manage content is unmounted
  - **Scenario 2:** Switching from Test to Manage tab restores Manage content; `TestSurface` is unmounted
  - **Scenario 3:** `lastTrace` set in `FullPage` state is still accessible after a Manage→Test→Manage→Test cycle (persists across tab toggles)
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.test.tsx` (new)

#### T027 [GREEN] — Add Manage/Test segmented tab control to `FullPage.tsx`
- **Outcome:** All T027a scenarios pass GREEN.
- **Hydration note:** `activeTab` is local React state; no browser-global access; no hydration risk.
- **Type:** UI/component
- **File:** `site/components/full-page/FullPage.tsx`

#### T028a [RED] — Failing unit tests for `useStaggeredRender`
- **Write BEFORE T028 production code.**
  - **Scenario 1:** Default behavior: returns `[]` initially, then progressive prefix of `items` at 40ms intervals
  - **Scenario 2:** `prefers-reduced-motion: reduce` → returns full `items` array on first tick (no stagger); verify `window.matchMedia` is called in `useEffect` only (NOT in `useState` init or render body)
  - **Scenario 3:** Changing `items` prop cancels in-flight stagger and restarts from `[]`
  - **Scenario 4:** Unmount clears all pending timers (no "act() warning" about state updates after unmount)
  - **HYDRATION note assertion:** Add a comment `// matchMedia must only be called in useEffect — see § 9.7`
- **All scenarios must FAIL.**
- **Type:** unit
- **File:** `site/hooks/use-staggered-render.test.ts` (new)

#### T028 [GREEN] — Implement `useStaggeredRender` hook
- **Outcome:** All T028a scenarios pass GREEN. `matchMedia` call is inside `useEffect` only.
- **Type:** unit
- **File:** `site/hooks/use-staggered-render.ts`

#### T029a [RED] — Failing unit tests for `scope-picker-state.ts`
- **Write BEFORE T029 production code.**
  - **Scenario 1 (happy-path round-trip):** `saveScopeState(state)` → `loadScopeState(state.tenantId)` returns an object equal to `state`
  - **Scenario 2 (tenantId mismatch):** Save with `tenantId: 'A'`, load with `tenantId: 'B'` → returns `null`
  - **Scenario 3 (schema version mismatch):** Manually write `{ schemaVersion: 2, ... }` to localStorage → `loadScopeState(...)` returns `null`
  - **Scenario 4 (corrupt JSON):** Write `"not-valid-json"` to localStorage key → `loadScopeState(...)` returns `null` without throwing
  - **Scenario 5 (absent key):** Empty localStorage → `loadScopeState(...)` returns `null`
  - **Scenario 6 (updatedAt auto-set):** `saveScopeState(state)` sets `updatedAt` to current ISO-8601 regardless of input `updatedAt`
- **All scenarios must FAIL.**
- **Type:** unit
- **File:** `site/lib/test-surface/scope-picker-state.test.ts` (new)

#### T029 [GREEN] — Implement `scope-picker-state.ts`
- **Outcome:** All T029a scenarios pass GREEN. `localStorage` is never called in module body (only in exported functions called from `useEffect`).
- **Type:** unit
- **File:** `site/lib/test-surface/scope-picker-state.ts`

#### T030 — Scaffold `TestSurface.tsx` two-column layout
- **Scenario 1:** Renders the two-column grid shell with left rail (sticky) and right area at `≥768px` viewport
- **Scenario 2:** At `<768px` viewport, columns stack vertically with scope picker accordion at top
- **Scenario 3:** `lastTrace === null` → right area renders `<EmptyState>` placeholder
- **Hydration note applies.** No browser-global access in this scaffold.
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.test.tsx`

#### T031a [RED] — Failing UI tests for `ScopePicker` cascading selectors
- **Write BEFORE T031 production code.**
  - **Scenario 1:** Three `<Select>` controls render; Site + Maps selectors are disabled until Collection is chosen
  - **Scenario 2:** Collection change clears Site selection and Map selection
  - **Scenario 3:** Site change clears Map selection; Collection selection preserved
  - **Scenario 4:** While Collection data loads, Collection picker shows skeleton state with `aria-busy="true"`
  - **Scenario 5:** Collection fetch error → inline error message + "Retry" button rendered
  - **Scenario 6:** Retry button click re-triggers the `listCollections` call
  - **Negative:** SDK fixture shape matches `.d.ts` citation in provenance comment (see § 9.3)
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/ScopePicker.test.tsx` (new)
- **Fixture provenance:** `// source: real-tenant capture — see site/lib/sdk/sites.ts header`

#### T031 [GREEN] — Build `ScopePicker.tsx`
- **Outcome:** All T031a scenarios pass GREEN. All SDK helper calls use existing fixtures from prior PRDs.
- **Type:** UI/component
- **File:** `site/components/full-page/ScopePicker.tsx`

#### T032a [RED] — Failing UI tests for stale-ID detection + hydration empty-first
- **Write BEFORE T032 production code.**
  - **Scenario 1:** `loadScopeState` returns state with `collectionId: 'deleted-collection'` not in fetched collections → picker resets Collection + Site + Maps; inline alert "previous selection no longer available — pick again" visible
  - **Scenario 2:** Stale `siteId` (collection valid) → resets Site + Maps; collection retained
  - **Scenario 3:** Before `useEffect` runs (SSR initial render), picker is in empty/skeleton state — NOT the persisted state (hydration safety)
  - **Scenario 4:** Alert auto-dismisses on next user interaction (Collection picker focus)
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/ScopePicker.test.tsx`
- **HYDRATION NOTE:** Scenario 3 is the critical SSR safety check; add `// HYDRATION NOTE: see § 9.7`

#### T032 [GREEN] — Wire `ScopePicker` to localStorage hydration + persistence
- **Outcome:** All T032a scenarios pass GREEN. No `localStorage` call in render body.
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.tsx`

#### T033a [RED] — Failing UI tests for URL input + locale + Test button
- **Write BEFORE T033 production code.**
  - **Scenario 1:** Test button disabled when `mapIds.length === 0`; tooltip text is "Pick a collection, site, and at least one map to enable testing."
  - **Scenario 2:** Test button disabled when URL is empty
  - **Scenario 3:** URL `ftp://example.com` (not http/https and not starting with `/`) → inline validation error; Test button disabled
  - **Scenario 4:** URL `/path?qs=1` (path+query) → validation passes; Test button enabled when scope also valid
  - **Scenario 5:** Locale `'Other...'` selected → free-text input appears; input `xyz` fails format check; `en` passes
  - **Scenario 6:** Test button enabled when scope valid + URL valid + locale valid
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.test.tsx`

#### T033 [GREEN] — Build URL input + locale dropdown + Test button
- **Outcome:** All T033a scenarios pass GREEN.
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.tsx`

#### T034a [RED] — Failing unit test for rule-flattening + `SimulationInput` construction
- **Write BEFORE T034 production code.**
  - **Scenario 1:** Two picked maps with 3 rows each → `rules` array has 6 entries; each rule carries the correct `parentMap` flags from its source map
  - **Scenario 2:** Absolute URL `https://example.com/path?qs=1` and path+query `/path?qs=1` produce identical `SimulationInput.url` values
  - **Scenario 3:** `simulate()` is called with the correctly constructed `SimulationInput`; no extra tenant-wide rules included
- **All scenarios must FAIL.**
- **Type:** unit
- **File:** `site/components/full-page/TestSurface.test.tsx`

#### T034 [GREEN] — Wire Test button to `simulate()`
- **Outcome:** All T034a scenarios pass GREEN.
- **Type:** integration
- **File:** `site/components/full-page/TestSurface.tsx`

#### T035a [RED] — Failing UI tests for trace UI components
- **Write BEFORE T035 production code.**
  - **Scenario 1 (exhaustive):** `TraceCardStack` renders one card for each of the 8 `SimulationStage.kind` values without runtime error; `assertNeverStage` compile-check fires for missing kinds
  - **Scenario 2:** ResultCard `matched: true` renders "Open this rule in Manage" button; click invokes `onRowClick(mapId, rowIndex)`
  - **Scenario 3:** ResultCard `matched: false` renders "Add a rule for this URL" button
  - **Scenario 4:** `EmptyState` renders hero + "Try a sample URL" button with a pre-filled URL from the first rule of the first picked map
  - **Scenario 5:** `TraceCardStack` with `trace = null` → renders `EmptyState`, not an error
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/TraceCardStack.test.tsx` (new)

#### T035 [GREEN] — Build `TraceCardStack.tsx` + `TraceCard.tsx` + `ResultCard.tsx` + `EmptyState.tsx`
- **Outcome:** All T035a scenarios pass GREEN.
- **Type:** UI/component
- **File:** `site/components/full-page/` (multiple files)

#### T036a [RED] — Failing UI test for `lastTrace` persistence across tab toggles
- **Write BEFORE T036 production code.**
  - **Scenario 1:** `lastTrace` is set in `FullPage` state; switching Manage→Test tab does NOT clear `lastTrace`; `TraceCardStack` still renders the prior trace on the next Test tab view
  - **Scenario 2:** `lastTrace` is `null` on page load (no localStorage); cleared on page reload
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.test.tsx`

#### T036 [GREEN] — Lift `lastTrace` state + `activeTab` state to `FullPage`
- **Outcome:** All T036a scenarios pass GREEN. `TestSurface` is a controlled component.
- **Type:** UI/component
- **File:** `site/components/full-page/FullPage.tsx`

#### T037a [RED] — Failing UI test for Copy-as-JSON
- **Write BEFORE T037 production code.**
  - **Scenario 1:** Click "Copy as JSON" → `navigator.clipboard.writeText` called with the full trace JSON string (parseable; includes `startedAt` + `durationMs`)
  - **Scenario 2:** After click, Sonner `toast.success("Copied")` is fired
  - **Scenario 3:** Button is visible only when `trace !== null`
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/TestSurface.test.tsx`

#### T037 [GREEN] — Wire copy-as-JSON footer button
- **Outcome:** All T037a scenarios pass GREEN.
- **Type:** UI/component
- **File:** `site/components/full-page/TraceCardStack.tsx` or `TestSurface.tsx`

#### T038a [RED] — Failing UI tests for trace card variants (pre-filter, timeout, cap, rows-cap)
- **Write BEFORE T038 production code.**
  - **Scenario 1:** `pre-filter` stage card shows label "informational — runtime would skip, simulator continues" (AC-T1.9)
  - **Scenario 2:** `evaluate-row` with `outcome: 'timeout'` has warning border + "pattern too slow — runtime would also stall here" copy (AC-T2.3)
  - **Scenario 3:** No-match `rowsConsidered` array of 25 rows → card shows first 20 + "+ 5 more rows considered (no match)" expand control (AC-T2.2 UI cap)
  - **Scenario 4:** Expand control click reveals the remaining 5 rows in chunks of 50
  - **Scenario 5:** `diagnostic-incomplete` stage card has warning-tinted shell + "diagnostic incomplete after 3s — evaluated X of Y rows" text
- **All scenarios must FAIL.**
- **Type:** UI/component
- **File:** `site/components/full-page/TraceCardStack.test.tsx`

#### T038 [GREEN] — Wire pre-filter / no-match / row-timeout / diagnostic-incomplete trace card variants
- **Outcome:** All T038a scenarios pass GREEN. All 8 `SimulationStage.kind` values render correctly. Visual treatment matches POC frames (`test-timeout-row.html`, `test-unmatched.html`, `test-diagnostic-incomplete.html`).
- **Type:** UI/component
- **File:** `site/components/full-page/TraceCard.tsx`

#### T039a [RED] — Failing E2E-style test for Test→Manage deep-link
- **Write BEFORE T039 production code.**
  - **Scenario 1 (happy path):** ResultCard "Open this rule in Manage" click → `activeTab` switches to `'manage'`; `selectedMap` is the correct map; `detailRef.current.startEditRow(rowIndex)` is called
  - **Scenario 2 (map deleted):** `mapId` not found in `maps` list → `toast.error(...)` fires; no throw; `activeTab` does NOT switch
  - **Scenario 3 (row deleted):** `rowIndex` exceeds `map.mappings.length` → `toast.error(...)` fires; no throw
  - **Scenario 4:** The `setTimeout 0` render-cycle yield is respected before calling `startEditRow` (verify by asserting `startEditRow` is not called synchronously within the same tick as `setActiveTab`)
- **All scenarios must FAIL.**
- **Type:** E2E (integration)
- **File:** `site/components/full-page/TestSurface.test.tsx`

#### T039 [GREEN] — Wire Test→Manage deep-link
- **Outcome:** All T039a scenarios pass GREEN. No event bus / pubsub / context provider — plain prop-drilled callback + `forwardRef` imperative handle only.
- **Type:** integration
- **File:** `site/components/full-page/FullPage.tsx`

#### T040 — Tests: `TestSurface.test.tsx` + `ScopePicker.test.tsx` + `TraceCardStack.test.tsx`
- **Outcome:** All T027a through T039a test suites are GREEN in their respective test files. This is the GREEN confirmation checkpoint for all of T4.
- **Additional scenario (deep-link E2E):** Full scenario — switch to Test tab, simulate a match, click "Open this rule in Manage" → `EditRowModal` opens for the matched row in Manage tab. Verify end-to-end without mocking `FullPage` internals.
- **Hydration regression assertion:** Render `TestSurface` + `ScopePicker` in jsdom; no `console.error("Warning: ...")` hydration output. Add comment: `// HYDRATION NOTE: see § 9.7 — Playwright smoke is the definitive gate`
- **Type:** unit + UI/component + E2E
- **File:** Multiple test files under `site/components/full-page/`

#### T041 — Update run manifest — Tranche 4 closure
- **Scenario:** `stage_history` entry for T4 added with outcome `passed`; references T040 test files + POC frames as evidence.
- **Type:** manifest update

---

### Tranche T5 — A11y + theme + reduced-motion + structural guards

#### T042 — A11y audit — keyboard navigation, focus management, ARIA labels, contrast
- **Scenario 1:** `EditRowModal` Tab order: mode toggle → source → (snippets if Regex) → destination → (chips if Regex) → Cancel → Save. Verify via keyboard walk in browser + automated `aria-*` assertions.
- **Scenario 2:** `ScopePicker` `<Select>` controls are keyboard-operable (Enter open, arrow navigate, Enter commit); skeleton announces `aria-busy="true"`.
- **Scenario 3:** Disabled Test button tooltip announced via `aria-describedby`.
- **Scenario 4:** `TraceCard` sections have `aria-labelledby` pointing to stage-name heading.
- **Scenario 5:** Inline mode-mismatch hint is `role="status"` NOT `role="alert"` (AC-R2.5). Verified by querying `role="alert"` — must return `null`.
- **Scenario 6:** Focus trap in `EditRowModal`: Tab cycles within modal; focus does NOT escape to dimmed Manage chrome behind the overlay.
- **Deliverable:** `project-planning/captures/tranche-5-a11y-audit-20260520.md` + any T042a fix-up tasks
- **Type:** a11y
- **Files:** Audit capture file + automated assertions in existing test files

#### T043 — Theme parity tests — dark / light / system
- **Required runtime-contrast assertions (see § 9.6 for exact code pattern):**
  - `EditRowModal` Save button: foreground over primary bg ≥ 4.5:1 in both light and dark
  - `EditRowModal` error message text: foreground over destructive bg ≥ 4.5:1
  - `EditRowModal` inline hint: muted-foreground text over muted bg ≥ 4.5:1
  - `ScopePicker` label text over card bg ≥ 4.5:1 in both themes
  - `TraceCard` stage heading over card bg ≥ 3:1 large-text (or ≥ 4.5:1 if normal-text size)
  - `ResultCard` accent border: primary token visible against background ≥ 3:1
  - `TraceCard` timeout/diagnostic-incomplete warning shell: warning-tint text ≥ 4.5:1 over warning background
- **System theme:** mock `window.matchMedia('(prefers-color-scheme: dark)')` → assert dark tokens applied.
- **Structural checks (run alongside contrast):** No `#[0-9a-fA-F]{3,8}` hex literals in component source; no Tailwind hex aliases (`text-red-500` etc.) — confirmed by source-scan in T045 structural guards.
- **Type:** theme (runtime contrast + structural)
- **Files:** `site/components/EditRowModal.theme.test.tsx`, `site/components/full-page/TestSurface.theme.test.tsx`, `site/components/full-page/ScopePicker.theme.test.tsx`, `site/components/full-page/TraceCardStack.theme.test.tsx`

#### T044 — Reduced-motion compliance test
- **Scenario 1:** `prefers-reduced-motion: reduce` mock → `useStaggeredRender` yields full array on first tick; no 40ms interval timers created
- **Scenario 2:** `prefers-reduced-motion: reduce` mock → `TraceCardStack` renders all cards synchronously on first paint (no stagger)
- **Scenario 3:** Manage/Test tab-switch transition has no CSS animation when `prefers-reduced-motion: reduce` is set (verify `transition` or `animation` computed style is `none` or `0s`)
- **Type:** a11y
- **Files:** `site/hooks/use-staggered-render.test.ts` (add cases) + `site/components/full-page/TraceCardStack.test.tsx` (add case)

#### T045 — Structural guards
Four guard tests; each must be GREEN before T046:

- **`no-hex-in-prd004-components.test.ts`:** Source-scan regex `/#[0-9a-fA-F]{3,8}/` against all 9 PRD-004 component files (`EditRowModal.tsx`, `TestSurface.tsx`, `TraceCardStack.tsx`, `TraceCard.tsx`, `ResultCard.tsx`, `EmptyState.tsx`, `ScopePicker.tsx`, `FullPage.tsx` modified sections, `RedirectMapDetail.tsx` modified sections). Fail if any match found.
- **`semantic-tokens-only.test.ts`:** Source-scan for raw Tailwind palette classes (`text-red-[0-9]+`, `bg-blue-[0-9]+`, etc.) in the same 9 files. Fail if found. Note: `var(--primary)` and `var(--muted-foreground)` are the expected pattern.
- **`focus-management.test.ts`:** Render `<EditRowModal open={true} ...>`; assert `document.activeElement` is inside the modal; close modal; assert `document.activeElement` is the element that triggered the modal.
- **`map-level-field-not-in-modal.test.ts`:** (1) Render `<EditRowModal open={true} ...>`; assert no text matching `RedirectType|IncludeVirtualFolder|PreserveQueryString|PreserveLanguage` in DOM. (2) Read `site/components/EditRowModal.tsx` source; assert none of the four strings appear in the source (see § 9.9 for full spec).
- **Type:** structural guard
- **File:** `site/lib/__tests__/structural-guards/` (4 files)

#### T046 — Host-frame smoke test (Playwright; 5 axes)
- **Requires operator-supplied inputs:** Host URL + app origin (see § 9.11). If absent, record `deferred — host URL not supplied` with `WARN` verdict.
- **Axis 1 (light theme):** Host-frame screenshot of Test tab with matched trace vs `pocs/poc-v1-prd004/test-matched.html` served via `npx serve`
- **Axis 2 (dark theme):** Same comparison with dark theme active
- **Axis 3 (system theme `prefers-color-scheme: dark`):** Playwright CDP emulation of dark system preference
- **Axis 4 (reduced-motion):** `prefers-reduced-motion: reduce` emulation; assert stagger absence in trace card render
- **Axis 5 (mobile <768px):** 375px viewport; left rail is accordion; trace stacks below — compare against POC accordion state
- **Negative:** If any axis shows POC drift (screenshot diverges meaningfully), raise as a finding and route back through `/architect` step 3 before declaring baseline.
- **Evidence:** Pasted into `project-planning/captures/tranche-5-host-frame-smoke-20260520.md` + `smoke_outcomes.host_frame_smoke_test_tab` in run manifest updated.
- **Type:** visual regression (host-frame)
- **File:** `site/tests/host-frame/test-tab-host-frame.smoke.test.ts`

---

### Tranche T6 — Real-tenant smoke [PROBE]

#### T047 — Prepare smoke-evidence file template
- **Deliverable:** `project-planning/smoke/smoke-prd-004-20260520.md` with header + 5 empty per-URL section templates
- **Type:** PROBE (template creation)

#### T048 — Operator-driven smoke walkthrough (5-10 URLs)
- **Deliverable:** Filled smoke evidence file with per-URL: simulator-predicted destination + type; actual Edge response status + Location header; match? Y/N; notes
- **Success criterion:** ≥80% match rate (M3)
- **M4 criterion:** operator can diagnose a non-match in <30 seconds without leaving the app
- **Type:** PROBE (live tenant)

#### T049 — Close T6 gate per M3 response policy + update run manifest
- **Deliverable:** `smoke_outcomes.tranche_6_real_tenant_smoke.outcome` set to `passed` / `shipped_with_caveats` / `failed` per M3 policy; `recorded_at` + `evidence` set; any follow-up tasks appended
- **Type:** PROBE (gate decision + manifest update)

## Handoff Metadata

- Canonical run manifest: `project-planning/workflow/current-run.json`
- Source PRD: `project-planning/PRD/prd-004.md`
- Source architecture: `project-planning/architecture/architecture-20260520T080000Z.md` (post-write amendment block at top is authoritative)
- Selected UI variant: `project-planning/ui-design/ui-design-20260520T080000Z-v1.md`
- Selected POC (visual contract): `pocs/poc-v1-prd004/`
- Recommended next command: `/task-breakdown` (continue with QA Specialist 07 in place) → `/implement`
- Recommended next input file: this same file (QA edits in place); else `qa-report.md` if produced separately
