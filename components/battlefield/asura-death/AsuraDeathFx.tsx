'use client';
/**
 * 一般阿修羅死亡動畫（寶珠戰）— 三層不規則撕裂 → 金轉紅瞬燒 → 儀式式快速消失（≤ 3 秒）
 *
 * 只是疊加視覺層：pointer-events:none、aria-hidden；不判定擊倒、不改 HP／勝負／結算，
 * 也不讓遊戲等它。請只在「伺服端回合結果確認該阿修羅 HP 歸零」後觸發
 * （連鎖中途擊倒：在造成擊倒的那一段命中之後觸發）。
 *
 * 宣告式：<AsuraDeathFx anchorRef={foeArtRef} play={knockoutEventId} onDone={...} />
 *   play 每變成一個新的 truthy 值就播一次（建議用伺服端擊倒事件 id）。
 * 命令式：ref.current.play({ seed }) 或 playAsuraDeath({ anchor, seed })。
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import styles from './AsuraDeathFx.module.css';
import {
  createAsuraDeath,
  type AsuraDeathEngine,
  type AsuraDeathPlayOptions,
  type AsuraDeathResult,
  type AsuraDeathSetup,
} from './asuraDeathEngine';

export type { AsuraDeathResult, AsuraDeathPlayOptions } from './asuraDeathEngine';
export { playAsuraDeath, createAsuraDeath } from './asuraDeathEngine';

export interface AsuraDeathFxHandle {
  play(opts?: AsuraDeathPlayOptions): Promise<AsuraDeathResult>;
  cancel(): void;
  /** v3（選填）：進入戰鬥或敵方 HP 低時呼叫，閒置分段預熱，擊倒當下零重活。 */
  prewarm?(opts?: { reducedMotion?: boolean; seed?: number; sliceMs?: number }): Promise<void>;
}

export interface AsuraDeathFxProps {
  /** 觸發值：每次變成新的 truthy 值播一次（例如伺服端 knockout 事件 id）。 */
  play?: string | number | boolean | null;
  /** 被撕掉的目標（例如 .foeArt）。不給時用本元件父元素。 */
  anchorRef?: RefObject<HTMLElement | null>;
  /** 阿修羅圖；不給時讀 anchor 裡的 <img> 或 background-image。 */
  src?: string;
  seed?: number;
  /** 'auto'（預設）跟隨 prefers-reduced-motion。 */
  reducedMotion?: boolean | 'auto';
  shape?: AsuraDeathSetup['shape'];
  bleed?: number;
  zIndex?: number;
  /** 播放期間隱藏 anchor（預設 true）；結束後是否還原（預設 false：已陣亡）。 */
  hideAnchor?: boolean;
  restoreAnchor?: boolean;
  onStart?: (info: { seed?: number }) => void;
  onDone?: (result: AsuraDeathResult) => void;
}

const AsuraDeathFx = forwardRef<AsuraDeathFxHandle, AsuraDeathFxProps>(function AsuraDeathFx(props, ref) {
  const probe = useRef<HTMLSpanElement>(null);
  const engine = useRef<AsuraDeathEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;
  /** v3.1：卸載後為 false；卸載後不再建立引擎（避免留下 WebGL context）。 */
  const mounted = useRef(false);

  const getEngine = (): AsuraDeathEngine | null => {
    if (engine.current) return engine.current;
    if (!mounted.current) return null;
    const p = latest.current;
    const anchor = p.anchorRef?.current ?? probe.current?.parentElement ?? null;
    engine.current = createAsuraDeath({
      anchor, src: p.src, shape: p.shape, bleed: p.bleed, zIndex: p.zIndex,
      hideAnchor: p.hideAnchor, restoreAnchor: p.restoreAnchor, className: styles.layer,
    });
    // 預先解碼圖片並在閒置時分段預排下一次，避免擊倒當下或捲動時出現長任務
    const e = engine.current;
    e.prepare().then(() => {
      if (engine.current !== e) return; // 已卸載或 src 已換：不要再 prime（否則會在已銷毀的引擎上重建 GL）
      const q = latest.current;
      if (q.seed !== undefined || typeof q.reducedMotion === 'boolean') e.prime({ seed: q.seed, reducedMotion: typeof q.reducedMotion === 'boolean' ? q.reducedMotion : undefined });
    }).catch(() => {});
    return engine.current;
  };

  const run = (opts?: AsuraDeathPlayOptions) => {
    const p = latest.current;
    const e = getEngine();
    if (!e) {
      // 卸載後才呼叫：不建引擎，直接回傳 cancelled（不拋錯，避免 unhandled rejection）
      const r: AsuraDeathResult = { seed: 0, reducedMotion: false, order: [], tearTimes: [], burnStart: 0, burnEnd: 0, vanishStart: 0, vanishEnd: 0, total: 0, angleDeg: 0, durationMs: 0, frames: 0, maxFrameGapMs: 0, droppedFrames: 0, cancelled: true };
      return Promise.resolve(r);
    }
    const merged: AsuraDeathPlayOptions = {
      seed: opts?.seed ?? p.seed,
      reducedMotion: opts?.reducedMotion ?? (p.reducedMotion === 'auto' || p.reducedMotion === undefined ? undefined : p.reducedMotion),
      avoidRepeat: opts?.avoidRepeat,
    };
    p.onStart?.({ seed: merged.seed });
    return e.play(merged).then((r) => { latest.current.onDone?.(r); return r; });
  };

  useImperativeHandle(ref, () => ({ play: run, cancel: () => engine.current?.cancel(), prewarm: (o) => engine.current?.prewarm?.(o) ?? Promise.resolve() }), []);

  // 掛載後先準備（解碼圖片），卸載時清除
  useEffect(() => {
    mounted.current = true;
    getEngine();
    return () => {
      // 卸載或 src 改變：銷毀引擎（取消閒置預熱、rAF，釋放 GL context）
      const e = engine.current; engine.current = null;
      mounted.current = false;
      e?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.src]);

  const lastToken = useRef<AsuraDeathFxProps['play']>(props.play);
  useEffect(() => {
    if (props.play && props.play !== lastToken.current) void run();
    lastToken.current = props.play;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.play]);

  return <span ref={probe} className={styles.probe} aria-hidden="true" data-testid="asura-death-fx-probe" />;
});

export default AsuraDeathFx;
