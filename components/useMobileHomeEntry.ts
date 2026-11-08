'use client';
import { useLayoutEffect, type RefObject } from 'react';

/** Mobile entry starts at language/tools. Stop correcting as soon as the user interacts. */
export function useMobileHomeEntry(target: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches) return;
    // Explicit anchors remain usable (e.g. links to a result or feedback).
    if (window.location.hash) return;
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
