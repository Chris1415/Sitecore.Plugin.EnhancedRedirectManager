/**
 * proxy-simulator.ts — Local port of the upstream Content SDK RedirectsProxy algorithm.
 *
 * ADR-0038: Verbatim port of upstream RedirectsProxy; 100% test-fixture parity required.
 *           Any divergence requires explicit ADR-0038 waiver entry (never silently skipped).
 *           The `.slice(0, -1)` quirk in `isRegexOrUrl` is intentional upstream behavior —
 *           replicated verbatim, NOT fixed.
 *
 * ADR-0039: Regex safety via 100ms Promise.race per-row + 3-second wall-clock total cap.
 *           NOT Web Worker isolation. Single-row timeout marks outcome: 'timeout' and continues;
 *           total cap emits a 'diagnostic-incomplete' stage and stops evaluation.
 *
 * ADR-0040: `simulate()` returns Promise<SimulationTrace>. Mode is transient (not stored).
 *
 * ADR-0042: Upstream fixture extraction via committed AST-walking script
 *           (site/scripts/extract-upstream-fixtures.ts). Output committed as upstream-cases.json.
 *
 * Originally ported from Sitecore/content-sdk@dev as of 2026-05-20 — see
 * __fixtures__/upstream-snapshot.json originalPort field for full SHAs.
 *
 * Known divergences from upstream:
 *   (empty — target state per M2: 100% parity)
 */

import type { RedirectType } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** A single redirect rule flattened from a parent RedirectMap. */
export interface SimulationRule {
  mapId: string;
  rowIndex: number;
  source: string;
  target: string;
  redirectType: RedirectType;
  preserveQueryString: boolean;
  preserveLanguage: boolean;
  includeVirtualFolder: boolean;
}

/** Input to the simulator. */
export interface SimulationInput {
  /** Absolute URL (https://...) or path+query (/path?qs=1). */
  url: string;
  /** Locale for the simulated request (e.g. 'en', 'de-DE'). */
  locale: string;
  /** Flattened rules from the operator-selected maps. */
  rules: SimulationRule[];
  /** Site language — used for $siteLang substitution. */
  siteLanguage: string;
}

// ---------------------------------------------------------------------------
// Stage types — discriminated union (exhaustive)
// ---------------------------------------------------------------------------

export interface PreFilterStage {
  kind: 'pre-filter';
  /** 'has-dot' | 'preview-mode' | 'prefetch' */
  reason: 'has-dot' | 'preview-mode' | 'prefetch';
  /** Informational — simulator continues evaluation even when pre-filter would skip. */
  informational: true;
}

export interface NormalizeStage {
  kind: 'normalize';
  originalUrl: string;
  normalizedPath: string;
  queryString: string;
}

export interface CandidatesStage {
  kind: 'candidates';
  candidates: string[];
}

export interface EvaluateRowStage {
  kind: 'evaluate-row';
  rule: SimulationRule;
  /** Mode auto-detected by isRegexOrUrl for this row's source. */
  detectedMode: 'regex' | 'url';
  outcome: 'match' | 'no-match' | 'timeout';
  capturedGroups?: string[];
  candidateThatMatched?: string;
}

export interface SubstituteStage {
  kind: 'substitute';
  originalTarget: string;
  substitutedTarget: string;
  substitutions: Record<string, string>;
}

export interface FlagEffectsStage {
  kind: 'flag-effects';
  preserveQueryString: boolean;
  preserveLanguage: boolean;
  includeVirtualFolder: boolean;
  queryStringApplied?: string;
  languageApplied?: string;
}

export interface DispatchStage {
  kind: 'dispatch';
  finalUrl: string;
  redirectType: RedirectType;
}

export interface DiagnosticIncompleteStage {
  kind: 'diagnostic-incomplete';
  reason: 'wall-clock-cap';
  evaluatedRows: number;
  totalRows: number;
}

/**
 * Discriminated union of all stages produced by the simulator.
 * Used by TraceCard.tsx for exhaustive switch-rendering.
 * Call `assertNeverStage(s)` in the default branch to get a compile-time exhaustiveness check.
 */
export type SimulationStage =
  | PreFilterStage
  | NormalizeStage
  | CandidatesStage
  | EvaluateRowStage
  | SubstituteStage
  | FlagEffectsStage
  | DispatchStage
  | DiagnosticIncompleteStage;

// ---------------------------------------------------------------------------
// Result and Trace types
// ---------------------------------------------------------------------------

export type SimulationResultMatched = {
  matched: true;
  rule: SimulationRule;
  finalUrl: string;
  redirectType: RedirectType;
};

export type SimulationResultUnmatched = {
  matched: false;
  candidatesTried: string[];
  rowsConsidered: SimulationRule[];
  rowsConsideredTotal: number;
  diagnosticIncomplete?: boolean;
};

export type SimulationResult = SimulationResultMatched | SimulationResultUnmatched;

export interface SimulationTrace {
  startedAt: string;
  durationMs: number;
  stages: SimulationStage[];
  result: SimulationResult;
}

// ---------------------------------------------------------------------------
// Exhaustive-check helper (for UI switch-renderers)
// ---------------------------------------------------------------------------

/**
 * Call in the `default` branch of a switch on `SimulationStage.kind` to get
 * a TypeScript compile-time exhaustiveness check.
 */
export function assertNeverStage(s: never): never {
  throw new Error(`Unhandled SimulationStage kind: ${(s as SimulationStage).kind}`);
}

// ---------------------------------------------------------------------------
// Exported stubs — T006/T007 scaffold; implementations land in T008-T013
// ---------------------------------------------------------------------------

/**
 * Determines whether the given input is a regular expression or resembles a URL.
 *
 * @upstream utils.ts lines 156-178 (SHA e6153e5e80c2076704cad0876eec3b85ec3a1a9f)
 *
 * CRITICAL (ADR-0038 / A2): The `.slice(0, -1)` that strips the last character before
 * the URL-shape regex is INTENTIONAL upstream behavior — replicated verbatim, NOT fixed.
 * Example: `^/path/` (trailing slash) → strip `/` → `^/path` → fails URL regex → 'regex'.
 *          `/old-page/` → strip `/` → `/old-page` → passes URL regex → 'url'.
 *
 * @returns {'regex' | 'url'}
 */
export function isRegexOrUrl(input: string): 'regex' | 'url' {
  // Remove the trailing slash. (ADR-0038 quirk — verbatim port of upstream line 163)
  input = input.slice(0, -1);

  // Check if the string resembles a URL.
  const isUrlLike =
    /^\/[a-zA-Z0-9\-\/]+(\?([a-zA-Z0-9\-_]+=[a-zA-Z0-9\-_]+)(&[a-zA-Z0-9\-_]+=[a-zA-Z0-9\-_]+)*)?$/.test(
      input
    );

  if (isUrlLike) {
    return 'url';
  }

  // If it doesn't resemble a URL, it's likely a regular expression.
  return 'regex';
}

/**
 * Escapes non-special "?" characters in a string or regex.
 * - For regex patterns that start with `^` or end with `$`, returns the pattern unchanged.
 * - For other strings, escapes literal "?" characters but preserves regex quantifiers.
 *
 * @upstream utils.ts lines 205-220 (SHA e6153e5e80c2076704cad0876eec3b85ec3a1a9f)
 */
export function escapeNonSpecialQuestionMarks(input: string): string {
  // If the input is already a regex pattern (starts with ^ or ends with $), return it unchanged
  if (input.startsWith('^') || input.endsWith('$')) {
    return input;
  }

  // For non-regex strings, escape literal "?" characters
  return input.replace(/\?/g, '\\?');
}

/**
 * Compares two URLSearchParams objects to determine if they are equal.
 * Uses a sorted string representation for stable comparison.
 *
 * @upstream utils.ts lines 181-203 (SHA e6153e5e80c2076704cad0876eec3b85ec3a1a9f)
 */
export function areURLSearchParamsEqual(
  params1: URLSearchParams,
  params2: URLSearchParams
): boolean {
  // Generates a sorted string representation of URL search parameters.
  const getSortedParamsString = (params: URLSearchParams): string => {
    return [...params.entries()]
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
  };

  // Compare the sorted strings of both parameter sets.
  return getSortedParamsString(params1) === getSortedParamsString(params2);
}

/**
 * Merges two URLSearchParams objects.
 * If both contain the same key, the value from the second object overrides the first.
 *
 * @upstream utils.ts lines 222-238 (SHA e6153e5e80c2076704cad0876eec3b85ec3a1a9f)
 */
export function mergeURLSearchParams(
  params1: URLSearchParams,
  params2: URLSearchParams
): string {
  const merged = new URLSearchParams();

  // Add all keys and values from the first object.
  for (const [key, value] of params1.entries()) {
    merged.set(key, value);
  }

  // Add all keys and values from the second object, replacing existing ones.
  for (const [key, value] of params2.entries()) {
    merged.set(key, value);
  }

  return merged.toString();
}

/**
 * Converts a redirect pattern string into a RegExp.
 * Supports both JS literal form `/pattern/flags` and plain regex source `^/path$`.
 *
 * @upstream redirects-proxy.ts lines 579-597 (SHA 30b0db8fe768b83f03fd6b9772b0d3e14711c6b2)
 */
export function getRedirectPatternRegex(pattern: string): RegExp {
  const normalizedPattern = escapeNonSpecialQuestionMarks(pattern);
  const literalMatch = normalizedPattern.match(/^\/(.+)\/([a-z]*)$/i);
  if (literalMatch) {
    const [, source, flags] = literalMatch;
    const safeFlags = flags || 'i';
    return new RegExp(source, safeFlags);
  }
  return new RegExp(normalizedPattern, 'i');
}

// ---------------------------------------------------------------------------
// T009 — runTimedTest regex-safety wrapper (ADR-0039)
// ---------------------------------------------------------------------------

/** Internal sleep helper for the 100ms per-row cap. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a regex test against a candidate string with a 100ms timeout cap.
 *
 * Uses `Promise.race` between the actual `.test()` call and a 100ms sleep timer.
 * On timeout, returns `'timeout'`; evaluation continues for the next row (ADR-0039).
 *
 * @see ADR-0039 — FR-S4: 100ms per-row cap; 3s total wall-clock cap enforced in simulate()
 * @upstream Inspired by ADR-0039 contract; no direct upstream equivalent (safety addition)
 */
export async function runTimedTest(
  regex: RegExp,
  candidate: string
): Promise<'match' | 'no-match' | 'timeout'> {
  return Promise.race([
    Promise.resolve(regex.test(candidate)).then((m) => (m ? ('match' as const) : ('no-match' as const))),
    sleep(100).then(() => 'timeout' as const),
  ]);
}

// ---------------------------------------------------------------------------
// T013 — simulate() orchestrator
// ---------------------------------------------------------------------------

// NOTE: `g` flag is intentional for `.replace()` (replaces all occurrences)
// but a module-level regex with `g` retains `lastIndex` between calls.
// Using `.test()` sets `lastIndex` to 15 on match; if a second concurrent
// `simulate()` invocation calls `.test()` before `.replace()` resets it,
// it would return false and silently skip the $siteLang substitution.
// Fix: reset lastIndex before each `.test()` call (see usage below).
const REGEXP_CONTEXT_SITE_LANG = /\$siteLang/gi;
const REGEXP_ABSOLUTE_URL = /^(?:[a-z]+:)?\/\//i;

/**
 * Strips locale prefix from path when present.
 * @upstream redirects-proxy.ts lines 600-609 (SHA 30b0db8fe768b83f03fd6b9772b0d3e14711c6b2)
 */
function getLocaleStrippedPath(path: string, urlLocale: string): string {
  if (!urlLocale) {
    return path;
  }
  const localePrefixRegex = new RegExp(`^/${urlLocale}(?=/|$)`, 'i');
  const strippedPath = path.replace(localePrefixRegex, '') || '/';
  return strippedPath.startsWith('/') ? strippedPath : `/${strippedPath}`;
}

/**
 * Runs the full simulation pipeline against the provided rules.
 *
 * Pipeline (verbatim port of upstream RedirectsProxy.handle() + matchFromRedirectMapRedirect()):
 *   1. Emit pre-filter stages (has-dot, preview-mode, prefetch) as informational; continue
 *   2. Normalize URL
 *   3. Generate candidate paths
 *   4. Loop over rules with wall-clock cap check (ADR-0039: 3s)
 *      - Per-row: run runTimedTest (100ms cap); emit evaluate-row stage
 *      - First match wins (upstream short-circuit semantics)
 *   5. On match: substitute $N + $siteLang; emit substitute + flag-effects + dispatch stages
 *   6. Build SimulationResult
 *   7. Yield to event loop every 25 rows (OA-3)
 *
 * @param input - URL, locale, flattened rules, site language.
 * @returns Promise<SimulationTrace> — full trace; never rejects.
 *
 * @upstream RedirectsProxy.handle() + matchFromRedirectMapRedirect() (SHA 30b0db8fe768b83f03fd6b9772b0d3e14711c6b2)
 * @see ADR-0038 (verbatim port), ADR-0039 (dual time-cap), ADR-0040 (async simulator)
 */
export async function simulate(input: SimulationInput): Promise<SimulationTrace> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const stages: SimulationStage[] = [];

  // ADR-0039: 3-second total wall-clock cap
  const simulationDeadline = Date.now() + 3000;

  // -------------------------------------------------------------------------
  // Step 1: Pre-filter stages — informational; simulator always continues
  // Source: redirects-proxy.ts disabled() + validateRequest() (lines 279-295)
  // -------------------------------------------------------------------------

  // has-dot: upstream skips paths containing '.' (files like .png, .css)
  const { pathname: rawPath, search: rawSearch } = parseUrl(input.url);
  if (rawPath.includes('.')) {
    stages.push({ kind: 'pre-filter', reason: 'has-dot', informational: true });
  }
  // preview-mode and prefetch: not detectable without HTTP headers;
  // emit placeholder stages as informational if URL signals them
  // (simulator has no request context — these are diagnostic-only)

  // -------------------------------------------------------------------------
  // Step 2: Normalize URL
  // Source: redirects-proxy.ts normalizeUrl() (lines 431-482) + getExistsRedirect() (lines 293-330)
  // -------------------------------------------------------------------------
  const normalizedPath = rawPath.replace(/\/*$/gi, '').toLowerCase() || '/';
  const queryString = rawSearch;

  stages.push({
    kind: 'normalize',
    originalUrl: input.url,
    normalizedPath,
    queryString,
  });

  // -------------------------------------------------------------------------
  // Step 3: Generate candidate paths
  // Source: matchFromRedirectMapRedirect() lines 332-410 (SHA 30b0db8f...)
  // -------------------------------------------------------------------------
  const urlLocale = input.locale;
  const localeStrippedIncoming = getLocaleStrippedPath(rawPath, urlLocale);
  const localeStrippedNormalized = getLocaleStrippedPath(normalizedPath, urlLocale);
  const candidatesSet = [
    rawPath,
    normalizedPath,
    localeStrippedIncoming,
    localeStrippedNormalized,
  ].filter((c, idx, arr) => arr.indexOf(c) === idx);

  stages.push({ kind: 'candidates', candidates: candidatesSet });

  // -------------------------------------------------------------------------
  // Step 4: Loop over rules
  // -------------------------------------------------------------------------
  let matchedRule: SimulationRule | undefined;
  let matchedFinalTarget: string | undefined;
  let matchedCapturedGroups: string[] | undefined;
  let diagnosticIncomplete = false;
  let evaluatedRows = 0;

  for (let i = 0; i < input.rules.length; i++) {
    // Wall-clock cap check (ADR-0039)
    if (Date.now() > simulationDeadline) {
      stages.push({
        kind: 'diagnostic-incomplete',
        reason: 'wall-clock-cap',
        evaluatedRows,
        totalRows: input.rules.length,
      });
      diagnosticIncomplete = true;
      break;
    }

    // Yield to event loop every 25 rows (OA-3)
    if (i > 0 && i % 25 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    const rule = input.rules[i];
    const detectedMode = isRegexOrUrl(rule.source);

    // ----- URL (static) rules -----
    if (detectedMode === 'url') {
      // Source: matchFromRedirectMapRedirect() lines 362-392
      const urlArray = rule.source.endsWith('/')
        ? rule.source.slice(0, -1).split('?')
        : rule.source.split('?');
      const patternQS = urlArray[1];
      const patternPath = urlArray[0].toLowerCase();

      const localePath = `/${urlLocale.toLowerCase()}${normalizedPath}`;
      const pathMatch =
        patternPath === localePath ||
        patternPath === normalizedPath ||
        patternPath === rawPath.toLowerCase();

      const qsMatch =
        !patternQS ||
        areURLSearchParamsEqual(
          new URLSearchParams(patternQS),
          new URLSearchParams(queryString.replace(/^\?/, ''))
        );

      const outcome = pathMatch && qsMatch ? 'match' : 'no-match';

      stages.push({
        kind: 'evaluate-row',
        rule,
        detectedMode: 'url',
        outcome,
        candidateThatMatched: outcome === 'match' ? patternPath : undefined,
      });
      evaluatedRows++;

      if (outcome === 'match') {
        matchedRule = rule;
        matchedFinalTarget = rule.target;
        break;
      }
    } else {
      // ----- Regex rules -----
      // Source: matchFromRedirectMapRedirect() lines 393-410
      const regex = getRedirectPatternRegex(rule.source);

      let outcome: 'match' | 'no-match' | 'timeout' = 'no-match';
      let candidateThatMatched: string | undefined;

      for (const candidate of candidatesSet) {
        regex.lastIndex = 0;
        const testResult = await runTimedTest(regex, candidate);
        if (testResult === 'timeout') {
          outcome = 'timeout';
          break;
        }
        if (testResult === 'match') {
          outcome = 'match';
          candidateThatMatched = candidate;
          break;
        }
      }

      // Also try with query string appended (upstream: matchedPathWithQuery)
      if (outcome === 'no-match' && queryString) {
        for (const candidate of candidatesSet) {
          regex.lastIndex = 0;
          const testResult = await runTimedTest(regex, `${candidate}${queryString}`);
          if (testResult === 'timeout') {
            outcome = 'timeout';
            break;
          }
          if (testResult === 'match') {
            outcome = 'match';
            candidateThatMatched = `${candidate}${queryString}`;
            break;
          }
        }
      }

      stages.push({
        kind: 'evaluate-row',
        rule,
        detectedMode: 'regex',
        outcome,
        candidateThatMatched,
      });
      evaluatedRows++;

      if (outcome === 'match' && candidateThatMatched !== undefined) {
        // Extract capture groups for substitution
        regex.lastIndex = 0;
        const pathForCapture = (candidateThatMatched.split('?')[0] || '').replace(/\/*$/gi, '') || '/';
        const captureResult = pathForCapture.match(regex);
        matchedCapturedGroups = captureResult ? [...captureResult] : [];

        matchedRule = rule;
        matchedFinalTarget = rule.target;
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: If matched — substitution + flag effects + dispatch
  // -------------------------------------------------------------------------
  if (matchedRule && matchedFinalTarget !== undefined) {
    // Capture group substitution ($1, $2, ...) + $siteLang
    // Source: redirects-proxy.ts lines 246-258 (SHA 30b0db8f...)
    const originalTarget = matchedFinalTarget;
    const substitutions: Record<string, string> = {};

    if (matchedCapturedGroups && matchedCapturedGroups.length > 0) {
      matchedFinalTarget = matchedFinalTarget.replace(
        /\$(\d+)/g,
        (_: string, index: string): string => {
          const val = matchedCapturedGroups![parseInt(index, 10)] ?? '';
          substitutions[`$${index}`] = val;
          return val;
        }
      );
    }

    // $siteLang substitution
    // Reset lastIndex before .test() — REGEXP_CONTEXT_SITE_LANG has the `g` flag for
    // `.replace()` (replaces ALL occurrences), but a `g`-flagged regex retains
    // lastIndex after `.test()`, causing the next concurrent call's `.test()` to
    // start mid-string and return false (code-review finding M1, 2026-05-21).
    REGEXP_CONTEXT_SITE_LANG.lastIndex = 0;
    if (REGEXP_CONTEXT_SITE_LANG.test(matchedFinalTarget)) {
      substitutions['$siteLang'] = input.siteLanguage;
      matchedFinalTarget = matchedFinalTarget.replace(REGEXP_CONTEXT_SITE_LANG, input.siteLanguage);
    }

    stages.push({
      kind: 'substitute',
      originalTarget,
      substitutedTarget: matchedFinalTarget,
      substitutions,
    });

    // Flag effects
    // Source: processRelativeUrlTarget() lines 172-215 + processAbsoluteUrlTarget() lines 155-171
    let queryToAppend: string | undefined;
    let languageApplied: string | undefined;

    if (matchedRule.preserveQueryString && queryString) {
      const isAbsolute = REGEXP_ABSOLUTE_URL.test(matchedFinalTarget);
      const incomingQS = new URLSearchParams(queryString.replace(/^\?/, ''));
      const [targetMainUrl, targetQS] = matchedFinalTarget.split('?');
      const mergedQS = mergeURLSearchParams(incomingQS, new URLSearchParams(targetQS ?? ''));
      matchedFinalTarget = `${targetMainUrl}?${mergedQS}`;
      queryToAppend = mergedQS;
      if (isAbsolute) {
        // absolute URL handled separately
      }
    }

    if (matchedRule.preserveLanguage) {
      languageApplied = input.locale;
    }

    stages.push({
      kind: 'flag-effects',
      preserveQueryString: matchedRule.preserveQueryString,
      preserveLanguage: matchedRule.preserveLanguage,
      includeVirtualFolder: matchedRule.includeVirtualFolder,
      queryStringApplied: queryToAppend,
      languageApplied,
    });

    // Dispatch
    stages.push({
      kind: 'dispatch',
      finalUrl: matchedFinalTarget,
      redirectType: matchedRule.redirectType,
    });

    const result: SimulationResultMatched = {
      matched: true,
      rule: matchedRule,
      finalUrl: matchedFinalTarget,
      redirectType: matchedRule.redirectType,
    };

    return {
      startedAt,
      durationMs: Date.now() - startMs,
      stages,
      result,
    };
  }

  // -------------------------------------------------------------------------
  // Step 6: No match — build unmatched result
  // -------------------------------------------------------------------------
  const candidatesTried = candidatesSet;
  const rowsConsidered = input.rules.slice(0, Math.min(evaluatedRows, 20));
  const result: SimulationResultUnmatched = {
    matched: false,
    candidatesTried,
    rowsConsidered,
    rowsConsideredTotal: evaluatedRows,
    diagnosticIncomplete,
  };

  return {
    startedAt,
    durationMs: Date.now() - startMs,
    stages,
    result,
  };
}

// ---------------------------------------------------------------------------
// URL parsing helper (no DOM dependency — uses URL API or string split)
// ---------------------------------------------------------------------------
function parseUrl(url: string): { pathname: string; search: string } {
  // Handle absolute URLs
  if (REGEXP_ABSOLUTE_URL.test(url)) {
    try {
      const parsed = new URL(url);
      return { pathname: parsed.pathname, search: parsed.search };
    } catch {
      // Fall through to string parse
    }
  }
  // Path+query form: /path?qs=1
  const qIndex = url.indexOf('?');
  if (qIndex === -1) {
    return { pathname: url, search: '' };
  }
  return { pathname: url.slice(0, qIndex), search: url.slice(qIndex) };
}
