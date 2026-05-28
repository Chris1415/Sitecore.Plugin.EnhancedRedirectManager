# /sync-redirect-proxy

Re-port the local `proxy-simulator.ts` to match the upstream `Sitecore/content-sdk` `dev` branch.

Run this when the in-app "Check upstream" button shows the drift banner (upstream SHAs differ from the local baseline).

**Prerequisites:** Run from the product repo root (`products/redirect-manager/`). Requires internet access to `api.github.com` and `raw.githubusercontent.com`.

---

## Step 1 — Read current baseline from snapshot JSON

Read `site/lib/redirects/__fixtures__/upstream-snapshot.json`.

Report:
- `branch` (should be `dev` for v0)
- `watchedFiles[].path` + `watchedFiles[].sha` for each file
- `knownDivergences[]` count (functions deliberately NOT ported)

## Step 2 — Fetch latest upstream SHAs and raw content

For each of the following 3 upstream files (in order):

**File A — simulator source (watched):**
- Commits API: `GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=dev&per_page=1`
  - Headers: `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`
  - Record `body[0].sha` (plain JSON array — NOT `.data[0].sha`)
- Raw content: `GET https://raw.githubusercontent.com/Sitecore/content-sdk/dev/packages/nextjs/src/proxy/redirects-proxy.ts`

**File B — utils dependency (watched):**
- Commits API: `GET https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/core/src/tools/utils.ts&sha=dev&per_page=1`
- Raw content: `GET https://raw.githubusercontent.com/Sitecore/content-sdk/dev/packages/core/src/tools/utils.ts`

**File C — upstream test file (extractor input — NOT watched, not committed):**
- Raw content ONLY: `GET https://raw.githubusercontent.com/Sitecore/content-sdk/dev/packages/nextjs/src/proxy/redirects-proxy.test.ts`
- This is input for `npm run extract:upstream-fixtures` (the AST extractor reads the test file to derive test cases)

## Step 3 — Compare SHAs against baseline

Compare the SHAs from Step 2 against `watchedFiles[].sha` in the snapshot.

- **If ALL SHAs match baseline:** Print "Already in sync — no patch proposed." and exit. No changes to any file.
- **If ANY SHA differs:** Continue to Step 4.

## Step 4 — Write fresh `_upstream-source.ts` for the AST extractor

Write the content of File C (upstream test file) to `site/lib/redirects/__fixtures__/_upstream-source.ts`.

Note: `_upstream-source.ts` is gitignored (it regenerates from upstream on demand). This gives the AST extractor fresh upstream test cases to parse.

## Step 5 — Propose re-port patch

Read the current `site/lib/redirects/proxy-simulator.ts`.

Compare it against the raw content of File A (upstream `redirects-proxy.ts`) and File B (`utils.ts`).

**Verbatim port discipline (ADR-0038, C1):** Replicate upstream semantics including quirks verbatim. Do NOT improve, refactor, or modernize upstream code. The `.slice(0, -1)` quirk in `isRegexOrUrl` is intentional — port it unchanged.

**Honor `knownDivergences[]` (ADR-0047, C2):** For each entry in `knownDivergences[]`, SKIP changes to the listed `function`. Do not propose edits to deliberately non-ported functions.

Propose the patch using the Edit tool — one hunk per affected function/section.

## Step 6 — Operator review

The operator reviews each proposed hunk via Claude Code's edit flow.

- **Accept:** Continue to Step 7.
- **Decline:** Exit. Leave simulator and snapshot unchanged.

## Step 7 — Regenerate fixtures and run tests

If the operator accepted the patch:

```bash
cd site && npm run extract:upstream-fixtures
```

Then:

```bash
cd site && npm test -- proxy-simulator
```

## Step 8a — On test GREEN: bump snapshot SHA

If `npm test -- proxy-simulator` passes:

1. Compute SHA-256 of the fetched File A content (hex string).
2. Compute SHA-256 of the fetched File B content (hex string).
3. Update `site/lib/redirects/__fixtures__/upstream-snapshot.json`:
   - `watchedFiles[0].sha` → new SHA from Step 2 (File A)
   - `watchedFiles[0].retrievedAt` → current ISO-8601 timestamp
   - `watchedFiles[0].fileHash` → SHA-256 of File A content
   - `watchedFiles[1].sha` → new SHA from Step 2 (File B)
   - `watchedFiles[1].retrievedAt` → current ISO-8601 timestamp
   - `watchedFiles[1].fileHash` → SHA-256 of File B content
   - Do NOT modify `originalPort` (set once at T1, per ADR-0044)
4. Update the `UPSTREAM_SHA` constant in `site/scripts/extract-upstream-fixtures.ts` (line 45) to the new File A SHA.
5. Print: "Snapshot updated. The in-app baseline updates after the next deploy."
6. Append one-line entry to `.claude/sync-redirect-proxy.log`:
   ```
   <ISO-timestamp> | sync | fileA: <old-sha> → <new-sha> | fileB: <old-sha> → <new-sha> | tests: GREEN
   ```

## Step 8b — On test RED: leave everything unchanged

If `npm test -- proxy-simulator` fails:

- Do NOT update `upstream-snapshot.json`
- Do NOT update `extract-upstream-fixtures.ts`
- Print: "Tests failed after patch — simulator and snapshot left unchanged. Fix the failing tests manually, then re-run /sync-redirect-proxy."
- Append one-line entry to `.claude/sync-redirect-proxy.log`:
  ```
  <ISO-timestamp> | sync-FAILED | tests: RED | <failure summary>
  ```

---

## Idempotency (AC-3.11)

Running this command twice when SHAs already match prints "Already in sync — no patch proposed" both times. No state changes on idempotent runs.

## knownDivergences escape hatch (ADR-0047, C2)

If upstream introduces a change to a function this app deliberately does not port (e.g. behavior tied to a Content SDK feature not used here), do NOT add it to the patch. Instead, add an entry to `upstream-snapshot.json`:

```json
{
  "at": "<ISO-date>",
  "reason": "<human rationale>",
  "function": "<functionName>",
  "upstreamSha": "<the upstream SHA at which this divergence was recorded>"
}
```

Then re-run this command — the function will be skipped in future patch proposals.

## Notes for the operator

- The in-app "Check upstream" button compares SHA only — it does not diff content. A drift banner after a comment-only upstream change is a known false positive (per PRD-005 non-negotiables).
- After Step 8a succeeds, the in-app baseline updates only after the next Vercel deploy. Operators may see the drift banner for a window between slash-command accept and deploy completion (R8).
- PAT-based GitHub auth is a future opportunity (FO-5.2). Rate limit is 60/hr unauthenticated.
