'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UnifiedBirthForm, type BirthProfile } from '@/components/UnifiedBirthForm';
import { markGrowthModuleCompleted } from '@/lib/growth-center-client';

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

type BaziElementPriority = {
  rank: number;
  element: string;
  brandElement: BrandElement;
  displayName: string;
  count: number;
  needScore: number;
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
  gods: { joyGod: string; usefulGod: string; avoidGod: string; reason: string };
  luckCycles: Array<{ ageRange: string; pillar: string; element: string; focus: string }>;
  annualFortunes: Array<{ year: number; pillar: string; element: string; focus: string }>;
  structureFocus: string;
  professionalChart: {
    layer: 'professional_chart';
    recalculationAllowed: false;
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
    userReadableSections: Array<{ title: string; content: string }>;
    elementPriority: BaziElementPriority[];
  };
  aiReinforcementPlan: {
    layer: 'ai_reinforcement_plan';
    sourceLayer: 'ai_deep_analysis';
    sourceChecksum: string;
    recalculationAllowed: false;
    principle: string;
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
};

type ResultResponse = { success: boolean; ok?: boolean; data?: BaziResult; error?: string; message?: string };
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

function createSessionId() {
  if (typeof window === 'undefined') return 'server';
  const key = 'tdh_bazi_session_v3';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = `bazi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  window.sessionStorage.setItem(key, next);
  return next;
}

function scoreWidth(score: number | undefined) {
  return `${Math.max(4, Math.min(100, Math.round(score ?? 0)))}%`;
}

function LayerBadge({ label }: { label: string }) {
  return <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">{label}</p>;
}

function PillarCard({ pillar }: { pillar: BaziPillar }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 p-4 text-center">
      <p className="text-[11px] font-black text-[color:var(--text-sub)]">{pillar.label}</p>
      <p className="mt-2 font-serif text-3xl font-black text-amber-100">{pillar.stem}{pillar.branch}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-[color:var(--text-sub)]">天干 {pillar.stemElement} · 地支 {pillar.branchElement}</p>
      <p className="mt-1 text-xs font-bold text-cyan-100">十神 {pillar.stemTenGod}</p>
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

function ReinforcementCard({ item }: { item: BaziReinforcementItem }) {
  return (
    <article className="rounded-2xl border border-violet-300/25 bg-violet-300/8 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-200">{item.rank === 1 ? 'FIRST' : item.rank === 2 ? 'SECOND' : 'THIRD'}</p>
      <h3 className="mt-2 text-xl font-black text-violet-50">{item.title}</h3>
      <p className="mt-3 text-sm font-black leading-7 text-[color:var(--text-main)]">{item.judgement}</p>
      <p className="mt-2 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{item.action}</p>
      <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{item.suggestion}</p>
    </article>
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
      setError('請先把八字命盤需要的生成資料填完整，系統才會進入第一層專業命盤。');
      const first = document.querySelector(`[data-field="${nextMissing[0]}"]`);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    setResult(null);
    setMessage('第一層正在建立專業八字命盤。');
    try {
      const payload = {
        analysisType: 'bazi',
        idempotencyKey: `bazi_${form.birthDate}_${resolvedBirthTime}_${form.gender}_${Date.now()}`,
        sessionId: createSessionId(),
        inputData: {
          name: form.name.trim(),
          birthDate: form.birthDate,
          birthTime: resolvedBirthTime || '12:00',
          gender: form.gender,
          country: form.country.trim(),
          city: form.city.trim(),
        },
      };
      const response = await fetch('/api/bazi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json() as ResultResponse;
      if (!response.ok || !json.success || !json.data) throw new Error(json.message || json.error || '目前無法完成八字命盤。');
      setResult(json.data);
      setMessage('三層資料流已完成：專業命盤 → AI 解讀 → AI 補強。');
      markGrowthModuleCompleted('bazi', json.data.aiReinforcementPlan.first.brandElement);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '目前無法完成八字命盤。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-bg min-h-screen overflow-x-hidden">
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-9">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-200">BAZI ENGINE</p>
            <h1 className="mt-2 font-serif text-3xl font-black leading-tight text-[color:var(--text-main)] sm:text-5xl">AI 八字命盤</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-[color:var(--text-sub)]">
              本模組採三層單向資料流：先建立專業命盤，再由 AI 讀取命盤轉成白話，最後輸出明確補強排序。
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
          submitLabel="開始建立八字命盤"
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

        {result && (
          <div className="mt-5 space-y-4">
            <section className="rounded-[28px] border border-amber-300/25 bg-black/18 p-5">
              <LayerBadge label="Layer 1 · Professional Chart" />
              <h2 className="mt-3 text-2xl font-black leading-8 text-amber-50">第一層｜專業八字命盤</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">此層只建立命盤資料，不做 AI 解讀，不做補強建議。{result.professionalChart.detail.readableSummary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {PILLAR_ORDER.map((key) => <PillarCard key={key} pillar={result.pillars[key]} />)}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem label="日主" value={`${result.dayMaster.stem}${result.dayMaster.element}`} />
                <InfoItem label="旺衰判定" value={result.dayMaster.level} />
                <InfoItem label="用神" value={result.gods.usefulGod} />
                <InfoItem label="喜神" value={result.gods.joyGod} />
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-300/25 bg-emerald-300/8 p-5">
              <LayerBadge label="Layer 2 · AI Deep Analysis" />
              <h2 className="mt-3 text-2xl font-black leading-8 text-emerald-50">第二層｜AI 深度分析</h2>
              <p className="mt-3 text-xs font-bold text-emerald-100/80">來源：{result.aiDeepAnalysis.sourceLayer} · checksum {result.aiDeepAnalysis.sourceChecksum} · 不重算命盤</p>
              <h3 className="mt-4 text-xl font-black text-emerald-50">{result.aiDeepAnalysis.chartSummary}</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.aiDeepAnalysis.plainText}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {result.aiDeepAnalysis.userReadableSections.map((section) => (
                  <article key={section.title} className="rounded-2xl border border-white/10 bg-black/16 p-4">
                    <p className="text-sm font-black text-[color:var(--text-main)]">{section.title}</p>
                    <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{section.content}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-violet-300/25 bg-violet-300/8 p-5">
              <LayerBadge label="Layer 3 · AI Reinforcement" />
              <h2 className="mt-3 text-2xl font-black leading-8 text-violet-50">第三層｜AI 補強方案</h2>
              <p className="mt-3 text-xs font-bold text-violet-100/80">來源：{result.aiReinforcementPlan.sourceLayer} · checksum {result.aiReinforcementPlan.sourceChecksum} · 不重算命盤</p>
              <p className="mt-3 text-sm font-black leading-7 text-[color:var(--text-main)]">{result.aiReinforcementPlan.principle}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {result.aiReinforcementPlan.priorityOrder.map((item) => <ReinforcementCard key={item.rank} item={item} />)}
              </div>
              <div className="mt-5 space-y-3">
                {result.aiDeepAnalysis.elementPriority.slice(0, 5).map((item) => (
                  <div key={item.displayName}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold text-[color:var(--text-sub)]">
                      <span>{item.rank}. {item.displayName}（{BRAND_LABEL[item.brandElement]}）</span>
                      <span>{item.needScore}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <span className="block h-full rounded-full bg-gradient-to-r from-violet-300 via-amber-300 to-cyan-300" style={{ width: scoreWidth(item.needScore) }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <LayerBadge label="Forward Only Flow" />
              <h2 className="mt-3 text-xl font-black text-[color:var(--text-main)]">資料流程驗證</h2>
              <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{result.dataFlow.pipeline.join(' → ')}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(result.dataFlow.rules).map(([key, value]) => <InfoItem key={key} label={key} value={value ? '通過' : '未通過'} />)}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}