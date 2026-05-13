import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Structural guards — T062 (full set active as of Tranche 8).
 *
 * All five guards are real tests:
 *  1. SDK boundary lock (ADR-0011, § 4c-1): only lib/sdk/* and
 *     components/providers/marketplace.tsx may import @sitecore-marketplace-sdk/*
 *  2. Route coverage: all three extension routes registered + root returns notFound()
 *  3. Theme contract: app/globals.css carries the dark-mode --primary-foreground
 *     override in BOTH .dark blocks (ADR-0004 / blok-theming)
 *  4. Security (NFR-Sec3): no raw HTML injection on user-controlled data.
 *  5. Accessibility (WCAG 2.4.7): no `outline-none` / `outline:none` without a
 *     paired `focus-visible:` replacement.
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

  it('three extension routes registered + root renders intro page', () => {
    // Verify the three extension point route directories exist, each with
    // its own page.tsx AND its own layout.tsx that wraps content in the
    // MarketplaceProvider. The provider has been pushed down from the root
    // layout into these per-extension-point layouts so the root IntroPage
    // can render without being gated by the SDK handshake (supersedes
    // ADR-0011's "root returns notFound()" rule).
    const routes = ['context-panel', 'dashboard-widget', 'full-page'];
    for (const route of routes) {
      const routeDir = path.join(SITE_ROOT, 'app', route);
      expect(
        fs.existsSync(routeDir),
        `Expected extension route directory to exist: app/${route}/`,
      ).toBe(true);
      const pageFile = path.join(routeDir, 'page.tsx');
      expect(
        fs.existsSync(pageFile),
        `Expected page.tsx to exist in app/${route}/`,
      ).toBe(true);
      const layoutFile = path.join(routeDir, 'layout.tsx');
      expect(
        fs.existsSync(layoutFile),
        `Expected layout.tsx to exist in app/${route}/ (provider scope guard)`,
      ).toBe(true);
      const layoutContent = fs.readFileSync(layoutFile, 'utf-8');
      expect(
        layoutContent,
        `app/${route}/layout.tsx must wrap children in MarketplaceProvider`,
      ).toContain('MarketplaceProvider');
    }

    // Root page now ships the IntroPage instead of notFound()
    const rootPage = path.join(SITE_ROOT, 'app', 'page.tsx');
    expect(fs.existsSync(rootPage), 'Expected app/page.tsx to exist').toBe(true);
    const rootContent = fs.readFileSync(rootPage, 'utf-8');
    expect(
      rootContent,
      'Root page must NOT call notFound() — it now ships the IntroPage',
    ).not.toContain('notFound()');
    expect(
      rootContent,
      'Root IntroPage must mention the product name',
    ).toContain('Redirect Manager');
  });

  it('app/globals.css carries the dark-mode --primary-foreground override in both .dark blocks', () => {
    // ADR-0004 / blok-theming: --primary-foreground collapses to white-on-lavender in
    // Nova preset dark mode. Both the .dark selector and @media prefers-color-scheme: dark
    // must override it to var(--color-blackAlpha-900) for legible primary buttons.
    const globalsCss = path.join(SITE_ROOT, 'app', 'globals.css');
    expect(fs.existsSync(globalsCss), 'Expected app/globals.css to exist').toBe(true);

    const content = fs.readFileSync(globalsCss, 'utf-8');

    // Must have .dark block with the override
    expect(
      content,
      'globals.css must have a .dark selector block',
    ).toContain('.dark');

    // Must have @media (prefers-color-scheme: dark) block with the override
    expect(
      content,
      'globals.css must have a @media (prefers-color-scheme: dark) block',
    ).toContain('@media (prefers-color-scheme: dark)');

    // Both blocks must carry --primary-foreground: var(--color-blackAlpha-900)
    // Count occurrences of the specific override
    const overridePattern = /--primary-foreground:\s*var\(--color-blackAlpha-900\)/g;
    const matches = content.match(overridePattern) ?? [];
    expect(
      matches.length,
      'globals.css must carry --primary-foreground: var(--color-blackAlpha-900) in BOTH dark blocks (.dark + @media prefers-color-scheme: dark)',
    ).toBeGreaterThanOrEqual(2);
  });
  it('no raw HTML injection on user-controlled data (NFR-Sec3)', () => {
    // The escape-hatch React prop (looked up via its dangerous-named attribute)
    // is forbidden in our code. Some Blok primitives (alert / select / etc.)
    // use it for trusted static icon strings — those files live under
    // components/ui/ and are whitelisted because the content is bundled, not
    // user input.
    const UNSAFE_PROP = 'dangerously' + 'SetInnerHTML';
    const WHITELIST = [path.join(SITE_ROOT, 'components', 'ui')];

    const files = collectSourceFiles(SITE_ROOT);
    const violations: string[] = [];
    for (const file of files) {
      if (WHITELIST.some((w) => file.startsWith(w))) continue;
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes(UNSAFE_PROP)) {
        violations.push(path.relative(SITE_ROOT, file));
      }
    }

    expect(
      violations,
      `NFR-Sec3 violation: raw HTML injection found in non-whitelisted files. Files:\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });

  it('no `outline-none` / `outline:none` without a paired focus-visible replacement (WCAG 2.4.7)', () => {
    // Tailwind / shadcn pattern: every `outline-none` (or its CSS equivalent)
    // on an interactive element must be accompanied by a `focus-visible:` ring
    // or equivalent visible focus indicator. We allow it when the same source
    // line OR a sibling line within ~3 lines also references `focus-visible:`.
    //
    // Blok primitives under components/ui/* are whitelisted because they ship
    // with their own Radix-driven focus management; we don't own that code.
    // The guard's purpose is to catch issues in OUR feature components.
    const OUTLINE_REGEXES = [
      /\boutline-none\b/, // Tailwind shorthand
      /outline\s*:\s*none/, // raw CSS
      /\boutline-0\b/, // Tailwind alt
    ];
    const FOCUS_VISIBLE_REGEX = /focus-visible:/;
    const WHITELIST = [path.join(SITE_ROOT, 'components', 'ui')];

    const files = collectSourceFiles(SITE_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      if (WHITELIST.some((w) => file.startsWith(w))) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!OUTLINE_REGEXES.some((re) => re.test(line))) continue;

        // Look in a 3-line window around the match for a paired focus-visible:.
        const start = Math.max(0, i - 3);
        const end = Math.min(lines.length, i + 4);
        const window = lines.slice(start, end).join('\n');
        if (FOCUS_VISIBLE_REGEX.test(window)) continue;

        const rel = path.relative(SITE_ROOT, file);
        violations.push(`${rel}:${i + 1}: ${line.trim()}`);
      }
    }

    expect(
      violations,
      `WCAG 2.4.7 violation: outline removal found without a focus-visible replacement. Each interactive element that removes the default outline must provide a visible focus indicator within 3 lines.\n${violations.join('\n')}`,
    ).toHaveLength(0);
  });
});
