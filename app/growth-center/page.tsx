'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { buildGrowthCenterQuery } from '@/lib/growth-center-client';
import type { GrowthCenterResult, GrowthElement, GrowthModuleId } from '@/lib/growth-center-engine';

type ApiResult = GrowthCenterResult & { requestId?: string };
type CheckInHistory = Record<string, string>;

const MODULE_LABEL: Record<GrowthModuleId, string> = {
  nameology: 'AI 姓名學',
  ziwei: 'AI 紫微斗數',
  number: 'AI 數字論吉凶',
  soul_match: 'AI 靈魂配對',
  music: 'AI 生命音樂',
  bazi: 'AI 八字命盤',
  zodiac: 'AI 西洋星座',
  tarot: 'AI 塔羅牌',
};

const MODULE_ORDER: GrowthModuleId[] = ['nameology', 'ziwei', 'number', 'soul_match', 'music', 'bazi', 'zodiac', 'tarot'];

const ELEMENT_LABEL: Record<GrowthElement, string> = {
  AIR: '風元素',
  SPACE: '空元素',
  WATER: '水元素',
  FIRE: '火元素',
  EARTH: '地元素',
};

const ELEMENT_BADGE: Record<GrowthElement, string> = {
  AIR: '風',
  SPACE: '空',
  WATER: '水',
  FIRE: '火',
  EARTH: '地',
};

const ELEMENT_ORDER: GrowthElement[] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];

const UNLOCK_LABEL: Record<ApiResult['data']['progress']['unlockLevel'], string> = {
  empty: '尚未開始',
  starter: '建立中',
  cross_module: '整合中',
  complete: '已解鎖',
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

function scoreWidth(score: number | undefined) {
  return `${Math.max(4, Math.min(100, Math.round(score ?? 0)))}%`;
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
        if (!response.ok || !json.success) throw new Error(json.error || '目前無法載入 AI 成長中心，請稍後再試。');
        if (!cancelled) {
          setData(json.data);
          setFollowUpAnswer('');
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '目前無法載入 AI 成長中心，請稍後再試。');
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
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">Growth Center</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">
              AI 個人成長中心
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              分析一次，終身陪伴。這裡只整理已完成的分析，給你本週最重要的一個方向。
            </p>
          </div>
          <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white">
            返回首頁
          </Link>
        </header>

        {loading && (
          <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5 shadow-[0_0_28px_rgba(34,211,238,0.1)]">
            <p className="text-sm font-black text-cyan-100">AI 正在整理你的本週陪伴內容</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
              系統只讀取已完成的探索結果，不重新分析，不覆蓋原本資料。
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full w-2/3 animate-pulse rounded-full bg-cyan-300/70" />
            </div>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5">
            <p className="text-sm font-black text-rose-100">{error}</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">請稍後重新進入，本頁不會影響任何分析卡片。</p>
          </section>
        )}

        {data && (
          <div className="space-y-4">
            <section className="rounded-[28px] border border-amber-300/35 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),rgba(16,185,129,0.12)_42%,rgba(15,23,42,0.88)_100%)] p-5 shadow-[0_0_44px_rgba(251,191,36,0.16)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">本週核心</p>
                  <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-amber-50 sm:text-4xl">{data.coreV2.firstScreen.headline}</h2>
                  <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.coreV2.firstScreen.body}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-amber-200/25 bg-black/20 px-4 py-3 text-center">
                  <p className="text-[10px] font-black tracking-[0.18em] text-amber-100/75">探索進度</p>
                  <p className="mt-1 font-serif text-4xl font-black leading-none text-amber-100">{data.coreV2.firstScreen.primaryMetric}</p>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-[color:var(--text-sub)]">{data.coreV2.firstScreen.status}</p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-cyan-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">會員成長記憶</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-emerald-50">{data.coreV2.memberMemory.title}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.completedText}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.missingText}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-black leading-7 text-emerald-50">{data.coreV2.memberMemory.currentFocus}</p>
              </div>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{data.coreV2.memberMemory.noReanalysisPolicy}</p>
            </section>

            <section className="rounded-2xl border border-amber-300/25 bg-black/15 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">AI 五元素核心</p>
                  <h2 className="mt-2 text-2xl font-black text-amber-50">{ELEMENT_LABEL[data.weeklyReinforcement.element]}</h2>
                  <p className="mt-1 text-xs font-bold text-[color:var(--text-sub)]">第二參考：{ELEMENT_LABEL[data.fiveElement.secondaryElement]}</p>
                </div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/12 text-xl font-black text-amber-100">
                  {ELEMENT_BADGE[data.weeklyReinforcement.element]}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {ELEMENT_ORDER.map((element) => (
                  <div key={element}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-[color:var(--text-sub)]">
                      <span>{ELEMENT_LABEL[element]}</span>
                      <span>{data.fiveElement.elementScore[element] ?? 0}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-emerald-300" style={{ width: scoreWidth(data.fiveElement.elementScore[element]) }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.fiveElement.summary}</p>
            </section>

            <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">本週陪伴流程</p>
              <div className="mt-4 grid gap-3">
                {data.companionJourney.loop.map((item) => (
                  <div key={item.step} className="rounded-xl border border-white/10 bg-black/15 p-4">
                    <p className="text-[11px] font-black text-cyan-100">{item.step}. {item.title}</p>
                    <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-violet-300/25 bg-violet-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">本週一件任務</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-violet-50">{data.weeklyTask.title}</h2>
              <p className="mt-4 rounded-xl border border-violet-200/20 bg-black/20 px-4 py-4 text-base font-black leading-8 text-violet-50">{data.weeklyTask.task}</p>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.weeklyTask.reason}</p>
            </section>

            <section className="rounded-2xl border border-sky-300/25 bg-sky-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">Follow-Up 追蹤</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-sky-50">{data.followUp.prompt}</h2>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.followUp.scopePolicy}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {data.followUp.quickReplies.map((reply) => (
                  <button
                    key={reply.id}
                    type="button"
                    onClick={() => setFollowUpAnswer(reply.id)}
                    className={`rounded-xl border px-4 py-3 text-sm font-black transition ${followUpAnswer === reply.id ? 'border-sky-200 bg-sky-300/20 text-sky-50' : 'border-white/10 bg-black/15 text-[color:var(--text-sub)]'}`}
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
              {followUpReply && (
                <div className="mt-4 rounded-xl border border-sky-200/20 bg-black/20 p-4">
                  <p className="text-sm font-black text-sky-100">{followUpReply.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{followUpReply.message}</p>
                  <p className="mt-3 rounded-lg border border-sky-200/15 bg-sky-300/8 px-3 py-2 text-xs font-black leading-6 text-sky-100">{followUpReply.nextStep}</p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-amber-300/25 bg-amber-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">本週能量色</p>
              <div className="mt-4 flex items-center gap-4">
                <span className="h-16 w-16 shrink-0 rounded-2xl border border-white/15 shadow-[0_0_24px_rgba(255,255,255,0.14)]" style={{ backgroundColor: data.weeklyEnergyColor.hex }} />
                <div>
                  <h2 className="text-2xl font-black text-amber-50">{data.weeklyEnergyColor.colorName}</h2>
                  <p className="mt-1 font-mono text-xs font-bold text-amber-100">{data.weeklyEnergyColor.hex}</p>
                  <p className="mt-1 text-xs font-bold text-[color:var(--text-sub)]">對應：{ELEMENT_LABEL[data.weeklyEnergyColor.element]}</p>
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{data.weeklyEnergyColor.message}</p>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">成功人士一句話</p>
              <blockquote className="mt-4 font-serif text-2xl font-black leading-9 text-emerald-50">“{data.weeklyInspiration.quote}”</blockquote>
              <p className="mt-3 text-sm font-bold text-emerald-100">{data.weeklyInspiration.author} · {data.weeklyInspiration.role}</p>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.weeklyInspiration.fit}</p>
              <a href={data.weeklyInspiration.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-bold text-cyan-200 underline-offset-4 hover:underline">
                查看公開來源：{data.weeklyInspiration.sourceName}
              </a>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">每週簽到</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-[color:var(--text-main)]">{data.companionJourney.checkIn.title}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
                {checkedIn ? data.companionJourney.checkIn.completedText : data.companionJourney.checkIn.prompt}
              </p>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkedIn}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/12 px-5 py-3 text-sm font-black text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/18 disabled:opacity-60"
              >
                {checkedIn ? '本週已完成' : data.companionJourney.checkIn.buttonText}
              </button>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">本月簽到 {monthCheckInCount} 次，累計 {lifetimeCheckInCount} 次。</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/15 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">下一步</p>
              <p className="mt-3 text-base font-black leading-7 text-[color:var(--text-main)]">{data.nextStep.title}</p>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{data.dataPolicy}</p>
              <Link href={data.nextStep.href} className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-violet-300/25 bg-violet-300/12 px-5 py-3 text-sm font-black text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/18">
                前往下一步
              </Link>
            </section>

            <footer className="pb-4 text-center text-[11px] font-semibold leading-6 text-[color:var(--text-muted)]">
              本週內容：{data.weeklyReport.weekKey}<br />
              下一次每週更新：{formatNextUpdate(data.nextWeeklyUpdateAt)}<br />
              下一次每月更新：{formatNextUpdate(data.nextMonthlyUpdateAt)}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
