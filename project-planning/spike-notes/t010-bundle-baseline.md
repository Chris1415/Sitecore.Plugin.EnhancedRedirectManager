# T010 — Bundle size baseline (pre-PRD-005 UI code)

Captured after T001–T009 (types + snapshot JSON + snapshot reader + github-client),
before T3 (hook) and T4 (UI components) code is added.

## Build output

- Build: GREEN (Next 16.1.7 Turbopack, TypeScript strict, 9 routes)
- Total `.next/static/chunks/` size: ~2.0 MB (uncompressed), ~1737 KB total

## Top chunks (uncompressed)

| Size | Filename |
|------|----------|
| 496K | 355ccf4b897a315f.js |
| 220K | 3a7ba59533961d35.js |
| 152K | e5333f6d2c468659.js (×3 variants) |
| 116K | a8caf86c79dc84cd.js |
| 112K | a6dad97d9634a72d.js |
| 76K | 22510d34d8935378.js |
| 52K | 30cc7f5fe7896da3.js |
| 44K | 288e4cbfb33c707f.js |

## NFR-1 target

PRD-005 net delta must be ≤ 5 KB gz vs this baseline.
T031 will compare against this snapshot after all UI code is added.
