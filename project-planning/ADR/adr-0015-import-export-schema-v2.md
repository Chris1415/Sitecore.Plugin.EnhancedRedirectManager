# ADR-0015: JSON import/export schema v2 — multi-language bundle, no v1 back-compat

## Status

Superseded by ADR-0023 (PRD-001 cancelled 2026-05-13 — schema v2 not shipped; v1 remains the only supported schema)

## Context

PRD-000 shipped JSON import/export at schema `redirect-manager/v1`: per-map entries, GUID-keyed, en-only, three-action conflict resolution (create / overwrite / skip). PRD-001 introduces multilingual CRUD, which forces the export shape to evolve — each map can now have versions in multiple languages, with `__Display name` and `UrlMapping` varying per language while flags and `RedirectType` remain shared (pending OQ-2 field-matrix confirmation).

Three options were considered:

- **(a) Per-language exports** — operator picks a language, downloads `redirects-de.json`. Schema close to v1 with an explicit `language: "de"` envelope. Multiple files per multilingual export.
- **(b) Multi-language bundle** — one JSON file per site contains all language versions per map. Schema bump to `redirect-manager/v2`, per-map `languages` map keyed by language code.
- **(c) Both** — bulk bundle plus per-language slice.

Operator preference during /rubber-ducky (D-Import-Export, D-Backward-Compat): single-file bundle is more portable and the realistic primary use case (export-to-import promotion across environments). Backward-compat with v1 imports was explicitly declined ("no one is using it") — v1 is rejected with a clear error.

The schema design also has to accommodate OQ-2 (field-matrix) uncertainty: if `RedirectType` or any flag turns out to be versioned, the `shared` block shrinks and those fields move under `languages.<code>`. The schema is structured so this revision changes field placement, not the overall envelope.

## Decision

- **Schema name and version:** `redirect-manager/v2`. Single supported schema; `redirect-manager/v1` imports are **rejected** with a clear error message: *"Schema v1 is no longer supported. Re-export from a current Redirect Manager instance."* No silent migration.
- **Envelope shape:**
  - Top-level: `schema`, `exportedAt`, `site` (name, collectionName, siteId), `siteLanguages` (array of language codes enumerated at export time), `maps` (array).
  - Per-map: `guid`, `itemName`, `shared` (object of shared-across-languages fields), `languages` (object keyed by language code).
  - Per-language: `displayName`, `lastUpdated`, `mappings` (parsed list of `{ source, target }`).
- **Timestamps:** ISO-8601 extended format (`YYYY-MM-DDTHH:MM:SSZ`) throughout. Sitecore-internal compact format (`yyyyMMddTHHmmssZ`) is normalized at the export-serializer boundary.
- **Naming disambiguation:** Top-level `siteLanguages` (array of codes) and per-map `languages` (object) are kept distinct to avoid the same key carrying two different shapes.
- **Shared vs versioned field placement (amended 2026-05-13 by /architect, pinning to architecture § 4.3):** `RedirectType`, `PreserveQueryString`, `PreserveLanguage`, `IncludeVirtualFolder` are **shared** (under `shared` block); `UrlMapping` and `__Display name` are **versioned** (under `languages.<code>`); `itemName` and `guid` are always shared; `__Updated` is versioned (recorded per language). **Capture pass at /implement Tranche 1 confirms via `itemTemplate(where).fields.nodes.versioning` introspection per architecture § 4.3 capture recipe.** If the real-tenant capture surprises (any shared field is actually versioned, or vice versa), this ADR's matrix amends inline and Schema v2's `shared` vs `languages.<code>` block split adjusts. Bounded worst case: all four currently-shared fields move under `languages.<code>` and the `shared` block reduces to `itemName` + `guid`.
- **Import action semantics:** Three actions remain (create / overwrite / skip), applied at **map level**. `overwrite` affects only languages present in the bundle for that map; tenant-side languages absent from the bundle are left untouched. `create` creates language versions only for languages present in the bundle. `skip` leaves the map entirely untouched. Per-language-per-map action sub-axis is OQ-6, deferred.

## Consequences

**Easier:**

- Single-file portability — one JSON bundle moves an entire site's redirect inventory across environments.
- Clean schema break — no `if (schema === "v1")` branching anywhere in the code path.
- Forward-only schema means the Zod validator is simpler and validation errors point to a single supported shape.
- Per-map `languages` object makes the bundle naturally diffable: comparing two bundles surfaces which language versions changed.

**Harder:**

- Operators with v1 bundles must re-export from a current instance. For PRD-000 production users (currently zero based on operator confirmation), this means none. For any future users who somehow obtain a v1 bundle out-of-band, the error message is the only recourse.
- Import preview UI must visualize the language dimension. UI complexity grows — exact shape resolved via clickdummies at `/architect` (OQ-5).
- If OQ-2 field-matrix capture surprises (any flag turns out versioned), the schema's `shared` block shrinks and downstream consumers (a hypothetical external CI tool that round-trips the bundle) may break. Probability low; mitigation is the OQ-2 hard-prerequisite at `/architect`.

## Date

2026-05-13
