'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export type FloatingAvoid = { lift: number; hide: boolean };

/**
 * 浮動按鈕避讓（與 InstallShield080 的 080 金盾牌避讓同一套做法）：
 * 浮動按鈕是 fixed、目標按鈕會隨頁面捲動；目標快跑到浮動按鈕底下時，先把浮動按鈕往上推開，
 * 推開後若又壓到其他目標就繼續往上推；推不開（會高過 minTop）就淡出且不攔截點擊，等目標離開再回來。
 * 不做滑動動畫（直接換位置），避免移動中誤點。
 */
export function useFloatingAvoid(
  ref: RefObject<HTMLElement | null>,
  targetSelector: string,
  enabled: boolean,
  { gap = 8, minTop = 96 }: { gap?: number; minTop?: number } = {},
): FloatingAvoid {
  const [avoid, setAvoid] = useState<FloatingAvoid>({ lift: 0, hide: false });
  const current = useRef<FloatingAvoid>({ lift: 0, hide: false });

  useEffect(() => {
    if (!enabled) {
      if (current.current.lift || current.current.hide) {
        current.current = { lift: 0, hide: false };
        setAvoid(current.current);
      }
      return;
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // 量到的是目前位置，扣回目前的上推量得到基準位置
      const baseTop = r.top + current.current.lift;
      const baseBottom = r.bottom + current.current.lift;
      const targets = Array.from(document.querySelectorAll<HTMLElement>(targetSelector))
        .map(t => t.getBoundingClientRect())
        .filter(c => c.width > 0 && c.height > 0 && c.left < r.right + gap && c.right > r.left - gap);
      let lift = 0;
      let hide = false;
      for (let pass = 0; pass < 12; pass += 1) {
        const top = baseTop - lift;
        const bottom = baseBottom - lift;
        const hit = targets.find(c => c.top < bottom + gap && c.bottom > top - gap);
        if (!hit) break;
        lift = baseBottom - (hit.top - gap);
        if (baseTop - lift < minTop) { hide = true; break; }
      }
      if (hide) lift = 0;
      if (lift !== current.current.lift || hide !== current.current.hide) {
        current.current = { lift, hide };
        setAvoid(current.current);
      }
    };
    // 分頁在背景時不量（省電、長時間停留不累積工作）；切回來會因 visibilitychange 立刻重量一次。
    const schedule = () => { if (!raf && document.visibilityState !== 'hidden') raf = window.requestAnimationFrame(measure); };
    schedule();
    const timer = window.setInterval(schedule, 600);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('click', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('click', schedule, true);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [ref, targetSelector, enabled, gap, minTop]);

  return avoid;
}
