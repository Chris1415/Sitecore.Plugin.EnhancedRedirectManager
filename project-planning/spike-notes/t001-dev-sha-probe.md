# T001 — Upstream `dev` SHA probe (2026-05-22)

## SHAs retrieved

| File | PRD-004 baseline SHA | Current `dev` SHA | Match? |
|---|---|---|---|
| `packages/nextjs/src/proxy/redirects-proxy.ts` | `30b0db8fe768b83f03fd6b9772b0d3e14711c6b2` | `30b0db8fe768b83f03fd6b9772b0d3e14711c6b2` | YES |
| `packages/core/src/tools/utils.ts` | `e6153e5e80c2076704cad0876eec3b85ec3a1a9f` | `e6153e5e80c2076704cad0876eec3b85ec3a1a9f` | YES |

## Probe commands

```bash
curl -s -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/nextjs/src/proxy/redirects-proxy.ts&sha=dev&per_page=1"

curl -s -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/Sitecore/content-sdk/commits?path=packages/core/src/tools/utils.ts&sha=dev&per_page=1"
```

## Decision

**No re-port needed.** Both SHAs match the PRD-004 recorded baseline exactly. T002 is a NO-OP.

The PRD-004 port is still in full parity with upstream `dev` as of 2026-05-22.
