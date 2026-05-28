/**
 * next-config-csp-guard.test.ts — Structural guard: no CSP introduced in PRD-005.
 *
 * T029: Per FR-F3 / ADR-0048.
 * PRD-005 leaves next.config.mjs untouched — in-app fetch() to api.github.com
 * works without app-level CSP. If a future PRD introduces CSP, api.github.com
 * MUST be in connect-src.
 *
 * ADR-0048: No Content-Security-Policy introduced in PRD-005.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('next.config.mjs structural guards (PRD-005 ADR-0048)', () => {
  it('does NOT contain Content-Security-Policy (case-insensitive)', () => {
    const configPath = resolve(__dirname, '../next.config.mjs');
    const content = readFileSync(configPath, 'utf-8');

    // Guard against accidental CSP introduction during PRD-005.
    // If a future PRD introduces CSP, api.github.com MUST be in connect-src.
    expect(content.toLowerCase()).not.toContain('content-security-policy');
  });
});
