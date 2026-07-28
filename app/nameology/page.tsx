'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import LunarBirthdayInput from '@/components/LunarBirthdayInput';
import FriendlyChoiceCard from '@/components/FriendlyChoiceCard';
import type { BloodType, Gender } from '@/lib/types';
import type { NameologyAnalysis } from '@/lib/nameology-engine';
import { FIVE_ELEMENT_DEFINITIONS, type FiveElementIntegrationResult, type FiveElementKey } from '@/lib/five-element-engine';

type NameologyResponse = {
  ok: boolean;
  mode: 'nameology';
  analysis: NameologyAnalysis;
  fiveElement: FiveElementIntegrationResult;
};

type FormState = {
  name: string;
  birthDate: string;
  bloodType: Exclude<BloodType, ''>;
  gender: Gender;
};

type SelectionConfirm = { bloodType: boolean; gender: boolean };


const BLOOD_TYPES: Array<Exclude<BloodType, ''>> = ['A', 'B', 'AB', 'O'];

const initialForm: FormState = {
  name: '',
  birthDate: '',
  bloodType: 'O',
  gender: 'male',
};

const initialSelectionConfirm: SelectionConfirm = { bloodType: false, gender: false };

const BLOOD_DESC: Record<Exclude<BloodType, ''>, string> = {
  A: '細膩穩定，重視秩序、承諾與安全感。',
  B: '自主鮮明，重視自由、節奏與個人風格。',
  AB: '理性感性並存，觀察力與整合力較明顯。',
  O: '主動直接，行動力、號召力與外放感較強。',
};

function FiveElementReinforcementCard({ result }: { result: FiveElementIntegrationResult }) {
  const primary = FIVE_ELEMENT_DEFINITIONS[result.primaryElement];
  const secondary = FIVE_ELEMENT_DEFINITIONS[result.secondaryElement];
  const strong = FIVE_ELEMENT_DEFINITIONS[result.strongElement];
  const avoid = result.avoidElement ? FIVE_ELEMENT_DEFINITIONS[result.avoidElement] : null;
  const scoreEntries = (Object.entries(result.elementScores) as Array<[FiveElementKey, FiveElementIntegrationResult['elementScores'][FiveElementKey]]>)
    .sort(([, a], [, b]) => b.need - a.need);
  const product = result.productRecommendation;
  const quote = result.positiveQuote;
  const title = '\u4f60\u76ee\u524d\u6700\u9700\u8981\u88dc\uff1a';
  const sourceLabel = 'AI\u59d3\u540d\u5b78';
  const primaryLabel = '\u672c\u6b21\u5fc5\u88dc';
  const secondaryLabel = '\u7b2c\u4e8c\u9806\u4f4d\uff0c\u4e0d\u5148\u88dc';
  const strongLabel = '\u76ee\u524d\u8f03\u5f37';
  const avoidLabel = '\u672c\u6b21\u5148\u4e0d\u88dc';
  const elementSuffix = '\u5143\u7d20';
  const supportText = '\u9019\u500b\u5143\u7d20\u5df2\u7d93\u8f03\u5f37\uff0c\u672c\u6b21\u5148\u4e0d\u88dc\u3002';
  const noElementText = '\u7121';
  const noAvoidText = '\u6c92\u6709\u904e\u5f37\u5143\u7d20\uff1b\u672c\u6b21\u53ea\u9700\u5c08\u5fc3\u88dc\u7b2c\u4e00\u5143\u7d20';
  const detailTitle = '\u67e5\u770b\u5206\u6790\u539f\u56e0';
  const needLabel = '\u88dc\u5f37';
  const strengthLabel = '\u5f37\u5ea6';
  const evidenceLabel = '\u8b49\u64da';
  const actionTitle = '\u53ef\u7acb\u5373\u63a1\u53d6\u7684\u884c\u52d5';
  const disclaimer = '\u7d50\u8ad6\u660e\u78ba\uff0c\u4f46\u4e0d\u4fdd\u8b49\u6539\u904b\u6216\u7642\u6548\uff1b\u5546\u54c1\u8207\u65b9\u6848\u53ea\u4f5c\u70ba\u5f8c\u7e8c\u9078\u9805\uff0c\u4e0d\u53c3\u8207\u547d\u7406\u8a55\u5206\u3002';
  const productLabel = '\u4e94\u5143\u7d20\u80fd\u91cf\u624b\u93c8\u88dc\u5f37\u65b9\u6848';
  const quoteLabel = '\u6700\u5f8c\u7684\u6b63\u5411\u63d0\u9192';

  return (
    <section className="fortune-card overflow-hidden border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),rgba(251,191,36,0.1)_42%,rgba(15,23,42,0.78)_100%)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">FIVE ELEMENT</p>
          <h2 className="mt-2 font-serif text-2xl font-black text-amber-100 sm:text-3xl">{title}{primary.zh}{elementSuffix}</h2>
        </div>
        <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
          {sourceLabel}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-200/25 bg-black/20 p-4 text-center">
        <p className="text-xs font-bold text-[color:var(--text-muted)]">{primaryLabel}</p>
        <p className="mt-2 font-serif text-5xl font-black leading-none text-amber-200 sm:text-6xl">{primary.zh}</p>
        <p className="mt-3 text-sm font-bold leading-7 text-[color:var(--text-main)]">{result.summary}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {result.keywords.map((keyword) => (
            <span key={keyword} className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
              {keyword}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold text-cyan-100">{secondaryLabel}</p>
          <p className="mt-1 text-lg font-black text-cyan-50">{secondary.zh}{elementSuffix}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{secondary.keywords.slice(0, 3).join('\u3001')}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold text-emerald-100">{strongLabel}</p>
          <p className="mt-1 text-lg font-black text-emerald-50">{strong.zh}{elementSuffix}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{supportText}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold text-rose-100">{avoidLabel}</p>
          <p className="mt-1 text-lg font-black text-rose-50">{avoid ? avoid.zh + elementSuffix : noElementText}</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">{avoid ? avoid.caution : noAvoidText}</p>
        </div>
      </div>


      <div className="mt-4 rounded-2xl border border-amber-200/25 bg-amber-300/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200">{productLabel}</p>
        <h3 className="mt-2 text-2xl font-black text-amber-50">{product.title}</h3>
        <p className="mt-2 text-sm font-black leading-7 text-amber-100">{product.headline}</p>
        <p className="mt-3 rounded-xl border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-sm font-black leading-7 text-rose-100">{product.braceletCore}</p>
        <p className="mt-3 text-sm font-semibold leading-7 text-[color:var(--text-sub)]">{product.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.supportDirections.map((item) => (
            <span key={item} className="rounded-full border border-amber-200/25 bg-black/18 px-3 py-1 text-xs font-black text-amber-100">{item}</span>
          ))}
        </div>
        <button type="button" className="mt-4 w-full rounded-2xl border border-amber-200/35 bg-amber-300/14 px-4 py-3 text-sm font-black text-amber-50 transition hover:border-amber-100/60">
          {product.ctaLabel}
        </button>
        <p className="mt-3 text-[11px] font-semibold leading-5 text-[color:var(--text-muted)]">{product.disclaimer}</p>
      </div>

      <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <summary className="cursor-pointer text-sm font-black text-amber-100">{detailTitle}</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-2">
            {result.reasons.map((reason) => (
              <p key={reason} className="rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{reason}</p>
            ))}
          </div>
          <div className="space-y-2">
            {scoreEntries.map(([element, score]) => {
              const definition = FIVE_ELEMENT_DEFINITIONS[element];
              return (
                <div key={element} className="rounded-xl border border-white/10 bg-black/15 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="text-[color:var(--text-main)]">{definition.zh}{elementSuffix}</span>
                    <span className="text-cyan-100">{needLabel} {score.need}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-cyan-300" style={{ width: score.need + '%' }} />
                  </div>
                  <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">{strengthLabel} {score.strength} / {evidenceLabel} {score.evidenceCount}</p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-black text-cyan-100">{actionTitle}</p>
          {result.recommendedActions.map((action) => (
            <p key={action} className="text-sm leading-7 text-[color:var(--text-sub)]">{action}</p>
          ))}
        </div>
      </details>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">{quoteLabel}</p>
        <blockquote className="mt-3 text-lg font-black leading-8 text-cyan-50">\"{quote.quote}\"</blockquote>
        <p className="mt-2 text-sm font-bold text-amber-100">{quote.author} ? {quote.role}</p>
        <p className="mt-3 text-xs font-semibold leading-6 text-[color:var(--text-sub)]">{quote.elementFit}</p>
        <p className="mt-2 text-xs font-semibold leading-6 text-[color:var(--text-muted)]">{quote.reminder}</p>
        <a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-bold text-cyan-200 underline-offset-4 hover:underline">
          {quote.sourceName}
        </a>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[color:var(--text-muted)]">{disclaimer}</p>
    </section>
  );
}

function ResultPanel({ analysis, fiveElement }: { analysis: NameologyAnalysis; fiveElement: FiveElementIntegrationResult }) {
  const topTendencies = analysis.temperamentProfile.topTendencies.slice(0, 4);
  const givenName = analysis.composition.givenName || analysis.name.slice(1);

  return (
    <section className="space-y-5">
      <FiveElementReinforcementCard result={fiveElement} />

      <div className="fortune-card overflow-hidden border-amber-400/25 bg-slate-950/55 p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-300">AI 姓名學</p>
        <h1 className="mt-4 break-words font-serif text-5xl font-black text-amber-100 sm:text-7xl">
          {analysis.name}
        </h1>
        <p className="mt-4 text-sm leading-8 text-[color:var(--text-sub)]">
          姓氏為根，名字「{givenName}」為主要意境來源；系統以字義、拆字、筆畫五格、五行相生相剋與 24 性情矩陣交叉解讀。
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4">
            <p className="text-xs text-amber-100/70">姓名學分數</p>
            <p className="mt-1 text-3xl font-black text-amber-100">{analysis.score}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-950/20 p-4">
            <p className="text-xs text-cyan-100/70">結果定位</p>
            <p className="mt-1 text-lg font-black text-cyan-100">{analysis.level}</p>
          </div>
          <div className="rounded-2xl border border-rose-300/20 bg-rose-950/20 p-4">
            <p className="text-xs text-rose-100/70">交叉校正</p>
            <p className="mt-1 text-lg font-black text-rose-100">{analysis.crossCheck.alignmentLabel}</p>
          </div>
        </div>
      </div>

      <div className="fortune-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">NAME MEANING</p>
        <h2 className="mt-3 font-serif text-3xl text-cyan-100">每個字的意境拆解</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {analysis.characters.map((item) => (
            <article key={`${item.position}-${item.char}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-4xl font-black text-amber-100">{item.char}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.role} · {item.strokeCount}畫 · {item.element}{item.yinYang}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[color:var(--text-sub)]">部首 {item.glyph.radical}</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--text-main)]">{item.glyph.meaning}</p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">取名意圖：{item.glyph.namingIntent}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tendencies.slice(0, 3).map((tendency) => (
                  <span key={tendency.key} className="rounded-full border border-amber-300/15 bg-amber-950/20 px-2.5 py-1 text-[11px] text-amber-100">
                    {tendency.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">24 MATRIX</p>
          <h2 className="mt-3 font-serif text-3xl text-violet-100">性情偏向</h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.temperamentProfile.clearDirection}</p>
          <div className="mt-5 space-y-3">
            {topTendencies.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-[color:var(--text-main)]">{item.label}</p>
                  <p className="text-sm font-black text-violet-100">{item.score}</p>
                </div>
                <p className="mt-2 text-xs leading-6 text-[color:var(--text-sub)]">{item.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="fortune-card p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">FIVE GRIDS</p>
          <h2 className="mt-3 font-serif text-3xl text-emerald-100">筆畫五格</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {analysis.grids.map((item) => (
              <div key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs text-[color:var(--text-muted)]">{item.label}</p>
                <p className="mt-1 text-2xl font-black text-emerald-100">{item.value}畫</p>
                <p className="mt-1 text-xs text-[color:var(--text-sub)]">{item.element} · {item.meaning}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="fortune-card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300">DIRECT READING</p>
        <h2 className="mt-3 font-serif text-3xl text-amber-100">姓名綜合解讀</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-cyan-200">人格主軸</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.corePersonality}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-rose-200">形象偏好</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.imageAndPreference}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-bold text-emerald-200">交叉校正</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--text-sub)]">{analysis.crossCheck.summary}</p>
          </div>
        </div>
        <p className="mt-5 rounded-2xl border border-amber-300/15 bg-amber-950/15 p-4 text-sm leading-8 text-[color:var(--text-main)]">
          {analysis.summary}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-cyan-200">主要優勢</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.strengths.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-rose-200">需要留意</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.cautions.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
        <div className="fortune-card p-5">
          <p className="text-xs font-bold text-amber-200">行動建議</p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--text-sub)]">
            {analysis.recommendations.slice(0, 4).map((item) => <li key={item}>· {item}</li>)}
          </ul>
        </div>
      </section>
    </section>
  );
}

function buildValidationMessage(form: FormState, selectionConfirm: SelectionConfirm) {
  if (form.name.trim().length < 2) return '請先輸入完整姓名，至少 2 個字。';
  if (!form.birthDate) return '請先完成生日萬年曆推算。';
  if (!selectionConfirm.bloodType) return '請點選血型，系統才會套用血型校正。';
  if (!selectionConfirm.gender) return '請點選性別，系統才會套用外在呈現校正。';
  return '';
}

export default function NameologyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectionConfirm, setSelectionConfirm] = useState<SelectionConfirm>(initialSelectionConfirm);
  const [result, setResult] = useState<NameologyAnalysis | null>(null);
  const [fiveElement, setFiveElement] = useState<FiveElementIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validationMessage = useMemo(() => buildValidationMessage(form, selectionConfirm), [form, selectionConfirm]);
  const canSubmit = validationMessage === '';
  const showMissingFields = Boolean(error) && !result;
  const showMissingName = showMissingFields && form.name.trim().length < 2;
  const showMissingBirthDate = showMissingFields && !form.birthDate;
  const showMissingBloodType = showMissingFields && !selectionConfirm.bloodType;
  const showMissingGender = showMissingFields && !selectionConfirm.gender;
  const progressItems = [
    { label: '姓名', done: form.name.trim().length >= 2, value: form.name.trim().length > 0 ? `${form.name.trim().length}字` : '未填' },
    { label: '生日', done: Boolean(form.birthDate), value: form.birthDate ? '已推算' : '未填' },
    { label: '血型', done: selectionConfirm.bloodType, value: selectionConfirm.bloodType ? `${form.bloodType}型` : '未選' },
    { label: '性別', done: selectionConfirm.gender, value: selectionConfirm.gender ? (form.gender === 'male' ? '男性' : '女性') : '未選' },
  ];

  async function handleSubmit() {
    if (!canSubmit || isLoading) {
      setError(validationMessage);
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    setFiveElement(null);

    try {
      const response = await fetch('/api/nameology-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok || !data?.analysis || !data?.fiveElement) throw new Error(data?.message || data?.error || '姓名學分析暫時無法完成。');
      setResult((data as NameologyResponse).analysis);
      setFiveElement((data as NameologyResponse).fiveElement);
      window.setTimeout(() => document.getElementById('nameology-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : '姓名學分析暫時無法完成。');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-bg min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center text-sm">
          <Link href="/" className="feature-home-link feature-home-link--amber">{"\u8fd4\u56de\u9996\u9801"}</Link>
        </div>

        <section id="nameology-input-form" className="fortune-card p-5 sm:p-8 scroll-mt-20">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">NAMEOLOGY</p>
          <h1 className="mt-4 font-serif text-4xl font-black text-amber-100 sm:text-6xl">AI 姓名學</h1>
          <p className="mt-4 max-w-3xl text-sm leading-8 text-[color:var(--text-sub)]">
            這裡只解讀姓名學：姓氏固定為根，名字兩字為主要意境來源，再交叉生日、血型與性別，整理字義、拆字、筆畫五格與性情偏向。
          </p>

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-950/10 p-4">
            <p className="mb-3 text-xs text-[color:var(--text-muted)]">資料進度</p>
            <div className="flex flex-wrap gap-2">
              {progressItems.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.done ? 'border-green-400/30 bg-green-500/20 text-green-300' : 'border-white/10 bg-white/8 text-[color:var(--text-muted)]'}`}
                >
                  ✓ {item.label} {item.value}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-7">
            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                1. 姓名 {form.name.trim().length >= 2 && <span className="text-green-400">✓</span>}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={(event) => {
                  const trimmed = event.target.value.trim();
                  if (trimmed !== event.target.value) setForm((prev) => ({ ...prev, name: trimmed }));
                }}
                placeholder="請輸入完整姓名（至少 2 個字）"
                maxLength={20}
                className={`form-input w-full rounded-lg border border-white/10 px-4 py-3 text-base ${showMissingName ? 'border-rose-400/85 bg-rose-500/10 shadow-[0_0_22px_rgba(244,63,94,0.22)]' : ''}`}
                autoComplete="off"
              />
              {showMissingName && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u586b\u5beb\u59d3\u540d\uff0c\u81f3\u5c11 2 \u500b\u5b57\u3002"}</p>
              )}
              {form.name.trim().length > 0 && form.name.trim().length < 2 && !showMissingName && (
                <p className="mt-2 text-xs text-yellow-400">姓名至少需要 2 個字。</p>
              )}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                2. 出生日期（民國年）{form.birthDate && <span className="text-green-400">✓</span>}
              </label>
              <LunarBirthdayInput
                value={form.birthDate}
                onChange={(solarDate) => setForm((prev) => ({ ...prev, birthDate: solarDate.trim() }))}
                accent="amber"
                label="出生日期（萬年曆）"
              />
              {showMissingBirthDate && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u5148\u5b8c\u6210\u751f\u65e5\u8cc7\u6599\u3002"}</p>
              )}
              {form.birthDate && <p className="mt-2 text-xs text-green-400">✓ 西元 {form.birthDate}</p>}
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                3. 血型 {selectionConfirm.bloodType && <span className="text-green-400">✓</span>}
              </label>
              {showMissingBloodType && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u8840\u578b\uff0c\u9019\u6b04\u9084\u6c92\u6709\u9078\u3002"}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {BLOOD_TYPES.map((bloodType, index) => (
                  <FriendlyChoiceCard
                    key={bloodType}
                    active={selectionConfirm.bloodType && form.bloodType === bloodType}
                    title={`${bloodType} 型`}
                    description={BLOOD_DESC[bloodType]}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, bloodType }));
                      setSelectionConfirm((prev) => ({ ...prev, bloodType: true }));
                    }}
                    tone={index % 2 === 0 ? 'violet' : 'cyan'}
                    attention={showMissingBloodType}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-semibold text-[color:var(--text-main)]">
                4. 性別 {selectionConfirm.gender && <span className="text-green-400">✓</span>}
              </label>
              {showMissingGender && (
                <p className="form-missing-alert">{"\u26a0\ufe0f \u8acb\u9ede\u9078\u6027\u5225\uff0c\u9019\u6b04\u9084\u6c92\u6709\u78ba\u8a8d\u3002"}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'female'}
                  title="女性"
                  description="用來校正姓名外在形象、柔性特質與互動呈現。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'female' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="pink"
                  attention={showMissingGender}
                />
                <FriendlyChoiceCard
                  active={selectionConfirm.gender && form.gender === 'male'}
                  title="男性"
                  description="用來校正姓名外在形象、行動特質與表現方向。"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, gender: 'male' }));
                    setSelectionConfirm((prev) => ({ ...prev, gender: true }));
                  }}
                  tone="cyan"
                  attention={showMissingGender}
                />
              </div>
            </div>

            {(error || validationMessage) && !result && (
              <p className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'border-rose-400/25 bg-rose-950/20 text-rose-100' : 'border-amber-400/20 bg-amber-950/15 text-amber-100'}`}>
                {error || validationMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="vip-gold-btn w-full py-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? '姓名學分析中...' : canSubmit ? '開始姓名學分析' : '請先完成上方資料'}
            </button>
          </div>
        </section>

        <div id="nameology-result" className="mt-6 scroll-mt-24">
          {result && fiveElement && <ResultPanel analysis={result} fiveElement={fiveElement} />}
        </div>
      </div>
    </main>
  );
}
