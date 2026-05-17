/**
 * Locale resolver tests (PRD-003 simplification 2026-05-17).
 *
 * Resolver now always returns ["en"] — see locale-resolver.ts header comment for
 * the rationale (SHARED UrlMapping field on Redirect Map items makes per-locale
 * publishing redundant). These tests assert the simplified contract.
 *
 * Task breakdown § 10 T020a / T020b (simplified post-Tranche-2).
 */

import { describe, it, expect } from "vitest";
import { resolveSiteLocales } from "./locale-resolver";

describe("resolveSiteLocales (PRD-003 simplified to ['en'] only)", () => {
  it("returns ['en'] regardless of site.languages content", () => {
    expect(resolveSiteLocales({ languages: ["en-US", "de-DE"] }, false)).toEqual(["en"]);
    expect(resolveSiteLocales({ languages: ["fr-FR"] }, false)).toEqual(["en"]);
    expect(resolveSiteLocales({ languages: [] }, false)).toEqual(["en"]);
    expect(resolveSiteLocales({ languages: null }, false)).toEqual(["en"]);
  });

  it("ignores the shorthandAccepted flag (kept for API stability)", () => {
    expect(resolveSiteLocales({ languages: ["en-US", "de-DE"] }, true)).toEqual(["en"]);
    expect(resolveSiteLocales({ languages: ["en-US", "de-DE"] }, false)).toEqual(["en"]);
  });
});
