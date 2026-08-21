'use client';

/**
 * 【五行星軌 × 固定五行星體｜融合升級版 V2】
 * 兩卡合一：
 * - 星軌層（SVG）：外圈相生環＋內部相剋五角星，一次性畫線動畫後靜態
 * - 星體層（Button）：真實比例＋十神、44px+ 觸控、點擊開 Drilldown 證據面板
 * - 互動升級：點擊某元素 → 與它相關的生剋線路亮起（誰生我／我生誰／誰剋我）
 * CORE CALCULATES ONCE. UI READS MANY TIMES. 零重算、零 AI 補值、零假拆分。
 */

import { useState } from 'react';
import type { FiveElementOrbitItem, FiveElementOrbitViewModel } from './adapter';

type ElementKey = FiveElementOrbitItem['element'];

/** 五角星體位置（與 SVG 軌道錨點對齊，% 座標） */
const NODE_CENTER: Record<ElementKey, { x: number; y: number }> = {
  WOOD: { x: 50, y: 16.5 },
  FIRE: { x: 80, y: 43 },
  EARTH: { x: 68.5, y: 80.5 },
  METAL: { x: 29, y: 81 },
  WATER: { x: 18.5, y: 42 },
};

const ORBIT_POSITIONS: Record<ElementKey, string> = {
  WOOD: 'left-1/2 top-[4%] -translate-x-1/2',
  FIRE: 'right-[7%] top-[31%]',
  EARTH: 'right-[18%] bottom-[6%]',
  METAL: 'left-[18%] bottom-[6%]',
  WATER: 'left-[7%] top-[31%]',
};

const ELEMENT_TONE: Record<ElementKey, string> = {
  WOOD: 'border-emerald-300/45 bg-emerald-400/12 text-emerald-100',
  FIRE: 'border-rose-300/45 bg-rose-400/12 text-rose-100',
  EARTH: 'border-amber-300/45 bg-amber-500/12 text-amber-100',
  METAL: 'border-slate-200/45 bg-slate-200/12 text-slate-100',
  WATER: 'border-blue-300/45 bg-blue-400/12 text-blue-100',
};

const ELEMENT_RING: Record<ElementKey, string> = {
  WOOD: 'ring-emerald-300/70', FIRE: 'ring-rose-300/70', EARTH: 'ring-amber-300/70', METAL: 'ring-slate-200/70', WATER: 'ring-blue-300/70',
};

/** 固定五元素關係（前台名稱）：相生相鄰環、相剋五角星 */
const GENERATING_PAIRS: Array<[ElementKey, ElementKey]> = [
  ['WOOD', 'FIRE'], ['FIRE', 'EARTH'], ['EARTH', 'METAL'], ['METAL', 'WATER'], ['WATER', 'WOOD'],
];
const CONTROLLING_PAIRS: Array<[ElementKey, ElementKey]> = [
  ['WOOD', 'EARTH'], ['EARTH', 'WATER'], ['WATER', 'FIRE'], ['FIRE', 'METAL'], ['METAL', 'WOOD'],
];
const GENERATES_ME: Record<string, string> = { 風: '水', 火: '風', 地: '火', 空: '地', 水: '空' };
const I_GENERATE: Record<string, string> = { 風: '火', 火: '地', 地: '空', 空: '水', 水: '風' };
const CONTROLS_ME: Record<string, string> = { 風: '空', 火: '水', 地: '風', 空: '火', 水: '地' };

function scaleClass(value: number | null) {
  if (value == null) return 'h-[78px] w-[78px]';
  if (value >= 28) return 'h-[92px] w-[92px]';
  if (value >= 20) return 'h-[86px] w-[86px]';
  if (value >= 12) return 'h-[80px] w-[80px]';
  return 'h-[74px] w-[74px]';
}

export function FiveElementOrbit({ view, evidence }: {
  view: FiveElementOrbitViewModel;
  evidence?: Array<{ element: string; percent: number | null; stems: number; branches: number; hiddenStems: number; tenGodLabels: string[] }>;
}) {
  const [active, setActive] = useState<ElementKey | null>(null);
  const activeItem = view.items.find((i) => i.element === active) ?? null;
  const activeEvidence = activeItem ? evidence?.find((e) => e.element === activeItem.sourceLabel) ?? null : null;

  const segOpacity = (a: ElementKey, b: ElementKey, base: number, boost: number) =>
    active === null ? base : (a === active || b === active ? boost : base * 0.35);
  const segWidth = (a: ElementKey, b: ElementKey, base: number) =>
    active !== null && (a === active || b === active) ? base + 0.9 : base;

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[340px] min-w-0">
        {/* ===== 星軌層：相生外圈 + 相剋五角星（一次性畫線後靜態；點擊元素時相關線路亮起） ===== */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id="feoCenterGlow" cx="50%" cy="48%" r="50%">
              <stop offset="0%" stopColor="rgba(251,191,36,0.10)" />
              <stop offset="55%" stopColor="rgba(251,191,36,0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#feoCenterGlow)" />
          {/* 外圈軌道基準環 */}
          <circle cx="50" cy="48.5" r="36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.35" />
          {/* 相生（青綠）：木→火→土→金→水→木 */}
          {GENERATING_PAIRS.map(([a, b], i) => (
            <line
              key={`g${i}`}
              x1={NODE_CENTER[a].x} y1={NODE_CENTER[a].y} x2={NODE_CENTER[b].x} y2={NODE_CENTER[b].y}
              stroke="rgb(52,211,153)" strokeLinecap="round"
              strokeWidth={segWidth(a, b, 0.55)} opacity={segOpacity(a, b, 0.45, 0.95)}
              style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: `feoDraw 0.9s ease-out ${i * 0.18}s forwards`, transition: 'opacity 250ms ease, stroke-width 250ms ease' }}
            />
          ))}
          {/* 相剋（暗紅）：木→土→水→火→金→木 */}
          {CONTROLLING_PAIRS.map(([a, b], i) => (
            <line
              key={`c${i}`}
              x1={NODE_CENTER[a].x} y1={NODE_CENTER[a].y} x2={NODE_CENTER[b].x} y2={NODE_CENTER[b].y}
              stroke="rgb(251,113,133)" strokeLinecap="round"
              strokeWidth={segWidth(a, b, 0.4)} opacity={segOpacity(a, b, 0.3, 0.85)}
              style={{ strokeDasharray: 70, strokeDashoffset: 70, animation: `feoDraw 0.9s ease-out ${0.9 + i * 0.18}s forwards`, transition: 'opacity 250ms ease, stroke-width 250ms ease' }}
            />
          ))}
          <style>{`@keyframes feoDraw { to { stroke-dashoffset: 0; } }`}</style>
        </svg>

        {/* 中心日主：金色質感 */}
        <div className="absolute inset-[30%] grid place-items-center rounded-full border border-amber-200/25 bg-[radial-gradient(circle_at_35%_30%,rgba(251,191,36,0.14),rgba(0,0,0,0.35)_70%)] shadow-[0_0_26px_rgba(251,191,36,0.12)]">
          <p className="text-xs font-black text-white/40">日主</p>
          <p className="mt-1 font-serif text-2xl font-black text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">{view.centerLabel}</p>
        </div>

        {/* ===== 星體層：可點擊 Drilldown Entry ===== */}
        {view.items.map((item) => {
          const isActive = active === item.element;
          return (
            <button
              key={item.element}
              type="button"
              aria-label={`查看${item.label}五行詳細分析`}
              aria-expanded={isActive}
              onClick={() => setActive(isActive ? null : item.element)}
              className={`absolute ${ORBIT_POSITIONS[item.element]} grid ${scaleClass(item.value)} cursor-pointer place-items-center rounded-full border px-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_18px_rgba(0,0,0,0.35)] backdrop-blur-[2px] transition-all duration-150 hover:scale-[1.06] active:scale-[0.96] ${ELEMENT_TONE[item.element]} ${isActive ? `ring-2 ${ELEMENT_RING[item.element]} scale-[1.06]` : active !== null ? 'opacity-60' : ''}`}
            >
              <div>
                <p className="font-serif text-2xl font-black leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)]">{item.label}</p>
                <p className="mt-1 text-sm font-black leading-4">{item.value == null ? '—' : `${item.value}%`}</p>
                <p className="mt-1 text-[12px] font-bold leading-4 text-white/55">
                  {item.tenGodLabels.length > 0 ? item.tenGodLabels.join('／') : '未提供'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 圖例 */}
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-white/45">
        <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 bg-emerald-300/70" />外圈相生</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 bg-rose-300/60" />內星相剋</span>
        <span className="text-white/30">點星體看依據</span>
      </div>

      {/* ===== Drilldown Sheet：Lazy Render，只讀已完成 Professional Result ===== */}
      {activeItem && (
        <div className="mt-3 rounded-2xl border border-white/12 bg-black/30 p-4 text-left">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-black text-white/90">
              【{activeItem.label}】{activeItem.value == null ? '比例未提供' : `${activeItem.value}%`}
            </p>
            <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-black text-white/45">CORE_CALCULATED</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-white/60">
            對應十神：{activeItem.tenGodLabels.length > 0 ? activeItem.tenGodLabels.join('、') : '目前核心未提供此五行的正式十神映射'}
          </p>
          {activeEvidence && (
            <p className="mt-1.5 text-sm font-semibold leading-6 text-white/60">
              【力量從哪裡來】天干 {activeEvidence.stems} 個・地支 {activeEvidence.branches} 個・藏干 {activeEvidence.hiddenStems} 個
            </p>
          )}
          <p className="mt-1.5 text-sm font-semibold leading-6 text-white/55">
            【生剋】<span className="text-emerald-200">{GENERATES_ME[activeItem.label]}生{activeItem.label}</span>｜<span className="text-emerald-200">{activeItem.label}生{I_GENERATE[activeItem.label]}</span>｜<span className="text-rose-200">{CONTROLS_ME[activeItem.label]}剋{activeItem.label}</span>（圖上亮起的線路）
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/35">
            目前核心提供最終比例與來源計數；未提供強弱標籤與細部分數拆解（月令權重、十神細分），系統不自行編造。
          </p>
        </div>
      )}
    </div>
  );
}
