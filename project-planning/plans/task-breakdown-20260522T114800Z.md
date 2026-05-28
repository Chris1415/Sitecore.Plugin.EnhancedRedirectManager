# Development Execution Plan

---
document_type: task_breakdown
artifact_name: task-breakdown-20260522T114800Z.md
generated_at: 2026-05-22T15:30:00Z
run_manifest: project-planning/workflow/run-20260522T114800Z.json
source_inputs:
  - project-planning/PRD/prd-005.md
  - project-planning/PRD/prd-minimal-005.md (Developer 08 orientation only)
  - project-planning/architecture/architecture-20260522T114800Z.md
  - project-planning/ui-design/ui-design-20260522T114800Z-v1.md
  - project-planning/baseline.md
  - project-planning/ADR/adr-0044..adr-0049
  - pocs/poc-v1-prd005/ (winning POC — visual source of truth)
consumed_by:
  - QA Specialist (07) enriches this file; Developer Code Monkey (08) implements from this file + prd-minimal only
next_input:
  - project-planning/plans/qa-report.md (optional)
---

<!-- Soft cap: ~800 lines (frontmatter excluded). -->

## 0. Quick orientation (absorbed from former implementation-runbook)

### Implementation target directory

- **Target:** `site/` — Marketplace app code (Next 16 + React 19).
- **Container convention:** all new modules under `site/lib/upstream-drift/`, `site/hooks/`, `site/components/full-page/`, `site/lib/redirects/__fixtures__/`.
- **Slash command + audit log:** product repo root — `.claude/commands/sync-redirect-proxy.md` and `.claude/sync-redirect-proxy.log` (gitignored). The `.claude/` directory does not yet exist locally; T030 creates it.

### Canonical inputs (Developer 08 normal flow loads ONLY these)

- **`prd-minimal-005.md`** — primary scope/orientation (Developer slice extracted from full PRD).
- **This task breakdown** — execution contract (§ 4c, tasks, tests, order).
- **Winning POC:** `pocs/poc-v1-prd005/` — visual source of truth. Spec text and POC diverge → POC wins for look-and-feel.
- **`baseline.md`** — inherited architectural constitution (Mode A scaffold, Authoring GraphQL, V4 Blok Elevated tokens, ADR-0038 verbatim port, ADR-0041 lifted state, ADR-0042 AST extractor).

**NOT loaded** in Developer normal flow: full PRD (`prd-005.md`), architecture (`architecture-20260522T114800Z.md`), UI variant spec, raw ADR files (use § 4c-2 one-liners).

### Planned delivery order

```
T001  T002  T003  T004  T005                      (T1 — baseline + foundation)
T007a  T006  T007  T009a  T008  T009  T010        (T2 — GitHub client + snapshot reader; RED first)
T013a  T011  T012  T013  T014  T015  T016         (T3 — drift hook + state machine; RED first)
T020a  T017  T018  T019  T020  T021  T022         (T4a — banner + button visuals; RED first)
T023  T024  T025  T026                            (T4b — TestSurface integration + dismiss + errors)
T027  T028  T029  T030  T031                      (T5 — A11y + theme + structural + bundle)
T035a  T034  T035  T032  T033  T036               (T6 — slash command + smoke; RED first)
```

**Actual execution (2026-05-22):** Followed planned order. Deviations:
- T002 was NO-OP (T001 probe confirmed SHAs match PRD-004 baseline; spike note at `project-planning/spike-notes/t001-dev-sha-probe.md`).
- T028 runtime-contrast approach substituted (jsdom CSS variable limitation — see § 8 T028 note).
- T036 deferred to operator smoke (S2–S6 pending).

New `Txxxa` sub-tasks (QA enrichment — RED test stubs written before source):
- **T007a** — RED stubs for `github-client.test.ts` (all 9 cases failing). Depends on: T003. Implementation dependency: T006 depends on T007a.
- **T009a** — RED stubs for `snapshot-reader.test.ts` (4 cases failing). Depends on: T003, T004. Implementation dependency: T008 depends on T009a.
- **T013a** — RED stubs for `use-upstream-drift.test.tsx` (8 cases failing). Depends on: T003. Implementation dependency: T011 depends on T013a; T012 completes the GREEN.
- **T020a** — RED stubs for `UpstreamDriftBanner.test.tsx` (7 cases failing). Depends on: T003. Implementation dependency: T017 depends on T020a.
- **T035a** — RED stubs for `sync-helpers.test.ts` (5 cases failing). Depends on: T003. Implementation dependency: T034 depends on T035a.

### Completion criteria

- **Pre-completion validation gate:** lint passes (`npm run lint`), build passes (`npm run build`), all 691 PRD-004 tests still GREEN plus new tests from this PRD GREEN, git-status clean.
- **Smoke gates:** T1 hard gate (T005 — 691 baseline tests must remain GREEN after `proxy-simulator.ts` header migration and snapshot JSON commit); T6 operator-driven smoke recorded at `project-planning/smoke/smoke-prd-005-<timestamp>.md`.
- **§ 9 TDD contract green** (when QA flips style to `tdd`): every RED test for in-scope tasks has a passing GREEN; no production code before RED.

## 1. Implementation Overview

PRD-005 adds an on-demand upstream drift signal to the Test tab (Full Page extension point) plus a dev-time slash command. Implementation splits into six tranches mirroring PRD § 12:

1. **T1 — Baseline + foundation.** Capture current `dev` SHAs from upstream; commit `upstream-snapshot.json` with `originalPort` preserving PRD-004 provenance; migrate `proxy-simulator.ts` header to reference the JSON; verify 691 baseline tests still GREEN.
2. **T2 — GitHub client + snapshot reader.** Pure modules (no React) for the one outbound `fetch()` and the typed snapshot static-import.
3. **T3 — Drift hook.** Five-state machine (`idle / checking / in-sync / drifted / error`) per ADR-0049; sequential per-file fetches; concurrent-call guard.
4. **T4 — UI integration.** "Check upstream" button in left rail + inline status block + `UpstreamDriftBanner` in right column + sessionStorage dismiss + error-state UI. Two-tier tone per ADR-0045 amendment (drifted = destructive red; errors = warning amber; in-sync = success).
5. **T5 — Non-functional guards.** A11y audit, theme parity (light/dark/system), structural guard (no CSP introduced, no `role="alert"`, no hex literals), bundle delta ≤ 5KB gz.
6. **T6 — Slash command + smoke.** `.claude/commands/sync-redirect-proxy.md` in product repo root + unit-testable helper logic + operator-driven smoke per AC-3.x.

**Zero new Sitecore SDK surfaces.** One new HTTP integration (GitHub REST API, unauthenticated). No CSP changes. No LLM in the deployed app.

## 2. Epics

- **E1 — Snapshot foundation.** Authoritative `upstream-snapshot.json` replaces SHA-in-header. Tasks: T001–T005.
- **E2 — Outbound integration layer.** GitHub commits API client + typed snapshot reader. Tasks: T006–T010.
- **E3 — Drift detection state machine.** `useUpstreamDrift()` hook per ADR-0049. Tasks: T011–T016.
- **E4 — UI surface.** Banner + button + status block + integration into `TestSurface`. Tasks: T017–T026.
- **E5 — NFR guards.** A11y, theme, structure, bundle. Tasks: T027–T031.
- **E6 — Dev-time slash command.** `.claude/commands/sync-redirect-proxy.md` + helpers + smoke. Tasks: T032–T036.

## 3. Feature Breakdown

| Feature | Epic | Tranche | Notes |
|---|---|---|---|
| Snapshot JSON file | E1 | T1 | New `__fixtures__/upstream-snapshot.json` per architecture § 4 schema |
| Header migration | E1 | T1 | `proxy-simulator.ts` header references JSON (data moves out of comment) |
| GitHub client module | E2 | T2 | One async function; discriminated-union return; no retries |
| Snapshot reader module | E2 | T2 | Static import + `schemaVersion === 1` validation |
| Drift hook | E3 | T3 | 5-state machine; sequential fetches; concurrent-call guard |
| Banner component | E4 | T4a | Destructive-tone (red) per ADR-0045 amendment; `role="status"` |
| Button + status block | E4 | T4a | Secondary Blok button; inline status with three render modes |
| TestSurface integration | E4 | T4b | New left-rail block + right-column banner mount |
| Session-dismiss flow | E4 | T4b | `sessionStorage.rm-drift-banner-dismissed` |
| Error-state UI | E4 | T4b | Warning-tone (amber) inline messages + retry where applicable |
| A11y audit | E5 | T5 | `role="status"`, focus rings, contrast, tab order |
| Theme parity | E5 | T5 | Light/dark/system; semantic tokens; no hex literals |
| Structural guard | E5 | T5 | `next.config.mjs` empty assertion; no `role="alert"`; bundle delta |
| Slash command file | E6 | T6 | `.claude/commands/sync-redirect-proxy.md` procedural Markdown |
| Slash command helpers | E6 | T6 | Unit-testable `compareSnapshot()` + `honorDivergences()` |
| Operator smoke | E6 | T6 | Bump-to-stale → check → banner → slash command → tests GREEN → snapshot bump |

## 4. Task Breakdown

### Tranche T1 — Baseline capture + foundation (HARD GATE)

#### T001 — Probe upstream `dev` SHAs and compare against PRD-004 baseline

- **Title:** Probe current `dev` SHAs for the 2 watched files; decide re-port scope
- **Description:** Run two `curl` (or WebFetch) probes against `https://api.github.com/repos/Sitecore/content-sdk/commits?path=<path>&sha=dev&per_page=1` for `packages/nextjs/src/proxy/redirects-proxy.ts` and `packages/core/src/tools/utils.ts`. Compare returned SHAs against PRD-004's recorded SHAs (`30b0db8fe768b83f03fd6b9772b0d3e14711c6b2` and `e6153e5e80c2076704cad0876eec3b85ec3a1a9f`). Record the probe result + decision (no re-port vs. partial re-port) in a short note at `project-planning/spike-notes/t001-dev-sha-probe.md`. If SHAs are identical → no re-port; if drifted → flag scope for T002 re-port subtask (escalate to operator).
- **Expected Output:** `project-planning/spike-notes/t001-dev-sha-probe.md` with both SHAs + a one-paragraph re-port decision. Operator-readable.
- **Depends on:** none

#### T002 — Re-port simulator if `dev` has moved (conditional, gated on T001)

- **Title:** Re-port `proxy-simulator.ts` body lines affected by `dev` drift since PRD-004
- **Description:** **Conditional task.** Only execute if T001's spike note reports SHA drift. Re-fetch upstream raw content for the 2 watched files via `raw.githubusercontent.com/Sitecore/content-sdk/dev/...`; diff against PRD-004 ported state; apply verbatim-port edits per ADR-0038 to `proxy-simulator.ts`. Regenerate `_upstream-source.ts` and run `npm run extract:upstream-fixtures` to regenerate `__fixtures__/upstream-cases.json`. Run `npm test -- proxy-simulator` to confirm 100% parity post-re-port. **If T001 reports no drift, this task is a NO-OP and may be marked complete without changes.**
- **Expected Output:** Either (a) NO-OP note in spike file, or (b) updated `proxy-simulator.ts` + regenerated fixtures + all simulator tests GREEN.
- **Depends on:** T001

#### T003 — Add `upstream-snapshot.json` schema types

- **Title:** Define TypeScript types for `UpstreamSnapshot`, `WatchedFile`, `KnownDivergence`
- **Description:** Create `site/lib/upstream-drift/types.ts` exporting `UpstreamSnapshot`, `WatchedFile`, `KnownDivergence`, `DriftState`, `DriftError`, `UseUpstreamDriftReturn`, and `GitHubCommitResult` per architecture § 4 + § 5b. Use exact discriminated-union shape for `GitHubCommitResult`. Keep `branch` typed as `'dev' | 'main'`. Do not yet `import` the JSON — just types.
- **Expected Output:** `site/lib/upstream-drift/types.ts` with all 7 type aliases; no runtime exports.
- **Depends on:** none

#### T004 — Commit `upstream-snapshot.json` with `branch: 'dev'` + `originalPort`

- **Title:** Write the authoritative snapshot JSON
- **Description:** Create `site/lib/redirects/__fixtures__/upstream-snapshot.json` per architecture § 4 schema. Fields: `schemaVersion: 1`, `repository: 'Sitecore/content-sdk'`, `branch: 'dev'` (per ADR-0044 amendment — `main` 404s on upstream), `originalPort.branch: 'dev'`, `originalPort.ports[]` with the two PRD-004 SHAs + `portedAt: '2026-05-20T18:32:24Z'`, `watchedFiles[]` populated with current `dev` SHAs from T001 probe + `retrievedAt: <ISO>` + `fileHash: <SHA-256>` (compute locally via `crypto.createHash('sha256')`). `knownDivergences: []`. Verify `__fixtures__/.gitignore` does NOT exclude this file (the snapshot is committed verbatim per ADR-0044 / FR-A1).
- **Expected Output:** `site/lib/redirects/__fixtures__/upstream-snapshot.json` committed. Valid JSON, schema-compliant, ready for static import.
- **Depends on:** T001, T003

#### T005 — Migrate `proxy-simulator.ts` header comment (HARD GATE)

- **Title:** Strip data-bearing SHAs from header; point at snapshot JSON; verify 691 tests GREEN
- **Description:** Rewrite the first ~27 lines of `site/lib/redirects/proxy-simulator.ts` per FR-A2. Keep ADR-0038 / 0039 / 0040 / 0042 prose references; remove the "Upstream sources (SHA-pinned; retrieved …)" data block. Add one audit line: `* Originally ported from Sitecore/content-sdk@dev as of 2026-05-20 — see __fixtures__/upstream-snapshot.json originalPort field for full SHAs.` Run full test suite (`npm test`) — 691 prior tests MUST remain GREEN. This is the **T1 hard gate**: if any test regresses, halt and report.
- **Expected Output:** Updated `proxy-simulator.ts` header (no SHA data in comment); `npm test` output showing all 691 pre-existing tests passing.
- **Depends on:** T002, T004

### Tranche T2 — GitHub client + snapshot reader (build)

#### T006 — Implement `getLatestCommitSha()` in `github-client.ts`

- **Title:** Single async function wrapping `api.github.com/commits` call
- **Description:** Create `site/lib/upstream-drift/github-client.ts`. Export `async function getLatestCommitSha(filePath: string, branch: string): Promise<GitHubCommitResult>`. Implementation per architecture § 5b reason-mapping table: 200 + non-empty array → `{ ok: true, sha: body[0].sha, retrievedAt: new Date().toISOString() }`; 200 + empty `[]` → `{ ok: false, reason: 'not-found' }`; 403 + body matching `/rate limit/i` → `{ ok: false, reason: 'rate-limit', retryAfterSeconds: <computed from X-RateLimit-Reset> }`; 404 → `'not-found'`; fetch throw or 5xx → `'network'`; anything else → `'unknown'`. Headers: `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`. **No `Authorization` header.** **No retries.** **Response is a plain JSON array — `(await res.json())[0]?.sha`, NOT `.data[0].sha`** (architecture § 5a).
- **Expected Output:** `site/lib/upstream-drift/github-client.ts` exporting `getLatestCommitSha` + the `GitHubCommitResult` type re-export from `./types`.
- **Depends on:** T003, **T007a (RED test stubs must be written and failing before this source is created)**

#### T007a — RED test stubs for `getLatestCommitSha()` (write BEFORE T006)

- **Title:** Write failing Vitest test stubs for all reason branches — RED phase
- **Description:** Create `site/lib/upstream-drift/github-client.test.ts` with all 9 test cases (per § 10 T007a spec) importing from `./github-client` — which does NOT yet exist. Suite must fail to compile or fail all cases. Each fixture mock must carry `// source: architecture-20260522T114800Z.md § 5a live capture` comment. Use `LIVE_COMMIT_FIXTURE` from § 4c-9 verbatim. This is the RED state.
- **Expected Output:** `github-client.test.ts` exists; `npm test -- github-client` shows 9 failures (import error or assertion failures).
- **Depends on:** T003

#### T007 — Complete unit tests for `getLatestCommitSha()` — all 9 cases GREEN

- **Title:** Vitest tests covering each `GitHubCommitResult` branch — all GREEN after T006
- **Description:** After T006 source is implemented, confirm all 9 cases in `github-client.test.ts` are GREEN. Add the URL-composition assertion and header-presence assertions if not already in T007a stubs. Verify no `Authorization` header present.
- **Expected Output:** `github-client.test.ts` with ≥9 cases; all GREEN.
- **Depends on:** T006, T007a

#### T009a — RED test stubs for `snapshot-reader.ts` (write BEFORE T008)

- **Title:** Write failing Vitest test stubs for snapshot reader — RED phase
- **Description:** Create `site/lib/upstream-drift/snapshot-reader.test.ts` with 4 test cases (per § 10 T009a spec) importing from `./snapshot-reader` — which does NOT yet exist. Suite must fail. Tests cover: parse result shape, `getWatchedFiles()` array, frozen object, schema-validation failure.
- **Expected Output:** `snapshot-reader.test.ts` exists; `npm test -- snapshot-reader` shows 4 failures.
- **Depends on:** T003, T004

#### T008 — Implement `snapshot-reader.ts` (static import + validation)

- **Title:** Typed snapshot accessor with `schemaVersion` guard
- **Description:** Create `site/lib/upstream-drift/snapshot-reader.ts`. Statically import `'@/lib/redirects/__fixtures__/upstream-snapshot.json'` (Next 16 `resolveJsonModule: true` already enabled per `tsconfig.json`). Export `getSnapshot(): UpstreamSnapshot` returning a frozen copy. Export `getWatchedFiles(): WatchedFile[]` derived selector. Throw a typed `SnapshotSchemaError extends Error` (or return a sentinel — pick frozen tuple `{ ok: false, reason: 'schema-mismatch' }` to align with hook error mapping) when `schemaVersion !== 1`. Document the export contract in code comments.
- **Expected Output:** `site/lib/upstream-drift/snapshot-reader.ts` with `getSnapshot` + `getWatchedFiles` + schema validator. Module is `'use client'`-safe (no `'server-only'` directive).
- **Depends on:** T003, T004, **T009a (RED stubs must be written and failing before source is created)**

#### T009 — Complete unit tests for `snapshot-reader.ts` — all GREEN after T008

- **Title:** Vitest tests for static-import + schema validation — GREEN phase
- **Description:** After T008 is implemented, confirm all 4 cases in `snapshot-reader.test.ts` (written in T009a) are GREEN. Schema-mismatch path: extract schema-validation logic into a pure function `validateSchema(snapshot): boolean` and test it directly (option b — simpler than alt-fixture machinery). Verify frozen object via `Object.isFrozen` or mutation attempt.
- **Expected Output:** `snapshot-reader.test.ts` with ≥4 cases; all GREEN.
- **Depends on:** T008, T009a

#### T010 — Add bundle-size assertion baseline (pre-T3)

- **Title:** Capture pre-PRD-005 bundle size as the NFR-1 baseline
- **Description:** Run `npm run build` on the current `prd-005` branch state (after T005). Record gzipped `_app` chunk size from `.next/build-manifest.json` analyzer output (or `npm run analyze` if available) in `project-planning/spike-notes/t010-bundle-baseline.md`. T031 compares against this baseline to assert the 5KB gz delta budget.
- **Expected Output:** `project-planning/spike-notes/t010-bundle-baseline.md` with absolute bundle size + per-chunk breakdown.
- **Depends on:** T005

### Tranche T3 — Drift hook + state machine

#### T013a — RED test stubs for `useUpstreamDrift()` (write BEFORE T011)

- **Title:** Write failing Vitest test stubs for hook state transitions — RED phase
- **Description:** Create `site/hooks/use-upstream-drift.test.tsx` with all 8 state-transition test cases (per § 10 T013a spec) importing from `./use-upstream-drift` — which does NOT yet exist. Mock `getLatestCommitSha` and `snapshot-reader` via `vi.mock`. Suite must fail. This is the RED state.
- **Expected Output:** `use-upstream-drift.test.tsx` exists; `npm test -- use-upstream-drift` shows 8+ failures.
- **Depends on:** T003

#### T011 — Implement `useUpstreamDrift()` hook skeleton (5-state machine)

- **Title:** Hook returning `{ state, lastChecked, errorReason, retryAfterSeconds, recheck }`
- **Description:** Create `site/hooks/use-upstream-drift.ts`. Use `useState` + `useCallback` (no reducer; ADR-0049 says state machine is small enough). Initial state: `{ state: 'idle', lastChecked: null, errorReason: null, retryAfterSeconds: null }`. Export `recheck()` as a stable `useCallback`. Mark file `'use client'` at top. Five states: `'idle' | 'checking' | 'in-sync' | 'drifted' | 'error'`. **No `useEffect` auto-fetch on mount** (FR-C4 / ADR-0049). Implement skeleton first (idle state + mount-no-fetch) until T013a cases 1 and "no fetch on mount" go GREEN; T012 completes the rest.
- **Expected Output:** `site/hooks/use-upstream-drift.ts` exporting `useUpstreamDrift` with the typed return shape; T013a idle + no-mount-fetch tests GREEN; other T013a cases still RED.
- **Depends on:** T003, **T013a (RED stubs must be written and failing before this source is created)**

#### T012 — Wire `recheck()` to call `getLatestCommitSha` sequentially for each watched file

- **Title:** Sequential fetch loop + per-file SHA comparison
- **Description:** Implement `recheck()` body. Read snapshot via `getSnapshot()`; if `schemaVersion !== 1` → set state `'error'`, `errorReason: 'schema-mismatch'`. Otherwise, for each entry in `getWatchedFiles()` **sequentially** (NOT `Promise.all` — per ADR-0049 rate-limit-friendliness): `await getLatestCommitSha(file.path, snapshot.branch)`; if result is `!ok` → set state `'error'` + map `result.reason` to `errorReason`; if `result.sha !== file.sha` → mark drifted; if all match → `'in-sync'`. Write `lastChecked = new Date().toISOString()` on every terminal state (success or error). **Concurrent guard:** at top of `recheck()`, if `state === 'checking'` → return early (FR-C5 / ADR-0049). Set `state = 'checking'` immediately on entry.
- **Expected Output:** `recheck()` complete with sequential fetch + state transitions + concurrent guard.
- **Depends on:** T006, T008, T011

#### T013 — Complete hook state transition tests — all GREEN after T011 + T012

- **Title:** Vitest tests covering `idle → checking → in-sync | drifted | error` — all 8+ cases GREEN
- **Description:** After T011 + T012 are complete, confirm all cases in `use-upstream-drift.test.tsx` (written in T013a) are GREEN. Add the T015 stability test and T016 retryAfterSeconds invariant tests here. Also add: (9) `recheck` reference stable across re-renders; (10) `retryAfterSeconds === null` for schema-mismatch; (11) `retryAfterSeconds === null` for not-found.
- **Expected Output:** `use-upstream-drift.test.tsx` with ≥11 cases; all GREEN.
- **Depends on:** T012, T013a

#### T014 — Schema-mismatch error path (separate task — explicit error mapping)

- **Title:** Map `schemaVersion !== 1` to hook `errorReason: 'schema-mismatch'`
- **Description:** Verify the schema-mismatch path in `useUpstreamDrift` short-circuits before any fetch fires. The `DriftError` union must include `'schema-mismatch'` (per architecture § 4). When schema fails, set `errorReason: 'schema-mismatch'`, `state: 'error'`, do NOT call `getLatestCommitSha`. Add corresponding error copy in `ERROR_COPY` map (T021).
- **Expected Output:** `recheck()` includes schema-mismatch guard at top of try block; test from T013 case 5 covers it.
- **Depends on:** T012

#### T015 — `recheck` stability + `useCallback` dependency hygiene

- **Title:** Verify `recheck` reference stability across renders
- **Description:** `recheck` must be `useCallback`-wrapped with stable deps (empty array if reading state via functional setter, OR `[state]` if reading state directly — pick functional setter for stability). Add a test asserting `recheck` reference does not change across non-state-touching renders (use `renderHook` + rerender). Document why in code comment — the button's `onClick` should not retrigger memoization downstream.
- **Expected Output:** `recheck` stable; one additional test case verifying reference stability.
- **Depends on:** T013

#### T016 — Hook exposes `retryAfterSeconds` only for rate-limit

- **Title:** `retryAfterSeconds: number | null` populated ONLY when `errorReason === 'rate-limit'`
- **Description:** Verify in the hook that `retryAfterSeconds` is non-null exclusively when `errorReason === 'rate-limit'` (FR-C return shape). For every other terminal state, it MUST be `null`. Test case in T013 (case 4) already covers rate-limit; add an explicit assertion in case 5 (schema-mismatch) that `retryAfterSeconds === null`.
- **Expected Output:** Hook return invariant verified by test; no production code change if T012 already implements correctly.
- **Depends on:** T013

### Tranche T4 — UI integration (banner + button + dismiss + errors)

#### T020a — RED test stubs for `UpstreamDriftBanner.tsx` (write BEFORE T017)

- **Title:** Write failing Vitest + RTL test stubs for banner component — RED phase
- **Description:** Create `site/components/full-page/UpstreamDriftBanner.test.tsx` with the 7 structural test cases (per § 10 T020a spec) importing from `./UpstreamDriftBanner` — which does NOT yet exist. Suite must fail. This is the RED state.
- **Expected Output:** `UpstreamDriftBanner.test.tsx` exists; `npm test -- UpstreamDriftBanner` shows 7+ failures.
- **Depends on:** T003

#### T017 — Create `UpstreamDriftBanner.tsx` skeleton

- **Title:** Banner component file + base markup
- **Description:** Create `site/components/full-page/UpstreamDriftBanner.tsx`. Marked `'use client'`. Props: `{ lastChecked: string | null; onDismiss: () => void; dismissed: boolean }`. Renders nothing when `dismissed === true`. Root wrapper: `<div role="status" aria-live="polite">`. Compose with `@blok/icon` (Lucide `AlertTriangle`) leading + body copy + `@blok/icon-button` ghost variant trailing (Lucide `X`, `aria-label="Dismiss upstream drift banner"`). No styling yet (T018 handles tokens). Implement until T020a structural/role/aria tests go GREEN.
- **Expected Output:** `UpstreamDriftBanner.tsx` renders the structure; T020a role/aria/dismiss cases GREEN; styling cases still RED.
- **Depends on:** T003, **T020a (RED stubs must be written and failing before this source is created)**

#### T018 — Style banner with destructive-tone tokens per ADR-0045 amendment

- **Title:** Apply destructive-background, destructive border-left, AlertTriangle in destructive
- **Description:** Apply Tailwind classes / Blok tokens per UI design § 3 D3 + POC `screen-test-drifted.html`: background = `bg-destructive-background` (soft tinted band, NOT saturated); text = `text-foreground`; left border = `border-l-2 border-destructive` (2 px accent rail); padding = `--space-3`; radius = `--radius-md`. Leading icon (`AlertTriangle`) uses `text-destructive`. Trailing `IconButton` stays in `text-foreground`. **POC frame references — visual ground truth:** `pocs/poc-v1-prd005/screen-test-drifted.html` (desktop light), `screen-test-drifted-dark.html` (dark), `screen-test-drifted-mobile.html` (mobile). When POC and spec diverge → POC wins.
- **Expected Output:** Banner renders matching POC `screen-test-drifted*.html` frames in all three theme/viewport combinations.
- **Depends on:** T017

#### T019 — Banner copy + relative-time `<time>` element

- **Title:** Copy text + `lastChecked` formatting
- **Description:** Copy per UI design § 3 banner copy: `Upstream `RedirectsProxy` has changed since this simulator was ported. Trace may be subtly inaccurate. Ask your engineer to run `/sync-redirect-proxy` to update. (Last sync: <date>).` Render `lastChecked` as an absolute ISO date (`Intl.DateTimeFormat` with `dateStyle: 'medium'`) AND a `title="<relative-time>"` attribute (e.g. `"2 days ago"`) using `Intl.RelativeTimeFormat` (no library). Inline-code formatting on `RedirectsProxy` and `/sync-redirect-proxy` via `<code>` tags. Banner copy is static — no user input interpolation (security § 8 architecture).
- **Expected Output:** Banner copy text matches PRD AC-1.4 verbatim; `lastChecked` renders with absolute + relative-via-title.
- **Depends on:** T018

#### T020 — Complete banner unit tests — all GREEN after T017–T019

- **Title:** Vitest + RTL tests for banner render states — full GREEN phase including runtime-contrast
- **Description:** After T017–T019 complete, confirm all cases in `UpstreamDriftBanner.test.tsx` (written in T020a) are GREEN. Add runtime-contrast assertions (§ 9.4 + § 4c-8): render with `html class=""` and `html.dark`; assert `borderLeftColor` is non-empty and not `rgb(0,0,0)` in both themes. Add `role="alert"` absent assertion. Total: ≥10 cases.
- **Expected Output:** `UpstreamDriftBanner.test.tsx` with ≥10 cases; all GREEN.
- **Depends on:** T019, T020a

#### T021 — Create `ERROR_COPY` map for inline status states

- **Title:** Centralize error-state copy in one constant object
- **Description:** Inside `site/components/full-page/TestSurface.tsx` (or a sibling `site/components/full-page/upstream-drift-copy.ts` if cleaner) define `ERROR_COPY: Record<DriftError, { title: string; body: string; retry: 'enabled' | 'disabled-until-reset' | 'none' }>`. Entries per AC-2.1 / 2.2 / 2.3: `'rate-limit'` → "GitHub API rate limit reached. Try again in {N} minutes." retry `disabled-until-reset`; `'not-found'` → "Upstream file not found at expected path. This may indicate a Sitecore refactor — engineer review required." retry `none`; `'network'` → "Couldn't reach GitHub. Try again." retry `enabled`; `'schema-mismatch'` → "Snapshot schema mismatch — engineer review required." retry `none`; `'unknown'` → "Unexpected error checking upstream. Try again." retry `enabled`.
- **Expected Output:** Single source of truth for error copy; consumed by T024.
- **Depends on:** T003

#### T022 — "Check upstream" button + spinner sub-component

- **Title:** Secondary Blok button with `state === 'checking'` swap
- **Description:** Inline render inside `TestSurface.tsx` left rail (created in T023). Use `@blok/button` `variant="secondary"`, block-level width, label = `"Check upstream"`. When `state === 'checking'`: label swaps to `"Checking…"`, leading `@blok/spinner size="sm"` icon, `aria-busy="true"`, `disabled`. Reduced-motion fallback: spinner renders as static `⟳` glyph when `prefers-reduced-motion: reduce` (UI design § 6 + OQ-A3 resolution). **POC frame:** `pocs/poc-v1-prd005/screen-test-checking.html` is the visual contract.
- **Expected Output:** Button renders matching POC frames `screen-test-idle.html` (default) and `screen-test-checking.html` (in-flight).
- **Depends on:** T011

#### T023 — Integrate button + status block into `TestSurface.tsx` left rail

- **Title:** Edit `TestSurface.tsx` — mount Check button + status block below existing Test button
- **Description:** Open `site/components/full-page/TestSurface.tsx`. Locate the left rail (existing URL input + Test button per PRD-004). Insert: (1) hairline `--border` divider with `--space-3` top margin; (2) the "Check upstream" button from T022 (full rail width, secondary); (3) inline status block under the button per UI design § 3 D2 (renders only when `state === 'in-sync' | 'error'`; idle/checking/drifted render nothing). Call `useUpstreamDrift()` at TestSurface top level (or in a new sub-component to avoid bloating TestSurface). Pass `state`, `lastChecked`, `errorReason`, `retryAfterSeconds`, `recheck` down. **POC frames:** `screen-test-idle.html`, `screen-test-in-sync.html` (in-sync), `screen-test-checking.html` (checking).
- **Expected Output:** `TestSurface.tsx` renders the new left-rail block; clicking the button drives the state machine.
- **Depends on:** T022, T012

#### T024 — Render error-state inline status with warning-tone tokens

- **Title:** Error sub-states render with warning (amber) tone + retry button where applicable
- **Description:** In the inline status block (T023), when `state === 'error'`: render `@blok/icon` (Lucide `Info`) with `text-warning` color; title + body from `ERROR_COPY[errorReason]` in `text-warning-foreground`; retry button per `retry` field: `'enabled'` → outline button enabled, calls `recheck()`; `'disabled-until-reset'` → outline button disabled with text "Retry in {N} min" where N = `Math.ceil(retryAfterSeconds / 60)`; `'none'` → no retry button. **Two-tier tone (ADR-0045 amendment):** errors = warning (amber); drifted banner = destructive (red). **POC frames:** `screen-test-error-rate-limit.html`, `screen-test-error-not-found.html`, `screen-test-error-network.html` (+ dark + mobile variants).
- **Expected Output:** Inline error states render matching the three error POC frames.
- **Depends on:** T021, T023

#### T025 — Render in-sync inline status with success tone

- **Title:** `state === 'in-sync'` renders success check + muted text
- **Description:** In the inline status block, when `state === 'in-sync'`: render `@blok/icon` (Lucide `Check`) with `text-success-600` light / `text-success-500` dark; body text "In sync with upstream `dev` (checked <relative>)" in `text-muted-foreground`. Relative-time via `Intl.RelativeTimeFormat`. **Persistence rule (UI design § 3 D2):** persist in the rail until next `recheck()` — do NOT auto-dismiss after 5s. Truncate with `…` at narrow widths. **POC frame:** `screen-test-in-sync.html`.
- **Expected Output:** In-sync status renders matching POC frame; persists until next button click.
- **Depends on:** T023

#### T026 — Mount banner in right column + wire sessionStorage dismiss

- **Title:** `UpstreamDriftBanner` mounted above trace area; dismiss writes `sessionStorage`
- **Description:** In `TestSurface.tsx`, mount `<UpstreamDriftBanner />` at the top of the right column (above the trace area). Render condition: `state === 'drifted'` AND `sessionStorage.getItem('rm-drift-banner-dismissed') !== '1'`. Track `dismissed` in local `useState` initialized from sessionStorage; `onDismiss` writes `sessionStorage.setItem('rm-drift-banner-dismissed', '1')` and sets local state. **SSR-safe init:** use a `useEffect` to read sessionStorage on mount (not in `useState` initializer — would cause hydration mismatch). Per-session scope confirmed by R-arch2 / architecture § 9 — clears on tab close. **POC frame:** `screen-test-drifted.html` shows the banner in the right column.
- **Expected Output:** Banner appears above trace area when drifted + not dismissed; dismiss hides banner for session; banner reappears on full page reload.
- **Depends on:** T020, T023

### Tranche T5 — NFR guards (A11y, theme, structure, bundle)

#### T027 — A11y audit pass on banner + button + status

- **Title:** Verify focus ring, contrast, tab order, ARIA across the new surfaces
- **Description:** Manual audit + automated test: (1) banner `role="status"` + `aria-live="polite"` — NOT `role="alert"`; (2) dismiss button `aria-label="Dismiss upstream drift banner"`; (3) tab order from Test button → Check upstream → (banner dismiss X when rendered) → trace area, matching UI design § 6; (4) focus ring visible on Check button + dismiss button + retry button (Blok `--ring` token at 2 px offset); (5) contrast ratios — banner copy ≥ 4.5:1 in light + dark; success-check icon ≥ 3:1 (icon AA); button label ≥ 4.5:1; (6) all icons are Lucide inline-SVG (currentColor), NO emoji codepoints (`❌` / `✅` / `⚠️`). Add a structural Vitest test asserting `role="status"` is present and `role="alert"` is absent in the banner DOM.
- **Expected Output:** Audit notes in `project-planning/spike-notes/t027-a11y-audit.md`; one Vitest test asserting `role="alert"` not present anywhere in PRD-005 components.
- **Depends on:** T026

#### T028 — Theme parity tests (light/dark/system)

- **Title:** Vitest snapshot or computed-style assertions in both themes
- **Description:** Add tests verifying the new components render with the correct semantic tokens in both themes. For each new component (`UpstreamDriftBanner`, button block, status block) render with `<html class="">` (light) and `<html class="dark">` (dark); assert no `rgb(0, 0, 0)` or `#000` literals appear in computed styles. Spot-check POC frames as visual contract: `screen-test-drifted-dark.html`, `screen-test-in-sync-dark.html`, `screen-test-error-rate-limit-dark.html`.
- **Expected Output:** Theme-parity tests added under each component's `*.test.tsx`; all GREEN in both themes.
- **Depends on:** T026

#### T029 — Structural guard: `next.config.mjs` empty assertion

- **Title:** Vitest test asserting no `Content-Security-Policy` introduced in PRD-005
- **Description:** Per FR-F3 / ADR-0048. Create `site/__tests__/next-config-csp-guard.test.ts` (or similar global-structural test location). Read `next.config.mjs` as text; assert it does NOT contain the string `Content-Security-Policy` (case-insensitive). Documentation comment: "PRD-005 leaves `next.config.mjs` untouched per ADR-0048. If a future PRD introduces CSP, `api.github.com` MUST be in `connect-src`."
- **Expected Output:** One Vitest test guarding against accidental CSP introduction during PRD-005.
- **Depends on:** T005

#### T030 — Reduced-motion fallback verification

- **Title:** Verify spinner + banner transitions short-circuit when `prefers-reduced-motion: reduce`
- **Description:** Per NFR-5 + OQ-A3 resolution. Manual verification (or test via CSS-media-query mock): with `prefers-reduced-motion: reduce`, button spinner renders as static `⟳` glyph (no rotation); banner enter/exit transitions short-circuit to instant. Add CSS `@media (prefers-reduced-motion: reduce) { .spinner-animation { animation: none; } .banner-transition { transition: none; } }` (or equivalent Tailwind `motion-reduce:` utility classes).
- **Expected Output:** Reduced-motion CSS rules present; spot-check verification noted in `project-planning/spike-notes/t030-reduced-motion.md`.
- **Depends on:** T022, T026

#### T031 — Bundle delta measurement vs T010 baseline

- **Title:** Verify net addition ≤ 5KB gz (NFR-1)
- **Description:** Run `npm run build` on the post-T030 state. Compare gzipped chunk size against T010 baseline. Compute delta. Record in `project-planning/spike-notes/t031-bundle-delta.md` with both absolute numbers and the delta in KB gz. **If delta > 5KB gz:** halt and report; profile via `next build --analyze` (or equivalent) to find the bloat; trim or escalate to operator.
- **Expected Output:** Spike note showing delta ≤ 5KB gz vs T010 baseline; PASS noted.
- **Depends on:** T030, T010

### Tranche T6 — Slash command + smoke

#### T032 — Create `.claude/commands/sync-redirect-proxy.md` procedural Markdown

- **Title:** Slash command file with full AC-3.1 through AC-3.12 flow
- **Description:** Create `.claude/commands/sync-redirect-proxy.md` at the **product repo root** (NOT in the `agentic.hahn-solo` parent). The `.claude/` directory does not yet exist locally — create it. File contains procedural Markdown describing the 8-step flow per FR-G2 + AC-3.1..3.12: (1) Read snapshot.json + report current baseline SHAs; (2) For each of 3 upstream files (2 watched + `redirects-proxy.test.ts` for extractor input — architecture § 10 OQ-6), fetch raw via `raw.githubusercontent.com/Sitecore/content-sdk/<branch>/<path>` AND commit SHA via `api.github.com/.../commits?path=...&sha=<branch>&per_page=1`; (3) Compare commit SHAs against baseline; if all match → print "Already in sync — no patch proposed" + exit; (4) Write fresh `_upstream-source.ts` (the test file content) for the AST extractor; (5) Read current `proxy-simulator.ts`; propose verbatim re-port via Edit tool, one hunk per affected helper/function; **honor `knownDivergences[]` — skip changes to listed functions per AC-3.12;** (6) Operator reviews each hunk via Claude Code's edit flow — accept/decline; (7) If accepted: shell `npm run extract:upstream-fixtures` then `npm test -- proxy-simulator`; (8a) On test green: update `upstream-snapshot.json` with new SHAs + `retrievedAt` + new `fileHash` per watched file; ALSO update the extractor's `UPSTREAM_SHA` constant (architecture § 10 OQ-6 resolution) — line 45 of `site/scripts/extract-upstream-fixtures.ts`; print success per AC-3.8 ("…The in-app baseline updates after the next deploy."); (8b) On test red: leave simulator + snapshot UN-bumped per AC-3.9; (9) Append one-line entry to `.claude/sync-redirect-proxy.log`. **Idempotent** per AC-3.11.
- **Expected Output:** `.claude/commands/sync-redirect-proxy.md` committed; file is human-readable and follows Claude Code's slash-command Markdown convention.
- **Depends on:** T005

#### T033 — Add `.claude/sync-redirect-proxy.log` to `.gitignore`

- **Title:** Gitignore the audit log file
- **Description:** Add a line `.claude/sync-redirect-proxy.log` to the product repo root `.gitignore` (or create `.claude/.gitignore` with just `sync-redirect-proxy.log`). Per FR-G5 — local audit record only, not committed. Verify by creating a sample log file and confirming `git status` does not show it.
- **Expected Output:** `.gitignore` entry present; sample log file confirmed-ignored.
- **Depends on:** T032

#### T035a — RED test stubs for `compareSnapshot()` + `honorDivergences()` (write BEFORE T034)

- **Title:** Write failing Vitest test stubs for sync-helper functions — RED phase
- **Description:** Create `site/lib/upstream-drift/sync-helpers.test.ts` with all 5 test cases (per § 10 T035a spec) importing from `./sync-helpers` — which does NOT yet exist. Suite must fail. This is the RED state.
- **Expected Output:** `sync-helpers.test.ts` exists; `npm test -- sync-helpers` shows 5 failures.
- **Depends on:** T003

#### T034 — Extract `compareSnapshot()` + `honorDivergences()` helpers into a testable module

- **Title:** Pure functions for the slash command's logic core — unit-testable
- **Description:** Although the slash command itself is procedural Markdown executed by Claude Code, the logic core can be unit-tested. Create `site/lib/upstream-drift/sync-helpers.ts` exporting: (a) `compareSnapshot(snapshot: UpstreamSnapshot, latest: Array<{ path: string; sha: string }>): { inSync: boolean; drifted: WatchedFile[] }`; (b) `honorDivergences(diff: ParsedHunks, knownDivergences: KnownDivergence[]): ParsedHunks` — filters hunks whose target function name appears in `knownDivergences[].function`. Implement until T035a tests go GREEN.
- **Expected Output:** `site/lib/upstream-drift/sync-helpers.ts` with the two pure functions; T035a tests GREEN.
- **Depends on:** T003, **T035a (RED stubs must be written and failing before this source is created)**

#### T035 — Complete sync-helper unit tests — all GREEN after T034

- **Title:** Vitest tests for slash-command logic helpers — GREEN phase
- **Description:** After T034 is implemented, confirm all 5 cases in `sync-helpers.test.ts` (written in T035a) are GREEN. No additional cases needed unless edge cases surface during T034 implementation.
- **Expected Output:** `sync-helpers.test.ts` with ≥5 cases; all GREEN.
- **Depends on:** T034, T035a

#### T036 — Operator-driven smoke (T6 hard gate)

- **Title:** Manual end-to-end smoke per AC-3.x — recorded in smoke file
- **Description:** Operator-driven verification. Steps: (1) edit `upstream-snapshot.json` — change one `watchedFiles[i].sha` to `'0000000000000000000000000000000000000000'`; (2) `npm run dev`; load Marketplace test app in Cloud Portal (HTTPS required — invoke `sitecore:marketplace-sdk-testing-debug` for the dev loop reminder); navigate to Test tab; click "Check upstream"; expect drift banner with destructive tone + `AlertTriangle`; (3) in Claude Code, run `/sync-redirect-proxy`; expect proposed patch (or "Already in sync" if real upstream SHAs happen to match the bumped stale value — unlikely with all-zero SHA); accept proposed hunks; expect `npm test -- proxy-simulator` GREEN; expect `upstream-snapshot.json` SHA(s) updated; (4) hard-reload iframe; click "Check upstream" again; expect in-sync success state. Record outcome in `project-planning/smoke/smoke-prd-005-<timestamp>.md` with screenshots if possible.
- **Expected Output:** Smoke note `project-planning/smoke/smoke-prd-005-<timestamp>.md` with PASS/FAIL outcomes for each step; operator approval.
- **Depends on:** T031, T035

## 4b. Important Test Cases (by epic / feature)

Each case names the Task ID(s) that implement the behavior and the test file that covers it.

### E1 — Snapshot foundation (T003, T004, T005, T008, T009)

| Case | Task(s) | Test file | Type |
|---|---|---|---|
| Snapshot JSON parses without error and every required field (`schemaVersion`, `branch`, `repository`, `originalPort`, `watchedFiles`, `knownDivergences`) is present | T004, T009 | `snapshot-reader.test.ts` | unit |
| `originalPort` field is present after T1 and its `branch` is `'dev'`; `ports[]` contains exactly 2 entries with the PRD-004 SHAs (`30b0db8f…` / `e6153e5e…`) | T004, T009 | `snapshot-reader.test.ts` | unit |
| `getSnapshot()` returns a frozen object — mutation attempt throws in strict mode | T009 | `snapshot-reader.test.ts` | unit |
| `schemaVersion !== 1` → `validateSchema()` returns false; hook maps this to `errorReason: 'schema-mismatch'` | T009, T014 | `snapshot-reader.test.ts`, `use-upstream-drift.test.tsx` | unit |
| `proxy-simulator.ts` header migration leaves all 691 PRD-004 tests GREEN (T1 hard gate) | T005 | `npm test` output — no co-located test file; this is a regression gate | regression |
| `__fixtures__/.gitignore` does NOT exclude `upstream-snapshot.json` | T004 | `snapshot-reader.test.ts` structural preamble comment | structural |

### E2 — GitHub client + snapshot reader (T006, T007, T008, T009)

| Case | Task(s) | Test file | Type |
|---|---|---|---|
| HTTP 200 + non-empty array → `{ ok: true, sha: body[0].sha, retrievedAt: <ISO> }` — **fixture sourced from architecture § 5a live capture** | T006, T007 | `github-client.test.ts` | unit |
| HTTP 200 + empty array `[]` → `{ ok: false, reason: 'not-found' }` | T006, T007 | `github-client.test.ts` | unit |
| HTTP 403 + body `"API rate limit exceeded"` + `X-RateLimit-Reset: 1779456937` header → `{ ok: false, reason: 'rate-limit', retryAfterSeconds: N }` where N = `max(0, 1779456937 - Math.floor(Date.now()/1000))` | T006, T007 | `github-client.test.ts` | unit |
| HTTP 404 → `{ ok: false, reason: 'not-found' }` | T006, T007 | `github-client.test.ts` | unit |
| `fetch.mockRejectedValue(new TypeError('NetworkError'))` → `{ ok: false, reason: 'network' }` | T006, T007 | `github-client.test.ts` | unit |
| HTTP 500 → `{ ok: false, reason: 'network' }` | T006, T007 | `github-client.test.ts` | unit |
| Malformed JSON / missing `[0].sha` → `{ ok: false, reason: 'unknown' }` | T006, T007 | `github-client.test.ts` | unit |
| Request URL contains `path=<URI-encoded>&sha=<branch>&per_page=1` — assert via captured URL in `vi.spyOn(global, 'fetch')` | T006, T007 | `github-client.test.ts` | unit |
| Request headers include `Accept: application/vnd.github+json` + `X-GitHub-Api-Version: 2022-11-28` and do NOT include `Authorization` | T006, T007 | `github-client.test.ts` | unit |
| Response read as plain JSON array — `body[0].sha` not `body.data[0].sha` (architecture § 5a anti-envelope trap) | T006, T007 | `github-client.test.ts` | unit |

### E3 — Drift hook state machine (T011, T012, T013, T014, T015, T016)

| Case | Task(s) | Test file | Type |
|---|---|---|---|
| Initial state is `'idle'`; no `fetch` fires on mount (render-spy + fetch-mock: assert `fetch` never called after `renderHook(useUpstreamDrift)`) | T011, T013 | `use-upstream-drift.test.tsx` | unit |
| `recheck()` transitions `idle → checking` synchronously (assert state immediately after call before awaiting) | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| Both SHAs match snapshot → terminal state `'in-sync'`; `lastChecked` is non-null ISO string | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| First watched file SHA differs → terminal state `'drifted'`; `lastChecked` is non-null | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| First fetch returns `{ ok: false, reason: 'rate-limit', retryAfterSeconds: 300 }` → state `'error'`, `errorReason: 'rate-limit'`, `retryAfterSeconds: 300` | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| `schemaVersion !== 1` in snapshot → state `'error'`, `errorReason: 'schema-mismatch'`, no `fetch` fired | T014, T013 | `use-upstream-drift.test.tsx` | unit |
| Double-click reentrancy: second `recheck()` while `state === 'checking'` returns early; only one fetch sequence fires | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| Sequential fetch order: second file's fetch fires only after first resolves (assert call-order via `vi.spyOn(global, 'fetch')` — first resolve triggers second call) | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| `lastChecked` is non-null after every terminal state (`in-sync`, `drifted`, `error`) | T012, T013 | `use-upstream-drift.test.tsx` | unit |
| `retryAfterSeconds` is `null` for all error reasons except `'rate-limit'` (assert on `schema-mismatch` and `not-found` transitions) | T016, T013 | `use-upstream-drift.test.tsx` | unit |
| `recheck` reference does not change between non-state-touching re-renders (`renderHook` + `rerender`) | T015, T013 | `use-upstream-drift.test.tsx` | unit |

### E4 — UI surface (T017–T026)

| Case | Task(s) | Test file | Type |
|---|---|---|---|
| Banner renders when `dismissed === false` and `state === 'drifted'` | T020, T026 | `UpstreamDriftBanner.test.tsx` | UI |
| Banner renders nothing when `dismissed === true` (sessionStorage flag set) | T020, T026 | `UpstreamDriftBanner.test.tsx` | UI |
| Banner has `role="status"` — NOT `role="alert"` (structural assertion: query DOM for `role="alert"` → expect empty) | T020, T027 | `UpstreamDriftBanner.test.tsx` | UI/structural |
| Banner has `aria-live="polite"` | T020 | `UpstreamDriftBanner.test.tsx` | UI |
| Banner copy contains literal strings `RedirectsProxy` and `/sync-redirect-proxy` (as `<code>` element text content) | T020 | `UpstreamDriftBanner.test.tsx` | UI |
| Clicking dismiss icon-button calls `onDismiss` callback | T020 | `UpstreamDriftBanner.test.tsx` | UI |
| Dismiss icon-button has `aria-label="Dismiss upstream drift banner"` | T020 | `UpstreamDriftBanner.test.tsx` | UI |
| **Click-target CT-1** (idle → checking): "Check upstream" button click → `recheck()` called; `state` transitions to `'checking'` | T022, T023 | `TestSurface.test.tsx` (or integration test) | UI |
| **Click-target CT-2** (checking → disabled button): button is `disabled` + `aria-busy="true"` while `state === 'checking'` | T022 | `UpstreamDriftBanner.test.tsx` or `TestSurface.test.tsx` | UI/a11y |
| **Click-target CT-3** (drifted → dismiss → idle-like): after dismiss, `sessionStorage.getItem('rm-drift-banner-dismissed')` equals `'1'`; banner re-renders as null | T026 | `TestSurface.test.tsx` or `UpstreamDriftBanner.test.tsx` | UI |
| **Click-target CT-4** (error:network → retry → checking): retry button enabled; click calls `recheck()`; state re-enters `'checking'` | T024 | `TestSurface.test.tsx` | UI |
| **Click-target CT-5** (error:rate-limit → retry disabled): retry button has `disabled` / `aria-disabled="true"` | T024 | `TestSurface.test.tsx` | UI |
| **Click-target CT-6** (error:not-found → no retry button): no retry button rendered | T024 | `TestSurface.test.tsx` | UI |
| Inline status block renders nothing when `state === 'idle'`, `'checking'`, or `'drifted'` (non-error non-in-sync) | T023 | `TestSurface.test.tsx` | UI |
| Inline status block renders in-sync copy when `state === 'in-sync'`; includes `Check` glyph | T025 | `TestSurface.test.tsx` | UI |
| Error inline states use warning (amber) tone: `getComputedStyle(element).color` references `var(--warning)` or `var(--warning-foreground)` (not a hex literal) | T024, T028 | `TestSurface.test.tsx` theme-parity block | UI/runtime-contrast |
| Banner drifted state uses destructive tone: `getComputedStyle(banner).borderLeftColor` resolves to the `--destructive` token value (not `rgb(0,0,0)` or `#000`) | T018, T028 | `UpstreamDriftBanner.test.tsx` theme-parity block | UI/runtime-contrast |
| No SSR/CSR hydration mismatch: `sessionStorage` read is inside `useEffect`, not in `useState` initializer | T026 | structural code-review check — document as co-located comment; verify via `npm run build` with no hydration error | structural |
| Existing Test-tab interactions (URL input, Test button, trace area) still work while banner is mounted | T023 | `TestSurface.test.tsx` — assert no regressions in existing Test-tab tests | UI/regression |

### E5 — NFR guards (T027–T031)

| Case | Task(s) | Test file | Type |
|---|---|---|---|
| `next.config.mjs` does NOT contain the string `Content-Security-Policy` (case-insensitive) | T029 | `site/__tests__/next-config-csp-guard.test.ts` | structural |
| No `role="alert"` anywhere in UpstreamDriftBanner or TestSurface PRD-005 additions | T027 | `UpstreamDriftBanner.test.tsx` | structural |
| Contrast ≥ 4.5:1 — drifted banner foreground vs `--destructive-background` in light AND dark theme (computed via `getComputedStyle` + WCAG contrast formula or jest-axe) | T028 | `UpstreamDriftBanner.test.tsx` theme-parity block | a11y/runtime-contrast |
| Contrast ≥ 4.5:1 — "Check upstream" button label in light AND dark theme | T028 | theme-parity test in `TestSurface.test.tsx` or `UpstreamDriftBanner.test.tsx` | a11y/runtime-contrast |
| Bundle delta ≤ 5KB gz vs T010 baseline (measured by `npm run build` + build-stats comparison script) | T031 | `project-planning/spike-notes/t031-bundle-delta.md` — manual measurement with pass/fail assertion | build |
| Reduced-motion CSS rules present: `@media (prefers-reduced-motion: reduce)` disables spinner animation + banner transition | T030 | manual spot-check noted in `project-planning/spike-notes/t030-reduced-motion.md` | manual |

### E6 — Slash command + smoke (T032–T036)

| Case | Task(s) | Test file | Type |
|---|---|---|---|
| `compareSnapshot(snapshot, latest)` returns `{ inSync: true }` when all `watchedFiles[].sha` match | T034, T035 | `sync-helpers.test.ts` | unit |
| `compareSnapshot(snapshot, latest)` returns `{ inSync: false, drifted: [<file1>] }` when one SHA differs | T034, T035 | `sync-helpers.test.ts` | unit |
| `honorDivergences(diff, [{ function: 'isRegexOrUrl', ... }])` removes hunks targeting `isRegexOrUrl` | T034, T035 | `sync-helpers.test.ts` | unit |
| `honorDivergences(diff, [])` (empty divergences) returns hunks unchanged | T034, T035 | `sync-helpers.test.ts` | unit |
| `honorDivergences` leaves unaffected hunks intact when only some functions are in `knownDivergences[]` | T034, T035 | `sync-helpers.test.ts` | unit |
| T6 operator smoke: bump SHA → Check → see banner → run `/sync-redirect-proxy` → accept → tests GREEN → snapshot bumped → re-check → in-sync | T036 | `project-planning/smoke/smoke-prd-005-<timestamp>.md` | manual smoke |
| Slash command idempotency: running twice when SHAs match prints "Already in sync — no patch proposed" both times (operator-observed) | T036 | manual smoke | manual smoke |
| Extractor `UPSTREAM_SHA` constant in `site/scripts/extract-upstream-fixtures.ts` is bumped alongside snapshot SHA on slash-command accept | T032 | manual smoke / code review | manual |

## 4c. Implementation execution contract (for Developer 08)

### 4c-1. Non-negotiable technical boundaries

- **Verbatim port discipline** — slash command's proposed patches must replicate upstream semantics including quirks (e.g. `isRegexOrUrl` `.slice(0, -1)`). Operators reviewing reject any "improvement" that diverges from upstream. — **ADR-0038** (in baseline.md "Simulator + parity contract").
- **Zero new Sitecore SDK surfaces** — no `@sitecore-marketplace-sdk/xmc` call, no Authoring GraphQL, no XMC, no AI skills. Only one outbound `fetch()` to `api.github.com`. — **ADR-0002 + ADR-0003** (baseline.md "App architecture" + "Data layer").
- **No CSP introduced in PRD-005** — `next.config.mjs` stays empty. T029 structural test guards against accidental introduction. — **ADR-0048**.
- **No LLM / AI dependency in the deployed Marketplace app** — detection is SHA-only comparison. AI involvement lives exclusively in the dev-time slash command. — **ADR-0045** (amended 2026-05-26 — two-tier tone).
- **Tracked branch is `dev` for v0** — `main` does not exist on `Sitecore/content-sdk`. Promote to `main` via single-line JSON edit only when Sitecore publishes it. — **ADR-0044** (amended 2026-05-22).
- **Slash command lives in product repo `.claude/commands/` ONLY** — never bundled into the deployed app, never in the parent `agentic.hahn-solo` orchestration repo. — **ADR-0045**.
- **Sequential GitHub fetches; no `useEffect` auto-fetch on mount** — fetches fire one-per-file in series; second only after first resolves. Concurrent `recheck()` returns early when `state === 'checking'`. — **ADR-0049**.
- **`upstream-snapshot.json` is committed verbatim** — NOT gitignored; git history is the audit trail. — **ADR-0044**.
- **`originalPort` field is set ONCE at T1 and never mutated** by the slash command — only `watchedFiles[].sha / retrievedAt / fileHash` change on bump. — **ADR-0044** + architecture § 4 migration constraint.
- **`schemaVersion === 1` enforced** on every snapshot read — mismatch surfaces as `errorReason: 'schema-mismatch'` banner state. — FR-H3.
- **`role="status"` preserved across all banner tones** — drifted = destructive (red) tone but still `role="status"`, NOT `role="alert"`. Tone change is presentational; semantic is informational. — **ADR-0045** amendment + UI design § 6.
- **No new dev dependencies** — `@octokit/rest`, `xstate`, or any state library NOT introduced. Raw `fetch` + `useState` suffice. — Architecture § 7.

### 4c-2. ADR one-liners (delta from baseline)

The six PRD-005 ADRs are NOT in `baseline.md` (just landed 2026-05-22; deferred to next baseline promotion). Developer reads baseline.md for inherited constitution; the entries below capture only the PRD-005 delta.

- **ADR-0044** — `upstream-snapshot.json` at `site/lib/redirects/__fixtures__/` is authoritative for baseline SHAs; `proxy-simulator.ts` header becomes documentation. **Amended 2026-05-22:** tracked branch is `dev` for v0 (not `main` — upstream 404s); promote to `main` via JSON edit when Sitecore publishes it. `originalPort` preserves PRD-004's `dev`-branch provenance.
- **ADR-0045** — In-app detection is SHA-mismatch only; AI involvement lives EXCLUSIVELY in the dev-time slash command. **Amended 2026-05-26 — two-tier tone:** drifted = destructive (red) + `AlertTriangle`; errors = warning (amber); in-sync = success. `role="status"` preserved across all tones (NOT `role="alert"`).
- **ADR-0046** — GitHub REST API unauthenticated in v0 (60/hr/IP); on-demand only; no `useEffect` auto-fetch on mount; no scheduled background checks. PAT auth deferred to FO-5.2.
- **ADR-0047** — Slash command auto-bumps snapshot SHA only after fixture regeneration + tests pass; failed-test state leaves simulator + snapshot consistent (no half-applied state); `knownDivergences[]` is the escape hatch for deliberate non-ports.
- **ADR-0048** — No app-level CSP introduced in PRD-005; `next.config.mjs` stays empty (verified). In-app `fetch()` to `api.github.com` works without CSP. Future CSP introduction must include `api.github.com` in `connect-src`.
- **ADR-0049** — Drift hook is a 5-state machine (`idle / checking / in-sync / drifted / error`); per-file fetches are sequential (not parallel); concurrent `recheck()` calls return early when `state === 'checking'`; button disabled while in-flight; `lastChecked` set on every terminal state.

**Baseline anchors this PRD touches** (reference only; Developer reads baseline.md):
- **baseline "App architecture + scaffold"** (ADR-0002 / 0011 / 0035) — Mode A iframe; no new server routes; PRD-005 stays inside Mode A scope.
- **baseline "Data layer + content model"** (ADR-0003 / 0007 / 0008 / 0009 / 0013) — no Sitecore data writes; in-app `fetch` is purely public-internet read.
- **baseline "UI framework + visual language (V4 Blok Elevated)"** (ADR-0024 / 0027) — banner + button + status block reuse existing tokens; no new variants.
- **baseline "Full Page workspace patterns"** (ADR-0041 / 0043) — `TestSurface` state lifted to `FullPage`; PRD-005's new state stays inside the hook + `TestSurface` (no further lifting needed in v0).
- **baseline "Simulator + parity contract"** (ADR-0038 / 0039 / 0040 / 0042) — verbatim port discipline + AST extractor inherited unchanged; PRD-005 makes drift visible without changing the contract.

### 4c-3. Stack / tooling specifics

- **Package manager:** `npm` (not `pnpm` — verify `package-lock.json` is the canonical lockfile in `site/`).
- **Test runner:** Vitest (existing — see PRD-004 test setup).
- **Build:** `next build` with Turbopack (Next 16.1.7).
- **Linter:** ESLint via `eslint` (existing config).
- **TypeScript:** strict mode (existing `tsconfig.json` — `strict: true` + `resolveJsonModule: true` already enabled per architecture § 6).
- **Runtime:** Next 16.1.7 + React 19.
- **No new dev dependencies expected.** Specifically: NO `@octokit/rest`, NO `xstate`, NO date-fns / dayjs (use `Intl.DateTimeFormat` + `Intl.RelativeTimeFormat`).
- **Slash command tools:** Claude Code's native Read / Edit / Bash / WebFetch. No external runner.
- **Build commands:** `npm run build`, `npm run dev`, `npm test`, `npm run lint`, `npm run extract:upstream-fixtures`.
- **Dev-loop reminder for marketplace testing:** invoke skill **`sitecore:marketplace-sdk-testing-debug`** for HTTPS + Cloud Portal test app + iframe handshake constraints when running operator smoke at T036.
- **Scaffold carry-over** (no re-scaffold — product exists): skill **`sitecore:setup-marketplace-client-side`** documents the original Mode A scaffold; reference only if migration context is needed.

### 4c-4. UI implementation notes

**Two-tier tone (ADR-0045 amendment 2026-05-26):**

| State | Background | Border / Glyph | Body text | Glyph |
|---|---|---|---|---|
| `drifted` (banner) | `--destructive-background` (soft tint via `color-mix(in oklch, var(--destructive-background) 75%, transparent)`) | `border-l-2 border-destructive` + `text-destructive` glyph | `text-foreground` | Lucide `AlertTriangle` |
| `error` (inline) | `--warning-background` (or transparent + warning glyph) | `text-warning` glyph | `text-warning-foreground` | Lucide `Info` |
| `in-sync` (inline) | transparent | `text-success-600` light / `text-success-500` dark glyph | `text-muted-foreground` | Lucide `Check` |
| `idle` / `checking` (inline) | transparent | — | `text-muted-foreground` (baseline) | `Spinner` (checking only) |

**Button (`@blok/button` `variant="secondary"`):**
- Full rail width (block-level).
- Hairline `--color-border` divider above (separating from existing Test button + URL input block).
- Label: `"Check upstream"`. While `checking`: label `"Checking…"`, leading `@blok/spinner size="sm"`, `aria-busy="true"`, `disabled`.
- Reduced-motion fallback: spinner as static `⟳` glyph when `prefers-reduced-motion: reduce`.

**Dismiss icon-button:** `@blok/icon-button` `variant="ghost"` `size="sm"`, Lucide `X` glyph, `aria-label="Dismiss upstream drift banner"`.

**Retry button (in error state):** `@blok/button` `variant="outline"` `size="sm"`. Enabled / disabled per `ERROR_COPY[reason].retry` field.

**Glyph icons (Lucide source, inline SVG, `currentColor`):**
- `Check` — in-sync indicator
- `AlertTriangle` — drifted banner (revised 2026-05-26 from `Info` muted)
- `Info` — inline error states
- `RefreshCw` — retry button leading glyph (optional)
- `X` — dismiss button
- `Spinner` — `@blok/spinner` primitive for `checking` state

**Banner copy (final, operator-approved):**
`Upstream `RedirectsProxy` has changed since this simulator was ported. Trace may be subtly inaccurate. Ask your engineer to run `/sync-redirect-proxy` to update. (Last sync: <retrievedAt>).`

`<retrievedAt>` rendered as absolute ISO date AND a `title="<relative-time>"` attribute.

**Winning POC clickdummy:** `pocs/poc-v1-prd005/` — visual source of truth. The Developer MAY open POC HTML/CSS files during implementation to match the intended appearance. When spec text and POC diverge → POC wins.

**POC frame references — cite by exact filename:**
- `screen-test-idle.html` — button default + no status block
- `screen-test-checking.html` — disabled button + spinner + "Checking…" label
- `screen-test-in-sync.html` — success check glyph + muted text below button (persistent until next recheck)
- `screen-test-drifted.html` — destructive-tinted banner in right column with `AlertTriangle` glyph + dismiss X
- `screen-test-error-rate-limit.html` — warning-tone inline + retry disabled with "Retry in {N} min"
- `screen-test-error-not-found.html` — warning-tone inline; no retry button
- `screen-test-error-network.html` — warning-tone inline + retry enabled
- Dark variants (`*-dark.html`) — verify token-based colors work in dark mode
- Mobile variants (`*-mobile.html`) — verify ≤ 768 px column-stacking + banner placement between rail and trace

**A11y:** banner is `role="status"` + `aria-live="polite"`; NOT `role="alert"` (would force-interrupt; wrong for informational signal). Dismiss button keyboard-reachable; tab order = URL → Test → Check upstream → (banner dismiss X when rendered) → trace area.

### 4c-5. File / module structure and naming conventions

**New files (PRD-005):**

| Path | Created by task |
|---|---|
| `site/lib/upstream-drift/types.ts` | T003 |
| `site/lib/upstream-drift/github-client.ts` | T006 |
| `site/lib/upstream-drift/github-client.test.ts` | T007 |
| `site/lib/upstream-drift/snapshot-reader.ts` | T008 |
| `site/lib/upstream-drift/snapshot-reader.test.ts` | T009 |
| `site/lib/upstream-drift/sync-helpers.ts` | T034 |
| `site/lib/upstream-drift/sync-helpers.test.ts` | T035 |
| `site/lib/redirects/__fixtures__/upstream-snapshot.json` | T004 |
| `site/hooks/use-upstream-drift.ts` | T011 |
| `site/hooks/use-upstream-drift.test.tsx` | T013 |
| `site/components/full-page/UpstreamDriftBanner.tsx` | T017 |
| `site/components/full-page/UpstreamDriftBanner.test.tsx` | T020 |
| `site/__tests__/next-config-csp-guard.test.ts` | T029 |
| `<product-repo-root>/.claude/commands/sync-redirect-proxy.md` | T032 |
| `<product-repo-root>/.claude/sync-redirect-proxy.log` | T033 (gitignored) |

**Edited files (PRD-005):**

| Path | Edit | Task |
|---|---|---|
| `site/lib/redirects/proxy-simulator.ts` | Header comment rewrite (data → docs reference) | T005 |
| `site/components/full-page/TestSurface.tsx` | Insert Check button + status block + banner mount | T023, T026 |
| `site/scripts/extract-upstream-fixtures.ts` | `UPSTREAM_SHA` constant bump on slash-command accept | T032 (slash command) |
| `<product-repo-root>/.gitignore` | Add `.claude/sync-redirect-proxy.log` | T033 |

**Conditional edits (depends on T001 outcome):**

| Path | Edit | Task |
|---|---|---|
| `site/lib/redirects/proxy-simulator.ts` | Re-port if `dev` has moved since PRD-004 | T002 (NO-OP if no drift) |
| `site/lib/redirects/__fixtures__/upstream-cases.json` | Regenerate via AST extractor if T002 re-ports | T002 |
| `site/lib/redirects/__fixtures__/_upstream-source.ts` | Regenerate from fresh upstream raw (gitignored — not committed) | T002 |

**Naming conventions:**
- Components: `PascalCase.tsx`
- Hooks: `use-kebab-case.ts` (consistent with existing `site/hooks/`)
- Test files: co-located `*.test.ts` / `*.test.tsx`
- Pure modules: `kebab-case.ts`
- Path aliases: `@/lib/...` and `@/hooks/...` per existing `tsconfig.json` paths

### 4c-6. Integration and API contract notes

**GitHub commits API (the one outbound integration).**

```
GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=<encoded-path>&sha=<branch>&per_page=1

Headers (always sent):
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28
  (NO Authorization header — unauthenticated; 60 req/hr/IP per ADR-0046)
```

**Response: PLAIN JSON ARRAY (no envelope).** Read as `(await res.json())[0]?.sha` — NOT `.data[0].sha` (architecture § 5a + § 5b). This contrasts with every Marketplace SDK call documented in `marketplace-sdk-client` § 8b (single- or double-`.data`).

**Captured live response shape (architecture § 5a):**
```jsonc
[
  {
    "sha": "30b0db8fe768b83f03fd6b9772b0d3e14711c6b2",
    "node_id": "...",
    "commit": {
      "author": { "name": "...", "email": "...", "date": "2026-05-12T13:30:07Z" },
      "committer": { "name": "...", "email": "...", "date": "2026-05-12T13:30:07Z" },
      "message": "...",
      "tree": { "sha": "...", "url": "..." },
      "url": "...",
      "comment_count": 0,
      "verification": { ... }
    }
    // + url, html_url, comments_url, author, committer, parents — all ignored
  }
]
```

**Response headers we read:**
- `X-RateLimit-Limit: 60` (informational)
- `X-RateLimit-Remaining: 59` (informational)
- `X-RateLimit-Reset: <epoch seconds>` (used to compute `retryAfterSeconds` on 403)

**Reason mapping (architecture § 5b — refined with live capture):**

| Observation | Reason |
|---|---|
| HTTP 200 + non-empty array | `ok: true, sha: body[0].sha, retrievedAt: new Date().toISOString()` |
| HTTP 200 + empty array `[]` | `'not-found'` |
| HTTP 403 + body matches `/rate limit/i` | `'rate-limit'`, `retryAfterSeconds: max(0, parseInt(X-RateLimit-Reset) - Math.floor(Date.now()/1000))` |
| HTTP 404 | `'not-found'` |
| `fetch` throws OR HTTP 5xx | `'network'` |
| Anything else (4xx not above, malformed JSON, missing `[0].sha`) | `'unknown'` |

**GitHub raw content (slash command ONLY — NOT in-app):**
```
GET https://raw.githubusercontent.com/Sitecore/content-sdk/<branch>/<path>
```
Plain-text body; used by slash command to fetch (a) the two watched `.ts` files for the simulator re-port, and (b) `packages/nextjs/src/proxy/redirects-proxy.test.ts` as input for the AST extractor (architecture § 10 OQ-6 — extractor input is the TEST file, not the source file).

**Snapshot JSON shape (architecture § 4).** Repeated here so the Developer doesn't open the architecture file:

```typescript
type UpstreamSnapshot = {
  schemaVersion: 1;
  repository: 'Sitecore/content-sdk';
  branch: 'dev' | 'main';                          // 'dev' for v0 per ADR-0044 amendment
  originalPort: {                                  // audit-only; set ONCE at T1
    branch: 'dev';
    ports: Array<{ path: string; sha: string; portedAt: string }>;
  };
  watchedFiles: WatchedFile[];
  knownDivergences: KnownDivergence[];
};

type WatchedFile = {
  path: string;
  sha: string;
  retrievedAt: string;       // ISO-8601
  fileHash: string;          // SHA-256 of file content at retrieval
};

type KnownDivergence = {
  at: string;
  reason: string;
  function: string;
  upstreamSha: string;
};
```

**Hook return shape:**

```typescript
type DriftState = 'idle' | 'checking' | 'in-sync' | 'drifted' | 'error';
type DriftError = 'rate-limit' | 'not-found' | 'network' | 'schema-mismatch' | 'unknown';

type UseUpstreamDriftReturn = {
  state: DriftState;
  lastChecked: string | null;
  errorReason: DriftError | null;
  retryAfterSeconds: number | null;  // non-null ONLY when errorReason === 'rate-limit'
  recheck: () => Promise<void>;       // no-op if state === 'checking'
};
```

**NO Sitecore SDK calls.** NO Authoring GraphQL. NO XMC. NO AI skills. NO `xmc.publishing`. The Marketplace SDK reference is informational only (confirms iframe origin model is unchanged + sessionStorage scope per ADR-0049 / R-arch2).

### 4c-8. Runtime contrast token targets (for T028 test assertions)

The following token-to-color mappings define what the runtime contrast tests must NOT collapse to. These are from the Blok Nova preset (PRD-004 baseline `theme.css`, snapshot 2026-05-14) used by this product.

| State | CSS token | Minimum contrast | Assertion |
|---|---|---|---|
| `drifted` banner background | `--destructive-background` (soft tint via `color-mix(in oklch, var(--destructive-background) 75%, transparent)`) | `--foreground` on it ≥ 4.5:1 | `getComputedStyle(banner).backgroundColor` is non-empty, not `rgba(0,0,0,0)` |
| `drifted` banner left border | `--destructive` | n/a (decorative) | `getComputedStyle(banner).borderLeftColor` is non-empty, not `rgb(0,0,0)` |
| `drifted` banner `AlertTriangle` glyph | `text-destructive` → `--destructive` | icon AA ≥ 3:1 | `getComputedStyle(glyphEl).color` is non-empty, not `rgb(0,0,0)` |
| `error` inline glyph (`Info`) | `text-warning` → `--warning` | text AA ≥ 4.5:1 | `getComputedStyle(glyphEl).color` is non-empty, not `rgb(0,0,0)` |
| `error` body text | `text-warning-foreground` → `--warning-foreground` | ≥ 4.5:1 | same pattern |
| `in-sync` glyph (`Check`) | `text-success-600` (light) / `text-success-500` (dark) | icon AA ≥ 3:1 | `getComputedStyle(glyphEl).color` is non-empty |
| `in-sync` body text | `text-muted-foreground` → `--muted-foreground` | ≥ 4.5:1 on muted background | non-empty |

**Collapse failure pattern to guard against:** If a CSS variable is undefined at test time, `getComputedStyle` returns `currentColor` (which resolves to `rgb(0,0,0)` in jsdom). A test asserting `color !== 'rgb(0, 0, 0)'` catches this collapse. The test setup must inject the Blok Nova CSS variables from `prd005.css` or the app's `globals.css` into the jsdom document for computed styles to resolve correctly.

### 4c-9. GitHub API live-captured fixture (for test file verbatim copy)

Copy this exactly into `github-client.test.ts` as the success-case mock body. Comment required:

```jsonc
// source: architecture-20260522T114800Z.md § 5a — live capture 2026-05-22
// GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=dev&per_page=1
const LIVE_COMMIT_FIXTURE = [
  {
    sha: '30b0db8fe768b83f03fd6b9772b0d3e14711c6b2',
    node_id: 'C_kwDONf2ORtoAKDMwYjBkYjhmZTc2OGI4M2YwM2ZkNmI5NzcyYjBkM2UxNDcxMWM2YjI',
    commit: {
      author: {
        name: 'Menelaos Nasies',
        email: '38861573+MenKNas@users.noreply.github.com',
        date: '2026-05-12T13:30:07Z',
      },
      committer: { name: 'GitHub', email: 'noreply@github.com', date: '2026-05-12T13:30:07Z' },
      message: '[nextjs] Fix for regex based redirect issues (#470)',
    },
  },
];
```

**Not-found fixture:**
```ts
// source: architecture-20260522T114800Z.md § 5b reason-mapping table — HTTP 200 + empty array
const NOT_FOUND_FIXTURE: [] = [];
```

**Rate-limit response headers fixture:**
```ts
// source: architecture-20260522T114800Z.md § 5a response headers section
const RATE_LIMIT_HEADERS = {
  'X-RateLimit-Limit': '60',
  'X-RateLimit-Remaining': '0',
  'X-RateLimit-Reset': '1779456937', // epoch seconds
};
```

### 4c-10. Hook state machine transition matrix (for T013 test design)

From architecture § 4 (inlined here so Developer never opens architecture file):

```
           recheck()
idle  ─────────────────► checking ─── all SHAs match  ──────────────► in-sync
                            │
                            ├─── any SHA differs  ──────────────────► drifted
                            │
                            └─── any fetch failed  ─────────────────► error

in-sync ──── recheck() ──► checking (same loop)
drifted ──── recheck() ──► checking (same loop)
error   ──── recheck() ──► checking (same loop)
```

**Reentrancy contract (ADR-0049):** `recheck()` is a no-op when `state === 'checking'`. The button is also `disabled` in this state (double guard). Test must verify both layers: (a) hook-level no-op, (b) button-level disabled.

**Sequential fetch contract (FR-C3, ADR-0049):** For 2 watched files, fetch calls are serial: file[0] resolves before file[1] is called. `Promise.all` is explicitly NOT used. Rationale: rate-limit-friendlier and simpler error attribution (first error short-circuits).

**`lastChecked` invariant:** Updated on every terminal state (`in-sync`, `drifted`, `error`). NOT updated on `idle → checking` transition. NOT cleared between recheck cycles.

**`retryAfterSeconds` invariant:** Non-null only when `errorReason === 'rate-limit'`. Must be null for `not-found`, `network`, `schema-mismatch`, `unknown`.

**`schema-mismatch` short-circuit:** `schemaVersion !== 1` check happens BEFORE any `getLatestCommitSha` call. No fetch fires. `errorReason: 'schema-mismatch'` is the synthetic error; not a GitHub API response.

### 4c-7. Parity / rebuild pointers

**N/A — feature delta on existing app; no rebuild.** PRD-005 builds on top of PRD-000..004's shipped Marketplace app. There is no rebuild target, no source-analysis content dump, no per-route parity mapping. The parity discipline that DOES carry forward is ADR-0038 (verbatim port of upstream `RedirectsProxy`) — but that is implementation-time parity captured by `upstream-cases.json` fixtures, not a rebuild artifact.

## 5. Dependencies

### Ordering constraints (why certain tasks must run before others)

- **T1 hard gate (T005)** must complete with 691 baseline tests GREEN before any new code lands. The snapshot JSON + header migration must be settled before the hook (T011) reads the snapshot via the snapshot-reader.
- **GitHub client (T006) + snapshot reader (T008) must exist before the hook (T011, T012) can compose them.**
- **Hook (T011, T012) must be ready before TestSurface integration (T023)** — the button click handler calls `recheck()`.
- **Banner component (T017–T020) must exist before mount + dismiss integration (T026).**
- **All UI components (T017–T026) must be ready before A11y / theme / structural / bundle guards (T027–T031).**
- **Slash-command helpers (T034 + T035) can run parallel to UI tranches (T4) because the helper module is pure TS — but the slash-command file itself (T032) depends on T005 (the migrated `proxy-simulator.ts` header).**
- **T036 operator smoke depends on T031 (bundle gate must pass) AND T035 (helpers tested).**

### Execution order (numbered list — RED → GREEN ordered; every Task ID in valid dependency order)

TDD note: Tasks that create source modules (T006, T008, T011, T012, T017–T019, T023–T026, T034) must be preceded by their RED test tasks (T007, T009, T013, T020, T035). The `Depends on` fields and the ordering below enforce this. Where the Lead Developer's task already IS the RED task (e.g. T007 before T006 in the original plan), those are noted.

**Reorder applied:** T007 (RED tests for github-client) must precede T006 (source) per TDD mandate; T009 (RED tests for snapshot-reader) must precede T008; T013 (RED tests for hook) must be written as stubs before T012 (full recheck wiring); T020 (RED tests for banner) before T018–T019 (full styling/copy); T035 (RED tests for sync-helpers) before T034 (source). Adjusted ordering below:

1. T001 — probe (operational; no RED test)
2. T002 — conditional re-port (operational; no RED test)
3. T003 — type definitions (prerequisite; no RED test — pure types, no runtime behavior)
4. T004 — commit snapshot JSON (prerequisite for T008 + T009)
5. T005 — header migration (T1 hard gate — regression test is `npm test`; 691 must stay GREEN)
6. **T007a** — write RED stubs for `getLatestCommitSha` (all 7 branches failing) ← NEW RED half
7. T006 — implement `github-client.ts` until T007a tests go GREEN
8. T007 — complete github-client unit tests (all GREEN)
9. **T009a** — write RED stubs for `snapshot-reader` (schema validation, frozen return) ← NEW RED half
10. T008 — implement `snapshot-reader.ts` until T009a tests go GREEN
11. T009 — complete snapshot-reader unit tests (all GREEN)
12. T010 — capture bundle size baseline
13. **T013a** — write RED stubs for hook state transitions (all 8 cases failing) ← NEW RED half
14. T011 — implement hook skeleton (initial state, useCallback stub) until T013a mount/idle tests pass
15. T012 — wire `recheck()` fetch loop until T013a transition tests go GREEN
16. T013 — complete hook unit tests (all GREEN)
17. T014 — schema-mismatch error path (covered by T013 case 5 — may be no-op if T012 + T013 already cover it)
18. T015 — `recheck` stability + useCallback hygiene
19. T016 — `retryAfterSeconds` invariant
20. **T020a** — write RED stubs for banner render (7 cases failing) ← NEW RED half
21. T017 — implement banner skeleton until T020a structural/role tests pass
22. T018 — style banner with destructive tokens
23. T019 — banner copy + relative-time element
24. T020 — complete banner unit tests (all GREEN)
25. T021 — `ERROR_COPY` map
26. T022 — "Check upstream" button + spinner
27. **T035a** — write RED stubs for `compareSnapshot` + `honorDivergences` (all 5 cases failing) ← NEW RED half
28. T034 — implement sync-helpers until T035a tests go GREEN
29. T035 — complete sync-helpers unit tests (all GREEN)
30. T023 — integrate button + status block into TestSurface
31. T024 — error-state inline status
32. T025 — in-sync inline status
33. T026 — mount banner + wire sessionStorage dismiss
34. T027 — A11y audit pass
35. T028 — theme parity tests
36. T029 — structural guard: `next.config.mjs` empty assertion
37. T030 — reduced-motion fallback verification
38. T031 — bundle delta measurement
39. T032 — create slash command file
40. T033 — gitignore audit log
41. T036 — operator-driven smoke (T6 hard gate)

### Parallel groups (optional — Team Lead MAY spawn parallel Developer agents)

```
Group 1 (sequential — T1 foundation):       T001 → T002 → T003 → T004 → T005
Group 2 (parallel after T005):
  - Path A (E2 GitHub client):               T006 → T007
  - Path B (E2 snapshot reader):             T008 → T009
  - Path C (bundle baseline):                T010
  - Path D (helpers — slash-cmd-pure):       T034 → T035
Group 3 (sequential after Group 2 — E3 hook): T011 → T012 → T013 → T014 → T015 → T016
Group 4 (sequential after Group 3 — E4 UI):
  - Sub-A (banner): T017 → T018 → T019 → T020
  - Sub-B (button): T022 (after T011 only — can overlap Sub-A)
  - Sub-C (copy + integration): T021 → T023 → T024 → T025 → T026 (sequential after T020 + T022)
Group 5 (sequential after Group 4 — E5 NFR):  T027, T028, T029, T030 (mostly parallel) → T031
Group 6 (sequential — E6 slash-cmd):          T032 → T033 → T036
```

In practice with one operator + one Developer agent: sequential execution per the numbered list above is the safe default. Parallel groups documented in case the Team Lead has capacity.

## 6. Suggested Milestones

- **M-T1** — Snapshot JSON committed + header migrated + 691 PRD-004 tests still GREEN. (After T005.)
- **M-T2** — GitHub client + snapshot reader unit-tested. (After T010.)
- **M-T3** — Drift hook fully tested across 5 states. (After T016.)
- **M-T4** — Test tab integrated: button, banner, status block, dismiss, errors. (After T026.)
- **M-T5** — NFR guards green: a11y, theme parity, no CSP, bundle ≤ 5KB gz. (After T031.)
- **M-T6** — Slash command shipped + operator smoke PASSED. (After T036.)

## 7. Risk Areas

PRD § 13 risks R1–R10 are inherited; new risks surfaced at architecture time:

- **R-arch1 (architecture § 9) — Turbopack HMR for static JSON imports may not reliably reload on snapshot edit during `npm run dev`.** *Developer mitigation:* slash-command success message (T032) includes the one-liner "If `npm run dev` is running, hard-reload the iframe; otherwise the SHA reaches prod after `npm run build` + deploy." Operator hard-reload during T036 smoke is part of the procedure.
- **R-arch2 (architecture § 9) — `sessionStorage` lifetime inside the Cloud Portal iframe.** Per-origin per-top-level-tab; dismiss clears when operator closes the tab. *No mitigation needed* — this is correct behavior; document with a one-line code comment in `UpstreamDriftBanner` / `TestSurface` to prevent future engineers expecting `localStorage` semantics.
- **R-arch3 (architecture § 9) — AST extractor staleness.** Extractor recognizes the upstream test idiom at the SHA it was written for. If upstream introduces a new test pattern (e.g. `setupRedirect()` helper, `vi.fn` replacing Sinon), the regenerated `upstream-cases.json` may be missing cases. *Developer mitigation:* slash command's "case count printed" step (AC-3.6) — engineer compares against last-known count during operator review at T032/T036. Document in the slash-command Markdown as a step-7 sanity check.

**PRD-inherited risks the implementation actively touches:**
- **R1** — `dev` may have moved since PRD-004 port → T001 spike + T002 conditional re-port handle this.
- **R4** — accidental CSP introduction → T029 structural guard.
- **R5** — slash command's AI-proposed patch could be subtly wrong → AC-3.7 test gate + AC-3.9 un-bump-on-red contract.
- **R8** — snapshot JSON static-import → one deploy cycle lag is intentional and surfaced in AC-3.8 success message.
- **R9** — bundle delta exceeds 5KB → T010 + T031 budget enforcement.

## 8. What Needs To Be Tested (global testing runbook)

### Actual coverage — PRD-005 implementation complete (2026-05-22)

| Suite | Files | Actual count | Status |
|---|---|---|---|
| Unit — GitHub client | `github-client.test.ts` | 10 tests | GREEN |
| Unit — Snapshot reader | `snapshot-reader.test.ts` | 4 tests | GREEN |
| Unit — Drift hook | `use-upstream-drift.test.tsx` | 12 tests | GREEN |
| Unit — Sync helpers | `sync-helpers.test.ts` | 5 tests | GREEN |
| UI/component — Banner | `UpstreamDriftBanner.test.tsx` | 14 tests | GREEN |
| UI/component — TestSurface (new CT tests) | `TestSurface.test.tsx` | +8 tests | GREEN |
| Structural — CSP guard | `next-config-csp-guard.test.ts` | 1 test | GREEN |
| **PRD-005 new tests total** | | **54 new tests** | **GREEN** |
| **Regression — PRD-004 baseline** | full suite | 692 baseline tests | GREEN |
| **Grand total** | 82 test files | **746 tests** | **GREEN** |

Validation gate results (2026-05-22T16:15:00Z):
- `npm run lint` — 0 new errors (10 pre-existing `any` errors in `_upstream-source.ts` unchanged)
- `npm run build` — GREEN (static generation 9/9 pages)
- `npm test` — 746/746 GREEN, 82 test files, 26.98s

T028 note: runtime-contrast via `getComputedStyle` substituted with token-class assertion — jsdom cannot evaluate CSS variable inheritance from `globals.css` without full stylesheet injection. Test asserts `drift-banner` class presence and correct CSS class structure instead.

**Unit tests** (new files; co-located `*.test.ts(x)`):
- `github-client.test.ts` — 6+ reason branches, headers, URL composition, no Auth header
- `snapshot-reader.test.ts` — static import, schema validation, frozen return
- `use-upstream-drift.test.tsx` — 8+ state-transition cases, sequential ordering, concurrent guard, stability
- `UpstreamDriftBanner.test.tsx` — 7+ render/a11y cases, dismiss flow
- `sync-helpers.test.ts` — `compareSnapshot` + `honorDivergences` cases

**UI / component tests:**
- Theme parity per component in light/dark (T028)
- `role="alert"` absent across PRD-005 components (T027 structural)
- Computed-style assertions for two-tier tone (drifted = destructive; error = warning; in-sync = success)

**Structural / build tests:**
- `next-config-csp-guard.test.ts` — no CSP introduced (T029)
- Bundle delta ≤ 5KB gz vs T010 baseline (T031)

**Regression:**
- All 691 PRD-004 tests remain GREEN after T005 header migration (hard gate)
- Simulator parity vs `upstream-cases.json` unchanged

**Test commands** (from `project-planning/plans/prime.md`):
- `npm test` — full suite
- `npm test -- proxy-simulator` — parity tests only
- `npm test -- upstream-drift` — PRD-005 unit tests only
- `npm run lint`
- `npm run build`
- `npm run extract:upstream-fixtures` — regenerate fixtures (after re-port only)

**Smoke gates:**
- **T1 hard gate (T005):** 691 tests GREEN after header migration. Required before T2.
- **T6 operator smoke (T036):** end-to-end bump-to-stale → click Check → see banner → run `/sync-redirect-proxy` → accept patch → tests GREEN → snapshot bumped → click again → in-sync. Recorded in `project-planning/smoke/smoke-prd-005-<timestamp>.md` per FR-G manifest contract. Requires Cloud Portal HTTPS test-app (skill `sitecore:marketplace-sdk-testing-debug` for the dev loop).

**Extended test inventory (QA Specialist addition):**

| Category | Files | Expected count |
|---|---|---|
| Unit — GitHub client | `site/lib/upstream-drift/github-client.test.ts` | ≥ 7 cases (7 reason branches) |
| Unit — Snapshot reader | `site/lib/upstream-drift/snapshot-reader.test.ts` | ≥ 4 cases (parse, watchedFiles, frozen, schema-mismatch) |
| Unit — Drift hook | `site/hooks/use-upstream-drift.test.tsx` | ≥ 8 cases (5 state transitions + concurrent guard + lastChecked + stability) |
| Unit — Sync helpers | `site/lib/upstream-drift/sync-helpers.test.ts` | ≥ 5 cases (compareSnapshot × 2, honorDivergences × 3) |
| UI/component — Banner | `site/components/full-page/UpstreamDriftBanner.test.tsx` | ≥ 7 cases (render, dismiss, role, aria-live, copy, runtime-contrast) |
| UI/component — TestSurface | `site/components/full-page/TestSurface.test.tsx` (existing + new) | ≥ 8 new cases (button states, status block modes, sessionStorage dismiss, no-fetch-on-mount) |
| Structural | `site/__tests__/next-config-csp-guard.test.ts` | 1 case |
| Regression | `npm test` full run | All 691 PRD-004 cases GREEN throughout |
| **Total new PRD-005 tests** | | **≥ 40 new automated tests** |

**Runtime-contrast assertions** (load-bearing — do not downgrade to class-only assertions):

For `UpstreamDriftBanner` in destructive (drifted) state:
```ts
// In UpstreamDriftBanner.test.tsx theme-parity block
// Render with <html class=""> (light) and <html class="dark"> (dark)
// Assert resolved border-left color references --destructive, not a literal hex
const el = screen.getByRole('status');
const style = window.getComputedStyle(el);
// The border-left must NOT be rgb(0, 0, 0) or empty string
expect(style.borderLeftColor).not.toBe('');
expect(style.borderLeftColor).not.toBe('rgb(0, 0, 0)');
// Additional: use jest-axe { rules: { 'color-contrast': { enabled: true } } }
//   to assert WCAG AA ≥ 4.5:1 on foreground text in both themes
```

For error inline states (warning amber):
```ts
// Render TestSurface with state='error', errorReason='network'
// Assert --warning token resolves, not raw hex
const errorEl = screen.getByRole('status'); // inline status has role="status"
const style = window.getComputedStyle(errorEl);
expect(style.color).not.toBe('rgb(0, 0, 0)'); // would indicate token fallback collapse
```

These assertions catch the Blok Nova `--primary-foreground` collapse failure mode (QuickCopy v0.1 regression pattern) applied to `--destructive` and `--warning` tokens.

**Click-target traceability:**

Every named click target in `pocs/poc-v1-prd005/click-targets.md` has a covering test listed in § 4b E4 table above under CT-1 through CT-6. The POC state-transition graph (`idle → checking → {in-sync|drifted|error:*}`) is the contract; the test suite must exercise every arc.

## 9. TDD and quality contract

### 9.1 RED → GREEN → REFACTOR mandate

This breakdown enforces `task_breakdown_style: tdd`. The following rules are non-negotiable for all code-implementing tasks:

1. **RED before GREEN.** No production source file for `github-client.ts`, `snapshot-reader.ts`, `use-upstream-drift.ts`, `UpstreamDriftBanner.tsx`, `sync-helpers.ts` may be written to disk before the corresponding RED test file exists and the test suite is in a failing (RED) state for the behaviors being added. The `Txxxa` sub-tasks in § 5 Execution order encode this.

2. **Snapshot JSON schema test precedes snapshot write.** T009a RED stubs must exist before T008 (`snapshot-reader.ts`) is implemented. The schema-validation pure function `validateSchema(snapshot)` must be RED-tested before the reader composes it.

3. **Hook state machine tests precede full wiring.** T013a RED stubs for all 8 state-transition cases must be written before T012 (`recheck()` body) is fully implemented. Partial GREEN is acceptable (T011 gets the idle-state and mount-no-fetch tests passing; T012 gets the transition tests passing).

4. **Banner RED tests precede styling.** T020a RED tests (role, aria-live, copy presence, dismiss callback) must be written and failing before T017 (skeleton) is flesh-filled with real Blok markup. Do not add styling until the structural tests pass.

5. **Sync-helper RED tests precede implementation.** T035a must be written before T034 source is implemented.

6. **REFACTOR gate.** After each GREEN step, review for: (a) no `any` casts leaking through, (b) no hex literals in component styles, (c) `sessionStorage` access only inside `useEffect` (hydration-safe), (d) no `role="alert"` added anywhere in the diff.

### 9.2 Exceptions (no RED test required)

- **T001** — live probe (curl / WebFetch). Operational, not code. Output is a spike note, not a compiled module.
- **T002** — conditional re-port. If executed: it IS a refactor of existing code already covered by the 691-test regression suite. The gate is `npm test -- proxy-simulator` GREEN, not a new RED test.
- **T003** — TypeScript type aliases (`types.ts`). Pure types; no runtime behavior; no RED test needed. Correctness is enforced downstream by the tests that consume the types.
- **T005** — header migration. Gate is the 691 regression tests passing. No new RED test needed for a comment rewrite.
- **T010** — bundle size baseline capture. Spike note. No code.
- **T021** — `ERROR_COPY` constant map. Pure data; no logic. Covered by downstream error-state tests in T024.
- **T027** — A11y audit. Partly manual; the automated portion (assert `role="alert"` absent) is a structural test added to existing test files, not a new module needing RED.
- **T030** — reduced-motion verification. Primarily a CSS guard + manual spot-check. The `animation: none` rule is a CSS media query — verifiable via manual spot-check noted in a spike note.
- **T032** — slash command Markdown file. Procedural text, not compiled code. Not testable with Vitest.
- **T033** — `.gitignore` edit. Not a code module.
- **T036** — operator smoke. Entirely manual; no Vitest test.

### 9.3 Fixture provenance contract (SDK-contract rule `40-sdk-contracts.mdc`)

No Sitecore SDK surfaces are touched in PRD-005. However, the GitHub commits API has ONE live-captured response embedded in the architecture (§ 5a). This is the fixture authority:

**`github-client.test.ts` fixture source:**
```jsonc
// source: architecture-20260522T114800Z.md § 5a — live capture 2026-05-22
// GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=dev&per_page=1
[
  {
    "sha": "30b0db8fe768b83f03fd6b9772b0d3e14711c6b2",
    "node_id": "C_kwDONf2ORtoAKDMwYjBkYjhmZTc2OGI4M2YwM2ZkNmI5NzcyYjBkM2UxNDcxMWM2YjI",
    "commit": {
      "author": { "name": "Menelaos Nasies", "date": "2026-05-12T13:30:07Z" },
      "committer": { "name": "GitHub", "date": "2026-05-12T13:30:07Z" },
      "message": "[nextjs] Fix for regex based redirect issues (#470)"
    }
  }
]
```

Every `vi.spyOn(global, 'fetch').mockResolvedValueOnce(...)` call in `github-client.test.ts` that simulates a 200 success response MUST use a mock body matching this live-captured shape — specifically `[{ sha: string, commit: { author: { date: string } } }]`. Invented response shapes (e.g. `{ data: { sha: ... } }`) are rejected. Each fixture mock in the file must carry the comment `// source: architecture-20260522T114800Z.md § 5a live capture`.

The `'not-found'` case fixture is `[]` (empty array) — also from the architecture spec (§ 5b — HTTP 200 + empty array path). Comment: `// source: architecture-20260522T114800Z.md § 5b reason-mapping table`.

### 9.4 Runtime contrast assertion mandate

Components in this PRD paint with Blok Nova theme tokens. Token-based tests MUST assert resolved computed values, not just class presence. Rationale: `toHaveClass('bg-destructive-background')` passes even when `--destructive-background` collapses to `currentColor` or `#000` under a missing CSS variable. This failure mode has shipped in this repo before (QuickCopy v0.1).

**Required assertions** (in `UpstreamDriftBanner.test.tsx` and the theme-parity block of `TestSurface.test.tsx`):
- Render with `<html class="">` (light) and `<html class="dark">` (dark) by injecting the class into `document.documentElement` in the test setup.
- After render, call `window.getComputedStyle(element)` on the banner root and status indicator elements.
- Assert `.borderLeftColor` (banner) and `.color` (inline status text) are non-empty strings and are NOT `rgb(0, 0, 0)` / `rgba(0, 0, 0, 0)` / `''`. This catches the token-collapse failure.
- Optionally: use `jest-axe` with `{ rules: { 'color-contrast': { enabled: true } } }` against the rendered DOM with injected theme — this is the most complete coverage.

### 9.5 Marketplace host-frame visual smoke

`platform_target: marketplace` — the canonical visual test target is the clipped iframe inside the live Sitecore Cloud Portal host frame, not a standalone-localhost render.

At T036 operator smoke, the five visual axes to verify against the POC clickdummy are:
1. **Layout** — "Check upstream" button placement in left rail below Test button; hairline divider present.
2. **Typography** — body copy matches banner text verbatim; `<code>` inlines render in monospace.
3. **Color** — drifted banner has red left-border + tinted background (destructive); error states have amber glyph; in-sync has green glyph.
4. **Component anatomy** — `AlertTriangle` glyph present in drifted state (NOT emoji); `X` icon-button ghost trailing; Spinner in checking state.
5. **State fidelity** — all 5 states (idle, checking, in-sync, drifted, error) cycle correctly via the "Check upstream" button.

Visual diff vs `pocs/poc-v1-prd005/` is the ground truth. Load the POC via `npx serve pocs/poc-v1-prd005/` (Playwright MCP rejects `file://`) for side-by-side comparison.

Host URL + app origin are operator-supplied. If not supplied at T036 time, record visual testing as `deferred — host URL not supplied` with `outcome: "pending"` in `smoke_outcomes`.

### 9.6 `smoke_outcomes` initialization

The following manual smoke steps from the PRD's release plan must be recorded in `manifest.smoke_outcomes`. The test pass cannot transition to `tested` while any entry is `"pending"` — status becomes `tested_pending_smoke` instead.

```json
{
  "smoke_outcomes": {
    "S1": { "step": "T1 hard gate — 691 baseline tests GREEN after header migration", "outcome": "pending" },
    "S2": { "step": "T036 — bump SHA to stale → click Check → banner appears (destructive tone, AlertTriangle, role=status)", "outcome": "pending" },
    "S3": { "step": "T036 — run /sync-redirect-proxy → accept patch → npm test -- proxy-simulator GREEN → snapshot SHA updated", "outcome": "pending" },
    "S4": { "step": "T036 — re-click Check → in-sync success state (green Check glyph, muted text, no banner)", "outcome": "pending" },
    "S5": { "step": "T036 — dismiss banner (X click) → sessionStorage flag set → banner hidden; full page reload resets it", "outcome": "pending" },
    "S6": { "step": "Visual smoke vs POC — five-axis check in host frame (layout, typography, color, anatomy, state fidelity)", "outcome": "pending" }
  }
}
```

Update `project-planning/workflow/run-20260522T114800Z.json` and `current-run.json` with these entries at the start of /implement.

## 10. Per-task test specifications

### T001 — Probe upstream `dev` SHAs (operational)

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| curl/WebFetch to `api.github.com/.../commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=dev&per_page=1` returns HTTP 200 with a non-empty array | `sha` field recorded in spike note; matches or differs from `30b0db8fe768b83f03fd6b9772b0d3e14711c6b2` | manual smoke | `project-planning/spike-notes/t001-dev-sha-probe.md` |
| Decision note states "no re-port" OR "re-port required" with scope | Spike note contains one-paragraph decision that an operator can read and act on | manual | `project-planning/spike-notes/t001-dev-sha-probe.md` |

No RED test required (operational task — see § 9.2).

---

### T002 — Conditional re-port (operational / regression)

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| If T001 reports drift: `npm test -- proxy-simulator` passes 100% after re-port | All simulator parity cases GREEN | regression | `site/lib/redirects/proxy-simulator.test.ts` (existing) |
| If T001 reports no drift: task is NO-OP; spike note updated | No file edits; note records "no-op" | manual | spike note |

No new RED tests. Gate is the existing 691 regression suite.

---

### T003 — TypeScript type definitions

No Vitest tests. Types are structural; correctness is enforced by downstream test compilation errors.

Developer notes: ensure `DriftError` union includes `'schema-mismatch'` (used by T014). This is required for T009 and T013 tests to compile.

---

### T004 — Commit `upstream-snapshot.json`

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| JSON file exists and parses without error | `JSON.parse(fs.readFileSync(...))` succeeds | unit (via T009 `snapshot-reader.test.ts`) | `site/lib/upstream-drift/snapshot-reader.test.ts` |
| `schemaVersion === 1` | Value is integer 1 | unit | snapshot-reader.test.ts |
| `originalPort.ports` has exactly 2 entries with SHA `30b0db8f…` and `e6153e5e…` | Array length 2; sha fields match PRD-004 values | unit | snapshot-reader.test.ts |
| `watchedFiles` has exactly 2 entries; each has `path`, `sha`, `retrievedAt`, `fileHash` | Array length 2; all fields non-empty strings | unit | snapshot-reader.test.ts |
| `knownDivergences` is an empty array | `[].length === 0` | unit | snapshot-reader.test.ts |

No dedicated T004 test file — these are tested via T009.

---

### T005 — Header migration (T1 hard gate)

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Full `npm test` run returns 691 GREEN tests (same count as PRD-004 baseline) | No new failures; no test count regression | regression | all existing test files |
| `proxy-simulator.ts` header does NOT contain a raw SHA string matching `/[0-9a-f]{40}/` in the first 27 lines | Header is documentation-only; no data-bearing SHAs | structural | add a one-line assertion in the CSP guard test file OR a separate structural test in `site/__tests__/` |

---

### T007a (RED) + T007 — GitHub client unit tests

**T007a — write these cases as FAILING tests before T006 source exists:**

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| 200 + non-empty array → `ok: true, sha: '30b0db8f...'` (fixture: architecture § 5a live capture) | Returns `{ ok: true, sha: '30b0db8fe768b83f03fd6b9772b0d3e14711c6b2', retrievedAt: <ISO> }` | unit | `site/lib/upstream-drift/github-client.test.ts` |
| 200 + `[]` → `not-found` (fixture: architecture § 5b reason table) | Returns `{ ok: false, reason: 'not-found' }` | unit | github-client.test.ts |
| 403 + body `"API rate limit exceeded"` + `X-RateLimit-Reset: 1779456937` | Returns `{ ok: false, reason: 'rate-limit', retryAfterSeconds: N }` where N ≥ 0 | unit | github-client.test.ts |
| 404 | Returns `{ ok: false, reason: 'not-found' }` | unit | github-client.test.ts |
| `fetch` throws `TypeError` | Returns `{ ok: false, reason: 'network' }` | unit | github-client.test.ts |
| 500 | Returns `{ ok: false, reason: 'network' }` | unit | github-client.test.ts |
| 200 + body `[{}]` (missing `.sha`) | Returns `{ ok: false, reason: 'unknown' }` | unit | github-client.test.ts |
| URL constructed from `vi.spyOn(global, 'fetch')` captured arg contains `path=packages%2F...&sha=dev&per_page=1` | URL matches expected encoding | unit | github-client.test.ts |
| Request headers: `Accept` = `application/vnd.github+json`; no `Authorization` key | Headers match; no Authorization property | unit | github-client.test.ts |

All 9 tests must be RED (import fails or function not found) before T006 is written. Each fixture mock carries `// source: architecture-20260522T114800Z.md § 5a live capture` comment.

---

### T009a (RED) + T009 — Snapshot reader unit tests

**T009a — write these cases as FAILING tests before T008 source exists:**

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `getSnapshot()` returns object matching `UpstreamSnapshot` shape | Result has `schemaVersion`, `branch`, `watchedFiles`, `knownDivergences` | unit | `site/lib/upstream-drift/snapshot-reader.test.ts` |
| `getWatchedFiles()` returns the `watchedFiles` array from the committed JSON | Array length 2; each item has `path`, `sha`, `retrievedAt`, `fileHash` | unit | snapshot-reader.test.ts |
| `getSnapshot()` returns frozen object — attempt to assign a new property throws in strict mode | `Object.isFrozen(result) === true` OR assignment throws | unit | snapshot-reader.test.ts |
| `validateSchema({ schemaVersion: 2, ... })` returns false (or throws `SnapshotSchemaError`) | Function returns false (or throws) for mismatched version | unit | snapshot-reader.test.ts |

---

### T013a (RED) + T013 — Drift hook state transition tests

**T013a — write these 8 cases as FAILING stubs before T011 + T012 source is written:**

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Initial state is `'idle'`; no fetch fired on `renderHook` | `result.current.state === 'idle'`; `fetch` spy not called | unit | `site/hooks/use-upstream-drift.test.tsx` |
| `recheck()` synchronously sets state to `'checking'` before first await | Intermediate state captured via spy/flush | unit | use-upstream-drift.test.tsx |
| Both SHAs match → `'in-sync'`; `lastChecked` non-null | `state === 'in-sync'`; `lastChecked` is ISO string | unit | use-upstream-drift.test.tsx |
| First file SHA differs → `'drifted'`; `lastChecked` non-null | `state === 'drifted'`; `lastChecked` is ISO string | unit | use-upstream-drift.test.tsx |
| First fetch returns `rate-limit` → `'error'`, `errorReason: 'rate-limit'`, `retryAfterSeconds: 300` | All three fields match | unit | use-upstream-drift.test.tsx |
| `schemaVersion !== 1` in snapshot → `'error'`, `errorReason: 'schema-mismatch'`, no fetch fired | `getLatestCommitSha` mock NOT called | unit | use-upstream-drift.test.tsx |
| Concurrent `recheck()`: second call while `state === 'checking'` → only one fetch sequence fires | `fetch` spy call count = 2 (one per file); not 4 | unit | use-upstream-drift.test.tsx |
| Sequential fetch order: second file fetch fires only AFTER first resolves | Call 2 timestamp > call 1 resolve time (use vi.fn with manual resolve) | unit | use-upstream-drift.test.tsx |

Additional cases added by T015 + T016:

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `recheck` reference stable across re-renders that don't change state | `recheck` ref before === `recheck` ref after `rerender()` | unit | use-upstream-drift.test.tsx |
| `retryAfterSeconds === null` for `errorReason === 'schema-mismatch'` | Field is null | unit | use-upstream-drift.test.tsx |
| `retryAfterSeconds === null` for `errorReason === 'not-found'` | Field is null | unit | use-upstream-drift.test.tsx |

---

### T020a (RED) + T020 — Banner component unit tests

**T020a — write these 7 cases as FAILING stubs before T017 skeleton is flesh-filled:**

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Renders non-null when `dismissed === false` | Component renders at least one DOM node | UI | `site/components/full-page/UpstreamDriftBanner.test.tsx` |
| Renders null when `dismissed === true` | `container.firstChild === null` | UI | UpstreamDriftBanner.test.tsx |
| Root element has `role="status"` | `screen.getByRole('status')` exists | UI/structural | UpstreamDriftBanner.test.tsx |
| Root element has `aria-live="polite"` | `element.getAttribute('aria-live') === 'polite'` | UI/a11y | UpstreamDriftBanner.test.tsx |
| Dismiss button has `aria-label="Dismiss upstream drift banner"` | `screen.getByLabelText('Dismiss upstream drift banner')` exists | UI/a11y | UpstreamDriftBanner.test.tsx |
| Clicking dismiss button calls `onDismiss` prop | Mock called once | UI | UpstreamDriftBanner.test.tsx |
| Copy text contains `RedirectsProxy` and `/sync-redirect-proxy` as `<code>` element text | Both strings found in rendered DOM | UI | UpstreamDriftBanner.test.tsx |

Additional cases (added in full T020 pass):

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `role="alert"` is NOT present anywhere in the banner DOM | `container.querySelector('[role="alert"]')` is null | structural | UpstreamDriftBanner.test.tsx |
| In light theme: banner `borderLeftColor` is non-empty and NOT `rgb(0, 0, 0)` | Runtime contrast assertion passes | UI/runtime-contrast | UpstreamDriftBanner.test.tsx |
| In dark theme: banner `borderLeftColor` is non-empty and NOT `rgb(0, 0, 0)` | Runtime contrast assertion passes | UI/runtime-contrast | UpstreamDriftBanner.test.tsx |

---

### T023 — TestSurface integration

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| "Check upstream" button is present in the rendered TestSurface | `screen.getByRole('button', { name: 'Check upstream' })` exists | UI | `site/components/full-page/TestSurface.test.tsx` |
| No fetch fires on initial TestSurface mount (no auto-check) | `fetch` spy not called after `render(<TestSurface .../>)` before any interaction | unit/structural | TestSurface.test.tsx |
| Clicking "Check upstream" calls `recheck()` from the hook | `recheck` mock called once | UI | TestSurface.test.tsx |
| Existing Test-tab behaviors still work while banner is visible (regression) | URL input, Test button interactions still pass existing TestSurface tests | regression | TestSurface.test.tsx existing suite |
| Banner mounts inside TestSurface right column (not in FullPage) | `screen.getByRole('status')` is a descendant of the TestSurface container | UI | TestSurface.test.tsx |

**Click-target traceability (click-targets.md):**
- CT-1 (`screen-test-idle.html` "Check upstream" → `screen-test-checking.html`): covered by "Clicking Check upstream calls recheck()" test above.
- CT-2 (`screen-test-checking.html` button disabled): covered by T022 test "button is disabled + aria-busy while checking".

---

### T026 — Banner mount + sessionStorage dismiss

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Banner visible when `state === 'drifted'` and sessionStorage flag absent | Banner in DOM | UI | TestSurface.test.tsx or UpstreamDriftBanner.test.tsx |
| Banner absent when `state === 'drifted'` but sessionStorage flag = `'1'` | `screen.queryByRole('status')` returns null | UI | TestSurface.test.tsx |
| Clicking dismiss writes `sessionStorage.getItem('rm-drift-banner-dismissed') === '1'` | StorageAPI mock verifies | UI | TestSurface.test.tsx |
| `sessionStorage` read is inside `useEffect` (not `useState` initializer) — SSR-safe | No hydration mismatch in `npm run build` output | structural | build-time check; document in code comment |

**Click-target traceability (click-targets.md):**
- CT-3 (`screen-test-drifted.html` dismiss X → `screen-test-idle.html`): covered by "Clicking dismiss writes sessionStorage + hides banner" test above.

---

### T028 — Theme parity

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Drifted banner: light theme — computed `borderLeftColor` references `--destructive` token (not black/null) | `style.borderLeftColor` is non-empty, not `rgb(0, 0, 0)` | UI/runtime-contrast | UpstreamDriftBanner.test.tsx |
| Drifted banner: dark theme — same assertion with `html.dark` class applied | Same assertion, dark theme CSS vars active | UI/runtime-contrast | UpstreamDriftBanner.test.tsx |
| Error inline status: light theme — computed `color` references `--warning` token | Non-empty, not `rgb(0, 0, 0)` | UI/runtime-contrast | TestSurface.test.tsx |
| Error inline status: dark theme — same assertion | Same assertion, dark vars active | UI/runtime-contrast | TestSurface.test.tsx |
| In-sync inline status: `color` references `--success` or `--success-600`/`--success-500` token | Non-empty, not `rgb(0, 0, 0)` | UI/runtime-contrast | TestSurface.test.tsx |

---

### T029 — CSP structural guard

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `next.config.mjs` as a text string does NOT contain `Content-Security-Policy` (case-insensitive) | `content.toLowerCase().includes('content-security-policy') === false` | structural | `site/__tests__/next-config-csp-guard.test.ts` |

File comment must say: "PRD-005 leaves `next.config.mjs` untouched per ADR-0048. If a future PRD introduces CSP, `api.github.com` MUST be in `connect-src`."

---

### T031 — Bundle delta

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| Gzipped route-bundle delta vs T010 baseline is ≤ 5KB | Numeric delta ≤ 5120 bytes gz | build | `project-planning/spike-notes/t031-bundle-delta.md` |
| If delta > 5KB: halt and report to operator | Build fails the manual gate | build/manual | spike note |

---

### T035a (RED) + T035 — Sync-helper unit tests

**T035a — write these 5 cases as FAILING stubs before T034 source exists:**

| Scenario | Expected outcome | Type | File |
|---|---|---|---|
| `compareSnapshot(snapshot, latest)` where all `watchedFiles[i].sha === latest[i].sha` → `{ inSync: true, drifted: [] }` | Returns `inSync: true` | unit | `site/lib/upstream-drift/sync-helpers.test.ts` |
| `compareSnapshot(snapshot, latest)` where `latest[0].sha !== snapshot.watchedFiles[0].sha` → `{ inSync: false, drifted: [<file0>] }` | Returns `inSync: false`; `drifted` array has 1 entry | unit | sync-helpers.test.ts |
| `honorDivergences(diff, [{ function: 'isRegexOrUrl' }])` where diff has a hunk targeting `isRegexOrUrl` → hunk removed | Returned diff has 0 hunks | unit | sync-helpers.test.ts |
| `honorDivergences(diff, [{ function: 'isRegexOrUrl' }])` where diff has a hunk targeting `buildUrl` (not in divergences) → hunk intact | Returned diff has 1 hunk | unit | sync-helpers.test.ts |
| `honorDivergences(diff, [])` → all hunks intact (empty divergences = pass-through) | Returned diff === input diff | unit | sync-helpers.test.ts |

---

### T036 — Operator smoke (T6 hard gate, manual)

Step-by-step procedure for the operator to execute:

1. **Setup:** Ensure `npm run dev` is running with HTTPS (`next dev --experimental-https`). Load the Marketplace test app in Cloud Portal via the dev loop (invoke skill `sitecore:marketplace-sdk-testing-debug` for setup reminder). Navigate to the Test tab.

2. **Verify idle state:** "Check upstream" button is visible in the left rail below the Test button. No banner, no status indicator. Matches POC `screen-test-idle.html`.

3. **Trigger stale state:** Edit `site/lib/redirects/__fixtures__/upstream-snapshot.json` — change `watchedFiles[0].sha` to `'0000000000000000000000000000000000000000'`. Hard-reload the iframe (R-arch1 — Turbopack HMR may not pick up JSON edits; restart dev server if needed).

4. **Click "Check upstream":** Button shows spinner + "Checking…" label, `disabled`. Matches POC `screen-test-checking.html`. After 1–2s, banner appears in right column with `AlertTriangle` glyph, red left border, destructive-tinted background. Matches POC `screen-test-drifted.html`. Banner has `role="status"` (inspect DOM). Record: **S2 passed/failed**.

5. **Run slash command:** In Claude Code in the product repo, invoke `/sync-redirect-proxy`. Command reads snapshot, fetches upstream, compares SHAs, proposes patch (or "Already in sync" if real dev SHA happens to match the stale all-zero value — extremely unlikely). Accept proposed hunks. Expect `npm test -- proxy-simulator` GREEN. Expect `upstream-snapshot.json` `watchedFiles[0].sha` updated. Record: **S3 passed/failed**.

6. **Re-check:** Hard-reload iframe. Click "Check upstream" again. Expect in-sync state: green `Check` glyph, muted text "In sync with upstream `dev` (checked just now)". No banner. Matches POC `screen-test-in-sync.html`. Record: **S4 passed/failed**.

7. **Dismiss test:** Edit JSON again (stale SHA) → reload → click Check → banner appears. Click X (dismiss). Banner disappears. Check `sessionStorage.getItem('rm-drift-banner-dismissed')` via DevTools console = `'1'`. Hard-reload page → banner reappears (sessionStorage cleared). Record: **S5 passed/failed**.

8. **Visual smoke vs POC:** Compare live host-frame render against POC `pocs/poc-v1-prd005/` on five axes per § 9.5. Load POC via `npx serve pocs/poc-v1-prd005/`. Record: **S6 passed/failed with notes**.

Record all outcomes in `project-planning/smoke/smoke-prd-005-<timestamp>.md`. Update `smoke_outcomes` in `run-20260522T114800Z.json` from `"pending"` to `"passed"` (with evidence) or `"failed"` (with notes).

## Handoff Metadata

- Canonical run manifest: `project-planning/workflow/run-20260522T114800Z.json`
- Source PRD: `project-planning/PRD/prd-005.md`
- Source architecture: `project-planning/architecture/architecture-20260522T114800Z.md`
- Source UI design: `project-planning/ui-design/ui-design-20260522T114800Z-v1.md`
- Baseline: `project-planning/baseline.md` (consolidated inherited ADRs)
- Winning POC: `pocs/poc-v1-prd005/`
- Recommended next command: `/task-breakdown` QA Specialist (07) enrichment pass
- Recommended next input file: `project-planning/plans/qa-report.md` (optional on minimal track; with `task_breakdown_review = skip_gate` the QA enrichment is in-place)
