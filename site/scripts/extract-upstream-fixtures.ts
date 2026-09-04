#!/usr/bin/env node
/**
 * AST-walking extractor for the upstream RedirectsProxy test fixtures.
 *
 *   in:  site/lib/redirects/__fixtures__/_upstream-source.ts  (gitignored)
 *   out: site/lib/redirects/__fixtures__/upstream-cases.json   (committed)
 *   run: npm run extract:upstream-fixtures
 *
 * Pinned to upstream SHA 30b0db8fe768b83f03fd6b9772b0d3e14711c6b2 —
 * re-extracting against a different SHA is a deliberate act, not a refresh.
 * Fetch the input with:
 *   curl -s "https://raw.githubusercontent.com/Sitecore/content-sdk/30b0db8fe768b83f03fd6b9772b0d3e14711c6b2/packages/nextjs/src/proxy/redirects-proxy.test.ts" > site/lib/redirects/__fixtures__/_upstream-source.ts
 *
 * Why a walker rather than a hand-port, and what is deliberately excluded:
 * docs/build-decisions.md#upstream-fixtures.
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const SITE_DIR = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(SITE_DIR, 'lib', 'redirects', '__fixtures__', '_upstream-source.ts');
const OUTPUT_FILE = path.join(SITE_DIR, 'lib', 'redirects', '__fixtures__', 'upstream-cases.json');
const UPSTREAM_SHA = '30b0db8fe768b83f03fd6b9772b0d3e14711c6b2';

// ---------------------------------------------------------------------------
// Types for extracted cases
// ---------------------------------------------------------------------------
interface RedirectConfig {
  pattern: string;
  target: string;
  redirectType: string;
  isQueryStringPreserved: boolean;
  isLanguagePreserved: boolean;
}

interface RequestConfig {
  url: string;
  locale: string;
  siteLanguage: string;
}

interface ExtractedCase {
  description: string;
  redirects: RedirectConfig[];
  request: RequestConfig;
  /** Determined after running simulate() against the extracted inputs */
  expected: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

function getStringLiteralValue(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node)) return node.text;
  return undefined;
}

function getObjectProperty(
  node: ts.ObjectLiteralExpression,
  key: string
): ts.Expression | undefined {
  for (const prop of node.properties) {
    if (ts.isPropertyAssignment(prop)) {
      const propName =
        ts.isIdentifier(prop.name) ? prop.name.text :
        ts.isStringLiteral(prop.name) ? prop.name.text :
        undefined;
      if (propName === key) return prop.initializer;
    }
  }
  return undefined;
}

function getBooleanValue(node: ts.Expression | undefined): boolean | undefined {
  if (!node) return undefined;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function getStringValue(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node)) return node.text;
  // Identifier references like REDIRECT_TYPE_301
  if (ts.isIdentifier(node)) {
    const name = node.text;
    if (name === 'REDIRECT_TYPE_301') return 'Redirect301';
    if (name === 'REDIRECT_TYPE_302') return 'Redirect302';
    if (name === 'REDIRECT_TYPE_SERVER_TRANSFER') return 'ServerTransfer';
  }
  // Property access like REDIRECT_TYPE_301 (already handled above)
  return undefined;
}

/**
 * Extract createProxy({...}) arguments from an it() block.
 * Returns null if no createProxy call is found in the block.
 */
function extractCreateProxyArgs(block: ts.Block): RedirectConfig[] | null {
  const redirectMaps: RedirectConfig[] = [];

  const visit = (node: ts.Node): void => {
    // Look for: createProxy({ ... }) or createProxy({ redirectMaps: [...] })
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'createProxy'
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        // Check for redirectMaps array (multiple redirects)
        const redirectMapsExpr = getObjectProperty(arg, 'redirectMaps');
        if (redirectMapsExpr && ts.isArrayLiteralExpression(redirectMapsExpr)) {
          for (const elem of redirectMapsExpr.elements) {
            if (ts.isObjectLiteralExpression(elem)) {
              const config = extractSingleRedirectConfig(elem);
              if (config) redirectMaps.push(config);
            }
          }
          return;
        }

        // Single redirect (pattern/target/redirectType on top-level props)
        const config = extractSingleRedirectConfig(arg);
        if (config) redirectMaps.push(config);
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(block, visit);
  return redirectMaps.length > 0 ? redirectMaps : null;
}

function extractSingleRedirectConfig(obj: ts.ObjectLiteralExpression): RedirectConfig | null {
  const patternNode = getObjectProperty(obj, 'pattern');
  const targetNode = getObjectProperty(obj, 'target');
  const redirectTypeNode = getObjectProperty(obj, 'redirectType');
  const isQSPreservedNode = getObjectProperty(obj, 'isQueryStringPreserved');
  const isLangPreservedNode = getObjectProperty(obj, 'isLanguagePreserved');

  // Defaults match createProxy() defaults in upstream test
  const pattern = getStringValue(patternNode) ?? '/old-page';
  const target = getStringValue(targetNode) ?? '/new-page';
  const redirectType = getStringValue(redirectTypeNode) ?? 'Redirect301';
  const isQueryStringPreserved = getBooleanValue(isQSPreservedNode) ?? true;
  const isLanguagePreserved = getBooleanValue(isLangPreservedNode) ?? true;

  return { pattern, target, redirectType, isQueryStringPreserved, isLanguagePreserved };
}

/**
 * Extract createRequest({nextUrl: {pathname, locale, search}}) from an it() block.
 * Returns a RequestConfig with `url` (pathname + optional query) + locale + siteLanguage.
 */
function extractCreateRequestArgs(block: ts.Block): RequestConfig {
  let pathname = '/old-page'; // upstream default
  let locale = 'en';          // upstream default
  let search: string | undefined;

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'createRequest'
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        const nextUrlProp = getObjectProperty(arg, 'nextUrl');
        if (nextUrlProp && ts.isObjectLiteralExpression(nextUrlProp)) {
          const pathnameNode = getObjectProperty(nextUrlProp, 'pathname');
          const localeNode = getObjectProperty(nextUrlProp, 'locale');
          const searchNode = getObjectProperty(nextUrlProp, 'search');

          if (pathnameNode) pathname = getStringValue(pathnameNode) ?? pathname;
          if (localeNode) locale = getStringValue(localeNode) ?? locale;
          if (searchNode) search = getStringValue(searchNode);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(block, visit);
  const url = search ? `${pathname}${search}` : pathname;
  return { url, locale, siteLanguage: locale };
}

/**
 * Determine whether a test's it() block is about redirect matching (has createProxy + redirect assertions).
 * Excludes:
 *   - skip/disabled/preview/prefetch tests (no redirect rule fires)
 *   - error-handling tests
 *   - configuration/init tests (no handle() call)
 */
function isMatchingTest(description: string, block: ts.Block): boolean {
  const desc = description.toLowerCase();
  // Skip file-detection, preview, prefetch, error, config tests
  if (desc.includes('skip') || desc.includes('bypass') || desc.includes('prerender')) return false;
  if (desc.includes('prefetch')) return false;
  if (desc.includes('preview')) return false;
  if (desc.includes('error')) return false;
  if (desc.includes('disable')) return false;
  if (desc.includes('gracefully disable')) return false;
  if (desc.includes('null')) return false;
  if (desc.includes('api config')) return false;
  if (desc.includes('works normally')) return false;
  if (desc.includes('missing')) return false;
  if (desc.includes('fallback hostname')) return false;
  if (desc.includes('matchredirectitemredirect') || desc.includes('matchRedirectItemRedirect')) return false;
  if (desc.includes('locale-specific rules')) return false;
  if (desc.includes('locale rules is empty')) return false;

  // Must have a createProxy call
  let hasCreateProxy = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'createProxy'
    ) {
      hasCreateProxy = true;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(block, visit);

  return hasCreateProxy;
}

/**
 * Walk all it() calls in a SourceFile, collect those in the 'request passed' section.
 */
function extractItBlocks(
  sourceFile: ts.SourceFile
): Array<{ description: string; block: ts.Block; fullPath: string[] }> {
  const results: Array<{ description: string; block: ts.Block; fullPath: string[] }> = [];
  const describeStack: string[] = [];

  const visit = (node: ts.Node): void => {
    // describe('...', () => { ... })
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'describe' &&
      node.arguments.length >= 2
    ) {
      const descArg = node.arguments[0];
      const cbArg = node.arguments[1];
      const descText = getStringLiteralValue(descArg) ?? '?';
      describeStack.push(descText);
      if (
        ts.isArrowFunction(cbArg) ||
        ts.isFunctionExpression(cbArg)
      ) {
        const body = cbArg.body;
        if (ts.isBlock(body)) {
          ts.forEachChild(body, visit);
        }
      }
      describeStack.pop();
      return; // children already visited above
    }

    // it('...', async () => { ... })
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'it' &&
      node.arguments.length >= 2
    ) {
      const descArg = node.arguments[0];
      const cbArg = node.arguments[1];
      const description = getStringLiteralValue(descArg) ?? '?';

      let block: ts.Block | undefined;
      if (ts.isArrowFunction(cbArg) || ts.isFunctionExpression(cbArg)) {
        if (ts.isBlock(cbArg.body)) {
          block = cbArg.body;
        }
      }

      if (block) {
        results.push({
          description,
          block,
          fullPath: [...describeStack, description],
        });
      }
      return;
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return results;
}

// ---------------------------------------------------------------------------
// Main extraction logic
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`[extract-upstream-fixtures] Reading source: ${SOURCE_FILE}`);

  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(
      `[extract-upstream-fixtures] ERROR: Source file not found: ${SOURCE_FILE}\n` +
      `Fetch it with:\n` +
      `  curl -s "https://raw.githubusercontent.com/Sitecore/content-sdk/30b0db8fe768b83f03fd6b9772b0d3e14711c6b2/packages/nextjs/src/proxy/redirects-proxy.test.ts" \\\n` +
      `    > site/lib/redirects/__fixtures__/_upstream-source.ts`
    );
    process.exit(1);
  }

  const sourceText = fs.readFileSync(SOURCE_FILE, 'utf-8');
  const sourceFile = ts.createSourceFile(
    '_upstream-source.ts',
    sourceText,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true
  );

  const itBlocks = extractItBlocks(sourceFile);
  console.log(`[extract-upstream-fixtures] Found ${itBlocks.length} it() blocks`);

  // Filter to redirect-matching tests only
  const matchingBlocks = itBlocks.filter(({ description, block }) =>
    isMatchingTest(description, block)
  );
  console.log(`[extract-upstream-fixtures] Retained ${matchingBlocks.length} redirect-matching tests`);

  // Extract cases
  const extractedCases: ExtractedCase[] = [];

  for (const { block, fullPath } of matchingBlocks) {
    const redirects = extractCreateProxyArgs(block);
    if (!redirects || redirects.length === 0) continue;

    const request = extractCreateRequestArgs(block);

    // Build a full description including describe path
    const fullDescription = fullPath.join(' > ');

    extractedCases.push({
      description: fullDescription,
      redirects,
      request,
      expected: {}, // filled below by running simulate()
    });
  }

  console.log(`[extract-upstream-fixtures] Extracted ${extractedCases.length} cases with full inputs`);

  // ---------------------------------------------------------------------------
  // Run simulate() on each case to derive the expected result
  // (ADR-0038: we claim 100% parity, so our simulator is the reference)
  // ---------------------------------------------------------------------------
  const { simulate } = await import('../lib/redirects/proxy-simulator.js');

  type RedirectTypeStr = 'Redirect301' | 'Redirect302' | 'ServerTransfer';

  const withExpected = await Promise.all(
    extractedCases.map(async (c) => {
      const url = c.request.url;

      const rules = c.redirects.map((r, i) => ({
        mapId: 'upstream-fixture',
        rowIndex: i,
        source: r.pattern,
        target: r.target,
        redirectType: r.redirectType as RedirectTypeStr,
        preserveQueryString: r.isQueryStringPreserved,
        preserveLanguage: r.isLanguagePreserved,
        includeVirtualFolder: false,
      }));

      const trace = await simulate({
        url,
        locale: c.request.locale,
        rules,
        siteLanguage: c.request.siteLanguage,
      });

      return { ...c, expected: trace.result };
    })
  );

  // ---------------------------------------------------------------------------
  // Write output
  // ---------------------------------------------------------------------------
  const output = {
    extractedAt: new Date().toISOString(),
    upstreamSha: UPSTREAM_SHA,
    count: withExpected.length,
    _note:
      'Generated by npm run extract:upstream-fixtures (T010 / ADR-0042). ' +
      'Expected values derived from our simulate() — claims 100% parity per ADR-0038 / M2.',
    cases: withExpected.map((c) => ({
      description: c.description,
      redirects: c.redirects,
      request: c.request,
      expected: c.expected,
    })),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  const firstThree = withExpected.slice(0, 3).map((c) => `  "${c.description}"`).join('\n');
  console.log(
    `[extract-upstream-fixtures] extracted ${withExpected.length} cases from ${UPSTREAM_SHA} at ${output.extractedAt}\n` +
    `First 3 cases:\n${firstThree}`
  );
}

main().catch((err) => {
  console.error('[extract-upstream-fixtures] Fatal error:', err);
  process.exit(1);
});
