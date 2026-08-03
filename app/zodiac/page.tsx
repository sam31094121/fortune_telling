'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import AnalysisReadingFlow from '@/components/AnalysisReadingFlow';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import GuidedDateInput from '@/components/GuidedDateInput';
import GuidedTimeInput from '@/components/GuidedTimeInput';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import { saveBirthProfile } from '@/lib/birth-profile-client';
import { searchCities, findCityById, type CityEntry } from '@/lib/city-directory';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';
import type { BloodType } from '@/lib/types';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import { clearDailyAnalysis, getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type JobStatus = 'IDLE' | 'VALIDATING' | 'QUEUED' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

type AnalysisJob = {
  jobId: string;
  moduleId?: string;
  status: JobStatus;
  progressStage: string;
  progressPercent: number | null;
  message: string;
  resultId: string | null;
  result?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  result?: unknown;
};

type ZodiacTraceStepId = 'received' | 'sign' | 'blood' | 'prompt' | 'ai' | 'element' | 'write' | 'done';
type ZodiacTraceStatus = 'pending' | 'running' | 'done' | 'error';

type ZodiacTraceStep = {
  id: ZodiacTraceStepId;
  label: string;
  status: ZodiacTraceStatus;
  detail?: string;
};

const ZODIAC_ANALYSIS_TIMEOUT_MS = 45_000;
const ZODIAC_TRACE_TEMPLATE: ZodiacTraceStep[] = [
  { id: 'received', label: '收到資料', status: 'pending' },
  { id: 'sign', label: '判定星座', status: 'pending' },
  { id: 'blood', label: '判定血型', status: 'pending' },
  { id: 'prompt', label: '建立 Prompt', status: 'pending' },
  { id: 'ai', label: 'AI 分析', status: 'pending' },
  { id: 'element', label: '五元素整合', status: 'pending' },
  { id: 'write', label: '資料寫入分流', status: 'pending' },
  { id: 'done', label: '建立報告', status: 'pending' },
];

function createTraceSteps(): ZodiacTraceStep[] {
  return ZODIAC_TRACE_TEMPLATE.map((step) => ({ ...step }));
}

function updateTraceStep(
  onTrace: (stepId: ZodiacTraceStepId, status: ZodiacTraceStatus, detail?: string) => void,
  stepId: ZodiacTraceStepId,
  status: ZodiacTraceStatus,
  detail?: string,
) {
  onTrace(stepId, status, detail);
  const prefix = status === 'error' ? '[ZODIAC][ERROR]' : '[ZODIAC]';
  console.info(prefix, stepId, detail ?? status);
}

type ZodiacSignSummary = {
  key: string;
  name: string;
  symbol: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  dateRange: string;
};

type ZodiacPrecision = 'DATE_ONLY' | 'DATE_TIME' | 'FULL_CHART';

type ZodiacElement = ZodiacSignSummary['element'];
type ZodiacModality = 'cardinal' | 'fixed' | 'mutable';
type ZodiacPolarity = 'yang' | 'yin';
type ZodiacPointRole = 'sun' | 'moon' | 'rising';

type ZodiacProfessionalPoint = {
  role: ZodiacPointRole;
  roleLabel: string;
  sign: ZodiacSignSummary;
  element: ZodiacElement;
  modality: ZodiacModality;
  polarity: ZodiacPolarity;
  ruler: string;
  houseTheme: string;
  longitudeDeg: number | null;
  calculationSource: 'date_range' | 'astronomy_engine' | 'not_available';
  available: boolean;
  professionalMeaning: string;
};

type ZodiacProfessionalChart = {
  layer: 'professional_zodiac_chart';
  generatedFrom: 'normalized_birth_input';
  recalculationAllowed: false;
  input: { name: string | null; birthDate: string; birthTime: string | null; birthCityId: string | null };
  precision: ZodiacPrecision;
  precisionScore: number;
  dataQuality: {
    birthDate: 'provided';
    birthTime: 'provided' | 'missing';
    birthCity: 'provided' | 'assumed' | 'missing';
    note: string;
  };
  points: {
    sun: ZodiacProfessionalPoint;
    moon: ZodiacProfessionalPoint | null;
    rising: ZodiacProfessionalPoint | null;
  };
  dominantSignature: {
    element: ZodiacElement;
    modality: ZodiacModality;
    polarity: ZodiacPolarity;
    score: number;
    basis: string[];
  };
  elementDistribution: Record<ZodiacElement, number>;
  modalityDistribution: Record<ZodiacModality, number>;
  polarityDistribution: Record<ZodiacPolarity, number>;
  professionalKeywords: string[];
  readingBoundaries: string[];
  integrationWeights: Record<'AIR' | 'FIRE' | 'WATER' | 'EARTH', number>;
};

type ZodiacDeepPointReading = {
  role: ZodiacPointRole;
  roleLabel: string;
  sourceSign: ZodiacSignSummary;
  title: string;
  interpretation: string;
  integrationFocus: string;
  evidence: string[];
};

type ZodiacDeepAnalysis = {
  layer: 'ai_zodiac_deep_analysis';
  sourceLayer: 'professional_zodiac_chart';
  recalculationAllowed: false;
  professionalInputDigest: string[];
  coreNarrative: string;
  pointReadings: ZodiacDeepPointReading[];
  dominantInterpretation: string;
  tensionPatterns: string[];
  growthOpportunities: string[];
  userFriendlySummary: string;
  aiPromptMaterial: {
    fixedFacts: string[];
    interpretationRules: string[];
    prohibitedMoves: string[];
  };
};

type ZodiacBrandElementCode = 'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH';

type ZodiacReinforcementPriority = {
  rank: 1 | 2 | 3;
  element: ZodiacBrandElementCode;
  elementLabel: string;
  needScore: number;
  reason: string;
  actions: string[];
  sourceEvidence: string[];
};

type ZodiacReinforcementPlan = {
  layer: 'ai_zodiac_reinforcement_plan';
  sourceLayer: 'ai_zodiac_deep_analysis';
  recalculationAllowed: false;
  principle: string;
  priorities: [ZodiacReinforcementPriority, ZodiacReinforcementPriority, ZodiacReinforcementPriority];
  executionOrder: string[];
  integrationLayerPayload: {
    moduleId: 'ZODIAC';
    sourceEngineVersion: string;
    elementNeedScore: Record<ZodiacBrandElementCode, number>;
    firstPriority: ZodiacBrandElementCode;
    evidence: string[];
    writePolicy: string;
  };
};

type ZodiacResult = {
  ok: true;
  mode: 'zodiac';
  moduleId: 'ZODIAC';
  engineVersion: string;
  input: { name: string | null; birthDate: string; birthTime: string | null; birthCityId: string | null };
  precision: ZodiacPrecision;
  sign: ZodiacSignSummary;
  risingSign: ZodiacSignSummary | null;
  moonSign: ZodiacSignSummary | null;
  professionalChart?: ZodiacProfessionalChart;
  deepAnalysis?: ZodiacDeepAnalysis;
  reinforcementPlan?: ZodiacReinforcementPlan;
  chartNote: string;
  personality: string;
  strengths: string[];
  blindSpots: string[];
  currentAdvice: string;
  weeklyReminder: string;
  integrationSummary: string;
  fiveElement?: FiveElementIntegrationResult;
};

type BirthTimeMode = 'unknown' | 'known' | null;

type ZodiacForm = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthCityId: string | null;
  bloodType: BloodType;
};

const INITIAL_FORM: ZodiacForm = { name: '', birthDate: '', birthTime: '', birthCityId: null, bloodType: '' };
const ELEMENT_LABEL: Record<ZodiacResult['sign']['element'], string> = {
  fire: '火象',
  earth: '土象',
  air: '風象',
  water: '水象',
};
const PRECISION_LABEL: Record<ZodiacPrecision, string> = {
  DATE_ONLY: 'Level 1 · 太陽星座',
  DATE_TIME: 'Level 2 · 上升＋月亮星座',
  FULL_CHART: 'Level 3 · 完整星盤',
};
const MODALITY_LABEL: Record<ZodiacModality, string> = {
  cardinal: '\u958b\u5275',
  fixed: '\u56fa\u5b9a',
  mutable: '\u8b8a\u52d5',
};

const POLARITY_LABEL: Record<ZodiacPolarity, string> = {
  yang: '\u967d\u6027',
  yin: '\u9670\u6027',
};

const DATA_QUALITY_LABEL: Record<'provided' | 'missing' | 'assumed', string> = {
  provided: '\u5df2\u63d0\u4f9b',
  missing: '\u672a\u63d0\u4f9b',
  assumed: '\u4f30\u7b97',
};

const BLOOD_TYPES: Array<Exclude<BloodType, ''>> = ['A', 'B', 'AB', 'O'];

function isCurrentZodiacResult(value: ZodiacResult | null | undefined): value is ZodiacResult {
  return Boolean(
    value?.professionalChart?.points?.sun &&
    value.professionalChart.dominantSignature &&
    value.professionalChart.elementDistribution &&
    value.professionalChart.modalityDistribution &&
    value.professionalChart.polarityDistribution &&
    value.deepAnalysis?.pointReadings?.length &&
    value.reinforcementPlan?.priorities?.length === 3,
  );
}

function activeStep(job: AnalysisJob | null) {
  if (!job || job.status === 'QUEUED' || job.status === 'VALIDATING') return 0;
  if (job.status === 'PROCESSING') return 1;
  if (job.status === 'FINALIZING' || job.status === 'COMPLETED') return 2;
  return 0;
}

async function safeJson<T>(url: string, init?: RequestInit, timeoutMs = ZODIAC_ANALYSIS_TIMEOUT_MS): Promise<{ status: number; body: T }> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = (await response.json()) as T;
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('分析暫時失敗：系統超過 15 秒沒有完成回應，請重新嘗試。');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function requestZodiacAnalysis(
  input: { name: string; birthDate: string; birthTime: string | null; birthCityId: string | null; bloodType: BloodType; analysisTarget: 'self' | 'guest' },
  onJob: (job: AnalysisJob) => void,
  onTrace: (stepId: ZodiacTraceStepId, status: ZodiacTraceStatus, detail?: string) => void,
) {
  const started = Date.now();
  const maxRecoveryAttempts = 2;
  let recoveryAttempts = 0;
  const remaining = () => Math.max(1, ZODIAC_ANALYSIS_TIMEOUT_MS - (Date.now() - started));

  function buildRequestBody(attempt: number) {
    return {
      analysisType: 'zodiac',
      idempotencyKey: ['zodiac-v3', input.birthDate, input.birthTime ?? 'none', input.birthCityId ?? 'none', input.bloodType || 'none', input.analysisTarget, Date.now(), attempt].join(':'),
      sessionId: 'zodiac-browser',
      inputData: input,
    };
  }

  async function createJob(attempt: number): Promise<{ job: AnalysisJob; result?: ZodiacResult }> {
    const requestBody = buildRequestBody(attempt);
    updateTraceStep(onTrace, 'received', 'running', attempt > 0 ? '分拆任務中斷，已用同一份資料自動重新送出。' : `收到 ${input.analysisTarget === 'self' ? 'SELF' : 'OTHER'} 分析資料。`);
    console.info('[ZODIAC][REQUEST_BODY]', { ...requestBody, inputData: { ...input, nameLength: input.name.trim().length, name: undefined } });

    const created = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }, remaining());
    console.info('[ZODIAC][HTTP]', 'POST /api/analysis/jobs', created.status, created.body);

    if (!created.body.ok || !created.body.data?.jobId) {
      updateTraceStep(onTrace, 'received', 'error', created.body.message || created.body.error || '無法建立分析任務。');
      throw new Error(created.body.message || created.body.error || '目前無法建立西洋星座分析任務。');
    }

    const nextJob = created.body.data;
    onJob(nextJob);
    updateTraceStep(onTrace, 'received', 'done', `HTTP ${created.status} / ${nextJob.jobId}`);
    updateTraceStep(onTrace, 'sign', nextJob.status === 'PROCESSING' || nextJob.status === 'FINALIZING' || nextJob.status === 'COMPLETED' ? 'done' : 'running', nextJob.progressStage);

    // Vercel serverless instances don't share memory: by the time a later poll runs on a
    // different instance, this job may look like it never existed (JOB_NOT_FOUND), even
    // though it genuinely completed. The API now runs the job to completion inside the
    // same request and embeds the result inline — use it directly and skip any further
    // cross-instance lookups whenever it's already present.
    if (nextJob.status === 'COMPLETED' && created.body.result) {
      updateTraceStep(onTrace, 'ai', 'done', 'AI 分析已完成。');
      const inlineResult = created.body.result as ZodiacResult;
      updateTraceStep(onTrace, 'element', inlineResult.fiveElement ? 'done' : 'error', inlineResult.fiveElement ? '五元素整合完成。' : '五元素資料缺失。');
      updateTraceStep(onTrace, 'done', 'done', '結果已準備完成。');
      return { job: nextJob, result: inlineResult };
    }
    return { job: nextJob };
  }

  function canRecover(response: { status: number; body: ApiResponse<unknown> }) {
    return (
      recoveryAttempts < maxRecoveryAttempts &&
      response.status === 404 &&
      (response.body.code === 'JOB_NOT_FOUND' || response.body.code === 'RESULT_NOT_FOUND')
    );
  }

  let createdJob = await createJob(recoveryAttempts);
  if (createdJob.result) return createdJob.result;
  let job = createdJob.job;

  while (Date.now() - started < ZODIAC_ANALYSIS_TIMEOUT_MS) {
    if (job.status === 'COMPLETED' && job.resultId) {
      updateTraceStep(onTrace, 'ai', 'done', 'AI 分析已完成。');
      const result = await safeJson<ApiResponse<ZodiacResult>>('/api/analysis/results/' + job.resultId, undefined, remaining());
      console.info('[ZODIAC][HTTP]', 'GET /api/analysis/results', result.status, { ok: result.body.ok, resultId: job.resultId });
      if (result.body.ok && result.body.data) {
        updateTraceStep(onTrace, 'element', result.body.data.fiveElement ? 'done' : 'error', result.body.data.fiveElement ? '五元素整合完成。' : '五元素資料缺失。');
        updateTraceStep(onTrace, 'done', 'done', '結果已準備完成。');
        return result.body.data;
      }
      if (canRecover(result)) {
        recoveryAttempts += 1;
        createdJob = await createJob(recoveryAttempts);
        if (createdJob.result) return createdJob.result;
        job = createdJob.job;
        continue;
      }
      updateTraceStep(onTrace, 'done', 'error', result.body.message || result.body.error || '結果讀取失敗。');
      throw new Error(result.body.message || result.body.error || '目前無法讀取西洋星座分析結果。');
    }

    if (job.status === 'FAILED' || job.status === 'TIMEOUT' || job.status === 'CANCELLED') {
      updateTraceStep(onTrace, 'ai', 'error', job.errorMessage || job.message || 'AI 分析中斷。');
      throw new Error(job.errorMessage || job.message || '目前無法完成西洋星座分析。');
    }

    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const next = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs/' + job.jobId, undefined, remaining());
    console.info('[ZODIAC][HTTP]', 'GET /api/analysis/jobs', next.status, next.body.data ? { status: next.body.data.status, stage: next.body.data.progressStage, errorCode: next.body.data.errorCode } : next.body);
    if (!next.body.ok || !next.body.data) {
      if (canRecover(next)) {
        recoveryAttempts += 1;
        createdJob = await createJob(recoveryAttempts);
        if (createdJob.result) return createdJob.result;
        job = createdJob.job;
        continue;
      }
      updateTraceStep(onTrace, 'ai', 'error', next.body.message || next.body.error || '任務狀態讀取失敗。');
      throw new Error(next.body.message || next.body.error || '目前無法讀取西洋星座分析狀態。');
    }
    job = next.body.data;
    onJob(job);
    if (job.progressStage === 'VALIDATING_INPUT') updateTraceStep(onTrace, 'received', 'done', '資料格式已確認。');
    if (job.progressStage === 'RUNNING_ENGINE') {
      updateTraceStep(onTrace, 'sign', 'done', 'Zodiac Engine 已啟動。');
      updateTraceStep(onTrace, 'blood', 'done', input.bloodType || '未填血型。');
      updateTraceStep(onTrace, 'prompt', 'done', 'AI Prompt 已建立。');
      updateTraceStep(onTrace, 'ai', 'running', '正在生成西洋星座分析。');
    }
    if (job.progressStage === 'BUILDING_RESULT') updateTraceStep(onTrace, 'element', 'running', '正在整合五元素資料。');
  }

  updateTraceStep(onTrace, 'ai', 'error', '45 秒 timeout');
  throw new Error('分析暫時失敗：系統超過時間限制沒有完成回應，請重新嘗試。');
}
function LoadingPanel({ job, traceSteps }: { job: AnalysisJob | null; traceSteps: ZodiacTraceStep[] }) {
  const statusClass: Record<ZodiacTraceStatus, string> = {
    pending: 'border-white/10 bg-white/[0.04] text-[color:var(--text-muted)]',
    running: 'border-cyan-200/45 bg-cyan-300/12 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.14)]',
    done: 'border-emerald-200/40 bg-emerald-300/12 text-emerald-50',
    error: 'border-rose-300/55 bg-rose-500/12 text-rose-50',
  };
  const statusMark: Record<ZodiacTraceStatus, string> = { pending: '○', running: '●', done: '✓', error: '!' };

  return (
    <section className="fortune-card border-cyan-300/25 bg-cyan-300/[0.06] p-5" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">AI ZODIAC DEBUG TRACE</p>
          <h2 className="mt-3 text-xl font-black text-cyan-50">{job?.message || '西洋星座分析流程已啟動。'}</h2>
        </div>
        <p className="text-xs font-semibold text-[color:var(--text-sub)]">45 秒保護 / {job?.progressStage || 'READY'}</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {traceSteps.map((step, index) => (
          <div key={step.id} className={`rounded-2xl border px-4 py-3 text-sm font-black ${statusClass[step.status]}`}>
            <div className="flex items-center justify-between gap-3">
              <span>{index + 1}. {step.label}</span>
              <span className="text-xs">{statusMark[step.status]}</span>
            </div>
            {step.detail && <p className="mt-1 text-xs font-semibold leading-5 opacity-80">{step.detail}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
function SignBadge({ label, sign }: { label: string; sign: ZodiacSignSummary }) {
  return (
    <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/8 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">{label}</p>
      <p className="mt-1 text-lg font-black text-[color:var(--text-main)]">{sign.symbol} {sign.name}</p>
      <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-sub)]">{ELEMENT_LABEL[sign.element]}｜{sign.dateRange}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[color:var(--text-main)]">{value}</p>
    </div>
  );
}

function DistributionLine({ label, value, accent }: { label: string; value: number; accent: string }) {
  const width = Math.max(4, Math.min(100, Math.round(value * 34)));
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-xs font-black">
        <span className="text-[color:var(--text-main)]">{label}</span>
        <span className="text-[color:var(--text-muted)]">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={'h-full rounded-full ' + accent} style={{ width: width + '%' }} />
      </div>
    </div>
  );
}

function ProfessionalPointCard({ point }: { point: ZodiacProfessionalPoint }) {
  return (
    <article className="min-w-0 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.07] p-4 shadow-[0_0_22px_rgba(217,70,239,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-200">{point.roleLabel}</p>
          <h3 className="mt-1 break-words text-xl font-black text-[color:var(--text-main)]">{point.sign.symbol} {point.sign.name}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-black text-cyan-100">{ELEMENT_LABEL[point.element]}</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <InfoItem label="MODE" value={MODALITY_LABEL[point.modality]} />
        <InfoItem label="POLARITY" value={POLARITY_LABEL[point.polarity]} />
        <InfoItem label="RULER" value={point.ruler} />
        <InfoItem label="LONGITUDE" value={point.longitudeDeg === null ? '\u65e5\u671f\u5340\u9593' : point.longitudeDeg + '\u00b0'} />
      </div>
      <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{point.professionalMeaning}</p>
      <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{point.houseTheme}</p>
    </article>
  );
}

function ProfessionalZodiacLayer({ result }: { result: ZodiacResult }) {
  const chart = result.professionalChart;
  if (!chart) return null;

  const points = [chart.points.sun, chart.points.moon, chart.points.rising].filter((point): point is ZodiacProfessionalPoint => Boolean(point));
  const elementItems = Object.entries(chart.elementDistribution) as Array<[ZodiacElement, number]>;
  const modalityItems = Object.entries(chart.modalityDistribution) as Array<[ZodiacModality, number]>;
  const polarityItems = Object.entries(chart.polarityDistribution) as Array<[ZodiacPolarity, number]>;

  return (
    <section className="fortune-card overflow-hidden border-fuchsia-300/24 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),rgba(34,211,238,0.07)_42%,rgba(15,23,42,0.72)_100%)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-fuchsia-200">PROFESSIONAL ZODIAC CHART</p>
          <h2 className="mt-3 break-words font-serif text-2xl font-black leading-tight text-fuchsia-50 sm:text-3xl">第一層｜專業西洋星座盤</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">此層只建立星座盤資料，不做 AI 解讀，不做補強建議。後續第二層、第三層只能讀取這份已成立的盤面資料。</p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[460px]">
          <InfoItem label="LEVEL" value={PRECISION_LABEL[chart.precision]} />
          <InfoItem label="SCORE" value={chart.precisionScore + '%'} />
          <InfoItem label="TIME" value={DATA_QUALITY_LABEL[chart.dataQuality.birthTime]} />
          <InfoItem label="CITY" value={DATA_QUALITY_LABEL[chart.dataQuality.birthCity]} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {points.map((point) => (
          <ProfessionalPointCard key={point.role} point={point} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.08] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">DOMINANT SIGNATURE</p>
          <h3 className="mt-2 text-xl font-black text-amber-50">{ELEMENT_LABEL[chart.dominantSignature.element]} {'\u00b7'} {MODALITY_LABEL[chart.dominantSignature.modality]} {'\u00b7'} {POLARITY_LABEL[chart.dominantSignature.polarity]}</h3>
          <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">主軸依據：{chart.dominantSignature.basis.join('、')}。結構分數：{chart.dominantSignature.score}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chart.professionalKeywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-[color:var(--text-main)]">{keyword}</span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-black text-cyan-100">元素分佈</p>
            {elementItems.map(([key, value]) => <DistributionLine key={key} label={ELEMENT_LABEL[key]} value={value} accent="bg-cyan-300" />)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black text-fuchsia-100">模式分佈</p>
            {modalityItems.map(([key, value]) => <DistributionLine key={key} label={MODALITY_LABEL[key]} value={value} accent="bg-fuchsia-300" />)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black text-amber-100">陰陽分佈</p>
            {polarityItems.map(([key, value]) => <DistributionLine key={key} label={POLARITY_LABEL[key]} value={value} accent="bg-amber-300" />)}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-black text-[color:var(--text-main)]">層級邊界</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-3">
          {chart.readingBoundaries.map((item) => (
            <p key={item} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item}</p>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{chart.dataQuality.note}</p>
      </div>
    </section>
  );
}

function DeepZodiacAnalysisLayer({ result }: { result: ZodiacResult }) {
  const analysis = result.deepAnalysis;
  if (!analysis) return null;

  return (
    <section className="fortune-card border-cyan-300/20 bg-cyan-300/[0.06] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">AI DEEP READING LAYER</p>
          <h2 className="mt-3 break-words font-serif text-2xl font-black leading-tight text-cyan-50 sm:text-3xl">{'\u7b2c\u4e8c\u5c64\uff5cAI \u6df1\u5ea6\u89e3\u8b80'}</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{analysis.coreNarrative}</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-cyan-200/20 bg-black/15 p-4 lg:w-[360px]">
          <p className="text-xs font-black text-cyan-100">{'\u8b80\u53d6\u898f\u5247'}</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{'\u7b2c\u4e8c\u5c64\u53ea\u8b80\u7b2c\u4e00\u5c64\u5c08\u696d\u661f\u5ea7\u76e4\uff0c\u4e0d\u91cd\u65b0\u8a08\u7b97\u661f\u5ea7\uff0c\u4e0d\u6539\u5beb\u547d\u76e4\u3002'}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {analysis.pointReadings.map((item) => (
          <article key={item.role} className="min-w-0 rounded-2xl border border-cyan-200/16 bg-white/[0.04] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">{item.roleLabel}</p>
            <h3 className="mt-2 break-words text-lg font-black text-[color:var(--text-main)]">{item.title}</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{item.interpretation}</p>
            <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{item.integrationFocus}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-amber-200/18 bg-amber-300/[0.06] p-4">
          <p className="text-xs font-black text-amber-100">{'\u4ea4\u53c9\u5224\u8b80'}</p>
          <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{analysis.dominantInterpretation}</p>
          <div className="mt-3 space-y-2">
            {analysis.tensionPatterns.map((item) => (
              <p key={item} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200/18 bg-emerald-300/[0.06] p-4">
          <p className="text-xs font-black text-emerald-100">{'\u9032\u5316\u7d20\u6750'}</p>
          <div className="mt-3 space-y-2">
            {analysis.growthOpportunities.map((item) => (
              <p key={item} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{item}</p>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{analysis.userFriendlySummary}</p>
        </div>
      </div>
    </section>
  );
}

function ZodiacReinforcementPlanLayer({ result }: { result: ZodiacResult }) {
  const plan = result.reinforcementPlan;
  if (!plan) return null;

  return (
    <section className="fortune-card border-amber-300/24 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.15),rgba(217,70,239,0.07)_44%,rgba(15,23,42,0.74)_100%)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">AI REINFORCEMENT LAYER</p>
          <h2 className="mt-3 break-words font-serif text-2xl font-black leading-tight text-amber-50 sm:text-3xl">{'\u7b2c\u4e09\u5c64\uff5cAI \u88dc\u5f37\u65b9\u6848'}</h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{plan.principle}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/20 bg-black/15 p-4 text-sm font-black text-amber-50 lg:w-[340px]">
          {plan.executionOrder.map((item) => <p key={item} className="leading-7">{item}</p>)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {plan.priorities.map((item) => (
          <article key={item.element} className="min-w-0 rounded-2xl border border-amber-200/18 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">PRIORITY {item.rank}</p>
              <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">{item.needScore}</span>
            </div>
            <h3 className="mt-3 text-xl font-black text-[color:var(--text-main)]">{item.elementLabel}</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{item.reason}</p>
            <div className="mt-3 space-y-2">
              {item.actions.map((action) => (
                <p key={action} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{action}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4">
        <p className="text-xs font-black text-[color:var(--text-main)]">Integration Layer Payload</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{'\u7b2c\u4e00\u88dc\u5f37\uff1a'}{plan.integrationLayerPayload.firstPriority}{'\u3002SELF \u53ef\u4ea4\u7d66 AI \u6210\u9577\u4e2d\u5fc3\u66f4\u65b0\uff1bOTHER \u50c5\u4f5c\u672c\u6b21\u55ae\u6b21\u5206\u6790\u3002'}</p>
      </div>
    </section>
  );
}

function ResultPanel({ result, onReset }: { result: ZodiacResult; onReset: () => void }) {
  const extraSigns = [
    result.risingSign ? { label: '上升星座', sign: result.risingSign } : null,
    result.moonSign ? { label: '月亮星座', sign: result.moonSign } : null,
  ].filter((item): item is { label: string; sign: ZodiacSignSummary } => Boolean(item));

  return (
    <section className="space-y-5">
      <ProfessionalZodiacLayer result={result} />
      <DeepZodiacAnalysisLayer result={result} />
      <ZodiacReinforcementPlanLayer result={result} />
      {/* 優勢卡片依需求提到最上面，排在分析完成標題卡之前 */}
      <article className="fortune-card overflow-hidden p-5 sm:p-7 border-cyan-300/25 bg-cyan-500/8 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">第二眼</p>
        <h3 className="mt-2 text-xl font-black leading-tight text-[color:var(--text-main)]">優勢</h3>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">這些能力是本次星座分析最明確的支持點。</p>
        <div className="mt-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {result.strengths.map((item) => (
              <div key={item} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3 text-sm font-black text-cyan-50">{item}</div>
            ))}
          </div>
        </div>
      </article>
      <AnalysisReadingFlow
        moduleLabel="AI ZODIAC"
        headline={`本次星座：${result.sign.symbol} ${result.sign.name}`}
        summary={`${ELEMENT_LABEL[result.sign.element]}｜${result.sign.dateRange}。${result.personality}`}
        steps={[
          {
            id: 'chart',
            eyebrow: '分析等級',
            title: PRECISION_LABEL[result.precision],
            description: result.chartNote,
            tone: 'violet',
            children: extraSigns.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {extraSigns.map((item) => (
                  <SignBadge key={item.label} label={item.label} sign={item.sign} />
                ))}
              </div>
            ) : undefined,
          },
          {
            id: 'focus',
            eyebrow: '第一眼',
            title: '人格特質',
            description: result.personality,
            tone: 'violet',
          },
          {
            id: 'blind-spots',
            eyebrow: '第三眼',
            title: '容易忽略的地方',
            description: '這不是缺點標籤，而是現在最值得看見並調整的地方。',
            tone: 'amber',
            children: (
              <div className="grid gap-2 sm:grid-cols-3">
                {result.blindSpots.map((item) => (
                  <div key={item} className="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm font-black text-amber-50">{item}</div>
                ))}
              </div>
            ),
          },
          {
            id: 'advice',
            eyebrow: '第四眼',
            title: '目前建議',
            description: result.currentAdvice,
            tone: 'emerald',
          },
          {
            id: 'weekly',
            eyebrow: '第五眼',
            title: '本週提醒',
            description: result.weeklyReminder,
            tone: 'cyan',
          },
        ]}
        actions={(
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onReset} className="vip-gold-btn flex-1 py-4 text-sm">查看今日分析</button>
            <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white">回首頁</Link>
          </div>
        )}
      />
      <FiveElementPriorityCard result={result.fiveElement} />
      <section className="fortune-card border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">INTEGRATION LAYER</p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.integrationSummary}</p>
      </section>
    </section>
  );
}

export default function ZodiacPage() {
  const [form, setForm] = useState<ZodiacForm>(INITIAL_FORM);
  const [birthTimeMode, setBirthTimeMode] = useState<BirthTimeMode>(null);
  const [citySearch, setCitySearch] = useState('');
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [traceSteps, setTraceSteps] = useState<ZodiacTraceStep[]>(createTraceSteps);
  const [result, setResult] = useState<ZodiacResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMissingFields, setShowMissingFields] = useState(false);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<ZodiacResult> | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    const record = readDailyAnalysis<ZodiacResult>('zodiac');
    if (!record) return;
    if (!isCurrentZodiacResult(record.result)) {
      clearDailyAnalysis('zodiac');
      setDailyRecord(null);
      setResult(null);
      setError('\u897f\u6d0b\u661f\u5ea7\u7b2c\u4e00\u5c64\u5df2\u5347\u7d1a\uff0c\u8acb\u91cd\u65b0\u5efa\u7acb\u65b0\u7248\u5c08\u696d\u661f\u5ea7\u76e4\u3002');
      return;
    }
    setDailyRecord(record);
    setResult(record.result);
  }, []);

  useEffect(() => {
    if (submitting || result) {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [submitting, result]);

  function jumpToTodayZodiacResult() {
    const existing = readDailyAnalysis<ZodiacResult>('zodiac');
    if (existing && isCurrentZodiacResult(existing.result)) {
      setDailyRecord(existing);
      setResult(existing.result);
    }
    window.setTimeout(() => progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }

  const updateTrace = (stepId: ZodiacTraceStepId, status: ZodiacTraceStatus, detail?: string) => {
    setTraceSteps((current) => current.map((step) => step.id === stepId ? { ...step, status, detail } : step));
  };

  const missingIdentity = Boolean(error) && !getAnalysisIdentityTarget();
  const cityResults = useMemo(() => searchCities(citySearch), [citySearch]);
  const selectedCity: CityEntry | null = form.birthCityId ? findCityById(form.birthCityId) : null;
  const hasBirthTime = birthTimeMode === 'known' && form.birthTime.length > 0;
  const showMissingBirthDate = showMissingFields && !form.birthDate;

  const timeLabel = birthTimeMode === 'unknown' ? '不知道，先只算太陽星座' : hasBirthTime ? `已填 ${form.birthTime}` : '未填';
  const cityLabel = selectedCity ? `已選 ${selectedCity.name}` : hasBirthTime ? '可選填' : '需先填時間';

  const completedItems = [
    { label: '姓名', done: true, value: form.name.trim() || '可選填' },
    { label: '生日', done: Boolean(form.birthDate), value: form.birthDate ? `已填 ${form.birthDate}` : '未填' },
    { label: '時間', done: birthTimeMode === 'unknown' || hasBirthTime, value: timeLabel },
    { label: '城市', done: !hasBirthTime || Boolean(selectedCity), value: cityLabel },
    { label: '血型', done: true, value: form.bloodType ? `${form.bloodType} 型` : '可選填' },
  ];

  const submit = async () => {
    // 手機（尤其 LINE 內建瀏覽器）點擊到 setSubmitting(true) 生效前有極短暫的視窗，
    // 若使用者因畫面沒有立即反應而重複點擊，會同時建立兩個任務並互相覆寫訊息。
    // 這裡用同步的 ref 鎖擋住同一次點擊的重複觸發，不依賴會延後生效的 React state。
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    try {
      const existing = readDailyAnalysis<ZodiacResult>('zodiac');
      if (existing && isCurrentZodiacResult(existing.result)) {
        setDailyRecord(existing);
        setResult(existing.result);
        progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (existing) {
        clearDailyAnalysis('zodiac');
        setDailyRecord(null);
      }

      setError('');
      setResult(null);
      setJob(null);
      setTraceSteps(createTraceSteps());
      setShowMissingFields(true);

      const analysisTarget = getAnalysisIdentityTarget();
      if (!analysisTarget) {
        setError(getIdentityRequiredMessage());
        return;
      }
      if (form.name.trim().length > 20) {
        setError('姓名請控制在 20 個字以內。');
        return;
      }
      if (!form.birthDate) {
        setError('請先輸入出生年月日，系統才能判定十二星座。');
        return;
      }

      const birthTime = hasBirthTime ? form.birthTime : null;
      const birthCityId = birthTime ? form.birthCityId : null;

      setSubmitting(true);
      try {
        const data = await requestZodiacAnalysis({ name: form.name, birthDate: form.birthDate, birthTime, birthCityId, bloodType: form.bloodType, analysisTarget }, setJob, updateTrace);
        setResult(data);
        setDailyRecord(saveDailyAnalysis<ZodiacResult>('zodiac', data));
        if (analysisTarget === 'self') {
          markGrowthModuleCompleted('zodiac', data.fiveElement?.brandElement);
          saveBirthProfile({
            birthDate: form.birthDate,
            birthTime,
            birthCityId,
            birthTimezone: birthCityId ? findCityById(birthCityId)?.timezone ?? null : null,
          });
          updateTrace('write', 'done', 'SELF：已寫入會員、AI 成長中心與 Integration Layer。');
        } else {
          updateTrace('write', 'done', 'OTHER：只保留本次單次分析，不寫入會員資料。');
        }
      } catch (caught) {
        console.error('[ZODIAC][ERROR]', caught);
        updateTrace('done', 'error', caught instanceof Error ? caught.message : '分析失敗');
        setError(caught instanceof Error ? caught.message : '目前無法完成西洋星座分析。');
      } finally {
        setSubmitting(false);
      }
    } finally {
      submitLockRef.current = false;
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setBirthTimeMode(null);
    setCitySearch('');
    setResult(null);
    setJob(null);
    setTraceSteps(createTraceSteps());
    setError('');
    setShowMissingFields(false);
  };

  return (
    <div className="app-bg zodiac-page-shell min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="feature-home-link feature-home-link--cyan feature-home-link--floating" aria-label="返回首頁">返回首頁</Link>

        {!result && (
          <>
            <IdentitySplitSelector className="mb-5" />

            <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 西洋星座" onViewResult={dailyRecord ? jumpToTodayZodiacResult : undefined} />

            <section className="zodiac-input-hero mb-5 overflow-hidden rounded-3xl border border-fuchsia-300/25 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.2),rgba(34,211,238,0.09)_42%,rgba(15,23,42,0.82)_100%)] p-5 shadow-[0_0_40px_rgba(217,70,239,0.16)] sm:p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-fuchsia-200">AI WESTERN ZODIAC</p>
              <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-fuchsia-50 sm:text-5xl">AI 西洋星座分析</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">請依照下方欄位填寫出生資料。日期必填，時間與城市可選填；填得越完整，分析等級越深（太陽 → 上升＋月亮 → 完整星盤）。</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <p className="text-xs font-black text-fuchsia-100">1. 填資料</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">姓名、時間、城市可選填，出生日期必填。</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <p className="text-xs font-black text-cyan-100">2. 後端運算</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">依填寫完整度採真實天文位置計算太陽、月亮、上升星座。</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <p className="text-xs font-black text-amber-100">3. AI 白話整理</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">整理人格特質、優勢、忽略點與本週提醒。</p>
                </div>
              </div>
            </section>

            <section className="fortune-card zodiac-form-card p-5 sm:p-7">
              <div className="mb-5 rounded-2xl border border-fuchsia-300/18 bg-fuchsia-300/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">資料確認</p>
                <div className="zodiac-progress-grid mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {completedItems.map((item) => (
                    <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.done ? 'border-emerald-200/25 bg-emerald-300/10' : 'border-rose-300/35 bg-rose-500/10'}`}>
                      <p className="text-[10px] font-black text-[color:var(--text-main)]">{item.done ? '完成' : '未填'} · {item.label}</p>
                      <p className="mt-1 truncate text-[11px] font-semibold text-[color:var(--text-sub)]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">1. 姓名（可選填）</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    maxLength={20}
                    disabled={submitting}
                    placeholder="可填姓名，也可以留空"
                    className="form-input glass-input glass-input-cyan w-full text-base"
                  />
                </div>

                <div className={showMissingBirthDate ? 'rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">2. 出生年月日（必填）{form.birthDate && <span className="ml-2 text-green-400">完成</span>}</label>
                  <GuidedDateInput
                    value={form.birthDate}
                    onChange={(birthDate) => setForm({ ...form, birthDate })}
                    disabled={submitting}
                    accent="fuchsia"
                    label="請依序填寫西元年、月、日，系統會自動確認日期是否有效。"
                  />
                  {showMissingBirthDate && <p className="form-missing-alert">請先完成出生年月日。</p>}
                </div>

                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">
                    3. 出生時間（選填）
                    {birthTimeMode !== null && <span className="ml-2 text-green-400">完成</span>}
                  </label>
                  <p className="mb-4 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
                    不知道也沒關係，系統仍會分析太陽星座；知道的話可以解鎖上升星座與月亮星座。
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setBirthTimeMode('unknown');
                        setForm({ ...form, birthTime: '', birthCityId: null });
                      }}
                      className={`group relative overflow-hidden rounded-2xl border px-5 py-5 text-left transition-all duration-300 ${
                        birthTimeMode === 'unknown'
                          ? 'border-amber-200/80 bg-amber-300/15 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.22)]'
                          : 'border-white/20 bg-white/[0.06] text-[color:var(--text-main)] hover:border-amber-200/70 hover:bg-amber-200/10'
                      }`}
                    >
                      <span className="block text-base font-bold">不知道出生時間</span>
                      <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">
                        直接送出分析，系統只判定太陽星座。
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setBirthTimeMode('known')}
                      className={`group relative overflow-hidden rounded-2xl border px-5 py-5 text-left transition-all duration-300 ${
                        birthTimeMode === 'known'
                          ? 'border-fuchsia-200/80 bg-fuchsia-300/15 text-fuchsia-100 shadow-[0_0_28px_rgba(217,70,239,0.22)]'
                          : 'border-white/20 bg-white/[0.06] text-[color:var(--text-main)] hover:border-fuchsia-200/70 hover:bg-fuchsia-200/10'
                      }`}
                    >
                      <span className="block text-base font-bold">我知道出生時間</span>
                      <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">
                        展開友善輸入框，填時與分即可。
                      </span>
                    </button>
                  </div>

                  {birthTimeMode === 'known' && (
                    <div className="mt-5 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-950/20 p-4 shadow-[0_0_30px_rgba(217,70,239,0.12)]">
                      <GuidedTimeInput
                        value={form.birthTime}
                        onChange={(birthTime) => setForm({ ...form, birthTime })}
                        disabled={submitting}
                        accent="fuchsia"
                        label="請依序填寫時、分（24 小時制）。"
                      />
                    </div>
                  )}
                </div>

                <div className={!hasBirthTime ? 'opacity-50' : ''}>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">4. 出生城市（選填，可搜尋）</label>
                  {!hasBirthTime ? (
                    <p className="text-xs font-semibold leading-6 text-[color:var(--text-sub)]">請先填寫出生時間，才能進一步選擇出生城市（提升為上升星座＋完整星盤等級）。</p>
                  ) : selectedCity ? (
                    <div className="flex items-center justify-between rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3">
                      <span className="text-sm font-black text-[color:var(--text-main)]">已選擇：{selectedCity.name}（{selectedCity.country}）</span>
                      <button type="button" onClick={() => setForm({ ...form, birthCityId: null })} disabled={submitting} className="text-xs font-black text-fuchsia-200 underline">重新選擇</button>
                    </div>
                  ) : (
                    <>
                      <input
                        value={citySearch}
                        onChange={(event) => setCitySearch(event.target.value)}
                        disabled={submitting}
                        placeholder="輸入城市名稱，例如：台北、香港、東京、洛杉磯、倫敦"
                        className="form-input glass-input glass-input-cyan w-full text-base"
                      />
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {cityResults.map((city) => (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => setForm({ ...form, birthCityId: city.id })}
                            disabled={submitting}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-fuchsia-200/35 hover:bg-fuchsia-300/8 hover:text-[color:var(--text-main)]"
                          >
                            {city.name}<span className="ml-1 text-xs text-[color:var(--text-muted)]">（{city.country}）</span>
                          </button>
                        ))}
                        {cityResults.length === 0 && (
                          <p className="text-xs font-semibold text-[color:var(--text-muted)]">查無符合的城市，可略過此欄位，系統會以預設地區估算。</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">5. 血型（選填，用於五元素交叉分析）</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {BLOOD_TYPES.map((bloodType) => (
                      <button
                        key={bloodType}
                        type="button"
                        onClick={() => setForm({ ...form, bloodType: form.bloodType === bloodType ? '' : bloodType })}
                        disabled={submitting}
                        className={`rounded-xl border px-3 py-3 text-sm font-black transition ${form.bloodType === bloodType ? 'border-fuchsia-200 bg-fuchsia-300/15 text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,0.2)]' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-sub)] hover:border-fuchsia-200/35'}`}
                      >
                        {bloodType} 型
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">血型會與星座交叉判定，用來補強平台統一的五元素結果，不影響星座本身的判定。</p>
                </div>

                {error && <p className="form-missing-alert">{error}</p>}
                {missingIdentity && <p className="text-xs font-semibold leading-6 text-amber-100">先選擇「我自己」或「親朋好友」，資料就不會混在一起。</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={submit} disabled={submitting} className="vip-gold-btn flex-1 py-4 text-sm font-black disabled:opacity-50">
                    {submitting ? 'AI 正在分析星座' : dailyRecord ? getDailyAnalysisButtonLabel(dailyRecord) : '開始 AI 西洋星座分析'}
                  </button>
                  {(form.name || form.birthDate) && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={resetForm}
                      className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      重新填寫
                    </button>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        <div ref={progressRef} className="scroll-mt-6">
          {submitting && <div className="mt-5"><LoadingPanel job={job} traceSteps={traceSteps} /></div>}
          {result && !submitting && (
            <>
              <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 西洋星座" onViewResult={dailyRecord ? jumpToTodayZodiacResult : undefined} />
              <ResultPanel result={result} onReset={resetForm} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
