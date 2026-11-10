'use client';
/**
 * BossExplosionDeath v4 — 最終魔王（第 8 關起殿後的四大神獸）整張卡（金框＋圖）爆炸死亡特效層。
 * ⚠ 本元件不判定擊倒：只有伺服端回合結果確認魔王 HP 歸零後，呼叫端才給 play（true 或新的擊倒事件 id）。
 * 純視覺疊加層（pointer-events: none），不影響 HP／勝負／存檔／結算。不沿用 VictoryMoment / defeatVanish。
 * React 18 與 19 皆可（只用 useRef/useState/useEffect；StrictMode 雙掛載安全）。
 *
 * v4 生命週期：
 *   (可選) prewarmBossExplosion()/prewarm() 在魔王上場前先排入預備（模組快取，元件掛載時領用）
 *   mount → 取圖（imageSrc 或 anchor 內 <img> 元素本身；未載完就等 load）→ engine.prepare（≤6ms 背景時間片）
 *   → play 變成「從未播過」的真值 → 同一 task 畫第 0 幀＋onStart → 約 4.6 秒 → onDone
 *   預備未完成也立即播（優雅降級）；只有連圖都還沒載到時才等圖 load 後立刻播。
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import styles from './BossExplosionDeath.module.css';
import { BossExplosionEngine, beastFromSrc, type BeastKey, type BossBox, type BossExplosionTiming, type FrameStats, type FrameStyle, type Size } from './bossExplosionEngine';

export type { BeastKey, BossBox, BossExplosionTiming, FrameStats, FrameStyle, Size };
/** 時間戳：performance.now() 毫秒（與 rAF 同時基）＋ Date.now() 牆鐘 */
export interface BossFxTiming { koId: string | null; startedAt: number; startedAtEpoch: number; endedAt?: number; endedAtEpoch?: number; durationMs: number; reduced: boolean; preparedAtPlay: boolean }
export type BossDeathState = 'idle' | 'arming' | 'armed' | 'playing' | 'done' | 'error';

export interface BossExplosionDeathProps {
  /** 伺服端確認擊倒才給。擊倒事件 id（建議）：每個 id 一輩子只播一次（id → null → 同 id 不重播）；true：每次由假變真播一次（或 playKey 變更）。 */
  play: boolean | string | number | null | undefined;
  /** 預設 true：掛載即預熱。false＝先不配置記憶體。 */
  armed?: boolean;
  /** 卡圖 URL。未給時直接使用 anchor（或其內第一張）<img> 元素本身當圖源。 */
  imageSrc?: string;
  /** ① 整張卡（含金框）在父容器中的位置（父容器 position: relative） */
  box?: BossBox;
  /** ② 整張卡元素（視窗座標，layer 為 position: fixed） */
  anchorRef?: RefObject<HTMLElement | null>;
  /** 神獸：決定碎裂圖樣與元素色。未給時由檔名推斷（baihu/qinglong/xuanwu/zhuque）。 */
  beast?: BeastKey;
  /** 金框樣式（預設同 BeastCardTile 金框）；anchor 只包圖、不含框時給 false */
  frame?: Partial<FrameStyle> | false;
  reducedMotion?: boolean;
  intensity?: number;
  /** 3000～5200ms，預設 4600（減少動態固定 1200） */
  durationMs?: number;
  timing?: Partial<BossExplosionTiming>;
  playKey?: string | number;
  maxDpr?: number;
  zIndex?: number;
  hideAnchor?: boolean;
  onArmed?: () => void;
  /** 第 0 幀已畫上特效層的同一 task 呼叫（播放「真正開始」）：呼叫端在此隱藏原卡，並可從 info.startedAt 起算自己的保底逾時 */
  onStart?: (info: BossFxTiming) => void;
  /** 播完（畫布已清空）。元件「不會」恢復原卡可見性——原卡維持隱藏，由呼叫端（遊戲）決定之後怎麼處理 */
  onDone?: (stats: FrameStats, info: BossFxTiming) => void;
}

function prefersReduced(): boolean { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

// ── 模組層：已播放的擊倒 id（跨重新掛載也不重播；LRU 256）＋ 預熱快取 ──────────────
const PLAYED: string[] = []; const PLAYED_SET = new Set<string>();
function markPlayed(id: string) { if (PLAYED_SET.has(id)) return; PLAYED.push(id); PLAYED_SET.add(id); while (PLAYED.length > 256) PLAYED_SET.delete(PLAYED.shift()!); }
export function hasPlayedBossKo(id: string | number) { return PLAYED_SET.has(String(id)); }

interface CacheEntry { key: string; engine: BossExplosionEngine; img: HTMLImageElement; ready: Promise<boolean>; adopted: boolean }
const CACHE: CacheEntry[] = [];
const cacheKey = (src: string, w: number, h: number, reduced: boolean, beast: string) => `${src}|${Math.round(w)}x${Math.round(h)}|${reduced ? 1 : 0}|${beast}`;
export interface PrewarmOptions { imageSrc: string; width: number; height: number; dpr?: number; maxDpr?: number; beast?: BeastKey; frame?: Partial<FrameStyle> | false; reducedMotion?: boolean; intensity?: number }
/** 預熱：魔王上場前（例如第 8 關開場、或魔王 HP 低於某值時）呼叫。全部工作切成 ≤6ms 背景時間片；回傳 Promise（完成 true）。 */
export function prewarmBossExplosion(o: PrewarmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const reduced = o.reducedMotion ?? prefersReduced(); const beast = o.beast ?? beastFromSrc(o.imageSrc); const key = cacheKey(o.imageSrc, o.width, o.height, reduced, beast);
  const hit = CACHE.find((e) => e.key === key); if (hit) return hit.ready;
  const engine = new BossExplosionEngine(undefined, { maxDpr: o.maxDpr ?? 1.5 }); const img = new Image(); img.decoding = 'async'; img.src = o.imageSrc;
  const ready = (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; })).then(() => engine.prepare(img, { width: o.width, height: o.height }, { beast, frame: o.frame, reducedMotion: reduced, intensity: o.intensity, dpr: o.dpr }), () => false);
  CACHE.push({ key, engine, img, ready, adopted: false });
  while (CACHE.length > 3) { const i = CACHE.findIndex((e) => !e.adopted); if (i < 0) break; CACHE[i].engine.destroy(); CACHE.splice(i, 1); }
  return ready;
}
/** 規格要求的簡寫：prewarm(imageSrc, box) */
export function prewarm(imageSrc: string, box: Size | BossBox, opts: Omit<PrewarmOptions, 'imageSrc' | 'width' | 'height'> = {}) { return prewarmBossExplosion({ imageSrc, width: box.width, height: box.height, ...opts }); }
function adopt(src: string, w: number, h: number, reduced: boolean, beast: string): CacheEntry | null {
  const key = cacheKey(src, w, h, reduced, beast); const e = CACHE.find((x) => x.key === key && !x.adopted); if (!e) return null; e.adopted = true; return e;
}
function release(engine: BossExplosionEngine) { const i = CACHE.findIndex((e) => e.engine === engine); if (i >= 0) CACHE.splice(i, 1); engine.destroy(); }

function findImg(el: HTMLElement | null | undefined): HTMLImageElement | null { if (!el) return null; if (el instanceof HTMLImageElement) return el; return el.querySelector('img'); }
function imgReady(i: HTMLImageElement) { return i.complete && i.naturalWidth > 0; }

export default function BossExplosionDeath({ play, armed = true, imageSrc, box, anchorRef, beast, frame, reducedMotion, intensity = 1, durationMs = 4600, timing, playKey, maxDpr = 1.5, zIndex = 40, hideAnchor = false, onArmed, onStart, onDone }: BossExplosionDeathProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BossExplosionEngine | null>(null);
  const cb = useRef({ onStart, onDone, onArmed }); cb.current = { onStart, onDone, onArmed };
  const [state, setState] = useState<BossDeathState>('idle'); const stateRef = useRef<BossDeathState>('idle');
  const set = (s: BossDeathState) => { if (stateRef.current === s) return; stateRef.current = s; setState(s); };
  const reduced = reducedMotion ?? prefersReduced();
  const fixed = !box && !!anchorRef;
  const hasImg = useRef(false); const pending = useRef(false); const played = useRef(new Set<string>());
  const prepSize = useRef<Size | null>(null);
  const opts = useRef({ beast, frame, reduced, intensity, durationMs, timing, maxDpr }); opts.current = { beast, frame, reduced, intensity, durationMs, timing, maxDpr };

  const measure = (): BossBox | null => {
    if (box) return box; const el = anchorRef?.current; if (!el) return null; const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
  };
  const container = (): Size => { if (fixed) return { width: window.innerWidth, height: window.innerHeight }; const r = layerRef.current?.getBoundingClientRect(); return { width: r?.width || 0, height: r?.height || 0 }; };
  const place = (engine: BossExplosionEngine, b: BossBox) => { const c = container(); const r = engine.place(c.width > 0 ? c : { width: b.x + b.width * 3, height: b.y + b.height * 3 }, b); Object.assign(engine.canvas.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` }); };

  const koId = useRef<string | null>(null);
  const startPlay = () => {
    const engine = engineRef.current; if (!engine || !hasImg.current) { pending.current = true; return; }
    const b = measure(); if (b) place(engine, b); // 播放時一律重新定位（大小變了引擎整體縮放，不重做預備）
    set('playing'); const o = opts.current;
    const info: BossFxTiming = { koId: koId.current, startedAt: performance.now(), startedAtEpoch: Date.now(), durationMs: 0, reduced: o.reduced, preparedAtPlay: false };
    engine.play({ durationMs: o.durationMs, intensity: o.intensity, timing: o.timing, reducedMotion: o.reduced }, () => {
      set('done'); info.endedAt = performance.now(); info.endedAtEpoch = Date.now(); cb.current.onDone?.(engine.stats, { ...info });
      const s = prepSize.current; const img = (engine as any).img as CanvasImageSource | null; // 播完背景重新預備（換一種碎法），給下一個擊倒 id
      if (s && img && engineRef.current === engine) void engine.prepare(img, s, { beast: o.beast ?? beastFromSrc(imageSrc ?? findImg(anchorRef?.current)?.currentSrc), frame: o.frame, reducedMotion: o.reduced, intensity: o.intensity });
    });
    Object.assign(info, { startedAt: performance.now(), startedAtEpoch: Date.now(), durationMs: engine.stats.durationMs, reduced: engine.stats.reduced, preparedAtPlay: engine.stats.preparedAtPlay });
    if (hideAnchor && anchorRef?.current) anchorRef.current.style.visibility = 'hidden'; // 播完也不還原（防「回彈」）
    cb.current.onStart?.({ ...info });
  };

  // 1) 預熱：取圖 → prepare（背景時間片）；StrictMode 雙掛載：cleanup 會 destroy，再掛載時重建
  useEffect(() => {
    if (!armed || typeof window === 'undefined') return;
    const layer = layerRef.current; if (!layer) return;
    let cancelled = false; let raf = 0; let ro: ResizeObserver | null = null; let rt = 0; const cleanups: (() => void)[] = [];
    set('arming'); hasImg.current = false;
    const o = opts.current; const anchorImg = findImg(anchorRef?.current); const src = imageSrc || anchorImg?.currentSrc || anchorImg?.src || '';
    const bk = (o.beast ?? beastFromSrc(src)) as BeastKey;
    const begin = (b: BossBox) => {
      const adopted = src ? adopt(src, b.width, b.height, o.reduced, bk) : null;
      const engine = adopted ? adopted.engine : new BossExplosionEngine(undefined, { maxDpr: o.maxDpr });
      engineRef.current = engine; engine.canvas.className = styles.canvas; layer.appendChild(engine.canvas); place(engine, b);
      const go = (image: CanvasImageSource) => {
        if (cancelled) return; prepSize.current = { width: b.width, height: b.height }; hasImg.current = true;
        const p = adopted ? engine.whenPrepared() : engine.prepare(image, prepSize.current, { beast: bk, frame: o.frame, reducedMotion: o.reduced, intensity: o.intensity });
        if (pending.current) { pending.current = false; startPlay(); }
        p.then((ok) => { if (cancelled || !ok) return; if (stateRef.current === 'arming') set('armed'); cb.current.onArmed?.(); });
      };
      const fail = () => { if (cancelled) return; set('error'); if (pending.current) { pending.current = false; const n = performance.now(); cb.current.onDone?.(engine.stats, { koId: koId.current, startedAt: n, startedAtEpoch: Date.now(), endedAt: n, endedAtEpoch: Date.now(), durationMs: 0, reduced: o.reduced, preparedAtPlay: false }); } };
      if (adopted) { adopted.ready.then((ok) => (ok ? go(adopted.img) : fail())); if (engine.preparedSize.width > 8) { hasImg.current = true; prepSize.current = { width: b.width, height: b.height }; } }
      else if (anchorImg && (!imageSrc || anchorImg.currentSrc === imageSrc || anchorImg.src === imageSrc)) {
        // 直接用畫面上的 <img> 元素（不另外下載、不依賴 currentSrc 時機 → React 18 未載完時不再報錯）
        if (imgReady(anchorImg)) go(anchorImg); else { const onL = () => (imgReady(anchorImg) ? go(anchorImg) : fail()); anchorImg.addEventListener('load', onL, { once: true }); anchorImg.addEventListener('error', fail, { once: true }); cleanups.push(() => { anchorImg.removeEventListener('load', onL); anchorImg.removeEventListener('error', fail); }); }
      } else if (src) { const img = new Image(); img.decoding = 'async'; img.src = src; (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; })).then(() => go(img), fail); }
      else fail();
      // 尺寸改變（旋轉、斷點切換）：播放中不動；閒置時 150ms 去抖後重新定位＋重新預備
      const onResize = () => { clearTimeout(rt); rt = window.setTimeout(() => {
        if (cancelled || engine.playing) return; const nb = measure(); if (!nb) return; place(engine, nb); const s = prepSize.current; const img = (engine as any).img as CanvasImageSource | null;
        if (img && s && (Math.abs(s.width - nb.width) > 1 || Math.abs(s.height - nb.height) > 1)) { prepSize.current = { width: nb.width, height: nb.height }; void engine.prepare(img, prepSize.current, { beast: bk, frame: o.frame, reducedMotion: o.reduced, intensity: o.intensity }); }
      }, 150); };
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(onResize); if (anchorRef?.current) ro.observe(anchorRef.current); ro.observe(layer); }
      window.addEventListener('resize', onResize); cleanups.push(() => window.removeEventListener('resize', onResize));
    };
    let tries = 0; const wait = () => { if (cancelled) return; const b = measure(); if (b) begin(b); else if (++tries < 120) raf = requestAnimationFrame(wait); else set('error'); };
    wait();
    return () => { cancelled = true; cancelAnimationFrame(raf); clearTimeout(rt); ro?.disconnect(); cleanups.forEach((f) => f()); const e = engineRef.current; engineRef.current = null; hasImg.current = false; if (e) { e.canvas.remove(); release(e); } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, imageSrc, box?.width, box?.height, maxDpr, reduced, intensity, beast]);

  // box 只位移：搬畫布（不重做預備）
  useEffect(() => { const e = engineRef.current; if (e && box && !e.playing) place(e, box); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [box?.x, box?.y]);

  // 2) 伺服端確認擊倒才播放：每個 id 只播一次（元件層＋模組層記錄）
  const lastBool = useRef(false); const lastKey = useRef<typeof playKey>(undefined);
  useEffect(() => {
    if (!play) { lastBool.current = false; pending.current = false; return; }
    if (typeof play === 'boolean') { koId.current = playKey != null ? String(playKey) : null; const keyChanged = playKey !== lastKey.current; lastKey.current = playKey; if (lastBool.current && !keyChanged) return; lastBool.current = true; }
    else { const id = String(play); koId.current = id; if (played.current.has(id) || PLAYED_SET.has(id)) return; played.current.add(id); markPlayed(id); }
    if (stateRef.current === 'error') { { const n = performance.now(); cb.current.onDone?.(engineRef.current?.stats as FrameStats, { koId: koId.current, startedAt: n, startedAtEpoch: Date.now(), endedAt: n, endedAtEpoch: Date.now(), durationMs: 0, reduced, preparedAtPlay: false }); } return; }
    startPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, playKey]);

  return <div ref={layerRef} className={`${styles.layer} ${fixed ? styles.fixed : ''}`} style={{ zIndex }} aria-hidden="true" data-testid="boss-death-fx" data-state={state} />;
}
