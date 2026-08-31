'use client';

import { useMemo, useState, useDeferredValue, useEffect, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { injectPerformanceCSS } from '@/lib/performance-css';
import AiTrustFeedback from '@/components/AiTrustFeedback';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import NextStepGuide from '@/components/NextStepGuide';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { SHICHEN_LIST } from '@/lib/shichen-engine';
import { saveUserData, loadUserData } from '@/lib/storage';
import { getCompletedGrowthModules, markGrowthModuleCompleted } from '@/lib/growth-center-client';
import type { GrowthElement } from '@/lib/growth-center-engine';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage, IDENTITY_TARGET_UPDATED_EVENT } from '@/lib/identity-split-client';
import FeatureVisitorCounter from '@/components/FeatureVisitorCounter';
import TaijiTopShell3D from '@/components/taiji/TaijiTopShell3D';
import TodayDirectionQuest from '@/components/TodayDirectionQuest';
import MegaInputGuide from '@/components/MegaInputGuide';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import { enforceAiCopywritingTone } from '@/lib/ai-copywriting-style-center';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import FineDiningServiceProgress from '@/components/FineDiningServiceProgress';
import TarotEntryCard from '@/features/tarot/components/TarotEntryCard';
import { markPendingRoute, recoverFromChunkError } from '@/lib/chunk-recovery';
import { safeJsonFetch } from '@/lib/safe-fetch';
import { curateExperienceContent } from '@/lib/experience-content-curator';
import { evaluateExperienceQualityGate, getFriendlyQualityGateError } from '@/lib/experience-quality-gate';
import type { NumberAnalysisResponse } from '@/lib/number-core-engine';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';
import { getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

/* 全站停用中的死碼元件（見 TaijiStandaloneCard.tsx 內註解）：改成動態載入，
   避免它與依賴的 UnifiedTaijiCore（約 1,300 行 TSX + CSS module）進入首屏 bundle。 */
const TaijiStandaloneCard = dynamic(() => import('@/components/TaijiStandaloneCard'), { ssr: false });

interface PersonInput {
  name: string;
  birthDate: string;
  bloodType: 'A' | 'B' | 'AB' | 'O';
  gender: 'male' | 'female';
  shichen: number | 'unknown' | null;
}

interface MatchZones {
  resonance: string[];
  complement: string[];
  grinding: string[];
  conflict: string[];
}

interface MatchResult {
  match_score: number;
  resonance: number;
  communication: number;
  stability: number;
  conflict_risk: number;
  summary: string;
  zones: MatchZones;
}

interface KarmaStory {
  resonance_score: number;
  active_giver: string;
  needs_understanding: string;
  relationship_theme: string;
  story: string;
  today_advice: string;
  closing_wisdom: string;
  personA_star?: string;
  personB_star?: string;
  iching_hexagram?: string;
}

type NumberAnalysisResult = NumberAnalysisResponse & { fiveElement?: FiveElementIntegrationResult };

type MatchDailyResult = {
  data: MatchResponse;
  personA: PersonInput;
  personB: PersonInput;
  isUnlocked: boolean;
};

type NumberDailyResult = {
  result: NumberAnalysisResult;
  value: string;
};
type AnalysisJobPublicStatus = 'IDLE' | 'VALIDATING' | 'QUEUED' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

type AnalysisJobPublic = {
  jobId: string;
  status: AnalysisJobPublicStatus;
  progressStage: string;
  progressPercent: number | null;
  message: string;
  resultId: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type AnalysisJobApiResponse = { ok: boolean; success?: boolean; data?: AnalysisJobPublic; message?: string; error?: string };
type AnalysisResultApiResponse<T> = { ok: boolean; success?: boolean; data?: T; message?: string; error?: string };
type SystemStatus = 'idle' | 'validating' | 'loading' | 'success' | 'recovering' | 'error';

type EvolutionStage = 'idle' | 'taiji' | 'liangyi' | 'sixiang' | 'bagua';

type EvolutionConfig = {
  clickCount: 1 | 2 | 4 | 8;
  stage: EvolutionStage;
  label: string;
  description: string;
  durationMs: number;
};
const EVOLUTION_CONFIG: Record<1 | 2 | 4 | 8, EvolutionConfig> = {
  1: {
    clickCount: 1,
    stage: 'taiji',
    label: '太極',
    description: '核心甦醒 · 黑白氣息呼吸',
    durationMs: 1200,
  },
  2: {
    clickCount: 2,
    stage: 'liangyi',
    label: '兩儀',
    description: '陰陽分離 · 同源雙旋',
    durationMs: 1600,
  },
  4: {
    clickCount: 4,
    stage: 'sixiang',
    label: '四象',
    description: '老陽少陰 · 少陽老陰',
    durationMs: 2000,
  },
  8: {
    clickCount: 8,
    stage: 'bagua',
    label: '八卦',
    description: '乾兌離震 · 巽坎艮坤',
    durationMs: 2400,
  },
};

const FORTUNE_MODAL_PATH = '/numerology';

const BAGUA_SYMBOLS = [
  ['乾', '☰'],
  ['兌', '☱'],
  ['離', '☲'],
  ['震', '☳'],
  ['巽', '☴'],
  ['坎', '☵'],
  ['艮', '☶'],
  ['坤', '☷'],
] as const;

const HOME_SIGNAL_METRICS = [
  { label: '即時人氣', value: 'LIVE', tone: 'cyan' },
  { label: '易經命理艙', value: '4 核同步', tone: 'rose' },
  { label: '數字解碼', value: '1 秒啟動', tone: 'amber' },
] as const;

const HOME_COMMAND_STATUS = [
  ['靈魂配對', '雙人命盤待命'],
  ['人格聲波', '赫茲矩陣在線'],
  ['深度洞察', '紫微星曜同步'],
  ['數字好壞', '太極八卦已啟封'],
] as const;

const HOME_QUICK_NAV = [
  { href: '/numerology', icon: '數', label: '易經論數字', tone: 'cyan' },
  { href: '/insight', icon: '紫', label: '紫微深度洞察', tone: 'indigo' },
  { href: '/bazi', icon: '八', label: '八字命盤', tone: 'emerald' },
  { href: '/zodiac', icon: '星', label: '西洋星座', tone: 'fuchsia' },
  { href: '/tarot', icon: '牌', label: '塔羅占問', tone: 'amber' },
] as const;

// 桌機（24 吋等寬螢幕）右側「快速切換」功能按鍵：2026-08-28 依指示恢復顯示
const SHOW_DESKTOP_QUICK_NAV = true;
// 行動版右側「功能」按鈕依需求隱藏；要恢復把這裡改回 true 即可
const SHOW_MOBILE_QUICK_NAV = false;

function HomeQuickNavigation() {
  return (
    <>
      {SHOW_DESKTOP_QUICK_NAV && (
        <aside
          aria-label="命理功能快速入口"
          className="fixed right-4 top-1/2 z-30 hidden w-14 -translate-y-1/2 flex-col items-center gap-2 rounded-3xl border border-white/10 bg-slate-950/75 px-2 py-3 shadow-[0_16px_45px_rgba(2,6,23,0.42)] backdrop-blur-xl min-[1280px]:flex"
        >
          <span className="mb-1 text-[9px] font-black tracking-[0.18em] text-white/45 [writing-mode:vertical-rl]">快速切換</span>
          {HOME_QUICK_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-label={item.label}
              title={item.label}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-sm font-black text-white/90 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/70 hover:bg-cyan-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90"
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="sr-only">{item.label}</span>
            </Link>
          ))}
        </aside>
      )}

      {SHOW_MOBILE_QUICK_NAV && (
        <details className="group fixed right-2 top-1/2 z-30 -translate-y-1/2 min-[1280px]:hidden">
          <summary className="grid h-12 w-12 cursor-pointer list-none place-items-center rounded-2xl border border-cyan-200/35 bg-slate-950/90 text-[11px] font-black tracking-[0.12em] text-cyan-100 shadow-[0_10px_28px_rgba(2,6,23,0.42)] backdrop-blur-xl transition hover:border-cyan-100/70 [&::-webkit-details-marker]:hidden">
            功能
          </summary>
          <nav aria-label="命理功能快速入口" className="absolute right-0 top-[-7.25rem] flex w-40 flex-col gap-1.5 rounded-2xl border border-white/15 bg-slate-950/95 p-2 shadow-[0_16px_44px_rgba(2,6,23,0.5)] backdrop-blur-xl">
            {HOME_QUICK_NAV.map((item) => (
              <Link key={item.href} href={item.href} prefetch className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-white/85 transition hover:bg-cyan-300/12 hover:text-cyan-50">
                <span className="grid h-6 w-6 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-xs text-cyan-100" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </details>
      )}
    </>
  );
}

interface PersonDisplay {
  name: string;
  zodiacZh: string;
  chineseZodiac: string;
  wuxing: string;
  bloodType: string;
}

interface MatchResponse {
  result: MatchResult;
  displayA: PersonDisplay;
  displayB: PersonDisplay;
  karma_story?: KarmaStory;
  karmaRelation?: {
    nameHarmony: number;
    birthdayAlignment: number;
    bloodTypeCompatibility: number;
    wuxingAlignment: number;
    zodiacHarmony: number;
    shichenBalance: number;
    personalityResonance: number;
    personalityComplementarity: number;
    personalityConflict: number;
    overallResonance: number;
    activePerson: 'A' | 'B' | 'equal';
    needsUnderstanding: 'A' | 'B' | 'mutual';
    painPoint: string;
    painPointIntensity: number;
    deepPain: string;
    harshTruth: string;
    warmthFactor: string;
    emotionalArc: string;
    storyTwist: string;
  };
}

function buildPersonalizedPracticeLine(data: MatchResponse) {
  const personAName = data.displayA.name || '第一位';
  const personBName = data.displayB.name || '第二位';
  const karma = data.karmaRelation;
  const conflictRisk = data.result.conflict_risk;
  const matchScore = data.result.match_score;
  const activeName = karma?.activePerson === 'A'
    ? personAName
    : karma?.activePerson === 'B'
      ? personBName
      : '你們彼此';
  const needsUnderstandingName = karma?.needsUnderstanding === 'A'
    ? personAName
    : karma?.needsUnderstanding === 'B'
      ? personBName
      : '彼此';
  const mainPractice = conflictRisk >= 65
    ? '先放下爭輸贏的執念，把話說慢、把界線說清楚'
    : matchScore >= 75
      ? '把善意落在日常行動裡，讓好的共鳴不只停在感覺'
      : '先從改過自新做起，願意看見自己在關係裡的慣性';
  const connectionPractice = (karma?.overallResonance ?? matchScore) >= 70
    ? '這段緣分已有可貴的相應力'
    : '這段緣分更需要耐心修正相處節奏';
  const painPoint = karma?.painPoint ? `，尤其要留意「${karma.painPoint}」` : '';

  return `對${personAName}與${personBName}而言，順天不是硬求結果，而是順著善念修正自己；${connectionPractice}${painPoint}。改命的第一步，是${activeName}願意先跨出「${mainPractice}」的行動，也讓${needsUnderstandingName}被真正理解。當你們願意改過自新、廣結善緣、放下執念，關係就會從消耗走向清明。`;
}

type StepKey = 'personA-base' | 'personA-shichen' | 'personB-base' | 'personB-shichen' | 'review';
type SelectionConfirm = { bloodType: boolean; gender: boolean };

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const;
const EMPTY: PersonInput = { name: '', birthDate: '', bloodType: 'A', gender: 'female', shichen: null };
const EMPTY_SELECTION_CONFIRM: SelectionConfirm = { bloodType: false, gender: false };
const SHOW_HOME_EMBEDDED_MATCH = false;
const SHOW_HOME_FLOATING_NUMBER_BUTTON = false;
const GROWTH_VIP_TOTAL_MODULES = 8;
const USE_TAIJI_EXPERIENCE_CORE_V7 = process.env.NEXT_PUBLIC_TAIJI_EXPERIENCE_CORE_V7 !== '0';

const BLOOD_DESC: Record<PersonInput['bloodType'], string> = {
  A: '細膩穩定，重視秩序與安全感。',
  B: '自主鮮明，節奏感強，較有個人風格。',
  AB: '理性感性並存，觀察力與距離感並行。',
  O: '主動直接，行動力高，帶動感明顯。',
};

const STEP_ORDER: StepKey[] = ['personA-base', 'personA-shichen', 'personB-base', 'personB-shichen', 'review'];

function getPersonError(label: string, person: PersonInput, selectionConfirm?: SelectionConfirm) {
  if (person.name.trim().length < 2) return `請先輸入${label}姓名，至少 2 個字。`;
  if (!person.birthDate) return `請先完成${label}的萬年曆生日推算。`;
  if (selectionConfirm && !selectionConfirm.bloodType) return `請點選${label}血型。`;
  if (selectionConfirm && !selectionConfirm.gender) return `請點選${label}性別。`;
  return '';
}

function ElderChoiceCard({
  active,
  title,
  description,
  onClick,
  tone,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
  tone: 'violet' | 'amber' | 'pink' | 'cyan';
}) {
  const tones = {
    violet: active
      ? 'border-violet-400 bg-violet-500/20 text-violet-100 shadow-[0_0_20px_rgba(109,74,255,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-violet-500/30',
    amber: active
      ? 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(201,162,74,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-amber-500/30',
    pink: active
      ? 'border-pink-400 bg-pink-500/20 text-pink-100 shadow-[0_0_20px_rgba(215,139,255,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-pink-500/30',
    cyan: active
      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-cyan-500/30',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-300 neon-card-hover holo-card-container relative overflow-hidden ${tones[tone]}`}
    >
      <div className="holo-shine" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <p className="text-lg font-bold">{title}</p>
        <span className={`choice-signal ${active ? 'choice-signal--done' : 'choice-signal--idle'}`}>
          {active ? '已選' : '點選'}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)] relative z-10">{description}</p>
    </button>
  );
}

function NumberTicker({ value }: { value: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(value);
      return;
    }

    const duration = 1000; // 1秒
    const startTime = performance.now();

    let frameId = 0;

    function updateNumber(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        frameId = requestAnimationFrame(updateNumber);
      }
    }

    frameId = requestAnimationFrame(updateNumber);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{count}</>;
}

function mapAnalysisJobStatus(status?: AnalysisJobPublicStatus): SystemStatus {
  if (status === 'VALIDATING') return 'validating';
  if (status === 'QUEUED' || status === 'PROCESSING' || status === 'FINALIZING') return 'loading';
  if (status === 'FAILED' || status === 'TIMEOUT' || status === 'CANCELLED') return 'error';
  if (status === 'COMPLETED') return 'success';
  return 'loading';
}

function getAnalysisJobPollDelay(elapsedMs: number) {
  if (elapsedMs < 15_000) return 1_000;
  if (elapsedMs < 60_000) return 2_000;
  return 5_000;
}

async function requestNumberFortuneDirect(payload: string, signal: AbortSignal) {
  let result: Awaited<ReturnType<typeof safeJsonFetch<NumberAnalysisResult | { ok: false; message?: string }>>> | null = null;
  let lastError: unknown = null;
  const endpoints = ['/api/number-fortune', '/api/number/analyze'];

  for (const endpoint of endpoints) {
    try {
      result = await safeJsonFetch<NumberAnalysisResult | { ok: false; message?: string }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal,
        timeoutMs: endpoint === endpoints[0] ? 12_000 : 8_000,
        retries: endpoint === endpoints[0] ? 1 : 0,
      });
      if (result.ok && result.data?.ok) return result.data as NumberAnalysisResult;
      if (result.status >= 400 && result.status < 500) {
        const message = result.data && 'message' in result.data && result.data.message
          ? result.data.message
          : '\u76ee\u524d\u7121\u6cd5\u5b8c\u6210\u6578\u5b57\u5206\u6790\uff0c\u8acb\u78ba\u8a8d\u8f38\u5165 4 \u78bc\u30016 \u78bc\u6216 10 \u78bc\u963f\u62c9\u4f2f\u6578\u5b57\u5f8c\u518d\u8a66\u4e00\u6b21\u3002';
        throw new Error(message);
      }
    } catch (error) {
      lastError = error;
      if (signal.aborted) throw error;
    }
  }

  throw lastError ?? new Error('NUMBER_FORTUNE_REQUEST_FAILED');
}

async function requestNumberFortuneByJob(payload: string, signal: AbortSignal, onStatus: (job: AnalysisJobPublic) => void) {
  const idempotencyKey = (() => {
    try {
      const parsed = JSON.parse(payload) as { value?: string; mode?: string };
      return ['number', parsed.mode ?? '', parsed.value ?? '', Date.now()].join(':');
    } catch {
      return 'number:' + Date.now();
    }
  })();
  const parsedPayload = JSON.parse(payload) as { value: string; mode: string };
  const created = await safeJsonFetch<AnalysisJobApiResponse>('/api/analysis/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisType: 'number',
      idempotencyKey,
      sessionId: 'number-fortune-browser',
      inputData: parsedPayload,
    }),
    signal,
    timeoutMs: 10_000,
    retries: 1,
  });

  if (!created.ok || !created.data?.ok || !created.data.data?.jobId) {
    throw new Error(created.data?.message || created.data?.error || 'JOB_CREATE_FAILED');
  }

  const startedAt = performance.now();
  let job = created.data.data;
  onStatus(job);

  while (!signal.aborted) {
    if (job.status === 'COMPLETED' && job.resultId) {
      let lastResultMessage = 'RESULT_NOT_READY';
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await safeJsonFetch<AnalysisResultApiResponse<NumberAnalysisResult>>('/api/analysis/results/' + job.resultId, {
          signal,
          timeoutMs: 10_000,
          retries: 1,
        });
        if (result.ok && result.data?.ok && result.data.data) return result.data.data;
        lastResultMessage = result.data?.message || result.data?.error || lastResultMessage;
        if (signal.aborted || (result.status && result.status >= 500)) break;
        await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
      }
      throw new Error(lastResultMessage);
    }

    if (job.status === 'FAILED' || job.status === 'TIMEOUT' || job.status === 'CANCELLED') {
      throw new Error(job.errorMessage || job.message || '\u76ee\u524d\u66ab\u6642\u7121\u6cd5\u5b8c\u6210\u6578\u5b57\u5206\u6790\u3002');
    }

    const elapsed = performance.now() - startedAt;
    if (elapsed > 60_000) throw new Error('NUMBER_JOB_TIMEOUT');
    await new Promise((resolve) => window.setTimeout(resolve, getAnalysisJobPollDelay(elapsed)));

    const next = await safeJsonFetch<AnalysisJobApiResponse>('/api/analysis/jobs/' + job.jobId, {
      signal,
      timeoutMs: 10_000,
      retries: 1,
    });
    if (!next.ok || !next.data?.ok || !next.data.data) throw new Error(next.data?.message || next.data?.error || 'JOB_STATUS_FAILED');
    job = next.data.data;
    onStatus(job);
  }

  throw new Error('REQUEST_ABORTED');
}

function getNumberFortuneLoadingCopy(status: SystemStatus, job?: AnalysisJobPublic | null) {
  const stage = job?.progressStage;
  if (status === 'validating' || stage === 'VALIDATING_INPUT') {
    return {
      label: '\u7cfb\u7d71\u5df2\u6536\u5230\u8cc7\u6599',
      detail: '\u6b63\u5728\u78ba\u8a8d\u4f60\u8f38\u5165\u7684\u662f\u5f8c 4 \u78bc\u30016 \u78bc\u30018 \u78bc\u6216\u5b8c\u6574 10 \u78bc\u624b\u6a5f\u865f\u78bc\u3002',
      activeStep: 0,
    };
  }
  if (status === 'recovering') {
    return {
      label: '\u6b63\u5728\u81ea\u52d5\u91cd\u9023\u904b\u7b97\u7ba1\u9053',
      detail: '\u7cfb\u7d71\u6703\u4fdd\u7559\u4f60\u7684\u8f38\u5165\uff0c\u6539\u7528\u5099\u63f4 API \u7e7c\u7e8c\u5b8c\u6210\u5206\u6790\u3002',
      activeStep: 1,
    };
  }
  if (stage === 'BUILDING_RESULT' || status === 'success') {
    return {
      label: '\u904b\u7b97\u5b8c\u6210\uff0c\u6b63\u5728\u6574\u7406\u7d50\u8ad6',
      detail: '\u6b63\u5728\u628a\u5409\u51f6\u5206\u6578\u3001\u4e94\u5143\u7d20\u7f3a\u53e3\u8207\u624b\u93c8\u88dc\u5f37\u5efa\u8b70\u6574\u7406\u6210\u5bb9\u6613\u770b\u61c2\u7684\u7d50\u679c\u3002',
      activeStep: 2,
    };
  }
  return {
    label: '\u6b63\u5728\u57f7\u884c\u771f\u5be6\u5f8c\u7aef\u904b\u7b97',
    detail: job?.message || '\u5f8c\u7aef\u6b63\u5728\u8a08\u7b97\u6578\u5b57\u77e9\u9663\u3001\u5409\u51f6\u7b49\u7d1a\u8207\u4e94\u5143\u7d20\u88dc\u5f37\u65b9\u5411\u3002',
    activeStep: 1,
  };
}

function getNumberFineDiningState(status: SystemStatus, job?: AnalysisJobPublic | null) {
  if (status === 'error') return 'error';
  if (status === 'success' || job?.status === 'COMPLETED') return 'completed';
  if (job?.status === 'FINALIZING' || job?.progressStage === 'BUILDING_RESULT') return 'quality_check';
  if (job?.status === 'PROCESSING' || status === 'loading') return 'cook';
  if (job?.status === 'QUEUED' || status === 'recovering') return 'prepare';
  if (status === 'validating' || job?.status === 'VALIDATING') return 'order';
  return 'idle';
}

function getNumberQualityGateResult(result: NumberAnalysisResult) {
  return evaluateExperienceQualityGate({
    inputComplete: Boolean(result.value || result.valueMasked),
    sourceVerified: Boolean(result.ruleVersion),
    engineCompleted: result.ok === true,
    resultComplete: Boolean(result.summary && result.advice && result.level),
    semanticDedupCompleted: true,
    mobileLayoutPassed: true,
    sensitiveDataSanitized: !/\d{7,}/.test(result.valueMasked || result.value || ''),
  });
}
function getNumberFortuneAura(level?: string) {
  if (level === '大吉' || level === '吉' || level === '次吉') {
    return {
      stage: 24,
      label: '24 階吉勢光場',
      blessing: '吉勢光場已開啟，數字結構呈現較強支撐。',
      taijiClass:
        'border-amber-200/70 shadow-[0_0_34px_rgba(253,230,138,0.78),0_0_90px_rgba(245,158,11,0.52),0_0_150px_rgba(255,255,255,0.22)]',
      resultClass:
        'number-aura-card number-aura-card--great border-amber-300/60 bg-amber-950/20 shadow-[0_0_42px_rgba(251,191,36,0.28),inset_0_0_24px_rgba(253,230,138,0.08)]',
      badgeClass: 'border-amber-200/50 bg-amber-300/20 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.42)]',
      textClass: 'text-amber-100',
    } as const;
  }

  if (level === '吉中帶凶' || level === '中平' || level === '凶中帶吉') {
    return {
      stage: 12,
      label: '12 階轉化光場',
      blessing: '轉化光場已開啟，重點在把順勢與阻力分清楚。',
      taijiClass:
        'border-emerald-300/60 shadow-[0_0_30px_rgba(52,211,153,0.48),0_0_76px_rgba(34,211,238,0.26)]',
      resultClass:
        'number-aura-card number-aura-card--good border-emerald-300/45 bg-emerald-950/15 shadow-[0_0_32px_rgba(16,185,129,0.2),inset_0_0_18px_rgba(52,211,153,0.06)]',
      badgeClass: 'border-emerald-300/45 bg-emerald-400/16 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.34)]',
      textClass: 'text-emerald-100',
    } as const;
  }

  if (level === '平下' || level === '凶' || level === '大凶' || level === '最凶') {
    return {
      stage: 3,
      label: '3 階守成光場',
      blessing: '守成光場已亮起，重點在降低風險、先穩住節奏。',
      taijiClass:
        'border-cyan-300/55 shadow-[0_0_24px_rgba(34,211,238,0.42),0_0_60px_rgba(139,92,246,0.2)]',
      resultClass:
        'number-aura-card number-aura-card--half border-cyan-300/38 bg-cyan-950/16 shadow-[0_0_26px_rgba(34,211,238,0.16),inset_0_0_16px_rgba(34,211,238,0.05)]',
      badgeClass: 'border-cyan-300/40 bg-cyan-400/14 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]',
      textClass: 'text-cyan-100',
    } as const;
  }

  return {
    stage: 0,
    label: '',
    blessing: '',
    taijiClass: '',
    resultClass: 'border-cyan-500/25 bg-cyan-950/20',
    badgeClass: '',
    textClass: 'text-cyan-100',
  } as const;
}

function getNumberFortuneGradePresentation(result: NumberAnalysisResult) {
  const level = result.level;
  const score = result.finalScore;

  if (level === '大吉' || score >= 90) {
    return {
      title: '大吉登峰，吉勢主場',
      subtitle: '數字結構進入強支撐區，優先承接順勢推進。',
      badge: '易經後端判定｜最高吉勢',
      frameClass: 'border-amber-200/60 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.32),transparent_42%),linear-gradient(135deg,rgba(69,42,8,0.68),rgba(8,13,28,0.96))] shadow-[0_0_42px_rgba(251,191,36,0.28),inset_0_0_28px_rgba(253,230,138,0.09)]',
      badgeClass: 'border-amber-200/55 bg-amber-300/18 text-amber-100',
      titleClass: 'text-amber-100 drop-shadow-[0_0_18px_rgba(251,191,36,0.46)]',
      scoreClass: 'text-amber-100',
    } as const;
  }

  if (level === '吉' || level === '次吉' || score >= 76) {
    return {
      title: '吉勢成局，順勢可攻',
      subtitle: '數字能量具備明確支撐，行動方向可以更果斷。',
      badge: '易經後端判定｜強吉等級',
      frameClass: 'border-emerald-200/45 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.26),transparent_44%),linear-gradient(135deg,rgba(6,78,59,0.45),rgba(8,13,28,0.96))] shadow-[0_0_34px_rgba(16,185,129,0.22),inset_0_0_24px_rgba(52,211,153,0.07)]',
      badgeClass: 'border-emerald-200/45 bg-emerald-300/14 text-emerald-100',
      titleClass: 'text-emerald-100 drop-shadow-[0_0_14px_rgba(52,211,153,0.34)]',
      scoreClass: 'text-emerald-100',
    } as const;
  }

  if (level === '吉中帶凶' || level === '中平' || level === '凶中帶吉' || score >= 46) {
    return {
      title: '吉凶交戰，轉勢在手',
      subtitle: '數字結構同時有推力與阻力，關鍵在先分清順逆。',
      badge: '易經後端判定｜轉化等級',
      frameClass: 'border-cyan-200/42 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.24),transparent_44%),linear-gradient(135deg,rgba(14,116,144,0.36),rgba(8,13,28,0.96))] shadow-[0_0_30px_rgba(34,211,238,0.18),inset_0_0_22px_rgba(34,211,238,0.06)]',
      badgeClass: 'border-cyan-200/42 bg-cyan-300/12 text-cyan-100',
      titleClass: 'text-cyan-100 drop-shadow-[0_0_14px_rgba(34,211,238,0.32)]',
      scoreClass: 'text-cyan-100',
    } as const;
  }

  return {
    title: '凶勢已現，先穩後破',
    subtitle: '數字風險訊號偏強，當前第一任務是降風險、穩節奏。',
    badge: '易經後端判定｜警戒等級',
    frameClass: 'border-rose-200/48 bg-[radial-gradient(circle_at_50%_0%,rgba(251,113,133,0.28),transparent_42%),linear-gradient(135deg,rgba(76,5,25,0.52),rgba(8,13,28,0.96))] shadow-[0_0_34px_rgba(244,63,94,0.22),inset_0_0_24px_rgba(251,113,133,0.07)]',
    badgeClass: 'border-rose-200/48 bg-rose-300/14 text-rose-100',
    titleClass: 'text-rose-100 drop-shadow-[0_0_14px_rgba(251,113,133,0.34)]',
    scoreClass: 'text-rose-100',
  } as const;
}

function NumberFortuneGradeBanner({ result }: { result: NumberAnalysisResult }) {
  const grade = getNumberFortuneGradePresentation(result);

  return (
    <div className={`relative overflow-hidden rounded-[28px] border p-5 text-center ${grade.frameClass}`}>
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10 opacity-40" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full border border-white/10 opacity-25" />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.2em] ${grade.badgeClass}`}>
          {grade.badge}
        </span>
        <h4 className={`font-serif text-3xl font-black leading-tight sm:text-4xl ${grade.titleClass}`}>
          {grade.title}
        </h4>
        <p className="max-w-xl text-xs font-bold leading-6 text-cyan-50/76">
          {grade.subtitle}
        </p>

        <div className="mt-1 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 sm:flex-row sm:gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Final Score</p>
            <p className={`mt-1 font-mono text-6xl font-black leading-none ${grade.scoreClass}`}>{result.finalScore}</p>
          </div>
          <div className="hidden h-14 w-px bg-white/10 sm:block" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Fortune Level</p>
            <p className="mt-2 text-2xl font-black text-amber-100">{result.level}</p>
            <p className="mt-1 text-[10px] font-bold text-white/45">10 級吉凶分級 · 規則版本 {result.ruleVersion}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
type NumberFortuneLayerMaterial = {
  layer: string;
  title: string;
  professionalMaterial: string;
  aiInput: string;
  aiOutput: string;
  handoff: string;
  checkpoints: string[];
};

const NUMBER_FORTUNE_DIMENSION_LABELS = {
  wealth: '財富資源',
  career: '事業推進',
  love: '感情互動',
  family: '家庭承載',
  social: '人際連結',
  health: '身心節奏',
  growth: '成長突破',
  risk: '風險訊號',
  pressure: '壓力密度',
  stability: '穩定基礎',
} as const;

const NUMBER_FORTUNE_THREE_LAYER_MATERIAL: NumberFortuneLayerMaterial[] = [
  {
    layer: '第一層',
    title: '專業數字結構底盤',
    professionalMaterial:
      '建立數字本體資料：輸入位數、總和、根數、頭尾碼、後四碼、奇偶比例、高低位比例、連號、鏡像、重複、相鄰組合與三連結構。',
    aiInput:
      '只讀取使用者輸入與 Number Core Engine 的 evidence / indexes / matrix 原始資料。',
    aiOutput:
      '輸出可稽核的數字命盤底稿，不做 易經解讀，不直接給補強建議。',
    handoff:
      '交給第二層時，只交付已完成的數字結構、吉凶分級、分數矩陣與證據清單。',
    checkpoints: ['位數模式正確', '重複與連號可追溯', '吉凶分級有規則版本', '不得跳過後端運算'],
  },
  {
    layer: '第二層',
    title: '易經白話解讀轉譯',
    professionalMaterial:
      '把第一層的財富、事業、感情、家庭、人際、健康、成長、風險、壓力、穩定十項矩陣轉成一般使用者看得懂的語義。',
    aiInput:
      '第二層只讀第一層，不重新計算數字，不改動原始分數。',
    aiOutput:
      '輸出數字故事、優勢區、警訊區、當前節奏與可執行提醒。',
    handoff:
      '交給第三層時，只交付已完成的解讀摘要、優勢、注意事項與方向語句。',
    checkpoints: ['解讀必須對應矩陣', '不可模糊跳結論', '優勢與風險分開呈現', '不得重算第一層'],
  },
  {
    layer: '第三層',
    title: '易經補強排序方案',
    professionalMaterial:
      '依第二層解讀與五元素 Integration Layer 結果，明確排列第一補強、第二補強、第三補強，形成可執行方向。',
    aiInput:
      '第三層只讀第二層與五元素整合結果，不回頭改命盤、不重新分析數字。',
    aiOutput:
      '輸出明確判定：目前最需要補強的方向、後續排序與行動建議。',
    handoff:
      'SELF 可交給 易經個人成長中心留存；OTHER 僅保留單次分析，不寫入會員核心資料。',
    checkpoints: ['第一補強明確', '第二第三依序排列', '不保證人生結果', '自己與親友資料分流'],
  },
];

function getNumberFortuneCustomerAction(result: NumberAnalysisResult) {
  if (result.level.includes('凶')) return '先降風險，今天不做衝動決策。';
  if (result.level.includes('平')) return '先穩住節奏，完成一件小事。';
  return '把握順勢，今天完成一個行動。';
}

function NumberFortuneThreeLayerCard({
  result,
  mode = 'input',
}: {
  result?: NumberAnalysisResult | null;
  mode?: 'input' | 'result';
}) {
  const matrixEntries = Object.entries(result?.matrix ?? {}) as Array<[keyof typeof NUMBER_FORTUNE_DIMENSION_LABELS, number]>;
  const strongestDimensions = [...matrixEntries].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const watchDimensions = [...matrixEntries].sort((a, b) => a[1] - b[1]).slice(0, 3);
  const evidence = result?.evidence;
  const activeValue = result?.valueMasked || result?.value || '等待輸入';
  const grade = result ? getNumberFortuneGradePresentation(result) : null;
  const curatedStrengths = result ? curateExperienceContent(result.strengths ?? [], 2) : null;
  const curatedCautions = result ? curateExperienceContent(result.cautions ?? [], 1) : null;
  const layerCaption = mode === 'result'
    ? '第一眼只保留結論，完整資料收合。'
    : '輸入數字後，後端會整理成三層結果。';
  const cardClassName = [
    'rounded-[26px] border border-amber-200/20',
    'bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.86),rgba(8,13,28,0.96))]',
    'p-4 shadow-[0_0_28px_rgba(251,191,36,0.12)]',
    mode === 'result' ? 'relative z-10' : 'mt-4 mb-4',
  ].join(' ');

  return (
    <div className={cardClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200">易經三層判定</p>
          <h4 className="mt-2 font-serif text-xl font-black leading-tight text-cyan-50">數字規則 → 易經卜卦判定 → 今日行動</h4>
          <p className="mt-2 text-xs font-semibold leading-6 text-cyan-100/72">{layerCaption}</p>
        </div>
        <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-black text-cyan-100">
          手機優先
        </span>
      </div>

      <div
        className="mt-4 flex h-10 items-center justify-center gap-3 rounded-2xl border border-cyan-300/10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_56%),rgba(15,23,42,0.28)] shadow-[inset_0_0_22px_rgba(34,211,238,0.055)]"
        aria-hidden="true"
        data-number-layer-count={NUMBER_FORTUNE_THREE_LAYER_MATERIAL.length}
      >
        {NUMBER_FORTUNE_THREE_LAYER_MATERIAL.map((item, index) => (
          <span
            key={item.layer}
            className="h-1.5 w-8 rounded-full border border-cyan-200/20 bg-cyan-200/25 shadow-[0_0_14px_rgba(34,211,238,0.18)]"
            style={{ opacity: 0.34 + index * 0.16 }}
          />
        ))}
      </div>

      {result && grade && (
        <div className="mt-4 space-y-3">
          <section className="rounded-[24px] border border-emerald-200/25 bg-emerald-300/10 p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">第一層｜易經最終判定</p>
            <h5 className={`mt-2 font-serif text-2xl font-black leading-tight ${grade.titleClass}`}>{grade.title}</h5>
            <p className="mt-2 text-sm font-bold leading-7 text-cyan-50/85">{grade.subtitle}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
              <span className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2 text-cyan-100">{activeValue}</span>
              <span className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2 text-amber-100">{result.level}</span>
              <span className="rounded-2xl border border-white/10 bg-black/20 px-2 py-2 text-cyan-100">{result.finalScore} 分</span>
            </div>
            <p className="mt-3 rounded-2xl border border-amber-200/20 bg-amber-300/10 p-3 text-sm font-black leading-7 text-amber-100">
              立即行動：{getNumberFortuneCustomerAction(result)}
            </p>
          </section>

          <details className="overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/45 p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-black leading-7 text-cyan-100">
              <span>第二層｜查看 易經精華</span>
              <span className="text-[11px] text-cyan-100/60">3 個重點</span>
            </summary>
            <div className="mt-3 grid gap-2 text-xs font-semibold leading-6 text-cyan-50/82">
              {(curatedStrengths?.items ?? []).map((item) => (
                <p key={item} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">優勢：{item}</p>
              ))}
              <p className="rounded-xl border border-white/10 bg-white/[0.04] p-3">提醒：{curatedCautions?.primary || '今天以穩定節奏為先。'}</p>
            </div>
          </details>

          <details className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-black leading-7 text-amber-100">
              <span>第三層｜老師模式</span>
              <span className="text-[11px] text-amber-100/60">展開完整資料</span>
            </summary>
            <div className="mt-3 grid gap-3 text-xs leading-6 text-cyan-100/82 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="font-black text-amber-200">數字證據</p>
                <p>規則版本：{result.ruleVersion}</p>
                {evidence && (
                  <p>根數 {evidence.rootNumber}｜總和 {evidence.digitSum}｜重複 {evidence.repeatPatterns.length}｜連號 {evidence.sequencePatterns.length}</p>
                )}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="font-black text-amber-200">矩陣摘要</p>
                <p>優勢：{strongestDimensions.map(([key, value]) => `${NUMBER_FORTUNE_DIMENSION_LABELS[key]} ${value}`).join('、') || '等待矩陣'}</p>
                <p>補強：{watchDimensions.map(([key, value]) => `${NUMBER_FORTUNE_DIMENSION_LABELS[key]} ${value}`).join('、') || '等待矩陣'}</p>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
function ScoreRow({ label, score, tone }: { label: string; score: number; tone: 'violet' | 'amber' | 'cyan' | 'pink' }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 80);
    return () => clearTimeout(timer);
  }, [score]);

  const gradients = {
    violet: 'linear-gradient(90deg, #6D4AFF, #A78BFA)',
    amber: 'linear-gradient(90deg, #C9A24A, #F4C95D)',
    cyan: 'linear-gradient(90deg, #22D3EE, #6EE7F9)',
    pink: 'linear-gradient(90deg, #EC4899, #F9A8D4)',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[color:var(--text-sub)]">{label}</span>
        <span className="text-sm font-semibold text-[color:var(--text-main)]">
          <NumberTicker value={score} />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${width}%`, background: gradients[tone] }} 
        />
      </div>
    </div>
  );
}

function CelestialAstrolabe() {
  return (
    <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex items-center justify-center shrink-0">
      {/* 自轉的星曆八卦盤 */}
      <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
        <svg className="w-full h-full text-cyan-400/40" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="6 3" />
          
          {/* 四正位爻標記 */}
          <line x1="50" y1="8" x2="50" y2="12" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50" y1="88" x2="50" y2="92" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="50" x2="12" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <line x1="88" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="1.5" />
          
          {/* 內部太極雙魚陰陽 */}
          <path d="M 50 16 A 17 17 0 0 0 50 50 A 17 17 0 0 1 50 84 A 34 35 0 0 1 50 16 Z" fill="currentColor" className="text-cyan-500/15" />
          <circle cx="50" cy="33" r="3.5" fill="currentColor" className="text-cyan-400" />
          <circle cx="50" cy="67" r="3.5" fill="currentColor" className="text-slate-950" />
        </svg>
      </div>
      {/* 逆向旋轉的金光環 */}
      <div className="absolute inset-2 animate-[spin_12s_linear_infinite_reverse]">
        <svg className="w-full h-full text-amber-400/25" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 6" />
        </svg>
      </div>
      {/* 中心發光天樞點 */}
      <div className="absolute w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
      <div className="absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
    </div>
  );
}

function AnalyticalConsole({
  nameA,
  nameB,
  birthA,
  birthB,
}: {
  nameA: string;
  nameB: string;
  birthA: string;
  birthB: string;
}) {
  const [logs, setLogs] = useState<string[]>([]);

  const fullLogs = useMemo(() => [
    `[SYSTEM] 讀取「天宿」星宮：第一位 ${nameA || '本體'} (${birthA || '吉時'})`,
    `[SYSTEM] 讀取「天宿」星宮：第二位 ${nameB || '客體'} (${birthB || '吉時'})`,
    `[CALCULATOR] 映射「地脈」血型引力場關係矩陣... OK`,
    `[VOICE] 聲學頻率模型提取：合成 432Hz 靈魂能量音訊共鳴... READY`,
    `[DECRYPT] 映射「人和」緣分課題... 正在寫入 VIP 加密天宿數據艙`,
    `[易經] 分析完成，正在載入最終配對結果...`
  ], [nameA, nameB, birthA, birthB]);

  useEffect(() => {
    setLogs([]);
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < fullLogs.length) {
        setLogs((prev) => [...prev, fullLogs[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400);
    return () => clearInterval(interval);
  }, [fullLogs]);

  return (
    <div className="fortune-card p-6 sm:p-8 font-mono border border-cyan-500/20 bg-slate-950/80 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
      <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex-1 w-full">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">🧬 大數據 易經運算終端</p>
          <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-cyan-100 leading-7 min-h-[160px]">
            {logs.map((log, index) => (
              <p key={index} className="animate-fade-in">
                {log}
              </p>
            ))}
            {logs.length < fullLogs.length && (
              <p className="text-cyan-400">
                [RUNNING] 正在解密星圖矩陣...<span className="console-cursor" />
              </p>
            )}
          </div>
        </div>
        <CelestialAstrolabe />
      </div>
    </div>
  );
}

function OracleHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block ml-2 align-middle z-20">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)] hover:bg-cyan-500/25 transition-all focus:outline-none"
      >
        ?
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 w-56 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3.5 text-xs leading-5 text-cyan-100 shadow-[0_0_15px_rgba(34,211,238,0.25)] animate-fade-in font-sans">
            {text}
            <button 
              type="button" 
              className="block mt-2 text-[10px] font-bold text-cyan-400 text-right w-full hover:underline"
              onClick={() => setOpen(false)}
            >
              我知道了 ✗
            </button>
          </span>
        </>
      )}
    </span>
  );
}

function PersonStep({
  title,
  description,
  accent,
  value,
  onChange,
  selectionConfirm,
  onSelectionConfirm,
}: {
  title: string;
  description: string;
  accent: 'violet' | 'amber';
  value: PersonInput;
  onChange: (value: PersonInput) => void;
  selectionConfirm: SelectionConfirm;
  onSelectionConfirm: (value: SelectionConfirm) => void;
}) {
  return (
    <div id="active-step-panel" className={`fortune-card p-6 sm:p-8 scroll-mt-24 transition-all duration-500 ${accent === 'violet' ? 'astral-glow-violet hover:border-violet-500/25' : 'astral-glow-amber hover:border-amber-500/25'}`}>
      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
        {title}
      </p>

      <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{description}</p>

      <div className="mt-8 space-y-8">
        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            1. 姓名
            <OracleHint text="🔮 姓名乃人和磁場之五格載體，大數據將通過姓名聲波諧振進行血緣與宿命課題共振。" />
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
            placeholder="請輸入姓名，至少 2 個字"
            className={`form-input w-full text-base neon-input-focus neon-card-hover glass-input ${accent === 'violet' ? 'glass-input-cyan' : ''}`}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            2. 出生日期（萬年曆）
            <OracleHint text="🪐 生辰乃星曜入宮的天命坐標，系統將自動換算為紫微干支天盤以進行宿命軌道分析。" />
          </label>
          <LunarBirthdayInput
            value={value.birthDate}
            onChange={(solarDate) => onChange({ ...value, birthDate: solarDate })}
            accent={accent}
            label="請選擇國曆或農曆"
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            3. 血型
            <OracleHint text="🧬 血型蘊含地脈遺傳之性格吸引力密碼，決定了雙人磁場的基礎吸引力與相處共鳴率。" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {BLOOD_TYPES.map((bloodType, index) => (
              <ElderChoiceCard
                key={bloodType}
                active={selectionConfirm.bloodType && value.bloodType === bloodType}
                title={`${bloodType} 型`}
                description={BLOOD_DESC[bloodType]}
                onClick={() => {
                  onChange({ ...value, bloodType });
                  onSelectionConfirm({ ...selectionConfirm, bloodType: true });
                }}
                tone={index % 2 === 0 ? accent : accent === 'violet' ? 'cyan' : 'pink'}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
            4. 性別
            <OracleHint text="✦ 性別主要作為外在表徵與修辭調整的輔助變數，不影響底層天盤骨架的因果計算。" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'female'}
              title="女性"
              description="用來修飾外在表現。"
              onClick={() => {
                onChange({ ...value, gender: 'female' });
                onSelectionConfirm({ ...selectionConfirm, gender: true });
              }}
              tone="pink"
            />
            <ElderChoiceCard
              active={selectionConfirm.gender && value.gender === 'male'}
              title="男性"
              description="只做外在呈現修飾。"
              onClick={() => {
                onChange({ ...value, gender: 'male' });
                onSelectionConfirm({ ...selectionConfirm, gender: true });
              }}
              tone="cyan"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShichenStep({
  title,
  description,
  accent,
  value,
  onChange,
}: {
  title: string;
  description: string;
  accent: 'violet' | 'amber';
  value: PersonInput;
  onChange: (value: PersonInput) => void;
}) {
  const accentClasses = accent === 'violet'
    ? { 
        label: 'border-violet-400/25 bg-violet-950/20 text-violet-300', 
        button: 'border-violet-400 bg-violet-500/20 text-violet-100 shadow-[0_0_20px_rgba(109,74,255,0.35)]' 
      }
    : { 
        label: 'border-amber-400/25 bg-amber-950/20 text-amber-300', 
        button: 'border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(201,162,74,0.35)]' 
      };

  return (
    <div id="active-step-panel" className={`fortune-card p-6 sm:p-8 scroll-mt-24 transition-all duration-500 ${accent === 'violet' ? 'astral-glow-violet hover:border-violet-500/25' : 'astral-glow-amber hover:border-amber-500/25'}`}>
      <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accentClasses.label}`}>
        {title}
      </p>

      <h2 className="mt-4 font-serif text-3xl text-[color:var(--text-main)]">選擇出生時辰</h2>
      <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">{description}</p>

      <div className="mt-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => onChange({ ...value, shichen: 'unknown' })}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition-all duration-300 neon-card-hover ${
              value.shichen === 'unknown'
                ? accentClasses.button
                : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-white/20'
            }`}
          >
            <p className="text-lg font-bold">🕊️ 我不知道 / 記不得時辰</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-sub)]">已為你保留良辰吉時。日後想起真實時辰，再補上會更精準。</p>
          </button>
        </div>

        <div>
          <p className="mb-4 text-xs text-[color:var(--text-muted)]">或選擇真實出生時辰</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SHICHEN_LIST.map((s) => {
              const selected = value.shichen === s.branchIndex;
              return (
                <button
                  key={s.branchIndex}
                  type="button"
                  onClick={() => onChange({ ...value, shichen: s.branchIndex })}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all duration-300 neon-card-hover ${
                    selected
                      ? accentClasses.button
                      : 'border-white/10 bg-white/5 text-[color:var(--text-main)] hover:border-white/20'
                  }`}
                >
                  <p className="font-semibold">{s.label}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-sub)]">{s.range}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function LineVipShareCard({ friendHref, onShare }: { friendHref: string; onShare: () => void }) {
  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onShare}
          className="home-line-share-button inline-flex shrink-0 items-center justify-center rounded-full px-5 py-3 text-sm font-black tracking-[0.12em] text-slate-950 transition active:scale-[0.98]"
          aria-label="使用 LINE 分享免費體驗給朋友"
        >
          <span>分享給朋友</span>
        </button>
      </div>

      <section className="home-line-share-card mb-8 overflow-hidden rounded-[28px] border border-emerald-300/25 p-5 shadow-[0_18px_55px_rgba(16,185,129,0.16)] sm:p-6">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center rounded-full border border-emerald-200/30 bg-emerald-300/10 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-emerald-100">
              LINE 好友支持
            </p>
            <h2 className="mt-4 font-serif text-2xl font-black leading-tight text-white sm:text-3xl">
              加 LINE 好友，免費立即體驗 VIP
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/78">
              加入官方 LINE 好友，取得配對、人格、數字好壞與深度洞察的免費體驗入口。
            </p>
          </div>

          <a
            href={friendHref}
            target="_blank"
            rel="noopener noreferrer"
            className="home-line-share-button inline-flex shrink-0 items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-black tracking-[0.12em] text-slate-950 transition active:scale-[0.98] sm:min-w-[220px]"
            aria-label="加入 LINE 官方帳號 @497lembe 領取免費 VIP 體驗"
          >
            <span className="flex h-8 min-w-10 items-center justify-center whitespace-nowrap rounded-full bg-slate-950 px-2 text-[10px] font-black tracking-normal text-emerald-300">
              LINE
            </span>
            <span>加好友領體驗</span>
          </a>
        </div>
      </section>
    </>
  );
}

type HomeGrowthModuleId = 'number' | 'ziwei' | 'soul_match' | 'music' | 'nameology' | 'bazi' | 'zodiac' | 'tarot';

type HomeGrowthModuleGuide = {
  id: HomeGrowthModuleId;
  label: string;
  helper: string;
  cta: string;
  href?: string;
  action?: 'number-modal';
  sticky: string;
  reward: string;
};

const HOME_GROWTH_MODULE_GUIDES: HomeGrowthModuleGuide[] = [
  { id: 'number', label: '易經論數字', helper: '完成一組數字，取得今日好壞判定。', cta: '立即開始', href: '/numerology', sticky: '用一組數字建立今日行動訊號。', reward: '完成後，首頁會記住你的數字提醒。' },
  { id: 'ziwei', label: '易經紫微斗數', helper: '完成紫微命盤探索。', cta: '去完成紫微斗數', href: '/insight', sticky: '把長期方向接進成長中心。', reward: '完成後，成長中心會知道你的長期方向。' },
  { id: 'soul_match', label: '易經靈魂配對', helper: '完成雙人配對探索。', cta: '去完成靈魂配對', href: '/match', sticky: '讓關係互動留下可追蹤提醒。', reward: '完成後，關係提醒會變得更貼近你。' },
  { id: 'music', label: '易經生成歌曲', helper: '完成生命音樂生成。', cta: '去生成一首歌', href: '/music', sticky: '把個人節奏變成可回聽記憶。', reward: '完成後，你會多一個可以回來聽的記憶點。' },
  { id: 'nameology', label: '易經姓名學', helper: '完成姓名學分析。', cta: '去完成姓名學', href: '/nameology', sticky: '補上姓名能量與性格支點。', reward: '完成後，易經會記住你的姓名支點。' },
  { id: 'bazi', label: '易經生辰八字', helper: '完成八字命盤分析。', cta: '去完成八字命盤', href: '/bazi', sticky: '讓出生結構接入元素補強。', reward: '完成後，本週補強會更準。' },
  { id: 'zodiac', label: '易經西洋星座', helper: '完成西洋星座人格分析。', cta: '去完成西洋星座', href: '/zodiac', sticky: '加入星座人格與每週提醒。', reward: '完成後，每週提醒會更像你的語氣。' },
  { id: 'tarot', label: '古老塔羅牌', helper: '完成塔羅牌抽牌、正逆位與五元素判定。', cta: '去完成塔羅牌', href: '/tarot', sticky: '用當下提問補齊最後一段訊號。', reward: '完成後，8/8 就能打開 易經個人成長中心。' },
];

const HOME_MODULE_TREASURE_SEALS: Record<HomeGrowthModuleId, { element: GrowthElement; relic: string; gear: string }> = {
  number: { element: 'EARTH', relic: '定數印', gear: '節奏護膝・象徵穩住判斷與步伐' },
  ziwei: { element: 'SPACE', relic: '命宮鑰', gear: '觀星頭盔・象徵看見命盤主線' },
  soul_match: { element: 'WATER', relic: '共鳴珠', gear: '回音盾牌・象徵辨識彼此的互動節奏' },
  music: { element: 'AIR', relic: '旋律鈴', gear: '共振護腕・象徵找回自己的情緒節拍' },
  nameology: { element: 'EARTH', relic: '姓名符', gear: '成長藤甲・象徵整理姓名訊號' },
  bazi: { element: 'FIRE', relic: '日主燈', gear: '定心護盾・象徵照見五行補強方向' },
  zodiac: { element: 'AIR', relic: '星座羅盤', gear: '風向護目鏡・象徵辨識性格的前進方向' },
  tarot: { element: 'SPACE', relic: '牌陣鏡', gear: '映照胸甲・象徵看清當下提問的線索' },
};

type VipGrowthUnlockCardProps = {
  completed: number;
  completedModules: string[];
  total: number;
  justUnlocked: boolean;
  onOpenNumber: () => void;
};

function VipGrowthUnlockCard({ completed, completedModules, total, justUnlocked, onOpenNumber }: VipGrowthUnlockCardProps) {
  const completedSet = new Set(completedModules);
  const missingModules = HOME_GROWTH_MODULE_GUIDES.filter((module) => !completedSet.has(module.id));
  const nextModule = missingModules[0];
  const safeTotal = Math.max(total, 1);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const unlocked = safeCompleted >= safeTotal;
  const remaining = Math.max(safeTotal - safeCompleted, 0);
  const progressPercent = Math.min(100, Math.round((safeCompleted / safeTotal) * 100));
  const headline = unlocked ? '八道關卡已全部通過，第一顆五元素寶珠可以解封。' : '完成一張探索只算通過一道關卡；八關全部完成前，五顆寶珠一律封印。';
  const progressText = unlocked ? `\u63a2\u7d22\u5b8c\u6210\uff1a${safeTotal} / ${safeTotal}` : `\u63a2\u7d22\u9032\u5ea6\uff1a${safeCompleted} / ${safeTotal}`;
  const remainingText = unlocked
    ? '八道通關印記已集齊；現在可以進入成長中心取得第一顆寶珠。'
    : nextModule
      ? `目前已通過 ${safeCompleted} / ${safeTotal} 關；下一道是「${nextModule.label}」。`
      : `目前已通過 ${safeCompleted} 關，距離第一顆寶珠解封還差 ${remaining} 關。`;

  const renderModuleRoute = (module: HomeGrowthModuleGuide, index: number) => {
    const done = completedSet.has(module.id);
    const isNext = !unlocked && nextModule?.id === module.id;
    const state = done ? 'done' : isNext ? 'next' : 'pending';
    const statusText = done ? '已收下' : isNext ? '可獲取' : '封印中';
    const treasureSeal = HOME_MODULE_TREASURE_SEALS[module.id];
    const treasureText = done
      ? `已通過本關，取得「${treasureSeal.relic}」通關印記；本關線索：${treasureSeal.gear}`
      : `本關印記「${treasureSeal.relic}」尚未取得；完成本關才會記入八關進度`;
    const commonClassName = `growth-module-route growth-module-route--${state}`;
    const inner = (
      <>
        <span className="growth-module-route__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="growth-module-route__body">
          <span className="growth-module-route__label">{module.label}</span>
          <span className="growth-module-route__helper">{done ? `${treasureText}。` : `${module.sticky}・${treasureText}`}</span>
        </span>
        <span className="growth-module-route__status">{statusText}</span>
      </>
    );

    if (module.action === 'number-modal') {
      return (
        <button
          key={module.id}
          type="button"
          onClick={onOpenNumber}
          className={commonClassName}
          data-growth-module={module.id}
          data-growth-state={state}
          aria-label={`${module.label}：${statusText}`}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        key={module.id}
        href={module.href ?? '/'}
        className={commonClassName}
        data-growth-module={module.id}
        data-growth-state={state}
        aria-label={`${module.label}：${statusText}`}
      >
        {inner}
      </Link>
    );
  };
  const nextAction = !unlocked && nextModule
    ? nextModule.action === 'number-modal'
      ? (
        <button
          type="button"
          onClick={onOpenNumber}
          className="inline-flex items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.22)] transition active:scale-[0.98]"
        >
          {nextModule.cta}
        </button>
      )
      : (
        <Link
          href={nextModule.href ?? '/'}
          className="inline-flex items-center justify-center rounded-full border border-cyan-200/45 bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.22)] transition active:scale-[0.98]"
        >
          {nextModule.cta}
        </Link>
      )
    : null;

  const content = (
    <section
      className={`home-growth-entry group relative w-full overflow-hidden rounded-3xl border p-5 shadow-[0_18px_55px_rgba(0,0,0,0.2)] transition-all duration-500 sm:p-6 ${
        unlocked
          ? 'border-amber-200/50 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),rgba(16,185,129,0.12)_42%,rgba(15,23,42,0.88)_100%)] shadow-[0_0_45px_rgba(251,191,36,0.24)]'
          : safeCompleted >= 3
            ? 'border-cyan-300/35 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),rgba(15,23,42,0.9)_68%,rgba(2,6,23,0.96)_100%)]'
            : 'border-white/12 bg-white/[0.055]'
      }`}
      aria-label="易經個人成長中心入口"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-0 transition duration-700 group-hover:opacity-100" />
      {unlocked && <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-300/16 blur-3xl" />}
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className={`growth-lock-3d-emblem ${unlocked ? 'growth-lock-3d-emblem--unlocked' : 'growth-lock-3d-emblem--locked'}`} aria-hidden="true">
              <span className="growth-lock-3d-emblem__aura" />
              <span className="growth-lock-3d-emblem__bevel" />
              <span className="growth-lock-3d-emblem__shine" />
              <span className="growth-lock-3d-emblem__glyph">{unlocked ? '\uD83D\uDD13' : '\uD83D\uDD12'}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/85">Growth Center</p>
              <h2 className="mt-1 font-serif text-2xl font-black leading-tight text-[color:var(--text-main)] sm:text-3xl">易經個人成長中心</h2>
            </div>
          </div>
          <p className="mt-4 text-sm font-black leading-7 text-[color:var(--text-main)]">{headline}</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{remainingText}</p>
          {!unlocked && missingModules.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="尚未完成探索">
              {missingModules.map((module) => (
                <span key={module.id} className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100">
                  未完成：{module.label}
                </span>
              ))}
            </div>
          )}
          {nextModule && !unlocked && (
            <p className="mt-3 text-xs font-semibold leading-6 text-cyan-100/85">{nextModule.helper}</p>
          )}
          <div className="growth-module-route-grid" aria-label="八張探索卡片連結">
            {HOME_GROWTH_MODULE_GUIDES.map(renderModuleRoute)}
          </div>
          {justUnlocked && (
            <p className="mt-3 rounded-xl border border-amber-200/25 bg-amber-300/12 px-4 py-3 text-sm font-black leading-7 text-amber-100 animate-pulse">
              恭喜，易經已完成你的專屬成長檔案。
            </p>
          )}
        </div>

        <div className="shrink-0 sm:min-w-[220px]">
          <div className="flex items-end justify-between gap-3">
            <p className="text-[10px] font-black tracking-[0.16em] text-[color:var(--text-muted)]">探索進度</p>
            <p className="font-serif text-3xl font-black leading-none text-amber-100">{safeCompleted}<span className="text-base text-[color:var(--text-muted)]">/{safeTotal}</span></p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <span
              className={`block h-full rounded-full transition-all duration-700 ${unlocked ? 'bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]' : 'bg-cyan-300/85'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-3 text-xs font-bold leading-6 text-[color:var(--text-sub)]">{progressText}</p>
        </div>
      </div>

      <div className="relative z-10 mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold leading-6 text-[color:var(--text-muted)]">
          {unlocked ? '每週提醒、補強元素、能量色與行動任務已開放。' : '不是很多功能一起丟給你，而是先完成這一張，讓進度被記住。'}
        </p>
        {unlocked ? (
          <Link
            href="/growth-center"
            className="inline-flex items-center justify-center rounded-full border border-amber-200/40 bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.22)] transition active:scale-[0.98]"
          >
            開啟 易經個人成長中心
          </Link>
        ) : nextAction}
      </div>
    </section>
  );

  return content;
}

type HomeStickyJourneyPanelProps = {
  completed: number;
  completedModules: string[];
  total: number;
  onOpenNumber: () => void;
};

function HomeStickyJourneyPanel({ completed, completedModules, total, onOpenNumber }: HomeStickyJourneyPanelProps) {
  const completedSet = new Set(completedModules);
  const safeTotal = Math.max(total, 1);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal);
  const unlocked = safeCompleted >= safeTotal;
  const nextModule = HOME_GROWTH_MODULE_GUIDES.find((module) => !completedSet.has(module.id));
  const ctaClassName = 'home-sticky-journey__cta';

  const nextAction = unlocked ? (
    <Link href="/growth-center" className={ctaClassName}>開啟 易經個人成長中心</Link>
  ) : nextModule?.action === 'number-modal' ? (
    <button type="button" onClick={onOpenNumber} className={ctaClassName}>{nextModule.cta}</button>
  ) : nextModule ? (
    <Link href={nextModule.href ?? '/'} className={ctaClassName}>{nextModule.cta}</Link>
  ) : null;

  return (
    <section className="hidden" aria-label="今日清楚下一步" aria-hidden="true">
      <div className="home-sticky-journey__compact-grid">
        <div className="home-sticky-journey__compact-copy">
          <p className="home-sticky-journey__compact-kicker">今日下一步</p>
          <h2>{unlocked ? '成長中心已開放' : nextModule?.label ?? '今日探索已完成'}</h2>
          <p>{unlocked ? `已完成 ${safeCompleted}/${safeTotal}` : `已完成 ${safeCompleted}/${safeTotal}`}</p>
        </div>
        <div className="home-sticky-journey__compact-action">{nextAction}</div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [step, setStep] = useState<StepKey>('personA-base');
  const [personA, setPersonA] = useState<PersonInput>({ ...EMPTY, gender: 'female' });
  const [personB, setPersonB] = useState<PersonInput>({ ...EMPTY, gender: 'male' });
  const [personASelectionConfirm, setPersonASelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [personBSelectionConfirm, setPersonBSelectionConfirm] = useState<SelectionConfirm>(EMPTY_SELECTION_CONFIRM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MatchResponse | null>(null);
  const [matchDailyRecord, setMatchDailyRecord] = useState<DailyAnalysisRecord<MatchDailyResult> | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [growthCompletedCount, setGrowthCompletedCount] = useState(0);
  const [growthCompletedModules, setGrowthCompletedModules] = useState<string[]>([]);
  const [growthJustUnlocked, setGrowthJustUnlocked] = useState(false);
  const previousGrowthCountRef = useRef(0);
  const [ziweiOpening, setZiweiOpening] = useState(false);
  const ziweiNavLockRef = useRef(false);
  const ziweiWatchdogRef = useRef<number | null>(null);
  const lineFriendHref = 'https://line.me/R/ti/p/@497lembe';
  const mainRef = useRef<HTMLElement>(null);
  const repairTimerRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollVisibilityRef = useRef({ top: false, down: false });
  const hasMountedStepGuideRef = useRef(false);

  // 易經論數字 state 與處理函數
  const [fortuneNumber, setFortuneNumber] = useState('');
  const [fortuneResult, setFortuneResult] = useState<NumberAnalysisResult | null>(null);
  const [numberDailyRecord, setNumberDailyRecord] = useState<DailyAnalysisRecord<NumberDailyResult> | null>(null);
  const [fortuneStatus, setFortuneStatus] = useState<SystemStatus>('idle');
  const [fortuneError, setFortuneError] = useState('');
  const [fortuneJob, setFortuneJob] = useState<AnalysisJobPublic | null>(null);

  useEffect(() => {
    const clearIdentityError = () => {
      setFortuneError((prev) => (prev === getIdentityRequiredMessage() ? '' : prev));
    };
    window.addEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
    return () => window.removeEventListener(IDENTITY_TARGET_UPDATED_EVENT, clearIdentityError);
  }, []);
  const [isFortuneModalOpen, setIsFortuneModalOpen] = useState(false);
  const [modalEvolutionStage, setModalEvolutionStage] = useState<EvolutionStage>('idle');
  const [modalEvolutionLabel, setModalEvolutionLabel] = useState('觸碰太極，觀察萬象演化');
  const [modalEvolutionDescription, setModalEvolutionDescription] = useState('');
  const fortuneRequestRef = useRef<AbortController | null>(null);
  const fortuneSubmittingRef = useRef(false);
  const fortuneLoading = fortuneStatus === 'validating' || fortuneStatus === 'loading' || fortuneStatus === 'recovering';
  const fortuneNumberInputSize = fortuneNumber.length >= 9
      ? 'clamp(3.15rem, 13.4vw, 5.25rem)'
      : fortuneNumber.length >= 7
        ? 'clamp(4.15rem, 17vw, 6.6rem)'
        : 'clamp(6.25rem, 27vw, 8.8rem)';
  const fortuneNumberDigitStyle = {
    '--fortune-number-input-size': fortuneNumberInputSize,
    fontSize: fortuneNumberInputSize,
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: '"tnum" 1',
    letterSpacing: '0',
  } as CSSProperties & Record<'--fortune-number-input-size', string>;
  const numberInputNeedsAttention = fortuneNumber.length === 0;

  const restoreMatchDailyRecord = (record: DailyAnalysisRecord<MatchDailyResult>) => {
    setMatchDailyRecord(record);
    setPersonA(record.result.personA);
    setPersonB(record.result.personB);
    setData(record.result.data);
    setIsUnlocked(record.result.isUnlocked);
    setStep('review');
    setError('');
    setLoading(false);
    window.setTimeout(() => {
      document.getElementById(record.result.isUnlocked ? 'vip-result-anchor' : 'match-result-anchor')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  };

  const restoreNumberDailyRecord = (record: DailyAnalysisRecord<NumberDailyResult>) => {
    setNumberDailyRecord(record);
    setFortuneNumber(record.result.value);
    setFortuneResult(record.result.result);
    setFortuneStatus('success');
    setFortuneError('');
    setFortuneJob(null);
    window.setTimeout(() => {
      document.querySelector('.daily-analysis-notice--used, .number-fortune-analysis-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  };

  const openFortuneModal = () => {
    if (window.location.pathname !== FORTUNE_MODAL_PATH) {
      window.history.pushState({ fortuneModal: true }, '', FORTUNE_MODAL_PATH);
    }
    setIsFortuneModalOpen(true);
  };

  const restoreHomeUrl = () => {
    if (window.location.pathname !== FORTUNE_MODAL_PATH) return;

    if (window.history.state?.fortuneModal) {
      window.history.back();
      return;
    }

    window.history.replaceState(null, '', '/');
  };

  useEffect(() => {
    const syncFortuneModalWithUrl = () => {
      setIsFortuneModalOpen(window.location.pathname === FORTUNE_MODAL_PATH);
    };

    syncFortuneModalWithUrl();
    window.addEventListener('popstate', syncFortuneModalWithUrl);
    return () => window.removeEventListener('popstate', syncFortuneModalWithUrl);
  }, []);


  useEffect(() => {
    const matchRecord = readDailyAnalysis<MatchDailyResult>('match');
    if (matchRecord) {
      restoreMatchDailyRecord(matchRecord);
    }

    const numberRecord = readDailyAnalysis<NumberDailyResult>('number');
    if (numberRecord) {
      restoreNumberDailyRecord(numberRecord);
    }
  }, []);

  useEffect(() => {
    const syncGrowthProgress = () => {
      const completedModules = getCompletedGrowthModules();
      const completed = completedModules.length;
      setGrowthCompletedModules(completedModules);
      setGrowthCompletedCount(completed);
      if (previousGrowthCountRef.current < GROWTH_VIP_TOTAL_MODULES && completed >= GROWTH_VIP_TOTAL_MODULES) {
        setGrowthJustUnlocked(true);
        window.setTimeout(() => setGrowthJustUnlocked(false), 5000);
      }
      previousGrowthCountRef.current = completed;
    };

    syncGrowthProgress();
    window.addEventListener('tdh-growth-progress-updated', syncGrowthProgress);
    window.addEventListener('storage', syncGrowthProgress);
    window.addEventListener('focus', syncGrowthProgress);
    return () => {
      window.removeEventListener('tdh-growth-progress-updated', syncGrowthProgress);
      window.removeEventListener('storage', syncGrowthProgress);
      window.removeEventListener('focus', syncGrowthProgress);
    };
  }, []);
  const handleLineShare = async () => {
    const shareUrl = 'https://heaven-earth-humanity-pair.vercel.app/';
    const shareData = {
      title: '☯ 太極命理 易經',
      text: '用 易經探索靈魂配對、人格能量與數字好壞，看看天、地、人之間的共鳴。',
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
      }
    }

    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  // 系統自我修復 States & Handler
  const [showRepairToast, setShowRepairToast] = useState(false);
  const handleSystemSelfRepair = () => {
    try {
      localStorage.clear();
      window.dispatchEvent(new CustomEvent('reset-audio-context'));
      window.dispatchEvent(new CustomEvent('reset-celestial-mist'));
      setPersonA({ ...EMPTY, gender: 'female' });
      setPersonB({ ...EMPTY, gender: 'male' });
      setPersonASelectionConfirm(EMPTY_SELECTION_CONFIRM);
      setPersonBSelectionConfirm(EMPTY_SELECTION_CONFIRM);
      setData(null);
      setError('');
      setLoading(false);
      setFortuneNumber('');
      setFortuneResult(null);
      setFortuneStatus('idle');
      setIsFortuneModalOpen(false);
      restoreHomeUrl();
      setModalEvolutionStage('idle');
      setModalEvolutionLabel('觸碰太極，觀察萬象演化');
      setModalEvolutionDescription('');
      setShowRepairToast(true);
      setTimeout(() => setShowRepairToast(false), 3000);
    } catch (e) {
      console.warn('System self-repair execution failed:', e);
    }
  };

  // Modal 太極點擊彩蛋 States & Audio
  const [modalTapCount, setModalTapCount] = useState(0);
  const [showModalMantra, setShowModalMantra] = useState(false);
  const [showModalSuperMantra, setShowModalSuperMantra] = useState(false);
  const [showModalMegaMantra, setShowModalMegaMantra] = useState(false);
  const [showModalGreatMantra, setShowModalGreatMantra] = useState(false);
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalOverlayTimersRef = useRef<Set<number>>(new Set());
  const modalEvolutionTimerRef = useRef<number | null>(null);
  const modalAudioContextsRef = useRef<Set<AudioContext>>(new Set());
  const modalAudioTimersRef = useRef<Set<number>>(new Set());

  const scheduleModalOverlayTimeout = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      modalOverlayTimersRef.current.delete(timer);
      callback();
    }, delay);
    modalOverlayTimersRef.current.add(timer);
    return timer;
  };

  const isModalTaijiAudioReduced = () => {
    if (typeof document === 'undefined') return false;
    const body = document.body;
    return body.classList.contains('app-lite-effects')
      || body.classList.contains('app-low-power-device')
      || body.classList.contains('app-social-browser')
      || body.classList.contains('app-stress-mode')
      || body.classList.contains('app-touching');
  };

  const playModalBowlSound = (type: number) => {
    if (typeof window === 'undefined' || isModalTaijiAudioReduced()) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      
      if (type === 1) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.frequency.setValueAtTime(292, ctx.currentTime);
        osc2.frequency.setValueAtTime(292 * 1.52, ctx.currentTime);
        osc1.connect(gainNode); osc2.connect(gainNode);
        gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.5);
        osc1.start(); osc2.start();
        osc1.stop(ctx.currentTime + 4.8); osc2.stop(ctx.currentTime + 4.8);
      } else if (type === 2) {
        const oscLow = ctx.createOscillator();
        const oscHigh = ctx.createOscillator();
        oscLow.frequency.setValueAtTime(144, ctx.currentTime);
        oscHigh.frequency.setValueAtTime(432, ctx.currentTime);
        oscLow.connect(gainNode); oscHigh.connect(gainNode);
        gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.5);
        oscLow.start(); oscHigh.start();
        oscLow.stop(ctx.currentTime + 5.8); oscHigh.stop(ctx.currentTime + 5.8);
      } else if (type === 3) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        osc1.frequency.setValueAtTime(144, ctx.currentTime);
        osc2.frequency.setValueAtTime(292, ctx.currentTime);
        osc3.frequency.setValueAtTime(528, ctx.currentTime);
        osc1.connect(gainNode); osc2.connect(gainNode); osc3.connect(gainNode);
        gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 7.5);
        osc1.start(); osc2.start(); osc3.start();
        osc1.stop(ctx.currentTime + 7.8); osc2.stop(ctx.currentTime + 7.8); osc3.stop(ctx.currentTime + 7.8);
      } else {
        const frequencies = [108, 216, 432, 528, 999];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx === 4 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          osc.connect(gainNode);
          osc.start();
          osc.stop(ctx.currentTime + 10.5);
        });
        gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 10.0);
      }
      gainNode.connect(ctx.destination);
      modalAudioContextsRef.current.add(ctx);
      const closeAfterMs = type === 1 ? 5_000 : type === 2 ? 6_000 : type === 3 ? 8_000 : 11_000;
      const closeTimer = window.setTimeout(() => {
        modalAudioTimersRef.current.delete(closeTimer);
        modalAudioContextsRef.current.delete(ctx);
        void ctx.close().catch(() => {});
      }, closeAfterMs);
      modalAudioTimersRef.current.add(closeTimer);
    } catch (e) {
      console.warn(e);
    }
  };

  const playEvolutionTone = (stage: EvolutionStage) => {
    if (typeof window === 'undefined' || stage === 'idle' || isModalTaijiAudioReduced()) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      void ctx.resume?.();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const compressor = ctx.createDynamicsCompressor();
      const delay = ctx.createDelay();
      const echoGain = ctx.createGain();
      const stageFrequencies: Record<Exclude<EvolutionStage, 'idle'>, number[]> = {
        taiji: [128, 256, 384],
        liangyi: [216, 324, 432, 648],
        sixiang: [144, 288, 432, 576, 720],
        bagua: [108, 216, 324, 432, 540, 648, 756, 864, 972],
      };
      const duration = stage === 'taiji' ? 1.5 : stage === 'liangyi' ? 1.9 : stage === 'sixiang' ? 2.35 : 3.1;
      const peakGain = stage === 'bagua' ? 0.52 : stage === 'sixiang' ? 0.46 : 0.38;

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(stage === 'bagua' ? 2600 : 1600, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(stage === 'bagua' ? 4200 : 2400, ctx.currentTime + duration * 0.55);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + 0.045);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      delay.delayTime.setValueAtTime(stage === 'bagua' ? 0.19 : 0.13, ctx.currentTime);
      echoGain.gain.setValueAtTime(stage === 'bagua' ? 0.22 : 0.14, ctx.currentTime);
      compressor.threshold.setValueAtTime(-20, ctx.currentTime);
      compressor.knee.setValueAtTime(18, ctx.currentTime);
      compressor.ratio.setValueAtTime(8, ctx.currentTime);
      compressor.attack.setValueAtTime(0.012, ctx.currentTime);
      compressor.release.setValueAtTime(0.22, ctx.currentTime);

      stageFrequencies[stage].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const partialGain = ctx.createGain();
        osc.type = index % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        osc.detune.setValueAtTime(index % 2 === 0 ? -5 : 7, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(frequency * (stage === 'bagua' ? 1.06 : 1.035), ctx.currentTime + duration * 0.58);
        partialGain.gain.setValueAtTime(0, ctx.currentTime);
        partialGain.gain.linearRampToValueAtTime(1 / Math.max(2.2, stageFrequencies[stage].length), ctx.currentTime + 0.035 + index * 0.018);
        partialGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(partialGain);
        partialGain.connect(filter);
        osc.start(ctx.currentTime + index * 0.022);
        osc.stop(ctx.currentTime + duration + 0.12);
      });

      const shimmer = ctx.createBufferSource();
      const shimmerBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.38), ctx.sampleRate);
      const data = shimmerBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        const fade = 1 - i / data.length;
        data[i] = (Math.random() * 2 - 1) * fade * fade * 0.28;
      }
      const shimmerGain = ctx.createGain();
      shimmer.buffer = shimmerBuffer;
      shimmerGain.gain.setValueAtTime(stage === 'bagua' ? 0.22 : 0.12, ctx.currentTime);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);
      shimmer.connect(shimmerGain);
      shimmerGain.connect(filter);
      shimmer.start(ctx.currentTime + 0.02);
      shimmer.stop(ctx.currentTime + 0.42);

      filter.connect(gainNode);
      filter.connect(delay);
      delay.connect(echoGain);
      echoGain.connect(gainNode);
      gainNode.connect(compressor);
      compressor.connect(ctx.destination);
      modalAudioContextsRef.current.add(ctx);

      const closeAfterMs = Math.ceil((duration + 0.35) * 1000);
      const closeTimer = window.setTimeout(() => {
        modalAudioTimersRef.current.delete(closeTimer);
        modalAudioContextsRef.current.delete(ctx);
        void ctx.close().catch(() => {});
      }, closeAfterMs);
      modalAudioTimersRef.current.add(closeTimer);
    } catch (e) {
      console.warn(e);
    }
  };

  const triggerModalEvolution = (config: EvolutionConfig) => {
    setModalEvolutionStage(config.stage);
    setModalEvolutionLabel(config.label);
    setModalEvolutionDescription(config.description);
    playEvolutionTone(config.stage);

    if (modalEvolutionTimerRef.current) {
      window.clearTimeout(modalEvolutionTimerRef.current);
    }

    modalEvolutionTimerRef.current = window.setTimeout(() => {
      setModalEvolutionStage('idle');
      setModalEvolutionLabel('觸碰太極，觀察萬象演化');
      setModalEvolutionDescription('');
      modalEvolutionTimerRef.current = null;
    }, config.durationMs + 1600);
  };

  useEffect(() => () => {
    if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    if (modalEvolutionTimerRef.current) window.clearTimeout(modalEvolutionTimerRef.current);
    modalOverlayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    modalOverlayTimersRef.current.clear();
    modalAudioTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    modalAudioContextsRef.current.forEach((context) => void context.close().catch(() => {}));
    modalAudioTimersRef.current.clear();
    modalAudioContextsRef.current.clear();
  }, []);

  const handleModalTaiChiClick = () => {
    if (showModalGreatMantra) return;
    setModalTapCount((prev) => {
      const next = prev + 1;
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
      modalTimerRef.current = setTimeout(() => {
        setModalTapCount(0);
      }, 8000);

      if (next === 1 || next === 2 || next === 4 || next === 8) {
        triggerModalEvolution(EVOLUTION_CONFIG[next]);
      }

      if (next === 3) {
        setShowModalMantra(true);
        playModalBowlSound(1);
        scheduleModalOverlayTimeout(() => setShowModalMantra(false), 5200);
      } else if (next === 6) {
        setShowModalMantra(false);
        setShowModalSuperMantra(true);
        playModalBowlSound(2);
        scheduleModalOverlayTimeout(() => setShowModalSuperMantra(false), 6500);
      } else if (next === 12) {
        setShowModalMantra(false);
        setShowModalSuperMantra(false);
        setShowModalMegaMantra(true);
        playModalBowlSound(3);
        scheduleModalOverlayTimeout(() => setShowModalMegaMantra(false), 8000);
      } else if (next === 24) {
        if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
        setModalTapCount(0);
        setShowModalMantra(false);
        setShowModalSuperMantra(false);
        setShowModalMegaMantra(false);
        setShowModalGreatMantra(true);
        playModalBowlSound(4);
        scheduleModalOverlayTimeout(() => setShowModalGreatMantra(false), 11000);
      }
      return next;
    });
  };

  const handleNumberFortune = async () => {
    const identityTarget = getAnalysisIdentityTarget();
    if (!identityTarget) {
      setFortuneResult(null);
      setFortuneJob(null);
      setFortuneError(getIdentityRequiredMessage());
      setFortuneStatus('error');
      return;
    }

    const existingDaily = identityTarget === 'self' ? readDailyAnalysis<NumberDailyResult>('number') : null;
    if (existingDaily) {
      restoreNumberDailyRecord(existingDaily);
      return;
    }

    const cleanFortuneNumber = fortuneNumber.replace(/\D/g, '').slice(0, 10);

    if (!cleanFortuneNumber) {
      setFortuneResult(null);
      setFortuneJob(null);
      setFortuneError("\u26a0\ufe0f \u8acb\u5148\u8f38\u5165 4 \u78bc\u30016 \u78bc\u30018 \u78bc\u6216\u5b8c\u6574 10 \u78bc\u963f\u62c9\u4f2f\u6578\u5b57\u3002");
      setFortuneStatus('error');
      return;
    }
    if (fortuneSubmittingRef.current) return;

    setFortuneStatus('validating');
    if (!/^\d+$/.test(cleanFortuneNumber) || ![4, 6, 8, 10].includes(cleanFortuneNumber.length)) {
      setFortuneResult(null);
      setFortuneJob(null);
      setFortuneError('\u53ea\u80fd\u8f38\u5165 4 \u78bc\u30016 \u78bc\u30018 \u78bc\u6216\u5b8c\u6574 10 \u78bc\u963f\u62c9\u4f2f\u6578\u5b57\uff0c\u4e0d\u8981\u52a0\u7a7a\u683c\u3001\u7b26\u865f\u6216\u82f1\u6587\u5b57\u6bcd\u3002');
      setFortuneStatus('error');
      return;
    }

    fortuneSubmittingRef.current = true;
    fortuneRequestRef.current?.abort();
    const requestController = new AbortController();
    fortuneRequestRef.current = requestController;
    setFortuneStatus('loading');
    setFortuneError('');
    setFortuneJob(null);
    setFortuneResult(null);
    const payload = JSON.stringify({
      mode: cleanFortuneNumber.length === 10 ? 'phone10' : cleanFortuneNumber.length === 8 ? 'digit8' : cleanFortuneNumber.length === 6 ? 'six6' : 'last4',
      value: cleanFortuneNumber,
      analysisTarget: identityTarget,
    });

    try {
      let data: NumberAnalysisResult;
      try {
        data = await requestNumberFortuneByJob(payload, requestController.signal, (job) => {
          setFortuneJob(job);
          setFortuneStatus(mapAnalysisJobStatus(job.status));
        });
      } catch (jobError) {
        if (requestController.signal.aborted) throw jobError;
        console.warn('[number-fortune] job api fallback to direct api', jobError);
        setFortuneJob(null);
        setFortuneStatus('recovering');
        data = await requestNumberFortuneDirect(payload, requestController.signal);
      }

      setFortuneResult(data);
      if (identityTarget === 'self') {
        setNumberDailyRecord(saveDailyAnalysis<NumberDailyResult>('number', { result: data, value: cleanFortuneNumber }));
        markGrowthModuleCompleted('number');
      } else {
        setNumberDailyRecord(null);
      }
      setFortuneError('');
      setFortuneStatus('success');
      window.setTimeout(() => {
        document.querySelector('.daily-analysis-notice--used, .number-fortune-analysis-card')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 80);
    } catch (error) {
      if (requestController.signal.aborted) {
        setFortuneStatus('idle');
        return;
      }
      console.warn('[number-fortune] request recovered with friendly error', error);
      setFortuneResult(null);
      setFortuneJob(null);
      setFortuneStatus('error');
      setFortuneError('\u6578\u5b57\u5206\u6790\u525b\u525b\u6c92\u6709\u9023\u4e0a\uff0c\u4f60\u7684\u8f38\u5165\u5df2\u4fdd\u7559\uff0c\u8acb\u518d\u6309\u4e00\u6b21\u958b\u59cb\u5206\u6790\u3002');
    } finally {
      fortuneSubmittingRef.current = false;
      if (fortuneRequestRef.current === requestController) {
        fortuneRequestRef.current = null;
      }
    }
  };

  useEffect(() => () => {
    fortuneRequestRef.current?.abort();
  }, []);

  // 自動恢復器 (Auto-Watchdog)
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorMsg = event instanceof ErrorEvent
        ? event.message
        : event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      const normalizedError = errorMsg.toLowerCase();
      if (
        normalizedError.includes('webgl') ||
        normalizedError.includes('context lost') ||
        normalizedError.includes('device lost') ||
        normalizedError.includes('audiocontext') ||
        normalizedError.includes('audio context')
      ) {
        if (repairTimerRef.current) return;
        console.warn('⚠️ [天宿自動恢復器] 偵測到螢幕或渲染層發生異常:', errorMsg);
        setShowRepairToast(true);
        repairTimerRef.current = window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('reset-audio-context'));
          window.dispatchEvent(new CustomEvent('reset-celestial-mist'));
          setShowRepairToast(false);
          repairTimerRef.current = null;
        }, 600);
      }
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleGlobalError);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleGlobalError);
      if (repairTimerRef.current) window.clearTimeout(repairTimerRef.current);
    };
  }, []);

  // 載入 localStorage 預填
  useEffect(() => {
    const saved = loadUserData();
    if (saved) {
      setPersonA((prev) => ({
        ...prev,
        name: saved.name || prev.name,
        birthDate: saved.birthday || prev.birthDate,
        bloodType: saved.bloodType || prev.bloodType,
        gender: saved.gender || prev.gender,
      }));
    }
  }, []);

  // 同步 personA 的變更到 localStorage
  useEffect(() => {
    if (getAnalysisIdentityTarget() !== 'self') return;
    if (personA.name || personA.birthDate) {
      saveUserData({
        name: personA.name,
        birthday: personA.birthDate,
        bloodType: personA.bloodType,
        gender: personA.gender,
      });
    }
  }, [personA.name, personA.birthDate, personA.bloodType, personA.gender]);

  useEffect(() => {
    const handleScroll = () => {
      // 往上回到頂部
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = requestAnimationFrame(() => {
        const nextTop = window.scrollY > 400;
        const nextDown = window.scrollY < 80;
        const previous = scrollVisibilityRef.current;

        if (previous.top !== nextTop) setShowScrollTop(nextTop);
        if (previous.down !== nextDown) setShowScrollDown(nextDown);
        scrollVisibilityRef.current = { top: nextTop, down: nextDown };
        scrollFrameRef.current = null;
      });
      return;

      // 往下滾動引導
      if (window.scrollY < 80) {
        // 只有解鎖了結果且尚未滑動時顯示
        setShowScrollDown(true);
      } else {
        setShowScrollDown(false);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (isUnlocked && data) {
      setShowScrollDown(true);
      // 8 秒後自動優雅隱藏
      const timer = setTimeout(() => {
        setShowScrollDown(false);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setShowScrollDown(false);
    }
  }, [isUnlocked, !!data]);

  // 紫微入口：只負責「點擊回饋 → 防重複 → 確實導航」，不建立任何分析任務。
  const ZIWEI_ROUTE = '/insight';

  const resetZiweiNavLock = () => {
    if (ziweiWatchdogRef.current !== null) {
      window.clearTimeout(ziweiWatchdogRef.current);
      ziweiWatchdogRef.current = null;
    }
    ziweiNavLockRef.current = false;
    setZiweiOpening(false);
  };

  const handleZiweiOpen = () => {
    if (ziweiNavLockRef.current) return;
    ziweiNavLockRef.current = true;
    setZiweiOpening(true);
    markPendingRoute(ZIWEI_ROUTE);

    // 看門狗：LINE WebView 或弱網下 client-side 導航可能中途斷掉。
    // 導航成功時首頁會 unmount，effect cleanup 會清掉這個 timer；
    // 只有真的卡住才會走到整頁載入。門檻放寬到 6 秒，避免把「慢但會成功」的導航打斷重來。
    if (ziweiWatchdogRef.current !== null) window.clearTimeout(ziweiWatchdogRef.current);
    ziweiWatchdogRef.current = window.setTimeout(() => {
      ziweiWatchdogRef.current = null;
      if (window.location.pathname !== ZIWEI_ROUTE) {
        window.location.assign(ZIWEI_ROUTE);
      }
    }, 6000);
  };

  useEffect(() => {
    // 返回首頁（含 BFCache 還原）後解除鎖定，讓使用者可以再次進入。
    const handleRestore = () => resetZiweiNavLock();
    window.addEventListener('pageshow', handleRestore);
    return () => {
      window.removeEventListener('pageshow', handleRestore);
      if (ziweiWatchdogRef.current !== null) window.clearTimeout(ziweiWatchdogRef.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 檢測 Fast Refresh 或 Chunk 載入錯誤，自動維修重新載入，防禦白屏
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent) => {
      if (e.message && recoverFromChunkError(e.message)) {
        console.warn('檢測到快取 Chunk 異常，正在自動維修重載網頁...', e);
      }
    };
    window.addEventListener('error', handleChunkError);
    return () => window.removeEventListener('error', handleChunkError);
  }, []);

  // 一鍵自動對齊天宿配對演示
  const startAutoDemo = async () => {
    if (isDemoRunning || loading) return;
    setIsDemoRunning(true);
    resetAll();

    // 1. 填入第一位資料
    setPersonA({
      name: '天宿乾坤',
      birthDate: '1998-05-20',
      bloodType: 'A',
      gender: 'male',
      shichen: null
    });
    setPersonASelectionConfirm({ bloodType: true, gender: true });
    setStep('personA-base');

    await new Promise(r => setTimeout(r, 700));
    setStep('personA-shichen');

    await new Promise(r => setTimeout(r, 700));
    // 2. 填入第一位時辰
    setPersonA(prev => ({ ...prev, shichen: 2 })); // 丑時
    setStep('personB-base');

    // 3. 填入第二位資料
    setPersonB({
      name: '地脈坤艮',
      birthDate: '2000-11-15',
      bloodType: 'O',
      gender: 'female',
      shichen: null
    });
    setPersonBSelectionConfirm({ bloodType: true, gender: true });
    
    await new Promise(r => setTimeout(r, 700));
    setStep('personB-shichen');

    await new Promise(r => setTimeout(r, 700));
    // 4. 填入第二位時辰
    setPersonB(prev => ({ ...prev, shichen: 9 })); // 申時
    setStep('review');

    await new Promise(r => setTimeout(r, 1200));

    // 5. 模擬提交
    setError('');
    setData(null);
    setLoading(true);
    
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    
    const demoA = { name: '天宿乾坤', birthDate: '1998-05-20', bloodType: 'A' as const, gender: 'male' as const, shichen: 2 };
    const demoB = { name: '地脈坤艮', birthDate: '2000-11-15', bloodType: 'O' as const, gender: 'female' as const, shichen: 9 };
    
    try {
      const response = await fetch('/api/match-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ personA: demoA, personB: demoB }),
      });
      
      const json = await response.json();
      if (json.error) {
        setError(json.error);
        setLoading(false);
        setIsDemoRunning(false);
        return;
      }
      
      setData(json);
      setLoading(false);

      // 展示大數據分析結果，等候 2 秒後自動觸發 VIP 解鎖
      await new Promise(r => setTimeout(r, 2000));

      // 6. 自動觸發 VIP 解鎖充能
      setUnlocking(true);
      await new Promise(r => setTimeout(r, 2800));
      setUnlocking(false);
      setIsUnlocked(true);

      // 7. 背景觸發 API 生成前世故事
      try {
        const karmaResponse = await fetch('/api/karma-story-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            personA: demoA,
            personB: demoB,
            matchResult: json.result,
          }),
        });

        if (karmaResponse.ok) {
          const karmaData = await karmaResponse.json();
          if (karmaData.karma_story) {
            setData(prev => (prev ? { ...prev, karma_story: karmaData.karma_story } : null));
          }
        }
      } catch (e) {
        console.error(e);
      }
    } catch (e) {
      setError('演示分析發生異常，請重試。');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setIsDemoRunning(false);
    }
  };

  function handleUnlockVIP() {
    setUnlocking(true);
    setTimeout(() => {
      setUnlocking(false);
      setIsUnlocked(true);
    }, 2800);
  }

  // 監聽步驟切換、結果生成、解鎖與錯誤狀態，自動平滑定位，避免螢幕異常跳動與跑版
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data) {
        const targetId = isUnlocked ? 'vip-result-anchor' : 'match-result-anchor';
        const target = document.getElementById(targetId) ?? document.getElementById('match-result-anchor');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      if (unlocking) {
        return;
      }

      if (!hasMountedStepGuideRef.current) {
        hasMountedStepGuideRef.current = true;
        return;
      }

      const target = document.getElementById('active-step-panel') ?? document.getElementById('step-entry');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [step, !!data, unlocking, isUnlocked, error]);

  // 使用 useDeferredValue 防止表單輸入影響 3D 動畫
  const deferredPersonA = useDeferredValue(personA);
  const deferredPersonB = useDeferredValue(personB);

  // 注入性能 CSS
  useEffect(() => {
    injectPerformanceCSS();
  }, []);

  const stepIndex = STEP_ORDER.indexOf(step);
  const personAError = getPersonError('第一位', personA, personASelectionConfirm);
  const personBError = getPersonError('第二位', personB, personBSelectionConfirm);
  const personAShichenError = personA.shichen === null ? '請選擇時辰或點「我不知道」' : '';
  const personBShichenError = personB.shichen === null ? '請選擇時辰或點「我不知道」' : '';

  const reviewReady = !personAError && !personBError && personA.shichen !== null && personB.shichen !== null;

  const reviewCards = useMemo(
    () => [
      { label: '第一位', person: personA, accent: 'violet' as const },
      { label: '第二位', person: personB, accent: 'amber' as const },
    ],
    [personA, personB],
  );

  function goNext() {
    setError('');

    if (step === 'personA-base') {
      if (personAError) {
        setError(personAError);
        return;
      }
      setStep('personA-shichen');
      return;
    }

    if (step === 'personA-shichen') {
      if (personAShichenError) {
        setError(personAShichenError);
        return;
      }
      setStep('personB-base');
      return;
    }

    if (step === 'personB-base') {
      if (personBError) {
        setError(personBError);
        return;
      }
      setStep('personB-shichen');
      return;
    }

    if (step === 'personB-shichen') {
      if (personBShichenError) {
        setError(personBShichenError);
        return;
      }
      setStep('review');
    }
  }

  function goBack() {
    setError('');

    if (step === 'personA-shichen') {
      setStep('personA-base');
      return;
    }

    if (step === 'personB-base') {
      setStep('personA-shichen');
      return;
    }

    if (step === 'personB-shichen') {
      setStep('personB-base');
      return;
    }

    if (step === 'review') {
      setStep('personB-shichen');
    }
  }

  async function handleSubmit() {
    const existingDaily = readDailyAnalysis<MatchDailyResult>('match');
    if (existingDaily) {
      restoreMatchDailyRecord(existingDaily);
      return;
    }

    if (!reviewReady) {
      setError(personAError || personBError || '請先把兩位資料填完整。');
      return;
    }

    setError('');
    setData(null);
    setLoading(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);

    // 帶重試機制的 fetch
    async function fetchWithRetry(maxRetries = 2) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/match-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ personA, personB }),
          });
          return response;
        } catch (error) {
          if (attempt === maxRetries) throw error;
          // 等待後重試
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    try {
      const response = await fetchWithRetry();
      if (!response) {
        throw new Error('未收到伺服器回應');
      }

      const json = (await response.json()) as MatchResponse & { error?: string };

      if (!response.ok) {
        setError(json.error ?? '配對分析失敗，請稍後再試。');
        return;
      }

      setData(json);
      setMatchDailyRecord(saveDailyAnalysis<MatchDailyResult>('match', { data: json, personA, personB, isUnlocked: true }));
      if (!isUnlocked) {
        handleUnlockVIP();
      }

      // 獲得配對結果後，嘗試生成因果故事
      try {
        const karmaController = new AbortController();
        const karmaTimeout = window.setTimeout(() => karmaController.abort(), 35_000);

        const karmaResponse = await fetch('/api/karma-story-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: karmaController.signal,
          body: JSON.stringify({
            personA,
            personB,
            matchResult: json.result,
          }),
        });

        window.clearTimeout(karmaTimeout);

        if (karmaResponse.ok) {
          const karmaData = (await karmaResponse.json()) as { karma_story?: KarmaStory };
          if (karmaData.karma_story) {
            const enriched = { ...json, karma_story: karmaData.karma_story };
            setData(enriched);
            setMatchDailyRecord(saveDailyAnalysis<MatchDailyResult>('match', { data: enriched, personA, personB, isUnlocked: true }));
          }
        }
      } catch (karmaErr) {
        // 因果故事生成失敗時不影響配對結果
        console.log('[karma-story] generation skipped or failed:', karmaErr);
      }
    } catch (error) {
      setError(error instanceof DOMException && error.name === 'AbortError'
        ? '配對分析等候時間過長，請稍後再試。'
        : '目前無法連線到配對服務，請稍後再試。');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  function resetAll() {
    const existingDaily = readDailyAnalysis<MatchDailyResult>('match');
    if (existingDaily) {
      restoreMatchDailyRecord(existingDaily);
      return;
    }

    setData(null);
    setError('');
    setStep('personA-base');
    setPersonASelectionConfirm(EMPTY_SELECTION_CONFIRM);
    setPersonBSelectionConfirm(EMPTY_SELECTION_CONFIRM);
  }

  const fortuneAura = getNumberFortuneAura(fortuneResult?.level);

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      {/* 首頁背景不放星點／流星；光子與粒子只存在於太極圖騰內。 */}

      <HomeQuickNavigation />

      {unlocking && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md">
          <div className="relative flex items-center justify-center w-80 h-80">
            <TaijiStandaloneCard />
          </div>
          <p className="mt-4 text-lg font-bold tracking-widest text-amber-200 animate-pulse font-serif">
            🪐 天宿星軌對齊中，解密天宿命盤...
          </p>
          <div className="mt-3 flex gap-1.5 text-xs text-violet-300/70">
            <span className="animate-bounce">🧬 正在重組前世今生大數據，啟封音律...</span>
          </div>
        </div>
      )}

      <main ref={mainRef} className="relative z-10 mx-auto max-w-5xl px-4 pt-4 pb-10 sm:px-6 sm:pt-6 lg:pt-8 lg:pb-14">
        <div className="hidden mb-8 items-center gap-4">
          <span className="text-xs tracking-widest text-rose-300">// 易經靈魂配對</span>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/music" className="text-xs tracking-widest text-violet-300/70 transition hover:text-violet-300">
            // 人格音樂
          </Link>
          <span className="text-[color:var(--text-muted)]">·</span>
          <Link href="/insight" className="text-xs tracking-widest text-amber-300/70 transition hover:text-amber-300">
            // 易經姓名學（首頁入口正常顯示，保留原本功能資料）
          </Link>
        </div>

        {/* 2026-08-21 依業主指示拿掉外框：粒子與光子連宇宙都框不住，太極不該被裝在
            一個有邊線、有暗底的卡片裡——讓它直接浮在頁面本身的星空背景上，
            從第一眼（×1）就沒有邊界，不是放大之後才「無限」。 */}
        <section
          id="home-top-empty-shell-card"
          className="mx-auto grid w-[min(92vw,440px)] place-items-center mb-5 sm:mb-6"
          aria-label="首頁最上方太極三層立體卡片"
          data-home-slot="top-empty-shell"
        >
          <TaijiTopShell3D />
        </section>

        <TodayDirectionQuest />

        <HomeStickyJourneyPanel
          completed={growthCompletedCount}
          completedModules={growthCompletedModules}
          total={GROWTH_VIP_TOTAL_MODULES}
          onOpenNumber={openFortuneModal}
        />
        <section className="home-hero-stage home-hero-stage--taiji-only home-hero-stage--raised mb-6 flex justify-center sm:mb-8">
          <div className="hidden relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-400/25 bg-rose-400/10 px-4 py-1.5 text-xs font-bold tracking-[0.28em] text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.12)]">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-300 shadow-[0_0_12px_rgba(253,164,175,0.9)]" />
              配對你的命運靈魂伴侶
            </div>
            <h1 className="mystic-title home-hero-title mb-4 font-serif text-4xl leading-tight sm:text-6xl md:text-7xl">
              天宿命理<br />易經能量解碼艙
            </h1>
            <p className="hidden max-w-2xl text-sm leading-7 text-[color:var(--text-sub)] sm:text-base">
              靈魂配對、人格聲波、深度洞察與數字好壞集中啟動，讓每一次進站都像打開一座會呼吸的命理主控台。
            </p>

            <div className="hidden home-signal-grid mt-6 grid gap-3 sm:grid-cols-3">
              {HOME_SIGNAL_METRICS.map((item) => (
                <div key={item.label} className={`home-signal-chip home-signal-${item.tone}`}>
                  <span>{item.label}</span>
                  <strong className="hidden">{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  const target = document.getElementById('step-entry');
                  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="home-primary-cta group inline-flex items-center justify-center gap-2 rounded-full border border-rose-300/45 bg-rose-500/15 px-8 py-3 text-sm font-black text-rose-100 transition-all shadow-[0_0_28px_rgba(244,63,94,0.24)] shimmer-btn"
              >
                <span>一鍵開啟生辰軌道</span>
                <span className="transition-transform group-hover:translate-x-1">➜</span>
              </button>
              <Link
                href="/numerology"
                prefetch
                className="home-secondary-cta inline-flex items-center justify-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-8 py-3 text-sm font-black text-cyan-100 transition-all shadow-[0_0_24px_rgba(34,211,238,0.18)]"
              >
                <span>立即解碼數字好壞</span>
                <span>☯</span>
              </Link>
              </div>

              {/* 動態天宿氣場預言面板 */}
              <div className="home-forecast-panel mt-6 max-w-xl rounded-2xl border border-amber-500/25 bg-amber-500/7 p-4 text-left shadow-[0_0_24px_rgba(245,158,11,0.08)]">
                <p className="text-xs uppercase tracking-[0.25em] text-amber-300 font-bold font-mono flex items-center gap-2">
                  <span className="animate-ping inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>🪐 今日天宿星格氣場</span>
                </p>
                <p className="hidden mt-2 text-xs leading-6 text-[color:var(--text-sub)]">
                  今日紫微天樞星高懸，血型磁場共振係數 0.92，宿命宮位大開，極利叩問前世因果修行與今生天命配對契合度。
                </p>
              </div>
            </div>
          </div>
          <div className="home-core-panel relative flex w-full max-w-[430px] flex-col items-center justify-center">
            <div className="home-core-halo hidden" aria-hidden="true" />
            {/* 太極圖卡片已依指示整張移除（2026-08-10）；其餘一切不動 */}
            <div className="home-command-panel hidden mt-5 w-full">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Command Sync</span>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] text-emerald-200">
                  ONLINE
                </span>
              </div>
              <div className="hidden mt-3 space-y-2">
                {HOME_COMMAND_STATUS.map(([label, status]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-[color:var(--text-main)]">{label}</span>
                    <span className="text-[color:var(--text-sub)]">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        <section id="home-eight-card-route" className="home-eight-card-route mb-8 scroll-mt-6">
          {/* 「其他探索素材」標題卡已隱藏（2026-08-11）：依指示不顯示 */}
          <div className="home-eight-card-route__header hidden">
            <p>其他探索素材</p>
            <h2>想多看，再選一張；不想想，就照上面下一步走。</h2>
          </div>
          {/* 「8 張卡片，一張一張填」引導卡已隱藏（2026-08-11）：依指示不顯示 */}
          {false && (
            <MegaInputGuide
              title="8 張卡片，一張一張填"
              steps={['先看每張卡的填寫任務', '點進去後照大字引導填', '看不清楚就按聽引導']}
              example="姓名、生日、時辰、阿拉伯數字，都會放大提示。"
              tone="cyan"
              className="mb-4"
            />
          )}
          <div className="flex w-full flex-col gap-4">
          <Link
            href="/match"
            className="home-feature-launch home-feature-rose order-4 w-full relative group overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-r from-slate-950 via-rose-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(244,63,94,0.15)] transition-[border-color,box-shadow,transform] duration-500 hover:border-rose-400 hover:shadow-[0_0_50px_rgba(244,63,94,0.3)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            {/* 炫光掃過特效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="home-oracle-3d-emblem home-oracle-3d-emblem--rose" aria-hidden="true">
                <span className="home-oracle-3d-emblem__aura" />
                <span className="home-oracle-3d-emblem__bevel" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--one" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--two" />
                <span className="home-oracle-3d-emblem__glyph">緣</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-rose-500/10 border border-rose-500/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-rose-300 uppercase animate-pulse">
                  易經 · 靈魂雙星配對
                </span>
                <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-rose-100 tracking-wide flex items-center gap-2">
                  <span>易經靈魂配對</span>
                  <span className="text-xs font-sans text-rose-300 font-normal opacity-85 hidden sm:inline">
                    // 雙人命盤 · 相處節奏 · 互補點分析
                  </span>
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  輸入兩位資料，分析相處頻率、吸引力、溝通模式與命定互補關係。🎁 拆開有禮：兩顆心的合卦，和一句誰最懂誰的答案。
                </p>
              </div>
            </div>

            <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 px-5 py-3 text-xs font-bold text-rose-200 transition group-hover:bg-rose-500/25">
              <span>立即開啟配對</span>
              <span className="transition-transform group-hover:translate-x-1.5">➜</span>
            </div>
          </Link>

          <Link
            href="/music"
            className="home-feature-launch home-feature-violet order-5 w-full relative group overflow-hidden rounded-3xl border border-violet-500/30 bg-gradient-to-r from-slate-950 via-violet-950/20 to-slate-950 p-5 text-left shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-[border-color,box-shadow,transform] duration-500 hover:border-violet-400 hover:shadow-[0_0_50px_rgba(139,92,246,0.3)] active:scale-[0.99] flex items-center justify-between gap-4 flex-wrap sm:p-6 sm:gap-6"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="home-oracle-3d-emblem home-oracle-3d-emblem--violet" aria-hidden="true">
                <span className="home-oracle-3d-emblem__aura" />
                <span className="home-oracle-3d-emblem__bevel" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--one" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--two" />
                <span className="home-oracle-3d-emblem__glyph">生</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex max-w-full rounded-full bg-violet-500/10 border border-violet-500/25 px-3 py-1 text-[10px] font-bold leading-none tracking-[0.12em] text-violet-300 uppercase animate-pulse">
                  {"\u6613\u7d93\u8072\u97f3\u6b4c\u66f2"}
                </span>
                <h2 className="home-music-title mt-2 font-serif font-black text-violet-100">
                  {/* 2026-08-16 依指示：標題首行改為「生成一首歌」（原「易經生成一首歌」，要恢復把下一行換回原字即可） */}
                  <span className="home-music-title-line">{"\u751f\u6210\u4e00\u9996\u6b4c"}</span>
                  <span className="hidden" aria-hidden="true">{"\u81ea\u6211\u4eba\u683c\u5206\u88c2"}</span>
                  <span className="hidden" aria-hidden="true">{"\u8ddf\u4f60\u81ea\u6211\u5c0d\u8a71"}</span>
                </h2>
                <p className="home-music-copy mt-1.5 text-xs text-[color:var(--text-sub)]">
                  {"\u9019\u9996\u6b4c\uff0c\u662f\u4f60\u4eba\u683c\u5206\u88c2\u5f8c\uff0c\u6bcf\u4e00\u500b\u81ea\u5df1\u5171\u540c\u5531\u51fa\u7684\u5167\u5fc3\u7368\u767d\u3002\ud83c\udf81 \u62c6\u958b\u6709\u79ae\uff1a\u4e00\u9996\u53ea\u5c6c\u65bc\u4f60\u751f\u8fb0\u5366\u8c61\u7684\u9748\u9b42\u4e4b\u6b4c\u3002"}
                </p>
              </div>
            </div>

            <div className="home-feature-cta home-music-cta flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-950/30 px-5 py-3 text-xs font-bold text-violet-200 transition group-hover:bg-violet-500/25">
              <span>{"\u7acb\u5373\u751f\u6210\u6b4c\u66f2"}</span>
              <span className="transition-transform group-hover:translate-x-1.5">{"\u279c"}</span>
            </div>
          </Link>

          <Link
            href="/nameology"
            className="home-feature-launch home-feature-amber order-6 w-full relative group overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-[border-color,box-shadow,transform] duration-500 hover:border-amber-400 hover:shadow-[0_0_50px_rgba(245,158,11,0.3)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            {/* 炫光掃過特效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="home-oracle-3d-emblem home-oracle-3d-emblem--amber" aria-hidden="true">
                <span className="home-oracle-3d-emblem__aura" />
                <span className="home-oracle-3d-emblem__bevel" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--one" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--two" />
                <span className="home-oracle-3d-emblem__glyph">名</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-amber-500/10 border border-amber-500/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-amber-300 uppercase animate-pulse">
                  易經 · 姓名決策系統
                </span>
                <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-amber-100 tracking-wide flex items-center gap-2">
                  <span>易經姓名學</span>
                  <span className="text-xs font-sans text-amber-300 font-normal opacity-85 hidden sm:inline">
                    // 臺灣字典 · 取名意境 · 易經卜卦判定
                  </span>
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  以臺灣字典固定部首、筆畫與取名意境，最後只留下今天最需要改變的一個方向。🎁 拆開有禮：你名字裡藏著一句沒人說破的溫度話。
                </p>
              </div>
            </div>

            <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-5 py-3 text-xs font-bold text-amber-200 transition group-hover:bg-amber-500/25">
              <span>開啟姓名決策</span>
              <span className="transition-transform group-hover:translate-x-1.5">➜</span>
            </div>
          </Link>

          <Link
            href="/numerology"
            prefetch
            className="home-feature-launch home-feature-cyan order-2 w-full relative group overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(34,211,238,0.15)] transition-[border-color,box-shadow,transform] duration-500 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(34,211,238,0.3)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            {/* 炫光掃過特效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="number-fortune-auspicious-emblem" aria-hidden="true">
                <span className="number-fortune-auspicious-emblem__halo" />
                <span className="number-fortune-auspicious-emblem__ring" />
                <span className="number-fortune-auspicious-emblem__shine" />
                <span className="number-fortune-auspicious-emblem__glyph">吉</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-cyan-500/10 border border-cyan-500/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-cyan-300 uppercase animate-pulse">
                  CARD 01 · 數字好壞速測
                </span>
                <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-cyan-100 tracking-wide flex items-center gap-2">
                  <span>易經論數字</span>
                  <span className="text-xs font-sans text-cyan-300 font-normal opacity-85 hidden sm:inline">
                    // 4 / 6 / 8 / 10 碼 · 即時判定
                  </span>
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  輸入 2 到 10 碼，易經立即整理吉凶傾向與今日行動。🎁 拆開有禮：你的數字會起出一支專屬卦，六十四格裡就這一格是你。
                </p>
              </div>
            </div>
            
            <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-5 py-3 text-xs font-bold text-cyan-200 transition group-hover:bg-cyan-500/25">
              <span>立即開始</span>
              <span className="transition-transform group-hover:translate-x-1.5">➜</span>
            </div>
          </Link>
          <Link
            href={ZIWEI_ROUTE}
            prefetch
            data-module="ziwei"
            data-navigation-target={ZIWEI_ROUTE}
            onClick={handleZiweiOpen}
            className="home-feature-launch home-feature-indigo order-3 w-full relative group overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-[border-color,box-shadow,transform] duration-500 hover:border-indigo-400 hover:shadow-[0_0_50px_rgba(99,102,241,0.3)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap [touch-action:manipulation]"
            aria-label="開啟 易經紫微斗數"
            aria-busy={ziweiOpening}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="ziwei-dou-3d-emblem pointer-events-none" aria-hidden="true">
                <span className="ziwei-dou-3d-emblem__aura" />
                <span className="ziwei-dou-3d-emblem__bevel" />
                <span className="ziwei-dou-3d-emblem__star ziwei-dou-3d-emblem__star--one" />
                <span className="ziwei-dou-3d-emblem__star ziwei-dou-3d-emblem__star--two" />
                <span className="ziwei-dou-3d-emblem__glyph">紫</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-indigo-500/10 border border-indigo-500/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-indigo-300 uppercase animate-pulse">
                  易經 · 紫微斗數命盤
                </span>
                <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-indigo-100 tracking-wide flex items-center gap-2">
                  <span>易經紫微斗數</span>
                  <span className="text-xs font-sans text-indigo-300 font-normal opacity-85 hidden sm:inline">
                    // 命宮主軸 · 三方四正 · 年度方向
                  </span>
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  依出生資料整理命宮主軸，先看懂長期方向，再交給 易經做精華判定。🎁 拆開有禮：你的特殊格局名稱，和一句「我真的懂你」。
                </p>
              </div>
            </div>

            <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/30 px-5 py-3 text-xs font-bold text-indigo-200 transition group-hover:bg-indigo-500/25">
              <span>{ziweiOpening ? '正在開啟紫微…' : '立即開啟紫微'}</span>
              <span className={`transition-transform ${ziweiOpening ? 'animate-pulse' : 'group-hover:translate-x-1.5'}`}>→</span>
            </div>
          </Link>

          <Link
            href="/bazi"
            className="home-feature-launch home-feature-emerald order-7 w-full relative group overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(16,185,129,0.15)] transition-[border-color,box-shadow,transform] duration-500 hover:border-emerald-400 hover:shadow-[0_0_50px_rgba(16,185,129,0.26)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="home-oracle-3d-emblem home-oracle-3d-emblem--emerald" aria-hidden="true">
                <span className="home-oracle-3d-emblem__aura" />
                <span className="home-oracle-3d-emblem__bevel" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--one" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--two" />
                <span className="home-oracle-3d-emblem__glyph">辰</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-emerald-300 uppercase animate-pulse">
                  {'易經 · 八字命盤'}
                </span>
                <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-emerald-100 tracking-wide flex items-center gap-2">
                  <span>{'易經八字命盤'}</span>
                  <span className="text-xs font-sans text-emerald-300 font-normal opacity-85 hidden sm:inline">
                    {'// \u516b\u5b57\u56db\u67f1 \u00b7 \u4e94\u5143\u7d20\u88dc\u5f37 \u00b7 \u76f8\u751f\u76f8\u524b'}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  {'獨立八字排盤，整理四柱、藏干、十神、旺衰、大運與流年。🎁 拆開有禮：同一張盤的兩種聲音——溫柔的與神祕的，各給你一份。'}
                </p>
              </div>
            </div>

            <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-5 py-3 text-xs font-bold text-emerald-200 transition group-hover:bg-emerald-500/25">
              <span>{'立即開啟命盤'}</span>
              <span className="transition-transform group-hover:translate-x-1.5">{'\u279c'}</span>
            </div>
          </Link>

          <Link
            href="/zodiac"
            className="home-feature-launch order-8 w-full relative group overflow-hidden rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-slate-950 via-fuchsia-950/20 to-slate-950 p-6 text-left shadow-[0_0_30px_rgba(217,70,239,0.15)] transition-all duration-500 hover:border-fuchsia-300 hover:shadow-[0_0_50px_rgba(217,70,239,0.28)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,239,0.22),transparent_34%),radial-gradient(circle_at_78%_30%,rgba(34,211,238,0.16),transparent_28%)] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-4.5">
              <div className="home-oracle-3d-emblem home-oracle-3d-emblem--fuchsia" aria-hidden="true">
                <span className="home-oracle-3d-emblem__aura" />
                <span className="home-oracle-3d-emblem__bevel" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--one" />
                <span className="home-oracle-3d-emblem__spark home-oracle-3d-emblem__spark--two" />
                <span className="home-oracle-3d-emblem__glyph">星</span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-fuchsia-500/10 border border-fuchsia-400/25 px-3 py-0.5 text-[10px] font-bold tracking-widest text-fuchsia-200 uppercase animate-pulse">
                  {'\u6613\u7d93 \u00b7 \u661f\u7a7a\u4eba\u683c'}
                </span>
                <h2 className="mt-1.5 font-serif text-xl sm:text-2xl font-black text-fuchsia-100 tracking-wide flex items-center gap-2">
                  <span>{'\u6613\u7d93\u897f\u6d0b\u661f\u5ea7'}</span>
                  <span className="text-xs font-sans text-fuchsia-200 font-normal opacity-85 hidden sm:inline">
                    {'// \u51fa\u751f\u5e74\u6708\u65e5 \u00b7 \u5341\u4e8c\u661f\u5ea7 \u00b7 \u672c\u9031\u63d0\u9192'}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">
                  {'\u8f38\u5165\u51fa\u751f\u5e74\u6708\u65e5\uff0c\u7368\u7acb\u5224\u5b9a\u5341\u4e8c\u661f\u5ea7\uff0c\u6574\u7406\u4eba\u683c\u7279\u8cea\u3001\u512a\u52e2\u3001\u5ffd\u7565\u9ede\u8207\u672c\u9031\u63d0\u9192\u3002\ud83c\udf81 \u62c6\u958b\u6709\u79ae\uff1a\u4f60\u7684\u661f\u5ea7\u00d7\u6613\u7d93\u5366\u8c61\uff0c\u4e00\u9031\u525b\u525b\u597d\u7684\u63d0\u9192\u3002'}
                </p>
              </div>
            </div>

            <div className="home-feature-cta flex items-center gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-950/30 px-5 py-3 text-xs font-bold text-fuchsia-100 transition group-hover:bg-fuchsia-500/20">
              <span>{'\u958b\u59cb\u661f\u5ea7\u5206\u6790'}</span>
              <span className="transition-transform group-hover:translate-x-1.5">{'\u279c'}</span>
            </div>
          </Link>

          <Link
            href="/red-luan-heartbeat"
            className="home-feature-launch order-0 w-full relative group overflow-hidden rounded-3xl border border-rose-300/35 bg-[radial-gradient(circle_at_14%_20%,rgba(251,113,133,0.24),transparent_34%),radial-gradient(circle_at_84%_22%,rgba(251,191,36,0.16),transparent_30%),linear-gradient(115deg,rgba(51,8,30,0.98),rgba(26,12,42,0.96)_58%,rgba(15,23,42,0.98))] p-6 text-left shadow-[0_0_34px_rgba(244,63,94,0.18)] transition-[border-color,box-shadow,transform] duration-500 hover:border-rose-200/75 hover:shadow-[0_0_54px_rgba(244,63,94,0.30)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
            aria-label="開啟桃花・紅鸞心動個人關係主題"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-100/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            <div className="relative flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-rose-100/40 bg-rose-200/10 font-serif text-3xl font-black text-rose-100 shadow-[0_0_28px_rgba(251,113,133,0.24)]" aria-hidden="true">鸞</div>
              <div className="min-w-0 flex-1">
                <h2 className="mt-1.5 font-serif text-xl font-black tracking-wide text-rose-50 sm:text-2xl">桃花・紅鸞心動</h2>
                <p className="mt-1 text-xs leading-5 text-rose-50/75">從自己的出生資料開始，整理一份可回看、可慢慢理解的關係主題參考。</p>
              </div>
            </div>
            <div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-rose-100/45 bg-rose-200/12 px-5 py-3 text-xs font-bold text-rose-50 transition group-hover:bg-rose-200/22">
              <span>開始關係核對</span><span className="transition-transform group-hover:translate-x-1.5">➜</span>
            </div>
          </Link>
          <TarotEntryCard />
          <Link
            href="/star-beasts"
            className="home-feature-launch order-9 w-full relative group overflow-hidden rounded-3xl border border-amber-200/30 bg-[radial-gradient(circle_at_82%_22%,rgba(251,191,36,0.22),transparent_28%),linear-gradient(110deg,rgba(12,18,42,0.98),rgba(63,35,70,0.62),rgba(12,18,42,0.98))] p-6 text-left shadow-[0_0_30px_rgba(251,191,36,0.13)] transition-[border-color,box-shadow,transform] duration-500 hover:border-amber-200/70 hover:shadow-[0_0_50px_rgba(251,191,36,0.25)] active:scale-[0.99] flex items-center justify-between gap-6 flex-wrap"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
            <div className="relative flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-amber-100/35 bg-amber-200/10 font-serif text-2xl font-black text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.18)]" aria-hidden="true">宿</div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-0.5 text-[10px] font-bold tracking-widest text-amber-100">28 星宿・四象收藏</span>
                <h2 className="mt-1.5 font-serif text-xl font-black tracking-wide text-amber-50 sm:text-2xl">星宿神獸卡片</h2>
                <p className="mt-1 text-xs text-slate-300">完整收藏二十八星宿神獸；依春夏秋冬瀏覽，點選卡片閱讀守護意義與特質。</p>
              </div>
            </div>
            <div className="home-feature-cta relative flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-300/15 px-5 py-3 text-xs font-bold text-amber-50 transition group-hover:bg-amber-300/25">
              <span>查看 28 張卡片</span><span className="transition-transform group-hover:translate-x-1.5">➜</span>
            </div>
          </Link>
          </div>
        </section>


        <VipGrowthUnlockCard
          completed={growthCompletedCount}
          completedModules={growthCompletedModules}
          total={GROWTH_VIP_TOTAL_MODULES}
          justUnlocked={growthJustUnlocked}
          onOpenNumber={openFortuneModal}
        />
        {SHOW_HOME_EMBEDDED_MATCH && !data && (
          <div className="space-y-6">
            {loading ? (
              <AnalyticalConsole
                nameA={personA.name}
                nameB={personB.name}
                birthA={personA.birthDate}
                birthB={personB.birthDate}
              />
            ) : (
              <div id="step-entry" className="space-y-6 scroll-mt-20">
                <div className="flex justify-between items-center gap-4 mb-4 flex-wrap">
                  <div className="hidden items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={openFortuneModal}
                      className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-5 py-3 text-xs font-bold tracking-widest text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:bg-cyan-500/20 transition-all duration-300 flex items-center gap-1.5 animate-pulse"
                    >
                      <span>☯️ 數字好壞解碼</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSystemSelfRepair}
                      className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-5 py-3 text-xs font-bold tracking-widest text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:bg-rose-500/20 transition-all duration-300 flex items-center gap-1.5"
                      title="重設天宿、清除 localStorage 快取，修復卡死異常"
                    >
                      <span>🔮 系統自我修復</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        console.log('⚡ [手動模擬] 觸發螢幕與渲染異常...');
                        throw new Error('Simulated WebGL Device Lost anomaly event');
                      }}
                      className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-5 py-3 text-xs font-bold tracking-widest text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:bg-amber-500/20 transition-all duration-300 flex items-center gap-1.5"
                      title="手動模擬 WebGL 設備丟失與螢幕卡死異常，測試 Watchdog 自動恢復功能"
                    >
                      <span>⚠️ 模擬顯示崩潰</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={startAutoDemo}
                    disabled={isDemoRunning}
                    className="holo-shine vip-gold-btn px-6 py-3 text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(201,162,74,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDemoRunning ? '🔮 天宿配對演示自動運行中…' : '🔮 一鍵自動天盤對齊演練'}
                  </button>
                </div>
                <DailyAnalysisNotice record={matchDailyRecord} className="mb-5" moduleName="易經靈魂配對" onViewResult={matchDailyRecord ? () => restoreMatchDailyRecord(matchDailyRecord) : undefined} />

                <div className="fortune-card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm tracking-[0.4em] font-semibold text-[color:var(--text-muted)]">目前進度</p>
                      <p className="mt-3 font-serif text-3xl sm:text-4xl font-bold text-[color:var(--text-main)]">
                        {['personA-base', 'personA-shichen'].includes(step) && '先填第一位'}
                        {['personB-base', 'personB-shichen'].includes(step) && '再填第二位'}
                        {step === 'review' && '確認後開始配對'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap sm:min-w-[120px] mt-3 sm:mt-0">
                      {/* 步驟 1 */}
                      <div className="flex items-center gap-1.5">
                        <div className={`radar-node ${
                          ['personA-base', 'personA-shichen'].includes(step)
                            ? 'radar-node--active text-rose-400 bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                            : ['personB-base', 'personB-shichen', 'review'].includes(step)
                              ? 'text-violet-400 bg-violet-400'
                              : 'text-white/20 bg-white/20'
                        }`} />
                        <span className="text-xs font-bold text-[color:var(--text-sub)]">第一位</span>
                      </div>
                      <div className="h-px w-3 bg-white/10" />
                      {/* 步驟 2 */}
                      <div className="flex items-center gap-1.5">
                        <div className={`radar-node ${
                          ['personB-base', 'personB-shichen'].includes(step)
                            ? 'radar-node--active text-rose-400 bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                            : step === 'review'
                              ? 'text-violet-400 bg-violet-400'
                              : 'text-white/20 bg-white/20'
                        }`} />
                        <span className="text-xs font-bold text-[color:var(--text-sub)]">第二位</span>
                      </div>
                      <div className="h-px w-3 bg-white/10" />
                      {/* 步驟 3 */}
                      <div className="flex items-center gap-1.5">
                        <div className={`radar-node ${
                          step === 'review'
                            ? 'radar-node--active text-rose-400 bg-rose-400 shadow-[0_0_10px_#f43f5e]'
                            : 'text-white/20 bg-white/20'
                        }`} />
                        <span className="text-xs font-bold text-[color:var(--text-sub)]">確認</span>
                      </div>
                    </div>
                  </div>
                </div>

                {step === 'personA-base' && (
                  <PersonStep
                    title="第一位資料"
                    description="先輸入第一位的姓名、生日、血型和性別。填好後再進下一位。"
                    accent="violet"
                    value={personA}
                    onChange={setPersonA}
                    selectionConfirm={personASelectionConfirm}
                    onSelectionConfirm={setPersonASelectionConfirm}
                  />
                )}

                {step === 'personA-shichen' && (
                  <ShichenStep
                    title="第一位時辰"
                    description="如果知道出生時辰，可以讓配對分析更精細；不知道也完全沒關係。"
                    accent="violet"
                    value={personA}
                    onChange={setPersonA}
                  />
                )}

                {step === 'personB-base' && (
                  <PersonStep
                    title="第二位資料"
                    description="接著輸入第二位。欄位一樣，跟著順序填就好。"
                    accent="amber"
                    value={personB}
                    onChange={setPersonB}
                    selectionConfirm={personBSelectionConfirm}
                    onSelectionConfirm={setPersonBSelectionConfirm}
                  />
                )}

                {step === 'personB-shichen' && (
                  <ShichenStep
                    title="第二位時辰"
                    description="同樣的，知道時辰更好，不知道也沒關係。"
                    accent="amber"
                    value={personB}
                    onChange={setPersonB}
                  />
                )}

                {step === 'review' && (
                  <div className="space-y-6">
                    <div className="fortune-card p-6 sm:p-8">
                      <p className="text-xs tracking-[0.3em] text-rose-300">最後確認</p>
                      <h2 className="mt-3 font-serif text-3xl text-[color:var(--text-main)]">確認資料後開始配對</h2>
                      <p className="mt-3 text-sm leading-8 text-[color:var(--text-sub)]">
                        名字、生日、血型都沒問題，就可以開始。這一步讓你安心確認，不怕按太快。
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {reviewCards.map(({ label, person, accent }) => (
                        <div key={label} className="fortune-card p-5 sm:p-6">
                          <p className={`inline-flex rounded-full border px-4 py-1 text-xs tracking-[0.3em] ${accent === 'violet' ? 'border-violet-400/25 bg-violet-950/20 text-violet-300' : 'border-amber-400/25 bg-amber-950/20 text-amber-300'}`}>
                            {label}
                          </p>
                          <div className="mt-5 space-y-3 text-sm text-[color:var(--text-sub)]">
                            <div>
                              <span className="text-[color:var(--text-muted)]">姓名：</span>
                              <span className="text-[color:var(--text-main)]">{person.name || '未填'}</span>
                            </div>
                            <div>
                              <span className="text-[color:var(--text-muted)]">西元生日：</span>
                              <span className="text-[color:var(--text-main)]">{person.birthDate || '未換算完成'}</span>
                            </div>
                            <div>
                              <span className="text-[color:var(--text-muted)]">血型：</span>
                              <span className="text-[color:var(--text-main)]">{person.bloodType} 型</span>
                            </div>
                            <div>
                              <span className="text-[color:var(--text-muted)]">性別：</span>
                              <span className="text-[color:var(--text-main)]">{person.gender === 'female' ? '女性' : '男性'}</span>
                            </div>
                            <div>
                              <span className="text-[color:var(--text-muted)]">出生時辰：</span>
                              <span className="text-[color:var(--text-main)]">
                                {person.shichen === 'unknown'
                                  ? '系統已配置良辰吉時'
                                  : person.shichen !== null
                                    ? (SHICHEN_LIST.find((s) => s.branchIndex === person.shichen)?.label || '未知')
                                    : '未填'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 天命因果穩定性與天宿就緒檢測 */}
                    <div className="fortune-card p-5 sm:p-6 border border-violet-500/20 bg-violet-950/10 shadow-[0_0_20px_rgba(139,92,246,0.05)] animate-pulse">
                      <div className="flex items-center gap-3">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                        </span>
                        <p className="text-xs uppercase tracking-[0.25em] text-violet-300 font-semibold font-mono">🧬 天宿重力場穩定度檢測：已就緒</p>
                      </div>
                      <p className="mt-3 text-xs leading-6 text-[color:var(--text-sub)]">
                        系統已成功在底層聯結天宿、地脈、人和因果矩陣。雙方姓名五格與八字五行軌跡已安全掛載。按下「查看配對結果」將自動解密天命因果關係與共鳴分數。
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-950/20 p-4 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {step !== 'personA-base' && (
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={loading}
                      className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      上一步
                    </button>
                  )}

                  {step !== 'review' ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={loading}
                      className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {step === 'personA-base' && '下一步：選擇時辰'}
                      {step === 'personA-shichen' && '下一步：填第二位'}
                      {step === 'personB-base' && '下一步：選擇時辰'}
                      {step === 'personB-shichen' && '下一步：確認資料'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!reviewReady || loading}
                      className="vip-gold-btn flex-1 py-5 text-base disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {loading ? '正在整理配對結果…' : getDailyAnalysisButtonLabel(matchDailyRecord)}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {SHOW_HOME_EMBEDDED_MATCH && data && (
          <div id="match-result-anchor" className="space-y-6 scroll-mt-24">
            <div id="vip-result-anchor" className={`fortune-card p-6 sm:p-8 text-center scroll-mt-24 transition-all duration-700 ${isUnlocked ? 'vip-gold-card shadow-[0_0_40px_rgba(201,162,74,0.3)]' : 'astral-glow-violet'}`}>
              <p className={`text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-rose-300 font-medium'}`}>
                {isUnlocked ? '👑 尊榮 VIP 天宿配對報告' : '配對結果'}
              </p>
              <h2 className={`mt-3 font-serif text-5xl ${isUnlocked ? 'vip-glow-text font-black' : 'text-[color:var(--text-main)]'}`}>
                <NumberTicker value={data.result.match_score} />
              </h2>
              <p className="mt-2 text-sm text-[color:var(--text-sub)]">相處共鳴指數</p>
              <p className="mx-auto mt-6 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">{enforceAiCopywritingTone(data.result.summary)}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 ${isUnlocked ? 'vip-gold-card' : ''}`}>
                <p className={`mb-6 text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-[color:var(--text-muted)]'}`}>五項核心指標</p>
                <div className="space-y-5">
                  <ScoreRow label="共鳴感" score={data.result.resonance} tone="violet" />
                  <ScoreRow label="溝通感" score={data.result.communication} tone="cyan" />
                  <ScoreRow label="穩定度" score={data.result.stability} tone="amber" />
                  <ScoreRow label="因果關係" score={data.karmaRelation?.overallResonance ?? 50} tone="violet" />
                  <ScoreRow label="衝突風險" score={data.result.conflict_risk} tone="pink" />
                </div>
              </div>

              <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 ${isUnlocked ? 'vip-gold-card' : ''}`}>
                <p className={`mb-6 text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-[color:var(--text-muted)]'}`}>雙方基本資料</p>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="font-semibold text-violet-300">{data.displayA.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayA.zodiacZh} · {data.displayA.chineseZodiac} · 五行 {data.displayA.wuxing} · {data.displayA.bloodType} 型
                    </p>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div>
                    <p className="font-semibold text-amber-300">{data.displayB.name}</p>
                    <p className="mt-2 leading-7 text-[color:var(--text-sub)]">
                      {data.displayB.zodiacZh} · {data.displayB.chineseZodiac} · 五行 {data.displayB.wuxing} · {data.displayB.bloodType} 型
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 天宿地脈人和·因果重力軌道分析板塊 */}
            {data.karmaRelation && (
              <div className={`fortune-card p-6 sm:p-8 transition-all duration-500 relative overflow-hidden ${isUnlocked ? 'vip-gold-card shadow-[0_0_35px_rgba(201,162,74,0.15)]' : 'border-amber-500/10'}`}>
                <div className="absolute right-0 bottom-0 opacity-[0.06] pointer-events-none translate-x-6 translate-y-6">
                  <svg
                    className="w-64 h-64 text-violet-400"
                    style={{ animation: 'spin 80s linear infinite' }}
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="taijiGradViolet" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="currentColor" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                      </linearGradient>
                      <filter id="taijiGlowViolet" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* 外圈多重精細星軌 */}
                    <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" opacity="0.3" fill="none" />
                    <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.5" fill="none" />
                    <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="0.25" opacity="0.4" fill="none" />
                    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8,2" opacity="0.3" fill="none" />

                    {/* 八卦文字卦象 */}
                    <g fontSize="4.5" fill="currentColor" opacity="0.7" fontFamily="monospace" filter="url(#taijiGlowViolet)">
                      <text x="50" y="10" textAnchor="middle">☰</text>
                      <text x="78" y="22" textAnchor="middle" transform="rotate(45, 78, 22)">☴</text>
                      <text x="90" y="50" textAnchor="middle" transform="rotate(90, 90, 50)">☲</text>
                      <text x="78" y="78" textAnchor="middle" transform="rotate(135, 78, 78)">☳</text>
                      <text x="50" y="90" textAnchor="middle" transform="rotate(180, 50, 90)">☷</text>
                      <text x="22" y="78" textAnchor="middle" transform="rotate(225, 22, 78)">☱</text>
                      <text x="10" y="50" textAnchor="middle" transform="rotate(270, 10, 50)">☵</text>
                      <text x="22" y="22" textAnchor="middle" transform="rotate(315, 22, 22)">☶</text>
                    </g>

                    {/* 太極本體 */}
                    <g filter="url(#taijiGlowViolet)">
                      <path
                        d="M 50 16 A 34 34 0 0 1 50 84 A 17 17 0 0 1 50 50 A 17 17 0 0 0 50 16 Z"
                        fill="url(#taijiGradViolet)"
                        stroke="none"
                      />
                      <circle cx="50" cy="33" r="4" fill="#020617" stroke="none" />
                      <circle cx="50" cy="67" r="4" fill="currentColor" stroke="none" opacity="0.9" />
                    </g>
                  </svg>
                </div>
                <p className={`text-xs uppercase tracking-[0.35em] ${isUnlocked ? 'text-amber-300 font-semibold' : 'text-rose-300 font-medium'}`}>🔮 天宿地脈人和 · 因果重力軌道</p>
                <h3 className="mt-3 font-serif text-xl font-bold text-white">三才業力磁場引力</h3>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <ScoreRow label="🌌 天宿相引力 (生肖星曜月令)" score={data.karmaRelation.zodiacHarmony} tone="violet" />
                  <ScoreRow label="⛰️ 地脈相融力 (血型五行喜忌)" score={data.karmaRelation.wuxingAlignment} tone="cyan" />
                  <ScoreRow label="🧬 人和相應力 (姓名人格執念)" score={data.karmaRelation.nameHarmony} tone="amber" />
                </div>
                <p className="mt-6 text-xs leading-6 text-[color:var(--text-muted)] italic border-t border-white/5 pt-4">
                  * 此項因果軌道結合了你的九宮姓名筆劃格局（人和）、生辰八字喜忌（天宿）與血型氣場引力（地脈）。「人一出生便與天地人緊密相連，修行在於以善為本、改心改命，一切順天而行。」
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: '最有共鳴', items: data.result.zones.resonance, tone: 'violet' },
                { title: '互補優勢', items: data.result.zones.complement, tone: 'amber' },
                { title: '需要磨合', items: data.result.zones.grinding, tone: 'cyan' },
                { title: '注意衝突', items: data.result.zones.conflict, tone: 'pink' },
              ].map((section) => (
                <div key={section.title} className={`fortune-card p-5 sm:p-6 transition-all duration-500 ${isUnlocked ? 'vip-gold-card' : ''}`}>
                  <p className={`text-sm font-semibold ${section.tone === 'violet' ? 'text-violet-300' : section.tone === 'amber' ? 'text-amber-300' : section.tone === 'cyan' ? 'text-cyan-300' : 'text-pink-300'}`}>
                    {section.title}
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--text-sub)]">
                    {section.items.slice(0, 3).map((item) => (
                      <li key={item} className="flex gap-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* 未解鎖時顯示的科技加密艙門 */}
            {!isUnlocked && (
              <div className="tech-decrypt-overlay p-8 text-center relative vip-crystal-glow overflow-hidden animate-rise">
                <div className="code-stream-effect" />
                <div className="relative z-10 py-8 space-y-6">
                  {/* VIP 尊貴皇冠標章 */}
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-4xl shadow-[0_0_40px_rgba(201,162,74,0.4)] border border-amber-300/40 animate-pulse">
                    👑
                  </div>
                  
                  <div>
                    <p className="text-xs uppercase tracking-[0.45em] text-amber-300 font-bold font-mono">大數據天宿因果 · VIP 尊榮解鎖艙</p>
                    <h3 className="mt-4 font-serif text-3xl font-black text-white tracking-wide">解鎖雙方前世今生修行密碼</h3>
                    
                    {/* 黃金權益高亮 */}
                    <div className="mt-6 flex flex-col items-center justify-center gap-3 text-xs text-amber-100/90 font-medium">
                      <span className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 shadow-[0_0_10px_rgba(201,162,74,0.1)]">
                        ✦ 雙人靈魂主星曜宿命引力軌道 (看懂他/她靈魂底牌)
                      </span>
                      <span className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 shadow-[0_0_10px_rgba(201,162,74,0.1)]">
                        ✦ 前世今生修行課題與避坑天機 (一語道破相處痛點，準確率極高)
                      </span>
                      <span className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 shadow-[0_0_10px_rgba(201,162,74,0.1)]">
                        ✦ 專屬聲波頻率合成 432Hz 人格音樂主題曲 (穿透彼此靈魂)
                      </span>
                    </div>

                    <div className="mt-8 border-t border-amber-500/15 pt-6 text-left max-w-xl mx-auto space-y-3.5">
                      <p className="text-xs uppercase tracking-[0.25em] text-amber-300 font-semibold font-mono">🧬 釋義：天地人因果天宿密碼</p>
                      <blockquote className="border-l border-amber-500/40 pl-4 text-xs italic text-[color:var(--text-sub)] leading-7">
                        「{buildPersonalizedPracticeLine(data)}」
                      </blockquote>
                    </div>
                  </div>

                  <div className="pt-6">
                    <p className="mb-3 text-[11px] font-mono text-amber-400/80 tracking-widest">
                      🌟 限時尊榮專屬：NT$ 299 (一次解鎖，永久叩問) 🌟
                    </p>
                    {/* 付費解鎖按鈕 - 呼吸脈衝發光動態 */}
                    <button
                      type="button"
                      onClick={handleUnlockVIP}
                      className="vip-gold-btn px-10 py-5 text-base font-black tracking-widest uppercase rounded-full shadow-[0_0_35px_rgba(201,162,74,0.4)] hover:shadow-[0_0_50px_rgba(201,162,74,0.7)] transition-all duration-300 border border-amber-300/30 transform hover:scale-[1.03] animate-pulse shimmer-btn"
                    >
                      👑 叩問天命因果 · 一鍵開啟專屬 VIP 報告
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 解鎖中或已解鎖但 易經前世故事尚未返回時，展示高科技因果解密骨架屏 */}
            {isUnlocked && !data.karma_story && (
              <div className="fortune-card vip-gold-card p-6 sm:p-8 text-center border border-amber-500/20 shadow-[0_0_30px_rgba(201,162,74,0.15)] space-y-6 animate-pulse">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-2xl border border-amber-500/30 animate-spin">
                  {/* 太極 SVG 加載中效果 */}
                  <svg className="w-10 h-10 text-amber-400" viewBox="0 0 100 100">
                    <path d="M 50,10 A 40,40 0 0,0 50,90 A 20,20 0 0,0 50,50 A 20,20 0 0,1 50,10 Z" fill="currentColor" />
                    <path d="M 50,90 A 40,40 0 0,0 50,10 A 20,20 0 0,0 50,50 A 20,20 0 0,1 50,90 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="50" cy="30" r="4" fill="#020617" />
                    <circle cx="50" cy="70" r="4" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-amber-300">🔮 天宿星宮因果密鑰解鎖中…</h3>
                  <p className="mt-3 text-xs leading-6 text-[color:var(--text-sub)]">
                    系統正在為雙方聯結姓名五格、生辰八字天干地支與血型引力場。這段前世今生的宿因可能需要稍長的時間，Gemini 易經正在為你解鎖靈魂密碼，請稍候。
                  </p>
                </div>
                <div className="space-y-3 pt-2 max-w-sm mx-auto">
                  <div className="h-3.5 bg-white/5 rounded-full w-4/5 mx-auto" />
                  <div className="h-3.5 bg-white/5 rounded-full w-11/12 mx-auto" />
                  <div className="h-3.5 bg-white/5 rounded-full w-2/3 mx-auto" />
                </div>
              </div>
            )}

            {/* 已解鎖時顯示的 VIP 聲學與天命報告 */}
            {data?.karma_story && isUnlocked && (
              <div className="space-y-6 animate-rise">
                <FeatureVisitorCounter featureKey="karma" />
                {/* 聲學音樂適配區 (動態跳動頻譜) */}
                <div className="fortune-card vip-gold-card p-6 sm:p-8 relative overflow-hidden">
                  <div className="absolute right-6 top-6 flex items-center gap-2">
                    <span className="text-[10px] tracking-wider text-amber-300/80 font-mono">432Hz 靈魂共鳴</span>
                    <div className="tech-waveform">
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                      <div className="tech-waveform-bar" />
                    </div>
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold">🎵 人格天命主題音樂</p>
                  <h3 className="mt-3 font-serif text-2xl text-white">天宿聲律共鳴頻率 — 仙宿調色盤</h3>
                  <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
                    系統已自動提取雙方的生辰與血型能量頻率，合成了專屬的靈魂配對音樂。目前聲波正以 428Hz-432Hz 療癒共鳴頻率在瀏覽器背景對齊中。
                  </p>
                </div>

                {/* 前世因果標題 */}
                <div className="fortune-card vip-gold-card p-6 sm:p-8 relative">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-amber-300">💫 因果大數據故事</p>
                      <h2 className="mt-3 font-serif text-3xl text-white">配對前世今生因果關係</h2>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-[color:var(--text-muted)]">天宿關係共鳴度</p>
                      <p className="mt-2 font-serif text-4xl text-amber-300 font-black text-shadow-glow">{data?.karma_story?.resonance_score ?? 60}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="fortune-card vip-gold-card p-5 sm:p-6">
                    <p className="text-xs text-violet-300 font-semibold">主動付出者</p>
                    <p className="mt-3 text-lg text-white font-bold">{data?.karma_story?.active_giver ?? personA.name}</p>
                  </div>
                  <div className="fortune-card vip-gold-card p-5 sm:p-6">
                    <p className="text-xs text-amber-300 font-semibold">需要被理解者</p>
                    <p className="mt-3 text-lg text-white font-bold">{data?.karma_story?.needs_understanding ?? personB.name}</p>
                  </div>
                </div>

                {data?.karma_story?.personA_star && data?.karma_story?.personB_star && (
                  <div className="fortune-card vip-gold-card p-6 sm:p-8 border-amber-500/30 bg-gradient-to-r from-amber-950/15 via-slate-900/40 to-amber-950/15">
                    <p className="mb-4 text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold">☯️ 雙方天命星軌契合解碼</p>
                    <div className="rounded-2xl bg-slate-950/50 border border-amber-500/10 px-5 py-4 text-center">
                      <p className="text-sm font-semibold text-amber-200">
                        【{personA.name}】與【{personB.name}】的宿命引力軌道已接軌
                      </p>
                      <p className="mt-2 text-xs text-[color:var(--text-sub)]">
                        星格對照：{data.karma_story.personA_star} × {data.karma_story.personB_star}
                      </p>
                    </div>
                  </div>
                )}

                {data?.karma_story?.iching_hexagram && (
                  <div className="fortune-card vip-gold-card p-6 sm:p-8 border-violet-500/30 bg-gradient-to-r from-violet-950/15 via-slate-900/40 to-violet-950/15 relative overflow-hidden">
                    <div className="absolute top-1.5 right-2.5 text-[7px] text-violet-400/30 font-mono tracking-widest">[I_CHING_MUTATION]</div>
                    <p className="mb-4 text-xs uppercase tracking-[0.35em] text-violet-300 font-semibold">☯️ 易經動爻合盤卦象</p>
                    <div className="rounded-2xl bg-slate-950/60 border border-violet-500/10 px-5 py-4 text-center">
                      <p className="text-xl font-bold text-violet-200 tracking-wider">
                        {data.karma_story.iching_hexagram}
                      </p>
                      <p className="mt-2 text-xs text-[color:var(--text-muted)] leading-5">
                        易理爻象變易點評：此卦象精確對應雙方姓名三才與八字能量消長之天機。
                      </p>
                    </div>
                  </div>
                )}

                <div className="fortune-card vip-gold-card p-6 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold">關係課題</p>
                  <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">{data?.karma_story?.relationship_theme ?? '天宿因果關係課題加載中...'}</p>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-rose-300 font-semibold">因果故事</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[color:var(--text-sub)]">{data?.karma_story?.story ?? '因果修行大數據運算中...'}</p>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300 font-semibold">今生建議</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[color:var(--text-sub)]">{enforceAiCopywritingTone(data?.karma_story?.today_advice ?? '今生修行大數據判定中...')}</p>
                </div>

                <div className="fortune-card vip-gold-card p-6 sm:p-8 border-emerald-400/30">
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-300 font-semibold">善念結語</p>
                  <p className="mt-4 whitespace-pre-wrap italic text-sm leading-8 text-[color:var(--text-sub)]">{data?.karma_story?.closing_wisdom ?? '善念結語載入中...'}</p>
                </div>

                {/* 順天改命官方修行指引板塊 */}
                <div className="fortune-card vip-gold-card p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 shadow-[0_0_30px_rgba(201,162,74,0.15)] relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-[0.12] pointer-events-none translate-x-6 translate-y-6">
                    <svg
                      className="w-64 h-64 text-amber-500"
                      style={{ animation: 'spin 80s linear infinite' }}
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <linearGradient id="taijiGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
                          <stop offset="50%" stopColor="currentColor" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
                        </linearGradient>
                        <filter id="taijiGlowGold" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="1.2" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* 外圈多重精細星軌 */}
                      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" opacity="0.3" fill="none" />
                      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.5" fill="none" />
                      <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="0.25" opacity="0.4" fill="none" />
                      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="0.5" strokeDasharray="8,2" opacity="0.3" fill="none" />

                      {/* 八卦文字卦象 */}
                      <g fontSize="4.5" fill="currentColor" opacity="0.7" fontFamily="monospace" filter="url(#taijiGlowGold)">
                        <text x="50" y="10" textAnchor="middle">☰</text>
                        <text x="78" y="22" textAnchor="middle" transform="rotate(45, 78, 22)">☴</text>
                        <text x="90" y="50" textAnchor="middle" transform="rotate(90, 90, 50)">☲</text>
                        <text x="78" y="78" textAnchor="middle" transform="rotate(135, 78, 78)">☳</text>
                        <text x="50" y="90" textAnchor="middle" transform="rotate(180, 50, 90)">☷</text>
                        <text x="22" y="78" textAnchor="middle" transform="rotate(225, 22, 78)">☱</text>
                        <text x="10" y="50" textAnchor="middle" transform="rotate(270, 10, 50)">☵</text>
                        <text x="22" y="22" textAnchor="middle" transform="rotate(315, 22, 22)">☶</text>
                      </g>

                      {/* 太極本體 */}
                      <g filter="url(#taijiGlowGold)">
                        <path
                          d="M 50 16 A 34 34 0 0 1 50 84 A 17 17 0 0 1 50 50 A 17 17 0 0 0 50 16 Z"
                          fill="url(#taijiGradGold)"
                          stroke="none"
                        />
                        <circle cx="50" cy="33" r="4" fill="#020617" stroke="none" />
                        <circle cx="50" cy="67" r="4" fill="currentColor" stroke="none" opacity="0.9" />
                      </g>
                    </svg>
                  </div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300 font-semibold font-mono">☯️ 順天改命 · 天宿法門</p>
                  <h3 className="mt-3 font-serif text-xl font-bold text-white">改命在於改心，行善方能順天</h3>
                  <div className="mt-4 text-sm leading-8 text-[color:var(--text-sub)] space-y-4">
                    <p>
                      天宿因果有軌，如大樹落葉必將歸根；但人心無界，一念動則乾坤變。修行之要，不在於逃避業力，而在於「以善為本，順天而行」。
                    </p>
                    <p>
                      「菩提本無樹，明鏡亦非台。」關係中的糾纏與痛楚，皆因心有色相、執迷不悟（人有色無空）。當你真正看透這層幻象，學會放下對他人的控制與索求，回歸「善」的本心，這段關係的因果便已在默默中改寫。
                    </p>
                    <p className="font-semibold text-amber-300">
                      {buildPersonalizedPracticeLine(data)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isUnlocked && (
              <button
                type="button"
                onClick={scrollToTop}
                className="w-full py-4.5 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-slate-950 via-amber-950/20 to-slate-950 text-center text-sm font-semibold text-amber-300 shadow-[0_0_15px_rgba(201,162,74,0.05)] hover:border-amber-500/40 hover:text-amber-200 transition-all duration-300 active:scale-[0.98] animate-pulse flex items-center justify-center gap-2 mb-4"
              >
                <span>☯️ 已悉知天宿業力指點 · 點擊平滑滑回頂部 ☯️</span>
              </button>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => window.print()} className="vip-gold-btn flex-1 py-4 text-sm">
                匯出配對報告
              </button>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
              >
                重新輸入
              </button>
            </div>

            <NextStepGuide current="match" />
          </div>
        )}

        <section className="mt-10 pb-5 sm:mt-14 sm:pb-8" aria-label="Home trust counters">
          <div className="mx-auto max-w-3xl">
            <div className="home-trust-strip home-trust-strip--footer grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <AiTrustFeedback className="home-trust-card flex min-h-[108px] min-w-0 flex-col justify-center overflow-hidden rounded-xl border border-amber-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.15),rgba(34,211,238,0.1)_38%,rgba(15,23,42,0.76)_64%,rgba(2,6,23,0.93)_100%)] px-3 py-2.5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl" />
              <FeatureVisitorCounter featureKey="home" className="home-trust-card home-trust-card--visitor h-full !w-full min-w-0" deferMs={1500} compact permanent />
            </div>
          </div>
        </section>

        {/* 底部 LINE 好友入口 */}
        <LineVipShareCard friendHref={lineFriendHref} onShare={handleLineShare} />

        <div className="pb-2 text-center text-[10px] font-semibold tracking-[0.32em] text-[color:var(--text-muted)] opacity-45">
          080
        </div>
      </main>

      {showScrollDown && isUnlocked && data && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none animate-bounce">
          <span className="rounded-full border border-amber-500/30 bg-slate-950/90 px-4 py-2.5 text-xs font-semibold tracking-widest text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-1.5 backdrop-blur-sm">
            <span>👇</span> 向下滑動閱讀完整天命因果 <span>👇</span>
          </span>
        </div>
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full border border-amber-500/30 bg-slate-950/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all duration-300 hover:scale-110 hover:border-amber-400 hover:text-amber-200 active:scale-95"
          aria-label="回到頂部"
        >
          <span className="text-[11px] leading-none">▲</span>
          <span className="text-[8px] font-black leading-none tracking-0">{'\u5146\u6ac3'}</span>
        </button>
      )}

      {/* 易經論數字 Modal 彈窗 */}
      {isFortuneModalOpen && (
        <div className="number-fortune-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="number-fortune-panel relative w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-slate-900/95 p-6 pt-16 sm:p-8 sm:pt-16 shadow-[0_0_50px_rgba(34,211,238,0.25)] max-h-[90vh] overflow-y-auto">
            
            {/* 關閉按鈕 */}
            <button
              type="button"
              onClick={() => {
                setIsFortuneModalOpen(false);
                setFortuneResult(null);
                setFortuneNumber('');
                setModalEvolutionStage('idle');
                setModalEvolutionLabel('觸碰太極，觀察萬象演化');
                setModalEvolutionDescription('');
                restoreHomeUrl();
              }}
              className="number-fortune-close-button absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-[color:var(--text-sub)] hover:border-white/20 hover:text-white transition"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFortuneModalOpen(false);
                setFortuneResult(null);
                setFortuneNumber('');
                setFortuneError('');
                restoreHomeUrl();
                window.setTimeout(scrollToTop, 0);
              }}
              className="number-fortune-home-guide absolute top-4 left-4 inline-flex h-8 max-w-[calc(100%-4.5rem)] items-center justify-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 text-[11px] font-black leading-none tracking-[0.08em] text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/16 hover:text-white active:scale-[0.98]"
              aria-label={"\u8fd4\u56de\u9996\u9801"}
            >
              <span aria-hidden="true">{"\u2302"}</span>
              <span>{"\u8fd4\u56de\u9996\u9801"}</span>
            </button>

            {/* Modal 頂部立體優美太極圖案 (升級版) - 帶點擊爆發音效與大悲咒彩蛋功能 */}
            <div className="number-fortune-split-stack">
              <section className="number-fortune-card number-fortune-analysis-card" aria-label="Number fortune analysis">
            <div className="number-fortune-intro mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">易經數字好壞</p>
              <h3 className="mt-2 font-serif text-2xl text-[color:var(--text-main)]">輸入數字，立即判定</h3>
              <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                輸入 2 到 10 碼，系統會自動過濾符號，只保留數字。
              </p>
            </div>

            <FeatureVisitorCounter featureKey="number" className="hidden" />

            <IdentitySplitSelector className="mb-4" />
            <DailyAnalysisNotice record={numberDailyRecord} className="mb-4" moduleName="易經論數字" onViewResult={numberDailyRecord ? () => restoreNumberDailyRecord(numberDailyRecord) : undefined} />
            {!fortuneLoading && !fortuneResult && (
              <FineDiningServiceProgress
                module="number"
                state="idle"
                className="mb-4"
                liveMessage="第一道確認：你的資料已安全接收，接著會逐步完成品質確認。"
              />
            )}

            <div className={`relative overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_16%_0%,rgba(251,191,36,0.24),transparent_34%),radial-gradient(circle_at_92%_14%,rgba(244,63,94,0.16),transparent_30%),linear-gradient(135deg,rgba(8,13,28,0.96),rgba(14,116,144,0.2),rgba(2,6,23,0.98))] p-4 shadow-[0_0_44px_rgba(34,211,238,0.22),0_0_70px_rgba(251,191,36,0.08),inset_0_0_30px_rgba(255,255,255,0.055)] ${numberInputNeedsAttention ? 'border-rose-300/75 shadow-[0_0_42px_rgba(244,63,94,0.32),inset_0_0_26px_rgba(244,63,94,0.08)]' : 'border-cyan-200/35'}`}>
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/80 to-transparent" />
              <div className="pointer-events-none absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
              <div className={`pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full border ${numberInputNeedsAttention ? 'border-rose-300/28 shadow-[0_0_44px_rgba(244,63,94,0.28)]' : 'border-cyan-200/18 shadow-[0_0_36px_rgba(34,211,238,0.18)]'}`} />
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${numberInputNeedsAttention ? 'text-rose-200 animate-pulse' : 'text-amber-200'}`}>NUMBER</p>
                  <h4 className="mt-1 font-serif text-2xl font-black leading-tight text-cyan-50 drop-shadow-[0_0_16px_rgba(34,211,238,0.24)]">輸入數字</h4>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.12em] ${numberInputNeedsAttention ? 'border-rose-200/70 bg-rose-500/18 text-rose-100 animate-pulse' : 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100'}`}>
                  4 / 6 / 8 / 10 碼
                </span>
              </div>

              <div className="flex flex-col gap-4">
                <div className={`relative min-w-0 rounded-[28px] border bg-slate-950/52 p-3 shadow-[0_0_32px_rgba(34,211,238,0.18),inset_0_0_30px_rgba(34,211,238,0.09)] ${numberInputNeedsAttention ? 'border-rose-300/70 shadow-[0_0_34px_rgba(244,63,94,0.26),inset_0_0_26px_rgba(244,63,94,0.08)]' : 'border-cyan-100/28'}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
                    <span className={`text-[11px] font-black tracking-[0.16em] ${numberInputNeedsAttention ? 'text-rose-100 animate-pulse' : 'text-cyan-100/75'}`}>
                      {numberInputNeedsAttention ? '請填寫阿拉伯數字 0-9' : '只輸入阿拉伯數字 0-9'}
                    </span>
                    <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black text-amber-100/85">
                      {fortuneNumber.length}/10
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fortuneNumber}
                    inputMode="numeric"
                    autoComplete="off"
                    onChange={(e) => {
                      setFortuneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setFortuneError('');
                    }}
                    onFocus={() => setFortuneError('')}
                    placeholder={numberInputNeedsAttention ? '1688' : '輸入數字'}
                    aria-label="易經論數字輸入框"
                    style={fortuneNumberDigitStyle}
                    className={`fortune-number-max-input min-h-[186px] w-full rounded-[30px] bg-slate-950/92 px-1.5 py-8 text-center font-mono font-black leading-none tracking-normal text-cyan-50 shadow-[0_0_70px_rgba(34,211,238,0.44),0_0_34px_rgba(251,191,36,0.08),inset_0_0_48px_rgba(34,211,238,0.14)] glass-input glass-input-cyan neon-input-focus sm:min-h-[214px] ${numberInputNeedsAttention ? 'border-rose-300/85 placeholder:text-rose-100/72 shadow-[0_0_64px_rgba(244,63,94,0.42),inset_0_0_42px_rgba(244,63,94,0.12)] animate-pulse' : 'border-cyan-100/80 placeholder:text-cyan-100/34'} ${fortuneError && !fortuneResult ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.38)]' : ''}`}
                  />
                  <p className="mt-2 px-2 text-center text-[11px] font-bold leading-5 text-cyan-100/62">
                    可輸入手機後 4 碼，也可輸入完整 10 碼。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNumberFortune}
                  disabled={fortuneLoading}
                  className="vip-gold-btn min-h-[66px] w-full px-10 py-4 text-base font-black tracking-[0.12em] shadow-[0_0_34px_rgba(251,191,36,0.26)] disabled:opacity-40 sm:self-end sm:w-auto"
                >
                  {fortuneLoading ? '易經正在確認流程' : getDailyAnalysisButtonLabel(numberDailyRecord)}
                </button>
              </div>
            </div>


            <NumberFortuneThreeLayerCard mode="input" />
            {fortuneError && (
              <p className="form-missing-alert">
                {fortuneError}
              </p>
            )}

            {fortuneLoading && (() => {
              const loadingCopy = getNumberFortuneLoadingCopy(fortuneStatus, fortuneJob);
              return (
                <div className="number-computing-panel result-container mt-6 font-sans" role="status" aria-live="polite" aria-busy="true">
                  <FineDiningServiceProgress
                    module="number"
                    state={getNumberFineDiningState(fortuneStatus, fortuneJob)}
                    liveMessage={loadingCopy.detail}
                  />
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
                    {'分析目標：'}<span className="font-mono text-cyan-100">{fortuneNumber}</span>{'，系統會逐步確認資料、分析與完整性，最後顯示專屬結果。'}
                  </div>
                </div>
              );
            })()}
            {fortuneResult && !fortuneLoading && (() => {
              const qualityGate = getNumberQualityGateResult(fortuneResult);
              if (!qualityGate.readyForFrontend) {
                return (
                  <p className="form-missing-alert">
                    {getFriendlyQualityGateError(qualityGate)}
                  </p>
                );
              }

              return (
                <div className={`result-container fade-result mt-6 rounded-2xl border p-4 space-y-3 font-sans relative overflow-hidden sm:p-5 ${fortuneAura.resultClass}`}>
                  <FineDiningServiceProgress
                    module="number"
                    state="completed"
                    liveMessage="最終完成：你的專屬分析已準備完成。"
                  />
                  <NumberFortuneThreeLayerCard mode="result" result={fortuneResult} />
                  {fortuneAura.stage > 0 && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_38%),linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)] mix-blend-screen" />
                      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full border border-current opacity-20 animate-[spin_16s_linear_infinite]" />
                      <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.22em] ${fortuneAura.badgeClass}`}>
                            彩蛋解鎖 · {fortuneAura.label}
                          </span>
                          <span className="text-[10px] font-mono tracking-[0.18em] text-white/55">
                            TAIJI AURA {fortuneAura.stage}
                          </span>
                        </div>
                        <p className={`mt-2 text-xs font-semibold leading-5 ${fortuneAura.textClass}`}>
                          {fortuneAura.blessing}
                        </p>
                      </div>
                    </>
                  )}
                  <FeatureVisitorCounter featureKey="iching" className="hidden" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-cyan-200">
                      分析對象：<span className="text-base text-cyan-100 font-mono font-bold">{fortuneResult.value}</span>
                    </span>
                    <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-100">
                      {fortuneResult.mode === 'phone10' ? '完整 10 碼' : fortuneResult.mode === 'digit8' ? '8 碼' : fortuneResult.mode === 'six6' ? '6 碼' : '後 4 碼'}
                    </span>
                  </div>

                  <details className="relative z-10 overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/45 p-4">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-black leading-7 text-cyan-100">
                      <span>查看完整分析</span>
                      <span className="text-[11px] text-cyan-100/60">專業資料</span>
                    </summary>
                    <div className="mt-4 space-y-4">
                      <NumberFortuneGradeBanner result={fortuneResult} />
                      <FiveElementPriorityCard result={fortuneResult.fiveElement} />
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7">
                        <p className="font-semibold text-cyan-300">分析解說・建議鼓勵</p>
                        <p className="mt-2 text-[color:var(--text-sub)]">{enforceAiCopywritingTone(fortuneResult.summary)}</p>
                        <p className="mt-3 text-xs leading-6 text-[color:var(--text-muted)]">{enforceAiCopywritingTone(fortuneResult.advice)}</p>
                      </div>
                    </div>
                  </details>
                </div>
              );
            })()}
              </section>

              <section className="number-fortune-card number-fortune-taiji-card" aria-label="Tai Chi interaction">
            <div className="number-fortune-taiji-wrap mb-8 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={handleModalTaiChiClick}
                className={`modal-taiji-button taiji-evolution-stage stage-${modalEvolutionStage} group ${fortuneAura.taijiClass}`}
                title="觸碰太極，觀察一二四八萬象演化；連點 3/6/12/24 保留天宿彩蛋"
              >
                {fortuneAura.stage > 0 && (
                  <>
                    <div className="pointer-events-none absolute -inset-14 rounded-full border border-current opacity-20 blur-[5px] animate-[pulse_3.2s_ease-in-out_infinite]" />
                    <div className="pointer-events-none absolute -inset-24 rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.14),transparent,rgba(251,191,36,0.16),transparent)] opacity-45 blur-[3px] animate-[spin_22s_linear_infinite]" />
                    <span className={`pointer-events-none absolute -bottom-9 rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.2em] backdrop-blur-md ${fortuneAura.badgeClass}`}>
                      {fortuneAura.label}
                    </span>
                  </>
                )}
                <div className="modal-taiji-natural-bloom" aria-hidden="true" />
                <div className="modal-taiji-orbit-emblem" aria-hidden="true">
                  <div className="taiji-orbit-layer modal-taiji-orbit-layer">
                    <div className="taiji-light-orbit taiji-light-orbit--cyan">
                      <span className="taiji-light-orbit__head" />
                    </div>
                    <div className="taiji-light-orbit taiji-light-orbit--violet">
                      <span className="taiji-light-orbit__head" />
                    </div>
                    <div className="taiji-light-orbit taiji-light-orbit--gold">
                      <span className="taiji-light-orbit__head" />
                    </div>
                    <div className="taiji-light-orbit taiji-light-orbit--emerald">
                      <span className="taiji-light-orbit__head" />
                    </div>
                    <div className="taiji-light-orbit taiji-light-orbit--rose">
                      <span className="taiji-light-orbit__head" />
                    </div>
                    <div className="taiji-gold-waves">
                      <span className="taiji-gold-wave" />
                      <span className="taiji-gold-wave" />
                      <span className="taiji-gold-wave" />
                    </div>
                    <div className="taiji-celestial-mist">
                      <span className="taiji-celestial-wisp taiji-celestial-wisp--one" />
                      <span className="taiji-celestial-wisp taiji-celestial-wisp--two" />
                      <span className="taiji-celestial-wisp taiji-celestial-wisp--three" />
                    </div>
                  </div>
                  <div className={`modal-taiji-3d-core ${
                    fortuneLoading || modalTapCount > 0 ? 'modal-taiji-3d-core--active' : ''
                  }`}>
                    <div className="modal-taiji-core-glaze" />
                    <div className="modal-taiji-half modal-taiji-half--yang" />
                    <div className="modal-taiji-half modal-taiji-half--yin" />
                    <div className="modal-taiji-fish modal-taiji-fish--yang">
                      <span />
                    </div>
                    <div className="modal-taiji-fish modal-taiji-fish--yin">
                      <span />
                    </div>
                    <div className="modal-taiji-core-depth" />
                  </div>
                </div>

                {modalEvolutionStage !== 'idle' && (
                  <>
                    <div className="modal-evolution-flare" aria-hidden="true" />
                    <div className="modal-evolution-scan" aria-hidden="true" />
                    <div className="modal-evolution-orbit modal-evolution-orbit-a" aria-hidden="true" />
                    <div className="modal-evolution-orbit modal-evolution-orbit-b" aria-hidden="true" />
                    <div className="modal-evolution-rays" aria-hidden="true">
                      {Array.from({ length: 16 }, (_, index) => (
                        <span key={index} className={`modal-energy-ray modal-energy-ray-${index}`} />
                      ))}
                    </div>
                  </>
                )}

                {modalEvolutionStage === 'taiji' && (
                  <div className="modal-evolution-breath" />
                )}

                {modalEvolutionStage === 'liangyi' && (
                  <div className="modal-evolution-layer modal-liangyi-layer" aria-hidden="true">
                    <span className="modal-liangyi-node modal-liangyi-yang">陽</span>
                    <span className="modal-liangyi-node modal-liangyi-yin">陰</span>
                  </div>
                )}

                {modalEvolutionStage === 'sixiang' && (
                  <div className="modal-evolution-layer modal-sixiang-layer" aria-hidden="true">
                    <span className="modal-sixiang-node modal-sixiang-0">老陽</span>
                    <span className="modal-sixiang-node modal-sixiang-1">少陰</span>
                    <span className="modal-sixiang-node modal-sixiang-2">少陽</span>
                    <span className="modal-sixiang-node modal-sixiang-3">老陰</span>
                  </div>
                )}

                {modalEvolutionStage === 'bagua' && (
                  <div className="modal-evolution-layer modal-bagua-layer" aria-hidden="true">
                    {BAGUA_SYMBOLS.map(([name, symbol], index) => (
                      <span key={name} className={`modal-bagua-node modal-bagua-${index}`}>
                        <b>{symbol}</b>
                        <small>{name}</small>
                      </span>
                    ))}
                  </div>
                )}
                <div className="modal-taiji-ground-glow" aria-hidden="true" />
              </button>
              <p className="mt-8 min-h-[34px] text-center text-xs font-semibold tracking-[0.18em] text-cyan-100/85" aria-live="polite">
                {modalEvolutionLabel}
                {modalEvolutionDescription && (
                  <span className="mt-1 block text-[10px] tracking-[0.14em] text-amber-200/75">
                    {modalEvolutionDescription}
                  </span>
                )}
              </p>
            </div>

              </section>
            </div>

            {/* 唵嘛念叭咪吽 (3點擊) */}
            {showModalMantra && (
              <div className="number-taiji-blessing-overlay number-taiji-blessing-overlay--mantra absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none rounded-3xl animate-fade-in">
                <span className="text-amber-300 text-3xl font-serif font-black tracking-widest animate-pulse drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]">
                  唵 嘛 呢 叭 咪 吽
                </span>
                <span className="text-xs text-amber-200/70 mt-2 font-mono">// 觀音大明六字大白傘蓋守護</span>
              </div>
            )}

            {/* 大悲咒初照 (6點擊) */}
            {showModalSuperMantra && (
              <div className="number-taiji-blessing-overlay number-taiji-blessing-overlay--super absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none rounded-3xl animate-fade-in">
                <span className="text-cyan-200 text-2xl font-serif font-black tracking-[0.2em] text-center max-w-md px-6 leading-10 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                  南無喝囉怛那哆囉夜耶 · 南無阿唎耶
                </span>
                <span className="text-xs text-cyan-300/70 mt-3 font-mono">// 大悲法水淨化 · 時空命盤調諧中</span>
              </div>
            )}

            {/* 佛光普照 (12點擊) */}
            {showModalMegaMantra && (
              <div className="number-taiji-blessing-overlay number-taiji-blessing-overlay--mega absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none rounded-3xl animate-fade-in">
                <span className="text-amber-200 text-3xl font-serif font-black tracking-widest text-center animate-bounce drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]">
                  ✨ 萬丈佛光普照 ✨
                </span>
                <span className="text-xs text-amber-300/80 mt-3 font-mono max-w-xs text-center leading-5">
                  五行圓融，天宿齊鳴。今生善因在此匯聚。
                </span>
              </div>
            )}

            {/* 萬佛朝宗大悲咒 (24點擊) */}
            {showModalGreatMantra && (
              <div className="number-taiji-blessing-overlay number-taiji-blessing-overlay--great absolute inset-0 z-25 flex flex-col items-center justify-center pointer-events-none rounded-3xl animate-[rise-in_0.6s_ease-out]">
                <div className="text-center space-y-4 px-6">
                  <h4 className="text-amber-300 text-4xl font-serif font-black tracking-[0.3em] drop-shadow-[0_0_25px_rgba(251,191,36,1.0)] animate-pulse">
                    卍 萬佛朝宗大悲咒 卍
                  </h4>
                  <p className="text-[10px] text-amber-100/90 leading-6 font-serif max-w-lg mx-auto">
                    婆盧吉帝室佛囉楞馱婆 · 南無那囉謹墀 · 醯利摩訶皤哆沙咩 · 薩婆阿他豆輸朋
                  </p>
                  <p className="text-xs text-amber-400 font-bold tracking-widest animate-pulse mt-2">
                    ☯️ 天地人八格功德圓滿 · 因果業障退散 ☯️
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {SHOW_HOME_FLOATING_NUMBER_BUTTON && (
        <>
          {/* 懸浮霓虹解碼球 (Floating Cybernetic Badge) */}
          <button
            type="button"
            onClick={openFortuneModal}
            className="fixed bottom-24 right-6 z-40 flex h-14 w-14 flex-col items-center justify-center rounded-full border border-cyan-500/40 bg-slate-950/90 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300 hover:scale-110 hover:border-cyan-300 hover:text-cyan-200 hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-95 animate-pulse cursor-pointer group"
            aria-label="數字好壞"
          >
            <span className="text-xl group-hover:rotate-180 transition-transform duration-500">☯️</span>
            <span className="text-[9px] font-bold tracking-tighter mt-0.5 scale-90">數理</span>
          </button>
        </>
      )}

      {/* 系統自我修復極光 Toast 提示 */}
      {showRepairToast && (
        <div className="fixed top-12 left-1/2 z-[99999] -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-slate-950/90 px-6 py-4.5 text-xs font-bold tracking-widest text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-fade-in backdrop-blur-md">
          <span>⚙️</span>
          <span>天宿量子磁場對齊與顯示卡尺修復... 100% 正常恢復！</span>
        </div>
      )}
    </div>
  );
}
