'use client';

/**
 * 【五行星軌卡】獨立視覺卡（塔羅旁並排；功能與塔羅完全隔離）
 *
 * 鐵律（規格 §0/§4/§21/§22）：
 * - 不觸碰任何塔羅元件/狀態/邏輯；本卡無塔羅依賴。
 * - 五行數值只讀既有後端正式結果（八字每日分析紀錄之 elementStatistics）；
 *   Frontend/Adapter 零計算、零 AI 補值。
 * - 缺資料 → 節點仍在、數值顯示「—」；0 只有後端明確回傳 0 才顯示。
 * - 動畫一次性完成後靜態（無旋轉、無粒子、無 WebGL）。
 */

import { useEffect, useState } from 'react';
import { readDailyAnalysis } from '@/lib/daily-analysis-limit';
import { FiveElementOrbitCanvas, type OrbitNodeData } from './FiveElementOrbitCanvas';

const FIXED_ELEMENTS = ['木', '火', '土', '金', '水'];

/** Adapter：Backend Five Element Data → Orbit ViewModel（只做映射） */
function toOrbitNodes(percentages: Record<string, number> | null): OrbitNodeData[] {
  return FIXED_ELEMENTS.map((label) => ({
    label,
    value: percentages && typeof percentages[label] === 'number' ? percentages[label] : null,
    tenGodLabels: [], // 後端目前未提供「五行→十神」正式對應；未提供即不顯示，不得前端自行判定
  }));
}

export function FiveElementOrbitCard() {
  const [nodes, setNodes] = useState<OrbitNodeData[]>(() => toOrbitNodes(null));
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    try {
      // 既有後端正式結果：八字每日分析紀錄（localStorage 內為後端已驗證回傳值）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record = readDailyAnalysis<any>('bazi');
      const percentages = record?.result?.professionalChart?.elementStatistics?.percentages ?? null;
      if (percentages) {
        setNodes(toOrbitNodes(percentages));
        setHasData(true);
      }
    } catch {
      /* 讀取失敗 → 維持固定結構 + 「—」，不造假 */
    }
  }, []);

  return (
    <section
      aria-label="五行星軌"
      className="rounded-3xl border border-emerald-200/20 bg-gradient-to-b from-slate-950 via-emerald-950/10 to-slate-950 p-5 shadow-[0_0_30px_rgba(16,185,129,0.1)] sm:p-6"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/80">FIVE ELEMENT ORBIT</p>
      <h3 className="mt-1.5 font-serif text-xl font-black text-emerald-50 sm:text-2xl">五行星軌</h3>
      <p className="mt-1 text-xs font-semibold leading-5 text-white/50">相生相剋，一圖看見五行結構。</p>

      <div className="mt-3">
        <FiveElementOrbitCanvas nodes={nodes} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-white/45">
        <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 bg-emerald-300/70" />外圈相生</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-px w-5 bg-rose-300/60" />內星相剋</span>
      </div>

      {!hasData && (
        <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-center text-xs font-semibold leading-5 text-white/50">
          尚無你的五行資料——完成一次 AI 八字命盤後，這裡會顯示你的真實五行強弱。
        </p>
      )}
    </section>
  );
}
