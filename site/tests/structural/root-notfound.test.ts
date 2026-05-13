import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Structural test: app/page.tsx exists and renders the IntroPage (NOT
 * notFound()). The earlier ADR-0011 rule "Root / returns notFound() —
 * provider-trap mitigation" has been superseded by the IntroPage home page,
 * which sits OUTSIDE the MarketplaceProvider (now scoped to each
 * extension-point route via per-route layouts).
 *
 * The provider-trap concern is still mitigated, but by a different mechanism:
 * the SDK handshake only runs inside `context-panel/`, `dashboard-widget/`,
 * and `full-page/` route subtrees.
 */
describe('root route structural guard (post ADR-0011 supersession)', () => {
  const pagePath = path.resolve(
    process.cwd(),
    'app',
    'page.tsx',
  );

  it('app/page.tsx exists', () => {
    expect(fs.existsSync(pagePath)).toBe(true);
  });

  it('app/page.tsx does NOT import notFound (intro page, not 404)', () => {
    const source = fs.readFileSync(pagePath, 'utf-8');
    expect(source).not.toMatch(/notFound\s*\(/);
  });

  it('app/page.tsx renders the Redirect Manager intro (title + 3 surfaces)', () => {
    const source = fs.readFileSync(pagePath, 'utf-8');
    expect(source).toMatch(/Redirect Manager/);
    expect(source).toMatch(/Full Page/);
    expect(source).toMatch(/Pages Context Panel/);
    expect(source).toMatch(/Dashboard Widget/);
  });
});
