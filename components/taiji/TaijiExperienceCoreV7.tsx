'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTaijiPerformance, type TaijiQuality } from './useTaijiPerformance';
import styles from './TaijiExperienceCoreV7.module.css';

/** Three.js 科技太極（只在 HIGH 效能掛載；SSR 關閉） */
const TaijiWebGL3D = dynamic(() => import('./TaijiWebGL3D'), { ssr: false });

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export type TaijiState =
  | 'IDLE'
  | 'FOCUS'
  | 'EXPAND_TWO'
  | 'EXPAND_FOUR'
  | 'EXPAND_EIGHT'
  | 'ANALYZING'
  | 'RESULT_READY'
  | 'LOW_POWER';

export type TaijiPrimaryElement = 'SPACE' | 'AIR' | 'WATER' | 'FIRE' | 'EARTH';

export interface TaijiCoreState {
  state: TaijiState;
  progress: {
    completed: number;
    total: number;
  };
  nextModule?: {
    id: string;
    label: string;
    href: string;
  };
  primaryElement?: TaijiPrimaryElement;
  /** 只有真實資料才提供；沒有真實資料禁止顯示百分比 */
  elementSignals?: Array<{ element: TaijiPrimaryElement; percent: number }>;
  analysisStatus?: 'RECEIVED' | 'VERIFYING' | 'ANALYZING' | 'INTEGRATING' | 'QUALITY_CHECK' | 'READY';
}

const ELEMENT_LABELS: Record<TaijiPrimaryElement, string> = {
  SPACE: '空',
  AIR: '風',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

/** 分析儀式步驟完成門檻（依 analysisStatus 遞進點亮） */
const ANALYSIS_STEP_THRESHOLDS: Array<TaijiCoreState['analysisStatus'][]> = [
  ['VERIFYING', 'ANALYZING', 'INTEGRATING', 'QUALITY_CHECK', 'READY'],
  ['INTEGRATING', 'QUALITY_CHECK', 'READY'],
  ['QUALITY_CHECK', 'READY'],
  ['READY'],
];

type TaijiExperienceCoreV7Props = {
  state: TaijiCoreState;
  onStart?: () => void;
};

const TWO_FORCES = [
  { label: '陰', className: styles.forceYin },
  { label: '陽', className: styles.forceYang },
] as const;

const TECH_PLANETS = [
  {
    key: 'void',
    planet: '空',
    signal: '感知',
    color: '#9b5de5',
    glow: '#7b2cbf',
    radius: 'calc(var(--taiji-size) * 0.52)',
    tilt: '62deg',
    counterTilt: '-62deg',
    duration: '18s',
    delay: '-1s',
    size: '18px',
  },
  {
    key: 'wind',
    planet: '風',
    signal: '流速',
    color: '#00f5d4',
    glow: '#00c4a7',
    radius: 'calc(var(--taiji-size) * 0.58)',
    tilt: '54deg',
    counterTilt: '-54deg',
    duration: '23s',
    delay: '-7s',
    size: '16px',
  },
  {
    key: 'water',
    planet: '水',
    signal: '記憶',
    color: '#00bbf9',
    glow: '#0077b6',
    radius: 'calc(var(--taiji-size) * 0.64)',
    tilt: '68deg',
    counterTilt: '-68deg',
    duration: '29s',
    delay: '-13s',
    size: '19px',
  },
  {
    key: 'fire',
    planet: '火',
    signal: '啟動',
    color: '#ff6b35',
    glow: '#ff006e',
    radius: 'calc(var(--taiji-size) * 0.70)',
    tilt: '50deg',
    counterTilt: '-50deg',
    duration: '35s',
    delay: '-19s',
    size: '17px',
  },
  {
    key: 'earth',
    planet: '地',
    signal: '穩定',
    color: '#fee440',
    glow: '#f4a261',
    radius: 'calc(var(--taiji-size) * 0.76)',
    tilt: '58deg',
    counterTilt: '-58deg',
    duration: '42s',
    delay: '-27s',
    size: '20px',
  },
] as const;

const FOUR_SYMBOLS = [
  { label: '陰中陰', angle: -45 },
  { label: '陰中陽', angle: 45 },
  { label: '陽中陰', angle: 135 },
  { label: '陽中陽', angle: 225 },
] as const;

const BAGUA = [
  { symbol: '☰', name: '乾', helper: '總覽', href: '/' },
  { symbol: '☱', name: '兌', helper: '姓名', href: '/nameology' },
  { symbol: '☲', name: '離', helper: '紫微', href: '/insight' },
  { symbol: '☳', name: '震', helper: '數字', href: '/numerology' },
  { symbol: '☴', name: '巽', helper: '配對', href: '/match' },
  { symbol: '☵', name: '坎', helper: '音樂', href: '/music' },
  { symbol: '☶', name: '艮', helper: '八字', href: '/bazi' },
  { symbol: '☷', name: '坤', helper: '塔羅', href: '/tarot' },
] as const;

const ANALYSIS_STEPS = [
  '資料確認',
  '專業引擎',
  'AI 整合',
  '品質確認',
] as const;

function stageFromTap(tap: number): TaijiState {
  if (tap <= 0) return 'IDLE';
  if (tap === 1) return 'FOCUS';
  if (tap === 2) return 'EXPAND_TWO';
  if (tap === 3) return 'EXPAND_FOUR';
  return 'EXPAND_EIGHT';
}

function mergeQualityState(state: TaijiState, quality: TaijiQuality): TaijiState {
  // 效能分級只降視覺，不奪功能（規格：所有模式功能完全一致）。
  // LOW 只在待機時顯示 LOW_POWER；互動展開與分析狀態一律保留。
  if (quality === 'LOW' && state === 'IDLE') return 'LOW_POWER';
  return state;
}

function polarStyle(index: number, total: number, radius: string) {
  const angle = -90 + (360 / total) * index;
  return {
    '--node-angle': `${angle}deg`,
    '--node-radius': radius,
    '--node-counter-angle': `${-angle}deg`,
  } as CSSProperties;
}

function planetOrbitStyle(item: (typeof TECH_PLANETS)[number]) {
  return {
    '--planet-color': item.color,
    '--planet-glow': item.glow,
    '--orbit-radius': item.radius,
    '--orbit-tilt': item.tilt,
    '--orbit-counter-tilt': item.counterTilt,
    '--orbit-duration': item.duration,
    '--orbit-delay': item.delay,
    '--planet-size': item.size,
  } as CSSProperties;
}

/** 指標視差上限（度）：小幅度才自然，過大會暈 */
const TILT_MAX_DEG = 6;

export default function TaijiExperienceCoreV7({ state, onStart }: TaijiExperienceCoreV7Props) {
  const quality = useTaijiPerformance();
  const [tap, setTap] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [webglOk, setWebglOk] = useState(false);

  // WebGL 能力偵測（僅 client）；HIGH + WebGL 可用才掛 Three.js 科技太極
  useEffect(() => {
    setWebglOk(detectWebGL());
  }, []);

  const useWebGL3D = quality === 'HIGH' && webglOk;

  // 3D 指標視差：滑鼠/觸控靠近時太極自然朝向使用者傾斜，離開緩慢回正
  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const setTilt = (x: number, y: number) => {
      node.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`);
      node.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`);
    };

    const onMove = (event: PointerEvent) => {
      if (reduced?.matches) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
      const ratioY = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt(ratioX * TILT_MAX_DEG * 2, ratioY * -TILT_MAX_DEG * 2);
    };

    const onReset = () => setTilt(0, 0);

    node.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onReset, { passive: true });
    node.addEventListener('pointercancel', onReset, { passive: true });

    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onReset);
      node.removeEventListener('pointercancel', onReset);
    };
  }, []);
  const expansionState = stageFromTap(tap);
  const interactiveState = state.state === 'IDLE' ? expansionState : state.state;
  const displayState = mergeQualityState(interactiveState, quality);
  const isFocusOpen = expansionState !== 'IDLE' || displayState === 'ANALYZING' || displayState === 'RESULT_READY';
  const isEightOpen = expansionState === 'EXPAND_EIGHT';
  const isFourOpen = isEightOpen || expansionState === 'EXPAND_FOUR';
  const isTwoOpen = isFourOpen || expansionState === 'EXPAND_TWO';

  const progressText = useMemo(() => {
    const total = Math.max(1, state.progress.total);
    const completed = Math.max(0, Math.min(state.progress.completed, total));
    return `${completed} / ${total}`;
  }, [state.progress.completed, state.progress.total]);

  const handleCoreClick = () => {
    setTap((current) => (current >= 4 ? 1 : current + 1));
  };

  const handleStart = () => {
    if (onStart) onStart();
    else {
      const target = document.getElementById('home-eight-card-route');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      className={styles.shell}
      data-taiji-version="taiji-experience-core-v7"
      data-state={displayState}
      data-quality={quality}
      data-focus-open={isFocusOpen}
      data-two-open={isTwoOpen}
      data-four-open={isFourOpen}
      data-eight-open={isEightOpen}
      aria-label="天地人和核心"
    >
      <p className={styles.brand}>天地人和 AI</p>
      <div ref={stageRef} className={styles.coreStage}>
        <span className={styles.mainLight} aria-hidden="true" />
        <span className={styles.groundShadow} aria-hidden="true" />

        {/* WebGL 啟用時由 Three.js 呈現五行星，隱藏 DOM 版避免雙重行星 */}
        <div className={styles.planetSystem} data-webgl-hidden={useWebGL3D} aria-hidden="true">
          {TECH_PLANETS.map((item) => (
            <span key={item.key} className={styles.planetOrbit} style={planetOrbitStyle(item)}>
              <span className={styles.orbitLine} />
              <span className={styles.orbitRunner}>
                <span className={styles.outerPlanet}>
                  <i />
                  <b>{item.planet}</b>
                  <small>{item.signal}</small>
                </span>
              </span>
            </span>
          ))}
        </div>

        <div className={styles.twoForces} aria-hidden="true">
          {TWO_FORCES.map((item) => (
            <span key={item.label} className={`${styles.forceNode} ${item.className}`}>
              {item.label}
            </span>
          ))}
        </div>

        <div className={styles.fourNodes} aria-hidden="true">
          {FOUR_SYMBOLS.map((item, index) => (
            <span key={item.label} style={polarStyle(index, FOUR_SYMBOLS.length, 'calc(var(--taiji-size) * 0.34)')}>
              {item.label}
            </span>
          ))}
        </div>

        <div className={styles.baguaNodes} aria-label="太極八卦導航">
          {BAGUA.map((item, index) => (
            <Link key={item.name} href={item.href} prefetch className={styles.baguaNode} style={polarStyle(index, BAGUA.length, 'calc(var(--taiji-size) * 0.45)')}>
              <b>{item.symbol}</b>
              <span>{item.name}</span>
              <small>{item.helper}</small>
            </Link>
          ))}
        </div>

        <button type="button" className={styles.taijiButton} onClick={handleCoreClick} aria-label="展開太極核心">
          {useWebGL3D && <TaijiWebGL3D className={styles.webgl3d} />}
          <svg viewBox="0 0 200 200" className={styles.taijiSvg} data-webgl-active={useWebGL3D} aria-hidden="true">
            <defs>
              {/* 科技色系：陽＝冰鉑白（帶青色科技光感） */}
              <radialGradient id="v7Yang" cx="28%" cy="18%" r="90%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="46%" stopColor="#eef5fb" />
                <stop offset="82%" stopColor="#d3e2f0" />
                <stop offset="100%" stopColor="#a9c3da" />
              </radialGradient>
              {/* 科技色系：陰＝深空藍黑（科技深度） */}
              <radialGradient id="v7Yin" cx="35%" cy="22%" r="90%">
                <stop offset="0%" stopColor="#274059" />
                <stop offset="46%" stopColor="#0c1626" />
                <stop offset="82%" stopColor="#040a14" />
                <stop offset="100%" stopColor="#010307" />
              </radialGradient>
              {/* 科技環：青→電藍髮絲光 */}
              <linearGradient id="v7TechRim" x1="8%" y1="0%" x2="92%" y2="100%">
                <stop offset="0%" stopColor="#8ef0ff" />
                <stop offset="45%" stopColor="#3f9edd" />
                <stop offset="100%" stopColor="#1c4a74" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="96" className={styles.outerRing} />
            <circle cx="100" cy="100" r="96.6" fill="none" stroke="url(#v7TechRim)" strokeWidth="1.4" opacity="0.85" />
            <path
              className={`${styles.fish} ${styles.yinFish}`}
              d="M100 4 A96 96 0 0 1 100 196 A48 48 0 0 1 100 100 A48 48 0 0 0 100 4"
            />
            <path
              className={`${styles.fish} ${styles.yangFish}`}
              d="M100 196 A96 96 0 0 1 100 4 A48 48 0 0 1 100 100 A48 48 0 0 0 100 196"
            />
            {/* 正統魚眼：白魚配黑眼、黑魚配白眼（永久存在） */}
            <circle cx="100" cy="52" r="12" className={styles.darkEye} />
            <circle cx="100" cy="148" r="12" className={styles.lightEye} />
            <circle cx="74" cy="38" r="56" className={styles.surfaceLight} />
          </svg>
        </button>
      </div>

      <div className={styles.status} aria-live="polite">
        <p>看清現在，決定下一步。</p>
        <strong>目前進度 {progressText}</strong>
        {displayState === 'RESULT_READY' ? (
          <span className={styles.readyText}>結果已準備完成。</span>
        ) : state.nextModule ? (
          <span>下一步：{state.nextModule.label}</span>
        ) : (
          <span>下一步：自由探索</span>
        )}
      </div>

      {/* 五元素訊號：只有真實資料才顯示（規格十一） */}
      {state.elementSignals && state.elementSignals.length > 0 ? (
        <div className={styles.elementSignals} aria-label="目前主要元素訊號">
          {state.elementSignals.slice(0, 5).map((signal) => (
            <span key={signal.element} data-primary={signal.element === state.primaryElement}>
              {ELEMENT_LABELS[signal.element]} {signal.percent}%
            </span>
          ))}
        </div>
      ) : null}

      {displayState === 'ANALYZING' || displayState === 'RESULT_READY' ? (
        <div className={styles.analysisRail} aria-label="分析狀態">
          {ANALYSIS_STEPS.map((item, index) => {
            const done = displayState === 'RESULT_READY'
              || (state.analysisStatus != null && ANALYSIS_STEP_THRESHOLDS[index].includes(state.analysisStatus));
            return (
              <span key={item} data-done={done}>{item}<b>{done ? '✓' : '…'}</b></span>
            );
          })}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={styles.primaryAction} onClick={handleStart} aria-label="開始探索">
          <span>開始探索</span>
          <b aria-hidden="true">→</b>
        </button>
        {state.nextModule ? (
          <Link href={state.nextModule.href} prefetch className={styles.secondaryAction}>
            <span>{state.nextModule.label}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
