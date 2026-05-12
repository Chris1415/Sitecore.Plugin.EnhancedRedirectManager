/**
 * T016 — Domain types.
 *
 * Depends on: T005 (Vitest setup — test runner present)
 */

/**
 * Valid Sitecore RedirectType values.
 *
 * VERIFIED 2026-05-11 (Tranche 6a real-tenant capture):
 *   wire enum values are 'Redirect301' / 'Redirect302' / 'ServerTransfer'.
 *
 * 'Redirect307' is rejected by the head-app resolver (operator confirmation)
 * even though the schema would technically accept it as a string. Not exposed
 * in the operator UI.
 */
export type RedirectType = 'Redirect301' | 'Redirect302' | 'ServerTransfer';

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
