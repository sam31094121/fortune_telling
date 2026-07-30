'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';

type Gender = 'male' | 'female';
type PillarKey = 'year' | 'month' | 'day' | 'hour';

type BaziPillar = {
  label: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  stemTenGod: string;
  hiddenStems: Array<{ stem: string; element: string; tenGod: string }>;
};

type AiElementModel = {
  primaryElement: 'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH';
  secondaryElement: 'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH';
  elementScore: Record<'AIR' | 'SPACE' | 'WATER' | 'FIRE' | 'EARTH', number>;
};

type BaziResult = {
  ok: true;
  mode: 'bazi';
  input: { name: string | null; birthDate: string; birthTime: string; gender: Gender; country: string; city: string };
  timezone: { note: string };
  pillars: Record<PillarKey, BaziPillar>;
  dayMaster: { stem: string; element: string; strength: number; level: string };
  elementCounts: Record<string, number>;
  strengthAnalysis: { monthSeason: string; supportScore: number; pressureScore: number; verdict: string; explanation: string };
  gods: { joyGod: string; usefulGod: string; avoidGod: string; reason: string };
  luckCycles: Array<{ ageRange: string; pillar: string; element: string; focus: string }>;
  annualFortunes: Array<{ year: number; pillar: string; element: string; focus: string }>;
  structureFocus: string;
  aiReading: { summary: string; plainText: string; chartSummary: string; encouragement: string };
  plainReading: string;
  fiveElement?: {
    brandElement?: AiElementModel['primaryElement'];
    secondaryBrandElement?: AiElementModel['secondaryElement'];
    aiElementModel?: AiElementModel;
    summary?: string;
    reasons?: string[];
  };
};

type JobResponse = {
  success: boolean;
  data: {
    jobId: string;
    status: string;
    message: string;
    resultId: string | null;
    errorMessage: string | null;
  };
};

type ResultResponse = { success: boolean; data: BaziResult };

const PILLAR_ORDER: PillarKey[] = ['year', 'month', 'day', 'hour'];
const ELEMENT_ORDER: AiElementModel['primaryElement'][] = ['AIR', 'SPACE', 'WATER', 'FIRE', 'EARTH'];

const ELEMENT_LABEL: Record<AiElementModel['primaryElement'], string> = {
  AIR: '風元素',
  SPACE: '空元素',
  WATER: '水元素',
  FIRE: '火元素',
  EARTH: '地元素',
};

const TIME_OPTIONS = [
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

const DEFAULT_FORM = {
  name: '',
  gender: '' as '' | Gender,
  birthDate: '',
  birthTime: '',
  country: '台灣',
  city: '台北',
};

function createSessionId() {
  if (typeof window === 'undefined') return 'server';
  const key = 'tdh_bazi_session_v2';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `bazi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreWidth(score: number | undefined) {
  return `${Math.max(4, Math.min(100, Math.round(score ?? 0)))}%`;
}

function PillarCard({ pillar }: { pillar: BaziPillar }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-4 text-center">
      <p className="text-[11px] font-black text-[color:var(--text-sub)]">{pillar.label}</p>
      <p className="mt-2 font-serif text-3xl font-black text-amber-100">{pillar.stem}{pillar.branch}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">天干：{pillar.stemElement} · 地支：{pillar.branchElement}</p>
      <p className="mt-1 text-xs font-bold text-cyan-100">十神：{pillar.stemTenGod}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 px-4 py-3">
      <p className="text-[11px] font-black text-[color:var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-[color:var(--text-main)]">{value}</p>
    </div>
  );
}

export default function BaziPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<BaziResult | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const progressItems = useMemo(() => ([
    { id: 'birthDate', label: '出生年月日', done: Boolean(form.birthDate) },
    { id: 'birthTime', label: '出生時辰', done: Boolean(form.birthTime) },
    { id: 'gender', label: '性別', done: Boolean(form.gender) },
    { id: 'location', label: '國家城市', done: Boolean(form.country && form.city) },
  ]), [form]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function fetchResult(resultId: string) {
    const response = await fetch(`/api/analysis/results/${resultId}`, { cache: 'no-store' });
    const json = await response.json() as ResultResponse & { error?: string; message?: string };
    if (!response.ok || !json.success) throw new Error(json.message || json.error || '目前無法讀取八字結果，請稍後再試。');
    return json.data;
  }

  async function waitForJob(jobId: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`/api/analysis/jobs/${jobId}`, { cache: 'no-store' });
      const json = await response.json() as JobResponse & { error?: string; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || json.error || '目前無法取得八字運算狀態。');
      setMessage(json.data.message || 'AI 八字命盤正在運算。');
      if (json.data.status === 'COMPLETED' && json.data.resultId) return fetchResult(json.data.resultId);
      if (json.data.status === 'FAILED' || json.data.status === 'TIMEOUT') throw new Error(json.data.errorMessage || '目前暫時無法完成八字分析，請稍後再試。');
      await sleep(800);
    }
    throw new Error('八字運算時間較長，請稍後再試一次。');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextMissing = [
      !form.birthDate ? 'birthDate' : '',
      !form.birthTime ? 'birthTime' : '',
      !form.gender ? 'gender' : '',
      !form.country || !form.city ? 'location' : '',
    ].filter(Boolean);

    setMissing(nextMissing);
    setError('');
    if (nextMissing.length > 0) {
      setError('請先完成紅色提示的欄位，AI 才能開始八字命盤運算。');
      const first = document.querySelector(`[data-field="${nextMissing[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage('AI 正在建立八字命盤。');
    try {
      const payload = {
        analysisType: 'bazi',
        idempotencyKey: `bazi_${form.birthDate}_${form.birthTime}_${form.gender}_${Date.now()}`,
        sessionId: createSessionId(),
        inputData: {
          name: form.name.trim(),
          birthDate: form.birthDate,
          birthTime: form.birthTime,
          gender: form.gender,
          country: form.country.trim(),
          city: form.city.trim(),
        },
      };
      const response = await fetch('/api/analysis/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json() as JobResponse & { error?: string; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message || json.error || '目前無法送出八字分析，請稍後再試。');
      const analysis = await waitForJob(json.data.jobId);
      setResult(analysis);
      setMessage('AI 八字命盤已完成。');
      markGrowthModuleCompleted('bazi', analysis.fiveElement?.brandElement);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前暫時無法完成八字分析，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }

  const aiElement = result?.fiveElement?.aiElementModel;

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">BAZI ENGINE</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">AI 八字命盤</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              輸入出生資料後，後端會獨立完成八字排盤，再由前端用手機好閱讀的方式呈現。
            </p>
          </div>
          <Link href="/" className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[color:var(--text-sub)] transition hover:border-white/25 hover:text-white">
            返回首頁
          </Link>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-[28px] border border-amber-300/25 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),rgba(15,23,42,0.78)_58%,rgba(2,6,23,0.94)_100%)] p-5 shadow-[0_0_34px_rgba(251,191,36,0.12)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">資料填寫</p>
            <h2 className="mt-3 text-2xl font-black leading-8 text-amber-50">依序完成欄位，AI 才會開始運算</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {progressItems.map((item) => (
                <div key={item.id} className={`rounded-xl border px-3 py-2 text-xs font-black ${item.done ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : missing.includes(item.id) ? 'border-rose-300/50 bg-rose-500/15 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.22)]' : 'border-white/10 bg-black/15 text-[color:var(--text-sub)]'}`}>
                  {item.done ? '已完成' : '待填寫'} · {item.label}
                </div>
              ))}
            </div>
          </section>

          <section data-field="birthDate" className={`rounded-2xl border p-5 ${missing.includes('birthDate') ? 'border-rose-300/45 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/[0.04]'}`}>
            <label className="block text-sm font-black text-[color:var(--text-main)]">1. 出生年月日</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(event) => update('birthDate', event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60"
            />
          </section>

          <section data-field="birthTime" className={`rounded-2xl border p-5 ${missing.includes('birthTime') ? 'border-rose-300/45 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/[0.04]'}`}>
            <label className="block text-sm font-black text-[color:var(--text-main)]">2. 出生時辰</label>
            <select
              value={form.birthTime}
              onChange={(event) => update('birthTime', event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60"
            >
              <option value="">請選擇出生時辰</option>
              {TIME_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </section>

          <section data-field="gender" className={`rounded-2xl border p-5 ${missing.includes('gender') ? 'border-rose-300/45 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/[0.04]'}`}>
            <label className="block text-sm font-black text-[color:var(--text-main)]">3. 性別</label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: '男性', value: 'male' as const },
                { label: '女性', value: 'female' as const },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => update('gender', item.value)}
                  className={`rounded-2xl border px-4 py-4 text-sm font-black transition ${form.gender === item.value ? 'border-amber-200/55 bg-amber-300/16 text-amber-50' : 'border-white/10 bg-black/18 text-[color:var(--text-sub)]'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section data-field="location" className={`rounded-2xl border p-5 ${missing.includes('location') ? 'border-rose-300/45 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.2)]' : 'border-white/10 bg-white/[0.04]'}`}>
            <label className="block text-sm font-black text-[color:var(--text-main)]">4. 出生地點</label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={form.country} onChange={(event) => update('country', event.target.value)} placeholder="國家，例如台灣" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60" />
              <input value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="城市，例如台北" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <label className="block text-sm font-black text-[color:var(--text-main)]">姓名，可選</label>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} maxLength={20} placeholder="不填也可以分析八字" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-[color:var(--text-main)] outline-none focus:border-amber-200/60" />
          </section>

          {error && <p className="rounded-2xl border border-rose-300/35 bg-rose-500/12 px-4 py-3 text-sm font-black leading-6 text-rose-100">{error}</p>}
          {message && <p className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 px-4 py-3 text-sm font-bold leading-6 text-cyan-100">{message}</p>}

          <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/14 px-6 py-4 text-sm font-black text-amber-50 transition hover:border-amber-200/60 hover:bg-amber-300/20 disabled:opacity-60">
            {loading ? 'AI 八字命盤運算中...' : '開始 AI 八字命盤分析'}
          </button>
        </form>

        {result && (
          <div className="mt-5 space-y-4">
            <section className="rounded-[28px] border border-emerald-300/25 bg-emerald-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">分析完成</p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-emerald-50">{result.aiReading.chartSummary}</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.aiReading.plainText || result.plainReading}</p>
            </section>

            <section className="rounded-2xl border border-amber-300/25 bg-black/15 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">四柱命盤摘要</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {PILLAR_ORDER.map((key) => <PillarCard key={key} pillar={result.pillars[key]} />)}
              </div>
            </section>

            <section className="rounded-2xl border border-cyan-300/25 bg-cyan-300/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">日主與旺衰</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoItem label="日主" value={`${result.dayMaster.stem}${result.dayMaster.element}`} />
                <InfoItem label="旺衰判定" value={result.dayMaster.level} />
                <InfoItem label="支持分數" value={result.strengthAnalysis.supportScore} />
                <InfoItem label="壓力分數" value={result.strengthAnalysis.pressureScore} />
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.strengthAnalysis.explanation}</p>
            </section>

            {aiElement && (
              <section className="rounded-2xl border border-violet-300/25 bg-violet-300/8 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">AI 五元素核心</p>
                <h2 className="mt-3 text-2xl font-black text-violet-50">第一補強：{ELEMENT_LABEL[aiElement.primaryElement]}</h2>
                <p className="mt-2 text-xs font-bold text-[color:var(--text-sub)]">第二參考：{ELEMENT_LABEL[aiElement.secondaryElement]}</p>
                <div className="mt-4 space-y-3">
                  {ELEMENT_ORDER.map((element) => (
                    <div key={element}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold text-[color:var(--text-sub)]">
                        <span>{ELEMENT_LABEL[element]}</span>
                        <span>{aiElement.elementScore[element] ?? 0}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-gradient-to-r from-violet-300 via-amber-300 to-cyan-300" style={{ width: scoreWidth(aiElement.elementScore[element]) }} />
                      </div>
                    </div>
                  ))}
                </div>
                {result.fiveElement?.summary && <p className="mt-4 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.fiveElement.summary}</p>}
              </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">運勢節奏保留擴充</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.luckCycles.slice(0, 4).map((item) => <InfoItem key={item.ageRange} label={`大運 ${item.ageRange}`} value={`${item.pillar} · ${item.element}`} />)}
                {result.annualFortunes.slice(0, 2).map((item) => <InfoItem key={item.year} label={`流年 ${item.year}`} value={`${item.pillar} · ${item.element}`} />)}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
