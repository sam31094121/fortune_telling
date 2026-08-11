'use client';

/**
 * 【固定五行星體卡｜Professional Drilldown V1】
 * CORE CALCULATES ONCE. UI READS MANY TIMES.
 * 每顆星體＝可點擊的 Drilldown Entry（button，44px+ 觸控目標，Enter/Space 可開）。
 * 點擊只 Lazy Render 既有 Professional Result 證據；零重算、零 AI 補值、零假拆分。
 */

import { useState } from 'react';
import type { FiveElementOrbitItem, FiveElementOrbitViewModel } from './adapter';

const ORBIT_POSITIONS: Record<FiveElementOrbitItem['element'], string> = {
  WOOD: 'left-1/2 top-[4%] -translate-x-1/2',
  FIRE: 'right-[7%] top-[31%]',
  EARTH: 'right-[18%] bottom-[6%]',
  METAL: 'left-[18%] bottom-[6%]',
  WATER: 'left-[7%] top-[31%]',
};

const ELEMENT_TONE: Record<FiveElementOrbitItem['element'], string> = {
  WOOD: 'border-emerald-300/45 bg-emerald-400/12 text-emerald-100',
  FIRE: 'border-rose-300/45 bg-rose-400/12 text-rose-100',
  EARTH: 'border-amber-300/45 bg-amber-500/12 text-amber-100',
  METAL: 'border-slate-200/45 bg-slate-200/12 text-slate-100',
  WATER: 'border-blue-300/45 bg-blue-400/12 text-blue-100',
};

/** 固定五行生剋（傳統關係，僅顯示用） */
const GENERATES_ME: Record<string, string> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
const I_GENERATE: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS_ME: Record<string, string> = { 木: '金', 火: '水', 土: '木', 金: '火', 水: '土' };

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
  const [active, setActive] = useState<FiveElementOrbitItem['element'] | null>(null);
  const activeItem = view.items.find((i) => i.element === active) ?? null;
  const activeEvidence = activeItem ? evidence?.find((e) => e.element === activeItem.label) ?? null : null;

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-[340px] min-w-0">
        <div className="absolute inset-[13%] rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute inset-[30%] grid place-items-center rounded-full border border-white/10 bg-black/22">
          <p className="text-xs font-black text-white/40">日主</p>
          <p className="mt-1 font-serif text-2xl font-black text-amber-100">{view.centerLabel}</p>
        </div>

        {view.items.map((item) => {
          const isActive = active === item.element;
          return (
            <button
              key={item.element}
              type="button"
              aria-label={`查看${item.label}五行詳細分析`}
              aria-expanded={isActive}
              onClick={() => setActive(isActive ? null : item.element)}
              className={`absolute ${ORBIT_POSITIONS[item.element]} grid ${scaleClass(item.value)} cursor-pointer place-items-center rounded-full border px-2 text-center transition-transform duration-150 hover:scale-[1.06] active:scale-[0.96] ${ELEMENT_TONE[item.element]} ${isActive ? 'ring-2 ring-white/50 scale-[1.06]' : ''}`}
            >
              <div>
                <p className="font-serif text-2xl font-black leading-none">{item.label}</p>
                <p className="mt-1 text-sm font-black leading-4">{item.value == null ? '—' : `${item.value}%`}</p>
                <p className="mt-1 text-[12px] font-bold leading-4 text-white/55">
                  {item.tenGodLabels.length > 0 ? item.tenGodLabels.join('／') : '十神映射未提供'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Drilldown Sheet：點擊才 Lazy Render；資料全來自已完成的 Professional Result */}
      {activeItem && (
        <div className="mt-3 rounded-2xl border border-white/12 bg-black/30 p-4 text-left">
          {/* ① 最終結果 */}
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-black text-white/90">
              【{activeItem.label}】{activeItem.value == null ? '比例未提供' : `${activeItem.value}%`}
            </p>
            <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-black text-white/45">CORE_CALCULATED</span>
          </div>
          {/* ② 十神結構（後端映射有才顯示；不 Hardcode） */}
          <p className="mt-1.5 text-sm font-semibold leading-6 text-white/60">
            對應十神：{activeItem.tenGodLabels.length > 0 ? activeItem.tenGodLabels.join('、') : '目前核心未提供此五行的正式十神映射'}
          </p>
          {/* ③④ 數據依據／來源位置（elementStatistics 真實計數） */}
          {activeEvidence && (
            <p className="mt-1.5 text-sm font-semibold leading-6 text-white/60">
              【力量從哪裡來】天干 {activeEvidence.stems} 個・地支 {activeEvidence.branches} 個・藏干 {activeEvidence.hiddenStems} 個
            </p>
          )}
          {/* ⑤⑥⑦ 生剋關係（固定傳統關係，顯示用） */}
          <p className="mt-1.5 text-sm font-semibold leading-6 text-white/55">
            【生剋】{GENERATES_ME[activeItem.label]}生{activeItem.label}｜{activeItem.label}生{I_GENERATE[activeItem.label]}｜{CONTROLS_ME[activeItem.label]}剋{activeItem.label}
          </p>
          {/* 誠實聲明（§11 禁止假拆分） */}
          <p className="mt-2 text-xs font-semibold leading-5 text-white/35">
            目前核心提供最終比例與來源計數；未提供強弱標籤與細部分數拆解（月令權重、十神細分），系統不自行編造。
          </p>
        </div>
      )}
    </div>
  );
}
