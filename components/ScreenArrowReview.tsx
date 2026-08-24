'use client';

import { useEffect, useState } from 'react';

type TargetRect = { left: number; top: number; width: number; height: number };

const HASH_PREFIX = '#screen-arrow=';
const CARD_HASH_PREFIX = '#screen-arrow-card=';
const DATA_HASH_PREFIX = '#screen-arrow-target=';

function readTarget() {
  if (typeof window === 'undefined') return { text: '', mode: 'text' as const };
  const mode: 'text' | 'card' | 'data' = window.location.hash.startsWith(DATA_HASH_PREFIX)
    ? 'data'
    : window.location.hash.startsWith(CARD_HASH_PREFIX)
      ? 'card'
      : 'text';
  const prefix = mode === 'data' ? DATA_HASH_PREFIX : mode === 'card' ? CARD_HASH_PREFIX : HASH_PREFIX;
  if (!window.location.hash.startsWith(prefix)) return { text: '', mode: 'text' as const };
  try {
    return { text: decodeURIComponent(window.location.hash.slice(prefix.length)).trim(), mode };
  } catch {
    return { text: '', mode: 'text' as const };
  }
}

function findTarget(targetText: string, mode: 'text' | 'card' | 'data') {
  if (!targetText) return null;
  if (mode === 'data') {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-screen-arrow-target]'))
      .find((element) => element.dataset.screenArrowTarget === targetText) ?? null;
  }
  const candidates = document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,span,button,a,summary,label');
  const match = Array.from(candidates).find((element) => element.innerText.trim() === targetText) ?? null;
  return mode === 'card' ? match?.closest<HTMLElement>('[data-screen-arrow-card]') ?? null : match;
}

export default function ScreenArrowReview() {
  const [targetText, setTargetText] = useState('');
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    let currentTarget: HTMLElement | null = null;
    let animationFrame = 0;

    function measureTarget() {
      if (!currentTarget) return;
      const rect = currentTarget.getBoundingClientRect();
      setTargetRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
    }

    function followTarget() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureTarget);
    }

    function update() {
      const nextTarget = readTarget();
      setTargetText(nextTarget.text);
      const target = findTarget(nextTarget.text, nextTarget.mode);
      if (!target) {
        currentTarget = null;
        setTargetRect(null);
        return;
      }
      currentTarget = target;
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      followTarget();
    }

    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('resize', followTarget);
    window.addEventListener('scroll', followTarget, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('hashchange', update);
      window.removeEventListener('resize', followTarget);
      window.removeEventListener('scroll', followTarget, true);
    };
  }, []);

  if (!targetText || !targetRect) return null;

  const arrowLeft = Math.max(8, targetRect.left - 58);
  const arrowTop = Math.max(8, targetRect.top + targetRect.height / 2 - 25);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2147483647]">
      <div
        className="absolute rounded-xl border-4 border-yellow-300 shadow-[0_0_0_4px_rgba(250,204,21,0.3),0_0_28px_rgba(250,204,21,0.9)]"
        style={{
          left: Math.max(4, targetRect.left - 6),
          top: Math.max(4, targetRect.top - 6),
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      />
      <div
        className="absolute animate-pulse text-[50px] font-black leading-none text-yellow-300 [filter:drop-shadow(0_3px_3px_#000)]"
        style={{ left: arrowLeft, top: arrowTop }}
      >
        ➜
      </div>
    </div>
  );
}
