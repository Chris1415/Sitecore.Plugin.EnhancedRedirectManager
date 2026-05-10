import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Structural guards — T062 (Tranche 2 upgrade: SDK boundary lock activated).
 *
 * The SDK boundary lock is a real test as of Tranche 2 (Step 5 of the implementation brief).
 * The other 4 guards remain it.todo — they land in Tranche 8 (T062 final).
 *
 * Guards enforced:
 * - SDK boundary lock (ADR-0011, § 4c-1): only lib/sdk/* and
 *   components/providers/marketplace.tsx may import @sitecore-marketplace-sdk/*
 *
 * Guards pending (Tranche 8):
 * - Route coverage: all three extension routes registered + root returns notFound()
 * - Theme contract: app/globals.css carries the dark-mode --primary-foreground
 *   override in BOTH .dark blocks
 * - Security: no raw-HTML React injection on user data (NFR-Sec3)
 * - Accessibility: no outline: none without a replacement focus style
 */

const SITE_ROOT = path.resolve(__dirname, '../../');

/** Collect all .ts/.tsx files under site/ excluding node_modules, .next, tests */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Exclude node_modules, .next build output, tests, and scaffold example files.
      // components/examples/ contains scaffold quickstart examples — not production code.
      if (['node_modules', '.next', 'tests', 'examples'].includes(entry.name)) continue;
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      results.push(fullPath);
    }
  }
  return results;
}

const SDK_IMPORT_REGEX = /@sitecore-marketplace-sdk\//;

/** Paths (relative to site/) that are allowed to import @sitecore-marketplace-sdk/* */
const ALLOWED_SDK_IMPORTERS = [
  path.join(SITE_ROOT, 'lib', 'sdk'),
  path.join(SITE_ROOT, 'components', 'providers', 'marketplace.tsx'),
];

function isAllowedImporter(filePath: string): boolean {
  return ALLOWED_SDK_IMPORTERS.some((allowed) => filePath.startsWith(allowed));
}

describe('structural guards', () => {
  it('SDK boundary lock — only lib/sdk/* and components/providers/marketplace.tsx import @sitecore-marketplace-sdk/*', () => {
    const files = collectSourceFiles(SITE_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      if (isAllowedImporter(file)) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trimStart().startsWith('import') && SDK_IMPORT_REGEX.test(line)) {
          const rel = path.relative(SITE_ROOT, file);
          violations.push(`${rel}: ${line.trim()}`);
        }
      }
    }

    expect(
      violations,
      'SDK boundary violation: only lib/sdk/* and components/providers/marketplace.tsx may import @sitecore-marketplace-sdk/*. Violations:\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });

  it.todo('three extension routes registered + root returns notFound()');
  it.todo('app/globals.css carries the dark-mode --primary-foreground override in both .dark blocks');
  it.todo('no raw-HTML React injection on user data');
  it.todo('no outline: none without a replacement focus style');
});
