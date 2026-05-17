# ADR-0036: Per-map publish removed — Sitecore silently no-ops Items publish for Redirect Map items

## Status

Accepted (2026-05-17). Supersedes ADR-0032 for the publish placement decision (no per-map button exists anymore).

## Context

PRD-003 originally specified two publish flows (US-P1 site publish + US-P2 per-map publish). The per-map flow used `options.items[]` with `options.xmc.items.{mode, publishChildren, publishRelatedItems}` per the SitecoreAI Publishing v1 spec — body was wire-validated during Tranche 1.5 spike with a 201 Queued response.

During m_publish smoke (2026-05-17), operator verified the live Edge state after a per-map publish and discovered:

1. **Redirect Map items are not present in Edge content.** A list query against Edge for redirect-map-typed items returns empty. Redirect Maps live under `Settings/Redirects` as configuration items, not Edge-published content.
2. **Items publish silently no-ops these items.** Sitecore accepts the publish job (201 Queued, completes successfully), but the item is filtered out of the actual publish pass with `itemsSkipped` counter. Operator's Edge view of redirects does not change as a result of a per-map publish.
3. **Only Site publish updates redirects.** A full Site publish (`options.xmc.site.mode = "Republish"`) does propagate the merged `UrlMapping` field data to Edge — apparently as part of a broader site-config build step that is not triggered by Items publish.

This makes US-P2 broken-by-design. Shipping the per-map button would expose operators to a feature that returns immediate "success" toast but never actually publishes anything they edited.

## Decision

**Remove the per-map publish feature entirely from PRD-003.** Surgical removal of all related code, tests, ADR-0032 superseded.

Specifically:
- Delete `site/components/full-page/RedirectMapPublishButton.tsx` (no replacement)
- Delete `site/components/full-page/RedirectMapList.test.tsx` (only tested the new per-map button)
- Revert `site/components/full-page/RedirectMapList.tsx` to its pre-Tranche-2 state (no in-flight Set, no per-row publish button rendering)
- Drop `buildItemPublishBody` and the items branch in `publish()` from `site/lib/publish/publish-service.ts`
- Collapse `PublishScope` in `site/lib/publish/types.ts` from discriminated union to site-only interface
- Drop item-related tests from `site/lib/publish/publish-service.test.ts`
- Mark ADR-0032 (per-map icon placement) `Superseded by ADR-0036`

PRD-003 surface that remains:
- "Publish Site" CTA on WorkspaceHero (the rename + wire-up)
- Confirmation dialog
- Site-wide Republish publish job
- Job-status polling + cross-session resume (per ADR-0037)

## Consequences

**Easier:**
- Operators never see a button that lies (no "publish queued" toast for a publish that doesn't update Edge)
- Code surface area shrinks — one publish flow, one set of tests, simpler types
- ADR-0032's placement question becomes moot
- Smoke gate `m_publish` simplifies (no per-map sub-test)

**Harder:**
- Operators who only edited ONE map must now do a Site publish (15k+ items republished) — heavier but correct
- The "blast radius" framing PRD § 6 used to motivate UX differences (confirm for Site, no-confirm for per-map) becomes single-axis: always confirm Site publish

**Out of scope to revisit (future PRD candidates):**
- If Sitecore ever exposes redirect-map data via Edge directly, per-map publish becomes meaningful — reopen as a future PRD
- Selective publish ("publish only changed maps in one site-publish call") would require a Sitecore template change beyond this product's authority

## Date

2026-05-17 (discovered + recorded during m_publish smoke; baked into Tranche 3 of PRD-003 implementation).
