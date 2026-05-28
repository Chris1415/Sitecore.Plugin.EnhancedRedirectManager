/**
 * upstream-drift-copy.ts — Centralized error-state copy for inline drift status.
 *
 * T021: Single source of truth for error copy; consumed by TestSurface inline status block.
 *
 * Per AC-2.1 / 2.2 / 2.3 — all five DriftError reasons mapped.
 * Two-tier tone (ADR-0045 amendment):
 *   - errors = warning (amber) tone — less severe than drifted (destructive/red)
 *   - retry field drives button state (enabled / disabled-until-reset / none)
 */

import type { DriftError } from '@/lib/upstream-drift/types';

export type ErrorCopyEntry = {
  title: string;
  body: string;
  retry: 'enabled' | 'disabled-until-reset' | 'none';
};

export const ERROR_COPY: Record<DriftError, ErrorCopyEntry> = {
  'rate-limit': {
    title: 'GitHub API rate limit reached.',
    body: 'Try again in {N} minutes.',
    retry: 'disabled-until-reset',
  },
  'not-found': {
    title: 'Upstream file not found at expected path.',
    body: 'This may indicate a Sitecore refactor — engineer review required.',
    retry: 'none',
  },
  network: {
    title: "Couldn't reach GitHub.",
    body: 'Try again.',
    retry: 'enabled',
  },
  'schema-mismatch': {
    title: 'Snapshot schema mismatch — engineer review required.',
    body: '',
    retry: 'none',
  },
  unknown: {
    title: 'Unexpected error checking upstream.',
    body: 'Try again.',
    retry: 'enabled',
  },
};
