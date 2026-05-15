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

  // ---------------------------------------------------------------------------
  // PRD-002 guards (T040-T045) — appended in place per task-breakdown § 4c-5
  // ---------------------------------------------------------------------------

  /**
   * T040 — Guard #6: no `#` hex literals outside `site/app/globals.css`.
   *
   * ADR-0024 + § 4c-1: Blok token discipline requires that all color / gradient
   * / shadow expressions compose Blok semantic tokens via `color-mix(in oklch,
   * var(--token), ...)`. No hard-coded hex values are permitted in any source
   * file OTHER than `site/app/globals.css` (the canonical Blok Nova theme
   * location where hex values seed the token system).
   *
   * SEED VIOLATION CHECK:
   *   1. Add `color: #ff0000;` to any .ts/.tsx/.css file outside globals.css
   *      (e.g. `site/components/full-page/FullPage.tsx`).
   *   2. Run: npx vitest run tests/structural/structural-guards.test.ts
   *   3. Confirm the guard FAILS with the file path and offending line.
   *   4. Remove the seed line and confirm the guard PASSES.
   */
  it('T040 — no #hex literals outside site/app/globals.css (ADR-0024)', () => {
    // Matches CSS/JS hex color literals (#fff, #ff0000, #rrggbbaa).
    // Negative lookbehind excludes HTML entities like &#9744; (decimal) and &#x1F; (hex).
    // Also excludes id selectors in CSS (#my-id — must start with a letter after #).
    // We flag: # followed by 3-8 hex digits NOT preceded by & and NOT followed by a word char
    // that would make it an identifier (check: the 3-8 chars are all hex AND the pattern
    // is plausibly a color literal, i.e. starts right after whitespace, colon, quote, or comma).
    const HEX_REGEX = /(?<!&)(?<![a-zA-Z_-])#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F\w-])/;
    const GLOBALS_CSS = path.join(SITE_ROOT, 'app', 'globals.css');

    /** Collect all .ts/.tsx/.css files under site/ excluding node_modules, .next, tests */
    function collectAllSourceFiles(dir: string): string[] {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next', 'tests', 'examples'].includes(entry.name)) continue;
          results.push(...collectAllSourceFiles(fullPath));
        } else if (entry.isFile()) {
          const ext = entry.name;
          if (ext.endsWith('.ts') || ext.endsWith('.tsx') || ext.endsWith('.css')) {
            results.push(fullPath);
          }
        }
      }
      return results;
    }

    const files = collectAllSourceFiles(SITE_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      // Allow-list: globals.css is the canonical theme seed location
      if (file === GLOBALS_CSS) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines (CSS /* ... */ and TS // ...)
        const trimmed = line.trimStart();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        if (HEX_REGEX.test(line)) {
          const rel = path.relative(SITE_ROOT, file);
          violations.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    expect(
      violations,
      'T040 violation: #hex literal found outside site/app/globals.css.\n' +
        'Use color-mix(in oklch, var(--token), ...) or a Blok semantic token instead.\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });

  /**
   * T041 — Guard #7: every @keyframes block has a paired prefers-reduced-motion rule.
   *
   * ADR-0027 + PRD-002 NFR: all CSS animation keyframes must be disabled under
   * `@media (prefers-reduced-motion: reduce)`. The guard checks that every CSS
   * file containing `@keyframes` also contains a `@media (prefers-reduced-motion`
   * block. This is the pragmatic implementation (per task breakdown § 4b Epic H):
   * exact selector matching is brittle; file-level co-presence is the enforced
   * invariant.
   *
   * SEED VIOLATION CHECK:
   *   1. Add a bare `@keyframes seed-test { from { opacity: 0; } to { opacity: 1; } }`
   *      to `site/styles/elevated.css` WITHOUT adding a paired reduced-motion block.
   *   2. Run: npx vitest run tests/structural/structural-guards.test.ts
   *   3. Confirm the guard FAILS naming `styles/elevated.css`.
   *   4. Remove the seed keyframe and confirm the guard PASSES.
   */
  it('T041 — every @keyframes block has a paired prefers-reduced-motion rule', () => {
    const KEYFRAMES_REGEX = /@keyframes\s+\S+/;
    const REDUCED_MOTION_REGEX = /@media\s*\(prefers-reduced-motion/;

    function collectCssFiles(dir: string): string[] {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next'].includes(entry.name)) continue;
          results.push(...collectCssFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.css')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const cssFiles = collectCssFiles(SITE_ROOT);
    const violations: string[] = [];

    for (const file of cssFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (!KEYFRAMES_REGEX.test(content)) continue; // no keyframes in this file
      if (!REDUCED_MOTION_REGEX.test(content)) {
        const rel = path.relative(SITE_ROOT, file);
        violations.push(rel);
      }
    }

    expect(
      violations,
      'T041 violation: CSS file(s) with @keyframes blocks but no @media (prefers-reduced-motion: reduce) rule.\n' +
        'Every @keyframes block must be paired with a reduced-motion gate in the same file.\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });

  /**
   * T042 — Guard #8: no "Active" / "Draft" string literals or CSS classes.
   *
   * PRD-002 § 4c-1 + ADR-0024: status indicators use ONLY the 3-value RedirectType
   * enum (Redirect301 / Redirect302 / ServerTransfer). The words "Active" and "Draft"
   * are dropped everywhere (no status-pill--active, no status-pill--draft, no
   * lr-row__dot--draft, no --draft CSS class).
   *
   * SEED VIOLATION CHECK:
   *   1. Add `className="status-pill--active"` to any .tsx file outside tests/fixtures/.
   *   2. Run: npx vitest run tests/structural/structural-guards.test.ts
   *   3. Confirm the guard FAILS with the file path.
   *   4. Remove the seed and confirm the guard PASSES.
   */
  it('T042 — no Active/Draft string literals or --draft CSS classes (ADR-0024)', () => {
    const FIXTURES_DIR = path.join(SITE_ROOT, 'tests', 'fixtures');

    // Patterns to detect in JSX/TSX files
    const JSX_ACTIVE_DRAFT_REGEXES = [
      />(Active|Draft)</,                          // JSX text node
      /=\{["'](Active|Draft)["']\}/,               // JSX attribute value
      /["'](Active|Draft)["']/,                    // general string literal
    ];
    // Patterns to detect in CSS files
    const CSS_DRAFT_REGEXES = [
      /status-pill--active/,
      /status-pill--draft/,
      /lr-row__dot--draft/,
      /[^-]--draft/,                               // any --draft class (not a CSS variable like --draft-color)
    ];

    const violations: string[] = [];

    function checkFiles(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next', 'examples'].includes(entry.name)) continue;
          // Skip fixtures — they may contain Active/Draft for test data
          if (fullPath === FIXTURES_DIR || fullPath.startsWith(FIXTURES_DIR)) continue;
          checkFiles(fullPath);
        } else if (entry.isFile()) {
          const name = entry.name;
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          const rel = path.relative(SITE_ROOT, fullPath);

          if (name.endsWith('.tsx') || name.endsWith('.ts')) {
            // Skip test files themselves
            if (rel.startsWith('tests' + path.sep) || rel.startsWith('tests/')) continue;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const trimmed = line.trimStart();
              if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
              if (JSX_ACTIVE_DRAFT_REGEXES.some((re) => re.test(line))) {
                violations.push(`${rel}:${i + 1}: ${line.trim()}`);
              }
            }
          } else if (name.endsWith('.css')) {
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const trimmed = line.trimStart();
              if (trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
              if (CSS_DRAFT_REGEXES.some((re) => re.test(line))) {
                violations.push(`${rel}:${i + 1}: ${line.trim()}`);
              }
            }
          }
        }
      }
    }

    checkFiles(SITE_ROOT);

    expect(
      violations,
      'T042 violation: "Active"/"Draft" label or --draft CSS class found in source.\n' +
        'Status indicators must use RedirectType enum values only (Redirect301/Redirect302/ServerTransfer).\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });

  /**
   * T043 — Guard #9: PreviewDataBanner mounted on surfaces with data-preview-mock elements.
   *
   * ADR-0025: every surface that renders `data-preview-mock="true"` elements must also
   * mount `<PreviewDataBanner`. Surfaces without mock elements must NOT mount the banner.
   *
   * Expected pairing:
   *   Full Page (FullPage.tsx)        — has data-preview-mock → must have PreviewDataBanner
   *   Dashboard Widget (DashboardWidget.tsx) — has data-preview-mock → must have PreviewDataBanner
   *   Context Panel (ContextPanel.tsx)       — no data-preview-mock → must NOT have PreviewDataBanner
   *
   * SEED VIOLATION CHECK:
   *   1. Remove `<PreviewDataBanner` from `site/components/full-page/FullPage.tsx` (once T017 is done).
   *   2. Run this guard — confirm it FAILS naming FullPage.tsx as violating "has mock but no banner".
   *   3. Restore the import and confirm the guard PASSES.
   *
   * NOTE: This guard is intentionally forward-looking. At T1 the surface component files
   * have not yet been modified (that is T3+). The guard reads the current state and passes
   * because FullPage.tsx currently has neither mock attributes nor banner (pre-T17). Once
   * T17 wires both, the guard continues to pass. If someone adds mock attributes WITHOUT
   * the banner, the guard fails.
   */
  it('T043 — PreviewDataBanner paired with data-preview-mock surfaces (ADR-0025)', () => {
    /**
     * 2026-05-15: DashboardWidget exempted by operator request — the inline
     * banner clutters the narrow widget; mocks remain visually distinguishable
     * via the muted styling on .dw-hero / .dw-rows / .dw-recent. Full Page
     * keeps the banner because its surface is large enough not to feel
     * cluttered by it.
     */
    const surfaces = [
      {
        name: 'FullPage',
        file: path.join(SITE_ROOT, 'components', 'full-page', 'FullPage.tsx'),
        expectMock: null,
        requiresBanner: true,
      },
      {
        name: 'ContextPanel',
        file: path.join(SITE_ROOT, 'components', 'context-panel', 'ContextPanel.tsx'),
        expectMock: null,
        requiresBanner: true,
      },
    ];

    const violations: string[] = [];

    for (const surface of surfaces) {
      if (!fs.existsSync(surface.file)) continue; // file may not exist yet (pre-T17)

      const content = fs.readFileSync(surface.file, 'utf-8');
      const hasMockAttr = content.includes('data-preview-mock');
      const hasBanner = content.includes('<PreviewDataBanner');

      if (surface.requiresBanner && hasMockAttr && !hasBanner) {
        const rel = path.relative(SITE_ROOT, surface.file);
        violations.push(`${rel}: has data-preview-mock="true" elements but is missing <PreviewDataBanner`);
      }
      if (!hasMockAttr && hasBanner) {
        const rel = path.relative(SITE_ROOT, surface.file);
        violations.push(`${rel}: mounts <PreviewDataBanner but has no data-preview-mock="true" elements`);
      }
    }

    expect(
      violations,
      'T043 violation: PreviewDataBanner ↔ data-preview-mock pairing mismatch.\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });

  /**
   * T044 — Guard #10: elevated-plumes.css imported ONLY by Full Page route files.
   *
   * ADR-0027 + § 4c-1: the drifting plume backdrop is a Full Page-only motion budget
   * decision. `elevated-plumes.css` must NEVER be imported from Context Panel, Dashboard
   * Widget, root layout, or any other route. Only files under `site/app/full-page/` or
   * `site/components/full-page/` may contain an import of `elevated-plumes.css`.
   *
   * SEED VIOLATION CHECK:
   *   1. Add `import '../../../styles/elevated-plumes.css';` to
   *      `site/components/context-panel/ContextPanel.tsx`.
   *   2. Run this guard — confirm it FAILS naming ContextPanel.tsx as a violation.
   *   3. Remove the seed import and confirm the guard PASSES.
   */
  it('T044 — elevated-plumes.css imported ONLY by Full Page route files (ADR-0027)', () => {
    const ALLOWED_PREFIXES = [
      path.join(SITE_ROOT, 'app', 'full-page'),
      path.join(SITE_ROOT, 'components', 'full-page'),
    ];
    const PLUME_CSS_PATTERN = /elevated-plumes\.css/;

    function collectTsFiles(dir: string): string[] {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next', 'tests', 'examples'].includes(entry.name)) continue;
          results.push(...collectTsFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const files = collectTsFiles(SITE_ROOT);
    const violations: string[] = [];

    for (const file of files) {
      const isAllowed = ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix));
      if (isAllowed) continue;

      const content = fs.readFileSync(file, 'utf-8');
      if (PLUME_CSS_PATTERN.test(content)) {
        const rel = path.relative(SITE_ROOT, file);
        violations.push(`${rel}: imports elevated-plumes.css outside the Full Page subtree`);
      }
    }

    expect(
      violations,
      'T044 violation: elevated-plumes.css imported outside site/app/full-page/ or site/components/full-page/.\n' +
        'The drifting plume backdrop is a Full Page-only motion budget decision (ADR-0027).\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });

  /**
   * T045 — Guard #11: no language-count strings ("N languages").
   *
   * PRD-002 FR-R11 + ADR-0010 (en-only scope): the phrase "N languages" or
   * "across N languages" must never appear in source files (it was present in
   * early V4 POC drafts but dropped in the refined POC). Multilingual is
   * deferred indefinitely per ADR-0023.
   *
   * SEED VIOLATION CHECK:
   *   1. Add the string `"across 7 languages"` to any .tsx file outside tests/fixtures/.
   *   2. Run this guard — confirm it FAILS with the file path and offending line.
   *   3. Remove the seed string and confirm the guard PASSES.
   */
  it('T045 — no language-count strings ("N languages") in source (ADR-0010)', () => {
    const LANG_COUNT_REGEXES = [
      /\b\d+\s+languages?\b/i,
      /\bacross\s+\d+\s+languages?\b/i,
    ];
    const FIXTURES_DIR = path.join(SITE_ROOT, 'tests', 'fixtures');

    const violations: string[] = [];

    function checkForLangStrings(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next', 'examples'].includes(entry.name)) continue;
          if (fullPath === FIXTURES_DIR || fullPath.startsWith(FIXTURES_DIR)) continue;
          checkForLangStrings(fullPath);
        } else if (entry.isFile()) {
          const name = entry.name;
          if (!name.endsWith('.ts') && !name.endsWith('.tsx') && !name.endsWith('.css')) continue;

          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          const rel = path.relative(SITE_ROOT, fullPath);

          // Skip test files
          if (rel.startsWith('tests' + path.sep) || rel.startsWith('tests/')) continue;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trimStart();
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
            if (LANG_COUNT_REGEXES.some((re) => re.test(line))) {
              violations.push(`${rel}:${i + 1}: ${line.trim()}`);
            }
          }
        }
      }
    }

    checkForLangStrings(SITE_ROOT);

    expect(
      violations,
      'T045 violation: language-count string found in source.\n' +
        '"N languages" copy was dropped from V4 (FR-R11) — multilingual is deferred (ADR-0010/ADR-0023).\n' +
        violations.join('\n'),
    ).toHaveLength(0);
  });
});
