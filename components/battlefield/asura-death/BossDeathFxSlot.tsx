'use client';
/**
 * 最終魔王死亡特效轉接層：把 BossExplosionDeath v4（./boss/，外部原檔原樣複製、不改內容）
 * 對齊到與 AsuraDeathFx 相同的觸發介面。換新版爆炸時只要覆蓋 ./boss/ 的檔；Host／Match3Board 不用改。
 * 本檔由 AsuraDeathHost 以 next/dynamic(ssr:false) 延後載入；v4 元件在本檔內同樣以 next/dynamic(ssr:false) 載入（INTERFACE §2）。
 *
 * - play：伺服端擊倒事件 id（Host 延遲到才給；之前是 null，v4 趁這段在背景預備／領用 bossPrewarm 的預熱結果）。
 *   同一 id 終身只播一次（v4 元件層＋模組層 LRU，Host 也以 id 為 key）。
 * - 健康檢查由 v4 本身提供：data-testid="boss-death-fx"，data-state idle → arming → armed → playing → done（出錯 error，仍會 onDone）。
 * - onStart(info)：v4 第 0 幀已畫上的同一 task；info.startedAt（performance.now）交給 Host 從這裡起算保底。
 * - done 後卸載 v4（→ 釋放畫布），只留 data-state="done" 標記。v4 播完不還原原卡（hideAnchor 只隱藏），
 *   原卡之後由遊戲決定（沿用 .down 45% 與退場），所以不會「回彈」（驗收 B5）。
 * - anchor＝Match3 敵卡內的卡圖（[data-rig-target]，不是 BeastCardTile 金框）→ frame={false}（INTERFACE §3）。
 * - 先以 play=null 掛上 v4、確認它已在 DOM（data-testid=boss-death-fx）後才給 play（INTERFACE §7：不要掛載時就帶 play；\n *   實測首次擊倒時 chunk 才載入、帶著 play 掛載，StrictMode 下會停在 armed 不播）。最多等 120 幀，之後照給。\n * - zIndex 由 Host 傳入 45：高於行動列 40、低於結算 50（v4 預設 40，INTERFACE 註明 Host 用 45、結算 ≥50）。
 */
import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import type { BeastKey, BossFxTiming, FrameStats } from './boss/BossExplosionDeath';

const BossExplosionDeath = dynamic(() => import('./boss/BossExplosionDeath'), { ssr: false, loading: () => null });

export interface BossDeathFxProps {
  play?: string | number | null;
  anchorRef?: RefObject<HTMLElement | null>;
  zIndex?: number;
  /** 3000～5200ms（v4 預設 4600；減少動態固定 1200）。不給＝v4 預設。 */
  durationMs?: number;
  beast?: BeastKey;
  onStart?: (info?: BossFxTiming) => void;
  onDone?: (r: { placeholder?: boolean; durationMs: number; startedAt?: number; endedAt?: number; stats?: FrameStats }) => void;
}

export default function BossDeathFxSlot({ play, anchorRef, zIndex = 45, durationMs, beast, onStart, onDone }: BossDeathFxProps) {
  const [ended, setEnded] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    let raf = 0, n = 0, seen = 0;
    const tick = () => {
      const el = [...document.querySelectorAll<HTMLElement>('[data-testid="boss-death-fx"]')].some(e => e.dataset.released !== '1');
      if (el) seen++;
      if (seen >= 2 || ++n > 120) { setMounted(true); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (typeof document === 'undefined') return null;
  if (ended) return createPortal(<div aria-hidden="true" hidden data-testid="boss-death-fx" data-state="done" data-released="1" />, document.body);
  return createPortal(
    <BossExplosionDeath play={mounted ? play ?? null : null} anchorRef={anchorRef} hideAnchor frame={false} zIndex={zIndex} beast={beast} durationMs={durationMs}
      onStart={info => onStart?.(info)}
      onDone={(stats, info) => { setEnded(true); onDone?.({ placeholder: false, durationMs: info?.endedAt && info.startedAt ? Math.round(info.endedAt - info.startedAt) : stats?.durationMs ?? 0, startedAt: info?.startedAt, endedAt: info?.endedAt, stats }); }} />,
    document.body,
  );
}