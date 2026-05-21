# Development Execution Plan — Redirect Manager PRD-001 (Multilingual CRUD)

---
document_type: task_breakdown
artifact_name: task-breakdown-20260513T092023Z.md
generated_at: 2026-05-13T09:20:23Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260513T092023Z.json
source_inputs:
  - products/redirect-manager/project-planning/PRD/prd-001.md
  - products/redirect-manager/project-planning/PRD/prd-minimal-001.md (Developer 08 orientation only)
  - products/redirect-manager/project-planning/architecture/architecture-20260513T092023Z.md
  - products/redirect-manager/project-planning/ADR/ (ADRs 0014..0022 plus carry-over from PRD-000)
  - products/redirect-manager/project-planning/ui-design/ui-design-20260513T092023Z-v1.md (selected variant)
  - products/redirect-manager/pocs/poc-v1-prd001/ (winning clickdummy — visual source of truth)
  - products/redirect-manager/site/* (existing PRD-000 codebase — extension baseline)
  - node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts
  - node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts
  - node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts
consumed_by:
  - QA Specialist (07) enriches this file in place
  - Developer (08) implements from this file + prd-minimal-001.md only
next_input:
  - products/redirect-manager/project-planning/plans/task-breakdown-20260513T092023Z.md (post-QA — same path)
---

## 1. Implementation Overview

### Feature scope

PRD-001 layers **multilingual CRUD** on top of the shipped PRD-000 Redirect Manager Marketplace app. This task breakdown covers **only PRD-001 deltas** — new SDK wrappers for language enumeration + version mutations, picker state + hook, new + modified UI components, schema v2 import/export, Pages-aware Context Panel banner, and the mandatory real-tenant capture pass that closes architecture OQ-A1..A5.

The change set is genuinely additive:

- **One new SDK call** — `xmc.sites.listLanguages` (tenant-wide fallback).
- **One property access** — `Sites.Site.languages` from already-fetched site object (no extra round trip).
- **Three new Authoring GraphQL operations** on the existing `xmc.authoring.graphql` surface — `addItemVersion`, `deleteItemVersion`, `versionsByLanguage` discovery.
- **One extended Authoring mutation** — `updateItem` adds `__Display name` field-array entry + language parameter swap.
- **One new pure module** — `lib/picker/language-picker-state.ts` + React hook.
- **One JSON schema break** — `redirect-manager/v1` → `redirect-manager/v2`, no back-compat (ADR-0015).
- **One Pages-context promotion** — read `pageInfo.language` (already subscribed) for banner copy.

### Dependencies on PRD-000 baseline (carry-over)

Implementation extends the live PRD-000 app at `products/redirect-manager/site/`:

- **Marketplace Mode A scaffold** — no re-scaffold, no re-registration (ADR-0002, ADR-0011 unchanged).
- **`lib/sdk/*` boundary** — only allowed importer of `@sitecore-marketplace-sdk/*`. PRD-000 structural test continues to gate the build (`site/tests/structural/structural-guards.test.ts`).
- **DOUBLE `.data.data` unwrap + body INSIDE params** — verified PRD-000 contract for every `xmc.authoring.graphql` call. New wrappers follow this verbatim.
- **Blok primitives + Nova preset** — every new component composes from existing Blok primitives or installs missing ones via `npx shadcn add @blok/<name>`.
- **`UrlMapping` encoding contract** (ADR-0008) — copy-from path re-uses existing `lib/url-mapping/serialize.ts` + `lib/url-mapping/parse.ts`.
- **GUID minted server-side** (ADR-0009) — existing import "newly minted GUID" warning carries forward to v2 imports.
- **Vitest test stack** — co-located `*.test.tsx`/`*.test.ts` per PRD-000 convention. Structural guards in `site/tests/structural/`.

### What is new vs. what is modified

| Category | New | Modified |
|---|---|---|
| SDK wrappers | `lib/sdk/languages.ts`, `lib/sdk/redirects-version.ts` | `lib/sdk/redirects-read.ts`, `lib/sdk/redirects-write.ts` |
| State / hooks | `lib/picker/language-picker-state.ts`, `hooks/use-language-picker.ts` | — |
| Domain types | (extended fields) | `lib/domain/types.ts` (add `displayName?`, `versionsByLanguage?`) |
| Import/export | `lib/import-export/schema-v2.ts`, `lib/import-export/diff-v2.ts`, `lib/import-export/apply-v2.ts`, `lib/import-export/v1-detect.ts` | (replaces) `schema.ts`, `diff.ts`, `apply.ts`, `serialize.ts` |
| Components | `LanguagePicker`, `LanguageVersionIndicator` (dot), `CreateVersionModal`, `CopyFromSourceStep`, `DeleteScopeConfirmModal`, `DisplayNameEditor`, `PartialVersionBanner`, `PagesAwareBanner` | `FullPage`, `RedirectMapList`, `RedirectMapDetail`, `TopActionRow`, `ImportRedirectMapModal`, `DashboardWidget`, `ContextPanel`, `DeleteMapConfirmModal` (subsumed) |
| Tests | unit + UI tests per new module/component, version-flow state-machine tests, schema-v2 round-trip tests | structural-guard additions (picker key shape, strict-no-default delete, schema-v2 only) |
| Fixtures | `tests/fixtures/graphql/{add,delete}-item-version.json`, `field-versioning-matrix.json`, `display-name-write.json`, `versions-by-language.json`, `redirect-bundle-v2.json` | — |

### Critical pre-implementation gate

**Tranche 1 (Epic J) is a non-skippable real-tenant capture pass** closing architecture OQ-A1..A5. If the capture surprises (verb absent, field-matrix differs, `__Display name` write rejects literal name), the wrappers and downstream tasks adjust before Tranche 2 starts. Per PRD § 13 R-1 decision rule:

- `addItemVersion` absent / unworkable → cut US-6, US-7, US-11-create.
- `deleteItemVersion` absent / unworkable → cut US-8(a); delete modal copy adjusts.

No silent stub fallbacks anywhere.

---

## 2. Epics

PRD-001 work is grouped into **eleven epics**. Tranche 1 (Epic J) executes first because every downstream wrapper depends on the captured shapes.

| Epic | Title | Outcome |
|---|---|---|
| **A** | SDK layer | New + extended typed wrappers in `lib/sdk/*` with verified envelopes |
| **B** | Picker state + hook | Pure module + React hook + storage event sync |
| **C** | Map list + detail | Two-pane UI updated for language scope, dot indicator, two-state UX |
| **D** | Create-version flow | Modal + copy-from + rollback state machine + partial-version banner |
| **E** | Delete scope safety | Strict no-default scope modal extending PRD-000 delete |
| **F** | Display-name editing | Inline pencil-affordance editor + placeholder copy |
| **G** | Dashboard scoping | Strict current-language tiles + "Languages with content" tile |
| **H** | Context Panel banner | Pages-aware banner from `pageInfo.language` |
| **I** | Import/export schema v2 | Zod schema, v1 rejection, language-axis preview, per-map apply |
| **J** | Real-tenant capture pass | Closes architecture OQ-A1..A5 — mandatory Tranche 1 |
| **K** | Tests, structural guards, smoke prep | Wire up tests, extend guards, prep smoke checklist |

---

## 3. Feature Breakdown

| Feature | User stories | Epics involved | Tasks |
|---|---|---|---|
| Real-tenant capture pass (verbs, matrix, accessor) | n/a — prerequisite | J | T001 |
| Language enumeration (site-scoped + tenant-wide fallback) | US-1 | A | T002, T003 |
| Picker state + hook (`localStorage`, cross-surface, cross-tab) | US-1 | B | T004, T005, T006, T007 |
| Authoring read extensions (`$language`, `__Display name` alias, `versionsByLanguage`) | US-2, US-3, US-4 | A | T008, T009 |
| Authoring write extensions (`language` param + `__Display name`) | US-3, US-9 | A | T010 |
| Version mutations (`addItemVersion`, `deleteItemVersion`, rollback) | US-6, US-7, US-8 | A, D | T011, T012, T013 |
| LanguagePicker component | US-1 | C | T014, T015 |
| Map list + dot indicator + two-state UX | US-2, US-4, US-5 | C | T016, T017, T018 |
| Map detail + version-aware data fetching | US-4, US-5 | C | T019, T020 |
| Display-name inline editor | US-9 | F | T021, T022 |
| Create-version modal (two-path) + copy-from step 2 | US-6, US-7 | D | T023, T024, T025 |
| Partial-version banner (ADR-0021) | US-7 | D | T026 |
| Delete-scope confirm modal | US-8 | E | T027, T028 |
| Schema v2 — Zod + v1 reject pre-validator | US-10, US-11 | I | T029, T030 |
| Export serializer rewrite (multi-language bundle) | US-10 | I | T031 |
| Import diff v2 (language axis) + per-map apply v2 | US-11 | I | T032, T033 |
| Import wizard preview (language columns) | US-11 | I | T034 |
| Dashboard scoping (strict current + content tile) | US-12 | G | T035, T036 |
| Pages-aware banner + Context Panel wiring | US-13 | H | T037 |
| FullPage wiring (picker → list/detail/topbar) | US-1, US-3 | C | T038 |
| Domain types extension | (all) | A | T039 |
| Structural guards extension | n/a — quality | K | T040 |
| Documentation polish (decisions.md captures, in-code comments) | n/a — quality | K | T041 |
| Live walkthrough + smoke gate prep | m1–m5 | K | T042 |

---

## 4. Task Breakdown

Tasks are listed below in **roughly tranched order** (Tranche 1 first). The authoritative dependency edges live in each task's `Depends on` field; § 5 derives the topological execution order from those edges. Test tasks default to test-after (QA Specialist may reorder to test-first where TDD applies).

---

### EPIC J — Real-tenant capture pass (Tranche 1)

#### T001 — Real-tenant probe pass: closes OQ-A1..A5

- **Title:** Probe `addItemVersion`, `deleteItemVersion`, field-versioning matrix, `__Display name` accessor on real tenant
- **Description:** Run a guided probe against `CHAH DevEx Journey / PROD` (or operator-supplied multilingual tenant per PRD OQ-7) to close every honest-absence flagged in architecture § 10. Operator session, ~30 min.
  1. **OQ-A1 — `addItemVersion` input shape.** Issue a minimal probe mutation `mutation AddItemVersion($input: AddItemVersionInput!) { addItemVersion(input: $input) { item { itemId language { name } version } } }` against an existing Redirect Map item, attempting variable shapes in order: `{ itemId, language }`, then `{ itemId, language, version }` (clone-from-source), then `{ path, language }`. Capture the request body, variables, and full GraphQL response (success or error) for each attempt.
  2. **OQ-A2 — `deleteItemVersion` input shape.** Same approach for `mutation DeleteItemVersion($input: DeleteItemVersionInput!) { deleteItemVersion(input: $input) { successful } }`. Attempt `{ itemId, language }` then `{ itemId, language, version }`. Confirm the latest-language-version semantics.
  3. **OQ-A3 — `__Display name` write accessor.** Issue `mutation { updateItem(input: { itemId: "…", language: "en", fields: [{ name: "__Display name", value: "probe-display-name" }] }) { item { itemId } } }`. If rejected, run `itemTemplate(where: { templateId })` introspection to obtain the templateFieldId GUID for `__Display name` and retry with `{ name: "<GUID>", value: "…" }`. Record which form is accepted.
  4. **OQ-A4 — Field-versioning matrix.** Run `query FieldVersioning($templateId: ID!) { itemTemplate(where: { templateId: $templateId }) { name fields { nodes { name versioning } } } }` against the Redirect Map template. Capture the `versioning` value (`VERSIONED` / `UNVERSIONED` / `SHARED`) for `UrlMapping`, `RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage`, `__Display name`. Compare against architecture § 4.3 assumed matrix.
  5. **OQ-A5 — `versionsByLanguage` cost.** Run `query { item(where: { itemId: "…" }) { versions(allLanguages: true) { language { name } version fields(excludeStandardFields: false, ownFields: false, withLanguageFallback: false) { nodes { name value } } } } }` on a map with ≥3 language versions. Measure round-trip duration. If >2s, design a lighter "summary" query and capture both shapes.
  6. **Per PRD § 13 R-1 decision rule:** if `addItemVersion` absent / unworkable after one retry pass, halt and notify operator. If `deleteItemVersion` absent, continue Tranche 2..8 but flag delete-version-only as cut (US-8(a) reduces to whole-item delete only; modal copy adjusts per AC-8.4 hard-fail variant).
- **Expected Output:**
  - `site/tests/fixtures/graphql/add-item-version.json` — captured request + response for the winning variable shape.
  - `site/tests/fixtures/graphql/delete-item-version.json` — same.
  - `site/tests/fixtures/graphql/display-name-write.json` — captured `updateItem` with `__Display name` (literal name OR templateFieldId variant).
  - `site/tests/fixtures/graphql/field-versioning-matrix.json` — captured `itemTemplate.fields.nodes[].{name, versioning}` for the Redirect Map template.
  - `site/tests/fixtures/graphql/versions-by-language.json` — captured `item.versions(allLanguages: true)` response.
  - `products/redirect-manager/docs/decisions.md` — appended section "A-Mutation-Shapes (PRD-001 Tranche 1 capture, 2026-05-13)" listing: verb names confirmed, accepted argument shapes, deviations from assumed matrix, accessor variant chosen for `__Display name`, decision on `versionsByLanguage` cost.
  - Architecture § 4.3 amended in place if matrix surprises; ADR-0015 § "Shared vs versioned field placement" amended in place if any field's `versioning` differs from assumed matrix.
- **Depends on:** none

---

### EPIC A — SDK layer

#### T002 — `lib/sdk/languages.ts` — language enumeration wrapper

- **Title:** Site-scoped + tenant-wide language enumeration
- **Description:** Create `site/lib/sdk/languages.ts` with two exports:
  - `getSiteLanguages(site: Sites.Site): string[]` — synchronous property accessor reading `site.languages ?? []` (the `Array<string> | null` field on `Sites.Site`). No SDK call.
  - `async listTenantLanguages(client: ClientSDK, sitecoreContextId: string): Promise<Sites.Language[]>` — calls `client.query('xmc.sites.listLanguages', { params: { query: { sitecoreContextId } } })` and DOUBLE-unwraps `.data.data` (matches `sites.ts:39` pattern). Returns the full `Sites.Language[]` so callers can render `iso + nativeName + displayName`. Pulls types from `@sitecore-marketplace-sdk/xmc` (`Sites.Site`, `Sites.Language`). Per ADR-0020: site-scoped is preferred; tenant-wide is fallback. Add the same JSDoc-style preamble used by other `lib/sdk/*` files citing the `.d.ts` paths.
- **Expected Output:** `site/lib/sdk/languages.ts` exporting both functions with `Sites.Language` typed; matches PRD-000 boundary rule (no other importer of `@sitecore-marketplace-sdk/*`).
- **Depends on:** T001
- **TDD gate (RED first):** Write `site/tests/unit/sdk/languages.test.ts` with failing assertions for `getSiteLanguages` and `listTenantLanguages` BEFORE implementing `languages.ts`. Implementation starts only after failing tests exist.

#### T003 — `resolveEnumeratedLanguages` selector helper

- **Title:** Compose site-scoped + tenant-wide fallback into a single resolved list
- **Description:** In `site/lib/sdk/languages.ts`, add `async resolveEnumeratedLanguages(client, sitecoreContextId, site)` that returns `{ languages: Sites.Language[]; fallbackMode: boolean }`. Algorithm:
  1. If `site.languages` is non-null and non-empty, look up each ISO in a cached `listTenantLanguages` response (lazy single fetch — memoize by `sitecoreContextId` for the session) to enrich with `displayName` / `nativeName`. Return `{ languages: <filtered>, fallbackMode: false }`. If enrichment fails for a code, fall back to `{ iso: <code>, displayName: <code>, nativeName: <code> }`.
  2. If `site.languages` is null OR empty, fetch tenant-wide via `listTenantLanguages` and return `{ languages: <full>, fallbackMode: true }`.
- **Expected Output:** `resolveEnumeratedLanguages` exported from `site/lib/sdk/languages.ts`. Caller (`use-language-picker`) reads `{ languages, fallbackMode }`.
- **Depends on:** T002
- **TDD gate (RED first):** Extend failing tests in `languages.test.ts` with `resolveEnumeratedLanguages` scenarios (fallback + enrichment) before implementing. Reuse the same test file — do not start the implementation until the new test cases are failing for the right reason.

#### T008 — Extend `lib/sdk/redirects-read.ts` — language variable + `__Display name` alias + versionsByLanguage

- **Title:** Parametric language + aliased display-name accessor on list read
- **Description:** Modify `site/lib/sdk/redirects-read.ts` in place:
  1. Replace the literal `language: "en"` in `GET_REDIRECTS_FOR_SITE` with `$language: String!` GraphQL variable. Add `Display_Name: field(name: "__Display name") { value }` to the child-node selection (alias because `__Display name` is invalid as a GraphQL alias). Update `WireItem` to add `Display_Name?: WireFieldValue`.
  2. Update `decodeWireItem` to extract `wire.Display_Name?.value` (treat empty string / null both as "no display name in this language") and return `displayName` on the domain item.
  3. Update `listRedirectsForSite(client, sitecoreContextId, sitePath, language)` signature to accept `language: string`. Existing callers pass `'en'` until they migrate to picker state in T038.
  4. Add a new exported `listVersionsByLanguage(client, sitecoreContextId, itemId)` function issuing the `item(where: { itemId: $itemId }) { versions(allLanguages: true) { language { name } version fields(...) { nodes { name value } } } }` query per architecture § 5.4. Returns `{ versionsByLanguage: string[]; nonEmptyVersionsByLanguage: string[] }` (the second derived by parsing each version's `UrlMapping` field value and checking non-emptiness).
  5. Comment with the `.d.ts` path for `Authoring.GraphqlData` / `Authoring.GraphqlResponse` and the verified `versions(allLanguages: Boolean!): [Item!]!` shape from the schema skill.
- **Expected Output:** `redirects-read.ts` updated; existing tests at `site/tests/unit/sdk/redirects-read.test.ts` still pass; new export `listVersionsByLanguage` ready for callers.
- **Depends on:** T001, T039
- **TDD gate (RED first):** Extend `site/tests/unit/sdk/redirects-read.test.ts` with failing assertions for `$language` variable, `Display_Name` alias, and `listVersionsByLanguage` BEFORE modifying `redirects-read.ts`. Use the `versions-by-language.json` fixture (or `// assumed-shape` stub until T001 lands).

#### T009 — Wire-decoder defensive heuristic update for `Display_Name`

- **Title:** Treat empty `Display_Name` as "no display name in current language"
- **Description:** In `decodeWireItem` (T008), add logic so an item with empty `Display_Name.value` returns `displayName: ''` (empty string, not `undefined`). The list-row render layer (T016) uses fallback chain `displayName || itemName` per FR-10. Ensure the existing `NON_REDIRECT_MAP_TEMPLATES` filter is untouched. Add unit-test cases for: empty string, null, missing field entirely.
- **Expected Output:** `decodeWireItem` updated; no behavior change for previously valid items.
- **Depends on:** T008

#### T010 — Extend `lib/sdk/redirects-write.ts` — language param + `__Display name` field

- **Title:** Replace `'en'` literal with parameter; add `__Display name` to `buildFieldsArray`
- **Description:** Modify `site/lib/sdk/redirects-write.ts` in place:
  1. Extend `CreateRedirectMapInput`, `UpdateRedirectMapInput` with optional `displayName?: string` field (when `undefined`, the field is NOT pushed onto `buildFieldsArray`).
  2. Extend `createRedirectMap` and `updateRedirectMap` signatures to accept `language: string` argument (replaces hardcoded `'en'`). Default-arg semantics: if a caller passes `undefined`, fall back to `'en'` for backward-compat with PRD-000 callers (audited at T038).
  3. Update `buildFieldsArray` to conditionally push `{ name: '__Display name', value: attrs.displayName }` when `attrs.displayName !== undefined`. **The field-name literal `__Display name` is per T001 capture — if T001 revealed templateFieldId-only path, swap to the captured GUID and update the JSDoc accordingly.**
  4. Add a per-tenant memoization helper (module-scope `Map<sitecoreContextId, string>`) for the templateFieldId fallback path so we don't repeat the introspection query.
- **Expected Output:** `redirects-write.ts` updated; existing tests continue to pass with `language: 'en'` default; new `displayName` round-trip covered by new tests in T010-test (rolled into K).
- **Depends on:** T001, T039
- **TDD gate (RED first):** Extend `site/tests/unit/sdk/redirects-write.test.ts` with failing assertions for `displayName` conditional push and `language` parameter threading BEFORE modifying `redirects-write.ts`.

#### T011 — `lib/sdk/redirects-version.ts` — `addRedirectMapVersion`

- **Title:** Typed wrapper for `addItemVersion` Authoring mutation
- **Description:** Create `site/lib/sdk/redirects-version.ts`. Exports:
  - `async addRedirectMapVersion(client, sitecoreContextId, { itemId, language, sourceVersion? }): Promise<{ ok: boolean; version?: number; error?: string }>`. Uses `client.mutate('xmc.authoring.graphql', { params: { query: { sitecoreContextId }, body: { query: ADD_REDIRECT_MAP_VERSION, variables: { input: { itemId, language, ...(sourceVersion !== undefined ? { version: sourceVersion } : {}) } } } } })`. DOUBLE `.data.data` unwrap. Returns `{ ok: true, version: data.addItemVersion.item.version }` on success; on GraphQL error, captures the verbatim error message + extensions and returns `{ ok: false, error: <message> }`. **If T001 capture revealed the `version` source arg is required (not optional), update the input shape inline and remove the `sourceVersion?` ternary — pass it unconditionally.**
  - Mutation body: `mutation AddRedirectMapVersion($input: AddItemVersionInput!) { addItemVersion(input: $input) { item { itemId language { name } version } } }` (verbatim per architecture § 5.2; final input field names align with T001 capture).
- **Expected Output:** `redirects-version.ts` with `addRedirectMapVersion` exported. Cite `Authoring.GraphqlData` / `Authoring.GraphqlResponse` `.d.ts` paths in the file header per rule `40-sdk-contracts`.
- **Depends on:** T001, T039
- **TDD gate (RED first):** Create `site/tests/unit/sdk/redirects-version.test.ts` with failing assertions for `addRedirectMapVersion` (happy path + GraphQL error + envelope contract) BEFORE creating `redirects-version.ts`. Mark all fixtures that use `addItemVersion` body shape as `// assumed-shape pending T001 capture OQ-A1`.

#### T012 — `lib/sdk/redirects-version.ts` — `deleteRedirectMapVersion`

- **Title:** Typed wrapper for `deleteItemVersion` Authoring mutation
- **Description:** In the same file as T011, add `async deleteRedirectMapVersion(client, sitecoreContextId, { itemId, language }): Promise<{ ok: boolean; error?: string }>`. Mutation body `mutation DeleteRedirectMapVersion($input: DeleteItemVersionInput!) { deleteItemVersion(input: $input) { successful } }`. Returns `{ ok: data?.deleteItemVersion?.successful === true }`. **Per PRD § 13 R-1: if T001 capture revealed `deleteItemVersion` is absent or unworkable, this wrapper throws a hard-coded "deleteItemVersion is not available on this tenant — version-scope delete is cut from PRD-001 per R-1" error AND `redirects-version.ts` exports a `DELETE_VERSION_AVAILABLE: boolean` constant flagged `false`.** Consumers (T013, T027) read the constant and branch — no silent fallback.
- **Expected Output:** `redirects-version.ts` extended; `DELETE_VERSION_AVAILABLE` constant exported.
- **Depends on:** T001, T011
- **TDD gate (RED first):** Extend `redirects-version.test.ts` with failing assertions for `deleteRedirectMapVersion` (happy + false-successful + hard-fail constant) and the `DELETE_VERSION_AVAILABLE` export BEFORE implementing the function.

#### T013 — `lib/sdk/redirects-version.ts` — `copyFromAnotherLanguage` rollback state machine

- **Title:** Implement ADR-0021 state machine for copy-from create flow
- **Description:** In `redirects-version.ts`, add `async copyFromAnotherLanguage(client, sitecoreContextId, { itemId, targetLanguage, sourceLanguage, sourceMappings }): Promise<CopyFromResult>` where:
  ```typescript
  type CopyFromResult =
    | { state: "populated"; newVersion: number }
    | { state: "version-create-failed"; reason: string }
    | { state: "rolled-back"; reason: string }
    | { state: "partial-version-detected"; reason: string; rollbackReason: string };
  ```
  Algorithm verbatim per ADR-0021:
  1. Call `addRedirectMapVersion(itemId, targetLanguage)`. If `!ok` → return `state: "version-create-failed"`.
  2. Call `updateRedirectMap(client, sitecoreContextId, { itemId, language: targetLanguage, mappings: sourceMappings, /* other attrs read from source */ })`. If `ok` → return `state: "populated", newVersion`.
  3. If updateItem failed → call `deleteRedirectMapVersion(itemId, targetLanguage)`. If `ok` → return `state: "rolled-back", reason`. Else → return `state: "partial-version-detected", reason, rollbackReason`.
  - **Degraded mode when `DELETE_VERSION_AVAILABLE === false`:** skip step 3 entirely; on update failure, return a new discriminant `state: "populate-failed-no-rollback"` so the UI can show the degraded-UX toast per ADR-0021 § "Hard prerequisite".
- **Expected Output:** `copyFromAnotherLanguage` exported with discriminated-union return type. Each `state` is exercised by tests (T-K-tests).
- **Depends on:** T010, T011, T012
- **TDD gate (RED first):** Extend `redirects-version.test.ts` with all FIVE `CopyFromResult.state` discriminant test cases (one per outcome path) BEFORE implementing `copyFromAnotherLanguage`. Each test case uses a different stub combination. The state machine is the highest-risk code path in PRD-001 — RED test coverage of all 5 paths is mandatory, not optional.

#### T039 — Extend `lib/domain/types.ts`

- **Title:** Add `displayName?` and `versionsByLanguage?` to domain types
- **Description:** Modify `site/lib/domain/types.ts` in place per architecture § 4.2. Add `displayName?: string` (empty string when no display name in current language) and `versionsByLanguage?: string[]` (undefined on list-view, populated on detail-view) to `RedirectMapItem`. Add `displayName?: string` to `RedirectMapAttributes`. Update the JSDoc above each new field naming the source: PRD-001 architecture § 4.2.
- **Expected Output:** `types.ts` updated; downstream tasks (T008, T010, T016, T021) consume new fields.
- **Depends on:** none

---

### EPIC B — Picker state + hook

#### T004 — `lib/picker/language-picker-state.ts` — pure storage helpers

- **Title:** Read/write/migrate the `localStorage` picker state (ADR-0017 + ADR-0022)
- **Description:** Create `site/lib/picker/language-picker-state.ts` exporting:
  - `getPickerState(tenantId: string, siteId: string): PickerState | null` — reads `localStorage[`redirect-manager.language.${tenantId}.${siteId}`]`, JSON.parses, validates against a Zod schema (require `tenantId`, `siteId`, `language: string`, `lastUsedAt: string`). Returns `null` on absent/invalid.
  - `setPickerState(tenantId: string, siteId: string, language: string): void` — writes the key with current ISO timestamp.
  - `resolveDefaultLanguage({ persisted, siteDefault, enumerated }: { persisted: string | null; siteDefault: string | null; enumerated: string[] }): string` — implements ADR-0017 default-resolution chain (persisted → siteDefault → `en` → enumerated[0]). Returns the first valid choice that's also in `enumerated`.
  - `validateAgainstEnumerated(persisted: PickerState | null, enumerated: string[]): { language: string | null; staleWarning: string | null }` — invalid-state recovery per ADR-0017 (returns `staleWarning` message string when a persisted language is no longer enumerated; toast caller uses it).
  - **PRD-001 schema v1 contract** per ADR-0022: key shape is `redirect-manager.language.<tenantId>.<siteId>` (no `.v1.` segment in v1; future versions use `.v2.`).
  - Pure module — no React, no SDK imports. Guarded against SSR by checking `typeof window === 'undefined'` and returning `null` from `getPickerState` accordingly. **Per memory `feedback_hydration_mismatch_pattern`: do NOT branch on `typeof window` in render-time code; the picker hook (T005) reads via `useEffect`.**
- **Expected Output:** `site/lib/picker/language-picker-state.ts` exporting `getPickerState`, `setPickerState`, `resolveDefaultLanguage`, `validateAgainstEnumerated`, type `PickerState`.
- **Depends on:** none
- **TDD gate (RED first):** Create `site/tests/unit/picker/language-picker-state.test.ts` with failing assertions covering all 6 scenarios in § 10 T004 BEFORE creating `language-picker-state.ts`. Pay special attention to the SSR guard scenario (window-undefined shim) and the AC-1.2 edge case (`en` not in enumerated set).

#### T005 — `hooks/use-language-picker.ts` — React hook

- **Title:** React hook wrapping the picker state module
- **Description:** Create `site/hooks/use-language-picker.ts` (new directory). Hook signature: `useLanguagePicker({ tenantId, siteId, enumerated, siteDefault }): { language: string; setLanguage: (iso: string) => void; staleWarning: string | null; isReady: boolean }`. Lifecycle:
  1. On mount, in `useEffect`, call `getPickerState(tenantId, siteId)` + `validateAgainstEnumerated(...)` + `resolveDefaultLanguage(...)` → set `language` state. Mark `isReady=true` (avoids hydration mismatch — initial render returns `language: ''`/empty until effect runs).
  2. `setLanguage(iso)` updates state + calls `setPickerState(tenantId, siteId, iso)`.
  3. Subscribe to `window.addEventListener('storage', handler)` — on `storage` event with key matching this hook's key, re-read state. Cleanup on unmount.
  4. Emit `staleWarning` for one render cycle, then clear (caller renders a one-shot toast).
- **Expected Output:** `site/hooks/use-language-picker.ts` with the hook above; first file in `hooks/`. Unit-testable via Vitest + jsdom.
- **Depends on:** T004
- **TDD gate (RED first):** Create `site/tests/ui/hooks/use-language-picker.test.tsx` with all 5 failing test scenarios (§ 10 T005) BEFORE creating the hook. The "initial render returns `language: ''`" assertion is specifically important — it verifies no hydration mismatch (memory `feedback_hydration_mismatch_pattern`).

#### T006 — `hooks/use-dirty-edits.ts` — track unsaved field edits

- **Title:** Hook for AC-3.5 dirty-edit detection (picker disable)
- **Description:** Create `site/hooks/use-dirty-edits.ts`. Hook signature: `useDirtyEdits(): { dirty: boolean; markDirty: () => void; markClean: () => void }`. The map-detail components call `markDirty()` on any field edit and `markClean()` after save/discard. The LanguagePicker reads `dirty` to render the disabled state with tooltip *"Save or discard your changes before switching languages."* Pure module — no SDK.
- **Expected Output:** `site/hooks/use-dirty-edits.ts`; consumed by T014 + T019/T020.
- **Depends on:** none
- **TDD gate (RED first):** Create `site/tests/unit/hooks/use-dirty-edits.test.ts` with failing assertions BEFORE creating the hook. Document the chosen boolean vs ref-counted semantic in the first test case — the test specifies the behavior.

#### T007 — Cross-tab `storage` event integration check

- **Title:** Verify cross-tab last-write-wins propagation works in dev
- **Description:** Open Full Page in two browser tabs against the live PRD-000 install (after T038 lands); switch language in Tab A; confirm Tab B's picker label updates after the next re-render (no manual refresh required). Document the verification step in `docs/decisions.md` (one paragraph noting "ADR-0017 cross-tab behavior verified on YYYY-MM-DD: storage event propagated within X ms"). No code changes — this is the operator validation step that the structural test (T040) cannot cover.
- **Expected Output:** Verification entry in `docs/decisions.md`.
- **Depends on:** T005, T038

---

### EPIC C — Map list + detail + version-aware data fetching

#### T014 — `components/full-page/LanguagePicker.tsx` — focal-point picker

- **Title:** Topbar language picker component
- **Description:** Create `site/components/full-page/LanguagePicker.tsx`. Composes `@blok/dropdown-menu` (Radix) + `@blok/badge` per UI spec § 4.1. Props per UI spec § 4.1 verbatim (`language`, `languages`, `fallbackMode`, `disabled`, `disabledReason`, `onChange`, `variant`). Visual states implemented from POC: `pocs/poc-v1-prd001/index.html` (closed) + `full-page-de.html` (open with site-scoped + tenant-wide groups). Specifics:
  - Trigger: h-12 px-4, `--card` bg, `--border` outline; chevron rotates 180° on open via CSS transform.
  - Chip: `font-mono`, `text-xs`, `--primary-background` bg, `--primary` text, px-2 py-0.5 rounded-sm. ISO code uppercased.
  - Native name: `--font-sans`, `text-base`, font-weight 500.
  - Dropdown content: `--popover` bg, `--border` outline, `--shadow-lg`, max-h 320px scrollable, `--radius-lg`.
  - When `languages.length >= 8`, render an `@blok/combobox` search input at top of dropdown (per UI spec § 2 "Components NOT yet installed by Marketplace quickstart"). Install via `npx shadcn add @blok/combobox` at start of Tranche 4 if absent.
  - When `fallbackMode === true`, show a `@blok/separator` between site-scoped (top group) and tenant-wide (bottom group); group heading "All tenant languages" with `--text-xs --muted-foreground` per UI spec § 4.1 dropdown layout.
  - Disabled state: `aria-disabled="true"`, `cursor-not-allowed`, opacity 60%, `@blok/tooltip` showing `disabledReason`.
  - Read-only variant: `@blok/badge`-only render with no chevron, no click (Dashboard tile usage in T035).
  - All accessibility per UI spec § 4.1 (aria-label="Language", `aria-haspopup="listbox"`, `aria-expanded`, `aria-describedby` for fallback note).
- **Expected Output:** `LanguagePicker.tsx` matching POC visuals + AC-1.1, AC-1.6, AC-3.5.
- **Depends on:** T003, T005, T006

#### T015 — LanguagePicker error + loading states

- **Title:** Picker enumeration-failure UX
- **Description:** Extend T014 to handle two states:
  - **Loading:** when enumeration is pending (`isReady === false` from T005, or `resolveEnumeratedLanguages` is in flight), trigger shows `@blok/skeleton` chip + skeleton name; chevron hidden; click does not open dropdown.
  - **Error (enumeration failed):** when both `Sites.Site.languages` is null/empty AND `listTenantLanguages` rejects, trigger shows Lucide `AlertCircle` icon (size-4, `text-destructive`) + label "Languages unavailable". Click opens a dropdown with a single "Retry" item that re-invokes enumeration. While in error state, the rest of Full Page remains functional pinned to `en` per AC-1.6.
- **Expected Output:** LanguagePicker handles loading + error per AC-1.6.
- **Depends on:** T014

#### T016 — `components/full-page/LanguageVersionIndicator.tsx` — dot

- **Title:** 8px inline-SVG dot indicator
- **Description:** Create `site/components/full-page/LanguageVersionIndicator.tsx` exporting `<LanguageVersionIndicator filled={boolean} />`. Inline SVG per UI spec § 4.2:
  ```jsx
  <svg viewBox="0 0 8 8" className="size-2 shrink-0" aria-hidden="true">
    <circle cx="4" cy="4" r={filled ? 4 : 3}
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'} strokeWidth="2" />
  </svg>
  ```
  Inherits `currentColor` from the parent row's text color — no theme branching needed. Per UI spec § 5 "Color not sole indicator": the difference is shape (fill vs stroke), not color alone.
- **Expected Output:** `LanguageVersionIndicator.tsx`. Standalone, reusable.
- **Depends on:** none

#### T017 — Update `components/full-page/RedirectMapList.tsx` — dot + display-name fallback

- **Title:** Map list row with language-aware indicator and label
- **Description:** Modify `site/components/full-page/RedirectMapList.tsx` in place:
  1. Accept a `currentLanguage: string` prop and `versionsByLanguageByMapId: Record<string, string[]>` prop. The parent (FullPage / RedirectMapDetail orchestrator) computes the map and passes it.
  2. For each row, render `<LanguageVersionIndicator filled={versions.includes(currentLanguage)} />` left of the title.
  3. Display title via fallback chain: `map.displayName?.trim() || map.name`. Add per-row `aria-label` per UI spec § 4.2 NFR-A5.
  4. When `filled === false`, set the row's text to `--muted-foreground` (slightly faded per UI spec § 4.2 "No version (outlined dot)").
  5. Touch targets: row stays full-width clickable (existing PRD-000 pattern).
- **Expected Output:** `RedirectMapList.tsx` updated; AC-2.1, AC-2.2, AC-2.3 satisfied.
- **Depends on:** T016, T039

#### T018 — Two-state UX gating in RedirectMapList → detail navigation

- **Title:** Route no-version vs empty-version vs populated states correctly
- **Description:** In `RedirectMapList` selection handler (and the FullPage orchestrator from T038), when a row is selected, derive the state:
  - `versionsByLanguage[mapId].includes(currentLanguage) === false` → state = `no-version` → render `RedirectMapDetail` in no-version mode (T019).
  - `versionsByLanguage[mapId].includes(currentLanguage) === true && map.mappings.length === 0` → state = `empty-version` → inline "Add first mapping" affordance.
  - Otherwise → state = `populated` → standard edit flow.
- **Expected Output:** Two-state UX wired into selection flow. AC-5.1, AC-5.2, AC-5.3 plus AC-4.1, AC-4.3 satisfied.
- **Depends on:** T017, T019

#### T019 — Update `components/full-page/RedirectMapDetail.tsx` — no-version + empty-version states

- **Title:** Detail pane renders 3 states (populated, empty-version, no-version)
- **Description:** Modify `site/components/full-page/RedirectMapDetail.tsx` in place:
  1. Accept new props `currentLanguage`, `versionsByLanguage: string[]` (from `listVersionsByLanguage` call orchestrated in T020), `mode: 'populated' | 'empty-version' | 'no-version'`.
  2. **`populated` mode:** existing PRD-000 behavior (mappings table + flags + display name from current language). Reads + writes pass `currentLanguage`.
  3. **`empty-version` mode:** show version metadata (created/updated) but replace mappings table with an inline "Add first mapping" affordance — same as the PRD-000 inline empty-list pattern. No modal interrupts (AC-5.2).
  4. **`no-version` mode:** show empty-state body per UI spec F3: title *"This map has no `[language]` version yet. Create one to start adding mappings."* + two CTAs ("Create empty `[language]` version" + "Copy from another language" → open T023 modal). List which languages **do** have versions per AC-4.3 — derived from `versionsByLanguage` prop.
  5. Wire `useDirtyEdits` hook (T006) so any field edit calls `markDirty()` and successful saves call `markClean()`.
- **Expected Output:** Three-mode detail pane satisfying AC-3.1..AC-3.5, AC-4.1, AC-4.3, AC-5.1..AC-5.3.
- **Depends on:** T010, T020, T006, T039

#### T020 — Orchestrate `versionsByLanguage` fetch on detail-view open

- **Title:** Fetch versions on map selection; pass through to detail and list
- **Description:** In FullPage (T038), when a map is selected, call `listVersionsByLanguage(client, sitecoreContextId, mapId)` (from T008) and cache the result in component state keyed by `mapId`. Pass `versionsByLanguage` into `RedirectMapDetail` AND back up into `RedirectMapList` (T017) so the list-row dots reflect the freshly-fetched data. Cache invalidates on every map selection swap and after any version-mutation success (T011/T012/T013/T027). No global state library — local React state in FullPage is sufficient (NFR-S1 budget unaffected; the call is single-map, not list-wide).
- **Expected Output:** Wiring lives in `FullPage.tsx` (T038); detail and list both consume the same memoized result.
- **Depends on:** T008

---

### EPIC F — Display-name editing

#### T021 — `components/full-page/DisplayNameEditor.tsx`

- **Title:** Inline pencil-affordance editor (Enter saves, Escape cancels, blur does NOT commit)
- **Description:** Create `site/components/full-page/DisplayNameEditor.tsx`. Props: `{ value: string; placeholder: string; language: string; onSave: (next: string) => Promise<void>; }`. Behavior per UI spec § 4.5 + AC-9.1..AC-9.5:
  - **Static mode:** renders `value` (or `placeholder` italic muted when `value === ''`). Pencil icon (Lucide `Pencil`, size-4, `text-muted-foreground`) fades in on row hover with 100ms transition. Touch mode: pencil always visible.
  - **Editing mode:** title swaps to `@blok/input` pre-filled with current value (or empty for empty case). Below: "Save" (primary, size-sm) + "Cancel" (ghost, size-sm) buttons.
  - **Save flow:** Enter on input → save. Click "Save" → save. Escape → cancel. Click "Cancel" → cancel. **Blur does NOT commit** (AC-9.4). During save: input read-only, "Save" shows spinner. On success → swap back to static with new value, fire Sonner toast *"Saved display name to `[language]` version."*. On failure → input stays in edit state, Sonner toast with collapsible technical details.
  - Empty-state: per AC-9.2, placeholder text `(no display name for [language] — add one)` shown italic muted in the static title (not just `placeholder` attribute — real text so screen readers announce it).
  - Aria labels per UI spec § 5 NFR-A5.
- **Expected Output:** `DisplayNameEditor.tsx`. Consumed in `RedirectMapDetail` header (T019).
- **Depends on:** T010

#### T022 — Wire DisplayNameEditor into RedirectMapDetail header

- **Title:** Place editor in detail header; pass `language` + map data
- **Description:** In `RedirectMapDetail.tsx` (T019), the header line renders `<DisplayNameEditor value={map.displayName ?? ''} placeholder={`(no display name for ${language} — add one)`} language={language} onSave={...} />`. On `onSave`, call `updateRedirectMap` (T010) with just the `displayName` field populated (other attrs unchanged — reads them from current map state). Toast on success; the local map state mutates `displayName` immediately on success without a refetch (optimistic) but invalidates `versionsByLanguage` cache if the version was just created in the same session.
- **Expected Output:** Editor wired into detail. AC-9.1..AC-9.5 satisfied end-to-end.
- **Depends on:** T021

---

### EPIC D — Create-version flow + rollback

#### T023 — `components/full-page/CreateVersionModal.tsx` — step 1 (two paths)

- **Title:** Two-path modal with side-by-side CTAs
- **Description:** Create `site/components/full-page/CreateVersionModal.tsx`. Composes `@blok/dialog` + two `@blok/button` (variant=outline, size=lg) styled as cards. Layout per UI spec § 4.3 step 1 + POC `pocs/poc-v1-prd001/create-version-modal.html`:
  - Title: *"Create `[language]` version"* (language interpolated).
  - Body: *"This map has no version in `[language]` yet. Choose how to create it:"*
  - Two CTA cards (`h-32`, equal width, side-by-side at ≥640px, stacked below): "Create empty `[language]` version" (Lucide `FileText` icon, size-8) and "Copy from another language" (Lucide `Copy` icon, size-8). Hover: border darkens to `--primary`, bg `--accent`, icon color `--primary`.
  - Footer: Cancel (`@blok/button` ghost).
  - Click "Create empty" → invoke `addRedirectMapVersion(itemId, language)` (T011) with loading state in the modal. On success → close modal, toast *"Created empty `[language]` version."*, detail-pane transitions to empty-version state (T019). On error → toast with friendly summary + collapsible technical details; modal stays open.
  - Click "Copy from another language" → swap modal content to step 2 (T024).
- **Expected Output:** `CreateVersionModal.tsx` rendering step 1.
- **Depends on:** T011, T020

#### T024 — `components/full-page/CopyFromSourceStep.tsx` — step 2 source picker

- **Title:** Source-language picker filtered to non-empty versions
- **Description:** Create `site/components/full-page/CopyFromSourceStep.tsx`. Renders inside `CreateVersionModal` when step 2 is active. Per UI spec § 4.3 step 2 + POC `pocs/poc-v1-prd001/create-version-copy-from-source.html`:
  - Title with back arrow: *"← Copy from another language"*.
  - Body: list of non-empty-version languages (from `nonEmptyVersionsByLanguage` per T008/T020). Each row is a `@blok/radio-group` item with `[ISO]  NativeName  N mappings` layout. Filter: AC-7.2 — only languages with versions where `UrlMapping.value` is non-empty.
  - When only one non-empty source exists, pre-select it (UX shortcut per UI spec § 4.3 "Single non-empty source language").
  - Info alert (`@blok/alert` variant=info) per AC-7.4: *"Mappings will be copied from `[source]`. Flags and redirect type are shared across all languages and apply automatically."*
  - Footer: Cancel + "Create version" button (disabled until a source is selected).
  - On "Create version" → call `copyFromAnotherLanguage(client, sitecoreContextId, { itemId, targetLanguage, sourceLanguage, sourceMappings })` (T013). Read each `CopyFromResult.state`:
    - `populated` → close modal, toast *"Created `[language]` version from `[source]`."*, detail-pane re-fetches and transitions to populated mode.
    - `version-create-failed` → toast with reason; modal stays open.
    - `rolled-back` → close modal, toast *"Could not copy mappings — new version removed."* with collapsible technical details.
    - `partial-version-detected` → close modal, trigger `PartialVersionBanner` (T026) at FullPage top with the reason + rollbackReason.
    - `populate-failed-no-rollback` (only when `DELETE_VERSION_AVAILABLE === false`) → close modal, toast *"Could not copy mappings. The version was created but is empty; you can either keep it and add mappings manually, or use the standard edit flow to populate it."* per ADR-0021 degraded UX.
- **Expected Output:** `CopyFromSourceStep.tsx`. Imported by `CreateVersionModal`.
- **Depends on:** T013, T020

#### T025 — Wire CreateVersionModal into RedirectMapDetail no-version state

- **Title:** Open modal on no-version CTAs
- **Description:** In `RedirectMapDetail.tsx` no-version mode (T019), both CTAs open `CreateVersionModal`. The "Create empty" CTA passes `initialStep: 'empty'` (modal auto-focuses the empty card); "Copy from another language" passes `initialStep: 'copy-from'` (modal skips step 1, opens step 2 directly). Pass `itemId`, `language`, `sourceMappings` accessors (resolved from `versionsByLanguage` and a lazy fetch of source-language map). When modal closes after success, invalidate `versionsByLanguage` cache (T020) and trigger re-fetch.
- **Expected Output:** Modal opens from both CTAs with the right entry point.
- **Depends on:** T023, T024

#### T026 — `components/full-page/PartialVersionBanner.tsx`

- **Title:** Persistent warning banner for ADR-0021 partial-version-detected state
- **Description:** Create `site/components/full-page/PartialVersionBanner.tsx`. Renders at the top of `FullPage` (above topbar OR below — pick per POC `pocs/poc-v1-prd001/partial-version-banner.html`). Composes `@blok/alert` variant=warning. Body per ADR-0021:
  > *"Partially populated `[language]` version detected on `[map name]`. The new version was created but mappings could not be copied, and automatic cleanup failed."*
  Two CTAs (`@blok/button` size=sm):
  - "Delete `[language]` version" → opens `DeleteScopeConfirmModal` (T027) with `forceLanguageOnlyPreSelected: true` flag (the ONE explicit exception to ADR-0018's strict no-default rule per ADR-0021).
  - "Add mappings manually" → routes to the map detail pane; operator lands in `empty-version` mode with inline "Add first mapping" affordance.
  - The banner is dismissible only after the operator clicks one of the two CTAs (the action implicitly resolves the partial state). Render `role="alert"` per UI spec § 5 NFR-A5.
- **Expected Output:** `PartialVersionBanner.tsx`. Mounted in `FullPage` (T038) and triggered from `CopyFromSourceStep` (T024) via shared partial-state in `FullPage` local state.
- **Depends on:** T013, T027

---

### EPIC E — Delete scope safety

#### T027 — `components/full-page/DeleteScopeConfirmModal.tsx`

- **Title:** Strict-no-default radio modal with version-count badges
- **Description:** Create `site/components/full-page/DeleteScopeConfirmModal.tsx`. Layout per UI spec § 4.4 + POC `pocs/poc-v1-prd001/delete-modal-multi.html` + `delete-modal-single.html`:
  - Title: *"Delete `[map display name]`?"*
  - Body: *"This map has `N` language versions: `[en] [de] [fr]`"* (inline `@blok/badge` per code).
  - Two radios (`@blok/radio-group`), vertically stacked, **no default selected** per ADR-0018:
    - "Delete `[current language]` version only — other languages remain."
    - "Delete entire map and all language versions."
  - Each radio rendered as a card with label + description (UI spec § 4.4 layout).
  - **Single-version edge case (AC-8.6):** still render both radios; below them, informational note: *"This map has only one language version; both options remove all redirect data. Choose explicitly to confirm intent."*
  - **Hard-fail variant (AC-8.4, when `DELETE_VERSION_AVAILABLE === false`):** render only option (b) with body *"Single-version-delete is unavailable in this Authoring schema. Delete the entire map across all languages?"* This is the only branch deviating from the two-radio shape.
  - **Cleanup-from-banner flow (`forceLanguageOnlyPreSelected: true` prop from T026):** open with radio (a) pre-selected — the ONE explicit exception to strict no-default per ADR-0021.
  - Footer: Cancel + Delete button. Delete is `disabled` + `aria-disabled="true"` until a radio is selected (skipped in cleanup-from-banner flow). Delete button uses destructive variant (`bg-destructive`, `text-destructive-foreground`).
  - On Delete: choose `deleteRedirectMapVersion(itemId, language)` (T012) for option (a) OR `deleteRedirectMap(itemId)` (existing PRD-000 path) for option (b). Toast on success with explicit action: *"Deleted `[language]` version of `[map name]`."* or *"Deleted `[map name]` and all language versions."*
- **Expected Output:** `DeleteScopeConfirmModal.tsx` covering all four variants. Existing `DeleteMapConfirmModal.tsx` retired (replaced by this).
- **Depends on:** T012, T020
- **TDD gate (RED first):** Create `site/tests/ui/full-page/DeleteScopeConfirmModal.test.tsx` with ALL test scenarios from § 10 T027 as failing tests BEFORE creating the component. This includes the structural no-default-radio test (scenario D in structural form) and the jest-axe assertion. The structural guard test (T040 step 3) is also written before this component is implemented. Install `jest-axe` before writing the axe assertion if not already installed.

#### T028 — Replace DeleteMapConfirmModal usage with DeleteScopeConfirmModal

- **Title:** Migrate call sites
- **Description:** Replace every import + usage of `DeleteMapConfirmModal` in `FullPage.tsx` (and any other consumer) with `DeleteScopeConfirmModal`. Delete the old `site/components/full-page/DeleteMapConfirmModal.tsx` and its test (`site/tests/ui/full-page/DeleteMapConfirmModal.test.tsx`) — both subsumed.
- **Expected Output:** No remaining references to `DeleteMapConfirmModal`. Build passes; structural-guard tests pass.
- **Depends on:** T027

---

### EPIC G — Dashboard scoping

#### T035 — Update `components/dashboard-widget/DashboardWidget.tsx` — strict current-language tiles

- **Title:** Dashboard tiles scoped to picker language; read-only picker chip
- **Description:** Modify `site/components/dashboard-widget/DashboardWidget.tsx` in place:
  1. Read picker state via `useLanguagePicker` hook (T005) — same `tenantId` + `siteId` key as Full Page. Render a read-only `LanguagePicker` (T014) with `variant: 'read-only'` in the header showing the current ISO + Native chip.
  2. Tile 1: "Maps in `[language]`" — count of maps with a version in `currentLanguage`. Derived from existing `listRedirectsForSite(language)` (T008) — request the list scoped to current language.
  3. Tile 2: "Mappings in `[language]`" — sum of `map.mappings.length` across all maps in current language.
  4. Tile 3 (new, the V1-anchor decision): "Languages with content" — inline code list (e.g. `en, de, fr`). Per UI spec § 2 / POC `dashboard-widget.html`. Derived from `versionsByLanguage` cross-map aggregation. NFR-S1: **batch reads via `Promise.all`** of per-language `listRedirectsForSite` calls — NO sequential `await` per language inside the fetch hook. Structural guard (T040) enforces.
  5. Footnote per AC-12.3 + UI spec: *"Counts scoped to `[language]`. Switch language in the Full Page surface. Redirect counts only — usage analytics ship in a follow-on release (PRD-003)."*
- **Expected Output:** Dashboard widget renders 3 tiles + footnote. AC-12.1..AC-12.3 satisfied.
- **Depends on:** T005, T008, T014

#### T036 — Cross-language Dashboard aggregation (parallel)

- **Title:** Parallel-fetch helper for cross-language language-list aggregation
- **Description:** Create `site/lib/sdk/dashboard-aggregation.ts` exporting `async aggregateLanguagesWithContent(client, sitecoreContextId, sitePath, enumeratedLanguages): Promise<string[]>`. Uses `Promise.all(enumeratedLanguages.map(lang => listRedirectsForSite(client, sitecoreContextId, sitePath, lang)))`. Reduces to the set of language codes that have ≥1 map with non-empty `UrlMapping`. NFR-S1: no `await` inside the `map` — guarded structurally by T040.
- **Expected Output:** `dashboard-aggregation.ts` consumed by T035.
- **Depends on:** T008

---

### EPIC H — Context Panel Pages-aware banner

#### T037 — `components/context-panel/PagesAwareBanner.tsx`

- **Title:** Banner copy driven by `pageInfo.language` from `pages.context` subscription
- **Description:** Create `site/components/context-panel/PagesAwareBanner.tsx`. Replaces (or absorbs) existing `RegexBanner.tsx` in `ContextPanel.tsx`. Composes `@blok/alert` variant=info. Per UI spec § 4.6 + AC-13.2 + POC `context-panel-en.html` + `context-panel-de.html`:
  - Read `pageInfo.language` from the existing PagesContext subscription (`page-context.ts`, already wired in PRD-000). Add a `language: string | null` prop derived from the subscription value.
  - When `language === 'en'` OR `language == null`: render *"Exact-match, en-only. Regex + multilingual matching ship in follow-ons."*
  - When `language` is non-`en`: render *"Currently viewing a `[language]` page — matches shown are `en`-only. Multilingual matching ships in PRD-002."* — interpolate the language code verbatim.
  - Non-dismissible (no close button) per FR-17 / AC-13.3.
  - `role="status"` + `aria-live="polite"` per UI spec § 5 NFR-A5.
  - No matcher changes — Context Panel still calls existing `context-panel-matcher.ts` unchanged (FR-18).
- **Expected Output:** `PagesAwareBanner.tsx` mounted in `ContextPanel.tsx`. Existing `RegexBanner.tsx` retired if absorbed (otherwise extended).
- **Depends on:** none

---

### EPIC I — Import/export schema v2

#### T029 — `lib/import-export/schema-v2.ts` — Zod schema

- **Title:** v2 schema definition with field-versioning split
- **Description:** Create `site/lib/import-export/schema-v2.ts` exporting `RedirectExportV2Schema` (Zod). Shape per architecture § 4.5 + ADR-0015 amendment:
  - Top level: `schema: z.literal('redirect-manager/v2')`, `exportedAt: z.string()`, `site: { name, collectionName, siteId }`, `siteLanguages: z.array(z.string().max(10)).max(50)`, `maps: z.array(MapSchema).max(1000)`.
  - `MapSchema`: `guid: z.string().min(1)`, `itemName: z.string().min(1)`, `shared: { redirectType, preserveQueryString, preserveLanguage, includeVirtualFolder }`, `languages: z.record(z.string().regex(/^[a-z]{2}(-[A-Z]{2,4})?$/), LangSchema).refine(no-prototype-keys)`.
  - `LangSchema`: `displayName: z.string().max(255)`, `lastUpdated: z.string()`, `mappings: z.array({ source, target })`.
  - **Per T001 capture matrix:** if `__Display name` came back as `UNVERSIONED` (surprise), move it out of `LangSchema` into `shared` — the schema shape is structurally ready to absorb (architecture § 4.3 amendment policy).
  - Export `parseExportV2(input: unknown): { ok: true; data: ExportV2 } | { ok: false; errors: string[] }` returning a typed result, never throwing.
- **Expected Output:** `schema-v2.ts` + co-located test fixture `tests/fixtures/redirect-bundle-v2.json` (a small canonical bundle for tests).
- **Depends on:** T001, T039
- **TDD gate (RED first):** Create `site/tests/unit/import-export/schema-v2.test.ts` with all failing assertions BEFORE creating `schema-v2.ts`. The canonical v2 fixture `tests/fixtures/redirect-bundle-v2.json` should be hand-authored before the schema is written (the fixture defines what "valid v2" looks like).

#### T030 — `lib/import-export/v1-detect.ts` — v1 rejection pre-validator

- **Title:** Thin pre-check that returns clear v1 error before Zod runs
- **Description:** Create `site/lib/import-export/v1-detect.ts` exporting `function detectV1(parsedJson: unknown): { v1: true; message: string } | { v1: false }`. Reads `parsedJson?.schema` and matches literal `'redirect-manager/v1'`. When matched, returns `{ v1: true, message: 'Schema v1 is no longer supported. Re-export from a current Redirect Manager instance.' }` per FR-13 / AC-11.6.
- **Expected Output:** `v1-detect.ts`. Called by import wizard step 1 (T034) before Zod parse.
- **Depends on:** none
- **TDD gate (RED first):** Create `site/tests/unit/import-export/v1-detect.test.ts` with all 3 failing scenarios BEFORE creating `v1-detect.ts`. This is the simplest RED-before-GREEN in PRD-001 — write it first as a confidence-builder.

#### T031 — `lib/import-export/serialize-v2.ts` — multi-language bundle export

- **Title:** Export serializer rewrite
- **Description:** Create `site/lib/import-export/serialize-v2.ts` exporting `async serializeSiteToV2Bundle(client, sitecoreContextId, sitePath, site, enumeratedLanguages): Promise<ExportV2>`. Algorithm:
  1. Fetch each language version of every map via parallel `listRedirectsForSite(language)` calls (`Promise.all` per NFR-S1).
  2. Aggregate by `mapId` into a `Map<guid, { itemName, shared, languages: Record<code, LangData> }>`.
  3. Compute `siteLanguages` as the set of languages where at least one map has a version (matches the exporter's actual content, not the enumerated list — this prevents exporting languages with no content).
  4. Per architecture § 4.5 + ADR-0015 amendment: place `redirectType`, `preserveQueryString`, `preserveLanguage`, `includeVirtualFolder` into `shared`; place `displayName`, `lastUpdated`, `mappings` into each `languages.<code>`. Adjust if T001 matrix capture surprised.
  5. Normalize `lastUpdated` from Sitecore-compact-date to ISO-8601 extended via existing `lib/domain/sitecore-date.ts` (reused).
- **Expected Output:** `serialize-v2.ts`. Replaces `lib/import-export/serialize.ts` (delete the v1 file in the same commit).
- **Depends on:** T008, T029
- **TDD gate (RED first):** Create `site/tests/unit/import-export/serialize-v2.test.ts` with failing round-trip test BEFORE implementing `serialize-v2.ts`. The parallel-fetch assertion (all 3 mocked calls initiated before any resolves) must be in the failing test set from the start.

#### T032 — `lib/import-export/diff-v2.ts` — language-axis diff

- **Title:** Per-map GUID-keyed diff with per-language sub-axis
- **Description:** Create `site/lib/import-export/diff-v2.ts` exporting `function buildItemDiffsV2(bundle: ExportV2, tenantMaps: RedirectMapItem[], tenantLanguagesByMapId: Record<string, string[]>): MapDiffV2[]`. Per `MapDiffV2`:
  ```typescript
  type MapDiffV2 = {
    guid: string;
    itemName: string;
    action: 'create' | 'overwrite' | 'skip';  // default per FR-16
    languagesInBundle: string[];               // codes present in bundle for this map
    languagesOnTenant: string[];               // codes that have a version on tenant
    perLanguage: Record<string, 'create' | 'overwrite' | 'unchanged' | 'skip' | 'conflict'>;
  };
  ```
  Action-default rules:
  - Map absent from tenant → `action: 'create'`. Per-language cells: bundle codes get `create`, others `—`.
  - Map present on tenant → `action: 'overwrite'`. Per-language cells: bundle codes that also exist on tenant get `overwrite`; bundle codes absent on tenant get `create`; tenant codes absent from bundle get `unchanged`.
  - If operator changes `action` to `create` on a map that already exists → `conflict` flag for cells that would overlap.
  - If operator changes `action` to `skip` → all per-language cells become `skip` (`—`).
- **Expected Output:** `diff-v2.ts`. Replaces `lib/import-export/diff.ts`.
- **Depends on:** T029, T039
- **TDD gate (RED first):** Create `site/tests/unit/import-export/diff-v2.test.ts` with all 4 per-language-combination test cases BEFORE implementing `diff-v2.ts`.

#### T033 — `lib/import-export/apply-v2.ts` — per-language apply executor

- **Title:** Per-action executor with language fanout
- **Description:** Create `site/lib/import-export/apply-v2.ts` exporting `async applyDiffsV2(client, sitecoreContextId, diffs: MapDiffV2[], bundle: ExportV2, onProgress): Promise<ApplyResultV2[]>`. Per-map executor:
  - `action === 'skip'` → return `{ mapGuid, languages: {} }`, no mutations.
  - `action === 'create'` → call `createRedirectMap(client, sitecoreContextId, { ..., language: <first-language-in-bundle> })` to create the item (mints new GUID per ADR-0009). Then for each subsequent language in `bundle.maps[i].languages`, call `addRedirectMapVersion(itemId, language)` + `updateRedirectMap(itemId, language, fields-from-bundle)`. Sequential per-map; parallel across maps via `Promise.all` (batch size = 5 per architecture existing rate-limit pattern).
  - `action === 'overwrite'` → for each language in `bundle.maps[i].languages` that exists on tenant, call `updateRedirectMap(itemId, language, ...)`. For each language in bundle but absent on tenant, call `addRedirectMapVersion + updateRedirectMap` to add the version. Tenant-only languages remain untouched per FR-16.
  - Returns per-map outcome with per-language detail for the summary screen (AC-11.5).
- **Expected Output:** `apply-v2.ts`. Replaces `lib/import-export/apply.ts`.
- **Depends on:** T010, T011, T029, T032
- **TDD gate (RED first):** Create `site/tests/unit/import-export/apply-v2.test.ts` with all 4 scenario cases (skip/create/overwrite/per-language-outcome) BEFORE implementing `apply-v2.ts`. The FR-16 tenant-only-languages-untouched test is a named regression.

#### T034 — Update `components/full-page/ImportRedirectMapModal.tsx` — language-columns preview

- **Title:** 4-step wizard with language-axis preview table
- **Description:** Modify `site/components/full-page/ImportRedirectMapModal.tsx` in place. Steps per UI spec § 3 F10..F13:
  1. **Upload (F10):** drop-zone / file picker. After parse, call `detectV1(parsedJson)` (T030); if `{ v1: true }`, show the v1 rejection error inline and do not advance.
  2. **Validate (F11):** Zod parse via `RedirectExportV2Schema` (T029). On error, list per-field issues.
  3. **Preview (F12):** render `ImportPreviewTable` (sub-component) per UI spec § 4.7 — rows = maps, columns = `bundleSiteLanguages ∪ tenantSiteLanguages`. Sticky-left first column with per-map `@blok/select` action picker (create / overwrite / skip). Cells colored per status badge per UI spec § 4.7 table. Horizontal scroll via `@blok/scroll-area` when columns overflow. When language count >8, render a `@blok/dropdown-menu` filter above the table (UI spec § 4.7 "Bonus protection").
  4. **Apply (F13):** call `applyDiffsV2(...)` (T033) with progress callback updating a per-row `@blok/progress`. On complete, show per-map summary with per-language detail per AC-11.5.
- **Expected Output:** Import wizard with 4 steps, language-columns preview, v1 rejection. AC-11.1..AC-11.7 satisfied.
- **Depends on:** T030, T031, T032, T033

---

### EPIC C continued — FullPage wiring

#### T038 — Update `components/full-page/FullPage.tsx` — orchestrate picker, list, detail, modals

- **Title:** Top-level orchestration — picker → list → detail → modals → banners
- **Description:** Modify `site/components/full-page/FullPage.tsx` in place. Major changes:
  1. Mount `<LanguagePicker>` (T014) in the topbar (or a `<TopActionRow>` slot — pick per POC `pocs/poc-v1-prd001/index.html`). Pass `language`, `languages`, `fallbackMode`, `disabled` (from `useDirtyEdits`), `onChange` props.
  2. Mount `<PartialVersionBanner>` (T026) above the two-pane content, conditional on partial-state local state.
  3. Compute `language` via `useLanguagePicker` hook (T005), `enumerated` via `resolveEnumeratedLanguages` (T003), `siteDefault` from existing site state.
  4. Compute `versionsByLanguage` per selected map via `listVersionsByLanguage` (T008) and pass into `RedirectMapList` (T017) AND `RedirectMapDetail` (T019).
  5. Thread `currentLanguage` through every Authoring read + write call site. Existing PRD-000 callers that hardcoded `'en'` are updated to read from picker.
  6. Wire dirty-edit handlers across the detail-pane so AC-3.5 picker-disable behaves correctly.
- **Expected Output:** `FullPage.tsx` orchestrates the full PRD-001 surface.
- **Depends on:** T014, T015, T017, T018, T019, T020, T025, T026, T028

---

### EPIC C continued — Context Panel + Dashboard route wiring

#### T037b — Mount PagesAwareBanner in ContextPanel

- **Title:** Replace static banner with PagesAwareBanner in Context Panel route
- **Description:** Modify `site/components/context-panel/ContextPanel.tsx` in place. Remove (or absorb) the existing `RegexBanner`; mount `<PagesAwareBanner language={pageInfo?.language ?? null} />`. The `pageInfo` comes from the existing PagesContext subscription wired in PRD-000 (`subscribePageContext`); no new subscription. Matcher (`context-panel-matcher.ts`) untouched per FR-18.
- **Expected Output:** Context Panel renders Pages-aware banner. AC-13.1..AC-13.3 satisfied.
- **Depends on:** T037

---

### EPIC K — Tests, structural guards, and smoke prep

#### T040 — Extend structural guards

- **Title:** Add 4 new structural-guard tests
- **Description:** Modify `site/tests/structural/structural-guards.test.ts` in place. Add:
  1. **SDK boundary lock extension** — confirm `lib/sdk/languages.ts`, `lib/sdk/redirects-version.ts`, `lib/sdk/dashboard-aggregation.ts` are inside `ALLOWED_SDK_IMPORTERS` (they're already covered by the directory rule; add an explicit positive-presence assertion).
  2. **Picker-key shape lock** — grep `lib/picker/language-picker-state.ts` for the literal `'redirect-manager.language.'` prefix; assert it appears in `getPickerState` and `setPickerState`. Reject any `'redirect-manager.language.v'` substring inside this file (the v1 contract has no version segment per ADR-0022).
  3. **Strict no-default delete radio lock** — parse `components/full-page/DeleteScopeConfirmModal.tsx`; assert no `defaultChecked` attribute on any `<input type="radio">` OR `<RadioGroup defaultValue=`. Allow only the `forceLanguageOnlyPreSelected` prop branch (matched by source-code pattern) to set a default — that's the ADR-0021 explicit exception.
  4. **Dashboard parallel-fetch lock** — parse `lib/sdk/dashboard-aggregation.ts`; assert no `await` appears INSIDE `.map(` (regex line scan). The aggregation must use `Promise.all(... .map(...))` pattern per NFR-S1.
  5. **Schema v2-only lock** — assert `lib/import-export/schema.ts`, `diff.ts`, `apply.ts`, `serialize.ts` (v1) no longer exist on disk (deleted in T029/T031/T032/T033). Assert `lib/import-export/schema-v2.ts` exists.
- **Expected Output:** Structural guards extended. Build fails on any future drift.
- **Depends on:** T004, T027, T031, T032, T033, T036

#### T041 — Doc captures and in-code comments

- **Title:** Append capture findings to `docs/decisions.md` + sync JSDoc headers
- **Description:** Append a new section to `products/redirect-manager/docs/decisions.md` titled "PRD-001 captures (Tranche 1, 2026-05-13)" listing the closed OQs (A1..A5) + verb-name confirmation + matrix outcome. Update JSDoc preambles in `redirects-version.ts`, `languages.ts`, `redirects-read.ts` (extended), `redirects-write.ts` (extended) to cite the captured fixture paths (per memory `feedback_assumed_shapes_progressive_capture` workflow). Per memory `project_quickcopy_framework_learnings`: every SDK call's JSDoc cites the `.d.ts` path + line + envelope quirk.
- **Expected Output:** `docs/decisions.md` updated; JSDoc headers in 4 SDK files updated.
- **Depends on:** T001, T002, T008, T010, T011, T012

#### T042 — Smoke checklist and live-walkthrough prep

- **Title:** Author smoke checklist for the 5 PRD-001 gates
- **Description:** Create `products/redirect-manager/project-planning/smoke/smoke-checklist-prd-001.md` with operator-facing step-by-step checklists for each gate per § 3 of the PRD:
  - `host_frame_smoke` — POC clickdummy re-run for the 14 new frames.
  - `crud_round_trip` (m2 + m3) — per-language CRUD + create-version both paths.
  - `import_export_round_trip` (m4) — round-trip a real site with ≥2 languages.
  - `live_walkthrough` (m1 + m5) — language switching across surfaces, ≥5 min.
  - `registration` — confirm no re-registration (same App ID).
  Each checklist step names the expected POC frame or in-app screen and the success criterion.
- **Expected Output:** `smoke-checklist-prd-001.md` ready for operator. Referenced from the run manifest.
- **Depends on:** T038, T034, T035, T037b

---

## 4b. Important Test Cases (by epic / feature)

*QA enrichment 2026-05-13: expanded with edge cases, Task ID traceability, and fixture provenance anchors. Lead Developer's original items preserved; non-behavioral items dropped; edge cases added.*

### Epic A — SDK layer (T002, T003, T008–T013, T039)

- **T002/T003** `languages.ts`: `getSiteLanguages` returns `[]` for null, undefined, and `[]` (unit). `listTenantLanguages` DOUBLE-unwraps `.data.data`; returns `[]` on `data.data === null` (unit, mocked client). `resolveEnumeratedLanguages` returns `fallbackMode: true` when `site.languages` is null or empty (unit). **Edge case:** `site.languages === ['en']` on a tenant that has 5 languages — `resolveEnumeratedLanguages` must fall back to tenant-wide list per ADR-0020 fallback policy (this is the R-3 risk path; confirm the single-`en` heuristic during T001 real-tenant verification).
- **T008/T009** `redirects-read.ts` (extended): `$language: String!` variable replaces literal `"en"` in query body (unit). `Display_Name` aliased accessor is `Display_Name: field(name: "__Display name") { value }` — verify alias present in query string. `versionsByLanguage` extracts distinct language codes; `nonEmptyVersionsByLanguage` filters by non-empty UrlMapping value (unit, `versions-by-language.json` fixture post-T001). **Edge case:** `Display_Name.value === null` → `displayName: ''` (not `undefined`); `Display_Name` key absent entirely → `displayName: undefined`.
- **T010** `redirects-write.ts` (extended): `displayName: undefined` does NOT push `__Display name`; `displayName: 'foo'` DOES push exactly one entry with `name: '__Display name'`; `language` arg threaded through to `variables.input.language` (unit, mocked). **Edge case:** `language` arg omitted → default `'en'` preserves PRD-000 backward-compat.
- **T011** `addRedirectMapVersion` (unit): success → `{ ok: true, version: 2 }`. GraphQL error → `{ ok: false, error: '...' }`. **Envelope assertion:** `client.mutate` called with body INSIDE `params.body` and DOUBLE `.data.data` unwrap applied (not single-unwrap).
- **T012** `deleteRedirectMapVersion` (unit): `successful === true` → `{ ok: true }`. `successful === false` → `{ ok: false }`. **Hard-fail path:** when `DELETE_VERSION_AVAILABLE === false`, wrapper throws / returns error — never silently returns `{ ok: true }` (ADR-0019 R-1 non-negotiable).
- **T013** `copyFromAnotherLanguage` state machine: ALL FIVE outcome paths exercised with stubs — `populated`, `version-create-failed`, `rolled-back`, `partial-version-detected`, `populate-failed-no-rollback`. **Each path is a separate test case** (not grouped into one). Verify: in `rolled-back` path, `deleteRedirectMapVersion` IS called; in `version-create-failed`, it is NOT; in `populate-failed-no-rollback` (`DELETE_VERSION_AVAILABLE === false`), it is NOT. See § 10 T013 for full spec.

### Epic B — Picker state (T004–T006)

- **T004** `language-picker-state.ts`: `getPickerState` returns `null` for absent / invalid JSON / wrong Zod shape (unit). `setPickerState` writes key `redirect-manager.language.<tenantId>.<siteId>` (v1, NO `.v1.` segment per ADR-0022). `resolveDefaultLanguage` honors 4-step chain: persisted → siteDefault → `en` → first in enumerated. **Edge case (AC-1.2):** persisted language is valid but `en` is not in the enumerated set for this site — chain must return `first in enumerated`, not `'en'`. **Edge case:** `enumerated === []` → return `'en'` (safe fallback; don't throw). `validateAgainstEnumerated` emits stale-warning when persisted language no longer in set.
- **T005** `use-language-picker.ts`: initial render returns `language: ''` (no hydration mismatch, per memory `feedback_hydration_mismatch_pattern`). After `useEffect`, `language` matches persisted value. `setLanguage` writes through to `localStorage`. `storage` event handler updates state when key matches; ignores events for DIFFERENT keys (cross-tab last-write-wins isolation). **Regression:** subscription count stays 1 across multiple mount/unmount cycles (no leak).
- **T006** `use-dirty-edits.ts`: `markDirty` / `markClean` toggle correctly. Document and enforce the chosen semantics (boolean vs ref-counted) — the test IS the spec.

### Epic C — Map list + detail (T014–T020)

- **T014/T015** `LanguagePicker`: renders ISO chip (uppercased) + native name. Opens dropdown on click. Emits `onChange` on item click. Renders disabled state with `aria-disabled="true"` + tooltip (NOT just `disabled` native prop — see § 9.5). Fallback mode: group separator + "All tenant languages" heading. Loading state: skeleton chip, no chevron. Error state: "Languages unavailable" + Retry item. **Runtime contrast:** ISO chip `--primary-background`/`--primary` ≥ 3.0 (unit component of § 9.4).
- **T016** `LanguageVersionIndicator`: `filled={true}` → SVG circle with `fill="currentColor"`, no stroke. `filled={false}` → `fill="none"` + `stroke="currentColor"`. Component is `aria-hidden="true"` (decorative). **Critical:** uses `currentColor` — inherits parent row's text color; must NOT have any hardcoded hex.
- **T017** `RedirectMapList`: `map.displayName` displayed when non-empty; fallback to `map.name` when `displayName === ''`. Dot filled when `versionsByLanguage.includes(currentLanguage)`. Row with no version: muted text; row with version: normal text. **Edge case (AC-2.1 + FR-10):** `displayName: ''` (empty but not undefined) → shows `name` as fallback; `displayName: undefined` → same fallback.
- **T019** `RedirectMapDetail`: All 3 modes rendered correctly. **Edge case:** Two-state UX distinction — `mode='no-version'` (version count = 0) shows modal CTA; `mode='empty-version'` (version count ≥ 1, UrlMapping empty) shows inline affordance without modal — these two states MUST be visually and functionally distinct (FR-12). AC-3.5: picker locked when `dirty === true`; re-enabled after `markClean()`.

### Epic D — Create-version flow (T023–T026)

- **T023** `CreateVersionModal` step 1: two CTA cards visible. "Create empty" invokes `addRedirectMapVersion`; on success, closes + success toast. On error, stays open + error toast. "Copy from" transitions to step 2 (not closes).
- **T024** `CopyFromSourceStep` step 2: **Only `nonEmptyVersionsByLanguage` entries shown** (AC-7.2 — languages with versions but empty UrlMapping are filtered out, not disabled). Single non-empty source → auto-selected. "Create version" disabled until selection. All 5 `CopyFromResult.state` branches produce correct UI outcome (see § 10 T024). **Edge case:** source language that had non-empty UrlMapping becomes empty mid-flight (race condition — the filter uses the value at step-2 render time; no dynamic re-filter needed; the test documents this accepted limitation).
- **T026** `PartialVersionBanner`: `role="alert"`. Two CTAs wired correctly. Cleanup-from-banner CTA → `DeleteScopeConfirmModal` opens with radio (a) pre-selected (`forceLanguageOnlyPreSelected={true}`) — this is the ONLY place that pre-select is permitted per ADR-0021. Test asserts: in ALL other deletion flows, `forceLanguageOnlyPreSelected` is `false` or absent.

### Epic E — Delete scope safety (T027–T028)

- **T027** `DeleteScopeConfirmModal`: Delete button `disabled` until radio selected (AC-8.2). Single-version edge case: both radios visible, informational note present, NEITHER pre-selected (AC-8.2 + AC-8.6 reconciliation). Hard-fail variant: only option (b) visible. Cleanup-from-banner exception: radio (a) pre-selected via prop. **Structural guard T040 step 3** enforces the no-default rule at build time. **Runtime contrast:** Delete button destructive ≥ 4.5. **jest-axe:** no violations on all 4 variants.
- **T028** (structural/migration): no remaining `DeleteMapConfirmModal` references in source. Build passes. `DeleteMapConfirmModal.test.tsx` deleted and replaced by `DeleteScopeConfirmModal.test.tsx`.

### Epic F — Display-name editing (T021–T022)

- **T021** `DisplayNameEditor`: Enter saves. Escape cancels. **Blur does NOT commit (named regression test for AC-9.4** — failure of this test is a release blocker). Placeholder is REAL DOM text, not just `placeholder` attribute (screen-reader requirement). On save failure: input stays in edit mode; error toast with collapsible "Technical details". **T022:** Save calls `updateRedirectMap` with ONLY `displayName` changed (no other attrs mutated — AC-9.5 item-name unchanged).

### Epic G — Dashboard scoping (T035–T036)

- **T035** `DashboardWidget`: tiles labeled with current ISO. "Languages with content" tile lists codes. Footnote includes language code. Read-only picker chip (no dropdown on click). **T036** `aggregateLanguagesWithContent`: returns only languages with ≥1 non-empty map. **Structural: no sequential `await` inside `.map()` (NFR-S1; T040 step 4 guards this).** Edge case: all languages have no content → returns `[]`.

### Epic H — Context Panel banner (T037, T037b)

- **T037** `PagesAwareBanner`: en/null → en-only copy. Non-`en` → copy with interpolated language code. `role="status"` + `aria-live="polite"`. Non-dismissible (no close button). **Language switch en→de** updates copy in-place; ARIA live region announces change to screen readers. **T037b:** `RegexBanner` no longer in DOM; `PagesAwareBanner` present; matcher still wired to `ContextPanel` (not the banner) per FR-18.

### Epic I — Import/export schema v2 (T029–T034)

- **T029** `schema-v2.ts`: accepts canonical fixture. Rejects wrong `schema` literal. Rejects uppercase ISO key (`'EN'`). Rejects >1000 maps. Rejects `displayName` >255 chars. **Fixture provenance:** `tests/fixtures/redirect-bundle-v2.json` comment: `// source: architecture-20260513T092023Z.md § 4.5 — canonical schema example`.
- **T030** `v1-detect.ts`: exact message for v1 rejection. `v2` + null + `{}` → `{ v1: false }`.
- **T031** `serialize-v2.ts`: round-trip with `parseExportV2`. ISO-8601 timestamps (not Sitecore compact). `siteLanguages` only contains languages with at least one map. **Structural:** `Promise.all` used (spy + assert concurrent calls).
- **T032** `diff-v2.ts`: absent-on-tenant → `create`. Present → `overwrite`. Per-language cells for all 4 combinations (create/overwrite/unchanged/skip). `action: 'skip'` → all cells `skip`.
- **T033** `apply-v2.ts`: `skip` → no mutations. `create` → correct mutation sequence per language. `overwrite` → tenant-only languages untouched (FR-16 regression). Returns per-map per-language outcomes (AC-11.5).
- **T034** `ImportRedirectMapModal`: v1 rejection in step 1 (no advance). v2 advance to validate. Language columns in preview. Per-language summary in apply results.

### Epic J — Real-tenant capture (T001)

- T001 is the gate. After capture: fixtures exist on disk with provenance `.meta.md`. Structural guard T040 step 5 verifies presence. **Edge case decision:** if `add-item-version.json` fixture shows a different field name than assumed (e.g., `itemId` vs `path`), all dependent SDK tests (T011, T013) update their fixtures and assertions — NOT the wrapper interface (which stays stable). The interface absorbs the shape change; the tests reflect reality.

### Epic K — Structural guards + smoke prep (T040–T042)

- **T040** structural guards: each of the 5 new guards fails when the target invariant is violated (negative regression). Guards are written BEFORE the code they guard, making them the RED specification.
- **T042** smoke: all 5 `manifest.smoke_outcomes` entries (`m1`–`m5`) must be `passed` before status transitions to `shipped`. Host-frame visual smoke on 10 POC frames (§ 9.7) must yield no unresolved FAIL verdicts.

---

## 4c. Implementation execution contract (for Developer 08)

### 4c-1. Non-negotiable technical boundaries

- **Marketplace Mode A only** — no server-side OAuth proxy, no `experimental_createXMCClient`, no Auth0. ADR-0002.
- **Authoring GraphQL is the single canonical source** — no second data store of any kind. ADR-0003.
- **`@sitecore-marketplace-sdk/*` imported ONLY from `site/lib/sdk/*`** and `site/components/providers/marketplace.tsx`. Enforced by structural guard `site/tests/structural/structural-guards.test.ts` (PRD-000 carry, extended in T040).
- **DOUBLE `.data.data` unwrap on every `xmc.authoring.graphql` call** — `client.mutate` with body INSIDE `params` (verified PRD-000, 2026-05-11). Single-unwrap is forbidden for this endpoint.
- **`xmc.sites.listLanguages` uses DOUBLE `.data.data` unwrap** — matches the existing `xmc.sites.listSites` envelope at `site/lib/sdk/sites.ts:39`.
- **Blok primitives throughout; Nova preset; no invented hex; semantic tokens only.** Override `--primary-foreground` in dark mode per PRD-000 globals.css convention.
- **No `dangerouslySetInnerHTML` outside `components/ui/*`** — NFR-Sec3 / PRD-000 structural guard.
- **Strict no-default delete radio** — ADR-0018. Structural guard T040 step 3 enforces. The ADR-0021 cleanup-from-banner pre-selection is the ONE explicit exception, gated by the `forceLanguageOnlyPreSelected` prop.
- **No silent fallback for missing `deleteItemVersion`** — ADR-0019 + PRD § 13 R-1. The wrapper exports a `DELETE_VERSION_AVAILABLE` constant; consumers branch explicitly. The hard-fail delete-modal variant is per AC-8.4 — copy adjusts; no stub mutation.
- **No silent fallback for missing `addItemVersion`** — same PRD R-1 rule. If T001 capture reveals absence, US-6 / US-7 / US-11-create cut from PRD-001; no stub.
- **WCAG 2.1 AA on every new surface** — picker, modals, banners, editor, indicators. Focus-visible outlines on every interactive element. Existing PRD-000 structural guard banning `outline:none` without paired `:focus-visible` extends to PRD-001 code.
- **`localStorage` key shape:** `redirect-manager.language.<tenantId>.<siteId>` (v1, no `.v1.` segment). Future-PRD migrations use `redirect-manager.language.v2.<...>` per ADR-0022. Structural guard T040 step 2 enforces.
- **No render-time browser-global branching.** `typeof window`, `IntersectionObserver`, `navigator`, `matchMedia` only inside `useEffect` — never in `useState` init or render body (per memory `feedback_hydration_mismatch_pattern`).
- **SDK fixture-capture is progressive, not a hard gate** (per memory `feedback_assumed_shapes_progressive_capture`) — EXCEPT for T001 which is a mandatory Tranche 1 prerequisite per PRD § 13 R-1 + R-2.

### 4c-2. ADR one-liners

**Carry-over from PRD-000 (still binding):**

- **ADR-0002** — Marketplace Mode A scaffold only; client-side iframe; no Mode B.
- **ADR-0003** — Authoring GraphQL is the canonical source; no second data store.
- **ADR-0007** — `tenantId` (not `organizationId`) is the scoping identifier used in `localStorage` keys.
- **ADR-0008** — `UrlMapping` encoding contract: URL-encoded `=`/`&`-pair shape. Copy-from path reuses `serializeMappings`.
- **ADR-0009** — Import matches by item GUID; newly minted GUIDs flagged in summary screen.
- **ADR-0010** — En-only MVP scope; PRD-001 fulfills the deferral (NOT supersedes).
- **ADR-0011** — Three extension points unchanged; no re-registration in PRD-001.
- **ADR-0012** — `react-virtuoso` list virtualization; reused for map list.
- **ADR-0013** — Real-tenant fixture-capture workflow; applied to T001.

**PRD-001-specific:**

- **ADR-0014** — Four-PRD phasing: PRD-001 is app-internal multilingual only; PRD-002 closes Context Panel multilingual + head-app; PRD-003 analytics; PRD-004 sync-back. Supersedes ADR-0004.
- **ADR-0015** — Import/export schema v2: clean break, no v1 back-compat. v1 imports rejected with clear error. Field-versioning split pinned to architecture § 4.3 assumed matrix (capture-amendable in T001).
- **ADR-0016** — Create-version flow: two paths (empty + copy-from), no name input. Verb name corrected to `addItemVersion` (amended 2026-05-13). Source-language picker filtered to non-empty versions only.
- **ADR-0017** — Picker state: `localStorage`-persisted, shared across Full Page + Dashboard. Key per (tenantId, siteId). Cross-tab last-write-wins.
- **ADR-0018** — Delete scope safety: confirmation modal with explicit radio, strict no-default, single-version edge case still requires explicit choice.
- **ADR-0019** — `addItemVersion` is the canonical Authoring verb (NOT `createItemVersion`). Wrapper module `lib/sdk/redirects-version.ts`. DOUBLE `.data.data` unwrap + body INSIDE params for the version-mutation family.
- **ADR-0020** — Site-scoped languages preferred (`Sites.Site.languages` property read, no extra call); tenant-wide fallback (`xmc.sites.listLanguages`) only when site-scoped is null/empty. UI hint communicates fallback.
- **ADR-0021** — Copy-from rollback state machine: 4 discriminated states (`populated`, `version-create-failed`, `rolled-back`, `partial-version-detected`) + degraded mode when `DELETE_VERSION_AVAILABLE === false`. PartialVersionBanner with two CTAs; cleanup-from-banner is the explicit exception to ADR-0018's strict no-default.
- **ADR-0022** — Picker `localStorage` key shape v1 = `redirect-manager.language.<tenantId>.<siteId>`. Future shape changes use `.v2.` namespace; transition window reads both keys.

### 4c-3. Stack / tooling specifics

- **Package manager:** `npm` (confirmed `site/package.json:1`; lockfile `package-lock.json`).
- **Test runner:** `vitest` (v4.1.5, `site/package.json:59`). Run `npm run test` (run-once) or `npm run test:watch` (watch). Tests live alongside source (UI tests in `site/tests/ui/`, unit in `site/tests/unit/`, structural in `site/tests/structural/`).
- **Build:** `npm run build` (`next build`).
- **Lint:** `npm run lint` (`eslint`).
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`).
- **Dev server:** `npm run dev` (Next 16 with Turbopack). Per `sitecore:marketplace-sdk-testing-debug` skill: HTTPS is required for Cloud Portal iframe; PRD-000 dev setup uses `next dev --turbopack` over HTTPS via local cert.
- **Test setup:** `site/tests/setup.ts` (jsdom + `@testing-library/jest-dom` matchers).
- **No new scaffold for PRD-001.** PRD-000 install continues per ADR-0002. Verify scaffold integrity via the `sitecore:setup-scaffold` decision-tree only if scaffold suspicion arises. The existing `site/` tree is correct.
- **Component installs (verify each at start of relevant tranche):**
  - `npx shadcn add @blok/dropdown-menu` (LanguagePicker, TopActionRow overflow) — check `components/ui/dropdown-menu.tsx` exists; it does per PRD-000 inventory.
  - `npx shadcn add @blok/combobox` — may need install for picker search.
  - `npx shadcn add @blok/radio-group` — needed for DeleteScopeConfirmModal + CopyFromSourceStep.
  - `npx shadcn add @blok/scroll-area` — needed for import preview horizontal scroll; check existing (it does — `components/ui/scroll-area.tsx`).
  - `@blok/alert`, `@blok/dialog`, `@blok/input`, `@blok/table`, `@blok/badge`, `@blok/select`, `@blok/skeleton`, `@blok/separator`, `@blok/tooltip`, `@blok/popover`, `@blok/sonner` — all already installed per PRD-000 inventory at `site/components/ui/`.
- **Forbidden (carries from PRD-000):**
  - `experimental_createXMCClient` (would imply Mode B — supersedes ADR-0002).
  - Server-side OAuth proxy.
  - `@auth0/nextjs-auth0`.
  - Any new state-management library (no Zustand, no Jotai, no Redux).
  - Any new third-party HTTP client (the SDK is the only client).

### 4c-4. UI implementation notes

- **Winning POC clickdummy:** `products/redirect-manager/pocs/poc-v1-prd001/` — 14 HTML frames, ~115 click targets enumerated in `pocs/poc-v1-prd001/click-targets.md`. **Canonical visual source of truth.** When spec text and clickdummy diverge on look-and-feel, the clickdummy wins. Open the HTML frames directly during component implementation to match visuals. QA Specialist's host-frame visual smoke (§ 9.7) uses these 14 frames as the comparison baseline — do not modify or delete POC files during implementation.

  The 10 frames directly mapped to PRD-001 new components are: `index.html` (picker closed), `full-page-de.html` (picker open), `create-version-modal.html`, `create-version-copy-from-source.html`, `delete-modal-multi.html`, `delete-modal-single.html`, `partial-version-banner.html`, `context-panel-de.html`, `context-panel-en.html`, `dashboard-widget.html`.
- **Theme:** Inherits PRD-000 `theme.css` verbatim — Blok Nova preset. Dark-mode `--primary-foreground` override in `app/globals.css` carries forward. New CSS in any component uses only existing semantic tokens (`--card`, `--border`, `--primary`, `--primary-background`, `--accent`, `--muted`, `--muted-foreground`, `--destructive`, `--destructive-foreground`, `--ring`, `--popover`, `--info-100`, `--info-500`, `--shadow-sm`, `--shadow-lg`, `--radius-sm`, `--radius-lg`).
- **Typography:** `--font-sans` (Geist Sans) for everything except code-like content; `--font-mono` (Geist Mono) for the ISO code chip in the picker. `--text-2xl font-weight-600` for the picker label container + map detail header title. `--text-base` for body and list rows. `--text-sm` for secondary copy. `--text-xs` for badges + code chips.
- **Topbar picker:** sticky `h-16`, `--card` bg, `--border` border-b. Picker trigger: `~280px` wide, `h-12 px-4`, `--card` bg, `--border` outline. Chip: `font-mono text-xs --primary-background bg --primary text px-2 py-0.5 rounded-sm`. Native name: `text-base font-weight-500`. Chevron: Lucide `ChevronDown size-4 --muted-foreground` rotates 180° on open.
- **Map list dot indicator:** 8px diameter (`size-2 shrink-0`) inline SVG; `fill="currentColor"` filled / `stroke="currentColor" strokeWidth="2"` outlined; inherits parent row's text color so it adapts to theme + selected state.
- **Map list row:** `h-12 px-3 gap-3 flex items-center`. Hover: `bg-muted`. Selected: `bg-accent` + 3px left border in `--primary` + `font-weight-600` on title. Focus: `--ring` 2px outline offset 2px.
- **CreateVersionModal step 1:** Two CTA cards (`@blok/button` variant=outline, size=lg), `h-32`, side-by-side at ≥640px, stacked below. Lucide `FileText` for empty (size-8), Lucide `Copy` for copy-from. Hover: border `--primary`, bg `--accent`, icon `--primary`.
- **CreateVersionModal step 2:** `@blok/radio-group` source picker — only non-empty source languages. Single non-empty source = pre-selected. Info alert with copy *"Mappings will be copied from [source]. Flags and redirect type are shared across all languages and apply automatically."*
- **DeleteScopeConfirmModal:** Two radios as cards (label + description). Strict no-default. Single-version edge case: explanatory note under radios. Hard-fail variant: only option (b) with adjusted copy. Cleanup-from-banner: pre-select radio (a) (only branch deviating from strict).
- **DisplayNameEditor:** Static title `text-2xl font-weight-600`. Pencil Lucide `Pencil size-4 text-muted-foreground` hover-fade desktop / always-visible touch. Editing: input + Save (primary sm) + Cancel (ghost sm). Empty: italic muted placeholder *"(no display name for [language] — add one)"* as real text (not just `placeholder` attr).
- **PartialVersionBanner:** `@blok/alert` variant=warning. Two `@blok/button` size-sm CTAs. `role="alert"`. Persistent until operator acts.
- **PagesAwareBanner:** `@blok/alert` variant=info. `role="status"` + `aria-live="polite"`. Two copy variants (en / non-en). Non-dismissible.
- **DashboardWidget:** auto-fit grid `minmax(220px, 1fr)`. Three tiles. Footnote in `text-xs muted-foreground`. Picker chip read-only.
- **ImportPreviewTable:** `@blok/table` + sticky-left first column + `@blok/scroll-area` horizontal. Cell badges: `--success-background` create, `--warning-background` overwrite, `--muted` unchanged/skip, `--destructive-background` conflict.
- **Iframe widths:** Full Page 1024–1920px (two-pane optimum at ≥1280); Dashboard 300–800px (tile auto-fit); Context Panel 320–400px (single column).
- **Touch targets:** picker trigger 48×≥160; row 48px tall full-width; pencil 32×32 (sub-target, mitigated by row click); modal buttons 40px×≥96.
- **Motion:** picker dropdown 120ms slide+fade (Radix default); reduced-motion respects via `@media (prefers-reduced-motion: reduce)` → 0ms.
- **POC click-targets file:** `pocs/poc-v1-prd001/click-targets.md` enumerates every clickable element with its post-state frame. Use as cross-reference when wiring interactive flows.

### 4c-5. File / module structure and naming conventions

- **New SDK wrappers** (`site/lib/sdk/`):
  - `languages.ts` (T002, T003) — `getSiteLanguages`, `listTenantLanguages`, `resolveEnumeratedLanguages`.
  - `redirects-version.ts` (T011, T012, T013) — `addRedirectMapVersion`, `deleteRedirectMapVersion`, `copyFromAnotherLanguage`, `DELETE_VERSION_AVAILABLE`.
  - `dashboard-aggregation.ts` (T036) — `aggregateLanguagesWithContent`.
- **Extended SDK wrappers** (in place):
  - `redirects-read.ts` (T008, T009) — `language` variable, `Display_Name` alias, `listVersionsByLanguage` export.
  - `redirects-write.ts` (T010) — `language` arg, `displayName` field, templateFieldId fallback.
- **New picker layer:**
  - `site/lib/picker/language-picker-state.ts` (T004) — pure storage helpers + Zod schema for `PickerState`.
  - `site/hooks/use-language-picker.ts` (T005) — React hook (first file in new `hooks/` directory).
  - `site/hooks/use-dirty-edits.ts` (T006) — dirty-edit detection hook.
- **New import/export layer** (`site/lib/import-export/`):
  - `schema-v2.ts` (T029) — Zod v2 schema.
  - `v1-detect.ts` (T030) — pre-validator for v1 rejection.
  - `serialize-v2.ts` (T031) — multi-language bundle exporter (replaces `serialize.ts`).
  - `diff-v2.ts` (T032) — language-axis diff (replaces `diff.ts`).
  - `apply-v2.ts` (T033) — per-language apply executor (replaces `apply.ts`).
  - **Removed in same commits:** `schema.ts`, `diff.ts`, `apply.ts`, `serialize.ts` (v1).
- **New components** (`site/components/full-page/` and `site/components/context-panel/`):
  - `full-page/LanguagePicker.tsx` (T014, T015)
  - `full-page/LanguageVersionIndicator.tsx` (T016)
  - `full-page/CreateVersionModal.tsx` (T023)
  - `full-page/CopyFromSourceStep.tsx` (T024)
  - `full-page/DeleteScopeConfirmModal.tsx` (T027) — replaces `DeleteMapConfirmModal.tsx`
  - `full-page/DisplayNameEditor.tsx` (T021)
  - `full-page/PartialVersionBanner.tsx` (T026)
  - `context-panel/PagesAwareBanner.tsx` (T037)
- **Modified components** (in place):
  - `full-page/FullPage.tsx` (T038) — top-level orchestration.
  - `full-page/RedirectMapList.tsx` (T017) — dot + display-name fallback.
  - `full-page/RedirectMapDetail.tsx` (T019) — 3 modes + DisplayNameEditor host.
  - `full-page/ImportRedirectMapModal.tsx` (T034) — v2 wizard.
  - `dashboard-widget/DashboardWidget.tsx` (T035) — strict current-language tiles.
  - `context-panel/ContextPanel.tsx` (T037b) — mount PagesAwareBanner.
- **Removed components** (in same commits):
  - `full-page/DeleteMapConfirmModal.tsx` — replaced by DeleteScopeConfirmModal.
- **Domain types** (extended in place): `site/lib/domain/types.ts` (T039).
- **Tests:** co-located convention from PRD-000:
  - Unit: `site/tests/unit/<area>/<name>.test.ts` (e.g. `tests/unit/sdk/languages.test.ts`, `tests/unit/picker/language-picker-state.test.ts`, `tests/unit/import-export/schema-v2.test.ts`).
  - UI: `site/tests/ui/<surface>/<Component>.test.tsx`.
  - Structural: `site/tests/structural/structural-guards.test.ts` (extended in T040).
  - Fixtures: `site/tests/fixtures/graphql/*.json` (T001 captures land here).
- **Naming conventions** (PRD-000 carry):
  - Components: `PascalCase.tsx`.
  - Hooks: `use-kebab-case.ts`.
  - Pure modules: `kebab-case.ts`.
  - Tests: `.test.ts` / `.test.tsx` co-located in `tests/` mirror tree (NOT alongside source — PRD-000 convention; do not change to source-adjacent).

### 4c-6. Integration and API contract notes

All SDK calls below cite `.d.ts` paths per rule `40-sdk-contracts`. Body shapes for `addItemVersion` and `deleteItemVersion` are NOT in the `.d.ts` (the SDK passes the GraphQL body through opaquely); their shape is captured at T001 and fixtures pinned at `tests/fixtures/graphql/*.json`.

**SDK fixture citation rule (QA-enforced, non-negotiable):** Every fixture file that models an SDK request/response MUST include a provenance comment in either the `.json` file itself (as a companion `.meta.md`) or in the test file that loads it. The accepted citation forms are:

```
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → <type> (line ~N)
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData (line 2)
// source: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContextPageInfo.language
// source: real-tenant capture T001 2026-05-13 → tests/fixtures/graphql/<name>.json
// source: sitecore:sitecoreai-graphql-schemas § 1.7
// assumed-shape pending T001 capture OQ-A1 — <addItemVersion or deleteItemVersion body/payload shapes not in .d.ts>
```

Fixtures lacking any citation form are rejected at code review. A test that passes against a made-up fixture shape can fail catastrophically on a real tenant (the QuickCopy v0.1 failure mode — see § 9.2).

**Host-frame visual smoke skill:** For host-frame visual testing at `/test` time, invoke `sitecore:marketplace-sdk-host-frame-testing`. That skill provides the full recipe: interactive SSO, iframe bounding-box clip, cross-origin Playwright locator pattern, and the five-axis comparison against the POC clickdummy. Inputs required from operator: host URL + app origin. Do NOT proceed with visual testing if either is missing. Auth is always interactive — never script SSO. Serve the POC clickdummy via `npx serve pocs/poc-v1-prd001/` for the comparison side (Playwright MCP rejects `file://` URLs).

```typescript
// ──────────────────────────────────────────────────────────────────────
// 1) xmc.sites.listLanguages — TENANT-WIDE FALLBACK ONLY
// ──────────────────────────────────────────────────────────────────────
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts
//        → Sites.ListLanguagesResponse (line ~1693) = Array<Sites.Language>
//        → Sites.Language (line ~454) — fields: id, iso, regionalIsoCode, fallbackLanguageIso,
//          name, displayName, nativeName, englishName, baseIsoCultureCode
// verb: client.query (xmc module query)
// unwrap: DOUBLE .data.data  (xmc module query envelope per skill marketplace-sdk-client § 8b)
// body location: n/a (no body — only sitecoreContextId in params.query)
const result = await client.query('xmc.sites.listLanguages', {
  params: { query: { sitecoreContextId } },
});
const languages = (result as { data?: { data?: Sites.Language[] } }).data?.data ?? [];

// ──────────────────────────────────────────────────────────────────────
// 2) Sites.Site.languages — SITE-SCOPED PREFERRED (no SDK round trip)
// ──────────────────────────────────────────────────────────────────────
// shape: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts
//        → Sites.Site.languages (line ~1019, typed Array<string> | null)
// access: property on the already-fetched Sites.Site (from listSites in lib/sdk/sites.ts).
function getSiteLanguages(site: Sites.Site): string[] {
  return site.languages ?? [];
}

// ──────────────────────────────────────────────────────────────────────
// 3) xmc.authoring.graphql — addItemVersion (NEW)
// ──────────────────────────────────────────────────────────────────────
// envelope source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts
//                  → Authoring.GraphqlData     (line ~2)   — request body shape
//                  → Authoring.GraphqlResponse (line ~40)  — response shape
// verb: client.mutate (xmc.authoring.graphql is ALWAYS mutate, even for queries)
// unwrap: DOUBLE .data.data  (xmc.authoring.graphql envelope — verified 2026-05-11)
// body location: INSIDE params  (params-wrapper trap per marketplace-sdk-client § 8b)
// GraphQL verb: addItemVersion — confirmed in skill sitecoreai-graphql-schemas § 1.7
//   Mutation surface table: "addItemVersion(input: AddItemVersionInput!) — Add new version (clone of source)"
// PAYLOAD/INPUT SHAPE NOT IN .d.ts — captured at T001 (Tranche 1 probe pass).
// Per PRD § 13 R-1 decision rule: if verb absent / unworkable at T001,
//   US-6 / US-7 / US-11-create CUT from PRD-001.
const ADD_REDIRECT_MAP_VERSION = `
  mutation AddRedirectMapVersion($input: AddItemVersionInput!) {
    addItemVersion(input: $input) {
      item { itemId language { name } version }
    }
  }
`;
const result = await client.mutate('xmc.authoring.graphql', {
  params: {
    query: { sitecoreContextId },
    body: {
      query: ADD_REDIRECT_MAP_VERSION,
      variables: { input: { itemId, language /*, optional: version (source) per T001 capture */ } },
    },
  },
});
const data = result.data?.data as { addItemVersion?: { item?: { version?: number } } } | undefined;

// ──────────────────────────────────────────────────────────────────────
// 4) xmc.authoring.graphql — deleteItemVersion (NEW)
// ──────────────────────────────────────────────────────────────────────
// envelope source: same as #3
// GraphQL verb: deleteItemVersion — confirmed in skill sitecoreai-graphql-schemas § 1.7
// PAYLOAD/INPUT SHAPE NOT IN .d.ts — captured at T001.
// Per PRD § 13 R-1: if verb absent / unworkable, US-8(a) CUT; modal copy adjusts per AC-8.4.
const DELETE_REDIRECT_MAP_VERSION = `
  mutation DeleteRedirectMapVersion($input: DeleteItemVersionInput!) {
    deleteItemVersion(input: $input) { successful }
  }
`;
const data = result.data?.data as { deleteItemVersion?: { successful?: boolean } } | undefined;

// ──────────────────────────────────────────────────────────────────────
// 5) xmc.authoring.graphql — versionsByLanguage discovery (NEW, for detail-view)
// ──────────────────────────────────────────────────────────────────────
// envelope source: same as #3
// GraphQL: Item.versions(allLanguages: Boolean!): [Item!]!
//   shape source: skill sitecoreai-graphql-schemas § 1.3 ("one Item per version of the same item")
// Cost: measured at T001 OQ-A5 against ≥3-version map. If slow, swap to a summary query.
const ITEM_VERSIONS_BY_LANGUAGE = `
  query ItemVersionsByLanguage($itemId: ID!) {
    item(where: { itemId: $itemId }) {
      versions(allLanguages: true) {
        language { name }
        version
        fields(excludeStandardFields: false, ownFields: false, withLanguageFallback: false) {
          nodes { name value }
        }
      }
    }
  }
`;

// ──────────────────────────────────────────────────────────────────────
// 6) xmc.authoring.graphql — extended updateItem (writes __Display name)
// ──────────────────────────────────────────────────────────────────────
// existing source pattern: site/lib/sdk/redirects-write.ts:97 (UPDATE_REDIRECT_MAP — captured 2026-05-11)
// envelope: DOUBLE .data.data; body INSIDE params.
// fields[] array entry: { name: "__Display name", value: <localized name> }
// IMPORTANT — per OQ-A3 capture (T001): if the literal name "__Display name" rejects,
// fall back to the field's templateFieldId GUID (resolved via itemTemplate introspection,
// memoized per sitecoreContextId for the session). T010 implements both code paths;
// T001 decides which ships.

// ──────────────────────────────────────────────────────────────────────
// 7) xmc.authoring.graphql — extended GET_REDIRECTS_FOR_SITE (Display_Name aliased + $language)
// ──────────────────────────────────────────────────────────────────────
// existing pattern: site/lib/sdk/redirects-read.ts:180 — aliased field(name:) accessor.
// New alias: Display_Name: field(name: "__Display name") { value }
// New variable: $language: String!  (replaces hardcoded "en")
// GraphQL alias rule: cannot start with __ — alias to Display_Name (Pascal/snake hybrid).

// ──────────────────────────────────────────────────────────────────────
// 8) pages.context — pageInfo.language (NEW USAGE — promoted from captured-but-unused)
// ──────────────────────────────────────────────────────────────────────
// shape: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts
//        → PagesContextPageInfo.language (typed: string | null)
// verb: client.query('pages.context', { subscribe: true })  (already wired in PRD-000)
// unwrap: SINGLE .data  (pages.context subscription — callback receives PagesContext directly)
// usage: read pageInfo.language inside PagesAwareBanner (T037) to switch banner copy.
//        No new subscription — read from the existing one in components/providers/marketplace.tsx.
```

**Authoring-related envelope quirks (carry from PRD-000 verification 2026-05-11):**

- Every `xmc.authoring.graphql` operation rides `client.mutate` (NOT `client.query`), regardless of whether the underlying GraphQL is a query or a mutation.
- Body lives INSIDE `params.body`, NOT at the top level of the SDK call payload.
- Response unwrap is DOUBLE `.data.data`, NOT single. Single-unwrap is the legacy / wrong path corrected by ADR-0019.

**Hard-fail commitments per PRD § 13 R-1 + ADR-0019 (no silent fallback):**

- `addItemVersion` absent at T001 → cut US-6, US-7, US-11-create. Implement only `lib/sdk/redirects-version.ts` `deleteRedirectMapVersion` stub if `deleteItemVersion` present; otherwise no version mutations land at all.
- `deleteItemVersion` absent at T001 → set `DELETE_VERSION_AVAILABLE = false`; delete modal hides option (a) per AC-8.4; copy-from rollback degrades to `populate-failed-no-rollback` state per ADR-0021.

**Mandatory T001 probe pass:** real-tenant capture of `addItemVersion` + `deleteItemVersion` input/payload shapes + field-versioning matrix + `__Display name` accessor literal-vs-templateID, closing architecture § 10 OQ-A1..A5. ~30-min operator session against `CHAH DevEx Journey / PROD` (or operator-supplied multilingual tenant per PRD OQ-7). Output: fixtures in `tests/fixtures/graphql/*.json` + `docs/decisions.md` capture entries. **No downstream task starts until T001 lands.**

### 4c-7. Parity / rebuild pointers

**N/A — greenfield PRD-001 is an additive feature delta on the existing PRD-000 app, not a rebuild from a legacy source.** The "baseline" is the live `site/` codebase at HEAD; tasks extend or modify in place. No `source.analysis_mode == rebuild` artifact, no per-route parity matrix, no asset-bundle reconstitution.

---

## 5. Dependencies

### Ordering constraints

- **T001 (Tranche 1 capture pass) blocks every SDK wrapper task** (T002, T008, T010, T011, T012, T029, T041). Per PRD § 13 R-1 + R-2: the field-versioning matrix and verb input shapes are hard prerequisites, not progressive.
- **`addRedirectMapVersion` (T011) and `deleteRedirectMapVersion` (T012) precede `copyFromAnotherLanguage` (T013)** because the rollback state machine sequences both wrappers.
- **SDK wrappers (Epic A) precede UI components** that consume them (Epic C, D, E, F, G, H, I).
- **`useLanguagePicker` (T005) precedes any component that needs `currentLanguage`** — every UI component in Epics C, D, E, F, G transitively depends on it.
- **`DeleteScopeConfirmModal` (T027) precedes `PartialVersionBanner` (T026)** — the banner's cleanup CTA opens the modal with `forceLanguageOnlyPreSelected: true`.
- **All visual components precede `FullPage` orchestration (T038)** — T038 wires them together at the top.
- **Schema v2 (T029) precedes diff-v2 (T032) and apply-v2 (T033) and serialize-v2 (T031)** — they all consume the schema's types.
- **Structural guards (T040) MAY run early-or-late but require the target files exist first** — placed after the file deletions / additions land.
- **Smoke prep (T042) and doc captures (T041) are the final pass** — they refer to the fully-wired implementation.

### Execution order (topological — all 41 Task IDs)

Execution proceeds strictly in this order. Parallel groups noted below for the Team Lead to spawn concurrent Developer agents where independent tasks share the same dependency frontier.

1. **T001** — Real-tenant probe pass (Tranche 1; blocking gate)
2. **T039** — Extend `lib/domain/types.ts` (no SDK deps; could run pre-T001 but listed here so types align with capture)
3. **T002** — `lib/sdk/languages.ts` core
4. **T003** — `resolveEnumeratedLanguages` selector
5. **T004** — `lib/picker/language-picker-state.ts`
6. **T006** — `hooks/use-dirty-edits.ts`
7. **T008** — Extend `redirects-read.ts`
8. **T010** — Extend `redirects-write.ts`
9. **T009** — Display_Name decode update (depends on T008)
10. **T011** — `addRedirectMapVersion`
11. **T012** — `deleteRedirectMapVersion`
12. **T013** — `copyFromAnotherLanguage` state machine
13. **T005** — `use-language-picker` hook
14. **T016** — `LanguageVersionIndicator` dot
15. **T036** — `dashboard-aggregation.ts`
16. **T014** — `LanguagePicker` component (depends on T003, T005, T006)
17. **T021** — `DisplayNameEditor` (depends on T010)
18. **T015** — LanguagePicker error + loading states
19. **T017** — Update `RedirectMapList` (dot + fallback label)
20. **T027** — `DeleteScopeConfirmModal` (depends on T012, T020)
21. **T029** — `schema-v2.ts` Zod schema
22. **T030** — `v1-detect.ts` pre-validator
23. **T037** — `PagesAwareBanner` component
24. **T020** — `versionsByLanguage` orchestration glue (depends on T008)
25. **T031** — `serialize-v2.ts`
26. **T032** — `diff-v2.ts`
27. **T033** — `apply-v2.ts`
28. **T019** — Update `RedirectMapDetail` (3-mode renderer; depends on T010, T020, T006, T039)
29. **T022** — Wire DisplayNameEditor into detail header
30. **T023** — `CreateVersionModal` step 1
31. **T024** — `CopyFromSourceStep` step 2
32. **T025** — Wire CreateVersionModal into RedirectMapDetail no-version state
33. **T026** — `PartialVersionBanner` (depends on T013, T027)
34. **T018** — Two-state UX routing in list → detail
35. **T028** — Replace `DeleteMapConfirmModal` call sites with `DeleteScopeConfirmModal`
36. **T034** — Update `ImportRedirectMapModal` (4-step wizard, language columns)
37. **T035** — Update `DashboardWidget` (strict-current tiles)
38. **T038** — Update `FullPage.tsx` orchestration (depends on every visual component)
39. **T037b** — Mount `PagesAwareBanner` in `ContextPanel.tsx`
40. **T007** — Verify cross-tab `storage` event propagation (operator step; depends on T005 + T038)
41. **T040** — Extend structural guards
42. **T041** — `docs/decisions.md` captures + JSDoc sync
43. **T042** — Smoke checklist + live-walkthrough prep

(43 numbered steps; T039 is unnumbered above as the 2nd entry — total 43 entries cover all 41 unique Task IDs plus T037b which is a small route-wiring extension to T037. T037b shares ID prefix with T037 by convention.)

### Parallel groups (Team Lead may spawn concurrent Developers)

```
Group 1 (sequential — Tranche 1 gate):
  T001

Group 2 (sequential — types + pure modules, no SDK roundtrip):
  T039, T004, T006

Group 3 (parallel — depends on T001 + T039; pure SDK wrappers):
  T002, T008, T010
  ↳ T003 follows T002; T009 follows T008

Group 4 (parallel — depends on Group 3; version-mutation wrappers):
  T011, T012 in parallel; T013 after both

Group 5 (parallel — depends on T004, T003; picker layer):
  T005

Group 6 (parallel — leaf-component visuals; depend on Group 3 outputs only):
  T016, T021, T030, T036, T037, T029

Group 7 (sequential — orchestration glue):
  T020 (after T008)

Group 8 (parallel — depends on Groups 3–7):
  T014 + T015 (LanguagePicker)
  T017 (RedirectMapList)
  T019 (RedirectMapDetail)
  T027 (DeleteScopeConfirmModal)
  T031 (serialize-v2)
  T032 (diff-v2)
  T033 (apply-v2 — depends on T032)
  T035 (DashboardWidget — depends on T014, T036)

Group 9 (parallel — depends on Group 8):
  T022, T023, T024, T028
  T034 (ImportRedirectMapModal — depends on T029, T030, T031, T032, T033)

Group 10 (sequential — depends on T013 + T027):
  T026 (PartialVersionBanner)
  T025 (Wire CreateVersionModal into detail no-version)
  T018 (Two-state UX routing — depends on T017 + T019)

Group 11 (sequential — top-level orchestration):
  T038 (FullPage — depends on all visual components)
  T037b (Context Panel route wiring)

Group 12 (sequential — final pass):
  T007 (cross-tab verification, depends on T005 + T038)
  T040 (structural guards)
  T041 (docs)
  T042 (smoke prep)
```

For a solo developer (default per repo convention), Group ordering still matters but parallel execution is informational.

---

## 6. Suggested Milestones

PRD-001 implementation tranches into **nine milestones**, with Tranche 1 being a non-skippable real-tenant gate per PRD § 13 R-1 + R-2.

| Tranche | Title | Tasks | Gate criterion |
|---|---|---|---|
| **1** | Real-tenant capture pass | T001 | All 5 OQ-A captures land; verb confirmations + matrix decisions logged in `docs/decisions.md`; R-1 + R-2 decisions made |
| **2** | SDK layer | T002, T003, T008, T009, T010, T011, T012, T013, T036, T039 | All SDK wrappers green-tested (unit) with captured fixtures |
| **3** | Picker state + hook + structural guard | T004, T005, T006 | `useLanguagePicker` round-trips state through `localStorage` + handles invalid state + cross-tab |
| **4** | Map list + detail + display-name editing | T014, T015, T016, T017, T018, T019, T020, T021, T022 | List dots render correctly; 3-mode detail pane works; display-name editor satisfies AC-9.x |
| **5** | Create-version flow + rollback + partial banner | T023, T024, T025, T026 | Empty path lands; copy-from path exercises all 4 `CopyFromResult.state` branches; partial-version banner with CTAs |
| **6** | Delete scope safety | T027, T028 | Strict-no-default modal; single-version edge case; hard-fail variant when `DELETE_VERSION_AVAILABLE === false`; cleanup-from-banner exception |
| **7** | Dashboard scoping + Context Panel banner | T035, T037, T037b | Dashboard tiles strict-current; "Languages with content" tile; Pages-aware banner switches copy on language change |
| **8** | Import/export schema v2 | T029, T030, T031, T032, T033, T034 | v2 round-trip works; v1 rejected; language-columns preview renders; per-language apply executes |
| **9** | Tests + structural guards + smoke prep | T007, T038 (FullPage orchestration), T040, T041, T042 | Build + lint + typecheck + vitest all green; structural guards pass; smoke checklist authored; cross-tab verified; docs updated |

Note that T038 (FullPage orchestration) lands in Tranche 9 because it's the final wiring step — many tranches deliver their components but FullPage glues them together. A pragmatic alternative: land a thin T038 in Tranche 4 that mounts the picker + list + detail and grows in subsequent tranches as new components arrive. The Developer (08) may choose either staging; the listed dependency graph supports both.

---

## 7. Risk Areas

| Risk | Trigger | Mitigation |
|---|---|---|
| **R-impl-1** | T001 capture reveals `addItemVersion` absent or unworkable | Per PRD § 13 R-1: cut US-6, US-7, US-11-create. Mark T011, T013, T023, T024, T025 as CUT in the run manifest before Tranche 2 starts. Re-issue task breakdown delta. |
| **R-impl-2** | T001 capture reveals `deleteItemVersion` absent | Per PRD § 13 R-1: `DELETE_VERSION_AVAILABLE = false`. T012 stub-throws. T027 delete modal renders hard-fail variant only. T013 degrades to `populate-failed-no-rollback`. T026 PartialVersionBanner ships but its "Delete `[language]` version" CTA is hidden (only "Add mappings manually" remains). |
| **R-impl-3** | T001 capture reveals field-versioning matrix surprise (any assumed-shared field is actually versioned, or vice versa) | Per architecture § 4.3 + ADR-0015 amendment: schema v2 `shared` vs `languages.<code>` split adjusts inline. Affected tasks: T029 (schema-v2 shape), T031 (serialize-v2 placement), FR-21 UI hint copy in T019/T024. Bounded — worst case is all four flags move under `languages.<code>` and `shared` reduces to `itemName + guid`. |
| **R-impl-4** | `__Display name` write rejects literal name `__Display name` (OQ-A3) | T010 falls back to `templateFieldId` GUID resolved via one-shot `itemTemplate` introspection memoized per session. T021 (DisplayNameEditor) behavior unchanged. |
| **R-impl-5** | `versions(allLanguages: true)` query is expensive on real tenants (OQ-A5) | If T001 measures >2s, design a lighter "summary" query that returns just `{ language { name } version }` without `fields { nodes }`. Compute `nonEmptyVersionsByLanguage` via a follow-on per-language `listRedirectsForSite` call when copy-from is initiated (lazy-fetched on demand instead of eagerly). |
| **R-impl-6** | Cross-tab `storage` event listener leaks subscriptions (T005) | Use `useEffect` cleanup to `removeEventListener` on unmount. Add a `tests/ui/hooks/use-language-picker.test.tsx` regression for "subscription count stays at 1 across multiple mount cycles". |
| **R-impl-7** | Picker becomes disabled during long save and operator clicks rapidly switching maps | Compound state from `useDirtyEdits` + ongoing save promise. The picker `disabled` prop must be the union of "dirty edits exist" OR "save in flight". `RedirectMapDetail` tracks both; FullPage threads both into LanguagePicker. |
| **R-impl-8** | Schema v2 break-compat causes existing PRD-000 install to throw on first import attempt with a v1 file | v1-detect (T030) runs BEFORE Zod parsing → friendly error per FR-13 / AC-11.6. Confirmed by unit test (T030 case set). |
| **R-impl-9** | `Promise.all` rate-limit on Dashboard cross-language aggregation (T036) overwhelms Authoring API | If T036's parallel reads hit 429 in real-tenant smoke, add a chunking helper (batch size 3) to `aggregateLanguagesWithContent`. Defer until smoke verifies. |
| **R-impl-10** | `DeleteScopeConfirmModal` cleanup-from-banner pre-select branch silently changes the strict-no-default rule for normal flow | Structural guard T040 step 3 grep-asserts the `forceLanguageOnlyPreSelected` prop is the ONLY way to set a default. Code review check: prop is opt-in, default `false`. |
| **R-impl-11** | Test setup hits real tenant by accident if `process.env.SITECORE_*` is set | All tests use mocked `ClientSDK` instances (existing PRD-000 pattern in `tests/unit/sdk/`). T001 capture is the ONLY task that hits a real tenant — it's an operator-supervised step, not an automated test. |
| **R-impl-12** | Picker key collision between PRD-001 v1 and a future PRD's v2 in the same browser | ADR-0022 + structural guard T040 step 2 enforce the v1 contract has no `.v1.` segment. Future PRD writes to `.v2.` namespace; reads both during transition window. |

---

## 8. Suggested Team Structure

PRD-001 is implemented by a **solo Developer** per repo convention (per memory `feedback_no_active_file` + workflow style). The Team Lead may spawn parallel Developer agent contexts only when § 5 parallel-groups warrant it AND there is no shared file conflict between branches. Recommended pacing:

- **Tranche 1 (T001):** operator-supervised real-tenant session, ~30 min.
- **Tranches 2–3 (T002..T013, T036, T039, T004..T006):** SDK + state layer, 1–2 sessions.
- **Tranches 4–7 (T014..T028, T035, T037, T037b):** UI components, 2–3 sessions.
- **Tranche 8 (T029..T034):** import/export, 1–2 sessions.
- **Tranche 9 (T007, T038, T040..T042):** integration + structural + docs, 1 session.

QA Specialist (07) enriches this file in place with TDD ordering + per-task test specs in §§ 9–10. Developer (08) consumes the enriched file + `prd-minimal-001.md` only.

---

## 9. TDD and quality contract

*QA Specialist (07) — enriched 2026-05-13. This section is the non-negotiable quality law for all PRD-001 implementation work.*

---

### 9.1 RED → GREEN → REFACTOR mandate

Every implementation task that produces behavioral code goes through RED → GREEN → REFACTOR in sequence. The definition of "behavioral code" for this project:

- **RED:** A failing test that asserts the exact observable behavior the task is supposed to deliver. The test must fail for the right reason — not a compilation error, not an import error, but the right assertion failing against a missing or incorrect implementation.
- **GREEN:** The minimum implementation that makes the RED test pass without cheating (no `return hardcoded` unless it's a deliberate stepping-stone, no skipped assertions).
- **REFACTOR:** Clean up the implementation (naming, extracting helpers, removing duplication) while keeping the test suite green.

This discipline applies at every layer:
- **Unit layer:** pure functions, SDK wrappers, picker-state module.
- **Integration layer:** `copyFromAnotherLanguage` state machine exercising multiple SDK wrappers together with fixture data.
- **UI layer:** components tested via `@testing-library/react` + Vitest + jsdom.
- **Structural layer:** structural guards verify file-system and source-code invariants — the structural test IS the deliverable for structural guard tasks (the test and the "implementation" are the same artifact).
- **E2E / smoke layer:** operator-supervised manual smoke gates (§ 9.5) — TDD cycle does not apply but acceptance criteria must be explicitly articulated before the smoke session.

---

### 9.2 SDK fixture provenance — non-negotiable rule

Every test fixture that models an SDK request or response shape must carry one of the following provenance citations, in the file itself as a comment or a `.meta.md` companion (matching the PRD-000 pattern at `tests/fixtures/graphql/*.meta.md`):

```
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListLanguagesResponse (line ~1693)
// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData (line 2)
// source: node_modules/@sitecore-marketplace-sdk/client/dist/sdk-types.d.ts → PagesContextPageInfo.language
// source: real-tenant capture T001 2026-05-13 → tests/fixtures/graphql/add-item-version.json
// source: sitecore:sitecoreai-graphql-schemas § 1.7 (Authoring schema mutation surface)
```

Fixtures WITHOUT a provenance citation are rejected at code review. A fixture with a made-up shape that happens to pass a unit test is the QuickCopy v0.1 failure mode — 167 passing tests, app broken on real tenant on day one.

**Special rule for `addItemVersion` and `deleteItemVersion` body + payload shapes:** These shapes are NOT in any `.d.ts` file (the SDK passes the GraphQL body through opaquely — the envelope is typed but the operation content is not). Until T001 real-tenant capture lands:

- Any unit test written before T001 that exercises these shapes MUST include a fixture-level comment: `// assumed-shape pending T001 capture — see architecture § 5.2 OQ-A1`. The comment must also state the R-1 decision-rule outcome it assumes (e.g., "assumes addItemVersion present — if absent this test is moot per R-1 cut").
- After T001 lands, every assumed-shape comment is replaced with a real-capture citation. Tests that conflict with the captured shape are updated to match — not deleted, because the test contract still applies; only the fixture shape changes.

---

### 9.3 Structural guards — PRD-001 additions

The existing `site/tests/structural/structural-guards.test.ts` (5 guards from PRD-000) is extended in T040 with 5 new guards. The guards are test-first by nature — T040 writes the failing guard test, then the code being guarded must be in place for the guard to pass. T040 is listed in Group 12 (final pass) in § 5, but the guards SHOULD be written before the implementation lands so they function as specification fences:

1. **SDK boundary extension guard** — Confirm `lib/sdk/languages.ts`, `lib/sdk/redirects-version.ts`, `lib/sdk/dashboard-aggregation.ts` are within `ALLOWED_SDK_IMPORTERS` scope (positive-presence assertion).
2. **`localStorage` key shape lock** — Assert the literal prefix `'redirect-manager.language.'` appears in `getPickerState` and `setPickerState` bodies. Assert no `'redirect-manager.language.v'` substring in the v1 implementation (the v1 contract has no version segment per ADR-0022).
3. **Strict no-default delete radio lock** — Parse `DeleteScopeConfirmModal.tsx`; assert no `defaultChecked` prop on any `<input type="radio">` or `defaultValue` prop on any `<RadioGroup>` EXCEPT within a code block that references `forceLanguageOnlyPreSelected` (the ADR-0021 explicit exception). This guard is the enforcement mechanism for ADR-0018 and must never be weakened.
4. **Dashboard parallel-fetch lock** — Parse `lib/sdk/dashboard-aggregation.ts`; assert no bare `await` appears INSIDE `.map(` using a line-scan regex. The aggregation must use `Promise.all([...].map(...))` per NFR-S1.
5. **Schema v2-only lock** — Assert the v1 files `lib/import-export/schema.ts`, `diff.ts`, `apply.ts`, `serialize.ts` no longer exist. Assert `schema-v2.ts` exists. Assert `v1-detect.ts` exists (not deleted by accident). Assert fixture file `tests/fixtures/graphql/add-item-version.json` exists (T001 capture landed).

---

### 9.4 Runtime contrast assertion for theme-token UI

The following new components use Blok Nova theme tokens for foreground/background:

- `LanguagePicker` — ISO chip uses `--primary-background` bg / `--primary` text; disabled state uses opacity.
- `DeleteScopeConfirmModal` — destructive Delete button uses `bg-destructive text-destructive-foreground`.
- `DisplayNameEditor` — Save button uses primary; placeholder text uses muted-foreground.
- `PartialVersionBanner` — warning variant from `@blok/alert`.
- `PagesAwareBanner` — info variant from `@blok/alert`.

For each of these, the UI test for the component MUST include a runtime contrast assertion:

```typescript
// CORRECT — asserts resolved foreground vs background contrast at runtime
const saveBtn = screen.getByRole('button', { name: /save/i });
const style = window.getComputedStyle(saveBtn);
const fg = style.color;
const bg = style.backgroundColor;
// Use a contrast-ratio helper (e.g. `color-contrast-checker` or manual WCAG formula)
// to assert contrast ratio >= 4.5 (AA normal text) or >= 3.0 (AA large text / UI components).
// Alternatively: assert jest-axe passes with the resolved palette.

// WRONG — passes even when --primary-foreground collapsed onto --primary in dark mode
expect(saveBtn).toHaveClass('bg-primary');
```

The PRD-000 structural guard already enforces the `--primary-foreground` override in `globals.css` (guard 3 in the existing suite). The per-component contrast assertion adds a second layer of defence because the structural guard does not catch component-specific palette combinations.

**Blok Nova `--primary-foreground` dark-mode caveat:** the Nova preset has shipped with `--primary-foreground` collapsing onto `--primary` in dark mode (QuickCopy v0.1 — Share Link strip, 2026-04-27). The PRD-000 structural guard checks `globals.css` carries the `var(--color-blackAlpha-900)` override in both `.dark` and `@media prefers-color-scheme: dark` blocks. PRD-001 new components must not introduce any new `bg-primary text-primary-foreground` combination outside a container that inherits this override.

**Color-emoji codepoints are forbidden for state icons.** Any state icon that needs to communicate theme color (error, success, warning, info) must use Lucide-react icons (already in the dependency tree) with `className="text-<semantic-token>"` or inline SVG with `currentColor`. Do not use `❌`, `✅`, `⚠️`, or similar emoji codepoints — they render as OS-native bitmaps that ignore CSS color and dark/light theme entirely (Blok-theming skill § "Color-emoji codepoints are CSS poison for state icons").

---

### 9.5 Accessibility testing (WCAG 2.1 AA)

Every new interactive component must assert the following in its UI test file:

- **`aria-label` / `aria-labelledby`** — LanguagePicker trigger: `aria-label="Language"`. DeleteScopeConfirmModal radio group: `aria-label` per group. DisplayNameEditor input: `aria-label` includes current language name.
- **`aria-disabled="true"`** — LanguagePicker in dirty-edit state must have `aria-disabled="true"` (not just `disabled`; the native `disabled` attribute removes the element from the accessibility tree; `aria-disabled` plus a click handler that does nothing preserves discoverability while blocking the action).
- **`aria-current="true"`** — Selected language in the LanguagePicker dropdown item. LanguageVersionIndicator dot: `aria-hidden="true"` (decorative, meaning comes from row context). Map-list row `aria-label` includes the "has version" / "no version" status in screen-reader-accessible text.
- **`role` on dialogs and alerts** — CreateVersionModal and DeleteScopeConfirmModal use `@blok/dialog` which supplies `role="dialog"` + `aria-modal="true"`. PagesAwareBanner: `role="status"` + `aria-live="polite"`. PartialVersionBanner: `role="alert"` (assertive — operator needs to see this).
- **Focus trap in modals** — CreateVersionModal and DeleteScopeConfirmModal implement focus-trap via Radix Dialog primitive (Blok's underlying engine). UI tests should assert that the first interactive element in the modal receives focus on open.
- **Keyboard navigation** — LanguagePicker: Tab enters the trigger, Enter/Space opens the dropdown, arrow keys navigate items, Enter selects, Escape closes. DisplayNameEditor: Tab to pencil, Enter/Space activates edit mode, Enter saves, Escape cancels.
- **Focus-visible** — The existing PRD-000 structural guard bans `outline-none` without a paired `focus-visible:` class. PRD-001 code must satisfy this guard — no new exemptions without an explicit comment and justification.

Use `@testing-library/jest-dom` + Vitest's `jsdom` environment. For accessibility auditing of complex composite components, add `jest-axe` assertions:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('DeleteScopeConfirmModal has no axe violations', async () => {
  const { container } = render(<DeleteScopeConfirmModal ... />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**jest-axe is not yet installed.** Before writing axe-based tests, add it: `npm install --save-dev jest-axe @types/jest-axe`. If the Lead Developer or Developer has not added this dependency, add it in the first task that requires an axe assertion (T027 — DeleteScopeConfirmModal is the highest-blast-radius component).

---

### 9.6 Meaningful tests vs trivial tests

The distinction matters and is enforced at code review:

| Trivial (rejected) | Meaningful (required) |
|---|---|
| `expect(component).toBeTruthy()` | `expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()` before radio selection |
| `expect(fn).toBeDefined()` | `expect(fn(null, 'de', ['en', 'de'])).toBe('de')` — asserts return value |
| `expect(result.ok).toBe(true)` with no failure path | `expect(result.ok).toBe(false); expect(result.error).toContain('GraphQL error')` |
| Snapshot of entire page | Targeted snapshot of the 8px SVG dot in two states (filled/outlined) |

Every test must:
1. Name the scenario in the `it(...)` description — describe what behavior is being asserted, not what the code does.
2. Assert one observable outcome per test (single-concern tests are easier to diagnose).
3. Cover the failure / edge case, not just the happy path. For every new function, ask: "what happens when the input is null, empty, or wrong?"

---

### 9.7 Marketplace host-frame visual smoke (final gate)

`platform_target == marketplace` in the run manifest. The canonical visual test target is the **clipped iframe inside the live Sitecore Cloud Portal host**, not a standalone localhost render. Standalone rendering is acceptable for initial sanity ("does the app boot?") but cannot substitute for host-frame testing.

**Recipe (from `sitecore:marketplace-sdk-host-frame-testing` skill):**

1. User supplies the host URL (the deep link into Cloud Portal that embeds the app) and the app origin (e.g. `https://localhost:3000` or the deployed URL). These inputs are mandatory — do not guess or fall back to localhost-only.
2. Playwright MCP opens the host URL; agent pauses for interactive SSO; user confirms READY.
3. Playwright locates the app's iframe by `iframe[src*="<app-origin>"]` locator pattern.
4. Playwright clips a screenshot of just the iframe bounding box.
5. For each PRD-001 screen state, compare the clipped screenshot against the corresponding POC frame in `pocs/poc-v1-prd001/` on five axes: layout, typography, color, component anatomy, state fidelity.

**POC comparison requirement:** The winning POC clickdummy is `pocs/poc-v1-prd001/` (14 HTML frames, ~115 click targets). The following POC frames have direct PRD-001 new-component counterparts and must be compared at smoke time:

| POC frame file | PRD-001 component | Smoke state |
|---|---|---|
| `index.html` (topbar picker visible) | `LanguagePicker` | Picker closed, `en` selected |
| `full-page-de.html` (picker open, site + tenant groups) | `LanguagePicker` open | Picker open, site-scoped + tenant-wide groups |
| `create-version-modal.html` (step 1 two cards) | `CreateVersionModal` | Step 1 |
| `create-version-copy-from-source.html` (step 2) | `CopyFromSourceStep` | Step 2, one source pre-selected |
| `delete-modal-multi.html` (3 language versions) | `DeleteScopeConfirmModal` | Multi-version, no radio selected |
| `delete-modal-single.html` (1 version) | `DeleteScopeConfirmModal` | Single-version edge case with note |
| `partial-version-banner.html` | `PartialVersionBanner` | Banner visible with both CTAs |
| `context-panel-de.html` | `PagesAwareBanner` | Non-`en` language copy |
| `context-panel-en.html` | `PagesAwareBanner` | `en` language copy |
| `dashboard-widget.html` | `DashboardWidget` | Three tiles + picker chip |

**`file://` protocol workaround:** Playwright MCP rejects `file://` URLs. Serve the POC from a minimal static server to compare: `npx serve pocs/poc-v1-prd001/` (serves at `http://localhost:5000` by default). Open both the host-frame clip and the served POC in the same Playwright session for side-by-side comparison.

**Do NOT silently promote host-frame screenshots to baselines** if the POC and the implementation diverge. Any divergence must be triage'd: intentional design change → update the POC and note in decisions.md; unintentional drift → raise as a finding and fix before the smoke gate passes.

---

### 9.8 What is OUT of TDD scope (explicit exceptions)

The following tasks are NOT subject to RED → GREEN → REFACTOR because the test IS the deliverable or the task produces no behavioral code:

- **T001 (Real-tenant capture pass):** The capture is an operator-supervised probe, not an automated test. Its output (fixture files + docs/decisions.md) is the deliverable. A structural guard in T040 verifies the fixtures exist on disk.
- **T007 (Cross-tab storage event verification):** This is a manual operator verification step. The behavior cannot be reliably asserted in jsdom (which does not dispatch real `storage` events across tabs). The T005 unit test covers the event handler logic; T007 documents the real-browser confirmation.
- **T040 (Structural guard extensions):** The structural guard tests ARE the test — they verify file-system invariants, not behavioral logic. They do not follow RED → GREEN → REFACTOR because the "implementation" is the code under the guard, not the guard itself. Write the guard first (it will fail if the target code is missing), then implement the code.
- **T041 (Documentation and JSDoc updates):** Docs-only; no test applicable.
- **T042 (Smoke checklist authoring):** Docs-only; no test applicable.

---

## 10. Per-task test specifications

*QA Specialist (07) — enriched 2026-05-13. One specification per Task ID (T001–T042 + T037b). Grouped by epic.*

---

### EPIC J — Real-tenant capture pass

#### T001 — Real-tenant probe pass: closes OQ-A1..A5

| Field | Value |
|---|---|
| **Test type** | manual-smoke + structural |
| **Scenario** | Capture pass produces all 5 fixture files with correct on-disk presence |
| **Expected outcome** | `tests/fixtures/graphql/add-item-version.json`, `delete-item-version.json`, `display-name-write.json`, `field-versioning-matrix.json`, `versions-by-language.json` all exist on disk; each carries a `.meta.md` companion with provenance comment citing the probe date and real-tenant name; `docs/decisions.md` contains the "A-Mutation-Shapes" capture section; R-1 decision outcome (addItemVersion present/absent) documented. |
| **Suggested file** | `site/tests/fixtures/graphql/*.json` (output), `site/tests/structural/structural-guards.test.ts` (guard 5 verifies presence) |
| **Fixture provenance** | Output of this task IS the fixture provenance for all downstream SDK tests. Until T001 lands, all `addItemVersion` / `deleteItemVersion` fixtures are marked `// assumed-shape pending T001 capture`. |
| **TDD applicability** | OUT of TDD scope — operator-supervised probe. Structural guard T040 step 5 is the automated gate. |

---

### EPIC A — SDK layer

#### T002 — `lib/sdk/languages.ts` — core exports

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | `getSiteLanguages` returns empty array for null, undefined, and empty array `site.languages` |
| **Expected outcome A** | `getSiteLanguages({ languages: null })` → `[]`; `getSiteLanguages({ languages: [] })` → `[]`; `getSiteLanguages({ languages: ['en', 'de'] })` → `['en', 'de']` (order preserved). |
| **Scenario B** | `listTenantLanguages` DOUBLE-unwraps `.data.data` and returns typed `Sites.Language[]` |
| **Expected outcome B** | Given a mocked `client.query` returning `{ data: { data: [{ iso: 'en', displayName: 'English' }] } }`, the function returns the array without re-wrapping. Given `{ data: { data: null } }`, returns `[]`. |
| **Suggested file** | `site/tests/unit/sdk/languages.test.ts` |
| **Fixture provenance** | `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts → Sites.ListLanguagesResponse (line ~1693); Sites.Site.languages (line ~1019)` |
| **RED before GREEN** | Write `languages.test.ts` with all failing assertions before creating `languages.ts`. |

#### T003 — `resolveEnumeratedLanguages` selector

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | Returns `{ fallbackMode: false }` when `site.languages` is non-null and non-empty |
| **Expected outcome A** | `resolveEnumeratedLanguages(client, ctxId, siteWith(['en','de']))` → `{ languages: [{iso:'en',...},{iso:'de',...}], fallbackMode: false }`. |
| **Scenario B** | Returns `{ fallbackMode: true }` when `site.languages` is null; calls `listTenantLanguages` |
| **Expected outcome B** | `resolveEnumeratedLanguages(client, ctxId, siteWith(null))` invokes `listTenantLanguages` exactly once and returns all tenant languages with `fallbackMode: true`. |
| **Scenario C** | When `site.languages` contains a single code equal to `'en'` on a tenant that has more languages, fallback is still applied per ADR-0020 fallback policy |
| **Expected outcome C** | Caller receives the fuller tenant-wide list. (This edge case is the primary risk in R-3.) |
| **Suggested file** | `site/tests/unit/sdk/languages.test.ts` (extended from T002) |
| **Fixture provenance** | Same as T002. |

#### T008 — Extend `redirects-read.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | GraphQL query body contains `$language: String!` variable instead of hardcoded `"en"` |
| **Expected outcome A** | When `listRedirectsForSite(client, ctx, path, 'de')` is called, the captured `client.mutate` call receives `variables.input.language === 'de'` (or equivalent depending on query structure). |
| **Scenario B** | `Display_Name` aliased accessor present in query body |
| **Expected outcome B** | The query string passed to `client.mutate` includes `Display_Name: field(name: "__Display name") { value }`. |
| **Scenario C** | `decodeWireItem` extracts `displayName` correctly from all three states |
| **Expected outcome C** | Wire item with `Display_Name.value === 'SEO Redirects'` → `displayName: 'SEO Redirects'`. Wire item with `Display_Name.value === ''` → `displayName: ''`. Wire item with no `Display_Name` key → `displayName: undefined`. |
| **Scenario D** | `listVersionsByLanguage` returns `versionsByLanguage` and `nonEmptyVersionsByLanguage` |
| **Expected outcome D** | Given fixture with versions for `en` (non-empty UrlMapping) and `de` (empty UrlMapping), `versionsByLanguage` contains both codes; `nonEmptyVersionsByLanguage` contains only `'en'`. |
| **Suggested file** | `site/tests/unit/sdk/redirects-read.test.ts` (existing — extend) |
| **Fixture provenance** | `// source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData (line 2); real-tenant capture T001 → tests/fixtures/graphql/versions-by-language.json` |

#### T009 — Display_Name decode defensive heuristic

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario** | `decodeWireItem` handles all three `Display_Name` shapes without throwing |
| **Expected outcome** | `Display_Name: undefined` → `displayName: undefined`. `Display_Name: { value: null }` → `displayName: ''`. `Display_Name: { value: '' }` → `displayName: ''`. `Display_Name: { value: 'Test' }` → `displayName: 'Test'`. Map list fallback chain: `displayName: '' → name: 'SEO Redirects'` → label shows `'SEO Redirects'`. |
| **Suggested file** | `site/tests/unit/sdk/redirects-read.test.ts` (extend T008 suite) |
| **Fixture provenance** | Unit-testable without SDK fixture — uses inline wire objects. |

#### T010 — Extend `redirects-write.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | `displayName: undefined` does NOT push `__Display name` into `buildFieldsArray` output |
| **Expected outcome A** | `buildFieldsArray({ ...attrs, displayName: undefined })` returns array with no entry where `name === '__Display name'`. |
| **Scenario B** | `displayName: 'Foo'` DOES push `{ name: '__Display name', value: 'Foo' }` |
| **Expected outcome B** | Array contains exactly one `{ name: '__Display name', value: 'Foo' }` entry; other fields unchanged. |
| **Scenario C** | `language` parameter is threaded through to `variables.input.language` |
| **Expected outcome C** | Given `updateRedirectMap(client, ctx, { itemId, language: 'de', ... })`, the `client.mutate` call captures `variables.input.language === 'de'`. |
| **Scenario D** | Default language falls back to `'en'` when `language` is undefined |
| **Expected outcome D** | PRD-000 callers that pass no `language` arg still work — variables contain `language: 'en'`. |
| **Suggested file** | `site/tests/unit/sdk/redirects-write.test.ts` (existing — extend) |
| **Fixture provenance** | `// source: real-tenant capture T001 OQ-A3 → tests/fixtures/graphql/display-name-write.json` (write shape post-capture). Until T001 lands: `// assumed-shape pending T001 capture OQ-A3` |

#### T011 — `addRedirectMapVersion`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | Happy path: returns `{ ok: true, version: 2 }` given successful fixture |
| **Expected outcome A** | Given mocked `client.mutate` returning DOUBLE-unwrapped `{ data: { data: { addItemVersion: { item: { itemId: '...', version: 2 } } } } }`, function returns `{ ok: true, version: 2 }`. |
| **Scenario B** | GraphQL error path: returns `{ ok: false, error: '<message>' }` |
| **Expected outcome B** | Given `client.mutate` returning `{ data: { errors: [{ message: 'Item not found' }] } }`, returns `{ ok: false, error: 'Item not found' }`. Does not throw. |
| **Scenario C** | Envelope contract: body is INSIDE params, double-unwrap applied |
| **Expected outcome C** | Spy on `client.mutate` and assert the call structure: `params.body.query` contains `addItemVersion`; `params.body.variables.input` contains `{ itemId, language }`. NOT `params.query` or top-level `body`. |
| **Suggested file** | `site/tests/unit/sdk/redirects-version.test.ts` (new) |
| **Fixture provenance** | `// assumed-shape pending T001 capture OQ-A1 — addItemVersion input/payload shapes not in .d.ts; SDK envelope source: node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-authoring/types.gen.d.ts → Authoring.GraphqlData`. After T001: replace with `// source: real-tenant capture T001 → tests/fixtures/graphql/add-item-version.json` |

#### T012 — `deleteRedirectMapVersion`

| Field | Value |
|---|---|
| **Test type** | unit + structural |
| **Scenario A** | Happy path: returns `{ ok: true }` given `{ successful: true }` fixture |
| **Expected outcome A** | DOUBLE-unwrapped response with `deleteItemVersion.successful === true` → `{ ok: true }`. |
| **Scenario B** | False `successful` field: returns `{ ok: false }` |
| **Expected outcome B** | `deleteItemVersion.successful === false` → `{ ok: false }`. |
| **Scenario C** | `DELETE_VERSION_AVAILABLE === false` path: wrapper throws with the R-1 message |
| **Expected outcome C** | When the constant is `false`, calling `deleteRedirectMapVersion(...)` throws (or returns `{ ok: false, error: 'deleteItemVersion is not available...' }`) — never silently returns `{ ok: true }`. |
| **Structural scenario** | `DELETE_VERSION_AVAILABLE` constant is exported and typed `boolean` |
| **Expected outcome (structural)** | Structural guard import-checks the export exists and is boolean (via `typeof DELETE_VERSION_AVAILABLE === 'boolean'` assertion in guard). |
| **Suggested file** | `site/tests/unit/sdk/redirects-version.test.ts` (extend T011 suite) |
| **Fixture provenance** | `// assumed-shape pending T001 capture OQ-A2 — deleteItemVersion input/payload shapes not in .d.ts; SDK envelope source: Authoring.GraphqlData`. After T001: `// source: real-tenant capture T001 → tests/fixtures/graphql/delete-item-version.json` |

#### T013 — `copyFromAnotherLanguage` rollback state machine

| Field | Value |
|---|---|
| **Test type** | unit (integration-style — exercises T011 + T012 via stubs) |
| **Scenario A — `populated` path** | `addItemVersion` ok + `updateItem` ok → `state: 'populated'` |
| **Expected outcome A** | Returns `{ state: 'populated', newVersion: 2 }`. No rollback call is made. |
| **Scenario B — `version-create-failed` path** | `addItemVersion` fails → `state: 'version-create-failed'` |
| **Expected outcome B** | Returns `{ state: 'version-create-failed', reason: '...' }`. `updateItem` is never called. `deleteRedirectMapVersion` is never called. |
| **Scenario C — `rolled-back` path** | `addItemVersion` ok, `updateItem` fails, `deleteRedirectMapVersion` ok → `state: 'rolled-back'` |
| **Expected outcome C** | Returns `{ state: 'rolled-back', reason: '...' }`. All three calls are made in the correct sequence. |
| **Scenario D — `partial-version-detected` path** | `addItemVersion` ok, `updateItem` fails, `deleteRedirectMapVersion` fails → `state: 'partial-version-detected'` |
| **Expected outcome D** | Returns `{ state: 'partial-version-detected', reason: '...', rollbackReason: '...' }`. Both `reason` and `rollbackReason` fields populated. |
| **Scenario E — degraded `populate-failed-no-rollback` path** | `DELETE_VERSION_AVAILABLE === false`, `addItemVersion` ok, `updateItem` fails |
| **Expected outcome E** | Returns `{ state: 'populate-failed-no-rollback' }`. `deleteRedirectMapVersion` is never called (constant check prevents it). |
| **Suggested file** | `site/tests/unit/sdk/redirects-version.test.ts` (extend) |
| **Fixture provenance** | `// assumed-shape pending T001 capture — addItemVersion + deleteItemVersion body/payload shapes` |

#### T039 — Extend `lib/domain/types.ts`

| Field | Value |
|---|---|
| **Test type** | structural (TypeScript compilation) |
| **Scenario** | Extended `RedirectMapItem` + `RedirectMapAttributes` compile correctly |
| **Expected outcome** | `npm run typecheck` passes. `RedirectMapItem` has `displayName?: string` and `versionsByLanguage?: string[]`. Downstream consumers (T008/T010/T016/T021) can access these fields without type errors. No behavioral test needed — type-check is the test. |
| **Suggested file** | n/a — `tsc --noEmit` in CI |
| **TDD applicability** | Structural (TypeScript type compilation). Add explicit type-assertion tests in T008/T010 suites. |

---

### EPIC B — Picker state + hook

#### T004 — `lib/picker/language-picker-state.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | `getPickerState` returns `null` for absent key, invalid JSON, wrong Zod shape |
| **Expected outcome A** | `localStorage` empty → `null`. `localStorage` with `JSON.parse` error → `null`. Valid JSON but missing `language` field → `null`. |
| **Scenario B** | `setPickerState` writes the key with ISO timestamp and correct payload |
| **Expected outcome B** | After `setPickerState('t1', 's1', 'de')`, `localStorage.getItem('redirect-manager.language.t1.s1')` contains `JSON.stringify` of object with `{ tenantId: 't1', siteId: 's1', language: 'de', lastUsedAt: <ISO-8601 string> }`. |
| **Scenario C** | `resolveDefaultLanguage` honors the 4-step chain |
| **Expected outcome C** | Chain: persisted `'de'` in `['en','de']` → `'de'`. persisted `'fr'` not in `['en','de']` → falls to siteDefault `'en'` (in set) → `'en'`. No persisted, siteDefault `null`, `'en'` not in set → first enumerated. All four chain positions exercised in separate test cases. |
| **Scenario D** | `validateAgainstEnumerated` emits stale-warning when persisted language absent from enumerated set |
| **Expected outcome D** | `{ language: 'en', staleWarning: "Your last-used language 'fr' is no longer available..." }` when `persisted.language === 'fr'` and `enumerated === ['en', 'de']`. |
| **Scenario E** | Key shape is `redirect-manager.language.<tenantId>.<siteId>` — no `.v1.` segment |
| **Expected outcome E** | Structural guard T040 step 2 validates this. Additionally: `setPickerState('T', 'S', 'en')` writes to exactly `'redirect-manager.language.T.S'` — assert `localStorage.key(0) === 'redirect-manager.language.T.S'`. |
| **Scenario F** | SSR guard — `getPickerState` returns `null` without throwing when `typeof window === 'undefined'` |
| **Expected outcome F** | Stub `window` to undefined in the test (or test in a non-jsdom environment shim). Function returns `null`, does not throw. |
| **Suggested file** | `site/tests/unit/picker/language-picker-state.test.ts` (new) |
| **Fixture provenance** | No SDK fixtures. Pure `localStorage` + Zod. |

#### T005 — `hooks/use-language-picker.ts`

| Field | Value |
|---|---|
| **Test type** | UI (jsdom + React Testing Library) |
| **Scenario A** | Initial render returns `language: ''` (no hydration flash) |
| **Expected outcome A** | Before the `useEffect` runs, the hook returns `{ language: '', isReady: false }`. After mount effect, returns the resolved language. |
| **Scenario B** | After `useEffect`, `language` matches persisted `localStorage` value |
| **Expected outcome B** | Seed `localStorage` with `{ language: 'de', ... }` before render; after `act(async () => {})`, hook returns `{ language: 'de', isReady: true }`. |
| **Scenario C** | `setLanguage` updates state AND writes to `localStorage` |
| **Expected outcome C** | Call `setLanguage('fr')` via the hook; assert `localStorage` key now contains `language: 'fr'` and the hook returns `language: 'fr'`. |
| **Scenario D** | `storage` event from another tab updates picker |
| **Expected outcome D** | Dispatch `new StorageEvent('storage', { key: 'redirect-manager.language.t.s', newValue: JSON.stringify({ language: 'fr', ... }) })` on `window`; after `act`, hook returns `language: 'fr'`. |
| **Scenario E** | `storage` event for a DIFFERENT key does NOT update picker |
| **Expected outcome E** | Dispatch `StorageEvent` with `key: 'redirect-manager.language.OTHER.s'`; hook language unchanged. |
| **Suggested file** | `site/tests/ui/hooks/use-language-picker.test.tsx` (new) |
| **Fixture provenance** | No SDK fixtures. Pure `localStorage` + jsdom. |

#### T006 — `hooks/use-dirty-edits.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | `dirty` is `false` initially; `markDirty()` → `true`; `markClean()` → `false` |
| **Expected outcome A** | State transitions are immediate and correct in both directions. |
| **Scenario B** | Multiple call sites can `markDirty` and only a single `markClean` brings it back |
| **Expected outcome B** | Dirty count approach or boolean — test documents which semantics are chosen. If boolean: two components both call `markDirty`, but one `markClean` call clears it (simplest). If ref-counted: requires two `markClean` calls. Test documents and enforces the chosen semantic. |
| **Suggested file** | `site/tests/unit/hooks/use-dirty-edits.test.ts` (new) |
| **Fixture provenance** | No SDK fixtures. |

---

### EPIC C — Map list + detail + version-aware fetching

#### T014 — `LanguagePicker.tsx`

| Field | Value |
|---|---|
| **Test type** | UI + accessibility |
| **Scenario A** | Renders trigger with ISO chip + native name; `aria-label="Language"` present |
| **Expected outcome A** | `getByRole('combobox', { name: 'Language' })` or equivalent picker trigger is in the DOM and shows `'EN'` chip (uppercase ISO) + `'English'` native name. |
| **Scenario B** | Opens dropdown on click; emits `onChange` on item selection |
| **Expected outcome B** | Click trigger → dropdown opens; click `'de'` item → `onChange` called with `'de'`; dropdown closes. |
| **Scenario C** | Disabled state renders `aria-disabled="true"` with tooltip |
| **Expected outcome C** | With `disabled={true}` + `disabledReason="Save changes first"`, trigger has `aria-disabled="true"` and `@blok/tooltip` is accessible. Click does NOT open dropdown. |
| **Scenario D** | Fallback mode renders group separator between site-scoped and tenant-wide languages |
| **Expected outcome D** | With `fallbackMode={true}`, a visually discernible group separator exists; all tenant languages visible below the separator. |
| **Scenario E** | Runtime contrast — ISO chip `--primary-background` / `--primary` contrast ≥ 3.0 (UI components) |
| **Expected outcome E** | `getComputedStyle(chipEl).backgroundColor` and `color` resolve to distinct values with WCAG contrast ratio ≥ 3.0 in both light and dark themes. |
| **Scenario F** | jest-axe: no accessibility violations |
| **Expected outcome F** | `expect(await axe(container)).toHaveNoViolations()` passes. |
| **Suggested file** | `site/tests/ui/full-page/LanguagePicker.test.tsx` (new) |
| **Fixture provenance** | No SDK. Render with prop-injected mock data. |

#### T015 — LanguagePicker error + loading states

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | Loading state shows skeleton chip, no chevron, click does not open |
| **Expected outcome A** | With `isReady={false}`, `@blok/skeleton` is visible; trigger click produces no dropdown. |
| **Scenario B** | Error state shows "Languages unavailable" label + Retry item in dropdown |
| **Expected outcome B** | With `languages={[]}` and `enumFailed={true}`, trigger shows `AlertCircle` + "Languages unavailable"; click opens dropdown with exactly one "Retry" item. |
| **Suggested file** | `site/tests/ui/full-page/LanguagePicker.test.tsx` (extend T014 suite) |

#### T016 — `LanguageVersionIndicator.tsx`

| Field | Value |
|---|---|
| **Test type** | UI (targeted SVG snapshot) |
| **Scenario A** | `filled={true}` renders a filled circle (`fill="currentColor"`, no stroke) |
| **Expected outcome A** | SVG `circle` element has `fill="currentColor"` and no `stroke` attribute (or `stroke="none"`). |
| **Scenario B** | `filled={false}` renders an outlined circle (`stroke="currentColor"`, fill none) |
| **Expected outcome B** | SVG `circle` has `fill="none"` and `stroke="currentColor"`. |
| **Scenario C** | Component is `aria-hidden="true"` (decorative) |
| **Expected outcome C** | The SVG element has `aria-hidden="true"`. |
| **Suggested file** | `site/tests/ui/full-page/LanguageVersionIndicator.test.tsx` (new) |
| **Fixture provenance** | No SDK. Pure component render. |

#### T017 — Update `RedirectMapList.tsx`

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | Shows `map.displayName` as label when non-empty; falls back to `map.name` when empty |
| **Expected outcome A** | Row with `displayName: 'SEO-Weiterleitungen'` shows that label. Row with `displayName: ''` shows `itemName`. |
| **Scenario B** | Dot is filled when `versionsByLanguage[mapId].includes(currentLanguage)` |
| **Expected outcome B** | Map with `versionsByLanguage: ['en', 'de']` and `currentLanguage: 'de'` renders filled dot. Map with `versionsByLanguage: ['en']` and `currentLanguage: 'de'` renders outlined dot. |
| **Scenario C** | Row with no version in current language has muted text (`--muted-foreground` token) |
| **Expected outcome C** | Outlined-dot row text style: `getComputedStyle(rowEl).color` resolves to the `--muted-foreground` value from the theme. |
| **Scenario D** | Row `aria-label` includes version-presence status |
| **Expected outcome D** | Row element's accessible name (via `aria-label` or computed label) includes the map name AND an indication of version presence (e.g. "SEO Redirects — no version in current language"). |
| **Suggested file** | `site/tests/ui/full-page/RedirectMapList.test.tsx` (existing — extend) |

#### T018 — Two-state UX routing

| Field | Value |
|---|---|
| **Test type** | UI (interaction flow) |
| **Scenario A** | Selecting a no-version map renders `RedirectMapDetail` in `mode='no-version'` |
| **Expected outcome A** | After clicking a row with `versionsByLanguage: []` for `currentLanguage`, the detail pane renders the no-version empty state (not the populated list). |
| **Scenario B** | Selecting an empty-version map renders detail in `mode='empty-version'` (inline affordance, no modal) |
| **Expected outcome B** | Row with `versionsByLanguage: ['de']` (has version), `mappings: []` → detail shows "Add first mapping" inline; NO modal opens. |
| **Suggested file** | `site/tests/ui/full-page/RedirectMapList.test.tsx` (extend) |

#### T019 — Update `RedirectMapDetail.tsx` (3-mode renderer)

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | `mode='no-version'` renders empty-state copy + two CTAs + language list |
| **Expected outcome A** | Text "This map has no `[language]` version yet" visible. Two CTA buttons visible. List of languages that DO have versions visible. |
| **Scenario B** | `mode='empty-version'` renders inline "Add first mapping" affordance, NO modal |
| **Expected outcome B** | "Add first mapping" inline element visible. No modal in the DOM. |
| **Scenario C** | `mode='populated'` renders existing PRD-000 mappings table (regression guard) |
| **Expected outcome C** | Existing mappings test passes unchanged. Explicit regression assertion: "does not render the no-version empty state". |
| **Scenario D** | Editing a field calls `markDirty()`; successful save calls `markClean()` |
| **Expected outcome D** | Spy `markDirty` and `markClean` from `useDirtyEdits`. Edit a row → `markDirty` called once. Save → `markClean` called once. Discard → `markClean` called once. |
| **Scenario E** | AC-3.5: save toast includes language code (not just "Saved") |
| **Expected outcome E** | After save, Sonner toast text includes the current language code, e.g. `"Saved to de version."`. |
| **Suggested file** | `site/tests/ui/full-page/RedirectMapDetail.test.tsx` (existing — extend with 5 new cases) |

#### T020 — Orchestrate `versionsByLanguage` fetch

| Field | Value |
|---|---|
| **Test type** | UI (integration — FullPage-level) |
| **Scenario** | After map selection, `listVersionsByLanguage` is called; the result updates both list dots and detail props |
| **Expected outcome** | Mock `listVersionsByLanguage` to return `{ versionsByLanguage: ['en','de'], nonEmptyVersionsByLanguage: ['en'] }` for mapId X. After clicking map X in the list, the detail receives `versionsByLanguage: ['en','de']` prop. The list dot for map X is filled (current language 'de' is in the set). |
| **Suggested file** | `site/tests/ui/full-page/FullPage.layout.test.tsx` (existing — extend) |

---

### EPIC F — Display-name editing

#### T021 — `DisplayNameEditor.tsx`

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | Static mode: value displayed; pencil icon accessible on hover |
| **Expected outcome A** | `value='SEO Redirects'` → text "SEO Redirects" in DOM. Pencil icon has `aria-hidden="true"` (decorative — the row itself is the edit affordance). |
| **Scenario B** | Empty value shows placeholder as real DOM text (not just `placeholder` attr) |
| **Expected outcome B** | `value=''` → DOM contains italic muted text "(no display name for de — add one)" as a real text node, not just an `<input placeholder>`. |
| **Scenario C** | Enter key commits; `onSave` called with new value |
| **Expected outcome C** | Enter on the input calls `onSave('New Name')` exactly once. |
| **Scenario D** | Escape cancels; `onSave` NOT called; original value restored |
| **Expected outcome D** | Type "New Name", press Escape → `onSave` never called; displayed value reverts to original. |
| **Scenario E — regression** | Blur does NOT commit (AC-9.4) |
| **Expected outcome E** | Type "New Name", `fireEvent.blur(input)` → `onSave` NOT called. This is a named regression test for AC-9.4. |
| **Scenario F** | Failure path: `onSave` rejects → input stays editable; error toast shown |
| **Expected outcome F** | `onSave` rejects with "Network error" → input not cleared; Sonner toast with "Technical details" section rendered. |
| **Scenario G** | Runtime contrast: Save button destructive variant passes WCAG AA |
| **Expected outcome G** | Save button primary variant: contrast ≥ 4.5 between computed foreground and background. |
| **Suggested file** | `site/tests/ui/full-page/DisplayNameEditor.test.tsx` (new) |

#### T022 — Wire DisplayNameEditor into detail header

| Field | Value |
|---|---|
| **Test type** | UI (integration — within RedirectMapDetail) |
| **Scenario** | Saving display name updates detail header without refetch; `updateRedirectMap` called with only `displayName` attr |
| **Expected outcome** | `onSave('New Name')` triggers `updateRedirectMap` spy with `{ displayName: 'New Name' }` and NO other changed attrs. Detail header shows 'New Name' immediately after save (optimistic update) without waiting for list refetch. |
| **Suggested file** | `site/tests/ui/full-page/RedirectMapDetail.test.tsx` (extend) |

---

### EPIC D — Create-version flow + rollback

#### T023 — `CreateVersionModal.tsx` (step 1)

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | Two CTA cards visible; footer Cancel present |
| **Expected outcome A** | "Create empty `[language]` version" card visible. "Copy from another language" card visible. Cancel button visible. |
| **Scenario B** | "Create empty" triggers `addRedirectMapVersion`; modal closes on success; toast shown |
| **Expected outcome B** | Click "Create empty [de] version" → `addRedirectMapVersion` called once with `{ itemId, language: 'de' }`; on mock success → modal not in DOM; Sonner toast "Created empty de version." visible. |
| **Scenario C** | "Copy from" click transitions to step 2 (CopyFromSourceStep) |
| **Expected outcome C** | Click "Copy from another language" → step 1 content replaced by step 2 content (`CopyFromSourceStep`). |
| **Scenario D** | Error path: `addRedirectMapVersion` fails → modal stays open; error toast |
| **Expected outcome D** | Mock rejection → modal still open; Sonner toast with collapsible "Technical details" section. |
| **Scenario E** | `aria-modal="true"` + `role="dialog"` + focus trap |
| **Expected outcome E** | On open, first focusable element (Create empty card or Cancel) receives focus. Tab cannot escape the modal. |
| **Suggested file** | `site/tests/ui/full-page/CreateVersionModal.test.tsx` (new) |

#### T024 — `CopyFromSourceStep.tsx` (step 2)

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | Only non-empty source languages listed (AC-7.2) |
| **Expected outcome A** | Given `nonEmptyVersionsByLanguage: ['en']` and `versionsByLanguage: ['en', 'de']`, only `en` row appears in source picker. `de` is filtered out (has version but empty UrlMapping). |
| **Scenario B** | Single non-empty source is auto-selected |
| **Expected outcome B** | With only one non-empty source, radio is pre-selected; "Create version" button is enabled without any user interaction. |
| **Scenario C** | "Create version" disabled until source selected |
| **Expected outcome C** | With multiple sources, "Create version" button is `disabled` until user clicks a source radio. |
| **Scenario D** | Each `CopyFromResult.state` discriminant renders the correct UI outcome |
| **Expected outcome D** | `populated` → modal closes, success toast. `version-create-failed` → modal stays, error toast with reason. `rolled-back` → modal closes, "Could not copy mappings — new version removed" toast. `partial-version-detected` → modal closes, `PartialVersionBanner` renders. `populate-failed-no-rollback` → modal closes, degraded-UX toast about empty version. All 5 branches have explicit test cases. |
| **Suggested file** | `site/tests/ui/full-page/CopyFromSourceStep.test.tsx` (new) |

#### T025 — Wire CreateVersionModal into RedirectMapDetail no-version state

| Field | Value |
|---|---|
| **Test type** | UI (interaction flow) |
| **Scenario A** | "Create empty version" CTA opens modal at step 1 (`initialStep: 'empty'`) |
| **Expected outcome A** | Click "Create empty [de] version" in no-version state → modal opens at step 1; step 2 not visible. |
| **Scenario B** | "Copy from" CTA opens modal directly at step 2 (`initialStep: 'copy-from'`) |
| **Expected outcome B** | Click "Copy from another language" in no-version state → modal opens at step 2 directly; step 1 not visible. |
| **Suggested file** | `site/tests/ui/full-page/RedirectMapDetail.test.tsx` (extend) |

#### T026 — `PartialVersionBanner.tsx`

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | Renders visible when triggered; `role="alert"` |
| **Expected outcome A** | When partial-state is active, banner is in DOM with `role="alert"`. |
| **Scenario B** | "Delete `[language]` version" CTA opens `DeleteScopeConfirmModal` with `forceLanguageOnlyPreSelected` flag |
| **Expected outcome B** | Click "Delete de version" → `DeleteScopeConfirmModal` opens with radio (a) pre-selected. |
| **Scenario C** | "Add mappings manually" CTA routes to empty-version detail pane |
| **Expected outcome C** | Click "Add mappings manually" → detail pane is in `mode='empty-version'`; banner is gone. |
| **Suggested file** | `site/tests/ui/full-page/PartialVersionBanner.test.tsx` (new) |

---

### EPIC E — Delete scope safety

#### T027 — `DeleteScopeConfirmModal.tsx`

| Field | Value |
|---|---|
| **Test type** | UI + structural + accessibility |
| **Scenario A** | Delete button disabled until radio selected |
| **Expected outcome A** | On open (normal flow), Delete button has `disabled={true}` + `aria-disabled="true"`. After clicking radio (a) OR radio (b), Delete button becomes enabled. |
| **Scenario B** | Single-version edge case renders both radios + explanatory note (AC-8.6) |
| **Expected outcome B** | With `versionCount={1}`, both radio options visible; note text "This map has only one language version; both options remove all redirect data. Choose explicitly to confirm intent." visible. Neither radio is pre-checked. |
| **Scenario C** | Hard-fail variant (`DELETE_VERSION_AVAILABLE === false`) shows only option (b) with adjusted copy |
| **Expected outcome C** | With `deleteVersionAvailable={false}`, only one radio (whole-item delete) is rendered; copy matches AC-8.4 hard-fail variant. |
| **Scenario D — cleanup-from-banner** | `forceLanguageOnlyPreSelected={true}` pre-selects radio (a) |
| **Expected outcome D** | Radio (a) "Delete current language version only" is checked on open; Delete button is enabled immediately. |
| **Structural test** | No `defaultChecked` on any radio except via `forceLanguageOnlyPreSelected` code path |
| **Expected outcome (structural)** | T040 step 3 structural guard verifies this at build time. UI test explicitly asserts: with `forceLanguageOnlyPreSelected={false}` (default), NEITHER radio has `aria-checked="true"` on open. |
| **Scenario E** | jest-axe: no violations |
| **Expected outcome E** | `expect(await axe(container)).toHaveNoViolations()` on all 4 modal variants. |
| **Scenario F** | Runtime contrast: Delete button destructive variant ≥ 4.5 contrast ratio |
| **Expected outcome F** | `getComputedStyle(deleteBtn).color` vs `backgroundColor` yields contrast ≥ 4.5. |
| **Suggested file** | `site/tests/ui/full-page/DeleteScopeConfirmModal.test.tsx` (new — replaces `DeleteMapConfirmModal.test.tsx` which is deleted in T028) |

#### T028 — Replace `DeleteMapConfirmModal` usage

| Field | Value |
|---|---|
| **Test type** | structural |
| **Scenario** | No remaining references to `DeleteMapConfirmModal` in source tree; `DeleteMapConfirmModal.tsx` and its test do not exist |
| **Expected outcome** | Structural search: `rg 'DeleteMapConfirmModal' site/components site/app site/hooks site/lib` returns zero matches. Both `DeleteMapConfirmModal.tsx` and `DeleteMapConfirmModal.test.tsx` absent from disk. Build passes. |
| **Suggested file** | `site/tests/structural/structural-guards.test.ts` (add a negative-presence assertion for `DeleteMapConfirmModal.tsx`) OR verify via CI `tsc --noEmit` + `npm run build`. |

---

### EPIC G — Dashboard scoping

#### T035 — Update `DashboardWidget.tsx`

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | "Maps in `[language]`" tile label includes current ISO code |
| **Expected outcome A** | With `currentLanguage: 'de'`, tile heading includes "de" (or "DE"). Count reflects only maps with a version in `de`. |
| **Scenario B** | "Languages with content" tile lists ISO codes as inline text |
| **Expected outcome B** | Tile renders `en, de, fr` (or equivalent list). |
| **Scenario C** | Footnote includes language code per AC-12.3 |
| **Expected outcome C** | Footnote text contains the current language code and the PRD-003 deferral note. |
| **Scenario D** | Read-only `LanguagePicker` chip renders (no dropdown on click) |
| **Expected outcome D** | `getByRole('combobox')` is absent or has `aria-readonly` / `pointer-events-none`. Click on picker does NOT open dropdown. |
| **Suggested file** | `site/tests/ui/dashboard-widget/DashboardWidget.test.tsx` (existing — extend) |

#### T036 — `dashboard-aggregation.ts`

| Field | Value |
|---|---|
| **Test type** | unit + structural |
| **Scenario A** | `aggregateLanguagesWithContent` uses `Promise.all` and returns only languages with ≥1 non-empty map |
| **Expected outcome A** | Given 3 languages and mocked `listRedirectsForSite` returns maps for `en` and `de` but empty array for `fr`, returns `['en', 'de']` (order may vary). |
| **Scenario B** | No sequential `await` inside `.map(` (NFR-S1 structural) |
| **Expected outcome B** | T040 step 4 structural guard asserts this. Additionally: spy `listRedirectsForSite` and verify all 3 calls are initiated before any resolves (concurrent, not sequential). |
| **Suggested file** | `site/tests/unit/dashboard/aggregation-v2.test.ts` (new, alongside existing `aggregation.test.ts`) |

---

### EPIC H — Context Panel banner

#### T037 — `PagesAwareBanner.tsx`

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | `language === 'en'` renders en-only copy |
| **Expected outcome A** | Text "Exact-match, en-only. Regex + multilingual matching ship in follow-ons." visible. |
| **Scenario B** | `language === null` renders en-only copy (static fallback) |
| **Expected outcome B** | Same en-only copy as scenario A. |
| **Scenario C** | `language === 'de'` renders non-`en` copy with code interpolated |
| **Expected outcome C** | Text "Currently viewing a de page — matches shown are en-only. Multilingual matching ships in PRD-002." visible. The code `de` is interpolated correctly. |
| **Scenario D** | `role="status"` + `aria-live="polite"` present |
| **Expected outcome D** | Banner element has `role="status"` and `aria-live="polite"`. No close button. |
| **Scenario E** | Language switch from `en` to `de` updates copy without unmount/remount |
| **Expected outcome E** | Re-render with `language='de'` updates copy; `role="status"` + `aria-live="polite"` remain. |
| **Suggested file** | `site/tests/ui/context-panel/PagesAwareBanner.test.tsx` (new — `RegexBanner.test.tsx` carries over as a separate regression until T037b retired it) |

#### T037b — Mount PagesAwareBanner in ContextPanel

| Field | Value |
|---|---|
| **Test type** | UI (integration) |
| **Scenario** | `RegexBanner` no longer renders; `PagesAwareBanner` present; Context Panel matcher unchanged |
| **Expected outcome** | `ContextPanel.test.tsx` renders; no `RegexBanner` in DOM; `PagesAwareBanner` with `role="status"` in DOM. `context-panel-matcher.ts` is not imported or called from `PagesAwareBanner` (matcher still in `ContextPanel` itself — unchanged per FR-18). |
| **Suggested file** | `site/tests/ui/context-panel/ContextPanel.states.test.tsx` (existing — extend to assert new banner + removal of old) |

---

### EPIC I — Import/export schema v2

#### T029 — `lib/import-export/schema-v2.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | `parseExportV2` accepts canonical fixture `tests/fixtures/redirect-bundle-v2.json` |
| **Expected outcome A** | `{ ok: true, data: <ExportV2> }` with correct typed result; no thrown error. |
| **Scenario B** | `parseExportV2` rejects wrong `schema` literal |
| **Expected outcome B** | `{ ok: false, errors: ["Expected 'redirect-manager/v2'..."] }` for `{ schema: 'redirect-manager/v1', ... }`. |
| **Scenario C** | Per-language ISO key validation: rejects `'EN'` (uppercase), accepts `'en'`, `'fr-CH'` |
| **Expected outcome C** | Uppercase key → `{ ok: false, ... }`. `'fr-CH'` → accepted. |
| **Scenario D** | Rejects oversize bundle (>1000 maps) |
| **Expected outcome D** | Bundle with 1001 map entries → `{ ok: false, errors: [...] }`. |
| **Scenario E** | `displayName` max-255 enforced per language entry |
| **Expected outcome E** | `displayName` of 256 chars → `{ ok: false }`. 255 chars → accepted. |
| **Suggested file** | `site/tests/unit/import-export/schema-v2.test.ts` (new) |
| **Fixture provenance** | `tests/fixtures/redirect-bundle-v2.json` is hand-authored for tests (structure known from architecture § 4.5). Comment: `// source: architecture-20260513T092023Z.md § 4.5 — canonical schema example`. |

#### T030 — `v1-detect.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | `{ schema: 'redirect-manager/v1' }` → `{ v1: true, message: '...' }` |
| **Expected outcome A** | Message exactly: `'Schema v1 is no longer supported. Re-export from a current Redirect Manager instance.'` |
| **Scenario B** | `{ schema: 'redirect-manager/v2' }` → `{ v1: false }` |
| **Expected outcome B** | `{ v1: false }` — no message field. |
| **Scenario C** | `null` / `{}` / `{ schema: undefined }` → `{ v1: false }` (not v1, let Zod handle it) |
| **Expected outcome C** | Non-v1 schema values pass through without triggering the v1 rejection. |
| **Suggested file** | `site/tests/unit/import-export/v1-detect.test.ts` (new) |

#### T031 — `serialize-v2.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | Round-trip: `serializeSiteToV2Bundle` produces a bundle that `parseExportV2` accepts |
| **Expected outcome A** | Given 2-map × 2-language mock data, serialized bundle passes `parseExportV2` with `ok: true`. |
| **Scenario B** | Timestamps normalized to ISO-8601 extended (not Sitecore compact) |
| **Expected outcome B** | Output `lastUpdated` fields match `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/` (no compact Sitecore format). |
| **Scenario C** | `siteLanguages` in output contains only languages with at least one map |
| **Expected outcome C** | Tenant has `en`, `de`, `fr`; only `en` and `de` have maps → `siteLanguages: ['en', 'de']`. `fr` absent. |
| **Scenario D** | `Promise.all` (parallel) used for multi-language fetch (structural; via spy count) |
| **Expected outcome D** | Spy `listRedirectsForSite`; verify all 3 calls initiated before any mock resolves. |
| **Suggested file** | `site/tests/unit/import-export/serialize-v2.test.ts` (new, alongside existing `serialize.test.ts` until v1 file is deleted) |

#### T032 — `diff-v2.ts`

| Field | Value |
|---|---|
| **Test type** | unit |
| **Scenario A** | Map absent on tenant → `action: 'create'`, bundle languages get `create` per-language cell |
| **Expected outcome A** | `buildItemDiffsV2(bundle, [], {})` for a map → all `perLanguage` cells are `'create'`, `action: 'create'`. |
| **Scenario B** | Map present on tenant, bundle has `en` + `de`, tenant has `en` only → correct per-language cells |
| **Expected outcome B** | `en` cell: `'overwrite'`. `de` cell: `'create'` (in bundle, absent on tenant). `fr` (tenant only): `'unchanged'`. |
| **Scenario C** | `action: 'skip'` → all per-language cells become `'skip'` |
| **Expected outcome C** | After changing action to `skip`, all `perLanguage` cells resolve to `'skip'`. |
| **Suggested file** | `site/tests/unit/import-export/diff-v2.test.ts` (new) |

#### T033 — `apply-v2.ts`

| Field | Value |
|---|---|
| **Test type** | unit (integration-style) |
| **Scenario A** | `action: 'skip'` → no mutations called |
| **Expected outcome A** | With `action: 'skip'`, neither `createRedirectMap` nor `addRedirectMapVersion` nor `updateRedirectMap` is called. Returns `{ mapGuid, languages: {} }`. |
| **Scenario B** | `action: 'create'` → `createRedirectMap` once, then `addItemVersion + updateItem` for each non-default language |
| **Expected outcome B** | For bundle with `en` (first) and `de`, `createRedirectMap` called once with `language: 'en'`; `addRedirectMapVersion` called once with `language: 'de'`; `updateRedirectMap` called twice (once per language). |
| **Scenario C** | `action: 'overwrite'` → tenant-only languages are NOT touched (FR-16) |
| **Expected outcome C** | Bundle has `en`; tenant has `en` + `de`. `updateRedirectMap` called once (for `en`); `de` on tenant left untouched. |
| **Scenario D** | Per-map outcomes include per-language detail (AC-11.5) |
| **Expected outcome D** | `ApplyResultV2` for each map includes `{ mapGuid, languages: { en: 'overwritten', de: 'created' } }` or equivalent. |
| **Suggested file** | `site/tests/unit/import-export/apply-v2.test.ts` (new) |

#### T034 — Update `ImportRedirectMapModal.tsx`

| Field | Value |
|---|---|
| **Test type** | UI |
| **Scenario A** | v1 file shows rejection error in step 1; wizard does NOT advance |
| **Expected outcome A** | Upload file with `{ schema: 'redirect-manager/v1', ... }` → error "Schema v1 is no longer supported." shown inline; "Next" button not available. |
| **Scenario B** | v2 file advances to validate step (step 2) |
| **Expected outcome B** | Upload valid v2 fixture → wizard moves to validate step; no error. |
| **Scenario C** | Preview step (step 3) renders per-map rows with language columns |
| **Expected outcome C** | Table renders map rows; columns match `bundleSiteLanguages ∪ tenantSiteLanguages`. Language column headers visible. |
| **Scenario D** | Summary step lists per-language outcome (AC-11.5) |
| **Expected outcome D** | After apply, summary shows "Map X: en updated, de created" or equivalent per-language breakdown. |
| **Suggested file** | `site/tests/ui/full-page/ImportRedirectMapModal.test.tsx` (new — replaces v1 import modal test or extends significantly) |

---

### EPIC K — Tests, structural guards, smoke prep

#### T040 — Extend structural guards

| Field | Value |
|---|---|
| **Test type** | structural |
| **Scenario** | All 5 new guards fail when the target invariant is violated; pass when code is correct |
| **Expected outcome** | Guard 1 (SDK boundary extension): new wrapper files are in `ALLOWED_SDK_IMPORTERS`. Guard 2 (key shape): `'redirect-manager.language.'` prefix in `getPickerState` + no `.v` segment. Guard 3 (no-default radio): no `defaultChecked` on radio except via `forceLanguageOnlyPreSelected` code branch. Guard 4 (parallel fetch): no bare `await` inside `.map(` in `dashboard-aggregation.ts`. Guard 5 (v1 files deleted): `schema.ts`, `diff.ts`, `apply.ts`, `serialize.ts` absent; `add-item-version.json` fixture exists. |
| **Suggested file** | `site/tests/structural/structural-guards.test.ts` (existing — extend with 5 `it(...)` blocks matching the existing pattern) |
| **TDD applicability** | Write each guard BEFORE the target code lands. Each guard is initially FAILING (the target file or condition doesn't exist yet) then passes as the implementation lands. This IS the RED → GREEN cycle for structural guards. |

#### T041 — Doc captures and JSDoc sync

| Field | Value |
|---|---|
| **Test type** | n/a (docs-only) |
| **TDD applicability** | OUT of TDD scope. |

#### T042 — Smoke checklist + live-walkthrough prep

| Field | Value |
|---|---|
| **Test type** | manual-smoke (operator-driven) |
| **Scenario — m1 (language picker live)** | Picker enumerates site-scoped languages from `CHAH DevEx Journey / PROD`; fallback to tenant-wide when site-scoped absent |
| **Gate criterion** | `manifest.smoke_outcomes.m1` transitions from `pending` to `passed` after operator confirms both enumeration paths on real tenant. |
| **Scenario — m2 + m3 (CRUD round-trip + create-version)** | Per-language CRUD round-trip in <10s; create-version both paths on real tenant |
| **Gate criterion** | `manifest.smoke_outcomes.m2` and `m3` both `passed`. |
| **Scenario — m4 (import/export round-trip)** | Export site with ≥2 languages; import to clean state; verify reconstitution |
| **Gate criterion** | `manifest.smoke_outcomes.m4` `passed`. |
| **Scenario — m5 (live walkthrough ≥5 min)** | No unrecoverable errors across full feature surface |
| **Gate criterion** | `manifest.smoke_outcomes.m5` `passed`. |
| **Marketplace host-frame visual smoke** | Compare PRD-001 POC frames vs live host-frame clips on 5 axes per § 9.7 |
| **Gate criterion** | All 10 POC frames listed in § 9.7 comparison table yield PASS or documented WARN (no unresolved FAIL). |
| **Suggested file** | `products/redirect-manager/project-planning/smoke/smoke-checklist-prd-001.md` (created by T042). Smoke outcomes logged to run manifest `smoke_outcomes` field. |

---

## Handoff Metadata

- **Canonical run manifest:** `products/redirect-manager/project-planning/workflow/run-20260513T092023Z.json`
- **Source PRD:** `products/redirect-manager/project-planning/PRD/prd-001.md`
- **Source architecture:** `products/redirect-manager/project-planning/architecture/architecture-20260513T092023Z.md`
- **Source ADRs:** ADR-0014 through ADR-0022 (PRD-001 specific) + ADR-0002, 0003, 0007, 0008, 0009, 0010, 0011, 0012, 0013 (carry-over from PRD-000)
- **Selected UI variant:** `products/redirect-manager/project-planning/ui-design/ui-design-20260513T092023Z-v1.md` (V1 "Topbar Pilot")
- **Winning POC:** `products/redirect-manager/pocs/poc-v1-prd001/` (14 frames + click-targets.md + multilingual.css)
- **Recommended next command:** `/task-breakdown` (QA enrichment pass — populates §§ 9–10 in place; same file path)
- **Recommended next input file:** `task-breakdown-20260513T092023Z.md` (this file, post-QA enrichment)
- **Implementation entry point after QA:** `/implement` — Tranche 1 (T001) is the mandatory first task.
