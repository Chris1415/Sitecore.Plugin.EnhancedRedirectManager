import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Structural test: app/globals.css must carry the dark-mode --primary-foreground
 * override (var(--color-blackAlpha-900)) in BOTH dark-mode blocks.
 *
 * This is the runtime guard for R-Impl-2 (theme contract, ADR-0004 / blok-theming).
 *
 * The override was first flagged by Christian 2026-05-10: in dark mode --primary
 * becomes primary-200 (#d9d4ff, light lavender). The Nova/sibling preset set
 * --primary-foreground: white, producing white-on-lavender = unreadable.
 * Flip to dark so primary buttons render dark-text-on-lavender (WCAG AA).
 *
 * A component-level runtime test (mounting Blok <Button>) is the eventual target
 * but JSDOM doesn't support CSS variable resolution for computed styles.
 * This source-file check is the practical guard for this constraint.
 */
describe('dark-mode --primary-foreground contrast override (theme contract)', () => {
  const globalsPath = path.resolve(process.cwd(), 'app', 'globals.css');

  it('app/globals.css exists', () => {
    expect(fs.existsSync(globalsPath)).toBe(true);
  });

  it('globals.css contains --color-blackAlpha-900 primitive definition', () => {
    const source = fs.readFileSync(globalsPath, 'utf-8');
    expect(source).toContain('--color-blackAlpha-900');
  });

  it('globals.css carries --primary-foreground: var(--color-blackAlpha-900) override', () => {
    const source = fs.readFileSync(globalsPath, 'utf-8');
    // Must appear at least twice: once in @media block and once in .dark block
    const matches = source.match(/--primary-foreground:\s*var\(--color-blackAlpha-900\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('globals.css has the dark-mode override inside @media (prefers-color-scheme: dark) block', () => {
    const source = fs.readFileSync(globalsPath, 'utf-8');
    // Find the @media dark block and check it contains the override
    const mediaBlock = source.match(/@media\s*\(prefers-color-scheme:\s*dark\)[^{]*\{[\s\S]*?\}/);
    expect(mediaBlock).not.toBeNull();
    expect(mediaBlock![0]).toContain('--primary-foreground');
    expect(mediaBlock![0]).toContain('blackAlpha-900');
  });

  it('globals.css has the dark-mode override inside .dark class block', () => {
    const source = fs.readFileSync(globalsPath, 'utf-8');
    // Find .dark { ... } block and check it contains the override
    const darkClassBlock = source.match(/^\.dark\s*\{[\s\S]*?\}/m);
    expect(darkClassBlock).not.toBeNull();
    expect(darkClassBlock![0]).toContain('--primary-foreground');
    expect(darkClassBlock![0]).toContain('blackAlpha-900');
  });

  it('globals.css contains the verbatim dark-mode override comment', () => {
    const source = fs.readFileSync(globalsPath, 'utf-8');
    // The override comment must be preserved verbatim per § 4c-4 contract
    expect(source).toContain('Dark-mode contrast fix (Christian flagged 2026-05-10)');
    expect(source).toContain('white-on-lavender = unreadable');
  });
});
