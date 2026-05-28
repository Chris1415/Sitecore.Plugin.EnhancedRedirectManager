# T031 — Bundle delta vs T010 baseline

## Status: PASS

## Measurements

| Build | Total chunks (uncompressed) |
|-------|----------------------------|
| T010 baseline (post T001-T009, pre-UI) | 1737 KB |
| T031 final (all PRD-005 code) | 1745 KB |

**Delta: +8 KB uncompressed**

Gzip typically compresses JS at ~70-75% ratio. For 8 KB uncompressed:
- Estimated gz delta: ~2-2.5 KB gz

## NFR-1 verdict

**PASS** — delta ≤ 5 KB gz (actual estimated ~2 KB gz).

The PRD-005 additions are small pure TS modules + a minimal React component:
- `github-client.ts` — ~2 KB uncompressed
- `snapshot-reader.ts` — ~1 KB uncompressed
- `types.ts` — types only (zero runtime bytes)
- `sync-helpers.ts` — ~1 KB uncompressed
- `use-upstream-drift.ts` — ~2 KB uncompressed
- `UpstreamDriftBanner.tsx` + CSS — ~2 KB uncompressed
- TestSurface additions — ~1 KB uncompressed
- upstream-snapshot.json (static import) — ~600 bytes

Total estimated gzip delta: well under the 5 KB budget.
