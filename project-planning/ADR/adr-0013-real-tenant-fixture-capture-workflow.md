# ADR-0013: Real-tenant fixture-capture workflow

## Status

Accepted

## Context

PRD-000 § 9 captured one real-tenant Authoring/Preview GraphQL response shape (the read shape for a single Redirect Map item). Multiple other shapes are unverified at architecture time and are flagged CAPTURE PENDING in `architecture-20260509T191751Z.md` § 5:

- `pages.context` actual fields populated in a Pages-editor session (`pageInfo.url` vs `.route` vs `.path` — closes OQ-3/OQ-A)
- `xmc.sites.listSites` + `xmc.sites.listCollections` response shape (closes OQ-1's residual ambiguity)
- `xmc.authoring.graphql` `item.children {}` envelope when listing children of a folder
- **Authoring write mutations** — `createItem`, `updateItem`, `deleteItem` verbs, argument shapes, boolean representations (closes OQ-9 + OQ-B + OQ-C — the highest-impact PRD risk R1)
- `application.context` `resourceAccess[]` shape with `tenantId` + `context.preview` populated (closes ADR-0007 verification)
- `RedirectType` GraphQL enum exact values via introspection (closes OQ-8)
- Redirect Map template GUID via introspection or template-tree lookup (closes OQ-5)

Rule `40-sdk-contracts.mdc` requires SDK request/response shapes to be cited from real-tenant fixtures or from declared `.d.ts` types in `node_modules`. Rule `30-tdd.mdc` requires SDK-touching RED tests to use independently-sourced fixtures. The architecture cannot proceed to `/task-breakdown` while this many shapes are working assumptions — the Lead Developer needs concrete fixtures to plan `lib/sdk/*` task contracts (§ 4c).

QuickCopy v0.1 hit this exact gap in 2026-04-27 and burned a cycle on a paraphrased "expected" mutation shape that didn't match the tenant. The lesson recorded under `feedback_phase_per_sdk_surface` is: capture before code.

The friction point is also operational — the architect typically does not have direct write access to the customer's real tenant; the stakeholder does. A protocol is needed that crosses that boundary cleanly without round-tripping every shape over chat.

## Decision

**Revised 2026-05-10 from "hard pre-`/task-breakdown` gate" to "progressive learning loop"** — the original hard gate was rejected by the operator on the grounds that capturing 9 fixture shapes manually before any app exists is materially harder than fixing them as they surface during implementation, and that the long-term answer is a standing **SDK Sandbox** Marketplace app (filed as a new idea in `storage/marketplace-app-ideas.md` on 2026-05-10) which closes the capture friction at the source. Until that Sandbox ships, this ADR governs the working mode for `/task-breakdown` and beyond:

PRD-000 (and all future PRDs in this product) follow a **progressive fixture-capture workflow** that does NOT block `/task-breakdown`:

1. **The architect prepares a capture script.** A single `tests/fixtures/graphql/_capture.md` file lists every CAPTURE PENDING shape from architecture § 5, the exact GraphQL query / mutation / SDK call to run for each, the variables to substitute, and the target output filename under `tests/fixtures/graphql/`. The architect is responsible for getting the queries / mutations *syntactically* right; the stakeholder is responsible for executing them against the real tenant.
2. **The pair runs the script in one session.** Architect + stakeholder — typically a Slack huddle / screen-share / 30-minute working block. The stakeholder drives the real tenant (Pages editor for `pages.context`; Authoring GraphQL playground or `client.mutate` from a registered test app for the `xmc.authoring.graphql` calls; introspection queries for enums/templates). For each shape:
   - Run the call against the tenant.
   - Verify the response is well-formed.
   - Save the verbatim JSON to the target filename.
   - If the call fails (auth, missing field, wrong verb), iterate the query / mutation **in the session** until it succeeds — do not defer to "I'll try later" because the friction-log shows that always slips.
3. **Failures are deltas, not blockers.** If a candidate mutation shape (e.g. `createItem(input: { … })`) is rejected by the schema, the working architecture is not "wrong" — it is hypothesis-stage. The session iterates: `createItem` → `create_item` → `addItem` → whatever the schema accepts. The captured fixture records the **winning** shape and the architecture is updated to match before fixtures land.
4. **Outputs live in `tests/fixtures/graphql/`.** One JSON file per call, named after the SDK key it represents. Each file ends with a one-line capture metadata line (in a comment if `.jsonc`, or a sibling `.md` if strict `.json`):
   ```
   captured: real-tenant <tenant-display-name> on <ISO-date> via <Authoring GraphQL | Pages editor | introspection>
   ```
5. **`/task-breakdown` opens with assumed shapes — fixtures land progressively.** The Lead Developer plans `lib/sdk/*` task contracts using the architect's assumed shapes (sourced from the captured Authoring **read** shape in PRD § 9 + ADR-0008, the Sitecore plugin skill documentation, and sibling-app evidence — `last-edit-trail/site/lib/sdk/authoring-graphql.ts` + `component-usage-atlas/site/lib/sdk/authoring-resolve.ts`). Each task that touches an unverified shape is annotated `assumed-shape: <fixture-filename>` so the QA Specialist (07) and the Developer (08) can locate it instantly. A CAPTURE PENDING is **not** a blocker for the task breakdown.
6. **The first time a real-tenant call disagrees with the assumed shape, treat it as data, not failure.** This will happen during `/implement` integration smoke OR `/test` real-tenant smoke (whichever runs first). When a divergence is detected:
   - Capture the **actual** response, write it to `tests/fixtures/graphql/<name>.json` with the provenance comment.
   - Update the assumed-shape annotation in the task to the captured shape.
   - Update the affected `lib/sdk/*` code + tests to match.
   - Append the divergence as a friction-log entry with severity `medium` (per `friction_log.min_severity` in the run manifest) so the pattern is captured.
   - If multiple shapes diverge in the same area (e.g. write surface diverges across `createItem` AND `updateItem` AND `deleteItem`), schedule the paired session described in § 4 and capture the cluster in one pass — but always *triggered by* a real divergence, not preemptively.
7. **The paired session described in § 4 is still available — but optional and on-demand.** When the operator and architect want to front-load capture for a high-risk surface (e.g. before a customer demo, before public-app submission, after a tenant schema bump), the paired session is the right tool. For day-to-day MVP work, the progressive learning loop in § 5–6 is the default.
8. **Future PRDs reuse this workflow.** PRD-001's multilingual + analytics surfaces will introduce new CAPTURE PENDING shapes (content-language enumeration, Upstash key shapes, head-app instrumentation contracts). Same progressive pattern applies. Older fixtures are not deleted, only added to.
9. **The SDK Sandbox app, when shipped, replaces the paired-session friction at the source.** Once the Sandbox is installed on the operator's tenant, capture becomes a 30-second self-service action — open the Sandbox, run the call, click "Save to fixtures", paste the file into the project repo. At that point this ADR may be superseded with a Sandbox-first protocol; for now it stays as the documented working mode.

## Consequences

**Easier (progressive mode):**

- `/task-breakdown` opens immediately — no human scheduling required to unblock planning. The Lead Developer plans against assumed shapes that are explicitly labeled as such, so QA and Developer know which tasks carry capture risk.
- Operator effort is amortized across the natural rhythm of `/implement` and `/test`, not concentrated into a single front-loaded paired session that has to be scheduled before any code exists.
- The "fix the divergence when it surfaces" loop **is the learning channel** — every divergence becomes a friction-log entry, an updated fixture, and a small ADR-update or memory entry that improves the *next* PRD's accuracy.
- The friendly error UX (PRD FR-13) already surfaces unexpected responses to operators in the live app — the same error path is what flags shape divergences in dev.
- Compatible with the standing **SDK Sandbox** idea — when the Sandbox ships, capture becomes self-service and the friction collapses further.

**Harder (progressive mode — accepted trade-offs):**

- A divergence that only surfaces at real-tenant smoke may force a small mid-cycle change to `lib/sdk/*` and its tests. Mitigated by: the divergence is local — typically one mutation shape or one field name; the test scaffold is parametric over the shape, so the change is tightly scoped.
- RED tests written against assumed shapes can pass against shared fiction until real-tenant smoke; this is the failure class rule `30-tdd.mdc` warns about. Mitigated by: every assumed-shape annotation is a directly visible flag in the task breakdown; the QA Specialist (07) explicitly enumerates them in `§ 9 test contract` and the smoke gates at `/test` re-run the calls against the real tenant before status flips to `tested`.
- Captured fixtures may still go stale if the tenant schema changes. Mitigated by: each fixture has a `captured: ... on YYYY-MM-DD` provenance; smoke gates at `/test` re-run the calls and detect drift before ship.
- "Real tenant" is a single environment (typically the customer's staging or the operator's sandbox). Tenants with significantly different field configurations may produce different shapes. Mitigated by: friendly error UX surfaces unexpected responses; the captured fixture is the **typical** case, not the universal one.

## Date

2026-05-10
