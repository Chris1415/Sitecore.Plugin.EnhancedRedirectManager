/**
 * T028a / T028 — useStaggeredRender tests
 *
 * Key constraint: items must be passed as a STABLE reference outside
 * renderHook. If items is an inline literal (e.g. renderHook(() =>
 * useStaggeredRender(['a', 'b', 'c']))), a new array is created on every
 * render call. React's dep comparison uses Object.is so the useEffect fires
 * again each render — combined with React 19's act() draining fake timers,
 * this creates an infinite reveal loop.
 *
 * Solution: declare items outside renderHook, pass by reference.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStaggeredRender } from './use-staggered-render';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Stable item arrays declared at module scope — never re-allocated
const ITEMS_ABC = ['a', 'b', 'c'] as const;
const ITEMS_XY = ['x', 'y'] as const;

describe('useStaggeredRender (T028)', () => {
  // -----------------------------------------------------------------------
  // Null / empty guard (no timer involved)
  // -----------------------------------------------------------------------

  it('returns [] immediately when items is null', () => {
    const { result } = renderHook(() => useStaggeredRender<string>(null));
    expect(result.current).toEqual([]);
  });

  it('returns [] immediately when items is empty array', async () => {
    // Use a stable empty ref to avoid new-reference re-render loop
    const emptyItems: string[] = [];
    const { result } = renderHook(() => useStaggeredRender(emptyItems));
    await act(async () => {});
    expect(result.current).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Stagger progression (fake timers + stable refs)
  // -----------------------------------------------------------------------

  it('reveals items one-by-one on each interval tick', async () => {
    vi.useFakeTimers();

    const items = ['a', 'b', 'c'];
    const { result } = renderHook(() =>
      useStaggeredRender(items, { intervalMs: 40 }),
    );

    // After mount, before any tick: still empty (effect reset)
    expect(result.current).toEqual([]);

    // Tick 1
    await act(async () => { vi.advanceTimersByTime(40); });
    expect(result.current).toEqual(['a']);

    // Tick 2
    await act(async () => { vi.advanceTimersByTime(40); });
    expect(result.current).toEqual(['a', 'b']);

    // Tick 3
    await act(async () => { vi.advanceTimersByTime(40); });
    expect(result.current).toEqual(['a', 'b', 'c']);
  });

  it('clears the interval once all items are revealed', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');

    const items = ['x', 'y'];
    const { result } = renderHook(() =>
      useStaggeredRender(items, { intervalMs: 40 }),
    );

    await act(async () => { vi.advanceTimersByTime(80); });
    expect(result.current).toEqual(['x', 'y']);
    // clearInterval should have been called (once for the last-tick cleanup)
    expect(clearSpy).toHaveBeenCalled();
  });

  it('cancels in-flight interval and restarts when items change', async () => {
    vi.useFakeTimers();

    // Use a ref-swappable wrapper so we can change what items points to
    const state = { items: ITEMS_ABC as readonly string[] };
    const { result, rerender } = renderHook(() =>
      useStaggeredRender(state.items as string[], { intervalMs: 40 }),
    );

    // Partial reveal of first items
    await act(async () => { vi.advanceTimersByTime(40); });
    expect(result.current).toEqual(['a']);

    // Replace items — swap ref then rerender
    state.items = ITEMS_XY;
    rerender();

    // Effect cleanup fires (cancels old interval) and restarts;
    // setVisible([]) resets state
    await act(async () => {});
    expect(result.current).toEqual([]);

    // New interval ticks
    await act(async () => { vi.advanceTimersByTime(40); });
    expect(result.current).toEqual(['x']);

    await act(async () => { vi.advanceTimersByTime(40); });
    expect(result.current).toEqual(['x', 'y']);
  });

  it('cancels the interval on unmount', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');

    const items = ['a', 'b', 'c'];
    const { unmount } = renderHook(() =>
      useStaggeredRender(items, { intervalMs: 40 }),
    );

    // Partial reveal then unmount — wrap unmount in act() to drain pending
    // React work before the test ends (prevents cross-test state leakage)
    await act(async () => { vi.advanceTimersByTime(40); });
    await act(async () => { unmount(); });

    expect(clearSpy).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // prefers-reduced-motion (ADR-0040)
  // -----------------------------------------------------------------------

  it('returns full array immediately when prefers-reduced-motion is set', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));

    // Use stable module-level array — no fake timers needed (hook short-circuits)
    const { result, unmount } = renderHook(() =>
      useStaggeredRender(ITEMS_ABC as unknown as string[], { intervalMs: 40 }),
    );

    // Flush the useEffect (where the matchMedia check lives)
    await act(async () => {});

    expect(result.current).toEqual(['a', 'b', 'c']);

    // Explicit unmount + drain to prevent React scheduler state leaking into
    // the next test (test isolation: each hook instance must be torn down)
    await act(async () => { unmount(); });
  });

  it('accepts no options (uses default 40ms interval) and reveals all items', async () => {
    // React 19 act() automatically drains fake timers, so we cannot assert
    // intermediate sub-interval state. Instead: verify the hook works correctly
    // end-to-end with no explicit intervalMs, revealing all items after enough
    // fake time has elapsed.
    vi.useFakeTimers();

    const items = ['p', 'q'];
    const { result, unmount } = renderHook(() => useStaggeredRender(items));

    // Advance enough time for both items to be revealed (2 × 40ms)
    await act(async () => { vi.advanceTimersByTime(80); });
    expect(result.current).toEqual(['p', 'q']);

    await act(async () => { unmount(); });
  });
});
