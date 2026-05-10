import { describe, it } from 'vitest';

/**
 * Structural guards — T062 skeleton (Tranche 1).
 *
 * These tests are it.todo markers so Vitest reports them as PENDING in CI
 * rather than absent. The actual logic lands in Tranche 8 (T062 final).
 *
 * Guards enforced at Tranche 8:
 * - SDK boundary lock (ADR-0011, § 4c-1): only lib/sdk/* and
 *   components/providers/marketplace.tsx may import @sitecore-marketplace-sdk/*
 * - Route coverage: all three extension routes registered + root returns notFound()
 * - Theme contract: app/globals.css carries the dark-mode --primary-foreground
 *   override in BOTH .dark blocks (structural coverage of T007 at Tranche 8)
 * - Security: no raw-HTML React injection on user data (NFR-Sec3)
 * - Accessibility: no outline: none without a replacement focus style
 */
describe('structural guards', () => {
  it.todo('SDK boundary lock — only lib/sdk/* and components/providers/marketplace.tsx import @sitecore-marketplace-sdk/*');
  it.todo('three extension routes registered + root returns notFound()');
  it.todo('app/globals.css carries the dark-mode --primary-foreground override in both .dark blocks');
  it.todo('no raw-HTML React injection on user data');
  it.todo('no outline: none without a replacement focus style');
});
