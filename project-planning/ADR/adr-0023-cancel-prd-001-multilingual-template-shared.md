# ADR-0023: Cancel PRD-001 multilingual — stock Redirect Map template `UrlMapping` is SHARED

## Status

Accepted (supersedes ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022)

## Context

PRD-001 (app-internal multilingual CRUD) was planned, architected, designed, and entered `/implement` Tranche 1 — a mandatory real-tenant probe pass closing architecture OQ-A1..A5 before any feature code could be written (per PRD § 13 R-1 + R-2). On 2026-05-13 the operator ran the 5 probes against `CHAH DevEx Journey / PROD`. Probe A4 (field-versioning matrix introspection) returned the stock Redirect Map template's field definitions.

**Result:**

| Field | PRD-001 assumed | Actual versioning |
|---|---|---|
| `UrlMapping` (the redirect rules) | VERSIONED | **SHARED** |
| `RedirectType` | SHARED | SHARED |
| `IncludeVirtualFolder` | SHARED | SHARED |
| `PreserveQueryString` | SHARED | SHARED |
| `PreserveLanguage` | SHARED | SHARED |
| `__Display name` | VERSIONED | **UNVERSIONED** |

Sitecore versioning semantics: `SHARED` = one value for the entire item, no language or version axis. `UNVERSIONED` = per-language but shared across numbered versions within a language. `VERSIONED` = per-language AND per-version.

**Implication:** the entire PRD-001 thesis — *"Sitecore content-versioning model — Redirect Map items have per-language versions; mappings in `de` may differ from `en`"* — does not hold against the stock template. `UrlMapping` is stored globally; every language version of the item returns the same content. Probe A5 confirmed this empirically: `My Redirect Map 2` had both `en` and `de-DE` versions with byte-identical `UrlMapping` values.

The only field with a real per-language axis is `__Display name` (UNVERSIONED) — a 50-character label, one of ~50 fields on the template.

The remaining PRD-001 scope would have shipped a misleading feature: language picker, per-language version-existence indicator, copy-from-language flow, multi-language JSON bundle import/export — all built around content that doesn't actually vary per language. Operators would believe they were localizing redirects when Sitecore was storing one global value. This contradicts the brain-dump's foundational principle D11 ("honest UX over collapsed UX") and PRD § 4 target-user expectations.

## Decision

**Cancel PRD-001 entirely. Do not ship a feature whose thesis does not hold.**

Supersede the 9 PRD-001 ADRs (0014-0022) with this single cancellation ADR. The decisions they recorded — phasing reframe, schema v2 bundle, create-version flow, picker state, delete-scope safety, `addItemVersion` envelope contract, language enumeration policy, copy-from rollback state machine, localStorage key versioning — are no longer in force because the feature they support is not shipping.

The 5 SDK-level findings from Tranche 1 captures (verb names, envelope shapes, field-versioning matrix on the stock template) are preserved as durable knowledge in `products/redirect-manager/docs/decisions.md` § *"PRD-001 Tranche 1 captures (real-tenant probes, 2026-05-13)"*. These findings survive the cancellation because they describe SDK and template reality, not PRD-001 design intent.

**Multilingual deferred indefinitely.** No follow-on PRD is queued for multilingual on Redirect Manager. A real multilingual story requires a coordinated bundle:

1. Sitecore Authoring: modify the Redirect Map template so `UrlMapping` becomes `VERSIONED` (or add a new versioned field `UrlMappingLocalized` and migrate). Operator-supervised Authoring-tool work; affects every existing redirect on the tenant.
2. Head-app resolver: read per-language `UrlMapping` content at runtime. External deliverable outside this app's deployment scope.
3. App UI: language picker, per-language CRUD, version mechanics. The work PRD-001 was originally going to do — but now on top of a template that actually supports it.

No clean phase split exists; all three changes must ship together. When the operator chooses to take on the template modification, a future PRD will bundle the three concerns. The original ADR-0014 4-PRD phasing (PRD-001 multilingual CRUD → PRD-002 Context Panel + head-app → PRD-003 analytics → PRD-004 sync-back) is therefore not just superseded but invalidated as a phasing model — multilingual cannot be decoupled from template and head-app changes the way PRD-001 assumed.

**Next PRD candidates** (operator picks at next `/rubber-ducky`):
- **Regex-aware Context Panel matching** — PRD-000 ship report rec #2; consistent marketer demand; bounded scope; no external dependencies.
- **Analytics** — the original PRD-003 in the phasing-reframed plan; bigger scope (Upstash + Vercel Marketplace + head-app instrumentation + Dashboard enrichment) but high signal value.
- Other PRD-000 ship-report rec follow-ons (replace site auto-detect with explicit picker; automate host-frame visual smoke; "retry failed items" affordance in import summary).

**ADR-0010 (en-only MVP) stays Accepted.** PRD-001 was the deferred follow-on, not a contradiction of the en-only scoping. With PRD-001 cancelled, `en` remains the only language Redirect Manager supports — indefinitely rather than until-PRD-001.

## Consequences

**Easier:**

- No 42-task implementation of a misleading feature. ~2-4 weeks of engineering time avoided.
- No further `localStorage` schema, no schema-v2 import/export, no version-mutation wrapper layer to maintain — all unwritten and now unneeded.
- No PRD-002 head-app coordination work for multilingual Context Panel matching (was queued as the next phase).
- The product stays honest. Operators using Redirect Manager continue to see en-only behavior — a known limitation, not a misleading "multilingual" feature.

**Harder:**

- Multilingual is a real need for some Sitecore tenants (per operator's /rubber-ducky Q2 answer: *"every customer literally has that potentially"*). Those tenants get nothing from Redirect Manager until the bundled template + resolver + UI work happens. The product's addressable market remains single-language tenants.
- Planning artifacts from PRD-001 (PRD doc, architecture doc, 9 ADRs, 3 UI variant specs, 1 winning POC, task breakdown, runbook, fixtures scaffolding) are sunk cost — preserved as historical record for future-multilingual reference but not shipping.
- The dev-tools probe surface added to `site/components/full-page/FullPage.tsx` and the page at `site/app/full-page/probes/page.tsx` are now dev-only artifacts on the `prd-001` branch. They do not ship to `main`. If the branch is ever merged for the planning artifacts alone, those code changes must be reverted first.
- ADR housekeeping is unusually dense — 9 supersedings in a single ADR — but well-bounded and traceable.

**Neutral:**

- The Tranche 1 capture pattern (real-tenant probes at the start of `/implement` before substantive code) **worked exactly as intended.** PRD § 13 R-2 anticipated field-matrix surprises and made the capture pass a hard prerequisite. The pattern caught a fundamental architectural assumption failure in ~30 minutes against a real tenant, after roughly 2 days of planning work but **before** any feature code. This is a positive validation of the framework's "T001 hard-gate" design, not a process failure.

## Date

2026-05-13
