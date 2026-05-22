/**
 * use-staggered-render.ts — T028 (PRD-004 T4)
 *
 * Progressively reveals items from an array at staggered intervals.
 *
 * ADR-0027 / ADR-0040: Respects `prefers-reduced-motion: reduce`.
 *   When set, all items are yielded immediately on the first tick (no stagger).
 *
 * HYDRATION GUARD (feedback_hydration_mismatch_pattern):
 *   `matchMedia` is NEVER called in useState initializer or render body.
 *   It is called only inside useEffect.
 *
 * Implementation: uses setInterval (not recursive setTimeout) to avoid
 * deep call stacks when fake timers fire many ticks in sequence during tests.
 *
 * Cleanup: on `items` change, cancels in-flight interval and restarts.
 *          On unmount, clears the interval.
 *
 * Usage:
 *   const visibleStages = useStaggeredRender(trace?.stages ?? null, { intervalMs: 40 });
 */

import { useEffect, useState } from "react";

interface StaggeredRenderOptions {
  /** Milliseconds between revealing each successive item. Default: 40. */
  intervalMs?: number;
}

/**
 * Returns the progressive prefix of `items` to render at each tick.
 *
 * - Returns `[]` on first render (items not yet revealed).
 * - Reveals one additional item every `intervalMs` milliseconds.
 * - When `prefers-reduced-motion: reduce` is active, returns the full `items`
 *   array immediately (no stagger animation).
 * - When `items` is null, returns `[]`.
 * - When `items` changes, cancels in-flight stagger and restarts from the
 *   beginning of the new array.
 */
export function useStaggeredRender<T>(
  items: T[] | null,
  options?: StaggeredRenderOptions,
): T[] {
  const intervalMs = options?.intervalMs ?? 40;

  // Start with empty — SSR-safe (no browser globals in useState)
  const [visible, setVisible] = useState<T[]>([]);

  useEffect(() => {
    // HYDRATION GUARD: matchMedia is only called inside this effect
    if (!items || items.length === 0) {
      // Functional update: return prev when already empty so React bails out
      // (Object.is([], []) is false — a plain setVisible([]) would re-render
      // every time, causing an infinite effect loop when the caller passes an
      // inline [] literal as the items dependency).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(prev => (prev.length === 0 ? prev : []));
      return;
    }

    // Check reduced-motion preference
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Short-circuit: yield full array immediately (no stagger)
      setVisible(items.slice());
      return;
    }

    // Reset to empty before staggering the new items list
    setVisible([]);

    // Use a counter ref-like approach with setInterval so each tick is
    // a flat call (not recursive) — avoids deep call stacks with fake timers.
    let currentIndex = 0;
    const totalItems = items.length;
    const snapshot = items.slice(); // capture items at effect start

    const intervalId = setInterval(() => {
      currentIndex += 1;
      setVisible(snapshot.slice(0, currentIndex));

      if (currentIndex >= totalItems) {
        clearInterval(intervalId);
      }
    }, intervalMs);

    return () => {
      // Cleanup: cancel the interval on items-change or unmount
      clearInterval(intervalId);
    };
  }, [items, intervalMs]);

  return visible;
}
