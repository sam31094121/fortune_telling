'use client';
/**
 * 橫幅排隊（v3）：五珠技、魔珠生成、敵方反擊同時發生時依序出現，兩則之間留 gap 讓前一則淡出，不重疊。
 * 回傳 [banner, setBanner, showBanner]；setBanner(null) 會清空佇列（重新開局用）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BANNER_QUEUE } from '@/lib/beast-game/match3/bead-visual-config';

export type BannerKind = 'magic' | 'skill' | 'counter' | 'info';
export type Banner = { text: string; kind: BannerKind; visual?: boolean };

export function useBannerQueue() {
  const [banner, setCurrent] = useState<Banner | null>(null);
  const queue = useRef<Banner[]>([]);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const next = useCallback(() => {
    const item = queue.current.shift();
    if (!item) { busy.current = false; setCurrent(null); return; }
    busy.current = true;
    setCurrent(item);
    const hold = queue.current.length ? BANNER_QUEUE.holdWhenQueuedMs : BANNER_QUEUE.holdMs;
    timer.current = window.setTimeout(() => {
      setCurrent(null);
      timer.current = window.setTimeout(next, queue.current.length ? BANNER_QUEUE.gapMs : 0);
    }, hold);
  }, []);

  const showBanner = useCallback((text: string, kind: BannerKind, visual = false) => {
    queue.current.push({ text, kind, visual });
    if (!busy.current) next();
  }, [next]);

  const setBanner = useCallback((b: Banner | null) => {
    window.clearTimeout(timer.current);
    queue.current = [];
    busy.current = false;
    setCurrent(null);
    if (b) showBanner(b.text, b.kind, b.visual);
  }, [showBanner]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [banner, setBanner, showBanner] as const;
}