/**
 * Splits an element's textContent into per-character spans with staggered
 * reveal delays, inside useEffect. Under prefers-reduced-motion it skips the
 * split entirely and sets opacity to 1 — it does not merely animate faster.
 *
 * ⚠ Known conflict: the splitter operates on top-level textContent, so an
 * element containing nested spans (gradient text) keeps its text but may have
 * those spans flattened. See docs/build-decisions.md#hydration-safety.
 */

import { useEffect, type RefObject } from 'react';

const DEFAULT_STAGGER_MS = 28;  // matches --v4-letter-reveal-stagger
const DEFAULT_DURATION_MS = 800; // matches --v4-letter-reveal-total

interface UseLetterRevealOptions {
  staggerMs?: number;
  durationMs?: number;
  enabled?: boolean;
}

export function useLetterReveal(
  elementRef: RefObject<HTMLElement | null>,
  {
    staggerMs,
    durationMs,
    enabled = true,
  }: UseLetterRevealOptions = {},
): void {
  useEffect(() => {
    const el = elementRef.current;
    if (!el || !enabled) {
      if (el) el.style.opacity = '1';
      return;
    }

    // Reduced-motion check — all browser-global access is here, inside useEffect
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      el.style.opacity = '1';
      return;
    }

    // Resolve stagger and duration from CSS variables if not explicitly provided
    let resolvedStagger = staggerMs ?? DEFAULT_STAGGER_MS;
    let resolvedDuration = durationMs ?? DEFAULT_DURATION_MS;

    if (typeof window !== 'undefined') {
      try {
        const styles = getComputedStyle(document.documentElement);
        if (!staggerMs) {
          const cssStagger = styles.getPropertyValue('--v4-letter-reveal-stagger').trim();
          if (cssStagger) {
            const parsed = parseFloat(cssStagger);
            if (!Number.isNaN(parsed)) {
              resolvedStagger = cssStagger.endsWith('s') && !cssStagger.endsWith('ms')
                ? parsed * 1000
                : parsed;
            }
          }
        }
        if (!durationMs) {
          const cssDuration = styles.getPropertyValue('--v4-letter-reveal-total').trim();
          if (cssDuration) {
            const parsed = parseFloat(cssDuration);
            if (!Number.isNaN(parsed)) {
              resolvedDuration = cssDuration.endsWith('s') && !cssDuration.endsWith('ms')
                ? parsed * 1000
                : parsed;
            }
          }
        }
      } catch {
        // jsdom fallback — use defaults
      }
    }

    // Capture original content for cleanup
    const originalHTML = el.innerHTML;
    const text = el.textContent ?? '';

    // Split into per-character spans with staggered reveal delay
    const spans = text.split('').map((char, i) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.setProperty('--reveal-delay', `${i * resolvedStagger}ms`);
      span.style.setProperty(
        '--reveal-duration',
        `${resolvedDuration}ms`,
      );
      span.className = 'letter';
      return span;
    });

    el.innerHTML = '';
    for (const span of spans) {
      el.appendChild(span);
    }

    // Cleanup: restore original content on unmount
    return () => {
      if (el) {
        el.innerHTML = originalHTML;
      }
    };
  }, [elementRef, staggerMs, durationMs, enabled]);
}
