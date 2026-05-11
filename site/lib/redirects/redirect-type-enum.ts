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
 * All valid RedirectType values.
 * ServerTransfer: verified from real-tenant capture.
 * 301/302/307: assumed-shape — pending Tranche 6 real-tenant enum introspection (OQ-8).
 */
export const REDIRECT_TYPES = ['301', '302', '307', 'ServerTransfer'] as const satisfies readonly RedirectType[];

/**
 * Type guard — returns true if the value is a recognized RedirectType.
 */
export function isValidRedirectType(value: string): value is RedirectType {
  return (REDIRECT_TYPES as readonly string[]).includes(value);
}

/**
 * Operator-friendly display labels for use in dropdowns and badges.
 * Exact copy matches UI v1 § 4 dropdown labels.
 *
 * assumed-shape: tests/fixtures/graphql/redirect-type-enum.json
 */
export function redirectTypeDisplayName(value: RedirectType): string {
  switch (value) {
    case '301':
      return '301 Permanent';
    case '302':
      return '302 Found';
    case '307':
      return '307 Temporary';
    case 'ServerTransfer':
      return 'Server Transfer';
  }
}
