'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { runAnalysisJobClient } from '@/lib/analysis-job-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import DailyAnalysisNotice from '@/components/DailyAnalysisNotice';
import { BaziCustomerShell } from '@/components/bazi/customer/BaziCustomerShell';
import { BaziCalculationCeremony, BaziGateFailed, runBaziFinalGate, toBaziProgressView, type BaziCalculationProgressViewModel } from '@/components/bazi/customer/BaziCalculationProgress';
import { clearDailyAnalysis, getDailyAnalysisButtonLabel, readDailyAnalysis, saveDailyAnalysis, type DailyAnalysisRecord } from '@/lib/daily-analysis-limit';

type Gender = 'male' | 'female';
type PillarKey = 'year' | 'month' | 'day' | 'hour';
type BrandElement = 'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH';

type BaziPillar = {
  label: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  stemTenGod: string;
  hiddenStems: Array<{ stem: string; element: string; tenGod: string }>;
};

type BaziPillarDetail = {
  key: PillarKey;
  label: string;
  ganzhi: string;
  stemElement: string;
  branchElement: string;
  stemYinYang: 'yang' | 'yin';
  branchMainElement: string;
  stemTenGod: string;
  branchMainTenGod: string;
  hiddenStemLabels: string[];
};

type BaziHiddenStemLayer = {
  role: 'main' | 'middle' | 'residual';
  roleLabel: string;
  stem: string;
  element: string;
  tenGod: string;
  weight: number;
};

type BaziElementStatistics = {
  stems: Record<string, number>;
  branches: Record<string, number>;
  hiddenStems: Record<string, number>;
  total: Record<string, number>;
  percentages: Record<string, number>;
};

type BaziStrengthFactor = {
  id: string;
  label: string;
  status: 'support' | 'pressure' | 'neutral';
  score: number;
  detail: string;
};

type BaziVerificationGate = {
  calendarVerified: boolean;
  pillarsVerified: boolean;
  tenGodsVerified: boolean;
  luckCyclesVerified: boolean;
  readyForInterpretation: boolean;
  checksum: string;
  evidence: string[];
  failedReasons: string[];
};

type BaziElementPriority = {
  rank: number;
  element: string;
  brandElement: BrandElement;
  displayName: string;
  count: number;
  needScore: number;
  judgementLevel: 'primary' | 'secondary' | 'supporting';
  professionalBasis: string[];
  reason: string;
};

type BaziReinforcementItem = {
  rank: 1 | 2 | 3;
  element: string;
  brandElement: BrandElement;
  displayName: string;
  title: string;
  judgement: string;
  action: string;
  suggestion: string;
  basis: string[];
  intensity: 'core' | 'important' | 'follow_up';
  sequenceNote: string;
};

type BaziResult = {
  ok: true;
  mode: 'bazi';
  moduleId: 'BAZI';
  engineVersion: string;
  input: { name: string | null; birthDate: string; birthTime: string; gender: Gender; country: string; city: string };
  timezone: { country: string; city: string; note: string };
  pillars: Record<PillarKey, BaziPillar>;
  dayMaster: { stem: string; element: string; strength: number; level: string };
  elementCounts: Record<string, number>;
  strengthAnalysis: { monthSeason: string; supportScore: number; pressureScore: number; verdict: string; explanation: string };
  gods: { joyGod: string; usefulGod: string; avoidGod: string; neutralGod: string; enemyGod: string; reason: string };
  luckCycles: Array<{ ageRange: string; pillar: string; element: string; focus: string; startAge?: number; endAge?: number; startYear?: number; endYear?: number; tenGod?: string; direction?: 'forward' | 'backward' }>;
  annualFortunes: Array<{ year: number; pillar: string; element: string; focus: string; tenGod?: string }>;
  structureFocus: string;
  professionalChart: {
    layer: 'professional_chart';
    recalculationAllowed: false;
    calendar: { solarDate: string; birthTime: string; calendarType: 'solar'; lunarConverted: false; trueSolarTimeApplied: false; shichen: { branchIndex: number; label: string; range: string; branch: string }; note: string };
    pillarDetails: Record<PillarKey, BaziPillarDetail>;
    hiddenStemStructure: Record<PillarKey, BaziHiddenStemLayer[]>;
    tenGodDistribution: { counts: Record<string, number>; ranked: Array<{ tenGod: string; score: number; level: 'strong' | 'medium' | 'light' }>; dominant: string[]; missing: string[] };
    elementStatistics: BaziElementStatistics;
    strengthFactors: BaziStrengthFactor[];
    structurePattern: { primaryPattern: string; supportingPattern: string; stability: 'stable' | 'mixed' | 'unstable'; mixed: boolean; brokenBy: string[]; specialNotes: string[] };
    verification: BaziVerificationGate;
    calculationId?: string;
    birthInputFingerprint?: string;
    professionalResultId?: string;
    chartMode?: 'FULL_BAZI' | 'PARTIAL_BAZI';
    pipeline?: {
      calculationId?: string;
      birthInputFingerprint?: string;
      professionalResultId?: string;
      mode?: 'FULL_BAZI' | 'PARTIAL_BAZI';
      validationStatus?: 'VALID' | 'PARTIAL_VALID' | 'INVALID';
      currentState?: string;
    };
    detail: { readableSummary: string; pillarOrder: Array<{ label: string; ganzhi: string; hiddenStems: string[]; tenGods: string[] }> };
  };
  aiDeepAnalysis: {
    layer: 'ai_deep_analysis';
    sourceLayer: 'professional_chart';
    sourceChecksum: string;
    recalculationAllowed: false;
    summary: string;
    plainText: string;
    chartSummary: string;
    keyFindings: string[];
    userReadableSections: Array<{ title: string; content: string; basis?: string }>;
    professionalSignals: {
      dayMaster: string;
      structure: string;
      tenGodFocus: string[];
      strengthFocus: string;
      elementFocus: string;
      timingFocus: string;
    };
    logicTrace: Array<{ step: string; source: 'professional_chart'; output: string }>;
    elementPriority: BaziElementPriority[];
  };
  aiReinforcementPlan: {
    layer: 'ai_reinforcement_plan';
    sourceLayer: 'ai_deep_analysis';
    sourceChecksum: string;
    recalculationAllowed: false;
    principle: string;
    basisSummary: string;
    elementSequenceExplanation: string;
    first: BaziReinforcementItem;
    second: BaziReinforcementItem;
    third: BaziReinforcementItem;
    priorityOrder: BaziReinforcementItem[];
  };
  dataFlow: {
    direction: 'forward_only';
    pipeline: string[];
    rules: Record<string, boolean>;
  };
  dailyTarot?: {
    dateKey: string;
    cardId: string;
    nameZh: string;
    nameEn: string;
    imageUrl: string;
    uprightMeaning: string;
    uprightKeywords: string[];
    reflectionPrompt: string;
    bridge: string;
  };
};

type BaziForm = BirthProfile & { name: string; gender: '' | Gender; birthDate: string; birthTime: string; country: string; city: string };

const DEFAULT_FORM: BaziForm = {
  name: '',
  gender: '',
  birthDate: '',
  birthTime: '',
  country: '台灣',
  city: '台北',
};

const PILLAR_ORDER: PillarKey[] = ['year', 'month', 'day', 'hour'];
const BRAND_LABEL: Record<BrandElement, string> = {
  AIR: '風元素',
  SPACE: '空元素',
  WATER: '水元素',
  FIRE: '火元素',
  EARTH: '地元素',
};

function isCurrentBaziResult(value: BaziResult | null | undefined): value is BaziResult {
  return Boolean(
    value?.professionalChart?.calendar &&
    value.professionalChart.pillarDetails &&
    value.professionalChart.hiddenStemStructure &&
    value.professionalChart.elementStatistics &&
    value.professionalChart.strengthFactors &&
    value.professionalChart.structurePattern &&
    value.professionalChart.pipeline?.currentState === 'API_READY' &&
    value.professionalChart.pipeline?.calculationId &&
    value.professionalChart.pipeline?.birthInputFingerprint &&
    value.professionalChart.pipeline?.professionalResultId &&
    value.aiDeepAnalysis?.professionalSignals &&
    value.aiDeepAnalysis.logicTrace &&
    value.aiReinforcementPlan?.basisSummary &&
    value.aiReinforcementPlan.elementSequenceExplanation,
  );
}

function createSessionId() {
  const next = `bazi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  if (typeof window === 'undefined') return next;
  const key = 'tdh_bazi_session_v3';
  try {
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    window.sessionStorage.setItem(key, next);
  } catch {
    // LINE WebView/private browsers can block sessionStorage; keep analysis usable with a fresh id.
  }
  return next;
}

function scoreWidth(score: number | undefined) {
  return `${Math.max(4, Math.min(100, Math.round(score ?? 0)))}%`;
}

/**
 * DEPRECATED（Layout Lock V3｜2026-08-11）
 * 以下舊版扁平版面 helper（LayerBadge/PillarCard/InfoItem/ReinforcementCard）已被
 * components/bazi/customer/* 三層架構取代，禁止新功能引用；保留僅作版本歷史。
 */
function LayerBadge({ label }: { label: string }) {
  return <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">{label}</p>;
}

function PillarCard({ pillar }: { pillar: BaziPillar }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/18 p-4 text-center">
      <p className="text-[11px] font-black text-[color:var(--text-sub)]">{pillar.label}</p>
      <p className="mt-2 font-serif text-3xl font-black text-amber-100">{pillar.stem}{pillar.branch}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">天干 {pillar.stemElement} · 地支 {pillar.branchElement}</p>
      <p className="mt-1 text-xs font-bold text-cyan-100">十神 {pillar.stemTenGod}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/15 px-4 py-3">
      <p className="text-[11px] font-black text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-6 text-[color:var(--text-main)]">{value}</p>
    </div>
  );
}

function BaziDailyTarotCard({ tarot }: { tarot: NonNullable<BaziResult['dailyTarot']> }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <section className="rounded-[28px] border border-violet-300/25 bg-black/18 p-5">
      <LayerBadge label="Daily Tarot · One Draw Per Day" />
      <h2 className="mt-3 text-2xl font-black leading-8 text-violet-50">今日運勢塔羅牌</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">依你的八字命盤判定，78 張塔羅牌中固定抽出一張作為今日運勢；同一天內固定不變，{tarot.dateKey} 後才會重新判定。</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mx-auto w-40 shrink-0 sm:mx-0 [perspective:1400px]">
          <button
            type="button"
            onClick={() => setFlipped(true)}
            aria-label={flipped ? tarot.nameZh : '翻牌查看今日運勢'}
            className={`relative block aspect-[3/5] w-full text-center transition-transform duration-700 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)] cursor-default' : 'hover:-translate-y-1'}`}
          >
            <span className="absolute inset-0 flex flex-col overflow-hidden rounded-[16px] border-2 border-violet-300/30 bg-gradient-to-br from-violet-950 via-slate-950 to-black p-2.5 shadow-[0_14px_34px_rgba(2,6,23,0.34)] [backface-visibility:hidden]">
              <span className="pointer-events-none absolute inset-[6px] rounded-[10px] border border-white/25" />
              <span className="pointer-events-none absolute inset-[6px] rounded-[10px] [background:repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_2px,transparent_2px,transparent_10px)]" />
              <span className="pointer-events-none absolute left-2 top-2 text-[10px] opacity-50">✦</span>
              <span className="pointer-events-none absolute right-2 top-2 text-[10px] opacity-50">✦</span>
              <span className="pointer-events-none absolute bottom-2 left-2 text-[10px] opacity-50">✦</span>
              <span className="pointer-events-none absolute bottom-2 right-2 text-[10px] opacity-50">✦</span>
              <span className="relative flex flex-1 flex-col items-center justify-center gap-1">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/20 text-xl shadow-[inset_0_0_16px_rgba(255,255,255,0.12)]">辰</span>
                <span className="font-serif text-base font-black text-amber-100">☯</span>
              </span>
              <span className="relative border-t border-white/15 pt-1.5 text-[10px] font-semibold leading-4 opacity-80">輕觸翻牌 ✦</span>
            </span>
            <span className="absolute inset-0 flex flex-col overflow-hidden rounded-[16px] border-2 border-amber-200/50 bg-black [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <img src={tarot.imageUrl} alt={tarot.nameZh} loading="lazy" className="h-[62%] w-full object-cover object-top" />
              <span className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-black/85 to-black/95 px-1.5 py-1">
                <span className="text-[9px] font-black leading-tight tracking-[0.14em] text-amber-200/85">{tarot.nameEn}</span>
                <span className="font-serif text-sm font-black leading-tight text-amber-50">{tarot.nameZh}</span>
              </span>
            </span>
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {flipped ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">牌義</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{tarot.uprightMeaning}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tarot.uprightKeywords.map((keyword) => (
                    <span key={keyword} className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[11px] font-semibold text-violet-100">{keyword}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">與命盤的關聯</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{tarot.bridge}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/16 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">今日自問</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--text-main)]">{tarot.reflectionPrompt}</p>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm leading-7 text-[color:var(--text-sub)]">
              點選左側牌卡，翻開你今天的運勢塔羅牌。
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReinforcementCard({ item }: { item: BaziReinforcementItem }) {
  return (
    <article className="min-w-0 rounded-2xl border border-violet-300/25 bg-violet-300/8 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">{item.rank === 1 ? 'FIRST' : item.rank === 2 ? 'SECOND' : 'THIRD'}</p>
      <h3 className="mt-2 text-xl font-black text-violet-50">{item.title}</h3>
      <p className="mt-3 text-sm font-black leading-7 text-[color:var(--text-main)]">{item.judgement}</p>
      <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{item.action}</p>
      <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{item.suggestion}</p>
      <div className="mt-3 rounded-xl border border-white/10 bg-black/16 p-3">
        <p className="text-[11px] font-black text-violet-100">判定依據</p>
        <div className="mt-2 space-y-1">
          {item.basis.slice(0, 4).map((basis) => <p key={basis} className="text-[11px] font-semibold leading-5 text-[color:var(--text-sub)]">{basis}</p>)}
        </div>
      </div>
    </article>
  );
}

export default function BaziPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<BaziResult | null>(null);
  // Real Calculation Ceremony：idle → processing（後端運算中）→ ceremony（揭示真實狀態）→ ready（進入命盤）
  const [ceremonyPhase, setCeremonyPhase] = useState<'idle' | 'processing' | 'ceremony' | 'ready' | 'gate_failed'>('idle');
  const [progressView, setProgressView] = useState<BaziCalculationProgressViewModel | null>(null);
  const [gateIssues, setGateIssues] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [dailyRecord, setDailyRecord] = useState<DailyAnalysisRecord<BaziResult> | null>(null);
  const resolvedBirthTime = form.timeUnknown ? '' : form.birthTime;
  const resultSectionRef = useRef<HTMLDivElement>(null);

  function scrollToResult() {
    resultSectionRef.current?.scrollIntoView({ block: 'start' });
  }

  useEffect(() => {
    const record = readDailyAnalysis<BaziResult>('bazi');
    if (!record) return;
    if (!isCurrentBaziResult(record.result)) {
      clearDailyAnalysis('bazi');
      setDailyRecord(null);
      setResult(null);
      setMessage('??????????????????????????????????????');
      return;
    }
    setDailyRecord(record);
    setResult(record.result);
    setCeremonyPhase('ready');
  }, []);

  useEffect(() => {
    if (!result || loading) return;
    resultSectionRef.current?.scrollIntoView({ block: 'start' });
  }, [result, loading]);

  async function handleSubmit() {
    const existing = readDailyAnalysis<BaziResult>('bazi');
    if (existing) {
      if (!isCurrentBaziResult(existing.result)) {
        clearDailyAnalysis('bazi');
        setDailyRecord(null);
        setResult(null);
        setMessage('??????????????????????');
      } else {
        setDailyRecord(existing);
        setResult(existing.result);
        setCeremonyPhase('ready');
        scrollToResult();
        return;
      }
    }

    const targetMode = getAnalysisIdentityTarget();
    if (!targetMode) {
      setError(getIdentityRequiredMessage());
      return;
    }

    const nextMissing = [
      form.name.trim().length < 2 ? 'name' : '',
      !form.birthDate ? 'birthDate' : '',
      !form.gender ? 'gender' : '',
      !form.country || !form.city ? 'birthPlace' : '',
      !form.timeUnknown && !form.birthHourBranch ? 'birthHourBranch' : '',
    ].filter(Boolean);

    setMissing(nextMissing);
    setError('');
    if (nextMissing.length > 0) {
      setError('請先把八字命盤需要的生成資料填完整，系統才會進入第一層專業命盤。');
      const first = document.querySelector(`[data-field="${nextMissing[0]}"]`);
      first?.scrollIntoView({ block: 'center' });
      return;
    }

    setLoading(true);
    setResult(null);
    setCeremonyPhase('processing');
    setProgressView(null);
    setMessage('');
    try {
      const calculationId = `bazi_calc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      const data = await runAnalysisJobClient<BaziResult>({
        analysisType: 'bazi',
        timeoutMs: 45_000,
        maxRecoveryAttempts: 2,
        idempotencyKey: calculationId,
        sessionId: createSessionId(),
        inputData: {
          calculationId,
          name: form.name.trim(),
          birthDate: form.birthDate,
          birthTime: resolvedBirthTime,
          gender: form.gender,
          country: form.country.trim(),
          city: form.city.trim(),
          birthTimeKnown: form.timeUnknown !== true,
          timeUnknown: form.timeUnknown === true,
          birthHourBranch: form.birthHourBranch,
          calendarType: form.calendarType ?? 'solar',
        },
        onJob: (job) => {
          if (job.message) setMessage(job.message);
        },
      });
      const hourUnknownNow = form.timeUnknown === true;
      const gate = runBaziFinalGate(data, hourUnknownNow, calculationId);
      if (!gate.passed) {
        // Final Gate 未通過：不顯示半套假命盤
        setGateIssues(gate.issues);
        setCeremonyPhase('gate_failed');
        setResult(null);
        return;
      }
      setResult(data);
      setProgressView(toBaziProgressView(data, hourUnknownNow));
      setCeremonyPhase('ceremony');
      setDailyRecord(saveDailyAnalysis<BaziResult>('bazi', data));
      setMessage('');
      scrollToResult();
      if (targetMode === 'self') markGrowthModuleCompleted('bazi', data.aiReinforcementPlan.first.brandElement);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前無法完成八字命盤。');
      setCeremonyPhase('gate_failed');
      setGateIssues(['backend request failed']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* 眉標：中文為主、英文為輔，金色引線建立儀式感 */}
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-amber-300/80 to-transparent" aria-hidden="true" />
              <p className="text-xs font-black tracking-[0.3em] text-amber-200">
                辰 · 八字命盤 <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/50">BAZI ENGINE</span>
              </p>
            </div>
            {/* 主標：放大 + 金色漸層，視覺焦點 */}
            <h1 className="mt-3 bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300/80 bg-clip-text font-serif text-4xl font-black leading-tight text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.18)] sm:text-6xl">
              AI 八字命盤
            </h1>
            {/* 副標：金色豎線引導，語氣沉穩 */}
            <p className="mt-4 flex max-w-2xl items-center gap-3 text-base font-bold leading-7 text-amber-100/75 sm:text-lg">
              <span className="h-6 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-amber-300/90 to-amber-500/30" aria-hidden="true" />
              先排準，再解讀。
            </p>
          </div>
          <Link href="/" className="feature-home-link feature-home-link--amber shrink-0">
            返回首頁
          </Link>
        </header>

        <DailyAnalysisNotice record={dailyRecord} className="mb-5" moduleName="AI 八字命盤" onViewResult={result ? scrollToResult : undefined} />
        <IdentitySplitSelector compact className="mb-5" />
        <UnifiedBirthForm
          value={form}
          fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true, birthPlace: true, calendarType: true }}
          missing={missing}
          isSubmitting={loading}
          submitLabel={getDailyAnalysisButtonLabel(dailyRecord)}
          loadingLabel="八字三層資料流運算中..."
          dateAccent="amber"
          onChange={(profile) => {
            setForm((current) => ({
              ...current,
              ...profile,
              name: profile.name ?? '',
              birthDate: profile.birthDate ?? '',
              birthTime: profile.birthTime ?? '',
              gender: (profile.gender ?? '') as '' | Gender,
              country: profile.country ?? current.country,
              city: profile.city ?? current.city,
            }));
          }}
          onSubmit={() => { void handleSubmit(); }}
        />

        {error && <p className="mt-4 rounded-2xl border border-rose-300/35 bg-rose-500/12 px-4 py-3 text-sm font-black leading-6 text-rose-100">{error}</p>}
        {message && <p className="mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/8 px-4 py-3 text-sm font-bold leading-6 text-cyan-100">{message}</p>}

        {(ceremonyPhase === 'processing' || ceremonyPhase === 'ceremony') && (
          <div ref={ceremonyPhase === 'ceremony' ? resultSectionRef : undefined} className="mt-6 scroll-mt-20">
            <BaziCalculationCeremony
              phase={ceremonyPhase}
              view={progressView}
              onOpenResult={() => {
                setCeremonyPhase('ready');
                resultSectionRef.current?.scrollIntoView({ block: 'start' });
              }}
            />
          </div>
        )}

        {ceremonyPhase === 'gate_failed' && (
          <div className="mt-6">
            <BaziGateFailed
              issues={gateIssues}
              onRetry={() => { void handleSubmit(); }}
              onCheckInput={() => { setCeremonyPhase('idle'); window.scrollTo({ top: 0 }); }}
            />
          </div>
        )}

        {result && ceremonyPhase === 'ready' && (
          <div ref={resultSectionRef} className="mt-6 scroll-mt-20">
            {result.dailyTarot && <div className="mb-4"><BaziDailyTarotCard tarot={result.dailyTarot} /></div>}
            {/* Customer Frontend Visual Rebuild V1：三層架構（命工卡 → 老師專業 → 完整命盤）
                只改呈現；TraditionalBaziCore／排盤規則／API Schema／AI 解盤邏輯完全未動 */}
            <BaziCustomerShell result={result} hourUnknown={form.timeUnknown === true} />
          </div>
        )}
      </main>
    </div>
  );
}
