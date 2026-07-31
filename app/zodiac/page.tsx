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

type ZodiacSignSummary = {
  key: string;
  name: string;
  symbol: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  dateRange: string;
};

type ZodiacPrecision = 'DATE_ONLY' | 'DATE_TIME' | 'FULL_CHART';

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
const BLOOD_TYPES: Array<Exclude<BloodType, ''>> = ['A', 'B', 'AB', 'O'];

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

async function requestZodiacAnalysis(
  input: { name: string; birthDate: string; birthTime: string | null; birthCityId: string | null; bloodType: BloodType },
  onJob: (job: AnalysisJob) => void,
) {
  const created = await safeJson<ApiResponse<AnalysisJob>>('/api/analysis/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisType: 'zodiac',
      idempotencyKey: ['zodiac-v2', input.birthDate, input.birthTime ?? 'none', input.birthCityId ?? 'none', input.bloodType || 'none', Date.now()].join(':'),
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
  const steps = ['確認出生資料', '判定星座與星盤', '整理 AI 建議'];
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

function SignBadge({ label, sign }: { label: string; sign: ZodiacSignSummary }) {
  return (
    <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/8 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">{label}</p>
      <p className="mt-1 text-lg font-black text-[color:var(--text-main)]">{sign.symbol} {sign.name}</p>
      <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-sub)]">{ELEMENT_LABEL[sign.element]}｜{sign.dateRange}</p>
    </div>
  );
}

function ResultPanel({ result, onReset }: { result: ZodiacResult; onReset: () => void }) {
  const extraSigns = [
    result.risingSign ? { label: '上升星座', sign: result.risingSign } : null,
    result.moonSign ? { label: '月亮星座', sign: result.moonSign } : null,
  ].filter((item): item is { label: string; sign: ZodiacSignSummary } => Boolean(item));

  return (
    <section className="space-y-5">
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
  const [result, setResult] = useState<ZodiacResult | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMissingFields, setShowMissingFields] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (submitting || result) {
      progressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [submitting, result]);

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
    setError('');
    setResult(null);
    setJob(null);
    setShowMissingFields(true);

    if (!getAnalysisIdentityTarget()) {
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
      const data = await requestZodiacAnalysis({ name: form.name, birthDate: form.birthDate, birthTime, birthCityId, bloodType: form.bloodType }, setJob);
      setResult(data);
      markGrowthModuleCompleted('zodiac', data.fiveElement?.brandElement);
      saveBirthProfile({
        birthDate: form.birthDate,
        birthTime,
        birthCityId,
        birthTimezone: birthCityId ? findCityById(birthCityId)?.timezone ?? null : null,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前無法完成西洋星座分析。');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setBirthTimeMode(null);
    setCitySearch('');
    setResult(null);
    setJob(null);
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
                    {submitting ? 'AI 正在分析星座' : '開始 AI 西洋星座分析'}
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
          {submitting && <div className="mt-5"><LoadingPanel job={job} /></div>}
          {result && !submitting && <ResultPanel result={result} onReset={resetForm} />}
        </div>
      </main>
    </div>
  );
}
