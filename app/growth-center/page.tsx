'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { buildGrowthCenterQuery } from '@/lib/growth-center-client';
import type { GrowthCenterResult, GrowthModuleId } from '@/lib/growth-center-engine';

type ApiResult = GrowthCenterResult & { requestId?: string };

const MODULE_LABEL: Record<GrowthModuleId, string> = {
  nameology: '姓名',
  ziwei: '紫微',
  number: '數字',
  soul_match: '配對',
  music: '音樂',
  bazi: '八字',
};

const MODULE_ORDER: GrowthModuleId[] = ['nameology', 'ziwei', 'number', 'soul_match', 'music', 'bazi'];

export default function GrowthCenterPage() {
  const [data, setData] = useState<ApiResult['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadGrowthCenter() {
      setLoading(true);
      setError('');
      try {
        const params = buildGrowthCenterQuery();
        const response = await fetch(`/api/growth-center?${params.toString()}`, { cache: 'no-store' });
        const json = await response.json() as ApiResult & { error?: string };
        if (!response.ok || !json.success) throw new Error(json.error || '目前無法取得個人成長中心。');
        if (!cancelled) setData(json.data);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '目前無法取得個人成長中心。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadGrowthCenter();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">Growth Center V5</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">
              AI 個人成長中心
            </h1>
          </div>
          <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)]">
            回首頁
          </Link>
        </div>

        {loading && (
          <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-5">
            <p className="text-sm font-black text-cyan-100">正在整理您的本週成長指引...</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
              系統只讀取已完成模組，不重新計算原始命理結果。
            </p>
          </section>
        )}

        {error && (
          <section className="rounded-3xl border border-rose-300/25 bg-rose-500/10 p-5">
            <p className="text-sm font-black text-rose-100">{error}</p>
          </section>
        )}

        {data && (
          <div className="space-y-4">
            <section className="rounded-3xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),rgba(15,23,42,0.72)_56%,rgba(2,6,23,0.92)_100%)] p-5 shadow-[0_0_34px_rgba(16,185,129,0.12)]">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">您的探索進度</p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <p className="font-serif text-5xl font-black text-emerald-50">
                  {data.progress.completed}
                  <span className="text-2xl text-[color:var(--text-sub)]">／6</span>
                </p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-cyan-100">
                  {data.progress.unlockLevel === 'complete' ? '完整報告' : data.progress.unlockLevel === 'cross_module' ? '跨模組總覽' : data.progress.unlockLevel === 'basic' ? '基礎摘要' : '待解鎖'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {MODULE_ORDER.map((moduleId) => {
                  const done = data.progress.completedModules.includes(moduleId);
                  return (
                    <div key={moduleId} className="text-center">
                      <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black ${done ? 'border-emerald-200 bg-emerald-300/20 text-emerald-50' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-muted)]'}`}>
                        {done ? '✓' : '○'}
                      </div>
                      <p className="mt-1 text-[10px] font-semibold text-[color:var(--text-sub)]">{MODULE_LABEL[moduleId]}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.progress.message}</p>
            </section>

            <section className="rounded-3xl border border-amber-300/20 bg-amber-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-200">本週核心主題</p>
              <h2 className="mt-3 text-2xl font-black text-amber-50">{data.weeklyReport.coreTheme}</h2>
              <p className="mt-3 text-base font-black leading-8 text-[color:var(--text-main)]">{data.weeklyReport.primaryAction}</p>
              <p className="mt-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-amber-100">
                {data.weeklyReport.affirmation}
              </p>
            </section>

            <section className="rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">五元素補強結果</p>
              <p className="mt-3 text-sm font-black leading-7 text-cyan-50">{data.fiveElement.summary}</p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[color:var(--text-muted)]">本月能量色</p>
              <div className="mt-4 flex items-center gap-4">
                <span
                  className="block h-16 w-16 shrink-0 rounded-2xl border border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                  style={{ backgroundColor: data.monthlyEnergyColor.hex }}
                />
                <div>
                  <h2 className="text-2xl font-black text-[color:var(--text-main)]">{data.monthlyEnergyColor.colorName}</h2>
                  <p className="mt-1 font-mono text-xs font-bold text-cyan-100">{data.monthlyEnergyColor.hex}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.monthlyEnergyColor.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.monthlyEnergyColor.usage.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-bold text-[color:var(--text-sub)]">
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-violet-300/20 bg-violet-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-violet-200">下一步</p>
              <p className="mt-3 text-base font-black leading-7 text-violet-50">{data.nextStep.title}</p>
              <Link href={data.nextStep.href} className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-violet-300/25 bg-violet-300/12 px-5 py-3 text-sm font-black text-violet-100">
                前往下一步
              </Link>
            </section>

            <p className="pb-2 text-center text-[10px] font-semibold leading-5 text-[color:var(--text-muted)]">
              本週更新：{data.weeklyReport.weekKey}，下次週更新：{data.weeklyReport.nextUpdateAt}
              <br />
              本月更新：{data.monthlyEnergyColor.monthKey}，下次月更新：{data.nextMonthlyUpdateAt}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
