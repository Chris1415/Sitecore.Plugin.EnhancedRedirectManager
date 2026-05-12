/**
 * T021 — lib/redirects/redirect-type-enum.ts
 *
 * Source-of-truth list of valid RedirectType values for the Redirect Manager UI.
 *
 * VERIFIED 2026-05-11 (Tranche 6a real-tenant write-capture):
 *   wire enum values are 'Redirect301' / 'Redirect302' / 'ServerTransfer'.
 *   'Redirect307' is NOT honoured by the head-app resolver — not exposed in the UI.
 *
 * Exports:
 * - REDIRECT_TYPES: readonly tuple of the 3 supported values
 * - isValidRedirectType(value): type-guard
 * - redirectTypeDisplayName(value): operator-friendly label for dropdowns / badges
 *
 * Pure module. Zero SDK dependency.
 */

import type { RedirectType } from '@/lib/domain/types';

/**
 * All valid RedirectType values shown in the operator UI.
 *
 * Wire format (verified 2026-05-11): values are sent and read as
 * 'Redirect301' / 'Redirect302' / 'ServerTransfer'.
 */
export const REDIRECT_TYPES = ['Redirect301', 'Redirect302', 'ServerTransfer'] as const satisfies readonly RedirectType[];

/**
 * Type guard — returns true if the value is a recognized RedirectType.
 */
export function isValidRedirectType(value: string): value is RedirectType {
  return (REDIRECT_TYPES as readonly string[]).includes(value);
}

/**
 * Operator-friendly display labels for use in dropdowns and badges.
 */
export function redirectTypeDisplayName(value: RedirectType): string {
  switch (value) {
    case 'Redirect301':
      return '301 Permanent';
    case 'Redirect302':
      return '302 Found';
    case 'ServerTransfer':
      return 'Server Transfer';
  }
}
