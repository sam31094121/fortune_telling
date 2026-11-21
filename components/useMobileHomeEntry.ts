'use client';
import { useLayoutEffect, type RefObject } from 'react';

// Decided once per page load (React dev StrictMode re-runs the effect at once).
let keepSwipeBeforeHydrationUntil: number | null = null;

/** Mobile entry starts at language/tools. Stop correcting as soon as the user interacts. */
export function useMobileHomeEntry(target: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    // Explicit anchors remain usable (e.g. links to a result or feedback).
    if (window.location.hash) return;
    // A fresh page load starts at the top. If it is already scrolled when the page
    // becomes interactive, the customer swiped before hydration: keep their place.
    const perf = window.performance;
    if (keepSwipeBeforeHydrationUntil === null) {
      const navigation = perf?.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
      keepSwipeBeforeHydrationUntil = navigation?.type === 'navigate' && window.scrollY > 0 ? perf.now() + 1000 : 0;
    }
    if (keepSwipeBeforeHydrationUntil > 0 && perf.now() < keepSwipeBeforeHydrationUntil) return;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    let stopped = false;
    const align = () => {
      if (!stopped) target.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    const stop = () => { stopped = true; };
    const interactions = ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const;
    interactions.forEach(event => window.addEventListener(event, stop, { passive: true, capture: true }));
    align();
    const frame = window.requestAnimationFrame(align);
    const settle = window.setTimeout(align, 160);
    const final = window.setTimeout(() => { align(); stop(); }, 1250);
    return () => {
      stop(); window.cancelAnimationFrame(frame); clearTimeout(settle); clearTimeout(final);
      interactions.forEach(event => window.removeEventListener(event, stop, true));
      window.history.scrollRestoration = previousRestoration;
    };
  }, [target]);
}
