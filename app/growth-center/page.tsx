'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { buildGrowthCenterQuery } from '@/lib/growth-center-client';
import { GROWTH_MODULES } from '@/lib/growth-center-engine';
import type { GrowthCenterResult, GrowthElement, GrowthModuleId } from '@/lib/growth-center-engine';
import { WaterTreasureOrb, type ProductElement } from '@/components/bazi/customer/WaterTreasureOrb';
import starBeastsData from '@/data/star-beasts.json';
import { getProductOrbFromBrand } from '@/lib/five-element-orb-map';

type ApiResult = GrowthCenterResult & { requestId?: string };
type CheckInHistory = Record<string, string>;
type GrowthPreferenceId = 'daily' | 'weekly' | 'direct' | 'gentle' | 'career' | 'relationship' | 'wealth' | 'energy';

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
const GROWTH_ORB_ELEMENT: Record<GrowthElement, ProductElement> = Object.freeze({
  SPACE: getProductOrbFromBrand('space'), AIR: getProductOrbFromBrand('air'), WATER: getProductOrbFromBrand('water'), FIRE: getProductOrbFromBrand('fire'), EARTH: getProductOrbFromBrand('earth'),
});
const GROWTH_ORB_NAME: Record<GrowthElement, string> = {
  SPACE: '星淵虛空珠',
  AIR: '蒼嵐御風珠',
  WATER: '深海潮汐珠',
  FIRE: '燼星業火珠',
  EARTH: '地脈琥珀珠',
};
const GROWTH_ORB_CHAPTERS: Array<{
  element: GrowthElement;
  chapter: string;
  meaning: string;
  requiredModules: GrowthModuleId[];
  enabled: boolean;
}> = [
  { element: 'SPACE', chapter: '第一篇・八關試煉', meaning: '完整通過首頁八張分析，才取得第一顆寶珠。', requiredModules: ['number', 'ziwei', 'soul_match', 'music', 'nameology', 'bazi', 'zodiac', 'tarot'], enabled: true },
  { element: 'AIR', chapter: '第二篇・尚未開放', meaning: '完成第一篇後，等待下一組八關開放。', requiredModules: [], enabled: false },
  { element: 'WATER', chapter: '第三篇・尚未開放', meaning: '完成前一篇後，等待下一組八關開放。', requiredModules: [], enabled: false },
  { element: 'FIRE', chapter: '第四篇・尚未開放', meaning: '完成前一篇後，等待下一組八關開放。', requiredModules: [], enabled: false },
  { element: 'EARTH', chapter: '第五篇・尚未開放', meaning: '完成前一篇後，等待下一組八關開放。', requiredModules: [], enabled: false },
];
const CHECKIN_STORAGE_KEY = 'tdh_growth_checkin_history_v4';
const PREFERENCE_STORAGE_KEY = 'tdh_growth_preference_ids_v1';

const GROWTH_PREFERENCES: Array<{ id: GrowthPreferenceId; label: string; body: string }> = [
  { id: 'daily', label: '每日一句', body: '每天只給我一句提醒。' },
  { id: 'weekly', label: '每週任務', body: '一週一個任務就好。' },
  { id: 'direct', label: '直接明確', body: '少鋪陳，直接告訴我下一步。' },
  { id: 'gentle', label: '溫柔陪伴', body: '語氣柔和，先鼓勵再提醒。' },
  { id: 'career', label: '事業方向', body: '多提醒工作與行動。' },
  { id: 'relationship', label: '關係互動', body: '多提醒感情與溝通。' },
  { id: 'wealth', label: '財富節奏', body: '多提醒金錢與規劃。' },
  { id: 'energy', label: '能量補強', body: '多提醒狀態與五元素。' },
];

const PREFERENCE_IDS = new Set<GrowthPreferenceId>(GROWTH_PREFERENCES.map((item) => item.id));
const STAR_BEASTS = starBeastsData.items as Array<{ id: number; name: string; image: string; youngDivineImage: string; coreMeaning: string }>;
const MODULE_CARD_IDS: Record<string, number> = { number: 1, ziwei: 2, bazi: 3, nameology: 4, zodiac: 5, soul_match: 6, music: 7, tarot: 8 };
const WEEKLY_CARD_IDS = STAR_BEASTS.map((beast) => beast.id).filter((id) => !Object.values(MODULE_CARD_IDS).includes(id));

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

function readPreferences(): GrowthPreferenceId[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is GrowthPreferenceId => PREFERENCE_IDS.has(item as GrowthPreferenceId)) : [];
  } catch {
    return [];
  }
}

function writePreferences(preferences: GrowthPreferenceId[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preference memory is additive. If storage is blocked, the current session still responds.
  }
}

function scoreWidth(score: number | undefined) {
  return `${Math.max(4, Math.min(100, Math.round(score ?? 0)))}%`;
}

function parseIsoWeekKey(weekKey: string): { year: number; week: number } | null {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

function previousIsoWeekKey(weekKey: string): string | null {
  const parsed = parseIsoWeekKey(weekKey);
  if (!parsed) return null;
  if (parsed.week > 1) return `${parsed.year}-W${String(parsed.week - 1).padStart(2, '0')}`;
  return `${parsed.year - 1}-W52`;
}

function computeWeeklyStreak(history: CheckInHistory, currentWeekKey: string): number {
  const checkedInWeeks = new Set(
    Object.keys(history)
      .map((key) => key.split(':')[1])
      .filter((week): week is string => Boolean(week)),
  );
  let streak = 0;
  let cursor: string | null = currentWeekKey;
  while (cursor && checkedInWeeks.has(cursor)) {
    streak += 1;
    cursor = previousIsoWeekKey(cursor);
  }
  return streak;
}

function streakMilestone(streak: number): string {
  if (streak >= 12) return '🏆 連續 12 週：你已經是長期夥伴，AI 會持續加深每週判定的精準度。';
  if (streak >= 8) return '🏆 連續 8 週：節奏已經穩定，這是真正的養成中。';
  if (streak >= 4) return '🏅 連續 4 週：習慣正在養成，繼續保持。';
  if (streak >= 2) return `🔥 連續 ${streak} 週回來，AI 記得你走過的每一步。`;
  return '';
}

function greetingByHour(hour: number): string {
  if (hour < 5) return '這麼晚還在，辛苦了';
  if (hour < 11) return '早安';
  if (hour < 14) return '午安';
  if (hour < 18) return '午後好';
  if (hour < 22) return '晚安';
  return '夜深了，辛苦了';
}

export default function GrowthCenterPage() {
  const [data, setData] = useState<ApiResult['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkHistory, setCheckHistory] = useState<CheckInHistory>({});
  const [preferences, setPreferences] = useState<GrowthPreferenceId[]>([]);
  const [followUpAnswer, setFollowUpAnswer] = useState<'' | 'continued' | 'paused'>('');
  const [retryToken, setRetryToken] = useState(0);

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
    setPreferences(readPreferences());
    void loadGrowthCenter();
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  function handleRetry() {
    setRetryToken((token) => token + 1);
  }

  const progressPercent = useMemo(() => {
    if (!data) return 0;
    return Math.round((data.progress.completed / data.progress.total) * 100);
  }, [data]);

  const checkInKey = useMemo(() => {
    if (!data) return '';
    return `${data.longTermEcosystem.monthKey}:${data.weeklyReport.weekKey}:${data.personalizationSeed}`;
  }, [data]);

  const checkedIn = Boolean(checkInKey && checkHistory[checkInKey]);
  const monthCheckInCount = useMemo(() => {
    if (!data) return 0;
    return Object.keys(checkHistory).filter((key) => key.startsWith(data.longTermEcosystem.monthKey)).length;
  }, [checkHistory, data]);
  const lifetimeCheckInCount = useMemo(() => Object.keys(checkHistory).length, [checkHistory]);

  const weeklyStreak = useMemo(() => {
    if (!data) return 0;
    return computeWeeklyStreak(checkHistory, data.weeklyReport.weekKey);
  }, [checkHistory, data]);
  const isReturningAfterGap = lifetimeCheckInCount > 0 && weeklyStreak === 0;
  const greeting = useMemo(() => greetingByHour(new Date().getHours()), []);
  const completedModuleSet = useMemo(() => new Set(data?.progress.completedModules ?? []), [data]);
  const unlockedCardIds = useMemo(() => {
    const moduleCards = [...completedModuleSet].map((module) => MODULE_CARD_IDS[module]).filter((id): id is number => Boolean(id));
    const weeklyCards = WEEKLY_CARD_IDS.slice(0, lifetimeCheckInCount);
    return [...new Set([...moduleCards, ...weeklyCards])].sort((a, b) => a - b);
  }, [completedModuleSet, lifetimeCheckInCount]);
  const unlockedCards = useMemo(() => unlockedCardIds.map((id) => STAR_BEASTS.find((beast) => beast.id === id)).filter((beast): beast is typeof STAR_BEASTS[number] => Boolean(beast)), [unlockedCardIds]);
  const nextCard = STAR_BEASTS.find((beast) => !unlockedCardIds.includes(beast.id)) ?? null;
  const explorationBeastCount = Math.min(completedModuleSet.size, Object.keys(MODULE_CARD_IDS).length);
  const weeklyBeastCount = Math.max(0, unlockedCards.length - explorationBeastCount);
  const nextBeastMilestone = explorationBeastCount < 8
    ? `再完成 ${8 - explorationBeastCount} 張首頁探索卡，就能集齊第一階段 8 張幼體。`
    : nextCard
      ? checkedIn
        ? '本週任務已完成；下一張幼體會在下週新任務開啟後繼續累積。'
        : '八大探索已貫通；完成本週唯一任務，就能喚醒下一張幼體。'
      : '28 張星宿幼體已全數喚醒，下一階段將進入完整體覺醒。';
  const growthOrbChapters = useMemo(() => GROWTH_ORB_CHAPTERS.map((chapter) => {
    const completedRequirements = chapter.requiredModules.filter((moduleId) => completedModuleSet.has(moduleId));
    const unlocked = chapter.enabled && chapter.requiredModules.length === 8 && completedRequirements.length === 8;
    return { ...chapter, completedRequirements, unlocked, available: chapter.enabled && !unlocked };
  }), [completedModuleSet]);
  const collectedOrbCount = growthOrbChapters.filter((chapter) => chapter.unlocked).length;
  const activeOrbChapter = growthOrbChapters.find((chapter) => chapter.available) ?? growthOrbChapters.find((chapter) => !chapter.unlocked) ?? null;

  const followUpReply = data && followUpAnswer
    ? followUpAnswer === 'continued'
      ? data.followUp.replyWhenContinued
      : data.followUp.replyWhenPaused
    : null;

  const selectedPreferenceText = preferences.length > 0
    ? GROWTH_PREFERENCES.filter((item) => preferences.includes(item.id)).map((item) => item.label).join('、')
    : '尚未設定，先點 1 到 4 個你喜歡的陪伴方式。';

  function handleCheckIn() {
    if (!checkInKey) return;
    const next = { ...checkHistory, [checkInKey]: new Date().toISOString() };
    setCheckHistory(next);
    writeHistory(next);
  }

  function togglePreference(id: GrowthPreferenceId) {
    const next = preferences.includes(id)
      ? preferences.filter((item) => item !== id)
      : [...preferences, id].slice(-4);
    setPreferences(next);
    writePreferences(next);
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200">Growth Center</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">AI 個人成長中心</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[color:var(--text-sub)]">分析一次，終身陪伴。先給你今天最該做的一件事，其餘細節收起來。</p>
          </div>
          <Link href="/" className="feature-home-link feature-home-link--cyan shrink-0">返回首頁</Link>
        </header>

        {loading && (
          <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-5 shadow-[0_0_28px_rgba(34,211,238,0.1)]">
            <p className="text-sm font-black text-cyan-100">AI 正在整理你的本週陪伴內容</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">系統只讀取已完成的探索結果，不重新分析，不覆蓋原本資料。</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-2/3 animate-pulse rounded-full bg-cyan-300/70" /></div>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-5">
            <p className="text-base font-black text-rose-100">{error}</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">本頁不會影響任何分析卡片，可以直接重試。</p>
            <button type="button" onClick={handleRetry} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-rose-200/40 bg-rose-300/15 px-5 text-sm font-black text-rose-50 transition active:scale-[0.98] sm:w-auto">重新載入</button>
          </section>
        )}

        {data && (
          <div className="space-y-4">
            <p className="text-sm font-bold leading-6 text-[color:var(--text-sub)]">
              {greeting}{lifetimeCheckInCount > 0 ? `，這是你第 ${lifetimeCheckInCount} 次回來。` : '，很高興認識你。'}
            </p>

            <section className="rounded-2xl border border-rose-300/25 bg-rose-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-200">AI 陪伴承諾</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-rose-50">
                {lifetimeCheckInCount === 0
                  ? '第一次見面，AI 會記住你，不會催促你。'
                  : isReturningAfterGap
                    ? '好久不見，AI 一直都在，不用擔心中間空掉的時間。'
                    : weeklyStreak >= 2
                      ? `你已經連續 ${weeklyStreak} 週回來，AI 記得你走過的每一步。`
                      : '謝謝你回來，AI 記得你上一次的進度。'}
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-6 text-[color:var(--text-sub)]">🔒 資料只給你自己看，不對外公開。</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-6 text-[color:var(--text-sub)]">🚫 不會重新算命，只整理你已完成的結果。</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-6 text-[color:var(--text-sub)]">🤝 只判定方向，不保證結果，成果由你創造。</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-sm font-bold leading-6 text-[color:var(--text-sub)]">💛 不管你多久沒回來，AI 都不會催促或評判你。</p>
              </div>
              {weeklyStreak >= 2 && (
                <p className="mt-4 rounded-xl border border-amber-200/25 bg-amber-300/12 px-4 py-3 text-sm font-black leading-6 text-amber-100">{streakMilestone(weeklyStreak)}</p>
              )}
            </section>

            <section className="rounded-[28px] border border-amber-300/35 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),rgba(16,185,129,0.12)_42%,rgba(15,23,42,0.88)_100%)] p-5 shadow-[0_0_44px_rgba(251,191,36,0.16)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">本週核心</p>
                  <h2 className="mt-3 font-serif text-3xl font-black leading-tight text-amber-50 sm:text-4xl">{data.coreV2.firstScreen.headline}</h2>
                  <p className="mt-3 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{data.coreV2.firstScreen.body}</p>
                </div>
                <div className="shrink-0 rounded-2xl border border-amber-200/25 bg-black/20 px-4 py-3 text-center">
                  <p className="text-[10px] font-black tracking-[0.18em] text-amber-100/75">探索進度</p>
                  <p className="mt-1 font-serif text-4xl font-black leading-none text-amber-100">{data.coreV2.firstScreen.primaryMetric}</p>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-[color:var(--text-sub)]">{data.coreV2.firstScreen.status}</p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-cyan-300" style={{ width: `${progressPercent}%` }} /></div>
            </section>

            <section className="relative overflow-hidden rounded-[28px] border border-violet-300/30 bg-[radial-gradient(circle_at_50%_-8%,rgba(139,92,246,0.2),transparent_38%),linear-gradient(145deg,rgba(23,18,50,0.96),rgba(5,12,27,0.98))] p-4 shadow-[0_0_34px_rgba(109,40,217,0.14)] sm:p-5" aria-label="五元素成長寶珠收藏">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">五元素成長寶珠</p>
                  <h2 className="mt-2 text-xl font-black leading-7 text-violet-50">解開一篇，才取得一顆寶珠</h2>
                </div>
                <p className="shrink-0 font-serif text-3xl font-black text-amber-100">{collectedOrbCount}<span className="text-sm text-amber-100/55">/5</span></p>
              </div>
              <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">每一篇固定八關，八關全部通過才解封一顆；少一關，寶珠仍保持封印。第一篇會讀取首頁八張真實完成紀錄，離開再回來也會保留進度。</p>

              <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-3" aria-label="空風水火地五顆成長寶珠">
                {growthOrbChapters.map((chapter) => {
                  const element = chapter.element;
                  const productElement = GROWTH_ORB_ELEMENT[element];
                  return (
                    <article key={element} className={`min-w-0 rounded-2xl border px-1.5 py-2 text-center ${chapter.unlocked ? 'border-amber-200/30 bg-white/[0.055]' : chapter.available ? 'border-cyan-200/30 bg-cyan-300/[0.06]' : 'border-white/10 bg-black/20'}`}>
                      <div className="growth-center-orb-stage mx-auto" aria-hidden="true">
                        <WaterTreasureOrb element={productElement} released={chapter.unlocked} preview />
                      </div>
                      <p className={`mt-1 text-sm font-black ${chapter.unlocked ? 'text-amber-50' : 'text-slate-400'}`}>{productElement}</p>
                      <p className="truncate text-[9px] font-bold text-slate-400">{GROWTH_ORB_NAME[element]}</p>
                      <p className={`mt-1 text-[9px] font-black ${chapter.available ? 'text-cyan-200' : chapter.unlocked ? 'text-emerald-200' : 'text-slate-500'}`}>
                        {chapter.unlocked ? '已取得' : chapter.available ? `${chapter.completedRequirements.length}/8 關` : '封印中'}
                      </p>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.06] px-4 py-3">
                <p className="text-xs font-black text-cyan-100">{activeOrbChapter ? `目前篇章：${activeOrbChapter.chapter}・${GROWTH_ORB_NAME[activeOrbChapter.element]}` : collectedOrbCount === 1 ? '第一篇完成・第一顆寶珠已取得' : '五篇完成・五顆寶珠已全部取得'}</p>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-[color:var(--text-sub)]">
                  {activeOrbChapter
                    ? `${activeOrbChapter.meaning} 本篇已通過 ${activeOrbChapter.completedRequirements.length}/8 關；八關全部完成才會解封。`
                    : collectedOrbCount === 1
                      ? '首頁八張分析已完整貫通。其餘四顆維持封印，等下一篇八關正式開放，不會提前送出。'
                      : '所有篇章都已完成；後續每週任務會延續五元素方向，不會重新亂算。'}
                </p>
              </div>
            </section>

            <section className="growth-engagement-panel rounded-2xl border border-cyan-300/25 bg-cyan-300/8 p-5 shadow-[0_0_28px_rgba(34,211,238,0.1)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">今天只做一件事</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-cyan-50">{data.weeklyTask.title}</h2>
              <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-black/20 px-4 py-4 text-base font-black leading-8 text-cyan-50">{data.weeklyTask.task}</p>
              <p className="mt-3 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{data.weeklyTask.reason}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={handleCheckIn} disabled={checkedIn} className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.18)] transition active:scale-[0.98] disabled:bg-emerald-300 disabled:text-emerald-950 sm:w-auto">
                  {checkedIn ? '本週任務已收到' : '我今天會做這一件事'}
                </button>
                <span className="text-xs font-bold leading-6 text-[color:var(--text-muted)]">
                  本月回來 {monthCheckInCount} 次，累計 {lifetimeCheckInCount} 次。
                  {weeklyStreak >= 2 && <span className="ml-2 rounded-full border border-amber-200/30 bg-amber-300/12 px-2 py-0.5 text-amber-100">🔥 連續 {weeklyStreak} 週</span>}
                </span>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-amber-300/30 bg-[radial-gradient(circle_at_92%_12%,rgba(251,191,36,0.2),transparent_28%),linear-gradient(135deg,rgba(31,23,58,0.92),rgba(8,15,31,0.96))] p-5 shadow-[0_0_30px_rgba(251,191,36,0.12)]">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">二十八宿・星宿幼體收藏</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black leading-8 text-amber-50">完成一個階段，喚醒一張星宿幼體</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--text-sub)]">八張探索卡各自留下通關印記；完成探索與每週成長任務，才依序喚醒下一張幼體。既有進度會延續，不重新抽卡。</p>
                </div>
                <p className="shrink-0 font-serif text-4xl font-black text-amber-100">{unlockedCards.length}<span className="text-lg text-amber-100/60">/28</span></p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2" aria-label="二十八宿幼體收藏進度依據">
                <div className="rounded-xl border border-emerald-200/20 bg-emerald-300/[0.07] px-3 py-3">
                  <p className="text-[10px] font-black tracking-[0.14em] text-emerald-200">第一階段・八大探索</p>
                  <p className="mt-1 text-xl font-black text-emerald-50">{explorationBeastCount}<span className="text-xs text-emerald-100/55">/8 張</span></p>
                  <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-300">一張首頁卡，只留下自己的一枚通關印記。</p>
                </div>
                <div className="rounded-xl border border-cyan-200/20 bg-cyan-300/[0.07] px-3 py-3">
                  <p className="text-[10px] font-black tracking-[0.14em] text-cyan-200">第二階段・每週陪伴</p>
                  <p className="mt-1 text-xl font-black text-cyan-50">{weeklyBeastCount}<span className="text-xs text-cyan-100/55">/20 張</span></p>
                  <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-300">每週完成一次真實任務，依序喚醒下一張。</p>
                </div>
              </div>
              <p className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/[0.08] px-3 py-2.5 text-xs font-black leading-5 text-amber-100">{nextBeastMilestone}</p>
              <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-9">
                {STAR_BEASTS.map((beast) => {
                  const unlocked = unlockedCardIds.includes(beast.id);
                  return <div key={beast.id} className={`relative aspect-[275/480] overflow-hidden rounded-lg border ${unlocked ? 'border-amber-200/45 bg-slate-950' : 'border-white/10 bg-slate-950/55'}`} title={unlocked ? beast.name : '尚未解鎖'}>
                    {unlocked ? <img src={beast.youngDivineImage} alt={`${beast.name}星宿幼體`} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xs font-black text-white/35">？</span>}
                  </div>;
                })}
              </div>
              {nextCard && <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <img src={nextCard.youngDivineImage} alt="下一張待喚醒星宿幼體" className="h-16 w-11 rounded-md object-cover opacity-55" />
                <p className="text-sm font-bold leading-6 text-slate-200">下一張幼體：<span className="text-amber-100">{nextCard.name}</span><br /><span className="text-xs text-slate-400">完成下一個探索階段或本週成長任務，才會依序喚醒。</span></p>
              </div>}
              <Link href="/star-beasts" className="mt-4 inline-flex rounded-full border border-amber-200/35 px-4 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/10">查看完整神獸圖鑑</Link>
            </section>

            <section className="growth-preference-panel rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">我喜歡怎麼被陪伴</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-fuchsia-50">選你的偏好，AI 下次用你喜歡的方式提醒你。</h2>
              <p className="mt-2 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{selectedPreferenceText}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="成長中心喜好設定">
                {GROWTH_PREFERENCES.map((item) => {
                  const selected = preferences.includes(item.id);
                  return (
                    <button key={item.id} type="button" aria-pressed={selected} onClick={() => togglePreference(item.id)} className={`growth-preference-chip ${selected ? 'growth-preference-chip--selected' : ''}`}>
                      <span>{item.label}</span>
                      <small>{item.body}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">會員成長記憶</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-emerald-50">{data.coreV2.memberMemory.title}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-base font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.completedText}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-base font-bold leading-7 text-[color:var(--text-sub)]">{data.coreV2.memberMemory.missingText}</p>
                <p className="rounded-xl border border-white/10 bg-black/15 px-4 py-3 text-base font-black leading-7 text-emerald-50">{data.coreV2.memberMemory.currentFocus}</p>
              </div>
              <details className="growth-detail-drawer mt-3"><summary>資料使用說明</summary><p>{data.coreV2.memberMemory.noReanalysisPolicy}</p></details>
            </section>

            <section className="rounded-2xl border border-amber-300/25 bg-amber-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">本週能量色</p>
              <div className="mt-4 flex items-center gap-4">
                <span className="h-16 w-16 shrink-0 rounded-2xl border border-white/15 shadow-[0_0_24px_rgba(255,255,255,0.14)]" style={{ backgroundColor: data.weeklyEnergyColor.hex }} />
                <div>
                  <h2 className="text-2xl font-black text-amber-50">{data.weeklyEnergyColor.colorName}</h2>
                  <p className="mt-1 text-xs font-bold text-[color:var(--text-sub)]">對應：{ELEMENT_LABEL[data.weeklyEnergyColor.element]}</p>
                </div>
              </div>
              <p className="mt-4 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{data.weeklyEnergyColor.message}</p>
            </section>

            <section className="rounded-2xl border border-sky-300/25 bg-sky-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200">回來回報一下</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-sky-50">{data.followUp.prompt}</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {data.followUp.quickReplies.map((reply) => (
                  <button key={reply.id} type="button" onClick={() => setFollowUpAnswer(reply.id)} className={`min-h-[48px] rounded-xl border px-4 py-3 text-sm font-black transition ${followUpAnswer === reply.id ? 'border-sky-200 bg-sky-300/20 text-sky-50' : 'border-white/10 bg-black/15 text-[color:var(--text-sub)]'}`}>
                    {reply.label}
                  </button>
                ))}
              </div>
              {followUpReply && (
                <div className="mt-4 rounded-xl border border-sky-200/20 bg-black/20 p-4">
                  <p className="text-sm font-black text-sky-100">{followUpReply.title}</p>
                  <p className="mt-2 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{followUpReply.message}</p>
                  <p className="mt-3 rounded-lg border border-sky-200/15 bg-sky-300/8 px-3 py-2 text-xs font-black leading-6 text-sky-100">{followUpReply.nextStep}</p>
                </div>
              )}
              <details className="growth-detail-drawer mt-3"><summary>追蹤範圍說明</summary><p>{data.followUp.scopePolicy}</p></details>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">留給今天的一句話</p>
              <blockquote className="mt-4 font-serif text-2xl font-black leading-9 text-emerald-50">「{data.weeklyInspiration.quote}」</blockquote>
              <p className="mt-3 text-sm font-bold text-emerald-100">{data.weeklyInspiration.author} · {data.weeklyInspiration.role}</p>
              <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{data.weeklyInspiration.fit}</p>
              <details className="growth-detail-drawer mt-3"><summary>公開來源</summary><a href={data.weeklyInspiration.sourceUrl} target="_blank" rel="noreferrer">{data.weeklyInspiration.sourceName}</a></details>
            </section>

            <details className="growth-detail-drawer growth-detail-drawer--major">
              <summary>查看補強細節</summary>
              <section className="mt-4 rounded-2xl border border-amber-300/25 bg-black/15 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">AI 五元素核心</p>
                    <h2 className="mt-2 text-2xl font-black text-amber-50">{ELEMENT_LABEL[data.weeklyReinforcement.element]}</h2>
                    <p className="mt-1 text-xs font-bold text-[color:var(--text-sub)]">第二參考：{ELEMENT_LABEL[data.fiveElement.secondaryElement]}</p>
                  </div>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/12 text-xl font-black text-amber-100">{ELEMENT_BADGE[data.weeklyReinforcement.element]}</span>
                </div>
                <p className="mt-4 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{data.fiveElement.summary}</p>
                <div className="mt-4 space-y-3">
                  {ELEMENT_ORDER.map((element) => (
                    <div key={element}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-[color:var(--text-sub)]"><span>{ELEMENT_LABEL[element]}</span><span>{data.fiveElement.elementScore[element] ?? 0}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-emerald-300" style={{ width: scoreWidth(data.fiveElement.elementScore[element]) }} /></div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/8 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">本週陪伴流程</p>
                <div className="mt-4 grid gap-3">
                  {data.companionJourney.loop.map((item) => (
                    <div key={item.step} className="rounded-xl border border-white/10 bg-black/15 p-4">
                      <p className="text-[11px] font-black text-cyan-100">{item.step}. {item.title}</p>
                      <p className="mt-2 text-base font-semibold leading-7 text-[color:var(--text-sub)]">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            </details>

            <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">你的完整探索地圖</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-cyan-50">八張卡片，一次看懂進度與下一步。</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[color:var(--text-sub)]">點任何一張都能直接前往，AI 只整理已完成的結果，不重新分析。</p>
              <div className="growth-module-route-grid" aria-label="八張探索卡片連結">
                {GROWTH_MODULES.map((module, index) => {
                  const done = completedModuleSet.has(module.id);
                  const isNext = !done && module.id === data.nextStep.moduleId;
                  const state = done ? 'done' : isNext ? 'next' : 'pending';
                  const statusText = done ? '已完成' : isNext ? '下一步' : '待探索';
                  return (
                    <Link
                      key={module.id}
                      href={module.href}
                      className={`growth-module-route growth-module-route--${state}`}
                      aria-label={`${module.title}：${statusText}`}
                    >
                      <span className="growth-module-route__index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="growth-module-route__body">
                        <span className="growth-module-route__label">{module.title}</span>
                        <span className="growth-module-route__helper">{done ? '已寫入成長進度。' : module.evidence}</span>
                      </span>
                      <span className="growth-module-route__status">{statusText}</span>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/15 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">下一步</p>
              <p className="mt-3 text-base font-black leading-7 text-[color:var(--text-main)]">{data.nextStep.title}</p>
              <details className="growth-detail-drawer mt-2"><summary>資料使用說明</summary><p>{data.dataPolicy}</p></details>
              <Link href={data.nextStep.href} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-violet-300/25 bg-violet-300/12 px-5 py-3 text-sm font-black text-violet-100 transition hover:border-violet-200/50 hover:bg-violet-300/18">前往下一步</Link>
            </section>

            <footer className="pb-4 text-center text-[11px] font-semibold leading-6 text-[color:var(--text-muted)]">
              <details className="growth-detail-drawer growth-detail-drawer--footer">
                <summary>更新時間</summary>
                <p>本週內容：{data.weeklyReport.weekKey}</p>
                <p>下一次每週更新：{formatNextUpdate(data.nextWeeklyUpdateAt)}</p>
                <p>下一次每月更新：{formatNextUpdate(data.nextMonthlyUpdateAt)}</p>
              </details>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
