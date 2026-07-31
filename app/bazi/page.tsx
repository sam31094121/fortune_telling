'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
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

type BaziForm = BirthProfile & { name: string; gender: '' | Gender; birthDate: string; birthTime: string; country: string; city: string };

const DEFAULT_FORM: BaziForm = {
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
  const resolvedBirthTime = form.timeUnknown ? '12:00' : form.birthTime;
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

  async function handleSubmit() {
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
      setError('請依照紫微同樣的填寫順序完成紅色提示欄位，AI 才能開始八字命盤運算。');
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
        idempotencyKey: `bazi_${form.birthDate}_${resolvedBirthTime}_${form.gender}_${Date.now()}`,
        sessionId: createSessionId(),
        inputData: {
          name: form.name.trim(),
          birthDate: form.birthDate,
          birthTime: resolvedBirthTime,
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

        <UnifiedBirthForm
          value={form}
          fields={{ name: true, gender: true, birthDate: true, birthHourBranch: true, birthPlace: true, calendarType: true }}
          missing={missing}
          isSubmitting={loading}
          submitLabel="開始 AI 八字命盤分析"
          loadingLabel="AI 八字命盤運算中..."
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
