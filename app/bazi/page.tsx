'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnalysisReadingFlow from '@/components/AnalysisReadingFlow';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';

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
  birthTime: '12:00',
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
  );
}

export default function BaziPage() {
  const [form, setForm] = useState<BaziForm>(INITIAL_FORM);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BaziResult | null>(null);
  const step = activeStep(job);

  const submit = async () => {
    setError('');
    setResult(null);
    setJob(null);

    if (form.name.trim().length > 20) {
      setError('姓名可不填；若要填寫，請勿超過 20 個字。');
      return;
    }
    if (!form.birthDate) {
      setError('請先完成出生年月日。');
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) {
      setError('請選擇出生時辰。');
      return;
    }
    if (!form.country.trim() || !form.city.trim()) {
      setError('請填寫國家與城市，方便系統記錄時區來源。');
      return;
    }

    setLoading(true);
    try {
      const analysis = await requestBaziAnalysis(form, setJob);
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
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="feature-home-link feature-home-link--cyan feature-home-link--floating" aria-label="返回首頁">
          返回首頁
        </Link>

        <section className="mb-5 rounded-3xl border border-emerald-300/25 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),rgba(34,211,238,0.1)_42%,rgba(15,23,42,0.78)_100%)] p-5 shadow-[0_0_36px_rgba(16,185,129,0.14)] sm:p-7">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-200">BAZI MODULE - CORE ONLY</p>
          <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-emerald-50 sm:text-5xl">AI 八字命盤</h1>
          <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
            第二層只執行八字模組：後端獨立排出四柱、藏干、十神、旺衰、喜用忌神、大運與流年。本頁先做閱讀體驗優化，不改命理核心。
          </p>
        </section>

        {!result && (
          <section className="fortune-card p-5 sm:p-7">
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">1. 姓名（可選）</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  maxLength={20}
                  placeholder="可不填；填寫後只作結果標示"
                  className="form-input glass-input glass-input-cyan w-full text-base"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">2. 性別</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['female', 'male'] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setForm({ ...form, gender })}
                      className={`rounded-2xl border px-5 py-4 text-left transition ${
                        form.gender === gender
                          ? 'border-emerald-200 bg-emerald-300/15 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                          : 'border-white/10 bg-white/[0.05] text-[color:var(--text-sub)]'
                      }`}
                    >
                      <span className="text-base font-black">{gender === 'female' ? '女性' : '男性'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">3. 出生年月日</label>
                <LunarBirthdayInput
                  value={form.birthDate}
                  onChange={(birthDate) => setForm({ ...form, birthDate })}
                  accent="cyan"
                  label="出生日期（萬年曆）"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">4. 出生時辰</label>
                <select
                  value={form.birthTime}
                  onChange={(event) => setForm({ ...form, birthTime: event.target.value })}
                  className="form-input glass-input glass-input-cyan w-full text-base"
                >
                  {SHICHEN_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">5. 國家</label>
                  <input
                    value={form.country}
                    onChange={(event) => setForm({ ...form, country: event.target.value })}
                    className="form-input glass-input glass-input-cyan w-full text-base"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">6. 城市</label>
                  <input
                    value={form.city}
                    onChange={(event) => setForm({ ...form, city: event.target.value })}
                    className="form-input glass-input glass-input-cyan w-full text-base"
                  />
                </div>
              </div>

              {error && <p className="form-missing-alert">{error}</p>}

              <button type="button" onClick={submit} disabled={loading} className="vip-gold-btn w-full py-4 text-sm font-black disabled:opacity-50">
                {loading ? '八字命盤運算中...' : '開始 AI 八字命盤分析'}
              </button>
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
                  {['資料驗證', '八字排盤', 'AI白話整理'].map((label, index) => (
                    <div
                      key={label}
                      className={`number-computing-step ${index < step ? 'number-computing-step--done ' : ''}${index === step ? 'number-computing-step--active' : ''}`}
                    >
                      <span className="number-computing-step__dot">{index < step ? '✓' : index + 1}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {result && <ResultPanel result={result} onReset={() => setResult(null)} />}
      </main>
    </div>
  );
}