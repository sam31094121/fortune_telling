'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnalysisReadingFlow from '@/components/AnalysisReadingFlow';
import FiveElementPriorityCard from '@/components/FiveElementPriorityCard';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';
import type { FiveElementIntegrationResult } from '@/lib/five-element-engine';

type BaziGender = 'male' | 'female';
type JobStatus = 'IDLE' | 'VALIDATING' | 'QUEUED' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';
type PillarKey = 'year' | 'month' | 'day' | 'hour';
type TraditionalElement = '木' | '火' | '土' | '金' | '水';

type AnalysisJob = {
  jobId: string;
  moduleId?: string;
  status: JobStatus;
  progressStage: string;
  progressPercent: number | null;
  message: string;
  resultId: string | null;
  errorMessage?: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

type BaziHiddenStem = {
  stem: string;
  element: TraditionalElement;
  tenGod: string;
};

type BaziPillar = {
  label: string;
  stem: string;
  branch: string;
  stemElement: TraditionalElement;
  branchElement: TraditionalElement;
  stemTenGod: string;
  hiddenStems: BaziHiddenStem[];
};

type BaziLuckCycle = {
  ageRange: string;
  pillar: string;
  focus: string;
  element: TraditionalElement;
};

type BaziAnnualFortune = {
  year: number;
  pillar: string;
  focus: string;
  element: TraditionalElement;
};

type BaziResult = {
  ok: true;
  mode: 'bazi';
  moduleId: 'BAZI';
  engineVersion: string;
  input: {
    name: string | null;
    birthDate: string;
    birthTime: string;
    gender: BaziGender;
    country: string;
    city: string;
  };
  timezone: {
    country: string;
    city: string;
    note: string;
  };
  pillars: Record<PillarKey, BaziPillar>;
  tenGods: Record<PillarKey, { stem: string; branchMain: string; hidden: string[] }>;
  dayMaster: {
    stem: string;
    element: TraditionalElement;
    strength: number;
    level: string;
  };
  elementCounts: Record<TraditionalElement, number>;
  strengthAnalysis: {
    monthSeason: string;
    supportScore: number;
    pressureScore: number;
    verdict: string;
    explanation: string;
  };
  gods: {
    joyGod: TraditionalElement;
    usefulGod: TraditionalElement;
    avoidGod: TraditionalElement;
    reason: string;
  };
  luckCycles: BaziLuckCycle[];
  annualFortunes: BaziAnnualFortune[];
  structureFocus: string;
  aiReading: {
    summary: string;
    plainText: string;
    chartSummary: string;
    encouragement: string;
  };
  plainReading: string;
  fiveElement?: FiveElementIntegrationResult;
};

type BaziForm = {
  name: string;
  birthDate: string;
  birthTime: string;
  gender: BaziGender;
  country: string;
  city: string;
};

const PILLAR_ORDER: PillarKey[] = ['year', 'month', 'day', 'hour'];
const ELEMENT_ORDER: TraditionalElement[] = ['金', '木', '水', '火', '土'];
const INITIAL_FORM: BaziForm = {
  name: '',
  birthDate: '',
  birthTime: '',
  gender: 'female',
  country: '台灣',
  city: '台北',
};

const SHICHEN_OPTIONS = [
  { label: '子時 23:00-00:59', value: '23:30' },
  { label: '丑時 01:00-02:59', value: '01:30' },
  { label: '寅時 03:00-04:59', value: '03:30' },
  { label: '卯時 05:00-06:59', value: '05:30' },
  { label: '辰時 07:00-08:59', value: '07:30' },
  { label: '巳時 09:00-10:59', value: '09:30' },
  { label: '午時 11:00-12:59', value: '11:30' },
  { label: '未時 13:00-14:59', value: '13:30' },
  { label: '申時 15:00-16:59', value: '15:30' },
  { label: '酉時 17:00-18:59', value: '17:30' },
  { label: '戌時 19:00-20:59', value: '19:30' },
  { label: '亥時 21:00-22:59', value: '21:30' },
];
function statusLabel(job: AnalysisJob | null) {
  if (!job) return '八字命盤任務已建立，正在準備資料。';
  return job.message || 'Bazi Engine 正在排出四柱、天干地支與五行強弱。';
}

function activeStep(job: AnalysisJob | null) {
  if (!job || job.status === 'QUEUED' || job.status === 'VALIDATING') return 0;
  if (job.status === 'PROCESSING') return 1;
  if (job.status === 'FINALIZING' || job.status === 'COMPLETED') return 2;
  return 0;
}

async function safeJson<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T;
  return { status: response.status, body };
}

async function requestBaziAnalysis(input: BaziForm, onJob: (job: AnalysisJob) => void) {
  const created = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisType: 'bazi',
      idempotencyKey: ['bazi-v2-core', input.birthDate, input.birthTime, input.gender, Date.now()].join(':'),
      sessionId: 'bazi-browser',
      inputData: input,
    }),
  });

  if (!created.body.ok || !created.body.data?.jobId) {
    throw new Error(created.body.message || created.body.error || '無法建立八字命盤任務。');
  }

  let job = created.body.data;
  onJob(job);
  const started = Date.now();

  while (Date.now() - started < 60_000) {
    if (job.status === 'COMPLETED' && job.resultId) {
      const result = await safeJson<ApiResponse<BaziResult>>('/api/analysis/results/' + job.resultId);
      if (result.body.ok && result.body.data) return result.body.data;
      throw new Error(result.body.message || result.body.error || '八字命盤結果尚未完成。');
    }

    if (job.status === 'FAILED' || job.status === 'TIMEOUT' || job.status === 'CANCELLED') {
      throw new Error(job.errorMessage || job.message || '目前無法完成八字命盤分析。');
    }

    await new Promise((resolve) => window.setTimeout(resolve, 700));
    const next = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs/' + job.jobId);
    if (!next.body.ok || !next.body.data) {
      throw new Error(next.body.message || next.body.error || '無法讀取八字運算狀態。');
    }
    job = next.body.data;
    onJob(job);
  }

  throw new Error('八字命盤運算超過系統保護時間，請稍後再試。');
}

function PillarCard({ pillar }: { pillar: BaziPillar }) {
  return (
    <div className="rounded-2xl border border-emerald-300/16 bg-black/18 p-4 text-center">
      <p className="text-[11px] font-black tracking-[0.18em] text-emerald-200">{pillar.label}</p>
      <p className="mt-2 font-serif text-3xl font-black text-amber-100">
        {pillar.stem}
        {pillar.branch}
      </p>
      <p className="mt-2 text-xs font-semibold text-[color:var(--text-sub)]">
        {pillar.stemElement} / {pillar.branchElement} - {pillar.stemTenGod}
      </p>
      <p className="mt-2 text-[11px] font-semibold leading-5 text-cyan-100/80">
        藏干：{pillar.hiddenStems.map((item) => item.stem + item.tenGod).join('、')}
      </p>
    </div>
  );
}

function MiniItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
      <p className="text-[10px] font-black tracking-[0.18em] text-cyan-200">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-main)]">{value}</p>
    </div>
  );
}

function ElementBar({ element, value, max }: { element: TraditionalElement; value: number; max: number }) {
  const percent = max > 0 ? Math.max(12, Math.round((value / max) * 100)) : 12;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-[color:var(--text-main)]">{element}</span>
        <span className="font-mono text-xs font-black text-cyan-100">{value} 點</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ResultPanel({ result, onReset }: { result: BaziResult; onReset: () => void }) {
  const maxElementCount = Math.max(...ELEMENT_ORDER.map((element) => result.elementCounts[element]), 1);
  const headline = result.aiReading.chartSummary || result.aiReading.summary || '本次八字命盤已完成';
  const summary = result.aiReading.plainText || result.plainReading || 'AI 已依照八字排盤資料完成白話整理。';

  return (
    <section className="space-y-5">
      <FiveElementPriorityCard result={result.fiveElement} />
      <AnalysisReadingFlow
      moduleLabel="BAZI UX FLOW"
      headline={headline}
      summary={summary}
      steps={[
        {
          id: 'focus',
          eyebrow: '第一眼',
          title: '本次分析重點',
          description: result.aiReading.summary,
          tone: 'emerald',
          children: (
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniItem label="日主" value={`${result.dayMaster.stem}${result.dayMaster.element} - ${result.dayMaster.level}`} />
              <MiniItem label="格局重點" value={result.structureFocus} />
              <MiniItem label="喜神 / 用神" value={`${result.gods.joyGod} / ${result.gods.usefulGod}`} />
              <MiniItem label="需要避開過旺" value={result.gods.avoidGod} />
            </div>
          ),
        },
        {
          id: 'chart',
          eyebrow: '第二眼',
          title: '命盤摘要',
          description: result.strengthAnalysis.explanation,
          tone: 'cyan',
          children: (
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniItem label="出生來源" value={`${result.input.country} - ${result.input.city} - ${result.input.birthDate} ${result.input.birthTime}`} />
              <MiniItem label="時區紀錄" value={result.timezone.note} />
              <MiniItem label="月令季節" value={result.strengthAnalysis.monthSeason} />
              <MiniItem label="旺衰判定" value={result.strengthAnalysis.verdict} />
            </div>
          ),
        },
        {
          id: 'pillars',
          eyebrow: '第三眼',
          title: '四柱與十神細節',
          description: '以下只呈現客戶看得懂的核心資料，完整運算仍由後端八字引擎完成。',
          tone: 'violet',
          children: <div className="grid gap-3 sm:grid-cols-4">{PILLAR_ORDER.map((key) => <PillarCard key={key} pillar={result.pillars[key]} />)}</div>,
        },
        {
          id: 'elements',
          eyebrow: '第四眼',
          title: '五行統計',
          description: '這裡只顯示八字本身的金木水火土統計，第三層五元素補強系統尚未在本頁啟用。',
          tone: 'amber',
          children: (
            <div className="grid gap-2">
              {ELEMENT_ORDER.map((element) => (
                <ElementBar key={element} element={element} value={result.elementCounts[element]} max={maxElementCount} />
              ))}
            </div>
          ),
        },
        {
          id: 'timing',
          eyebrow: '第五眼',
          title: '大運與流年摘要',
          description: result.gods.reason,
          tone: 'cyan',
          children: (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.luckCycles.slice(0, 4).map((item) => (
                <MiniItem key={item.ageRange} label={`大運 ${item.ageRange}`} value={`${item.pillar} - ${item.element} - ${item.focus}`} />
              ))}
              {result.annualFortunes.slice(0, 2).map((item) => (
                <MiniItem key={item.year} label={`流年 ${item.year}`} value={`${item.pillar} - ${item.element} - ${item.focus}`} />
              ))}
            </div>
          ),
        },
        {
          id: 'action',
          eyebrow: '最後一步',
          title: '今天可以先這樣做',
          description: result.aiReading.encouragement,
          tone: 'emerald',
        },
      ]}
      actions={(
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onReset} className="vip-gold-btn flex-1 py-4 text-sm">
            重新分析
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white"
          >
            回首頁
          </Link>
        </div>
      )}
    />
    </section>
  );
}

export default function BaziPage() {
  const [form, setForm] = useState<BaziForm>(INITIAL_FORM);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BaziResult | null>(null);
  const [birthTimeMode, setBirthTimeMode] = useState<'unknown' | 'known' | null>(null);
  const step = activeStep(job);

  const showMissingFields = Boolean(error) && !result;
  const showMissingBirthDate = showMissingFields && !form.birthDate;
  const showMissingBirthTime = showMissingFields && (birthTimeMode === null || (birthTimeMode === 'known' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)));
  const showMissingLocation = showMissingFields && (!form.country.trim() || !form.city.trim());

  const selectedBirthTimeLabel = birthTimeMode === 'unknown'
    ? '不知道時辰，以午時暫排'
    : birthTimeMode === 'known'
      ? SHICHEN_OPTIONS.find((item) => item.value === form.birthTime)?.label ?? '等待選擇'
      : '未選擇';

  const completedItems = [
    { label: '姓名', done: true, value: form.name.trim() || '可選填' },
    { label: '生日', done: Boolean(form.birthDate), value: form.birthDate ? `已填 ${form.birthDate}` : '未填' },
    { label: '性別', done: Boolean(form.gender), value: form.gender === 'female' ? '女性' : '男性' },
    { label: '時辰', done: birthTimeMode === 'unknown' || (birthTimeMode === 'known' && Boolean(form.birthTime)), value: selectedBirthTimeLabel },
    { label: '地點', done: Boolean(form.country.trim() && form.city.trim()), value: `${form.country || '國家'} / ${form.city || '城市'}` },
  ];

  const submit = async () => {
    setError('');
    setResult(null);
    setJob(null);

    if (!getAnalysisIdentityTarget()) {
      setError(getIdentityRequiredMessage());
      return;
    }

    if (form.name.trim().length > 20) {
      setError('姓名最多 20 個字，請縮短後再送出。');
      return;
    }
    if (!form.birthDate) {
      setError('請先完成出生日期，這是八字命盤的必要資料。');
      return;
    }
    if (birthTimeMode === null) {
      setError('請先選擇「不知道出生時辰」或「我知道出生時辰」。');
      return;
    }
    if (birthTimeMode === 'known' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) {
      setError('請先選擇出生時辰，或改選「不知道出生時辰」。');
      return;
    }
    if (!form.country.trim() || !form.city.trim()) {
      setError('請確認出生國家與城市，方便系統記錄時區來源。');
      return;
    }

    setLoading(true);
    try {
      const analysis = await requestBaziAnalysis({ ...form, birthTime: birthTimeMode === 'unknown' ? '12:00' : form.birthTime }, setJob);
      setResult(analysis);
      markGrowthModuleCompleted('bazi');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前無法完成八字命盤分析。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="feature-home-link feature-home-link--cyan feature-home-link--floating" aria-label="返回首頁">
          返回首頁
        </Link>

        {!result && (
          <>
            <IdentitySplitSelector className="mb-5" />

            <section className="mb-5 rounded-3xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),rgba(34,211,238,0.1)_42%,rgba(15,23,42,0.78)_100%)] p-5 shadow-[0_0_36px_rgba(16,185,129,0.14)] sm:p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-200">AI BAZI CHART</p>
              <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-emerald-50 sm:text-5xl">AI 八字命盤</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
                請依照下方步驟填寫出生資料。這裡只使用八字命盤的獨立運算，不會改成紫微斗數，也不會共用紫微結果。
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <p className="text-xs font-black text-emerald-100">1. 填資料</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">姓名可選填，生日、性別、時辰、地點必填。</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <p className="text-xs font-black text-cyan-100">2. 後端排盤</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">Bazi Engine 會計算四柱、天干地支與五行強弱。</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                  <p className="text-xs font-black text-amber-100">3. AI 白話整理</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-sub)]">AI 只整理後端結果，讓你更容易看懂。</p>
                </div>
              </div>
            </section>

            <section id="bazi-input-form" className="fortune-card p-5 sm:p-7 scroll-mt-20">
              <div className="mb-5 rounded-2xl border border-cyan-300/18 bg-cyan-300/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">資料確認</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
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
                    disabled={loading}
                    placeholder="可填寫姓名，也可以留空直接分析八字"
                    className="form-input glass-input glass-input-cyan w-full text-base"
                  />
                  <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">姓名只用於結果稱呼，不會影響八字排盤。</p>
                </div>

                <div className={showMissingBirthDate ? 'rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">2. 出生日期（民國年）{form.birthDate && <span className="ml-2 text-green-400">完成</span>}</label>
                  <LunarBirthdayInput
                    value={form.birthDate}
                    onChange={(birthDate) => setForm({ ...form, birthDate })}
                    disabled={loading}
                    accent="cyan"
                    label="請像紫微斗數一樣輸入生日，系統會自動換算成西元日期。"
                  />
                  {showMissingBirthDate && <p className="form-missing-alert">請先完成出生日期，八字一定需要生日才能排盤。</p>}
                  {form.birthDate && <p className="mt-2 text-xs text-green-400">已確認西元 {form.birthDate}</p>}
                </div>

                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">3. 性別</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['female', 'male'] as const).map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        disabled={loading}
                        onClick={() => setForm({ ...form, gender })}
                        className={`group relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition ${
                          form.gender === gender
                            ? 'border-emerald-200 bg-emerald-300/15 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                            : 'border-white/10 bg-white/[0.05] text-[color:var(--text-sub)] hover:border-white/25'
                        }`}
                      >
                        <span className="block text-base font-black">{gender === 'female' ? '女性' : '男性'}</span>
                        <span className="mt-1 block text-xs font-semibold opacity-75">點一下完成選擇</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={showMissingBirthTime ? 'rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">
                    4. 出生時辰
                    {birthTimeMode !== null && <span className="ml-2 text-green-400">完成</span>}
                  </label>
                  <p className="mb-4 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">
                    請依照紫微斗數的方式選擇。若不知道實際出生時辰，系統會先用午時暫排，結果會標示為參考。
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setBirthTimeMode('unknown');
                        setForm({ ...form, birthTime: '' });
                      }}
                      className={`group relative overflow-hidden rounded-2xl border px-5 py-5 text-left transition-all duration-300 ${
                        birthTimeMode === 'unknown'
                          ? 'border-amber-200/80 bg-amber-300/15 text-amber-100 shadow-[0_0_28px_rgba(251,191,36,0.22)]'
                          : 'border-white/20 bg-white/[0.06] text-[color:var(--text-main)] hover:border-amber-200/70 hover:bg-amber-200/10'
                      }`}
                    >
                      <span className="block text-base font-bold">不知道出生時辰</span>
                      <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">
                        先用午時 12:00 暫排八字，適合暫時不知道出生時間的客戶。
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setBirthTimeMode('known');
                        setForm({ ...form, birthTime: form.birthTime || '11:30' });
                      }}
                      className={`group relative overflow-hidden rounded-2xl border px-5 py-5 text-left transition-all duration-300 ${
                        birthTimeMode === 'known'
                          ? 'border-cyan-200/80 bg-cyan-300/15 text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.22)]'
                          : 'border-white/20 bg-white/[0.06] text-[color:var(--text-main)] hover:border-cyan-200/70 hover:bg-cyan-200/10'
                      }`}
                    >
                      <span className="block text-base font-bold">我知道出生時辰</span>
                      <span className="mt-1.5 block text-xs leading-5 text-[color:var(--text-sub)]">
                        展開十二時辰，請選最接近的出生時間。
                      </span>
                    </button>
                  </div>

                  {birthTimeMode === 'known' && (
                    <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-4 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold tracking-wide text-cyan-100">請選擇你的出生時辰</span>
                        <span className="text-[11px] text-cyan-200/70">十二時辰</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {SHICHEN_OPTIONS.map((item) => {
                          const selected = form.birthTime === item.value;
                          return (
                            <button
                              key={item.value}
                              type="button"
                              disabled={loading}
                              onClick={() => setForm({ ...form, birthTime: item.value })}
                              className={`rounded-xl border px-3 py-3 text-left transition-all ${
                                selected ? 'border-cyan-200 bg-cyan-400/20 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]' : 'border-white/10 bg-white/5 hover:border-cyan-300/50 hover:bg-cyan-400/10'
                              }`}
                            >
                              <p className={`text-sm font-bold ${selected ? 'text-cyan-100' : 'text-[color:var(--text-main)]'}`}>{item.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {showMissingBirthTime && <p className="form-missing-alert">請先選擇出生時辰方式。</p>}
                </div>

                <div className={showMissingLocation ? 'rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">5. 出生地點</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={form.country}
                      onChange={(event) => setForm({ ...form, country: event.target.value })}
                      disabled={loading}
                      placeholder="國家，例如：台灣"
                      className="form-input glass-input glass-input-cyan w-full text-base"
                    />
                    <input
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                      disabled={loading}
                      placeholder="城市，例如：台北"
                      className="form-input glass-input glass-input-cyan w-full text-base"
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">預設為台灣台北，可依實際出生地修改。</p>
                  {showMissingLocation && <p className="form-missing-alert">請確認出生國家與城市。</p>}
                </div>

                {error && <p className="form-missing-alert">{error}</p>}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={submit} disabled={loading} className="vip-gold-btn flex-1 py-4 text-sm font-black disabled:opacity-50">
                    {loading ? 'AI 八字命盤運算中...' : '開始 AI 八字命盤分析'}
                  </button>
                  {(form.name || form.birthDate) && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setForm(INITIAL_FORM);
                        setError('');
                        setJob(null);
                      }}
                      className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      重新填寫
                    </button>
                  )}
                </div>
              </div>

              {loading && (
                <div
                  className="number-computing-panel result-container mt-6 rounded-2xl border border-emerald-300/25 bg-slate-950/55 p-5 font-sans"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">BAZI ENGINE RUNNING</p>
                  <h2 className="mt-2 text-lg font-black text-emerald-50">{statusLabel(job)}</h2>
                  <div className="number-computing-orbit my-4" aria-hidden="true">
                    <span />
                    <b />
                  </div>
                  <div className="grid gap-2">
                    {['確認出生資料', '排出四柱命盤', 'AI 白話整理'].map((label, index) => (
                      <div
                        key={label}
                        className={`number-computing-step ${index < step ? 'number-computing-step--done ' : ''}${index === step ? 'number-computing-step--active' : ''}`}
                      >
                        <span className="number-computing-step__dot">{index < step ? '完成' : index + 1}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {result && <ResultPanel result={result} onReset={() => setResult(null)} />}
      </main>
    </div>
  );
}