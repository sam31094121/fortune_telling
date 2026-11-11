'use client';
/**
 * 神獸戰鬥：對方（AI 阿修羅）的卡片被打倒時，沿用技能檔案裡「一般阿修羅死亡動畫」——
 * 三層不規則撕裂 → 金轉紅瞬燒 → 儀式式快速消失（≤ 3 秒）。
 *
 * 純視覺層：不判定擊倒、不改 HP／勝負／結算、不讓遊戲等它。
 * 只在後端對局已確認該卡 defeated 之後才播；同一張卡在同一場只播一次（played 由父層持有，
 * 因為戰場每個回合會重建卡片元素，不能靠元件自己記）。
 */
import { useEffect, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';

// 約 150KB 的撕裂引擎不進首屏：第一次有卡被打倒才載入。
const AsuraDeathFx = dynamic(() => import('./asura-death/AsuraDeathFx'), { ssr: false, loading: () => null });

/** 進入戰鬥時先把撕裂引擎的程式載好，擊倒當下只剩建立畫面，不會在那一刻卡一下。 */
export function preloadOpponentShred() { void import('./asura-death/AsuraDeathFx'); }

export default function OpponentShred({ anchorRef, src, eventId, onDone }: {
  anchorRef: RefObject<HTMLElement | null>;
  src?: string;
  /** 後端確認陣亡的事件 id（卡片＋位置＋場次）。 */
  eventId: string;
  onDone?: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  // 先以 play=null 掛上、等引擎就緒，再給 play（元件掛載當下就帶 play 不會觸發）。
  useEffect(() => {
    const t = window.setTimeout(() => setToken(eventId), 180);
    return () => window.clearTimeout(t);
  }, [eventId]);
  return <AsuraDeathFx play={token} anchorRef={anchorRef} src={src} zIndex={40} hideAnchor restoreAnchor={false} onDone={() => onDone?.()} />;
}
