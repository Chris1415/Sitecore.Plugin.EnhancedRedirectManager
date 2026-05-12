# ADR-0010: MVP language scope = `en` only; multilingual deferred to PRD-001

## Status

Accepted

## Context

The original concept brief and the first cut of PRD-000 made multilingual / per-language CRUD a hard MVP gate: the app would enumerate all configured content languages from the SDK, surface which language versions exist on each Redirect Map item, and let operators CRUD against any language with a "create version" prompt for missing versions.

During PRD-000 critical review the user resolved (Q-CR-4):

> "we can start with hard language `en` but need to deliver others in a later phase"

Three reasons make this the right call for MVP:

- **The SDK wrapper for content-language enumeration is unverified.** PRD-000's earlier OQ-2 / FR-7 left this as an architecture-stage discovery. If the wrapper does not exist (or returns a different shape), the multilingual MVP would block on a dependency we cannot pre-verify.
- **Multilingual CRUD threading is a primary risk class** (former R3). Every Authoring GraphQL mutation must carry `language` and `version` arguments correctly; one bad mutation can write to the wrong language version and silently break content authors' work in another locale. Deferring lets us test the single-language happy path first.
- **The operator's target tenant for MVP is `en`-only** in practice. Multi-locale workflows are a real future need but not the first verification milestone.

## Decision

PRD-000 MVP operates **exclusively on the `en` language version** of every Redirect Map item.

- Authoring GraphQL queries and mutations always pass `language: "en"` (and the appropriate `version` — the latest `en` version).
- The Full Page UI does not show a language switcher.
- Each Redirect Map item header does not show language-version indicators.
- The "create version" prompt does not exist in MVP.
- JSON export does not include a `versions` array or a `languages` array — the schema is flat for `en` only.
- JSON import assumes incoming items target `en`; non-`en` versions in the target environment are not touched.

**Multilingual is deferred to PRD-001** (combined with analytics, or split into PRD-001 / PRD-002 at PRD-001 discovery — TBD). The Phase 2 feature set includes:

- SDK-driven content-language enumeration (with Authoring GraphQL `languages` query as a documented fallback).
- Per-item language-version indicators.
- Language switcher in Full Page.
- "Create version based on `<default>`" prompt on writes against a missing language.
- Multi-version JSON export/import.

## Consequences

**Easier:**
- Authoring GraphQL queries and mutations are the simplest possible shape. No language/version threading bugs possible by construction.
- The conflict-resolution and import flows handle one canonical version per item — no merge logic for "which language wins".
- The UI is simpler: one less switcher, one less indicator chip, one less prompt path.
- The MVP test surface shrinks materially — no multilingual flows to cover.

**Harder:**
- Multi-locale tenants installing PRD-000 will see the MVP work only against their default language. This is a real limitation. Mitigated by the explicit Phase 2 commitment and a clear note in README + the install guide.
- A Redirect Map item that has only a `de` version and no `en` version will appear absent to PRD-000. The fix in PRD-001 introduces the language switcher; until then, the operator must ensure an `en` version exists for any item they want to manage in the MVP.
- The PRD-000 → PRD-001 migration must keep the `en`-only assumption stable: PRD-001 introduces the language switcher additively, not by changing the meaning of existing API calls.

## Date

2026-05-09
