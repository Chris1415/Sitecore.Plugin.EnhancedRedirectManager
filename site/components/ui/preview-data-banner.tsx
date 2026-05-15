/**
 * T006 — PreviewDataBanner component.
 *
 * ADR-0025: Per-surface "preview data is in use" banner.
 * Reads PREVIEW_DATA_ACTIVE[surface] and renders only when flag is true.
 * Uses the existing @blok/alert primitive (Alert from @/components/ui/alert).
 *
 * Surfaces:
 *   fullPage        → renders (PREVIEW_DATA_ACTIVE.fullPage === true)
 *   dashboardWidget → renders (PREVIEW_DATA_ACTIVE.dashboardWidget === true)
 *   contextPanel    → returns null (PREVIEW_DATA_ACTIVE.contextPanel === false)
 *
 * Copy (per OQ-2 / prd-minimal-002 § "Preview data" banner):
 *   "Some metrics on this surface use preview data — wired up in a follow-on release."
 *
 * Glyph: inline monochrome SVG info icon with currentColor (NOT the emoji ⓘ).
 * data-preview-banner="<surface>" attribute enables structural guard pairing tests.
 */

import { Alert } from '@/components/ui/alert';
import { PREVIEW_DATA_ACTIVE } from '@/lib/mocks/preview-data';

export type PreviewDataBannerSurface = 'fullPage' | 'dashboardWidget' | 'contextPanel';

interface PreviewDataBannerProps {
  surface: PreviewDataBannerSurface;
}

export function PreviewDataBanner({ surface }: PreviewDataBannerProps) {
  if (!PREVIEW_DATA_ACTIVE[surface]) {
    return null;
  }

  return (
    <Alert
      variant="default"
      data-preview-banner={surface}
      className="text-xs py-2"
    >
      Some metrics on this surface use preview data — wired up in a follow-on release.
    </Alert>
  );
}
