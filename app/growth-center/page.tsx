'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { buildGrowthCenterQuery } from '@/lib/growth-center-client';
import type { GrowthCenterResult, GrowthElement, GrowthModuleId } from '@/lib/growth-center-engine';

type ApiResult = GrowthCenterResult & { requestId?: string };

type CheckInHistory = Record<string, string>;

const MODULE_LABEL: Record<GrowthModuleId, string> = {
  nameology: '姓名學',
  ziwei: '紫微',
  number: '數字',
  soul_match: '配對',
  music: '音樂',
  bazi: '八字',
  zodiac: '\u661f\u5ea7',
};

const MODULE_ORDER: GrowthModuleId[] = ['nameology', 'ziwei', 'number', 'soul_match', 'music', 'bazi', 'zodiac'];

const ELEMENT_LABEL: Record<GrowthElement, string> = {
  EARTH: '地元素',
  WATER: '水元素',
  FIRE: '火元素',
  WIND: '風元素',
  SPACE: '空元素',
};

const ELEMENT_BADGE: Record<GrowthElement, string> = {
  EARTH: '地',
  WATER: '水',
  FIRE: '火',
  WIND: '風',
  SPACE: '空',
};

const UNLOCK_LABEL: Record<ApiResult['data']['progress']['unlockLevel'], string> = {
  empty: '等待資料',
  starter: '基礎陪伴',
  cross_module: '跨卡陪伴',
  complete: '完整陪伴',
};

const CHECKIN_STORAGE_KEY = 'tdh_growth_checkin_history_v4';

function formatNextUpdate(value: string) {
  return value.replace('T00:00:00+08:00', ' 00:00');
}

function readHistory(): CheckInHistory {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CHECKIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) as CheckInHistory : {};
  } catch {
    return {};
  }
}

function writeHistory(history: CheckInHistory) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Some mobile in-app browsers block localStorage. The page still works without persistence.
  }
}

export default function GrowthCenterPage() {
  const [data, setData] = useState<ApiResult['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkHistory, setCheckHistory] = useState<CheckInHistory>({});
  const [followUpAnswer, setFollowUpAnswer] = useState<'' | 'continued' | 'paused'>('');

  useEffect(() => {
    let cancelled = false;

    async function loadGrowthCenter() {
      setLoading(true);
      setError('');
      try {
        const params = buildGrowthCenterQuery();
        const response = await fetch(`/api/growth-center?${params.toString()}`, { cache: 'no-store' });
        const json = await response.json() as ApiResult & { error?: string };
        if (!response.ok || !json.success) throw new Error(json.error || '目前暫時無法取得本週成長提醒。');
        if (!cancelled) {
          setData(json.data);
          setFollowUpAnswer('');
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '目前暫時無法取得本週成長提醒。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setCheckHistory(readHistory());
    void loadGrowthCenter();
    return () => {
      cancelled = true;
    };
  }, []);

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    return Math.round((data.progress.completed / data.progress.total) * 100);
  }, [data]);

  const checkInKey = useMemo(() => {
    if (!data) return '';
    return `${data.longTermEcosystem.monthKey}:${data.weeklyReport.weekKey}:${data.personalizationSeed}`;
  }, [data]);

  const checkedIn = Boolean(checkInKey && checkHistory[checkInKey]);

  const followUpReply = data && followUpAnswer
    ? followUpAnswer === 'continued'
      ? data.followUp.replyWhenContinued
      : data.followUp.replyWhenPaused
    : null;

  const monthCheckInCount = useMemo(() => {
    if (!data) return 0;
    return Object.keys(checkHistory).filter((key) => key.startsWith(data.longTermEcosystem.monthKey)).length;
  }, [checkHistory, data]);

  const lifetimeCheckInCount = useMemo(() => Object.keys(checkHistory).length, [checkHistory]);

  function handleCheckIn() {
    if (!checkInKey) return;
    const next = { ...checkHistory, [checkInKey]: new Date().toISOString() };
    setCheckHistory(next);
    writeHistory(next);
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">Growth Center V4</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">
              AI 長期陪伴中心
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              每週一個提醒，每月一個主題，長期陪你完成小行動。這裡只做陪伴，不重新分析命理。
            </p>
          </div>
          <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white">
            回首頁
          </Link>
        </header>

        {loading && (
          <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5 shadow-[0_0_28px_rgba(34,211,238,0.1)]">
            <p className="text-sm font-black text-cyan-100">正在整理本週陪伴內容</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
              系統正在讀取已完成卡片的保存狀態，只做整合，不重新分析命理。
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full w-2/3 animate-pulse rounded-full bg-cyan-300/70" />
            </div>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5">
            <p className="text-sm font-black text-rose-100">{error}</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">請稍後重新整理，本頁不會影響六張卡片原本功能。</p>
          </section>
        )}

        {data && (
          <div className="space-y-4">
            <section className="rounded-[28px] border border-amber-300/35 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),rgba(16,185,129,0.12)_42%,rgba(15,23,42,0.88)_100%)] p-5 shadow-[0_0_44px_rgba(251,191,36,0.16)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">Growth Center Core V2</p>
                  <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-amber-50 sm:text-4xl">{data.coreV2.firstScreen.headline}</h2>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.coreV2.firstScreen.body}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-amber-200/25 bg-black/20 px-4 py-3 text-center">
                  <p className="text-[10px] font-black tracking-[0.18em] text-amber-100/75">本人探索</p>
                  <p className="mt-1 font-serif text-4xl font-black leading-none text-amber-100">{data.coreV2.firstScreen.primaryMetric}</p>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-[color:var(--text-sub)]">{data.coreV2.firstScreen.status}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                  <p className="text-xs font-black text-emerald-200">{data.coreV2.positioning.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.coreV2.positioning.principle}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                  <p className="text-xs font-black text-cyan-200">分工清楚</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.coreV2.positioning.roleSplit}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                  <p className="text-xs font-black text-violet-200">資料邊界</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.noReanalysisPolicy}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Member Memory</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-emerald-50">{data.coreV2.memberMemory.title}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.completedText}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.missingText}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-black leading-7 text-emerald-50">{data.coreV2.memberMemory.currentFocus}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Weekly Companion</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-cyan-50">本週只看最重要的一件事</h2>
              <div className="mt-4 grid gap-3">
                {[data.coreV2.weeklyCompanion.reminder, data.coreV2.weeklyCompanion.reinforcement, data.coreV2.weeklyCompanion.energyColor, data.coreV2.weeklyCompanion.task, data.coreV2.weeklyCompanion.quote].map((item) => (
                  <p key={item} className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{item}</p>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-sky-300/25 bg-sky-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">Follow-Up V2</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-sky-50">{data.coreV2.followUpPolicy.prompt}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.followUpPolicy.ifContinued}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.followUpPolicy.ifPaused}</p>
              </div>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{data.coreV2.followUpPolicy.boundary}</p>
            </section>
            <section className="rounded-2xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),rgba(15,23,42,0.72)_56%,rgba(2,6,23,0.92)_100%)] p-5 shadow-[0_0_34px_rgba(16,185,129,0.12)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">本週一句話</p>
                  <h2 className="mt-3 text-2xl font-black leading-9 text-emerald-50">{data.weeklyReport.oneLineReminder}</h2>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-cyan-100">
                  {UNLOCK_LABEL[data.progress.unlockLevel]}
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.progress.message}</p>
            </section>

            <section className="rounded-2xl border border-amber-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),rgba(15,23,42,0.74)_58%,rgba(2,6,23,0.94)_100%)] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">AI 長期陪伴生態系</p>
              <h2 className="mt-3 text-2xl font-black leading-9 text-amber-50">{data.longTermEcosystem.monthlyTheme}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.longTermEcosystem.monthlyFocus}</p>
              <p className="mt-3 rounded-xl border border-amber-200/20 bg-black/20 px-4 py-3 text-xs font-bold leading-6 text-amber-50">{data.longTermEcosystem.promise}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-center">
                  <p className="text-[10px] font-black tracking-[0.16em] text-[color:var(--text-muted)]">本月回訪</p>
                  <p className="mt-1 text-3xl font-black text-amber-100">{monthCheckInCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-center">
                  <p className="text-[10px] font-black tracking-[0.16em] text-[color:var(--text-muted)]">累積陪伴</p>
                  <p className="mt-1 text-3xl font-black text-emerald-100">{lifetimeCheckInCount}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-300/20 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">本週陪伴流程</p>
                  <h2 className="mt-2 text-xl font-black leading-8 text-cyan-50">{data.companionJourney.stage.label}</h2>
                </div>
                <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black text-cyan-100">
                  V4 陪伴
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.companionJourney.stage.description}</p>
              <div className="mt-4 grid gap-2">
                {data.companionJourney.loop.map((item) => (
                  <div key={item.step} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/10 text-sm font-black text-cyan-100">
                      {item.step}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black tracking-[0.16em] text-[color:var(--text-muted)]">{item.label}</p>
                      <h3 className="mt-1 text-sm font-black text-[color:var(--text-main)]">{item.title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">已完成卡片</p>
                  <p className="mt-2 font-serif text-5xl font-black leading-none text-[color:var(--text-main)]">
                    {data.progress.completed}<span className="text-2xl text-[color:var(--text-sub)]"> / {data.progress.total}</span>
                  </p>
                </div>
                <p className="text-right text-[11px] font-bold leading-5 text-[color:var(--text-muted)]">本週週期<br />{data.weeklyReport.weekKey}</p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.45)]" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {MODULE_ORDER.map((moduleId) => {
                  const done = data.progress.completedModules.includes(moduleId);
                  return (
                    <div key={moduleId} className={`rounded-xl border px-2 py-2 text-center ${done ? 'border-emerald-200/35 bg-emerald-300/12 text-emerald-50' : 'border-white/10 bg-black/10 text-[color:var(--text-muted)]'}`}>
                      <p className="text-xs font-black">{done ? '完成' : '未完成'}</p>
                      <p className="mt-1 text-[10px] font-semibold">{MODULE_LABEL[moduleId]}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-300/20 bg-amber-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">本週第一補強</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-200/25 bg-black/20 text-2xl font-black text-amber-50">
                  {ELEMENT_BADGE[data.weeklyReinforcement.element]}
                </span>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-amber-50">{data.weeklyReinforcement.label}</h2>
                  <p className="mt-1 text-xs font-bold text-[color:var(--text-sub)]">第二參考：{ELEMENT_LABEL[data.fiveElement.secondaryElement]}</p>
                </div>
              </div>
              <p className="mt-4 text-base font-black leading-8 text-[color:var(--text-main)]">{data.weeklyReinforcement.headline}</p>
              <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.weeklyReinforcement.reason}</p>
            </section>

            <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">本週能量色</p>
              <div className="mt-4 flex items-center gap-4">
                <span
                  className="block h-16 w-16 shrink-0 rounded-xl border border-white/20 shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                  style={{ backgroundColor: data.weeklyEnergyColor.hex }}
                />
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-cyan-50">{data.weeklyEnergyColor.colorName}</h2>
                  <p className="mt-1 font-mono text-xs font-bold text-cyan-100">{data.weeklyEnergyColor.hex}</p>
                  <p className="mt-1 text-xs font-bold text-[color:var(--text-sub)]">對應：{ELEMENT_LABEL[data.weeklyEnergyColor.element]}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.weeklyEnergyColor.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.weeklyEnergyColor.usage.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-bold text-[color:var(--text-sub)]">
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">本週行動任務</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-emerald-50">{data.weeklyTask.title}</h2>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-base font-black leading-8 text-[color:var(--text-main)]">
                {data.weeklyTask.task}
              </p>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.weeklyTask.reason}</p>
            </section>

            <section className="rounded-2xl border border-sky-300/20 bg-sky-300/8 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">AI 補強追蹤</p>
                  <h2 className="mt-3 text-2xl font-black leading-8 text-sky-50">{data.followUp.prompt}</h2>
                </div>
                <span className="shrink-0 rounded-full border border-sky-200/25 bg-sky-300/12 px-3 py-1 text-[10px] font-black text-sky-100">
                  Follow-Up
                </span>
              </div>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.followUp.scopePolicy}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {data.followUp.quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => setFollowUpAnswer(reply.id)}
                    className={`rounded-xl border px-4 py-3 text-sm font-black transition active:scale-[0.98] ${followUpAnswer === reply.id ? 'border-sky-200/45 bg-sky-300 text-slate-950 shadow-[0_0_22px_rgba(125,211,252,0.22)]' : 'border-white/10 bg-black/15 text-sky-50 hover:border-sky-200/30 hover:bg-sky-300/12'}`}
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
              {followUpReply && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-base font-black text-sky-50">{followUpReply.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{followUpReply.message}</p>
                  <p className="mt-3 rounded-lg border border-sky-200/15 bg-sky-300/8 px-3 py-2 text-xs font-black leading-6 text-sky-100">{followUpReply.nextStep}</p>
                  <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{followUpReply.improvement}</p>
                </div>
              )}
              <p className="mt-3 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{data.followUp.boundary}</p>
            </section>

            <section className="rounded-2xl border border-violet-300/20 bg-violet-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">本週成功激勵</p>
              <blockquote className="mt-3 text-xl font-black leading-8 text-violet-50">
                “{data.weeklyInspiration.quote}”
              </blockquote>
              <p className="mt-3 text-sm font-bold text-amber-100">{data.weeklyInspiration.author} · {data.weeklyInspiration.role}</p>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.weeklyInspiration.fit}</p>
              <a href={data.weeklyInspiration.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-bold text-cyan-200 underline-offset-4 hover:underline">
                查看公開來源：{data.weeklyInspiration.sourceName}
              </a>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">本月四週節奏</p>
              <div className="mt-4 grid gap-2">
                {data.longTermEcosystem.checkpoints.map((item) => (
                  <div key={item.week} className="rounded-xl border border-white/10 bg-black/15 p-3">
                    <p className="text-sm font-black text-[color:var(--text-main)]">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item.action}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-black/20 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">{data.companionJourney.checkIn.title}</p>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
                {checkedIn ? data.companionJourney.checkIn.completedText : data.companionJourney.checkIn.prompt}
              </p>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkedIn}
                className={`mt-4 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black transition active:scale-[0.98] ${checkedIn ? 'border border-emerald-200/25 bg-emerald-300/15 text-emerald-100' : 'border border-emerald-200/35 bg-emerald-300 text-slate-950 shadow-[0_0_24px_rgba(110,231,183,0.22)]'}`}
              >
                {checkedIn ? '本週已完成' : data.companionJourney.checkIn.buttonText}
              </button>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{data.companionJourney.checkIn.returnHint}</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/15 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">整合層狀態</p>
              <p className="mt-3 text-base font-black leading-7 text-[color:var(--text-main)]">{data.nextStep.title}</p>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{data.dataPolicy}</p>
              <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">System Stability Layer</p>
                    <p className="mt-1 text-sm font-black leading-6 text-emerald-50">{data.systemStability.principle}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-200/25 bg-emerald-300/12 px-3 py-1 text-[10px] font-black text-emerald-100">
                    {data.systemStability.status === 'ready' ? '穩定' : '檢查'}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {data.systemStability.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                      <span className={check.ok ? 'mt-0.5 text-xs font-black text-emerald-200' : 'mt-0.5 text-xs font-black text-rose-200'}>
                        {check.ok ? 'OK' : '!' }
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[color:var(--text-main)]">{check.label}</p>
                        <p className="mt-0.5 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-300/8 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">AI Action Guidance</p>
                    <p className="mt-1 text-sm font-black leading-6 text-violet-50">{data.copywritingStyle.actionGuidance.highestPrinciple}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-violet-200/25 bg-violet-300/12 px-3 py-1 text-[10px] font-black text-violet-100">
                    V1
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {data.copywritingStyle.actionGuidance.requiredSteps.map((step) => (
                    <div key={step.id} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2">
                      <p className="text-xs font-black text-violet-50">{step.title}</p>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{step.outputRule}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">每次陪伴都要給一個方向、一個行動、一份力量。</p>
              </div>
              <Link href={data.nextStep.href} className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-violet-300/25 bg-violet-300/12 px-5 py-3 text-sm font-black text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/18">
                前往下一步
              </Link>
            </section>

            <p className="pb-2 text-center text-[10px] font-semibold leading-5 text-[color:var(--text-muted)]">
              本週內容：{data.weeklyReport.weekKey}
              <br />
              下一次每週更新：{formatNextUpdate(data.nextWeeklyUpdateAt)}
              <br />
              下一次每月更新：{formatNextUpdate(data.nextMonthlyUpdateAt)}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
