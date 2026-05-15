# ADR-0024: V4 "Blok Elevated" as PRD-002 visual base; relaxed redesign rule (V4-aligned with reality validation, not pure re-skin)

## Status

Accepted

## Context

PRD-000 shipped Redirect Manager as a working, operator-grade Sitecore Marketplace app with utilitarian Blok-default visual identity. PRD-001 (multilingual CRUD) was cancelled at Tranche 1 (ADR-0023) — UrlMapping is SHARED on the stock Redirect Map template, so the multilingual story has no viable per-language data axis without a Sitecore template change.

With multilingual deferred indefinitely and no major feature work queued, the operator opened a marketing-driven design exploration on 2026-05-13. Four variants were produced as standalone HTML clickdummies under `pocs/poc-marketing-v{1,2,3,4}-*/`:

- **V1 Aurora** — Premium SaaS gradient-mesh aesthetic, **off-Blok** (custom palette, custom typefaces).
- **V2 Neo Brutalism** — Anti-design with heavy borders, hard-offset shadows, **off-Blok**.
- **V3 Award Editorial** — Magazine-portfolio kinetic typography, **off-Blok** (Fraunces serif + custom accents per page).
- **V4 Blok Elevated** — Premium feel **within** the Blok Nova token system: gradient-text headlines composed from `color-mix(in oklch, var(--primary), var(--info))`, frosted-glass surfaces (`backdrop-filter` over the existing `--card` token), primary-tinted hover glows, drifting `--primary`/`--info` plumes, kinetic letter reveals on hero headlines, theme-aware light/dark. Zero invented hex outside the existing `theme.css`.

The operator selected **V4 Blok Elevated** because it achieves marketing-grade polish while staying entirely inside the Blok design system — same Geist Sans/Mono stack, same semantic tokens, same Blok component anatomy, just with higher composition ambition.

The initial PRD-002 draft framed the redesign as **"pure visual re-skin"** — functional surface stays 1:1 with PRD-000, only chrome changes. The critical-review pass + operator directive on 2026-05-13 relaxed that rule: V4 shows UX evolutions (Context Panel inline quick-add replacing a modal; hero-scale `<h1>` count headers replacing quiet headers) that are genuine improvements, not just chrome. Constraining PRD-002 to "no UX changes" forces those improvements into a separate PRD and fragments the redesign work artificially. The operator directive (verbatim): *"if the UX changes for instance from modal to inline as per design we should do that. validate the rest against the current state and adjust the newest prd as well if needed to match. What I want is the great new design with the values from today. What does not exist will be hard coded."*

PRD-002 therefore adopts a **relaxed redesign rule**: V4-aligned redesign with reality validation. V4 visual language ships AND V4 UX evolutions ship where V4 reveals better interaction patterns; current `site/` source code is canonical reality for enum values, available SDK fields, and component flows; mocks fill any V4 content slot that has no real data source today (ADR-0025).

## Decision

**V4 Blok Elevated is the canonical visual base for PRD-002.** All three redesigned extension-point routes (Full Page, Context Panel, Dashboard Widget) adopt V4's:

- **Typography** — Geist Sans + Geist Mono only. Hero zones scale up dramatically (Geist Sans 700 at clamp(48px, 8vw, 96px)); body/UI/table content stays at PRD-000 scales.
- **Color** — strictly from the existing Blok Nova token system. Zero invented hex outside `site/app/globals.css`. All gradients via `color-mix(in oklch, var(--primary), var(--info))` or equivalent token expressions. All shadows from `--shadow-*` tokens or composed via `color-mix` with primary tint.
- **Surface treatment** — frosted-glass cards via `backdrop-filter: blur(18px) saturate(160%)` + `background: color-mix(in oklch, var(--card) 80%, transparent)`. Hover lifts with primary-tinted glow (`box-shadow: 0 12px 32px color-mix(in oklch, var(--primary) 14%, transparent)`).
- **Motion** — drifting `--primary`/`--info` plumes (Full Page only), gradient-text headlines, kinetic letter reveals (Full Page hero only), hover-lift cards, count-ups on stat numbers. All easing via `cubic-bezier(0.16, 1, 0.3, 1)` (premium ease). `prefers-reduced-motion: reduce` disables all `@keyframes` animations — non-negotiable.
- **Component anatomy** — real Blok primitives composed differently. Buttons stay `@blok/button`, cards stay `@blok/card`, alerts stay `@blok/alert`. No new component vocabulary; new visual decisions live in CSS layers, not new primitive types.

**Redesign rule (relaxed from pure re-skin):**

- V4 visual language ships everywhere (chrome, typography, surface treatment, motion within the mixed-motion budget per ADR-0027).
- **V4 UX evolutions ship** where V4 demonstrates a different interaction pattern than current code — explicitly: Context Panel modal → inline quick-add (ADR-0026); Context Panel quiet header → hero `<h1>` count header.
- **Current `site/` source code is canonical reality.** Where PRD-000 prose said one thing but the shipped code does another, PRD-002 reflects the code. Notably: `RedirectType` enum has **3 values** (`Redirect301`, `Redirect302`, `ServerTransfer`) per `site/lib/domain/types.ts:17` + `site/lib/redirects/redirect-type-enum.ts:26` — `Redirect307` was dropped during PRD-000 Tranche 6a (real-tenant capture 2026-05-11, recorded in `docs/decisions.md`) because the head-app resolver does not honour 307.
- **Speculative V4 content** that has no real data source today (hero stats, sparklines, top-destinations, "Last publish by Anna" attribution, "all healthy" badges, "Edge caches refreshed across N languages" line, stat strips, mini-widgets) ships as **hardcoded mocks** under per-surface "Preview data" banners (ADR-0025).
- **Specific V4 content scrubbed** for reality alignment: drop "Active"/"Draft" status pills (use real RedirectType enum); drop all `/de/...` paths in mocks (en-only per ADR-0023); drop the "Edge caches refreshed across 7 languages" line (contradicts ADR-0010 + ADR-0023); drop the `--draft` CSS class everywhere.

**IntroPage `/` is explicitly OUT of scope.** PRD-002 redesigns only the 3 daily-driver extension-point routes; the existing IntroPage from intro commit `76a6507` stays unchanged. Rationale: operator scoped PRD-002 to surfaces where elevated chrome materially affects daily work; IntroPage is a low-frequency landing surface and any IntroPage redesign is a separate future opportunity.

**Functional contract with Sitecore preserved 1:1.** No new SDK surfaces, no new GraphQL mutations, no new backend work. All `xmc.authoring.graphql` calls and all `site/lib/sdk/*` wrappers are untouched. The only client-side functional change is the Context Panel modal → inline-form UX evolution (ADR-0026), which executes the same Authoring GraphQL mutations the existing modal flow runs today.

## Consequences

**Easier:**

- Brand consistency with the rest of the Sitecore Marketplace surface area — V4 stays inside Blok, so visual choices automatically theme-switch and read as "part of the family."
- The marketing-grade impression is achievable with bounded engineering — no backend work, no new SDK contract verification, no new auth model. PRD-002 ships entirely through CSS + a single interaction-pattern change.
- Future "data plumbing" PRD (PRD-003 candidate) lands into a pre-built visual chassis — design work has already happened in PRD-002; PRD-003 just swaps mocks for live data sources by flipping `PREVIEW_DATA_ACTIVE` flags (ADR-0025).
- Multilingual reincarnation (if ever) can adopt V4 chrome unchanged when the Sitecore template change + head-app resolver work eventually lands — V4 has no en-only assumptions baked in (only the mock content does, and that's swapped out).
- Reduced-motion respect is taken seriously from day one — no retrofit needed.

**Harder:**

- The relaxed redesign rule (V4 UX evolutions in scope) means **PRD-000 Vitest tests that assert on modal anatomy must be re-pointed at the inline form** (Context Panel). Lead Developer audits the test suite at `/task-breakdown`; QA Specialist enriches with TDD steps. R-12 in PRD-002 § 13 captures this risk.
- V4-specific tunable values (plume drift duration, glass alpha, hover-glow tint percentage, hero clamp range) must live in a single CSS variable set to avoid drift across files (R-13). One file enforces; structural review confirms.
- The refined POC at `pocs/poc-v1-prd002/` may visually diverge from the original V4 references as the architect applies the reality reconciliations (R-14). Architect records a V4-to-refined diff explicitly in the architecture artifact.
- Operators expecting "PRD-002 = pure visual re-skin" may be surprised by the Context Panel interaction-pattern change. Mitigated by ADR-0026's explicit framing + smoke gate m5 covering the new flow.
- Mock content on Full Page + Dashboard Widget creates a credibility surface area — operators must be able to identify what's preview-data vs. real. Mitigated by per-surface "Preview data" banners + `data-preview-mock="true"` attributes + structural guard pairing banner-presence with mock-element presence (ADR-0025).
- The "no UX changes beyond V4" rule still applies — implementation reveals + new affordances become follow-on PRDs, not in-scope creep. PR review enforces.

**Neutral:**

- ADR-0024 supersedes neither ADR-0010 (en-only MVP — still in force) nor ADR-0023 (multilingual cancelled — still in force). V4's visual language is multilingual-agnostic; the mock content is en-only.
- ADR-0024 does not change the Marketplace SDK contract, the Cloud Portal Test App registration, or any deployment / hosting decisions from PRD-000.

## Date

2026-05-14
