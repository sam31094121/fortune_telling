'use client';
/**
 * 寶珠戰死亡特效整合層：吃「伺服端擊倒事件」→ 分流一般阿修羅死亡（AsuraDeathFx v3）／最終魔王（BossDeathFxSlot → BossExplosionDeath v4）→ 疊加、不阻擋遊戲。
 * 規格：寶珠戰鬥卡片技能檔 第五章。
 *
 * - 不判定擊倒：只播 events（由 deriveServerKnockouts 從伺服端回應產生）；play 一律是擊倒事件唯一 id，正式不傳 seed。
 *   HP、勝負、存檔都不等動畫（呼叫端照常更新，本層只疊加）；呼叫端可用 onEventFinished 延後「顯示」結算畫面。
 * - 一般版：每個敵人一個引擎槽（key＝foeId），掛在 foes.map 外面；特效層由引擎掛到 document.body，
 *   所以 rig 模式 retiredFoes 把卡片拿掉也不會中斷播放（播放中 anchor 鎖定、不重抓）。
 * - v3 預熱：warm＝戰鬥中先掛好引擎並 prewarm() 的目標（呼叫端給 HP≤30% 或鎖定目標，不含最終魔王）；
 *   同時最多 maxEngines（預設 5，每個＝1 個 WebGL2 context）；onDone 後 destroyAfterMs 卸載 → engine.destroy()。
 * - 兩種特效都以 next/dynamic 延後載入；preloadBoss＝進入戰鬥且陣容有最終魔王時先抓魔王 chunk。
 * - bossOnStage＝殿後魔王已登場（護衛全倒）：量卡圖尺寸後呼叫 v4 bossPrewarm.prewarmBossFx(imageSrc, box)，擊倒時元件直接領用。
 * - 保底：開播前最多等 startGraceMs；開播（onStart）後才起算 failsafeMs（降速時不會比動畫先到）。
 * - onSettled：一般版 onDone／魔王 onDone／保底逾時，三者任一先到就通知一次，讓呼叫端恢復 .down 45% 與退場。
 * - onEventFinished：該事件的畫面真的結束（done、無法播放、或保底上限）才通知一次，供呼叫端延後顯示結算。
 * - zIndex 預設 45：高於行動列（40）、低於結算視窗（50）。
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import type { KnockoutEvent } from '@/lib/beast-game/match3/knockout-events';
import type { DeathDoneInfo } from './AsuraDeathRegularSlot';

export type { DeathDoneInfo } from './AsuraDeathRegularSlot';
/** v3 一般版／魔王版都延後載入（不進首屏 bundle；SSR 不需要）。 */
const RegularSlot = dynamic(() => import('./AsuraDeathRegularSlot'), { ssr: false });
const BossDeathFxSlot = dynamic(() => import('./BossDeathFxSlot'), { ssr: false });

export interface DeathTarget { foeId: string; foeIndex: number }

export interface AsuraDeathHostProps {
  events: readonly KnockoutEvent[];
  /** 找目標圖（.foeArt）；預設在 root 內找 [data-testid="match3-enemy"][data-id] [data-rig-target]，再退回 [role=img]。 */
  root: RefObject<HTMLElement | null>;
  resolveAnchor?: (target: DeathTarget, root: HTMLElement) => HTMLElement | null;
  /** 數字或依事件決定（例如 rig 命中時刻）。 */
  startDelayMs?: number | ((ev: KnockoutEvent) => number);
  zIndex?: number;
  /** 保底（從開播起算）：一般版 3s 上限＋餘裕、魔王版 4.2s＋餘裕；到時一定 onSettled。 */
  failsafeMs?: { regular: number; boss: number };
  /** 開播前最多等多久（降速裝置 arm 慢；魔王 6 倍降速實測晚 2.3～3.4s 才開播）。 */
  startGraceMs?: { regular: number; boss: number };
  /** v3 預熱目標（一般版）：戰鬥中先掛好引擎並 prewarm()。 */
  warm?: readonly DeathTarget[];
  /** 一般版卡圖（明確給；rig 模式＝畫面上的 Match3TargetArt 同一張）。 */
  srcOf?: (foeId: string) => string | undefined;
  /** 同時存在的一般版引擎上限，預設 5。 */
  maxEngines?: number;
  /** onDone 後多久卸載（→ destroy()），留時間給 data-state=done 健康檢查。預設 250ms。 */
  destroyAfterMs?: number;
  /** 陣容裡有最終魔王：先預載魔王 chunk（不在首屏）。 */
  preloadBoss?: boolean;
  /** 殿後魔王已登場：預熱 v4（prewarmBossFx）。 */
  bossOnStage?: DeathTarget | null;
  onEventStart?: (ev: KnockoutEvent) => void;
  onEventDone?: (ev: KnockoutEvent, info: DeathDoneInfo) => void;
  onSettled?: (ev: KnockoutEvent) => void;
  onEventFinished?: (ev: KnockoutEvent) => void;
}

function defaultAnchor(t: DeathTarget, root: HTMLElement): HTMLElement | null {
  const card = root.querySelector<HTMLElement>(`[data-testid="match3-enemy"][data-id="${CSS.escape(t.foeId)}"]`);
  if (!card) return null;
  return card.querySelector<HTMLElement>('[data-rig-target]') ?? card.querySelector<HTMLElement>('[role="img"]') ?? card;
}

/** v4 碎裂圖樣：殿後四大神獸 id（beast_g_baihu…）→ beast。 */
const beastOf = (foeId: string) => (/(baihu|qinglong|xuanwu|zhuque)/.exec(foeId)?.[1] ?? undefined) as 'baihu' | 'qinglong' | 'xuanwu' | 'zhuque' | undefined;

/** 最終魔王（v4 分支）：每個事件一個，延遲到了才給 play=event.id；保底從開播起算。 */
function BossEvent({ ev, anchor, delay, zIndex, failsafe, startGraceMs, onStart, onDone, onSettled, onFinished }: {
  ev: KnockoutEvent; anchor: HTMLElement | null; delay: number; zIndex: number; failsafe: number; startGraceMs: number;
  onStart?: () => void; onDone?: (info: DeathDoneInfo) => void; onSettled: () => void; onFinished: () => void;
}) {
  const anchorRef = useRef<HTMLElement | null>(anchor);
  const [token, setToken] = useState<string | null>(null);
  const settled = useRef(false), finished = useRef(false), started = useRef(false);
  const timers = useRef<number[]>([]);
  const cb = useRef({ onSettled, onFinished }); cb.current = { onSettled, onFinished };
  const settle = () => { if (!settled.current) { settled.current = true; cb.current.onSettled(); } };
  const finish = () => { settle(); if (!finished.current) { finished.current = true; cb.current.onFinished(); } };
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => {
    if (!anchor) { finish(); return; }
    later(() => setToken(ev.id), Math.max(0, delay));
    later(() => { if (!started.current) finish(); }, Math.max(0, delay) + startGraceMs);
    return () => { timers.current.forEach(t => window.clearTimeout(t)); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev.id]);
  if (!anchor) return null;
  return <BossDeathFxSlot play={token} anchorRef={anchorRef} zIndex={zIndex} beast={beastOf(ev.foeId)}
    onStart={info => {
      // 保底從 v4 onStart(info).startedAt 起算（與 rAF 同一時基）
      started.current = true; const lag = info?.startedAt ? Math.max(0, performance.now() - info.startedAt) : 0;
      later(settle, Math.max(0, failsafe - lag)); later(finish, Math.max(0, failsafe + 3000 - lag)); onStart?.();
    }}
    onDone={r => { onDone?.({ durationMs: r.durationMs, placeholder: r.placeholder }); finish(); }} />;
}

export default function AsuraDeathHost({ events, root, resolveAnchor = defaultAnchor, startDelayMs = 0, zIndex = 45, failsafeMs = { regular: 3400, boss: 6000 }, startGraceMs = { regular: 4000, boss: 7000 }, warm, srcOf, maxEngines = 5, destroyAfterMs = 250, preloadBoss = false, bossOnStage = null, onEventStart, onEventDone, onSettled, onEventFinished }: AsuraDeathHostProps) {
  const [, setTick] = useState(0);
  useEffect(() => { setTick(t => t + 1); }, []); // root 就緒後再算一次預熱目標
  useEffect(() => { if (preloadBoss) void import('./BossDeathFxSlot'); }, [preloadBoss]);
  const [released, setReleased] = useState<ReadonlySet<string>>(() => new Set());
  const bossWarmed = useRef(new Set<string>()); const bossWarmTimer = useRef(0);
  // 殿後魔王登場：版面穩定 300ms 後量卡圖（同一 anchor、同一 <img>），呼叫 v4 預熱；同尺寸同圖只預熱一次，最多 3 組。
  useEffect(() => {
    if (!bossOnStage) return;
    window.clearTimeout(bossWarmTimer.current);
    bossWarmTimer.current = window.setTimeout(() => {
      const r0 = root.current; if (!r0 || bossWarmed.current.size >= 3) return;
      const a = resolveAnchor(bossOnStage, r0); const img = a ? (a instanceof HTMLImageElement ? a : a.querySelector('img')) : null;
      if (!a || !img) return;
      const b = a.getBoundingClientRect(); const src = img.currentSrc || img.src;
      if (b.width < 8 || b.height < 8 || !src) return;
      const key = `${src}|${Math.round(b.width)}x${Math.round(b.height)}`;
      if (bossWarmed.current.has(key)) return; bossWarmed.current.add(key);
      void import('./boss/bossPrewarm').then(m => m.prewarmBossFx(src, { width: b.width, height: b.height }, { beast: beastOf(bossOnStage.foeId), frame: false })).catch(() => {});
    }, 300);
    return () => window.clearTimeout(bossWarmTimer.current);
  });
  const bossAnchors = useRef(new Map<string, HTMLElement | null>());
  const slotAnchors = useRef(new Map<string, { el: HTMLElement | null; gen: number; lockedFor?: string; src?: string }>());
  const finishedIds = useRef(new Set<string>());
  const el = root.current;
  const delayOf = (ev: KnockoutEvent) => typeof startDelayMs === 'function' ? startDelayMs(ev) : startDelayMs;
  const finished = (ev: KnockoutEvent) => { if (!finishedIds.current.has(ev.id)) { finishedIds.current.add(ev.id); onEventFinished?.(ev); } };
  const release = (ev: KnockoutEvent) => { finished(ev); setReleased(s => s.has(ev.id) ? s : new Set([...s, ev.id])); };

  const active = new Map<string, KnockoutEvent>();
  for (const e of events) if (!e.isFinalBoss && !released.has(e.id)) active.set(e.foeId, e);
  const slots: { t: DeathTarget; ev: KnockoutEvent | null }[] = [...active.values()].map(e => ({ t: { foeId: e.foeId, foeIndex: e.foeIndex }, ev: e }));
  for (const w of warm ?? []) {
    if (slots.length >= maxEngines) break;
    if (!slots.some(s => s.t.foeId === w.foeId) && !events.some(e => e.foeId === w.foeId)) slots.push({ t: w, ev: null });
  }
  const anchorOf = (t: DeathTarget, ev: KnockoutEvent | null) => {
    let a = slotAnchors.current.get(t.foeId);
    if (ev && a && a.lockedFor === ev.id) return a; // 播放中鎖定（卡片被退場拿掉也不重抓）
    if (el && (!a || !a.el?.isConnected)) {
      const n = resolveAnchor(t, el);
      if (!a || n !== a.el) a = { el: n, gen: (a?.gen ?? 0) + 1 };
    }
    // 播放中同時鎖定卡圖 src：版面切換（例如魔王登場）不得讓 src 變更而銷毀播放中的引擎。
    const lockedSrc = ev ? srcOf?.(t.foeId) : undefined;
    a = a ? { ...a, lockedFor: ev?.id, src: lockedSrc } : { el: null, gen: 0, lockedFor: ev?.id, src: lockedSrc };
    slotAnchors.current.set(t.foeId, a);
    return a;
  };

  return <span data-testid="asura-death-host" data-events={events.length} data-engines={slots.length} data-warm-targets={(warm ?? []).map(w => w.foeId).join(',')} data-boss-prewarm={bossWarmed.current.size} hidden>
    {slots.map(({ t, ev }) => {
      const a = anchorOf(t, ev);
      return <RegularSlot key={`${t.foeId}:${a.gen}`} ev={ev} anchor={a.el} src={ev ? (a.src ?? srcOf?.(t.foeId)) : srcOf?.(t.foeId)} delay={ev ? delayOf(ev) : 0} zIndex={zIndex}
        failsafe={failsafeMs.regular} startGraceMs={startGraceMs.regular} destroyAfterMs={destroyAfterMs}
        onStart={e => onEventStart?.(e)} onDone={(e, info) => { onEventDone?.(e, info); finished(e); }} onSettled={e => onSettled?.(e)} onRelease={release} />;
    })}
    {events.filter(e => e.isFinalBoss).map(ev => {
      if (!bossAnchors.current.has(ev.id) && el) bossAnchors.current.set(ev.id, resolveAnchor(ev, el));
      return <BossEvent key={ev.id} ev={ev} anchor={bossAnchors.current.get(ev.id) ?? null} delay={delayOf(ev)} zIndex={zIndex}
        failsafe={failsafeMs.boss} startGraceMs={startGraceMs.boss}
        onStart={() => onEventStart?.(ev)} onDone={info => onEventDone?.(ev, info)} onSettled={() => onSettled?.(ev)} onFinished={() => finished(ev)} />;
    })}
  </span>;
}
