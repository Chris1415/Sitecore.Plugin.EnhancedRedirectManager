# PRD Minimal (execution orientation)

---
document_type: prd_minimal
artifact_name: prd-minimal-003.md
pairs_with_prd: project-planning/PRD/prd-003.md
generated_at: 2026-05-16T19:46:51Z
run_manifest: project-planning/workflow/run-20260516T194651Z.json
consumed_by:
  - Developer (08) under `/implement`
purpose: |
  Condensed north-star for implementation. Keeps token use low: agent 08 reads this plus
  the enriched task breakdown only—not the full PRD or architecture doc.
---

## Problem (one short paragraph)

The Full Page workspace hero ships a "Publish all" CTA from PRD-002 that is decorative-only (toast placeholder). Operators editing redirect maps must leave the Redirect Manager and use SitecoreAI's native publishing UI to ship changes. Per-map publishing is even worse: no entry point in the app at all. Wire the placeholder to a real Sitecore publish job (rename "Publish all" → "Publish Site"), and add a per-map "Publish" action in the Redirect Maps rail.

## Goal (one short paragraph)

Zero-leave publish flow on the Full Page workspace. One button publishes the whole site (Republish mode + all configured locales) with a confirmation dialog. Per-map "Publish" buttons fire-and-forget publish a single Redirect Map item only (no children, no related). Both call SitecoreAI Publishing v1 (`POST /authoring/publishing/v1/jobs`). Toast feedback on success/failure. No job-status polling.

## Non-negotiables (bullets)

- **Rename "Publish all" → "Publish Site"** on `site/components/full-page/WorkspaceHero.tsx` line 212. The string "Publish all" MUST NOT appear in the rendered DOM after this PRD.
- **Site publish body**: `options.xmc.site.mode = "Republish"`, `options.xmc.locales = <enumerated locales from xmc.sites.<site>.languages>`, `source = "Redirect Manager"`. **Enumerated wins by default — only switch to `["*"]` if Tranche 1 (D-T1.2) confirms the API accepts it.**
- **Per-map publish body**: `options.items = [{ id: <map-guid>, type: "Item", locale: "*" }]`, `options.xmc.items.mode = "Republish"`, `publishChildren: false`, `publishRelatedItems: false`. Item-only — no children, no related. Operator was explicit.
- **Confirmation dialog ONLY for Publish Site** (tenant-wide blast radius). Per-map is fire-and-forget, no confirmation.
- **Toast UX**: three states for both flows — requested (transient), queued (success with truncated job id), failed (error with HTTP status + API `detail` or `title`). Re-use existing Blok toast.
- **Branch selection happens at Tranche 1, not at /implement start.** Probe `node_modules/@sitecore-marketplace-sdk/xmc/dist/*.d.ts` for `publish`/`publishing`/`jobs` surfaces. Branch A if found (SDK Mode A call); Branch B if not (new Next.js API route at `app/api/publish/route.ts` holding OAuth client-credentials, proxying to the REST endpoint). Operator has pre-approved Branch B as fallback. ADR-0031 records the deferred decision.
- **Surfaces**: Full Page only. Context Panel and Dashboard Widget unchanged.
- **No silent failures**: every non-2xx response shows an error toast. Never console-only.
- **Secret hygiene (Branch B only)**: OAuth client-credentials secret is server-only. Client receives only `{ jobId, status, ... }`. NEVER leak the secret to client bundle.
- **Single service module** wraps both flows — one place to maintain the contract.
- **Theme parity**: dark / light / system render the new CTA, dialog, and per-map button correctly with ≥ AA contrast (per global theme policy).
- **Idempotency guard**: button disabled between click and response (NFR-P6); prevents double-submit.

## In scope / out of scope (very short)

- **In scope:**
  - Rename "Publish all" → "Publish Site" + wire to real handler
  - Confirmation dialog (site, locale count, mode, source)
  - Per-map "Publish" action on every Redirect Map row (placement at /architect's discretion per § 11; pick from icon / overflow / row-end)
  - Service module wrapping both publish flows + toast UX
  - Tranche 1 SDK probe + Tranche 2 implementation
  - Branch A: SDK Mode A call (if wrapper exists)
  - Branch B: new Next.js API route + OAuth client-credentials (if SDK has no wrapper) + new ADR partially superseding ADR-0002
  - Auto-lite ship docs (1-paragraph README delta + CHANGELOG entry)
- **Out of scope:**
  - Job-status polling, progress UI, cancel-mid-publish
  - Bulk multi-select publish
  - Publish actions on Context Panel / Dashboard Widget
  - HealthBadge / "Validate health" CTA wire-up (separate placeholder)
  - Per-mapping publish (no separate mapping items exist)
  - Mode-toggle UI (Smart/Republish/Incremental)
  - Schedule-publish-for-later
  - Per-locale partial publish
  - Visual redesign of Full Page hero

## Success criteria (3–7 bullets)

- Clicking "Publish Site" + confirming → 201 from publishing API + success toast with truncated job id within 3s P95.
- Clicking per-map "Publish" → 201 + success toast within 3s P95.
- Both jobs appear in SitecoreAI's publishing job list with `source: "Redirect Manager"`.
- Any non-2xx surfaces as visible error toast with HTTP status + API `detail` or `title`.
- Theme parity passes (dark / light / system render the dialog + button correctly).
- Real-tenant `m_publish` smoke gate passes on solo tenant.

## Key constraints & assumptions

- ADR-0002 ("Marketplace SDK Mode A scaffold — no server-side OAuth proxy") may be partially superseded by a new ADR at Tranche 2 if Branch B lands. ADR-0002 § Consequences explicitly anticipates this.
- ADR-0031 (this PRD) records the Tranche 1 probe + decision gate. ADR-0032 (or similar) records the actual branch picked + supersede if applicable.
- SitecoreAI Publishing v1 endpoint contract (`POST /authoring/publishing/v1/jobs`) per operator-supplied API spec (PRD § 9.1). Required scopes: `xmcpub.jobs.*:w` + `xmcpub.cm:admin` for the service client (Branch B).
- `xmc.sites.<site>.languages` is the locale source. If unavailable, capture in Tranche 1.
- Re-use Blok toast + modal components from PRD-002 (`EditMapSettingsModal` or `DeleteMapConfirmModal` shell). No new design tokens.
- Theme policy: dark/light/system mandatory; reduced-motion compliance carries forward from PRD-002 NFR-R4.
- Rail row affordance for per-map Publish: there is NO existing per-row action pattern (edit/delete live on the detail pane, not on rail rows). /architect picks from the three options in PRD § 11 (icon button / overflow menu / row-end action). Do NOT assume an existing per-row pattern to inherit.
- AC-P1.4 body shape (enumerated locales) wins by default; `["*"]` is opportunistic only if Tranche 1 D-T1.2 confirms.

## Handoff

- **Full PRD:** `project-planning/PRD/prd-003.md` (for humans and upstream agents only — not loaded by agent 08 in normal flow.)
- **Executable contract:** `project-planning/plans/task-breakdown-<timestamp>.md` after QA (07) enrichment.
- **Reference ADRs:** ADR-0002 (current Marketplace Mode A constraint), ADR-0031 (this PRD's decision-deferral gate). New ADR at /architect if Branch B lands.
- **Reference skills:** `sitecore:sitecoreai-publishing` (REST contract), `sitecore:sitecoreai-auth` (OAuth client-credentials protocol), `sitecore:marketplace-sdk-xmc` (Tranche 1 SDK probe target), `sitecore:setup-marketplace-client-side` § "Optional: server-side OAuth proxy" (Branch B canonical pattern).
