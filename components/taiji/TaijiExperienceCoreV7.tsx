'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useTaijiPerformance, type TaijiQuality } from './useTaijiPerformance';
import styles from './TaijiExperienceCoreV7.module.css';

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
  { key: 'jupiter', planet: '木星', element: '木', signal: '生長', color: '#45e6b5' },
  { key: 'mars', planet: '火星', element: '火', signal: '啟動', color: '#ff6b5f' },
  { key: 'saturn', planet: '土星', element: '土', signal: '穩定', color: '#e8c36a' },
  { key: 'venus', planet: '金星', element: '金', signal: '校準', color: '#e7edf7' },
  { key: 'mercury', planet: '水星', element: '水', signal: '流動', color: '#61b8ff' },
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

function planetStyle(index: number, total: number, radius: string, color: string) {
  return {
    ...polarStyle(index, total, radius),
    '--planet-color': color,
  } as CSSProperties;
}

export default function TaijiExperienceCoreV7({ state, onStart }: TaijiExperienceCoreV7Props) {
  const quality = useTaijiPerformance();
  const [tap, setTap] = useState(0);
  const expansionState = stageFromTap(tap);
  const interactiveState = state.state === 'IDLE' ? expansionState : state.state;
  const displayState = mergeQualityState(interactiveState, quality);
  const isFocusOpen = expansionState !== 'IDLE';
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
      <div className={styles.coreStage}>
        <span className={styles.mainLight} aria-hidden="true" />
        <span className={styles.groundShadow} aria-hidden="true" />

        <div className={styles.planetSystem} aria-hidden="true">
          <div className={styles.innerPlanetLayer}>
            {TECH_PLANETS.map((item, index) => (
              <span
                key={`${item.key}-inner`}
                className={styles.innerPlanet}
                style={planetStyle(index, TECH_PLANETS.length, 'calc(var(--taiji-size) * 0.295)', item.color)}
              >
                <i />
              </span>
            ))}
          </div>
          <div className={styles.outerPlanetLayer}>
            {TECH_PLANETS.map((item, index) => (
              <span
                key={item.key}
                className={styles.outerPlanet}
                style={planetStyle(index, TECH_PLANETS.length, 'calc(var(--taiji-size) * 0.47)', item.color)}
              >
                <b>{item.planet}</b>
                <small>{item.element} · {item.signal}</small>
              </span>
            ))}
          </div>
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
          <svg viewBox="0 0 200 200" className={styles.taijiSvg} aria-hidden="true">
            <defs>
              <radialGradient id="v7Yang" cx="28%" cy="18%" r="90%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="58%" stopColor="#f7f7f2" />
                <stop offset="100%" stopColor="#c8d0d8" />
              </radialGradient>
              <radialGradient id="v7Yin" cx="35%" cy="22%" r="90%">
                <stop offset="0%" stopColor="#1d2430" />
                <stop offset="62%" stopColor="#05070a" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="96" className={styles.outerRing} />
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
