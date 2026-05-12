import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Structural test: app/page.tsx must export a default function that calls notFound().
 * This is a source-file regex check (not a runtime test) to enforce ADR-0011:
 * Root "/" returns notFound() — provider-trap mitigation.
 *
 * The actual runtime 404 behaviour is verified during operator smoke (T065).
 */
describe('root route structural guard (ADR-0011)', () => {
  const pagePath = path.resolve(
    process.cwd(),
    'app',
    'page.tsx',
  );

  it('app/page.tsx exists', () => {
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it('app/page.tsx imports notFound from next/navigation', () => {
    const source = fs.readFileSync(pagePath, 'utf-8');
    expect(source).toMatch(/from ['"]next\/navigation['"]/);
    expect(source).toMatch(/notFound/);
  });

  it('app/page.tsx calls notFound() in the default export', () => {
    const source = fs.readFileSync(pagePath, 'utf-8');
    // Must export a default function and call notFound()
    expect(source).toMatch(/export default function/);
    expect(source).toMatch(/notFound\(\)/);
  });
});
