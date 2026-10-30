'use client';
/**
 * BeadFx：寶珠消除／攻擊動效覆蓋層（v0.8 動效組，風・空第一版）。
 * - 只「播放」上游（共用盤面邏輯）送來的事件，不計算消除、不算傷害。
 * - 事件來源：props.events，或監聽 window.__match3Events 的 push。
 * - 只用 transform / opacity；prefers-reduced-motion 時改為靜態閃光。
 * - 魔珠外觀未啟用（MAGIC_BEAD_VISUALS_ENABLED = false）。
 * - 不使用任何卡圖／素材檔，純 CSS。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ELEMENT_LABEL,
  ELEMENT_PALETTE,
  MAGIC_BEAD_VISUALS_ENABLED,
  cascadeScale,
  normalizeBeadEvent,
  effectivePower,
  powerRatio,
  type BeadElement,
} from '@/lib/beast-game/element-palette';
import { isMatch3FxEvent, type Match3BusEvent, type Match3FxEvent } from '@/lib/beast-game/match3/event-bus';
import s from './BeadFx.module.css';

/** 與 window.__match3Events 共用同一份宣告（lib/beast-game/match3/event-bus）。 */
export interface BeadFxEvent extends Match3FxEvent {
  /* 以下三欄皆可選：核心沒送也照常播一般特效 */
  magic?: boolean;
  magicPower?: number;
  skill5?: boolean;
}

/** 五元素走同一條路徑；風、空有專屬特效，水／火／地暫用通用特效。 */
export const BEAD_FX_SUPPORTED: readonly BeadElement[] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];
export const BEAD_FX_BESPOKE: readonly BeadElement[] = ['AIR', 'SPACE'];

type Burst = BeadFxEvent & { id: number; power: number };

/** 小型訂閱轉接：包住 window.__match3Events 的 push，回傳取消函式。 */
export function subscribeMatch3(cb: (ev: BeadFxEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const arr = (window.__match3Events ??= []);
  const original = arr.push;
  const wrapped = function (this: Match3BusEvent[], ...items: Match3BusEvent[]) {
    const n = original.apply(this, items);
    for (const it of items) {
      if (isMatch3FxEvent(it)) try { cb(it); } catch { /* 畫面錯誤不得影響盤面 */ }
    }
    return n;
  };
  arr.push = wrapped;
  return () => {
    if (arr.push === wrapped) arr.push = original;
  };
}

function usePrefersReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}

export interface BeadFxProps {
  /** 直接傳事件（每個新物件播一次）。 */
  events?: readonly BeadFxEvent[];
  /** 是否監聽 window.__match3Events（預設 true）。 */
  listenWindow?: boolean;
  /** 彈道目標相對覆蓋層中心的位移（px）。預設往上 38% 高度。 */
  target?: { x: number; y: number };
  className?: string;
  /** 爆點位置（覆蓋層百分比），預設 50% / 58%。 */
  origin?: { x: number; y: number };
}

const LIFE_MS = 1300;

export default function BeadFx({ events, listenWindow = true, target, className, origin }: BeadFxProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);
  const seen = useRef(new WeakSet<object>());
  const reduced = usePrefersReducedMotion();

  const add = useRef((ev: BeadFxEvent) => {
    if (!ev || typeof ev !== 'object' || typeof ev.count !== 'number' || !BEAD_FX_SUPPORTED.includes(ev.element)) return;
    const id = ++seq.current;
    const n = normalizeBeadEvent(ev);
    const b: Burst = { ...n, id, power: effectivePower(n.count) };
    setBursts((x) => [...x.slice(-7), b]);
    window.setTimeout(() => setBursts((x) => x.filter((y) => y.id !== id)), LIFE_MS);
  });

  useEffect(() => {
    if (!listenWindow) return;
    return subscribeMatch3((ev) => add.current(ev));
  }, [listenWindow]);

  useEffect(() => {
    if (!events) return;
    for (const ev of events) {
      if (seen.current.has(ev)) continue;
      seen.current.add(ev);
      add.current(ev);
    }
  }, [events]);

  return (
    <div className={`${s.layer} ${className ?? ''}`} aria-hidden="true" data-testid="bead-fx" data-magic-bead={MAGIC_BEAD_VISUALS_ENABLED ? 'on' : 'off'}>
      {bursts.map((b) => (
        <BurstView key={b.id} b={b} reduced={reduced} target={target} origin={origin} />
      ))}
    </div>
  );
}

function BurstView({ b, reduced, target, origin }: { b: Burst; reduced: boolean; target?: { x: number; y: number }; origin?: { x: number; y: number } }) {
  const color = ELEMENT_PALETTE[b.element];
  const ratio = powerRatio(b.count);
  const k = cascadeScale(b.cascadeStep);
  const vars = {
    '--c': color,
    '--p': ratio.toFixed(3),
    '--k': k.toFixed(3),
    '--tx': `${target?.x ?? 0}px`,
    '--ty': `${target?.y ?? -160}px`,
    '--mg': b.magic ? '1' : '0',
    left: `${origin?.x ?? 50}%`,
    top: `${origin?.y ?? 58}%`,
  } as CSSProperties;
  const common = {
    'data-element': b.element,
    'data-power': b.power,
    'data-cascade': b.cascadeStep,
    'data-eligible': String(b.eligible),
    'data-magic': b.magic ? String(b.magicPower ?? 0) : undefined,
  };

  if (reduced) {
    return (
      <div className={s.burst} style={vars} {...common} data-reduced="true">
        <div className={s.staticFlash} />
        {b.skill5 && <span className={s.skill5} data-testid="skill5-banner">五珠技</span>}
        {!b.eligible && <NoAttack el={b.element} />}
      </div>
    );
  }

  // 粒子數隨強度（3→10 顆）增加；連鎖另外放大整體尺寸與亮度。
  const pieces = 5 + b.power + Math.min(b.cascadeStep - 1, 4) * 2;
  return (
    <div className={`${s.burst} ${b.eligible ? '' : s.dim} ${b.magic ? s.magicHit : ''}`} style={vars} {...common}>
      {b.magic && <div className={s.magicRing} />}
      {b.element === 'AIR' ? (
        <>
          <div className={s.gustRing} />
          {Array.from({ length: pieces }, (_, i) => (
            <span key={i} className={s.ribbon} style={{ '--a': `${(360 / pieces) * i}deg`, '--d': `${(i % 3) * 40}ms` } as CSSProperties} />
          ))}
          {b.eligible && <div className={s.gustColumn} />}
          {b.eligible && (
            <div className={s.gustX}>
              <div className={s.gustY}><span className={s.gustHead} /></div>
            </div>
          )}
        </>
      ) : b.element === 'SPACE' ? (
        <>
          <div className={s.voidRing} />
          <div className={s.voidRing2} />
          {Array.from({ length: pieces }, (_, i) => (
            <span key={i} className={s.star} style={{ '--a': `${(360 / pieces) * i + 13}deg`, '--d': `${(i % 4) * 70}ms`, '--r': `${38 + (i % 3) * 18}px` } as CSSProperties} />
          ))}
          {b.eligible && <span className={s.warp} />}
          {b.eligible && <span className={s.warpLand} />}
        </>
      ) : (
        <>
          <div className={s.plainRing} />
          {b.eligible && <span className={s.plainShot} />}
        </>
      )}
      {b.skill5 && <span className={s.skill5} data-testid="skill5-banner">五珠技</span>}
      {b.cascadeStep > 1 && <span className={s.chain}>{b.cascadeStep} 連鎖</span>}
      {!b.eligible && <NoAttack el={b.element} />}
    </div>
  );
}

function NoAttack({ el }: { el: BeadElement }) {
  return <span className={s.noAttack} data-testid="no-attack">{ELEMENT_LABEL[el]}・無可出手神獸，不攻擊</span>;
}
