'use client';

/**
 * Taiji Experience Core V7
 *
 * 平台唯一視覺核心＋導航核心＋分析狀態核心＋成長進度核心。
 *
 * 視覺方向（單一主材質）：玉石（拋光墨玉×暖白瓷玉），金色髮絲細邊，單一主光源＋弱環境光。
 * 高級＝克制：主視覺 80%、特效 20%；動態慢、光柔、文字少、留白多。
 * 互動：太極 → 兩儀 → 四象 → 八卦 → 功能入口，逐層展開，不一次炸開。
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useTaijiPerformance } from './useTaijiPerformance';
import { nextInteractionState, type TaijiCoreState } from './taijiCoreState';
import './TaijiCoreV7.css';

const FOUR_SYMBOLS = [
  { id: 'taiyang', label: '太陽', hint: '陽中陽', angle: -45 },
  { id: 'shaoyin', label: '少陰', hint: '陽中陰', angle: 45 },
  { id: 'taiyin', label: '太陰', hint: '陰中陰', angle: 135 },
  { id: 'shaoyang', label: '少陽', hint: '陰中陽', angle: 225 },
] as const;

const BAGUA = [
  { id: 'qian', glyph: '☰', label: '乾', hint: '開創' },
  { id: 'dui', glyph: '☱', label: '兌', hint: '溝通' },
  { id: 'li', glyph: '☲', label: '離', hint: '洞察' },
  { id: 'zhen', glyph: '☳', label: '震', hint: '行動' },
  { id: 'xun', glyph: '☴', label: '巽', hint: '滲透' },
  { id: 'kan', glyph: '☵', label: '坎', hint: '深流' },
  { id: 'gen', glyph: '☶', label: '艮', hint: '安定' },
  { id: 'kun', glyph: '☷', label: '坤', hint: '承載' },
] as const;

const ELEMENT_LABELS: Record<string, string> = {
  SPACE: '空',
  AIR: '風',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

interface TaijiCoreV7Props {
  state: TaijiCoreState;
  brand?: string;
  tagline?: string;
  onEnter?: () => void;
  onStateChange?: (state: TaijiCoreState['state']) => void;
}

export default function TaijiCoreV7({
  state,
  brand = '天地人和',
  tagline = '看清現在，決定下一步。',
  onEnter,
  onStateChange,
}: TaijiCoreV7Props) {
  const quality = useTaijiPerformance();
  const [interaction, setInteraction] = useState<TaijiCoreState['state']>(state.state ?? 'IDLE');

  // 外部狀態（ANALYZING / RESULT_READY / LOW_POWER）優先於互動狀態
  const effectiveState = useMemo(() => {
    if (state.state === 'ANALYZING' || state.state === 'RESULT_READY' || state.state === 'LOW_POWER') {
      return state.state;
    }
    return interaction;
  }, [state.state, interaction]);

  const handleTap = useCallback(() => {
    if (effectiveState === 'ANALYZING') return;
    if (effectiveState === 'EXPAND_EIGHT') {
      onEnter?.();
    }
    const next = nextInteractionState(effectiveState);
    setInteraction(next);
    onStateChange?.(next);
  }, [effectiveState, onEnter, onStateChange]);

  const showSignals = Array.isArray(state.elementSignals) && state.elementSignals.length > 0;

  return (
    <section className="taiji-v7" data-state={effectiveState} data-quality={quality} aria-label="天地人和核心">
      <header className="taiji-v7__brand">{brand}</header>

      <div className="taiji-v7__stage">
        {/* 弱環境光（第三層），單一主光源在 SVG 內 */}
        <span className="taiji-v7__ambient" aria-hidden="true" />
        {quality === 'HIGH' && (
          <span className="taiji-v7__particles" aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </span>
        )}

        <button
          type="button"
          className="taiji-v7__button"
          onClick={handleTap}
          aria-label={effectiveState === 'IDLE' ? '開始探索' : '太極互動'}
        >
          <svg viewBox="0 0 200 200" className="taiji-v7__svg" aria-hidden="true">
            <defs>
              {/* 玉石材質：暖白瓷玉（陽） */}
              <radialGradient id="tj7Yang" cx="36%" cy="26%" r="86%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="42%" stopColor="#f6f3ea" />
                <stop offset="78%" stopColor="#e6e0d0" />
                <stop offset="100%" stopColor="#cfc6ae" />
              </radialGradient>
              {/* 玉石材質：拋光墨玉（陰） */}
              <radialGradient id="tj7Yin" cx="36%" cy="26%" r="90%">
                <stop offset="0%" stopColor="#3d4650" />
                <stop offset="38%" stopColor="#1b2129" />
                <stop offset="76%" stopColor="#0b0e14" />
                <stop offset="100%" stopColor="#04060a" />
              </radialGradient>
              {/* 單一主光源（左上柔光） */}
              <radialGradient id="tj7KeyLight" cx="32%" cy="22%" r="70%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="45%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              {/* 金色髮絲細邊 */}
              <linearGradient id="tj7Rim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e8d9a8" />
                <stop offset="50%" stopColor="#b99b57" />
                <stop offset="100%" stopColor="#8a713b" />
              </linearGradient>
            </defs>

            {/* LAYER 1｜太極本體（陰陽、中心、旋轉、呼吸由 CSS 單組動畫控制） */}
            <g className="taiji-v7__disc">
              <circle cx="100" cy="100" r="96" fill="url(#tj7Rim)" opacity="0.9" />
              <circle cx="100" cy="100" r="94.6" fill="#0a0d12" />

              <g className="taiji-v7__halves">
                {/* 陽半（S 曲線構成，前端圓潤、尾端收尖） */}
                <path
                  className="taiji-v7__half taiji-v7__half--yang"
                  fill="url(#tj7Yang)"
                  d="M100 6 A94 94 0 0 0 100 194 A47 47 0 0 0 100 100 A47 47 0 0 1 100 6 Z"
                />
                {/* 陰半 */}
                <path
                  className="taiji-v7__half taiji-v7__half--yin"
                  fill="url(#tj7Yin)"
                  d="M100 6 A94 94 0 0 1 100 194 A47 47 0 0 1 100 100 A47 47 0 0 0 100 6 Z"
                />

                {/* 魚眼：白魚黑眼、黑魚白眼（永久存在） */}
                <circle className="taiji-v7__eye taiji-v7__eye--yin" cx="100" cy="53" r="12.5" fill="url(#tj7Yin)" />
                <circle className="taiji-v7__eye taiji-v7__eye--yang" cx="100" cy="147" r="12.5" fill="url(#tj7Yang)" />
                <circle className="taiji-v7__glint" cx="96.4" cy="49.4" r="2.4" />
                <circle className="taiji-v7__glint taiji-v7__glint--soft" cx="96.4" cy="143.4" r="2.1" />
              </g>

              {/* 單一主光源覆蓋 */}
              <circle cx="100" cy="100" r="94.6" fill="url(#tj7KeyLight)" className="taiji-v7__light" />
            </g>

            {/* LAYER 2a｜四象能量節點（EXPAND_FOUR 後顯示） */}
            <g className="taiji-v7__four" aria-hidden="true">
              {FOUR_SYMBOLS.map((item) => {
                const rad = (item.angle * Math.PI) / 180;
                const x = 100 + Math.cos(rad) * 66;
                const y = 100 + Math.sin(rad) * 66;
                return (
                  <g key={item.id} className="taiji-v7__four-node" style={{ ['--node-delay' as string]: `${FOUR_SYMBOLS.indexOf(item) * 90}ms` }}>
                    <circle cx={x} cy={y} r="10" />
                    <text x={x} y={y + 3.2} textAnchor="middle">{item.label.slice(0, 1)}</text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* LAYER 2b｜八卦環形節點（EXPAND_EIGHT 後顯示，符號＋名稱＋一句功能） */}
          <span className="taiji-v7__bagua" aria-hidden="true">
            {BAGUA.map((gua, index) => (
              <span
                key={gua.id}
                className="taiji-v7__gua"
                style={{ ['--gua-angle' as string]: `${index * 45}deg`, ['--gua-delay' as string]: `${index * 60}ms` }}
              >
                <em>{gua.glyph}</em>
                <small>{gua.label}·{gua.hint}</small>
              </span>
            ))}
          </span>

          {/* 分析儀式覆蓋層 */}
          {effectiveState === 'ANALYZING' && (
            <span className="taiji-v7__ritual" aria-live="polite">
              <span data-done={state.analysisStatus !== 'RECEIVED'}>資料確認 ✓</span>
              <span data-done={state.analysisStatus === 'INTEGRATING' || state.analysisStatus === 'QUALITY_CHECK' || state.analysisStatus === 'READY'}>專業引擎 ✓</span>
              <span data-done={state.analysisStatus === 'QUALITY_CHECK' || state.analysisStatus === 'READY'}>AI 整合 ✓</span>
              <span data-done={state.analysisStatus === 'READY'}>品質確認 ✓</span>
            </span>
          )}
          {effectiveState === 'RESULT_READY' && (
            <span className="taiji-v7__ready" aria-live="polite">結果已準備完成。</span>
          )}
        </button>

        {/* 元素訊號：只有真實資料才顯示 */}
        {showSignals && (
          <span className="taiji-v7__signals" aria-label="主要元素訊號">
            {state.elementSignals!.slice(0, 5).map((signal) => (
              <span key={signal.element}>
                {ELEMENT_LABELS[signal.element] ?? signal.element} {Math.round(signal.percent)}%
              </span>
            ))}
          </span>
        )}
      </div>

      <p className="taiji-v7__tagline">{tagline}</p>

      <div className="taiji-v7__actions">
        <button type="button" className="taiji-v7__cta" onClick={handleTap}>
          {effectiveState === 'EXPAND_EIGHT' && state.nextModule ? `下一步：${state.nextModule}` : '開始探索'}
        </button>
        <span className="taiji-v7__progress">目前進度 {state.progress.completed} / {state.progress.total}</span>
      </div>
    </section>
  );
}
