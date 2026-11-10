'use client';
/**
 * 一般阿修羅死亡 v3 引擎槽（由 AsuraDeathHost 以 next/dynamic 延後載入：v3 引擎約 150KB 不進首屏 bundle）。
 * 掛載＝建引擎＋prewarm()；有伺服端擊倒事件時延遲到了才給 play=event.id；播完 destroyAfterMs 後由 Host 卸載 → destroy()。
 * 保底：開播前最多等 startGraceMs（低階裝置 arm 慢）；開播（onStart）後才起算 failsafeMs，避免降速時保底比動畫先到。
 */
import { useEffect, useRef, useState } from 'react';
import AsuraDeathFx, { type AsuraDeathFxHandle } from './AsuraDeathFx';
import type { KnockoutEvent } from '@/lib/beast-game/match3/knockout-events';

export interface DeathDoneInfo { durationMs: number; order?: number[]; placeholder?: boolean; cancelled?: boolean }

export default function RegularSlot({ ev, anchor, src, delay, zIndex, failsafe, startGraceMs, destroyAfterMs, onStart, onDone, onSettled, onRelease }: {
  ev: KnockoutEvent | null; anchor: HTMLElement | null; src?: string; delay: number; zIndex: number; failsafe: number; startGraceMs: number; destroyAfterMs: number;
  onStart: (ev: KnockoutEvent) => void; onDone: (ev: KnockoutEvent, info: DeathDoneInfo) => void; onSettled: (ev: KnockoutEvent) => void; onRelease: (ev: KnockoutEvent) => void;
}) {
  const fx = useRef<AsuraDeathFxHandle>(null);
  const anchorRef = useRef<HTMLElement | null>(anchor);
  const [token, setToken] = useState<string | null>(null);
  const cur = useRef<KnockoutEvent | null>(null);
  const settled = useRef(new Set<string>());
  const timers = useRef<number[]>([]);
  const cb = useRef({ onStart, onDone, onSettled, onRelease }); cb.current = { onStart, onDone, onSettled, onRelease };
  const settle = (e: KnockoutEvent) => { if (!settled.current.has(e.id)) { settled.current.add(e.id); cb.current.onSettled(e); } };
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const clear = () => { timers.current.forEach(t => window.clearTimeout(t)); timers.current = []; };
  useEffect(() => { if (anchor) void Promise.resolve(fx.current?.prewarm?.()).catch(() => {}); }, [anchor]);
  useEffect(() => {
    if (!ev) return;
    cur.current = ev;
    if (!anchor) { settle(ev); cb.current.onRelease(ev); return; }
    later(() => setToken(ev.id), Math.max(0, delay));
    // 開播前保底：太久沒開播（例如分頁在背景、裝置極慢）就放行，不讓 .down／結算卡住
    later(() => { if (cur.current === ev && !settled.current.has(ev.id + ':started')) { settle(ev); cb.current.onRelease(ev); } }, Math.max(0, delay) + startGraceMs);
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.id]);
  useEffect(() => clear, []);
  if (!anchor) return null;
  return <AsuraDeathFx ref={fx} play={token} anchorRef={anchorRef} src={src} zIndex={zIndex} hideAnchor restoreAnchor={false}
    onStart={() => {
      const e = cur.current; if (!e) return;
      settled.current.add(e.id + ':started'); clear();
      // 保底從開播起算
      later(() => settle(e), failsafe);
      later(() => cb.current.onRelease(e), failsafe + 2000);
      cb.current.onStart(e);
    }}
    onDone={r => {
      const e = cur.current; if (!e) return;
      cb.current.onDone(e, { durationMs: r.durationMs, order: r.order, cancelled: r.cancelled }); settle(e);
      later(() => cb.current.onRelease(e), destroyAfterMs);
    }} />;
}
