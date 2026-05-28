'use client';

/**
 * UpstreamDriftBanner.tsx — Drift signal banner above the trace area.
 *
 * ADR-0045: role="status" aria-live="polite" — NOT role="alert".
 *           Tone is destructive (red) for visual weight; semantic is informational.
 *           Dismiss is per-session (sessionStorage).
 * ADR-0049: Banner renders when state === 'drifted' AND not dismissed.
 *
 * Visual contract: pocs/poc-v1-prd005/screen-test-drifted.html (desktop light)
 *                  pocs/poc-v1-prd005/screen-test-drifted-dark.html (dark)
 *                  pocs/poc-v1-prd005/screen-test-drifted-mobile.html (mobile)
 *
 * Banner copy (final per 4c-4):
 *   Upstream `RedirectsProxy` has changed since this simulator was ported.
 *   Trace may be subtly inaccurate. Ask your engineer to run `/sync-redirect-proxy` to update.
 *   (Last sync: <date>)
 *
 * Tokens used: --destructive-background (soft tint); --destructive (left border + glyph);
 *   --foreground (body text); --muted-foreground (meta). No hex literals.
 *
 * Icons: Lucide AlertTriangle (destructive glyph), X (dismiss button).
 *   All inline SVG, currentColor fill-free, stroke-based.
 */

import { AlertTriangle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
      new Date(isoString),
    );
  } catch {
    return isoString;
  }
}

function formatRelative(isoString: string): string {
  try {
    const diffMs = new Date(isoString).getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
    const diffMin = Math.round(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHour = Math.round(diffMin / 60);
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
    const diffDay = Math.round(diffHour / 24);
    return rtf.format(diffDay, 'day');
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UpstreamDriftBannerProps {
  /** ISO-8601 timestamp of the last drift check. Null if never checked. */
  lastChecked: string | null;
  /** Called when operator clicks the X dismiss button. */
  onDismiss: () => void;
  /** When true, renders nothing (sessionStorage flag active). */
  dismissed: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpstreamDriftBanner({
  lastChecked,
  onDismiss,
  dismissed,
}: UpstreamDriftBannerProps) {
  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="drift-banner"
    >
      {/* Leading glyph — AlertTriangle in destructive color */}
      <span className="drift-banner__glyph" aria-hidden="true">
        <AlertTriangle size={16} strokeWidth={1.75} />
      </span>

      {/* Body copy */}
      <div className="drift-banner__body">
        {/* Static copy per 4c-4 — no user input interpolation */}
        Upstream{' '}
        <code>RedirectsProxy</code>{' '}
        has changed since this simulator was ported. Trace may be subtly inaccurate.
        Ask your engineer to run{' '}
        <code>/sync-redirect-proxy</code>{' '}
        to update.
        {lastChecked && (
          <span className="drift-banner__meta">
            Last sync:{' '}
            <time
              dateTime={lastChecked}
              title={formatRelative(lastChecked)}
            >
              {formatDate(lastChecked)}
            </time>
          </span>
        )}
      </div>

      {/* Dismiss button — ghost icon-button, keyboard-reachable */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss upstream drift banner"
        className="drift-banner__dismiss"
      >
        <X size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
