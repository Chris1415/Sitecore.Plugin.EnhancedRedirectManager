/**
 * T016 — Domain types (minimal stub; Tranche 3 T016 completes this module).
 * This file is created in Tranche 2 because T011 and T012 import RedirectMapItem.
 *
 * Depends on: T005 (Vitest setup — test runner present)
 */

export type RedirectType = '301' | '302' | '307' | 'ServerTransfer';

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
