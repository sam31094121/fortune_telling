'use client';
import { useLayoutEffect, useState, type RefObject } from 'react';

/** One positioning action per requested playback; subsequent scrolling only pauses/resumes. */
export function usePlaybackViewport(ref: RefObject<HTMLDivElement | null>, request: unknown, enabled: boolean, endRef?: RefObject<HTMLDivElement | null>) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    setReady(false);
    if (!enabled) return;
    let first = 0, second = 0;
    const check = () => {
      const box = ref.current?.getBoundingClientRect();
      const end = endRef?.current?.getBoundingClientRect() ?? box;
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0, height = viewport?.height ?? window.innerHeight;
      setReady(Boolean(box && end && box.top >= top - 2 && end.bottom <= top + height + 2));
    };
    first = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      second = requestAnimationFrame(check);
    });
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    window.visualViewport?.addEventListener('resize', check);
    return () => {
      cancelAnimationFrame(first); cancelAnimationFrame(second);
      window.removeEventListener('scroll', check); window.removeEventListener('resize', check);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, [ref, request, enabled, endRef]);
  return ready;
}
