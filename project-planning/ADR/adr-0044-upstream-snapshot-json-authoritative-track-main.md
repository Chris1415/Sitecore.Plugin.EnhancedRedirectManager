# ADR-0044: Tracked upstream branch is `main`; baseline SHA + metadata moved to `upstream-snapshot.json` as authoritative; `originalPort` preserves `dev`-branch provenance

## Status

Accepted (amended 2026-05-22 — tracked branch reverted to `dev` for v0 after architecture-time probe found `main` 404s; promote to `main` once Sitecore publishes it)

## Context

PRD-004 ports the upstream Content SDK `RedirectsProxy` into a local simulator (`proxy-simulator.ts`), with baseline SHAs recorded as comment metadata in the file's header (`30b0db8f…` for `redirects-proxy.ts`, `e6153e5e…` for `utils.ts`, both from Sitecore/content-sdk's `dev` branch). PRD-005 introduces drift detection over time, which requires:

1. A **machine-readable** baseline that the in-app detector and the dev-time slash command can both read reliably (parsing comments is fragile — automated formatters can break it silently).
2. A **production-relevant** tracked branch — `dev` is in-progress code, `main` is what real tenants actually run. The drift signal should reflect what production looks like, not the in-progress upstream branch.
3. A way to **preserve the ADR-0038 verbatim-port provenance** from PRD-004 even after migrating the data out of the header comment.

## Decision

1. **Create `site/lib/redirects/__fixtures__/upstream-snapshot.json`** as the single source of truth for baseline SHAs + retrieval metadata. Committed verbatim (not gitignored). The file's `schemaVersion: 1` is enforced; mismatched version is an explicit error.

2. **Tracked branch for v0 is `dev` (amended 2026-05-22).** Original PRD-005 decision was to switch from `dev` to `main`. Architecture-time live probe of `https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=main` returned HTTP 404 — the file does not exist on `main`, and the repo's default branch is `dev`. Tracking `main` on day 1 would put the drift detector in permanent `error / not-found` state, making M1/M2 unverifiable. Revert to `dev` for v0; the `watchedFiles[]` array carries baseline SHAs from `dev`. **Promote to `main` (via snapshot JSON edit) once Sitecore publishes a `main` branch with the watched files** — this is a one-line operational change, not a code change. ADR-0046's on-demand rate-limit profile is unchanged either way.

3. **Preserve PRD-004's `dev`-branch port provenance via an `originalPort` field.** Shape:
   ```json
   "originalPort": {
     "branch": "dev",
     "ports": [
       { "path": "packages/nextjs/src/proxy/redirects-proxy.ts", "sha": "30b0db8fe768b83f03fd6b9772b0d3e14711c6b2", "portedAt": "2026-05-20T18:32:24Z" },
       { "path": "packages/core/src/tools/utils.ts", "sha": "e6153e5e80c2076704cad0876eec3b85ec3a1a9f", "portedAt": "2026-05-20T18:32:24Z" }
     ]
   }
   ```
   This field is set once during PRD-005 T1 migration and never modified afterward. It is the historical audit anchor.

4. **Rewrite `proxy-simulator.ts` header** to reference the JSON as authoritative. The data-bearing SHAs move to the JSON; the header retains ADR references + human prose + a one-line note about the original port (`Originally ported from Sitecore/content-sdk@dev as of 2026-05-20 — see __fixtures__/upstream-snapshot.json originalPort field.`).

5. **T1 spike-and-decide.** Fetch current `main` SHAs for the 2 watched files; compare against the `dev` SHAs PRD-004 recorded. If `main` and `dev` are bit-identical at the ported points: commit the snapshot with those SHAs and proceed. If they differ substantively: re-port within the same PR before committing the snapshot.

## Consequences

**Easier:**
- Both the in-app drift detector and the slash command read structured JSON instead of parsing comment text — robust to formatter changes.
- The drift signal reflects production-deployed Content SDK behavior (`main`), not in-progress upstream work (`dev`) — more honest to real-tenant operators.
- `originalPort` preserves ADR-0038's verbatim-port audit anchor; future engineers can trace "this code was originally ported from `dev`@30b0db8f" even after many drift cycles.

**Harder:**
- T1 adds a spike-and-decide step that PRD-004 didn't have. If `main` substantively diverges from `dev`, PRD-005 absorbs a one-shot re-port (or splits into 005a + 005b per OQ-5).
- A new file (`upstream-snapshot.json`) joins the source tree as a structured data artifact; future ADRs touching the snapshot must respect `schemaVersion`.

**Trade-offs:**
- Static-import of the JSON locks the baseline into the build bundle — an engineer-side SHA bump only reaches the deployed app after the next Vercel deploy (R8 documents this; AC-3.8 surfaces it to the engineer).
- The header comment loses its data-carrying role but retains its documentation role — a small redundancy, intentional for readability.

## Date

2026-05-22
