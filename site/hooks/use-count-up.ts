/**
 * T011 — useCountUp hook.
 *
 * Animates a number from 0 → targetValue using requestAnimationFrame.
 * Easing: easeOutCubic.
 *
 * Reduced-motion gate: if prefers-reduced-motion: reduce is set (checked inside
 * useEffect via window.matchMedia), returns targetValue immediately without animation.
 *
 * HYDRATION SAFETY (R-Hydration / feedback_hydration_mismatch_pattern):
 * All browser-global access (window.matchMedia, requestAnimationFrame,
 * getComputedStyle) is INSIDE useEffect. Initial render value is always 0
 * (or targetValue when enabled=false). Never branches on typeof window in
 * render body or useState initializer.
 *
 * Signature:
 *   useCountUp(targetValue: number, options?: { duration?: number; enabled?: boolean }): number
 *
 * Depends on: T001 (elevated.css defines --v4-count-up-duration variable)
 */

import { useState, useEffect, useRef } from 'react';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const DEFAULT_DURATION_MS = 1400; // matches --v4-count-up-duration in elevated.css

interface UseCountUpOptions {
  duration?: number;
  enabled?: boolean;
}

export function useCountUp(
  targetValue: number,
  { duration, enabled = true }: UseCountUpOptions = {},
): number {
  // Initial state is 0 — SSR-safe; never branches on window in render
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // All paths go through requestAnimationFrame to avoid synchronous setState
    // inside the effect body (react-hooks/set-state-in-effect).

    // Short-circuit paths (disabled or reduced-motion): use a single RAF frame
    // to deliver the final value asynchronously.
    const deliverImmediate = () => {
      rafRef.current = requestAnimationFrame(() => {
        setCurrent(targetValue);
      });
    };

    // Short-circuit: disabled
    if (!enabled) {
      deliverImmediate();
      return () => {
        cancelAnimationFrame(rafRef.current);
      };
    }

    // Reduced-motion check — all browser-global access is here, inside useEffect
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      deliverImmediate();
      return () => {
        cancelAnimationFrame(rafRef.current);
      };
    }

    // Resolve duration: prefer explicit prop, then try CSS variable, then default
    let resolvedDuration = duration ?? DEFAULT_DURATION_MS;
    if (!duration && typeof window !== 'undefined') {
      try {
        const cssValue = getComputedStyle(document.documentElement)
          .getPropertyValue('--v4-count-up-duration')
          .trim();
        if (cssValue) {
          const parsed = parseFloat(cssValue);
          if (!Number.isNaN(parsed)) {
            // CSS value may be "1400ms" or "1.4s"
            resolvedDuration = cssValue.endsWith('s') && !cssValue.endsWith('ms')
              ? parsed * 1000
              : parsed;
          }
        }
      } catch {
        // jsdom may throw; fall back to default
      }
    }

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / resolvedDuration, 1);
      const eased = easeOutCubic(progress);
      const value = Math.round(eased * targetValue);
      setCurrent(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrent(targetValue);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [targetValue, duration, enabled]);

  return current;
}
