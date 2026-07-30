'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnalysisReadingFlow from '@/components/AnalysisReadingFlow';
import IdentitySplitSelector from '@/components/IdentitySplitSelector';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';
import { getAnalysisIdentityTarget, getIdentityRequiredMessage } from '@/lib/identity-split-client';

type JobStatus = 'IDLE' | 'VALIDATING' | 'QUEUED' | 'PROCESSING' | 'FINALIZING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';

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

type ZodiacResult = {
  ok: true;
  mode: 'zodiac';
  moduleId: 'ZODIAC';
  engineVersion: string;
  input: { name: string | null; birthDate: string };
  sign: {
    key: string;
    name: string;
    symbol: string;
    element: 'fire' | 'earth' | 'air' | 'water';
    dateRange: string;
  };
  personality: string;
  strengths: string[];
  blindSpots: string[];
  currentAdvice: string;
  weeklyReminder: string;
  integrationSummary: string;
};

type ZodiacForm = {
  name: string;
  birthDate: string;
};

const INITIAL_FORM: ZodiacForm = { name: '', birthDate: '' };
const ELEMENT_LABEL: Record<ZodiacResult['sign']['element'], string> = {
  fire: '火象',
  earth: '土象',
  air: '風象',
  water: '水象',
};

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

async function requestZodiacAnalysis(input: ZodiacForm, onJob: (job: AnalysisJob) => void) {
  const created = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisType: 'zodiac',
      idempotencyKey: ['zodiac-v1', input.birthDate, Date.now()].join(':'),
      sessionId: 'zodiac-browser',
      inputData: input,
    }),
  });

  if (!created.body.ok || !created.body.data?.jobId) {
    throw new Error(created.body.message || created.body.error || '目前無法建立西洋星座分析任務。');
  }

  let job = created.body.data;
  onJob(job);
  const started = Date.now();

  while (Date.now() - started < 45_000) {
    if (job.status === 'COMPLETED' && job.resultId) {
      const result = await safeJson<ApiResponse<ZodiacResult>>('/api/analysis/results/' + job.resultId);
      if (result.body.ok && result.body.data) return result.body.data;
      throw new Error(result.body.message || result.body.error || '西洋星座結果尚未完成。');
    }

    if (job.status === 'FAILED' || job.status === 'TIMEOUT' || job.status === 'CANCELLED') {
      throw new Error(job.errorMessage || job.message || '目前無法完成西洋星座分析。');
    }

    await new Promise((resolve) => window.setTimeout(resolve, 650));
    const next = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs/' + job.jobId);
    if (!next.body.ok || !next.body.data) {
      throw new Error(next.body.message || next.body.error || '目前無法讀取西洋星座運算狀態。');
    }
    job = next.body.data;
    onJob(job);
  }

  throw new Error('西洋星座分析超過系統保護時間，請稍後再試。');
}

function LoadingPanel({ job }: { job: AnalysisJob | null }) {
  const steps = ['確認出生日期', '判定十二星座', '整理 AI 建議'];
  const current = activeStep(job);
  return (
    <section className="fortune-card border-cyan-300/25 bg-cyan-300/[0.06] p-5" role="status" aria-live="polite" aria-busy="true">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">AI ZODIAC RUNNING</p>
      <h2 className="mt-3 text-xl font-black text-cyan-50">{job?.message || '西洋星座模組正在獨立運算。'}</h2>
      <div className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <div key={step} className={`rounded-2xl border px-4 py-3 text-sm font-black ${index <= current ? 'border-cyan-200/40 bg-cyan-300/12 text-cyan-50' : 'border-white/10 bg-white/[0.04] text-[color:var(--text-muted)]'}`}>
            {index + 1}. {step}
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultPanel({ result, onReset }: { result: ZodiacResult; onReset: () => void }) {
  return (
    <section className="space-y-5">
      <AnalysisReadingFlow
        moduleLabel="AI ZODIAC"
        headline={`本次星座：${result.sign.symbol} ${result.sign.name}`}
        summary={`${ELEMENT_LABEL[result.sign.element]}｜${result.sign.dateRange}。${result.personality}`}
        steps={[
          {
            id: 'focus',
            eyebrow: '第一眼',
            title: '人格特質',
            description: result.personality,
            tone: 'violet',
          },
          {
            id: 'strengths',
            eyebrow: '第二眼',
            title: '優勢',
            description: '這些能力是本次星座分析最明確的支持點。',
            tone: 'cyan',
            children: (
              <div className="grid gap-2 sm:grid-cols-3">
                {result.strengths.map((item) => (
                  <div key={item} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-4 py-3 text-sm font-black text-cyan-50">{item}</div>
                ))}
              </div>
            ),
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
            <button type="button" onClick={onReset} className="vip-gold-btn flex-1 py-4 text-sm">重新分析</button>
            <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-center text-sm font-semibold text-[color:var(--text-sub)] transition hover:border-white/20 hover:text-white">回首頁</Link>
          </div>
        )}
      />
      <section className="fortune-card border-white/10 bg-white/[0.04] p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">INTEGRATION LAYER</p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.integrationSummary}</p>
      </section>
    </section>
  );
}

export default function ZodiacPage() {
  const [form, setForm] = useState<ZodiacForm>(INITIAL_FORM);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [result, setResult] = useState<ZodiacResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const missingIdentity = Boolean(error) && !getAnalysisIdentityTarget();
  const missingBirthDate = Boolean(error) && !form.birthDate;

  const submit = async () => {
    setError('');
    setResult(null);
    setJob(null);

    if (!getAnalysisIdentityTarget()) {
      setError(getIdentityRequiredMessage());
      return;
    }
    if (!form.birthDate) {
      setError('請先輸入出生年月日，系統才能判定十二星座。');
      return;
    }
    if (form.name.trim().length > 20) {
      setError('姓名請控制在 20 個字以內。');
      return;
    }

    setSubmitting(true);
    try {
      const data = await requestZodiacAnalysis(form, setJob);
      setResult(data);
      markGrowthModuleCompleted('zodiac');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前無法完成西洋星座分析。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-bg min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="feature-home-link feature-home-link--cyan feature-home-link--floating" aria-label="返回首頁">返回首頁</Link>

        {!result && (
          <>
            <section className="mb-5 overflow-hidden rounded-3xl border border-fuchsia-300/25 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.2),rgba(34,211,238,0.09)_42%,rgba(15,23,42,0.82)_100%)] p-5 shadow-[0_0_40px_rgba(217,70,239,0.16)] sm:p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-fuchsia-200">AI WESTERN ZODIAC</p>
              <h1 className="mt-3 font-serif text-3xl font-black leading-tight text-fuchsia-50 sm:text-5xl">AI 西洋星座分析</h1>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">只輸入出生年月日。系統會獨立判定十二星座，整理人格特質、優勢、容易忽略的地方、目前建議與本週提醒。</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {['獨立星座引擎', '不讀其他命理', '可寫入成長中心'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-xs font-black text-fuchsia-50">{item}</div>
                ))}
              </div>
            </section>

            <IdentitySplitSelector className="mb-5" />

            <section className="fortune-card p-5 sm:p-7">
              <div className="mb-5 rounded-2xl border border-fuchsia-300/18 bg-fuchsia-300/8 p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">資料輸入</p>
                <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">本功能暫時不用出生時辰，只依出生日期判定星座。</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">姓名（可選填）</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    maxLength={20}
                    disabled={submitting}
                    placeholder="可填姓名，也可以留空"
                    className="form-input glass-input glass-input-cyan w-full text-base"
                  />
                </div>

                <div className={missingBirthDate ? 'rounded-2xl border border-rose-400/80 bg-rose-500/10 p-3 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}>
                  <label className="mb-3 block text-sm font-black text-[color:var(--text-main)]">出生年月日</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
                    disabled={submitting}
                    className="form-input glass-input glass-input-cyan w-full text-base"
                  />
                  {missingBirthDate && <p className="form-missing-alert">請先完成出生年月日。</p>}
                </div>
              </div>

              {error && <p className="form-missing-alert mt-5">{error}</p>}
              {missingIdentity && <p className="mt-3 text-xs font-semibold leading-6 text-amber-100">先選擇「我自己」或「親朋好友」，資料就不會混在一起。</p>}

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="vip-gold-btn mt-6 w-full py-4 text-sm disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? 'AI 正在分析星座' : '開始 AI 西洋星座分析'}
              </button>
            </section>
          </>
        )}

        {submitting && <div className="mt-5"><LoadingPanel job={job} /></div>}
        {result && !submitting && <ResultPanel result={result} onReset={() => { setResult(null); setJob(null); setError(''); }} />}
      </main>
    </div>
  );
}
