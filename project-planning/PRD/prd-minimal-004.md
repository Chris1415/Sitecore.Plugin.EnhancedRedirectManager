# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-004.md
pairs_with_prd: project-planning/PRD/prd-004.md
generated_at: 2026-05-20T08:00:00Z
run_manifest: project-planning/workflow/run-20260520T080000Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Condensed north-star for implementation. Keeps token use low: agent 08 reads this plus
  the enriched task breakdown only—not the full PRD or architecture doc.
---

## Problem (one short paragraph)

Operators in the Redirect Manager can author regex patterns (the Content SDK proxy auto-detects regex vs. URL per row at runtime via `isRegexOrUrl`), but the app has no UI signal for which mode a pattern is, no save-time validation for regex syntax, and no way to verify a rule fires against a URL before publishing. Mistakes surface only after deploy. PRD-004 adds explicit Pattern / Regex mode in a new **small `EditRowModal` dialog** (replaces the existing PRD-000 inline row-edit affordance in `RedirectMapDetail` per ADR-0043; modal owns only source + destination + mode toggle + save-time validation; map-level RedirectType + 3 flags stay in the existing map-settings UI) and a new **"Test" tab on Full Page with two-column layout** (sticky left rail: read-only maps list + URL input + Test button; scrollable right: trace cards) that runs a faithful local port of the upstream `RedirectsProxy` against a sample URL using maps already loaded in the Manage tab, rendering a structured trace.

**2026-05-21 simplification:** EditRowModal no longer includes snippet library, capture-group chips, sample-URL tester, or inline mode-mismatch hint (deferred to Future Opportunities). Test tab no longer includes ScopePicker (Collection/Site/Maps) or locale dropdown; maps are passed from FullPage.maps state; locale is derived from URL prefix. See PRD-004 § 16 for the full amendment.

## Goal (one short paragraph)

Two co-shipping capabilities — net-additive, no SDK changes, no Sitecore template changes, zero new SDK surfaces. **`EditRowModal`** is a new modal dialog opened by clicking a row in `RedirectMapDetail` (replaces inline editing per ADR-0043). It contains source + destination + Pattern/Regex segmented toggle + save-time `try { new RegExp() }` validation. **Test tab** has a two-column layout: sticky left rail with a read-only maps list (maps from `FullPage.maps` state, no picker) + URL input + Test button; scrollable right area with trace cards. Locale derived from URL prefix (`^\/([a-z]{2}(-[A-Z]{2})?)(?=\/|$)`, default `'en'`). Simulator (`site/lib/redirects/proxy-simulator.ts`, verbatim local port of upstream `RedirectsProxy.handle` + helpers) evaluates only against rules from the passed maps. Output is a structured-card trace with Copy-as-JSON. Simulator hits **100% parity** with imported upstream test fixtures (`__fixtures__/upstream-cases.json`) plus tenant-captured cases from T1 (`__fixtures__/tenant-cases.json`).

## Non-negotiables (bullets)

- **Zero Sitecore template changes.** The Redirect Map template is untouched; mode is a per-row UI affordance, not stored content (ADR-0040).
- **Zero new SDK surfaces.** The simulator is pure local logic against in-memory rules already loaded by the Manage tab. Test surface makes no network calls.
- **Verbatim port of upstream `RedirectsProxy` semantics, including quirks** (e.g. `isRegexOrUrl()` strips last char before testing — replicated, not "fixed"). 100% test-fixture parity required; any divergence requires explicit ADR waiver. Header comment on `proxy-simulator.ts` records upstream commit SHAs + retrieval date (ADR-0038).
- **Regex safety: 100ms Promise.race per `test()` call + 3-second total simulation wall-clock cap.** Single-row timeout marks `outcome: 'timeout'` and continues; total cap stops evaluation entirely and emits a "diagnostic incomplete" trace card (ADR-0039).
- **Async simulator.** `simulate()` returns `Promise<SimulationTrace>`. UI staggers card render with `prefers-reduced-motion: reduce` fallback to instant. Not a streaming model — simulator computes the full trace, then UI animates the reveal.
- **Tranche 1 is a hard gate.** Probe must verify regex special chars round-trip through existing CRUD per-character-class (anchors, groups, escapes, quantifiers, char classes, alternation). Any failure triggers a T0 fix-first task in the encoder/decoder before T2 starts.
- **Mode toggle defaults to Pattern on every open** (transient state). Inline hint surfaces when `isRegexOrUrl()` disagrees with the manual mode; hint never blocks save (US-R2).
- **Save-time validation** — `try { new RegExp(source, flags) }` is the authoritative check. Capture-group/destination cross-check (AC-R1.6) is advisory; known false-positive edges for `\(` and `[(]` documented in error messaging.
- **Locale is derived from URL prefix** via `LOCALE_PREFIX_REGEX = /^\/([a-z]{2}(-[A-Z]{2})?)(?=\/|$)/`; defaults to `'en'`. No locale dropdown. NOT multilingual content management (ADR-0023 stands).
- **Trace covers pre-filter skips** (URL contains `.`, preview-mode, prefetch) as their own card stage — informational; simulator continues for diagnostic visibility.
- **Theme parity (dark/light/system) + reduced-motion + WCAG 2.1 AA** on every new control (mode toggle, snippet library, chips, tab control, URL input, Test button, trace cards). Inline hint is `role="status"`, not `role="alert"`.
- **Editor safety** — Test surface never triggers Authoring GraphQL writes. Read-only with respect to Sitecore.
- **Bundle budget** — net addition ≤ 25KB gzipped (simulator + UI). No runtime regex-parser dependency — `new RegExp` directly.

## In scope / out of scope (very short)

- **In scope:**
  - New `EditRowModal` component replacing inline row editing in `RedirectMapDetail` (per ADR-0043); contains source + destination + Pattern/Regex mode toggle (transient, default Pattern on every modal open) + save-time regex validation
  - Save-time regex validation + capture-group cross-check (advisory edge cases)
  - Full Page "Manage / Test" secondary tab with **two-column layout** (sticky left rail / scrollable right)
  - Read-only maps list in left rail (maps passed from `FullPage.maps` state — no API calls in TestSurface)
  - URL input (absolute + path+query) + Test button; locale derived from URL prefix, no dropdown
  - Structured-card trace (pre-filter → normalize → candidates → row evaluation → substitution → flag effects → dispatch) + Copy-as-JSON; only rules from passed maps are evaluated
  - Deep-link from result card row reference → Manage tab → scroll to parent map → open `EditRowModal` for that row
  - `site/lib/redirects/proxy-simulator.ts` local port + `__fixtures__/upstream-cases.json` + `__fixtures__/tenant-cases.json`
- **Out of scope (deferred to PRD-004 § 15 Future Opportunities, see § 16 amendment):**
  - Snippet library in Regex mode (5 one-click patterns) — FO-11
  - Capture-group chips in destination input (`$1`, `$siteLang`) — FO-12
  - Live sample-URL tester in modal — FO-13
  - Inline mode-mismatch hint — FO-14
  - ScopePicker (Collection → Site → Map(s)) in Test tab — FO-9
  - Locale dropdown in Test tab — FO-10
- **Out of scope:**
  - Upstream proxy drift detection + AI re-sync slash command (PRD-005)
  - Batch URL testing (single URL only in v0)
  - Editing rules from Test tab (read-only)
  - Context Panel + Dashboard Widget changes
  - Multilingual UrlMapping management (cancelled per ADR-0023)
  - Web Worker isolation for catastrophic regex (100ms + 3s caps sufficient for v0)
  - Wiring real Edge requests for verification (smoke is operator-driven manual)

## Success criteria (3–7 bullets)

- **M1** — Save-time validation rejects 100% of malformed regex inputs (verified via unit tests)
- **M2** — 100% parity on imported upstream test fixtures; any failing fixture is a bug to fix or requires explicit ADR waiver before merge
- **M3** — T6 real-tenant smoke: ≥80% of 5-10 operator-selected URLs produce simulator output matching tenant Edge; <80% → `shipped_with_caveats`; parity-breaking bug → hard-stop
- **M4** — Operator can diagnose a non-match in <30 seconds without leaving the app (verified during T6 walkthrough)
- **NFR-1** — Test button click to trace render p95 ≤ 200ms for ≤100-rule inventories; total simulation capped at 3s
- **NFR-6** — Net bundle addition ≤ 25KB gzipped

## Key constraints & assumptions

- **C1 — Replicate upstream behavior verbatim, including quirks** (e.g. `isRegexOrUrl()` `.slice(0, -1)`); ADR-0038
- **C2 — Mode is transient, not stored**; resets to Pattern on every modal open; ADR-0040
- **C7 — Map-level fields stay in map-level UI.** `RedirectType`, `IncludeVirtualFolder`, `PreserveQueryString`, `PreserveLanguage` are SHARED fields on the parent Redirect Map item — NOT per-row. `EditRowModal` MUST NOT render controls for these; the simulator pulls them from the parent map at evaluation time
- **C8 — `EditRowModal` replaces inline row editing** (ADR-0043); existing PRD-000 inline-edit affordance is removed. T3 carry-over CRUD smoke (round-trip a row through the modal) confirms behavioral parity before mode-toggle / regex affordances land on top
- **C9 — No scope picker in Test tab** (2026-05-21 simplification); maps are passed as a prop from FullPage.maps — no localStorage scope persistence in TestSurface
- **C3 — Regex safety via dual cap: 100ms per row + 3s total wall-clock**; ADR-0039
- **C4 — Simulator is async** (`Promise<SimulationTrace>`); UI staggers card render with reduced-motion fallback
- **C5 — No new SDK surfaces**; pure local logic
- **C6 — Locale dropdown is a static client-side list**; NOT populated from `xmc.sites`
- **A1 — Existing CRUD pipeline preserves regex special chars on save/read round-trip.** Verified in T1; if false, T0 fix-first
- **A2 — `isRegexOrUrl()`'s `slice(0, -1)` is intentional upstream contract** — replicate; document in ADR-0038
- **A3 — Snippet library, capture-group chips, and inline hint are deferred** (2026-05-21 simplification; see PRD-004 § 16)
- **A4 — Capture-group chip counting via paren-regex over-counts escaped/char-class parens** — known v0 limitation for the save-time cross-check (AC-R1.6 advisory); chip UI itself is deferred (FO-12)

## Handoff

- **Full PRD:** `project-planning/PRD/prd-004.md` (for humans and upstream agents only—not loaded by agent 08 in normal flow.)
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **Source brain-dump:** `project-planning/brain-dumps/brain-dump-20260519T140000Z.md`
- **Upstream references:** `https://github.com/Sitecore/content-sdk/blob/dev/packages/nextjs/src/proxy/redirects-proxy.ts`, `https://github.com/Sitecore/content-sdk/blob/dev/packages/core/src/tools/utils.ts`
