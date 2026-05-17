# ADR-0031: Publish surface decided at Tranche 1 (SDK wrapper vs server-side OAuth proxy)

## Status

Accepted

## Context

PRD-003 wires the placeholder "Publish all" hero CTA to a real Sitecore publish job and adds a per-map "Publish" action. The publishing endpoint is `POST /authoring/publishing/v1/jobs` on the SitecoreAI Publishing v1 API (operator-supplied spec). The integration target is known and locked.

What is NOT known at planning time is **whether `@sitecore-marketplace-sdk/xmc` exposes a wrapper for this endpoint**. The operator's initial inspection found none, but the answer determines which architectural branch this PRD takes:

- **Branch A — SDK wrapper exists.** Call publishing through ClientSDK Mode A like every other Sitecore call this app makes today. No new server-side code. ADR-0002 ("Marketplace SDK Mode A scaffold — no server-side OAuth proxy") remains intact.
- **Branch B — no SDK wrapper.** Add a new Next.js API route at `app/api/publish/route.ts` that holds OAuth client-credentials and proxies the REST call. This is the **first server-side route in Redirect Manager** — an architectural inflection. ADR-0002's Consequences section explicitly anticipated this: *"If a future PRD needs to call a Sitecore REST API the SDK does not wrap, the OAuth proxy or a different scaffold must be revisited at that point."*

Choosing the branch before /implement starts would either (a) require a speculative architecture write that gets discarded if the probe contradicts it, or (b) bias the architect toward one branch on incomplete information. Neither is good.

The clean answer is to **defer the choice to /implement Tranche 1**, which already has the capture-and-decide pattern for exactly this kind of question (see ADR-0013 — Real-tenant fixture-capture workflow, and the cancelled PRD-001 case study in ADR-0023). The probe is cheap (5–10 minutes inspecting `.d.ts` files + one live call) and authoritative.

## Decision

The publish surface decision is **deferred to Tranche 1 capture** of PRD-003 implementation. The capture artifact records:

- **D-T1.1** — SDK has a publishing wrapper? **Yes → Branch A**. **No → Branch B**.
- **D-T1.2** — Is `options.xmc.locales: ["*"]` accepted? (Live probe.) Yes → use shorthand. No → enumerate locales from `xmc.sites.<site>.languages` (which is the default body shape per PRD AC-P1.4 either way).
- **D-T1.3** (Branch B only) — OAuth client-credentials service client registered with required scopes (`xmcpub.jobs.*:w` + `xmcloud.cm:admin`)? If not, operator setup blocker before Tranche 2.

**Operator pre-commitment**: Branch B is pre-approved as the fallback. The probe confirms; it does NOT re-open the decision space. If the SDK has no wrapper, Branch B proceeds without further consultation.

**Follow-on ADR**: If Branch B lands, a successor ADR is written at the end of Tranche 1 (or at Tranche 2 implementation start) recording the **partial supersede of ADR-0002** — specifically, that ADR-0002's "no server-side OAuth proxy" stance is relaxed for the publishing surface only. Other Sitecore calls in this app remain Mode A. ADR-0002 stays Accepted overall; the new ADR documents the carve-out.

If Branch A lands, no successor ADR is required — ADR-0002 stands intact.

## Consequences

**Easier:**
- /architect produces a thin minimal-track output: one decision-gate ADR (this one), with the actual branch resolution naturally landing one step later.
- The Developer reads a clear capture-then-implement script at Tranche 1 — no guessing.
- Operator's pre-commitment to Branch B removes the second-cycle decision loop (no "ok we found no wrapper, what do we do?" round-trip).
- The probe is a small reusable diagnostic — informs future Marketplace PRDs that may face the same question (Agent API, Pages API, Sites mutation surfaces, etc.).

**Harder:**
- Two ADRs may be required for one PRD (this one + a successor) — slightly more bookkeeping. Mitigation: ADR README index lists both with cross-references.
- The architecture document for PRD-003 is unusually thin (minimal track; no separate blueprint) — readers expecting a fully-specified architecture must read this ADR and PRD § 9 instead.
- If Tranche 1 reveals a third option neither pre-considered (e.g. a partial SDK surface that needs extension), the Tranche 1 capture has to escalate to operator decision — not a silent path. Acceptable; cheap to discover.

## Date

2026-05-16
