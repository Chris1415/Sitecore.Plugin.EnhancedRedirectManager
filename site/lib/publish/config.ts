/**
 * T020 — Publish configuration constants.
 *
 * `PUBLISH_LOCALE_SHORTHAND_ACCEPTED` is set based on Tranche 1 D-T1.2 outcome:
 * - false = enumerated locales (safe default — Tranche 1 confirmed shorthand rejected
 *   or probe was inconclusive; the safe default is always enumerated per PRD AC-P1.4)
 * - true = `["*"]` shorthand accepted (only if T004 explicitly confirmed acceptance)
 *
 * Tranche 1 outcome: shorthandAccepted = false (enumerated locales default).
 * PRD-003 prd-minimal says "enumerated wins by default".
 */
export const PUBLISH_LOCALE_SHORTHAND_ACCEPTED = false;
