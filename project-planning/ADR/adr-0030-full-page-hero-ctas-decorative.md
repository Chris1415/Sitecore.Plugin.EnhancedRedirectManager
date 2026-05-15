# ADR-0030: Full Page hero CTAs ("View activity" / "Publish all") are decorative in PRD-002

## Status

Accepted (resolves PRD-002 OQ-10)

## Context

The V4 Blok Elevated POC at `pocs/poc-marketing-v4-blok-elevated/full-page.html` lines 55-58 ships two CTA buttons in the workspace hero zone:

- **"View activity"** — implies an activity-log surface listing recent redirect changes (who changed what when).
- **"Publish all"** — implies a bulk-publish flow that pushes pending changes across all maps.

Neither maps to existing functionality in PRD-000:

- PRD-000 has no activity log. The Dashboard Widget's "Last updated" tile shows the single most recent `__Updated` timestamp across the site's maps; there is no per-change audit trail, no "who did it", no time-series.
- PRD-000 has no bulk-publish surface. Map changes via `createRedirectMap` / `updateRedirectMap` are written directly to Sitecore Authoring; there is no draft / pending-changes concept in the current redirect-manager scope. (Sitecore's own publishing pipeline exists at the platform level — the Marketplace app does not surface or invoke it.)

PRD-002 § 5 In-Scope is explicit that the redesign adds no new Sitecore-facing functionality. Wiring "View activity" and "Publish all" would expand scope into territory PRD-002 has explicitly punted.

Three options were considered:

1. **Wire them** — implement an activity log (mock or real) and a bulk-publish flow. **Out of PRD-002 scope.** Adds substantial design + backend work; "activity log" overlaps with the future analytics PRD (PRD-003 candidate); "Publish all" would need a Sitecore publishing-API integration.
2. **Drop them** — remove the buttons from the Full Page hero entirely. Loses V4 marketing chrome; the workspace hero feels emptier; the V4-to-refined-POC diff (R-14) carries another removal.
3. **Ship as decorative** — the buttons render with V4 chrome (gradient text, hover lift, premium ease) but `onClick` is a no-op or shows a "Coming in a follow-on release" toast.

## Decision

**Option 3: ship as decorative with "Coming in a follow-on release" toast.** Both buttons render exactly as V4 designed them — same chrome, same hover treatment, same typography. When clicked, each shows a Sonner toast (the existing PRD-000 toast pattern) with copy approximately:

- **"View activity"** → toast: *"Activity log coming in a follow-on release. For now, the Dashboard Widget shows the most recent change timestamp."* (Final copy iterated by UI Designer.)
- **"Publish all"** → toast: *"Bulk publish coming in a follow-on release. For now, individual map changes save and publish immediately."* (Final copy iterated by UI Designer.)

Implementation:

- The buttons use the existing PRD-000 `<Button>` primitive (Blok). Standard hover / focus / active states apply.
- `onClick` handlers call `toast.info(...)` from `sonner` (already a PRD-000 dependency).
- No `data-preview-mock="true"` attribute on the buttons themselves — the buttons are real, the *target functionality* is what doesn't exist. The toast copy carries the disclosure.
- The buttons are NOT covered by the "Preview data" banner pattern (ADR-0025) — they are not displaying mock data, they are placeholder CTAs.
- No structural guard for these specific buttons — the toast-only behaviour is enforced by code review at PR time.

The follow-on PRD that wires real activity-log and bulk-publish flows (likely PRD-003 candidate or a subsequent PRD) picks up the buttons and swaps the toast `onClick` for the real surface invocation. The buttons' visual treatment is reused unchanged.

## Consequences

**Easier:**

- V4 marketing chrome on Full Page is preserved — the workspace hero feels complete, not gutted. Important because the workspace hero is the operator's first impression of Full Page under the redesign.
- The buttons are pre-positioned for the follow-on PRD that wires real functionality — no future-PRD design work; only the `onClick` handler changes.
- Operators get honest feedback (toast) instead of silent no-op clicks. The toast explicitly references the follow-on release so operators understand the timing.
- Zero scope expansion in PRD-002 — no activity log infrastructure, no bulk-publish flow, no Sitecore publishing-API integration.
- The pattern (decorative button + toast disclosure) is reusable for any future V4-chrome-introduces-a-CTA-with-no-functionality situation. Architectural template.

**Harder:**

- Operators clicking the buttons will see toast disclosure and may feel friction ("why is this button here if it doesn't do anything yet?"). Mitigated by toast copy being honest about the timing.
- The buttons need accessibility care — they are functional buttons (announce as buttons to screen readers, focusable, keyboard-activatable) but the activated behaviour is just a toast. `aria-label` on each button could clarify the placeholder nature, but architect picks: keep the visual label as-is (operators see "View activity") and let the toast carry the disclosure. UI Designer + architect refine at implementation.
- If a future PRD wires activity-log first and bulk-publish much later (or vice versa), there will be a window where one button has real behaviour and the other still shows the placeholder toast. Acceptable — each button independently transitions when its underlying feature ships.
- The structural-guard discipline can't easily verify "these buttons currently call toast.info, not real functionality" — a developer could accidentally wire one to real functionality before the follow-on PRD lands. Mitigation: PR review. If this becomes a frequent miss, a code-comment marker (`// PRD-002 decorative — wire in follow-on`) can be added; not load-bearing today.

**Neutral:**

- The toast behaviour does not touch the SDK envelope, the Cloud Portal Test App registration, or any other PRD-002 surface.
- This ADR does not affect any existing PRD-000 functionality. The buttons are new (V4-introduced); they do not replace any existing CTA on the Full Page surface.

## Date

2026-05-14
