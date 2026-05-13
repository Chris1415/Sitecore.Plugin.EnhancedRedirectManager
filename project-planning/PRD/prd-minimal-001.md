# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-001.md
pairs_with_prd: products/redirect-manager/project-planning/PRD/prd-001.md
generated_at: 2026-05-13T09:20:23Z
run_manifest: products/redirect-manager/project-planning/workflow/run-20260513T092023Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Condensed north-star for implementation. Keeps token use low: agent 08 reads this plus
  the enriched task breakdown only—not the full PRD or architecture doc.
---

## Problem

PRD-000 shipped Redirect Manager en-only by design. Sitecore is intrinsically multilingual — virtually every customer has multiple languages — so en-only blocks adoption beyond single-language tenants. PRD-001 adds **app-internal multilingual CRUD** (Full Page + Dashboard + import/export). Context Panel multilingual matching + head-app resolver contract are deferred to PRD-002.

## Goal

Operator can switch the Full Page surface to any language version supported by the current site, author redirects per language, create new language versions (empty or copy-from-language), edit per-language display names, and import/export multi-language bundles — without leaving the app. Dashboard tiles reflect the chosen language. Context Panel keeps en-only matching with a Pages-aware banner.

## Non-negotiables

- **Marketplace Mode A** scaffold continues from PRD-000 (ADR-0002). No server-side OAuth proxy.
- **Authoring GraphQL** is the single canonical source (ADR-0003). No KV cache, no parallel datastore.
- **Strict no-default delete radio** (ADR-0018). Operator must explicitly choose version-only vs entire-item.
- **No silent fallback** for missing `deleteItemVersion` (PRD § 13 R-1). Hard-fail and cut version-only path if absent.
- **No v1 import back-compat** (ADR-0015). Reject v1 bundles with clear error.
- **localStorage picker key** = `redirect-manager.language.<tenantId>.<siteId>` (ADR-0017). Shared across Full Page + Dashboard.
- **Picker locks when edits dirty** (AC-3.5). Operator saves or discards before language switch.
- **No name input on create-version** (ADR-0016). Two paths only: empty / copy-from.
- **Source picker filtered to non-empty versions** in copy-from path (AC-7.2).
- **Pages-aware Context Panel banner** (AC-13.2). Reads `pageInfo.language`; static fallback when `en` or absent.
- **WCAG 2.1 AA** on all new surfaces; structural guard (`outline:none` without paired `focus-visible` ban) extends to PRD-001 code.
- **Blok primitives + Nova preset** throughout; `--primary-foreground` override stays.
- **SDK boundary** — `@sitecore-marketplace-sdk/*` imported only from `lib/sdk/*` (PRD-000 structural test extends).
- **No `dangerouslySetInnerHTML`** outside `components/ui/*`.

## In scope / out of scope

- **In scope:**
  - Language picker (site-scoped with tenant-wide fallback) in Full Page; localStorage-persisted; shared with Dashboard.
  - Language-aware map list with current-language `__Display name` + fallback to item name.
  - Language-version CRUD (read, edit, delete-version — last subject to OQ-1 hard-fail).
  - Create-version flow: empty + copy-from. No name input. Source picker filtered to non-empty versions.
  - Two-state UX: "no version" (modal CTA) vs "empty version" (inline affordance).
  - Per-language `__Display name` editing in detail header (pencil-icon discoverable affordance; Enter or Save commits; Escape or Cancel discards; no blur-commit).
  - Delete confirmation modal with explicit radio (strict no-default; single-version edge case has informational note but still no default).
  - Dashboard tile language scoping (exact tile shape from `/architect` clickdummies).
  - Import/export schema `redirect-manager/v2` — single multi-language bundle; map-level 3-action picker; overwrite affects only languages-in-bundle.
  - v1 import rejection with clear error.
  - Context Panel banner update (Pages-language aware; behavior unchanged).
- **Out of scope:**
  - Context Panel multilingual matching → PRD-002.
  - Head-app resolver contract change → PRD-002.
  - Usage analytics → PRD-003.
  - Sync-back to Sitecore template → PRD-004.
  - Regex matching, bulk multi-language ops, concurrent-edit detection, audit log, app UI localization, public Marketplace App submission → future.
  - Per-language-per-map action sub-axis in import preview (OQ-6) → future.

## Success criteria

- **m1** — Language picker enumerates site-scoped languages (tenant-wide fallback when site-scoped absent) on `CHAH DevEx Journey / PROD`.
- **m2** — Per-language CRUD round-trip <10s on `en`, `de`, and one additional language.
- **m3** — Create-version flow (both paths — empty AND copy-from) creates a working new language version on real tenant.
- **m4** — Multi-language export → bundle JSON contains all language versions → re-import to clean state reconstitutes all versions.
- **m5** — Live walkthrough ≥5 min covering language switching, create-version, delete (both scopes), display-name editing, multilingual import/export — zero unrecoverable errors.

All 5 must pass before `shipped`. `registration` + `host_frame_smoke` re-run from PRD-000 (UI surface changed).

## Key constraints & assumptions

- **OQ-1 hard prerequisite** (ADR-0014 + PRD § 13 R-1): `createItemVersion` and `deleteItemVersion` mutation shapes verified at `/architect`. If `createItemVersion` absent → US-6, US-7, US-11-create cut. If `deleteItemVersion` absent → US-8 version-only cut, modal switches to single-option variant.
- **OQ-2 hard prerequisite** (ADR-0015 + PRD § 13 R-2): Shared vs versioned field matrix on Redirect Map template. Drives FR-3/4/7/21, AC-3.2/3.3/7.3/7.4, § 10 schema split. If `RedirectType` or any flag is versioned, `shared` block shrinks accordingly; schema example in PRD § 10 is the assumed-shape variant.
- **OQ-4** — `__Display name` accessed via `field(name: "__Display name")` named accessor (per memory `reference_sitecore_authoring_write_envelopes`). Confirmed at `/architect`.
- **SDK envelope quirks** (PRD-000 carry-over): body inside `params`, double `.data.data` unwrap for `xmc.authoring.graphql`. Apply same pattern to new mutation verbs.
- **Marketplace SDK skill**: invoke `sitecore:marketplace-sdk-xmc` for Authoring writes (verified pattern from memory `reference_marketplace_sdk_envelope_authoring_graphql`).
- **Branch:** `prd-001` stacked off `main` (PRD-000 merged 2026-05-12 via PR#1).
- **Scope dial** carries from PRD-000: `rigor=standard, track=full, ui_variants=3, docs_at_ship=full, task_breakdown_review=skip_gate`.

## Handoff

- **Full PRD:** `products/redirect-manager/project-planning/PRD/prd-001.md` (for humans and upstream agents only — not loaded by agent 08 in normal flow).
- **Executable contract:** `products/redirect-manager/project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **ADRs to read for context:** ADR-0014 (phasing), ADR-0015 (schema v2), ADR-0016 (create-version), ADR-0017 (picker state), ADR-0018 (delete scope) + carry-over ADRs from PRD-000 (especially ADR-0002, 0003, 0006, 0007, 0008, 0009, 0011, 0012, 0013).
