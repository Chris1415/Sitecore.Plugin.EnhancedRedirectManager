/**
 * T021 — lib/redirects/redirect-type-enum.ts
 *
 * Source-of-truth list of valid RedirectType values.
 *
 * assumed-shape: tests/fixtures/graphql/redirect-type-enum.json
 * NOTE: 'ServerTransfer' is verified from real-tenant capture (PRD § 9 / ADR-0008).
 *       '301', '302', '307' are assumed names pending Tranche 6 capture (OQ-8).
 *       When the capture confirms the exact wire enum names, update both this file
 *       and lib/domain/types.ts RedirectType union accordingly.
 *
 * Exports:
 * - REDIRECT_TYPES: readonly tuple of the 4 assumed values
 * - isValidRedirectType(value): type-guard
 * - redirectTypeDisplayName(value): operator-friendly label for dropdowns
 *
 * The Full Page detail editor's RedirectType <Select> (T038) reads from this module.
 *
 * Pure module. Zero SDK dependency.
 */

import type { RedirectType } from '@/lib/domain/types';

/**
 * All valid RedirectType values shown in the operator UI.
 *
 * Real-tenant confirmed 2026-05-11: '307' is NOT exposed on the Redirect Map
 * template's RedirectType droplist (operator confirmed head-app resolver doesn't
 * honour it). Three values only: 301, 302, ServerTransfer.
 *
 * ServerTransfer: verified from real-tenant capture (PRD § 9).
 * 301 / 302: assumed wire-enum names — pending Tranche 6 write-surface capture (OQ-8).
 */
export const REDIRECT_TYPES = ['301', '302', 'ServerTransfer'] as const satisfies readonly RedirectType[];

/**
 * Type guard — returns true if the value is a recognized RedirectType.
 */
export function isValidRedirectType(value: string): value is RedirectType {
  return (REDIRECT_TYPES as readonly string[]).includes(value);
}

/**
 * Operator-friendly display labels for use in dropdowns and badges.
 * Exact copy matches UI v1 § 4 dropdown labels.
 */
export function redirectTypeDisplayName(value: RedirectType): string {
  switch (value) {
    case '301':
      return '301 Permanent';
    case '302':
      return '302 Found';
    case 'ServerTransfer':
      return 'Server Transfer';
  }
}
