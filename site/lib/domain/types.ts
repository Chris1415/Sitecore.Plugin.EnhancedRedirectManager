/**
 * T016 — Domain types (minimal stub; Tranche 3 T016 completes this module).
 * This file is created in Tranche 2 because T011 and T012 import RedirectMapItem.
 *
 * Depends on: T005 (Vitest setup — test runner present)
 */

/**
 * Valid Sitecore RedirectType values.
 *
 * Real-tenant confirmed 2026-05-11: the Redirect Map template's RedirectType
 * droplist exposes ONLY '301', '302', and 'ServerTransfer'. **'307' is NOT a
 * valid option** — removed from the user-facing list because the underlying
 * head-app resolver doesn't honour it.
 *
 * 'ServerTransfer' is verified end-to-end (PRD § 9 capture).
 * '301' and '302' exact wire-enum names remain assumed pending Tranche 6 write
 * capture (OQ-8). If the wire returns 'Redirect301' / 'Redirect302' instead,
 * update this union + the enum tuple in lib/redirects/redirect-type-enum.ts.
 */
export type RedirectType = '301' | '302' | 'ServerTransfer';

export interface Mapping {
  source: string;
  target: string;
}

export interface RedirectMapItem {
  /** Sitecore item GUID */
  id: string;
  name: string;
  redirectType: RedirectType;
  preserveQueryString: boolean;
  preserveLanguage: boolean;
  includeVirtualFolder: boolean;
  /** ISO-8601 */
  updatedAt: string;
  mappings: Mapping[];
}

export interface RedirectMapAttributes {
  name: string;
  redirectType: RedirectType;
  preserveQueryString: boolean;
  preserveLanguage: boolean;
  includeVirtualFolder: boolean;
  mappings: Mapping[];
}
