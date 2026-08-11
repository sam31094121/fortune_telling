'use client';

/**
 * 【AI 八字｜Real Calculation Ceremony V1】
 * THIS IS NOT A FAKE LOADING SCREEN. THIS IS A REAL CALCULATION STATUS UI.
 *
 * 鐵律：
 * - 每一個 ✓ 綁定後端 Professional Result 真實欄位；NO RESULT → NO CHECKMARK。
 * - 運算期間只顯示 PROCESSING（呼吸點），禁止 Timer 假完成。
 * - 結果回來後，逐項揭示「真實狀態」（揭示節奏是呈現，不是造假：狀態全部來自後端）。
 * - 核心沒有的項目 → UNAVAILABLE「目前未提供」，不得假裝完成。
 * - 未知時辰 → SKIPPED_BY_DATA_CONDITION，屬正常成功狀態，不是 Error。
 * - Adapter 只做映射，禁止任何八字計算。
 */

import { useEffect, useState } from 'react';

export type BaziProgressStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'UNAVAILABLE' | 'SKIPPED_BY_DATA_CONDITION' | 'FAILED';

export interface BaziCalculationProgressItem {
  key: string;
  label: string;
  status: BaziProgressStatus;
  source: 'BACKEND';
  note?: string;
}

export interface BaziCalculationProgressViewModel {
  calculationId: string;
  mode: 'FULL_BAZI' | 'PARTIAL_BAZI';
  overallStatus: 'PROCESSING' | 'COMPLETED' | 'PARTIAL_COMPLETED' | 'FAILED';
  items: BaziCalculationProgressItem[];
}

/* ==================== Adapter：Backend Result → ViewModel（零計算） ==================== */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBaziProgressView(result: any, hourUnknown: boolean): BaziCalculationProgressViewModel {
  const pc = result?.professionalChart;
  const has = (v: unknown) => v !== undefined && v !== null && v !== '';
  const arr = (v: unknown) => Array.isArray(v) && v.length > 0;
  const done = (v: boolean): BaziProgressStatus => (v ? 'COMPLETED' : 'FAILED');
  const items: BaziCalculationProgressItem[] = [
    { key: 'input', label: '出生資料確認', status: done(has(result?.input)), source: 'BACKEND' },
    { key: 'dateVerify', label: '出生日期驗證', status: done(has(pc?.calendar)), source: 'BACKEND' },
    {
      key: 'hourConfirm', label: '出生時辰確認',
      status: hourUnknown ? 'SKIPPED_BY_DATA_CONDITION' : done(has(pc?.calendar?.shichen?.label)),
      source: 'BACKEND', note: hourUnknown ? '未提供' : undefined,
    },
    // 節氣：目前核心版本未提供獨立節氣結果 → 誠實標示，不假裝完成、不新增演算法
    { key: 'solarTerm', label: '節氣校正', status: 'UNAVAILABLE', source: 'BACKEND', note: '目前未提供' },
    {
      key: 'pillars', label: hourUnknown ? '三柱排定' : '四柱排定',
      status: done(has(result?.pillars?.year) && has(result?.pillars?.month) && has(result?.pillars?.day)),
      source: 'BACKEND',
    },
    { key: 'stems', label: '天干確認', status: done(['year', 'month', 'day'].every((k) => has(result?.pillars?.[k]?.stem))), source: 'BACKEND' },
    { key: 'branches', label: '地支確認', status: done(['year', 'month', 'day'].every((k) => has(result?.pillars?.[k]?.branch))), source: 'BACKEND' },
    { key: 'hidden', label: '藏干建立', status: done(['year', 'month', 'day'].every((k) => arr(pc?.hiddenStemStructure?.[k]))), source: 'BACKEND' },
    { key: 'dayMaster', label: '日主判定', status: done(has(result?.dayMaster?.stem)), source: 'BACKEND' },
    { key: 'tenGods', label: '十神建立', status: done(arr(pc?.tenGodDistribution?.ranked)), source: 'BACKEND' },
    { key: 'elements', label: '五行結構分析', status: done(has(pc?.elementStatistics?.percentages)), source: 'BACKEND' },
    { key: 'strength', label: '日主強弱分析', status: done(arr(pc?.strengthFactors) && has(result?.dayMaster?.level)), source: 'BACKEND' },
    { key: 'usefulGod', label: '喜用神分析', status: done(has(result?.gods?.usefulGod) && has(result?.gods?.joyGod)), source: 'BACKEND' },
    { key: 'avoidGod', label: '忌神分析', status: done(has(result?.gods?.avoidGod)), source: 'BACKEND' },
    { key: 'pattern', label: '格局判定', status: done(has(pc?.structurePattern?.primaryPattern)), source: 'BACKEND' },
    // 以下為目前核心尚未提供的項目：誠實 UNAVAILABLE，禁止 AI 補值
    { key: 'kongWang', label: '空亡資料', status: 'UNAVAILABLE', source: 'BACKEND', note: '目前未提供' },
    { key: 'twelveStage', label: '十二長生', status: 'UNAVAILABLE', source: 'BACKEND', note: '目前未提供' },
    { key: 'interactions', label: '合沖刑害破', status: 'UNAVAILABLE', source: 'BACKEND', note: '目前未提供' },
    { key: 'shenSha', label: '神煞', status: 'UNAVAILABLE', source: 'BACKEND', note: '目前未提供' },
    { key: 'daYun', label: '大運排定', status: done(arr(result?.luckCycles)), source: 'BACKEND' },
    { key: 'annual', label: '流年建立', status: done(arr(result?.annualFortunes)), source: 'BACKEND' },
    { key: 'verify', label: '專業命盤資料驗證', status: done(pc?.verification?.readyForInterpretation === true), source: 'BACKEND' },
    { key: 'teacher', label: 'AI 老師解析', status: done(has(result?.aiDeepAnalysis?.summary)), source: 'BACKEND' },
  ];
  const anyFailed = items.some((i) => i.status === 'FAILED');
  return {
    calculationId: String(result?.aiDeepAnalysis?.sourceChecksum ?? result?.engineVersion ?? 'unknown'),
    mode: hourUnknown ? 'PARTIAL_BAZI' : 'FULL_BAZI',
    overallStatus: anyFailed ? 'FAILED' : hourUnknown ? 'PARTIAL_COMPLETED' : 'COMPLETED',
    items,
  };
}

/* ==================== Final Gate ==================== */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function runBaziFinalGate(result: any, hourUnknown: boolean): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!result) issues.push('result missing');
  if (!result?.professionalChart) issues.push('professionalResult missing');
  if (!result?.engineVersion) issues.push('calculationId missing');
  const requiredPillars = hourUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour'];
  for (const k of requiredPillars) {
    if (!result?.pillars?.[k]?.stem || !result?.pillars?.[k]?.branch) issues.push(`pillar ${k} invalid`);
  }
  if (result?.professionalChart?.verification?.readyForInterpretation !== true) issues.push('verification not passed');
  return { passed: issues.length === 0, issues };
}

/* ==================== UI ==================== */

const STATUS_ICON: Record<BaziProgressStatus, { icon: string; cls: string }> = {
  PENDING: { icon: '·', cls: 'text-white/25' },
  PROCESSING: { icon: '●', cls: 'text-amber-200 animate-pulse' },
  COMPLETED: { icon: '✓', cls: 'text-emerald-300' },
  UNAVAILABLE: { icon: '—', cls: 'text-white/30' },
  SKIPPED_BY_DATA_CONDITION: { icon: '－', cls: 'text-white/45' },
  FAILED: { icon: '✕', cls: 'text-rose-300' },
};

export function BaziCalculationCeremony({ phase, view, onOpenResult }: {
  phase: 'processing' | 'ceremony';
  view: BaziCalculationProgressViewModel | null;
  onOpenResult: () => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const items = view?.items ?? [];

  // 結果回來後：逐項揭示「已確認的真實狀態」（節奏呈現，非假完成；後端快畫面就快）
  useEffect(() => {
    if (phase !== 'ceremony' || !view) return;
    setRevealed(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setRevealed(i);
      if (i >= items.length) clearInterval(timer);
    }, 85);
    return () => clearInterval(timer);
  }, [phase, view, items.length]);

  const allRevealed = phase === 'ceremony' && view && revealed >= items.length;

  return (
    <section className="animate-[fadeIn_320ms_ease] rounded-[24px] border border-white/10 bg-[linear-gradient(165deg,rgba(14,14,18,0.97),rgba(22,20,16,0.94))] p-5 sm:p-6">
      <h3 className="text-xl font-black text-[color:var(--text-main)]">正在建立您的 AI 八字命盤</h3>
      <p className="mt-1.5 text-sm font-semibold text-white/50">每一項結果皆依實際排盤資料逐項完成。</p>

      <div className="mt-5 space-y-1.5">
        {phase === 'processing' ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3">
            <span className="text-amber-200 animate-pulse">●</span>
            <span className="text-base font-bold text-white/75">TraditionalBaziCore 排盤運算中…（結果由後端真實回傳後才逐項確認）</span>
          </div>
        ) : (
          items.slice(0, revealed).map((item) => {
            const s = STATUS_ICON[item.status];
            return (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-4 py-2 animate-[fadeIn_200ms_ease]">
                <span className="text-sm font-bold text-white/70">{item.label}</span>
                <span className={`shrink-0 text-sm font-black ${s.cls}`}>{s.icon}{item.note ? ` ${item.note}` : ''}</span>
              </div>
            );
          })
        )}
      </div>

      {allRevealed && view && (
        <div className="mt-5 animate-[fadeIn_320ms_ease] rounded-2xl border border-emerald-200/25 bg-emerald-300/[0.06] p-5 text-center">
          {view.overallStatus === 'PARTIAL_COMPLETED' ? (
            <>
              <p className="text-lg font-black text-emerald-100">三柱命盤建立完成</p>
              <p className="mt-1 text-sm font-semibold text-white/60">目前未提供出生時辰；補充時辰後可建立完整四柱命盤。</p>
            </>
          ) : (
            <>
              <p className="text-lg font-black text-emerald-100">AI 八字命盤建立完成</p>
              <p className="mt-1 text-sm font-semibold text-white/60">專業排盤資料已完成運算與驗證。</p>
            </>
          )}
          <button
            type="button"
            onClick={onOpenResult}
            className="mt-4 w-full rounded-full border border-emerald-200/40 bg-emerald-300/15 py-3.5 text-base font-black text-emerald-50 transition hover:bg-emerald-300/25 active:scale-[0.99] sm:w-auto sm:px-10"
          >
            {view.overallStatus === 'PARTIAL_COMPLETED' ? '查看目前命盤' : '查看我的命盤'}
          </button>
        </div>
      )}
    </section>
  );
}

/** Final Gate 失敗畫面：不顯示半套假命盤 */
export function BaziGateFailed({ issues, onRetry, onCheckInput }: { issues: string[]; onRetry: () => void; onCheckInput: () => void }) {
  return (
    <section className="animate-[fadeIn_320ms_ease] rounded-[24px] border border-rose-300/25 bg-rose-500/[0.06] p-5 text-center sm:p-6">
      <p className="text-lg font-black text-rose-100">命盤尚未完成</p>
      <p className="mt-1 text-sm font-semibold text-white/55">排盤資料未通過驗證，未完成的命盤不會顯示。（{issues.slice(0, 2).join('；')}）</p>
      <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
        <button type="button" onClick={onRetry} className="rounded-full border border-rose-200/40 bg-rose-300/12 px-8 py-3 text-sm font-black text-rose-50 transition hover:bg-rose-300/20">重新分析</button>
        <button type="button" onClick={onCheckInput} className="rounded-full border border-white/15 bg-white/[0.05] px-8 py-3 text-sm font-black text-white/70 transition hover:text-white">檢查出生資料</button>
      </div>
    </section>
  );
}
