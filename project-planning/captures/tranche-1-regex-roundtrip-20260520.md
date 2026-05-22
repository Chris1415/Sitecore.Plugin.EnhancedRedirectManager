# Tranche 1 — Regex Round-Trip Probe Capture

---
document_type: capture
artifact_name: tranche-1-regex-roundtrip-20260520.md
prd_id: PRD-004
generated_at: 2026-05-20T16:45:00Z
captured_at: 2026-05-20T18:32:24Z
task_ids: T001, T002, T003, T004, T005
purpose: |
  Hard-gate verification that the existing `lib/url-mapping/{parse,serialize}.ts`
  encoder/decoder preserves every regex character class on a Sitecore Authoring
  → Preview round-trip. Required before T2 (simulator port) starts.
gate_decision: PASS
gate_timestamp: 2026-05-20T18:32:24.180Z
capture_method: automated via T1 probe button (NEXT_PUBLIC_T1_PROBE=true) — creates throwaway map, byte-diffs the round-trip programmatically, auto-deletes
---

## T001 — Authored rows

Rows authored programmatically by T1 probe — see `site/lib/dev/t1-probe-specs.ts` for the canonical source. Probe creates a throwaway map named `PRD-004 T1 Probe AUTO-DELETE-SAFE` with all 8 rows in `UrlMapping`, then re-reads via `listRedirectMaps`, then deletes the map.

## T002 — Observed (round-tripped) rows

| Row | Observed source | Observed target | Status |
|-----|-----------------|-----------------|--------|
| 1   | `^/products$` | `/catalog` | PASS |
| 2   | `^/blog/(.+)/(?:legacy)$` | `/blog/$1` | PASS |
| 3   | `\.html?$` | `/static$0` | PASS |
| 4   | `^/items/[0-9]{4,6}$` | `/products/$0` | PASS |
| 5   | `^/users/[a-zA-Z0-9_-]+$` | `/profiles/$0` | PASS |
| 6   | `^/(news\|press\|media)/(.+)$` | `/announcements/$2` | PASS |
| 7   | `/old-page` | `/new-page` | PASS |
| 8   | `^/legacy/[a-z]+/(.+)?$` | `/archive/$1` | PASS |

### Per-character-class matrix

| Class | Example token | Status | Notes |
|-------|---------------|--------|-------|
| Anchors — `^` | row1, row2, row4, row5, row6, row8 | PASS | |
| Anchors — `$` | row1, row2, row3, row4, row5, row6, row8 | PASS | |
| Capturing group — `(` `)` | row2, row6, row8 | PASS | |
| Non-capturing group — `(?:` | row2 | PASS | |
| Escape — `\.` | row3 | PASS | |
| Quantifier — `?` | row3, row8 | PASS | |
| Quantifier — `+` | row2, row5, row8 | PASS | |
| Quantifier — `{N,M}` | row4 | PASS | |
| Char class — `[a-z]` etc. | row4, row5, row8 | PASS | |
| Alternation — `|` | row6 | PASS | |
| Capture-group ref — `$N` (target) | row2, row6, row8 | PASS | |
| `$0` reference (target) | row3, row4, row5 | PASS | |

**12 of 12 character classes round-trip byte-identical.** The existing `lib/url-mapping/{parse,serialize}.ts` encoder/decoder pipeline is correct for every regex character class the simulator must support.

---

## T003 — Upstream SHA capture

| File | Commit SHA | Permalink (blob) | Retrieved (ISO-8601 UTC) |
|------|-----------|------------------|--------------------------|
| `packages/nextjs/src/proxy/redirects-proxy.ts` | `30b0db8fe768b83f03fd6b9772b0d3e14711c6b2` | https://github.com/Sitecore/content-sdk/blob/30b0db8fe768b83f03fd6b9772b0d3e14711c6b2/packages/nextjs/src/proxy/redirects-proxy.ts | 2026-05-20T18:32:14.895Z |
| `packages/core/src/tools/utils.ts` | `e6153e5e80c2076704cad0876eec3b85ec3a1a9f` | https://github.com/Sitecore/content-sdk/blob/e6153e5e80c2076704cad0876eec3b85ec3a1a9f/packages/core/src/tools/utils.ts | 2026-05-20T18:32:14.895Z |

Raw permalinks for the simulator header:

- `https://raw.githubusercontent.com/Sitecore/content-sdk/30b0db8fe768b83f03fd6b9772b0d3e14711c6b2/packages/nextjs/src/proxy/redirects-proxy.ts`
- `https://raw.githubusercontent.com/Sitecore/content-sdk/e6153e5e80c2076704cad0876eec3b85ec3a1a9f/packages/core/src/tools/utils.ts`

These SHAs get pasted into the `proxy-simulator.ts` header docblock at T006/T013.

---

## T004 — Staging completion

- [x] `site/lib/redirects/__fixtures__/_upstream-source.ts` — to be populated at T006/T010 (from the SHA-pinned upstream `redirects-proxy.test.ts`)
- [x] `site/lib/redirects/__fixtures__/.gitignore` — to be added at T006/T010 (`_upstream-source.ts`)
- [x] Leading comment in `_upstream-source.ts` will cite T004 + the T003 SHAs + the line "do NOT commit; regenerated at T2 start" — added at T006/T010

T004 staging is deferred to T2 entry (T010 — extractor implementation) since the staging is consumed by the extractor only.

---

## T005 — Gate decision

### Outcome

- [x] **PASS** — every character class round-trips byte-identical; queue T2 (simulator port) starting at T006
- [ ] **FAIL**

### T0 follow-ups

None — no character class failed. T2 starts at T006.

### Gate timestamp

`2026-05-20T18:32:24.180Z`

### Signed off by

Operator (christian@hahn-solo.net) via T1 probe automated capture
