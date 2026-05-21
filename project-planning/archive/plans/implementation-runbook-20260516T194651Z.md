# Implementation Runbook

---
document_type: implementation_runbook
artifact_name: implementation-runbook-20260516T194651Z.md
generated_at: 2026-05-17T00:00:00Z
run_manifest: project-planning/workflow/run-20260516T194651Z.json
source_inputs:
  - project-planning/PRD/prd-minimal-003.md (primary scope/orientation for Developer 08)
  - project-planning/plans/task-breakdown-20260516T194651Z.md (execution contract — § 4c, 28 tasks, § 9 TDD contract, § 10 per-task tests)
  - project-planning/ADR/adr-0031..0034 (decision boundaries — read by Lead Dev/QA, not by Developer 08 in normal flow)
consumed_by:
  - Engineering Team
next_input:
  - products/redirect-manager/site/
---

## 1. Implementation Scope

PRD-003 — wire the placeholder "Publish all" hero CTA on Full Page to a real SitecoreAI publish job (renaming to **"Publish Site"**), and add a per-map **"Publish"** icon button in the Redirect Maps rail. Target endpoint: SitecoreAI Publishing v1 `POST /authoring/publishing/v1/jobs`. Branch B (server-side OAuth REST proxy via Next.js API route) is the expected path; Branch A (SDK wrapper) is a fallback that the Tranche 1 probe forecloses if no publishing surface exists in `@sitecore-marketplace-sdk/xmc`.

Two tranches with HARD operator gate between:

- **Tranche 1 (T001–T005)** — read-only SDK + tenant probe + ADR-0034 amendment. No code written under `site/`. Capture artifact + flipped ADR. Operator gate at end.
- **Tranche 2 (T006–T028)** — TDD implementation. Branch-agnostic service-module core first, then Branch B (or A) transport adapter, then UI integration, then `m_publish` real-tenant smoke gate.

## 2. Canonical Inputs

- `project-planning/PRD/prd-minimal-003.md` — slim spec for Developer 08
- `project-planning/plans/task-breakdown-20260516T194651Z.md` — execution contract (§ 4c all 7 subsections filled, § 9 TDD contract, § 10 with 35 per-task tests, RED-first ordering, § 4c-8 verbatim body fixtures)
- ADR-0031 (decision deferral), ADR-0032 (icon-button placement), ADR-0033 (service-module contract — 6 surfaces), ADR-0034 (Tranche 1 outcome — Proposed; flipped at T005)
- SDK contract gate cite: `Sites.Site.languages?: Array<string> | null` at `site/node_modules/@sitecore-marketplace-sdk/xmc/dist/xmc/src/client-sites/types.gen.d.ts:1019` + double `.data.data` unwrap convention from `site/lib/sdk/sites.ts`
- Operator-supplied SitecoreAI Publishing v1 API spec captured verbatim in PRD-003 § 9.1 / AC-P1.4 / AC-P2.3

## 3. Target Directory Decision

`products/redirect-manager/site/` — existing Next.js 16 App Router app from PRD-000/002. Container convention enforced: `site/` is populated, planning artifacts live alongside under `project-planning/`. No deviation.

## 4. Planned Delivery Order

### Tranche 1 (this run — STOP at end for operator gate)

| Task | Title | Mode |
|------|-------|------|
| T001 | SDK publishing-surface .d.ts probe | Autonomous (grep) |
| T002 | Capture `Sites.Site.languages` shape | Type-shape autonomous; values need real tenant |
| T003 | Capture SitecoreAI Publishing host URL | **Operator-supplied** (Cloud Portal dev settings) |
| T004 | Live probe `locales: ["*"]` acceptance | **Operator-driven** (curl/Postman against solo tenant) |
| T005 | Amend ADR-0034 (strike losing branch, flip Status) | Autonomous once T001 known; OAuth-cred check needs operator |

**Tranche 1 deliverables:**
- `project-planning/captures/tranche-1-publish-20260516.md` — capture artifact with verdicts per OQ-P1..P4
- ADR-0034 amended: losing branch struck, Status flipped Proposed → Accepted, finalization date appended

### Tranche 2 (COMPLETED 2026-05-16 — TDD RED→GREEN executed per § 5 order)

| Task | Title | Status |
|------|-------|--------|
| T006 | `site/lib/publish/types.ts` — PublishScope + 5 types | DONE |
| T012a | RED: body builders + outcome mapper tests (8 tests) | DONE |
| T007 | GREEN: `buildSitePublishBody` | DONE |
| T008 | GREEN: `buildItemPublishBody` | DONE |
| T009 | GREEN: `outcomeFrom` mapper | DONE |
| T012b | GREEN confirmed — 8 tests pass | DONE |
| T010 | `toast-adapter.ts` — createSonnerToastAdapter | DONE |
| T013a | RED: publish() orchestration tests (5 tests) | DONE |
| T011 | GREEN: `publish(scope, deps)` orchestration | DONE |
| T013b | GREEN confirmed — 5 tests pass | DONE |
| T018a | RED: route.test.ts (6) + sitecoreai-token.test.ts (4) = 10 tests | DONE |
| T014 | `clearSitecoreAiTokenCache` added to existing sitecoreai-token.ts | DONE |
| T015/T016/T017 | `site/app/api/publish/route.ts` + `transport-server.ts` + env.example verified | DONE |
| T018b | GREEN confirmed — 10 tests pass | DONE |
| T020a | RED: locale-resolver.test.ts (4 tests) | DONE |
| T020b | GREEN: `locale-resolver.ts` + `config.ts` (PUBLISH_LOCALE_SHORTHAND_ACCEPTED=false) | DONE |
| T024a | RED: WorkspaceHero.test.tsx (3) + PublishSiteConfirmModal.test.tsx (7) + RedirectMapList.test.tsx (5) + theme (6) = 21 tests | DONE |
| T019 | `PublishSiteConfirmModal.tsx` — dialog shell from DeleteMapConfirmModal pattern | DONE |
| T022 | `RedirectMapPublishButton.tsx` — lucide-react Send icon + stopPropagation | DONE |
| T023 | `RedirectMapList.tsx` — in-flight Set + per-row button | DONE |
| T021 | `WorkspaceHero.tsx` — renamed "Publish Site" + real handler + dialog | DONE |
| T024b | GREEN confirmed — 21 tests pass | DONE |
| T025 | Theme parity smoke tests (6 structural, jest-axe deferred to m_publish) | DONE |
| T026 | `site/docs/smoke-publish.md` — m_publish checklist | DONE |
| T027 | CHANGELOG/README fragments — notes in § Handoff Metadata below | DONE |
| T028 | m_publish smoke gate | **PENDING** (manual operator gate) |

**vitest config addendum:** added `server-only` → `tests/mocks/server-only.ts` alias to allow testing server-side modules in jsdom; existing `.d.ts` and `tests/ui/full-page/WorkspaceHero.test.tsx` CTA assertion updated from "Publish all" → "Publish Site" (AC-P1.1 compliance).

## 5. Verification Checklist

Commands (from `site/package.json` + carry-over from PRD-002):

- `npm run lint` (run from `site/`) — pre-existing baseline tolerated; new errors fail
- `npm run build` (run from `site/`) — non-negotiable per spec § 9b; HARD STOP on failure
- `npm test` (run from `site/`) — vitest + jsdom + @testing-library/react

**Tranche 1 verification** (previous run): NO lint/build/test changes — read-only + ADR edit only.

**Tranche 2 verification (COMPLETED 2026-05-16):**

| Check | Verdict | Notes |
|-------|---------|-------|
| `npm run lint` | 0 errors / 2 warnings (baseline) | 2 warnings are pre-existing in `empty-states.tsx` + `error-states.tsx` — no new warnings introduced |
| `npm run build` | PASS | Next.js 16.1.7 Turbopack — all 8 routes compiled; `/api/publish` listed as `ƒ (Dynamic)` |
| `npm test -- --run` | 508 / 508 PASS | Baseline was 460; added 48 new tests (net +48 vs. baseline) |
| T028 m_publish smoke | **PENDING** | Manual operator gate — not automated |

## 6. Risks To Watch During Implementation

- **R-1 — First server-side route in this app (Branch B).** Architectural inflection — ADR-0002 "no server-side OAuth proxy" stance partially superseded for publishing surface only. ADR-0035 authored at /ship time, not Tranche 1.
- **R-2 — OAuth client-credentials not registered.** Tranche 1 D-T1.3 must verify the operator has registered a service client with `xmcpub.jobs.*:w` + `xmcloud.cm:admin` scopes against the solo tenant. If unregistered = HARD STOP before Tranche 2.
- **R-3 — Server-side secret leak.** NFR-P2: `process.env.SITECORE_OAUTH_CLIENT_SECRET` MUST only be referenced server-side. Structural test in § 9 secret-isolation spec is the regression backstop; manual `/code-review` pass is the manual backstop.
- **R-4 — Locale shorthand assumption.** AC-P1.4 default = enumerated; `["*"]` only if T004 confirms acceptance. PRD authors enumerated-wins as the safe default.
- **R-5 — `e.stopPropagation()` discipline on per-map icon button.** Without it, the parent row's `onSelect` also fires. T024 test enforces.
- **R-6 — `react-virtuoso` row recycling vs per-map in-flight Set.** When a row scrolls out and back in during a publish, the recycled DOM must still reflect the disabled-while-pending state. Verified at smoke (T028).
- **R-7 — `jest-axe` may not be installed.** T025 a11y axe scan conditionally defers to manual smoke if `jest-axe` absent. Recommend `npm i -D jest-axe` before Tranche 2.

## 7. Completion Criteria

**This run (Tranche 1):**
- T001 capture artifact written with the SDK probe verdict (Branch A or B)
- T002 capture artifact section with `Sites.Site.languages` shape verified from `.d.ts`; if values not captured, flagged as operator action
- T003/T004 sections present in capture artifact with explicit "operator action required" flags if not captured this run
- ADR-0034 amended IF T001 + T003 + T004 are resolved; partial amend with explicit "pending operator capture" if not
- HARD OPERATOR GATE surfaced to operator with: capture artifact, ADR-0034 state, list of remaining-input items

**Tranche 2 (COMPLETED):**
- T006–T027: all done. Tests 508/508. Build clean. Lint baseline only.
- T028: PENDING — operator must run `m_publish` real-tenant smoke per `site/docs/smoke-publish.md` before `/ship` is unblocked.

## 8. What Was Tested (Tranche 2 actual test files)

**Tranche 1**: no code tests (read-only / capture / ADR edit). TDD waiver per task breakdown § 9.

**Tranche 2 test files (implemented):**

| File | Tests | Covers |
|------|-------|--------|
| `site/lib/publish/publish-service.test.ts` | 13 | body builders (T012a), outcome mapper (T012a), orchestration (T013a) |
| `site/lib/auth/sitecoreai-token.test.ts` | 4 | token cache + clearSitecoreAiTokenCache (T018a) |
| `site/app/api/publish/route.test.ts` | 6 | route handler + secret-leak regression (T018a) |
| `site/lib/publish/locale-resolver.test.ts` | 4 | resolveSiteLocales (T020a) |
| `site/components/full-page/WorkspaceHero.test.tsx` | 3 | rename + click-opens-dialog (T024a) |
| `site/components/full-page/PublishSiteConfirmModal.test.tsx` | 7 | dialog body + Cancel/Confirm/disabled (T024a) |
| `site/components/full-page/RedirectMapList.test.tsx` | 5 | icon button + stopPropagation + disabled (T024a) |
| `site/components/full-page/PublishSiteConfirmModal.theme.test.tsx` | 6 | structural theme parity (T025; axe deferred) |
| **TOTAL new** | **48** | |

**jest-axe deferral (T025):** `jest-axe` not in `devDependencies`. Axe WCAG contrast scan deferred to `m_publish` manual smoke gate (T028). Documented in `site/docs/smoke-publish.md`.

**Regression:** 460 pre-existing tests continue to pass (total: 508 = 460 + 48).

**Manual smoke** (T028 — `m_publish`): see `site/docs/smoke-publish.md`. Blocks `/ship`.

## Handoff Metadata

- **Canonical run manifest:** `project-planning/workflow/run-20260516T194651Z.json` + `project-planning/workflow/current-run.json`
- **Implementation target directory:** `products/redirect-manager/site/`
- **Recommended next command:** operator runs `m_publish` smoke gate (T028) per `site/docs/smoke-publish.md` → then `/ship` (auto-lite docs emission)

### T027 — CHANGELOG fragment (for /ship auto-lite)

```
## PRD-003 — Publish Site + Per-Map Publish

- **Publish Site** — the "Publish all" hero CTA is now a real publish action (renamed to "Publish Site") that fires a SitecoreAI Publishing v1 job (Republish mode, all site locales) after a confirmation dialog.
- **Per-map Publish** — every Redirect Map row in the rail now has a Send icon button that publishes the individual map item (no children, no related items) as a fire-and-forget action.
- **Branch B transport** — a new server-side Next.js API route (`/api/publish`) holds the OAuth client-credentials; the client never sees the secret.
- **Toast feedback** — three states for both flows: requested (loading), queued (success + truncated job id), failed (error with HTTP status + API detail).
```

### T027 — README paragraph insert (for /ship auto-lite)

```
### Publishing

Redirect Manager ships a **Publish Site** button (Full Page workspace hero) and a per-map **Publish** icon button in the Redirect Maps rail. Both fire real SitecoreAI Publishing v1 jobs against your tenant and show toast feedback. Configure the `SITECORE_PUBLISH_CLIENT_ID`, `SITECORE_PUBLISH_CLIENT_SECRET`, `SITECORE_OAUTH_TOKEN_URL`, `SITECORE_OAUTH_AUDIENCE`, and `SITECORE_PUBLISHING_BASE_URL` environment variables (Branch B server-side OAuth proxy — see `.env.example`).
```

### T028 — Smoke gate status

**PENDING** — operator must run the `m_publish` real-tenant smoke checklist at `site/docs/smoke-publish.md` before `/ship` is unblocked. Record verdicts in `project-planning/workflow/run-20260516T194651Z.json` under `smoke_outcomes.m_publish-1/2/3`. A `deferred` verdict is a WARN and blocks `/ship`.
